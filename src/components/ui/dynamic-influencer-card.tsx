// src/components/ui/dynamic-influencer-card.tsx
// Enhanced influencer card that adapts based on token/pledge state

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Eye, 
  Check, 
  Clock, 
  Rocket, 
  DollarSign,
  BarChart3,
  ExternalLink,
  Target,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export type CardState = 
  | 'pledging'         // Accepting pledges, threshold not met
  | 'threshold_met'    // Threshold met, waiting for approval
  | 'approved'         // Approved, waiting for token creation
  | 'ready_for_launch' // Approved + threshold met, ready for launch
  | 'live'             // Token is live and trading
  | 'pending';         // Initial state

interface InfluencerCardProps {
  // Basic info
  id: string;
  name: string;
  handle: string;
  avatar: string;
  category: string;
  description: string;
  followers: string;
  verified: boolean;
  
  // State management
  cardState: CardState;
  isApproved: boolean;
  isLaunched: boolean;
  
  // Pre-investment data
  pledgeThresholdETH?: number;
  pledgeThresholdUSDC?: number;
  totalPledgedETH?: number;
  totalPledgedUSDC?: number;
  pledgeCount?: number;
  overallProgress?: number;
  
  // Live trading data (when launched)
  tokenSymbol?: string;
  currentPrice?: number;
  priceChange24h?: number;
  marketCap?: number;
  volume24h?: number;
  tokenAddress?: string;
  
  // Actions
  onPledge?: () => void;
  onTrade?: () => void;
  onViewDetails?: () => void;
}

