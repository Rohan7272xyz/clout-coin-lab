-- Database schema updates for Pledge System
-- Run these in your PostgreSQL database

-- 1. Add pledge-related columns to existing influencers table
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS pledge_threshold_eth DECIMAL(18,18) DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS pledge_threshold_usdc DECIMAL(18,6) DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS total_pledged_eth DECIMAL(18,18) DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS total_pledged_usdc DECIMAL(18,6) DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS pledge_count INTEGER DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS launched_at TIMESTAMP;

-- 2. Create pledges table to track individual user pledges
CREATE TABLE IF NOT EXISTS pledges (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    influencer_address VARCHAR(42) NOT NULL,
    eth_amount DECIMAL(18,18) DEFAULT 0,
    usdc_amount DECIMAL(18,6) DEFAULT 0,
    tx_hash VARCHAR(66),
    block_number BIGINT,
    has_withdrawn BOOLEAN DEFAULT false,
    withdrawn_at TIMESTAMP,
    withdrawn_tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT pledges_user_influencer_unique UNIQUE(user_address, influencer_address),
    CONSTRAINT pledges_amounts_check CHECK (eth_amount >= 0 AND usdc_amount >= 0),
    CONSTRAINT pledges_min_amount_check CHECK (eth_amount > 0 OR usdc_amount > 0)
);

-- 3. Create pledge_events table for audit trail
CREATE TABLE IF NOT EXISTS pledge_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'pledge_made', 'threshold_reached', 'approved', 'launched', 'withdrawn'
    influencer_address VARCHAR(42) NOT NULL,
    user_address VARCHAR(42), -- NULL for admin events
    eth_amount DECIMAL(18,18),
    usdc_amount DECIMAL(18,6),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    event_data JSONB, -- Additional event-specific data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create influencer_thresholds table for tracking threshold history
