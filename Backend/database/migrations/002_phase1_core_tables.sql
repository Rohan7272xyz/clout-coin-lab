-- =====================================================
-- TokenFactory Core Infrastructure Migration - Phase 1
-- Adding essential trading/token infrastructure
-- =====================================================

-- =====================================================
-- STEP 1: BACKUP (run this first)
-- =====================================================
-- pg_dump TokenFactory > backup_$(date +%Y%m%d_%H%M%S).sql

-- =====================================================
-- STEP 2: CORE MISSING TABLES (30-60 min window starts)
-- =====================================================

-- Separate tokens table (tokens are distinct from influencers)
CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    influencer_id INTEGER NOT NULL REFERENCES influencers(id),
    name VARCHAR(255) NOT NULL,
    ticker VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'live', 'locked')),
    contract_address VARCHAR(42) UNIQUE,
    chain_id INTEGER NOT NULL DEFAULT 1, -- 1 = Ethereum mainnet
    launched_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    total_supply BIGINT,
    decimals INTEGER DEFAULT 18,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_contract_address CHECK (
        contract_address IS NULL OR 
        contract_address ~* '^0x[a-fA-F0-9]{40}$'
    )
);

-- Trades table for all token transactions
CREATE TABLE trades (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES tokens(id),
    user_id INTEGER REFERENCES users(id), -- NULL for anonymous trades
    user_address VARCHAR(42), -- wallet address for identification
    side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
    qty NUMERIC(28,18) NOT NULL CHECK (qty > 0), -- token quantity with full precision
    price_usd NUMERIC(18,8) NOT NULL CHECK (price_usd > 0), -- price per token in USD
    usd_value NUMERIC(18,2) NOT NULL CHECK (usd_value > 0), -- total USD value
    gas_fee_usd NUMERIC(18,2) DEFAULT 0,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    
    CONSTRAINT valid_tx_hash CHECK (tx_hash ~* '^0x[a-fA-F0-9]{64}$'),
    CONSTRAINT valid_user_address CHECK (
        user_address IS NULL OR 
        user_address ~* '^0x[a-fA-F0-9]{40}$'
    )
);

-- User token positions (current holdings)
CREATE TABLE positions (
    user_id INTEGER NOT NULL REFERENCES users(id),
    token_id INTEGER NOT NULL REFERENCES tokens(id),
    qty NUMERIC(28,18) NOT NULL DEFAULT 0 CHECK (qty >= 0), -- current holdings
    cost_basis_usd NUMERIC(18,2) NOT NULL DEFAULT 0, -- total amount invested
    avg_buy_price_usd NUMERIC(18,8) DEFAULT 0, -- average purchase price
    realized_pnl_usd NUMERIC(18,2) DEFAULT 0, -- realized gains/losses
    first_buy_at TIMESTAMPTZ,
    last_buy_at TIMESTAMPTZ,
    last_sell_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (user_id, token_id)
);

-- Endorsements (influencer-token relationships)
CREATE TABLE endorsements (
    id SERIAL PRIMARY KEY,
    influencer_id INTEGER NOT NULL REFERENCES influencers(id),
    token_id INTEGER NOT NULL REFERENCES tokens(id),
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    doc_hash VARCHAR(66), -- hash of endorsement document
    grant_pct NUMERIC(5,4) CHECK (grant_pct >= 0 AND grant_pct <= 1), -- percentage of tokens granted
    lockup_days INTEGER DEFAULT 0 CHECK (lockup_days >= 0),
    vest_schedule_json JSONB, -- vesting schedule details
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(influencer_id, token_id) -- one endorsement per influencer per token
);

-- Liquidity events (add/remove liquidity operations)
CREATE TABLE liquidity_events (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES tokens(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('add', 'remove', 'lock', 'unlock')),
    amount_usd NUMERIC(18,2) NOT NULL CHECK (amount_usd > 0),
    token_amount NUMERIC(28,18) CHECK (token_amount > 0),
    eth_amount NUMERIC(20,6) CHECK (eth_amount > 0),
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locker_contract VARCHAR(42), -- contract handling the lock/unlock
    notes TEXT,
    
    CONSTRAINT valid_liquidity_tx_hash CHECK (tx_hash ~* '^0x[a-fA-F0-9]{64}$'),
    CONSTRAINT valid_locker_contract CHECK (
        locker_contract IS NULL OR 
        locker_contract ~* '^0x[a-fA-F0-9]{40}$'
    )
);

