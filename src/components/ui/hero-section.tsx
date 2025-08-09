// src/components/ui/hero-section.tsx - Updated to use both wallet and auth states
import { Button } from "@/components/ui/button";
import { TrendingUp, Zap } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";
import { useAuth } from "@/lib/auth/auth-context";

const HeroSection = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const { firebaseUser } = useAuth();

  const handlePreInvestClick = () => {
    navigate('/pre-invest');
  };

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
            Back trending influencers with crypto coins. Trade clout. Profit publicly.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-primary text-primary-foreground hover:bg-primary/90 neon-glow-strong text-lg px-8 py-4 h-auto font-semibold"
              onClick={handlePreInvestClick}
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              Pre-Invest Now!
            </Button>
            
            <ConnectButton.Custom>
              {({ 
                account, 
                chain, 
                openAccountModal, 
                openChainModal, 
                openConnectModal, 
                authenticationStatus, 
                mounted 
              }) => {
                // Make sure the component is mounted and ready
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button
                            variant="wallet"
                            size="lg"
                            className="px-8 py-4 h-auto font-semibold text-lg hover:!text-black [&>svg]:hover:!text-black"
                            onClick={openConnectModal}
                            type="button"
                          >
                            <Zap className="w-5 h-5 mr-2" />
                            Connect Wallet
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button
                            variant="destructive"
                            size="lg"
                            className="px-8 py-4 h-auto font-semibold text-lg"
                            onClick={openChainModal}
                            type="button"
                          >
                            Wrong Network
                          </Button>
                        );
                      }

                      return (
                        <Button
                          variant="wallet"
                          size="lg"
                          className="px-8 py-4 h-auto font-semibold text-lg hover:!text-black [&>svg]:hover:!text-black"
                          onClick={openAccountModal}
                          type="button"
                        >
                          <Zap className="w-5 h-5 mr-2" />
                          Wallet Connected
                        </Button>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;