CREATE TABLE IF NOT EXISTS influencer_thresholds (
    id SERIAL PRIMARY KEY,
    influencer_address VARCHAR(42) NOT NULL,
    eth_threshold DECIMAL(18,18) NOT NULL,
    usdc_threshold DECIMAL(18,6) NOT NULL,
    token_name VARCHAR(255) NOT NULL,
    token_symbol VARCHAR(10) NOT NULL,
    influencer_name VARCHAR(255) NOT NULL,
    set_by VARCHAR(42) NOT NULL, -- Admin address who set this
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pledges_user_address ON pledges(user_address);
CREATE INDEX IF NOT EXISTS idx_pledges_influencer_address ON pledges(influencer_address);
CREATE INDEX IF NOT EXISTS idx_pledges_created_at ON pledges(created_at);
CREATE INDEX IF NOT EXISTS idx_pledge_events_influencer ON pledge_events(influencer_address);
CREATE INDEX IF NOT EXISTS idx_pledge_events_type ON pledge_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pledge_events_created_at ON pledge_events(created_at);
CREATE INDEX IF NOT EXISTS idx_influencer_thresholds_address ON influencer_thresholds(influencer_address);

-- 6. Create views for easy data access
CREATE OR REPLACE VIEW pledge_summary AS
SELECT 
    i.id,
    i.name,
    i.handle,
    i.wallet_address,
    i.avatar_url,
    i.followers_count,
    i.category,
    i.description,
    i.verified,
    i.status,
    i.pledge_threshold_eth,
    i.pledge_threshold_usdc,
    i.total_pledged_eth,
    i.total_pledged_usdc,
    i.pledge_count,
    i.is_approved,
    i.approved_at,
    i.launched_at,
    i.created_at,
    -- Calculate progress percentages
    CASE 
        WHEN i.pledge_threshold_eth > 0 THEN 
            ROUND((i.total_pledged_eth / i.pledge_threshold_eth * 100)::numeric, 2)
        ELSE 0 
    END as eth_progress_percent,
    CASE 
        WHEN i.pledge_threshold_usdc > 0 THEN 
            ROUND((i.total_pledged_usdc / i.pledge_threshold_usdc * 100)::numeric, 2)
        ELSE 0 
    END as usdc_progress_percent,
    -- Check if threshold is met
    CASE 
        WHEN (i.pledge_threshold_eth > 0 AND i.total_pledged_eth >= i.pledge_threshold_eth) OR
             (i.pledge_threshold_usdc > 0 AND i.total_pledged_usdc >= i.pledge_threshold_usdc)
        THEN true 
        ELSE false 
    END as threshold_met
FROM influencers i
WHERE i.pledge_threshold_eth > 0 OR i.pledge_threshold_usdc > 0;

-- 7. Create view for user pledge summary
CREATE OR REPLACE VIEW user_pledge_summary AS
SELECT 
    p.user_address,
    COUNT(*) as total_pledges,
    SUM(p.eth_amount) as total_eth_pledged,
    SUM(p.usdc_amount) as total_usdc_pledged,
    COUNT(CASE WHEN p.has_withdrawn THEN 1 END) as withdrawn_pledges,
    COUNT(CASE WHEN i.launched_at IS NOT NULL THEN 1 END) as launched_tokens,
    COUNT(CASE WHEN i.is_approved AND i.launched_at IS NULL THEN 1 END) as pending_launches
FROM pledges p
LEFT JOIN influencers i ON p.influencer_address = i.wallet_address
GROUP BY p.user_address;

-- 8. Add triggers to keep data in sync
CREATE OR REPLACE FUNCTION update_pledge_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update influencer totals when pledge is added/updated
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE influencers 
        SET 
            total_pledged_eth = (
                SELECT COALESCE(SUM(eth_amount), 0) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ),
            total_pledged_usdc = (
                SELECT COALESCE(SUM(usdc_amount), 0) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ),
            pledge_count = (
                SELECT COUNT(*) 
                FROM pledges 
                WHERE influencer_address = NEW.influencer_address 
                AND has_withdrawn = false
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = NEW.influencer_address;
    END IF;
    
    -- Update influencer totals when pledge is deleted
    IF TG_OP = 'DELETE' THEN
        UPDATE influencers 
        SET 
            total_pledged_eth = (
                SELECT COALESCE(SUM(eth_amount), 0) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ),
            total_pledged_usdc = (
                SELECT COALESCE(SUM(usdc_amount), 0) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ),
            pledge_count = (
                SELECT COUNT(*) 
                FROM pledges 
                WHERE influencer_address = OLD.influencer_address 
                AND has_withdrawn = false
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE wallet_address = OLD.influencer_address;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS pledge_totals_trigger ON pledges;
CREATE TRIGGER pledge_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON pledges
    FOR EACH ROW
    EXECUTE FUNCTION update_pledge_totals();

-- 9. Insert sample data for testing (optional - comment out for production)
/*
-- Sample influencer setups for testing
INSERT INTO influencers (name, handle, email, wallet_address, followers_count, category, description, avatar_url, verified, status, pledge_threshold_eth, pledge_threshold_usdc)
VALUES 
    ('TestKing', '@testking', 'test@example.com', '0x1234567890123456789012345678901234567890', 1000000, 'Crypto', 'Test influencer for crypto content', 'https://via.placeholder.com/150', true, 'pledging', 5.0, 0),
    ('TestQueen', '@testqueen', 'queen@example.com', '0x0987654321098765432109876543210987654321', 500000, 'Fitness', 'Test fitness influencer', 'https://via.placeholder.com/150', true, 'pledging', 0, 10000)
ON CONFLICT (wallet_address) DO NOTHING;
*/

-- 10. Create functions for common queries
CREATE OR REPLACE FUNCTION get_influencer_pledge_stats(influencer_addr VARCHAR(42))
RETURNS TABLE (
    total_eth DECIMAL(18,18),
    total_usdc DECIMAL(18,6),
    threshold_eth DECIMAL(18,18),
    threshold_usdc DECIMAL(18,6),
    pledge_count BIGINT,
    threshold_met BOOLEAN,
    eth_progress NUMERIC,
    usdc_progress NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.total_pledged_eth,
        i.total_pledged_usdc,
        i.pledge_threshold_eth,
        i.pledge_threshold_usdc,
        i.pledge_count::BIGINT,
        CASE 
            WHEN (i.pledge_threshold_eth > 0 AND i.total_pledged_eth >= i.pledge_threshold_eth) OR
                 (i.pledge_threshold_usdc > 0 AND i.total_pledged_usdc >= i.pledge_threshold_usdc)
            THEN true 
            ELSE false 
        END,
        CASE 
            WHEN i.pledge_threshold_eth > 0 THEN 
                ROUND((i.total_pledged_eth / i.pledge_threshold_eth * 100)::numeric, 2)
            ELSE 0 
        END,
        CASE 
            WHEN i.pledge_threshold_usdc > 0 THEN 
                ROUND((i.total_pledged_usdc / i.pledge_threshold_usdc * 100)::numeric, 2)
            ELSE 0 
        END
    FROM influencers i
    WHERE i.wallet_address = influencer_addr;
END;
$$ LANGUAGE plpgsql;