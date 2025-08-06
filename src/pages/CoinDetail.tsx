import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check } from "lucide-react";
import TradingPanel from "@/components/trading/TradingPanel";
import SecurityModal from "@/components/trading/SecurityModal";
import CoinStats from "@/components/trading/CoinStats";
import ContractInfo from "@/components/trading/ContractInfo";
import { useNavigate } from "react-router-dom";


// Mock data - replace with real API calls
const mockCoinData = {
  id: 1,
  name: "CryptoKing",
  handle: "@cryptoking",
  tokenName: "CryptoKing Token",
  symbol: "CKING",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  category: "Crypto",
  description: "Leading crypto educator and market analyst with deep insights into DeFi and blockchain technology.",
  followers: "2.4M",
  verified: true,
  
  // Trading data
  currentPrice: "0.0024",
  priceChange24h: "+5.67",
  marketCap: "2,400,000",
  volume24h: "45,678",
  totalSupply: "1,000,000",
  circulatingSupply: "700,000",
  
  // Contract info
  contractAddress: "0x742d35Cc6634C0532925a3b8D6Ac9C43F533e3Ec",
  poolAddress: "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640",
  liquidityLocked: true,
  lockUntil: "2025-12-31",
  
  // Status
  isLive: true,
  etherscanVerified: true
};

const CoinDetail = () => {
  const navigate = useNavigate();
  const [coinData, setCoinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCoinData(mockCoinData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleShowSecurityModal = () => {
    setShowSecurityModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading coin data...</p>
        </div>
      </div>
    );
  }

  if (!coinData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Coin Not Found</h1>
          <p className="text-gray-400 mb-4">The requested coin could not be found.</p>
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Influencers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="mb-6"
          onClick={() => navigate('/influencers')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Influencers
        </Button>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Coin Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <img
                      src={coinData.avatar}
                      alt={coinData.name}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    {coinData.verified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold">{coinData.tokenName}</h1>
                      <Badge variant="secondary">{coinData.symbol}</Badge>
                    </div>
                    <p className="text-gray-400 mb-2">{coinData.handle} • {coinData.followers} followers</p>
                    <Badge className="mb-3">{coinData.category}</Badge>
                    <p className="text-sm text-gray-500">{coinData.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Stats Components */}
            <CoinStats coinData={coinData} />
            <ContractInfo coinData={coinData} />
          </div>
          
          {/* Right Column - Trading */}
          <div className="space-y-6">
            <TradingPanel 
              coinData={coinData} 
              onShowSecurityModal={handleShowSecurityModal}
            />
          </div>
        </div>
      </div>
      
      {/* Security Modal */}
      {showSecurityModal && (
        <SecurityModal 
          coinData={coinData}
          onClose={() => setShowSecurityModal(false)}
        />
      )}
    </div>
  );
};

export default CoinDetail;