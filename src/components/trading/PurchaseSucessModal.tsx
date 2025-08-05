import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ExternalLink, Plus, Eye } from "lucide-react";

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionData: {
    hash: string;
    tokensReceived: string;
    tokenSymbol: string;
    ethSpent: string;
    tokenAddress: string;
  };
}

const PurchaseSuccessModal = ({ isOpen, onClose, transactionData }: PurchaseSuccessModalProps) => {
  if (!isOpen) return null;

  const addTokenToWallet = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: transactionData.tokenAddress,
            symbol: transactionData.tokenSymbol,
            decimals: 18,
          },
        },
      });
    } catch (error) {
      console.error('Error adding token to wallet:', error);
    }
  };

  const viewOnEtherscan = () => {
    window.open(`https://etherscan.io/tx/${transactionData.hash}`, '_blank');
  };

  const goToPortfolio = () => {
    // Navigate to portfolio page
    console.log("Navigate to portfolio");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="text-green-500">Purchase Successful!</CardTitle>
          <CardDescription>
            Your transaction has been confirmed on the blockchain
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Transaction Summary */}
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500 mb-1">
                {transactionData.tokensReceived} {transactionData.tokenSymbol}
              </div>
              <div className="text-sm text-gray-400">
                Purchased with {transactionData.ethSpent} ETH
              </div>
            </div>
          </div>
          
          {/* Transaction Hash */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Transaction Hash:</div>
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <code className="text-xs flex-1 font-mono">
                {transactionData.hash.slice(0, 10)}...{transactionData.hash.slice(-8)}
              </code>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0"
                onClick={viewOnEtherscan}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            <Button 
              className="w-full bg-primary hover:bg-primary/90"
              onClick={addTokenToWallet}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Token to Wallet
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={goToPortfolio}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Portfolio
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full"
              onClick={onClose}
            >
              Continue Trading
            </Button>
          </div>
          
          {/* Additional Info */}
          <div className="text-xs text-gray-500 text-center pt-2">
            <p>Your tokens have been sent to your wallet.</p>
            <p>It may take a few minutes to appear in your balance.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseSuccessModal;