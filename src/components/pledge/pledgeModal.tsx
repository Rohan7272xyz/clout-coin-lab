// src/components/pledge/PledgeModal.tsx - Updated with proper API integration
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  X, 
  Check, 
  Users, 
  DollarSign,
  Zap,
  AlertCircle,
  TrendingUp,
  Clock,
  Bell
} from "lucide-react";
import { useAccount } from "wagmi";
import type { InfluencerPledgeData } from "@/lib/pledge/types";
import { formatPledgeAmount, calculateProgress } from "@/lib/pledge/api";
import { toast } from "@/components/ui/sonner";

interface PledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  influencer: InfluencerPledgeData;
  onPledgeSubmit?: (amount: string, currency: 'ETH' | 'USDC') => void;
}

const PledgeModal = ({ isOpen, onClose, influencer, onPledgeSubmit }: PledgeModalProps) => {
  const { isConnected, address } = useAccount();
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<'ETH' | 'USDC'>('ETH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate progress
  const ethProgress = calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH);
  const usdcProgress = calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC);
  const overallProgress = Math.max(ethProgress, usdcProgress);

  // Determine which thresholds are active
  const showETH = parseFloat(influencer.thresholdETH) > 0;
  const showUSDC = parseFloat(influencer.thresholdUSDC) > 0;

  const submitPledgeToDatabase = async (amount: string, currency: 'ETH' | 'USDC', txHash?: string) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // For development, use mock endpoint if no transaction hash
      const endpoint = txHash ? '/api/pledge/submit' : '/api/pledge/mock';
      
      const payload = {
        userAddress: address,
        influencerAddress: influencer.address,
        amount: amount,
        currency: currency,
        ...(txHash && { 
          txHash,
          blockNumber: Math.floor(Math.random() * 1000000) // Mock block number
        })
      };

      console.log('📤 Submitting pledge to database:', payload);

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Pledge recorded successfully:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error submitting pledge to database:', error);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!pledgeAmount || parseFloat(pledgeAmount) <= 0) {
      toast.error("Please enter a valid pledge amount");
      return;
    }

    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('🔄 Starting pledge submission...');
      
      // For demo purposes, we'll simulate a blockchain transaction
      // In production, this would interact with your smart contract
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Submit to database (with mock data for now)
      const result = await submitPledgeToDatabase(pledgeAmount, selectedCurrency);
      
      // Call the parent callback if provided
      onPledgeSubmit?.(pledgeAmount, selectedCurrency);
      
      // Show success message
      toast.success(`Successfully pledged ${pledgeAmount} ${selectedCurrency} to ${influencer.name}!`);
      
      // Close modal
      onClose();
      
      // Optional: Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Pledge submission failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit pledge. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (influencer.isLaunched) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <Check className="w-3 h-3 mr-1" />
          Live
        </Badge>
      );
    }
    if (influencer.isApproved) {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <Zap className="w-3 h-3 mr-1" />
          Approved
        </Badge>
      );
    }
    if (influencer.thresholdMet) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <TrendingUp className="w-3 h-3 mr-1" />
          Goal Reached
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
        <Clock className="w-3 h-3 mr-1" />
        Pledging
      </Badge>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        <CardHeader className="text-center pb-4 pt-8">
          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            {getStatusBadge()}
          </div>

          {/* Hot Badge */}
          {influencer.thresholdMet && !influencer.isLaunched && (
            <div className="absolute top-3 left-16">
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs animate-pulse">
                🔥 Hot
              </Badge>
            </div>
          )}

          {/* Avatar */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            <img
              src={influencer.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.address}`}
              alt={influencer.name}
              className={`w-full h-full rounded-full object-cover border-2 ${
                influencer.thresholdMet || influencer.isLaunched 
                  ? 'border-primary shadow-lg shadow-primary/25' 
                  : 'border-zinc-700'
              }`}
            />
            {influencer.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-xl text-white mb-1">{influencer.name}</CardTitle>
          <CardDescription className="text-gray-400 text-sm mb-3">
            @{influencer.name.toLowerCase().replace(/\s+/g, '')}
          </CardDescription>
          
          {influencer.followers && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{influencer.followers} Followers</span>
            </div>
          )}

          {influencer.category && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
              {influencer.category}
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="pt-0 pb-6">
          {influencer.description && (
            <p className="text-sm text-gray-400 text-center mb-4 leading-relaxed">
              {influencer.description}
            </p>
          )}
          
          {/* Progress Section */}
          <div className="space-y-3 mb-6">
            {/* Overall Progress */}
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Overall Progress</div>
              <Progress value={overallProgress} className="h-2 mb-1" />
              <div className="text-xs font-medium text-primary">
                {overallProgress.toFixed(1)}% Complete
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-2 text-xs text-gray-500">
              {showETH && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>ETH Progress</span>
                  </div>
                  <span>{formatPledgeAmount(influencer.totalPledgedETH)} / {formatPledgeAmount(influencer.thresholdETH)} ETH</span>
                </div>
              )}
              {showUSDC && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    <span>USDC Progress</span>
                  </div>
                  <span>${formatPledgeAmount(influencer.totalPledgedUSDC, 'USDC')} / ${formatPledgeAmount(influencer.thresholdUSDC, 'USDC')} USDC</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center text-xs text-gray-500">
              <Users className="w-3 h-3 mr-1" />
              <span>{influencer.pledgerCount} investor{influencer.pledgerCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Pledge Form */}
          {!influencer.isLaunched && (
            <div className="space-y-4">
              {/* Currency Selection */}
              <div className="flex gap-2">
                {showETH && (
                  <Button
                    variant={selectedCurrency === 'ETH' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCurrency('ETH')}
                  >
                    ETH
                  </Button>
                )}
                {showUSDC && (
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
                <label className="text-sm font-medium mb-2 block text-white">
                  Pledge Amount ({selectedCurrency})
                </label>
                <Input
                  type="number"
                  placeholder={`0.1`}
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(e.target.value)}
                  className="text-lg bg-zinc-800 border-zinc-700 text-white"
                  step="0.001"
                  min="0"
                />
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !isConnected || !pledgeAmount}
                className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                    Pledging...
                  </>
                ) : !isConnected ? (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Connect Wallet to Pledge
                  </>
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-2" />
                    Pledge {selectedCurrency}
                  </>
                )}
              </Button>

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-600">
                  <strong>Pre-Investment:</strong> Your funds will be held in escrow until the influencer's threshold is met and they approve the token launch.
                </div>
              </div>
            </div>
          )}

          {/* Already Launched */}
          {influencer.isLaunched && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-green-400 font-medium">Token Launched!</div>
                <div className="text-xs text-gray-400 mt-1">
                  This influencer's token is now live and trading
                </div>
              </div>
              
              <Button 
                onClick={onClose}
                className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Start Trading
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PledgeModal;