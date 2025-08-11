// src/pages/PreInvest.tsx - UPDATED: Use unified API endpoint
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Bell, 
  Star, 
  Zap,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Target
} from "lucide-react";
import PledgeModal from "@/components/pledge/pledgeModal";
import type { InfluencerPledgeData } from "@/lib/pledge/types";

const PreInvest = () => {
  const navigate = useNavigate();
  const influencerTokensRef = useRef<HTMLElement>(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerPledgeData | null>(null);
  const [showPledgeModal, setShowPledgeModal] = useState(false);
  
  // Data state
  const [influencers, setInfluencers] = useState<InfluencerPledgeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInfluencers();
  }, []);

  // Auto-scroll to influencer tokens after page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      if (influencerTokensRef.current) {
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 80;
        
        const elementTop = influencerTokensRef.current.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementTop - headerHeight - 32, // 32px extra spacing
          behavior: "smooth"
        });
      }
    }, 1500); // Wait 1.5 seconds after page load to auto-scroll

    return () => clearTimeout(timer);
  }, []);

  // FIXED: Use unified API endpoint instead of pledge-specific endpoint
  const loadInfluencers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      // UPDATED: Use unified influencer endpoint instead of pledge endpoint
      console.log('🔍 Fetching influencers from unified API:', `${apiUrl}/api/influencer`);
      
      const response = await fetch(`${apiUrl}/api/influencer`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Unified API response:', data);
      
      // UPDATED: Handle unified API response format
      if (data.success && data.data) {
        // Transform unified API data to match PreInvest expectations
        const transformedInfluencers = data.data.map((influencer: any) => ({
          address: influencer.wallet_address || influencer.address || `temp_${influencer.id}`,
          name: influencer.name,
          handle: influencer.handle || `@${influencer.name.toLowerCase().replace(/\s+/g, '')}`,
          tokenName: influencer.token_name || influencer.tokenName || `${influencer.name} Token`,
          symbol: influencer.token_symbol || influencer.symbol || influencer.name.substring(0, 5).toUpperCase().replace(/\s/g, ''),
          totalPledgedETH: String(influencer.total_pledged_eth || influencer.totalPledgedETH || 0),
          totalPledgedUSDC: String(influencer.total_pledged_usdc || influencer.totalPledgedUSDC || 0),
          thresholdETH: String(influencer.pledge_threshold_eth || influencer.thresholdETH || 0),
          thresholdUSDC: String(influencer.pledge_threshold_usdc || influencer.thresholdUSDC || 0),
          pledgerCount: influencer.pledge_count || influencer.pledgerCount || 0,
          thresholdMet: influencer.threshold_met || influencer.thresholdMet || false,
          isApproved: influencer.is_approved || influencer.isApproved || false,
          isLaunched: influencer.is_launched || influencer.isLaunched || influencer.status === 'live' || !!influencer.launched_at,
          tokenAddress: influencer.token_address || influencer.tokenAddress || null,
          createdAt: influencer.created_at ? new Date(influencer.created_at).getTime() : Date.now(),
          launchedAt: influencer.launched_at ? new Date(influencer.launched_at).getTime() : null,
          
          // UI data
          avatar: influencer.avatar_url || influencer.avatar || null,
          followers: influencer.followers ? String(influencer.followers) : 
                     influencer.followers_count ? formatFollowers(influencer.followers_count) : null,
          category: influencer.category || 'General',
          description: influencer.description || `${influencer.name} is an amazing content creator!`,
          verified: influencer.verified || false,
          
          // Trading data (for live tokens)
          currentPrice: influencer.current_price || influencer.currentPrice || null,
          marketCap: influencer.market_cap || influencer.marketCap || null,
          volume24h: influencer.volume_24h || influencer.volume24h || null,
          priceChange24h: influencer.price_change_24h || influencer.priceChange24h || null
        }));
        
        console.log('✅ Transformed influencers for PreInvest:', transformedInfluencers);
        setInfluencers(transformedInfluencers);
      } else {
        console.log('⚠️ No data in unified API response:', data);
        setInfluencers([]);
      }
      
    } catch (err) {
      console.error('❌ Error loading influencers from unified API:', err);
      setError(err instanceof Error ? err.message : 'Failed to load influencers');
      setInfluencers([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format followers
  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 chart-lines"></div>
          <div className="container mx-auto px-4 text-center relative z-10 min-h-[calc(100vh-80px)] flex flex-col justify-start pt-32">
            <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 text-xs px-3 py-1 inline-flex items-center w-fit mx-auto">
              <Clock className="w-3 h-3 mr-1" />
              Pre-Launch Access
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-black mb-4">
              <span className="text-white">Get Ready to </span>
              <span className="bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">Invest</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-light mb-6 max-w-3xl mx-auto">
              Be among the first to invest in your favorite influencers. Join our waitlist for exclusive early access to the platform.
            </p>
            
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-muted">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary" />
                <span>{influencers.length} influencers available</span>
              </div>
              <div className="flex items-center">
                <Bell className="w-4 h-4 mr-2 text-primary" />
                <span>Early access notifications</span>
              </div>
            </div>
          </div>
        </section>

        {/* Influencer Tokens Section */}
        <section ref={influencerTokensRef} className="py-16 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4">
                <span className="inline-block">Influencer{' '}</span>
                <span className="bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                  Tokens
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Invest in your favorite influencers. Trade live tokens or show interest in upcoming launches.
              </p>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-400">Loading influencer tokens...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-red-400 mb-4">Error: {error}</p>
                  <Button onClick={loadInfluencers} className="bg-primary hover:bg-primary/90 text-black">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : (
              <>

                {/* Responsive horizontal cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-10 justify-items-center">
                  {influencers.length > 0 ? influencers.map((influencer, index) => {
                    const ethProgress = calculateProgress(influencer.totalPledgedETH, influencer.thresholdETH);
                    const usdcProgress = calculateProgress(influencer.totalPledgedUSDC, influencer.thresholdUSDC);
                    const overallProgress = Math.max(ethProgress, usdcProgress);
                    const isHot = influencer.thresholdMet || influencer.isLaunched;

                    return (
                      <Card 
                        key={influencer.address || `influencer-${index}`} 
                        className={`relative bg-zinc-900 border-zinc-800 hover:border-primary/50 transition-all duration-500 group cursor-pointer overflow-hidden animate-slide-in-up w-full max-w-sm ${
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
                             influencer.thresholdMet ? 'Ready' : 'New Card'}
                          </Badge>
                        </div>

                        <CardHeader className="text-center pb-4 pt-8">
                          <div className="relative w-24 h-24 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <img
                              src={influencer.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.name}`}
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

                          {/* Category Badge */}
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
                          
                          {/* Progress Section */}
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
                                ? 'bg-primary hover:bg-primary/90 text-black font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105' 
                                : influencer.thresholdMet
                                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border-yellow-500/50 hover:border-yellow-500'
                                : influencer.isApproved
                                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/50 hover:border-blue-500'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-gray-300 border-zinc-700'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInfluencerClick(influencer);
                            }}
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
                  }) : (
                    <div className="col-span-full text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                      <p className="text-gray-400 mb-2">No influencer cards found</p>
                      <p className="text-sm text-gray-500">Cards created in admin dashboard will appear here</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-xl text-gray-light max-w-2xl mx-auto">
                Simple steps to start investing in your favorite influencers
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Choose Influencer</h3>
                <p className="text-gray-light">Browse and select influencers you believe in</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Invest ETH</h3>
                <p className="text-gray-light">Use ETH to buy their personalized meme coin</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Watch & Profit</h3>
                <p className="text-gray-light">Profit as their influence and coin value grows</p>
              </div>
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

export default PreInvest;