// Backend/routes/pledgeRoutes.js - Fixed to actually save to database
const express = require('express');
const router = express.Router();
const db = require('../database/db');

console.log('🔧 Loading pledgeRoutes.js...');

// Test route
router.get('/test', (req, res) => {
  console.log('🧪 Pledge test endpoint called');
  res.json({
    success: true,
    message: 'Pledge routes are working!',
    timestamp: new Date().toISOString(),
    server: 'Backend pledge routes'
  });
});

// POST /api/pledge/submit - Real pledge submission that saves to DB
router.post('/submit', async (req, res) => {
  try {
    console.log('💰 Real pledge submission received:', JSON.stringify(req.body, null, 2));
    
    const {
      userAddress,
      influencerAddress,
      amount,
      currency, // 'ETH' or 'USDC'
      txHash,
      blockNumber
    } = req.body;

    // Validation
    if (!userAddress || !influencerAddress || !amount || !currency) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: userAddress, influencerAddress, amount, currency' 
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Amount must be a positive number' 
      });
    }

    console.log('✅ Validation passed, saving to database...');

    // Check if influencer exists in database
    const influencerCheck = await db.query(
      'SELECT wallet_address, status FROM influencers WHERE wallet_address = $1',
      [influencerAddress]
    );

    if (influencerCheck.rows.length === 0) {
      console.log('❌ Influencer not found in database');
      return res.status(404).json({
        success: false,
        error: 'Influencer not found'
      });
    }

    const influencer = influencerCheck.rows[0];
    
    // Check if influencer is in pledging status
    if (influencer.status !== 'pledging') {
      console.log(`❌ Influencer status is ${influencer.status}, not pledging`);
      return res.status(400).json({
        success: false,
        error: `Influencer is not accepting pledges (status: ${influencer.status})`
      });
    }

    // Prepare amounts based on currency
    const ethAmount = currency === 'ETH' ? amountNum : 0;
    const usdcAmount = currency === 'USDC' ? amountNum : 0;

    // Generate mock transaction data if not provided
    const finalTxHash = txHash || `0x${Math.random().toString(16).substring(2)}${Date.now().toString(16)}`;
    const finalBlockNumber = blockNumber || Math.floor(Math.random() * 1000000) + 18000000;

    console.log('💾 Inserting pledge into database...');

    // Insert or update pledge in database
    const pledgeResult = await db.query(`
      INSERT INTO pledges (
        user_address, 
        influencer_address, 
        eth_amount, 
        usdc_amount, 
        tx_hash, 
        block_number,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_address, influencer_address) 
      DO UPDATE SET 
        eth_amount = pledges.eth_amount + EXCLUDED.eth_amount,
        usdc_amount = pledges.usdc_amount + EXCLUDED.usdc_amount,
        tx_hash = EXCLUDED.tx_hash,
        block_number = EXCLUDED.block_number,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userAddress, influencerAddress, ethAmount, usdcAmount, finalTxHash, finalBlockNumber]);

    console.log('✅ Pledge saved to database:', pledgeResult.rows[0]);

    // Insert event into pledge_events table
    const eventResult = await db.query(`
      INSERT INTO pledge_events (
        event_type, 
        influencer_address, 
        user_address, 
        eth_amount, 
        usdc_amount, 
        tx_hash, 
        block_number,
        created_at
      )
      VALUES ('pledge_made', $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *
    `, [influencerAddress, userAddress, ethAmount, usdcAmount, finalTxHash, finalBlockNumber]);

    console.log('✅ Pledge event saved:', eventResult.rows[0]);

    // Update influencer totals (this should happen automatically via trigger, but let's be explicit)
    const updateResult = await db.query(`
      UPDATE influencers 
      SET 
        total_pledged_eth = COALESCE((
          SELECT SUM(eth_amount) 
          FROM pledges 
          WHERE influencer_address = $1 
          AND has_withdrawn = false
        ), 0),
        total_pledged_usdc = COALESCE((
          SELECT SUM(usdc_amount) 
          FROM pledges 
          WHERE influencer_address = $1 
          AND has_withdrawn = false
        ), 0),
        pledge_count = COALESCE((
          SELECT COUNT(*) 
          FROM pledges 
          WHERE influencer_address = $1 
          AND has_withdrawn = false
        ), 0),
        updated_at = CURRENT_TIMESTAMP
      WHERE wallet_address = $1
      RETURNING total_pledged_eth, total_pledged_usdc, pledge_count
    `, [influencerAddress]);

    console.log('✅ Influencer totals updated:', updateResult.rows[0]);

    // Check if threshold is now met
    const thresholdCheck = await db.query(`
      SELECT 
        total_pledged_eth,
        total_pledged_usdc,
        pledge_threshold_eth,
        pledge_threshold_usdc,
        CASE 
          WHEN (pledge_threshold_eth > 0 AND total_pledged_eth >= pledge_threshold_eth) OR
               (pledge_threshold_usdc > 0 AND total_pledged_usdc >= pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met
      FROM influencers
      WHERE wallet_address = $1
    `, [influencerAddress]);

    if (thresholdCheck.rows[0]?.threshold_met) {
      console.log('🎉 Threshold has been reached!');
      
      // Log threshold reached event
      await db.query(`
        INSERT INTO pledge_events (event_type, influencer_address, created_at)
        VALUES ('threshold_reached', $1, CURRENT_TIMESTAMP)
      `, [influencerAddress]);

      console.log('✅ Threshold reached event logged');
    }

    const response = {
      success: true,
      message: `Successfully pledged ${amount} ${currency}`,
      pledge: {
        id: pledgeResult.rows[0].id,
        userAddress,
        influencerAddress,
        ethAmount: pledgeResult.rows[0].eth_amount,
        usdcAmount: pledgeResult.rows[0].usdc_amount,
        txHash: finalTxHash,
        blockNumber: finalBlockNumber,
        createdAt: pledgeResult.rows[0].created_at,
        mock: !txHash // Indicate if this was a mock transaction
      },
      influencerTotals: updateResult.rows[0],
      thresholdMet: thresholdCheck.rows[0]?.threshold_met || false
    };

    console.log('🎉 Pledge submission completed successfully');
    res.json(response);

  } catch (error) {
    console.error('❌ Error in pledge submission:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process pledge',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Keep the mock endpoint for testing
router.post('/mock', async (req, res) => {
  console.log('🧪 Mock pledge endpoint called with body:', JSON.stringify(req.body, null, 2));
  
  // Just call the real submit endpoint
  req.url = '/submit';
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

    console.log(`✅ Found ${pledges.length} pledges for user`);
    res.json({
      success: true,
      pledges
    });

  } catch (error) {
    console.error('❌ Error getting user pledges:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user pledges',
      details: error.message 
    });
  }
});

// GET /api/pledge/influencers - Get all influencers with pledge data
router.get('/influencers', async (req, res) => {
  try {
    console.log('📊 Fetching influencers with pledge data...');
    
    const result = await db.query(`
      SELECT 
        i.*,
        CASE 
          WHEN (i.pledge_threshold_eth > 0 AND i.total_pledged_eth >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND i.total_pledged_usdc >= i.pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met
      FROM influencers i
      WHERE i.pledge_threshold_eth > 0 OR i.pledge_threshold_usdc > 0
      ORDER BY 
        CASE WHEN i.status = 'pledging' THEN 1 ELSE 2 END,
        i.created_at DESC
    `);

    const influencers = result.rows.map(row => ({
      address: row.wallet_address,
      name: row.name,
      handle: row.handle,
      tokenName: `${row.name} Token`,
      symbol: row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
      totalPledgedETH: (row.total_pledged_eth || 0).toString(),
      totalPledgedUSDC: (row.total_pledged_usdc || 0).toString(),
      thresholdETH: (row.pledge_threshold_eth || 0).toString(),
      thresholdUSDC: (row.pledge_threshold_usdc || 0).toString(),
      pledgerCount: row.pledge_count || 0,
      thresholdMet: row.threshold_met,
      isApproved: row.is_approved || false,
      isLaunched: !!row.launched_at,
      tokenAddress: row.token_address,
      createdAt: new Date(row.created_at).getTime(),
      launchedAt: row.launched_at ? new Date(row.launched_at).getTime() : null,
      
      // UI data
      avatar: row.avatar_url,
      followers: row.followers_count ? `${(row.followers_count / 1000000).toFixed(1)}M` : null,
      category: row.category,
      description: row.description,
      verified: row.verified
    }));

    console.log(`✅ Found ${influencers.length} influencers available for pledging`);
    res.json(influencers);

  } catch (error) {
    console.error('❌ Error fetching influencers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch influencers', 
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