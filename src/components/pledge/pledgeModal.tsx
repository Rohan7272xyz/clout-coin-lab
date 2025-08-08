// src/components/pledge/PledgeModal.tsx - Fixed with proper API integration and error handling
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  X, 
  Check, 
  Users, 
  DollarSign,
  Zap,
  AlertCircle,
  TrendingUp,
  Clock,
  Bell,
  Loader2,
  ExternalLink
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
  onSuccess?: () => void; // Callback to refresh data after successful pledge
}

interface PledgeResponse {
  success: boolean;
  message: string;
  pledge: {
    id: number;
    userAddress: string;
    influencerAddress: string;
    ethAmount: number;
    usdcAmount: number;
    txHash: string;
    blockNumber: number;
    createdAt: string;
    mock: boolean;
  };
  influencerTotals: {
    totalPledgedETH: number;
    totalPledgedUSDC: number;
    pledgeCount: number;
    thresholdETH: number;
    thresholdUSDC: number;
  };
  thresholdMet: boolean;
}

const PledgeModal = ({ isOpen, onClose, influencer, onPledgeSubmit, onSuccess }: PledgeModalProps) => {
  const { isConnected, address } = useAccount();
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<'ETH' | 'USDC'>('ETH');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate progress
  const ethProgress = calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH);
  const usdcProgress = calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC);
  const overallProgress = Math.max(ethProgress, usdcProgress);

  // Determine which thresholds are active
  const showETH = parseFloat(influencer.thresholdETH) > 0;
  const showUSDC = parseFloat(influencer.thresholdUSDC) > 0;

  const submitPledgeToDatabase = async (amount: string, currency: 'ETH' | 'USDC', txHash?: string): Promise<PledgeResponse> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    const payload = {
      userAddress: address,
      influencerAddress: influencer.address,
      amount: amount,
      currency: currency,
      ...(txHash && { 
        txHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000 // Mock block number for demo
      })
    };

    console.log('📤 Submitting pledge to database:', payload);

    const response = await fetch(`${apiUrl}/api/pledge/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Pledge recorded successfully:', result);
    
    return result;
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

    // Validate amount based on currency
    const amount = parseFloat(pledgeAmount);
    if (selectedCurrency === 'ETH' && amount < 0.001) {
      toast.error("Minimum pledge amount is 0.001 ETH");
      return;
    }
    if (selectedCurrency === 'USDC' && amount < 1) {
      toast.error("Minimum pledge amount is 1 USDC");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      console.log('🔄 Starting pledge submission...');
      
      // For demo purposes, we'll simulate a blockchain transaction
      // In production, this would interact with your smart contract first
      
      // Simulate transaction delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a mock transaction hash for demo
      const mockTxHash = `0x${Math.random().toString(16).substring(2)}${Date.now().toString(16)}`;
      
      // Submit to database
      const result = await submitPledgeToDatabase(pledgeAmount, selectedCurrency, mockTxHash);
      
      // Store transaction hash for display
      setLastTxHash(result.pledge.txHash);
      
      // Call the parent callback if provided
      onPledgeSubmit?.(pledgeAmount, selectedCurrency);
      
      // Show success message with more details
      const successMessage = result.thresholdMet 
        ? `🎉 Pledge successful! ${influencer.name}'s funding goal has been reached!`
        : `✅ Successfully pledged ${pledgeAmount} ${selectedCurrency} to ${influencer.name}!`;
      
      toast.success(successMessage, {
        description: result.thresholdMet ? "This influencer is now ready for approval!" : undefined,
        duration: 5000
      });
      
      // Reset form
      setPledgeAmount("");
      
      // Call success callback to refresh parent data
      onSuccess?.();
      
      // Keep modal open briefly to show success state, then close
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error("Pledge submission failed:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit pledge. Please try again.";
      setSubmitError(errorMessage);
      toast.error(`Pledge failed: ${errorMessage}`);
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
          disabled={isSubmitting}
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

          {/* Error Display */}
          {submitError && (
            <Alert className="mb-4 border-red-500/20 bg-red-500/5">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400 text-sm">
                {submitError}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {lastTxHash && !submitError && (
            <Alert className="mb-4 border-green-500/20 bg-green-500/5">
              <Check className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-400 text-sm">
                Pledge submitted successfully! 
                <button 
                  onClick={() => window.open(`https://etherscan.io/tx/${lastTxHash}`, '_blank')}
                  className="ml-2 underline hover:no-underline inline-flex items-center"
                >
                  View transaction <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </AlertDescription>
            </Alert>
          )}

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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                  placeholder={selectedCurrency === 'ETH' ? '0.1' : '100'}
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(e.target.value)}
                  className="text-lg bg-zinc-800 border-zinc-700 text-white"
                  step={selectedCurrency === 'ETH' ? '0.001' : '1'}
                  min="0"
                  disabled={isSubmitting}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Minimum: {selectedCurrency === 'ETH' ? '0.001 ETH' : '1 USDC'}
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting || !isConnected || !pledgeAmount}
                className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Pledge...
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
              <Alert className="border-yellow-500/20 bg-yellow-500/5">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertDescription className="text-yellow-600 text-xs">
                  <strong>Pre-Investment:</strong> Your funds will be held in escrow until the influencer's threshold is met and they approve the token launch. You can withdraw your pledge at any time before the token launches.
                </AlertDescription>
              </Alert>
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