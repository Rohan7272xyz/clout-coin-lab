// src/hooks/useCoinData.ts
// React hook to manage API calls and state for CoinDetail component
import { useState, useEffect, useCallback } from 'react';
import { AnalyticsAPI, QuoteResponse, ChartResponse, PerformanceData, StatisticsResponse, NewsResponse, ProfileResponse } from '@/services/analyticsAPI';

export interface CoinDataState {
  // Data states
  quote: QuoteResponse | null;
  chart: ChartResponse | null;
  performance: PerformanceData | null;
  statistics: StatisticsResponse | null;
  news: NewsResponse | null;
  profile: ProfileResponse | null;
  
  // Loading states
  loading: boolean;
  quoteLoading: boolean;
  chartLoading: boolean;
  performanceLoading: boolean;
  statisticsLoading: boolean;
  newsLoading: boolean;
  profileLoading: boolean;
  
  // Error states
  error: string | null;
  errors: {
    quote?: string;
    chart?: string;
    performance?: string;
    statistics?: string;
    news?: string;
    profile?: string;
  };
  
  // Meta information
  tokenId: number | null;
  lastUpdated: Date | null;
  selectedTimeframe: string;
}

interface UseCoinDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  defaultTimeframe?: string;
}

export function useCoinData(
  tokenIdentifier: string | number, 
  options: UseCoinDataOptions = {}
) {
  const {
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
    defaultTimeframe = '1D'
  } = options;

  // Main state
  const [state, setState] = useState<CoinDataState>({
    quote: null,
    chart: null,
    performance: null,
    statistics: null,
    news: null,
    profile: null,
    loading: false,
    quoteLoading: false,
    chartLoading: false,
    performanceLoading: false,
    statisticsLoading: false,
    newsLoading: false,
    profileLoading: false,
    error: null,
    errors: {},
    tokenId: null,
    lastUpdated: null,
    selectedTimeframe: defaultTimeframe
  });

  // Helper to update specific parts of state
  const updateState = useCallback((updates: Partial<CoinDataState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Resolve token ID from identifier
  const resolveTokenId = useCallback((identifier: string | number): number => {
    if (typeof identifier === 'number') {
      return identifier;
    }
    
    try {
      return AnalyticsAPI.resolveTokenId(identifier);
    } catch (error) {
      throw new Error(`Unable to resolve token: ${identifier}`);
    }
  }, []);

  // Load all data (initial load)
  const loadAllData = useCallback(async (
    identifier: string | number,
    timeframe = defaultTimeframe
  ) => {
    updateState({ 
      loading: true, 
      error: null, 
      errors: {},
      selectedTimeframe: timeframe 
    });

    try {
      const tokenId = resolveTokenId(identifier);
      updateState({ tokenId });

      console.log(`🔄 Loading all data for token ${tokenId} (${identifier})`);
      
      const result = await AnalyticsAPI.getTokenOverview(tokenId, timeframe);

      updateState({
        quote: result.quote,
        chart: result.chart,
        performance: result.performance,
        statistics: result.statistics,
        news: result.news,
        profile: result.profile,
        loading: false,
        lastUpdated: new Date(),
        errors: result.errors.reduce((acc, errorType) => {
          acc[errorType as keyof typeof acc] = `Failed to load ${errorType}`;
          return acc;
        }, {} as typeof state.errors)
      });

      console.log('✅ All data loaded successfully');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load token data';
      console.error('❌ Failed to load all data:', error);
      
      updateState({
        loading: false,
        error: errorMessage
      });
    }
  }, [resolveTokenId, updateState, defaultTimeframe]);

  // Load individual data sections
  const loadQuote = useCallback(async (tokenId: number) => {
    updateState({ quoteLoading: true });
    try {
      const quote = await AnalyticsAPI.getQuote(tokenId);
      updateState({ 
        quote, 
        quoteLoading: false,
        errors: { ...state.errors, quote: undefined }
      });
    } catch (error) {
      updateState({ 
        quoteLoading: false,
        errors: { ...state.errors, quote: 'Failed to load quote data' }
      });
    }
  }, [updateState, state.errors]);

  const loadChart = useCallback(async (tokenId: number, timeframe: string) => {
    updateState({ chartLoading: true, selectedTimeframe: timeframe });
    try {
      const chart = await AnalyticsAPI.getChart(tokenId, timeframe);
      updateState({ 
        chart, 
        chartLoading: false,
        errors: { ...state.errors, chart: undefined }
      });
    } catch (error) {
      updateState({ 
        chartLoading: false,
        errors: { ...state.errors, chart: 'Failed to load chart data' }
      });
    }
  }, [updateState, state.errors]);

  const loadPerformance = useCallback(async (tokenId: number) => {
    updateState({ performanceLoading: true });
    try {
      const performance = await AnalyticsAPI.getPerformance(tokenId);
      updateState({ 
        performance, 
        performanceLoading: false,
        errors: { ...state.errors, performance: undefined }
      });
    } catch (error) {
      updateState({ 
        performanceLoading: false,
        errors: { ...state.errors, performance: 'Failed to load performance data' }
      });
    }
  }, [updateState, state.errors]);

  const loadStatistics = useCallback(async (tokenId: number) => {
    updateState({ statisticsLoading: true });
    try {
      const statistics = await AnalyticsAPI.getStatistics(tokenId);
      updateState({ 
        statistics, 
        statisticsLoading: false,
        errors: { ...state.errors, statistics: undefined }
      });
    } catch (error) {
      updateState({ 
        statisticsLoading: false,
        errors: { ...state.errors, statistics: 'Failed to load statistics' }
      });
    }
  }, [updateState, state.errors]);

  const loadNews = useCallback(async (tokenId: number, page = 1, limit = 10) => {
    updateState({ newsLoading: true });
    try {
      const news = await AnalyticsAPI.getNews(tokenId, page, limit);
      updateState({ 
        news, 
        newsLoading: false,
        errors: { ...state.errors, news: undefined }
      });
    } catch (error) {
      updateState({ 
        newsLoading: false,
        errors: { ...state.errors, news: 'Failed to load news' }
      });
    }
  }, [updateState, state.errors]);

  const loadProfile = useCallback(async (tokenId: number) => {
    updateState({ profileLoading: true });
    try {
      const profile = await AnalyticsAPI.getProfile(tokenId);
      updateState({ 
        profile, 
        profileLoading: false,
        errors: { ...state.errors, profile: undefined }
      });
    } catch (error) {
      updateState({ 
        profileLoading: false,
        errors: { ...state.errors, profile: 'Failed to load profile' }
      });
    }
  }, [updateState, state.errors]);

  // Refresh all data
  const refreshAllData = useCallback(() => {
    if (tokenIdentifier) {
      loadAllData(tokenIdentifier, state.selectedTimeframe);
    }
  }, [tokenIdentifier, loadAllData, state.selectedTimeframe]);

  // Change timeframe (triggers chart reload)
  const changeTimeframe = useCallback((newTimeframe: string) => {
    if (state.tokenId) {
      loadChart(state.tokenId, newTimeframe);
    }
  }, [state.tokenId, loadChart]);

  // Refresh specific data sections
  const refreshQuote = useCallback(() => {
    if (state.tokenId) loadQuote(state.tokenId);
  }, [state.tokenId, loadQuote]);

  const refreshChart = useCallback(() => {
    if (state.tokenId) loadChart(state.tokenId, state.selectedTimeframe);
  }, [state.tokenId, loadChart, state.selectedTimeframe]);

  const refreshPerformance = useCallback(() => {
    if (state.tokenId) loadPerformance(state.tokenId);
  }, [state.tokenId, loadPerformance]);

  const refreshStatistics = useCallback(() => {
    if (state.tokenId) loadStatistics(state.tokenId);
  }, [state.tokenId, loadStatistics]);

  const refreshNews = useCallback(() => {
    if (state.tokenId) loadNews(state.tokenId);
  }, [state.tokenId, loadNews]);

  const refreshProfile = useCallback(() => {
    if (state.tokenId) loadProfile(state.tokenId);
  }, [state.tokenId, loadProfile]);

  // Initial load when tokenIdentifier changes
  useEffect(() => {
    if (tokenIdentifier) {
      console.log(`🎯 Token identifier changed: ${tokenIdentifier}`);
      loadAllData(tokenIdentifier);
    }
  }, [tokenIdentifier, loadAllData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !state.tokenId) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing quote data...');
      refreshQuote();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, state.tokenId, refreshQuote]);

  // Derived state for convenience
  const isAnyLoading = state.loading || 
    state.quoteLoading || 
    state.chartLoading || 
    state.performanceLoading || 
    state.statisticsLoading || 
    state.newsLoading || 
    state.profileLoading;

  const hasAnyData = !!(state.quote || state.chart || state.performance || 
    state.statistics || state.news || state.profile);

  const hasAnyErrors = !!(state.error || Object.keys(state.errors).length > 0);

  return {
    // Data
    ...state,
    
    // Derived state
    isAnyLoading,
    hasAnyData,
    hasAnyErrors,
    
    // Actions
    refreshAllData,
    changeTimeframe,
    refreshQuote,
    refreshChart,
    refreshPerformance,
    refreshStatistics,
    refreshNews,
    refreshProfile,
    
    // Individual loaders (for advanced use)
    loadAllData,
    loadQuote,
    loadChart,
    loadPerformance,
    loadStatistics,
    loadNews,
    loadProfile
  };
}

export default useCoinData;