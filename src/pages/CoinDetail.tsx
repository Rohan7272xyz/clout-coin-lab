import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check } from "lucide-react";
import TradingPanel from "@/components/trading/TradingPanel";
import SecurityModal from "@/components/trading/SecurityModal";
import CoinStats from "@/components/trading/CoinStats";
import ContractInfo from "@/components/trading/ContractInfo";

// Only Rohini has coin detail data - others are TBD
const influencersData = {
  2: {
    id: 2,
    name: "Rohini",
    handle: "@rohini",
    tokenName: "Rohini Token",
    symbol: "ROHINI",
    avatar: "https://mail.google.com/mail/u/0?ui=2&ik=84109c25fb&attid=0.1&permmsgid=msg-f:1839751187009719696&th=19881bf508d14d90&view=fimg&fur=ip&permmsgid=msg-f:1839751187009719696&sz=s0-l75-ft&attbid=ANGjdJ8YS49EUow6KO-Z9L9mpl149Y1qAUSPs3pBsWJ6oLpKPu2VLZJJ3_b80PLCHpGnMuAc-5pppHLR3RsOypN--bi1HvWgBbusbSB_td3WmhVuAJFKgDcoqrCsK0o&disp=emb&realattid=D5CCD335-277C-42D2-8E30-8B333DB3655B&zw",
    category: "Crypto",
    description: "Leading crypto educator and market analyst specializing in emerging blockchain technologies.",
    followers: "2.4M",
    verified: true,
    
    // Trading data
    currentPrice: "0.0018",
    priceChange24h: "+12.4",
    marketCap: "1,800,000",
    volume24h: "89,234",
    totalSupply: "1,000,000",
    circulatingSupply: "750,000",
    
    // Contract info
    contractAddress: "0x9c742435Cc6634C0532925a3b8D6Ac9C43F533e3E",
    poolAddress: "0x77e6A0c2dDD26FEEb64F039a2c41296FcB3f5640A",
    liquidityLocked: true,
    lockUntil: "2025-12-31",
    
    // Status
    isLive: true,
    etherscanVerified: true
  }
};

const CoinDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [coinData, setCoinData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadCoinData = () => {
      const influencerId = parseInt(id || "0");
      const influencer = influencersData[influencerId as keyof typeof influencersData];
      
      if (influencer) {
        // Simulate API loading delay
        setTimeout(() => {
          setCoinData(influencer);
          setLoading(false);
        }, 500);
      } else {
        // Influencer not found
        setTimeout(() => {
          setNotFound(true);
          setLoading(false);
        }, 500);
      }
    };

    loadCoinData();
  }, [id]);

  const handleShowSecurityModal = () => {
    setShowSecurityModal(true);
  };

  const handleBackClick = () => {
    navigate('/influencers');
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

  if (notFound || !coinData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Coin Not Found</h1>
          <p className="text-gray-400 mb-4">The requested coin could not be found.</p>
          <Button onClick={handleBackClick}>
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
        <Button variant="ghost" size="sm" className="mb-6" onClick={handleBackClick}>
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
                      className="w-20 h-20 rounded-full object-cover border-2 border-border group-hover:border-primary transition-colors"
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
                      {coinData.isLive && (
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          Live
                        </Badge>
                      )}
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