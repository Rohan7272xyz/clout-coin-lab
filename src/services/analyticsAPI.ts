// src/services/analyticsAPI.ts
// Centralized API service for all 6 production endpoints
// Connects CoinDetail.tsx to your Phase 2C backend APIs

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Type definitions matching your backend responses
export interface QuoteResponse {
  tokenId: number;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
  dayHigh: number;
  dayLow: number;
  prevClose: number;
  circulatingSupply: number;
  totalSupply: number;
  lastUpdated: string;
  priceDirection: string;
  
  // Additional quote data (optional for future expansion)
  bidPrice?: number;
  askPrice?: number;
  bidQty?: number;
  askQty?: number;
  afterHoursPrice?: number;
  afterHoursChange?: number;
  afterHoursChangePct?: number;
  afterHoursTime?: string;
  fullyDilutedUsd?: number;
  halted?: boolean;
}

export interface ChartDataPoint {
  timestamp: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  volume_usd: number;
  trades_count?: number;
}

export interface ChartResponse {
  tokenId: number;
  timeframe: string;
  data: ChartDataPoint[];
  period_start: string;
  period_end: string;
  total_points: number;
}

export interface PerformanceData {
  tokenId: number;
  performance: {
    [key: string]: {
      return_pct: number;
      return_absolute: number;
      start_price: number;
      end_price: number;
      start_date: string;
      end_date: string;
    };
  };
  updated_at: string;
}

export interface StatisticsResponse {
  tokenId: number;
  statistics: {
    // Volume metrics
    avg_volume_10d?: number;
    avg_volume_30d?: number;
    
    // Price ranges
    week_52_high?: number;
    week_52_low?: number;
    all_time_high?: number;
    all_time_high_date?: string;
    all_time_low?: number;
    all_time_low_date?: string;
    
    // Volatility and performance
    volatility_30d?: number;
    volatility_90d?: number;
    sharpe_30d?: number;
    sharpe_90d?: number;
    drawdown_max?: number;
    beta_vs_benchmark_90d?: number;
    turnover_24h?: number;
    
    // Holder metrics
    holders_count?: number;
    top10_concentration_pct?: number;
    gini_coefficient?: number;
    
    // Financial ratios
    pe_ratio?: number;
    eps_ttm?: number;
    target_price_avg?: number;
  };
  date: string;
}

export interface NewsItem {
  id: number;
  published_at: string;
  source: string;
  title: string;
  url?: string;
  summary?: string;
  content?: string;
  thumbnail_url?: string;
  news_type: 'news' | 'press' | 'sec' | 'announcement' | 'partnership' | 'technical';
  sentiment_score?: number;
  importance_score?: number;
}

export interface NewsResponse {
  tokenId: number;
  news: NewsItem[];
  total_count: number;
  page: number;
  has_more: boolean;
}

export interface ProfileResponse {
  tokenId: number;
  profile: {
    name: string;
    ticker: string;
    description?: string;
    category?: string;
    website_url?: string;
    whitepaper_url?: string;
    logo_url?: string;
    headquarters?: string;
    employees?: number;
    contract_address?: string;
    chain_id?: number;
    launch_date?: string;
    status: string;
  };
  updated_at: string;
}

// Error handling utility
class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Generic API request handler with error handling
async function apiRequest<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    console.log(`🔍 API Request: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error ${response.status} for ${endpoint}:`, errorText);
      
      throw new APIError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        endpoint
      );
    }

    const data = await response.json();
    console.log(`✅ API Success for ${endpoint}:`, data);
    
    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    console.error(`❌ Network Error for ${endpoint}:`, error);
    throw new APIError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      endpoint
    );
  }
}

// Main Analytics API class
export class AnalyticsAPI {
  
  /**
   * Get real-time quote data for a token
   * Maps to your working /api/quotes/:tokenId endpoint
   */
  static async getQuote(tokenId: number): Promise<QuoteResponse> {
    return apiRequest<QuoteResponse>(`/api/quotes/${tokenId}`);
  }

  /**
   * Get OHLCV chart data for a token
   * Maps to your working /api/chart/:tokenId/:timeframe endpoint
   * 
   * @param tokenId - Token ID (1 for Rohini)
   * @param timeframe - 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 3Y, 5Y, MAX
   */
  static async getChart(tokenId: number, timeframe: string): Promise<ChartResponse> {
    return apiRequest<ChartResponse>(`/api/chart/${tokenId}/${timeframe}`);
  }

