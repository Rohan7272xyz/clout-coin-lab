// src/pages/InvestorDashboard.tsx - Updated with real database integration
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Wallet, TrendingUp, Star, Eye, Gift, ArrowUpRight, ArrowDownRight, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/ui/header';
import { useInvestorDashboard } from '@/lib/dashboard/dashboardAPI';
import { toast } from '@/components/ui/sonner';

const InvestorDashboard = () => {
  const { databaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState('portfolio');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Use the custom hook to get real data from database
  const { 
    portfolio, 
    pledges, 
    loading, 
    error, 
    refreshData 
  } = useInvestorDashboard();

  // Filter investments based on search term (if needed)
  const filteredInvestments = portfolio?.holdings?.filter(investment => 
    investment.influencerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    investment.tokenSymbol.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
      launched: { color: 'bg-green-500', text: 'Launched' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  // Handle refresh action
  const handleRefresh = async () => {
    try {
      await refreshData();
      toast.success('Dashboard data refreshed');
    } catch (error) {
      toast.error('Failed to refresh data');
    }
  };

  // Show error state
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
      
      {/* Dashboard Content with proper spacing for header */}
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
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Portfolio Value</p>
              <p className="text-2xl font-bold text-primary">
                {portfolio?.summary ? formatCurrency(portfolio.summary.totalValue) : '0.00 ETH'}
              </p>
              <Button 
                onClick={handleRefresh} 
                size="sm" 
                variant="outline" 
                className="mt-2 border-zinc-700 hover:border-primary/50"
              >
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Portfolio Stats - Using real data from database */}
        {portfolio?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Invested</CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(portfolio.summary.totalCost)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total P&L</CardTitle>
                {portfolio.summary.totalPnL >= 0 ? 
                  <ArrowUpRight className="h-4 w-4 text-green-500" /> : 
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                }
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getChangeColor(portfolio.summary.totalPnL)}`}>
                  {formatCurrency(portfolio.summary.totalPnL)}
                </div>
                <p className={`text-xs ${getChangeColor(portfolio.summary.totalPnL)}`}>
                  {portfolio.summary.totalPnLPercent > 0 ? '+' : ''}{portfolio.summary.totalPnLPercent.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Active Positions</CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{portfolio.summary.holdingsCount}</div>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Current Value</CardTitle>
                <Star className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(portfolio.summary.totalValue)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="pledges">My Pledges</TabsTrigger>
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
                  {portfolio?.holdings && portfolio.holdings.length > 0 && (
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
                {portfolio?.holdings && filteredInvestments.length > 0 ? (
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
                              <Button size="sm" variant="outline" className="border-zinc-700 hover:border-primary/50">
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
                <CardDescription>Track your pre-investment pledges</CardDescription>
              </CardHeader>
              <CardContent>
                {pledges?.pledges && pledges.pledges.length > 0 ? (
                  <div className="space-y-4">
                    {pledges.pledges.map((pledge, index) => (
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
                      onClick={() => setActiveTab('discover')}
                    >
                      Discover Influencers
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
                <CardDescription>Find new influencers to invest in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">Discovery feature coming soon</p>
                  <p className="text-sm">We're working on bringing you the best investment opportunities</p>
                  <Button 
                    className="mt-4 bg-primary hover:bg-primary/90 text-black font-semibold" 
                    onClick={() => window.location.href = '/influencers'}
                  >
                    View All Influencers
                  </Button>
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