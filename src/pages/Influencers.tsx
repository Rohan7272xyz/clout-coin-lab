// FILE: src/pages/Influencers.tsx
// ONLY animation changes - keeping all original data and styling

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

// UPDATED data - First influencer is Rohini, rest are TBD
const preInvestmentInfluencers = [
  {
    id: 1,
    name: "Rohini",
    handle: "@rohini",
    followers: "2.4M",
    category: "Crypto",
    avatar: "💩", // poop emoji as avatar
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
    name: "TBD",
    handle: "@tbd2",
    followers: "1.8M",
    category: "Technology",
    avatar: "?",
    description: "Upcoming tech influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$18,920",
    pledgeCount: 67,
    isHot: true
  },
  {
    id: 3,
    name: "TBD",
    handle: "@tbd3",
    followers: "3.1M",
    category: "Fitness",
    avatar: "?",
    description: "Upcoming fitness influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$31,250",
    pledgeCount: 124,
    isHot: true
  },
  {
    id: 4,
    name: "TBD",
    handle: "@tbd4",
    followers: "4.2M",
    category: "Gaming",
    avatar: "?",
    description: "Upcoming gaming influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$42,180",
    pledgeCount: 156,
    isHot: true
  },
  {
    id: 5,
    name: "TBD",
    handle: "@tbd5",
    followers: "2.8M",
    category: "Food & Travel",
    avatar: "?",
    description: "Upcoming food & travel influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$28,500",
    pledgeCount: 93,
    isHot: false
  },
  {
    id: 6,
    name: "TBD",
    handle: "@tbd6",
    followers: "1.9M",
    category: "Business",
    avatar: "?",
    description: "Upcoming business influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$19,750",
    pledgeCount: 71,
    isHot: false
  },
  {
    id: 7,
    name: "TBD",
    handle: "@tbd7",
    followers: "1.5M",
    category: "Art & Design",
    avatar: "?",
    description: "Upcoming art & design influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$15,400",
    pledgeCount: 52,
    isHot: false
  },
  {
    id: 8,
    name: "TBD",
    handle: "@tbd8",
    followers: "3.6M",
    category: "Music",
    avatar: "?",
    description: "Upcoming music influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$36,200",
    pledgeCount: 142,
    isHot: true
  },
  {
    id: 9,
    name: "TBD",
    handle: "@tbd9",
    followers: "2.2M",
    category: "Environment",
    avatar: "?",
    description: "Upcoming environment influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$22,300",
    pledgeCount: 78,
    isHot: false
  },
  {
    id: 10,
    name: "TBD",
    handle: "@tbd10",
    followers: "2.0M",
    category: "Lifestyle",
    avatar: "?",
    description: "Upcoming lifestyle influencer",
    verified: true,
    isLive: false,
    pledgedAmount: "$20,100",
    pledgeCount: 65,
    isHot: false
  }
];

const Influencers = () => {
  const navigate = useNavigate();
  // ONLY animation state changes
  const [isLoaded, setIsLoaded] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    // Professional staged animation sequence - ONLY CHANGE
    const animationSequence = async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
      setIsLoaded(true);
      await new Promise(resolve => setTimeout(resolve, 400));
      setCardsVisible(true);
    };
    animationSequence();
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
        {/* Premium Header with ONLY animation changes */}
        <section className={`py-8 transition-all duration-700 ease-out ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}>
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
                    isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '0ms' }}
                >
                  Pre-Investment{' '}
                </span>
                <span 
                  className={`ml-2 inline-block bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent transition-all duration-700 ${
                    isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: '200ms' }}
                >
                  Influencers
                </span>
              </h1>
              <p className={`text-gray-400 text-lg max-w-2xl mx-auto transition-all duration-700 ease-out ${
                isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '400ms' }}
              >
                Get early access to invest in these rising influencers. Be among the first when their tokens go live.
              </p>
            </div>
          </div>
        </section>

        {/* Premium Grid - ONLY animation changes */}
        <section className="flex-1 pb-8">
          <div className="container mx-auto px-4 h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {preInvestmentInfluencers.map((influencer, index) => (
                <Card 
                  key={influencer.id} 
                  className={`relative bg-zinc-900 border-zinc-800 hover:border-primary/50 transition-all duration-500 group cursor-pointer overflow-hidden ${
                    influencer.isHot ? 'ring-1 ring-primary/20' : ''
                  } ${
                    cardsVisible 
                      ? 'opacity-100 translate-y-0 scale-100' 
                      : 'opacity-0 translate-y-12 scale-95'
                  }`}
                  style={{
                    transitionDelay: `${index * 80 + 600}ms`,
                    transitionDuration: '600ms',
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                  onClick={() => handleInfluencerClick(influencer.id, influencer.isLive)}
                >
                  {/* Hot Badge - keeping original styling */}
                  {influencer.isHot && (
                    <div className="absolute top-3 left-3 z-10">
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        🔥 Hot
                      </Badge>
                    </div>
                  )}

                  {/* Status Badge - keeping original styling */}
                  <div className="absolute top-3 right-3 z-10">
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-1 ${
                        influencer.isLive 
                          ? 'border-primary/50 text-primary bg-primary/10' 
                          : 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mr-1 ${
                        influencer.isLive ? 'bg-primary' : 'bg-yellow-500'
                      }`} />
                      {influencer.isLive ? 'Live' : 'Soon'}
                    </Badge>
                  </div>

                  <CardHeader className="text-center pb-4 pt-8">
                    {/* Updated avatar rendering for Rohini vs TBD */}
                    <div className="relative w-24 h-24 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      {influencer.id === 1 ? (
                        // Rohini gets a poop emoji in a circle
                        <div className={`w-full h-full rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-zinc-800 ${
                          influencer.isHot || influencer.isLive 
                            ? 'border-primary shadow-lg shadow-primary/25' 
                            : 'border-zinc-700 group-hover:border-primary/50'
                        }`}>
                          <span className="text-4xl">💩</span>
                        </div>
                      ) : (
                        // All others get question mark
                        <div className={`w-full h-full rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-zinc-800 ${
                          influencer.isHot || influencer.isLive 
                            ? 'border-primary shadow-lg shadow-primary/25' 
                            : 'border-zinc-700 group-hover:border-primary/50'
                        }`}>
                          <span className="text-4xl text-gray-400">?</span>
                        </div>
                      )}
                      {influencer.verified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                      {/* Glow effect for hot influencers */}
                      {influencer.isHot && (
                        <div className="absolute inset-0 rounded-full bg-primary/20" />
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

        {/* Premium CTA Strip - keeping original */}
        <section className={`py-8 border-t border-zinc-800 transition-all duration-700 ease-out ${
          cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ transitionDelay: '1200ms' }}
        >
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