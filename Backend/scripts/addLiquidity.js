/ File: scripts/addLiquidity.js
// Place this in your backend scripts folder

const { ethers } = require("hardhat");

// Uniswap V2 Router address on Ethereum mainnet
const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
// WETH address on Ethereum mainnet
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

async function addLiquidity(tokenAddress, tokenAmount, ethAmount) {
    const [deployer] = await ethers.getSigners();
    
    console.log("Adding liquidity for token:", tokenAddress);
    console.log("Token amount:", tokenAmount);
    console.log("ETH amount:", ethAmount);
    
    // Get contract instances
    const token = await ethers.getContractAt("IERC20", tokenAddress);
    const router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
    
    // Approve tokens for router
    console.log("Approving tokens for Uniswap router...");
    const approveTx = await token.approve(UNISWAP_V2_ROUTER, tokenAmount);
    await approveTx.wait();
    console.log("Tokens approved");
    
    // Add liquidity
    console.log("Adding liquidity to Uniswap...");
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    
    const liquidityTx = await router.addLiquidityETH(
        tokenAddress,
        tokenAmount,
        0, // Accept any amount of tokens
        0, // Accept any amount of ETH
        deployer.address,
        deadline,
        { value: ethers.utils.parseEther(ethAmount.toString()) }
    );
    
    const receipt = await liquidityTx.wait();
    console.log("Liquidity added successfully");
    console.log("Transaction hash:", receipt.transactionHash);
    
    // Get the pair address
    const factory = await ethers.getContractAt("IUniswapV2Factory", await router.factory());
    const pairAddress = await factory.getPair(tokenAddress, WETH_ADDRESS);
    
    console.log("Liquidity pool address:", pairAddress);
    
    return {
        poolAddress: pairAddress,
        txHash: receipt.transactionHash,
        ethAmount,
        tokenAmount
    };
}

module.exports = { addLiquidity };