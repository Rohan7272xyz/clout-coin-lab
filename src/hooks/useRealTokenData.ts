// src/hooks/useRealTokenData.ts - Fixed TypeScript errors
import { useState, useEffect } from "react";

// Interfaces
interface TokenDatabaseRecord {
  id: number;
  name: string;
  handle: string;
  token_name: string;
  token_symbol: string;
  avatar: string;
  category: string;
  description: string;
  followers: string;
  verified: boolean;
  status: 'live' | 'test' | 'pending';
  contract_address?: string;
  network?: string;
  wallet_address?: string;
  launched_at?: string;
  website?: string;
  headquarters?: string;
}

interface LiveContractData {
  currentPrice: string;
  priceChange24h: string;
  priceChangePct24h: number;
  marketCap: string;
  volume24h: string;
  totalSupply: string;
  circulatingSupply: string;
  holderCount: number;
  transactions24h: number;
  liquidity: string;
  lastUpdated: string;
}

interface CombinedTokenData extends TokenDatabaseRecord {
  liveData?: LiveContractData;
  isLive: boolean;
}

// Helper function to create fallback data for live tokens when blockchain API fails
const createFallbackLiveData = (dbData: TokenDatabaseRecord): LiveContractData => {
  return {
    currentPrice: "0.000001",
    priceChange24h: "+0.000000",
    priceChangePct24h: 0.0,
    marketCap: "1000000",
    volume24h: "0",
    totalSupply: "1000000",
    circulatingSupply: "700000",
    holderCount: 2,
    transactions24h: 0,
    liquidity: "0",
    lastUpdated: new Date().toISOString()
  };
};

// Main hook
const useRealTokenData = (tokenId: string) => {
  const [tokenData, setTokenData] = useState<CombinedTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRealTokenData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Fetching real data for token: ${tokenId}`);
      
      const response = await fetch(`/api/influencer/coin/${tokenId}`);
      if (!response.ok) {
        throw new Error(`Token not found: ${response.status}`);
      }

      const dbData: TokenDatabaseRecord = await response.json();
      console.log('📊 Database data:', dbData);

      const isLiveToken = dbData.status === 'live' && !!dbData.contract_address;

      let liveContractData: LiveContractData | undefined;

      if (isLiveToken && dbData.contract_address) {
        console.log(`🔗 Fetching live blockchain data for contract: ${dbData.contract_address}`);
        
        try {
          const contractResponse = await fetch(`/api/contract/analytics/${dbData.contract_address}?network=${dbData.network || 'base-sepolia'}`);
          
          if (contractResponse.ok) {
            liveContractData = await contractResponse.json();
            console.log('⚡ Live contract data:', liveContractData);
          } else {
            console.warn('⚠️ Could not fetch live contract data, using fallback');
            liveContractData = createFallbackLiveData(dbData);
          }
        } catch (contractError) {
          console.error('❌ Error fetching contract data:', contractError);
          liveContractData = createFallbackLiveData(dbData);
        }
      }

      const combinedData: CombinedTokenData = {
        ...dbData,
        liveData: liveContractData,
        isLive: isLiveToken
      };

      setTokenData(combinedData);
      console.log('✅ Final combined data:', combinedData);

    } catch (err) {
      console.error('❌ Error fetching token data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch token data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenId && tokenId !== 'test') {
      fetchRealTokenData();
    }
  }, [tokenId]);

  const refreshData = () => {
    if (tokenId && tokenId !== 'test') {
      fetchRealTokenData();
    }
  };

  return {
    tokenData,
    loading,
    error,
    refreshData,
    isLive: tokenData?.isLive || false
  };
};

export default useRealTokenData;
export type { TokenDatabaseRecord, LiveContractData, CombinedTokenData };