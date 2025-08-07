// Backend/test-server.js - Clean server just for pledge testing
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const PORT = 3001; // Different port to avoid conflicts

// Middleware
app.use(cors());
app.use(express.json());

// Mock database for testing (replace with real DB later)
let influencers = [];
let pledges = [];

// Contract setup
const PLEDGE_MANAGER_ADDRESS = "0x2B7B6c9c470cD1808447987BBc0aF952f8B4d7d8";
const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Pledge System Test Server',
    contract: PLEDGE_MANAGER_ADDRESS,
    status: 'Running'
  });
});

app.get('/api/pledge/stats', (req, res) => {
  res.json({
    totalInfluencers: influencers.length,
    launchedTokens: 0,
    approvedInfluencers: 0,
    totalPledgedETH: "0.0",
    totalPledgedUSDC: "0.0",
    totalPledgers: 0,
    pendingApprovals: 0
  });
});

app.get('/api/pledge/influencers', (req, res) => {
  res.json(influencers);
});

app.post('/api/pledge/admin/setup-influencer', (req, res) => {
  const {
    influencerAddress,
    ethThreshold,
    tokenName,
    symbol,
    influencerName
  } = req.body;

  // Mock response - in real version this would call the contract
  const newInfluencer = {
    address: influencerAddress,
    name: influencerName,
    tokenName,
    symbol,
    totalPledgedETH: "0.0",
    thresholdETH: ethThreshold,
    pledgerCount: 0,
    thresholdMet: false,
    isApproved: false,
    isLaunched: false
  };

  influencers.push(newInfluencer);

  res.json({
    success: true,
    message: 'Influencer setup successful (mock)',
    influencer: newInfluencer
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Pledge Test Server running on http://localhost:${PORT}`);
  console.log(`📊 Contract: ${PLEDGE_MANAGER_ADDRESS}`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/pledge/stats`);
});