  /**
   * Get performance data across multiple time horizons
   * Maps to your working /api/analytics/:tokenId/performance endpoint
   */
  static async getPerformance(tokenId: number): Promise<PerformanceData> {
    return apiRequest<PerformanceData>(`/api/analytics/${tokenId}/performance`);
  }

  /**
   * Get comprehensive statistics for quote grid
   * Maps to your working /api/analytics/:tokenId/statistics endpoint
   */
  static async getStatistics(tokenId: number): Promise<StatisticsResponse> {
    return apiRequest<StatisticsResponse>(`/api/analytics/${tokenId}/statistics`);
  }

  /**
   * Get news feed for token
   * Maps to your working /api/analytics/:tokenId/news endpoint
   */
  static async getNews(tokenId: number, page = 1, limit = 10): Promise<NewsResponse> {
    return apiRequest<NewsResponse>(`/api/analytics/${tokenId}/news?page=${page}&limit=${limit}`);
  }

  /**
   * Get token profile/company overview
   * Maps to your working /api/analytics/:tokenId/profile endpoint
   */
  static async getProfile(tokenId: number): Promise<ProfileResponse> {
    return apiRequest<ProfileResponse>(`/api/analytics/${tokenId}/profile`);
  }

  /**
   * Get all data for a token in one call (useful for initial page load)
   * This combines multiple API calls for efficiency
   */
  static async getTokenOverview(tokenId: number, chartTimeframe = '1D') {
    try {
      // Parallel API calls for faster loading
      const [quote, chart, performance, statistics, news, profile] = await Promise.allSettled([
        this.getQuote(tokenId),
        this.getChart(tokenId, chartTimeframe),
        this.getPerformance(tokenId),
        this.getStatistics(tokenId),
        this.getNews(tokenId, 1, 5), // Get first 5 news items
        this.getProfile(tokenId)
      ]);

      // Extract successful results and log any failures
      const result = {
        quote: quote.status === 'fulfilled' ? quote.value : null,
        chart: chart.status === 'fulfilled' ? chart.value : null,
        performance: performance.status === 'fulfilled' ? performance.value : null,
        statistics: statistics.status === 'fulfilled' ? statistics.value : null,
        news: news.status === 'fulfilled' ? news.value : null,
        profile: profile.status === 'fulfilled' ? profile.value : null,
        errors: [] as string[]
      };

      // Log any failures
      if (quote.status === 'rejected') {
        console.error('Quote API failed:', quote.reason);
        result.errors.push('quote');
      }
      if (chart.status === 'rejected') {
        console.error('Chart API failed:', chart.reason);
        result.errors.push('chart');
      }
      if (performance.status === 'rejected') {
        console.error('Performance API failed:', performance.reason);
        result.errors.push('performance');
      }
      if (statistics.status === 'rejected') {
        console.error('Statistics API failed:', statistics.reason);
        result.errors.push('statistics');
      }
      if (news.status === 'rejected') {
        console.error('News API failed:', news.reason);
        result.errors.push('news');
      }
      if (profile.status === 'rejected') {
        console.error('Profile API failed:', profile.reason);
        result.errors.push('profile');
      }

      return result;
    } catch (error) {
      console.error('Token overview failed:', error);
      throw new APIError('Failed to load token overview');
    }
  }

  /**
   * Utility method to resolve token name to ID
   * For now, maps known token names to IDs
   * Later this could call a separate API endpoint
   */
  static resolveTokenId(nameOrSymbol: string): number {
    const tokenMap: Record<string, number> = {
      'rohini': 1,
      'ROHINI': 1,
      'alex': 2,
      'ALEX': 2,
      'alexchen': 2
    };

    const resolved = tokenMap[nameOrSymbol.toLowerCase()];
    if (!resolved) {
      throw new APIError(`Unknown token: ${nameOrSymbol}`);
    }

    return resolved;
  }

  /**
   * Get token data by name/symbol (convenience method)
   */
  static async getTokenByName(nameOrSymbol: string, chartTimeframe = '1D') {
    const tokenId = this.resolveTokenId(nameOrSymbol);
    return this.getTokenOverview(tokenId, chartTimeframe);
  }
}

// Export individual methods for convenience
export const {
  getQuote,
  getChart,
  getPerformance,
  getStatistics,
  getNews,
  getProfile,
  getTokenOverview,
  getTokenByName
} = AnalyticsAPI;

// Default export
export default AnalyticsAPI;