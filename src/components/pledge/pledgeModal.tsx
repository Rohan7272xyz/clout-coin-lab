// src/components/pledge/PledgeModal.tsx - Updated with improved terminology
import React, { useState } from 'react';
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
  Target,
  Heart
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { InfluencerPledgeData, getCategoryMetadata, getProgressStatus, PROGRESS_STATUS_METADATA } from '@/lib/pledge/types';

interface PledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  influencer: InfluencerPledgeData;
  onPledgeSubmit: (amount: string, currency: 'ETH' | 'USDC') => Promise<void>;
  onSuccess?: () => void;
}

const PledgeModal: React.FC<PledgeModalProps> = ({ 
  isOpen, 
  onClose, 
  influencer, 
  onPledgeSubmit,
  onSuccess 
}) => {
  const { isConnected, address } = useAccount();
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<'ETH' | 'USDC'>('ETH');
  const [isPledging, setIsPledging] = useState(false);

  if (!isOpen) return null;

  const calculateProgress = (current: string, threshold: string): number => {
    const currentNum = parseFloat(current);
    const thresholdNum = parseFloat(threshold);
    
    if (thresholdNum === 0) return 0;
    return Math.min((currentNum / thresholdNum) * 100, 100);
  };

  const formatPledgeAmount = (amount: string, decimals = 4): string => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    return num.toFixed(decimals);
  };

  const ethProgress = calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH);
  const usdcProgress = calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC);
  const overallProgress = Math.max(ethProgress, usdcProgress);
  
  const progressStatus = getProgressStatus(influencer);
  const statusMeta = PROGRESS_STATUS_METADATA[progressStatus];
  const categoryMeta = getCategoryMetadata(influencer.category);

  const handleSubmit = async () => {
    if (!pledgeAmount || !address) {
      toast.error('Please enter an amount and connect your wallet');
      return;
    }

    const amount = parseFloat(pledgeAmount);
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setIsPledging(true);
    try {
      await onPledgeSubmit(pledgeAmount, selectedCurrency);
      toast.success(`Successfully showed interest with ${pledgeAmount} ${selectedCurrency}!`);
      setPledgeAmount('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Interest submission error:', error);
      toast.error('Failed to submit interest');
    } finally {
      setIsPledging(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md bg-zinc-900 border-zinc-800 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="text-center pb-4">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-zinc-800 transition-colors z-10"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>

          <div className="relative w-20 h-20 mx-auto mb-4">
            <img
              src={influencer.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.address}`}
              alt={influencer.name}
              className="w-full h-full rounded-full object-cover border-2 border-primary shadow-lg"
            />
            {influencer.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
          
          <CardTitle className="text-xl">{influencer.name}</CardTitle>
          <CardDescription>
            {influencer.handle} • {influencer.followers} followers
          </CardDescription>
          
          {/* Category Badge with Better Styling */}
          {categoryMeta && (
            <div className="flex justify-center mt-2">
              <Badge variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300">
                {categoryMeta.icon} {categoryMeta.label}
              </Badge>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-4">
          {influencer.description && (
            <p className="text-sm text-gray-400 text-center">
              {influencer.description}
            </p>
          )}
          
          {/* Progress Section with Updated Labels */}
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1">
                <Target className="w-3 h-3" />
                Interest Level
              </div>
              <Progress value={overallProgress} className="h-2 mb-1" />
              <div className="text-xs font-medium text-primary">
                {overallProgress.toFixed(1)}% of target reached
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge className={`bg-${statusMeta.color}-500/20 text-${statusMeta.color}-400 border-${statusMeta.color}-500/30`}>
                {statusMeta.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {parseFloat(influencer.thresholdETH) > 0 && (
                <div className="text-center">
                  <div className="text-gray-400">ETH Target</div>
                  <div className="font-medium">
                    {formatPledgeAmount(influencer.totalPledgedETH)} / {formatPledgeAmount(influencer.thresholdETH)}
                  </div>
                </div>
              )}
              {parseFloat(influencer.thresholdUSDC) > 0 && (
                <div className="text-center">
                  <div className="text-gray-400">USDC Target</div>
                  <div className="font-medium">
                    ${formatPledgeAmount(influencer.totalPledgedUSDC, 0)} / ${formatPledgeAmount(influencer.thresholdUSDC, 0)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-center text-xs text-gray-500">
              <Users className="w-3 h-3 mr-1" />
              <span>{influencer.pledgerCount} people interested</span>
            </div>
          </div>

          {/* Interest Submission Form */}
          {!influencer.isLaunched && isConnected && (
            <div className="space-y-4">
              {/* Currency Selection */}
              <div className="flex gap-2">
                {parseFloat(influencer.thresholdETH) > 0 && (
                  <Button
                    variant={selectedCurrency === 'ETH' ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedCurrency('ETH')}
                  >
                    ETH
                  </Button>
                )}
                {parseFloat(influencer.thresholdUSDC) > 0 && (
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
                  Show Interest Amount ({selectedCurrency})
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
                <p className="text-xs text-gray-500 mt-1">
                  This shows your investment interest, not a binding commitment
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit}
                disabled={isPledging || !pledgeAmount}
                className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
              >
                {isPledging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Show Interest with {selectedCurrency}
                  </>
                )}
              </Button>

              {/* Updated Warning */}
              <Alert className="border-blue-500/20 bg-blue-500/5">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-600 text-xs">
                  <strong>Interest Expression:</strong> Show your investment interest to help this influencer reach their target. Funds held securely until token approval and launch.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Connection Required */}
          {!isConnected && (
            <div className="text-center p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <Wallet className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-yellow-400 font-medium">Connect Wallet Required</div>
              <div className="text-xs text-gray-400 mt-1">
                Connect your wallet to show investment interest
              </div>
            </div>
          )}

          {/* Already Launched */}
          {influencer.isLaunched && (
            <div className="text-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-green-400 font-medium">Token Launched!</div>
              <div className="text-xs text-gray-400 mt-1">
                This token is now live and available for trading
              </div>
            </div>
          )}

          {/* Status */}
          <div className={`text-center text-xs text-${statusMeta.color}-400`}>
            {statusMeta.description}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PledgeModal;