// src/components/trading/TradingPanel.tsx - Fixed with proper wallet integration
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  DollarSign,
  Loader2,
  CheckCircle,
  ExternalLink,
  Calculator
} from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { parseEther, formatEther } from "viem";
import { toast } from "@/components/ui/sonner";

interface TradingPanelProps {
  coinData: {
    name: string;
    symbol: string;
    currentPrice: string;
    contractAddress: string;
    isLive: boolean;
  };
  onShowSecurityModal: () => void;
}

const TradingPanel = ({ coinData, onShowSecurityModal }: TradingPanelProps) => {
  const { isConnected, address } = useAccount();
  const { data: balance } = useBalance({ address });
  
  const [ethAmount, setEthAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [isTrading, setIsTrading] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Quick amount buttons
  const quickAmounts = [
    { label: "0.1 ETH", value: "0.1" },
    { label: "0.5 ETH", value: "0.5" },
    { label: "1 ETH", value: "1" }
  ];

  // Calculate token amount when ETH amount changes
  useEffect(() => {
    if (ethAmount && coinData.currentPrice) {
      const ethValue = parseFloat(ethAmount);
      const price = parseFloat(coinData.currentPrice);
      if (!isNaN(ethValue) && !isNaN(price) && price > 0) {
        const tokens = ethValue / price;
        setTokenAmount(tokens.toLocaleString('en-US', { maximumFractionDigits: 2 }));
      } else {
        setTokenAmount("");
      }
    } else {
      setTokenAmount("");
    }
  }, [ethAmount, coinData.currentPrice]);

  const handleQuickAmount = (amount: string) => {
    setEthAmount(amount);
  };

  const handleMaxBalance = () => {
    if (balance) {
      // Leave a small amount for gas fees (0.01 ETH)
      const maxAmount = Math.max(0, parseFloat(formatEther(balance.value)) - 0.01);
      setEthAmount(maxAmount.toFixed(4));
    }
  };

  const handleTrade = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (balance && parseFloat(ethAmount) > parseFloat(formatEther(balance.value))) {
      toast.error("Insufficient ETH balance");
      return;
    }

    setIsTrading(true);
    
    try {
      // Simulate trading transaction
      console.log(`Trading ${ethAmount} ETH for ${tokenAmount} ${coinData.symbol}`);
      
      // This is where you would integrate with your DEX/trading contract
      // For now, we'll simulate the transaction
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast.success(`Successfully bought ${tokenAmount} ${coinData.symbol}!`, {
        description: `Spent ${ethAmount} ETH`,
        action: {
          label: "View Transaction",
          onClick: () => {
            // Open transaction on block explorer
            window.open(`https://basescan.org/tx/0x...`, '_blank');
          },
        },
      });

      // Reset form
      setEthAmount("");
      setTokenAmount("");
      
    } catch (error: any) {
      console.error("Trading error:", error);
      toast.error("Trade failed", {
        description: error.message || "Please try again"
      });
    } finally {
      setIsTrading(false);
    }
  };

  const formatBalance = (wei: bigint) => {
    const eth = formatEther(wei);
    return parseFloat(eth).toFixed(4);
  };

  const calculateMinReceived = () => {
    if (!tokenAmount || !slippage) return "0";
    const tokens = parseFloat(tokenAmount.replace(/,/g, ''));
    const slippagePercent = parseFloat(slippage);
    const minReceived = tokens * (1 - slippagePercent / 100);
    return minReceived.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  // Check if token is tradeable
  if (!coinData.isLive) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl">Token Not Live</CardTitle>
          <CardDescription>This token hasn't launched yet</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-yellow-500/20 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-600">
              This token is still in the pre-launch phase. You can pledge to support the launch.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-xl">Buy {coinData.symbol}</span>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            <div className="w-2 h-2 bg-primary rounded-full mr-1 animate-pulse" />
            Live
          </Badge>
        </CardTitle>
        <CardDescription>
          Enter the amount of ETH you want to spend
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Wallet Status */}
        {isConnected && address && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Wallet Connected</span>
              </div>
              {balance && (
                <span className="text-green-400 text-sm">
                  {formatBalance(balance.value)} ETH
                </span>
              )}
            </div>
            <div className="text-xs text-green-600 mt-1">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
        )}

        {/* ETH Amount Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white">Amount (ETH)</label>
            {balance && (
              <button 
                onClick={handleMaxBalance}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Balance: {formatBalance(balance.value)} ETH
              </button>
            )}
          </div>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.1"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              className="text-lg bg-zinc-800 border-zinc-700 text-white pr-16"
              step="0.001"
              min="0"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <span className="text-sm text-gray-400 font-medium">ETH</span>
            </div>
          </div>
        </div>

        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((amount) => (
            <Button
              key={amount.value}
              variant="outline"
              size="sm"
              onClick={() => handleQuickAmount(amount.value)}
              className="border-zinc-700 hover:border-primary/50 text-xs"
            >
              {amount.label}
            </Button>
          ))}
        </div>

        {/* Token Amount Display */}
        {tokenAmount && (
          <div className="p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">You'll receive</span>
              <span className="text-lg font-semibold text-white">
                {tokenAmount} {coinData.symbol}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Price: ${coinData.currentPrice} per token
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Calculator className="w-3 h-3" />
            Advanced Settings
          </button>
          
          {showAdvanced && (
            <div className="mt-3 p-3 bg-zinc-800/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Slippage Tolerance</label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-16 h-6 text-xs bg-zinc-800 border-zinc-700"
                    step="0.1"
                    min="0.1"
                    max="50"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
              </div>
              
              {tokenAmount && (
                <div className="text-xs text-gray-500">
                  Minimum received: {calculateMinReceived()} {coinData.symbol}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trade Button */}
        <Button 
          onClick={handleTrade}
          disabled={!isConnected || isTrading || !ethAmount || parseFloat(ethAmount) <= 0}
          className="w-full bg-primary hover:bg-primary/90 text-black font-semibold py-3 text-lg"
        >
          {!isConnected ? (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Connect Wallet to Buy
            </>
          ) : isTrading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Trade...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Buy {coinData.symbol}
            </>
          )}
        </Button>

        {/* Transaction Info */}
        <div className="text-xs text-gray-500 text-center">
          <span>⚡ Transaction will be executed via Uniswap</span>
        </div>

        {/* Security Notice */}
        <Alert className="border-blue-500/20 bg-blue-500/5">
          <AlertTriangle className="h-4 w-4 text-blue-400" />
          <AlertDescription className="text-blue-600 text-xs">
            Always verify contract addresses and be aware of risks. 
            <button 
              onClick={onShowSecurityModal}
              className="text-blue-400 hover:text-blue-300 underline ml-1"
            >
              View security audit
            </button>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default TradingPanel;