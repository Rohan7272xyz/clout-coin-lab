// Backend/routes/dashboardRoutes.js - Complete file with proper Express setup
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');

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

// Middleware to check user status
const requireStatus = (requiredStatus) => {
  return async (req, res, next) => {
    if (!req.dbUser) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    const statusHierarchy = {
      'investor': 1,
      'influencer': 2,
      'admin': 3
    };

    const userLevel = statusHierarchy[req.dbUser.status] || 0;
    const requiredLevel = statusHierarchy[requiredStatus] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredStatus,
        current: req.dbUser.status
      });
    }

    next();
  };
};

// ======================
// ENHANCED ADMIN ROUTES
// ======================

// GET /api/dashboard/admin/stats - Enhanced platform statistics
router.get('/admin/stats', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    console.log('📊 Fetching enhanced admin stats for user:', req.dbUser.email);
    
    // Get comprehensive platform statistics with better error handling
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
          COUNT(CASE WHEN status = 'pledging' AND is_approved = false 
                      AND COALESCE(total_pledged_eth, 0) >= COALESCE(pledge_threshold_eth, 0)
                      AND pledge_threshold_eth > 0 THEN 1 END) as pending_approvals
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
      
      // Calculate approximate volume and fees
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
      activeUsers24h: parseInt(pledgeStats.unique_pledgers || 0), // Active pledgers as proxy
      newUsersToday: parseInt(userStats.new_users_today),
      approvedInfluencers: parseInt(influencerStats.approved_influencers),
      totalPledgers: parseInt(pledgeStats.unique_pledgers || 0),
      totalEthPledged: parseFloat(pledgeStats.total_eth_pledged || 0),
      totalUsdcPledged: parseFloat(pledgeStats.total_usdc_pledged || 0)
    };

    console.log('✅ Enhanced admin stats loaded successfully:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics', 
      details: error.message 
    });
  }
});

// GET /api/dashboard/admin/pending-approvals - Enhanced pending approvals with progress
router.get('/admin/pending-approvals', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    console.log('⏳ Fetching enhanced pending approvals for admin:', req.dbUser.email);
    
    const query = `
      SELECT 
        i.id,
        i.name,
        i.handle,
        i.wallet_address,
        i.status,
        i.created_at,
        i.pledge_threshold_eth,
        i.pledge_threshold_usdc,
        i.total_pledged_eth,
        i.total_pledged_usdc,
        i.category,
        i.followers_count,
        COUNT(p.user_address) as pledger_count
      FROM influencers i
      LEFT JOIN pledges p ON i.wallet_address = p.influencer_address AND p.has_withdrawn = false
      WHERE i.status = 'pledging' 
        AND i.is_approved = false
        AND (
          (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth)
          OR 
          (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
        )
      GROUP BY i.id, i.name, i.handle, i.wallet_address, i.status, i.created_at, 
               i.pledge_threshold_eth, i.pledge_threshold_usdc, i.total_pledged_eth, 
               i.total_pledged_usdc, i.category, i.followers_count
      ORDER BY i.created_at DESC
    `;
    
    const result = await db.query(query);
    
    const approvals = result.rows.map(row => {
      const ethProgress = row.pledge_threshold_eth > 0 ? 
        (parseFloat(row.total_pledged_eth || 0) / parseFloat(row.pledge_threshold_eth)) * 100 : 0;
      const usdcProgress = row.pledge_threshold_usdc > 0 ? 
        (parseFloat(row.total_pledged_usdc || 0) / parseFloat(row.pledge_threshold_usdc)) * 100 : 0;
      const overallProgress = Math.max(ethProgress, usdcProgress);
      
      return {
        id: row.id.toString(),
        type: 'token_approval',
        name: row.name,
        details: `${row.handle || '@' + row.name.toLowerCase()} • ${row.category || 'Unknown'} • ${row.pledger_count} pledgers • ${parseFloat(row.total_pledged_eth || 0).toFixed(2)} ETH raised${row.pledge_threshold_usdc > 0 ? ` + $${parseFloat(row.total_pledged_usdc || 0).toFixed(0)} USDC` : ''} (Goal: ${parseFloat(row.pledge_threshold_eth || 0).toFixed(2)} ETH${row.pledge_threshold_usdc > 0 ? ` or $${parseFloat(row.pledge_threshold_usdc || 0).toFixed(0)} USDC` : ''})`,
        requestedAt: row.created_at,
        requestedBy: row.wallet_address,
        progress: overallProgress,
        followers: row.followers_count || 0,
        category: row.category
      };
    });

    console.log(`✅ Enhanced pending approvals loaded: ${approvals.length} pending`);
    res.json(approvals);

  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending approvals', 
      details: error.message 
    });
  }
});

