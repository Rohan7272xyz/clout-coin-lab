// src/lib/dashboard/dashboardAPI.ts - Enhanced version with better admin support
import { getAuth } from 'firebase/auth';
import { useState, useEffect } from 'react';

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
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
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
        message?: string;
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
        influencerInfo?: {
          name: string;
          handle: string;
          status: string;
          isApproved: boolean;
          pledgeThreshold: number;
          totalPledged: number;
          thresholdMet: boolean;
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
          status: string;
          isLaunched: boolean;
          hasWithdrawn: boolean;
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
          thresholdProgress: number;
        }>;
      }>('/api/dashboard/investor/pledges');
    },
  },

  // =======================
  // ENHANCED ADMIN ENDPOINTS
  // =======================
  admin: {
    // Get platform statistics - Enhanced version
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
        approvedInfluencers: number;
        totalPledgers: number;
        totalEthPledged: number;
        totalUsdcPledged: number;
      }>('/api/dashboard/admin/stats');
    },

    // Get pending approvals - Enhanced with progress
    getPendingApprovals: async () => {
      return apiCall<Array<{
        id: string;
        type: string;
        name: string;
        details: string;
        requestedAt: string;
        requestedBy: string;
        progress?: number;
        followers?: number;
        category?: string;
      }>>('/api/dashboard/admin/pending-approvals');
    },

    // Process approval - Enhanced with better response
    processApproval: async (id: string, approved: boolean) => {
      return apiCall<{
        success: boolean;
        message: string;
        influencer?: {
          id: string;
          name: string;
          handle: string;
          approved: boolean;
        };
      }>(`/api/dashboard/admin/approve/${id}`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      });
    },

    // Get recent platform activity
    getRecentActivity: async () => {
      return apiCall<Array<{
        type: string;
        description: string;
        timestamp: string;
        user: string;
        amount?: number;
      }>>('/api/dashboard/admin/recent-activity');
    },

    // Get user management data (for future implementation)
    getUsers: async (page = 1, limit = 50, status?: string, search?: string) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
        ...(search && { search })
      });
      
      return apiCall<{
        users: Array<{
          id: number;
          email: string;
          display_name: string;
          wallet_address: string;
          status: string;
          total_invested: number;
          created_at: string;
          updated_at: string;
        }>;
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>(`/api/dashboard/admin/users?${params}`);
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

// Enhanced useAdminDashboard hook
export const useAdminDashboard = () => {
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalInfluencers: number;
    totalTokens: number;
    totalVolume: number;
    totalFees: number;
    pendingApprovals: number;
    activeUsers24h: number;
    newUsersToday: number;
    approvedInfluencers: number;
    totalPledgers: number;
    totalEthPledged: number;
    totalUsdcPledged: number;
  } | null>(null);
  
  const [pendingApprovals, setPendingApprovals] = useState<Array<{
    id: string;
    type: string;
    name: string;
    details: string;
    requestedAt: string;
    requestedBy: string;
    progress?: number;
    followers?: number;
    category?: string;
  }> | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading admin dashboard data...');
      
      const [statsData, approvalsData] = await Promise.all([
        dashboardAPI.admin.getStats(),
        dashboardAPI.admin.getPendingApprovals(),
      ]);
      
      console.log('✅ Admin stats loaded:', statsData);
      console.log('✅ Pending approvals loaded:', approvalsData);
      
      setStats(statsData);
      setPendingApprovals(approvalsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      console.error('❌ Error loading admin dashboard:', err);
      
      // Provide fallback data to prevent complete dashboard failure
      setStats({
        totalUsers: 0,
        totalInfluencers: 0,
        totalTokens: 0,
        totalVolume: 0,
        totalFees: 0,
        pendingApprovals: 0,
        activeUsers24h: 0,
        newUsersToday: 0,
        approvedInfluencers: 0,
        totalPledgers: 0,
        totalEthPledged: 0,
        totalUsdcPledged: 0
      });
      setPendingApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const processApproval = async (id: string, approved: boolean) => {
    try {
      console.log(`🔄 Processing approval for ID ${id}: ${approved ? 'approved' : 'rejected'}`);
      
      const result = await dashboardAPI.admin.processApproval(id, approved);
      
      console.log('✅ Approval processed successfully:', result);
      
      // Refresh data after processing approval
      await loadData();
      return result;
    } catch (error) {
      console.error('❌ Error processing approval:', error);
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