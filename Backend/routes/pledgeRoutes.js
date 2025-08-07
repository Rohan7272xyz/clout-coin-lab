// Backend/routes/pledgeRoutes.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const db = require('../database/db');

// Contract configuration - Make sure we have a valid address
const PLEDGE_MANAGER_ADDRESS = process.env.PLEDGE_MANAGER_ADDRESS || "0x2B7B6c9c470cD1808447987BBc0aF952f8B4d7d8";

// Validate the address exists
if (!PLEDGE_MANAGER_ADDRESS) {
  console.error('❌ PLEDGE_MANAGER_ADDRESS is not defined');
  console.log('   Please add PLEDGE_MANAGER_ADDRESS to your .env file');
}
const PLEDGE_MANAGER_ABI = [
  // Add the ABI from the compiled contract here
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

// Initialize provider - check if blockchain features are enabled
let provider = null;
let adminWallet = null;
let pledgeContract = null;
let adminPledgeContract = null;
let blockchainEnabled = false;

// Check if blockchain configuration is available
if (process.env.BASE_SEPOLIA_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY && PLEDGE_MANAGER_ADDRESS) {
  try {
    console.log('🔧 Initializing blockchain connection...');
    console.log('   RPC URL:', process.env.BASE_SEPOLIA_RPC_URL);
    console.log('   Contract Address:', PLEDGE_MANAGER_ADDRESS);
    
    provider = new ethers.providers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC_URL);
    adminWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    pledgeContract = new ethers.Contract(PLEDGE_MANAGER_ADDRESS, PLEDGE_MANAGER_ABI, provider);
    adminPledgeContract = pledgeContract.connect(adminWallet);
    blockchainEnabled = true;
    console.log('✅ Blockchain features enabled for pledge routes');
  } catch (error) {
    console.warn('⚠️ Blockchain features disabled:', error.message);
    blockchainEnabled = false;
  }
} else {
  console.log('ℹ️ Blockchain features disabled - missing configuration');
  if (!process.env.BASE_SEPOLIA_RPC_URL) console.log('   Missing: BASE_SEPOLIA_RPC_URL');
  if (!process.env.DEPLOYER_PRIVATE_KEY) console.log('   Missing: DEPLOYER_PRIVATE_KEY');
  if (!PLEDGE_MANAGER_ADDRESS) console.log('   Missing: PLEDGE_MANAGER_ADDRESS');
  console.log('   Add these to your Backend/.env file to enable blockchain features');
}

// Middleware to check if blockchain is enabled
const requireBlockchain = (req, res, next) => {
  if (!blockchainEnabled) {
    return res.status(503).json({ 
      error: 'Blockchain features are not configured',
      message: 'Please set BASE_SEPOLIA_RPC_URL and DEPLOYER_PRIVATE_KEY in your .env file'
    });
  }
  next();
};

