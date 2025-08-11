const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  // Hardcoded test values
  const tokenName = "Real Test Token";
  const tokenSymbol = "REAL";
  const influencerAddress = "0x4A2bc44Cc67FF08Deba6C26dbFCe8fc5F9BC0a50";

  console.log('🌐 Deploying to Base Sepolia Testnet');

  // Get signer (should now use your private key)
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  
  console.log(`🚀 Deploying with account: ${signerAddress}`);
  
  const balance = await signer.provider.getBalance(signerAddress);
  const balanceEth = ethers.formatEther(balance);
  console.log(`💰 Account balance: ${balanceEth} ETH`);

  // Deploy contract
  const InfluencerToken = await ethers.getContractFactory("InfluencerToken");
  const token = await InfluencerToken.deploy(
    tokenName,
    tokenSymbol,
    influencerAddress,
    signerAddress
  );

  const contractAddress = await token.getAddress();
  const deploymentTx = token.deploymentTransaction();
  const receipt = await deploymentTx.wait(1);

  console.log(`✅ Token deployed successfully!`);
  console.log(`📍 Contract address: ${contractAddress}`);
  console.log(`🔗 Transaction hash: ${receipt.hash}`);
  console.log(`🔍 View on BaseScan: https://sepolia.basescan.org/token/${contractAddress}`);
}

main().catch(console.error);
