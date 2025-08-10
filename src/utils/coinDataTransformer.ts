// src/utils/coinDataTransformer.ts
// Transforms API responses to match CoinDetail component's expected data structure

import { 
  QuoteResponse, 
  ChartResponse, 
  PerformanceData, 
  StatisticsResponse, 
  NewsResponse, 
  ProfileResponse,
  NewsItem,
  ChartDataPoint
} from '@/services/analyticsAPI';

// Import the existing CoinData interface from CoinDetail
export interface CoinData {
  id: number;
  name: string;
  handle: string;
  tokenName: string;
  symbol: string;
  avatar: string;
  category: string;
  description: string;
  followers: string;
  verified: boolean;
  website?: string;
  headquarters?: string;
  employees?: number;
  
  // Enhanced trading data
  currentPrice: string;
  priceChange24h: string;
  priceChangePct24h: number;
  marketStatus: string;
  marketStatusTime: string;
  afterHoursPrice?: string;
  afterHoursChange?: string;
  afterHoursPct?: string;
  afterHoursTime?: string;
  
  // Comprehensive stats
  previousClose: string;
  open: string;
  bid: { price: string; size: number };
  ask: { price: string; size: number };
  dayRange: { low: string; high: string };
  fiftyTwoWeekRange: { low: string; high: string };
  marketCap: string;
  volume24h: string;
  avgVolume: string;
  beta: string;
  peRatio: string;
  eps: string;
  earningsDate: string;
  dividend: string;
  exDividendDate: string;
  targetPrice: string;
  
  // Supply data
  totalSupply: string;
  circulatingSupply: string;
  maxSupply?: string;
  
  // Contract info
  contractAddress: string;
  poolAddress?: string;
  liquidityLocked: boolean;
  lockUntil: string;
  
  // Status
  isLive: boolean;
  etherscanVerified: boolean;
  
  // Additional data for enhanced features
  allTimeHigh: { price: string; date: string };
  popularityRank?: number;
  typicalHoldTime?: string;
  tradingActivity?: { buy: number; sell: number };
}

export interface NewsItemTransformed {
  id: string;
  source: string;
  time: string;
  headline: string;
  snippet: string;
  url: string;
  type: 'news' | 'press' | 'sec';
  thumbnail?: string;
}

export interface ChartDataPointTransformed {
  timestamp: number;
  price: number;
  volume?: number;
}

export class CoinDataTransformer {
  