// GET /api/pledge/influencers - Get all influencers with pledge data (mock data if blockchain disabled)
router.get('/influencers', async (req, res) => {
  try {
    if (!blockchainEnabled) {
      // Return mock data when blockchain is disabled
      const mockInfluencers = [
        {
          address: "0x123...abc",
          name: "Test Influencer",
          tokenName: "TEST",
          symbol: "TST",
          totalPledgedETH: "0.5",
          totalPledgedUSDC: "100",
          thresholdETH: "1.0",
          thresholdUSDC: "1000",
          pledgerCount: 5,
          thresholdMet: false,
          isApproved: false,
          isLaunched: false,
          createdAt: Date.now(),
          category: "Test",
          verified: false
        }
      ];
      return res.json(mockInfluencers);
    }

    // Get influencers from contract
    const influencerAddresses = await pledgeContract.getAllInfluencers();
    
    const influencers = await Promise.all(
      influencerAddresses.map(async (address) => {
        try {
          const pledgeData = await pledgeContract.getInfluencerPledge(address);
          const progress = await pledgeContract.getPledgeProgress(address);
          
          // Get additional data from database if available
          let dbData = null;
          try {
            const result = await db.query(
              'SELECT * FROM influencers WHERE wallet_address = $1',
              [address]
            );
            dbData = result.rows[0] || null;
          } catch (dbError) {
            console.log('DB lookup failed for address:', address, dbError.message);
          }
          
          return {
            address,
            name: pledgeData.influencerName || dbData?.name || 'Unknown',
            tokenName: pledgeData.name,
            symbol: pledgeData.symbol,
            totalPledgedETH: ethers.utils.formatEther(progress.totalETH),
            totalPledgedUSDC: ethers.utils.formatUnits(progress.totalUSDC, 6),
            thresholdETH: ethers.utils.formatEther(progress.thresholdETH),
            thresholdUSDC: ethers.utils.formatUnits(progress.thresholdUSDC, 6),
            pledgerCount: progress.pledgerCount.toNumber(),
            thresholdMet: progress.thresholdMet,
            isApproved: progress.isApproved,
            isLaunched: progress.isLaunched,
            tokenAddress: pledgeData.tokenAddress,
            createdAt: pledgeData.createdAt.toNumber(),
            launchedAt: pledgeData.launchedAt.toNumber(),
            avatar: dbData?.avatar_url,
            followers: dbData?.followers_count,
            category: dbData?.category,
            description: dbData?.description,
            verified: dbData?.verified || false
          };
        } catch (error) {
          console.error('Error fetching data for influencer:', address, error);
          return null;
        }
      })
    );
    
    const validInfluencers = influencers.filter(inf => inf !== null);
    res.json(validInfluencers);
  } catch (error) {
    console.error('Error fetching influencers:', error);
    res.status(500).json({ error: 'Failed to fetch influencers' });
  }
});

// GET /api/pledge/influencer/:address - Get specific influencer pledge data
router.get('/influencer/:address', requireBlockchain, async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    const pledgeData = await pledgeContract.getInfluencerPledge(address);
    const progress = await pledgeContract.getPledgeProgress(address);
    
    // Get from database
    let dbData = null;
    try {
      const result = await db.query(
        'SELECT * FROM influencers WHERE wallet_address = $1',
        [address]
      );
      dbData = result.rows[0] || null;
    } catch (dbError) {
      console.log('DB lookup failed:', dbError.message);
    }
    
    res.json({
      address,
      name: pledgeData.influencerName || dbData?.name || 'Unknown',
      tokenName: pledgeData.name,
      symbol: pledgeData.symbol,
      totalPledgedETH: ethers.utils.formatEther(progress.totalETH),
      totalPledgedUSDC: ethers.utils.formatUnits(progress.totalUSDC, 6),
      thresholdETH: ethers.utils.formatEther(progress.thresholdETH),
      thresholdUSDC: ethers.utils.formatUnits(progress.thresholdUSDC, 6),
      pledgerCount: progress.pledgerCount.toNumber(),
      thresholdMet: progress.thresholdMet,
      isApproved: progress.isApproved,
      isLaunched: progress.isLaunched,
      tokenAddress: pledgeData.tokenAddress,
      createdAt: pledgeData.createdAt.toNumber(),
      launchedAt: pledgeData.launchedAt.toNumber(),
      avatar: dbData?.avatar_url,
      followers: dbData?.followers_count,
      category: dbData?.category,
      description: dbData?.description,
      verified: dbData?.verified || false
    });
  } catch (error) {
    console.error('Error fetching influencer data:', error);
    res.status(500).json({ error: 'Failed to fetch influencer data' });
  }
});

