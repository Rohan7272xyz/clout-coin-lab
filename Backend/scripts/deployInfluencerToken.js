// Backend/scripts/deployInfluencerToken.js
// Updated for new Hardhat setup

const { ethers } = require("hardhat");

async function deployInfluencerToken(name, symbol, influencerWallet, deployer = null) {
    try {
        // Get deployer account
        const [defaultDeployer] = await ethers.getSigners();
        const deployerAccount = deployer || defaultDeployer;
        
        console.log("🚀 Deploying token with account:", deployerAccount.address);
        console.log("💰 Account balance:", ethers.formatEther(await deployerAccount.provider.getBalance(deployerAccount.address)), "ETH");
        
        // Get contract factory
        const InfluencerToken = await ethers.getContractFactory("InfluencerToken", deployerAccount);
        
        // Deploy the contract
        console.log(`📝 Deploying ${name} (${symbol}) for ${influencerWallet}...`);
        
        const token = await InfluencerToken.deploy(
            name,
            symbol,
            influencerWallet,
            deployerAccount.address // liquidity wallet (deployer)
        );
        
        // Wait for deployment
        await token.waitForDeployment();
        const contractAddress = await token.getAddress();
        
        console.log("✅ Token deployed successfully!");
        console.log("📍 Contract address:", contractAddress);
        console.log("👤 Influencer allocation sent to:", influencerWallet);
        console.log("💧 Liquidity allocation held by:", deployerAccount.address);
        console.log("🔗 Transaction hash:", token.deploymentTransaction().hash);
        
        // Verify allocations
        const influencerBalance = await token.balanceOf(influencerWallet);
        const liquidityBalance = await token.balanceOf(deployerAccount.address);
        
        console.log("📊 Token Allocations:");
        console.log("   Influencer (30%):", ethers.formatEther(influencerBalance), symbol);
        console.log("   Liquidity (70%):", ethers.formatEther(liquidityBalance), symbol);
        
        return {
            success: true,
            contractAddress: contractAddress,
            deployTxHash: token.deploymentTransaction().hash,
            influencerWallet: influencerWallet,
            liquidityWallet: deployerAccount.address,
            tokenName: name,
            tokenSymbol: symbol,
            influencerAllocation: ethers.formatEther(influencerBalance),
            liquidityAllocation: ethers.formatEther(liquidityBalance)
        };
        
    } catch (error) {
        console.error("❌ Deployment failed:", error.message);
        
        // Provide specific error guidance
        if (error.message.includes("insufficient funds")) {
            console.error("💸 Insufficient funds for gas. Please add ETH to your wallet.");
        } else if (error.message.includes("network")) {
            console.error("🌐 Network error. Check your RPC URL and internet connection.");
        } else if (error.message.includes("private key")) {
            console.error("🔑 Private key error. Check your PRIVATE_KEY in .env file.");
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Allow script to be run directly or imported
if (require.main === module) {
    // Command line usage
    const args = process.argv.slice(2);
    if (args.length !== 3) {
        console.log("Usage: npx hardhat run scripts/deployInfluencerToken.js --network baseSepolia");
        console.log("Or: node scripts/deployInfluencerToken.js 'Token Name' 'SYMBOL' '0xInfluencerWallet'");
        process.exit(1);
    }
    
    const [name, symbol, influencerWallet] = args;
    deployInfluencerToken(name, symbol, influencerWallet)
        .then(result => {
            if (result.success) {
                console.log("🎉 Deployment completed successfully!");
            } else {
                console.error("❌ Deployment failed!");
                process.exit(1);
            }
        })
        .catch(error => {
            console.error("❌ Script error:", error);
            process.exit(1);
        });
}

module.exports = { deployInfluencerToken };