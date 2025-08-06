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
  Clock
} from "lucide-react";

// Mock data for featured influencers
const featuredInfluencers = [
  {
    id: 1,
    name: "CryptoKing",
    handle: "@cryptoking",
    followers: "2.4M",
    category: "Crypto",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Leading crypto educator and market analyst",
    verified: true,
    comingSoon: true
  },
  {
    id: 2,
    name: "TechGuru",
    handle: "@techguru",
    followers: "1.8M",
    category: "Technology",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Silicon Valley insider and startup advisor",
    verified: true,
    comingSoon: true
  },
  {
    id: 3,
    name: "FitnessQueen",
    handle: "@fitnessqueen",
    followers: "3.1M",
    category: "Fitness",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Wellness coach and lifestyle influencer",
    verified: true,
    comingSoon: true
  }
];

const PreInvest = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const featuredInfluencersRef = useRef<HTMLElement>(null);

// Auto-scroll to featured influencers when wallet connects
useEffect(() => {
  if (isConnected && featuredInfluencersRef.current) {
    setTimeout(() => {
      featuredInfluencersRef.current?.scrollIntoView({ 
        behavior: "smooth",
        block: "center"
      });
    }, 200); // Small delay to let the UI update
  }
}, [isConnected]);

  const handleEarlyAccess = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle early access signup
    setIsSubscribed(true);
    // You can add API call here to save email
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 chart-lines"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
              <Clock className="w-4 h-4 mr-2" />
              Pre-Launch Access
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Get Ready to Invest
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-light mb-8 max-w-3xl mx-auto">
              Be among the first to invest in your favorite influencers. Join our waitlist for exclusive early access to the platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ openConnectModal }) => (
                    <Button
                      size="lg"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold"
                      onClick={openConnectModal}
                    >
                      <Zap className="w-5 h-5 mr-2" />
                      Connect Wallet & Join Waitlist
                    </Button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold"
                  disabled
                >
                  <Check className="w-5 h-5 mr-2" />
                  Wallet Connected
                </Button>
              )}
            </div>
            
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-muted">
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2 text-primary" />
                <span>1,247 people waiting</span>
              </div>
              <div className="flex items-center">
                <Bell className="w-4 h-4 mr-2 text-primary" />
                <span>Early access notifications</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Influencers Preview */}
        <section ref={featuredInfluencersRef} className="py-16 bg-card/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-4">Featured Influencers</h2>
              <p className="text-xl text-gray-light max-w-2xl mx-auto">
                Get a preview of the influencers you'll be able to invest in once we launch
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
              {featuredInfluencers.map((influencer) => (
                <Card key={influencer.id} className="relative bg-card/80 border-border hover:border-primary/50 transition-all duration-300 group">
                  <CardHeader className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <img
                        src={influencer.avatar}
                        alt={influencer.name}
                        className="w-full h-full rounded-full object-cover"
                      />
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
                        <div className="text-sm text-gray-muted">Current Price</div>
                        <div className="font-semibold">{influencer.price}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-muted">24h Change</div>
                        <div className="font-semibold text-primary">{influencer.change}</div>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-muted hover:bg-muted/80 text-muted-foreground cursor-not-allowed"
                      disabled
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Coming Soon
                    </Button>
                  </CardContent>
                  
                  {influencer.comingSoon && (
                    <div className="absolute top-4 right-4">
                      <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                        Soon
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
                Show All Influencers
              </Button>
            </div>
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

        {/* Early Access CTA */}
        <section className="py-20 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-4">Join the Waitlist</h2>
            <p className="text-xl text-gray-light mb-8 max-w-2xl mx-auto">
              Get notified when we launch and receive exclusive early access to invest in top influencers
            </p>
            
            {!isSubscribed ? (
              <form onSubmit={handleEarlyAccess} className="max-w-md mx-auto">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" className="bg-primary hover:bg-primary/90 px-6">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-primary mb-2">
                  <Check className="w-5 h-5" />
                  <span className="font-semibold">You're on the list!</span>
                </div>
                <p className="text-sm text-gray-light">
                  We'll notify you when early access is available
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PreInvest;