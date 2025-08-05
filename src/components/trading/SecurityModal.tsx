import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Users, Check } from "lucide-react";

interface SecurityModalProps {
  coinData: any;
  onClose: () => void;
}

const SecurityModal = ({ coinData, onClose }: SecurityModalProps) => {
  const handlePurchase = () => {
    // TODO: Integrate with Uniswap SDK or custom swap contract
    console.log("Executing purchase:", {
      tokenAddress: coinData.contractAddress,
      symbol: coinData.symbol
    });
    
    // For now, just show success message
    alert(`Purchase initiated! Check your wallet for the transaction.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Security Check</CardTitle>
          <CardDescription>
            Review these security details before purchasing
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium text-green-500">Contract Verified</div>
                <div className="text-sm text-gray-400">Verified on Etherscan</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Lock className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium text-blue-500">Liquidity Locked</div>
                <div className="text-sm text-gray-400">Until {coinData?.lockUntil}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <div className="font-medium text-primary">Influencer Verified</div>
                <div className="text-sm text-gray-400">KYC completed</div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Token:</span>
                <span className="font-medium">{coinData?.symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Price:</span>
                <span className="font-medium">{coinData?.currentPrice} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">24h Change:</span>
                <span className="font-medium text-green-500">{coinData?.priceChange24h}%</span>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="text-sm text-yellow-600">
              ⚠️ Remember: Cryptocurrency investments are risky. Only invest what you can afford to lose.
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handlePurchase}
            >
              Confirm Purchase
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityModal;