// src/lib/api/dataService.ts - Centralized service for all database data
import { getAuth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function to get authenticated headers
async function getAuthHeaders() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  
  try {
    const token = await user.getIdToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { 'Content-Type': 'application/json' };
  }
}

// Helper function for API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

// Platform Statistics Interface
interface PlatformStats {
  // User metrics
  totalUsers: number;
  newUsersToday: number;
  activeUsers24h: number;
  userStatusBreakdown: {
    investors: number;
    influencers: number;
    admins: number;
  };
  
  // Influencer metrics
  totalInfluencers: number;
  approvedInfluencers: number;
  pendingApprovals: number;
  liveTokens: number;
  pledgingInfluencers: number;
  
  // Financial metrics
  totalVolume: number;
  totalFees: number;
  totalEthPledged: number;
  totalUsdcPledged: number;
  totalPledgers: number;
  averageInvestment: number;
  
  // Platform health
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
}

// Portfolio Interface
interface PortfolioData {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  activePositions: number;
  withdrawnPositions: number;
  holdings: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    influencerName: string;
    influencerAvatar: string;
    amount: number;
    value: number;
    costBasis: number;
    pnl: number;
    pnlPercent: number;
    purchaseDate: string;
    isLaunched: boolean;
  }>;
}

// Pledges Interface
interface PledgeData {
  totalPledges: number;
  totalEthPledged: number;
  totalUsdcPledged: number;
  activePledges: number;
  withdrawnPledges: number;
  pledges: Array<{
    id: number;
    influencerAddress: string;
    influencerName: string;
    influencerHandle: string;
    influencerAvatar: string;
    ethAmount: number;
    usdcAmount: number;
    pledgeDate: string;
    status: string;
    isWithdrawn: boolean;
    thresholdMet: boolean;
    isApproved: boolean;
    isLaunched: boolean;
  }>;
}

// Main Data Service
export const dataService = {
  // ======================
  // PLATFORM STATISTICS
  // ======================
  
  // Get comprehensive platform stats
  getPlatformStats: async (): Promise<PlatformStats> => {
    return apiCall<PlatformStats>('/api/platform/stats');
  },
  
  // Get real-time metrics
  getRealTimeMetrics: async () => {
    return apiCall('/api/platform/metrics/realtime');
  },
  
  // ======================
  // USER DATA
  // ======================
  
  // Get user's portfolio
  getUserPortfolio: async (userAddress?: string): Promise<PortfolioData> => {
    const endpoint = userAddress 
      ? `/api/user/${userAddress}/portfolio`
      : '/api/user/portfolio';
    return apiCall<PortfolioData>(endpoint);
  },
  
  // Get user's pledges
  getUserPledges: async (userAddress?: string): Promise<PledgeData> => {
    const endpoint = userAddress 
      ? `/api/user/${userAddress}/pledges`
      : '/api/user/pledges';
    return apiCall<PledgeData>(endpoint);
  },
  
  // Get user's transaction history
  getUserTransactions: async (userAddress?: string) => {
    const endpoint = userAddress 
      ? `/api/user/${userAddress}/transactions`
      : '/api/user/transactions';
    return apiCall(endpoint);
  },
  
  // ======================
  // INFLUENCER DATA
  // ======================
  
  // Get all influencers with real stats
  getAllInfluencers: async () => {
    return apiCall('/api/influencers/all');
  },
  
  // Get trending influencers
  getTrendingInfluencers: async () => {
    return apiCall('/api/influencers/trending');
  },
  
  // Get influencer by ID/address with real data
  getInfluencer: async (identifier: string) => {
    return apiCall(`/api/influencer/${identifier}`);
  },
  
  // Get influencer statistics
  getInfluencerStats: async (address: string) => {
    return apiCall(`/api/influencer/${address}/stats`);
  },
  
  // ======================
  // PLEDGE SYSTEM DATA
  // ======================
  
  // Get all pledge-enabled influencers
  getPledgeInfluencers: async () => {
    return apiCall('/api/pledge/influencers');
  },
  
  // Submit pledge
  submitPledge: async (pledgeData: {
    userAddress: string;
    influencerAddress: string;
    amount: string;
    currency: 'ETH' | 'USDC';
    txHash?: string;
  }) => {
    return apiCall('/api/pledge/submit', {
      method: 'POST',
      body: JSON.stringify(pledgeData),
    });
  },
  
  // Withdraw pledge
  withdrawPledge: async (withdrawalData: {
    userAddress: string;
    influencerAddress: string;
    txHash?: string;
  }) => {
    return apiCall('/api/pledge/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawalData),
    });
  },
  
  // ======================
  // ADMIN DATA
  // ======================
  
  // Get admin dashboard stats
  getAdminStats: async () => {
    return apiCall('/api/admin/stats');
  },
  
  // Get pending approvals
  getPendingApprovals: async () => {
    return apiCall('/api/admin/approvals');
  },
  
  // Get recent activity
  getRecentActivity: async () => {
    return apiCall('/api/admin/activity');
  },
  
  // Get all users (admin only)
  getAllUsers: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    
    return apiCall(`/api/admin/users?${searchParams}`);
  },
  
  // ======================
  // TRADING DATA
  // ======================
  
  // Get trading pairs
  getTradingPairs: async () => {
    return apiCall('/api/trading/pairs');
  },
  
  // Get price data
  getPriceData: async (tokenAddress: string) => {
    return apiCall(`/api/trading/price/${tokenAddress}`);
  },
  
  // Get market data
  getMarketData: async () => {
    return apiCall('/api/trading/market');
  }
};

// React Hooks for Data
export const useRealTimeStats = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getPlatformStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      console.error('Stats loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, error, refresh: loadStats };
};

export const useUserPortfolio = (userAddress?: string) => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getUserPortfolio(userAddress);
      setPortfolio(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio');
      console.error('Portfolio loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [userAddress]);

  return { portfolio, loading, error, refresh: loadPortfolio };
};

export const useUserPledges = (userAddress?: string) => {
  const [pledges, setPledges] = useState<PledgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPledges = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getUserPledges(userAddress);
      setPledges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pledges');
      console.error('Pledges loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPledges();
  }, [userAddress]);

  return { pledges, loading, error, refresh: loadPledges };
};

// Add React import
import { useState, useEffect } from 'react';