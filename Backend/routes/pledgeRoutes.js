// Backend/routes/pledgeRoutes.js - Fixed version with proper database integration
const express = require('express');
const router = express.Router();
const db = require('../database/db');

console.log('🔧 Loading fixed pledgeRoutes.js...');

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

// POST /api/pledge/submit - Fixed pledge submission with proper database integration
router.post('/submit', async (req, res) => {
  try {
    console.log('💰 Pledge submission received:', JSON.stringify(req.body, null, 2));
    
    const {
      userAddress,
      influencerAddress,
      amount,
      currency, // 'ETH' or 'USDC'
      txHash,
      blockNumber
    } = req.body;

    // Enhanced validation
    if (!userAddress || !influencerAddress || !amount || !currency) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: userAddress, influencerAddress, amount, currency' 
      });
    }

    // Validate Ethereum addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(userAddress) || !addressRegex.test(influencerAddress)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Ethereum address format' 
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Amount must be a positive number' 
      });
    }

    if (!['ETH', 'USDC'].includes(currency)) {
      return res.status(400).json({ 
        success: false,
        error: 'Currency must be either ETH or USDC' 
      });
    }

    console.log('✅ Validation passed, checking influencer...');

    // Check if influencer exists and is accepting pledges
    const influencerCheck = await db.query(
      'SELECT id, wallet_address, status, pledge_threshold_eth, pledge_threshold_usdc FROM influencers WHERE wallet_address = $1',
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
      console.log(`❌ Influencer status is ${influencer.status}, not accepting pledges`);
      return res.status(400).json({
        success: false,
        error: `Influencer is not accepting pledges (status: ${influencer.status})`
      });
    }

    // Prepare amounts based on currency
    const ethAmount = currency === 'ETH' ? amountNum : 0;
    const usdcAmount = currency === 'USDC' ? amountNum : 0;

    // Generate transaction data if not provided (for testing)
    const finalTxHash = txHash || `0x${Math.random().toString(16).substring(2)}${Date.now().toString(16)}`;
    const finalBlockNumber = blockNumber || Math.floor(Math.random() * 1000000) + 18000000;

    console.log('💾 Inserting/updating pledge in database...');

    // Start a database transaction for data consistency
    const client = await db.query('BEGIN');

    try {
      // Insert or update pledge in database using proper UPSERT
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
          updated_at = CURRENT_TIMESTAMP,
          has_withdrawn = false
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

      // Update influencer totals and trigger update
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
        RETURNING 
          total_pledged_eth, 
          total_pledged_usdc, 
          pledge_count,
          pledge_threshold_eth,
          pledge_threshold_usdc
      `, [influencerAddress]);

      console.log('✅ Influencer totals updated:', updateResult.rows[0]);

      // Check if threshold is now met
      const updatedInfluencer = updateResult.rows[0];
      const ethThreshold = parseFloat(updatedInfluencer.pledge_threshold_eth || 0);
      const usdcThreshold = parseFloat(updatedInfluencer.pledge_threshold_usdc || 0);
      const totalEth = parseFloat(updatedInfluencer.total_pledged_eth || 0);
      const totalUsdc = parseFloat(updatedInfluencer.total_pledged_usdc || 0);

      const thresholdMet = (ethThreshold > 0 && totalEth >= ethThreshold) || 
                          (usdcThreshold > 0 && totalUsdc >= usdcThreshold);

      if (thresholdMet) {
        console.log('🎉 Threshold has been reached!');
        
        // Log threshold reached event
        await db.query(`
          INSERT INTO pledge_events (
            event_type, 
            influencer_address, 
            event_data,
            created_at
          )
          VALUES ('threshold_reached', $1, $2, CURRENT_TIMESTAMP)
        `, [
          influencerAddress,
          JSON.stringify({
            threshold_eth: ethThreshold,
            threshold_usdc: usdcThreshold,
            total_eth: totalEth,
            total_usdc: totalUsdc,
            trigger_pledge_by: userAddress
          })
        ]);

        console.log('✅ Threshold reached event logged');
      }

      // Commit the transaction
      await db.query('COMMIT');

      const response = {
        success: true,
        message: `Successfully pledged ${amount} ${currency}`,
        pledge: {
          id: pledgeResult.rows[0].id,
          userAddress,
          influencerAddress,
          ethAmount: parseFloat(pledgeResult.rows[0].eth_amount),
          usdcAmount: parseFloat(pledgeResult.rows[0].usdc_amount),
          txHash: finalTxHash,
          blockNumber: finalBlockNumber,
          createdAt: pledgeResult.rows[0].created_at,
          mock: !txHash // Indicate if this was a mock transaction
        },
        influencerTotals: {
          totalPledgedETH: parseFloat(updatedInfluencer.total_pledged_eth),
          totalPledgedUSDC: parseFloat(updatedInfluencer.total_pledged_usdc),
          pledgeCount: parseInt(updatedInfluencer.pledge_count),
          thresholdETH: ethThreshold,
          thresholdUSDC: usdcThreshold
        },
        thresholdMet
      };

      console.log('🎉 Pledge submission completed successfully');
      res.json(response);

    } catch (dbError) {
      // Rollback the transaction on error
      await db.query('ROLLBACK');
      throw dbError;
    }

  } catch (error) {
    console.error('❌ Error in pledge submission:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to process pledge';
    if (error.code === '23505') { // Unique constraint violation
      errorMessage = 'Pledge already exists for this user and influencer';
    } else if (error.code === '23503') { // Foreign key violation
      errorMessage = 'Invalid influencer address';
    } else if (error.code === '22003') { // Numeric value out of range
      errorMessage = 'Pledge amount is too large';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/pledge/user/:userAddress - Get user pledges with proper joins
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

    // Validate address format
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(userAddress)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Ethereum address format' 
      });
    }

    const result = await db.query(`
      SELECT 
        p.id,
        p.user_address,
        p.influencer_address,
        p.eth_amount,
        p.usdc_amount,
        p.tx_hash,
        p.block_number,
        p.has_withdrawn,
        p.withdrawn_at,
        p.created_at,
        p.updated_at,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url,
        i.category,
        i.description,
        i.verified,
        i.status,
        i.is_approved,
        i.launched_at,
        i.token_address,
        i.pledge_threshold_eth,
        i.pledge_threshold_usdc,
        i.total_pledged_eth,
        i.total_pledged_usdc
      FROM pledges p
      LEFT JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1 
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
      ethAmount: parseFloat(row.eth_amount || 0),
      usdcAmount: parseFloat(row.usdc_amount || 0),
      hasWithdrawn: row.has_withdrawn || false,
      withdrawnAt: row.withdrawn_at,
      pledgedAt: row.created_at,
      txHash: row.tx_hash,
      blockNumber: row.block_number,
      
      // Influencer status info
      status: row.status,
      isApproved: row.is_approved || false,
      isLaunched: !!row.launched_at,
      tokenAddress: row.token_address,
      
      // Threshold progress
      thresholdETH: parseFloat(row.pledge_threshold_eth || 0),
      thresholdUSDC: parseFloat(row.pledge_threshold_usdc || 0),
      totalPledgedETH: parseFloat(row.total_pledged_eth || 0),
      totalPledgedUSDC: parseFloat(row.total_pledged_usdc || 0),
      
      // Calculate progress
      ethProgress: row.pledge_threshold_eth > 0 ? 
        (parseFloat(row.total_pledged_eth || 0) / parseFloat(row.pledge_threshold_eth)) * 100 : 0,
      usdcProgress: row.pledge_threshold_usdc > 0 ? 
        (parseFloat(row.total_pledged_usdc || 0) / parseFloat(row.pledge_threshold_usdc)) * 100 : 0
    }));

    console.log(`✅ Found ${pledges.length} pledges for user ${userAddress}`);
    res.json({
      success: true,
      pledges
    });

  } catch (error) {
    console.error('❌ Error getting user pledges:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get user pledges',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met,
        COALESCE(i.total_pledged_eth, 0) as total_pledged_eth,
        COALESCE(i.total_pledged_usdc, 0) as total_pledged_usdc,
        COALESCE(i.pledge_count, 0) as pledge_count
      FROM influencers i
      WHERE (i.pledge_threshold_eth > 0 OR i.pledge_threshold_usdc > 0)
        AND i.status IN ('pledging', 'approved', 'live')
      ORDER BY 
        CASE WHEN i.status = 'pledging' THEN 1 ELSE 2 END,
        i.created_at DESC
    `);

    const influencers = result.rows.map(row => ({
      address: row.wallet_address,
      name: row.name,
      handle: row.handle,
      tokenName: row.token_name || `${row.name} Token`,
      symbol: row.token_symbol || row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
      totalPledgedETH: row.total_pledged_eth.toString(),
      totalPledgedUSDC: row.total_pledged_usdc.toString(),
      thresholdETH: (row.pledge_threshold_eth || 0).toString(),
      thresholdUSDC: (row.pledge_threshold_usdc || 0).toString(),
      pledgerCount: parseInt(row.pledge_count),
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
      verified: row.verified || false
    }));

    console.log(`✅ Found ${influencers.length} influencers available for pledging`);
    res.json(influencers);

  } catch (error) {
    console.error('❌ Error fetching influencers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch influencers', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/pledge/withdraw - Withdraw a pledge
router.post('/withdraw', async (req, res) => {
  try {
    console.log('💸 Withdraw pledge request:', JSON.stringify(req.body, null, 2));
    
    const { userAddress, influencerAddress, txHash } = req.body;

    // Validation
    if (!userAddress || !influencerAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: userAddress, influencerAddress' 
      });
    }

    // Validate addresses
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(userAddress) || !addressRegex.test(influencerAddress)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid Ethereum address format' 
      });
    }

    // Check if pledge exists and hasn't been withdrawn
    const pledgeCheck = await db.query(`
      SELECT p.*, i.status, i.launched_at 
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1 AND p.influencer_address = $2
    `, [userAddress, influencerAddress]);

    if (pledgeCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pledge found for this user and influencer'
      });
    }

    const pledge = pledgeCheck.rows[0];

    if (pledge.has_withdrawn) {
      return res.status(400).json({
        success: false,
        error: 'Pledge has already been withdrawn'
      });
    }

    if (pledge.launched_at) {
      return res.status(400).json({
        success: false,
        error: 'Cannot withdraw pledge after token has been launched'
      });
    }

    // Start transaction for withdrawal
    await db.query('BEGIN');

    try {
      // Mark pledge as withdrawn
      const withdrawResult = await db.query(`
        UPDATE pledges 
        SET 
          has_withdrawn = true,
          withdrawn_at = CURRENT_TIMESTAMP,
          withdrawn_tx_hash = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_address = $1 AND influencer_address = $2
        RETURNING *
      `, [userAddress, influencerAddress, txHash]);

      // Update influencer totals
      await db.query(`
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
      `, [influencerAddress]);

      // Log withdrawal event
      await db.query(`
        INSERT INTO pledge_events (
          event_type, 
          influencer_address, 
          user_address, 
          eth_amount, 
          usdc_amount, 
          tx_hash, 
          event_data,
          created_at
        )
        VALUES ('withdrawn', $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        influencerAddress, 
        userAddress, 
        pledge.eth_amount, 
        pledge.usdc_amount, 
        txHash,
        JSON.stringify({ original_pledge_id: pledge.id })
      ]);

      await db.query('COMMIT');

      console.log('✅ Pledge withdrawal completed successfully');
      res.json({
        success: true,
        message: 'Pledge withdrawn successfully',
        withdrawal: {
          userAddress,
          influencerAddress,
          ethAmount: parseFloat(pledge.eth_amount),
          usdcAmount: parseFloat(pledge.usdc_amount),
          withdrawnAt: withdrawResult.rows[0].withdrawn_at,
          txHash
        }
      });

    } catch (dbError) {
      await db.query('ROLLBACK');
      throw dbError;
    }

  } catch (error) {
    console.error('❌ Error in pledge withdrawal:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process withdrawal',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Error handling middleware for the router
router.use((error, req, res, next) => {
  console.error('❌ Pledge router error:', error);
  res.status(500).json({
    success: false,
    error: 'Pledge route error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

console.log('✅ Fixed pledgeRoutes.js loaded successfully');


// Backend/routes/pledgeRoutes.js - Updated GET /api/pledge/influencers endpoint
// Add this to your existing pledgeRoutes.js file

// GET /api/pledge/influencers - Get all influencers with pledge data (FIXED VERSION)
router.get('/influencers', async (req, res) => {
  try {
    console.log('📊 Fetching influencers with pledge data...');
    
    const result = await db.query(`
      SELECT 
        i.id,
        i.name,
        i.handle,
        i.wallet_address,
        i.email,
        i.followers_count,
        i.category,
        i.description,
        i.avatar_url,
        i.verified,
        i.status,
        i.token_name,
        i.token_symbol,
        i.token_address,
        i.current_price,
        i.market_cap,
        i.volume_24h,
        i.price_change_24h,
        i.launched_at,
        i.created_at,
        -- Pledge specific fields
        COALESCE(i.pledge_threshold_eth, 0) as pledge_threshold_eth,
        COALESCE(i.pledge_threshold_usdc, 0) as pledge_threshold_usdc,
        COALESCE(i.total_pledged_eth, 0) as total_pledged_eth,
        COALESCE(i.total_pledged_usdc, 0) as total_pledged_usdc,
        COALESCE(i.pledge_count, 0) as pledge_count,
        COALESCE(i.is_approved, false) as is_approved,
        i.approved_at,
        -- Calculate if threshold is met
        CASE 
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met
      FROM influencers i
      WHERE 
        -- Include influencers that have pledge thresholds set OR are already live
        (i.pledge_threshold_eth > 0 OR i.pledge_threshold_usdc > 0 OR i.status = 'live' OR i.launched_at IS NOT NULL)
        AND i.status != 'rejected'
      ORDER BY 
        -- Order by status priority: live first, then by pledge progress
        CASE 
          WHEN i.status = 'live' OR i.launched_at IS NOT NULL THEN 1 
          WHEN i.is_approved = true THEN 2
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 3
          ELSE 4 
        END,
        i.created_at DESC
    `);

    const influencers = result.rows.map(row => {
      // Format followers count
      const formatFollowers = (count) => {
        if (!count) return null;
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
      };

      // Determine if launched (either status is 'live' or has launched_at date)
      const isLaunched = row.status === 'live' || !!row.launched_at;
      
      return {
        address: row.wallet_address,
        name: row.name,
        handle: row.handle || `@${row.name.toLowerCase().replace(/\s+/g, '')}`,
        tokenName: row.token_name || `${row.name} Token`,
        symbol: row.token_symbol || row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
        totalPledgedETH: row.total_pledged_eth.toString(),
        totalPledgedUSDC: row.total_pledged_usdc.toString(),
        thresholdETH: row.pledge_threshold_eth.toString(),
        thresholdUSDC: row.pledge_threshold_usdc.toString(),
        pledgerCount: parseInt(row.pledge_count) || 0,
        thresholdMet: row.threshold_met,
        isApproved: row.is_approved,
        isLaunched: isLaunched,
        tokenAddress: row.token_address,
        createdAt: new Date(row.created_at).getTime(),
        launchedAt: row.launched_at ? new Date(row.launched_at).getTime() : null,
        
        // UI data
        avatar: row.avatar_url,
        followers: formatFollowers(row.followers_count),
        category: row.category,
        description: row.description,
        verified: row.verified || false,
        
        // Trading data (for live tokens)
        currentPrice: row.current_price ? parseFloat(row.current_price) : null,
        marketCap: row.market_cap ? parseFloat(row.market_cap) : null,
        volume24h: row.volume_24h ? parseFloat(row.volume_24h) : null,
        priceChange24h: row.price_change_24h ? parseFloat(row.price_change_24h) : null
      };
    });

    console.log(`✅ Found ${influencers.length} influencers available for pledging/trading`);
    
    // Add debug info
    influencers.forEach(inf => {
      console.log(`- ${inf.name}: ${inf.isLaunched ? 'LIVE' : inf.isApproved ? 'APPROVED' : inf.thresholdMet ? 'THRESHOLD MET' : 'PLEDGING'}`);
    });
    
    res.json(influencers);

  } catch (error) {
    console.error('❌ Error fetching influencers:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch influencers', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/pledge/influencer/:address - Get specific influencer by address
router.get('/influencer/:address', async (req, res) => {
  try {
    const { address } = req.params;
    console.log('📊 Fetching specific influencer:', address);
    
    const result = await db.query(`
      SELECT 
        i.*,
        -- Calculate if threshold is met
        CASE 
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met
      FROM influencers i
      WHERE i.wallet_address = $1
    `, [address]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Influencer not found'
      });
    }

    const row = result.rows[0];
    
    // Format the response similar to the list endpoint
    const influencer = {
      address: row.wallet_address,
      name: row.name,
      handle: row.handle || `@${row.name.toLowerCase().replace(/\s+/g, '')}`,
      tokenName: row.token_name || `${row.name} Token`,
      symbol: row.token_symbol || row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
      totalPledgedETH: (row.total_pledged_eth || 0).toString(),
      totalPledgedUSDC: (row.total_pledged_usdc || 0).toString(),
      thresholdETH: (row.pledge_threshold_eth || 0).toString(),
      thresholdUSDC: (row.pledge_threshold_usdc || 0).toString(),
      pledgerCount: parseInt(row.pledge_count) || 0,
      thresholdMet: row.threshold_met,
      isApproved: row.is_approved || false,
      isLaunched: row.status === 'live' || !!row.launched_at,
      tokenAddress: row.token_address,
      createdAt: new Date(row.created_at).getTime(),
      launchedAt: row.launched_at ? new Date(row.launched_at).getTime() : null,
      
      // UI data
      avatar: row.avatar_url,
      followers: row.followers_count ? (row.followers_count >= 1000000 ? `${(row.followers_count / 1000000).toFixed(1)}M` : `${(row.followers_count / 1000).toFixed(1)}K`) : null,
      category: row.category,
      description: row.description,
      verified: row.verified || false
    };

    res.json(influencer);

  } catch (error) {
    console.error('❌ Error fetching influencer:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch influencer', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;