const DynamicInfluencerCard = ({
  id,
  name,
  handle,
  avatar,
  category,
  description,
  followers,
  verified,
  cardState,
  isApproved,
  isLaunched,
  pledgeThresholdETH = 0,
  pledgeThresholdUSDC = 0,
  totalPledgedETH = 0,
  totalPledgedUSDC = 0,
  pledgeCount = 0,
  overallProgress = 0,
  tokenSymbol,
  currentPrice,
  priceChange24h,
  marketCap,
  volume24h,
  tokenAddress,
  onPledge,
  onTrade,
  onViewDetails
}: InfluencerCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  // Card state configuration
  const getStateConfig = () => {
    switch (cardState) {
      case 'live':
        return {
          status: 'Live Trading',
          statusColor: 'bg-green-500',
          actionText: 'Trade Now',
          actionIcon: BarChart3,
          showChart: true,
          showProgress: false,
          canInteract: true
        };
      case 'ready_for_launch':
        return {
          status: 'Ready to Launch',
          statusColor: 'bg-blue-500',
          actionText: 'Launching Soon',
          actionIcon: Rocket,
          showChart: false,
          showProgress: true,
          canInteract: false
        };
      case 'approved':
        return {
          status: 'Approved',
          statusColor: 'bg-purple-500',
          actionText: 'Show Interest',
          actionIcon: Target,
          showChart: false,
          showProgress: true,
          canInteract: true
        };
      case 'threshold_met':
        return {
          status: 'Target Reached',
          statusColor: 'bg-yellow-500',
          actionText: 'Awaiting Approval',
          actionIcon: Clock,
          showChart: false,
          showProgress: true,
          canInteract: false
        };
      case 'pledging':
        return {
          status: 'Accepting Interest',
          statusColor: 'bg-orange-500',
          actionText: 'Show Interest',
          actionIcon: Zap,
          showChart: false,
          showProgress: true,
          canInteract: true
        };
      default:
        return {
          status: 'Coming Soon',
          statusColor: 'bg-gray-500',
          actionText: 'Coming Soon',
          actionIcon: Clock,
          showChart: false,
          showProgress: false,
          canInteract: false
        };
    }
  };

  const config = getStateConfig();
  const isPricePositive = (priceChange24h || 0) >= 0;

  // Format numbers
  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const formatPrice = (price: number) => {
    if (price < 0.01) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(2)}`;
  };

  // Handle click actions
  const handleAction = () => {
    if (!config.canInteract) return;
    
    if (cardState === 'live') {
      if (onTrade) {
        onTrade();
      } else {
        // Navigate to coin detail page
        navigate(`/coin/${name.toLowerCase().replace(/\s+/g, '')}`);
      }
    } else {
      if (onPledge) {
        onPledge();
      } else {
        // Navigate to pre-investment page
        navigate(`/pre-invest?influencer=${id}`);
      }
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails();
    } else if (cardState === 'live') {
      navigate(`/coin/${name.toLowerCase().replace(/\s+/g, '')}`);
    } else {
      navigate(`/influencer/${id}`);
    }
  };

  return (
    <Card 
      className={`bg-zinc-900 border-zinc-800 hover:border-primary/50 transition-all duration-300 p-6 group cursor-pointer ${
        isHovered ? 'shadow-lg shadow-primary/20' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleViewDetails}
    >
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        <div className="relative">
          <img 
            src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} 
            alt={name}
            className="w-16 h-16 rounded-full object-cover border-2 border-zinc-700 group-hover:border-primary transition-colors"
          />
          {verified && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-black" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white truncate">{name}</h3>
            <Badge className={`${config.statusColor} text-white text-xs`}>
              {config.status}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-400 truncate">{handle}</p>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{followers} followers</span>
            </div>
            {category && (
              <span className="truncate">{category}</span>
            )}
          </div>
        </div>
      </div>

      {/* Content Area - Changes based on state */}
      <div className="mb-4">
        {config.showChart && cardState === 'live' ? (
          // Live Trading Chart
          <div className="space-y-3">
            {/* Price Display */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">
                  {currentPrice ? formatPrice(currentPrice) : '$0.00'}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <span className="text-gray-400">{tokenSymbol || 'TOKEN'}</span>
                  {priceChange24h !== undefined && (
                    <span className={`flex items-center gap-1 ${isPricePositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPricePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {isPricePositive ? '+' : ''}{priceChange24h.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right text-sm">
                {marketCap && (
                  <div className="text-gray-400">
                    MCap: {formatNumber(marketCap)}
                  </div>
                )}
                {volume24h && (
                  <div className="text-gray-400">
                    Vol: {formatNumber(volume24h)}
                  </div>
                )}
              </div>
            </div>

            {/* Mini Chart Placeholder */}
            <div className="h-16 bg-zinc-800 rounded-lg relative overflow-hidden">
              <div className="absolute inset-0 flex items-end justify-between px-2 pb-2">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 bg-gradient-to-t rounded-sm ${
                      isPricePositive 
                        ? 'from-green-500/60 to-green-400' 
                        : 'from-red-500/60 to-red-400'
                    }`}
                    style={{ height: `${Math.random() * 80 + 20}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : config.showProgress ? (
          // Pre-Investment Progress
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Interest Progress</span>
              <span className="text-white font-medium">{overallProgress.toFixed(1)}%</span>
            </div>
            
            <Progress 
              value={Math.min(overallProgress, 100)} 
              className="h-2 bg-zinc-800"
            />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Pledged</div>
                <div className="text-white font-medium">
                  {totalPledgedETH > 0 && `${totalPledgedETH.toFixed(2)} ETH`}
                  {totalPledgedETH > 0 && totalPledgedUSDC > 0 && ' + '}
                  {totalPledgedUSDC > 0 && `$${totalPledgedUSDC.toFixed(0)}`}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Supporters</div>
                <div className="text-white font-medium flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {pledgeCount}
                </div>
              </div>
            </div>

            {/* Target Display */}
            <div className="text-xs text-gray-500">
              Target: {pledgeThresholdETH > 0 && `${pledgeThresholdETH} ETH`}
              {pledgeThresholdETH > 0 && pledgeThresholdUSDC > 0 && ' or '}
              {pledgeThresholdUSDC > 0 && `$${pledgeThresholdUSDC}`}
            </div>
          </div>
        ) : (
          // Default Content
          <div className="h-20 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <config.actionIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">More details coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <Button 
        className={`w-full font-semibold transition-all ${
          config.canInteract
            ? 'bg-primary hover:bg-primary/90 text-black hover:shadow-lg hover:shadow-primary/20' 
            : 'bg-gray-600 text-gray-300 cursor-not-allowed'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          handleAction();
        }}
        disabled={!config.canInteract}
      >
        <config.actionIcon className="w-4 h-4 mr-2" />
        {config.actionText}
      </Button>

      {/* Additional Info for Live Tokens */}
      {cardState === 'live' && tokenAddress && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Contract Verified</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://sepolia.basescan.org/address/${tokenAddress}`, '_blank');
              }}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              BaseScan <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default DynamicInfluencerCard;