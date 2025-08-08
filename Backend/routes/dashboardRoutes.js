// Backend/routes/dashboardRoutes.js
// API routes for dashboard functionality

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const admin = require('firebase-admin');
const { ethers } = require('ethers');

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
      'SELECT * FROM users WHERE email = $1',
      [decoded.email]
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
// INFLUENCER ROUTES
// ======================

// GET /api/dashboard/influencer/stats
router.get('/influencer/stats', requireAuth, requireStatus('influencer'), async (req, res) => {
  try {
    const influencerAddress = req.dbUser.wallet_address;
    
    // Get token info
    const tokenResult = await db.query(`
      SELECT 
        t.*,
        i.name as influencer_name,
        i.followers_count
      FROM tokens t
      JOIN influencers i ON t.influencer_id = i.id
      WHERE i.wallet_address = $1
    `, [influencerAddress]);

    if (tokenResult.rows.length === 0) {
      return res.json({
        hasToken: false,
        message: 'No token created yet'
      });
    }

    const token = tokenResult.rows[0];

    // Get investor count and list
    const investorsResult = await db.query(`
      SELECT 
        inv.user_id,
        inv.amount_invested_eth,
        inv.tokens_received,
        inv.created_at,
        u.wallet_address,
        u.display_name
      FROM investments inv
      JOIN users u ON inv.user_id = u.id
      WHERE inv.token_id = $1
      ORDER BY inv.tokens_received DESC
    `, [token.id]);

    // Get recent activity
    const activityResult = await db.query(`
      SELECT 
        'investment' as type,
        u.wallet_address as user,
        inv.tokens_received as amount,
        inv.created_at as timestamp,
        inv.tx_hash
      FROM investments inv
      JOIN users u ON inv.user_id = u.id
      WHERE inv.token_id = $1
      ORDER BY inv.created_at DESC
      LIMIT 20
    `, [token.id]);

    // Calculate stats
    const totalSupply = 1000000; // Fixed supply
    const myBalance = totalSupply * 0.3; // 30% allocation
    const currentPrice = 0.0024; // Mock price - replace with actual
    const marketCap = totalSupply * currentPrice;
    const myShareValue = myBalance * currentPrice;

    res.json({
      hasToken: true,
      token: {
        address: token.contract_address,
        name: token.name,
        symbol: token.symbol,
        totalSupply,
        myBalance,
        currentPrice,
        marketCap,
        myShareValue,
        holders: investorsResult.rows.length,
        volume24h: 89234, // Mock - replace with actual
        priceChange24h: 12.4, // Mock - replace with actual
        liquidityLocked: true,
        launchedAt: token.created_at
      },
      investors: investorsResult.rows.map(inv => ({
        address: inv.wallet_address,
        displayName: inv.display_name,
        amount: inv.tokens_received,
        value: inv.tokens_received * currentPrice,
        joinDate: inv.created_at,
        ethInvested: inv.amount_invested_eth
      })),
      recentActivity: activityResult.rows,
      stats: {
        totalInvestors: investorsResult.rows.length,
        totalEthRaised: investorsResult.rows.reduce((sum, inv) => sum + parseFloat(inv.amount_invested_eth || 0), 0),
        averageInvestment: investorsResult.rows.length > 0 
          ? investorsResult.rows.reduce((sum, inv) => sum + parseFloat(inv.amount_invested_eth || 0), 0) / investorsResult.rows.length
          : 0
      }
    });

  } catch (error) {
    console.error('Error fetching influencer stats:', error);
    res.status(500).json({ error: 'Failed to fetch influencer statistics' });
  }
});

// GET /api/dashboard/influencer/pledgers
router.get('/influencer/pledgers', requireAuth, requireStatus('influencer'), async (req, res) => {
  try {
    const influencerAddress = req.dbUser.wallet_address;
    
    const result = await db.query(`
      SELECT 
        p.*,
        u.display_name,
        u.email
      FROM pledges p
      LEFT JOIN users u ON p.user_address = u.wallet_address
      WHERE p.influencer_address = $1
      ORDER BY p.created_at DESC
    `, [influencerAddress]);

    res.json({
      pledgers: result.rows.map(p => ({
        address: p.user_address,
        displayName: p.display_name,
        ethAmount: p.eth_amount,
        usdcAmount: p.usdc_amount,
        pledgeDate: p.created_at,
        hasWithdrawn: p.has_withdrawn
      })),
      totals: {
        totalPledgers: result.rows.length,
        totalEth: result.rows.reduce((sum, p) => sum + parseFloat(p.eth_amount || 0), 0),
        totalUsdc: result.rows.reduce((sum, p) => sum + parseFloat(p.usdc_amount || 0), 0)
      }
    });

  } catch (error) {
    console.error('Error fetching pledgers:', error);
    res.status(500).json({ error: 'Failed to fetch pledgers' });
  }
});

// POST /api/dashboard/influencer/gift-tokens
router.post('/influencer/gift-tokens', requireAuth, requireStatus('influencer'), async (req, res) => {
  try {
    const { recipient, amount, message } = req.body;
    
    // Validate inputs
    if (!recipient || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid gift parameters' });
    }

    // TODO: Implement actual token transfer on blockchain
    // For now, just log the gift
    await db.query(`
      INSERT INTO token_gifts (
        from_address, 
        to_address, 
        amount, 
        message, 
        created_at
      )
      VALUES ($1, $2, $3, $4, NOW())
    `, [req.dbUser.wallet_address, recipient, amount, message]);

    res.json({
      success: true,
      message: 'Tokens gifted successfully',
      txHash: '0x' + Math.random().toString(16).substring(2) // Mock tx hash
    });

  } catch (error) {
    console.error('Error gifting tokens:', error);
    res.status(500).json({ error: 'Failed to gift tokens' });
  }
});

