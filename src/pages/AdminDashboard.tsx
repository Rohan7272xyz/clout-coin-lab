// src/pages/AdminDashboard.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Crown, Users, Coins, TrendingUp, AlertTriangle, CheckCircle, XCircle, Eye, DollarSign, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Header from '@/components/ui/header';

interface User {
  id: number;
  email: string;
  display_name: string;
  wallet_address: string;
  status: string;
  total_invested: number;
  created_at: string;
}

interface Influencer {
  id: number;
  name: string;
  handle: string;
  email: string;
  followers_count: number;
  category: string;
  status: string;
  total_pledged_eth: number;
  pledge_threshold_eth: number;
  created_at: string;
}

interface PlatformStats {
  totalUsers: number;
  totalInfluencers: number;
  totalTokens: number;
  totalVolume: number;
  pendingApprovals: number;
  activeTokens: number;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      // Mock data for now since the API endpoints might not exist yet
      setStats({
        totalUsers: 42,
        totalInfluencers: 8,
        totalTokens: 3,
        totalVolume: 145.7,
        pendingApprovals: 2,
        activeTokens: 3
      });

      setUsers([
        {
          id: 1,
          email: 'john@example.com',
          display_name: 'John Doe',
          wallet_address: '0x123...abc',
          status: 'investor',
          total_invested: 2.5,
          created_at: '2024-01-15'
        },
        {
          id: 2,
          email: 'jane@example.com',
          display_name: 'Jane Smith',
          wallet_address: '0x456...def',
          status: 'influencer',
          total_invested: 0,
          created_at: '2024-01-20'
        }
      ]);

      setInfluencers([
        {
          id: 1,
          name: 'Crypto King',
          handle: '@cryptoking',
          email: 'king@crypto.com',
          followers_count: 1500000,
          category: 'Crypto',
          status: 'approved',
          total_pledged_eth: 15.5,
          pledge_threshold_eth: 10,
          created_at: '2024-01-10'
        }
      ]);

    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId: number, newStatus: string) => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/upgrade-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, new_status: newStatus })
      });

      if (response.ok) {
        fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
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
      live: { color: 'bg-emerald-500', text: 'Live' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'bg-gray-500', text: status };
    return <Badge className={`${config.color} text-white`}>{config.text}</Badge>;
  };

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
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-400">Manage Token Factory platform operations</p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalUsers}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Influencers</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalInfluencers}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Active Tokens</CardTitle>
                <Coins className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.activeTokens}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Pending Approvals</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.pendingApprovals}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-900 border-gray-800">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="influencers">Influencers</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <span className="text-sm">New user registered</span>
                      <span className="text-xs text-gray-400">2 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <span className="text-sm">Influencer approved</span>
                      <span className="text-xs text-gray-400">4 hours ago</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                      <span className="text-sm">Token deployed</span>
                      <span className="text-xs text-gray-400">6 hours ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Platform Health */}
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Platform Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Volume</span>
                      <span className="font-semibold">{stats?.totalVolume || 0} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Platform Revenue</span>
                      <span className="font-semibold">{((stats?.totalVolume || 0) * 0.05).toFixed(3)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Tokens</span>
                      <span className="font-semibold">{stats?.activeTokens || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead>Email</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invested</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-gray-800">
                        <TableCell className="font-medium">{user.email}</TableCell>
                        <TableCell>{user.display_name || 'N/A'}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>{user.total_invested} ETH</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUserStatus(user.id, 'investor')}
                              disabled={user.status === 'investor'}
                            >
                              Make Investor
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateUserStatus(user.id, 'admin')}
                              disabled={user.status === 'admin'}
                            >
                              Make Admin
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="influencers" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Influencer Management</CardTitle>
                <CardDescription>Review and approve influencer applications</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead>Name</TableHead>
                      <TableHead>Handle</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pledged/Threshold</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {influencers.map((influencer) => (
                      <TableRow key={influencer.id} className="border-gray-800">
                        <TableCell className="font-medium">{influencer.name}</TableCell>
                        <TableCell className="text-purple-400">{influencer.handle}</TableCell>
                        <TableCell>{influencer.category}</TableCell>
                        <TableCell>{influencer.followers_count?.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(influencer.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{influencer.total_pledged_eth} / {influencer.pledge_threshold_eth} ETH</div>
                            <div className="text-gray-400 text-xs">
                              {((influencer.total_pledged_eth / influencer.pledge_threshold_eth) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {influencer.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-400 border-green-400 hover:bg-green-400 hover:text-black"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-400 hover:bg-red-400 hover:text-black"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {influencer.status !== 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-gray-400"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tokens" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle>Token Management</CardTitle>
                <CardDescription>Monitor deployed tokens and their performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Token management features coming soon...</p>
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