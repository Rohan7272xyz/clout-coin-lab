// Backend/hardhat.config.js - Enhanced with Base Mainnet Support
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Local Hardhat Network (for development)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    
    // Base Sepolia Testnet (free testnet ETH)
    "base-sepolia": {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532,
      gasPrice: "auto",
      gas: "auto",
      timeout: 60000,
      confirmations: 2,
    },
    
    // Base Mainnet (REAL ETH - COSTS MONEY!)
    "base": {
      url: process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453,
      gasPrice: "auto",
      gas: "auto", 
      timeout: 120000, // Longer timeout for mainnet
      confirmations: 3, // More confirmations for mainnet
    }
  },
  
  // Etherscan verification (for contract verification)
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      "base-sepolia": process.env.BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org"
        }
      },
      {
        network: "base-sepolia", 
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  },

  // Gas reporter (to estimate costs)
  gasReporter: {
    enabled: true,
    currency: "USD",
    gasPrice: 20, // gwei
    showTimeSpent: true,
  },

  // Contract size limits
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  }
};