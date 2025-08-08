// src/pages/InfluencerDashboard.tsx
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
import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
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
  Shield,
  Clock,
  Activity
} from "lucide-react";
import { toast } from "@/components/ui/sonner";

// Contract ABIs
const INFLUENCER_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "address","name": "account","type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface TokenStats {
  balance: bigint;
  totalSupply: bigint;
  marketCap: number;
  holders: number;
  volume24h: number;
  priceChange24h: number;
  currentPrice: number;
}

interface Investor {
  address: string;
  amount: number;
  value: number;
  joinDate: string;
  txHash: string;
}

interface ActivityItem {
  type: 'buy' | 'sell' | 'transfer' | 'pledge';
  user: string;
  amount: string;
  timestamp: string;
  txHash: string;
}

const InfluencerDashboard = () => {
  const navigate = useNavigate();
  const { databaseUser } = useAuth();
  const { address } = useAccount();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [giftForm, setGiftForm] = useState({ recipient: "", amount: "", message: "" });
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock token address - replace with actual from database
  const tokenAddress = "0x742d35Cc6634C0532925a3b844dD90E8B73ac3E8" as `0x${string}`;

  // Read token balance
  const { data: balance } = useReadContract({
    address: tokenAddress,
    abi: INFLUENCER_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read total supply
  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: INFLUENCER_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  useEffect(() => {
    // Check if user is influencer
    if (databaseUser?.status !== 'influencer' && databaseUser?.status !== 'admin') {
      toast.error("Access denied. Influencer status required.");
      navigate('/');
      return;
    }

    loadDashboardData();
  }, [databaseUser]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Mock data for now
      setInvestors([
        {
          address: '0x123...abc',
          amount: 50000,
          value: 1250,
          joinDate: '2024-01-15',
          txHash: '0x123abc'
        },
        {
          address: '0x456...def',
          amount: 25000,
          value: 625,
          joinDate: '2024-01-20',
          txHash: '0x456def'
        }
      ]);

      setRecentActivity([
        {
          type: 'buy',
          user: '0x789...ghi',
          amount: '10,000 ROHINI',
          timestamp: '2 hours ago',
          txHash: '0x789ghi'
        },
        {
          type: 'pledge',
          user: '0x012...jkl',
          amount: '0.5 ETH',
          timestamp: '5 hours ago',
          txHash: '0x012jkl'
        }
      ]);

      // Calculate stats
      const mockPrice = 0.0025;
      setTokenStats({
        balance: BigInt(300000),
        totalSupply: BigInt(1000000),
        marketCap: 2500000,
        holders: 847,
        volume24h: 89234,
        priceChange24h: 12.4,
        currentPrice: mockPrice
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleGiftTokens = async () => {
    if (!giftForm.recipient || !giftForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // TODO: Implement actual token transfer
      toast.success(`Successfully sent ${giftForm.amount} tokens to ${giftForm.recipient}`);
      setShowGiftModal(false);
      setGiftForm({ recipient: "", amount: "", message: "" });
    } catch (error) {
      toast.error("Failed to send tokens");
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    toast.success("Address copied to clipboard");
  };

  const exportInvestors = () => {
    const csv = investors.map(inv => 
      `${inv.address},${inv.amount},${inv.value},${inv.joinDate}`
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investors.csv';
    a.click();
  };

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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      {/* Dashboard Header */}
      <div className="bg-zinc-900/50 border-b border-zinc-800 pt-16">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-green-400 rounded-full flex items-center justify-center text-xl font-bold text-black">
                {databaseUser?.display_name?.[0] || 'I'}
              </div>
              <div>
                <h1 className="text-xl font-bold">Influencer Dashboard</h1>
                <p className="text-sm text-gray-400">{databaseUser?.display_name} • {databaseUser?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-zinc-700">
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
      <div className="bg-zinc-900/30 border-b border-zinc-800">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className="bg-primary/20 text-primary border-primary/30">ROHINI</Badge>
              <span className="text-gray-400 text-sm font-mono">{tokenAddress}</span>
              <button onClick={() => copyAddress(tokenAddress)} className="text-gray-400 hover:text-white">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span>Price: <span className="text-primary">${tokenStats?.currentPrice || '0.00'}</span></span>
              <span>24h: <span className="text-green-400">+{tokenStats?.priceChange24h || 0}%</span></span>
              <span>MCap: <span className="text-white">${((tokenStats?.marketCap || 0) / 1000000).toFixed(2)}M</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="investors">Investors</TabsTrigger>
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
                  <p className="text-2xl font-bold">{tokenStats ? Number(tokenStats.balance).toLocaleString() : '0'}</p>
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
                    ${tokenStats ? (Number(tokenStats.balance) * tokenStats.currentPrice).toLocaleString() : '0'}
                  </p>
                  <p className="text-xs text-green-400 mt-1">+{tokenStats?.priceChange24h || 0}%</p>
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
                  <p className="text-2xl font-bold">{tokenStats?.holders.toLocaleString() || '0'}</p>
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
                  <p className="text-2xl font-bold">${tokenStats?.volume24h.toLocaleString() || '0'}</p>
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
                  >
                    <div className="flex flex-col gap-2">
                      <Gift className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="font-medium text-white">Gift Tokens</p>
                        <p className="text-xs text-gray-400">Reward your community</p>
                      </div>
                    </div>
                  </Button>

                  <Button className="h-auto p-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-left justify-start">
                    <div className="flex flex-col gap-2">
                      <Flame className="w-6 h-6 text-orange-400" />
                      <div>
                        <p className="font-medium text-white">Burn Tokens</p>
                        <p className="text-xs text-gray-400">Reduce supply</p>
                      </div>
                    </div>
                  </Button>

                  <Button className="h-auto p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-left justify-start">
                    <div className="flex flex-col gap-2">
                      <Bell className="w-6 h-6 text-purple-400" />
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
                  <CardDescription>{investors.length} token holders</CardDescription>
                </div>
                <Button onClick={exportInvestors} size="sm" variant="outline" className="border-zinc-700">
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {investors.map((investor, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors">
                      <div>
                        <p className="font-medium">{investor.address}</p>
                        <p className="text-sm text-gray-400">Joined {investor.joinDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{investor.amount.toLocaleString()} tokens</p>
                        <p className="text-sm text-green-400">${investor.value.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
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
                  {recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'buy' ? 'bg-green-400' : 
                          activity.type === 'sell' ? 'bg-red-400' : 'bg-blue-400'
                        }`} />
                        <div>
                          <p className="font-medium">{activity.type.toUpperCase()}: {activity.amount}</p>
                          <p className="text-sm text-gray-400">{activity.user}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">{activity.timestamp}</span>
                    </div>
                  ))}
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

                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h3 className="font-medium mb-2">Staking Rewards</h3>
                  <p className="text-sm text-gray-400 mb-3">Enable staking to reward long-term holders</p>
                  <Button className="bg-purple-500 hover:bg-purple-600">
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
                  Available: {tokenStats ? Number(tokenStats.balance).toLocaleString() : '0'} tokens
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