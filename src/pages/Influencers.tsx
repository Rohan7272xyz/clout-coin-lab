import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  X,
  Zap,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Simple PledgeModal component - inline to avoid import issues
const PledgeModal = ({ isOpen, onClose, influencer, onPledgeSubmit }) => {
  const [pledgeAmount, setPledgeAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState('ETH');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!pledgeAmount || parseFloat(pledgeAmount) <= 0) {
      alert("Please enter a valid pledge amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      onPledgeSubmit?.(pledgeAmount, selectedCurrency);
      alert(`Successfully pledged ${pledgeAmount} ${selectedCurrency} to ${influencer.name}!`);
      onClose();
    } catch (error) {
      console.error("Pledge error:", error);
      alert("Failed to submit pledge. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1 rounded-full hover:bg-zinc-800 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        <div className="text-center pb-4 pt-8 px-6">
          <div className="relative w-20 h-20 mx-auto mb-4">
            {influencer.avatar !== "?" ? (
              <img
                src={influencer.avatar}
                alt={influencer.name}
                className="w-full h-full rounded-full object-cover border-2 border-primary shadow-lg shadow-primary/25"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                <span className="text-4xl text-zinc-500">?</span>
              </div>
            )}
            {influencer.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-3 h-3 text-black" />
              </div>
            )}
          </div>
          
          <h2 className="text-xl text-white mb-1 font-bold">{influencer.name}</h2>
          <p className="text-gray-400 text-sm mb-3">{influencer.handle}</p>
          
          {influencer.followers && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{influencer.followers} Followers</span>
            </div>
          )}

          {influencer.category && (
            <Badge variant="outline" className="border-zinc-700 text-zinc-300 bg-zinc-800/50">
              {influencer.category}
            </Badge>
          )}
        </div>
        
        <div className="pt-0 pb-6 px-6">
          <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
            {influencer.description}
          </p>
          
          {/* Simple Progress Display */}
          <div className="space-y-3 mb-6">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Pre-Investment Progress</div>
              <Progress value={65} className="h-2 mb-1" />
              <div className="text-xs font-medium text-primary">65% of goal reached</div>
            </div>

            <div className="flex items-center justify-center text-xs text-gray-500">
              <Users className="w-3 h-3 mr-1" />
              <span>{influencer.pledgeCount} investors pledged {influencer.pledgedAmount}</span>
            </div>
          </div>

          {/* Pledge Form */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={selectedCurrency === 'ETH' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedCurrency('ETH')}
              >
                ETH
              </Button>
              <Button
                variant={selectedCurrency === 'USDC' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setSelectedCurrency('USDC')}
              >
                USDC
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-white">
                Pledge Amount ({selectedCurrency})
              </label>
              <Input
                type="number"
                placeholder="0.1"
                value={pledgeAmount}
                onChange={(e) => setPledgeAmount(e.target.value)}
                className="text-lg bg-zinc-800 border-zinc-700 text-white"
                step="0.001"
                min="0"
              />
            </div>

            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !pledgeAmount}
              className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Pledging...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Pledge {selectedCurrency}
                </>
              )}
            </Button>

            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-yellow-600">
                <strong>Pre-Investment:</strong> Your funds will be held in escrow until the influencer's threshold is met and they approve the token launch.
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// All influencers shown, but only Rohini is functional
const preInvestmentInfluencers = [
  {
    id: 2,
    name: "Rohini",
    handle: "@rohini",
    followers: "2.4M",
    category: "Crypto",
    avatar: "https://mail.google.com/mail/u/0?ui=2&ik=84109c25fb&attid=0.1&permmsgid=msg-f:1839751187009719696&th=19881bf508d14d90&view=fimg&fur=ip&permmsgid=msg-f:1839751187009719696&sz=s0-l75-ft&attbid=ANGjdJ8YS49EUow6KO-Z9L9mpl149Y1qAUSPs3pBsWJ6oLpKPu2VLZJJ3_b80PLCHpGnMuAc-5pppHLR3RsOypN--bi1HvWgBbusbSB_td3WmhVuAJFKgDcoqrCsK0o&disp=emb&realattid=D5CCD335-277C-42D2-8E30-8B333DB3655B&zw",
    description: "Leading crypto educator and market analyst",
    verified: true,
    isLive: true,
    pledgedAmount: "$24,750",
    pledgeCount: 89,
    totalTraded: "$145,000",
    isHot: true,
    isFunctional: true
  },
  {
    id: 1,
    name: "TBD",
    handle: "@tbd2",
    followers: "1.8M",
    category: "Technology",
    avatar: "?", // Question mark placeholder
    description: "Upcoming tech influencer with cutting-edge insights",
    verified: true,
    isLive: false,
    pledgedAmount: "$18,920",
    pledgeCount: 67,
    isHot: true,
    isFunctional: false
  },
  {
    id: 3,
    name: "TBD",
    handle: "@tbd3",
    followers: "3.1M",
    category: "Fitness",
    avatar: "?", // Question mark placeholder
    description: "Upcoming fitness influencer revolutionizing wellness",
    verified: true,
    isLive: false,
    pledgedAmount: "$31,250",
    pledgeCount: 124,
    isHot: true,
    isFunctional: false
  },
  {
    id: 4,
    name: "TBD",
    handle: "@tbd4",
    followers: "4.2M",
    category: "Gaming",
    avatar: "?", // Question mark placeholder
    description: "Upcoming gaming influencer shaping the future of esports",
    verified: true,
    isLive: false,
    pledgedAmount: "$42,180",
    pledgeCount: 156,
    isHot: true,
    isFunctional: false
  },
  {
    id: 5,
    name: "TBD",
    handle: "@tbd5",
    followers: "2.8M",
    category: "Food & Travel",
    avatar: "?", // Question mark placeholder
    description: "Upcoming food & travel influencer exploring global cuisine",
    verified: true,
    isLive: false,
    pledgedAmount: "$28,500",
    pledgeCount: 93,
    isHot: false,
    isFunctional: false
  },
  {
    id: 6,
    name: "TBD",
    handle: "@tbd6",
    followers: "1.9M",
    category: "Business",
    avatar: "?", // Question mark placeholder
    description: "Upcoming business influencer disrupting traditional markets",
    verified: true,
    isLive: false,
    pledgedAmount: "$19,750",
    pledgeCount: 71,
    isHot: false,
    isFunctional: false
  }
];

const Influencers = () => {
  const navigate = useNavigate();
  const [titleAnimated, setTitleAnimated] = useState(false);
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [showPledgeModal, setShowPledgeModal] = useState(false);

  useEffect(() => {
    // Trigger title animation on mount
    setTimeout(() => setTitleAnimated(true), 100);
  }, []);

  const handleInfluencerClick = (influencerId, isLive, isFunctional) => {
    if (influencerId === 2 && isFunctional) {
      // Only Rohini (ID 2) is functional - navigate to coin detail
      navigate(`/coin/${influencerId}`);
    } else {
      // For TBD influencers, show pledge modal instead of alert
      const influencer = preInvestmentInfluencers.find(inf => inf.id === influencerId);
      if (influencer) {
        setSelectedInfluencer(influencer);
        setShowPledgeModal(true);
      }
    }
  };

  const handlePledgeSubmit = (amount, currency) => {
    console.log(`Pledged ${amount} ${currency} to ${selectedInfluencer?.name}`);
    // Here you would typically call your pledge API
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
                  className={`ml-2 inline-block bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent transition-all duration-700 ${
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
                  onClick={() => handleInfluencerClick(influencer.id, influencer.isLive, influencer.isFunctional)}
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
                        influencer.isFunctional && influencer.isLive 
                          ? 'border-primary/50 text-primary bg-primary/10' 
                          : 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full mr-1 transition-transform duration-500 ${
                        influencer.isFunctional && influencer.isLive ? 'bg-primary scale-110 shadow-lg shadow-primary/30' : 'bg-yellow-500 scale-100'
                      }`} />
                      {influencer.isFunctional && influencer.isLive ? 'Live' : 'Soon'}
                    </Badge>
                  </div>

                  <CardHeader className="text-center pb-4 pt-8">
                    <div className="relative w-24 h-24 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      {influencer.isFunctional ? (
                        <img
                          src={influencer.avatar}
                          alt={influencer.name}
                          className={`w-full h-full rounded-full object-cover border-2 transition-all duration-300 ${
                            influencer.isHot || influencer.isLive 
                              ? 'border-primary shadow-lg shadow-primary/25' 
                              : 'border-zinc-700 group-hover:border-primary/50'
                          }`}
                        />
                      ) : (
                        <div className="w-full h-full rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
                          <span className="text-4xl text-zinc-500">?</span>
                        </div>
                      )}
                      {influencer.verified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                          <Check className="w-3 h-3 text-black" />
                        </div>
                      )}
                      {/* Glow effect for hot influencers */}
                      {influencer.isHot && influencer.isFunctional && (
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
                        influencer.isFunctional && influencer.isLive 
                          ? 'bg-primary hover:bg-primary/90 text-black font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105' 
                          : 'bg-zinc-800 hover:bg-zinc-700 text-gray-300 border-zinc-700'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInfluencerClick(influencer.id, influencer.isLive, influencer.isFunctional);
                      }}
                    >
                      {influencer.isFunctional && influencer.isLive ? (
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
        />
      )}
    </div>
  );
};

export default Influencers;