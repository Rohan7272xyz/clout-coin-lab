-- ===== RUN THIS IN YOUR POSTGRESQL DATABASE =====
-- File: database/schema.sql

-- Influencers table
CREATE TABLE influencers (
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokens table
CREATE TABLE tokens (
    id SERIAL PRIMARY KEY,
    influencer_id INTEGER REFERENCES influencers(id),
    name VARCHAR(255) NOT NULL, -- "LoganCoin"
    symbol VARCHAR(10) NOT NULL, -- "LOGAN"
    total_supply BIGINT DEFAULT 1000000,
    influencer_allocation BIGINT, -- 30% = 300,000
    liquidity_allocation BIGINT, -- 70% = 700,000
    contract_address VARCHAR(42),
    liquidity_pool_address VARCHAR(42),
    lp_tokens_locked VARCHAR(42), -- LP lock contract address
    deploy_tx_hash VARCHAR(66),
    liquidity_tx_hash VARCHAR(66),
    lock_tx_hash VARCHAR(66),
    status VARCHAR(50) DEFAULT 'pending', -- pending, deploying, deployed, live, failed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Investments table (user holdings)
CREATE TABLE investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER, -- from your auth system
    token_id INTEGER REFERENCES tokens(id),
    amount_invested_eth DECIMAL(18,18),
    tokens_received BIGINT,
    purchase_price DECIMAL(18,18),
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Waitlist table
CREATE TABLE waitlist (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    wallet_address VARCHAR(42),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token prices (for tracking)
CREATE TABLE token_prices (
    id SERIAL PRIMARY KEY,
    token_id INTEGER REFERENCES tokens(id),
    price_eth DECIMAL(18,18),
    price_usd DECIMAL(10,2),
    market_cap_usd DECIMAL(15,2),
    volume_24h_usd DECIMAL(15,2),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample influencers (matches your frontend)
INSERT INTO influencers (name, handle, email, followers_count, category, description, avatar_url, verified, status) VALUES
('CryptoKing', '@cryptoking', 'cryptoking@example.com', 2400000, 'Crypto', 'Leading crypto educator and market analyst with deep insights into DeFi and blockchain technology.', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('TechGuru', '@techguru', 'techguru@example.com', 1800000, 'Technology', 'Silicon Valley insider and startup advisor covering emerging tech trends and innovation.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('FitnessQueen', '@fitnessqueen', 'fitnessqueen@example.com', 3100000, 'Fitness', 'Wellness coach and lifestyle influencer inspiring millions to live their healthiest lives.', 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('GameMaster', '@gamemaster', 'gamemaster@example.com', 4200000, 'Gaming', 'Professional gamer and streamer with expertise in competitive esports and game reviews.', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('FoodieExplorer', '@foodieexplorer', 'foodie@example.com', 2800000, 'Food & Travel', 'Culinary adventurer sharing global cuisine experiences and hidden food gems worldwide.', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('BusinessMogul', '@businessmogul', 'business@example.com', 1900000, 'Business', 'Serial entrepreneur and business strategist sharing insights on scaling companies and investing.', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('ArtVisioneer', '@artvisioneer', 'art@example.com', 1500000, 'Art & Design', 'Digital artist and creative director pushing boundaries in NFT art and design innovation.', 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('MusicMaestro', '@musicmaestro', 'music@example.com', 3600000, 'Music', 'Producer and artist creating viral music content and discovering emerging talent in the industry.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('EcoWarrior', '@ecowarrior', 'eco@example.com', 2200000, 'Environment', 'Environmental activist and sustainability advocate promoting eco-friendly living and climate action.', 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face', true, 'approved'),
('LifeHacker', '@lifehacker', 'lifehacker@example.com', 2000000, 'Lifestyle', 'Productivity expert and life optimization coach helping people maximize their potential daily.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face', true, 'approved');