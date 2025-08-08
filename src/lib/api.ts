// src/lib/pledge/api.ts - Frontend API integration for pledge system
import { getAuth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Types
export interface InfluencerPledgeData {
  address: string;
  name: string;
  handle: string;
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
  
  // UI data
  avatar?: string;
  followers?: string;
  category?: string;
  description?: string;
  verified?: boolean;
}

export interface UserPledge {
  id: number;
  influencerAddress: string;
  influencerName: string;
  influencerHandle: string;
  avatar?: string;
  category?: string;
  description?: string;
  verified: boolean;
  ethAmount: string;
  usdcAmount: string;
  hasWithdrawn: boolean;
  pledgedAt: string;
  txHash?: string;
  status: string;
  isApproved: boolean;
  isLaunched: boolean;
  tokenAddress?: string;
}

export interface PlatformStats {
  total_influencers: number;
  active_pledging: number;
  approved_influencers: number;
  launched_tokens: number;
  total_eth_pledged: string;
  total_usdc_pledged: string;
  total_pledgers: number;
}

// Helper function to get authenticated headers
async function getAuthHeaders() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return {};
  
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

// Main API functions
export const pledgeApi = {
  // Get all influencers available for pledging
  getAllInfluencers: async (): Promise<InfluencerPledgeData[]> => {
    return apiCall<InfluencerPledgeData[]>('/api/pledge/influencers');
  },

  // Get specific influencer
  getInfluencer: async (address: string): Promise<InfluencerPledgeData> => {
    return apiCall<InfluencerPledgeData>(`/api/pledge/influencer/${address}`);
  },

  // Submit a pledge
  submitPledge: async (pledge: {
    userAddress: string;
    influencerAddress: string;
    amount: string;
    currency: 'ETH' | 'USDC';
    txHash?: string;
    blockNumber?: number;
  }) => {
    return apiCall('/api/pledge/submit', {
      method: 'POST',
      body: JSON.stringify(pledge),
    });
  },

  // Get user pledges
  getUserPledges: async (userAddress: string): Promise<{ pledges: UserPledge[] }> => {
    return apiCall<{ pledges: UserPledge[] }>(`/api/pledge/user/${userAddress}`);
  },

  // Withdraw a pledge
  withdrawPledge: async (withdrawal: {
    influencerAddress: string;
    userAddress: string;
    txHash?: string;
  }) => {
    return apiCall('/api/pledge/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawal),
    });
  },

  // Get platform statistics
  getPlatformStats: async (): Promise<PlatformStats> => {
    return apiCall<PlatformStats>('/api/pledge/stats');
  },

  // Admin functions
  admin: {
    // Setup influencer for pledging
    setupInfluencer: async (setup: {
      influencerAddress: string;
      ethThreshold: string;
      usdcThreshold: string;
      tokenName: string;
      tokenSymbol: string;
      influencerName: string;
    }) => {
      return apiCall('/api/pledge/admin/setup', {
        method: 'POST',
        body: JSON.stringify(setup),
      });
    },

    // Approve influencer
    approveInfluencer: async (address: string) => {
      return apiCall(`/api/pledge/admin/approve/${address}`, {
        method: 'POST',
      });
    },

    // Launch token
    launchToken: async (address: string, data: {
      tokenAddress: string;
      txHash?: string;
    }) => {
      return apiCall(`/api/pledge/admin/launch/${address}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  }
};

// Utility functions for calculations and formatting
export const formatPledgeAmount = (amount: string, currency = 'ETH', decimals = 4): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  
  if (currency === 'USDC') {
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 2 
    });
  }
  
  return num.toFixed(decimals);
};

export const calculateProgress = (current: string, threshold: string): number => {
  const currentNum = parseFloat(current);
  const thresholdNum = parseFloat(threshold);
  
  if (thresholdNum === 0) return 0;
  return Math.min((currentNum / thresholdNum) * 100, 100);
};

export const getStatusText = (influencer: InfluencerPledgeData): string => {
  if (influencer.isLaunched) return 'Token is live and trading';
  if (influencer.isApproved) return 'Approved and ready for launch';
  if (influencer.thresholdMet) return 'Threshold reached, awaiting approval';
  return 'Collecting pledges';
};

export const getStatusColor = (influencer: InfluencerPledgeData): string => {
  if (influencer.isLaunched) return 'text-green-400';
  if (influencer.isApproved) return 'text-blue-400';
  if (influencer.thresholdMet) return 'text-yellow-400';
  return 'text-gray-400';
};

// React hooks for pledge data
export const usePledgeData = () => {
  const [influencers, setInfluencers] = useState<InfluencerPledgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInfluencers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pledgeApi.getAllInfluencers();
      setInfluencers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => loadInfluencers();

  return {
    influencers,
    loading,
    error,
    refreshData
  };
};

// Hook for user pledges
export const useUserPledges = (userAddress?: string) => {
  const [pledges, setPledges] = useState<UserPledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPledges = async () => {
    if (!userAddress) return;
    
    try {
      setLoading(true);
      setError(null);
      const { pledges: data } = await pledgeApi.getUserPledges(userAddress);
      setPledges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pledges');
    } finally {
      setLoading(false);
    }
  };

  const refreshPledges = () => loadPledges();

  return {
    pledges,
    loading,
    error,
    refreshPledges,
    loadPledges
  };
};

// Hook for platform stats
export const usePlatformStats = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pledgeApi.getPlatformStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = () => loadStats();

  return {
    stats,
    loading,
    error,
    refreshStats
  };
};

// Add missing imports for React hooks
import { useState } from 'react';