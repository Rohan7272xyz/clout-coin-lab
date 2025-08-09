// Backend/routes/platformRoutes.js - Real platform statistics from database
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/platform/stats - Comprehensive platform statistics
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 Fetching real platform statistics from database...');

    // Execute all queries concurrently for better performance
    const queries = await Promise.all([
      // User metrics
      db.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_today,
          COUNT(CASE WHEN status = 'investor' THEN 1 END) as investor_count,
          COUNT(CASE WHEN status = 'influencer' THEN 1 END) as influencer_count,
          COUNT(CASE WHEN status = 'admin' THEN 1 END) as admin_count
        FROM users
      `),
      
      // Influencer metrics
      db.query(`
        SELECT 
          COUNT(*) as total_influencers,
          COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_influencers,
          COUNT(CASE WHEN status = 'pledging' AND is_approved = false 
                     AND (
                       (pledge_threshold_eth > 0 AND COALESCE(total_pledged_eth, 0) >= pledge_threshold_eth)
                       OR 
                       (pledge_threshold_usdc > 0 AND COALESCE(total_pledged_usdc, 0) >= pledge_threshold_usdc)
                     ) THEN 1 END) as pending_approvals,
          COUNT(CASE WHEN launched_at IS NOT NULL THEN 1 END) as live_tokens,
          COUNT(CASE WHEN status = 'pledging' THEN 1 END) as pledging_influencers
        FROM influencers
      `),
      
      // Financial metrics from pledges
      db.query(`
        SELECT 
          COUNT(*) as total_pledges,
          COALESCE(SUM(eth_amount), 0) as total_eth_pledged,
          COALESCE(SUM(usdc_amount), 0) as total_usdc_pledged,
          COUNT(DISTINCT user_address) as unique_pledgers,
          COALESCE(AVG(CASE WHEN eth_amount > 0 THEN eth_amount ELSE usdc_amount END), 0) as avg_investment,
          COUNT(CASE WHEN has_withdrawn = false THEN 1 END) as active_pledges,
          COUNT(CASE WHEN has_withdrawn = true THEN 1 END) as withdrawn_pledges
        FROM pledges
      `),
      
      // Transaction metrics (if you have a transactions table)
      db.query(`
        SELECT 
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as transactions_24h
        FROM pledge_events
      `).catch(() => ({ rows: [{ total_transactions: 0, transactions_24h: 0 }] })),
      
      // Active users (users who have pledged in last 24h)
      db.query(`
        SELECT COUNT(DISTINCT user_address) as active_users_24h
        FROM pledges 
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `),
      
      // Volume calculation (approximate USD value)
      db.query(`
        SELECT 
          COALESCE(SUM(eth_amount * 2000), 0) + COALESCE(SUM(usdc_amount), 0) as total_volume_usd
        FROM pledges 
        WHERE has_withdrawn = false
      `)
    ]);

    const [userMetrics, influencerMetrics, pledgeMetrics, transactionMetrics, activeUsers, volumeMetrics] = queries;

    const userStats = userMetrics.rows[0];
    const influencerStats = influencerMetrics.rows[0];
    const pledgeStats = pledgeMetrics.rows[0];
    const transactionStats = transactionMetrics.rows[0];
    const activeUserStats = activeUsers.rows[0];
    const volumeStats = volumeMetrics.rows[0];

    // Calculate derived metrics
    const totalVolume = parseFloat(volumeStats.total_volume_usd || 0);
    const totalFees = totalVolume * 0.05; // 5% platform fee

    const platformStats = {
      // User metrics
      totalUsers: parseInt(userStats.total_users),
      newUsersToday: parseInt(userStats.new_users_today),
      activeUsers24h: parseInt(activeUserStats.active_users_24h || 0),
      userStatusBreakdown: {
        investors: parseInt(userStats.investor_count),
        influencers: parseInt(userStats.influencer_count),
        admins: parseInt(userStats.admin_count)
      },
      
      // Influencer metrics
      totalInfluencers: parseInt(influencerStats.total_influencers),
      approvedInfluencers: parseInt(influencerStats.approved_influencers),
      pendingApprovals: parseInt(influencerStats.pending_approvals),
      liveTokens: parseInt(influencerStats.live_tokens),
      pledgingInfluencers: parseInt(influencerStats.pledging_influencers),
      
      // Financial metrics
      totalVolume: totalVolume,
      totalFees: totalFees,
      totalEthPledged: parseFloat(pledgeStats.total_eth_pledged || 0),
      totalUsdcPledged: parseFloat(pledgeStats.total_usdc_pledged || 0),
      totalPledgers: parseInt(pledgeStats.unique_pledgers || 0),
      averageInvestment: parseFloat(pledgeStats.avg_investment || 0),
      
      // Platform health
      totalTransactions: parseInt(transactionStats.total_transactions || 0),
      transactions24h: parseInt(transactionStats.transactions_24h || 0),
      activePledges: parseInt(pledgeStats.active_pledges || 0),
      withdrawnPledges: parseInt(pledgeStats.withdrawn_pledges || 0),
      
      // Additional metrics
      successRate: parseFloat(pledgeStats.total_pledges) > 0 ? 
        ((parseFloat(pledgeStats.active_pledges) / parseFloat(pledgeStats.total_pledges)) * 100).toFixed(2) : '0',
      
      // Timestamp for cache management
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ Platform statistics loaded from database:', {
      users: platformStats.totalUsers,
      influencers: platformStats.totalInfluencers,
      volume: `$${platformStats.totalVolume.toFixed(2)}`,
      pledgers: platformStats.totalPledgers
    });

    res.json(platformStats);

  } catch (error) {
    console.error('❌ Error fetching platform statistics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch platform statistics',
      details: error.message 
    });
  }
});

// GET /api/platform/metrics/realtime - Real-time platform metrics
router.get('/metrics/realtime', async (req, res) => {
  try {
    const realtimeQueries = await Promise.all([
      // Recent activity (last hour)
      db.query(`
        SELECT COUNT(*) as recent_pledges
        FROM pledges 
        WHERE created_at > NOW() - INTERVAL '1 hour'
      `),
      
      // Top performing influencers today
      db.query(`
        SELECT 
          i.name,
          i.handle,
          COUNT(p.id) as pledges_today,
          COALESCE(SUM(p.eth_amount), 0) as eth_today
        FROM influencers i
        LEFT JOIN pledges p ON i.wallet_address = p.influencer_address 
          AND p.created_at > NOW() - INTERVAL '24 hours'
        GROUP BY i.id, i.name, i.handle
        HAVING COUNT(p.id) > 0
        ORDER BY pledges_today DESC
        LIMIT 5
      `),
      
      // System health
      db.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN created_at > NOW() - INTERVAL '5 minutes' THEN 1 END) as recent_events
        FROM pledge_events
      `).catch(() => ({ rows: [{ total_events: 0, recent_events: 0 }] }))
    ]);

    const [recentActivity, topInfluencers, systemHealth] = realtimeQueries;

    res.json({
      recentPledges: parseInt(recentActivity.rows[0].recent_pledges || 0),
      topInfluencersToday: topInfluencers.rows,
      systemHealth: {
        totalEvents: parseInt(systemHealth.rows[0].total_events || 0),
        recentEvents: parseInt(systemHealth.rows[0].recent_events || 0),
        isHealthy: parseInt(systemHealth.rows[0].recent_events || 0) >= 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching real-time metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch real-time metrics',
      details: error.message 
    });
  }
});

