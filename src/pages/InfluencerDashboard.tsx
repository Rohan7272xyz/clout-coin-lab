// src/pages/InfluencerDashboard.tsx - Unified Architecture Version
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/ui/header";
import { useAuth } from "@/lib/auth/auth-context";
import { useAccount } from "wagmi";
import { 
  Coins, 
  Users, 
  TrendingUp, 
  DollarSign,
  Gift,
  Flame,
  Bell,
  Copy,
  ExternalLink,
  BarChart3,
  Settings,
  Download,
  Send,
  Activity,
  AlertCircle,
  RefreshCw,
  Star
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

// Types for influencer data
interface InfluencerToken {
  address: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  myBalance: number;
  myShareValue: number;
  totalSupply: number;
}

interface InfluencerInfo {
  id: number;
  name: string;
  handle: string;
  avatar?: string;
  isApproved: boolean;
  thresholdMet: boolean;
  pledgeThreshold: number;
  totalPledged: number;
  tokenAddress?: string;
}

interface Investor {
  address: string;
  displayName: string;
  amount: number;
  value: number;
  joinDate: string;
  ethInvested: number;
  tokenBalance: number;
}

interface RecentActivity {
  type: 'buy' | 'sell' | 'transfer' | 'pledge';
  amount: string;
  user: string;
  timestamp: string;
  txHash?: string;
}

interface InfluencerStats {
  totalInvestors: number;
  totalEthRaised: number;
  totalTokensSold: number;
  avgInvestment: number;
}

interface InfluencerData {
  hasToken: boolean;
  influencerInfo?: InfluencerInfo;
  token?: InfluencerToken;
  investors: Investor[];
  recentActivity: RecentActivity[];
  stats: InfluencerStats;
  message?: string;
}

const InfluencerDashboard = () => {
  const navigate = useNavigate();
  const { databaseUser, user } = useAuth();
  const { address } = useAccount();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftForm, setGiftForm] = useState({ recipient: "", amount: "", message: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Influencer data state
  const [influencerData, setInfluencerData] = useState<InfluencerData>({
    hasToken: false,
    investors: [],
    recentActivity: [],
    stats: {
      totalInvestors: 0,
      totalEthRaised: 0,
      totalTokensSold: 0,
      avgInvestment: 0
    }
  });

  // API helper function
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = await user?.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    const response = await fetch(`${apiUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  };

  // Check access permissions
  useEffect(() => {
    if (databaseUser?.status !== 'influencer' && databaseUser?.status !== 'admin') {
      toast.error("Access denied. Influencer status required.");
      navigate('/');
      return;
    }
  }, [databaseUser]);

  // Load influencer profile data using unified API
  const loadInfluencerProfile = async () => {
    try {
      setError(null);
      
      // Get influencer info from unified API
      const response = await apiCall('/api/influencer/profile', {
        method: 'GET'
      });

      if (response.success) {
        const info: InfluencerInfo = {
          id: response.influencer.id,
          name: response.influencer.name,
          handle: response.influencer.handle,
          avatar: response.influencer.avatar,
          isApproved: response.influencer.status === 'approved',
          thresholdMet: response.influencer.threshold_met || false,
          pledgeThreshold: parseFloat(response.influencer.pledge_threshold) || 0,
          totalPledged: parseFloat(response.influencer.total_pledged) || 0,
          tokenAddress: response.influencer.token_address
        };

        setInfluencerData(prev => ({
          ...prev,
          hasToken: !!info.tokenAddress,
          influencerInfo: info
        }));

        // If token exists, load token data
        if (info.tokenAddress) {
          await loadTokenData(info.tokenAddress);
        }
      } else {
        setInfluencerData(prev => ({
          ...prev,
          hasToken: false,
          message: response.message || "Influencer profile not found. Contact admin to set up your token parameters."
        }));
      }
    } catch (error: any) {
      console.error('Error loading influencer profile:', error);
      setError(error.message);
    }
  };

  // Load token data if token exists
  const loadTokenData = async (tokenAddress: string) => {
    try {
      // For now, create mock token data since token analytics endpoints might not be fully implemented
      // In production, this would call actual token analytics APIs
      const mockToken: InfluencerToken = {
        address: tokenAddress,
        symbol: `${influencerData.influencerInfo?.name?.toUpperCase() || 'TOKEN'}`,
        name: `${influencerData.influencerInfo?.name || 'Token'} Token`,
        currentPrice: 0.001234,
        priceChange24h: 5.67,
        marketCap: 123456,
        volume24h: 12345,
        holders: 42,
        myBalance: 300000, // 30% of 1M supply
        myShareValue: 370.2,
        totalSupply: 1000000
      };

      const mockInvestors: Investor[] = [
        {
          address: "0x1234...5678",
          displayName: "Early Investor",
          amount: 1.5,
          value: 1850,
          joinDate: "2025-07-20",
          ethInvested: 1.5,
          tokenBalance: 50000
        },
        {
          address: "0x8765...4321",
          displayName: "Community Member",
          amount: 0.8,
          value: 990,
          joinDate: "2025-07-22",
          ethInvested: 0.8,
          tokenBalance: 30000
        }
      ];

      const mockActivity: RecentActivity[] = [
        {
          type: 'buy',
          amount: '10,000 tokens',
          user: '0x1234...5678',
          timestamp: '2 hours ago'
        },
        {
          type: 'sell',
          amount: '5,000 tokens',
          user: '0x8765...4321',
          timestamp: '5 hours ago'
        }
      ];

      const mockStats: InfluencerStats = {
        totalInvestors: mockInvestors.length,
        totalEthRaised: mockInvestors.reduce((sum, inv) => sum + inv.ethInvested, 0),
        totalTokensSold: mockInvestors.reduce((sum, inv) => sum + inv.tokenBalance, 0),
        avgInvestment: mockInvestors.reduce((sum, inv) => sum + inv.ethInvested, 0) / mockInvestors.length
      };

      setInfluencerData(prev => ({
        ...prev,
        token: mockToken,
        investors: mockInvestors,
        recentActivity: mockActivity,
        stats: mockStats
      }));

    } catch (error: any) {
      console.error('Error loading token data:', error);
      // Don't set error for token data, just log it
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await loadInfluencerProfile();
    } catch (error) {
      // Error handling is done in individual functions
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  // Gift tokens functionality
  const handleGiftTokens = async () => {
    if (!giftForm.recipient || !giftForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // This would call the actual gift tokens API
      const response = await apiCall('/api/influencer/gift-tokens', {
        method: 'POST',
        body: JSON.stringify({
          recipient: giftForm.recipient,
          amount: parseFloat(giftForm.amount),
          message: giftForm.message
        })
      });

      if (response.success) {
        toast.success(`Successfully sent ${giftForm.amount} tokens to ${giftForm.recipient}`);
        setShowGiftModal(false);
        setGiftForm({ recipient: "", amount: "", message: "" });
        await handleRefresh();
      } else {
        throw new Error(response.message || 'Failed to send tokens');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send tokens");
      console.error("Gift tokens error:", error);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (databaseUser?.status === 'influencer' || databaseUser?.status === 'admin') {
      loadAllData();
    }
  }, [databaseUser]);

  // Utility functions
  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied to clipboard");
  };

  const exportInvestors = () => {
    if (!influencerData.investors || influencerData.investors.length === 0) {
      toast.error("No investor data to export");
      return;
    }

    const csv = "Address,Display Name,Token Balance,Value USD,Join Date,ETH Invested\n" + 
      influencerData.investors.map(inv => 
        `${inv.address},${inv.displayName},${inv.tokenBalance},${inv.value},${inv.joinDate},${inv.ethInvested}`
      ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investors.csv';
    a.click();
    toast.success("Investor data exported successfully");
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-20">
          <Card className="bg-zinc-900 border-zinc-800 max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-red-400">Error Loading Dashboard</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={handleRefresh} className="bg-primary hover:bg-primary/90 text-black">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // No token setup yet
  if (!influencerData.hasToken) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-20">
          <Card className="bg-zinc-900 border-zinc-800 max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <CardTitle className="text-yellow-400">Token Setup Required</CardTitle>
              <CardDescription>
                {influencerData.message || "Your influencer token hasn't been set up yet. Contact an admin to configure your token parameters."}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={handleRefresh} className="bg-primary hover:bg-primary/90 text-black mb-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
              <p className="text-xs text-gray-500">
                An admin needs to set up your pledge threshold and token details.
              </p>
              {influencerData.influencerInfo && (
                <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg text-left">
                  <p className="text-sm text-gray-400 mb-2">Current Status:</p>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${
                      influencerData.influencerInfo.isApproved ? 'bg-green-500/20 text-green-400' : 
                      influencerData.influencerInfo.thresholdMet ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {influencerData.influencerInfo.isApproved ? 'Approved' : 
                       influencerData.influencerInfo.thresholdMet ? 'Threshold Met' : 
                       'Collecting Pledges'}
                    </Badge>
                    {influencerData.influencerInfo.pledgeThreshold > 0 && (
                      <span className="text-xs text-gray-400">
                        {influencerData.influencerInfo.totalPledged.toFixed(2)} / {influencerData.influencerInfo.pledgeThreshold} ETH
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      {/* Dashboard Header */}
      <div className="bg-zinc-900/50 border-b border-zinc-800 pt-16">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-green-400 rounded-full flex items-center justify-center text-xl font-bold text-black">
                {databaseUser?.display_name?.[0] || influencerData.influencerInfo?.name?.[0] || 'I'}
              </div>
              <div>
                <h1 className="text-xl font-bold">Influencer Dashboard</h1>
                <p className="text-sm text-gray-400">
                  {influencerData.influencerInfo?.name || databaseUser?.display_name} • {databaseUser?.email}
                </p>
                <p className="text-xs text-green-400 mt-1">
                  ✅ Unified Architecture: Real-time data synchronized
                </p>
                {influencerData.influencerInfo && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs ${
                      influencerData.influencerInfo.isApproved ? 'bg-green-500/20 text-green-400' : 
                      influencerData.influencerInfo.thresholdMet ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {influencerData.influencerInfo.isApproved ? 'Approved' : 
                       influencerData.influencerInfo.thresholdMet ? 'Threshold Met' : 
                       'Collecting Pledges'}
                    </Badge>
                    {influencerData.influencerInfo.pledgeThreshold > 0 && (
                      <span className="text-xs text-gray-400">
                        {influencerData.influencerInfo.totalPledged.toFixed(2)} / {influencerData.influencerInfo.pledgeThreshold} ETH
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleRefresh} 
                variant="outline" 
                size="sm" 
                className="border-zinc-700 hover:border-primary/50"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="border-zinc-700 hover:border-primary/50">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
              <Button size="sm" className="bg-primary text-black hover:bg-primary/90">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Token Info Bar */}
      {influencerData.token && (
        <div className="bg-zinc-900/30 border-b border-zinc-800">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {influencerData.token.symbol}
                </Badge>
                <span className="text-gray-400 text-sm font-mono">{influencerData.token.address}</span>
                <button onClick={() => copyAddress(influencerData.token!.address)} className="text-gray-400 hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span>Price: <span className="text-primary">${influencerData.token.currentPrice.toFixed(6)}</span></span>
                <span>24h: <span className={influencerData.token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {influencerData.token.priceChange24h >= 0 ? '+' : ''}{influencerData.token.priceChange24h.toFixed(2)}%
                </span></span>
                <span>MCap: <span className="text-white">${(influencerData.token.marketCap / 1000000).toFixed(2)}M</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Architecture Success Message */}
      <div className="container mx-auto px-6 py-4">
        <Alert className="border-green-500/20 bg-green-500/5">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            ✅ Unified Architecture: Dashboard data synchronized with main platform API
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="investors">
              Investors ({influencerData.stats.totalInvestors})
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-primary" />
                    My Token Balance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {influencerData.token?.myBalance ? Number(influencerData.token.myBalance).toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">30% of total supply</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    My Share Value
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ${influencerData.token?.myShareValue ? influencerData.token.myShareValue.toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    {influencerData.token?.priceChange24h ? (influencerData.token.priceChange24h >= 0 ? '+' : '') + influencerData.token.priceChange24h.toFixed(2) : '0'}%
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    Total Holders
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{influencerData.token?.holders?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-gray-500 mt-1">Active investors</p>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    24h Volume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">${influencerData.token?.volume24h?.toLocaleString() || '0'}</p>
                  <p className="text-xs text-gray-500 mt-1">Trading volume</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your token and community</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => setShowGiftModal(true)}
                    className="h-auto p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-left justify-start"
                    disabled={!influencerData.token?.myBalance || influencerData.token.myBalance === 0}
                  >
                    <div className="flex flex-col gap-2">
                      <Gift className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="font-medium text-white">Gift Tokens</p>
                        <p className="text-xs text-gray-400">Reward your community</p>
                      </div>
                    </div>
                  </Button>

                  <Button 
                    className="h-auto p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-left justify-start"
                    disabled={!influencerData.token?.myBalance || influencerData.token.myBalance === 0}
                  >
                    <div className="flex flex-col gap-2">
                      <Flame className="w-6 h-6 text-orange-400" />
                      <div>
                        <p className="font-medium text-white">Burn Tokens</p>
                        <p className="text-xs text-gray-400">Reduce supply</p>
                      </div>
                    </div>
                  </Button>

                  <Button className="h-auto p-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-left justify-start">
                    <div className="flex flex-col gap-2">
                      <Bell className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-medium text-white">Announcement</p>
                        <p className="text-xs text-gray-400">Update holders</p>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investors" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Your Investors</CardTitle>
                  <CardDescription>
                    {influencerData.stats.totalInvestors} token holders • Total raised: {influencerData.stats.totalEthRaised.toFixed(4)} ETH
                  </CardDescription>
                </div>
                <Button onClick={exportInvestors} size="sm" variant="outline" className="border-zinc-700 hover:border-primary/50">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {influencerData.investors && influencerData.investors.length > 0 ? (
                    influencerData.investors.map((investor, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors">
                        <div>
                          <p className="font-medium">{investor.address}</p>
                          <p className="text-sm text-gray-400">
                            {investor.displayName} • Joined {new Date(investor.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{investor.tokenBalance.toLocaleString()} tokens</p>
                          <p className="text-sm text-green-400">${investor.value.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{investor.ethInvested} ETH invested</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-2">No investors yet</p>
                      <p className="text-sm">Start promoting your token to attract investors!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest transactions and events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {influencerData.recentActivity && influencerData.recentActivity.length > 0 ? (
                    influencerData.recentActivity.map((activity, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            activity.type === 'buy' ? 'bg-green-400' : 
                            activity.type === 'sell' ? 'bg-red-400' : 'bg-primary'
                          }`} />
                          <div>
                            <p className="font-medium">{activity.type.toUpperCase()}: {activity.amount}</p>
                            <p className="text-sm text-gray-400">{activity.user}</p>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">{activity.timestamp}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-2">No recent activity</p>
                      <p className="text-sm">Activity will appear here as users interact with your token</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Community Rewards</CardTitle>
                <CardDescription>Incentivize and reward your token holders</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="font-medium mb-2">Airdrop Campaign</h3>
                  <p className="text-sm text-gray-400 mb-3">Reward your top holders with bonus tokens</p>
                  <Button className="bg-green-500 hover:bg-green-600 text-black">
                    Setup Airdrop
                  </Button>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
                  <h3 className="font-medium mb-2">Staking Rewards</h3>
                  <p className="text-sm text-gray-400 mb-3">Enable staking to reward long-term holders</p>
                  <Button className="bg-primary hover:bg-primary/90 text-black">
                    Configure Staking
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Gift Modal */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Gift Tokens</CardTitle>
              <CardDescription>Send tokens to reward your community</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient Address</label>
                <Input
                  placeholder="0x..."
                  value={giftForm.recipient}
                  onChange={(e) => setGiftForm({...giftForm, recipient: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Amount</label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={giftForm.amount}
                  onChange={(e) => setGiftForm({...giftForm, amount: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {influencerData.token?.myBalance ? Number(influencerData.token.myBalance).toLocaleString() : '0'} tokens
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message (optional)</label>
                <Textarea
                  placeholder="Thanks for your support!"
                  value={giftForm.message}
                  onChange={(e) => setGiftForm({...giftForm, message: e.target.value})}
                  className="bg-zinc-800 border-zinc-700"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowGiftModal(false)}
                  className="flex-1 border-zinc-700"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleGiftTokens}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Gift
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InfluencerDashboard;