// src/pages/AdminDashboard.tsx - Revamped with complete token creation workflow
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  Crown, Users, Coins, TrendingUp, AlertTriangle, CheckCircle, XCircle, 
  Eye, DollarSign, Activity, RefreshCw, Plus, ExternalLink, Copy, 
  Loader2, Rocket, Target, Clock, Zap, Edit, Trash2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/ui/header';
import DynamicInfluencerCard, { CardState } from '@/components/ui/dynamic-influencer-card';
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
  }
] as const;

interface AdminInfluencer {
  id: string;
  name: string;
  handle: string;
  email: string;
  walletAddress: string;
  category: string;
  description: string;
  avatar: string;
  verified: boolean;
  followers: number;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress?: string;
  tokenId?: number;
  pledgeThresholdETH: number;
  pledgeThresholdUSDC: number;
  totalPledgedETH: number;
  totalPledgedUSDC: number;
  pledgeCount: number;
  status: string;
  cardState: CardState;
  isApproved: boolean;
  isLaunched: boolean;
  launchedAt?: string;
  ethProgress: number;
  usdcProgress: number;
  overallProgress: number;
  createdAt: string;
  updatedAt: string;
}

interface NewInfluencerForm {
  name: string;
  handle: string;
  email: string;
  walletAddress: string;
  category: string;
  description: string;
  followers: string;
  pledgeThresholdETH: string;
  pledgeThresholdUSDC: string;
  tokenName: string;
  tokenSymbol: string;
  verified: boolean;
}

const CATEGORIES = [
  'Cryptocurrency & Blockchain',
  'Technology & Innovation', 
  'Fitness & Wellness',
  'Entertainment & Media',
  'Business & Finance',
  'Gaming & Esports',
  'Fashion & Lifestyle',
  'Education & Learning',
  'Food & Cooking',
  'Travel & Adventure',
  'Art & Design',
  'Music & Audio',
  'Sports & Athletics',
  'Science & Research',
  'Politics & Current Events'
];

