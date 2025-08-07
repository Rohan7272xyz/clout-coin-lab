// src/hooks/usePledge.ts
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { pledgeApi } from '@/lib/pledge/api';
import type { InfluencerPledgeData, UserPledge, PlatformStats } from '@/lib/pledge/types';

export const useInfluencers = () => {
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
      setInfluencer(data);
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
      const data = await pledgeApi.getUserPledges(address);
      setPledges(data);
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
      const data = await pledgeApi.getPlatformStats();
      setStats(data);
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