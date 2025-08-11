// Backend/routes/influencerRoutes.js - UNIFIED VERSION
// Combines both admin and public functionality into single source of truth
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
    
    // Get user from database
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

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (req.dbUser?.status !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required',
      current: req.dbUser?.status
    });
  }
  next();
};

// ======================
// PUBLIC ENDPOINTS (No auth required)
// ======================

// GET /api/influencer - Get all influencers with optional filtering (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      category, 
      verified, 
      live_only, 
      pledging_only,
      limit = 50, 
      offset = 0,
      sort_by = 'followers_count',
      sort_order = 'DESC'
    } = req.query;
    
    // Build the query with enhanced card state logic
    let query = `
      SELECT 
        i.*,
        t.contract_address as token_address,
        t.id as token_id,
        -- Enhanced card state determination
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
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Add filters
    if (status) {
      paramCount++;
      query += ` AND i.status = $${paramCount}`;
      queryParams.push(status);
    }
    
    if (category) {
      paramCount++;
      query += ` AND i.category ILIKE $${paramCount}`;
      queryParams.push(`%${category}%`);
    }
    
    if (verified === 'true') {
      query += ` AND i.verified = true`;
    }
    
    if (live_only === 'true') {
      query += ` AND (i.status = 'live' OR i.launched_at IS NOT NULL)`;
    }
    
    if (pledging_only === 'true') {
      query += ` AND i.status = 'pledging'`;
    }
    
    // Add sorting with priority for card states
    query += ` ORDER BY 
      CASE 
        WHEN i.status = 'live' OR i.launched_at IS NOT NULL THEN 1
        WHEN i.is_approved = true AND (
          (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
          (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
        ) THEN 2
        WHEN i.is_approved = true THEN 3
        WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
             (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc) THEN 4
        ELSE 5
      END,
      i.${sort_by} ${sort_order}
    `;
    
    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    const result = await db.query(query, queryParams);
    
    // Transform data for both admin and public use
    const influencers = result.rows.map(row => {
      const overallProgress = Math.max(row.eth_progress || 0, row.usdc_progress || 0);
      
      return {
        // Basic info
        id: row.id,
        name: row.name,
        handle: row.handle,
        email: row.email,
        wallet_address: row.wallet_address,
        category: row.category,
        description: row.description,
        avatar_url: row.avatar_url,
        verified: row.verified,
        followers_count: row.followers_count,
        
        // Token info
        token_name: row.token_name,
        token_symbol: row.token_symbol,
        token_address: row.token_address,
        token_id: row.token_id,
        
        // Pledge info
        pledge_threshold_eth: row.pledge_threshold_eth || 0,
        pledge_threshold_usdc: row.pledge_threshold_usdc || 0,
        total_pledged_eth: row.total_pledged_eth || 0,
        total_pledged_usdc: row.total_pledged_usdc || 0,
        pledge_count: row.pledge_count || 0,
        
        // Status info
        status: row.status,
        card_state: row.card_state,
        is_approved: row.is_approved,
        is_launched: !!row.launched_at,
        launched_at: row.launched_at,
        
        // Progress
        eth_progress: row.eth_progress || 0,
        usdc_progress: row.usdc_progress || 0,
        overall_progress: overallProgress,
        
        // Trading data (if live)
        current_price: row.current_price,
        market_cap: row.market_cap,
        volume_24h: row.volume_24h,
        price_change_24h: row.price_change_24h,
        
        // Timestamps
        created_at: row.created_at,
        updated_at: row.updated_at,
        
        // Legacy fields for backward compatibility
        address: row.wallet_address,
        tokenName: row.token_name || `${row.name} Token`,
        symbol: row.token_symbol || row.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
        totalPledgedETH: (row.total_pledged_eth || 0).toString(),
        totalPledgedUSDC: (row.total_pledged_usdc || 0).toString(),
        thresholdETH: (row.pledge_threshold_eth || 0).toString(),
        thresholdUSDC: (row.pledge_threshold_usdc || 0).toString(),
        pledgerCount: row.pledge_count || 0,
        thresholdMet: (row.card_state === 'threshold_met' || row.card_state === 'ready_for_launch'),
        isApproved: row.is_approved || false,
        isLaunched: !!row.launched_at,
        tokenAddress: row.token_address,
        createdAt: new Date(row.created_at).getTime(),
        launchedAt: row.launched_at ? new Date(row.launched_at).getTime() : null,
        avatar: row.avatar_url,
        followers: row.followers_count ? formatFollowers(row.followers_count) : null
      };
    });
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM influencers i WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (category) {
      countParamCount++;
      countQuery += ` AND category ILIKE $${countParamCount}`;
      countParams.push(`%${category}%`);
    }
    
    if (verified === 'true') {
      countQuery += ` AND verified = true`;
    }
    
    if (live_only === 'true') {
      countQuery += ` AND (status = 'live' OR launched_at IS NOT NULL)`;
    }
    
    if (pledging_only === 'true') {
      countQuery += ` AND status = 'pledging'`;
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    res.json({
      success: true,
      data: influencers,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + result.rows.length < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencers',
      details: error.message 
    });
  }
});

// GET /api/influencer/:id - Get specific influencer by ID (PUBLIC)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        i.*,
        t.contract_address as token_address,
        t.id as token_id,
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
        END as card_state
      FROM influencers i
      LEFT JOIN tokens t ON i.id = t.influencer_id
      WHERE i.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    const row = result.rows[0];
    const influencer = {
      // Full data structure for both admin and public use
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
      tokenName: row.token_name,
      tokenSymbol: row.token_symbol,
      tokenAddress: row.token_address,
      tokenId: row.token_id,
      pledgeThresholdETH: row.pledge_threshold_eth || 0,
      pledgeThresholdUSDC: row.pledge_threshold_usdc || 0,
      totalPledgedETH: row.total_pledged_eth || 0,
      totalPledgedUSDC: row.total_pledged_usdc || 0,
      pledgeCount: row.pledge_count || 0,
      status: row.status,
      cardState: row.card_state,
      isApproved: row.is_approved,
      isLaunched: !!row.launched_at,
      launchedAt: row.launched_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    res.json({
      success: true,
      data: influencer
    });
  } catch (error) {
    console.error('Error fetching influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencer',
      details: error.message 
    });
  }
});

// ======================
// ADMIN ENDPOINTS (Auth required)
// ======================

// POST /api/influencer - Create new influencer (Admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
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
    
    console.error('Error creating influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create influencer',
      details: error.message 
    });
  }
});

// PUT /api/influencer/:id - Update influencer (Admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
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
    
    // Convert camelCase to snake_case for database fields
    const dbFields = {
      walletAddress: 'wallet_address',
      pledgeThresholdETH: 'pledge_threshold_eth',
      pledgeThresholdUSDC: 'pledge_threshold_usdc',
      tokenName: 'token_name',
      tokenSymbol: 'token_symbol',
      followers: 'followers_count'
    };
    
    const dbUpdates = {};
    Object.keys(updates).forEach(key => {
      const dbKey = dbFields[key] || key;
      dbUpdates[dbKey] = updates[key];
    });
    
    // Build dynamic UPDATE query
    const setClause = Object.keys(dbUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    if (!setClause) {
      return res.status(400).json({ 
        success: false, 
        error: 'No updates provided' 
      });
    }
    
    const values = [id, ...Object.values(dbUpdates)];
    
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
    console.error('Error updating influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update influencer',
      details: error.message 
    });
  }
});

// POST /api/influencer/:id/approve - Approve influencer (Admin only)
router.post('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
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

// POST /api/influencer/:id/create-token - Create token for approved influencer (Admin only)
router.post('/:id/create-token', requireAuth, requireAdmin, async (req, res) => {
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

// GET /api/influencer/:id/token-data - Get token creation data for frontend (Admin only)
router.get('/:id/token-data', requireAuth, requireAdmin, async (req, res) => {
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

// GET /api/influencer/admin/stats - Admin dashboard stats (Admin only)
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching admin stats for user:', req.dbUser.email);
    
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

// DELETE /api/influencer/:id - Delete influencer (Admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      'DELETE FROM influencers WHERE id = $1 RETURNING id, name',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Influencer deleted successfully', 
      data: { id: result.rows[0].id, name: result.rows[0].name }
    });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete influencer',
      details: error.message 
    });
  }
});

// ======================
// LEGACY ENDPOINTS (For backward compatibility)
// ======================

// GET /api/influencer/handle/:handle - Get influencer by handle (PUBLIC)
router.get('/handle/:handle', async (req, res) => {
  try {
    let { handle } = req.params;
    
    // Ensure handle starts with @
    if (!handle.startsWith('@')) {
      handle = '@' + handle;
    }
    
    const result = await db.query(
      'SELECT * FROM influencers WHERE handle = $1',
      [handle]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching influencer by handle:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencer',
      details: error.message 
    });
  }
});

// GET /api/influencer/address/:address - Get influencer by wallet address (PUBLIC)
router.get('/address/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const result = await db.query(
      'SELECT * FROM influencers WHERE wallet_address = $1',
      [address]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Influencer not found' 
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching influencer by address:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch influencer',
      details: error.message 
    });
  }
});

// GET /api/influencer/coin/:identifier - Get coin details by name, symbol, or ID (PUBLIC)
router.get('/coin/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    console.log('🪙 Fetching coin details for:', identifier);
    
    let query;
    let params;
    
    // Check if identifier is a number (ID) or string (name/symbol)
    if (!isNaN(parseInt(identifier))) {
      // Search by ID
      query = 'SELECT * FROM influencers WHERE id = $1';
      params = [parseInt(identifier)];
    } else {
      // Search by name, handle, or symbol (case insensitive)
      query = `
        SELECT * FROM influencers 
        WHERE LOWER(name) = LOWER($1) 
           OR LOWER(handle) = LOWER($2)
           OR LOWER(token_symbol) = LOWER($1)
           OR LOWER(REPLACE(name, ' ', '')) = LOWER($1)
      `;
      params = [identifier, `@${identifier.toLowerCase()}`];
    }
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Coin not found',
        identifier: identifier
      });
    }
    
    const influencer = result.rows[0];
    
    // Transform for trading interface
    const coinData = {
      id: influencer.id,
      name: influencer.name,
      handle: influencer.handle || `@${influencer.name.toLowerCase().replace(/\s+/g, '')}`,
      tokenName: influencer.token_name || `${influencer.name} Token`,
      symbol: influencer.token_symbol || influencer.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
      avatar: influencer.avatar_url,
      category: influencer.category,
      description: influencer.description,
      followers: influencer.followers_count ? formatFollowers(influencer.followers_count) : null,
      verified: influencer.verified || false,
      
      // Trading data
      currentPrice: influencer.current_price || 0.0018,
      priceChange24h: influencer.price_change_24h || 12.4,
      marketCap: influencer.market_cap || 1800000,
      volume24h: influencer.volume_24h || 89234,
      totalSupply: influencer.token_total_supply || 1000000,
      circulatingSupply: Math.floor((influencer.token_total_supply || 1000000) * 0.7),
      
      // Contract info
      contractAddress: influencer.token_address || "0x9c742435Cc6634C0532925a3b8D6Ac9C43F533e3E",
      poolAddress: influencer.liquidity_pool_address,
      liquidityLocked: true,
      lockUntil: "2025-12-31",
      
      // Status
      isLive: influencer.is_live || influencer.status === 'live' || !!influencer.launched_at,
      etherscanVerified: true,
      launchedAt: influencer.launched_at
    };
    
    console.log('✅ Coin details found:', coinData.name, '- Live:', coinData.isLive);
    
    res.json({
      success: true,
      data: coinData
    });
    
  } catch (error) {
    console.error('❌ Error fetching coin details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch coin details',
      details: error.message 
    });
  }
});

// Helper function to format followers
function formatFollowers(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

module.exports = router;