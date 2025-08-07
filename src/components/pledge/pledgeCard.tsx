// src/components/pledge/PledgeCard.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Check, 
  Users, 
  TrendingUp, 
  Bell, 
  DollarSign,
  Clock,
  Zap
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { InfluencerPledgeData } from "@/lib/pledge/types";
import { formatPledgeAmount, calculateProgress, getStatusText, getStatusColor } from "@/lib/pledge/api";

interface PledgeCardProps {
  influencer: InfluencerPledgeData;
  showPledgeButton?: boolean;
  onPledgeClick?: (influencer: InfluencerPledgeData) => void;
}

const PledgeCard = ({ influencer, showPledgeButton = true, onPledgeClick }: PledgeCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  // Calculate progress
  const ethProgress = calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH);
  const usdcProgress = calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC);
  const overallProgress = Math.max(ethProgress, usdcProgress);

  // Determine which threshold to show (prioritize the one that's set)
  const showETH = parseFloat(influencer.thresholdETH) > 0;
  const showUSDC = parseFloat(influencer.thresholdUSDC) > 0;

  const handleCardClick = () => {
    if (influencer.isLaunched) {
      // Navigate to trading page for launched tokens
      navigate(`/coin/${influencer.address}`);
    } else {
      // Navigate to pledge page for pre-launch
      navigate(`/pledge/${influencer.address}`);
    }
  };

  const handlePledgeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPledgeClick?.(influencer);
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
    <Card 
      className={`relative bg-zinc-900 border-zinc-800 transition-all duration-300 cursor-pointer group ${
        isHovered ? 'border-primary/50 shadow-lg shadow-primary/10' : ''
      } ${influencer.thresholdMet ? 'ring-1 ring-primary/20' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        {getStatusBadge()}
      </div>

      {/* Hot Badge for threshold met */}
      {influencer.thresholdMet && !influencer.isLaunched && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs animate-pulse">
            🔥 Ready
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4 pt-8">
        <div className="relative w-20 h-20 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
          <img
            src={influencer.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.address}`}
            alt={influencer.name}
            className={`w-full h-full rounded-full object-cover border-2 transition-all duration-300 ${
              influencer.thresholdMet || influencer.isLaunched 
                ? 'border-primary shadow-lg shadow-primary/25' 
                : 'border-zinc-700 group-hover:border-primary/50'
            }`}
          />
          {influencer.verified && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
              <Check className="w-3 h-3 text-black" />
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-white mb-1">{influencer.name}</h3>
        <p className="text-gray-400 text-sm mb-3">{influencer.tokenName} ({influencer.symbol})</p>
        
        {influencer.followers && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{influencer.followers} followers</span>
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
          <p className="text-sm text-gray-400 text-center mb-4 line-clamp-2 leading-relaxed">
            {influencer.description}
          </p>
        )}
        
        {/* Progress Section */}
        <div className="space-y-3 mb-4">
          {/* Overall Progress */}
          <div className="text-center">
            <div className="text-xs text-gray-400 mb-1">Overall Progress</div>
            <Progress value={overallProgress} className="h-2 mb-1" />
            <div className="text-xs font-medium text-primary">
              {overallProgress.toFixed(1)}% Complete
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="flex justify-between text-xs text-gray-500">
            {showETH && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>{formatPledgeAmount(influencer.totalPledgedETH)} / {formatPledgeAmount(influencer.thresholdETH)} ETH</span>
              </div>
            )}
            {showUSDC && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>${formatPledgeAmount(influencer.totalPledgedUSDC, 'USDC')} / ${formatPledgeAmount(influencer.thresholdUSDC, 'USDC')} USDC</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center text-xs text-gray-500">
            <Users className="w-3 h-3 mr-1" />
            <span>{influencer.pledgerCount} pledger{influencer.pledgerCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        
        {/* Action Button */}
        {showPledgeButton && (
          <Button 
            className={`w-full transition-all duration-300 ${
              influencer.isLaunched 
                ? 'bg-primary hover:bg-primary/90 text-black font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105' 
                : influencer.thresholdMet
                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/50 hover:border-yellow-500'
                : 'bg-zinc-800 hover:bg-primary/20 text-gray-300 hover:text-primary border-zinc-700 hover:border-primary/50'
            }`}
            onClick={handlePledgeClick}
          >
            {influencer.isLaunched ? (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Trade Now
              </>
            ) : influencer.thresholdMet ? (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Ready to Launch
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                Pledge ETH
              </>
            )}
          </Button>
        )}

        {/* Status Text */}
        <div className={`text-center text-xs mt-2 font-medium ${getStatusColor(influencer)}`}>
          {getStatusText(influencer)}
        </div>
      </CardContent>

      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-lg" />
    </Card>
  );
};

export default PledgeCard;