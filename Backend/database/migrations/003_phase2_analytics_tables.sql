-- ===================================================================
-- TOKENFACTORY PHASE 2: YAHOO FINANCE-STYLE ANALYTICS MIGRATION
-- File: 003_phase2_analytics_tables.sql
-- Purpose: Add comprehensive financial analytics infrastructure
-- Dependencies: Requires Phase 1 migration (002_phase1_core_tables.sql)
-- Optimized for: CoinDetail.tsx frontend components
-- ===================================================================

-- Start transaction
BEGIN;

-- ===================================================================
-- ENUMS AND TYPES
-- ===================================================================

-- Time horizon enum for performance tracking
DO $$ BEGIN
    CREATE TYPE time_horizon AS ENUM (
        '1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', 'MAX'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Event types for token events
DO $$ BEGIN
    CREATE TYPE token_event_kind AS ENUM (
        'launch', 'liquidity', 'listing', 'unlock', 'governance', 'audit', 'partnership'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Rating types for analyst ratings
DO $$ BEGIN
    CREATE TYPE analyst_rating AS ENUM (
        'strong_buy', 'buy', 'hold', 'sell', 'strong_sell'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Risk tiers
DO $$ BEGIN
    CREATE TYPE risk_tier AS ENUM (
        'low', 'medium', 'high', 'extreme'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- OHLCV interval types
DO $$ BEGIN
    CREATE TYPE ohlcv_interval AS ENUM (
        '1m', '5m', '15m', '1h', '4h', '1d', '1w'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Market status types
DO $$ BEGIN
    CREATE TYPE market_status AS ENUM (
        'open', 'closed', 'pre_market', 'after_hours', 'halted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- News types
DO $$ BEGIN
    CREATE TYPE news_type AS ENUM (
        'news', 'press', 'sec', 'announcement', 'partnership', 'technical'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===================================================================
-- 1. REAL-TIME QUOTES & REFERENCE DATA (PRIORITY 1 - Powers Quote Header)
-- ===================================================================

-- Enhanced token reference data
CREATE TABLE IF NOT EXISTS token_reference (
    token_id INTEGER PRIMARY KEY REFERENCES tokens(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    contract_address VARCHAR(66),
    chain_id INTEGER DEFAULT 1,
    launch_date TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    website_url VARCHAR(500),
    whitepaper_url VARCHAR(500),
    logo_url VARCHAR(500),
    category VARCHAR(50),
    headquarters VARCHAR(100),
    employees INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_contract_address CHECK (
        contract_address IS NULL OR 
        contract_address ~* '^0x[a-fA-F0-9]{40}$'
    ),
    CONSTRAINT valid_website_url CHECK (
        website_url IS NULL OR 
        website_url ~* '^https?://'
    )
);

-- Real-time quotes table - Powers your quote header component
CREATE TABLE IF NOT EXISTS token_quotes_realtime (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Core pricing data for your quote header
    price_usd NUMERIC(18,8) NOT NULL,
    bid_usd NUMERIC(18,8),
    ask_usd NUMERIC(18,8),
    bid_qty NUMERIC(18,8),
    ask_qty NUMERIC(18,8),
    
    -- Daily movement data
    day_open NUMERIC(18,8),
    day_high NUMERIC(18,8),
    day_low NUMERIC(18,8),
    prev_close NUMERIC(18,8),
    
    -- Volume and market data
    volume_24h_usd NUMERIC(18,2),
    volume_24h NUMERIC(18,8),
    market_cap_usd NUMERIC(18,2),
    
    -- Supply data for your interface
    circ_supply NUMERIC(18,8),
    total_supply NUMERIC(18,8),
    fully_diluted_usd NUMERIC(18,2),
    
    -- Market status
    market_status market_status DEFAULT 'open',
    halted BOOLEAN DEFAULT FALSE,
    
    -- After hours data
    after_hours_price NUMERIC(18,8),
    after_hours_change NUMERIC(18,8),
    after_hours_change_pct NUMERIC(8,4),
    after_hours_time TIMESTAMPTZ,
    
    PRIMARY KEY (token_id, captured_at),
    
    CONSTRAINT positive_price CHECK (price_usd > 0),
    CONSTRAINT valid_supply CHECK (circ_supply <= total_supply)
);

-- Index for fast quote lookups
CREATE INDEX IF NOT EXISTS idx_token_quotes_latest 
ON token_quotes_realtime (token_id, captured_at DESC);

-- ===================================================================
-- 2. OHLCV TIME SERIES DATA (PRIORITY 2 - Powers Chart Component)
-- ===================================================================

-- 1-minute OHLCV data
CREATE TABLE IF NOT EXISTS ohlcv_1m (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    open_price NUMERIC(18,8) NOT NULL,
    high_price NUMERIC(18,8) NOT NULL,
    low_price NUMERIC(18,8) NOT NULL,
    close_price NUMERIC(18,8) NOT NULL,
    volume NUMERIC(18,8) NOT NULL DEFAULT 0,
    volume_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
    trades_count INTEGER DEFAULT 0,
    
    PRIMARY KEY (token_id, ts),
    
    CONSTRAINT valid_ohlc CHECK (
        high_price >= low_price AND
        high_price >= open_price AND
        high_price >= close_price AND
        low_price <= open_price AND
        low_price <= close_price
    ),
    CONSTRAINT positive_values CHECK (
        open_price > 0 AND high_price > 0 AND 
        low_price > 0 AND close_price > 0 AND
        volume >= 0 AND volume_usd >= 0
    )
);

-- 5-minute OHLCV data
CREATE TABLE IF NOT EXISTS ohlcv_5m (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    open_price NUMERIC(18,8) NOT NULL,
    high_price NUMERIC(18,8) NOT NULL,
    low_price NUMERIC(18,8) NOT NULL,
    close_price NUMERIC(18,8) NOT NULL,
    volume NUMERIC(18,8) NOT NULL DEFAULT 0,
    volume_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
    trades_count INTEGER DEFAULT 0,
    
    PRIMARY KEY (token_id, ts),
    
    CONSTRAINT valid_ohlc CHECK (
        high_price >= low_price AND
        high_price >= open_price AND
        high_price >= close_price AND
        low_price <= open_price AND
        low_price <= close_price
    )
);

-- 1-hour OHLCV data
CREATE TABLE IF NOT EXISTS ohlcv_1h (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    open_price NUMERIC(18,8) NOT NULL,
    high_price NUMERIC(18,8) NOT NULL,
    low_price NUMERIC(18,8) NOT NULL,
    close_price NUMERIC(18,8) NOT NULL,
    volume NUMERIC(18,8) NOT NULL DEFAULT 0,
    volume_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
    trades_count INTEGER DEFAULT 0,
    
    PRIMARY KEY (token_id, ts),
    
    CONSTRAINT valid_ohlc CHECK (
        high_price >= low_price AND
        high_price >= open_price AND
        high_price >= close_price AND
        low_price <= open_price AND
        low_price <= close_price
    )
);

-- 1-day OHLCV data
CREATE TABLE IF NOT EXISTS ohlcv_1d (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    ts TIMESTAMPTZ NOT NULL,
    open_price NUMERIC(18,8) NOT NULL,
    high_price NUMERIC(18,8) NOT NULL,
    low_price NUMERIC(18,8) NOT NULL,
    close_price NUMERIC(18,8) NOT NULL,
    volume NUMERIC(18,8) NOT NULL DEFAULT 0,
    volume_usd NUMERIC(18,2) NOT NULL DEFAULT 0,
    trades_count INTEGER DEFAULT 0,
    
    PRIMARY KEY (token_id, ts),
    
    CONSTRAINT valid_ohlc CHECK (
        high_price >= low_price AND
        high_price >= open_price AND
        high_price >= close_price AND
        low_price <= open_price AND
        low_price <= close_price
    )
);

-- Indexes for fast chart queries
CREATE INDEX IF NOT EXISTS idx_ohlcv_1m_time ON ohlcv_1m (token_id, ts);
CREATE INDEX IF NOT EXISTS idx_ohlcv_5m_time ON ohlcv_5m (token_id, ts);
CREATE INDEX IF NOT EXISTS idx_ohlcv_1h_time ON ohlcv_1h (token_id, ts);
CREATE INDEX IF NOT EXISTS idx_ohlcv_1d_time ON ohlcv_1d (token_id, ts);

-- ===================================================================
-- 3. PERFORMANCE & STATISTICS (PRIORITY 3 - Powers Statistics Grid)
-- ===================================================================

-- Token performance by time horizon - Powers your performance boxes
CREATE TABLE IF NOT EXISTS token_returns (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    horizon time_horizon NOT NULL,
    return_pct NUMERIC(8,4), -- Can be negative
    return_absolute NUMERIC(18,8),
    start_price NUMERIC(18,8),
    end_price NUMERIC(18,8),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (token_id, horizon)
);

-- Daily statistics - Powers your quote statistics grid
CREATE TABLE IF NOT EXISTS token_stats_daily (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Volume statistics
    avg_volume_10d NUMERIC(18,8),
    avg_volume_30d NUMERIC(18,8),
    
    -- Price ranges
    week_52_high NUMERIC(18,8),
    week_52_low NUMERIC(18,8),
    all_time_high NUMERIC(18,8),
    all_time_high_date DATE,
    all_time_low NUMERIC(18,8),
    all_time_low_date DATE,
    
    -- Volatility metrics
    volatility_30d NUMERIC(8,4),
    volatility_90d NUMERIC(8,4),
    
    -- Performance metrics
    sharpe_30d NUMERIC(8,4),
    sharpe_90d NUMERIC(8,4),
    drawdown_max NUMERIC(8,4),
    
    -- Market metrics
    beta_vs_benchmark_90d NUMERIC(8,4),
    turnover_24h NUMERIC(8,4),
    
    -- Holder metrics
    holders_count INTEGER,
    top10_concentration_pct NUMERIC(8,4),
    gini_coefficient NUMERIC(8,4),
    
    -- Financial ratios (for your quote grid)
    pe_ratio NUMERIC(8,2),
    eps_ttm NUMERIC(18,8),
    target_price_avg NUMERIC(18,8),
    
    PRIMARY KEY (token_id, date)
);

-- Benchmark data for relative performance
CREATE TABLE IF NOT EXISTS benchmarks (
    date DATE PRIMARY KEY,
    btc_price NUMERIC(18,8),
    eth_price NUMERIC(18,8),
    total_crypto_mcap NUMERIC(18,2),
    sp500_price NUMERIC(12,4),
    nasdaq_price NUMERIC(12,4),
    influencer_index NUMERIC(12,4) -- Your custom index
);

-- ===================================================================
-- 4. NEWS & EVENTS (PRIORITY 4 - Powers News Component)
-- ===================================================================

-- Token news feed - Powers your news component
CREATE TABLE IF NOT EXISTS token_news (
    id SERIAL PRIMARY KEY,
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    published_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    url VARCHAR(1000),
    summary TEXT,
    content TEXT,
    thumbnail_url VARCHAR(500),
    news_type news_type DEFAULT 'news',
    sentiment_score NUMERIC(3,2), -- -1.0 to 1.0
    importance_score INTEGER DEFAULT 1, -- 1-10
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_sentiment CHECK (
        sentiment_score IS NULL OR 
        (sentiment_score >= -1.0 AND sentiment_score <= 1.0)
    ),
    CONSTRAINT valid_importance CHECK (
        importance_score >= 1 AND importance_score <= 10
    )
);

-- Token events - Major events for timeline
CREATE TABLE IF NOT EXISTS token_events (
    id SERIAL PRIMARY KEY,
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    occurred_at TIMESTAMPTZ NOT NULL,
    event_kind token_event_kind NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    impact_score INTEGER DEFAULT 5, -- 1-10
    notes_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for news queries
CREATE INDEX IF NOT EXISTS idx_token_news_token_time 
ON token_news (token_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_news_type_time 
ON token_news (news_type, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_token_events_token_time 
ON token_events (token_id, occurred_at DESC);

-- ===================================================================
-- 5. TECHNICAL INDICATORS
-- ===================================================================

-- Daily technical indicators
CREATE TABLE IF NOT EXISTS token_technicals_daily (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- RSI
    rsi_14 NUMERIC(5,2),
    
    -- MACD
    macd NUMERIC(18,8),
    macd_signal NUMERIC(18,8),
    macd_histogram NUMERIC(18,8),
    
    -- Moving averages
    sma_20 NUMERIC(18,8),
    sma_50 NUMERIC(18,8),
    sma_200 NUMERIC(18,8),
    ema_20 NUMERIC(18,8),
    ema_50 NUMERIC(18,8),
    
    -- Bollinger Bands
    bb_upper NUMERIC(18,8),
    bb_middle NUMERIC(18,8),
    bb_lower NUMERIC(18,8),
    bb_width NUMERIC(8,4),
    
    -- Volume indicators
    volume_sma_20 NUMERIC(18,8),
    volume_ratio NUMERIC(8,4),
    
    PRIMARY KEY (token_id, date),
    
    CONSTRAINT valid_rsi CHECK (rsi_14 IS NULL OR (rsi_14 >= 0 AND rsi_14 <= 100)),
    CONSTRAINT valid_bb CHECK (
        bb_upper IS NULL OR bb_middle IS NULL OR bb_lower IS NULL OR
        (bb_upper >= bb_middle AND bb_middle >= bb_lower)
    )
);

-- ===================================================================
-- 6. HOLDER ANALYTICS
-- ===================================================================

-- Holder snapshots
CREATE TABLE IF NOT EXISTS token_holders_snapshot (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    captured_at TIMESTAMPTZ DEFAULT NOW(),
    unique_holders INTEGER NOT NULL,
    top1_holder_pct NUMERIC(8,4),
    top5_holders_pct NUMERIC(8,4),
    top10_holders_pct NUMERIC(8,4),
    top20_holders_pct NUMERIC(8,4),
    median_holding NUMERIC(18,8),
    avg_holding NUMERIC(18,8),
    
    PRIMARY KEY (token_id, captured_at),
    
    CONSTRAINT valid_percentages CHECK (
        top1_holder_pct <= 100 AND top5_holders_pct <= 100 AND
        top10_holders_pct <= 100 AND top20_holders_pct <= 100 AND
        top1_holder_pct <= top5_holders_pct AND
        top5_holders_pct <= top10_holders_pct AND
        top10_holders_pct <= top20_holders_pct
    )
);

-- Daily holder changes
CREATE TABLE IF NOT EXISTS token_holder_changes (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    new_holders INTEGER DEFAULT 0,
    churned_holders INTEGER DEFAULT 0,
    net_holder_change INTEGER DEFAULT 0,
    
    PRIMARY KEY (token_id, date)
);

-- ===================================================================
-- 7. RISK & RATINGS
-- ===================================================================

-- Token risk metrics
CREATE TABLE IF NOT EXISTS token_risk (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Liquidity risk
    liquidity_score INTEGER, -- 1-100
    slippage_1k_bp NUMERIC(8,4), -- Basis points for $1k trade
    slippage_10k_bp NUMERIC(8,4), -- Basis points for $10k trade
    
    -- Smart contract risk
    contract_audit_status VARCHAR(50),
    contract_risks_json JSONB DEFAULT '{}',
    
    -- Market risk
    risk_tier risk_tier DEFAULT 'medium',
    volatility_rank INTEGER, -- 1-100 percentile
    correlation_btc NUMERIC(4,3), -- -1 to 1
    correlation_eth NUMERIC(4,3), -- -1 to 1
    
    PRIMARY KEY (token_id, date),
    
    CONSTRAINT valid_scores CHECK (
        liquidity_score IS NULL OR (liquidity_score >= 1 AND liquidity_score <= 100)
    ),
    CONSTRAINT valid_correlations CHECK (
        correlation_btc IS NULL OR (correlation_btc >= -1 AND correlation_btc <= 1) AND
        correlation_eth IS NULL OR (correlation_eth >= -1 AND correlation_eth <= 1)
    )
);

-- Analyst ratings
CREATE TABLE IF NOT EXISTS token_ratings (
    id SERIAL PRIMARY KEY,
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    analyst_name VARCHAR(100),
    rating analyst_rating NOT NULL,
    target_price NUMERIC(18,8),
    confidence INTEGER DEFAULT 5, -- 1-10
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_confidence CHECK (confidence >= 1 AND confidence <= 10)
);

-- Social sentiment daily rollup
CREATE TABLE IF NOT EXISTS social_sentiment_day (
    token_id INTEGER REFERENCES tokens(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sentiment_score NUMERIC(3,2), -- -1.0 to 1.0
    mentions_count INTEGER DEFAULT 0,
    positive_mentions INTEGER DEFAULT 0,
    negative_mentions INTEGER DEFAULT 0,
    sources_json JSONB DEFAULT '{}',
    
    PRIMARY KEY (token_id, date),
    
    CONSTRAINT valid_sentiment CHECK (
        sentiment_score >= -1.0 AND sentiment_score <= 1.0
    ),
    CONSTRAINT valid_mentions CHECK (
        positive_mentions + negative_mentions <= mentions_count
    )
);

-- ===================================================================
-- 8. MATERIALIZED VIEWS FOR FAST PAGE LOADS
-- ===================================================================

-- Comprehensive coin overview for instant page load
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_coin_overview AS
SELECT 
    t.id as token_id,
    tr.name,
    tr.ticker,
    tr.description,
    tr.category,
    tr.website_url,
    tr.headquarters,
    tr.employees,
    tr.contract_address,
    
    -- Latest quote data
    tq.price_usd as current_price,
    tq.day_open,
    tq.day_high,
    tq.day_low,
    tq.prev_close,
    tq.bid_usd,
    tq.ask_usd,
    tq.bid_qty,
    tq.ask_qty,
    tq.volume_24h_usd,
    tq.market_cap_usd,
    tq.market_status,
    tq.after_hours_price,
    tq.after_hours_change,
    tq.after_hours_change_pct,
    
    -- Calculate daily change
    CASE 
        WHEN tq.prev_close > 0 THEN 
            ((tq.price_usd - tq.prev_close) / tq.prev_close * 100)
        ELSE 0 
    END as price_change_pct_24h,
    
    -- Supply data
    tq.circ_supply,
    tq.total_supply,
    tq.fully_diluted_usd,
    
    -- Latest stats
    ts.avg_volume_30d,
    ts.week_52_high,
    ts.week_52_low,
    ts.all_time_high,
    ts.all_time_high_date,
    ts.beta_vs_benchmark_90d,
    ts.pe_ratio,
    ts.eps_ttm,
    ts.target_price_avg,
    ts.holders_count,
    
    -- Risk data
    tr_risk.risk_tier,
    tr_risk.liquidity_score,
    
    tq.captured_at as quote_time,
    ts.date as stats_date

FROM tokens t
LEFT JOIN token_reference tr ON t.id = tr.token_id
LEFT JOIN LATERAL (
    SELECT * FROM token_quotes_realtime tqr 
    WHERE tqr.token_id = t.id 
    ORDER BY captured_at DESC 
    LIMIT 1
) tq ON true
LEFT JOIN LATERAL (
    SELECT * FROM token_stats_daily tsd 
    WHERE tsd.token_id = t.id 
    ORDER BY date DESC 
    LIMIT 1
) ts ON true
LEFT JOIN LATERAL (
    SELECT * FROM token_risk tr_risk 
    WHERE tr_risk.token_id = t.id 
    ORDER BY date DESC 
    LIMIT 1
) tr_risk ON true;

-- Performance summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_coin_performance AS
SELECT 
    token_id,
    MAX(CASE WHEN horizon = '1D' THEN return_pct END) as return_1d,
    MAX(CASE WHEN horizon = '5D' THEN return_pct END) as return_5d,
    MAX(CASE WHEN horizon = '1M' THEN return_pct END) as return_1m,
    MAX(CASE WHEN horizon = '3M' THEN return_pct END) as return_3m,
    MAX(CASE WHEN horizon = '6M' THEN return_pct END) as return_6m,
    MAX(CASE WHEN horizon = 'YTD' THEN return_pct END) as return_ytd,
    MAX(CASE WHEN horizon = '1Y' THEN return_pct END) as return_1y,
    MAX(CASE WHEN horizon = '3Y' THEN return_pct END) as return_3y,
    MAX(CASE WHEN horizon = '5Y' THEN return_pct END) as return_5y,
    MAX(CASE WHEN horizon = 'MAX' THEN return_pct END) as return_max
FROM token_returns
GROUP BY token_id;

-- Latest technicals view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_coin_technicals AS
SELECT 
    token_id,
    rsi_14,
    macd,
    macd_signal,
    sma_20,
    sma_50,
    sma_200,
    ema_20,
    bb_upper,
    bb_middle,
    bb_lower,
    volume_ratio,
    date as technicals_date
FROM token_technicals_daily ttd1
WHERE date = (
    SELECT MAX(date) 
    FROM token_technicals_daily ttd2 
    WHERE ttd2.token_id = ttd1.token_id
);

-- Holder summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_coin_holders AS
SELECT 
    token_id,
    unique_holders,
    top1_holder_pct,
    top5_holders_pct,
    top10_holders_pct,
    top20_holders_pct,
    median_holding,
    avg_holding,
    captured_at as holders_date
FROM token_holders_snapshot ths1
WHERE captured_at = (
    SELECT MAX(captured_at)
    FROM token_holders_snapshot ths2
    WHERE ths2.token_id = ths1.token_id
);

-- ===================================================================
-- 9. INDEXES FOR PERFORMANCE
-- ===================================================================

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_token_stats_token_date 
ON token_stats_daily (token_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_token_returns_token_horizon 
ON token_returns (token_id, horizon);

CREATE INDEX IF NOT EXISTS idx_token_technicals_token_date 
ON token_technicals_daily (token_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_token_risk_token_date 
ON token_risk (token_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_token_ratings_token_date 
ON token_ratings (token_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_social_sentiment_token_date 
ON social_sentiment_day (token_id, date DESC);

-- ===================================================================
-- 10. TRIGGERS FOR MATERIALIZED VIEW REFRESH
-- ===================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_coin_views()
RETURNS TRIGGER AS $$
BEGIN
    -- Refresh views with minimal lock time
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_coin_overview;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_coin_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_coin_technicals;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_coin_holders;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- 11. INITIAL DATA POPULATION
-- ===================================================================

-- Insert reference data for existing tokens
INSERT INTO token_reference (
    token_id, name, ticker, description, category, contract_address
)
SELECT 
    t.id,
    i.name,
    COALESCE(t.ticker, UPPER(SUBSTRING(i.name FROM 1 FOR 5))),
    'Content creator and influencer',
    'Content Creator',
    t.contract_address
FROM tokens t
JOIN influencers i ON t.influencer_id = i.id
WHERE NOT EXISTS (
    SELECT 1 FROM token_reference tr WHERE tr.token_id = t.id
);

-- ===================================================================
-- 12. SAMPLE DATA FOR TESTING
-- ===================================================================

-- Insert sample quote data for Rohini token (assuming token_id = 1)
DO $$
DECLARE
    rohini_token_id INTEGER;
    base_price NUMERIC(18,8) := 0.0018;
    i INTEGER;
BEGIN
    -- Find Rohini token ID
    SELECT t.id INTO rohini_token_id 
    FROM tokens t 
    JOIN influencers inf ON t.influencer_id = inf.id 
    WHERE inf.name ILIKE '%rohini%' 
    LIMIT 1;
    
    IF rohini_token_id IS NOT NULL THEN
        -- Insert real-time quote
        INSERT INTO token_quotes_realtime (
            token_id, captured_at, price_usd, bid_usd, ask_usd, 
            bid_qty, ask_qty, day_open, day_high, day_low, prev_close,
            volume_24h_usd, volume_24h, market_cap_usd, circ_supply, 
            total_supply, market_status, after_hours_price, 
            after_hours_change, after_hours_change_pct
        ) VALUES (
            rohini_token_id, NOW(), base_price, base_price - 0.00001, 
            base_price + 0.00001, 1500, 2300, 0.00163, 0.00192, 
            0.00159, 0.00161, 89234, 49580000, 1800000, 700000000, 
            1000000000, 'open', 0.00185, 0.00005, 2.78
        )
        ON CONFLICT (token_id, captured_at) DO UPDATE SET
            price_usd = EXCLUDED.price_usd,
            market_cap_usd = EXCLUDED.market_cap_usd;
        
        -- Insert daily stats
        INSERT INTO token_stats_daily (
            token_id, date, avg_volume_30d, week_52_high, week_52_low,
            all_time_high, all_time_high_date, volatility_30d, 
            beta_vs_benchmark_90d, pe_ratio, eps_ttm, target_price_avg,
            holders_count, top10_concentration_pct
        ) VALUES (
            rohini_token_id, CURRENT_DATE, 145234, 0.00847, 0.00089,
            0.00847, '2024-03-15', 45.6, 1.42, 45.6, 0.000039, 
            0.0025, 1247, 23.4
        )
        ON CONFLICT (token_id, date) DO UPDATE SET
            avg_volume_30d = EXCLUDED.avg_volume_30d;
        
        -- Insert performance data
        INSERT INTO token_returns (token_id, horizon, return_pct, updated_at) VALUES
        (rohini_token_id, '1D', 12.4, NOW()),
        (rohini_token_id, '5D', 8.7, NOW()),
        (rohini_token_id, '1M', 24.3, NOW()),
        (rohini_token_id, '3M', -5.2, NOW()),
        (rohini_token_id, '6M', 45.8, NOW()),
        (rohini_token_id, 'YTD', 78.9, NOW()),
        (rohini_token_id, '1Y', 156.3, NOW())
        ON CONFLICT (token_id, horizon) DO UPDATE SET
            return_pct = EXCLUDED.return_pct,
            updated_at = EXCLUDED.updated_at;
        
        -- Insert sample OHLCV data for charts
        FOR i IN 1..100 LOOP
            DECLARE
                base_open NUMERIC(18,8);
                base_close NUMERIC(18,8);
                price_high NUMERIC(18,8);
                price_low NUMERIC(18,8);
            BEGIN
                -- Generate valid OHLC data
                base_open := base_price + (random() - 0.5) * 0.0002;
                base_close := base_price + (random() - 0.5) * 0.0002;
                price_high := GREATEST(base_open, base_close) + random() * 0.00005;
                price_low := LEAST(base_open, base_close) - random() * 0.00005;
                
                INSERT INTO ohlcv_1h (
                    token_id, ts, open_price, high_price, low_price, 
                    close_price, volume, volume_usd
                ) VALUES (
                    rohini_token_id,
                    NOW() - (i || ' hours')::INTERVAL,
                    base_open,
                    price_high,
                    price_low,
                    base_close,
                    random() * 10000,
                    random() * 18
                )
                ON CONFLICT (token_id, ts) DO NOTHING;
            END;
        END LOOP;
        
        -- Insert sample news
        INSERT INTO token_news (
            token_id, published_at, source, title, summary, 
            news_type, sentiment_score, thumbnail_url
        ) VALUES
        (rohini_token_id, NOW() - INTERVAL '2 hours', 'CoinFluence News', 
         'Rohini Announces New Educational Series on DeFi Protocols',
         'Popular crypto educator Rohini unveils comprehensive course covering advanced DeFi strategies...',
         'news', 0.8, 'https://via.placeholder.com/80x60'),
        (rohini_token_id, NOW() - INTERVAL '5 hours', 'Crypto Daily',
         'ROHINI Token Sees 12% Surge Following Partnership Announcement',
         'The token has gained significant momentum as Rohini partners with major DeFi platforms...',
         'press', 0.9, NULL),
        (rohini_token_id, NOW() - INTERVAL '1 day', 'SEC Filing',
         'Form 8-K: Material Agreement Disclosure',
         'Required disclosure of material agreements and partnerships...',
         'sec', 0.0, NULL)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Sample data inserted for Rohini token (ID: %)', rohini_token_id;
    ELSE
        RAISE NOTICE 'Rohini token not found - skipping sample data';
    END IF;
END $$;

-- Refresh materialized views with initial data
REFRESH MATERIALIZED VIEW mv_coin_overview;
REFRESH MATERIALIZED VIEW mv_coin_performance;
REFRESH MATERIALIZED VIEW mv_coin_technicals;
REFRESH MATERIALIZED VIEW mv_coin_holders;

-- Create unique indexes for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS mv_coin_overview_unique 
ON mv_coin_overview (token_id);

CREATE UNIQUE INDEX IF NOT EXISTS mv_coin_performance_unique 
ON mv_coin_performance (token_id);

CREATE UNIQUE INDEX IF NOT EXISTS mv_coin_technicals_unique 
ON mv_coin_technicals (token_id);

CREATE UNIQUE INDEX IF NOT EXISTS mv_coin_holders_unique 
ON mv_coin_holders (token_id);

-- ===================================================================
-- MIGRATION COMPLETE
-- ===================================================================

COMMIT;

-- Final verification
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE ANY(ARRAY['token_%', 'ohlcv_%', 'benchmarks', 'social_sentiment_%']);
    
    SELECT COUNT(*) INTO view_count 
    FROM pg_matviews 
    WHERE schemaname = 'public' 
    AND matviewname LIKE 'mv_coin_%';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PHASE 2 MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Analytics tables created: %', table_count;
    RAISE NOTICE 'Materialized views created: %', view_count;
    RAISE NOTICE 'Sample data populated for testing';
    RAISE NOTICE 'Ready for frontend integration!';
    RAISE NOTICE '========================================';
END $$;