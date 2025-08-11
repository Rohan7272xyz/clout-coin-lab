// src/pages/CoinDetail.tsx - Fixed TypeScript errors
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw,
  Database,
  Link2
} from "lucide-react";
import Header from "@/components/ui/header";
import useRealTokenData, { type CombinedTokenData } from "@/hooks/useRealTokenData";

// Transform database data to CoinDetail component format
const transformToDisplayFormat = (tokenData: CombinedTokenData) => {
  const live = tokenData.liveData;
  const isLive = tokenData.isLive;

  return {
    id: tokenData.id,
    name: tokenData.name,
    handle: tokenData.handle,
    tokenName: tokenData.token_name,
    symbol: tokenData.token_symbol,
    avatar: tokenData.avatar,
    category: tokenData.category,
    description: tokenData.description,
    followers: tokenData.followers,
    verified: tokenData.verified,
    website: tokenData.website,
    headquarters: tokenData.headquarters,
    
    // Price data - use live data if available, fallback otherwise
    currentPrice: live?.currentPrice || "0.000000",
    priceChange24h: live?.priceChange24h || "+0.000000",
    priceChangePct24h: live?.priceChangePct24h || 0.0,
    
    // Market status
    marketStatus: isLive ? "Market Open" : "Pre-Launch",
    marketStatusTime: isLive ? "Live Trading" : "Coming Soon",
    
    // Stats - use live data for deployed tokens
    marketCap: live?.marketCap ? `$${formatNumber(live.marketCap)}` : "TBD",
    volume24h: live?.volume24h ? formatNumber(live.volume24h) : "0",
    totalSupply: live?.totalSupply ? formatNumber(live.totalSupply) : "1,000,000",
    circulatingSupply: live?.circulatingSupply ? formatNumber(live.circulatingSupply) : "700,000",
    
    // Contract info
    contractAddress: tokenData.contract_address || "",
    isLive: isLive,
    etherscanVerified: isLive && tokenData.contract_address ? true : false,
    
    // Trading data
    previousClose: live?.currentPrice || "0.000000",
    open: live?.currentPrice || "0.000000",
    bid: { price: live?.currentPrice || "0.000000", size: 1000 },
    ask: { price: live?.currentPrice || "0.000000", size: 1000 },
    dayRange: { 
      low: live?.currentPrice || "0.000000", 
      high: live?.currentPrice || "0.000000" 
    },
    fiftyTwoWeekRange: { 
      low: live?.currentPrice || "0.000000", 
      high: live?.currentPrice || "0.000000" 
    },
    avgVolume: live?.volume24h || "0",
    beta: "N/A",
    peRatio: "N/A",
    eps: "N/A",
    earningsDate: "N/A",
    dividend: "N/A",
    exDividendDate: "N/A",
    targetPrice: "TBD",
    
    // Additional live data
    holderCount: live?.holderCount || 0,
    transactions24h: live?.transactions24h || 0,
    launchedAt: tokenData.launched_at,
    network: tokenData.network || "base-sepolia"
  };
};

