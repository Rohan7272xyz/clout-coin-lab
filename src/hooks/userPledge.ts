// src/hooks/usePledge.ts
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { pledgeApi } from '@/lib/pledge/api';
import type { InfluencerPledgeData, UserPledge, PlatformStats, InfluencerCategory } from '@/lib/pledge/types';

// Utility to map category string to InfluencerCategory
const validCategories = [
  'Cryptocurrency & Blockchain',
  'Technology & Innovation',
  'Fitness & Wellness',
  'Entertainment & Media',
  'Business & Finance',
  'Gaming & Esports',
  'Fashion & Lifestyle',
  'Education & Learning',
  'Food & Cooking',
  'Travel & Adventure',
  'Art & Design',
  'Music & Audio',
  'Sports & Athletics',
  'Science & Research',
  'Politics & Current Events',
];
function toInfluencerCategory(category: any): InfluencerCategory | undefined {
  return validCategories.includes(category) ? category as InfluencerCategory : undefined;
}

export const useInfluencers = () => {
  const [influencers, setInfluencers] = useState<InfluencerPledgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInfluencers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pledgeApi.getAllInfluencers();
      // Transform category to InfluencerCategory (or undefined if not valid)
      const validCategories = [
        'Cryptocurrency & Blockchain',
        'Technology & Innovation',
        'Fitness & Wellness',
        'Entertainment & Media',
        'Business & Finance',
        'Gaming & Esports',
        'Fashion & Lifestyle',
        'Education & Learning',
        'Food & Cooking',
        'Travel & Adventure',
        'Art & Design',
        'Music & Audio',
        'Sports & Athletics',
        'Science & Research',
        'Politics & Current Events',
      ];
      function toInfluencerCategory(category: any): InfluencerCategory | undefined {
        return validCategories.includes(category) ? category as InfluencerCategory : undefined;
      }
      setInfluencers(
        data.map((inf: any) => ({
          ...inf,
          category: toInfluencerCategory(inf.category),
        }))
      );
    } catch (err) {
      console.error('Error loading influencers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfluencers();
  }, []);

  return {
    influencers,
    loading,
    error,
    refetch: loadInfluencers
  };
};

export const useInfluencer = (address: string) => {
  const [influencer, setInfluencer] = useState<InfluencerPledgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInfluencer = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pledgeApi.getInfluencer(address);
      setInfluencer({
        ...data,
        category: toInfluencerCategory(data.category),
      });
    } catch (err) {
      console.error('Error loading influencer:', err);
      setError(err instanceof Error ? err.message : 'Failed to load influencer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadInfluencer();
    }
  }, [address]);

  return {
    influencer,
    loading,
    error,
    refetch: loadInfluencer
  };
};

export const useUserPledges = () => {
  const { address } = useAccount();
  const [pledges, setPledges] = useState<UserPledge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPledges = async () => {
    if (!address) return;
    
    try {
      setLoading(true);
      setError(null);
      const { pledges } = await pledgeApi.getUserPledges(address);
      setPledges(
        pledges.map((pledge: any) => ({
          ...pledge,
          category: toInfluencerCategory(pledge.category),
        }))
      );
    } catch (err) {
      console.error('Error loading user pledges:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pledges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadPledges();
    }
  }, [address]);

  return {
    pledges,
    loading,
    error,
    refetch: loadPledges
  };
};

export const usePlatformStats = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      // The API returns snake_case keys, so we type as 'any' and map to our camelCase PlatformStats
      const data: any = await pledgeApi.getPlatformStats();
      const mappedStats = {
        totalInfluencers: data.total_influencers,
        launchedTokens: data.launched_tokens,
        approvedInfluencers: data.approved_influencers,
        totalPledgedETH: data.total_eth_pledged,
        totalPledgedUSDC: data.total_usdc_pledged,
        totalPledgers: data.total_pledgers,
        pendingApprovals: data.pending_approvals ?? 0,
      };
      setStats(mappedStats);
    } catch (err) {
      console.error('Error loading platform stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return {
    stats,
    loading,
    error,
    refetch: loadStats
  };
};

// Utility hook for pledge calculations
export const usePledgeCalculations = (influencer: InfluencerPledgeData | null) => {
  if (!influencer) {
    return {
      ethProgress: 0,
      usdcProgress: 0,
      overallProgress: 0,
      isComplete: false,
      remainingETH: '0',
      remainingUSDC: '0'
    };
  }

  const ethCurrent = parseFloat(influencer.totalPledgedETH);
  const ethThreshold = parseFloat(influencer.thresholdETH);
  const usdcCurrent = parseFloat(influencer.totalPledgedUSDC);
  const usdcThreshold = parseFloat(influencer.thresholdUSDC);

  const ethProgress = ethThreshold > 0 ? Math.min((ethCurrent / ethThreshold) * 100, 100) : 0;
  const usdcProgress = usdcThreshold > 0 ? Math.min((usdcCurrent / usdcThreshold) * 100, 100) : 0;
  const overallProgress = Math.max(ethProgress, usdcProgress);

  const isComplete = influencer.thresholdMet;
  const remainingETH = Math.max(0, ethThreshold - ethCurrent).toString();
  const remainingUSDC = Math.max(0, usdcThreshold - usdcCurrent).toString();

  return {
    ethProgress,
    usdcProgress,
    overallProgress,
    isComplete,
    remainingETH,
    remainingUSDC
  };
};