// Backend/routes/pledgeRoutes.js - Enhanced with proper database integration
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const db = require('../database/db');

// Contract configuration
const PLEDGE_MANAGER_ADDRESS = process.env.PLEDGE_MANAGER_ADDRESS || "0x2B7B6c9c470cD1808447987BBc0aF952f8B4d7d8";

const PLEDGE_MANAGER_ABI = [
  "function pledgeToInfluencer(address influencer) external payable",
  "function pledgeUSDCToInfluencer(address influencer, uint256 amount) external",
  "function withdrawPledge(address influencer) external",
  "function setInfluencerThreshold(address influencer, uint256 ethThreshold, uint256 usdcThreshold, string memory name, string memory symbol, string memory influencerName) external",
  "function approveInfluencer(address influencer) external",
  "function launchToken(address influencer) external",
  "function getInfluencerPledge(address influencer) external view returns (tuple(uint256 totalPledgedETH, uint256 totalPledgedUSDC, uint256 pledgeThresholdETH, uint256 pledgeThresholdUSDC, bool isApproved, bool isLaunched, address tokenAddress, string name, string symbol, string influencerName, uint256 createdAt, uint256 launchedAt))",
  "function getUserPledge(address influencer, address user) external view returns (tuple(uint256 ethAmount, uint256 usdcAmount, bool hasWithdrawn, uint256 pledgedAt))",
  "function getPledgeProgress(address influencer) external view returns (uint256 totalETH, uint256 totalUSDC, uint256 thresholdETH, uint256 thresholdUSDC, uint256 pledgerCount, bool thresholdMet, bool isApproved, bool isLaunched)",
  "function getAllInfluencers() external view returns (address[] memory)",
  "function isThresholdMet(address influencer) external view returns (bool)"
];

// Initialize blockchain connection
let provider = null;
let adminWallet = null;
let pledgeContract = null;
let adminPledgeContract = null;
let blockchainEnabled = false;

if (process.env.BASE_SEPOLIA_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY && PLEDGE_MANAGER_ADDRESS) {
  try {
    provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    adminWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    pledgeContract = new ethers.Contract(PLEDGE_MANAGER_ADDRESS, PLEDGE_MANAGER_ABI, provider);
    adminPledgeContract = pledgeContract.connect(adminWallet);
    blockchainEnabled = true;
    console.log('✅ Blockchain features enabled for pledge routes');
  } catch (error) {
    console.warn('⚠️ Blockchain features disabled:', error.message);
  }
}

// Helper function to record pledge in database
async function recordPledgeInDatabase(pledgeData) {
  const {
    userAddress,
    influencerAddress,
    ethAmount = '0',
    usdcAmount = '0',
    txHash,
    blockNumber
  } = pledgeData;

  try {
    // Insert or update pledge
    const result = await db.query(`
      INSERT INTO pledges (
        user_address, 
        influencer_address, 
        eth_amount, 
        usdc_amount, 
        tx_hash, 
        block_number
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_address, influencer_address) 
      DO UPDATE SET 
        eth_amount = pledges.eth_amount + EXCLUDED.eth_amount,
        usdc_amount = pledges.usdc_amount + EXCLUDED.usdc_amount,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [userAddress, influencerAddress, ethAmount, usdcAmount, txHash, blockNumber]);

    // Record event
    await db.query(`
      INSERT INTO pledge_events (
        event_type, 
        influencer_address, 
        user_address, 
        eth_amount, 
        usdc_amount, 
        tx_hash, 
        block_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ['pledge_made', influencerAddress, userAddress, ethAmount, usdcAmount, txHash, blockNumber]);

    return result.rows[0];
  } catch (error) {
    console.error('Error recording pledge in database:', error);
    throw error;
  }
}

// Helper function to sync influencer data from contract to database
async function syncInfluencerToDatabase(influencerAddress) {
  if (!blockchainEnabled) return null;

  try {
    const pledgeData = await pledgeContract.getInfluencerPledge(influencerAddress);
    const progress = await pledgeContract.getPledgeProgress(influencerAddress);

    // Update or insert influencer data
    const result = await db.query(`
      INSERT INTO influencers (
        name, 
        handle, 
        email, 
        wallet_address, 
        category, 
        description, 
        verified, 
        status,
        pledge_threshold_eth,
        pledge_threshold_usdc,
        total_pledged_eth,
        total_pledged_usdc,
        pledge_count,
        is_approved
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        pledge_threshold_eth = EXCLUDED.pledge_threshold_eth,
        pledge_threshold_usdc = EXCLUDED.pledge_threshold_usdc,
        total_pledged_eth = EXCLUDED.total_pledged_eth,
        total_pledged_usdc = EXCLUDED.total_pledged_usdc,
        pledge_count = EXCLUDED.pledge_count,
        is_approved = EXCLUDED.is_approved,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      pledgeData.influencerName || 'Unknown',
      `@${pledgeData.symbol.toLowerCase()}`,
      `${pledgeData.symbol.toLowerCase()}@placeholder.com`,
      influencerAddress,
      'Influencer',
      `Pledging for ${pledgeData.name} token`,
      false,
      progress.isLaunched ? 'live' : 'pledging',
      ethers.utils.formatEther(progress.thresholdETH),
      ethers.utils.formatUnits(progress.thresholdUSDC, 6),
      ethers.utils.formatEther(progress.totalETH),
      ethers.utils.formatUnits(progress.totalUSDC, 6),
      progress.pledgerCount.toNumber(),
      progress.isApproved
    ]);

    return result.rows[0];
  } catch (error) {
    console.error('Error syncing influencer to database:', error);
    return null;
  }
}

// POST /api/pledge/submit - Submit a new pledge (Frontend calls this)
router.post('/submit', async (req, res) => {
  try {
    const {
      userAddress,
      influencerAddress,
      amount,
      currency, // 'ETH' or 'USDC'
      txHash,
      blockNumber
    } = req.body;

    // Validation
    if (!userAddress || !influencerAddress || !amount || !currency || !txHash) {
      return res.status(400).json({ 
        error: 'Missing required fields: userAddress, influencerAddress, amount, currency, txHash' 
      });
    }

    if (!ethers.utils.isAddress(userAddress) || !ethers.utils.isAddress(influencerAddress)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    // Prepare pledge data for database
    const pledgeData = {
      userAddress,
      influencerAddress,
      ethAmount: currency === 'ETH' ? amount : '0',
      usdcAmount: currency === 'USDC' ? amount : '0',
      txHash,
      blockNumber
    };

    // Record in database
    const pledge = await recordPledgeInDatabase(pledgeData);

    // Sync influencer data from contract (if blockchain enabled)
    if (blockchainEnabled) {
      await syncInfluencerToDatabase(influencerAddress);
    }

    res.json({
      success: true,
      message: 'Pledge recorded successfully',
      pledge: {
        id: pledge.id,
        userAddress: pledge.user_address,
        influencerAddress: pledge.influencer_address,
        ethAmount: pledge.eth_amount,
        usdcAmount: pledge.usdc_amount,
        txHash: pledge.tx_hash,
        createdAt: pledge.created_at
      }
    });
  } catch (error) {
    console.error('Error submitting pledge:', error);
    res.status(500).json({ 
      error: 'Failed to record pledge',
      details: error.message 
    });
  }
});

// POST /api/pledge/mock - Mock pledge submission for testing (when blockchain disabled)
router.post('/mock', async (req, res) => {
  try {
    const {
      userAddress,
      influencerAddress,
      amount,
      currency // 'ETH' or 'USDC'
    } = req.body;

    // Validation
    if (!userAddress || !influencerAddress || !amount || !currency) {
      return res.status(400).json({ 
        error: 'Missing required fields: userAddress, influencerAddress, amount, currency' 
      });
    }

    // Generate mock transaction hash
    const mockTxHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(`${userAddress}-${influencerAddress}-${amount}-${Date.now()}`)
    );

    // Record in database
    const pledgeData = {
      userAddress,
      influencerAddress,
      ethAmount: currency === 'ETH' ? amount : '0',
      usdcAmount: currency === 'USDC' ? amount : '0',
      txHash: mockTxHash,
      blockNumber: Math.floor(Math.random() * 1000000)
    };

    const pledge = await recordPledgeInDatabase(pledgeData);

    // Also ensure influencer exists in database
    await db.query(`
      INSERT INTO influencers (
        name, handle, email, wallet_address, category, description, verified, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (wallet_address) DO NOTHING
    `, [
      'Test Influencer',
      '@testinfluencer',
      'test@example.com',
      influencerAddress,
      'Test',
      'Test influencer for development',
      false,
      'pledging'
    ]);

    res.json({
      success: true,
      message: 'Mock pledge recorded successfully',
      pledge: {
        id: pledge.id,
        userAddress: pledge.user_address,
        influencerAddress: pledge.influencer_address,
        ethAmount: pledge.eth_amount,
        usdcAmount: pledge.usdc_amount,
        txHash: pledge.tx_hash,
        createdAt: pledge.created_at,
        mock: true
      }
    });
  } catch (error) {
    console.error('Error recording mock pledge:', error);
    res.status(500).json({ 
      error: 'Failed to record mock pledge',
      details: error.message 
    });
  }
});

// GET /api/pledge/user/:userAddress - Get user's pledges with full details
router.get('/user/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;

    if (!ethers.utils.isAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid user address' });
    }

    // Get pledges from database with influencer info
    const result = await db.query(`
      SELECT 
        p.*,
        i.name as influencer_name,
        i.handle as influencer_handle,
        i.avatar_url,
        i.category,
        i.description,
        i.verified,
        i.status,
        i.is_approved,
        i.launched_at
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
      influencerHandle: row.influencer_handle,
      avatar: row.avatar_url,
      category: row.category,
      description: row.description,
      verified: row.verified || false,
      ethAmount: row.eth_amount,
      usdcAmount: row.usdc_amount,
      hasWithdrawn: row.has_withdrawn,
      pledgedAt: row.created_at,
      isApproved: row.is_approved || false,
      isLaunched: !!row.launched_at,
      txHash: row.tx_hash
    }));

    res.json(pledges);
  } catch (error) {
    console.error('Error fetching user pledges:', error);
    res.status(500).json({ error: 'Failed to fetch pledges' });
  }
});

// GET /api/pledge/influencer/:address - Get influencer pledge data with database sync
router.get('/influencer/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    // First try to get from database
    let dbResult = await db.query(
      'SELECT * FROM pledge_summary WHERE wallet_address = $1',
      [address]
    );

    let influencerData = null;
    if (dbResult.rows.length > 0) {
      influencerData = dbResult.rows[0];
    }

    // If blockchain is enabled, sync latest data
    if (blockchainEnabled) {
      try {
        await syncInfluencerToDatabase(address);
        // Re-fetch after sync
        dbResult = await db.query(
          'SELECT * FROM pledge_summary WHERE wallet_address = $1',
          [address]
        );
        if (dbResult.rows.length > 0) {
          influencerData = dbResult.rows[0];
        }
      } catch (syncError) {
        console.warn('Failed to sync from blockchain:', syncError.message);
      }
    }

    if (!influencerData) {
      return res.status(404).json({ error: 'Influencer not found' });
    }

    // Format response
    res.json({
      address: influencerData.wallet_address,
      name: influencerData.name,
      tokenName: `${influencerData.name} Token`,
      symbol: influencerData.handle?.replace('@', '').toUpperCase() || 'TKN',
      totalPledgedETH: influencerData.total_pledged_eth || '0',
      totalPledgedUSDC: influencerData.total_pledged_usdc || '0',
      thresholdETH: influencerData.pledge_threshold_eth || '0',
      thresholdUSDC: influencerData.pledge_threshold_usdc || '0',
      pledgerCount: influencerData.pledge_count || 0,
      thresholdMet: influencerData.threshold_met || false,
      isApproved: influencerData.is_approved || false,
      isLaunched: !!influencerData.launched_at,
      createdAt: new Date(influencerData.created_at).getTime(),
      launchedAt: influencerData.launched_at ? new Date(influencerData.launched_at).getTime() : 0,
      avatar: influencerData.avatar_url,
      followers: influencerData.followers_count,
      category: influencerData.category,
      description: influencerData.description,
      verified: influencerData.verified || false
    });
  } catch (error) {
    console.error('Error fetching influencer data:', error);
    res.status(500).json({ error: 'Failed to fetch influencer data' });
  }
});

// GET /api/pledge/sync-all - Sync all contract data to database (admin endpoint)
router.get('/sync-all', async (req, res) => {
  if (!blockchainEnabled) {
    return res.status(503).json({ error: 'Blockchain features not enabled' });
  }

  try {
    const influencerAddresses = await pledgeContract.getAllInfluencers();
    const synced = [];
    const failed = [];

    for (const address of influencerAddresses) {
      try {
        const result = await syncInfluencerToDatabase(address);
        synced.push({ address, success: !!result });
      } catch (error) {
        failed.push({ address, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Sync completed',
      synced: synced.length,
      failed: failed.length,
      details: { synced, failed }
    });
  } catch (error) {
    console.error('Error syncing all data:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Keep existing routes...
// (All your existing routes from the original file)

module.exports = router;