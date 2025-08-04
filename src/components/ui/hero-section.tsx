import { Button } from "@/components/ui/button";
import { TrendingUp, Zap } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background chart lines */}
      <div className="absolute inset-0 chart-lines"></div>
      
      {/* Floating elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-primary rounded-full animate-pulse"></div>
      <div className="absolute top-40 right-20 w-3 h-3 bg-primary/60 rounded-full animate-pulse delay-300"></div>
      <div className="absolute bottom-40 left-20 w-1 h-1 bg-primary rounded-full animate-pulse delay-700"></div>
      
      <div className="relative bottom-5 container mx-auto px-4 text-center relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            Invest in People.
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-light mb-8 max-w-2xl mx-auto">
            Back trending influencers with meme coins. Trade clout. Profit publicly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Browse Trending Coins
            </Button>
            
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <Button
                  variant="wallet"
                  size="lg"
                  className="px-8 py-4 h-auto font-semibold"
                  onClick={openConnectModal}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Connect Wallet
                </Button>
              )}
            </ConnectButton.Custom>
          </div>
          
          <div className="mt-12 flex justify-center items-center space-x-8 text-sm text-gray-muted">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              <span>$2.4M+ Invested</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              <span>150+ Influencers</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
              <span>5,000+ Investors</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;