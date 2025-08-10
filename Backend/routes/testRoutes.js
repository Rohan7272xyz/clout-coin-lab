// Backend/routes/testRoutes.js - Complete corrected version
const express = require('express');
const router = express.Router();
const db = require('../database/db');

console.log('🧪 Loading test routes...');

// Test database connection
router.get('/db', async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection test passed');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Test table existence
router.get('/tables', async (req, res) => {
  try {
    console.log('🔍 Fetching database tables...');
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`✅ Found ${result.rows.length} tables`);
    
    res.json({
      success: true,
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    console.error('❌ Error fetching tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test users table
router.get('/users', async (req, res) => {
  try {
    console.log('👥 Testing users table...');
    const countResult = await db.query('SELECT COUNT(*) FROM users');
    const sampleResult = await db.query('SELECT * FROM users LIMIT 5');
    
    console.log(`✅ Users table: ${countResult.rows[0].count} total users`);
    
    res.json({
      success: true,
      totalUsers: parseInt(countResult.rows[0].count),
      sampleUsers: sampleResult.rows
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure the users table exists'
    });
  }
});

// Test influencers table
router.get('/influencers', async (req, res) => {
  try {
    console.log('🌟 Testing influencers table...');
    const countResult = await db.query('SELECT COUNT(*) FROM influencers');
    const sampleResult = await db.query('SELECT * FROM influencers LIMIT 5');
    
    console.log(`✅ Influencers table: ${countResult.rows[0].count} total influencers`);
    
    res.json({
      success: true,
      totalInfluencers: parseInt(countResult.rows[0].count),
      sampleInfluencers: sampleResult.rows
    });
  } catch (error) {
    console.error('❌ Error fetching influencers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure the influencers table exists'
    });
  }
});

// Test new tables from Phase 1 migration
router.get('/new-tables', async (req, res) => {
  try {
    console.log('🆕 Testing new Phase 1 tables...');
    
    const queries = [
      { name: 'tokens', query: 'SELECT COUNT(*) FROM tokens' },
      { name: 'trades', query: 'SELECT COUNT(*) FROM trades' },
      { name: 'positions', query: 'SELECT COUNT(*) FROM positions' },
      { name: 'endorsements', query: 'SELECT COUNT(*) FROM endorsements' },
      { name: 'liquidity_events', query: 'SELECT COUNT(*) FROM liquidity_events' }
    ];
    
    const results = {};
    
    for (const { name, query } of queries) {
      try {
        const result = await db.query(query);
        results[name] = parseInt(result.rows[0].count);
        console.log(`✅ ${name}: ${results[name]} rows`);
      } catch (err) {
        console.error(`❌ Error testing ${name}:`, err.message);
        results[name] = `Error: ${err.message}`;
      }
    }
    
    res.json({
      success: true,
      message: 'New tables test completed',
      tableCounts: results
    });
  } catch (error) {
    console.error('❌ Error testing new tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test views from Phase 1 migration
router.get('/views', async (req, res) => {
  try {
    console.log('👁️ Testing new views...');
    
    const portfolioResult = await db.query('SELECT COUNT(*) FROM user_portfolios');
    const tokensResult = await db.query('SELECT COUNT(*) FROM tokens_display');
    
    console.log(`✅ user_portfolios view: ${portfolioResult.rows[0].count} rows`);
    console.log(`✅ tokens_display view: ${tokensResult.rows[0].count} rows`);
    
    res.json({
      success: true,
      views: {
        user_portfolios: parseInt(portfolioResult.rows[0].count),
        tokens_display: parseInt(tokensResult.rows[0].count)
      }
    });
  } catch (error) {
    console.error('❌ Error testing views:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test environment variables
router.get('/env', async (req, res) => {
  try {
    console.log('🔧 Checking environment variables...');
    
    const env = {
      success: true,
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        PORT: process.env.PORT || 'not set',
        DATABASE: {
          PG_HOST: process.env.PG_HOST ? '✓ Set' : '✗ Not set',
          PG_USER: process.env.PG_USER ? '✓ Set' : '✗ Not set',
          PG_PASSWORD: process.env.PG_PASSWORD ? '✓ Set (hidden)' : '✗ Not set',
          PG_DATABASE: process.env.PG_DATABASE ? '✓ Set' : '✗ Not set',
          PG_PORT: process.env.PG_PORT ? '✓ Set' : '✗ Not set',
        },
        FIREBASE: {
          SERVICE_ACCOUNT: process.env.FIREBASE_SERVICE_ACCOUNT ? '✓ Set' : '✗ Not set (using backendservice.json)',
        }
      }
    };
    
    console.log('✅ Environment check completed');
    res.json(env);
  } catch (error) {
    console.error('❌ Error checking environment:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test create user - FIXED VERSION with proper debugging
router.post('/create-user', async (req, res) => {
  try {
    console.log('👤 Create user test started...');
    const { email, wallet_address } = req.body;
    
    // Validation
    if (!email || !wallet_address) {
      console.log('❌ Validation failed: missing email or wallet_address');
      return res.status(400).json({
        success: false,
        error: 'Email and wallet_address are required'
      });
    }
    
    console.log('📝 Request data:', { email, wallet_address });
    
    // Prepare insert data
    const display_name = email.split('@')[0];
    const status = 'investor';
    
    console.log('🔍 Inserting user with values:', {
      email,
      wallet_address,
      display_name,
      status
    });
    
    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id, email, status FROM users WHERE wallet_address = $1 OR email = $2',
      [wallet_address, email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️ User already exists:', existingUser.rows[0]);
      return res.json({
        success: true,
        message: 'User already exists',
        user: existingUser.rows[0]
      });
    }
    
    console.log('💾 Inserting new user into database...');
    
    // Insert new user with explicit type casting
    const result = await db.query(`
      INSERT INTO users (email, wallet_address, display_name, status)
      VALUES ($1, $2, $3, $4::user_status)
      RETURNING *
    `, [email, wallet_address, display_name, status]);
    
    console.log('✅ User created successfully:', result.rows[0]);
    
    res.json({
      success: true,
      message: 'User created successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error creating user:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      detail: error.detail
    });
  }
});

// Test create token - NEW FUNCTIONALITY
router.post('/create-token', async (req, res) => {
  try {
    console.log('🪙 Create token test started...');
    const { influencer_id, name, ticker } = req.body;
    
    if (!influencer_id || !name || !ticker) {
      return res.status(400).json({
        success: false,
        error: 'influencer_id, name, and ticker are required'
      });
    }
    
    console.log('🔍 Creating token:', { influencer_id, name, ticker });
    
    const result = await db.query(`
      INSERT INTO tokens (influencer_id, name, ticker, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [influencer_id, name, ticker]);
    
    console.log('✅ Token created successfully:', result.rows[0]);
    
    res.json({
      success: true,
      message: 'Token created successfully',
      token: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error creating token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test trade functionality - NEW FUNCTIONALITY
router.post('/create-trade', async (req, res) => {
  try {
    console.log('💱 Create trade test started...');
    const { token_id, user_id, user_address, side, qty, price_usd, usd_value } = req.body;
    
    if (!token_id || !side || !qty || !price_usd || !usd_value) {
      return res.status(400).json({
        success: false,
        error: 'token_id, side, qty, price_usd, and usd_value are required'
      });
    }
    
    const tx_hash = '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    
    console.log('🔍 Creating trade:', { 
      token_id, user_id, user_address, side, qty, price_usd, usd_value, tx_hash 
    });
    
    const result = await db.query(`
      INSERT INTO trades (token_id, user_id, user_address, side, qty, price_usd, usd_value, tx_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [token_id, user_id, user_address, side, qty, price_usd, usd_value, tx_hash]);
    
    console.log('✅ Trade created successfully:', result.rows[0]);
    
    // Check if position was auto-updated
    if (user_id) {
      const position = await db.query(
        'SELECT * FROM positions WHERE user_id = $1 AND token_id = $2',
        [user_id, token_id]
      );
      console.log('📊 Position after trade:', position.rows[0] || 'No position found');
    }
    
    res.json({
      success: true,
      message: 'Trade created successfully',
      trade: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Error creating trade:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    console.log('🏥 Health check started...');
    
    // Quick DB check
    await db.query('SELECT 1');
    
    console.log('✅ Health check passed');
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: 'connected'
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: 'disconnected'
      },
      error: error.message
    });
  }
});

// Test database triggers
router.get('/test-triggers', async (req, res) => {
  try {
    console.log('⚙️ Testing database triggers...');
    
    // Test pledge total update trigger
    const pledgeCount = await db.query('SELECT COUNT(*) FROM pledges');
    const influencerTotals = await db.query(
      'SELECT id, name, total_pledged_eth, pledge_count FROM influencers LIMIT 3'
    );
    
    console.log('✅ Trigger test completed');
    
    res.json({
      success: true,
      message: 'Trigger test completed',
      data: {
        totalPledges: parseInt(pledgeCount.rows[0].count),
        sampleInfluencerTotals: influencerTotals.rows
      }
    });
  } catch (error) {
    console.error('❌ Error testing triggers:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===================================================================
// PHASE 2B: ANALYTICS TESTING ENDPOINTS
// ===================================================================

// Test all analytics tables
router.get('/analytics-tables', async (req, res) => {
  try {
    console.log('🔍 Testing analytics tables...');
    
    const analytics = {};
    
    // Test real-time quotes
    const quotesResult = await db.query(
      'SELECT COUNT(*) as count FROM token_quotes_realtime'
    );
    analytics.quotes_realtime = parseInt(quotesResult.rows[0].count);
    
    // Test OHLCV tables
    const ohlcvTables = ['ohlcv_1m', 'ohlcv_5m', 'ohlcv_1h', 'ohlcv_1d'];
    for (const table of ohlcvTables) {
      const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      analytics[table] = parseInt(result.rows[0].count);
    }
    
    // Test other analytics tables
    const analyticsTables = [
      'token_reference', 'token_returns', 'token_stats_daily',
      'token_news', 'token_events', 'token_technicals_daily',
      'token_holders_snapshot', 'token_risk', 'token_ratings'
    ];
    
    for (const table of analyticsTables) {
      const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
      analytics[table] = parseInt(result.rows[0].count);
    }
    
    console.log('📊 Analytics tables status:', analytics);
    
    res.json({
      success: true,
      message: 'Analytics tables tested successfully',
      analytics
    });
    
  } catch (error) {
    console.error('❌ Analytics tables test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test materialized views
router.get('/materialized-views', async (req, res) => {
  try {
    console.log('🔍 Testing materialized views...');
    
    const views = {};
    
    // Test each materialized view
    const mvTables = [
      'mv_coin_overview', 'mv_coin_performance', 
      'mv_coin_technicals', 'mv_coin_holders'
    ];
    
    for (const view of mvTables) {
      const result = await db.query(`SELECT COUNT(*) as count FROM ${view}`);
      views[view] = parseInt(result.rows[0].count);
    }
    
    // Get sample data from overview
    const sampleResult = await db.query(
      'SELECT token_id, name, current_price, market_cap_usd FROM mv_coin_overview LIMIT 5'
    );
    
    console.log('📊 Materialized views status:', views);
    
    res.json({
      success: true,
      message: 'Materialized views tested successfully',
      views,
      sampleData: sampleResult.rows
    });
    
  } catch (error) {
    console.error('❌ Materialized views test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test chart data for specific token
router.get('/chart-data/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { range = '1D' } = req.query;
    
    console.log(`🔍 Testing chart data for token ${tokenId}, range: ${range}`);
    
    let table = 'ohlcv_1h'; // Default
    let timeFilter = "ts >= NOW() - INTERVAL '1 day'";
    
    // Map ranges to tables and time filters
    switch (range) {
      case '1D':
        table = 'ohlcv_1h';
        timeFilter = "ts >= NOW() - INTERVAL '1 day'";
        break;
      case '5D':
        table = 'ohlcv_1h';
        timeFilter = "ts >= NOW() - INTERVAL '5 days'";
        break;
      case '1M':
        table = 'ohlcv_1d';
        timeFilter = "ts >= NOW() - INTERVAL '1 month'";
        break;
      case '1Y':
        table = 'ohlcv_1d';
        timeFilter = "ts >= NOW() - INTERVAL '1 year'";
        break;
    }
    
    const result = await db.query(`
      SELECT 
        EXTRACT(EPOCH FROM ts)::bigint * 1000 as timestamp,
        open_price as open,
        high_price as high,
        low_price as low, 
        close_price as close,
        volume,
        volume_usd
      FROM ${table}
      WHERE token_id = $1 AND ${timeFilter}
      ORDER BY ts ASC
    `, [tokenId]);
    
    console.log(`📊 Found ${result.rows.length} chart data points`);
    
    res.json({
      success: true,
      message: `Chart data retrieved for ${range}`,
      range,
      dataPoints: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    console.error('❌ Chart data test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test complete coin overview (what your frontend needs)
router.get('/coin-overview/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    console.log(`🔍 Testing complete coin overview for token ${tokenId}`);
    
    // Get comprehensive data
    const overviewResult = await db.query(`
      SELECT * FROM mv_coin_overview WHERE token_id = $1
    `, [tokenId]);
    
    const performanceResult = await db.query(`
      SELECT * FROM mv_coin_performance WHERE token_id = $1
    `, [tokenId]);
    
    const newsResult = await db.query(`
      SELECT id, source, published_at, title, summary, news_type, thumbnail_url
      FROM token_news 
      WHERE token_id = $1 
      ORDER BY published_at DESC 
      LIMIT 10
    `, [tokenId]);
    
    const statsResult = await db.query(`
      SELECT * FROM token_stats_daily 
      WHERE token_id = $1 
      ORDER BY date DESC 
      LIMIT 1
    `, [tokenId]);
    
    console.log(`📊 Overview: ${overviewResult.rows.length} rows`);
    console.log(`📊 Performance: ${performanceResult.rows.length} rows`);
    console.log(`📊 News: ${newsResult.rows.length} articles`);
    console.log(`📊 Stats: ${statsResult.rows.length} rows`);
    
    res.json({
      success: true,
      message: 'Complete coin overview retrieved',
      data: {
        overview: overviewResult.rows[0] || null,
        performance: performanceResult.rows[0] || null,
        news: newsResult.rows,
        stats: statsResult.rows[0] || null
      }
    });
    
  } catch (error) {
    console.error('❌ Coin overview test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

console.log('✅ Test routes loaded successfully');
module.exports = router;