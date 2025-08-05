import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Lock, Copy } from "lucide-react";

interface ContractInfoProps {
  coinData: any;
}

const ContractInfo = ({ coinData }: ContractInfoProps) => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
    console.log("Copied to clipboard:", text);
  };

  const openEtherscan = (address: string) => {
    window.open(`https://etherscan.io/address/${address}`, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract Address */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Contract Address</span>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {coinData.contractAddress.slice(0, 8)}...{coinData.contractAddress.slice(-6)}
            </code>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(coinData.contractAddress)}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={() => openEtherscan(coinData.contractAddress)}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Uniswap Pool */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Uniswap Pool</span>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {coinData.poolAddress.slice(0, 8)}...{coinData.poolAddress.slice(-6)}
            </code>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={() => copyToClipboard(coinData.poolAddress)}
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0"
              onClick={() => openEtherscan(coinData.poolAddress)}
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </div>
        
        {/* Liquidity Lock Status */}
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
          <Lock className="w-4 h-4 text-green-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-green-500">Liquidity Locked</div>
            <div className="text-xs text-gray-400">Lock expires: {coinData.lockUntil}</div>
          </div>
        </div>
        
        {/* Security Features */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Security Features</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Verified Contract</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>LP Locked</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>No Mint Function</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Renounced Ownership</span>
            </div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(`https://app.uniswap.org/#/swap?outputCurrency=${coinData.contractAddress}`, '_blank')}
          >
            Trade on Uniswap
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => openEtherscan(coinData.contractAddress)}
          >
            View on Etherscan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContractInfo;