// src/lib/dashboard/types.ts
export interface InfluencerStats {
  token: {
    address: string;
    name: string;
    symbol: string;
    totalSupply: number;
    myBalance: number;
    currentPrice: number;
    marketCap: number;
    myShareValue: number;
    holders: number;
    volume24h: number;
    priceChange24h: number;
  };
  investors: Investor[];
  recentActivity: Activity[];
}

export interface Investor {
  address: string;
  displayName: string;
  amount: number;
  value: number;
  joinDate: string;
  ethInvested: number;
}

export interface Activity {
  type: 'buy' | 'sell' | 'transfer' | 'pledge';
  user: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

export interface PortfolioHolding {
  tokenAddress: string;
  tokenSymbol: string;
  influencerName: string;
  amount: number;
  value: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
}

export interface UserPledge {
  influencerName: string;
  influencerAddress: string;
  ethAmount: number;
  usdcAmount: number;
  pledgeDate: string;
  status: 'pending' | 'approved' | 'launched';
}

export interface PlatformStats {
  totalUsers: number;
  totalInfluencers: number;
  totalTokens: number;
  totalVolume: number;
  totalFees: number;
  pendingApprovals: number;
  activeUsers24h: number;
  newUsersToday: number;
}