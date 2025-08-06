import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Share2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Enhanced data with social proof and momentum indicators
const preInvestmentInfluencers = [
  {
    id: 1,
    name: "CryptoKing",
    handle: "@cryptoking",
    followers: "2.4M",
    category: "Crypto",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    description: "Leading crypto educator and market analyst",
    verified: true,
    isLive: true,
    pledgedAmount: "$24,750",
    pledgeCount: 89,
    totalTraded: "$145,000",
    isHot: true
  },
  {
    id: 2,
    name: "TechGuru",
    handle: "@techguru",
    followers: "1.8M",
    category: "Technology",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    description: "Silicon Valley insider and startup advisor",
    verified: true,
    isLive: false,
    pledgedAmount: "$18,920",
    pledgeCount: 67,
    isHot: true
  },
  {
    id: 3,
    name: "FitnessQueen",
    handle: "@fitnessqueen",
    followers: "3.1M",
    category: "Fitness",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    description: "Wellness coach and lifestyle influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$31,250",
    pledgeCount: 124,
    isHot: true
  },
  {
    id: 4,
    name: "GameMaster",
    handle: "@gamemaster",
    followers: "4.2M",
    category: "Gaming",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
    description: "Professional gamer and competitive esports",
    verified: true,
    isLive: false,
    pledgedAmount: "$42,180",
    pledgeCount: 156,
    isHot: true
  },
  {
    id: 5,
    name: "FoodieExplorer",
    handle: "@foodieexplorer",
    followers: "2.8M",
    category: "Food & Travel",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    description: "Culinary adventurer and food critic",
    verified: true,
    isLive: false,
    pledgedAmount: "$28,500",
    pledgeCount: 93,
    isHot: false
  },
  {
    id: 6,
    name: "BusinessMogul",
    handle: "@businessmogul",
    followers: "1.9M",
    category: "Business",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    description: "Serial entrepreneur and business strategist",
    verified: true,
    isLive: false,
    pledgedAmount: "$19,750",
    pledgeCount: 71,
    isHot: false
  },
  {
    id: 7,
    name: "ArtVisioneer",
    handle: "@artvisioneer",
    followers: "1.5M",
    category: "Art & Design",
    avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face",
    description: "Digital artist and creative director",
    verified: true,
    isLive: false,
    pledgedAmount: "$15,400",
    pledgeCount: 52,
    isHot: false
  },
  {
    id: 8,
    name: "MusicMaestro",
    handle: "@musicmaestro",
    followers: "3.6M",
    category: "Music",
    avatar: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face",
    description: "Producer and artist creating viral content",
    verified: true,
    isLive: false,
    pledgedAmount: "$36,200",
    pledgeCount: 142,
    isHot: true
  },
  {
    id: 9,
    name: "EcoWarrior",
    handle: "@ecowarrior",
    followers: "2.2M",
    category: "Environment",
    avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face",
    description: "Environmental activist and sustainability advocate",
    verified: true,
    isLive: false,
    pledgedAmount: "$22,300",
    pledgeCount: 78,
    isHot: false
  },
  {
    id: 10,
    name: "LifeHacker",
    handle: "@lifehacker",
    followers: "2.0M",
    category: "Lifestyle",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    description: "Productivity expert and life optimization coach",
    verified: true,
    isLive: false,
    pledgedAmount: "$20,100",
    pledgeCount: 65,
    isHot: false
  }
];

