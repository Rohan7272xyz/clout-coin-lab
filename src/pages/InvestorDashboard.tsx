// src/pages/InvestorDashboard.tsx
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

interface Investment {
  id: number;
  token_name: string;
  token_symbol: string;
  influencer_name: string;
  influencer_handle: string;
  amount_invested_eth: number;
  tokens_received: number;
  purchase_price: number;
  current_price: number;
  pnl: number;
  pnl_percentage: number;
  created_at: string;
}

interface AvailableInfluencer {
  id: number;
  name: string;
  handle: string;
  category: string;
  followers_count: number;
  avatar_url: string;
  verified: boolean;
  status: string;
  total_pledged_eth: number;
  pledge_threshold_eth: number;
  description: string;
  token_address?: string;
  current_price?: number;
  market_cap?: number;
  volume_24h?: number;
}

interface WatchlistItem {
  id: number;
  influencer_id: number;
  influencer_name: string;
  influencer_handle: string;
  current_price: number;
  price_change_24h: number;
  market_cap: number;
}

interface PortfolioStats {
  totalInvested: number;
  currentValue: number;
  totalPnL: number;
  totalPnLPercentage: number;
  activePositions: number;
  biggestWin: number;
  biggestLoss: number;
}

const InvestorDashboard = () => {
  const { databaseUser, user } = useAuth();
  const [activeTab, setActiveTab] = useState('portfolio');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // State for different data
  const [portfolioStats, setPortfolioStats] = useState<PortfolioStats | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [availableInfluencers, setAvailableInfluencers] = useState<AvailableInfluencer[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      // Fetch portfolio data
      const portfolioResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/investor/portfolio`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const portfolioData = await portfolioResponse.json();
      
      setPortfolioStats(portfolioData.stats);
      setInvestments(portfolioData.investments || []);

      // Fetch available influencers
      const influencersResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/investor/influencers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const influencersData = await influencersResponse.json();
      setAvailableInfluencers(influencersData.influencers || []);

      // Fetch watchlist
      const watchlistResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/investor/watchlist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const watchlistData = await watchlistResponse.json();
      setWatchlist(watchlistData.watchlist || []);

    } catch (error) {
      console.error('Error fetching investor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (influencerId: number) => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/investor/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ influencer_id: influencerId })
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const removeFromWatchlist = async (influencerId: number) => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dashboard/investor/watchlist/${influencerId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Error removing from watchlist:', error);
    }
  };

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
      live: { color: 'bg-emerald-500', text: 'Trading' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

  // Filter influencers based on search and category
  const filteredInfluencers = availableInfluencers.filter(influencer => {
    const matchesSearch = influencer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         influencer.handle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || influencer.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = ['all', ...Array.from(new Set(availableInfluencers.map(inf => inf.category)))];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-8 h-8 text-blue-500" />
              <h1 className="text-3xl font-bold">Investor Dashboard</h1>
            </div>
            <p className="text-gray-400">Welcome back, {databaseUser?.display_name || 'Investor'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Portfolio Value</p>
            <p className="text-2xl font-bold text-green-400">
              {portfolioStats ? formatCurrency(portfolioStats.currentValue) : '0.00 ETH'}
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Stats */}
      {portfolioStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Invested</CardTitle>
              <Wallet className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(portfolioStats.totalInvested)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total P&L</CardTitle>
              {portfolioStats.totalPnL >= 0 ? 
                <ArrowUpRight className="h-4 w-4 text-green-500" /> : 
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              }
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getChangeColor(portfolioStats.totalPnL)}`}>
                {formatCurrency(portfolioStats.totalPnL)}
              </div>
              <p className={`text-xs ${getChangeColor(portfolioStats.totalPnL)}`}>
                {portfolioStats.totalPnLPercentage > 0 ? '+' : ''}{portfolioStats.totalPnLPercentage.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Active Positions</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{portfolioStats.activePositions}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Best Performer</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                +{portfolioStats.biggestWin.toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-900 border-gray-800">
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Your Investments</CardTitle>
              <CardDescription>Track your influencer token positions</CardDescription>
            </CardHeader>
            <CardContent>
              {investments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead>Influencer</TableHead>
                      <TableHead>Token</TableHead>
                      <TableHead>Amount Invested</TableHead>
                      <TableHead>Tokens Owned</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {investments.map((investment) => (
                      <TableRow key={investment.id} className="border-gray-800">
                        <TableCell>
                          <div>
                            <div className="font-medium">{investment.influencer_name}</div>
                            <div className="text-sm text-purple-400">{investment.influencer_handle}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{investment.token_name}</div>
                            <div className="text-sm text-gray-400">{investment.token_symbol}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(investment.amount_invested_eth)}</TableCell>
                        <TableCell>{formatNumber(investment.tokens_received, 0)}</TableCell>
                        <TableCell>{formatCurrency(investment.current_price)}</TableCell>
                        <TableCell>
                          <div className={getChangeColor(investment.pnl)}>
                            <div>{formatCurrency(investment.pnl)}</div>
                            <div className="text-xs">
                              {investment.pnl_percentage > 0 ? '+' : ''}{investment.pnl_percentage.toFixed(2)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline">
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
                    className="mt-4" 
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
          {/* Search and Filter */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search influencers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-800 text-white"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 bg-gray-900 border-gray-800">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-800">
                {categories.map((category) => (
                  <SelectItem key={category} value={category} className="text-white">
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Influencers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInfluencers.map((influencer) => (
              <Card key={influencer.id} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={influencer.avatar_url}
                        alt={influencer.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{influencer.name}</CardTitle>
                          {influencer.verified && <Star className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <p className="text-purple-400 text-sm">{influencer.handle}</p>
                      </div>
                    </div>
                    {getStatusBadge(influencer.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-400 line-clamp-2">{influencer.description}</p>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Category:</span>
                    <span>{influencer.category}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Followers:</span>
                    <span>{formatNumber(influencer.followers_count, 0)}</span>
                  </div>

                  {influencer.status === 'pending' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Pledged:</span>
                        <span>{influencer.total_pledged_eth} / {influencer.pledge_threshold_eth} ETH</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all" 
                          style={{ 
                            width: `${Math.min((influencer.total_pledged_eth / influencer.pledge_threshold_eth) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {influencer.token_address && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Price:</span>
                        <span>{formatCurrency(influencer.current_price || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Market Cap:</span>
                        <span>${formatNumber(influencer.market_cap || 0)}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button 
                      className="flex-1" 
                      variant={influencer.token_address ? "default" : "secondary"}
                      disabled={!influencer.token_address}
                    >
                      {influencer.token_address ? "Invest" : "Pledge"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => addToWatchlist(influencer.id)}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInfluencers.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No influencers found matching your criteria</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Your Watchlist</CardTitle>
              <CardDescription>Keep track of your favorite influencers</CardDescription>
            </CardHeader>
            <CardContent>
              {watchlist.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead>Influencer</TableHead>
                      <TableHead>Current Price</TableHead>
                      <TableHead>24h Change</TableHead>
                      <TableHead>Market Cap</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {watchlist.map((item) => (
                      <TableRow key={item.id} className="border-gray-800">
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.influencer_name}</div>
                            <div className="text-sm text-purple-400">{item.influencer_handle}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(item.current_price)}</TableCell>
                        <TableCell className={getChangeColor(item.price_change_24h)}>
                          {item.price_change_24h > 0 ? '+' : ''}{item.price_change_24h.toFixed(2)}%
                        </TableCell>
                        <TableCell>${formatNumber(item.market_cap)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Invest
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => removeFromWatchlist(item.influencer_id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No items in your watchlist</p>
                  <p className="text-sm">Add influencers to track their performance</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setActiveTab('discover')}
                  >
                    Discover Influencers
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestorDashboard;