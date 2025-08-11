// Backend/routes/adminDashboardRoutes.js - Enhanced version with token creation integration
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');
const tokenCreationService = require('../services/tokenCreationService');

// Middleware to verify authentication
const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1 OR firebase_uid = $2',
      [decoded.email, decoded.uid]
    );
    
    if (result.rows.length > 0) {
      req.dbUser = result.rows[0];
    } else {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    next();
  } catch (err) {
    console.error('Authentication failed:', err);
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

// Middleware to check admin status
const requireAdmin = (req, res, next) => {
  if (req.dbUser?.status !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      current: req.dbUser?.status
    });
  }
  next();
};

// GET /api/dashboard/admin/influencers - Get all influencers with enhanced card state info
router.get('/influencers', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching influencers for admin dashboard...');
    
    const result = await db.query(`
      SELECT 
        i.*,
        t.contract_address as token_address,
        t.id as token_id,
        -- Determine card state for UI
        CASE 
          WHEN i.status = 'live' AND i.launched_at IS NOT NULL THEN 'live'
          WHEN i.is_approved = true AND (
            (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
            (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          ) THEN 'ready_for_launch'
          WHEN i.is_approved = true THEN 'approved'
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 'threshold_met'
          WHEN i.status = 'pledging' THEN 'pledging'
          ELSE 'pending'
        END as card_state,
        -- Progress calculations
        CASE 
          WHEN i.pledge_threshold_eth > 0 THEN 
            ROUND((COALESCE(i.total_pledged_eth, 0) / i.pledge_threshold_eth * 100)::numeric, 1)
          ELSE 0 
        END as eth_progress,
        CASE 
          WHEN i.pledge_threshold_usdc > 0 THEN 
            ROUND((COALESCE(i.total_pledged_usdc, 0) / i.pledge_threshold_usdc * 100)::numeric, 1)
          ELSE 0 
        END as usdc_progress
      FROM influencers i
      LEFT JOIN tokens t ON i.id = t.influencer_id
      ORDER BY 
        CASE 
          WHEN i.status = 'live' THEN 1
          WHEN i.is_approved = true AND (
            (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
            (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          ) THEN 2
          WHEN i.is_approved = true THEN 3
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 4
          ELSE 5
        END,
        i.created_at DESC
    `);

    const influencers = result.rows.map(row => {
      const overallProgress = Math.max(row.eth_progress || 0, row.usdc_progress || 0);
      
      return {
        id: row.id,
        name: row.name,
        handle: row.handle,
        email: row.email,
        walletAddress: row.wallet_address,
        category: row.category,
        description: row.description,
        avatar: row.avatar_url,
        verified: row.verified,
        followers: row.followers_count,
        
        // Token info
        tokenName: row.token_name,
        tokenSymbol: row.token_symbol,
        tokenAddress: row.token_address,
        tokenId: row.token_id,
        
        // Pledge info
        pledgeThresholdETH: row.pledge_threshold_eth || 0,
        pledgeThresholdUSDC: row.pledge_threshold_usdc || 0,
        totalPledgedETH: row.total_pledged_eth || 0,
        totalPledgedUSDC: row.total_pledged_usdc || 0,
        pledgeCount: row.pledge_count || 0,
        
        // Status info
        status: row.status,
        cardState: row.card_state,
        isApproved: row.is_approved,
        isLaunched: !!row.launched_at,
        launchedAt: row.launched_at,
        
        // Progress
        ethProgress: row.eth_progress || 0,
        usdcProgress: row.usdc_progress || 0,
        overallProgress,
        
        // Timestamps
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    console.log(`✅ Loaded ${influencers.length} influencers for admin dashboard`);
    res.json({ success: true, data: influencers });

  } catch (error) {
    console.error('❌ Error fetching influencers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencers',
      details: error.message 
    });
  }
});

// POST /api/dashboard/admin/influencers - Create new influencer
router.post('/influencers', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('➕ Creating new influencer...');
    
    const {
      name,
      handle,
      email,
      walletAddress,
      category,
      description,
      followers,
      pledgeThresholdETH,
      pledgeThresholdUSDC,
      tokenName,
      tokenSymbol,
      verified = false
    } = req.body;

    // Validation
    if (!name || !handle || !email || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Name, handle, email, and wallet address are required'
      });
    }

    // Ensure handle starts with @
    const formattedHandle = handle.startsWith('@') ? handle : '@' + handle;

    const result = await db.query(`
      INSERT INTO influencers (
        name, handle, email, wallet_address, category, description, 
        followers_count, pledge_threshold_eth, pledge_threshold_usdc,
        token_name, token_symbol, verified, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pledging', $13)
      RETURNING *
    `, [
      name, formattedHandle, email, walletAddress, category, description,
      followers || 0, pledgeThresholdETH || 0, pledgeThresholdUSDC || 0,
      tokenName, tokenSymbol, verified, req.user.uid
    ]);

    console.log(`✅ Created influencer: ${name} (ID: ${result.rows[0].id})`);
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Influencer created successfully'
    });

  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      const detail = error.detail || '';
      if (detail.includes('handle')) {
        return res.status(400).json({ success: false, error: 'Handle already exists' });
      } else if (detail.includes('email')) {
        return res.status(400).json({ success: false, error: 'Email already exists' });
      } else if (detail.includes('wallet_address')) {
        return res.status(400).json({ success: false, error: 'Wallet address already exists' });
      }
    }
    
    console.error('❌ Error creating influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create influencer',
      details: error.message 
    });
  }
});

// POST /api/dashboard/admin/influencers/:id/approve - Approve influencer
router.post('/influencers/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`✅ Approving influencer ID: ${id}`);

    // Get influencer details and check if threshold is met
    const influencerResult = await db.query(`
      SELECT *,
        CASE 
          WHEN (pledge_threshold_eth > 0 AND COALESCE(total_pledged_eth, 0) >= pledge_threshold_eth) OR
               (pledge_threshold_usdc > 0 AND COALESCE(total_pledged_usdc, 0) >= pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met
      FROM influencers 
      WHERE id = $1
    `, [id]);

    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Influencer not found' });
    }

    const influencer = influencerResult.rows[0];

    if (!influencer.threshold_met) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot approve: pledge threshold not met' 
      });
    }

    if (influencer.is_approved) {
      return res.status(400).json({ 
        success: false, 
        error: 'Influencer is already approved' 
      });
    }

    // Update to approved status
    const updateResult = await db.query(`
      UPDATE influencers 
      SET is_approved = true, approved_at = CURRENT_TIMESTAMP, status = 'approved'
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Log approval event
    await db.query(`
      INSERT INTO pledge_events (event_type, influencer_address, event_data)
      VALUES ('approved', $1, $2)
    `, [
      influencer.wallet_address,
      JSON.stringify({
        approved_by: req.dbUser.email,
        approved_at: new Date().toISOString(),
        influencer_name: influencer.name
      })
    ]);

    console.log(`✅ Influencer ${influencer.name} approved successfully`);
    res.json({
      success: true,
      data: updateResult.rows[0],
      message: `${influencer.name} approved successfully`
    });

  } catch (error) {
    console.error('❌ Error approving influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to approve influencer',
      details: error.message 
    });
  }
});

// POST /api/dashboard/admin/influencers/:id/create-token - Create token for approved influencer
router.post('/influencers/:id/create-token', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tokenAddress, txHash } = req.body;

    console.log(`🚀 Creating token for influencer ID: ${id}`);

    if (!tokenAddress || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Token address and transaction hash are required'
      });
    }

    // Prepare token creation data
    const tokenData = await tokenCreationService.prepareTokenCreation(id);
    
    // Process the token creation and sync with database
    const result = await tokenCreationService.handleTokenCreation({
      influencerId: id,
      tokenAddress,
      txHash,
      tokenName: tokenData.name,
      tokenSymbol: tokenData.symbol,
      influencerName: tokenData.influencerName,
      influencerWallet: tokenData.influencerWallet,
      totalSupply: tokenData.totalSupply,
      createdBy: req.dbUser.email
    });

    console.log(`✅ Token created successfully for ${tokenData.influencerName}`);
    res.json({
      success: true,
      data: {
        tokenId: result.tokenId,
        tokenAddress: result.tokenAddress,
        influencer: result.influencer
      },
      message: `Token ${tokenData.symbol} created successfully for ${tokenData.influencerName}`
    });

  } catch (error) {
    console.error('❌ Error creating token:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create token',
      details: error.message 
    });
  }
});

// GET /api/dashboard/admin/influencers/:id/token-data - Get token creation data for frontend
router.get('/influencers/:id/token-data', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const tokenData = await tokenCreationService.prepareTokenCreation(id);
    
    res.json({
      success: true,
      data: tokenData
    });

  } catch (error) {
    console.error('❌ Error getting token data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get token creation data',
      details: error.message 
    });
  }
});

// PUT /api/dashboard/admin/influencers/:id - Update influencer
router.put('/influencers/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    console.log(`📝 Updating influencer ID: ${id}`);

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.created_at;
    delete updates.updated_at;
    delete updates.is_approved; // Use separate approval endpoint
    delete updates.launched_at; // Set automatically

    // If handle is being updated, ensure it starts with @
    if (updates.handle && !updates.handle.startsWith('@')) {
      updates.handle = '@' + updates.handle;
    }

    // Build dynamic UPDATE query
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    if (!setClause) {
      return res.status(400).json({ 
        success: false, 
        error: 'No updates provided' 
      });
    }
    
    const values = [id, ...Object.values(updates)];
    
    const result = await db.query(
      `UPDATE influencers SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    console.log(`✅ Influencer ${result.rows[0].name} updated successfully`);
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Influencer updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update influencer',
      details: error.message 
    });
  }
});

