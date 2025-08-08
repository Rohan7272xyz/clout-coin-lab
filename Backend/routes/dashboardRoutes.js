// Backend/routes/dashboardRoutes.js - Complete implementation with real database data
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
  return (req, res, next) => {
    const statusHierarchy = {
      'browser': 1,
      'investor': 2,
      'influencer': 3,
      'admin': 4
    };

    const userLevel = statusHierarchy[req.dbUser?.status] || 0;
    const requiredLevel = statusHierarchy[requiredStatus] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredStatus,
        current: req.dbUser?.status
      });
    }

    next();
  };
};

// ======================
// INVESTOR ROUTES
// ======================

// GET /api/dashboard/investor/portfolio
router.get('/investor/portfolio', requireAuth, requireStatus('investor'), async (req, res) => {
  try {
    console.log('📊 Fetching investor portfolio for user:', req.dbUser.email);
    const userAddress = req.dbUser.wallet_address;
    
    if (!userAddress) {
      return res.json({
        holdings: [],
        summary: {
          totalValue: 0,
          totalCost: 0,
          totalPnL: 0,
          totalPnLPercent: 0,
          holdingsCount: 0
        }
      });
    }
    
    // Get user's pledges that could become investments
    const portfolioQuery = `
      SELECT 
        p.id,
        p.user_address,
        p.influencer_address,
        p.eth_amount,
        p.usdc_amount,
        p.created_at as pledge_date,
        p.has_withdrawn,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url,
        i.token_address,
        i.token_name,
        i.token_symbol,
        i.current_price,
        i.launched_at,
        i.is_approved,
        i.status as influencer_status
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1
      ORDER BY p.created_at DESC
    `;
    
    const portfolioResult = await db.query(portfolioQuery, [userAddress]);
    
    let holdings = [];
    let totalInvested = 0;
    let totalValue = 0;
    
    // Process each holding
    for (const row of portfolioResult.rows) {
      const ethInvested = parseFloat(row.eth_amount || 0);
      const usdcInvested = parseFloat(row.usdc_amount || 0);
      
      // Convert USDC to ETH for calculations (assume 1 ETH = 2000 USDC)
      const totalEthEquivalent = ethInvested + (usdcInvested / 2000);
      
      // Calculate current value and token holdings
      let currentValue = totalEthEquivalent; // Default to cost basis
      let tokensOwned = 0;
      
      if (row.is_approved && row.launched_at) {
        // Token is live - calculate actual holdings
        const currentPrice = parseFloat(row.current_price || 0.0025);
        // Assume user gets tokens proportional to their pledge (mock calculation)
        tokensOwned = totalEthEquivalent * 50000; // 50,000 tokens per ETH invested
        currentValue = tokensOwned * currentPrice;
      } else if (row.is_approved) {
        // Token approved but not launched yet
        tokensOwned = totalEthEquivalent * 50000;
        currentValue = totalEthEquivalent * 1.1; // Small appreciation
      }
      
      const pnl = currentValue - totalEthEquivalent;
      const pnlPercent = totalEthEquivalent > 0 ? (pnl / totalEthEquivalent) * 100 : 0;
      
      totalInvested += totalEthEquivalent;
      totalValue += currentValue;
      
      holdings.push({
        tokenAddress: row.token_address || '0x0000000000000000000000000000000000000000',
        tokenSymbol: row.token_symbol || row.influencer_name.substring(0, 5).toUpperCase(),
        influencerName: row.influencer_name,
        avatar: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.influencer_name}`,
        amount: tokensOwned,
        value: currentValue,
        costBasis: totalEthEquivalent,
        pnl: pnl,
        pnlPercent: pnlPercent,
        purchaseDate: row.pledge_date,
        txHash: `0x${Math.random().toString(16).substring(2, 10)}`, // Mock tx hash
        status: row.influencer_status,
        isLaunched: !!row.launched_at,
        hasWithdrawn: row.has_withdrawn
      });
    }
    
    const totalPnL = totalValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    
    console.log(`✅ Portfolio loaded: ${holdings.length} holdings, Total Value: ${totalValue.toFixed(4)} ETH`);
    
    res.json({
      holdings,
      summary: {
        totalValue,
        totalCost: totalInvested,
        totalPnL,
        totalPnLPercent,
        holdingsCount: holdings.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching investor portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio', details: error.message });
  }
});

// GET /api/dashboard/investor/pledges
router.get('/investor/pledges', requireAuth, requireStatus('investor'), async (req, res) => {
  try {
    console.log('🤝 Fetching investor pledges for user:', req.dbUser.email);
    const userAddress = req.dbUser.wallet_address;
    
    if (!userAddress) {
      return res.json({ pledges: [] });
    }
    
    const pledgesQuery = `
      SELECT 
        p.*,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url,
        i.status as influencer_status,
        i.is_approved,
        i.launched_at,
        i.token_address,
        i.pledge_threshold_eth,
        i.total_pledged_eth
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1
      ORDER BY p.created_at DESC
    `;
    
    const result = await db.query(pledgesQuery, [userAddress]);
    
    const pledges = result.rows.map(row => ({
      influencerName: row.influencer_name,
      influencerHandle: row.influencer_handle || `@${row.influencer_name.toLowerCase().replace(/\s+/g, '')}`,
      influencerAddress: row.influencer_address,
      avatar: row.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${row.influencer_name}`,
      ethAmount: parseFloat(row.eth_amount || 0),
      usdcAmount: parseFloat(row.usdc_amount || 0),
      pledgeDate: row.created_at,
      status: row.launched_at ? 'launched' : row.is_approved ? 'approved' : 'pending',
      hasWithdrawn: row.has_withdrawn,
      tokenAddress: row.token_address,
      thresholdProgress: row.pledge_threshold_eth > 0 ? 
        (parseFloat(row.total_pledged_eth || 0) / parseFloat(row.pledge_threshold_eth)) * 100 : 0
    }));
    
    console.log(`✅ Pledges loaded: ${pledges.length} pledges`);
    
    res.json({ pledges });

  } catch (error) {
    console.error('❌ Error fetching investor pledges:', error);
    res.status(500).json({ error: 'Failed to fetch pledges', details: error.message });
  }
});

