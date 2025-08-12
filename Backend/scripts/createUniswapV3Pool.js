// Backend/scripts/createUniswapV3Pool.js
// Phase 5a: Automated Uniswap V3 Liquidity Pool Creation for Base Sepolia
// This script automatically creates liquidity pools for newly deployed influencer tokens

const { ethers } = require("hardhat");
require('dotenv').config();

// Base Sepolia Uniswap V3 Contract Addresses (VERIFIED)
const UNISWAP_V3_ADDRESSES = {
  'base-sepolia': {
    factory: "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24",
    router: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4", 
    positionManager: "0x27F971cb582BF9E50F397e4d29a5C7A34f11faA2",
    weth: "0x4200000000000000000000000000000000000006", // WETH on Base Sepolia
    quoter: "0xC5290058841028F1614F3A6F0F5816cAd0df5E27"
  },
  'base': {
    factory: "0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
    router: "0x2626664c2603336E57B271c5C0b26F421741e481",
    positionManager: "0x03a520b32C04BF3bEEf7BF5d8bFb20b4B66f7d6C",
    weth: "0x4200000000000000000000000000000000000006", // WETH on Base
    quoter: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a"
  }
};

class UniswapV3PoolCreator {
  constructor(network = 'base-sepolia') {
    this.network = network;
    this.addresses = UNISWAP_V3_ADDRESSES[network];
    
    if (!this.addresses) {
      throw new Error(`Unsupported network: ${network}`);
    }
    
    console.log(`🔧 UniswapV3PoolCreator initialized for ${network}`);
  }

  /**
   * Main function: Create pool and add initial liquidity
   */
  async createPoolWithLiquidity({
    tokenAddress,
    tokenSymbol,
    tokenName,
    ethAmount = "0.1", // Default: 0.1 ETH
    tokenAmountPercentage = 20, // Default: 20% of total supply
    fee = 3000, // Default: 0.3% fee tier
    totalSupply = 1000000
  }) {
    try {
      console.log(`\n🚀 Starting automated pool creation for ${tokenSymbol}`);
      console.log(`📍 Network: ${this.network}`);
      console.log(`🪙 Token: ${tokenAddress}`);
      console.log(`💧 ETH Amount: ${ethAmount}`);
      console.log(`📊 Token Amount: ${tokenAmountPercentage}% of ${totalSupply}`);

      const [deployer] = await ethers.getSigners();
      console.log(`👤 Deployer: ${deployer.address}`);

      // Validate inputs
      await this.validateInputs(tokenAddress, ethAmount, tokenAmountPercentage);

      // Calculate token amount
      const tokenAmount = Math.floor((totalSupply * tokenAmountPercentage) / 100);
      console.log(`🔢 Calculated token amount: ${tokenAmount.toLocaleString()} ${tokenSymbol}`);

      // Check balances
      await this.checkBalances(deployer, tokenAddress, ethAmount, tokenAmount);

      // Create pool if it doesn't exist
      const poolAddress = await this.createPool(tokenAddress, fee);

      // Add liquidity to the pool
      const liquidityResult = await this.addLiquidity(
        deployer,
        tokenAddress,
        poolAddress,
        ethAmount,
        tokenAmount,
        fee
      );

      // Return comprehensive result
      return {
        success: true,
        poolAddress,
        tokenAddress,
        tokenSymbol,
        liquidityTokenId: liquidityResult.tokenId,
        liquidity: liquidityResult.liquidity,
        amount0: liquidityResult.amount0,
        amount1: liquidityResult.amount1,
        txHash: liquidityResult.txHash,
        network: this.network,
        ethAmount,
        tokenAmount,
        fee,
        explorerUrl: this.getExplorerUrl(poolAddress),
        poolExplorerUrl: this.getPoolExplorerUrl(poolAddress),
        message: `Successfully created ${tokenSymbol}/ETH pool on ${this.network} with ${ethAmount} ETH liquidity`
      };

    } catch (error) {
      console.error(`❌ Pool creation failed:`, error);
      throw new Error(`Pool creation failed: ${error.message}`);
    }
  }

