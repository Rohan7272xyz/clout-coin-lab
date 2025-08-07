// Backend/routes/pledgeRoutes.js - Simplified and debugged version
const express = require('express');
const router = express.Router();

// Add debug logging
console.log('🔧 Loading pledgeRoutes.js...');

// Test if ethers is available
let ethers;
try {
  ethers = require('ethers');
  console.log('✅ Ethers.js loaded successfully');
} catch (error) {
  console.warn('⚠️ Ethers.js not available:', error.message);
}

// Test if database is available
let db;
try {
  db = require('../database/db');
  console.log('✅ Database connection loaded');
} catch (error) {
  console.warn('⚠️ Database connection failed:', error.message);
}

// Simple test route to verify the router is working
router.get('/test', (req, res) => {
  console.log('🧪 Pledge test endpoint called');
  res.json({
    success: true,
    message: 'Pledge routes are working!',
    timestamp: new Date().toISOString(),
    server: 'Backend pledge routes',
    ethersAvailable: !!ethers,
    databaseAvailable: !!db
  });
});

// POST /api/pledge/mock - Simplified mock pledge for testing
router.post('/mock', async (req, res) => {
  console.log('🧪 Mock pledge endpoint called with body:', JSON.stringify(req.body, null, 2));
  
  try {
    const {
      userAddress,
      influencerAddress,
      amount,
      currency
    } = req.body;

    // Basic validation
    if (!userAddress || !influencerAddress || !amount || !currency) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: userAddress, influencerAddress, amount, currency',
        received: { userAddress, influencerAddress, amount, currency }
      });
    }

    // Validate addresses if ethers is available
    if (ethers) {
      try {
        if (!ethers.utils.isAddress(userAddress)) {
          return res.status(400).json({ 
            success: false,
            error: 'Invalid userAddress format' 
          });
        }
        if (!ethers.utils.isAddress(influencerAddress)) {
          return res.status(400).json({ 
            success: false,
            error: 'Invalid influencerAddress format' 
          });
        }
      } catch (addrError) {
        console.warn('⚠️ Address validation skipped:', addrError.message);
      }
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Amount must be a positive number' 
      });
    }

    // Generate mock transaction hash
    let mockTxHash;
    if (ethers) {
      try {
        mockTxHash = ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(`${userAddress}-${influencerAddress}-${amount}-${Date.now()}`)
        );
      } catch (hashError) {
        console.warn('⚠️ Using simple hash instead of keccak256');
        mockTxHash = `0x${Math.random().toString(16).substring(2)}${Date.now().toString(16)}`;
      }
    } else {
      mockTxHash = `0x${Math.random().toString(16).substring(2)}${Date.now().toString(16)}`;
    }

    // Prepare response data
    const mockPledge = {
      id: Math.floor(Math.random() * 10000),
      userAddress,
      influencerAddress,
      ethAmount: currency === 'ETH' ? amount : '0',
      usdcAmount: currency === 'USDC' ? amount : '0',
      txHash: mockTxHash,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      createdAt: new Date().toISOString(),
      mock: true
    };

    // Try to save to database if available
    if (db) {
      try {
        console.log('💾 Attempting to save to database...');
        
        // Check if pledges table exists
        const tableCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'pledges'
          )
        `);
        
        if (tableCheck.rows[0].exists) {
          console.log('✅ Pledges table exists, attempting insert...');
          
          const result = await db.query(`
            INSERT INTO pledges (
              user_address, 
              influencer_address, 
              eth_amount, 
              usdc_amount, 
              tx_hash, 
              block_number
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_address, influencer_address) 
            DO UPDATE SET 
              eth_amount = pledges.eth_amount + EXCLUDED.eth_amount,
              usdc_amount = pledges.usdc_amount + EXCLUDED.usdc_amount,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *
          `, [
            userAddress, 
            influencerAddress, 
            mockPledge.ethAmount, 
            mockPledge.usdcAmount, 
            mockTxHash, 
            mockPledge.blockNumber
          ]);
          
          console.log('✅ Database insert successful:', result.rows[0].id);
          mockPledge.id = result.rows[0].id;
          mockPledge.savedToDatabase = true;
          
        } else {
          console.log('⚠️ Pledges table does not exist');
          mockPledge.savedToDatabase = false;
          mockPledge.databaseError = 'Pledges table not found';
        }
        
      } catch (dbError) {
        console.error('❌ Database error:', dbError.message);
        mockPledge.savedToDatabase = false;
        mockPledge.databaseError = dbError.message;
      }
    } else {
      mockPledge.savedToDatabase = false;
      mockPledge.databaseError = 'Database connection not available';
    }

    console.log('✅ Mock pledge processed successfully');
    
    res.json({
      success: true,
      message: 'Mock pledge recorded successfully',
      pledge: mockPledge
    });

  } catch (error) {
    console.error('❌ Error in mock pledge endpoint:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process mock pledge',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/pledge/submit - Real pledge submission
router.post('/submit', async (req, res) => {
  console.log('🔗 Real pledge submission called');
  
  // For now, redirect to mock until blockchain is set up
  console.log('🔄 Redirecting to mock pledge for testing...');
  
  // Call the mock endpoint internally
  req.url = '/mock';
  return router.handle(req, res);
});

// GET /api/pledge/user/:userAddress - Get user pledges
router.get('/user/:userAddress', async (req, res) => {
  console.log('👤 Get user pledges called for:', req.params.userAddress);
  
  try {
    const { userAddress } = req.params;
    
    if (!userAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'User address is required' 
      });
    }

    // Validate address if ethers is available
    if (ethers && !ethers.utils.isAddress(userAddress)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid user address format' 
      });
    }

    // Try to get from database
    if (db) {
      try {
        const result = await db.query(`
          SELECT 
            p.*,
            i.name as influencer_name,
            i.handle as influencer_handle,
            i.avatar_url,
            i.category,
            i.description,
            i.verified,
            i.status
          FROM pledges p
          LEFT JOIN influencers i ON p.influencer_address = i.wallet_address
          WHERE p.user_address = $1 
          AND p.has_withdrawn = false
          ORDER BY p.created_at DESC
        `, [userAddress]);

        const pledges = result.rows.map(row => ({
          id: row.id,
          influencerAddress: row.influencer_address,
          influencerName: row.influencer_name || 'Unknown',
          influencerHandle: row.influencer_handle || '@unknown',
          avatar: row.avatar_url,
          category: row.category || 'Unknown',
          description: row.description || 'No description',
          verified: row.verified || false,
          ethAmount: row.eth_amount || '0',
          usdcAmount: row.usdc_amount || '0',
          hasWithdrawn: row.has_withdrawn || false,
          pledgedAt: row.created_at,
          txHash: row.tx_hash
        }));

        res.json({
          success: true,
          pledges
        });

      } catch (dbError) {
        console.error('❌ Database error:', dbError.message);
        res.status(500).json({ 
          success: false,
          error: 'Database query failed',
          details: dbError.message 
        });
      }
    } else {
      // Return mock data if no database
      res.json({
        success: true,
        pledges: [],
        note: 'Database not available - returning empty pledges'
      });
    }

  } catch (error) {
    console.error('❌ Error getting user pledges:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user pledges',
      details: error.message 
    });
  }
});

// Error handling for the router
router.use((error, req, res, next) => {
  console.error('❌ Pledge router error:', error);
  res.status(500).json({
    success: false,
    error: 'Pledge route error',
    details: error.message
  });
});

console.log('✅ pledgeRoutes.js loaded successfully');

module.exports = router;