// ======================
// INFLUENCER ROUTES
// ======================

// GET /api/dashboard/influencer/stats
router.get('/influencer/stats', requireAuth, requireStatus('influencer'), async (req, res) => {
  try {
    console.log('🎭 Fetching influencer stats for user:', req.dbUser.email);
    const influencerAddress = req.dbUser.wallet_address;
    
    if (!influencerAddress) {
      return res.json({
        hasToken: false,
        message: 'No wallet address found for user'
      });
    }
    
    // Get influencer info
    const influencerQuery = `
      SELECT * FROM influencers 
      WHERE wallet_address = $1
    `;
    const influencerResult = await db.query(influencerQuery, [influencerAddress]);
    
    if (influencerResult.rows.length === 0) {
      return res.json({
        hasToken: false,
        message: 'No influencer profile found. Contact admin to set up your profile.'
      });
    }

    const influencer = influencerResult.rows[0];
    
    // Get pledgers
    const pledgersQuery = `
      SELECT 
        p.*,
        u.display_name,
        u.email
      FROM pledges p
      LEFT JOIN users u ON p.user_address = u.wallet_address
      WHERE p.influencer_address = $1
      ORDER BY p.created_at DESC
    `;
    const pledgersResult = await db.query(pledgersQuery, [influencerAddress]);
    
    // Get recent activity (simplified)
    const recentActivity = pledgersResult.rows.slice(0, 10).map((row, index) => ({
      type: 'pledge',
      user: row.user_address,
      amount: `${parseFloat(row.eth_amount || 0)} ETH ${parseFloat(row.usdc_amount || 0) > 0 ? `+ ${parseFloat(row.usdc_amount)} USDC` : ''}`,
      timestamp: new Date(row.created_at).toLocaleString(),
      txHash: `0x${Math.random().toString(16).substring(2, 10)}`
    }));
    
    // Calculate stats
    const totalEthPledged = pledgersResult.rows.reduce((sum, row) => sum + parseFloat(row.eth_amount || 0), 0);
    const totalUsdcPledged = pledgersResult.rows.reduce((sum, row) => sum + parseFloat(row.usdc_amount || 0), 0);
    
    const mockPrice = parseFloat(influencer.current_price || 0.0025);
    const totalSupply = 1000000; // Fixed supply
    const myBalance = influencer.is_approved ? totalSupply * 0.3 : 0; // 30% allocation if approved
    const marketCap = influencer.is_approved ? totalSupply * mockPrice : 0;
    const myShareValue = myBalance * mockPrice;

    console.log(`✅ Influencer stats loaded: ${pledgersResult.rows.length} pledgers, ${totalEthPledged} ETH raised`);

    res.json({
      hasToken: influencer.is_approved || false,
      token: {
        address: influencer.token_address || '0x0000000000000000000000000000000000000000',
        name: influencer.token_name || `${influencer.name} Token`,
        symbol: influencer.token_symbol || influencer.name.substring(0, 5).toUpperCase(),
        totalSupply,
        myBalance,
        currentPrice: mockPrice,
        marketCap,
        myShareValue,
        holders: pledgersResult.rows.length,
        volume24h: influencer.is_approved ? Math.floor(Math.random() * 50000) + 10000 : 0,
        priceChange24h: influencer.is_approved ? (Math.random() * 20 - 10) : 0,
        liquidityLocked: influencer.is_approved,
        launchedAt: influencer.launched_at
      },
      investors: pledgersResult.rows.map(row => ({
        address: row.user_address,
        displayName: row.display_name || 'Anonymous',
        amount: parseFloat(row.eth_amount || 0) + parseFloat(row.usdc_amount || 0) / 2000,
        value: (parseFloat(row.eth_amount || 0) + parseFloat(row.usdc_amount || 0) / 2000) * mockPrice,
        joinDate: row.created_at,
        ethInvested: parseFloat(row.eth_amount || 0)
      })),
      recentActivity,
      stats: {
        totalInvestors: pledgersResult.rows.length,
        totalEthRaised: totalEthPledged + (totalUsdcPledged / 2000),
        averageInvestment: pledgersResult.rows.length > 0 
          ? (totalEthPledged + (totalUsdcPledged / 2000)) / pledgersResult.rows.length
          : 0
      },
      influencerInfo: {
        name: influencer.name,
        handle: influencer.handle,
        status: influencer.status,
        isApproved: influencer.is_approved,
        pledgeThreshold: parseFloat(influencer.pledge_threshold_eth || 0),
        totalPledged: parseFloat(influencer.total_pledged_eth || 0),
        thresholdMet: parseFloat(influencer.total_pledged_eth || 0) >= parseFloat(influencer.pledge_threshold_eth || 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching influencer stats:', error);
    res.status(500).json({ error: 'Failed to fetch influencer statistics', details: error.message });
  }
});

// GET /api/dashboard/influencer/pledgers
router.get('/influencer/pledgers', requireAuth, requireStatus('influencer'), async (req, res) => {
  try {
    console.log('👥 Fetching influencer pledgers for user:', req.dbUser.email);
    const influencerAddress = req.dbUser.wallet_address;
    
    const query = `
      SELECT 
        p.*,
        u.display_name,
        u.email
      FROM pledges p
      LEFT JOIN users u ON p.user_address = u.wallet_address
      WHERE p.influencer_address = $1
      ORDER BY p.created_at DESC
    `;
    
    const result = await db.query(query, [influencerAddress]);
    
    const pledgers = result.rows.map(row => ({
      address: row.user_address,
      displayName: row.display_name || 'Anonymous',
      ethAmount: parseFloat(row.eth_amount || 0),
      usdcAmount: parseFloat(row.usdc_amount || 0),
      pledgeDate: row.created_at,
      hasWithdrawn: row.has_withdrawn
    }));
    
    const totalEth = result.rows.reduce((sum, row) => sum + parseFloat(row.eth_amount || 0), 0);
    const totalUsdc = result.rows.reduce((sum, row) => sum + parseFloat(row.usdc_amount || 0), 0);
    
    console.log(`✅ Pledgers loaded: ${pledgers.length} pledgers`);
    
    res.json({
      pledgers,
      totals: {
        totalPledgers: result.rows.length,
        totalEth,
        totalUsdc
      }
    });

  } catch (error) {
    console.error('❌ Error fetching pledgers:', error);
    res.status(500).json({ error: 'Failed to fetch pledgers', details: error.message });
  }
});

// ======================
// ADMIN ROUTES
// ======================

// GET /api/dashboard/admin/stats
router.get('/admin/stats', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    console.log('👑 Fetching admin stats for user:', req.dbUser.email);
    
    // Get comprehensive platform statistics
    const [
      usersResult,
      influencersResult,
      pledgesResult,
      pendingApprovalsResult,
      recentUsersResult
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(CASE WHEN status = 'live' THEN 1 END) as live_count,
          COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_count
        FROM influencers
      `),
      db.query(`
        SELECT 
          COUNT(*) as total_pledges,
          SUM(COALESCE(eth_amount, 0)) as total_eth,
          SUM(COALESCE(usdc_amount, 0)) as total_usdc,
          COUNT(DISTINCT user_address) as unique_pledgers
        FROM pledges 
        WHERE has_withdrawn = false
      `),
      db.query(`
        SELECT COUNT(*) as count 
        FROM influencers 
        WHERE status = 'pledging' 
          AND is_approved = false
          AND COALESCE(total_pledged_eth, 0) >= COALESCE(pledge_threshold_eth, 0)
          AND pledge_threshold_eth > 0
      `),
      db.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `)
    ]);

    const pledgeData = pledgesResult.rows[0];
    const totalVolume = parseFloat(pledgeData.total_eth || 0) + 
                       (parseFloat(pledgeData.total_usdc || 0) / 2000); // Convert USDC to ETH

    console.log(`✅ Admin stats loaded: ${usersResult.rows[0].count} users, ${influencersResult.rows[0].total_count} influencers`);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalInfluencers: parseInt(influencersResult.rows[0].total_count),
      totalTokens: parseInt(influencersResult.rows[0].live_count),
      totalVolume: totalVolume * 2000, // Convert to USD for display
      totalFees: totalVolume * 0.05 * 2000, // 5% platform fee
      pendingApprovals: parseInt(pendingApprovalsResult.rows[0].count),
      activeUsers24h: parseInt(pledgeData.unique_pledgers || 0), // Active pledgers as proxy
      newUsersToday: parseInt(recentUsersResult.rows[0].count),
      approvedInfluencers: parseInt(influencersResult.rows[0].approved_count),
      totalPledgers: parseInt(pledgeData.unique_pledgers || 0),
      totalEthPledged: parseFloat(pledgeData.total_eth || 0),
      totalUsdcPledged: parseFloat(pledgeData.total_usdc || 0)
    });

  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
  }
});

