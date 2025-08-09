// src/components/ui/hero-section.tsx - Updated with real database data
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, DollarSign, Zap, ArrowRight, Loader2 } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { dataService } from '@/lib/api/dataService';

interface HeroStats {
  totalUsers: number;
  totalInfluencers: number;
  totalVolume: number;
  activePledgers: number;
  liveTokens: number;
}

const HeroSection = () => {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  
  // Real data state
  const [heroStats, setHeroStats] = useState<HeroStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load real stats from database
  useEffect(() => {
    loadHeroStats();
  }, []);

  const loadHeroStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Loading hero stats from database...');
      
      const stats = await dataService.getPlatformStats();
      
      setHeroStats({
        totalUsers: stats.totalUsers,
        totalInfluencers: stats.totalInfluencers,
        totalVolume: stats.totalVolume,
        activePledgers: stats.totalPledgers,
        liveTokens: stats.liveTokens
      });
      
      console.log('✅ Hero stats loaded:', stats);
      
    } catch (err) {
      console.error('❌ Error loading hero stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
      
      // Fallback to show the UI even if stats fail
      setHeroStats({
        totalUsers: 0,
        totalInfluencers: 0,
        totalVolume: 0,
        activePledgers: 0,
        liveTokens: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
    return `$${amount.toFixed(0)}`;
  };

  const handleExploreClick = () => {
    if (isConnected) {
      navigate('/influencers');
    } else {
      navigate('/pre-invest');
    }
  };

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5"></div>
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Status Badge */}
          <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 transition-colors">
            <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></div>
            {isLoading ? 'Loading...' : 'Live Platform'}
          </Badge>
          
          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight">
            Invest in{" "}
            <span className="bg-gradient-to-r from-primary via-green-400 to-primary bg-clip-text text-transparent">
              People
            </span>
            , Not Just Tokens
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-400 mb-8 leading-relaxed">
            Buy tokens of your favorite influencers and profit as their influence grows. 
            The first platform where social capital becomes financial capital.
          </p>
          
          {/* Real-time Stats */}
          {isLoading ? (
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading platform stats...</span>
              </div>
            </div>
          ) : heroStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
              <div className="bg-card/50 rounded-lg p-4 border border-primary/10">
                <div className="flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-white">{formatNumber(heroStats.totalUsers)}</div>
                <div className="text-xs text-gray-400">Users</div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-4 border border-primary/10">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-white">{formatNumber(heroStats.totalInfluencers)}</div>
                <div className="text-xs text-gray-400">Influencers</div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-4 border border-primary/10">
                <div className="flex items-center justify-center mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-white">{formatCurrency(heroStats.totalVolume)}</div>
                <div className="text-xs text-gray-400">Volume</div>
              </div>
              
              <div className="bg-card/50 rounded-lg p-4 border border-primary/10">
                <div className="flex items-center justify-center mb-2">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div className="text-2xl font-bold text-white">{formatNumber(heroStats.liveTokens)}</div>
                <div className="text-xs text-gray-400">Live Tokens</div>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="mb-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm max-w-md mx-auto">
                Unable to load live stats: {error}
              </div>
            </div>
          )}
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {isConnected ? (
              <Button
                size="lg"
                onClick={handleExploreClick}
                className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold group"
              >
                <TrendingUp className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Explore Influencers
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : (
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, mounted }) => {
                  const ready = mounted;
                  const connected = ready && !!account && !!chain;
                  
                  return (
                    <Button
                      size="lg"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold group"
                      onClick={connected ? handleExploreClick : openConnectModal}
                    >
                      <Zap className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      {connected ? "Explore Influencers" : "Connect & Start Investing"}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  );
                }}
              </ConnectButton.Custom>
            )}
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/pre-invest')}
              className="border-primary/30 text-primary hover:bg-primary/10 text-lg px-8 py-4 h-auto font-semibold"
            >
              Learn More
            </Button>
          </div>
          
          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
            <div className="bg-card/30 p-6 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Choose Your Influencer</h3>
              <p className="text-gray-400 text-sm">
                Browse {heroStats ? formatNumber(heroStats.totalInfluencers) : '...'} verified influencers across different categories
              </p>
            </div>
            
            <div className="bg-card/30 p-6 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Invest with ETH</h3>
              <p className="text-gray-400 text-sm">
                Join {heroStats ? formatNumber(heroStats.activePledgers) : '...'} investors using ETH to buy influencer tokens
              </p>
            </div>
            
            <div className="bg-card/30 p-6 rounded-xl border border-primary/10 hover:border-primary/30 transition-colors">
              <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-white">Watch Value Grow</h3>
              <p className="text-gray-400 text-sm">
                Trade {heroStats ? formatNumber(heroStats.liveTokens) : '...'} live tokens or pledge to upcoming launches
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;