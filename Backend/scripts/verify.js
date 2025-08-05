// File: scripts/verify.js
// Place this in your backend scripts folder

const hre = require("hardhat");

async function verifyContract(contractAddress, constructorArgs) {
    console.log("Verifying contract at:", contractAddress);
    console.log("Constructor args:", constructorArgs);
    
    try {
        await hre.run("verify:verify", {
            address: contractAddress,
            constructorArguments: constructorArgs,
        });
        console.log("Contract verified successfully on Etherscan");
        return true;
    } catch (error) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log("Contract is already verified");
            return true;
        }
        console.error("Verification failed:", error.message);
        return false;
    }
}

// Example usage function
async function verifyInfluencerToken(contractAddress, name, symbol, influencerWallet, liquidityWallet) {
    return await verifyContract(contractAddress, [
        name,
        symbol,
        influencerWallet,
        liquidityWallet
    ]);
}

module.exports = { verifyContract, verifyInfluencerToken };
