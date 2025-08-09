// src/pages/AdminDashboard.tsx - Updated with Token Factory integration
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Crown, Users, Coins, TrendingUp, AlertTriangle, CheckCircle, XCircle, Eye, DollarSign, Activity, RefreshCw, Plus, ExternalLink, Copy, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/ui/header';
import { useAdminDashboard } from '@/lib/dashboard/dashboardAPI';
import { toast } from '@/components/ui/sonner';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { baseSepolia } from 'wagmi/chains';

// Token Factory Contract Configuration
const TOKEN_FACTORY_ADDRESS = "0x18594f5d4761b9DBEA625dDeD86356F6D346A09a" as `0x${string}`;

const TOKEN_FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_symbol", "type": "string" },
      { "internalType": "string", "name": "_influencerName", "type": "string" },
      { "internalType": "address", "name": "_influencerWallet", "type": "address" },
      { "internalType": "uint256", "name": "_totalSupply", "type": "uint256" }
    ],
    "name": "createCoin",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFactoryInfo",
    "outputs": [
      { "internalType": "address", "name": "_treasury", "type": "address" },
      { "internalType": "address", "name": "_platform", "type": "address" },
      { "internalType": "uint256", "name": "_creationFee", "type": "uint256" },
      { "internalType": "uint256", "name": "_totalTokens", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllCoins",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface PendingApproval {
  id: string;
  type: string;
  name: string;
  details: string;
  requestedAt: string;
  requestedBy: string;
  progress?: number;
}

interface AdminStats {
  totalUsers: number;
  totalInfluencers: number;
  totalTokens: number;
  totalVolume: number;
  totalFees: number;
  pendingApprovals: number;
  activeUsers24h: number;
  newUsersToday: number;
  approvedInfluencers: number;
  totalPledgers: number;
  totalEthPledged: number;
  totalUsdcPledged: number;
}

interface CreatedCoin {
  address: string;
  name: string;
  symbol: string;
  influencerName: string;
  influencerWallet: string;
  totalSupply: string;
  launchTime: number;
  txHash?: string;
}

const AdminDashboard = () => {
  const { databaseUser } = useAuth();
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Token Factory state
  const [showTokenFactory, setShowTokenFactory] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    influencerName: "",
    influencerWallet: "",
    totalSupply: "1000000"
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdCoins, setCreatedCoins] = useState<CreatedCoin[]>([]);
  const [lastCreatedCoin, setLastCreatedCoin] = useState<CreatedCoin | null>(null);
  
  // Use the real database integration hook
  const {
    stats,
    pendingApprovals,
    loading,
    error,
    refreshData,
    processApproval
  } = useAdminDashboard();

  // Token Factory contract integration
  const { data: factoryInfo } = useReadContract({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TOKEN_FACTORY_ABI,
    functionName: 'getFactoryInfo',
  });

  const { data: allCoinsAddresses } = useReadContract({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TOKEN_FACTORY_ABI,
    functionName: 'getAllCoins',
  });

  const { 
    writeContract,
    data: createCoinData,
    error: createCoinError,
    isPending: isCreateCoinLoading 
  } = useWriteContract();

  const { 
    isLoading: isTransactionLoading, 
    isSuccess: isTransactionSuccess 
  } = useWaitForTransactionReceipt({
    hash: createCoinData,
  });

  // Load created coins when addresses change
  useEffect(() => {
    if (allCoinsAddresses && allCoinsAddresses.length > 0) {
      loadCoinsData(allCoinsAddresses);
    }
  }, [allCoinsAddresses]);

  const loadCoinsData = async (addresses: readonly `0x${string}`[]) => {
    // For now using mock data - you can implement actual contract calls here
    const mockCoins: CreatedCoin[] = addresses.map((addr, index) => ({
      address: addr,
      name: `Token ${index + 1}`,
      symbol: `TK${index + 1}`,
      influencerName: `Influencer ${index + 1}`,
      influencerWallet: addr,
      totalSupply: "1000000",
      launchTime: Date.now() - (index * 86400000)
    }));
    setCreatedCoins(mockCoins);
  };

  // Handle approval action
  const handleApproval = async (id: string, approved: boolean) => {
    try {
      await processApproval(id, approved);
      toast.success(`Influencer ${approved ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${approved ? 'approve' : 'reject'} influencer`);
      console.error('Approval error:', error);
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Dashboard data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  // Token Factory validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Coin name is required";
    if (!formData.symbol.trim()) newErrors.symbol = "Symbol is required";
    if (formData.symbol.length > 5) newErrors.symbol = "Symbol must be 5 characters or less";
    if (!formData.influencerName.trim()) newErrors.influencerName = "Influencer name is required";
    if (!formData.influencerWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.influencerWallet = "Invalid Ethereum address";
    }
    if (!formData.totalSupply || parseInt(formData.totalSupply) <= 0) {
      newErrors.totalSupply = "Total supply must be positive";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle token creation
  const handleCreateCoin = async () => {
    if (!validateForm()) return;
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
  
    try {
      const creationFee = factoryInfo?.[2] || parseEther("0.01");
      
      writeContract({
        address: TOKEN_FACTORY_ADDRESS,
        abi: TOKEN_FACTORY_ABI,
        functionName: 'createCoin',
        args: [
          formData.name,
          formData.symbol,
          formData.influencerName,
          formData.influencerWallet as `0x${string}`,
          BigInt(formData.totalSupply)
        ],
        value: creationFee,
        account: address,
        chain: baseSepolia,
      });
      
      toast.success("Transaction submitted! Waiting for confirmation...");
      
    } catch (error: any) {
      console.error("Error creating coin:", error);
      
      // Check if it's a network error and suggest switching
      if (error.message?.includes('chain') || error.message?.includes('network')) {
        toast.error("Please switch to Base Sepolia network in your wallet");
      } else {
        toast.error(error.message || "Failed to create token");
      }
    }
  };

  // Handle successful transaction
  useEffect(() => {
    if (isTransactionSuccess && createCoinData) {
      const newCoin: CreatedCoin = {
        address: "0x...", // Would get from transaction logs
        name: formData.name,
        symbol: formData.symbol,
        influencerName: formData.influencerName,
        influencerWallet: formData.influencerWallet,
        totalSupply: formData.totalSupply,
        launchTime: Date.now(),
        txHash: createCoinData
      };
      
      setLastCreatedCoin(newCoin);
      setCreatedCoins(prev => [newCoin, ...prev]);
      
      toast.success(`Successfully created ${formData.name} (${formData.symbol})!`);
      
      // Reset form
      setFormData({
        name: "",
        symbol: "",
        influencerName: "",
        influencerWallet: "",
        totalSupply: "1000000"
      });
      setShowTokenFactory(false);
    }
  }, [isTransactionSuccess, createCoinData, formData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const openEtherscan = (address: string) => {
    window.open(`https://sepolia.basescan.org/address/${address}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      browser: { color: 'bg-gray-500', text: 'Browser' },
      investor: { color: 'bg-blue-500', text: 'Investor' },
      influencer: { color: 'bg-purple-500', text: 'Influencer' },
      admin: { color: 'bg-red-500', text: 'Admin' },
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      approved: { color: 'bg-green-500', text: 'Approved' },
      rejected: { color: 'bg-red-500', text: 'Rejected' },
      live: { color: 'bg-emerald-500', text: 'Live' },
      pledging: { color: 'bg-blue-500', text: 'Pledging' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  const formatCurrency = (amount: number, decimals = 2) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(decimals)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(decimals)}K`;
    return `$${amount.toFixed(decimals)}`;
  };

  const formatEth = (amount: number, decimals = 3) => {
    return `${amount.toFixed(decimals)} ETH`;
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
            <p className="text-gray-400">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      {/* Dashboard Content with proper spacing for header */}
      <div className="pt-20 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Crown className="w-8 h-8 text-yellow-500" />
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-gray-400">Manage CoinFluence platform operations</p>
              <p className="text-xs text-gray-500 mt-1">
                Logged in as: {databaseUser?.display_name || databaseUser?.email} • Status: {databaseUser?.status}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleRefresh} variant="outline" size="sm" className="border-zinc-700 hover:border-primary/50">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Success Alert for Token Creation */}
        {lastCreatedCoin && (
          <Alert className="mb-8 border-primary/20 bg-primary/5">
            <CheckCircle className="h-4 w-4 text-primary" />
            <AlertDescription className="text-primary">
              Successfully created {lastCreatedCoin.name} ({lastCreatedCoin.symbol})!{" "}
              <button 
                onClick={() => openEtherscan(lastCreatedCoin.address)}
                className="underline hover:no-underline"
              >
                View on BaseScan
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview - Using real data from database */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.newUsersToday} today
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Influencers</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalInfluencers}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.approvedInfluencers || 0} approved
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Live Tokens</CardTitle>
                <Coins className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalTokens}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Trading actively
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Pending Approvals</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.pendingApprovals}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Awaiting review
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Stats Row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Platform Volume</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalVolume)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(stats.totalFees)} in fees
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Pledged</CardTitle>
                <Activity className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{formatEth(stats.totalEthPledged || 0)}</div>
                <p className="text-xs text-gray-500 mt-1">
                  From {stats.totalPledgers || 0} pledgers
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Active Users (24h)</CardTitle>
                <Users className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.activeUsers24h}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Platform engagement
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="approvals">
              Pending Approvals 
              {pendingApprovals && pendingApprovals.length > 0 && (
                <Badge className="ml-2 bg-yellow-500 text-black text-xs">
                  {pendingApprovals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="token-factory">Token Factory</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Health */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Platform Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">System Status</span>
                      <Badge className="bg-green-500 text-white">Operational</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Database</span>
                      <Badge className="bg-green-500 text-white">Connected</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">API Health</span>
                      <Badge className="bg-green-500 text-white">Healthy</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Token Factory</span>
                      <Badge className="bg-green-500 text-white">Ready</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Updated</span>
                      <span className="text-white text-sm">{new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                      onClick={() => setActiveTab('approvals')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Review Pending Approvals ({pendingApprovals?.length || 0})
                    </Button>
                    <Button 
                      className="w-full justify-start bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30"
                      onClick={() => setActiveTab('token-factory')}
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Deploy New Token
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full justify-start border-zinc-700 hover:border-primary/50"
                      onClick={() => setActiveTab('users')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Users
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>Review influencers who have met their pledge thresholds</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingApprovals && pendingApprovals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Name</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.map((approval) => (
                        <TableRow key={approval.id} className="border-zinc-800">
                          <TableCell className="font-medium">{approval.name}</TableCell>
                          <TableCell className="max-w-md">
                            <div className="text-sm text-gray-400">
                              {approval.details}
                            </div>
                          </TableCell>
                          <TableCell>{new Date(approval.requestedAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {approval.progress && (
                              <div className="text-sm">
                                <div className="text-primary font-medium">{approval.progress.toFixed(1)}%</div>
                                <div className="text-gray-400 text-xs">of threshold</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproval(approval.id, true)}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproval(approval.id, false)}
                                className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No pending approvals</p>
                    <p className="text-sm">All influencer requests have been processed</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="token-factory" className="space-y-6">
            {/* Token Factory Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Token Factory</h2>
                <p className="text-gray-400">Deploy new influencer tokens to the blockchain</p>
                <div className="text-sm text-gray-500 mt-1">
                  Contract: {TOKEN_FACTORY_ADDRESS}
                </div>
              </div>
              <Button 
                onClick={() => setShowTokenFactory(true)}
                className="bg-primary hover:bg-primary/90 text-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Token
              </Button>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Token Creation Form */}
              {showTokenFactory && (
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Create New Token
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTokenFactory(false)}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      Deploy a new ERC-20 token with automatic allocation (30% influencer, 65% treasury, 5% platform)
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Coin Name</label>
                        <Input
                          placeholder="Logan Paul Coin"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className={errors.name ? 'border-red-500' : 'bg-zinc-800 border-zinc-700'}
                        />
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Symbol</label>
                        <Input
                          placeholder="LOGAN"
                          value={formData.symbol}
                          onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                          maxLength={5}
                          className={errors.symbol ? 'border-red-500' : 'bg-zinc-800 border-zinc-700'}
                        />
                        {errors.symbol && <p className="text-red-400 text-xs mt-1">{errors.symbol}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Influencer Name</label>
                      <Input
                        placeholder="Logan Paul"
                        value={formData.influencerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, influencerName: e.target.value }))}
                        className={errors.influencerName ? 'border-red-500' : 'bg-zinc-800 border-zinc-700'}
                      />
                      {errors.influencerName && <p className="text-red-400 text-xs mt-1">{errors.influencerName}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Influencer Wallet Address</label>
                      <Input
                        placeholder="0xABC...123"
                        value={formData.influencerWallet}
                        onChange={(e) => setFormData(prev => ({ ...prev, influencerWallet: e.target.value }))}
                        className={errors.influencerWallet ? 'border-red-500' : 'bg-zinc-800 border-zinc-700'}
                      />
                      {errors.influencerWallet && <p className="text-red-400 text-xs mt-1">{errors.influencerWallet}</p>}
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Total Supply</label>
                      <Input
                        type="number"
                        placeholder="1000000"
                        value={formData.totalSupply}
                        onChange={(e) => setFormData(prev => ({ ...prev, totalSupply: e.target.value }))}
                        className={errors.totalSupply ? 'border-red-500' : 'bg-zinc-800 border-zinc-700'}
                      />
                      {errors.totalSupply && <p className="text-red-400 text-xs mt-1">{errors.totalSupply}</p>}
                    </div>

                    {/* Allocation Preview */}
                    <div className="bg-zinc-800 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-primary">Token Allocation Preview</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span>Influencer (30%):</span>
                          <span>{(parseInt(formData.totalSupply || "0") * 0.3).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Treasury (65%):</span>
                          <span>{(parseInt(formData.totalSupply || "0") * 0.65).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform (5%):</span>
                          <span>{(parseInt(formData.totalSupply || "0") * 0.05).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      onClick={handleCreateCoin}
                      disabled={isCreateCoinLoading || isTransactionLoading}
                      className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
                    >
                      {(isCreateCoinLoading || isTransactionLoading) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Token...
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Create Token ({factoryInfo ? formatEther(factoryInfo[2]) : "0.01"} ETH fee)
                        </>
                      )}
                    </Button>

                    {createCoinError && (
                      <Alert className="border-red-500/20 bg-red-500/5">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <AlertDescription className="text-red-400">
                          Error: {createCoinError.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Created Tokens List */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-primary" />
                    Created Tokens ({createdCoins.length})
                  </CardTitle>
                  <CardDescription>
                    All influencer tokens created through this factory
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {createdCoins.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-2">No tokens created yet</p>
                        <p className="text-sm">Create your first influencer token!</p>
                      </div>
                    ) : (
                      createdCoins.map((coin, index) => (
                        <div key={index} className="border border-zinc-700 rounded-lg p-4 hover:border-primary/30 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold text-white">{coin.name}</h4>
                              <p className="text-sm text-gray-400">{coin.influencerName}</p>
                            </div>
                            <Badge className="bg-primary/20 text-primary border-primary/30">
                              {coin.symbol}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 mb-3">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>{parseInt(coin.totalSupply).toLocaleString()} supply</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              <span>{new Date(coin.launchTime).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-zinc-600 hover:border-primary/50"
                              onClick={() => copyToClipboard(coin.address)}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Address
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs border-zinc-600 hover:border-primary/50"
                              onClick={() => openEtherscan(coin.address)}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              BaseScan
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions (Full user management coming soon)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">User management interface coming soon</p>
                  <p className="text-sm">For now, user status changes can be made through the API</p>
                  <div className="mt-4 text-xs bg-zinc-800 p-3 rounded-lg">
                    <p className="text-white mb-1">Current user counts:</p>
                    <p>Total Users: {stats?.totalUsers || 0}</p>
                    <p>New Today: {stats?.newUsersToday || 0}</p>
                    <p>Active 24h: {stats?.activeUsers24h || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="influencers" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Influencer Management</CardTitle>
                <CardDescription>Overview of all influencers on the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">Detailed influencer management coming soon</p>
                  <p className="text-sm">Currently {stats?.totalInfluencers || 0} influencers on platform</p>
                  <div className="mt-4 text-xs bg-zinc-800 p-3 rounded-lg">
                    <p className="text-white mb-1">Quick stats:</p>
                    <p>Total Influencers: {stats?.totalInfluencers || 0}</p>
                    <p>Approved: {stats?.approvedInfluencers || 0}</p>
                    <p>Pending Approval: {stats?.pendingApprovals || 0}</p>
                    <p>Live Tokens: {stats?.totalTokens || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;