// Backend/scripts/deployInfluencerToken.js - Network-aware version
const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.error('❌ Usage: node deployInfluencerToken.js <tokenName> <tokenSymbol> <influencerAddress> [network]');
      process.exit(1);
    }

    const [tokenName, tokenSymbol, influencerAddress, network] = args;
    const targetNetwork = network || 'base-sepolia';

    // Network info mapping
    const networkMap = {
      'base-sepolia': { name: 'Base Sepolia Testnet', chainId: 84532, minBalance: '0.01' },
      'base': { name: 'Base Mainnet', chainId: 8453, minBalance: '0.05' }
    };

    const networkInfo = networkMap[targetNetwork];
    if (!networkInfo) {
      throw new Error(`Unsupported network: ${targetNetwork}. Supported: base-sepolia, base`);
    }

    console.log(`🌐 Deploying to ${networkInfo.name} (${networkInfo.chainId})`);

    // MAINNET WARNING
    if (targetNetwork === 'base') {
      console.log(`🚨 WARNING: You are deploying to BASE MAINNET - This will cost REAL ETH!`);
      console.log(`💰 Make sure you have sufficient ETH and double-check all parameters.`);
    }

    // Configure the network for Hardhat
    if (targetNetwork !== 'localhost') {
      const networkConfig = require('../hardhat.config.js').networks[targetNetwork];
      if (!networkConfig) {
        throw new Error(`Network ${targetNetwork} not configured in hardhat.config.js`);
      }
      
      // Override Hardhat's default network
      require("hardhat").changeNetwork(targetNetwork);
    }

    // Get signer account - this should now use the correct network
    const [signer] = await ethers.getSigners();
    const signerAddress = await signer.getAddress();
    
    // Check deployer balance
    const balance = await signer.provider.getBalance(signerAddress);
    const balanceEth = ethers.formatEther(balance);
    
    console.log(`🚀 Deploying token with account: ${signerAddress}`);
    console.log(`💰 Account balance: ${balanceEth} ETH`);

    // Check minimum balance requirements
    if (parseFloat(balanceEth) < parseFloat(networkInfo.minBalance)) {
      const errorMsg = targetNetwork === 'base' 
        ? `Insufficient balance for MAINNET deployment. Need at least ${networkInfo.minBalance} ETH, have ${balanceEth} ETH. This costs real money!`
        : `Insufficient balance for testnet deployment. Need at least ${networkInfo.minBalance} ETH, have ${balanceEth} ETH. Get free testnet ETH from https://www.alchemy.com/faucets/base-sepolia`;
      throw new Error(errorMsg);
    }

    console.log(`📝 Deploying ${tokenName} (${tokenSymbol}) for ${influencerAddress}...`);

    // Deploy the InfluencerToken contract
    const InfluencerToken = await ethers.getContractFactory("InfluencerToken");
    
    // Set gas options based on network
    const deployOptions = {};
    if (targetNetwork === 'base') {
      deployOptions.gasLimit = 2500000;
    } else if (targetNetwork === 'base-sepolia') {
      deployOptions.gasLimit = 3000000;
    }
    
    // Deploy with all 4 required constructor parameters
    const token = await InfluencerToken.deploy(
      tokenName,
      tokenSymbol,
      influencerAddress,
      signerAddress,
      deployOptions
    );

    // Wait for deployment
    const deploymentTx = token.deploymentTransaction();
    const contractAddress = await token.getAddress();
    
    console.log(`⏳ Waiting for deployment confirmation...`);
    
    // Wait for more confirmations on mainnet
    const confirmations = targetNetwork === 'base' ? 3 : 1;
    const receipt = await deploymentTx.wait(confirmations);
    
    if (!receipt) {
      throw new Error('Failed to get deployment receipt');
    }

    // Get token allocations
    const totalSupply = await token.totalSupply();
    const influencerBalance = await token.balanceOf(influencerAddress);
    const signerBalance = await token.balanceOf(signerAddress);

    console.log(`✅ Token deployed successfully!`);
    console.log(`📍 Contract address: ${contractAddress}`);
    console.log(`👤 Influencer allocation sent to: ${influencerAddress}`);
    console.log(`💧 Liquidity allocation held by: ${signerAddress}`);
    console.log(`🔗 Transaction hash: ${receipt.hash}`);
    console.log(`🌐 Network: ${networkInfo.name} (${networkInfo.chainId})`);
    console.log(`📊 Token Allocations:`);
    console.log(`   Influencer (30%): ${ethers.formatEther(influencerBalance)} ${tokenSymbol}`);
    console.log(`   Liquidity (70%): ${ethers.formatEther(signerBalance)} ${tokenSymbol}`);
    
    // Show explorer links
    if (targetNetwork === 'base') {
      console.log(`🔍 View on BaseScan: https://basescan.org/token/${contractAddress}`);
    } else if (targetNetwork === 'base-sepolia') {
      console.log(`🔍 View on BaseScan: https://sepolia.basescan.org/token/${contractAddress}`);
    }
    
    console.log(`🎉 Deployment completed successfully!`);

    // Return structured data for API parsing
    const deploymentResult = {
      success: true,
      tokenAddress: contractAddress,
      txHash: receipt.hash,
      network: targetNetwork,
      networkName: networkInfo.name,
      chainId: networkInfo.chainId,
      tokenName: tokenName,
      tokenSymbol: tokenSymbol,
      influencerAddress: influencerAddress,
      liquidityAddress: signerAddress,
      confirmations: confirmations,
      explorerUrl: targetNetwork === 'base' 
        ? `https://basescan.org/token/${contractAddress}`
        : targetNetwork === 'base-sepolia'
        ? `https://sepolia.basescan.org/token/${contractAddress}`
        : null
    };

    // Output for API parsing
    console.log('\n📦 DEPLOYMENT_RESULT_JSON:');
    console.log(JSON.stringify(deploymentResult, null, 2));

    return deploymentResult;

  } catch (error) {
    console.error(`❌ Deployment failed: ${error.message}`);
    
    const errorResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };

    console.log('\n📦 DEPLOYMENT_ERROR_JSON:');
    console.log(JSON.stringify(errorResult, null, 2));
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { main };