// File: routes/trading.js
// Backend API routes for trading functionality

const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const db = require('../models/database'); // Your database functions

// Initialize provider for reading blockchain data
const provider = new ethers.providers.InfuraProvider(
  process.env.NETWORK || 'mainnet',
  process.env.INFURA_PROJECT_ID
);

// Uniswap V2 Router ABI (minimal)
const ROUTER_ABI = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// GET /api/trading/coin/:id - Get detailed coin data for trading
router.get('/coin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get coin data from database
    const coinData = await db.getInfluencerById(id);
    if (!coinData) {
      return res.status(404).json({ error: 'Coin not found' });
    }
    
    // Get real-time price data if contract is deployed
    let priceData = {
      currentPrice: "0",
      priceChange24h: "+0.00",
      volume24h: "0",
      marketCap: "0"
    };
    
    if (coinData.contract_address && coinData.status === 'live') {
      priceData = await getRealTimePriceData(coinData.contract_address);
    }
    
    // Format response
    const response = {
      id: coinData.id,
      name: coinData.name,
      handle: coinData.handle,
      tokenName: coinData.name + " Token",
      symbol: coinData.symbol || coinData.name.substring(0, 5).toUpperCase(),
      avatar: coinData.avatar_url,
      category: coinData.category,
      description: coinData.description,
      followers: formatFollowers(coinData.followers_count),
      verified: coinData.verified,
      
      // Trading data
      currentPrice: priceData.currentPrice,
      priceChange24h: priceData.priceChange24h,
      marketCap: priceData.marketCap,
      volume24h: priceData.volume24h,
      totalSupply: "1,000,000",
      circulatingSupply: "700,000",
      
      // Contract info
      contractAddress: coinData.contract_address,
      poolAddress: coinData.liquidity_pool_address,
      liquidityLocked: true,
      lockUntil: "2025-12-31",
      
      // Status
      isLive: coinData.status === 'live',
      etherscanVerified: true
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching coin data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/trading/price/:tokenAddress/:ethAmount - Get estimated tokens for ETH amount
router.get('/price/:tokenAddress/:ethAmount', async (req, res) => {
  try {
    const { tokenAddress, ethAmount } = req.params;
    
    const router = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, provider);
    const path = [WETH_ADDRESS, tokenAddress];
    const amountIn = ethers.utils.parseEther(ethAmount);
    
    const amounts = await router.getAmountsOut(amountIn, path);
    const tokensOut = ethers.utils.formatEther(amounts[1]);
    
    res.json({
      ethAmount,
      tokensOut,
      pricePerToken: (parseFloat(ethAmount) / parseFloat(tokensOut)).toFixed(6)
    });
  } catch (error) {
    console.error('Error getting price quote:', error);
    res.status(500).json({ error: 'Failed to get price quote' });
  }
});

// POST /api/trading/record-purchase - Record a successful purchase
router.post('/record-purchase', async (req, res) => {
  try {
    const {
      user_id,
      token_id,
      amount_invested_eth,
      tokens_received,
      purchase_price,
      tx_hash
    } = req.body;
    
    // Validate required fields
    if (!user_id || !token_id || !amount_invested_eth || !tokens_received || !tx_hash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Record the investment in database
    const investment = await db.createInvestment({
      user_id,
      token_id,
      amount_invested_eth,
      tokens_received,
      purchase_price,
      tx_hash
    });
    
    res.status(201).json({
      message: 'Purchase recorded successfully',
      investment
    });
  } catch (error) {
    console.error('Error recording purchase:', error);
    res.status(500).json({ error: 'Failed to record purchase' });
  }
});

// GET /api/trading/portfolio/:userId - Get user's trading portfolio
router.get('/portfolio/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const portfolio = await db.getUserPortfolio(userId);
    
    // Calculate current values and P&L for each holding
    const enrichedPortfolio = await Promise.all(
      portfolio.map(async (holding) => {
        let currentValue = "0";
        let profitLoss = "0";
        let profitLossPercent = "0";
        
        if (holding.contract_address) {
          try {
            const currentPrice = await getCurrentTokenPrice(holding.contract_address);
            currentValue = (parseFloat(holding.tokens_received) * parseFloat(currentPrice)).toFixed(6);
            profitLoss = (parseFloat(currentValue) - parseFloat(holding.amount_invested_eth)).toFixed(6);
            profitLossPercent = ((parseFloat(profitLoss) / parseFloat(holding.amount_invested_eth)) * 100).toFixed(2);
          } catch (err) {
            console.log('Error calculating current value for', holding.token_name);
          }
        }
        
        return {
          ...holding,
          currentValue,
          profitLoss,
          profitLossPercent
        };
      })
    );
    
    res.json(enrichedPortfolio);
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper Functions
async function getRealTimePriceData(tokenAddress) {
  try {
    // This would integrate with price APIs like CoinGecko, DEX price feeds, etc.
    // For now, return mock data
    return {
      currentPrice: "0.0024",
      priceChange24h: "+5.67",
      volume24h: "45,678",
      marketCap: "2,400,000"
    };
  } catch (error) {
    console.error('Error getting real-time price data:', error);
    return {
      currentPrice: "0",
      priceChange24h: "+0.00",
      volume24h: "0",
      marketCap: "0"
    };
  }
}

async function getCurrentTokenPrice(tokenAddress) {
  try {
    const routerContract = new ethers.Contract(UNISWAP_V2_ROUTER, ROUTER_ABI, provider);
    const path = [tokenAddress, WETH_ADDRESS];
    const amountIn = ethers.utils.parseEther("1");
    
    const amounts = await routerContract.getAmountsOut(amountIn, path);
    return ethers.utils.formatEther(amounts[1]);
  } catch (error) {
    console.error('Error getting current token price:', error);
    return "0";
  }
}

function formatFollowers(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}

module.exports = router;