  /**
   * Transform API responses into CoinData format for CoinDetail component
   */
  static transformToCoinData(
    quote: QuoteResponse | null,
    profile: ProfileResponse | null,
    statistics: StatisticsResponse | null,
    performance: PerformanceData | null
  ): CoinData | null {
    
    if (!quote && !profile) {
      return null; // Need at least quote or profile data
    }

    // Get data from available sources
    const tokenId = quote?.tokenId || profile?.tokenId || 0;
    const tokenData = profile?.profile;
    const statsData = statistics?.statistics;
    const perfData = performance?.performance;

    // Build the CoinData object
    const coinData: CoinData = {
      // Basic info - prioritize profile data, fallback to quote
      id: tokenId,
      name: tokenData?.name || quote?.name || 'Unknown Token',
      handle: `@${(tokenData?.name || quote?.name || 'unknown').toLowerCase()}`,
      tokenName: tokenData?.name || quote?.name || 'Unknown Token',
      symbol: tokenData?.ticker || quote?.symbol || 'UNKNOWN',
      avatar: tokenData?.logo_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${tokenId}`,
      category: tokenData?.category || 'Content Creator',
      description: tokenData?.description || 'Professional content creator and influencer',
      followers: '0', // Would need to come from influencer data
      verified: true, // Default to verified for launched tokens
      website: tokenData?.website_url,
      headquarters: tokenData?.headquarters,
      employees: tokenData?.employees,
      
      // Trading data from quote
      currentPrice: quote?.price ? quote.price.toFixed(6) : '0.000000',
      priceChange24h: quote?.change24h ? 
        (quote.change24h >= 0 ? `+${quote.change24h.toFixed(6)}` : quote.change24h.toFixed(6)) : 
        '+0.000000',
      priceChangePct24h: quote?.changePercent24h || 0,
      marketStatus: 'Market Open',
      marketStatusTime: quote?.lastUpdated ? new Date(quote.lastUpdated).toLocaleString() : new Date().toLocaleString(),
      
      // After hours data (not available in current API, using defaults)
      afterHoursPrice: undefined,
      afterHoursChange: undefined,
      afterHoursPct: undefined,
      afterHoursTime: undefined,
      
      // Comprehensive stats - use quote data with statistics fallbacks
      previousClose: quote?.prevClose ? quote.prevClose.toFixed(6) : '0.000000',
      open: quote?.price ? quote.price.toFixed(6) : '0.000000', // Use current price as fallback for open
      bid: {
        price: quote?.bidPrice ? quote.bidPrice.toFixed(6) : (quote?.price ? (quote.price * 0.999).toFixed(6) : '0.000000'),
        size: quote?.bidQty || 1500
      },
      ask: {
        price: quote?.askPrice ? quote.askPrice.toFixed(6) : (quote?.price ? (quote.price * 1.001).toFixed(6) : '0.000000'),
        size: quote?.askQty || 2300
      },
      dayRange: {
        low: quote?.dayLow ? quote.dayLow.toFixed(6) : '0.000000',
        high: quote?.dayHigh ? quote.dayHigh.toFixed(6) : '0.000000'
      },
      fiftyTwoWeekRange: {
        low: statsData?.week_52_low ? statsData.week_52_low.toFixed(6) : '0.000000',
        high: statsData?.week_52_high ? statsData.week_52_high.toFixed(6) : '0.000000'
      },
      
      // Market data
      marketCap: quote?.marketCap ? this.formatLargeNumber(quote.marketCap) : '0',
      volume24h: quote?.volume24h ? this.formatLargeNumber(quote.volume24h) : '0',
      avgVolume: statsData?.avg_volume_30d ? this.formatLargeNumber(statsData.avg_volume_30d) : '0',
      
      // Financial metrics from statistics
      beta: statsData?.beta_vs_benchmark_90d ? statsData.beta_vs_benchmark_90d.toFixed(2) : 'N/A',
      peRatio: statsData?.pe_ratio ? statsData.pe_ratio.toFixed(1) : 'N/A',
      eps: statsData?.eps_ttm ? statsData.eps_ttm.toFixed(6) : 'N/A',
      earningsDate: 'N/A', // Not applicable for tokens typically
      dividend: 'N/A', // Not applicable for tokens
      exDividendDate: 'N/A', // Not applicable for tokens
      targetPrice: statsData?.target_price_avg ? statsData.target_price_avg.toFixed(6) : 'N/A',
      
      // Supply data from quote
      totalSupply: quote?.totalSupply ? this.formatLargeNumber(quote.totalSupply) : '1,000,000,000',
      circulatingSupply: quote?.circulatingSupply ? this.formatLargeNumber(quote.circulatingSupply) : '700,000,000',
      maxSupply: quote?.totalSupply ? this.formatLargeNumber(quote.totalSupply) : undefined,
      
      // Contract info from profile
      contractAddress: tokenData?.contract_address || '0x0000000000000000000000000000000000000000',
      poolAddress: undefined, // Would need separate data source
      liquidityLocked: true, // Default assumption for launched tokens
      lockUntil: '2025-12-31', // Default assumption
      
      // Status
      isLive: tokenData?.status === 'live' || tokenData?.status === 'active' || !!quote,
      etherscanVerified: true, // Default assumption
      
      // Enhanced features
      allTimeHigh: {
        price: statsData?.all_time_high ? statsData.all_time_high.toFixed(6) : '0.000000',
        date: statsData?.all_time_high_date || 'N/A'
      },
      popularityRank: undefined, // Would need separate ranking data
      typicalHoldTime: undefined, // Would need separate analytics
      tradingActivity: undefined // Would need separate trading data
    };

    return coinData;
  }

  /**
   * Transform news items for the CoinDetail component
   */
  static transformNewsItems(newsResponse: NewsResponse | null): NewsItemTransformed[] {
    if (!newsResponse?.news) {
      return [];
    }

    return newsResponse.news.map((item: NewsItem) => ({
      id: item.id.toString(),
      source: item.source,
      time: this.formatTimeAgo(item.published_at),
      headline: item.title,
      snippet: item.summary || 'No summary available',
      url: item.url || '#',
      type: this.mapNewsType(item.news_type),
      thumbnail: item.thumbnail_url
    }));
  }

  /**
   * Transform chart data for the CoinDetail component
   */
  static transformChartData(chartResponse: ChartResponse | null): ChartDataPointTransformed[] {
    if (!chartResponse?.data) {
      return [];
    }

    return chartResponse.data.map((point: ChartDataPoint) => ({
      timestamp: new Date(point.timestamp).getTime(),
      price: point.close_price,
      volume: point.volume
    }));
  }

  /**
   * Extract performance data for performance boxes
   */
  static transformPerformanceData(performance: PerformanceData | null) {
    if (!performance?.performance) {
      return {};
    }

    const perfData = performance.performance;
    const result: Record<string, number> = {};

    // Map API performance keys to display keys
    const keyMap = {
      '1D': 'return_1d',
      '5D': 'return_5d', 
      '1M': 'return_1m',
      '3M': 'return_3m',
      '6M': 'return_6m',
      'YTD': 'return_ytd',
      '1Y': 'return_1y',
      '3Y': 'return_3y',
      '5Y': 'return_5y',
      'MAX': 'return_max'
    };

    Object.entries(keyMap).forEach(([apiKey, displayKey]) => {
      const perfItem = perfData[apiKey];
      if (perfItem && typeof perfItem.return_pct === 'number') {
        result[displayKey] = perfItem.return_pct;
      }
    });

    return result;
  }

  /**
   * Utility: Format large numbers with K/M/B suffixes
   */
  private static formatLargeNumber(num: number): string {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';  
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
  }

  /**
   * Utility: Format timestamp to relative time
   */
  private static formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return past.toLocaleDateString();
    }
  }

  /**
   * Utility: Map API news types to component expected types
   */
  private static mapNewsType(apiType: string): 'news' | 'press' | 'sec' {
    switch (apiType) {
      case 'press':
      case 'announcement':
        return 'press';
      case 'sec':
        return 'sec';
      default:
        return 'news';
    }
  }
}

export default CoinDataTransformer;