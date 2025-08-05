// src/wagmiConfig.ts - Updated with environment variables
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, mainnet, polygon, sepolia } from 'wagmi/chains';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is required');
}

export const config = getDefaultConfig({
  appName: 'Token Factory',
  projectId,
  chains: [
    mainnet,
    base,
    polygon,
    ...(import.meta.env.DEV ? [sepolia] : []) // Include testnets in development
  ],
  ssr: false,
});