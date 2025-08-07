// Backend/routes/userStatusRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');

// Middleware to verify Firebase token and get user
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    
    // Get user from database to check status
    const result = await db.query(
      'SELECT * FROM users WHERE wallet_address = $1 OR email = $2',
      [decoded.uid, decoded.email]
    );
    
    if (result.rows.length > 0) {
      req.dbUser = result.rows[0];
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
      'browser': 1,
      'investor': 2,
      'influencer': 3,
      'admin': 4
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

// GET /api/status/current - Get current user's status
router.get('/current', authenticateUser, async (req, res) => {
  try {
    if (!req.dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      status: req.dbUser.status,
      email: req.dbUser.email,
      wallet_address: req.dbUser.wallet_address,
      status_updated_at: req.dbUser.status_updated_at,
      permissions: getPermissionsForStatus(req.dbUser.status)
    });
  } catch (error) {
    console.error('Error getting user status:', error);
    res.status(500).json({ error: 'Failed to get user status' });
  }
});

// GET /api/status/stats - Get status statistics (admin only)
router.get('/stats', authenticateUser, requireStatus('admin'), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM user_status_stats');
    
    const historyResult = await db.query(`
      SELECT 
        DATE(created_at) as date,
        new_status,
        COUNT(*) as count
      FROM user_status_history
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at), new_status
      ORDER BY date DESC
    `);

    res.json({
      current: result.rows,
      history: historyResult.rows
    });
  } catch (error) {
    console.error('Error getting status stats:', error);
    res.status(500).json({ error: 'Failed to get status statistics' });
  }
});

// POST /api/status/promote-to-investor - Automatically promote user to investor
router.post('/promote-to-investor', authenticateUser, async (req, res) => {
  try {
    const { wallet_address } = req.body || { wallet_address: req.dbUser?.wallet_address };
    
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    // Check if user has made any investments or pledges
    const investmentCheck = await db.query(`
      SELECT EXISTS (
        SELECT 1 FROM pledges WHERE user_address = $1
        UNION
        SELECT 1 FROM investments WHERE user_id = (
          SELECT id FROM users WHERE wallet_address = $1
        )
      ) as has_invested
    `, [wallet_address]);

    if (!investmentCheck.rows[0].has_invested) {
      return res.status(400).json({ 
        error: 'User has not made any investments yet' 
      });
    }

    const result = await db.query(
      'SELECT promote_to_investor($1) as success',
      [wallet_address]
    );

    if (result.rows[0].success) {
      res.json({ 
        success: true, 
        message: 'User promoted to investor status' 
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to promote user - may already be investor or higher' 
      });
    }
  } catch (error) {
    console.error('Error promoting to investor:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// POST /api/status/promote-to-influencer - Promote user to influencer (admin only)
router.post('/promote-to-influencer', authenticateUser, requireStatus('admin'), async (req, res) => {
  try {
    const { wallet_address, reason } = req.body;
    
    if (!wallet_address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const result = await db.query(
      'SELECT promote_to_influencer($1, $2) as success',
      [wallet_address, req.dbUser.wallet_address]
    );

    if (result.rows[0].success) {
      // Log the reason if provided
      if (reason) {
        await db.query(
          `UPDATE user_status_history 
           SET reason = $1 
           WHERE user_id = (SELECT id FROM users WHERE wallet_address = $2)
           ORDER BY created_at DESC 
           LIMIT 1`,
          [reason, wallet_address]
        );
      }

      res.json({ 
        success: true, 
        message: 'User promoted to influencer status' 
      });
    } else {
      res.status(400).json({ 
        error: 'Failed to promote user' 
      });
    }
  } catch (error) {
    console.error('Error promoting to influencer:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// PUT /api/status/update - Update user status (admin only)
router.put('/update', authenticateUser, requireStatus('admin'), async (req, res) => {
  try {
    const { wallet_address, new_status, reason } = req.body;
    
    const validStatuses = ['browser', 'investor', 'influencer', 'admin'];
    if (!validStatuses.includes(new_status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        valid: validStatuses 
      });
    }

    const result = await db.query(
      `UPDATE users 
       SET status = $1, 
           status_updated_by = $2,
           status_updated_at = CURRENT_TIMESTAMP
       WHERE wallet_address = $3
       RETURNING *`,
      [new_status, req.dbUser.wallet_address, wallet_address]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log reason if provided
    if (reason) {
      await db.query(
        `UPDATE user_status_history 
         SET reason = $1 
         WHERE user_id = $2
         ORDER BY created_at DESC 
         LIMIT 1`,
        [reason, result.rows[0].id]
      );
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// GET /api/status/history/:wallet - Get status change history (admin only)
router.get('/history/:wallet', authenticateUser, requireStatus('admin'), async (req, res) => {
  try {
    const { wallet } = req.params;
    
    const result = await db.query(
      `SELECT 
        h.*,
        u.email,
        u.display_name
       FROM user_status_history h
       JOIN users u ON h.user_id = u.id
       WHERE u.wallet_address = $1
       ORDER BY h.created_at DESC`,
      [wallet]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting status history:', error);
    res.status(500).json({ error: 'Failed to get status history' });
  }
});

// GET /api/status/dashboard-config - Get dashboard configuration based on status
router.get('/dashboard-config', authenticateUser, async (req, res) => {
  try {
    const userStatus = req.dbUser?.status || 'browser';
    
    const config = getDashboardConfig(userStatus);
    
    res.json({
      status: userStatus,
      config
    });
  } catch (error) {
    console.error('Error getting dashboard config:', error);
    res.status(500).json({ error: 'Failed to get dashboard configuration' });
  }
});

// Helper functions
function getPermissionsForStatus(status) {
  const permissions = {
    browser: [
      'view_public_content',
      'view_influencers',
      'view_trending'
    ],
    investor: [
      'view_public_content',
      'view_influencers',
      'view_trending',
      'make_investments',
      'view_portfolio',
      'trade_tokens',
      'pledge_to_influencers'
    ],
    influencer: [
      'view_public_content',
      'view_influencers',
      'view_trending',
      'make_investments',
      'view_portfolio',
      'trade_tokens',
      'pledge_to_influencers',
      'manage_own_token',
      'view_analytics',
      'access_influencer_dashboard'
    ],
    admin: [
      'all_permissions',
      'manage_users',
      'manage_influencers',
      'view_all_analytics',
      'approve_tokens',
      'manage_platform',
      'access_admin_dashboard'
    ]
  };

  return permissions[status] || permissions.browser;
}

function getDashboardConfig(status) {
  const configs = {
    browser: {
      theme: 'default',
      modules: ['trending', 'discover', 'about'],
      features: {
        canInvest: false,
        canTrade: false,
        canPledge: false,
        showPortfolio: false,
        showAnalytics: false
      },
      navigation: [
        { label: 'Home', path: '/' },
        { label: 'Trending', path: '/trending' },
        { label: 'Influencers', path: '/influencers' },
        { label: 'About', path: '/about' }
      ]
    },
    investor: {
      theme: 'investor',
      modules: ['portfolio', 'trading', 'trending', 'pledges'],
      features: {
        canInvest: true,
        canTrade: true,
        canPledge: true,
        showPortfolio: true,
        showAnalytics: true
      },
      navigation: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Portfolio', path: '/portfolio' },
        { label: 'Trading', path: '/trading' },
        { label: 'Influencers', path: '/influencers' },
        { label: 'My Pledges', path: '/pledges' }
      ]
    },
    influencer: {
      theme: 'influencer',
      modules: ['my_token', 'analytics', 'community', 'portfolio', 'trading'],
      features: {
        canInvest: true,
        canTrade: true,
        canPledge: true,
        showPortfolio: true,
        showAnalytics: true,
        manageToken: true,
        viewTokenAnalytics: true
      },
      navigation: [
        { label: 'My Dashboard', path: '/influencer-dashboard' },
        { label: 'My Token', path: '/my-token' },
        { label: 'Analytics', path: '/analytics' },
        { label: 'Community', path: '/community' },
        { label: 'Portfolio', path: '/portfolio' },
        { label: 'Trading', path: '/trading' }
      ]
    },
    admin: {
      theme: 'admin',
      modules: ['admin_panel', 'user_management', 'token_management', 'analytics', 'platform_settings'],
      features: {
        canInvest: true,
        canTrade: true,
        canPledge: true,
        showPortfolio: true,
        showAnalytics: true,
        manageToken: true,
        viewTokenAnalytics: true,
        manageUsers: true,
        managePlatform: true
      },
      navigation: [
        { label: 'Admin Panel', path: '/admin' },
        { label: 'Users', path: '/admin/users' },
        { label: 'Influencers', path: '/admin/influencers' },
        { label: 'Tokens', path: '/admin/tokens' },
        { label: 'Analytics', path: '/admin/analytics' },
        { label: 'Settings', path: '/admin/settings' },
        { label: 'Token Factory', path: '/admin/token-factory' }
      ]
    }
  };

  return configs[status] || configs.browser;
}

module.exports = router;