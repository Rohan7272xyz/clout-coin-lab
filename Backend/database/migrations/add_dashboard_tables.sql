-- Additional tables for dashboard features
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
CREATE INDEX IF NOT EXISTS idx_token_gifts_from ON token_gifts(from_address);
CREATE INDEX IF NOT EXISTS idx_token_gifts_to ON token_gifts(to_address);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_metrics_date ON platform_metrics(metric_date);