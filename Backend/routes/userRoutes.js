// Backend/routes/userRoutes.js - Real user data endpoints
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
    }
    
    next();
  } catch (err) {
    console.error('Authentication failed:', err);
    return res.status(403).json({ error: 'Unauthorized' });
  }
};

// GET /api/user/portfolio - Real portfolio data from database
router.get('/portfolio', requireAuth, async (req, res) => {
  try {
    const userAddress = req.dbUser?.wallet_address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User wallet address not found' });
    }

    console.log('📊 Fetching portfolio for user:', userAddress);

    // Get user's pledges and calculate portfolio
    const portfolioQuery = await db.query(`
      SELECT 
        p.id,
        p.eth_amount,
        p.usdc_amount,
        p.created_at as purchase_date,
        p.has_withdrawn,
        p.tx_hash,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url as influencer_avatar,
        i.token_symbol,
        i.token_address,
        i.current_price,
        i.launched_at,
        i.status as influencer_status,
        i.market_cap,
        i.volume_24h
      FROM pledges p
      JOIN influencers i ON p.influencer_address = i.wallet_address
      WHERE p.user_address = $1
      ORDER BY p.created_at DESC
    `, [userAddress]);

    // Calculate real portfolio metrics
    let totalInvested = 0;
    let currentValue = 0;
    const holdings = [];
    let activePositions = 0;
    let withdrawnPositions = 0;

    for (const row of portfolioQuery.rows) {
      const ethAmount = parseFloat(row.eth_amount || 0);
      const usdcAmount = parseFloat(row.usdc_amount || 0);
      
      // Calculate invested amount in USD equivalent
      const ethToUsd = 2000; // Could make this dynamic from a price API
      const invested = (ethAmount * ethToUsd) + usdcAmount;
      
      if (!row.has_withdrawn) {
        totalInvested += invested;
        activePositions++;
      } else {
        withdrawnPositions++;
      }

      // Calculate current value
      let value = invested; // Default to invested amount
      
      if (row.launched_at && row.current_price) {
        // If token is launched, calculate based on current price
        // Assume 1 ETH invested = some amount of tokens based on launch price
        const estimatedTokens = ethAmount * 300000; // Rough estimate - could be more precise
        value = estimatedTokens * parseFloat(row.current_price || 0) * ethToUsd;
      } else if (row.influencer_status === 'approved' || row.influencer_status === 'live') {
        // If approved but not launched, add small premium
        value = invested * 1.1; // 10% premium for approved status
      }
      
      if (!row.has_withdrawn) {
        currentValue += value;
      }

      const pnl = value - invested;
      const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;

      holdings.push({
        tokenAddress: row.token_address || 'pending',
        tokenSymbol: row.token_symbol || 'PENDING',
        influencerName: row.influencer_name,
        influencerAvatar: row.influencer_avatar,
        amount: ethAmount || (usdcAmount / ethToUsd), // Normalize to ETH equivalent
        value: value,
        costBasis: invested,
        pnl: pnl,
        pnlPercent: pnlPercent,
        purchaseDate: row.purchase_date,
        isLaunched: !!row.launched_at,
        hasWithdrawn: row.has_withdrawn,
        txHash: row.tx_hash,
        status: row.influencer_status
      });
    }

    const totalPnL = currentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    const portfolio = {
      totalInvested: Math.round(totalInvested * 10000) / 10000, // Round to 4 decimals
      currentValue: Math.round(currentValue * 10000) / 10000,
      totalPnL: Math.round(totalPnL * 10000) / 10000,
      totalPnLPercent: Math.round(totalPnLPercent * 100) / 100,
      activePositions,
      withdrawnPositions,
      holdings: holdings.filter(h => !h.hasWithdrawn) // Only active holdings
    };

    console.log('✅ Portfolio calculated:', {
      invested: portfolio.totalInvested,
      value: portfolio.currentValue,
      pnl: portfolio.totalPnL,
      positions: portfolio.activePositions
    });

    res.json(portfolio);

  } catch (error) {
    console.error('❌ Error fetching user portfolio:', error);
    res.status(500).json({ 
      error: 'Failed to fetch portfolio',
      details: error.message 
    });
  }
});

