// src/pages/PreInvest.tsx - Updated with real data from database
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
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
  Loader2
} from "lucide-react";
import { dataService } from '@/lib/API/dataService';

interface InfluencerData {
  id: number;
  name: string;
  handle: string;
  followers: string;
  category: string;
  description: string;
  verified: boolean;
  isLaunched: boolean;
  totalPledged: number;
  pledgerCount: number;
  avatar?: string;
}

interface PreInvestStats {
  totalUsers: number;
  totalInfluencers: number;
  pledgingInfluencers: number;
  liveTokens: number;
  totalVolume: number;
}

const PreInvest = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const featuredInfluencersRef = useRef<HTMLElement>(null);
  
  // Real data state
  const [stats, setStats] = useState<PreInvestStats | null>(null);
  const [influencers, setInfluencers] = useState<InfluencerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-scroll to featured influencers when wallet connects
  useEffect(() => {
    if (featuredInfluencersRef.current) {
      setTimeout(() => {
        const header = document.querySelector('header');
        const headerHeight = header ? header.offsetHeight : 80;
        
        const elementTop = featuredInfluencersRef.current!.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementTop - headerHeight - 32,
          behavior: "smooth"
        });
      }, 200);
    }
  }, [isConnected]);

  // Load real data
  useEffect(() => {
    loadPreInvestData();
  }, []);

  const loadPreInvestData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading pre-invest data from database...');
      
      // Load platform stats and influencers in parallel
      const [platformStats, influencersData] = await Promise.all([
        dataService.getPlatformStats(),
        dataService.getPledgeInfluencers()
      ]);

      setStats({
        totalUsers: platformStats.totalUsers,
        totalInfluencers: platformStats.totalInfluencers,
        pledgingInfluencers: platformStats.pledgingInfluencers,
        liveTokens: platformStats.liveTokens,
        totalVolume: platformStats.totalVolume
      });

      // Transform influencer data for display
      const transformedInfluencers = (influencersData as InfluencerData[])
        .slice(0, 3) // Show top 3
        .map((inf: any, index: number) => ({
          id: inf.id || index + 1,
          name: inf.name,
          handle: inf.handle || `@${inf.name.toLowerCase()}`,
          followers: inf.followers || '0',
          category: inf.category || 'Unknown',
          description: inf.description || 'Upcoming influencer',
          verified: inf.verified || false,
          isLaunched: inf.isLaunched || false,
          totalPledged: parseFloat(inf.totalPledgedETH || '0'),
          pledgerCount: inf.pledgerCount || 0,
          avatar: inf.avatar
        }));

      setInfluencers(transformedInfluencers);
      
      console.log('✅ Pre-invest data loaded:', { 
        stats: platformStats, 
        influencers: transformedInfluencers.length 
      });

    } catch (err) {
      console.error('❌ Error loading pre-invest data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      
      // Fallback data to keep UI functional
      setStats({
        totalUsers: 0,
        totalInfluencers: 0,
        pledgingInfluencers: 0,
        liveTokens: 0,
        totalVolume: 0
      });
      
      setInfluencers([
        {
          id: 1,
          name: "Coming Soon",
          handle: "@comingsoon",
          followers: "TBD",
          category: "Crypto",
          description: "Exciting influencers launching soon",
          verified: true,
          isLaunched: false,
          totalPledged: 0,
          pledgerCount: 0
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEarlyAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribed(true);
    // TODO: Add API call here to save email to waitlist
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 chart-lines"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
              <Clock className="w-4 h-4 mr-2" />
              {loading ? 'Loading...' : 'Pre-Launch Access'}
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Get Ready to Invest
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-light mb-8 max-w-3xl mx-auto">
              Be among the first to invest in your favorite influencers. 
              {stats && !loading && (
                <span className="text-primary font-semibold">
                  {" "}Join {formatNumber(stats.totalUsers)} users already on the platform.
                </span>
              )}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ account, chain, openConnectModal, mounted }) => {
                    const ready = mounted;
                    const connected = ready && !!account && !!chain;
                    
                    return (
                      <Button
                        size="lg"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold"
                        onClick={openConnectModal}
                        disabled={connected}
                      >
                        <Zap className="w-5 h-5 mr-2" />
                        {connected ? "Wallet Connected" : "Connect Wallet & Join Platform"}
                      </Button>
                    );
                  }}
                </ConnectButton.Custom>
              ) : (
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold"
                  onClick={() => navigate('/influencers')}
                >
                  <Check className="w-5 h-5 mr-2" />
                  Explore Influencers
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
            
            {/* Real-time stats */}
            {loading ? (
              <div className="flex justify-center items-center space-x-2 text-gray-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading platform data...</span>
              </div>
            ) : stats ? (
              <div className="flex justify-center items-center space-x-8 text-sm text-gray-muted">
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2 text-primary" />
                  <span>{formatNumber(stats.totalUsers)} users</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                  <span>{formatNumber(stats.totalInfluencers)} influencers</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-primary" />
                  <span>{formatCurrency(stats.totalVolume)} volume</span>
                </div>
              </div>
            ) : (
              <div className="text-red-400 text-sm">
                Unable to load platform stats
              </div>
            )}
          </div>
        </section>

        {/* Featured Influencers Preview */}
        <section ref={featuredInfluencersRef} className="py-16 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-4">Featured Influencers</h2>
              <p className="text-xl text-gray-light max-w-2xl mx-auto">
                {loading ? 'Loading influencers...' : 
                 stats ? `Discover ${formatNumber(stats.totalInfluencers)} influencers (${formatNumber(stats.liveTokens)} live, ${formatNumber(stats.pledgingInfluencers)} accepting pledges)` :
                 'Discover amazing influencers to invest in'}
              </p>
            </div>
            
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
                  {influencers.map((influencer) => (
                    <Card key={influencer.id} className="relative bg-card/80 border-border hover:border-primary/50 transition-all duration-300 group">
                      <CardHeader className="text-center">
                        <div className="relative w-20 h-20 mx-auto mb-4">
                          {influencer.avatar ? (
                            <img
                              src={influencer.avatar}
                              alt={influencer.name}
                              className="w-full h-full rounded-full object-cover border-2 border-zinc-700"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${influencer.name}`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full rounded-full flex items-center justify-center bg-zinc-800 border-2 border-zinc-700">
                              <span className="text-2xl">
                                {influencer.name === "Coming Soon" ? "?" : 
                                 influencer.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          {influencer.verified && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <CardTitle className="text-xl">{influencer.name}</CardTitle>
                        <CardDescription className="text-gray-light">
                          {influencer.handle} • {influencer.followers} followers
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="text-center mb-4">
                          <Badge variant="secondary" className="mb-2">
                            {influencer.category}
                          </Badge>
                          <p className="text-sm text-gray-muted">{influencer.description}</p>
                        </div>
                        
                        <div className="flex justify-between items-center mb-4 p-3 bg-background/50 rounded-lg">
                          <div>
                            <div className="text-sm text-gray-muted">
                              {influencer.isLaunched ? "Current Price" : "Pledged"}
                            </div>
                            <div className="font-semibold">
                              {influencer.isLaunched ? "$0.0018" : `${influencer.totalPledged.toFixed(2)} ETH`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-muted">
                              {influencer.isLaunched ? "24h Change" : "Pledgers"}
                            </div>
                            <div className="font-semibold text-primary">
                              {influencer.isLaunched ? "+12.4%" : influencer.pledgerCount}
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          className={`w-full ${
                            influencer.isLaunched 
                              ? "bg-primary hover:bg-primary/90 text-black" 
                              : "bg-muted hover:bg-muted/80 text-muted-foreground cursor-not-allowed"
                          }`}
                          disabled={!influencer.isLaunched}
                          onClick={() => influencer.isLaunched && navigate(`/coin/${influencer.name.toLowerCase()}`)}
                        >
                          {influencer.isLaunched ? (
                            <>
                              <TrendingUp className="w-4 h-4 mr-2" />
                              Trade Now
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              {influencer.totalPledged > 0 ? "Collecting Pledges" : "Coming Soon"}
                            </>
                          )}
                        </Button>
                      </CardContent>
                      
                      {!influencer.isLaunched && (
                        <div className="absolute top-4 right-4">
                          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                            {influencer.totalPledged > 0 ? "Pledging" : "Soon"}
                          </Badge>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
                
                {/* Show All Button */}
                <div className="text-center">
                  <Button 
                    size="lg"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow text-lg px-8 py-3 font-semibold"
                    onClick={() => navigate('/influencers')}
                  >
                    <Users className="w-5 h-5 mr-2" />
                    View All {stats ? formatNumber(stats.totalInfluencers) : ''} Influencers
                  </Button>
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
                <p className="text-gray-light">
                  Browse {stats ? formatNumber(stats.totalInfluencers) : 'verified'} influencers across different categories
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Invest ETH</h3>
                <p className="text-gray-light">
                  Use ETH to buy their personalized token or pledge to upcoming launches
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Watch & Profit</h3>
                <p className="text-gray-light">
                  Track {stats ? formatNumber(stats.liveTokens) : ''} live tokens and profit as influence grows
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div className="container mx-auto px-4 mb-8">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-center max-w-md mx-auto">
              <p className="text-sm">⚠️ Some data may be outdated: {error}</p>
              <button 
                onClick={loadPreInvestData}
                className="text-xs underline hover:no-underline ml-2"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PreInvest;