const Influencers = () => {
  const navigate = useNavigate();
  const [titleAnimated, setTitleAnimated] = useState(false);

  useEffect(() => {
    // Trigger title animation on mount
    setTimeout(() => setTitleAnimated(true), 100);
  }, []);

  const handleInfluencerClick = (influencerId: number, isLive: boolean) => {
    if (isLive && influencerId === 1) {
      navigate(`/coin/${influencerId}`);
    } else {
      // Mock pre-investment action
      alert(`🚀 You're interested in ${preInvestmentInfluencers.find(i => i.id === influencerId)?.name}! We'll notify you when they go live.`);
    }
  };

  const handleShare = () => {
    navigator.share?.({
      title: 'CoinFluence - Invest in People',
      text: 'Check out these hot influencers on CoinFluence!',
      url: window.location.href
    }) || alert('Share CoinFluence with your network!');
  };

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
                  Pre-Investment{' '}
                </span>
                <span 
                  className={`inline-block bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent transition-all duration-700 ${
                    titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '200ms' }}
                >
                  Influencers
                </span>
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Get early access to invest in these rising influencers. Be among the first when their tokens go live.
              </p>
            </div>
          </div>
        </section>

        {/* Premium Grid - Takes Most of Page */}
        <section className="flex-1 pb-8">
          <div className="container mx-auto px-4 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {preInvestmentInfluencers.map((influencer, index) => (
                <Card 
                  key={influencer.id} 
                  className={`relative bg-zinc-900 border-zinc-800 hover:border-primary/50 transition-all duration-500 group cursor-pointer overflow-hidden animate-slide-in-up ${
                    influencer.isHot ? 'ring-1 ring-primary/20' : ''
                  }`}
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                  onClick={() => handleInfluencerClick(influencer.id, influencer.isLive)}
                >
                  {/* Hot Badge */}
                  {influencer.isHot && (
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
                        influencer.isLive 
                          ? 'border-primary/50 text-primary bg-primary/10' 
                          : 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mr-1 transition-transform duration-500 ${
                        influencer.isLive ? 'bg-primary scale-110 shadow-lg shadow-primary/30' : 'bg-yellow-500 scale-100'
                      }`} />
                      {influencer.isLive ? 'Live' : 'Soon'}
                    </Badge>
                  </div>

                  <CardHeader className="text-center pb-4 pt-8">
                    <div className="relative w-24 h-24 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <img
                        src={influencer.avatar}
                        alt={influencer.name}
                        className={`w-full h-full rounded-full object-cover border-2 transition-all duration-300 ${
                          influencer.isHot || influencer.isLive 
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
                      {influencer.isHot && (
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-fade-in" />
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-white mb-1">{influencer.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{influencer.handle}</p>
                    
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">{influencer.followers} Followers</span>
                    </div>

                    <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
                      {influencer.category}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="pt-0 pb-6">
                    <p className="text-sm text-gray-400 text-center mb-4 line-clamp-2 leading-relaxed">
                      {influencer.description}
                    </p>
                    
                    {/* Social Proof */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-2">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        <span>{influencer.pledgedAmount} pledged</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{influencer.pledgeCount} investors</span>
                      </div>
                    </div>

                    {influencer.isLive && influencer.totalTraded && (
                      <div className="text-center text-xs text-primary mb-4 font-semibold">
                        {influencer.totalTraded} traded today
                      </div>
                    )}
                    
                    <Button 
                      className={`w-full transition-all duration-300 ${
                        influencer.isLive 
                          ? 'bg-primary hover:bg-primary/90 text-black font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105' 
                          : 'bg-zinc-800 hover:bg-primary/20 text-gray-300 hover:text-primary border-zinc-700 hover:border-primary/50'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInfluencerClick(influencer.id, influencer.isLive);
                      }}
                    >
                      {influencer.isLive ? (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Start Trading
                        </>
                      ) : (
                        <>
                          <Bell className="w-4 h-4 mr-2" />
                          Pre-Invest
                        </>
                      )}
                    </Button>
                  </CardContent>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Premium CTA Strip */}
        <section className="py-8 border-t border-zinc-800">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-xl font-bold mb-4 text-white">
              Be among the first investors in tomorrow's most influential people.
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg"
                className="bg-primary text-black hover:bg-primary/90 font-semibold px-8 py-3 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                onClick={() => navigate('/trending')}
              >
                Explore Trending Coins
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-primary/30 text-primary hover:bg-primary/10 px-8 py-3 transition-all duration-300"
                onClick={handleShare}
              >
                Share CoinFluence
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Influencers;