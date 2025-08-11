-- Migration: Add Network Columns to Tokens Table
-- File: 20250811_add_network_columns_to_tokens.sql
-- Description: Adds network and chain_id columns to support multi-blockchain deployment
-- Author: CoinFluence Team
-- Date: 2025-08-11

-- ========================================
-- BEGIN TRANSACTION FOR SAFETY
-- ========================================
BEGIN;

-- ========================================
-- STEP 1: Add Missing Columns to tokens table
-- ========================================

-- Add network column with proper constraints
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS network VARCHAR(50) NOT NULL DEFAULT 'base-sepolia';

-- Add chain_id column with proper constraints  
ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS chain_id INTEGER NOT NULL DEFAULT 84532;

-- Add network type constraint to ensure only valid networks
ALTER TABLE tokens 
ADD CONSTRAINT tokens_network_check 
CHECK (network IN ('base-sepolia', 'base-mainnet', 'ethereum', 'polygon', 'arbitrum'));

-- Add chain_id constraint to ensure valid chain IDs
ALTER TABLE tokens 
ADD CONSTRAINT tokens_chain_id_check 
CHECK (chain_id IN (1, 8453, 84532, 137, 42161));

-- ========================================
-- STEP 2: Update Existing Records
-- ========================================

-- Update existing Skibidi token record with correct network info
UPDATE tokens 
SET 
    network = 'base-sepolia',
    chain_id = 84532,
    updated_at = CURRENT_TIMESTAMP
WHERE contract_address = '0x9592D43821f79595920fF793f22cA1C5f567957d';

-- Update any other existing records to have proper network data
UPDATE tokens 
SET 
    network = 'base-sepolia',
    chain_id = 84532,
    updated_at = CURRENT_TIMESTAMP
WHERE network IS NULL OR chain_id IS NULL;

-- ========================================
-- STEP 3: Add Indexes for Performance
-- ========================================

-- Index on network for filtering
CREATE INDEX IF NOT EXISTS idx_tokens_network ON tokens(network);

-- Index on chain_id for filtering
CREATE INDEX IF NOT EXISTS idx_tokens_chain_id ON tokens(chain_id);

-- Composite index for network + status queries
CREATE INDEX IF NOT EXISTS idx_tokens_network_status ON tokens(network, status);

-- Index on contract_address for quick lookups (should already exist but ensure it's there)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_contract_address ON tokens(contract_address);

-- ========================================
-- STEP 4: Add Comments for Documentation
-- ========================================

-- Add column comments for documentation
COMMENT ON COLUMN tokens.network IS 'Blockchain network identifier (base-sepolia, base-mainnet, etc.)';
COMMENT ON COLUMN tokens.chain_id IS 'Blockchain chain ID (84532 for Base Sepolia, 8453 for Base Mainnet, etc.)';

-- ========================================
-- STEP 5: Verify the Changes
-- ========================================

-- Display updated table structure
\echo '========================================';
\echo 'TOKENS TABLE STRUCTURE AFTER MIGRATION:';
\echo '========================================';
\d tokens;

-- Verify the Skibidi token has correct data
\echo '';
\echo '========================================';
\echo 'SKIBIDI TOKEN VERIFICATION:';
\echo '========================================';
SELECT 
    id,
    influencer_id,
    name,
    ticker,
    contract_address,
    network,
    chain_id,
    status,
    launched_at
FROM tokens 
WHERE contract_address = '0x9592D43821f79595920fF793f22cA1C5f567957d';

-- Check all tokens with their network info
\echo '';
\echo '========================================';
\echo 'ALL TOKENS WITH NETWORK INFO:';
\echo '========================================';
SELECT 
    t.id,
    t.name as token_name,
    t.ticker,
    t.network,
    t.chain_id,
    t.status,
    i.name as influencer_name
FROM tokens t
LEFT JOIN influencers i ON t.influencer_id = i.id
ORDER BY t.id;

-- ========================================
-- STEP 6: Test the API Query
-- ========================================

-- Test the enhanced coin query that your API will use
\echo '';
\echo '========================================';
\echo 'TESTING API QUERY FOR SKIBIDI:';
\echo '========================================';
SELECT 
    i.id,
    i.name,
    i.handle,
    i.token_name,
    i.token_symbol,
    i.status,
    i.wallet_address,
    i.launched_at,
    t.contract_address,
    t.network,
    t.status as token_status,
    t.total_supply as token_total_supply,
    t.chain_id,
    t.launched_at as token_launched_at
FROM influencers i
LEFT JOIN tokens t ON i.id = t.influencer_id
WHERE LOWER(i.token_symbol) = LOWER('skbdi')
   OR LOWER(i.name) = LOWER('skibidi')
   OR LOWER(i.handle) = LOWER('@skibidi');

-- ========================================
-- COMMIT TRANSACTION
-- ========================================

-- If we got here without errors, commit the changes
COMMIT;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

\echo '';
\echo '✅ ========================================';
\echo '✅ MIGRATION COMPLETED SUCCESSFULLY!';
\echo '✅ ========================================';
\echo '✅ Changes applied:';
\echo '✅ - Added network column to tokens table';
\echo '✅ - Added chain_id column to tokens table';
\echo '✅ - Added constraints for data integrity';
\echo '✅ - Updated existing Skibidi token data';
\echo '✅ - Added performance indexes';
\echo '✅ - Added documentation comments';
\echo '✅ ========================================';
\echo '✅ Your database is now ready for production!';
\echo '✅ Test your API: curl http://localhost:3000/api/influencer/coin/skibidi';
\echo '✅ ========================================';