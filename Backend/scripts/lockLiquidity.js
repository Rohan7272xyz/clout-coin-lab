// File: scripts/lockLiquidity.js
// Place this in your backend scripts folder

const { ethers } = require("hardhat");

async function lockLiquidity(lpTokenAddress, amount, lockDurationMonths = 6) {
    const [deployer] = await ethers.getSigners();
    
    console.log("Locking LP tokens:", lpTokenAddress);
    console.log("Amount:", amount);
    console.log("Duration:", lockDurationMonths, "months");
    
    // Deploy locker contract if not deployed
    const LiquidityLocker = await ethers.getContractFactory("LiquidityLocker");
    const locker = await LiquidityLocker.deploy();
    await locker.deployed();
    
    console.log("Liquidity locker deployed to:", locker.address);
    
    // Get LP token contract
    const lpToken = await ethers.getContractAt("IERC20", lpTokenAddress);
    
    // Approve LP tokens for locker
    const approveTx = await lpToken.approve(locker.address, amount);
    await approveTx.wait();
    
    // Lock the LP tokens
    const lockDuration = lockDurationMonths * 30 * 24 * 60 * 60; // Convert months to seconds
    const lockTx = await locker.lockTokens(lpTokenAddress, amount, lockDuration);
    const receipt = await lockTx.wait();
    
    // Get lock ID from event
    const lockEvent = receipt.events.find(event => event.event === "TokensLocked");
    const lockId = lockEvent.args.lockId;
    
    console.log("LP tokens locked successfully");
    console.log("Lock ID:", lockId.toString());
    console.log("Unlock time:", new Date((Date.now() + lockDuration * 1000)).toISOString());
    
    return {
        lockerAddress: locker.address,
        lockId: lockId.toString(),
        txHash: receipt.transactionHash,
        unlockTime: Math.floor(Date.now() / 1000) + lockDuration
    };
}

module.exports = { lockLiquidity };