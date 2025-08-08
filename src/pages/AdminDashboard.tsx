// src/pages/AdminDashboard.tsx - Updated with real database integration
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Crown, Users, Coins, TrendingUp, AlertTriangle, CheckCircle, XCircle, Eye, DollarSign, Activity, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/ui/header';
import { useAdminDashboard } from '@/lib/dashboard/dashboardAPI';
import { toast } from '@/components/ui/sonner';

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

const AdminDashboard = () => {
  const { databaseUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Use the real database integration hook
  const {
    stats,
    pendingApprovals,
    loading,
    error,
    refreshData,
    processApproval
  } = useAdminDashboard();

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
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
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
                      variant="outline"
                      className="w-full justify-start border-zinc-700 hover:border-primary/50"
                      onClick={() => window.location.href = '/admin/token-factory'}
                    >
                      <Coins className="w-4 h-4 mr-2" />
                      Access Token Factory
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