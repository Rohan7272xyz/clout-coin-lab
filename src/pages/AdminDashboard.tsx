// src/pages/AdminDashboard.tsx - Phase 4B: Real Token Deployment Integration
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Users, TrendingUp, DollarSign, Star, AlertCircle, RefreshCw, Plus, Eye, Edit, Trash2, CheckCircle, XCircle, Rocket, Network } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/ui/header';
import { toast } from '@/components/ui/sonner';

// Types for admin dashboard
interface DashboardStats {
  totalInfluencers: number;
  pendingApprovals: number;
  totalPledges: number;
  totalEthRaised: number;
  totalUsdcRaised: number;
  activeTokens: number;
}

interface InfluencerData {
  id: string;
  name: string;
  handle: string;
  email: string;
  category: string;
  description: string;
  avatarUrl: string;
  walletAddress?: string; // Now optional
  verified: boolean;
  followersCount: number;
  tokenName?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  pledgeThresholdETH: number;
  pledgeThresholdUSDC: number;
  totalPledgedETH: number;
  totalPledgedUSDC: number;
  pledgeCount: number;
  ethProgress: number;
  usdcProgress: number;
  status: string;
  isApproved: boolean;
  isLaunched: boolean;
  cardState: string;
  createdAt: string;
  updatedAt: string;
  launchedAt?: string;
}

// UPDATED: Influencer Creation Form (NO wallet address required)
interface NewInfluencerForm {
  name: string;
  handle: string;
  email: string;
  category: string;
  description: string;
  avatarUrl: string;
  followersCount: number;
  pledgeThresholdETH: number;
  pledgeThresholdUSDC: number;
}

// UPDATED: Token Deployment Form with Network Selection
interface TokenDeploymentForm {
  influencerId: string;
  walletAddress: string;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  network: 'base-sepolia' | 'base'; // Network selection for real blockchain
}

// Data transformation helper function (updated for optional wallet)
const transformInfluencerData = (rawInfluencer: any): InfluencerData => {
  // Handle numeric conversions with fallbacks
  const ethProgress = parseFloat(rawInfluencer.ethProgress || rawInfluencer.eth_progress || '0');
  const usdcProgress = parseFloat(rawInfluencer.usdcProgress || rawInfluencer.usdc_progress || '0');
  const pledgeThresholdETH = parseFloat(rawInfluencer.pledgeThresholdETH || rawInfluencer.pledge_threshold_eth || '0');
  const pledgeThresholdUSDC = parseFloat(rawInfluencer.pledgeThresholdUSDC || rawInfluencer.pledge_threshold_usdc || '0');
  const totalPledgedETH = parseFloat(rawInfluencer.totalPledgedETH || rawInfluencer.total_pledged_eth || '0');
  const totalPledgedUSDC = parseFloat(rawInfluencer.totalPledgedUSDC || rawInfluencer.total_pledged_usdc || '0');
  
  // Calculate progress percentages safely
  const safeEthProgress = pledgeThresholdETH > 0 ? (totalPledgedETH / pledgeThresholdETH) * 100 : 0;
  const safeUsdcProgress = pledgeThresholdUSDC > 0 ? (totalPledgedUSDC / pledgeThresholdUSDC) * 100 : 0;
  
  // Determine card state
  const isLaunched = Boolean(rawInfluencer.isLaunched || rawInfluencer.is_launched || rawInfluencer.launched_at);
  const isApproved = Boolean(rawInfluencer.isApproved || rawInfluencer.is_approved || rawInfluencer.status === 'approved');
  
  let cardState = 'pending';
  if (isLaunched) cardState = 'live';
  else if (isApproved) cardState = 'approved';
  else if (safeEthProgress >= 100 || safeUsdcProgress >= 100) cardState = 'threshold_met';

  return {
    id: String(rawInfluencer.id || rawInfluencer._id || ''),
    name: String(rawInfluencer.name || ''),
    handle: String(rawInfluencer.handle || ''),
    email: String(rawInfluencer.email || ''),
    category: String(rawInfluencer.category || 'general'),
    description: String(rawInfluencer.description || ''),
    avatarUrl: String(rawInfluencer.avatarUrl || rawInfluencer.avatar_url || rawInfluencer.avatar || ''),
    walletAddress: rawInfluencer.walletAddress || rawInfluencer.wallet_address || undefined, // Optional
    verified: Boolean(rawInfluencer.verified),
    followersCount: parseInt(rawInfluencer.followersCount || rawInfluencer.followers_count || '0'),
    tokenName: rawInfluencer.tokenName || rawInfluencer.token_name || undefined,
    tokenSymbol: rawInfluencer.tokenSymbol || rawInfluencer.token_symbol || undefined,
    tokenAddress: rawInfluencer.tokenAddress || rawInfluencer.token_address || undefined,
    pledgeThresholdETH: pledgeThresholdETH,
    pledgeThresholdUSDC: pledgeThresholdUSDC,
    totalPledgedETH: totalPledgedETH,
    totalPledgedUSDC: totalPledgedUSDC,
    pledgeCount: parseInt(rawInfluencer.pledgeCount || rawInfluencer.pledge_count || '0'),
    ethProgress: Math.min(safeEthProgress, 100), // Cap at 100%
    usdcProgress: Math.min(safeUsdcProgress, 100), // Cap at 100%
    status: String(rawInfluencer.status || 'pending'),
    isApproved: isApproved,
    isLaunched: isLaunched,
    cardState: cardState,
    createdAt: String(rawInfluencer.createdAt || rawInfluencer.created_at || new Date().toISOString()),
    updatedAt: String(rawInfluencer.updatedAt || rawInfluencer.updated_at || new Date().toISOString()),
    launchedAt: rawInfluencer.launchedAt || rawInfluencer.launched_at || undefined
  };
};