// GET /api/pledge/user/:userAddress/pledges - Get user's pledges
router.get('/user/:userAddress/pledges', requireBlockchain, async (req, res) => {
  try {
    const { userAddress } = req.params;
    
    if (!ethers.utils.isAddress(userAddress)) {
      return res.status(400).json({ error: 'Invalid user address' });
    }
    
    const influencerAddresses = await pledgeContract.getAllInfluencers();
    
    const userPledges = await Promise.all(
      influencerAddresses.map(async (influencerAddress) => {
        try {
          const userPledge = await pledgeContract.getUserPledge(influencerAddress, userAddress);
          
          if (userPledge.ethAmount.gt(0) || userPledge.usdcAmount.gt(0)) {
            const influencerData = await pledgeContract.getInfluencerPledge(influencerAddress);
            
            return {
              influencerAddress,
              influencerName: influencerData.influencerName,
              tokenName: influencerData.name,
              symbol: influencerData.symbol,
              ethAmount: ethers.utils.formatEther(userPledge.ethAmount),
              usdcAmount: ethers.utils.formatUnits(userPledge.usdcAmount, 6),
              hasWithdrawn: userPledge.hasWithdrawn,
              pledgedAt: userPledge.pledgedAt.toNumber(),
              isLaunched: influencerData.isLaunched,
              tokenAddress: influencerData.tokenAddress
            };
          }
          return null;
        } catch (error) {
          console.error('Error checking pledge for influencer:', influencerAddress, error);
          return null;
        }
      })
    );
    
    const validPledges = userPledges.filter(pledge => pledge !== null);
    res.json(validPledges);
  } catch (error) {
    console.error('Error fetching user pledges:', error);
    res.status(500).json({ error: 'Failed to fetch user pledges' });
  }
});

// POST /api/pledge/admin/setup-influencer - Admin: Setup influencer for pledging
router.post('/admin/setup-influencer', requireBlockchain, async (req, res) => {
  try {
    const {
      influencerAddress,
      ethThreshold,
      usdcThreshold,
      tokenName,
      symbol,
      influencerName
    } = req.body;
    
    // Validation
    if (!ethers.utils.isAddress(influencerAddress)) {
      return res.status(400).json({ error: 'Invalid influencer address' });
    }
    
    if (!ethThreshold && !usdcThreshold) {
      return res.status(400).json({ error: 'At least one threshold must be set' });
    }
    
    if (!tokenName || !symbol || !influencerName) {
      return res.status(400).json({ error: 'Token name, symbol, and influencer name are required' });
    }
    
    // Convert thresholds to wei/smallest units
    const ethThresholdWei = ethThreshold ? ethers.utils.parseEther(ethThreshold.toString()) : 0;
    const usdcThresholdSmallest = usdcThreshold ? ethers.utils.parseUnits(usdcThreshold.toString(), 6) : 0;
    
    // Call contract
    const tx = await adminPledgeContract.setInfluencerThreshold(
      influencerAddress,
      ethThresholdWei,
      usdcThresholdSmallest,
      tokenName,
      symbol,
      influencerName
    );
    
    await tx.wait();
    
    // Also store in database for easy access
    try {
      await db.query(`
        INSERT INTO influencers (name, handle, email, wallet_address, category, description, verified, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (wallet_address) 
        DO UPDATE SET 
          name = EXCLUDED.name,
          updated_at = CURRENT_TIMESTAMP
      `, [
        influencerName,
        `@${symbol.toLowerCase()}`,
        `${symbol.toLowerCase()}@placeholder.com`,
        influencerAddress,
        'Influencer',
        `Pledging for ${tokenName} token`,
        false,
        'pledging'
      ]);
    } catch (dbError) {
      console.log('DB insert failed, but contract call succeeded:', dbError.message);
    }
    
    res.json({
      success: true,
      transactionHash: tx.hash,
      influencerAddress,
      ethThreshold: ethThreshold?.toString(),
      usdcThreshold: usdcThreshold?.toString(),
      tokenName,
      symbol,
      influencerName
    });
  } catch (error) {
    console.error('Error setting up influencer:', error);
    res.status(500).json({ 
      error: 'Failed to setup influencer',
      details: error.message 
    });
  }
});