// GET /api/dashboard/admin/cards-status - Get card status overview for dashboard
router.get('/cards-status', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching card status overview...');
    
    const result = await db.query(`
      SELECT 
        CASE 
          WHEN i.status = 'live' AND i.launched_at IS NOT NULL THEN 'live'
          WHEN i.is_approved = true AND (
            (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
            (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          ) THEN 'ready_for_launch'
          WHEN i.is_approved = true THEN 'approved'
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 'threshold_met'
          WHEN i.status = 'pledging' THEN 'pledging'
          ELSE 'pending'
        END as card_state,
        COUNT(*) as count
      FROM influencers i
      GROUP BY card_state
      ORDER BY 
        CASE card_state
          WHEN 'ready_for_launch' THEN 1
          WHEN 'threshold_met' THEN 2
          WHEN 'approved' THEN 3
          WHEN 'live' THEN 4
          WHEN 'pledging' THEN 5
          ELSE 6
        END
    `);

    const overview = result.rows.reduce((acc, row) => {
      acc[row.card_state] = parseInt(row.count);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        overview,
        total: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        readyForLaunch: overview.ready_for_launch || 0,
        pendingApproval: overview.threshold_met || 0,
        live: overview.live || 0,
        pledging: overview.pledging || 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching card status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch card status',
      details: error.message 
    });
  }
});

// Include existing stats endpoint
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching enhanced admin stats for user:', req.dbUser.email);
    
    const queries = [
      // Users statistics
      db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_today,
          COUNT(CASE WHEN status = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN status = 'influencer' THEN 1 END) as influencer_count,
          COUNT(CASE WHEN status = 'investor' THEN 1 END) as investor_count
        FROM users
      `),
      
      // Influencers statistics
      db.query(`
        SELECT 
          COUNT(*) as total_influencers,
          COUNT(CASE WHEN status = 'live' THEN 1 END) as live_tokens,
          COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_influencers,
          COUNT(CASE WHEN status = 'pledging' AND is_approved = false THEN 1 END) as pending_approvals
        FROM influencers
      `),
      
      // Pledges statistics
      db.query(`
        SELECT 
          COUNT(*) as total_pledges,
          SUM(COALESCE(eth_amount, 0)) as total_eth_pledged,
          SUM(COALESCE(usdc_amount, 0)) as total_usdc_pledged,
          COUNT(DISTINCT user_address) as unique_pledgers
        FROM pledges 
        WHERE has_withdrawn = false
      `),
      
      // Volume calculation
      db.query(`
        SELECT 
          SUM(COALESCE(eth_amount, 0) + COALESCE(usdc_amount, 0) / 2000) * 2000 as total_volume_usd
        FROM pledges 
        WHERE has_withdrawn = false
      `)
    ];

    const [usersResult, influencersResult, pledgesResult, volumeResult] = await Promise.all(queries);

    const userStats = usersResult.rows[0];
    const influencerStats = influencersResult.rows[0];
    const pledgeStats = pledgesResult.rows[0];
    const volumeStats = volumeResult.rows[0];

    const totalVolume = parseFloat(volumeStats.total_volume_usd || 0);
    const totalFees = totalVolume * 0.05; // 5% platform fee

    const response = {
      totalUsers: parseInt(userStats.total_users),
      totalInfluencers: parseInt(influencerStats.total_influencers),
      totalTokens: parseInt(influencerStats.live_tokens),
      totalVolume: totalVolume,
      totalFees: totalFees,
      pendingApprovals: parseInt(influencerStats.pending_approvals),
      activeUsers24h: parseInt(pledgeStats.unique_pledgers || 0),
      newUsersToday: parseInt(userStats.new_users_today),
      approvedInfluencers: parseInt(influencerStats.approved_influencers),
      totalPledgers: parseInt(pledgeStats.unique_pledgers || 0),
      totalEthPledged: parseFloat(pledgeStats.total_eth_pledged || 0),
      totalUsdcPledged: parseFloat(pledgeStats.total_usdc_pledged || 0)
    };

    console.log('✅ Admin stats loaded successfully:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics', 
      details: error.message 
    });
  }
});

module.exports = router;