// GET /api/user/portfolio - User portfolio with real data
router.get('/user/portfolio', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user from token (you'll need to implement this)
    const userAddress = req.user?.wallet_address; // From your auth middleware
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User wallet address not found' });
    }

    // Get user's pledges (representing their portfolio)
    const portfolioQuery = await db.query(`
      SELECT 
        p.id,
        p.eth_amount,
        p.usdc_amount,
        p.created_at as purchase_date,
        p.has_withdrawn,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url as influencer_avatar,
        i.token_symbol,
        i.token_address,
        i.current_price,
        i.launched_at,
        i.status as influencer_status
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1
      ORDER BY p.created_at DESC
    `, [userAddress]);

    // Calculate portfolio metrics
    let totalInvested = 0;
    let currentValue = 0;
    const holdings = [];

    for (const row of portfolioQuery.rows) {
      const ethAmount = parseFloat(row.eth_amount || 0);
      const usdcAmount = parseFloat(row.usdc_amount || 0);
      const invested = ethAmount * 2000 + usdcAmount; // Approximate USD value
      
      totalInvested += invested;

      // Calculate current value (if launched, use current price; if not, use invested amount)
      let value = invested;
      if (row.launched_at && row.current_price) {
        // If token is launched, calculate based on current price
        const tokenAmount = invested / 2000; // Approximate token amount
        value = tokenAmount * parseFloat(row.current_price) * 2000;
      }
      
      currentValue += value;

      holdings.push({
        tokenAddress: row.token_address || 'pending',
        tokenSymbol: row.token_symbol || 'PENDING',
        influencerName: row.influencer_name,
        influencerAvatar: row.influencer_avatar,
        amount: ethAmount || usdcAmount,
        value: value,
        costBasis: invested,
        pnl: value - invested,
        pnlPercent: invested > 0 ? ((value - invested) / invested) * 100 : 0,
        purchaseDate: row.purchase_date,
        isLaunched: !!row.launched_at,
        hasWithdrawn: row.has_withdrawn
      });
    }

    const totalPnL = currentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    const portfolio = {
      totalInvested,
      currentValue,
      totalPnL,
      totalPnLPercent,
      activePositions: holdings.filter(h => !h.hasWithdrawn).length,
      withdrawnPositions: holdings.filter(h => h.hasWithdrawn).length,
      holdings: holdings.filter(h => !h.hasWithdrawn) // Only show active holdings
    };

    res.json(portfolio);

  } catch (error) {
    console.error('❌ Error fetching user portfolio:', error);
    res.status(500).json({ 
      error: 'Failed to fetch portfolio',
      details: error.message 
    });
  }
});

