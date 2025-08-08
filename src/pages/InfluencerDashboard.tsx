// src/pages/InfluencerDashboard.tsx - Updated with real database integration
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  RefreshCw
} from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { useInfluencerDashboard } from '@/lib/dashboard/dashboardAPI';

const InfluencerDashboard = () => {
  const navigate = useNavigate();
  const { databaseUser } = useAuth();
  const { address } = useAccount();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftForm, setGiftForm] = useState({ recipient: "", amount: "", message: "" });

  // Use the real database integration
  const { 
    stats, 
    pledgers, 
    loading, 
    error, 
    refreshData, 
    giftTokens 
  } = useInfluencerDashboard();

  useEffect(() => {
    // Check if user is influencer
    if (databaseUser?.status !== 'influencer' && databaseUser?.status !== 'admin') {
      toast.error("Access denied. Influencer status required.");
      navigate('/');
      return;
    }
  }, [databaseUser]);

  const handleGiftTokens = async () => {
    if (!giftForm.recipient || !giftForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      await giftTokens(giftForm.recipient, parseFloat(giftForm.amount), giftForm.message);
      toast.success(`Successfully sent ${giftForm.amount} tokens to ${giftForm.recipient}`);
      setShowGiftModal(false);
      setGiftForm({ recipient: "", amount: "", message: "" });
    } catch (error) {
      toast.error("Failed to send tokens");
      console.error("Gift tokens error:", error);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied to clipboard");
  };

  const exportInvestors = () => {
    if (!stats?.investors) {
      toast.error("No investor data to export");
      return;
    }

    const csv = "Address,Display Name,Amount,Value,Join Date,ETH Invested\n" + 
      stats.investors.map(inv => 
        `${inv.address},${inv.displayName},${inv.amount},${inv.value},${inv.joinDate},${inv.ethInvested}`
      ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investors.csv';
    a.click();
    toast.success("Investor data exported successfully");
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success("Dashboard data refreshed");
    } catch (error) {
      toast.error("Failed to refresh data");
    }
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
  if (!stats?.hasToken) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-20">
          <Card className="bg-zinc-900 border-zinc-800 max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <CardTitle className="text-yellow-400">Token Setup Required</CardTitle>
              <CardDescription>
                {stats?.message || "Your influencer token hasn't been set up yet. Contact an admin to configure your token parameters."}
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
                {databaseUser?.display_name?.[0] || stats?.influencerInfo?.name?.[0] || 'I'}
              </div>
              <div>
                <h1 className="text-xl font-bold">Influencer Dashboard</h1>
                <p className="text-sm text-gray-400">
                  {stats?.influencerInfo?.name || databaseUser?.display_name} • {databaseUser?.email}
                </p>
                {stats?.influencerInfo && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`text-xs ${
                      stats.influencerInfo.isApproved ? 'bg-green-500/20 text-green-400' : 
                      stats.influencerInfo.thresholdMet ? 'bg-yellow-500/20 text-yellow-400' : 
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {stats.influencerInfo.isApproved ? 'Approved' : 
                       stats.influencerInfo.thresholdMet ? 'Threshold Met' : 
                       'Collecting Pledges'}
                    </Badge>
                    {stats.influencerInfo.pledgeThreshold > 0 && (
                      <span className="text-xs text-gray-400">
                        {stats.influencerInfo.totalPledged.toFixed(2)} / {stats.influencerInfo.pledgeThreshold} ETH
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleRefresh} variant="outline" size="sm" className="border-zinc-700 hover:border-primary/50">
                <RefreshCw className="w-4 h-4 mr-2" />
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
      {stats.token && (
        <div className="bg-zinc-900/30 border-b border-zinc-800">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {stats.token.symbol}
                </Badge>
                <span className="text-gray-400 text-sm font-mono">{stats.token.address}</span>
                <button onClick={() => copyAddress(stats.token.address)} className="text-gray-400 hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span>Price: <span className="text-primary">${stats.token.currentPrice.toFixed(6)}</span></span>
                <span>24h: <span className={stats.token.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {stats.token.priceChange24h >= 0 ? '+' : ''}{stats.token.priceChange24h.toFixed(2)}%
                </span></span>
                <span>MCap: <span className="text-white">${(stats.token.marketCap / 1000000).toFixed(2)}M</span></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="investors">Investors ({stats?.stats?.totalInvestors || 0})</TabsTrigger>
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
                    {stats.token?.myBalance ? Number(stats.token.myBalance).toLocaleString() : '0'}
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
                    ${stats.token?.myShareValue ? stats.token.myShareValue.toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-green-400 mt-1">
                    {stats.token?.priceChange24h >= 0 ? '+' : ''}{stats.token?.priceChange24h?.toFixed(2) || 0}%
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
                  <p className="text-2xl font-bold">{stats.token?.holders?.toLocaleString() || '0'}</p>
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
                  <p className="text-2xl font-bold">${stats.token?.volume24h?.toLocaleString() || '0'}</p>
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
                    disabled={!stats.token?.myBalance || stats.token.myBalance === 0}
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
                    disabled={!stats.token?.myBalance || stats.token.myBalance === 0}
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
                    {stats?.stats?.totalInvestors || 0} token holders • Total raised: {stats?.stats?.totalEthRaised?.toFixed(4) || '0'} ETH
                  </CardDescription>
                </div>
                <Button onClick={exportInvestors} size="sm" variant="outline" className="border-zinc-700 hover:border-primary/50">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.investors && stats.investors.length > 0 ? (
                    stats.investors.map((investor, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors">
                        <div>
                          <p className="font-medium">{investor.address}</p>
                          <p className="text-sm text-gray-400">
                            {investor.displayName} • Joined {new Date(investor.joinDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{investor.amount.toLocaleString()} ETH equivalent</p>
                          <p className="text-sm text-green-400">${investor.value.toLocaleString()}</p>
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
                  {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity, idx) => (
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
                  Available: {stats.token?.myBalance ? Number(stats.token.myBalance).toLocaleString() : '0'} tokens
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