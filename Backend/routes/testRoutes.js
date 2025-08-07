// Backend/routes/testRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Test database connection
router.get('/db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    res.json({
      success: true,
      message: 'Database connection successful',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Database test failed:', error);
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
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    res.json({
      success: true,
      tables: result.rows.map(row => row.table_name)
    });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test users table
router.get('/users', async (req, res) => {
  try {
    const countResult = await db.query('SELECT COUNT(*) FROM users');
    const sampleResult = await db.query('SELECT * FROM users LIMIT 5');
    
    res.json({
      success: true,
      totalUsers: parseInt(countResult.rows[0].count),
      sampleUsers: sampleResult.rows
    });
  } catch (error) {
    console.error('Error fetching users:', error);
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
    const countResult = await db.query('SELECT COUNT(*) FROM influencers');
    const sampleResult = await db.query('SELECT * FROM influencers LIMIT 5');
    
    res.json({
      success: true,
      totalInfluencers: parseInt(countResult.rows[0].count),
      sampleInfluencers: sampleResult.rows
    });
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Make sure the influencers table exists'
    });
  }
});

// Test environment variables
router.get('/env', async (req, res) => {
  res.json({
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
  });
});

// Test create user
router.post('/create-user', async (req, res) => {
  try {
    const { email, wallet_address } = req.body;
    
    if (!email || !wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'Email and wallet_address are required'
      });
    }
    
    const result = await db.query(`
      INSERT INTO users (email, wallet_address, display_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [email, wallet_address, email.split('@')[0]]);
    
    res.json({
      success: true,
      message: 'User created/updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
router.get('/health', async (req, res) => {
  try {
    // Quick DB check
    await db.query('SELECT 1');
    
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

module.exports = router;