// src/lib/dashboard/dashboardAPI.ts - Updated for your actual database schema
import { getAuth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Helper function to get authenticated headers
async function getAuthHeaders() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Helper function for API calls
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
}

// Dashboard API Service
export const dashboardAPI = {
  // =======================
  // INFLUENCER ENDPOINTS
  // =======================
  influencer: {
    // Get influencer stats (token info, holders, etc.)
    getStats: async () => {
      return apiCall<{
        hasToken: boolean;
        token?: {
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
          liquidityLocked: boolean;
          launchedAt: string;
        };
        investors: Array<{
          address: string;
          displayName: string;
          amount: number;
          value: number;
          joinDate: string;
          ethInvested: number;
        }>;
        recentActivity: Array<{
          type: string;
          user: string;
          amount: string;
          timestamp: string;
          txHash: string;
        }>;
        stats: {
          totalInvestors: number;
          totalEthRaised: number;
          averageInvestment: number;
        };
      }>('/api/dashboard/influencer/stats');
    },

    // Get influencer pledgers
    getPledgers: async () => {
      return apiCall<{
        pledgers: Array<{
          address: string;
          displayName: string;
          ethAmount: number;
          usdcAmount: number;
          pledgeDate: string;
          hasWithdrawn: boolean;
        }>;
        totals: {
          totalPledgers: number;
          totalEth: number;
          totalUsdc: number;
        };
      }>('/api/dashboard/influencer/pledgers');
    },

    // Gift tokens to users
    giftTokens: async (recipient: string, amount: number, message?: string) => {
      return apiCall<{
        success: boolean;
        message: string;
        txHash: string;
      }>('/api/dashboard/influencer/gift-tokens', {
        method: 'POST',
        body: JSON.stringify({ recipient, amount, message }),
      });
    },
  },

  // =======================
  // INVESTOR ENDPOINTS  
  // =======================
  investor: {
    // Get investor portfolio
    getPortfolio: async () => {
      return apiCall<{
        holdings: Array<{
          tokenAddress: string;
          tokenSymbol: string;
          influencerName: string;
          avatar: string;
          amount: number;
          value: number;
          costBasis: number;
          pnl: number;
          pnlPercent: number;
          purchaseDate: string;
          txHash: string;
        }>;
        summary: {
          totalValue: number;
          totalCost: number;
          totalPnL: number;
          totalPnLPercent: number;
          holdingsCount: number;
        };
      }>('/api/dashboard/investor/portfolio');
    },

    // Get investor pledges
    getPledges: async () => {
      return apiCall<{
        pledges: Array<{
          influencerName: string;
          influencerHandle: string;
          influencerAddress: string;
          avatar: string;
          ethAmount: number;
          usdcAmount: number;
          pledgeDate: string;
          status: string;
          hasWithdrawn: boolean;
          tokenAddress?: string;
        }>;
      }>('/api/dashboard/investor/pledges');
    },
  },

  // =======================
  // ADMIN ENDPOINTS
  // =======================
  admin: {
    // Get platform statistics
    getStats: async () => {
      return apiCall<{
        totalUsers: number;
        totalInfluencers: number;
        totalTokens: number;
        totalVolume: number;
        totalFees: number;
        pendingApprovals: number;
        activeUsers24h: number;
        newUsersToday: number;
      }>('/api/dashboard/admin/stats');
    },

    // Get pending approvals
    getPendingApprovals: async () => {
      return apiCall<Array<{
        id: string;
        type: string;
        name: string;
        details: string;
        requestedAt: string;
        requestedBy: string;
      }>>('/api/dashboard/admin/pending-approvals');
    },

    // Process approval
    processApproval: async (id: string, approved: boolean) => {
      return apiCall<{
        success: boolean;
        message: string;
      }>(`/api/dashboard/admin/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      });
    },
  },

  // =======================
  // GENERAL ENDPOINTS
  // =======================
  general: {
    // Get user's investment summary
    getUserSummary: async () => {
      return apiCall<{
        totalInvested: number;
        currentValue: number;
        totalPnL: number;
        totalPnLPercent: number;
        activePositions: number;
        userStatus: string;
      }>('/api/dashboard/user/summary');
    },

    // Get platform metrics
    getPlatformMetrics: async () => {
      return apiCall<{
        totalVolume: number;
        totalUsers: number;
        activeTokens: number;
        averageReturn: number;
      }>('/api/dashboard/platform/metrics');
    },
  },
};

// Custom hooks for dashboard data
export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async <T>(apiCall: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Dashboard data fetch error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { fetchData, loading, error };
};

// React hooks for each dashboard type
import { useState, useEffect } from 'react';

export const useInfluencerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pledgers, setPledgers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, pledgersData] = await Promise.all([
        dashboardAPI.influencer.getStats(),
        dashboardAPI.influencer.getPledgers(),
      ]);
      
      setStats(statsData);
      setPledgers(pledgersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Error loading influencer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const giftTokens = async (recipient: string, amount: number, message?: string) => {
    try {
      const result = await dashboardAPI.influencer.giftTokens(recipient, amount, message);
      // Refresh stats after successful gift
      await loadData();
      return result;
    } catch (error) {
      console.error('Error gifting tokens:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    stats,
    pledgers,
    loading,
    error,
    refreshData: loadData,
    giftTokens,
  };
};

export const useInvestorDashboard = () => {
  const [portfolio, setPortfolio] = useState(null);
  const [pledges, setPledges] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [portfolioData, pledgesData] = await Promise.all([
        dashboardAPI.investor.getPortfolio(),
        dashboardAPI.investor.getPledges(),
      ]);
      
      setPortfolio(portfolioData);
      setPledges(pledgesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Error loading investor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    portfolio,
    pledges,
    loading,
    error,
    refreshData: loadData,
  };
};

export const useAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statsData, approvalsData] = await Promise.all([
        dashboardAPI.admin.getStats(),
        dashboardAPI.admin.getPendingApprovals(),
      ]);
      
      setStats(statsData);
      setPendingApprovals(approvalsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const processApproval = async (id: string, approved: boolean) => {
    try {
      const result = await dashboardAPI.admin.processApproval(id, approved);
      // Refresh data after processing approval
      await loadData();
      return result;
    } catch (error) {
      console.error('Error processing approval:', error);
      throw error;
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return {
    stats,
    pendingApprovals,
    loading,
    error,
    refreshData: loadData,
    processApproval,
  };
};