// ======================
// INVESTOR ROUTES
// ======================

// GET /api/dashboard/investor/portfolio
router.get('/investor/portfolio', requireAuth, requireStatus('investor'), async (req, res) => {
  try {
    const userId = req.dbUser.id;
    
    const result = await db.query(`
      SELECT 
        inv.*,
        t.name as token_name,
        t.symbol,
        t.contract_address,
        i.name as influencer_name,
        i.avatar_url
      FROM investments inv
      JOIN tokens t ON inv.token_id = t.id
      JOIN influencers i ON t.influencer_id = i.id
      WHERE inv.user_id = $1
      ORDER BY inv.created_at DESC
    `, [userId]);

    const holdings = result.rows.map(h => {
      const currentPrice = 0.0024; // Mock - replace with actual
      const currentValue = h.tokens_received * currentPrice;
      const costBasis = parseFloat(h.amount_invested_eth) * 2000; // Mock ETH price
      const pnl = currentValue - costBasis;
      const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

      return {
        tokenAddress: h.contract_address,
        tokenSymbol: h.symbol,
        influencerName: h.influencer_name,
        avatar: h.avatar_url,
        amount: h.tokens_received,
        value: currentValue,
        costBasis,
        pnl,
        pnlPercent,
        purchaseDate: h.created_at,
        txHash: h.tx_hash
      };
    });

    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);
    const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
    const totalPnL = totalValue - totalCost;

    res.json({
      holdings,
      summary: {
        totalValue,
        totalCost,
        totalPnL,
        totalPnLPercent: totalCost > 0 ? (totalPnL / totalCost) * 100 : 0,
        holdingsCount: holdings.length
      }
    });

  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// GET /api/dashboard/investor/pledges
router.get('/investor/pledges', requireAuth, requireStatus('investor'), async (req, res) => {
  try {
    const userAddress = req.dbUser.wallet_address;
    
    const result = await db.query(`
      SELECT 
        p.*,
        i.name as influencer_name,
        i.handle,
        i.avatar_url,
        i.status,
        i.is_approved,
        i.launched_at
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1
      ORDER BY p.created_at DESC
    `, [userAddress]);

    res.json({
      pledges: result.rows.map(p => ({
        influencerName: p.influencer_name,
        influencerHandle: p.handle,
        influencerAddress: p.influencer_address,
        avatar: p.avatar_url,
        ethAmount: p.eth_amount,
        usdcAmount: p.usdc_amount,
        pledgeDate: p.created_at,
        status: p.launched_at ? 'launched' : p.is_approved ? 'approved' : 'pending',
        hasWithdrawn: p.has_withdrawn,
        tokenAddress: p.token_address
      }))
    });

  } catch (error) {
    console.error('Error fetching pledges:', error);
    res.status(500).json({ error: 'Failed to fetch pledges' });
  }
});

// ======================
// ADMIN ROUTES
// ======================

// GET /api/dashboard/admin/stats
router.get('/admin/stats', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    // Get various platform statistics
    const [
      users,
      influencers,
      tokens,
      investments,
      pledges,
      activeUsers
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM influencers'),
      db.query('SELECT COUNT(*) as count FROM tokens'),
      db.query('SELECT COUNT(*) as count, SUM(amount_invested_eth) as total FROM investments'),
      db.query('SELECT COUNT(*) as count FROM pledges WHERE has_withdrawn = false'),
      db.query('SELECT COUNT(DISTINCT user_id) as count FROM investments WHERE created_at > NOW() - INTERVAL \'24 hours\'')
    ]);

    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalInfluencers: parseInt(influencers.rows[0].count),
      totalTokens: parseInt(tokens.rows[0].count),
      totalVolume: parseFloat(investments.rows[0].total || 0) * 2000, // Mock ETH price
      totalFees: parseFloat(investments.rows[0].total || 0) * 0.025 * 2000, // 2.5% fee
      pendingApprovals: parseInt(pledges.rows[0].count),
      activeUsers24h: parseInt(activeUsers.rows[0].count),
      newUsersToday: Math.floor(Math.random() * 50) // Mock - implement actual query
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/dashboard/admin/pending-approvals
router.get('/admin/pending-approvals', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
    const result = await db.query(`
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
        AND i.total_pledged_eth >= i.pledge_threshold_eth
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `);

    res.json(result.rows.map(r => ({
      id: r.id,
      type: 'token',
      name: r.name,
      details: `${r.handle} - ${r.pledger_count} pledgers, ${r.total_pledged_eth} ETH raised`,
      requestedAt: r.created_at,
      requestedBy: r.wallet_address
    })));

  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// POST /api/dashboard/admin/approve/:id
router.post('/admin/approve/:id', requireAuth, requireStatus('admin'), async (req, res) => {
  try {
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
      
      // TODO: Trigger token creation process
    } else {
      await db.query(`
        UPDATE influencers 
        SET status = 'rejected'
        WHERE id = $1
      `, [id]);
    }

    res.json({
      success: true,
      message: approved ? 'Approved successfully' : 'Rejected successfully'
    });

  } catch (error) {
    console.error('Error processing approval:', error);
    res.status(500).json({ error: 'Failed to process approval' });
  }
});

module.exports = router;