const AdminDashboard = () => {
  const { databaseUser, user } = useAuth(); // Add 'user' (Firebase user)
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for influencer management
  const [influencers, setInfluencers] = useState<AdminInfluencer[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<AdminInfluencer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // New influencer form
  const [newInfluencerForm, setNewInfluencerForm] = useState<NewInfluencerForm>({
    name: '',
    handle: '',
    email: '',
    walletAddress: '',
    category: '',
    description: '',
    followers: '',
    pledgeThresholdETH: '',
    pledgeThresholdUSDC: '',
    tokenName: '',
    tokenSymbol: '',
    verified: false
  });

  // Token creation state
  const [tokenCreationData, setTokenCreationData] = useState<any>(null);
  
  // Use the existing dashboard hook for stats
  const {
    stats,
    pendingApprovals,
    loading: statsLoading,
    error: statsError,
    refreshData: refreshStats,
    processApproval
  } = useAdminDashboard();

  // Token Factory contract integration
  const { data: factoryInfo } = useReadContract({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TOKEN_FACTORY_ABI,
    functionName: 'getFactoryInfo',
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

  // Fetch influencers data
  const fetchInfluencers = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/dashboard/admin/influencers', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch influencers');
      
      const result = await response.json();
      setInfluencers(result.data || []);
      
    } catch (error) {
      console.error('Error fetching influencers:', error);
      toast.error('Failed to load influencers');
    } finally {
      setLoading(false);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchInfluencers(),
        refreshStats()
      ]);
      toast.success('Dashboard refreshed');
    } catch (error) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    if (databaseUser?.status === 'admin') {
      fetchInfluencers();
    }
  }, [databaseUser]);

  // Handle form changes
  const handleFormChange = (field: keyof NewInfluencerForm, value: string | boolean) => {
    setNewInfluencerForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-generate token symbol from name
    if (field === 'name' && typeof value === 'string') {
      const symbol = value.substring(0, 5).toUpperCase().replace(/\s/g, '');
      setNewInfluencerForm(prev => ({
        ...prev,
        tokenSymbol: symbol,
        tokenName: `${value} Token`
      }));
    }
  };

  // Create new influencer
  const handleCreateInfluencer = async () => {
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/dashboard/admin/influencers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newInfluencerForm.name,
          handle: newInfluencerForm.handle,
          email: newInfluencerForm.email,
          walletAddress: newInfluencerForm.walletAddress,
          category: newInfluencerForm.category,
          description: newInfluencerForm.description,
          followers: parseInt(newInfluencerForm.followers) || 0,
          pledgeThresholdETH: parseFloat(newInfluencerForm.pledgeThresholdETH) || 0,
          pledgeThresholdUSDC: parseFloat(newInfluencerForm.pledgeThresholdUSDC) || 0,
          tokenName: newInfluencerForm.tokenName,
          tokenSymbol: newInfluencerForm.tokenSymbol,
          verified: newInfluencerForm.verified
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create influencer');
      }
      
      toast.success('Influencer created successfully');
      setShowCreateModal(false);
      setNewInfluencerForm({
        name: '', handle: '', email: '', walletAddress: '', category: '', 
        description: '', followers: '', pledgeThresholdETH: '', pledgeThresholdUSDC: '',
        tokenName: '', tokenSymbol: '', verified: false
      });
      fetchInfluencers();
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to create influencer');
    }
  };

  // Approve influencer
  const handleApproveInfluencer = async (influencerId: string) => {
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/dashboard/admin/influencers/${influencerId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to approve influencer');
      }
      
      toast.success('Influencer approved successfully');
      fetchInfluencers();
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve influencer');
    }
  };

  // Prepare token creation
  const handlePrepareTokenCreation = async (influencer: AdminInfluencer) => {
    try {
      const token = await user?.getIdToken();
      
      const response = await fetch(`/api/dashboard/admin/influencers/${influencer.id}/token-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get token data');
      }
      
      const result = await response.json();
      setTokenCreationData(result.data);
      setSelectedInfluencer(influencer);
      setShowTokenModal(true);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to prepare token creation');
    }
  };

  // Handle blockchain token creation
  const handleCreateToken = async () => {
    if (!tokenCreationData || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const creationFee = factoryInfo?.[2] || parseEther("0.01");
      
      writeContract({
        address: TOKEN_FACTORY_ADDRESS,
        abi: TOKEN_FACTORY_ABI,
        functionName: 'createCoin',
        args: [
          tokenCreationData.name,
          tokenCreationData.symbol,
          tokenCreationData.influencerName,
          tokenCreationData.influencerWallet as `0x${string}`,
          BigInt(tokenCreationData.totalSupply)
        ],
        value: creationFee,
        account: address,
        chain: baseSepolia,
      });
      
      toast.success("Transaction submitted! Waiting for confirmation...");
      
    } catch (error: any) {
      console.error("Error creating token:", error);
      toast.error(error.message || "Failed to create token");
    }
  };

  // Handle successful token creation
  useEffect(() => {
    if (isTransactionSuccess && createCoinData && tokenCreationData && selectedInfluencer) {
      // Call backend to sync token creation with database
      const syncTokenCreation = async () => {
        try {
          const token = await user?.getIdToken();
          
          const response = await fetch(`/api/dashboard/admin/influencers/${selectedInfluencer.id}/create-token`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tokenAddress: "0x...", // Would extract from transaction logs
              txHash: createCoinData
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to sync token creation');
          }
          
          toast.success(`Token ${tokenCreationData.symbol} created successfully!`);
          setShowTokenModal(false);
          setTokenCreationData(null);
          setSelectedInfluencer(null);
          fetchInfluencers();
          
        } catch (error: any) {
          toast.error(error.message || 'Token created but failed to sync with database');
        }
      };
      
      syncTokenCreation();
    }
  }, [isTransactionSuccess, createCoinData, tokenCreationData, selectedInfluencer]);

  // Get state-based actions for influencer
  const getInfluencerActions = (influencer: AdminInfluencer) => {
    const actions = [];
    
    switch (influencer.cardState) {
      case 'threshold_met':
        if (!influencer.isApproved) {
          actions.push({
            label: 'Approve',
            icon: CheckCircle,
            onClick: () => handleApproveInfluencer(influencer.id),
            className: 'bg-green-500 hover:bg-green-600 text-white'
          });
        }
        break;
        
      case 'ready_for_launch':
        actions.push({
          label: 'Create Token',
          icon: Rocket,
          onClick: () => handlePrepareTokenCreation(influencer),
          className: 'bg-blue-500 hover:bg-blue-600 text-white'
        });
        break;
        
      case 'live':
        actions.push({
          label: 'View Token',
          icon: Eye,
          onClick: () => window.open(`/coin/${influencer.name.toLowerCase().replace(/\s+/g, '')}`, '_blank'),
          className: 'bg-primary hover:bg-primary/90 text-black'
        });
        break;
    }
    
    // Always add edit action
    actions.push({
      label: 'Edit',
      icon: Edit,
      onClick: () => {
        setSelectedInfluencer(influencer);
        setShowEditModal(true);
      },
      className: 'bg-gray-600 hover:bg-gray-700 text-white'
    });
    
    return actions;
  };

  const getStatusBadge = (cardState: CardState) => {
    const configs = {
      live: { color: 'bg-green-500', text: 'Live' },
      ready_for_launch: { color: 'bg-blue-500', text: 'Ready for Launch' },
      approved: { color: 'bg-purple-500', text: 'Approved' },
      threshold_met: { color: 'bg-yellow-500', text: 'Threshold Met' },
      pledging: { color: 'bg-orange-500', text: 'Pledging' },
      pending: { color: 'bg-gray-500', text: 'Pending' }
    };
    
    const config = configs[cardState] || configs.pending;
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  if (statsError) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-20">
          <Card className="bg-zinc-900 border-zinc-800 max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-red-400">Error Loading Dashboard</CardTitle>
              <CardDescription>{statsError}</CardDescription>
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <div className="pt-20 p-6">
        {/* Dashboard Header */}
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
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">+{stats.newUsersToday} today</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Influencers</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalInfluencers}</div>
                <p className="text-xs text-gray-500 mt-1">{stats.approvedInfluencers || 0} approved</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Live Tokens</CardTitle>
                <Coins className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalTokens}</div>
                <p className="text-xs text-gray-500 mt-1">Trading actively</p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Pending Actions</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.pendingApprovals}</div>
                <p className="text-xs text-gray-500 mt-1">Awaiting review</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="influencers">
              Influencer Management
              {influencers.length > 0 && (
                <Badge className="ml-2 bg-primary/20 text-primary text-xs">
                  {influencers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="token-factory">Token Factory</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Influencer Card States</CardTitle>
                  <CardDescription>Current status of all influencer cards</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { state: 'ready_for_launch', count: influencers.filter(i => i.cardState === 'ready_for_launch').length, label: 'Ready for Launch', color: 'text-blue-400' },
                      { state: 'threshold_met', count: influencers.filter(i => i.cardState === 'threshold_met').length, label: 'Threshold Met', color: 'text-yellow-400' },
                      { state: 'live', count: influencers.filter(i => i.cardState === 'live').length, label: 'Live Trading', color: 'text-green-400' },
                      { state: 'pledging', count: influencers.filter(i => i.cardState === 'pledging').length, label: 'Accepting Pledges', color: 'text-orange-400' }
                    ].map(item => (
                      <div key={item.state} className="flex justify-between items-center">
                        <span className="text-gray-400">{item.label}</span>
                        <span className={`font-semibold ${item.color}`}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common administrative tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button 
                      className="w-full justify-start bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                      onClick={() => setActiveTab('influencers')}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Manage Influencers ({influencers.length})
                    </Button>
                    <Button 
                      className="w-full justify-start bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30"
                      onClick={() => {
                        setActiveTab('influencers');
                        setShowCreateModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Influencer
                    </Button>
                    <Button 
                      className="w-full justify-start bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30"
                      onClick={() => setActiveTab('token-factory')}
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Token Factory ({influencers.filter(i => i.cardState === 'ready_for_launch').length} ready)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="influencers" className="space-y-6">
            {/* Influencer Management Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Influencer Management</h2>
                <p className="text-gray-400">Manage all influencers and their token states</p>
              </div>
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary/90 text-black font-semibold"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Influencer
              </Button>
            </div>

            {/* Influencer Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : influencers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {influencers.map((influencer) => (
                  <div key={influencer.id} className="relative">
                    <DynamicInfluencerCard
                      id={influencer.id}
                      name={influencer.name}
                      handle={influencer.handle}
                      avatar={influencer.avatar}
                      category={influencer.category}
                      description={influencer.description}
                      followers={influencer.followers?.toString() || '0'}
                      verified={influencer.verified}
                      cardState={influencer.cardState}
                      isApproved={influencer.isApproved}
                      isLaunched={influencer.isLaunched}
                      pledgeThresholdETH={influencer.pledgeThresholdETH}
                      pledgeThresholdUSDC={influencer.pledgeThresholdUSDC}
                      totalPledgedETH={influencer.totalPledgedETH}
                      totalPledgedUSDC={influencer.totalPledgedUSDC}
                      pledgeCount={influencer.pledgeCount}
                      overallProgress={influencer.overallProgress}
                      tokenSymbol={influencer.tokenSymbol}
                      tokenAddress={influencer.tokenAddress}
                    />
                    
                    {/* Admin Action Overlay */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {getInfluencerActions(influencer).map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          className={`h-8 px-2 text-xs ${action.className}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick();
                          }}
                        >
                          <action.icon className="w-3 h-3" />
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardContent className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Influencers Yet</h3>
                  <p className="text-gray-400 mb-4">Start by adding your first influencer to the platform</p>
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary hover:bg-primary/90 text-black"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Influencer
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="token-factory" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Token Factory Status</CardTitle>
                <CardDescription>Smart contract token deployment management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Rocket className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-gray-400 mb-2">Token Factory integration active</p>
                  <p className="text-sm text-gray-500">
                    Ready to deploy tokens for {influencers.filter(i => i.cardState === 'ready_for_launch').length} approved influencers
                  </p>
                  <div className="mt-4 text-xs text-gray-500">
                    Contract: {TOKEN_FACTORY_ADDRESS}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Influencer Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Influencer</DialogTitle>
              <DialogDescription>
                Create a new influencer profile with pledge thresholds
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Name</label>
                  <Input
                    placeholder="Logan Paul"
                    value={newInfluencerForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Handle</label>
                  <Input
                    placeholder="@loganpaul"
                    value={newInfluencerForm.handle}
                    onChange={(e) => handleFormChange('handle', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    placeholder="logan@example.com"
                    value={newInfluencerForm.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Wallet Address</label>
                  <Input
                    placeholder="0x..."
                    value={newInfluencerForm.walletAddress}
                    onChange={(e) => handleFormChange('walletAddress', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={newInfluencerForm.category} onValueChange={(value) => handleFormChange('category', value)}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {CATEGORIES.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Followers</label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={newInfluencerForm.followers}
                    onChange={(e) => handleFormChange('followers', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Brief description of the influencer..."
                  value={newInfluencerForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">ETH Threshold</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1.0"
                    value={newInfluencerForm.pledgeThresholdETH}
                    onChange={(e) => handleFormChange('pledgeThresholdETH', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">USDC Threshold</label>
                  <Input
                    type="number"
                    placeholder="2000"
                    value={newInfluencerForm.pledgeThresholdUSDC}
                    onChange={(e) => handleFormChange('pledgeThresholdUSDC', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Token Name</label>
                  <Input
                    placeholder="Logan Paul Token"
                    value={newInfluencerForm.tokenName}
                    onChange={(e) => handleFormChange('tokenName', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Token Symbol</label>
                  <Input
                    placeholder="LOGAN"
                    value={newInfluencerForm.tokenSymbol}
                    onChange={(e) => handleFormChange('tokenSymbol', e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="verified"
                  checked={newInfluencerForm.verified}
                  onChange={(e) => handleFormChange('verified', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="verified" className="text-sm">Verified influencer</label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleCreateInfluencer}
                  className="flex-1 bg-primary hover:bg-primary/90 text-black"
                >
                  Create Influencer
                </Button>
                <Button 
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="border-zinc-700 hover:border-primary/50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Token Creation Modal */}
        <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
          <DialogContent className="bg-zinc-900 border-zinc-800">
            <DialogHeader>
              <DialogTitle>Create Token: {tokenCreationData?.name}</DialogTitle>
              <DialogDescription>
                Deploy token smart contract for {selectedInfluencer?.name}
              </DialogDescription>
            </DialogHeader>
            
            {tokenCreationData && (
              <div className="space-y-4">
                <div className="bg-zinc-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Token Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span>{tokenCreationData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Symbol:</span>
                      <span>{tokenCreationData.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Supply:</span>
                      <span>{parseInt(tokenCreationData.totalSupply).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Influencer:</span>
                      <span>{tokenCreationData.influencerName}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-800 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Token Allocation</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Influencer (30%):</span>
                      <span>{(parseInt(tokenCreationData.totalSupply) * 0.3).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Treasury (65%):</span>
                      <span>{(parseInt(tokenCreationData.totalSupply) * 0.65).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform (5%):</span>
                      <span>{(parseInt(tokenCreationData.totalSupply) * 0.05).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {createCoinError && (
                  <Alert className="border-red-500/20 bg-red-500/5">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-400">
                      Error: {createCoinError.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button 
                    onClick={handleCreateToken}
                    disabled={isCreateCoinLoading || isTransactionLoading || !isConnected}
                    className="flex-1 bg-primary hover:bg-primary/90 text-black"
                  >
                    {(isCreateCoinLoading || isTransactionLoading) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Token...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy Token ({factoryInfo ? formatEther(factoryInfo[2]) : "0.01"} ETH)
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => setShowTokenModal(false)}
                    variant="outline"
                    className="border-zinc-700 hover:border-primary/50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;