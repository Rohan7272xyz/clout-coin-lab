-- Backend/database/migrations/20250811_add_liquidity_columns.sql
-- Phase 5a: Add liquidity tracking columns to support automated pool creation

-- Add liquidity-related columns to tokens table
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS pool_address VARCHAR(42);
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS liquidity_token_id VARCHAR(50);
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS liquidity_eth_amount DECIMAL(18, 8);
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS liquidity_token_amount BIGINT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS liquidity_created_at TIMESTAMP;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS liquidity_tx_hash VARCHAR(66);
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS liquidity_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS liquidity_lock_until TIMESTAMP;

-- Add trading status to influencers table
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS pool_address VARCHAR(42);
ALTER TABLE influencers ADD COLUMN IF NOT EXISTS trading_status VARCHAR(20) DEFAULT 'pending' CHECK (trading_status IN ('pending', 'live', 'paused', 'locked'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tokens_pool_address ON tokens(pool_address);
CREATE INDEX IF NOT EXISTS idx_tokens_liquidity_created ON tokens(liquidity_created_at);
CREATE INDEX IF NOT EXISTS idx_influencers_trading_status ON influencers(trading_status);
CREATE INDEX IF NOT EXISTS idx_influencers_pool_address ON influencers(pool_address);

-- Add comments for documentation
COMMENT ON COLUMN tokens.pool_address IS 'Uniswap V3 pool contract address';
COMMENT ON COLUMN tokens.liquidity_token_id IS 'Uniswap V3 NFT position token ID';
COMMENT ON COLUMN tokens.liquidity_eth_amount IS 'ETH amount added to liquidity pool';
COMMENT ON COLUMN tokens.liquidity_token_amount IS 'Token amount added to liquidity pool';
COMMENT ON COLUMN tokens.liquidity_created_at IS 'Timestamp when liquidity was added';
COMMENT ON COLUMN tokens.liquidity_tx_hash IS 'Transaction hash of liquidity addition';
COMMENT ON COLUMN tokens.liquidity_locked IS 'Whether liquidity is locked in LiquidityLocker contract';
COMMENT ON COLUMN tokens.liquidity_lock_until IS 'Timestamp until which liquidity is locked';

COMMENT ON COLUMN influencers.pool_address IS 'Uniswap V3 pool address for this influencer token';
COMMENT ON COLUMN influencers.trading_status IS 'Current trading status of the token';

-- Create a view for easy liquidity status checking
CREATE OR REPLACE VIEW v_token_liquidity_status AS
SELECT 
    i.id as influencer_id,
    i.name as influencer_name,
    i.token_symbol,
    i.wallet_address,
    i.trading_status,
    t.contract_address as token_address,
    t.pool_address,
    t.liquidity_token_id,
    t.liquidity_eth_amount,
    t.liquidity_token_amount,
    t.liquidity_created_at,
    t.liquidity_tx_hash,
    t.liquidity_locked,
    t.liquidity_lock_until,
    t.network,
    t.chain_id,
    CASE 
        WHEN t.pool_address IS NOT NULL AND i.trading_status = 'live' THEN 'tradeable'
        WHEN t.pool_address IS NOT NULL AND i.trading_status = 'pending' THEN 'pool_created_pending_activation'
        WHEN t.contract_address IS NOT NULL AND t.pool_address IS NULL THEN 'token_deployed_no_liquidity'
        WHEN t.contract_address IS NULL THEN 'no_token'
        ELSE 'unknown'
    END as liquidity_status
FROM influencers i
LEFT JOIN tokens t ON i.id = t.influencer_id;

-- Grant permissions (adjust based on your user setup)
-- GRANT SELECT ON v_token_liquidity_status TO your_app_user;

-- Insert initial data update for existing tokens (if any)
-- This sets existing live tokens to 'pending' trading status so automation can be applied
UPDATE influencers 
SET trading_status = 'pending' 
WHERE status = 'live' 
  AND trading_status IS NULL;

-- Update any existing token records to have 'deployed' status if they have contract addresses
UPDATE tokens 
SET status = 'deployed' 
WHERE contract_address IS NOT NULL 
  AND status = 'live' 
  AND pool_address IS NULL;

-- Add automation tracking to pledge_events for better monitoring
-- This allows us to track automation successes and failures

-- Example queries for monitoring (commented out - for reference):

-- Check all tokens that need liquidity:
/*
SELECT * FROM v_token_liquidity_status 
WHERE liquidity_status = 'token_deployed_no_liquidity';
*/

-- Check all successful automated liquidity creations:
/*
SELECT * FROM pledge_events 
WHERE event_type = 'liquidity_created' 
ORDER BY created_at DESC;
*/

-- Check liquidity automation failures:
/*
SELECT * FROM pledge_events 
WHERE event_type = 'liquidity_failed' 
ORDER BY created_at DESC;
*/

-- Get trading readiness dashboard:
/*
SELECT 
    trading_status,
    liquidity_status,
    COUNT(*) as count
FROM v_token_liquidity_status 
GROUP BY trading_status, liquidity_status
ORDER BY trading_status, liquidity_status;
*/