import { Search, Wallet, Rocket, TrendingUp } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: Search,
      title: "Discover Trending Influencers",
      description: "Browse rising creators across social platforms. Find the next viral sensation before they blow up."
    },
    {
      icon: Wallet,
      title: "Pre-invest with Your Wallet",
      description: "Connect your crypto wallet and back influencers with as little as $10. Early supporters get the best positions."
    },
    {
      icon: Rocket,
      title: "Coin Goes Live When Influencer Signs",
      description: "Once enough pre-investment is reached, we approach the influencer. When they join, their coin launches publicly."
    },
    {
      icon: TrendingUp,
      title: "Trade and Profit on Clout",
      description: "Buy, sell, and trade influencer coins as their popularity grows. Profit from backing the right creators early."
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-black mb-4">
            How <span className="text-primary">It Works</span>
          </h2>
          <p className="text-xl text-gray-light max-w-2xl mx-auto">
            From discovery to profit in four simple steps. Join the future of social investing.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <div key={index} className="text-center group">
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-crypto-dark border-2 border-border group-hover:border-primary rounded-2xl flex items-center justify-center mx-auto transition-all duration-300 group-hover:neon-glow">
                    <IconComponent className="w-8 h-8 text-primary" />
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-10 left-full w-full h-0.5 bg-border">
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-border rounded-full"></div>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">
                  {step.title}
                </h3>
                <p className="text-gray-light leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;