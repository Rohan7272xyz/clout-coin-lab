// scripts/deploy-token-factory.js
// Deployment script for the Token Factory contract

const hre = require("hardhat");
const { parseEther } = require("ethers");

async function main() {
  console.log("🚀 Deploying Token Factory to Base L2...");

  // Get the contract factory
  const TokenFactory = await hre.ethers.getContractFactory("TokenFactory");

  // Configuration
  const config = {
    treasury: "0x1234567890123456789012345678901234567890", // Replace with actual treasury address
    platform: "0x0987654321098765432109876543210987654321", // Replace with actual platform address  
    creationFee: parseEther("0.01") // 0.01 ETH fee to create a token
  };

  console.log("📋 Deployment Configuration:");
  console.log(`   Treasury: ${config.treasury}`);
  console.log(`   Platform: ${config.platform}`);
  console.log(`   Creation Fee: ${hre.ethers.formatEther(config.creationFee)} ETH`);

  // Deploy the contract
  const tokenFactory = await TokenFactory.deploy(
    config.treasury,
    config.platform,
    config.creationFee
  );

  await tokenFactory.waitForDeployment();

  const contractAddress = await tokenFactory.getAddress();

  console.log("✅ Token Factory deployed to:", contractAddress);

  // Verify deployment
  console.log("🔍 Verifying deployment...");
  const factoryInfo = await tokenFactory.getFactoryInfo();
  console.log("   Treasury:", factoryInfo[0]);
  console.log("   Platform:", factoryInfo[1]);
  console.log("   Creation Fee:", hre.ethers.formatEther(factoryInfo[2]), "ETH");
  console.log("   Total Tokens Created:", factoryInfo[3].toString());

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: contractAddress,
    treasury: config.treasury,
    platform: config.platform,
    creationFee: config.creationFee.toString(),
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address
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
    path.join(deploymentsDir, `token-factory-${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("💾 Deployment info saved to deployments/");

  // If we're on a live network, verify the contract
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("⏳ Waiting for block confirmations...");
    await tokenFactory.deploymentTransaction().wait(5);

    console.log("🔍 Verifying contract on BaseScan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [
          config.treasury,
          config.platform,
          config.creationFee
        ],
      });
      console.log("✅ Contract verified on BaseScan!");
    } catch (error) {
      console.log("❌ Verification failed:", error.message);
    }
  }

  console.log("\n🎉 Deployment Complete!");
  console.log("\n📝 Next Steps:");
  console.log("1. Update TOKEN_FACTORY_ADDRESS in your frontend:");
  console.log(`   const TOKEN_FACTORY_ADDRESS = "${contractAddress}";`);
  console.log("2. Update the ABI in your frontend with the compiled ABI");
  console.log("3. Test token creation on the frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });