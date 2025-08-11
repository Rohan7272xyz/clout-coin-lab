// src/pages/CoinDetail.tsx - Complete Yahoo Finance Style with Real API Integration
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Star,
  Plus,
  BarChart3,
  Users,
  MessageSquare,
  PieChart,
  History,
  Building,
  FileText,
  Target,
  Shield,
  Leaf,
  Lock,
  Calendar,
  Volume2,
  Activity,
  DollarSign,
  Globe,
  ChevronDown,
  ChevronUp,
  Download,
  Settings,
  Zap,
  RefreshCw
} from "lucide-react";
import Header from "@/components/ui/header";

// Import the API service layer and hooks
import { useCoinData } from '@/hooks/useCoinData';
import CoinDataTransformer from '@/utils/coinDataTransformer';
import APIConnectionTest from '@/components/APIConnectionTest';

// Keep your existing interfaces
interface CoinData {
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

interface NewsItemTransformed {
  id: string;
  source: string;
  time: string;
  headline: string;
  snippet: string;
  url: string;
  type: 'news' | 'press' | 'sec';
  thumbnail?: string;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  volume?: number;
}

const timeRanges = [
  { label: '1D', value: '1D' },
  { label: '5D', value: '5D' },
  { label: '1M', value: '1M' },
  { label: '6M', value: '6M' },
  { label: 'YTD', value: 'YTD' },
  { label: '1Y', value: '1Y' },
  { label: '5Y', value: '5Y' },
  { label: 'Max', value: 'MAX' }
];

const CoinDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Test route - temporary for API testing
  if (id === 'test') {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="pt-20 p-6">
          <APIConnectionTest />
        </div>
      </div>
    );
  }

  // Local state for UI interactions
  const [activeTab, setActiveTab] = useState('summary');
  const [newsFilter, setNewsFilter] = useState('all');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showKeyEvents, setShowKeyEvents] = useState(true);
  const [expandedOverview, setExpandedOverview] = useState(false);

  // Use the real API data hook
  const {
    quote,
    chart,
    performance,
    statistics,
    news,
    profile,
    loading,
    error,
    selectedTimeframe,
    changeTimeframe,
    refreshAllData,
    hasAnyData,
    tokenId
  } = useCoinData(id || 'rohini', {
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    defaultTimeframe: '1D'
  });

  // Transform API data to component format
  const coinData = useMemo(() => {
    return CoinDataTransformer.transformToCoinData(quote, profile, statistics, performance);
  }, [quote, profile, statistics, performance]);

  const transformedNews = useMemo(() => {
    return CoinDataTransformer.transformNewsItems(news);
  }, [news]);

  const chartData = useMemo(() => {
    return CoinDataTransformer.transformChartData(chart);
  }, [chart]);

  const performanceData = useMemo(() => {
    return CoinDataTransformer.transformPerformanceData(performance);
  }, [performance]);

  // Handle URL hash for tab navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash && ['summary', 'news', 'research', 'chart', 'community', 'statistics', 'historical', 'profile', 'financials', 'analysis', 'options', 'holders', 'sustainability'].includes(hash)) {
      setActiveTab(hash);
    }
  }, [location.hash]);

  // Event handlers
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    navigate(`#${tab}`, { replace: true });
  };

  const handleTimeRangeChange = (timeframe: string) => {
    changeTimeframe(timeframe);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    // Add to user's watchlist logic here
  };

  const handleAddHoldings = () => {
    // Open holdings modal logic here
    console.log('Add holdings modal');
  };

  const handleRefresh = () => {
    refreshAllData();
  };

  const handleBackToInfluencers = () => {
    navigate('/influencers');
  };

  const formatNumber = (num: string | number, decimals = 2) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (n >= 1e9) return (n / 1e9).toFixed(decimals) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(decimals) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(decimals) + 'K';
    return n.toFixed(decimals);
  };

  const filteredNews = transformedNews.filter(item => {
    if (newsFilter === 'all') return true;
    return item.type === newsFilter;
  });

  // Loading state
  if (loading && !hasAnyData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-400">Loading token data from APIs...</p>
            <p className="text-xs text-gray-500 mt-2">
              Fetching real-time data for {id}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !hasAnyData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-red-400">Failed to Load Token Data</h1>
            <p className="text-gray-400 mb-4">{error}</p>
            <div className="space-y-2">
              <Button 
                onClick={handleRefresh} 
                className="bg-primary hover:bg-primary/90 text-black mr-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button 
                onClick={handleBackToInfluencers} 
                variant="outline"
                className="border-zinc-700 hover:border-primary/50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Influencers
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state (shouldn't happen with fallback, but safety check)
  if (!coinData && !loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-red-400">Token Not Found</h1>
            <p className="text-gray-400 mb-4">
              The token "{id}" could not be found or is not available.
            </p>
            <Button onClick={handleBackToInfluencers} className="bg-primary hover:bg-primary/90 text-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Influencers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <div className="pt-20">
        {/* Enhanced Breadcrumb with Back Button */}
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Back Button */}
              <Button
                onClick={handleBackToInfluencers}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Influencers
              </Button>
              
              {/* Breadcrumb separator */}
              <div className="text-gray-600">•</div>
              
              {/* Breadcrumb info */}
              <div className="text-sm text-gray-400">
                CoinFluence · Live Quote · USD
              </div>
            </div>
            
            {/* Show data source info */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${hasAnyData ? 'bg-green-400' : 'bg-red-400'}`} />
              <span>
                {hasAnyData ? 'Real-time data' : 'No data'} 
                {tokenId && ` • Token ID: ${tokenId}`}
              </span>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleRefresh}
                className="h-6 px-2 text-xs"
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex">
          {/* Left Sidebar - Sticky Navigation */}
          <div className="w-64 shrink-0 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto border-r border-zinc-800 bg-zinc-950/50">
            <nav className="p-4 space-y-1">
              {[
                { id: 'summary', label: 'Summary', icon: BarChart3 },
                { id: 'news', label: 'News', icon: FileText },
                { id: 'research', label: 'Research', icon: Target, locked: true },
                { id: 'chart', label: 'Chart', icon: TrendingUp },
                { id: 'community', label: 'Community', icon: MessageSquare },
                { id: 'statistics', label: 'Statistics', icon: PieChart },
                { id: 'historical', label: 'Historical Data', icon: History },
                { id: 'profile', label: 'Profile', icon: Building },
                { id: 'financials', label: 'Financials', icon: DollarSign },
                { id: 'analysis', label: 'Analysis', icon: Activity },
                { id: 'options', label: 'Options', icon: Settings },
                { id: 'holders', label: 'Holders', icon: Users },
                { id: 'sustainability', label: 'Sustainability', icon: Leaf }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'text-gray-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="flex-1">{tab.label}</span>
                  {tab.locked && <Lock className="w-3 h-3" />}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="p-6">
              {/* Header Block */}
              <div className="mb-6">
                {/* Title and Actions */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {coinData?.tokenName || 'Loading...'} ({coinData?.symbol || '...'})
                    </h1>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>{coinData?.handle || '@...'}</span>
                      <span>•</span>
                      <span>{coinData?.followers || '0'} followers</span>
                      {coinData?.verified && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Check className="w-4 h-4 text-primary" />
                            <span className="text-primary">Verified</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFollow}
                      className={`border-zinc-700 ${isFollowing ? 'bg-primary/20 text-primary border-primary/30' : 'hover:border-primary/50'}`}
                    >
                      <Star className={`w-4 h-4 mr-2 ${isFollowing ? 'fill-current' : ''}`} />
                      {isFollowing ? 'Following' : 'Follow'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddHoldings}
                      className="border-zinc-700 hover:border-primary/50"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Holdings
                    </Button>
                  </div>
                </div>

                {/* Primary Quote */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-4 mb-2">
                    <span className="text-4xl font-bold text-white">
                      ${coinData?.currentPrice || '0.000000'}
                    </span>
                    <div className={`flex items-center gap-1 ${(coinData?.priceChangePct24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(coinData?.priceChangePct24h || 0) >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <span className="text-lg font-semibold">{coinData?.priceChange24h || '+0.00'}</span>
                      <span className="text-lg font-semibold">({coinData?.priceChangePct24h || 0}%)</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">
                    {coinData?.marketStatus || 'Market Status Unknown'} • {coinData?.marketStatusTime || 'Time Unknown'}
                  </div>
                  
                  {coinData?.afterHoursPrice && (
                    <div className="text-sm">
                      <span className="text-gray-400">After Hours: </span>
                      <span className="text-white">${coinData.afterHoursPrice}</span>
                      <span className="text-green-400 ml-2">{coinData.afterHoursChange} ({coinData.afterHoursPct}%)</span>
                      <span className="text-gray-500 ml-2">• {coinData.afterHoursTime}</span>
                    </div>
                  )}
                </div>

                {/* Promo CTA */}
                <div className="text-sm text-primary hover:text-primary/80 cursor-pointer">
                  Time to invest in {coinData?.symbol || 'this token'}? →
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  {/* Chart Block */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {timeRanges.map((range) => (
                            <button
                              key={range.value}
                              onClick={() => handleTimeRangeChange(range.value)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${
                                selectedTimeframe === range.value
                                  ? 'bg-primary/20 text-primary'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              {range.label}
                            </button>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-400">
                            <input
                              type="checkbox"
                              checked={showKeyEvents}
                              onChange={(e) => setShowKeyEvents(e.target.checked)}
                              className="rounded border-zinc-600"
                            />
                            Key Events
                          </label>
                          <Button variant="outline" size="sm" className="border-zinc-700 hover:border-primary/50">
                            Advanced Chart
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Interactive Chart Component</p>
                          <p className="text-sm">Range: {selectedTimeframe}</p>
                          {chartData.length > 0 && (
                            <p className="text-xs mt-2 text-primary">
                              {chartData.length} data points loaded
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quote Stats Grid */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <CardTitle>Quote Statistics</CardTitle>
                      {loading && (
                        <div className="text-xs text-gray-400 flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Updating...
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {coinData && [
                          ['Previous Close', coinData.previousClose],
                          ['Open', coinData.open],
                          ['Bid', `${coinData.bid.price} x ${coinData.bid.size}`],
                          ['Ask', `${coinData.ask.price} x ${coinData.ask.size}`],
                          ['Day\'s Range', `${coinData.dayRange.low} - ${coinData.dayRange.high}`],
                          ['52 Week Range', `${coinData.fiftyTwoWeekRange.low} - ${coinData.fiftyTwoWeekRange.high}`],
                          ['Volume', coinData.volume24h],
                          ['Avg. Volume', coinData.avgVolume],
                          ['Market Cap', `$${coinData.marketCap}`],
                          ['Beta (5Y Monthly)', coinData.beta],
                          ['PE Ratio (TTM)', coinData.peRatio],
                          ['EPS (TTM)', coinData.eps],
                          ['Earnings Date', coinData.earningsDate],
                          ['Forward Dividend & Yield', coinData.dividend],
                          ['Ex-Dividend Date', coinData.exDividendDate],
                          ['1y Target Est', coinData.targetPrice]
                        ].map(([label, value], index) => (
                          <div key={index} className="flex justify-between py-2 border-b border-zinc-800 last:border-b-0">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-white font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Company Overview */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <button
                        onClick={() => setExpandedOverview(!expandedOverview)}
                        className="w-full flex items-center justify-between text-left"
                      >
                        <CardTitle>
                          {coinData?.name || 'Token'} Overview — {coinData?.category || 'Category'}
                        </CardTitle>
                        {expandedOverview ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </CardHeader>
                    {expandedOverview && coinData && (
                      <CardContent>
                        <div className="space-y-4">
                          <p className="text-gray-300">{coinData.description}</p>
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                            {coinData.website && (
                              <div>
                                <span className="text-gray-400">Website: </span>
                                <a href={coinData.website} className="text-primary hover:text-primary/80" target="_blank" rel="noopener noreferrer">
                                  {coinData.website}
                                </a>
                              </div>
                            )}
                            {coinData.headquarters && (
                              <div>
                                <span className="text-gray-400">Headquarters: </span>
                                <span className="text-white">{coinData.headquarters}</span>
                              </div>
                            )}
                            {coinData.employees && (
                              <div>
                                <span className="text-gray-400">Employees: </span>
                                <span className="text-white">{coinData.employees.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Recent News */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Recent News: {coinData?.symbol || 'TOKEN'}</CardTitle>
                        <div className="flex gap-2">
                          {['all', 'news', 'press', 'sec'].map((filter) => (
                            <button
                              key={filter}
                              onClick={() => setNewsFilter(filter)}
                              className={`px-3 py-1 rounded text-sm capitalize transition-colors ${
                                newsFilter === filter
                                  ? 'bg-primary/20 text-primary'
                                  : 'text-gray-400 hover:text-white'
                              }`}
                            >
                              {filter === 'all' ? 'All' : filter === 'sec' ? 'SEC Filings' : filter}
                            </button>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredNews.length > 0 ? (
                          filteredNews.map((item) => (
                            <div key={item.id} className="flex gap-4 p-4 rounded-lg bg-zinc-800 hover:bg-zinc-750 transition-colors">
                              {item.thumbnail && (
                                <img src={item.thumbnail} alt="" className="w-20 h-15 rounded object-cover" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                                  <span>{item.source}</span>
                                  <span>•</span>
                                  <span>{item.time}</span>
                                </div>
                                <h3 className="font-semibold text-white mb-2 hover:text-primary cursor-pointer">
                                  {item.headline}
                                </h3>
                                <p className="text-gray-400 text-sm">{item.snippet}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="mb-2">No news available</p>
                            <p className="text-sm">News will appear here when available from the API</p>
                          </div>
                        )}
                        <Button variant="outline" className="w-full border-zinc-700 hover:border-primary/50">
                          View More News
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Other tabs content */}
              {activeTab === 'news' && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle>All News</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Full news feed implementation coming soon...</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Currently loaded: {transformedNews.length} news items
                    </p>
                  </CardContent>
                </Card>
              )}

              {activeTab === 'research' && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="text-center py-12">
                    <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold mb-2">Premium Research</h3>
                    <p className="text-gray-400 mb-4">Access analyst reports, fair value estimates, and premium metrics</p>
                    <Button className="bg-primary hover:bg-primary/90 text-black">
                      Upgrade to Premium
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Add more tab implementations as needed */}
            </div>
          </div>

          {/* Right Column - Market Widgets */}
          <div className="w-80 shrink-0 p-6 space-y-6 border-l border-zinc-800">
            {/* Market Overview */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Market Overview</CardTitle>
                <div className="flex gap-1">
                  {['US', 'Crypto', 'Influencers'].map((region) => (
                    <button
                      key={region}
                      className="px-2 py-1 text-xs rounded bg-zinc-800 text-gray-400 hover:text-white"
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'CoinFluence Index', value: '$2,847.32', change: '+1.2%' },
                  { name: 'Creator Economy', value: '$1,234.56', change: '-0.8%' },
                  { name: 'Top Influencers', value: '$4,567.89', change: '+2.1%' }
                ].map((index, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{index.name}</span>
                    <div className="text-right">
                      <div className="text-sm text-white">{index.value}</div>
                      <div className={`text-xs ${index.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                        {index.change}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recently Viewed */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Recently Viewed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { symbol: 'MRBEAST', price: '$0.0234', change: '+5.2%' },
                  { symbol: 'PEWDS', price: '$0.0156', change: '-2.1%' },
                  { symbol: 'MKBHD', price: '$0.0298', change: '+1.8%' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm hover:bg-zinc-800 p-2 rounded cursor-pointer">
                    <span className="text-white">{item.symbol}</span>
                    <div className="text-right">
                      <div className="text-white">{item.price}</div>
                      <div className={item.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}>
                        {item.change}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Gainers */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Top Gainers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { symbol: 'DUDE', price: '$0.0045', change: '+15.3%' },
                  { symbol: 'CRYPTO', price: '$0.0178', change: '+12.7%' },
                  { symbol: 'TECH', price: '$0.0203', change: '+9.4%' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm hover:bg-zinc-800 p-2 rounded cursor-pointer">
                    <span className="text-white">{item.symbol}</span>
                    <div className="text-right">
                      <div className="text-white">{item.price}</div>
                      <div className="text-green-400">{item.change}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;