// POST /api/dashboard/admin/approve/:id - Enhanced approval process
router.post('/admin/approve/:id', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    console.log('✅ Processing approval for influencer ID:', req.params.id);
    const { id } = req.params;
    const { approved } = req.body;
    
    // Get influencer details first
    const influencerResult = await db.query(
      'SELECT name, handle, wallet_address FROM influencers WHERE id = $1',
      [id]
    );
    
    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Influencer not found' });
    }
    
    const influencer = influencerResult.rows[0];
    
    if (approved) {
      await db.query(`
        UPDATE influencers 
        SET is_approved = true, 
            approved_at = NOW(),
            status = 'approved'
        WHERE id = $1
      `, [id]);
      
      // Log the approval event (if you have pledge_events table)
      try {
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
      } catch (eventError) {
        console.log('Note: Could not log event (pledge_events table may not exist):', eventError.message);
      }
      
      console.log(`✅ Influencer ${influencer.name} (${id}) approved by admin ${req.dbUser.email}`);
      
    } else {
      await db.query(`
        UPDATE influencers 
        SET status = 'rejected'
        WHERE id = $1
      `, [id]);
      
      // Log the rejection event (if you have pledge_events table)
      try {
        await db.query(`
          INSERT INTO pledge_events (event_type, influencer_address, event_data)
          VALUES ('rejected', $1, $2)
        `, [
          influencer.wallet_address,
          JSON.stringify({
            rejected_by: req.dbUser.email,
            rejected_at: new Date().toISOString(),
            influencer_name: influencer.name
          })
        ]);
      } catch (eventError) {
        console.log('Note: Could not log event (pledge_events table may not exist):', eventError.message);
      }
      
      console.log(`❌ Influencer ${influencer.name} (${id}) rejected by admin ${req.dbUser.email}`);
    }

    res.json({
      success: true,
      message: approved ? 
        `${influencer.name} approved successfully` : 
        `${influencer.name} rejected successfully`,
      influencer: {
        id,
        name: influencer.name,
        handle: influencer.handle,
        approved
      }
    });

  } catch (error) {
    console.error('❌ Error processing approval:', error);
    res.status(500).json({ 
      error: 'Failed to process approval', 
      details: error.message 
    });
  }
});

// GET /api/dashboard/admin/recent-activity - Get recent platform activity
router.get('/admin/recent-activity', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    console.log('📈 Fetching recent platform activity...');
    
    // Try to get from pledge_events table, fall back to pledges if it doesn't exist
    let query;
    try {
      query = `
        SELECT 
          event_type,
          influencer_address,
          user_address,
          eth_amount,
          usdc_amount,
          event_data,
          created_at
        FROM pledge_events
        ORDER BY created_at DESC
        LIMIT 20
      `;
      
      const result = await db.query(query);
      
      const activities = result.rows.map(row => ({
        type: row.event_type,
        description: generateActivityDescription(row),
        timestamp: row.created_at,
        user: row.user_address || 'System',
        amount: row.eth_amount || row.usdc_amount || null
      }));
      
      res.json(activities);
      
    } catch (tableError) {
      // Fallback to recent pledges if pledge_events table doesn't exist
      console.log('pledge_events table not found, using recent pledges as fallback');
      
      const fallbackQuery = `
        SELECT 
          p.created_at,
          p.user_address,
          p.eth_amount,
          p.usdc_amount,
          i.name as influencer_name
        FROM pledges p
        JOIN influencers i ON p.influencer_address = i.wallet_address
        ORDER BY p.created_at DESC
        LIMIT 20
      `;
      
      const fallbackResult = await db.query(fallbackQuery);
      
      const activities = fallbackResult.rows.map(row => ({
        type: 'pledge_made',
        description: `New pledge to ${row.influencer_name}: ${row.eth_amount || row.usdc_amount} ${row.eth_amount ? 'ETH' : 'USDC'}`,
        timestamp: row.created_at,
        user: row.user_address,
        amount: row.eth_amount || row.usdc_amount
      }));
      
      res.json(activities);
    }

  } catch (error) {
    console.error('❌ Error fetching recent activity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent activity', 
      details: error.message 
    });
  }
});

