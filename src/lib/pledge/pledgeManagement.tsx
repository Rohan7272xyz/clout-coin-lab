// src/components/pledge/PledgeManagement.tsx - Complete pledge management system
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Bell, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  Wallet,
  Clock,
  Gift
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { 
  pledgeApi, 
  formatPledgeAmount, 
  calculateProgress, 
  getStatusText, 
  getStatusColor,
  type InfluencerPledgeData,
  type UserPledge
} from '@/lib/pledge/api';

interface PledgeManagementProps {
  mode?: 'public' | 'investor' | 'admin';
  selectedInfluencer?: string;
}

const PledgeManagement: React.FC<PledgeManagementProps> = ({ 
  mode = 'public',
  selectedInfluencer 
}) => {
  const { isConnected, address } = useAccount();
  const [activeTab, setActiveTab] = useState<'discover' | 'my-pledges' | 'admin'>('discover');
  
  // Data state
  const [influencers, setInfluencers] = useState<InfluencerPledgeData[]>([]);
  const [userPledges, setUserPledges] = useState<UserPledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pledge form state
  const [selectedInfluencerData, setSelectedInfluencerData] = useState<InfluencerPledgeData | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'ETH' | 'USDC'>('ETH');
  const [isPledging, setIsPledging] = useState(false);
  
  // Admin state
  const [adminSetup, setAdminSetup] = useState({
    influencerAddress: '',
    ethThreshold: '',
    usdcThreshold: '',
    tokenName: '',
    tokenSymbol: '',
    influencerName: ''
  });

  // Load data on mount
  useEffect(() => {
    loadInfluencers();
    if (isConnected && address && mode !== 'public') {
      loadUserPledges();
    }
  }, [isConnected, address, mode]);

  // Load influencers
  const loadInfluencers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await pledgeApi.getAllInfluencers();
      setInfluencers(data);
      
      // Auto-select influencer if specified
      if (selectedInfluencer) {
        const influencer = data.find(inf => inf.address === selectedInfluencer);
        if (influencer) {
          setSelectedInfluencerData(influencer);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load influencers');
    } finally {
      setLoading(false);
    }
  };

  // Load user pledges
  const loadUserPledges = async () => {
    if (!address) return;
    
    try {
      const { pledges } = await pledgeApi.getUserPledges(address);
      setUserPledges(pledges);
    } catch (err) {
      console.error('Error loading user pledges:', err);
    }
  };

  // Handle pledge submission
  const handlePledgeSubmit = async () => {
    if (!selectedInfluencerData || !address || !pledgeAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsPledging(true);
    try {
      // For demo purposes, we'll simulate the transaction
      // In production, you'd call your smart contract here
      
      await pledgeApi.submitPledge({
        userAddress: address,
        influencerAddress: selectedInfluencerData.address,
        amount: pledgeAmount,
        currency: selectedCurrency,
        // txHash and blockNumber would come from actual transaction
      });

      toast.success(`Successfully pledged ${pledgeAmount} ${selectedCurrency} to ${selectedInfluencerData.name}!`);
      
      // Reset form and refresh data
      setPledgeAmount('');
      setSelectedInfluencerData(null);
      await loadInfluencers();
      await loadUserPledges();
      
    } catch (error) {
      console.error('Pledge error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit pledge');
    } finally {
      setIsPledging(false);
    }
  };

  // Handle admin setup
  const handleAdminSetup = async () => {
    try {
      await pledgeApi.admin.setupInfluencer(adminSetup);
      toast.success('Influencer setup completed successfully');
      setAdminSetup({
        influencerAddress: '',
        ethThreshold: '',
        usdcThreshold: '',
        tokenName: '',
        tokenSymbol: '',
        influencerName: ''
      });
      await loadInfluencers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to setup influencer');
    }
  };

  // Handle approve influencer
  const handleApproveInfluencer = async (address: string) => {
    try {
      await pledgeApi.admin.approveInfluencer(address);
      toast.success('Influencer approved successfully');
      await loadInfluencers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve influencer');
    }
  };

  // Render pledge modal
  const renderPledgeModal = () => {
    if (!selectedInfluencerData) return null;

    const ethProgress = calculateProgress(selectedInfluencerData.totalPledgedETH, selectedInfluencerData.thresholdETH);
    const usdcProgress = calculateProgress(selectedInfluencerData.totalPledgedUSDC, selectedInfluencerData.thresholdUSDC);
    const overallProgress = Math.max(ethProgress, usdcProgress);

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center pb-4">
            <button
              onClick={() => setSelectedInfluencerData(null)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>

            <div className="relative w-20 h-20 mx-auto mb-4">
              <img
                src={selectedInfluencerData.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${selectedInfluencerData.address}`}
                alt={selectedInfluencerData.name}
                className="w-full h-full rounded-full object-cover border-2 border-primary shadow-lg"
              />
              {selectedInfluencerData.verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
            </div>
            
            <CardTitle className="text-xl">{selectedInfluencerData.name}</CardTitle>
            <CardDescription>
              {selectedInfluencerData.handle} • {selectedInfluencerData.followers} followers
            </CardDescription>
            
            {selectedInfluencerData.category && (
              <Badge variant="outline" className="mt-2">
                {selectedInfluencerData.category}
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="space-y-4">
            {selectedInfluencerData.description && (
              <p className="text-sm text-gray-400 text-center">
                {selectedInfluencerData.description}
              </p>
            )}
            
            {/* Progress Section */}
            <div className="space-y-3">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Overall Progress</div>
                <Progress value={overallProgress} className="h-2 mb-1" />
                <div className="text-xs font-medium text-primary">
                  {overallProgress.toFixed(1)}% Complete
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                {parseFloat(selectedInfluencerData.thresholdETH) > 0 && (
                  <div className="text-center">
                    <div className="text-gray-400">ETH Goal</div>
                    <div className="font-medium">
                      {formatPledgeAmount(selectedInfluencerData.totalPledgedETH)} / {formatPledgeAmount(selectedInfluencerData.thresholdETH)}
                    </div>
                  </div>
                )}
                {parseFloat(selectedInfluencerData.thresholdUSDC) > 0 && (
                  <div className="text-center">
                    <div className="text-gray-400">USDC Goal</div>
                    <div className="font-medium">
                      ${formatPledgeAmount(selectedInfluencerData.totalPledgedUSDC, 'USDC')} / ${formatPledgeAmount(selectedInfluencerData.thresholdUSDC, 'USDC')}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center text-xs text-gray-500">
                <Users className="w-3 h-3 mr-1" />
                <span>{selectedInfluencerData.pledgerCount} pledgers</span>
              </div>
            </div>

            {/* Pledge Form */}
            {!selectedInfluencerData.isLaunched && isConnected && (
              <div className="space-y-4">
                {/* Currency Selection */}
                <div className="flex gap-2">
                  {parseFloat(selectedInfluencerData.thresholdETH) > 0 && (
                    <Button
                      variant={selectedCurrency === 'ETH' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCurrency('ETH')}
                    >
                      ETH
                    </Button>
                  )}
                  {parseFloat(selectedInfluencerData.thresholdUSDC) > 0 && (
                    <Button
                      variant={selectedCurrency === 'USDC' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCurrency('USDC')}
                    >
                      USDC
                    </Button>
                  )}
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Pledge Amount ({selectedCurrency})
                  </label>
                  <Input
                    type="number"
                    placeholder="0.1"
                    value={pledgeAmount}
                    onChange={(e) => setPledgeAmount(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                    step="0.001"
                    min="0"
                  />
                </div>

                {/* Submit Button */}
                <Button 
                  onClick={handlePledgeSubmit}
                  disabled={isPledging || !pledgeAmount}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
                >
                  {isPledging ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Pledging...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Pledge {selectedCurrency}
                    </>
                  )}
                </Button>

                {/* Warning */}
                <Alert className="border-yellow-500/20 bg-yellow-500/5">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-yellow-600 text-xs">
                    <strong>Pre-Investment:</strong> Funds held in escrow until threshold met and token approved.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Already Launched */}
            {selectedInfluencerData.isLaunched && (
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-green-400 font-medium">Token Launched!</div>
                <div className="text-xs text-gray-400 mt-1">
                  This token is now live and trading
                </div>
              </div>
            )}

            {/* Status */}
            <div className={`text-center text-xs ${getStatusColor(selectedInfluencerData)}`}>
              {getStatusText(selectedInfluencerData)}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render influencer grid
  const renderInfluencerGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {influencers.map((influencer) => {
        const overallProgress = Math.max(
          calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH),
          calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC)
        );

        return (
          <Card 
            key={influencer.address}
            className="bg-zinc-900 border-zinc-800 hover:border-primary/50 transition-all cursor-pointer"
            onClick={() => setSelectedInfluencerData(influencer)}
          >
            <CardHeader className="text-center pb-4">
              <div className="relative w-16 h-16 mx-auto mb-3">
                <img
                  src={influencer.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.address}`}
                  alt={influencer.name}
                  className="w-full h-full rounded-full object-cover border-2 border-zinc-700"
                />
                {influencer.verified && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-2 h-2 text-black" />
                  </div>
                )}
              </div>
              
              <CardTitle className="text-lg">{influencer.name}</CardTitle>
              <CardDescription className="text-sm">
                {influencer.handle} • {influencer.followers} followers
              </CardDescription>
              
              {influencer.category && (
                <Badge variant="outline" className="text-xs">
                  {influencer.category}
                </Badge>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="space-y-3">
                <div className="text-center">
                  <Progress value={overallProgress} className="h-2 mb-1" />
                  <div className="text-xs text-primary font-medium">
                    {overallProgress.toFixed(1)}% Complete
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>{formatPledgeAmount(influencer.totalPledgedETH)} ETH</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{influencer.pledgerCount} pledgers</span>
                  </div>
                </div>
                
                <Button 
                  className={`w-full ${
                    influencer.isLaunched 
                      ? 'bg-primary hover:bg-primary/90 text-black' 
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                  size="sm"
                >
                  {influencer.isLaunched ? (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Trade Now
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      Pledge Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // Render user pledges
  const renderUserPledges = () => (
    <div className="space-y-4">
      {userPledges.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="mb-2">No pledges yet</p>
          <p className="text-sm">Start pledging to your favorite influencers!</p>
        </div>
      ) : (
        userPledges.map((pledge) => (
          <Card key={pledge.id} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={pledge.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${pledge.influencerAddress}`}
                    alt={pledge.influencerName}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <h4 className="font-medium">{pledge.influencerName}</h4>
                    <p className="text-sm text-gray-400">{pledge.influencerHandle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {parseFloat(pledge.ethAmount) > 0 
                      ? `${formatPledgeAmount(pledge.ethAmount)} ETH`
                      : `$${formatPledgeAmount(pledge.usdcAmount, 'USDC')} USDC`
                    }
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(pledge.pledgedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-500/20 bg-red-500/5">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <AlertDescription className="text-red-400">
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      {mode !== 'public' && (
        <div className="flex space-x-4 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('discover')}
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'discover' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'
            }`}
          >
            Discover
          </button>
          {isConnected && (
            <button
              onClick={() => setActiveTab('my-pledges')}
              className={`pb-2 px-1 text-sm font-medium ${
                activeTab === 'my-pledges' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'
              }`}
            >
              My Pledges ({userPledges.length})
            </button>
          )}
          {mode === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`pb-2 px-1 text-sm font-medium ${
                activeTab === 'admin' ? 'text-primary border-b-2 border-primary' : 'text-gray-400'
              }`}
            >
              Admin Panel
            </button>
          )}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'discover' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Available for Pledging</h2>
            <p className="text-gray-400">
              Support your favorite influencers by pledging to their upcoming tokens
            </p>
          </div>
          {renderInfluencerGrid()}
        </div>
      )}

      {activeTab === 'my-pledges' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">My Pledges</h2>
            <p className="text-gray-400">
              Track your pre-investment pledges and their status
            </p>
          </div>
          {renderUserPledges()}
        </div>
      )}

      {activeTab === 'admin' && mode === 'admin' && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Admin Panel</h2>
            <p className="text-gray-400">
              Manage influencer setups and approvals
            </p>
          </div>
          
          {/* Admin Setup Form */}
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardHeader>
              <CardTitle>Setup New Influencer</CardTitle>
              <CardDescription>Configure pledge thresholds for a new influencer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Influencer Name</label>
                  <Input
                    value={adminSetup.influencerName}
                    onChange={(e) => setAdminSetup(prev => ({ ...prev, influencerName: e.target.value }))}
                    placeholder="John Doe"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Wallet Address</label>
                  <Input
                    value={adminSetup.influencerAddress}
                    onChange={(e) => setAdminSetup(prev => ({ ...prev, influencerAddress: e.target.value }))}
                    placeholder="0x..."
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Token Name</label>
                  <Input
                    value={adminSetup.tokenName}
                    onChange={(e) => setAdminSetup(prev => ({ ...prev, tokenName: e.target.value }))}
                    placeholder="John Doe Token"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Token Symbol</label>
                  <Input
                    value={adminSetup.tokenSymbol}
                    onChange={(e) => setAdminSetup(prev => ({ ...prev, tokenSymbol: e.target.value.toUpperCase() }))}
                    placeholder="JOHN"
                    maxLength={5}
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">ETH Threshold</label>
                  <Input
                    type="number"
                    value={adminSetup.ethThreshold}
                    onChange={(e) => setAdminSetup(prev => ({ ...prev, ethThreshold: e.target.value }))}
                    placeholder="5.0"
                    step="0.1"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">USDC Threshold</label>
                  <Input
                    type="number"
                    value={adminSetup.usdcThreshold}
                    onChange={(e) => setAdminSetup(prev => ({ ...prev, usdcThreshold: e.target.value }))}
                    placeholder="10000"
                    step="100"
                    className="bg-zinc-800 border-zinc-700"
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleAdminSetup}
                className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
                disabled={!adminSetup.influencerAddress || !adminSetup.influencerName}
              >
                <Gift className="w-4 h-4 mr-2" />
                Setup Influencer
              </Button>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Influencers who have met their thresholds and need approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {influencers
                  .filter(inf => inf.thresholdMet && !inf.isApproved && !inf.isLaunched)
                  .map((influencer) => (
                    <div key={influencer.address} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img 
                          src={influencer.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.address}`}
                          alt={influencer.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <h4 className="font-medium">{influencer.name}</h4>
                          <p className="text-sm text-gray-400">
                            {formatPledgeAmount(influencer.totalPledgedETH)} ETH pledged • {influencer.pledgerCount} pledgers
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleApproveInfluencer(influencer.address)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        size="sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  ))}
                {influencers.filter(inf => inf.thresholdMet && !inf.isApproved && !inf.isLaunched).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-2">No pending approvals</p>
                    <p className="text-sm">All threshold-met influencers have been processed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pledge Modal */}
      {renderPledgeModal()}
    </div>
  );
};

export default PledgeManagement;