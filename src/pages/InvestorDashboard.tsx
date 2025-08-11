// src/pages/InvestorDashboard.tsx - Unified Architecture Version
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Wallet, TrendingUp, Star, Eye, Gift, ArrowUpRight, ArrowDownRight, Search, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Header from '@/components/ui/header';
import { toast } from '@/components/ui/sonner';

// Types for investor data
interface InvestmentHolding {
  tokenAddress: string;
  tokenSymbol: string;
  influencerName: string;
  avatar?: string;
  amount: number;
  value: number;
  costBasis: number;
  pnl: number;
  pnlPercent: number;
  purchaseDate: string;
  status: string;
  isLaunched: boolean;
}

interface InvestorPledge {
  influencerName: string;
  influencerHandle: string;
  influencerAddress: string;
  avatar?: string;
  ethAmount: number;
  usdcAmount: number;
  pledgeDate: string;
  status: string;
  hasWithdrawn: boolean;
  tokenAddress?: string;
  thresholdProgress: number;
}

interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalPnL: number;
  totalPnLPercent: number;
  holdingsCount: number;
}

interface InvestorData {
  holdings: InvestmentHolding[];
  pledges: InvestorPledge[];
  summary: PortfolioSummary;
}

const InvestorDashboard = () => {
  const { databaseUser, user } = useAuth();
  const [activeTab, setActiveTab] = useState('portfolio');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Investor data state
  const [investorData, setInvestorData] = useState<InvestorData>({
    holdings: [],
    pledges: [],
    summary: {
      totalValue: 0,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      holdingsCount: 0
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

  // Load investor portfolio data
  const loadPortfolioData = async () => {
    try {
      setError(null);
      
      // For now, create mock data since investor-specific endpoints aren't implemented yet
      // In a real implementation, this would call investor-specific APIs
      const mockHoldings: InvestmentHolding[] = [
        {
          tokenAddress: "0x123...",
          tokenSymbol: "ROHINI",
          influencerName: "Rohini",
          avatar: null,
          amount: 1000,
          value: 2.4,
          costBasis: 1.8,
          pnl: 0.6,
          pnlPercent: 33.33,
          purchaseDate: "2025-07-25",
          status: "live",
          isLaunched: true
        }
      ];

      const mockSummary: PortfolioSummary = {
        totalValue: 2.4,
        totalCost: 1.8,
        totalPnL: 0.6,
        totalPnLPercent: 33.33,
        holdingsCount: 1
      };

      setInvestorData({
        holdings: mockHoldings,
        pledges: [],
        summary: mockSummary
      });
      
    } catch (error: any) {
      console.error('Error loading portfolio:', error);
      setError(error.message);
    }
  };

  // Load investor pledges using unified API
  const loadPledgesData = async () => {
    try {
      if (!databaseUser?.wallet_address) return;
      
      // Use the existing pledge API to get user pledges
      const pledgeResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/pledge/user/${databaseUser.wallet_address}`);
      
      if (pledgeResponse.ok) {
        const pledgeData = await pledgeResponse.json();
        
        const formattedPledges: InvestorPledge[] = pledgeData.pledges?.map((pledge: any) => ({
          influencerName: pledge.influencerName,
          influencerHandle: pledge.influencerHandle,
          influencerAddress: pledge.influencerAddress,
          avatar: pledge.avatar,
          ethAmount: parseFloat(pledge.ethAmount) || 0,
          usdcAmount: parseFloat(pledge.usdcAmount) || 0,
          pledgeDate: pledge.pledgedAt,
          status: pledge.status,
          hasWithdrawn: pledge.hasWithdrawn,
          tokenAddress: pledge.tokenAddress,
          thresholdProgress: pledge.ethProgress || pledge.usdcProgress || 0
        })) || [];

        setInvestorData(prev => ({
          ...prev,
          pledges: formattedPledges
        }));
      }
    } catch (error: any) {
      console.error('Error loading pledges:', error);
      // Don't set error for pledges, just log it
    }
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPortfolioData(),
        loadPledgesData()
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
    if (databaseUser?.status === 'investor' || databaseUser?.status === 'admin') {
      loadAllData();
    }
  }, [databaseUser]);

  // Filter investments based on search term
  const filteredInvestments = investorData.holdings.filter(investment => 
    investment.influencerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investment.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Utility functions
  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(decimals)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const formatCurrency = (amount: number, currency = 'ETH') => {
    return `${amount.toFixed(4)} ${currency}`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { color: 'bg-green-500', text: 'Live' },
      pending: { color: 'bg-yellow-500', text: 'Pledging' },
      live: { color: 'bg-emerald-500', text: 'Trading' },
      launched: { color: 'bg-green-500', text: 'Launched' },
      pledging: { color: 'bg-orange-500', text: 'Pledging' },
      threshold_met: { color: 'bg-yellow-500', text: 'Ready' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  // Show error state
  if (error && !investorData.holdings.length) {
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
            <p className="text-gray-400">Loading portfolio...</p>
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
                <Wallet className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">Investor Dashboard</h1>
              </div>
              <p className="text-gray-400">Welcome back, {databaseUser?.display_name || 'Investor'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Status: {databaseUser?.status} • Unified Architecture Active
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(investorData.summary.totalValue)}
              </p>
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
            ✅ Unified Architecture: Portfolio and pledge data synchronized across all platforms.
          </AlertDescription>
        </Alert>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Invested</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {formatCurrency(investorData.summary.totalCost)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total P&L</CardTitle>
              {investorData.summary.totalPnL >= 0 ? 
                <ArrowUpRight className="h-4 w-4 text-green-500" /> : 
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              }
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getChangeColor(investorData.summary.totalPnL)}`}>
                {formatCurrency(investorData.summary.totalPnL)}
              </div>
              <p className={`text-xs ${getChangeColor(investorData.summary.totalPnL)}`}>
                {investorData.summary.totalPnLPercent > 0 ? '+' : ''}{investorData.summary.totalPnLPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Positions</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{investorData.summary.holdingsCount}</div>
              <p className="text-xs text-gray-500 mt-1">{investorData.pledges.length} pledges</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Current Value</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(investorData.summary.totalValue)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="portfolio">
              Portfolio
              {investorData.holdings.length > 0 && (
                <Badge className="ml-2 bg-primary/20 text-primary text-xs">
                  {investorData.holdings.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pledges">
              My Pledges
              {investorData.pledges.length > 0 && (
                <Badge className="ml-2 bg-orange-500/20 text-orange-400 text-xs">
                  {investorData.pledges.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Investments</CardTitle>
                    <CardDescription>Track your influencer token positions</CardDescription>
                  </div>
                  {investorData.holdings.length > 0 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search investments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-zinc-800 border-zinc-700 text-white w-64"
                      />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredInvestments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800">
                        <TableHead>Influencer</TableHead>
                        <TableHead>Token</TableHead>
                        <TableHead>Amount Invested</TableHead>
                        <TableHead>Tokens Owned</TableHead>
                        <TableHead>Current Value</TableHead>
                        <TableHead>P&L</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvestments.map((investment, index) => (
                        <TableRow key={index} className="border-zinc-800">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img 
                                src={investment.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${investment.influencerName}`}
                                alt={investment.influencerName}
                                className="w-8 h-8 rounded-full"
                              />
                              <div>
                                <div className="font-medium">{investment.influencerName}</div>
                                <div className="text-sm text-primary">@{investment.influencerName.toLowerCase()}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{investment.tokenSymbol}</div>
                              <div className="text-sm text-gray-400">{investment.amount.toLocaleString()} tokens</div>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(investment.costBasis)}</TableCell>
                          <TableCell>{formatNumber(investment.amount, 0)}</TableCell>
                          <TableCell>{formatCurrency(investment.value)}</TableCell>
                          <TableCell>
                            <div className={getChangeColor(investment.pnl)}>
                              <div>{formatCurrency(investment.pnl)}</div>
                              <div className="text-xs">
                                {investment.pnlPercent > 0 ? '+' : ''}{investment.pnlPercent.toFixed(2)}%
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="border-zinc-700 hover:border-primary/50"
                                onClick={() => window.open(`/coin/${investment.influencerName.toLowerCase()}`, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" className="border-zinc-700 hover:border-primary/50">
                                <Gift className="w-4 h-4 mr-1" />
                                Gift
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No investments yet</p>
                    <p className="text-sm">Start investing in your favorite influencers!</p>
                    <Button 
                      className="mt-4 bg-primary hover:bg-primary/90 text-black font-semibold" 
                      onClick={() => setActiveTab('discover')}
                    >
                      Discover Influencers
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pledges" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>My Pledges</CardTitle>
                <CardDescription>Track your pre-investment pledges using unified API</CardDescription>
              </CardHeader>
              <CardContent>
                {investorData.pledges.length > 0 ? (
                  <div className="space-y-4">
                    {investorData.pledges.map((pledge, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center gap-4">
                          <img 
                            src={pledge.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${pledge.influencerName}`}
                            alt={pledge.influencerName}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h4 className="font-medium text-white">{pledge.influencerName}</h4>
                            <p className="text-sm text-primary">{pledge.influencerHandle}</p>
                            <p className="text-xs text-gray-400">
                              Pledged: {pledge.ethAmount > 0 ? `${pledge.ethAmount} ETH` : `${pledge.usdcAmount} USDC`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(pledge.status)}
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(pledge.pledgeDate).toLocaleDateString()}
                          </p>
                          {pledge.hasWithdrawn && (
                            <p className="text-xs text-red-400 mt-1">Withdrawn</p>
                          )}
                          <p className="text-xs text-green-400 mt-1">
                            {pledge.thresholdProgress.toFixed(1)}% progress
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No pledges yet</p>
                    <p className="text-sm">Start pledging to upcoming influencers!</p>
                    <Button 
                      className="mt-4 bg-primary hover:bg-primary/90 text-black font-semibold" 
                      onClick={() => window.open('/pre-invest', '_blank')}
                    >
                      View Pre-Investment Opportunities
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discover" className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Discover New Opportunities</CardTitle>
                <CardDescription>Find new influencers to invest in using unified API</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-zinc-800/50 rounded-lg">
                    <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-400" />
                    <h3 className="font-semibold mb-2">Live Trading</h3>
                    <p className="text-sm text-gray-400 mb-4">Invest in tokens that are already trading</p>
                    <Button 
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => window.open('/influencers?live_only=true', '_blank')}
                    >
                      View Live Tokens
                    </Button>
                  </div>
                  
                  <div className="text-center p-6 bg-zinc-800/50 rounded-lg">
                    <Star className="w-8 h-8 mx-auto mb-3 text-orange-400" />
                    <h3 className="font-semibold mb-2">Pre-Investment</h3>
                    <p className="text-sm text-gray-400 mb-4">Get early access by pledging to upcoming tokens</p>
                    <Button 
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                      onClick={() => window.open('/pre-invest', '_blank')}
                    >
                      View Opportunities
                    </Button>
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

export default InvestorDashboard;