// Helper function to generate activity descriptions
function generateActivityDescription(event) {
  switch (event.event_type) {
    case 'pledge_made':
      return `New pledge: ${event.eth_amount || event.usdc_amount} ${event.eth_amount ? 'ETH' : 'USDC'}`;
    case 'threshold_reached':
      return 'Funding threshold reached';
    case 'approved':
      return `Influencer approved: ${event.event_data?.influencer_name || 'Unknown'}`;
    case 'launched':
      return 'Token launched successfully';
    case 'withdrawn':
      return 'Pledge withdrawn';
    default:
      return `${event.event_type} event`;
  }
}

// GET /api/dashboard/admin/users - Get user management data (enhanced)
router.get('/admin/users', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        id, email, display_name, wallet_address, status, 
        total_invested, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;
    
    if (status && status !== 'all') {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (email ILIKE $${paramCount} OR display_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (status && status !== 'all') {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (email ILIKE $${countParamCount} OR display_name ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }
    
    const countResult = await db.query(countQuery, countParams);
    
    res.json({
      users: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users', 
      details: error.message 
    });
  }
});

// ======================
// INVESTOR ROUTES
// ======================

// GET /api/dashboard/investor/portfolio - Get investor portfolio
router.get('/investor/portfolio', requireAuth, requireStatus('investor'), async (req, res) => {
  try {
    console.log('📊 Fetching investor portfolio for user:', req.dbUser.email);
    
    // Mock portfolio data for now - replace with real data later
    const portfolio = {
      holdings: [],
      summary: {
        totalValue: 0,
        totalCost: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        holdingsCount: 0
      }
    };

    res.json(portfolio);

  } catch (error) {
    console.error('❌ Error fetching portfolio:', error);
    res.status(500).json({ 
      error: 'Failed to fetch portfolio', 
      details: error.message 
    });
  }
});

// GET /api/dashboard/investor/pledges - Get investor pledges
router.get('/investor/pledges', requireAuth, requireStatus('investor'), async (req, res) => {
  try {
    console.log('📊 Fetching investor pledges for user:', req.dbUser.email);
    
    // Mock pledges data for now - replace with real data later
    const pledges = {
      pledges: []
    };

    res.json(pledges);

  } catch (error) {
    console.error('❌ Error fetching pledges:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pledges', 
      details: error.message 
    });
  }
});

// ======================
// INFLUENCER ROUTES
// ======================

// GET /api/dashboard/influencer/stats - Get influencer stats
router.get('/influencer/stats', requireAuth, requireStatus('influencer'), async (req, res) => {
  try {
    console.log('📊 Fetching influencer stats for user:', req.dbUser.email);
    
    // Mock influencer data for now - replace with real data later
    const stats = {
      hasToken: false,
      message: "Your influencer token hasn't been set up yet. Contact an admin to configure your token parameters."
    };

    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching influencer stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch influencer stats', 
      details: error.message 
    });
  }
});

// GET /api/dashboard/influencer/pledgers - Get influencer pledgers
router.get('/influencer/pledgers', requireAuth, requireStatus('influencer'), async (req, res) => {
  try {
    console.log('📊 Fetching influencer pledgers for user:', req.dbUser.email);
    
    // Mock pledgers data for now - replace with real data later
    const pledgers = {
      pledgers: [],
      totals: {
        totalPledgers: 0,
        totalEth: 0,
        totalUsdc: 0
      }
    };

    res.json(pledgers);

  } catch (error) {
    console.error('❌ Error fetching pledgers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pledgers', 
      details: error.message 
    });
  }
});

module.exports = router;