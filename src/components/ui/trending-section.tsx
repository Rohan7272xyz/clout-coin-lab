import InfluencerCard from "./influencer-card";

const TrendingSection = () => {
  const mockInfluencers = [
    {
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=300&fit=crop&crop=face",
      followers: "2.4M",
      coinPrice: "$0.024",
      priceChange: "+12.4%",
      preInvestCount: 1247,
      isPositive: true
    },
    {
      name: "Alex Rivera",
      avatar: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=300&h=300&fit=crop&crop=face",
      followers: "890K",
      coinPrice: "$0.018",
      priceChange: "+8.7%",
      preInvestCount: 892,
      isPositive: true
    },
    {
      name: "Maya Johnson",
      avatar: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300&h=300&fit=crop&crop=face",
      followers: "1.8M",
      coinPrice: "$0.031",
      priceChange: "-3.2%",
      preInvestCount: 654,
      isPositive: false
    },
    {
      name: "Jordan Kim",
      avatar: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=300&h=300&fit=crop&crop=face",
      followers: "3.1M",
      coinPrice: "$0.042",
      priceChange: "+18.9%",
      preInvestCount: 2103,
      isPositive: true
    },
    {
      name: "Marcus Thompson",
      avatar: "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=300&h=300&fit=crop&crop=face",
      followers: "1.2M",
      coinPrice: "$0.015",
      priceChange: "+5.6%",
      preInvestCount: 445,
      isPositive: true
    },
    {
      name: "Emma Wilson",
      avatar: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=300&h=300&fit=crop&crop=face",
      followers: "680K",
      coinPrice: "$0.012",
      priceChange: "+22.1%",
      preInvestCount: 789,
      isPositive: true
    }
  ];

  return (
    <section id="trending" className="py-20 bg-crypto-dark">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-black mb-4">
            Trending <span className="text-primary">Influencers</span>
          </h2>
          <p className="text-xl text-gray-light max-w-2xl mx-auto">
            Discover rising stars before they explode. Back the next viral sensation and profit from their success.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockInfluencers.map((influencer, index) => (
            <InfluencerCard
              key={index}
              {...influencer}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;