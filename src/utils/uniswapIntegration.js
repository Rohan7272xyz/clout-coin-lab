// File: src/utils/uniswapIntegration.js
// Frontend Uniswap integration for executing swaps

import { ethers } from 'ethers';
import { useState, useEffect } from 'react';

// Uniswap V2 Router ABI (minimal for swapExactETHForTokens)
const UNISWAP_V2_ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)"
];

const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

export class UniswapIntegration {
  constructor(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    this.router = new ethers.Contract(UNISWAP_V2_ROUTER, UNISWAP_V2_ROUTER_ABI, signer);
  }

  // Get estimated output tokens for ETH input
  async getEstimatedTokensOut(ethAmount, tokenAddress) {
    try {
      const path = [WETH_ADDRESS, tokenAddress];
      const amountIn = ethers.utils.parseEther(ethAmount.toString());
      
      const amounts = await this.router.getAmountsOut(amountIn, path);
      return ethers.utils.formatUnits(amounts[1], 18); // Assuming 18 decimals
    } catch (error) {
      console.error("Error getting estimated tokens:", error);
      throw error;
    }
  }

  // Execute swap: ETH -> Token
  async swapETHForTokens(ethAmount, tokenAddress, minTokensOut, userAddress) {
    try {
      const path = [WETH_ADDRESS, tokenAddress];
      const amountIn = ethers.utils.parseEther(ethAmount.toString());
      const amountOutMin = ethers.utils.parseEther(minTokensOut.toString());
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

      const tx = await this.router.swapExactETHForTokens(
        amountOutMin,
        path,
        userAddress,
        deadline,
        {
          value: amountIn,
          gasLimit: 300000 // Estimate gas limit
        }
      );

      return {
        hash: tx.hash,
        wait: () => tx.wait()
      };
    } catch (error) {
      console.error("Error executing swap:", error);
      throw error;
    }
  }

  // Get current token price in ETH
  async getTokenPrice(tokenAddress) {
    try {
      const oneToken = ethers.utils.parseEther("1");
      const path = [tokenAddress, WETH_ADDRESS];
      
      const amounts = await this.router.getAmountsOut(oneToken, path);
      return ethers.utils.formatEther(amounts[1]);
    } catch (error) {
      console.error("Error getting token price:", error);
      return "0";
    }
  }
}

// Hook for React components
export const useUniswapIntegration = () => {
  const [uniswap, setUniswap] = useState(null);

  useEffect(() => {
    const initUniswap = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        setUniswap(new UniswapIntegration(provider, signer));
      }
    };

    initUniswap();
  }, []);

  return uniswap;
};

// Helper function to add token to MetaMask
export const addTokenToMetaMask = async (tokenAddress, symbol, decimals = 18, image) => {
  try {
    const wasAdded = await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: tokenAddress,
          symbol: symbol,
          decimals: decimals,
          image: image,
        },
      },
    });

    if (wasAdded) {
      console.log('Token added to MetaMask');
      return true;
    } else {
      console.log('Token not added to MetaMask');
      return false;
    }
  } catch (error) {
    console.error('Error adding token to MetaMask:', error);
    return false;
  }
};