-- =====================================================
-- STEP 3: ENHANCE EXISTING TABLES
-- =====================================================

-- Add missing fields to pledges table
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'ETH';
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS usd_at_pledge NUMERIC(18,2);
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS converted_tx_hash VARCHAR(66);
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS refunded_tx_hash VARCHAR(66);
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' 
    CHECK (status IN ('active', 'converted', 'refunded', 'expired'));
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE pledges ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- Add constraints for new pledge fields
ALTER TABLE pledges ADD CONSTRAINT valid_converted_tx_hash 
    CHECK (converted_tx_hash IS NULL OR converted_tx_hash ~* '^0x[a-fA-F0-9]{64}$');
ALTER TABLE pledges ADD CONSTRAINT valid_refunded_tx_hash 
    CHECK (refunded_tx_hash IS NULL OR refunded_tx_hash ~* '^0x[a-fA-F0-9]{64}$');

-- Enhance influencers table
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS platform_handle VARCHAR(100);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS social_platform VARCHAR(50);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS audience_size INTEGER DEFAULT 0;
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public' 
    CHECK (visibility IN ('public', 'private'));

-- Add missing constraints to users (wallet_address should already exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(3); -- ISO country code
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- =====================================================
-- STEP 4: INDEXES FOR PERFORMANCE
-- =====================================================

-- Token indexes
CREATE INDEX ix_tokens_influencer ON tokens(influencer_id);
CREATE INDEX ix_tokens_status ON tokens(status);
CREATE INDEX ix_tokens_contract ON tokens(contract_address);
CREATE INDEX ix_tokens_launched ON tokens(launched_at DESC);

-- Trade indexes
CREATE INDEX ix_trades_token_time ON trades(token_id, executed_at DESC);
CREATE INDEX ix_trades_user_time ON trades(user_id, executed_at DESC);
CREATE INDEX ix_trades_address_time ON trades(user_address, executed_at DESC);
CREATE INDEX ix_trades_tx_hash ON trades(tx_hash);
CREATE INDEX ix_trades_side_time ON trades(side, executed_at DESC);

-- Position indexes
CREATE INDEX ix_positions_user ON positions(user_id);
CREATE INDEX ix_positions_token ON positions(token_id);
CREATE INDEX ix_positions_value ON positions(qty) WHERE qty > 0; -- only active positions

-- Endorsement indexes
CREATE INDEX ix_endorsements_influencer ON endorsements(influencer_id);
CREATE INDEX ix_endorsements_token ON endorsements(token_id);
CREATE INDEX ix_endorsements_status ON endorsements(status);

-- Liquidity event indexes
CREATE INDEX ix_liquidity_token_time ON liquidity_events(token_id, occurred_at DESC);
CREATE INDEX ix_liquidity_action ON liquidity_events(action);

-- Enhanced pledge indexes
CREATE INDEX ix_pledges_status ON pledges(status);
CREATE INDEX ix_pledges_expires ON pledges(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- STEP 5: ADD MISSING FOREIGN KEYS
-- =====================================================

-- Add missing FK constraints from original runbook
ALTER TABLE pledges ADD CONSTRAINT fk_pledges_user 
    FOREIGN KEY (user_address) REFERENCES users(wallet_address) ON DELETE CASCADE;

ALTER TABLE pledges ADD CONSTRAINT fk_pledges_influencer 
    FOREIGN KEY (influencer_address) REFERENCES influencers(wallet_address) ON DELETE CASCADE;

ALTER TABLE pledge_events ADD CONSTRAINT fk_events_pledge_user 
    FOREIGN KEY (user_address) REFERENCES users(wallet_address) ON DELETE SET NULL;

ALTER TABLE pledge_events ADD CONSTRAINT fk_events_pledge_influencer 
    FOREIGN KEY (influencer_address) REFERENCES influencers(wallet_address) ON DELETE CASCADE;

-- Add FK for trades to reference users by address (optional)
-- Note: trades.user_address is for identification, trades.user_id is the FK

-- =====================================================
-- STEP 6: TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Update positions when trades happen
CREATE OR REPLACE FUNCTION update_position_on_trade()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert position
    INSERT INTO positions (user_id, token_id, qty, cost_basis_usd, first_buy_at, last_buy_at, last_sell_at, updated_at)
    VALUES (
        NEW.user_id,
        NEW.token_id,
        CASE WHEN NEW.side = 'buy' THEN NEW.qty ELSE -NEW.qty END,
        CASE WHEN NEW.side = 'buy' THEN NEW.usd_value ELSE -NEW.usd_value END,
        CASE WHEN NEW.side = 'buy' THEN NEW.executed_at ELSE NULL END,
        CASE WHEN NEW.side = 'buy' THEN NEW.executed_at ELSE NULL END,
        CASE WHEN NEW.side = 'sell' THEN NEW.executed_at ELSE NULL END,
        NOW()
    )
    ON CONFLICT (user_id, token_id) DO UPDATE SET
        qty = positions.qty + CASE WHEN NEW.side = 'buy' THEN NEW.qty ELSE -NEW.qty END,
        cost_basis_usd = CASE 
            WHEN NEW.side = 'buy' THEN positions.cost_basis_usd + NEW.usd_value
            ELSE positions.cost_basis_usd -- selling doesn't change cost basis
        END,
        avg_buy_price_usd = CASE
            WHEN NEW.side = 'buy' AND (positions.qty + NEW.qty) > 0 THEN 
                (positions.cost_basis_usd + NEW.usd_value) / (positions.qty + NEW.qty)
            ELSE positions.avg_buy_price_usd
        END,
        realized_pnl_usd = CASE
            WHEN NEW.side = 'sell' THEN 
                positions.realized_pnl_usd + (NEW.usd_value - (NEW.qty * COALESCE(positions.avg_buy_price_usd, 0)))
            ELSE positions.realized_pnl_usd
        END,
        first_buy_at = CASE 
            WHEN NEW.side = 'buy' AND positions.first_buy_at IS NULL THEN NEW.executed_at
            ELSE positions.first_buy_at 
        END,
        last_buy_at = CASE WHEN NEW.side = 'buy' THEN NEW.executed_at ELSE positions.last_buy_at END,
        last_sell_at = CASE WHEN NEW.side = 'sell' THEN NEW.executed_at ELSE positions.last_sell_at END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update positions on trade
CREATE TRIGGER update_positions_trigger
    AFTER INSERT ON trades
    FOR EACH ROW
    WHEN (NEW.user_id IS NOT NULL)
    EXECUTE FUNCTION update_position_on_trade();

-- Update token status when launched
CREATE OR REPLACE FUNCTION update_token_status_on_launch()
RETURNS TRIGGER AS $$
BEGIN
    -- When influencer gets launched_at, update corresponding token
    IF NEW.launched_at IS NOT NULL AND OLD.launched_at IS NULL THEN
        UPDATE tokens 
        SET status = 'live', 
            launched_at = NEW.launched_at,
            updated_at = NOW()
        WHERE influencer_id = NEW.id AND status = 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync token status with influencer launch
CREATE TRIGGER sync_token_launch_trigger
    AFTER UPDATE OF launched_at ON influencers
    FOR EACH ROW
    EXECUTE FUNCTION update_token_status_on_launch();

-- Updated_at triggers for new tables
CREATE TRIGGER update_tokens_updated_at
    BEFORE UPDATE ON tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 7: BASIC ANALYTICS ROLLUP TABLES
-- =====================================================

-- Daily token metrics
CREATE TABLE token_metrics_day (
    token_id INTEGER NOT NULL REFERENCES tokens(id),
    date DATE NOT NULL,
    price_open NUMERIC(18,8),
    price_close NUMERIC(18,8),
    price_high NUMERIC(18,8),
    price_low NUMERIC(18,8),
    volume_usd NUMERIC(18,2) DEFAULT 0,
    trades_count INTEGER DEFAULT 0,
    unique_buyers INTEGER DEFAULT 0,
    unique_sellers INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (token_id, date)
);

CREATE INDEX ix_token_metrics_date ON token_metrics_day(date);
CREATE INDEX ix_token_metrics_volume ON token_metrics_day(volume_usd DESC);

-- Daily user trading activity
CREATE TABLE user_trading_day (
    user_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    trades_count INTEGER DEFAULT 0,
    volume_usd NUMERIC(18,2) DEFAULT 0,
    tokens_traded INTEGER DEFAULT 0,
    pnl_realized_usd NUMERIC(18,2) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, date)
);

CREATE INDEX ix_user_trading_date ON user_trading_day(date);

-- =====================================================
-- STEP 8: HELPER FUNCTIONS
-- =====================================================

-- Function to get user's current portfolio value
CREATE OR REPLACE FUNCTION get_user_portfolio_value(user_id_param INTEGER)
RETURNS NUMERIC AS $$
DECLARE
    total_value NUMERIC(18,2) := 0;
BEGIN
    SELECT COALESCE(SUM(p.qty * COALESCE(tm.price_close, 0)), 0)
    INTO total_value
    FROM positions p
    LEFT JOIN tokens t ON t.id = p.token_id
    LEFT JOIN token_metrics_day tm ON tm.token_id = p.token_id 
        AND tm.date = CURRENT_DATE - 1 -- yesterday's closing price
    WHERE p.user_id = user_id_param AND p.qty > 0;
    
    RETURN total_value;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate token holder count
CREATE OR REPLACE FUNCTION get_token_holder_count(token_id_param INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) 
        FROM positions 
        WHERE token_id = token_id_param AND qty > 0
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 9: VIEWS FOR COMMON QUERIES
-- =====================================================

-- Enhanced token view with metrics
CREATE VIEW tokens_display AS
SELECT 
    t.*,
    i.name as influencer_name,
    i.handle as influencer_handle,
    i.followers_count,
    COALESCE(tm.price_close, 0) as current_price_usd,
    COALESCE(tm.volume_usd, 0) as volume_24h_usd,
    COALESCE(get_token_holder_count(t.id), 0) as holder_count,
    CASE 
        WHEN t.status = 'live' THEN true 
        ELSE false 
    END as is_trading
FROM tokens t
JOIN influencers i ON i.id = t.influencer_id
LEFT JOIN token_metrics_day tm ON tm.token_id = t.id 
    AND tm.date = CURRENT_DATE - 1;

-- User portfolio summary view
CREATE VIEW user_portfolios AS
SELECT 
    u.id as user_id,
    u.wallet_address,
    u.display_name,
    COUNT(p.token_id) as tokens_held,
    COALESCE(get_user_portfolio_value(u.id), 0) as portfolio_value_usd,
    COALESCE(SUM(p.cost_basis_usd), 0) as total_invested_usd,
    COALESCE(SUM(p.realized_pnl_usd), 0) as realized_pnl_usd
FROM users u
LEFT JOIN positions p ON p.user_id = u.id AND p.qty > 0
GROUP BY u.id, u.wallet_address, u.display_name;

-- =====================================================
-- STEP 10: VERIFICATION QUERIES
-- =====================================================

-- Check all new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tokens', 'trades', 'positions', 'endorsements', 'liquidity_events', 'token_metrics_day', 'user_trading_day')
ORDER BY table_name;

-- Check foreign keys are in place
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
AND tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('tokens', 'trades', 'positions', 'endorsements', 'liquidity_events', 'pledges', 'pledge_events')
ORDER BY tc.table_name;

-- Test views work
SELECT COUNT(*) as tokens_count FROM tokens_display;
SELECT COUNT(*) as portfolio_count FROM user_portfolios;

-- =====================================================
-- USAGE NOTES
-- =====================================================

/*
DEPLOYMENT PLAN:
1. Run backup: pg_dump TokenFactory > backup_$(date +%Y%m%d_%H%M%S).sql
2. Execute this script during maintenance window
3. Test with sample data:
   - Insert a token
   - Create some trades
   - Verify positions update automatically
   - Check views return data

NEXT PHASE WILL ADD:
- Compliance tables (KYC, sanctions, consents)
- Market data tables (token_prices, social metrics)
- Advanced analytics rollups
- Trending system
- Platform activity logging

SAMPLE TEST DATA:
-- Insert test token
INSERT INTO tokens (influencer_id, name, ticker, status) 
VALUES (1, 'TestCoin', 'TEST', 'live');

-- Insert test trade (will auto-update position)
INSERT INTO trades (token_id, user_id, user_address, side, qty, price_usd, usd_value, tx_hash)
VALUES (1, 1, '0x1234...', 'buy', 100, 1.50, 150.00, '0xabcd...');
*/