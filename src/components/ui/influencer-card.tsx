import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Eye } from "lucide-react";

interface InfluencerCardProps {
  name: string;
  avatar: string;
  followers: string;
  coinPrice: string;
  priceChange: string;
  preInvestCount: number;
  isPositive: boolean;
}

const InfluencerCard = ({
  name,
  avatar,
  followers,
  coinPrice,
  priceChange,
  preInvestCount,
  isPositive
}: InfluencerCardProps) => {
  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 hover:neon-glow p-6 group">
      <div className="flex items-start space-x-4 mb-4">
        <img 
          src={avatar} 
          alt={name}
          className="w-16 h-16 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors"
        />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">{name}</h3>
          <div className="flex items-center text-sm text-gray-light mt-1">
            <Users className="w-4 h-4 mr-1" />
            <span>{followers} followers</span>
          </div>
        </div>
      </div>
      
      {/* Mock chart area */}
      <div className="h-16 bg-muted rounded-lg mb-4 relative overflow-hidden">
        <div className="absolute inset-0 flex items-end justify-between px-2 pb-2">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`w-1 bg-gradient-to-t ${
                isPositive ? 'from-primary/60 to-primary' : 'from-destructive/60 to-destructive'
              } rounded-sm`}
              style={{ height: `${Math.random() * 80 + 20}%` }}
            />
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{coinPrice}</p>
          <p className={`text-sm flex items-center ${
            isPositive ? 'text-primary' : 'text-destructive'
          }`}>
            <TrendingUp className={`w-3 h-3 mr-1 ${isPositive ? '' : 'rotate-180'}`} />
            {priceChange}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-light flex items-center">
            <Eye className="w-3 h-3 mr-1" />
            {preInvestCount} pre-investing
          </p>
        </div>
      </div>
      
      <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
        Back Now
      </Button>
    </Card>
  );
};

export default InfluencerCard;