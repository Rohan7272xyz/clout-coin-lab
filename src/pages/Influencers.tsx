import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/ui/header";
import Footer from "@/components/ui/footer";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Search,
  Filter,
  ArrowLeft,
  Check,
  Clock,
  Star,
  Globe,
  Instagram,
  Twitter
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Extended mock data for all influencers
const allInfluencers = [
  {
    id: 1,
    name: "CryptoKing",
    handle: "@cryptoking",
    followers: "2.4M",
    category: "Crypto",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Leading crypto educator and market analyst with deep insights into DeFi and blockchain technology.",
    verified: true,
    comingSoon: true,
    rating: 4.8,
    platforms: ["Twitter", "YouTube", "Instagram"]
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
    description: "Silicon Valley insider and startup advisor covering emerging tech trends and innovation.",
    verified: true,
    comingSoon: true,
    rating: 4.7,
    platforms: ["Twitter", "LinkedIn", "TikTok"]
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
    description: "Wellness coach and lifestyle influencer inspiring millions to live their healthiest lives.",
    verified: true,
    comingSoon: true,
    rating: 4.9,
    platforms: ["Instagram", "YouTube", "TikTok"]
  },
  {
    id: 4,
    name: "GameMaster",
    handle: "@gamemaster",
    followers: "4.2M",
    category: "Gaming",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Professional gamer and streamer with expertise in competitive esports and game reviews.",
    verified: true,
    comingSoon: true,
    rating: 4.6,
    platforms: ["Twitch", "YouTube", "Discord"]
  },
  {
    id: 5,
    name: "FoodieExplorer",
    handle: "@foodieexplorer",
    followers: "2.8M",
    category: "Food & Travel",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Culinary adventurer sharing global cuisine experiences and hidden food gems worldwide.",
    verified: true,
    comingSoon: true,
    rating: 4.8,
    platforms: ["Instagram", "YouTube", "TikTok"]
  },
  {
    id: 6,
    name: "BusinessMogul",
    handle: "@businessmogul",
    followers: "1.9M",
    category: "Business",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Serial entrepreneur and business strategist sharing insights on scaling companies and investing.",
    verified: true,
    comingSoon: true,
    rating: 4.7,
    platforms: ["LinkedIn", "Twitter", "YouTube"]
  },
  {
    id: 7,
    name: "ArtVisioneer",
    handle: "@artvisioneer",
    followers: "1.5M",
    category: "Art & Design",
    avatar: "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Digital artist and creative director pushing boundaries in NFT art and design innovation.",
    verified: true,
    comingSoon: true,
    rating: 4.5,
    platforms: ["Instagram", "Behance", "Twitter"]
  },
  {
    id: 8,
    name: "MusicMaestro",
    handle: "@musicmaestro",
    followers: "3.6M",
    category: "Music",
    avatar: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Producer and artist creating viral music content and discovering emerging talent in the industry.",
    verified: true,
    comingSoon: true,
    rating: 4.9,
    platforms: ["Spotify", "YouTube", "TikTok"]
  },
  {
    id: 9,
    name: "EcoWarrior",
    handle: "@ecowarrior",
    followers: "2.2M",
    category: "Environment",
    avatar: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Environmental activist and sustainability advocate promoting eco-friendly living and climate action.",
    verified: true,
    comingSoon: true,
    rating: 4.8,
    platforms: ["Instagram", "Twitter", "YouTube"]
  },
  {
    id: 10,
    name: "LifeHacker",
    handle: "@lifehacker",
    followers: "2.0M",
    category: "Lifestyle",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    price: "$0.00",
    change: "+0%",
    description: "Productivity expert and life optimization coach helping people maximize their potential daily.",
    verified: true,
    comingSoon: true,
    rating: 4.6,
    platforms: ["YouTube", "Instagram", "Twitter"]
  }
];

const categories = ["All", "Crypto", "Technology", "Fitness", "Gaming", "Food & Travel", "Business", "Art & Design", "Music", "Environment", "Lifestyle"];

const Influencers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const navigate = useNavigate();

  const filteredInfluencers = allInfluencers.filter(influencer => {
    const matchesSearch = influencer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         influencer.handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         influencer.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "All" || influencer.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Header Section */}
        <section className="py-12 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/pre-invest')}
                className="text-gray-light hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Pre-Invest
              </Button>
            </div>
            
            <div className="text-center mb-8">
              <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
                All Influencers
              </h1>
              <p className="text-xl text-gray-light max-w-3xl mx-auto">
                Discover and invest in the future of influence. Browse all available influencer coins coming to our platform.
              </p>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 max-w-4xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-light w-4 h-4" />
                <Input
                  placeholder="Search influencers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={selectedCategory === category ? "bg-primary text-primary-foreground" : ""}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-center mt-6 text-gray-muted">
              Showing {filteredInfluencers.length} of {allInfluencers.length} influencers
            </div>
          </div>
        </section>

        {/* Influencers Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredInfluencers.map((influencer) => (
                <Card key={influencer.id} className="relative bg-card/80 border-border hover:border-primary/50 transition-all duration-300 group hover:shadow-lg">
                  <CardHeader className="text-center pb-4">
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
                    
                    <CardTitle className="text-lg">{influencer.name}</CardTitle>
                    <CardDescription className="text-gray-light text-sm">
                      {influencer.handle}
                    </CardDescription>
                    
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{influencer.followers}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {influencer.category}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-xs text-gray-light">{influencer.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-muted line-clamp-3">
                        {influencer.description}
                      </p>
                      
                      <div className="flex justify-between items-center p-3 bg-background/50 rounded-lg">
                        <div>
                          <div className="text-xs text-gray-muted">Price</div>
                          <div className="font-semibold text-sm">{influencer.price}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-muted">24h</div>
                          <div className="font-semibold text-sm text-primary">{influencer.change}</div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {influencer.platforms.slice(0, 2).map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                        {influencer.platforms.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{influencer.platforms.length - 2}
                          </Badge>
                        )}
                      </div>
                      
                      <Button 
                        className="w-full bg-muted hover:bg-muted/80 text-muted-foreground cursor-not-allowed text-sm py-2"
                        disabled
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Coming Soon
                      </Button>
                    </div>
                  </CardContent>
                  
                  {influencer.comingSoon && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10 text-xs">
                        Soon
                      </Badge>
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {filteredInfluencers.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-16 h-16 text-gray-muted mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No influencers found</h3>
                <p className="text-gray-light">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Influencers;