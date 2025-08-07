// src/lib/pledge/types.ts
export interface InfluencerPledgeData {
    address: string;
    name: string;
    tokenName: string;
    symbol: string;
    totalPledgedETH: string;
    totalPledgedUSDC: string;
    thresholdETH: string;
    thresholdUSDC: string;
    pledgerCount: number;
    thresholdMet: boolean;
    isApproved: boolean;
    isLaunched: boolean;
    tokenAddress?: string;
    createdAt: number;
    launchedAt?: number;
    
    // Additional UI data from database
    avatar?: string;
    followers?: string;
    category?: string;
    description?: string;
    verified?: boolean;
  }
  
  export interface UserPledge {
    ethAmount: string;
    usdcAmount: string;
    hasWithdrawn: boolean;
    pledgedAt: number;
    influencerAddress: string;
    influencerName?: string;
    tokenName?: string;
    symbol?: string;
    isLaunched?: boolean;
    tokenAddress?: string;
  }
  
  export interface PledgeProgress {
    totalETH: string;
    totalUSDC: string;
    thresholdETH: string;
    thresholdUSDC: string;
    pledgerCount: number;
    thresholdMet: boolean;
    isApproved: boolean;
    isLaunched: boolean;
    ethProgress: number;      // Calculated percentage
    usdcProgress: number;     // Calculated percentage
    overallProgress: number;  // Max of ETH/USDC progress
  }
  
  export interface PlatformStats {
    totalInfluencers: number;
    launchedTokens: number;
    approvedInfluencers: number;
    totalPledgedETH: string;
    totalPledgedUSDC: string;
    totalPledgers: number;
    pendingApprovals: number;
  }
  
  export interface AdminSetupRequest {
    influencerAddress: string;
    ethThreshold: string;
    usdcThreshold: string;
    tokenName: string;
    symbol: string;
    influencerName: string;
  }
  
  export interface ApiResponse<T> {
    success?: boolean;
    data?: T;
    error?: string;
    message?: string;
  }
  
  export interface PledgeEvent {
    id: number;
    eventType: 'pledge_made' | 'threshold_reached' | 'approved' | 'launched' | 'withdrawn';
    influencerAddress: string;
    userAddress?: string;
    ethAmount?: string;
    usdcAmount?: string;
    txHash?: string;
    blockNumber?: number;
    eventData?: Record<string, any>;
    createdAt: string;
  }
  
  // Wagmi/Contract specific types
  export interface ContractWriteArgs {
    address: `0x${string}`;
    abi: readonly any[];
    functionName: string;
    args?: readonly any[];
    value?: bigint;
  }
  
  export interface TransactionStatus {
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    error?: Error;
    hash?: `0x${string}`;
  }