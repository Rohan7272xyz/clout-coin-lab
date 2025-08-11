// src/pages/AdminDashboard.tsx - Complete Unified Architecture Version
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Users, TrendingUp, DollarSign, Star, AlertCircle, RefreshCw, Plus, Eye, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
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
  walletAddress: string;
  verified: boolean;
  followersCount: number;
  tokenName: string;
  tokenSymbol: string;
  tokenAddress: string;
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

interface NewInfluencerForm {
  name: string;
  handle: string;
  email: string;
  walletAddress: string;
  category: string;
  description: string;
  avatarUrl: string;
  tokenName: string;
  tokenSymbol: string;
  pledgeThresholdETH: number;
  pledgeThresholdUSDC: number;
}

// Data transformation helper function
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
    walletAddress: String(rawInfluencer.walletAddress || rawInfluencer.wallet_address || ''),
    verified: Boolean(rawInfluencer.verified),
    followersCount: parseInt(rawInfluencer.followersCount || rawInfluencer.followers_count || '0'),
    tokenName: String(rawInfluencer.tokenName || rawInfluencer.token_name || ''),
    tokenSymbol: String(rawInfluencer.tokenSymbol || rawInfluencer.token_symbol || ''),
    tokenAddress: String(rawInfluencer.tokenAddress || rawInfluencer.token_address || ''),
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

// Safe data wrapper for components
const safeInfluencerData = (influencer: InfluencerData) => ({
  ...influencer,
  ethProgress: Number(influencer.ethProgress || 0),
  usdcProgress: Number(influencer.usdcProgress || 0),
  pledgeThresholdETH: Number(influencer.pledgeThresholdETH || 0),
  pledgeThresholdUSDC: Number(influencer.pledgeThresholdUSDC || 0),
  totalPledgedETH: Number(influencer.totalPledgedETH || 0),
  totalPledgedUSDC: Number(influencer.totalPledgedUSDC || 0),
  pledgeCount: Number(influencer.pledgeCount || 0),
  followersCount: Number(influencer.followersCount || 0)
});