// POST /api/pledge/admin/approve-influencer - Admin: Approve influencer for token launch
router.post('/admin/approve-influencer', requireBlockchain, async (req, res) => {
  try {
    const { influencerAddress } = req.body;
    
    if (!ethers.utils.isAddress(influencerAddress)) {
      return res.status(400).json({ error: 'Invalid influencer address' });
    }
    
    const thresholdMet = await pledgeContract.isThresholdMet(influencerAddress);
    if (!thresholdMet) {
      return res.status(400).json({ error: 'Pledge threshold not met yet' });
    }
    
    const tx = await adminPledgeContract.approveInfluencer(influencerAddress);
    await tx.wait();
    
    res.json({
      success: true,
      transactionHash: tx.hash,
      influencerAddress,
      message: 'Influencer approved for token launch'
    });
  } catch (error) {
    console.error('Error approving influencer:', error);
    res.status(500).json({ 
      error: 'Failed to approve influencer',
      details: error.message 
    });
  }
});

// POST /api/pledge/admin/launch-token - Admin: Launch token for approved influencer
router.post('/admin/launch-token', requireBlockchain, async (req, res) => {
  try {
    const { influencerAddress } = req.body;
    
    if (!ethers.utils.isAddress(influencerAddress)) {
      return res.status(400).json({ error: 'Invalid influencer address' });
    }
    
    const tx = await adminPledgeContract.launchToken(influencerAddress);
    const receipt = await tx.wait();
    
    // Get the new token address from events
    let tokenAddress = null;
    for (const log of receipt.logs) {
      try {
        const parsed = pledgeContract.interface.parseLog(log);
        if (parsed.name === 'TokenLaunched') {
          tokenAddress = parsed.args.tokenAddress;
          break;
        }
      } catch (e) {
        // Skip logs that can't be parsed
      }
    }
    
    res.json({
      success: true,
      transactionHash: tx.hash,
      influencerAddress,
      tokenAddress,
      message: 'Token launched successfully'
    });
  } catch (error) {
    console.error('Error launching token:', error);
    res.status(500).json({ 
      error: 'Failed to launch token',
      details: error.message 
    });
  }
});

// GET /api/pledge/stats - Get overall platform statistics
router.get('/stats', async (req, res) => {
  try {
    if (!blockchainEnabled) {
      // Return mock stats when blockchain is disabled
      return res.json({
        totalInfluencers: 0,
        launchedTokens: 0,
        approvedInfluencers: 0,
        totalPledgedETH: "0.0",
        totalPledgedUSDC: "0.0",
        totalPledgers: 0,
        pendingApprovals: 0,
        blockchainEnabled: false
      });
    }

    const influencerAddresses = await pledgeContract.getAllInfluencers();
    
    let totalPledgedETH = ethers.BigNumber.from(0);
    let totalPledgedUSDC = ethers.BigNumber.from(0);
    let totalInfluencers = influencerAddresses.length;
    let launchedTokens = 0;
    let approvedInfluencers = 0;
    let totalPledgers = 0;
    
    for (const address of influencerAddresses) {
      try {
        const progress = await pledgeContract.getPledgeProgress(address);
        totalPledgedETH = totalPledgedETH.add(progress.totalETH);
        totalPledgedUSDC = totalPledgedUSDC.add(progress.totalUSDC);
        totalPledgers += progress.pledgerCount.toNumber();
        
        if (progress.isLaunched) launchedTokens++;
        if (progress.isApproved) approvedInfluencers++;
      } catch (error) {
        console.error('Error getting stats for influencer:', address, error);
      }
    }
    
    res.json({
      totalInfluencers,
      launchedTokens,
      approvedInfluencers,
      totalPledgedETH: ethers.utils.formatEther(totalPledgedETH),
      totalPledgedUSDC: ethers.utils.formatUnits(totalPledgedUSDC, 6),
      totalPledgers,
      pendingApprovals: approvedInfluencers - launchedTokens,
      blockchainEnabled: true
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch platform stats' });
  }
});

module.exports = router;