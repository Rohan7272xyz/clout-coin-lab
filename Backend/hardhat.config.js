// File: hardhat.config.js
// Place this in your backend root folder

require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.19",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },
    networks: {
        hardhat: {
            // Local development network
        },
        mainnet: {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
            accounts: [process.env.PRIVATE_KEY],
            gasPrice: "auto"
        },
        goerli: {
            url: `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
            accounts: [process.env.PRIVATE_KEY]
        },
        sepolia: {
            url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
            accounts: [process.env.PRIVATE_KEY]
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    }
};