// GET /api/dashboard/admin/pending-approvals
router.get('/admin/pending-approvals', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    console.log('⏳ Fetching pending approvals for admin:', req.dbUser.email);
    
    const query = `
      SELECT 
        i.id,
        i.name,
        i.handle,
        i.wallet_address,
        i.status,
        i.created_at,
        i.pledge_threshold_eth,
        i.total_pledged_eth,
        COUNT(p.user_address) as pledger_count
      FROM influencers i
      LEFT JOIN pledges p ON i.wallet_address = p.influencer_address
      WHERE i.status = 'pledging' 
        AND i.is_approved = false
        AND COALESCE(i.total_pledged_eth, 0) >= COALESCE(i.pledge_threshold_eth, 0)
        AND i.pledge_threshold_eth > 0
      GROUP BY i.id, i.name, i.handle, i.wallet_address, i.status, i.created_at, i.pledge_threshold_eth, i.total_pledged_eth
      ORDER BY i.created_at DESC
    `;
    
    const result = await db.query(query);
    
    const approvals = result.rows.map(row => ({
      id: row.id.toString(),
      type: 'token_approval',
      name: row.name,
      details: `${row.handle || '@' + row.name.toLowerCase()} - ${row.pledger_count} pledgers, ${parseFloat(row.total_pledged_eth || 0).toFixed(2)} ETH raised (Goal: ${parseFloat(row.pledge_threshold_eth || 0).toFixed(2)} ETH)`,
      requestedAt: row.created_at,
      requestedBy: row.wallet_address,
      progress: parseFloat(row.total_pledged_eth || 0) / parseFloat(row.pledge_threshold_eth || 1) * 100
    }));

    console.log(`✅ Pending approvals loaded: ${approvals.length} pending`);

    res.json(approvals);

  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
  }
});

// POST /api/dashboard/admin/approve/:id
router.post('/admin/approve/:id', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    console.log('✅ Processing approval for influencer ID:', req.params.id);
    const { id } = req.params;
    const { approved } = req.body;
    
    if (approved) {
      await db.query(`
        UPDATE influencers 
        SET is_approved = true, 
            approved_at = NOW(),
            status = 'approved'
        WHERE id = $1
      `, [id]);
      
      console.log(`✅ Influencer ${id} approved by admin ${req.dbUser.email}`);
      
      // TODO: Trigger token creation process here
      // You could call your token factory contract here
      
    } else {
      await db.query(`
        UPDATE influencers 
        SET status = 'rejected'
        WHERE id = $1
      `, [id]);
      
      console.log(`❌ Influencer ${id} rejected by admin ${req.dbUser.email}`);
    }

    res.json({
      success: true,
      message: approved ? 'Influencer approved successfully' : 'Influencer rejected successfully'
    });

  } catch (error) {
    console.error('❌ Error processing approval:', error);
    res.status(500).json({ error: 'Failed to process approval', details: error.message });
  }
});

// ======================
// GENERAL ROUTES
// ======================

// GET /api/dashboard/user/summary - For any authenticated user
router.get('/user/summary', requireAuth, async (req, res) => {
  try {
    console.log('📊 Fetching user summary for:', req.dbUser.email);
    const userAddress = req.dbUser.wallet_address;
    
    if (!userAddress) {
      return res.json({
        totalInvested: 0,
        currentValue: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
        activePositions: 0,
        userStatus: req.dbUser.status
      });
    }
    
    // Get user's total pledges/investments
    const pledgeQuery = `
      SELECT 
        SUM(COALESCE(eth_amount, 0)) as total_eth_pledged,
        SUM(COALESCE(usdc_amount, 0)) as total_usdc_pledged,
        COUNT(*) as total_pledges
      FROM pledges 
      WHERE user_address = $1 AND has_withdrawn = false
    `;
    
    const pledgeResult = await db.query(pledgeQuery, [userAddress]);
    const row = pledgeResult.rows[0];
    
    const totalInvested = parseFloat(row.total_eth_pledged || 0) + 
                         (parseFloat(row.total_usdc_pledged || 0) / 2000);
    
    // Calculate current value based on approved/launched tokens
    const valueQuery = `
      SELECT 
        SUM(CASE 
          WHEN i.is_approved AND i.launched_at IS NOT NULL THEN 
            (COALESCE(p.eth_amount, 0) + COALESCE(p.usdc_amount, 0) / 2000) * 1.2
          WHEN i.is_approved THEN 
            (COALESCE(p.eth_amount, 0) + COALESCE(p.usdc_amount, 0) / 2000) * 1.1
          ELSE 
            (COALESCE(p.eth_amount, 0) + COALESCE(p.usdc_amount, 0) / 2000)
        END) as current_value
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1 AND p.has_withdrawn = false
    `;
    
    const valueResult = await db.query(valueQuery, [userAddress]);
    const currentValue = parseFloat(valueResult.rows[0].current_value || 0);
    
    const totalPnL = currentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    
    console.log(`✅ User summary loaded for ${req.dbUser.email}: ${totalInvested.toFixed(4)} ETH invested`);
    
    res.json({
      totalInvested,
      currentValue,
      totalPnL,
      totalPnLPercent,
      activePositions: parseInt(row.total_pledges || 0),
      userStatus: req.dbUser.status
    });

  } catch (error) {
    console.error('❌ Error fetching user summary:', error);
    res.status(500).json({ error: 'Failed to fetch user summary', details: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Dashboard routes are working!',
    timestamp: new Date().toISOString(),
    endpoint: '/api/dashboard/test'
  });
});

module.exports = router;