const AdminDashboard = () => {
  const { databaseUser, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deployingToken, setDeployingToken] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data state
  const [stats, setStats] = useState<DashboardStats>({
    totalInfluencers: 0,
    pendingApprovals: 0,
    totalPledges: 0,
    totalEthRaised: 0,
    totalUsdcRaised: 0,
    activeTokens: 0
  });
  
  const [influencers, setInfluencers] = useState<InfluencerData[]>([]);
  
  // UPDATED: Form state for influencer creation (NO wallet)
  const [newInfluencer, setNewInfluencer] = useState<NewInfluencerForm>({
    name: '',
    handle: '',
    email: '',
    category: 'general',
    description: '',
    avatarUrl: '',
    followersCount: 0,
    pledgeThresholdETH: 0,
    pledgeThresholdUSDC: 0
  });

  // UPDATED: Token deployment form with network selection
  const [tokenDeployment, setTokenDeployment] = useState<TokenDeploymentForm>({
    influencerId: '',
    walletAddress: '',
    tokenName: '',
    tokenSymbol: '',
    totalSupply: 1000000,
    network: 'base-sepolia' // Default to testnet for real testing
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

  // Load dashboard statistics
  const loadStats = async () => {
    try {
      setError(null);
      const response = await apiCall('/api/influencer/admin/stats');
      
      setStats({
        totalInfluencers: response.totalInfluencers || 0,
        pendingApprovals: response.pendingApprovals || 0,
        totalPledges: response.totalPledges || 0,
        totalEthRaised: parseFloat(response.totalEthRaised || '0'),
        totalUsdcRaised: parseFloat(response.totalUsdcRaised || '0'),
        activeTokens: response.activeTokens || 0
      });
    } catch (error: any) {
      console.error('Error loading stats:', error);
      // Don't set error for stats, use default values
    }
  };

  // Load all influencers using unified API
  const loadInfluencers = async () => {
    try {
      setError(null);
      const response = await apiCall('/api/influencer');
      
      if (response.success && response.data) {
        const transformedInfluencers = response.data.map(transformInfluencerData);
        setInfluencers(transformedInfluencers);
      } else {
        setInfluencers([]);
      }
    } catch (error: any) {
      console.error('Error loading influencers:', error);
      setError(error.message);
      setInfluencers([]);
    }
  };

  // UPDATED: Create influencer CARD only (no wallet required)
  const createInfluencerCard = async () => {
    if (!newInfluencer.name || !newInfluencer.handle || !newInfluencer.email) {
      toast.error("Name, handle, and email are required to create influencer card");
      return;
    }

    try {
      setCreating(true);
      const response = await apiCall('/api/influencer', {
        method: 'POST',
        body: JSON.stringify({
          ...newInfluencer,
          // Make it clear this is JUST creating a card
          createCardOnly: true
        })
      });

      if (response.success) {
        const transformedInfluencer = transformInfluencerData(response.data);
        setInfluencers(prev => [...prev, transformedInfluencer]);
        
        // Reset form
        setNewInfluencer({
          name: '', handle: '', email: '', category: 'general',
          description: '', avatarUrl: '', followersCount: 0,
          pledgeThresholdETH: 0, pledgeThresholdUSDC: 0
        });
        
        toast.success(`✅ Influencer card for ${response.data.name} created! Check PreInvest page to see it.`);
        await loadStats();
      } else {
        throw new Error(response.message || 'Failed to create influencer card');
      }
    } catch (error: any) {
      console.error('Error creating influencer card:', error);
      toast.error(error.message || 'Failed to create influencer card');
    } finally {
      setCreating(false);
    }
  };

  // FIXED: Deploy token for specific influencer with REAL deployment
  const deployTokenForInfluencer = async () => {
    if (!tokenDeployment.influencerId || !tokenDeployment.walletAddress || !tokenDeployment.tokenName || !tokenDeployment.tokenSymbol) {
      toast.error("All token deployment fields are required");
      return;
    }

    try {
      setDeployingToken(true);
      
      // Show network-specific message
      const networkLabel = tokenDeployment.network === 'base' ? 'Base Mainnet' : 'Base Sepolia Testnet';
      toast.info(`🚀 Deploying ${tokenDeployment.tokenSymbol} to ${networkLabel}...`);

      // FIXED: Call real deployment API
      const response = await apiCall(`/api/influencer/${tokenDeployment.influencerId}/deploy-real-token`, {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: tokenDeployment.walletAddress,
          tokenName: tokenDeployment.tokenName,
          tokenSymbol: tokenDeployment.tokenSymbol,
          totalSupply: tokenDeployment.totalSupply,
          network: tokenDeployment.network // Pass network selection
        })
      });

      if (response.success) {
        // Update the influencer in the list with REAL deployment data
        setInfluencers(prev => prev.map(inf => 
          inf.id === tokenDeployment.influencerId 
            ? { 
                ...inf, 
                isLaunched: true, 
                cardState: 'live',
                tokenAddress: response.data.tokenAddress, // Real contract address
                tokenName: tokenDeployment.tokenName,
                tokenSymbol: tokenDeployment.tokenSymbol,
                walletAddress: tokenDeployment.walletAddress,
                launchedAt: new Date().toISOString()
              }
            : inf
        ));
        
        // Reset form
        setTokenDeployment({
          influencerId: '',
          walletAddress: '',
          tokenName: '',
          tokenSymbol: '',
          totalSupply: 1000000,
          network: 'base-sepolia'
        });
        
        // Success message with deployment details
        toast.success(
          `🎉 Token ${tokenDeployment.tokenSymbol} deployed successfully to ${networkLabel}!\n` +
          `Contract: ${response.data.tokenAddress}\n` +
          `TX Hash: ${response.data.txHash}`
        );
        
        await loadStats();
        setActiveTab('influencers'); // Switch to see results
      } else {
        throw new Error(response.message || 'Failed to deploy token');
      }
    } catch (error: any) {
      console.error('Error deploying token:', error);
      
      // Enhanced error handling for common blockchain deployment issues
      if (error.message.includes('insufficient funds')) {
        if (tokenDeployment.network === 'base') {
          toast.error(
            '💰 Insufficient Base ETH! You need real ETH to deploy on mainnet.\n' +
            'This will cost real money. Consider using Base Sepolia testnet first.'
          );
        } else {
          toast.error(
            '💰 Insufficient Base Sepolia ETH! Get free testnet ETH from:\n' +
            '• https://www.alchemy.com/faucets/base-sepolia\n' +
            '• https://www.coinbase.com/faucets/base-sepolia-faucet'
          );
        }
      } else if (error.message.includes('network')) {
        toast.error(`Network error: Check your ${tokenDeployment.network} connection`);
      } else {
        toast.error(error.message || 'Failed to deploy token');
      }
    } finally {
      setDeployingToken(false);
    }
  };

  // Approve influencer
  const approveInfluencer = async (id: string) => {
    try {
      const response = await apiCall(`/api/influencer/${id}/approve`, {
        method: 'POST'
      });

      if (response.success) {
        setInfluencers(prev => prev.map(inf => 
          inf.id === id 
            ? { ...inf, isApproved: true, status: 'approved', cardState: 'approved' }
            : inf
        ));
        
        toast.success('Influencer approved successfully');
        await loadStats();
      } else {
        throw new Error(response.message || 'Failed to approve influencer');
      }
    } catch (error: any) {
      console.error('Error approving influencer:', error);
      toast.error(error.message || 'Failed to approve influencer');
    }
  };

  // Delete influencer
  const deleteInfluencer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this influencer?')) return;

    try {
      const response = await apiCall(`/api/influencer/${id}`, {
        method: 'DELETE'
      });

      if (response.success) {
        setInfluencers(prev => prev.filter(inf => inf.id !== id));
        toast.success('Influencer deleted successfully');
        await loadStats();
      } else {
        throw new Error(response.message || 'Failed to delete influencer');
      }
    } catch (error: any) {
      console.error('Error deleting influencer:', error);
      toast.error(error.message || 'Failed to delete influencer');
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStats(), loadInfluencers()]);
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

  // Load data on mount
  useEffect(() => {
    if (databaseUser?.status === 'admin') {
      loadAllData();
    }
  }, [databaseUser]);

  // Utility functions
  const getStatusBadge = (influencer: InfluencerData) => {
    if (influencer.isLaunched) {
      return <Badge className="bg-green-500 text-white">🚀 Live Token</Badge>;
    }
    if (influencer.isApproved) {
      return <Badge className="bg-blue-500 text-white">✅ Approved</Badge>;
    }
    if (influencer.ethProgress >= 100 || influencer.usdcProgress >= 100) {
      return <Badge className="bg-yellow-500 text-white">🎯 Threshold Met</Badge>;
    }
    return <Badge className="bg-gray-500 text-white">📝 Card Only</Badge>;
  };

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  // Network badge helper
  const getNetworkBadge = (network: string) => {
    switch (network) {
      case 'base-sepolia':
        return <Badge className="bg-orange-500 text-white"><Network className="w-3 h-3 mr-1" />Base Sepolia</Badge>;
      case 'base':
        return <Badge className="bg-green-500 text-white"><Network className="w-3 h-3 mr-1" />Base Mainnet</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white"><Network className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  // Check access permissions
  if (databaseUser?.status !== 'admin') {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] pt-20">
          <Card className="bg-zinc-900 border-zinc-800 max-w-md">
            <CardHeader className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-red-400">Access Denied</CardTitle>
              <CardDescription>Admin privileges required to access this dashboard.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

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
      
      <div className="pt-20 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              </div>
              <p className="text-gray-400">Welcome back, {databaseUser?.display_name || 'Admin'}</p>
              <p className="text-xs text-green-400 mt-1">
                ✅ Phase 4B: Real token deployment with network selection enabled
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Total Influencers</p>
              <p className="text-2xl font-bold text-primary">{stats.totalInfluencers}</p>
              <Button 
                onClick={handleRefresh} 
                size="sm" 
                variant="outline" 
                className="mt-2 border-zinc-700 hover:border-primary/50"
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Phase 4B Success Message */}
        <Alert className="border-green-500/20 bg-green-500/5 mb-8">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            🚀 Phase 4B: Real blockchain deployment now integrated! Choose Local (instant testing) or Base Sepolia (real testnet).
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Influencer Cards</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalInfluencers}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.activeTokens} have live tokens</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Live Tokens</CardTitle>
              <Rocket className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.activeTokens}</div>
              <p className="text-xs text-gray-500 mt-1">Deployed to blockchain</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Interest</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalPledges}</div>
              <p className="text-xs text-gray-500 mt-1">User pledges</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">ETH Raised</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatNumber(stats.totalEthRaised, 3)} ETH</div>
              <p className="text-xs text-gray-500 mt-1">{formatNumber(stats.totalUsdcRaised)} USDC</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="influencers">
              Manage Influencers
              {stats.totalInfluencers > 0 && (
                <Badge className="ml-2 bg-primary/20 text-primary text-xs">
                  {stats.totalInfluencers}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="create-card">📝 Create Card</TabsTrigger>
            <TabsTrigger value="deploy-token">🚀 Deploy Token</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>📝 Influencer Cards</CardTitle>
                  <CardDescription>Marketing cards visible on PreInvest page</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Total Cards Created:</span>
                      <span className="text-white font-medium">{stats.totalInfluencers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Cards with Tokens:</span>
                      <span className="text-green-400 font-medium">{stats.activeTokens}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Card-Only (No Token):</span>
                      <span className="text-blue-400 font-medium">{stats.totalInfluencers - stats.activeTokens}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle>🚀 Token Deployment</CardTitle>
                  <CardDescription>Real blockchain tokens with trading capabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Live Tokens:</span>
                      <span className="text-green-400 font-medium">{stats.activeTokens}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Networks Available:</span>
                      <div className="flex gap-1">
                        {getNetworkBadge('base-sepolia')}
                        {getNetworkBadge('base')}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ready for Deployment:</span>
                      <span className="text-yellow-400 font-medium">{stats.totalInfluencers - stats.activeTokens}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="influencers" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Manage Influencers</CardTitle>
                <CardDescription>View all influencer cards and their token deployment status</CardDescription>
              </CardHeader>
              <CardContent>
                {influencers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Influencer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Token Info</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {influencers.map((influencer) => (
                        <TableRow key={influencer.id} className="border-zinc-800">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img 
                                src={influencer.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.name}`}
                                alt={influencer.name}
                                className="w-10 h-10 rounded-full"
                              />
                              <div>
                                <div className="font-medium">{influencer.name}</div>
                                <div className="text-sm text-primary">@{influencer.handle}</div>
                                <div className="text-xs text-gray-400">{influencer.category}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(influencer)}</TableCell>
                          <TableCell>
                            {influencer.isLaunched ? (
                              <div className="text-sm">
                                <div className="text-green-400">{influencer.tokenSymbol}</div>
                                <div className="text-xs text-gray-400">Contract: {influencer.tokenAddress?.substring(0, 8)}...</div>
                              </div>
                            ) : influencer.walletAddress ? (
                              <div className="text-sm text-yellow-400">Ready to deploy</div>
                            ) : (
                              <div className="text-sm text-gray-400">Card only</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!influencer.isLaunched && (
                                <Button
                                  size="sm"
                                  className="bg-blue-500 hover:bg-blue-600 text-white"
                                  onClick={() => {
                                    setTokenDeployment(prev => ({
                                      ...prev,
                                      influencerId: influencer.id
                                    }));
                                    setActiveTab('deploy-token');
                                  }}
                                >
                                  <Rocket className="w-4 h-4 mr-1" />
                                  Deploy Token
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-zinc-700 hover:border-primary/50"
                                onClick={() => window.open(`/pre-invest`, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View Card
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-700 hover:border-red-500 text-red-400"
                                onClick={() => deleteInfluencer(influencer.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No influencer cards yet</p>
                    <p className="text-sm">Create your first influencer card to get started!</p>
                    <Button 
                      className="mt-4 bg-primary hover:bg-primary/90 text-black font-semibold" 
                      onClick={() => setActiveTab('create-card')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Card
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create-card" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>📝 Create Influencer Card</CardTitle>
                <CardDescription>Create a marketing card that appears on the PreInvest page (no wallet address needed)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="border-blue-500/20 bg-blue-500/5">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-400">
                    This creates ONLY the marketing card. Token deployment is a separate step that requires wallet info.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      placeholder="Logan Paul"
                      value={newInfluencer.name}
                      onChange={(e) => setNewInfluencer({...newInfluencer, name: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Handle *</label>
                    <Input
                      placeholder="loganpaul"
                      value={newInfluencer.handle}
                      onChange={(e) => setNewInfluencer({...newInfluencer, handle: e.target.value.toLowerCase()})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      value={newInfluencer.email}
                      onChange={(e) => setNewInfluencer({...newInfluencer, email: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select value={newInfluencer.category} onValueChange={(value) => setNewInfluencer({...newInfluencer, category: value})}>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="fitness">Fitness</SelectItem>
                        <SelectItem value="entertainment">Entertainment</SelectItem>
                        <SelectItem value="gaming">Gaming</SelectItem>
                        <SelectItem value="tech">Technology</SelectItem>
                        <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Followers Count</label>
                    <Input
                      type="number"
                      placeholder="1000000"
                      value={newInfluencer.followersCount || ''}
                      onChange={(e) => setNewInfluencer({...newInfluencer, followersCount: parseInt(e.target.value) || 0})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Avatar URL</label>
                    <Input
                      placeholder="https://example.com/avatar.jpg"
                      value={newInfluencer.avatarUrl}
                      onChange={(e) => setNewInfluencer({...newInfluencer, avatarUrl: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Brief description for the influencer card..."
                    value={newInfluencer.description}
                    onChange={(e) => setNewInfluencer({...newInfluencer, description: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <Button 
                  onClick={createInfluencerCard}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
                  disabled={creating || !newInfluencer.name || !newInfluencer.handle || !newInfluencer.email}
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Card...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Influencer Card
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  This creates only the marketing card visible on PreInvest page. Use "Deploy Token" tab for blockchain deployment.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deploy-token" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>🚀 Deploy Token to Blockchain</CardTitle>
                <CardDescription>Deploy an actual tradeable token for an existing influencer card</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="border-orange-500/20 bg-orange-500/5">
                  <Rocket className="h-4 w-4 text-orange-400" />
                  <AlertDescription className="text-orange-400">
                    Deploy to real blockchain: Base Sepolia (free testnet) or Base Mainnet (costs real ETH).
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Influencer *</label>
                    <Select 
                      value={tokenDeployment.influencerId} 
                      onValueChange={(value) => setTokenDeployment({...tokenDeployment, influencerId: value})}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Choose influencer to deploy token for..." />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {influencers.filter(inf => !inf.isLaunched).map(influencer => (
                          <SelectItem key={influencer.id} value={influencer.id}>
                            {influencer.name} (@{influencer.handle})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Deployment Network *</label>
                    <Select 
                      value={tokenDeployment.network} 
                      onValueChange={(value) => setTokenDeployment({...tokenDeployment, network: value as 'base-sepolia' | 'base'})}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="base-sepolia">
                          <div className="flex items-center gap-2">
                            <Network className="w-4 h-4 text-orange-400" />
                            <span>Base Sepolia</span>
                            <Badge className="bg-orange-500/20 text-orange-400 text-xs">FREE TESTNET</Badge>
                          </div>
                        </SelectItem>
                        <SelectItem value="base">
                          <div className="flex items-center gap-2">
                            <Network className="w-4 h-4 text-green-400" />
                            <span>Base Mainnet</span>
                            <Badge className="bg-green-500/20 text-green-400 text-xs">REAL ETH 💰</Badge>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Influencer Wallet Address *</label>
                    <Input
                      placeholder="0x..."
                      value={tokenDeployment.walletAddress}
                      onChange={(e) => setTokenDeployment({...tokenDeployment, walletAddress: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Name *</label>
                    <Input
                      placeholder="Logan Paul Token"
                      value={tokenDeployment.tokenName}
                      onChange={(e) => setTokenDeployment({...tokenDeployment, tokenName: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Symbol *</label>
                    <Input
                      placeholder="LOGAN"
                      value={tokenDeployment.tokenSymbol}
                      onChange={(e) => setTokenDeployment({...tokenDeployment, tokenSymbol: e.target.value.toUpperCase()})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Supply</label>
                    <Input
                      type="number"
                      placeholder="1000000"
                      value={tokenDeployment.totalSupply}
                      onChange={(e) => setTokenDeployment({...tokenDeployment, totalSupply: parseInt(e.target.value) || 1000000})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
                </div>

                {/* Network Info */}
                <div className="bg-zinc-800 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Network Information
                  </h4>
                  {tokenDeployment.network === 'base-sepolia' ? (
                    <div className="text-sm text-gray-300 space-y-1">
                      <p>• <span className="text-orange-400">Base Sepolia Testnet</span> - Real blockchain experience</p>
                      <p>• Requires testnet ETH (free from faucets)</p>
                      <p>• Users can interact with real wallets</p>
                      <p>• <a href="https://www.alchemy.com/faucets/base-sepolia" target="_blank" className="text-primary hover:underline">Get free testnet ETH →</a></p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-300 space-y-1">
                      <p>• <span className="text-green-400">Base Mainnet</span> - Production blockchain with real value</p>
                      <p>• <span className="text-red-400 font-semibold">⚠️ COSTS REAL ETH</span> - This will charge your wallet</p>
                      <p>• Permanent deployment, cannot be undone</p>
                      <p>• <span className="text-yellow-400">Recommended:</span> Test on Base Sepolia first</p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={deployTokenForInfluencer}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                  disabled={deployingToken || !tokenDeployment.influencerId || !tokenDeployment.walletAddress || !tokenDeployment.tokenName || !tokenDeployment.tokenSymbol}
                >
                  {deployingToken ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deploying to {tokenDeployment.network === 'base' ? 'Base Mainnet' : 'Base Sepolia'}...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 mr-2" />
                      Deploy Token to {tokenDeployment.network === 'base' ? 'Base Mainnet 💰' : 'Base Sepolia (Free)'}
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  This creates a real ERC-20 token on the selected blockchain. The influencer card will be updated to show "Live" status.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;