const formatNumber = (num: string | number, decimals = 2) => {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(decimals) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(decimals) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(decimals) + 'K';
  return n.toFixed(decimals);
};

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

  // Local state for UI interactions
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showKeyEvents, setShowKeyEvents] = useState(true);
  const [expandedOverview, setExpandedOverview] = useState(false);

  // Use real production data hook
  const {
    tokenData,
    loading,
    error,
    refreshData,
    isLive
  } = useRealTokenData(id || '');

  // Transform to display format
  const displayData = useMemo(() => {
    if (!tokenData) return null;
    return transformToDisplayFormat(tokenData);
  }, [tokenData]);

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
    setSelectedTimeframe(timeframe);
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleAddHoldings = () => {
    console.log('Add holdings modal');
  };

  const handleRefresh = () => {
    refreshData();
  };

  const handleBackToInfluencers = () => {
    navigate('/pre-invest');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-gray-400">Loading real token data...</p>
            <p className="text-xs text-gray-500 mt-2">
              📊 Fetching from database and blockchain for {id}...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-red-400">Failed to Load Token</h1>
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
                Back to PreInvest
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!displayData) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-red-400">Token Not Found</h1>
            <p className="text-gray-400 mb-4">
              The token "{id}" could not be found in the database.
            </p>
            <Button onClick={handleBackToInfluencers} className="bg-primary hover:bg-primary/90 text-black">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to PreInvest
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
        {/* Enhanced Breadcrumb with Data Source Indicator */}
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToInfluencers}
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to PreInvest
              </Button>
              
              <div className="text-gray-600">•</div>
              
              <div className="text-sm text-gray-400">
                CoinFluence · Real Database · {isLive ? 'Live Blockchain' : 'Pre-Launch'} · USD
              </div>
            </div>
            
            {/* Data source indicator */}
            <div className="flex items-center gap-3 text-xs">
              {/* Database connection status */}
              <div className="flex items-center gap-1 text-gray-500">
                <Database className="w-3 h-3" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span>Database</span>
              </div>
              
              {/* Blockchain status for live tokens */}
              {isLive && (
                <div className="flex items-center gap-1 text-gray-500">
                  <Link2 className="w-3 h-3" />
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Live Contract</span>
                </div>
              )}
              
              {/* Status indicator */}
              <div className={`px-2 py-1 rounded text-xs font-medium ${
                isLive 
                  ? 'bg-green-900/50 text-green-400 border border-green-400/30' 
                  : 'bg-yellow-900/50 text-yellow-400 border border-yellow-400/30'
              }`}>
                {isLive ? 'LIVE' : 'PRE-LAUNCH'}
              </div>
              
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
                { id: 'research', label: 'Research', icon: Target, locked: !isLive },
                { id: 'chart', label: 'Chart', icon: TrendingUp },
                { id: 'community', label: 'Community', icon: MessageSquare },
                { id: 'statistics', label: 'Statistics', icon: PieChart },
                { id: 'historical', label: 'Historical Data', icon: History, locked: !isLive },
                { id: 'profile', label: 'Profile', icon: Building },
                { id: 'financials', label: 'Financials', icon: DollarSign, locked: !isLive },
                { id: 'analysis', label: 'Analysis', icon: Activity, locked: !isLive },
                { id: 'options', label: 'Options', icon: Settings, locked: !isLive },
                { id: 'holders', label: 'Holders', icon: Users, locked: !isLive },
                { id: 'sustainability', label: 'Sustainability', icon: Leaf, locked: true }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.locked && handleTabChange(tab.id)}
                  disabled={tab.locked}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : tab.locked
                      ? 'text-gray-600 cursor-not-allowed'
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
              {/* Header Block with Real Data */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                      {displayData.tokenName} ({displayData.symbol})
                    </h1>
                    <div className="flex items-center gap-2 text-gray-400">
                      <span>{displayData.handle}</span>
                      <span>•</span>
                      <span>{displayData.followers} followers</span>
                      {displayData.verified && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Check className="w-4 h-4 text-primary" />
                            <span className="text-primary">Verified</span>
                          </div>
                        </>
                      )}
                      {isLive && displayData.contractAddress && (
                        <>
                          <span>•</span>
                          <a
                            href={`https://sepolia.basescan.org/token/${displayData.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Contract
                          </a>
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
                      disabled={!isLive}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {isLive ? 'Add Holdings' : 'Pre-Launch'}
                    </Button>
                  </div>
                </div>

                {/* Primary Quote with Real Data */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-4 mb-2">
                    <span className="text-4xl font-bold text-white">
                      ${displayData.currentPrice}
                    </span>
                    <div className={`flex items-center gap-1 ${displayData.priceChangePct24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {displayData.priceChangePct24h >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <span className="text-lg font-semibold">{displayData.priceChange24h}</span>
                      <span className="text-lg font-semibold">({displayData.priceChangePct24h}%)</span>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">
                    {displayData.marketStatus} • {displayData.marketStatusTime}
                    {isLive && (
                      <span className="ml-2 text-primary">
                        • Network: {displayData.network}
                      </span>
                    )}
                  </div>
                  
                  {displayData.launchedAt && (
                    <div className="text-sm text-gray-500">
                      Launched: {new Date(displayData.launchedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="text-sm text-primary hover:text-primary/80 cursor-pointer">
                  {isLive 
                    ? `Start trading ${displayData.symbol} →` 
                    : `Get notified when ${displayData.symbol} launches →`
                  }
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-zinc-700 hover:border-primary/50"
                            disabled={!isLive}
                          >
                            Advanced Chart
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80 bg-zinc-800 rounded-lg flex items-center justify-center">
                        <div className="text-center text-gray-400">
                          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>
                            {isLive 
                              ? 'Live Chart Integration Coming Soon' 
                              : 'Chart Available After Launch'
                            }
                          </p>
                          <p className="text-sm">Range: {selectedTimeframe}</p>
                          {isLive && (
                            <p className="text-xs mt-2 text-primary">
                              Real-time data: {displayData.symbol}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Real Quote Statistics */}
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        Quote Statistics
                        {isLive && (
                          <Badge variant="outline" className="text-green-400 border-green-400/30">
                            Live Data
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          ['Current Price', `$${displayData.currentPrice}`],
                          ['Market Cap', displayData.marketCap],
                          ['Total Supply', formatNumber(displayData.totalSupply)],
                          ['Circulating Supply', formatNumber(displayData.circulatingSupply)],
                          ['24h Volume', formatNumber(displayData.volume24h)],
                          ['Holders', displayData.holderCount?.toString() || 'TBD'],
                          ['24h Transactions', displayData.transactions24h?.toString() || '0'],
                          ['Network', displayData.network || 'base-sepolia'],
                          ['Launch Date', displayData.launchedAt ? new Date(displayData.launchedAt).toLocaleDateString() : 'TBD'],
                          ['Contract Status', isLive ? 'Deployed' : 'Pending'],
                          ['Verified', displayData.etherscanVerified ? 'Yes' : 'No'],
                          ['Trading Status', isLive ? 'Active' : 'Pre-Launch']
                        ].map(([label, value], index) => (
                          <div key={index} className="flex justify-between py-2 border-b border-zinc-800 last:border-b-0">
                            <span className="text-gray-400">{label}</span>
                            <span className="text-white font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Live Token Actions (only for deployed tokens) */}
                  {isLive && (
                    <Card className="bg-zinc-900 border-zinc-800">
                      <CardHeader>
                        <CardTitle className="text-green-400">🟢 Live Token Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <Button className="bg-primary hover:bg-primary/90 text-black">
                            <DollarSign className="w-4 h-4 mr-2" />
                            Buy {displayData.symbol}
                          </Button>
                          <Button variant="outline" className="border-zinc-700 hover:border-primary/50">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Add to Portfolio
                          </Button>
                          <Button variant="outline" className="border-zinc-700 hover:border-primary/50">
                            <Users className="w-4 h-4 mr-2" />
                            View Holders
                          </Button>
                          <Button variant="outline" className="border-zinc-700 hover:border-primary/50">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on Explorer
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Other tabs */}
              {activeTab === 'news' && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle>Token News</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">News feed integration coming soon...</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Add more tab content here */}
              {activeTab === 'chart' && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle>Interactive Chart</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 bg-zinc-800 rounded-lg flex items-center justify-center">
                      <p className="text-gray-400">Advanced charting coming soon...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {activeTab === 'community' && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle>Community</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400">Community features coming soon...</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Market Widgets */}
          <div className="w-80 shrink-0 p-6 space-y-6 border-l border-zinc-800">
            {/* Token Status */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Token Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Status</span>
                    <Badge className={isLive ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}>
                      {isLive ? 'LIVE' : 'PRE-LAUNCH'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Network</span>
                    <span className="text-sm text-white">{displayData.network}</span>
                  </div>
                  {isLive && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Holders</span>
                      <span className="text-sm text-white">{displayData.holderCount}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-black"
                  disabled={!isLive}
                >
                  {isLive ? `Trade ${displayData.symbol}` : 'Coming Soon'}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full border-zinc-700 hover:border-primary/50"
                >
                  Follow Updates
                </Button>
                {isLive && (
                  <Button 
                    variant="outline" 
                    className="w-full border-zinc-700 hover:border-primary/50"
                  >
                    Analytics Dashboard
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinDetail;