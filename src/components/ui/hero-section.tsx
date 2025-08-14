// src/components/ui/hero-section.tsx - Back to original with Pre-Invest Now button
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Star,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();
  const [titleAnimated, setTitleAnimated] = useState(false);

  useEffect(() => {
    // Trigger title animation on mount
    setTimeout(() => setTitleAnimated(true), 100);
  }, []);

  const handlePreInvestClick = () => {
    navigate('/pre-invest');
  };

  return (
    <section className="relative min-h-screen flex items-start justify-center overflow-hidden pt-40">
      {/* Animated grid background */}
      <div className="absolute inset-0 chart-lines opacity-20"></div>
      
      {/* Floating elements for visual appeal */}
      <div className="absolute top-20 left-10 w-4 h-4 bg-primary/30 rounded-full animate-pulse"></div>
      <div className="absolute top-32 right-20 w-2 h-2 bg-green-400/40 rounded-full animate-bounce"></div>
      <div className="absolute bottom-40 left-20 w-3 h-3 bg-primary/20 rounded-full animate-ping"></div>
      <div className="absolute bottom-60 right-10 w-5 h-5 bg-green-400/30 rounded-full animate-pulse"></div>

      <div className="container mx-auto px-4 text-center relative z-10">
        {/* Pre-launch badge */}
        <div className={`transition-all duration-700 ${titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Badge className="mb-6 bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 text-sm px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Beta Launch - Live on Base Sepolia
          </Badge>
        </div>
        
        {/* Main heading with staggered animation - Single Line */}
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-3 leading-tight">
          <span 
            className={`transition-all duration-700 ${
              titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            Invest in{' '}
            <span className="bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
              People
            </span>
          </span>
        </h1>
        
        {/* Subtitle */}
        <p 
          className={`mb-4 text-xl md:text-2xl lg:text-3xl text-gray-light mb-3 max-w-4xl mx-auto leading-relaxed transition-all duration-700 ${
            titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          Back trending influencers with crypto coins, trade clout, and profit publicly on the world's first influencer token platform.
        </p>

        {/* CTA Section - MOVED UP for better prominence */}
        <div 
          className={`transition-all duration-700 mb-4 ${
            titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '600ms' }}
        >
          <Button
            size="lg"
            onClick={handlePreInvestClick}
            className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-xl px-12 py-6 h-auto font-bold mb-4 group"
          >
            <Star className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
            Pre-Invest Now
            <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
          
          <div className="text-sm text-primary/80 hover:text-primary cursor-pointer">
            Early access to exclusive opportunities
          </div>
        </div>
        
        {/* Supporting text - moved below button */}
        <p 
          className={`text-lg md:text-xl text-gray-muted mb-4 max-w-2xl mx-auto transition-all duration-700 ${
            titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '800ms' }}
        >
          Join the future of social investing where influence becomes investable.
        </p>

        {/* Stats section */}
        <div 
          className={`flex flex-col sm:flex-row justify-center items-center gap-8 mb-4 transition-all duration-700 ${
            titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1000ms' }}
        >
          <div className="flex items-center gap-2 text-gray-light">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">2+ Influencers</span>
          </div>
          <div className="hidden sm:block w-1 h-1 bg-gray-muted rounded-full"></div>
          <div className="flex items-center gap-2 text-gray-light">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span className="font-semibold">Live Trading</span>
          </div>
          <div className="hidden sm:block w-1 h-1 bg-gray-muted rounded-full"></div>
          <div className="flex items-center gap-2 text-gray-light">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-semibold">ETH/USDC Support</span>
          </div>
        </div>

        {/* Additional context */}
        <div 
          className={`text-center transition-all duration-700 ${
            titleAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '1200ms' }}
        >
          <p className="text-gray-muted text-sm">
            Ready to revolutionize how you invest in creators and influencers?
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;