// GET /api/user/pledges - User pledges with real data
router.get('/user/pledges', async (req, res) => {
  try {
    const userAddress = req.user?.wallet_address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User wallet address not found' });
    }

    const pledgesQuery = await db.query(`
      SELECT 
        p.*,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url as influencer_avatar,
        i.status as influencer_status,
        i.is_approved,
        i.launched_at,
        i.pledge_threshold_eth,
        i.pledge_threshold_usdc,
        i.total_pledged_eth,
        i.total_pledged_usdc,
        CASE 
          WHEN (i.pledge_threshold_eth > 0 AND COALESCE(i.total_pledged_eth, 0) >= i.pledge_threshold_eth) OR
               (i.pledge_threshold_usdc > 0 AND COALESCE(i.total_pledged_usdc, 0) >= i.pledge_threshold_usdc)
          THEN true 
          ELSE false 
        END as threshold_met
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1
      ORDER BY p.created_at DESC
    `, [userAddress]);

    const totalPledges = pledgesQuery.rows.length;
    const totalEthPledged = pledgesQuery.rows.reduce((sum, row) => sum + parseFloat(row.eth_amount || 0), 0);
    const totalUsdcPledged = pledgesQuery.rows.reduce((sum, row) => sum + parseFloat(row.usdc_amount || 0), 0);
    const activePledges = pledgesQuery.rows.filter(row => !row.has_withdrawn).length;
    const withdrawnPledges = pledgesQuery.rows.filter(row => row.has_withdrawn).length;

    const pledges = pledgesQuery.rows.map(row => ({
      id: row.id,
      influencerAddress: row.influencer_address,
      influencerName: row.influencer_name,
      influencerHandle: row.influencer_handle,
      influencerAvatar: row.influencer_avatar,
      ethAmount: parseFloat(row.eth_amount || 0),
      usdcAmount: parseFloat(row.usdc_amount || 0),
      pledgeDate: row.created_at,
      status: row.influencer_status,
      isWithdrawn: row.has_withdrawn,
      thresholdMet: row.threshold_met,
      isApproved: row.is_approved,
      isLaunched: !!row.launched_at
    }));

    res.json({
      totalPledges,
      totalEthPledged,
      totalUsdcPledged,
      activePledges,
      withdrawnPledges,
      pledges
    });

  } catch (error) {
    console.error('❌ Error fetching user pledges:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pledges',
      details: error.message 
    });
  }
});

module.exports = router;