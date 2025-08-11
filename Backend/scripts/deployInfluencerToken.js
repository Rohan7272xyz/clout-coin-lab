// Backend/scripts/deployInfluencerToken.js - FIXED VERSION (No HRE dependency)
require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  try {
    // Get deployment parameters from command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      throw new Error('Usage: node deployInfluencerToken.js <tokenName> <tokenSymbol> <ownerAddress>');
    }
    
    const [tokenName, tokenSymbol, ownerAddress] = args;
    
    // Get network info first
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === 'unknown' ? 'base-sepolia' : network.name;
    
    console.log(`🌐 Deploying to ${networkName} (${Number(network.chainId)})`);
    console.log(`🔗 Connected to chain ID: ${Number(network.chainId)}`);
    console.log(`🚀 Deploying token with account: ${ownerAddress}`);
    
    // Get deployer account (this should be your funded account)
    const [deployer] = await ethers.getSigners();
    console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
    
    // Log deployment details
    console.log(`📝 Deploying ${tokenName} (${tokenSymbol}) for ${ownerAddress}...`);
    
    // Get the contract factory
    const InfluencerToken = await ethers.getContractFactory('InfluencerToken');
    
    // Deploy the contract
    console.log('⏳ Waiting for deployment confirmation...');
    
    // Check if ownerAddress is valid
    if (!ethers.isAddress(ownerAddress)) {
      throw new Error(`Invalid owner address: ${ownerAddress}`);
    }
    
    // For InfluencerToken: constructor(name, symbol, _influencerWallet, _liquidityWallet)
    // We'll use the same address for both influencer and liquidity wallet for simplicity
    console.log('🔄 Deploying with InfluencerToken constructor (name, symbol, influencer, liquidity)...');
    const influencerToken = await InfluencerToken.deploy(
      tokenName,      // string memory name
      tokenSymbol,    // string memory symbol  
      ownerAddress,   // address _influencerWallet (gets 30%)
      ownerAddress    // address _liquidityWallet (gets 70%, becomes owner)
    );
    
    // Wait for deployment to be mined
    await influencerToken.waitForDeployment();
    
    const contractAddress = await influencerToken.getAddress();
    const deploymentTx = influencerToken.deploymentTransaction();
    
    console.log(`✅ Token deployed successfully!`);
    console.log(`📍 Contract address: ${contractAddress}`);
    console.log(`🔗 Transaction hash: ${deploymentTx.hash}`);
    
    // Wait for additional confirmations before verification
    console.log('⏳ Waiting for additional confirmations...');
    await deploymentTx.wait(2); // Wait for 2 confirmations
    
    // Add a small delay to ensure contract is fully available
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
    
    // FIXED: Safer contract verification with error handling
    let verificationResult = null;
    try {
      console.log('🔍 Verifying contract functionality...');
      
      // Try to get basic contract info with timeout
      const tokenNameResult = await Promise.race([
        influencerToken.name(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      
      const tokenSymbolResult = await Promise.race([
        influencerToken.symbol(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      
      const totalSupplyResult = await Promise.race([
        influencerToken.totalSupply(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
      ]);
      
      verificationResult = {
        name: tokenNameResult,
        symbol: tokenSymbolResult,
        totalSupply: ethers.formatEther(totalSupplyResult),
        verified: true
      };
      
      console.log(`✅ Contract verified: ${verificationResult.name} (${verificationResult.symbol})`);
      console.log(`📊 Total supply: ${verificationResult.totalSupply} tokens`);
      
    } catch (verificationError) {
      console.log(`⚠️ Contract verification failed (but deployment succeeded): ${verificationError.message}`);
      verificationResult = {
        verified: false,
        error: verificationError.message
      };
    }
    
    // Create explorer URL based on network
    let explorerUrl = '';
    if (network.chainId === 84532n) { // Base Sepolia
      explorerUrl = `https://sepolia.basescan.org/tx/${deploymentTx.hash}`;
    } else if (network.chainId === 8453n) { // Base Mainnet
      explorerUrl = `https://basescan.org/tx/${deploymentTx.hash}`;
    }
    
    // Output JSON result for parsing by the API
    const result = {
      success: true,
      tokenAddress: contractAddress,
      txHash: deploymentTx.hash,
      network: networkName,
      networkName: networkName,
      chainId: Number(network.chainId),
      explorerUrl: explorerUrl,
      gasUsed: deploymentTx.gasLimit ? Number(deploymentTx.gasLimit) : null,
      verification: verificationResult,
      timestamp: new Date().toISOString()
    };
    
    console.log('📦 DEPLOYMENT_RESULT_JSON:');
    console.log(JSON.stringify(result, null, 2));
    
    process.exit(0);
    
  } catch (error) {
    console.error(`❌ Deployment failed: ${error.message}`);
    
    // Output error JSON for parsing by the API
    const errorResult = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    console.log('📦 DEPLOYMENT_ERROR_JSON:');
    console.log(JSON.stringify(errorResult, null, 2));
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the deployment
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Deployment script error:', error);
    process.exit(1);
  });
}