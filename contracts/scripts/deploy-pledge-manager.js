// Backend/scripts/deploy-pledge-manager.js
const hre = require("hardhat");
const { parseEther, parseUnits } = require("ethers");

async function main() {
  console.log("🚀 Deploying PledgeManager to Base Sepolia...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Configuration
  const config = {
    tokenFactory: "0x18594f5d4761b9DBEA625dDeD86356F6D346A09a", // Your existing TokenFactory
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  };

  console.log("📋 Deployment Configuration:");
  console.log(`   TokenFactory: ${config.tokenFactory}`);
  console.log(`   USDC: ${config.usdc}`);

  // Get the contract factory
  const PledgeManager = await hre.ethers.getContractFactory("PledgeManager");

  // Deploy the contract
  const pledgeManager = await PledgeManager.deploy(
    config.tokenFactory,
    config.usdc
  );

  await pledgeManager.waitForDeployment();
  const contractAddress = await pledgeManager.getAddress();

  console.log("✅ PledgeManager deployed to:", contractAddress);

  // Verify deployment by checking the TokenFactory address
  console.log("🔍 Verifying deployment...");
  const storedTokenFactory = await pledgeManager.tokenFactory();
  const storedUSDC = await pledgeManager.usdc();
  console.log("   TokenFactory Address:", storedTokenFactory);
  console.log("   USDC Address:", storedUSDC);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractName: "PledgeManager",
    contractAddress: contractAddress,
    tokenFactory: config.tokenFactory,
    usdc: config.usdc,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    deploymentTx: pledgeManager.deploymentTransaction()?.hash
  };

  const fs = require("fs");
  const path = require("path");
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info
  fs.writeFileSync(
    path.join(deploymentsDir, `pledge-manager-${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployments/");

  // Test the contract with a sample influencer setup (optional)
  if (process.env.TEST_SETUP === "true") {
    console.log("🧪 Setting up test influencer...");
    
    const testInfluencer = "0x742d35Cc6634C0532925a3b8D6Ac9C43F533e3Ec"; // Sample address
    const ethThreshold = parseEther("1.0"); // 1 ETH threshold
    const usdcThreshold = parseUnits("1000", 6); // 1000 USDC threshold
    
    try {
      const setupTx = await pledgeManager.setInfluencerThreshold(
        testInfluencer,
        ethThreshold,
        usdcThreshold,
        "TestKing Token",
        "TKING",
        "Test King"
      );
      
      await setupTx.wait();
      console.log("✅ Test influencer setup complete");
      console.log("   Transaction:", setupTx.hash);
    } catch (error) {
      console.log("⚠️ Test setup failed (this is okay):", error.message);
    }
  }

  // If we're on a live network, verify the contract
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await pledgeManager.deploymentTransaction()?.wait(5);

    console.log("🔍 Verifying contract on BaseScan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          config.tokenFactory,
          config.usdc
        ],
      });
      console.log("✅ Contract verified on BaseScan!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update PLEDGE_MANAGER_ADDRESS in your .env file:");
  console.log(`   PLEDGE_MANAGER_ADDRESS=${contractAddress}`);
  console.log("2. Update the backend routes with the new ABI");
  console.log("3. Add the pledge routes to your main server file:");
  console.log("   app.use('/api/pledge', require('./routes/pledgeRoutes'));");
  console.log("4. Run the database schema updates");
  console.log("5. Test the pledge flow on the frontend");

  // Output useful contract interaction examples
  console.log("\n🔧 Contract Interaction Examples:");
  console.log("// Setup an influencer for pledging:");
  console.log(`await pledgeManager.setInfluencerThreshold(`);
  console.log(`  "0xInfluencerAddress",`);
  console.log(`  ethers.parseEther("5.0"), // 5 ETH threshold`);
  console.log(`  ethers.parseUnits("10000", 6), // 10,000 USDC threshold`);
  console.log(`  "Logan Paul Token",`);
  console.log(`  "LOGAN",`);
  console.log(`  "Logan Paul"`);
  console.log(`);`);
  
  console.log("\n// User pledge ETH:");
  console.log(`await pledgeManager.pledgeToInfluencer("0xInfluencerAddress", {`);
  console.log(`  value: ethers.parseEther("0.5") // 0.5 ETH`);
  console.log(`});`);

  return {
    contractAddress,
    deploymentInfo
  };
}

// Error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });