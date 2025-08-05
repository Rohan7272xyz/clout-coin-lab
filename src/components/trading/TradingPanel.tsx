import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface TradingPanelProps {
  coinData: any;
  onShowSecurityModal: () => void;
}

const TradingPanel = ({ coinData, onShowSecurityModal }: TradingPanelProps) => {
  const [buyAmount, setBuyAmount] = useState("");
  const [estimatedTokens, setEstimatedTokens] = useState("0");
  const [isConnected, setIsConnected] = useState(false); // Replace with actual wallet connection state

  useEffect(() => {
    // Calculate estimated tokens when buy amount changes
    if (buyAmount && coinData) {
      const tokens = parseFloat(buyAmount) / parseFloat(coinData.currentPrice);
      setEstimatedTokens(tokens.toFixed(2));
    } else {
      setEstimatedTokens("0");
    }
  }, [buyAmount, coinData]);

  const handleBuyClick = () => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    onShowSecurityModal();
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Buy {coinData.symbol}</CardTitle>
        <CardDescription>
          Enter the amount of ETH you want to spend
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Amount (ETH)
          </label>
          <Input
            type="number"
            placeholder="0.1"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="text-lg"
          />
        </div>
        
        {buyAmount && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-gray-400 mb-1">You will receive approximately:</div>
            <div className="font-semibold">
              {estimatedTokens} {coinData.symbol}
            </div>
          </div>
        )}
        
        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
          onClick={handleBuyClick}
          disabled={!isConnected || !buyAmount}
        >
          {!isConnected ? "Connect Wallet to Buy" : "Buy Now"}
        </Button>
        
        <div className="text-xs text-gray-500 text-center">
          <Info className="w-3 h-3 inline mr-1" />
          Transaction will be executed via Uniswap
        </div>
        
        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setBuyAmount("0.1")}
          >
            0.1 ETH
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setBuyAmount("0.5")}
          >
            0.5 ETH
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setBuyAmount("1")}
          >
            1 ETH
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingPanel;