// File: scripts/deployInfluencerToken.js
// Place this in your backend scripts folder

const { ethers } = require("hardhat");

async function deployInfluencerToken(name, symbol, influencerWallet) {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying token with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());
    
    const InfluencerToken = await ethers.getContractFactory("InfluencerToken");
    const token = await InfluencerToken.deploy(
        name,
        symbol,
        influencerWallet,
        deployer.address // liquidity wallet
    );
    
    await token.deployed();
    
    console.log("Token deployed to:", token.address);
    console.log("Influencer allocation sent to:", influencerWallet);
    console.log("Liquidity allocation held by:", deployer.address);
    
    return {
        contractAddress: token.address,
        deployTxHash: token.deployTransaction.hash,
        influencerWallet,
        liquidityWallet: deployer.address
    };
}

module.exports = { deployInfluencerToken };