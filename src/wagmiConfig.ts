// src/wagmiConfig.ts - Updated to prioritize Base Sepolia for Token Factory
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, mainnet, polygon, sepolia, baseSepolia } from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required');
}

// Define chains with proper typing
const developmentChains: readonly [Chain, ...Chain[]] = [
  baseSepolia,  // First in list = default network
  sepolia,
  base,
  mainnet,
  polygon
] as const;

const productionChains: readonly [Chain, ...Chain[]] = [
  base,         // First in list = default network for production
  baseSepolia,  // Keep Base Sepolia available for token factory
  mainnet,
  polygon
] as const;

// Determine which chains to include based on environment
const getChains = () => {
  return import.meta.env.DEV ? developmentChains : productionChains;
};

export const config = getDefaultConfig({
  appName: 'CoinFluence',
  projectId,
  chains: getChains(),
  ssr: false,
});

// Export specific chain info for easy reference
export const SUPPORTED_CHAINS = {
  baseSepolia,
  base,
  mainnet,
  polygon,
  sepolia
};

export { baseSepolia };

// Export the chain ID for the token factory
export const TOKEN_FACTORY_CHAIN_ID = baseSepolia.id; // 84532