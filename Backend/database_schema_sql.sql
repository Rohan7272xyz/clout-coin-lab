-- ===== COMPLETE TOKEN FACTORY DATABASE SCHEMA =====
-- Run this in your PostgreSQL database

-- Users table (missing from original schema)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42),
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    profile_picture_url TEXT,
    status VARCHAR(20) DEFAULT 'browser', -- browser, investor, influencer, admin
    status_updated_by VARCHAR(255),
    status_updated_at TIMESTAMP,
    total_invested DECIMAL(18,18) DEFAULT 0,
    portfolio_value DECIMAL(18,18) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Influencers table (already exists in your schema)
CREATE TABLE IF NOT EXISTS influencers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    handle VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42),
    followers_count INTEGER,
    category VARCHAR(100),
    description TEXT,
    avatar_url TEXT,
    verified BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, live, rejected
    pledge_threshold_eth DECIMAL(18,18) DEFAULT 10,
    total_pledged_eth DECIMAL(18,18) DEFAULT 0,
    is_approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP,
    launched_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokens table (already exists)
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    influencer_id INTEGER REFERENCES influencers(id),
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    total_supply BIGINT DEFAULT 1000000,
    influencer_allocation BIGINT,
    liquidity_allocation BIGINT,
    contract_address VARCHAR(42),
    liquidity_pool_address VARCHAR(42),
    lp_tokens_locked VARCHAR(42),
    deploy_tx_hash VARCHAR(66),
    liquidity_tx_hash VARCHAR(66),
    lock_tx_hash VARCHAR(66),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pledges table (missing but referenced in routes)
CREATE TABLE IF NOT EXISTS pledges (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    influencer_address VARCHAR(42) NOT NULL,
    eth_amount DECIMAL(18,18) DEFAULT 0,
    usdc_amount DECIMAL(18,18) DEFAULT 0,
    has_withdrawn BOOLEAN DEFAULT false,
    token_address VARCHAR(42),
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investments table (already exists)
CREATE TABLE IF NOT EXISTS investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    token_id INTEGER REFERENCES tokens(id),
    amount_invested_eth DECIMAL(18,18),
    tokens_received BIGINT,
    purchase_price DECIMAL(18,18),
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waitlist table (already exists)
CREATE TABLE IF NOT EXISTS waitlist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token prices table (already exists)
CREATE TABLE IF NOT EXISTS token_prices (
    id SERIAL PRIMARY KEY,
    token_id INTEGER REFERENCES tokens(id),
    price_eth DECIMAL(18,18),
    price_usd DECIMAL(10,2),
    market_cap_usd DECIMAL(15,2),
    volume_24h_usd DECIMAL(15,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional dashboard tables (from your migration file)
CREATE TABLE IF NOT EXISTS token_gifts (
    id SERIAL PRIMARY KEY,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    amount DECIMAL(18,18) NOT NULL,
    message TEXT,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    influencer_id INTEGER REFERENCES influencers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, influencer_id)
);

CREATE TABLE IF NOT EXISTS platform_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL UNIQUE,
    total_volume DECIMAL(18,2),
    total_fees DECIMAL(18,2),
    new_users INTEGER,
    active_users INTEGER,
    tokens_created INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_influencers_wallet ON influencers(wallet_address);
CREATE INDEX IF NOT EXISTS idx_influencers_status ON influencers(status);
CREATE INDEX IF NOT EXISTS idx_tokens_contract ON tokens(contract_address);
CREATE INDEX IF NOT EXISTS idx_pledges_user ON pledges(user_address);
CREATE INDEX IF NOT EXISTS idx_pledges_influencer ON pledges(influencer_address);
CREATE INDEX IF NOT EXISTS idx_token_gifts_from ON token_gifts(from_address);
CREATE INDEX IF NOT EXISTS idx_token_gifts_to ON token_gifts(to_address);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON platform_metrics(metric_date);

-- Insert sample data (enhanced with more fields)
INSERT INTO influencers (name, handle, email, followers_count, category, description, avatar_url, verified, status, pledge_threshold_eth, total_pledged_eth) VALUES
('CryptoKing', '@cryptoking', 'cryptoking@example.com', 2400000, 'Crypto', 'Leading crypto educator and market analyst with deep insights into DeFi and blockchain technology.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', true, 'approved', 15.0, 18.5),
('TechGuru', '@techguru', 'techguru@example.com', 1800000, 'Technology', 'Silicon Valley insider and startup advisor covering emerging tech trends and innovation.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', true, 'approved', 12.0, 14.2),
('FitnessQueen', '@fitnessqueen', 'fitnessqueen@example.com', 3100000, 'Fitness', 'Wellness coach and lifestyle influencer inspiring millions to live their healthiest lives.', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', true, 'approved', 20.0, 22.8),
('GameMaster', '@gamemaster', 'gamemaster@example.com', 4200000, 'Gaming', 'Professional gamer and streamer with expertise in competitive esports and game reviews.', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face', true, 'approved', 25.0, 28.3),
('FoodieExplorer', '@foodieexplorer', 'foodie@example.com', 2800000, 'Food & Travel', 'Culinary adventurer sharing global cuisine experiences and hidden food gems worldwide.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', true, 'approved', 18.0, 19.7),
('BusinessMogul', '@businessmogul', 'business@example.com', 1900000, 'Business', 'Serial entrepreneur and business strategist sharing insights on scaling companies and investing.', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face', true, 'approved', 16.0, 17.2),
('ArtVisioneer', '@artvisioneer', 'art@example.com', 1500000, 'Art & Design', 'Digital artist and creative director pushing boundaries in NFT art and design innovation.', 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face', true, 'approved', 14.0, 15.8),
('MusicMaestro', '@musicmaestro', 'music@example.com', 3600000, 'Music', 'Producer and artist creating viral music content and discovering emerging talent in the industry.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face', true, 'approved', 22.0, 24.1),
('EcoWarrior', '@ecowarrior', 'eco@example.com', 2200000, 'Environment', 'Environmental activist and sustainability advocate promoting eco-friendly living and climate action.', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face', true, 'approved', 17.0, 18.9),
('LifeHacker', '@lifehacker', 'lifehacker@example.com', 2000000, 'Lifestyle', 'Productivity expert and life optimization coach helping people maximize their potential daily.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', true, 'approved', 15.5, 16.8)
ON CONFLICT (email) DO NOTHING;

-- Insert sample users
INSERT INTO users (firebase_uid, wallet_address, email, display_name, status) VALUES
('admin-uid-123', '0x1234567890123456789012345678901234567890', 'admin@tokenfactory.com', 'Admin User', 'admin'),
('influencer-uid-456', '0x2345678901234567890123456789012345678901', 'cryptoking@example.com', 'CryptoKing', 'influencer'),
('investor-uid-789', '0x3456789012345678901234567890123456789012', 'investor@example.com', 'Sample Investor', 'investor')
ON CONFLICT (email) DO NOTHING;

-- Insert sample pledges
INSERT INTO pledges (user_address, influencer_address, eth_amount, usdc_amount) VALUES
('0x3456789012345678901234567890123456789012', '0x2345678901234567890123456789012345678901', 5.5, 0),
('0x4567890123456789012345678901234567890123', '0x2345678901234567890123456789012345678901', 3.2, 0),
('0x5678901234567890123456789012345678901234', '0x2345678901234567890123456789012345678901', 7.8, 0)
ON CONFLICT DO NOTHING;