// GET /api/user/pledges - Real pledge data from database
router.get('/pledges', requireAuth, async (req, res) => {
  try {
    const userAddress = req.dbUser?.wallet_address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User wallet address not found' });
    }

    console.log('📊 Fetching pledges for user:', userAddress);

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
        i.category,
        i.description,
        i.verified,
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

    // Calculate pledge metrics
    const totalPledges = pledgesQuery.rows.length;
    const totalEthPledged = pledgesQuery.rows.reduce((sum, row) => 
      sum + parseFloat(row.eth_amount || 0), 0
    );
    const totalUsdcPledged = pledgesQuery.rows.reduce((sum, row) => 
      sum + parseFloat(row.usdc_amount || 0), 0
    );
    const activePledges = pledgesQuery.rows.filter(row => !row.has_withdrawn).length;
    const withdrawnPledges = pledgesQuery.rows.filter(row => row.has_withdrawn).length;

    const pledges = pledgesQuery.rows.map(row => ({
      id: row.id,
      influencerAddress: row.influencer_address,
      influencerName: row.influencer_name,
      influencerHandle: row.influencer_handle,
      influencerAvatar: row.influencer_avatar,
      category: row.category,
      description: row.description,
      verified: row.verified,
      ethAmount: parseFloat(row.eth_amount || 0),
      usdcAmount: parseFloat(row.usdc_amount || 0),
      pledgeDate: row.created_at,
      status: row.influencer_status,
      isWithdrawn: row.has_withdrawn,
      withdrawnAt: row.withdrawn_at,
      thresholdMet: row.threshold_met,
      isApproved: row.is_approved,
      isLaunched: !!row.launched_at,
      txHash: row.tx_hash,
      
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

    const pledgeData = {
      totalPledges,
      totalEthPledged: Math.round(totalEthPledged * 10000) / 10000,
      totalUsdcPledged: Math.round(totalUsdcPledged * 100) / 100,
      activePledges,
      withdrawnPledges,
      pledges
    };

    console.log('✅ Pledges loaded:', {
      total: pledgeData.totalPledges,
      active: pledgeData.activePledges,
      eth: pledgeData.totalEthPledged,
      usdc: pledgeData.totalUsdcPledged
    });

    res.json(pledgeData);

  } catch (error) {
    console.error('❌ Error fetching user pledges:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pledges',
      details: error.message 
    });
  }
});

// GET /api/user/transactions - Real transaction history
router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const userAddress = req.dbUser?.wallet_address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User wallet address not found' });
    }

    console.log('📊 Fetching transactions for user:', userAddress);

    // Get transactions from pledge_events table
    const transactionsQuery = await db.query(`
      SELECT 
        pe.id,
        pe.event_type,
        pe.eth_amount,
        pe.usdc_amount,
        pe.tx_hash,
        pe.block_number,
        pe.created_at,
        pe.event_data,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url as influencer_avatar
      FROM pledge_events pe
      LEFT JOIN influencers i ON pe.influencer_address = i.wallet_address
      WHERE pe.user_address = $1
      ORDER BY pe.created_at DESC
      LIMIT 50
    `, [userAddress]);

    const transactions = transactionsQuery.rows.map(row => ({
      id: row.id,
      type: row.event_type,
      influencerName: row.influencer_name,
      influencerHandle: row.influencer_handle,
      influencerAvatar: row.influencer_avatar,
      ethAmount: parseFloat(row.eth_amount || 0),
      usdcAmount: parseFloat(row.usdc_amount || 0),
      txHash: row.tx_hash,
      blockNumber: row.block_number,
      timestamp: row.created_at,
      eventData: row.event_data
    }));

    console.log('✅ Transactions loaded:', transactions.length);

    res.json({
      transactions,
      total: transactions.length
    });

  } catch (error) {
    console.error('❌ Error fetching user transactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error.message 
    });
  }
});

// GET /api/user/stats - User-specific statistics
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userAddress = req.dbUser?.wallet_address;
    
    if (!userAddress) {
      return res.status(400).json({ error: 'User wallet address not found' });
    }

    console.log('📊 Fetching user stats for:', userAddress);

    const statsQueries = await Promise.all([
      // User's pledge summary
      db.query(`
        SELECT 
          COUNT(*) as total_pledges,
          SUM(CASE WHEN has_withdrawn = false THEN 1 ELSE 0 END) as active_pledges,
          COALESCE(SUM(eth_amount), 0) as total_eth_pledged,
          COALESCE(SUM(usdc_amount), 0) as total_usdc_pledged,
          MIN(created_at) as first_pledge_date,
          MAX(created_at) as last_pledge_date
        FROM pledges 
        WHERE user_address = $1
      `, [userAddress]),
      
      // User's successful investments (launched tokens)
      db.query(`
        SELECT COUNT(*) as successful_investments
        FROM pledges p
        JOIN influencers i ON p.influencer_address = i.wallet_address
        WHERE p.user_address = $1 AND i.launched_at IS NOT NULL
      `, [userAddress]),
      
      // User ranking (by total invested)
      db.query(`
        WITH user_totals AS (
          SELECT 
            user_address,
            SUM(eth_amount * 2000 + COALESCE(usdc_amount, 0)) as total_invested
          FROM pledges
          WHERE has_withdrawn = false
          GROUP BY user_address
        ),
        ranked_users AS (
          SELECT 
            user_address,
            total_invested,
            ROW_NUMBER() OVER (ORDER BY total_invested DESC) as rank
          FROM user_totals
        )
        SELECT rank, total_invested
        FROM ranked_users
        WHERE user_address = $1
      `, [userAddress])
    ]);

    const [pledgeStats, successStats, rankStats] = statsQueries;
    const pledgeData = pledgeStats.rows[0];
    const successData = successStats.rows[0];
    const rankData = rankStats.rows[0];

    const userStats = {
      // Pledge statistics
      totalPledges: parseInt(pledgeData.total_pledges),
      activePledges: parseInt(pledgeData.active_pledges),
      totalEthPledged: parseFloat(pledgeData.total_eth_pledged || 0),
      totalUsdcPledged: parseFloat(pledgeData.total_usdc_pledged || 0),
      firstPledgeDate: pledgeData.first_pledge_date,
      lastPledgeDate: pledgeData.last_pledge_date,
      
      // Success metrics
      successfulInvestments: parseInt(successData.successful_investments),
      successRate: parseInt(pledgeData.total_pledges) > 0 ? 
        (parseInt(successData.successful_investments) / parseInt(pledgeData.total_pledges)) * 100 : 0,
      
      // Platform ranking
      userRank: rankData ? parseInt(rankData.rank) : null,
      totalInvested: rankData ? parseFloat(rankData.total_invested) : 0,
      
      // Account info
      memberSince: req.dbUser.created_at,
      accountStatus: req.dbUser.status,
      
      // Calculated metrics
      averagePledgeSize: parseInt(pledgeData.total_pledges) > 0 ? 
        parseFloat(pledgeData.total_eth_pledged || 0) / parseInt(pledgeData.total_pledges) : 0
    };

    console.log('✅ User stats calculated:', userStats);

    res.json(userStats);

  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user stats',
      details: error.message 
    });
  }
});

module.exports = router;