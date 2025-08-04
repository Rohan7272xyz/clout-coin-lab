import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, mainnet, polygon } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Meme Token Launcher',
  projectId: '7fbb746bd60b20cddfac272de0e92aaf', // get from cloud.walletconnect.com
  chains: [base, mainnet, polygon],
  ssr: false,
});