  /**
   * Validate all inputs before proceeding
   */
  async validateInputs(tokenAddress, ethAmount, tokenAmountPercentage) {
    // Validate token address format
    if (!ethers.utils.isAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    // Validate ETH amount
    if (parseFloat(ethAmount) <= 0) {
      throw new Error(`Invalid ETH amount: ${ethAmount}`);
    }

    // Validate token percentage
    if (tokenAmountPercentage <= 0 || tokenAmountPercentage > 100) {
      throw new Error(`Invalid token percentage: ${tokenAmountPercentage}%`);
    }

    // Verify token contract exists
    try {
      const tokenContract = await ethers.getContractAt("IERC20", tokenAddress);
      const symbol = await tokenContract.symbol();
      console.log(`✅ Token contract verified: ${symbol}`);
    } catch (error) {
      throw new Error(`Token contract verification failed: ${error.message}`);
    }
  }

  /**
   * Check deployer has sufficient balances
   */
  async checkBalances(deployer, tokenAddress, ethAmount, tokenAmount) {
    // Check ETH balance
    const ethBalance = await deployer.getBalance();
    const requiredEth = ethers.utils.parseEther(ethAmount).add(ethers.utils.parseEther("0.01")); // Extra for gas
    
    if (ethBalance.lt(requiredEth)) {
      throw new Error(`Insufficient ETH balance. Required: ${ethers.utils.formatEther(requiredEth)}, Available: ${ethers.utils.formatEther(ethBalance)}`);
    }

    // Check token balance
    const tokenContract = await ethers.getContractAt("IERC20", tokenAddress);
    const tokenBalance = await tokenContract.balanceOf(deployer.address);
    const requiredTokens = ethers.utils.parseUnits(tokenAmount.toString(), 18);

    if (tokenBalance.lt(requiredTokens)) {
      throw new Error(`Insufficient token balance. Required: ${tokenAmount.toLocaleString()}, Available: ${ethers.utils.formatUnits(tokenBalance, 18)}`);
    }

    console.log(`✅ Balance check passed`);
    console.log(`💰 ETH: ${ethers.utils.formatEther(ethBalance)} (need ${ethAmount})`);
    console.log(`🪙 Tokens: ${ethers.utils.formatUnits(tokenBalance, 18)} (need ${tokenAmount.toLocaleString()})`);
  }

  /**
   * Create Uniswap V3 pool (if it doesn't exist)
   */
  async createPool(tokenAddress, fee) {
    try {
      const factory = await ethers.getContractAt(
        "IUniswapV3Factory", 
        this.addresses.factory
      );

      // Determine token order (tokens must be ordered by address)
      const token0 = tokenAddress.toLowerCase() < this.addresses.weth.toLowerCase() 
        ? tokenAddress : this.addresses.weth;
      const token1 = tokenAddress.toLowerCase() < this.addresses.weth.toLowerCase() 
        ? this.addresses.weth : tokenAddress;

      console.log(`🔄 Token order: ${token0} < ${token1}`);

      // Check if pool already exists
      let poolAddress = await factory.getPool(token0, token1, fee);
      
      if (poolAddress === ethers.constants.AddressZero) {
        console.log(`📦 Creating new pool with ${fee/10000}% fee...`);
        
        const createTx = await factory.createPool(token0, token1, fee);
        const receipt = await createTx.wait();
        
        poolAddress = await factory.getPool(token0, token1, fee);
        console.log(`✅ Pool created: ${poolAddress}`);
        console.log(`🔗 Create TX: ${receipt.transactionHash}`);
      } else {
        console.log(`✅ Pool already exists: ${poolAddress}`);
      }

      return poolAddress;

    } catch (error) {
      throw new Error(`Pool creation failed: ${error.message}`);
    }
  }

  /**
   * Add liquidity to the pool
   */
  async addLiquidity(deployer, tokenAddress, poolAddress, ethAmount, tokenAmount, fee) {
    try {
      console.log(`💧 Adding liquidity to pool...`);

      // Get contract instances
      const tokenContract = await ethers.getContractAt("IERC20", tokenAddress);
      const positionManager = await ethers.getContractAt(
        "INonfungiblePositionManager", 
        this.addresses.positionManager
      );

      // Approve tokens
      console.log(`🔓 Approving ${tokenAmount.toLocaleString()} tokens...`);
      const tokenAmountWei = ethers.utils.parseUnits(tokenAmount.toString(), 18);
      const approveTx = await tokenContract.approve(this.addresses.positionManager, tokenAmountWei);
      await approveTx.wait();
      console.log(`✅ Token approval confirmed`);

      // Determine token order and amounts
      const isToken0 = tokenAddress.toLowerCase() < this.addresses.weth.toLowerCase();
      const amount0Desired = isToken0 ? tokenAmountWei : ethers.utils.parseEther(ethAmount);
      const amount1Desired = isToken0 ? ethers.utils.parseEther(ethAmount) : tokenAmountWei;

      // Set price range (full range for initial liquidity)
      const tickSpacing = this.getTickSpacing(fee);
      const minTick = Math.ceil(-887272 / tickSpacing) * tickSpacing;
      const maxTick = Math.floor(887272 / tickSpacing) * tickSpacing;

      console.log(`🎯 Price range: Full range (${minTick} to ${maxTick})`);

      // Mint position
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      const mintParams = {
        token0: isToken0 ? tokenAddress : this.addresses.weth,
        token1: isToken0 ? this.addresses.weth : tokenAddress,
        fee: fee,
        tickLower: minTick,
        tickUpper: maxTick,
        amount0Desired: amount0Desired,
        amount1Desired: amount1Desired,
        amount0Min: amount0Desired.mul(95).div(100), // 5% slippage
        amount1Min: amount1Desired.mul(95).div(100), // 5% slippage
        recipient: deployer.address,
        deadline: deadline
      };

      console.log(`📝 Mint parameters prepared`);

      // Execute mint
      const ethValue = isToken0 ? ethers.utils.parseEther(ethAmount) : ethers.utils.parseEther(ethAmount);
      const mintTx = await positionManager.mint(mintParams, { value: ethValue });
      const receipt = await mintTx.wait();

      // Extract minted position details from events
      const mintEvent = receipt.events?.find(e => e.event === 'IncreaseLiquidity' || e.event === 'Transfer');
      
      console.log(`✅ Liquidity added successfully!`);
      console.log(`🔗 Transaction: ${receipt.transactionHash}`);

      return {
        tokenId: mintEvent?.args?.tokenId || 'N/A',
        liquidity: mintEvent?.args?.liquidity || 'N/A',
        amount0: mintEvent?.args?.amount0 || amount0Desired,
        amount1: mintEvent?.args?.amount1 || amount1Desired,
        txHash: receipt.transactionHash
      };

    } catch (error) {
      throw new Error(`Add liquidity failed: ${error.message}`);
    }
  }

  /**
   * Get tick spacing for fee tier
   */
  getTickSpacing(fee) {
    const tickSpacings = {
      500: 10,    // 0.05%
      3000: 60,   // 0.3%
      10000: 200  // 1%
    };
    return tickSpacings[fee] || 60;
  }

  /**
   * Get explorer URL for the pool
   */
  getExplorerUrl(poolAddress) {
    const explorers = {
      'base-sepolia': `https://sepolia.basescan.org/address/${poolAddress}`,
      'base': `https://basescan.org/address/${poolAddress}`
    };
    return explorers[this.network];
  }

  /**
   * Get Uniswap interface URL for the pool
   */
  getPoolExplorerUrl(poolAddress) {
    return `https://app.uniswap.org/pool/${poolAddress}`;
  }
}

/**
 * Main execution function for CLI usage
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log(`
Usage: node createUniswapV3Pool.js <tokenAddress> <tokenSymbol> [ethAmount] [tokenPercentage] [network]

Example: node createUniswapV3Pool.js 0x17207DAb8a4E22843eaEb8c33c37beD58ccc13C6 SKBDI 0.1 20 base-sepolia
      `);
      process.exit(1);
    }

    const [tokenAddress, tokenSymbol, ethAmount = "0.1", tokenPercentage = "20", network = "base-sepolia"] = args;

    const poolCreator = new UniswapV3PoolCreator(network);
    
    const result = await poolCreator.createPoolWithLiquidity({
      tokenAddress,
      tokenSymbol,
      ethAmount,
      tokenAmountPercentage: parseInt(tokenPercentage),
      totalSupply: 1000000 // Default total supply
    });

    console.log(`\n🎉 POOL CREATION COMPLETED!`);
    console.log(`📊 Pool Address: ${result.poolAddress}`);
    console.log(`🔗 Explorer: ${result.explorerUrl}`);
    console.log(`🌊 Uniswap Interface: ${result.poolExplorerUrl}`);
    console.log(`💰 Liquidity Token ID: ${result.liquidityTokenId}`);

    // Return JSON for programmatic usage
    console.log(`\n📦 RESULT_JSON:`);
    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    console.error(`❌ Script execution failed:`, error.message);
    process.exit(1);
  }
}

// Export for programmatic usage
module.exports = { UniswapV3PoolCreator };

// Execute if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}