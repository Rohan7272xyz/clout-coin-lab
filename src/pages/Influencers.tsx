// src/pages/Influencers.tsx - Updated with clearer classifications and terminology
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  ArrowLeft,
  Check,
  Clock,
  Users,
  TrendingUp,
  Bell,
  DollarSign,
  Share2,
  AlertCircle,
  Loader2,
  Zap,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PledgeModal from "@/components/pledge/pledgeModal";
import type { InfluencerPledgeData } from "@/lib/pledge/types";

const Influencers = () => {
  const navigate = useNavigate();
  const [titleAnimated, setTitleAnimated] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerPledgeData | null>(null);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  
  // Data state
  const [influencers, setInfluencers] = useState<InfluencerPledgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Trigger title animation on mount
    setTimeout(() => setTitleAnimated(true), 100);
    
    // Load influencers from API
    loadInfluencers();
  }, []);

  const loadInfluencers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('🔍 Fetching influencers from:', `${apiUrl}/api/pledge/influencers`);
      
      const response = await fetch(`${apiUrl}/api/pledge/influencers`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Influencers loaded:', data);
      
      setInfluencers(data);
    } catch (err) {
      console.error('❌ Error loading influencers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load influencers');
      
      // Fallback to example data for development
      console.log('🔄 Using fallback data...');
      setInfluencers([
        {
          address: "0x1234567890123456789012345678901234567890",
          name: "Rohini",
          handle: "@rohini", 
          tokenName: "Rohini Token",
          symbol: "ROHINI",
          totalPledgedETH: "2.45",
          totalPledgedUSDC: "0",
          thresholdETH: "5.0",
          thresholdUSDC: "0",
          pledgerCount: 89,
          thresholdMet: false,
          isApproved: true,
          isLaunched: true,
          createdAt: Date.now() - 86400000,
          launchedAt: Date.now() - 43200000,
          avatar: "https://mail.google.com/mail/u/0?ui=2&ik=84109c25fb&attid=0.1&permmsgid=msg-f:1839751187009719696&th=19881bf508d14d90&view=fimg&fur=ip&permmsgid=msg-f:1839751187009719696&sz=s0-l75-ft&attbid=ANGjdJ8YS49EUow6KO-Z9L9mpl149Y1qAUSPs3pBsWJ6oLpKPu2VLZJJ3_b80PLCHpGnMuAc-5pppHLR3RsOypN--bi1HvWgBbusbSB_td3WmhVuAJFKgDcoqrCsK0o&disp=emb&realattid=D5CCD335-277C-42D2-8E30-8B333DB3655B&zw",
          followers: "2.4M",
          category: "Cryptocurrency & Blockchain",
          description: "Leading crypto educator and market analyst specializing in emerging blockchain technologies.",
          verified: true
        },
        {
          address: "0x0987654321098765432109876543210987654321",
          name: "Alex Chen",
          handle: "@alexchen",
          tokenName: "Alex Chen Token", 
          symbol: "ALEX",
          totalPledgedETH: "1.82",
          totalPledgedUSDC: "0",
          thresholdETH: "3.0",
          thresholdUSDC: "0",
          pledgerCount: 67,
          thresholdMet: false,
          isApproved: false,
          isLaunched: false,
          createdAt: Date.now() - 172800000,
          avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=alexchen",
          followers: "1.8M",
          category: "Technology & Innovation",
          description: "Tech entrepreneur and AI researcher sharing insights on emerging technologies and innovation.",
          verified: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

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

  // Updated to get appropriate category badge styling
  const getCategoryBadgeStyle = (category: string): string => {
    const categoryStyles: Record<string, string> = {
      'Cryptocurrency & Blockchain': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
      'Technology & Innovation': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Fitness & Wellness': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Entertainment & Media': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Business & Finance': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Gaming & Esports': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'Fashion & Lifestyle': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      'Education & Learning': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    };
    
    return categoryStyles[category] || 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30';
  };

  // Updated progress labels
  const getProgressLabel = (influencer: InfluencerPledgeData): string => {
    if (influencer.isLaunched) return 'Market Performance';
    if (influencer.thresholdMet) return 'Interest Target Reached';
    return 'Interest Level';
  };

  const getProgressDescription = (influencer: InfluencerPledgeData): string => {
    if (influencer.isLaunched) return '85% up today';
    const overallProgress = Math.max(
      calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH),
      calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC)
    );
    return `${overallProgress.toFixed(1)}% of target reached`;
  };

  const handleInfluencerClick = (influencer: InfluencerPledgeData) => {
    if (influencer.isLaunched) {
      // Navigate to coin detail for live tokens - use name without spaces
      const coinId = influencer.name.toLowerCase().replace(/\s+/g, '');
      navigate(`/coin/${coinId}`);
    } else {
      // Show pledge modal for pre-launch
      setSelectedInfluencer(influencer);
      setShowPledgeModal(true);
    }
  };

  const handlePledgeSubmit = async (amount: string, currency: 'ETH' | 'USDC') => {
    console.log(`Pledged ${amount} ${currency} to ${selectedInfluencer?.name}`);
    
    // Here you would call your pledge API
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      // Add your pledge submission logic here
      
      // For now, just close modal and show success
      setShowPledgeModal(false);
      setSelectedInfluencer(null);
      
      // Refresh data
      await loadInfluencers();
    } catch (error) {
      console.error('Error submitting pledge:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'CoinFluence - Invest in People',
        text: 'Check out these hot influencers on CoinFluence!',
        url: window.location.href
      });
    } else {
      // Fallback for browsers that don't support navigator.share
      const url = window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
      }).catch(() => {
        alert('Share CoinFluence with your network!');
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading influencers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && influencers.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-400 mb-4">Unable to Load Influencers</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button 
              onClick={loadInfluencers}
              className="bg-primary text-black hover:bg-primary/90"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="min-h-screen flex flex-col">
        {/* Premium Header with Animation */}
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pre-invest')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="border-primary/30 text-primary hover:bg-primary/10 transition-all duration-300"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
            
            <div className="text-center mb-2">
              <h1 className="text-4xl md:text-5xl font-black mb-4">
                <span 
                  className={`inline-block transition-all duration-700 ${
                    titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '0ms' }}
                >
                  Influencer{' '}
                </span>
                <span 
                  className={`ml-2 inline-block bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent transition-all duration-700 ${
                    titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '200ms' }}
                >
                  Tokens
                </span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Invest in your favorite influencers. Trade live tokens or show interest in upcoming launches.
              </p>
            </div>
          </div>
        </section>

        {/* Premium Grid - Takes Most of Page */}
        <section className="flex-1 pb-8">
          <div className="container mx-auto px-4 h-full">
            <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
              {influencers.map((influencer, index) => {
                const ethProgress = calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH);
                const usdcProgress = calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC);
                const overallProgress = Math.max(ethProgress, usdcProgress);
                const isHot = influencer.thresholdMet || influencer.isLaunched;

                return (
                  <Card 
                    key={influencer.address} 
                    className={`relative bg-zinc-900 border-zinc-800 hover:border-primary/50 transition-all duration-500 group cursor-pointer overflow-hidden animate-slide-in-up ${
                      isHot ? 'ring-1 ring-primary/20' : ''
                    }`}
                    style={{
                      animationDelay: `${index * 100}ms`
                    }}
                    onClick={() => handleInfluencerClick(influencer)}
                  >
                    {/* Hot Badge */}
                    {isHot && (
                      <div className="absolute top-3 left-3 z-10">
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs animate-fade-in">
                          🔥 Hot
                        </Badge>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <Badge 
                        variant="outline" 
                        className={`text-xs px-2 py-1 ${
                          influencer.isLaunched 
                            ? 'border-primary/50 text-primary bg-primary/10' 
                            : influencer.isApproved
                            ? 'border-blue-500/50 text-blue-500 bg-blue-500/10'
                            : influencer.thresholdMet
                            ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
                            : 'border-gray-500/50 text-gray-500 bg-gray-500/10'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full mr-1 transition-transform duration-500 ${
                          influencer.isLaunched ? 'bg-primary scale-110 shadow-lg shadow-primary/30' : 
                          influencer.isApproved ? 'bg-blue-500 scale-100' :
                          influencer.thresholdMet ? 'bg-yellow-500 scale-100' :
                          'bg-gray-500 scale-100'
                        }`} />
                        {influencer.isLaunched ? 'Live' : 
                         influencer.isApproved ? 'Approved' :
                         influencer.thresholdMet ? 'Ready' : 'Accepting Interest'}
                      </Badge>
                    </div>

                    <CardHeader className="text-center pb-4 pt-8">
                      <div className="relative w-24 h-24 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <img
                          src={influencer.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.address}`}
                          alt={influencer.name}
                          className={`w-full h-full rounded-full object-cover border-2 transition-all duration-300 ${
                            isHot || influencer.isLaunched 
                              ? 'border-primary shadow-lg shadow-primary/25' 
                              : 'border-zinc-700 group-hover:border-primary/50'
                          }`}
                        />
                        {influencer.verified && (
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                            <Check className="w-3 h-3 text-black" />
                          </div>
                        )}
                        {/* Glow effect for hot influencers */}
                        {isHot && (
                          <div className="absolute inset-0 rounded-full bg-primary/20 animate-fade-in" />
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-1">{influencer.name}</h3>
                      <p className="text-gray-400 text-sm mb-3">{influencer.handle}</p>
                      
                      {influencer.followers && (
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-primary">{influencer.followers} Followers</span>
                        </div>
                      )}

                      {/* Updated Category Badge with Better Styling */}
                      {influencer.category && (
                        <Badge 
                          variant="outline" 
                          className={`border-0 text-xs px-3 py-1 ${getCategoryBadgeStyle(influencer.category)}`}
                        >
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
                      
                      {/* Updated Progress Section with Better Labels */}
                      <div className="space-y-3 mb-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-2 flex items-center justify-center gap-1">
                            <Target className="w-3 h-3" />
                            {getProgressLabel(influencer)}
                          </div>
                          <Progress value={influencer.isLaunched ? 85 : overallProgress} className="h-2 mb-1" />
                          <div className="text-xs font-medium text-primary">
                            {getProgressDescription(influencer)}
                          </div>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>
                              {influencer.isLaunched ? 'Trading' : `${formatPledgeAmount(influencer.totalPledgedETH)} ETH interested`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{influencer.pledgerCount} {influencer.isLaunched ? 'holders' : 'interested'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <Button 
                        className={`w-full transition-all duration-300 ${
                          influencer.isLaunched 
                            ? 'bg-primary hover:bg-primary/90 text-black font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105 trade-button' 
                            : influencer.thresholdMet
                            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/50 hover:border-yellow-500'
                            : influencer.isApproved
                            ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50 hover:border-blue-500'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-gray-300 border-zinc-700 pledge-button'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInfluencerClick(influencer);
                        }}
                        data-cf-tip={influencer.isLaunched ? 'Buy or sell this influencer token on the live market with real-time pricing.' : 'Show interest in this upcoming token before launch.'}
                        aria-label={influencer.isLaunched ? 'Trade Now' : 'Show Interest'}
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
                        ) : influencer.isApproved ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Approved - Show Interest
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            Show Interest
                          </>
                        )}
                      </Button>
                    </CardContent>

                    {/* Hover glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

      </main>
      
      <Footer />

      {/* Pledge Modal */}
      {showPledgeModal && selectedInfluencer && (
        <PledgeModal
          isOpen={showPledgeModal}
          onClose={() => {
            setShowPledgeModal(false);
            setSelectedInfluencer(null);
          }}
          influencer={selectedInfluencer}
          onPledgeSubmit={handlePledgeSubmit}
          onSuccess={loadInfluencers}
        />
      )}
    </div>
  );
};

export default Influencers;