const AdminDashboard = () => {
  const { databaseUser, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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
  
  // Form state
  const [newInfluencer, setNewInfluencer] = useState<NewInfluencerForm>({
    name: '',
    handle: '',
    email: '',
    walletAddress: '',
    category: 'general',
    description: '',
    avatarUrl: '',
    tokenName: '',
    tokenSymbol: '',
    pledgeThresholdETH: 0,
    pledgeThresholdUSDC: 0
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
      
      if (response.success) {
        setStats({
          totalInfluencers: response.stats.totalInfluencers || 0,
          pendingApprovals: response.stats.pendingApprovals || 0,
          totalPledges: response.stats.totalPledges || 0,
          totalEthRaised: parseFloat(response.stats.totalEthRaised || '0'),
          totalUsdcRaised: parseFloat(response.stats.totalUsdcRaised || '0'),
          activeTokens: response.stats.activeTokens || 0
        });
      }
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
        // Transform each influencer to ensure proper data types
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

  // Create new influencer (PROFILE ONLY - not blockchain deployment)
  const createInfluencer = async () => {
    if (!newInfluencer.name || !newInfluencer.handle || !newInfluencer.email || !newInfluencer.walletAddress) {
      toast.error("Name, handle, email, and wallet address are required");
      return;
    }

    try {
      setCreating(true);
      const response = await apiCall('/api/influencer', {
        method: 'POST',
        body: JSON.stringify({
          ...newInfluencer,
          // Ensure we're only creating the profile, not deploying token
          deployToken: false
        })
      });

      if (response.success) {
        // Transform the created influencer data
        const transformedInfluencer = transformInfluencerData(response.data);
        
        // Add to the list
        setInfluencers(prev => [...prev, transformedInfluencer]);
        
        // Reset form
        setNewInfluencer({
          name: '', handle: '', email: '', walletAddress: '', category: 'general',
          description: '', avatarUrl: '', tokenName: '', tokenSymbol: '',
          pledgeThresholdETH: 0, pledgeThresholdUSDC: 0
        });
        
        toast.success(`Influencer profile for ${response.data.name} created successfully`);
        
        // Refresh stats
        await loadStats();
      } else {
        throw new Error(response.message || 'Failed to create influencer profile');
      }
    } catch (error: any) {
      console.error('Error creating influencer profile:', error);
      toast.error(error.message || 'Failed to create influencer profile');
    } finally {
      setCreating(false);
    }
  };

  // Approve influencer
  const approveInfluencer = async (id: string) => {
    try {
      const response = await apiCall(`/api/influencer/${id}/approve`, {
        method: 'POST'
      });

      if (response.success) {
        // Update the influencer in the list
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

  // Create token for influencer
  const createToken = async (id: string) => {
    try {
      const response = await apiCall(`/api/influencer/${id}/create-token`, {
        method: 'POST'
      });

      if (response.success) {
        // Update the influencer in the list
        setInfluencers(prev => prev.map(inf => 
          inf.id === id 
            ? { 
                ...inf, 
                isLaunched: true, 
                cardState: 'live',
                tokenAddress: response.data.tokenAddress || inf.tokenAddress,
                launchedAt: new Date().toISOString()
              }
            : inf
        ));
        
        toast.success('Token created successfully');
        await loadStats();
      } else {
        throw new Error(response.message || 'Failed to create token');
      }
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast.error(error.message || 'Failed to create token');
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
        // Remove from the list
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
      await Promise.all([
        loadStats(),
        loadInfluencers()
      ]);
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
      return <Badge className="bg-green-500 text-white">Live</Badge>;
    }
    if (influencer.isApproved) {
      return <Badge className="bg-blue-500 text-white">Approved</Badge>;
    }
    if (influencer.ethProgress >= 100 || influencer.usdcProgress >= 100) {
      return <Badge className="bg-yellow-500 text-white">Threshold Met</Badge>;
    }
    return <Badge className="bg-gray-500 text-white">Pending</Badge>;
  };

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
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

  // Show error state
  if (error && !influencers.length) {
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

  // Show loading state
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
                ✅ Unified Architecture: Single API endpoint managing all influencer data
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

        {/* Unified Architecture Success Message */}
        <Alert className="border-green-500/20 bg-green-500/5 mb-8">
          <TrendingUp className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-400">
            ✅ Unified Architecture Active: Admin management and public interfaces synchronized via /api/influencer endpoints
          </AlertDescription>
        </Alert>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Influencers</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalInfluencers}</div>
              <p className="text-xs text-gray-500 mt-1">{stats.pendingApprovals} pending approval</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Pledges</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalPledges}</div>
              <p className="text-xs text-gray-500 mt-1">Active pledges</p>
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

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Tokens</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.activeTokens}</div>
              <p className="text-xs text-gray-500 mt-1">Trading live</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="overview">
              Overview
              {stats.totalInfluencers > 0 && (
                <Badge className="ml-2 bg-primary/20 text-primary text-xs">
                  {stats.totalInfluencers}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="influencers">
              Manage Influencers
              {stats.pendingApprovals > 0 && (
                <Badge className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs">
                  {stats.pendingApprovals} pending
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>Key metrics and system status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <h3 className="font-semibold mb-2">Influencer Pipeline</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Created:</span>
                          <span className="text-white">{stats.totalInfluencers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pending Approval:</span>
                          <span className="text-yellow-400">{stats.pendingApprovals}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Live Tokens:</span>
                          <span className="text-green-400">{stats.activeTokens}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-zinc-800/50 rounded-lg">
                      <h3 className="font-semibold mb-2">Financial Summary</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total ETH Raised:</span>
                          <span className="text-green-400">{formatNumber(stats.totalEthRaised, 3)} ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total USDC Raised:</span>
                          <span className="text-green-400">{formatNumber(stats.totalUsdcRaised)} USDC</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Active Pledges:</span>
                          <span className="text-white">{stats.totalPledges}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="influencers" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Manage Influencers</CardTitle>
                <CardDescription>View, approve, and manage all influencers using unified API</CardDescription>
              </CardHeader>
              <CardContent>
                {influencers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Influencer</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Pledges</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {influencers.map((influencer) => {
                        const safeInfluencer = safeInfluencerData(influencer);
                        return (
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
                            <TableCell>
                              <div className="space-y-1">
                                {safeInfluencer.pledgeThresholdETH > 0 && (
                                  <div className="text-sm">
                                    <span className="text-gray-400">ETH: </span>
                                    <span className="text-white">
                                      {safeInfluencer.totalPledgedETH.toFixed(3)} / {safeInfluencer.pledgeThresholdETH} 
                                    </span>
                                    <span className="text-green-400 ml-1">
                                      ({safeInfluencer.ethProgress.toFixed(1)}%)
                                    </span>
                                  </div>
                                )}
                                {safeInfluencer.pledgeThresholdUSDC > 0 && (
                                  <div className="text-sm">
                                    <span className="text-gray-400">USDC: </span>
                                    <span className="text-white">
                                      {safeInfluencer.totalPledgedUSDC.toFixed(0)} / {safeInfluencer.pledgeThresholdUSDC}
                                    </span>
                                    <span className="text-green-400 ml-1">
                                      ({safeInfluencer.usdcProgress.toFixed(1)}%)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="text-white">{safeInfluencer.pledgeCount} pledges</div>
                                <div className="text-gray-400">
                                  {formatNumber(safeInfluencer.followersCount)} followers
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(influencer)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {!influencer.isApproved && (
                                  <Button
                                    size="sm"
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                    onClick={() => approveInfluencer(influencer.id)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                
                                {influencer.isApproved && !influencer.isLaunched && (
                                  <Button
                                    size="sm"
                                    className="bg-blue-500 hover:bg-blue-600 text-white"
                                    onClick={() => createToken(influencer.id)}
                                  >
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    Launch Token
                                  </Button>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-zinc-700 hover:border-primary/50"
                                  onClick={() => window.open(`/coin/${influencer.handle}`, '_blank')}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View
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
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No influencers yet</p>
                    <p className="text-sm">Create your first influencer to get started!</p>
                    <Button 
                      className="mt-4 bg-primary hover:bg-primary/90 text-black font-semibold" 
                      onClick={() => setActiveTab('create')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Influencer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Create New Influencer Profile</CardTitle>
                <CardDescription>Add a new influencer profile to the platform (creates card for PreInvest page)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      placeholder="vihan@example.com"
                      value={newInfluencer.email}
                      onChange={(e) => setNewInfluencer({...newInfluencer, email: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Wallet Address *</label>
                    <Input
                      placeholder="0x..."
                      value={newInfluencer.walletAddress}
                      onChange={(e) => setNewInfluencer({...newInfluencer, walletAddress: e.target.value})}
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
                    <label className="text-sm font-medium">Token Name</label>
                    <Input
                      placeholder="Logan Paul Token"
                      value={newInfluencer.tokenName}
                      onChange={(e) => setNewInfluencer({...newInfluencer, tokenName: e.target.value})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token Symbol</label>
                    <Input
                      placeholder="LOGAN"
                      value={newInfluencer.tokenSymbol}
                      onChange={(e) => setNewInfluencer({...newInfluencer, tokenSymbol: e.target.value.toUpperCase()})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">ETH Threshold</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="5.0"
                      value={newInfluencer.pledgeThresholdETH || ''}
                      onChange={(e) => setNewInfluencer({...newInfluencer, pledgeThresholdETH: parseFloat(e.target.value) || 0})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">USDC Threshold</label>
                    <Input
                      type="number"
                      step="100"
                      placeholder="5000"
                      value={newInfluencer.pledgeThresholdUSDC || ''}
                      onChange={(e) => setNewInfluencer({...newInfluencer, pledgeThresholdUSDC: parseFloat(e.target.value) || 0})}
                      className="bg-zinc-800 border-zinc-700"
                    />
                  </div>
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

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Brief description of the influencer..."
                    value={newInfluencer.description}
                    onChange={(e) => setNewInfluencer({...newInfluencer, description: e.target.value})}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>

                <Button 
                  onClick={createInfluencer}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
                  disabled={creating || !newInfluencer.name || !newInfluencer.handle || !newInfluencer.email || !newInfluencer.walletAddress}
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Influencer Profile
                    </>
                  )}
                </Button>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  This creates the influencer profile and card. Token deployment is a separate step after approval.
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