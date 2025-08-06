import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Header from "@/components/ui/header";
import { 
  Plus, 
  Coins, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  DollarSign,
  Users,
  Calendar
} from "lucide-react";
import { useAccount, useContractWrite, useContractRead, useWaitForTransaction } from "wagmi";
import { parseEther, formatEther } from "viem";

// Contract configuration
const TOKEN_FACTORY_ADDRESS = "0x..."; // Deploy address goes here
const TOKEN_FACTORY_ABI = [
  // Add your contract ABI here
  "function createCoin(string memory _name, string memory _symbol, string memory _influencerName, address _influencerWallet, uint256 _totalSupply) external payable returns (address)",
  "function getAllCoins() external view returns (address[] memory)",
  "function getFactoryInfo() external view returns (address, address, uint256, uint256)",
  "function getTokensInfo(address[] memory _tokens) external view returns (string[] memory, string[] memory, string[] memory, address[] memory, uint256[] memory, uint256[] memory)"
];

interface CreatedCoin {
  address: string;
  name: string;
  symbol: string;
  influencerName: string;
  influencerWallet: string;
  totalSupply: string;
  launchTime: number;
  txHash?: string;
}

const TokenFactoryDashboard = () => {
  const { isConnected, address } = useAccount();
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    influencerName: "",
    influencerWallet: "",
    totalSupply: "1000000"
  });
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [createdCoins, setCreatedCoins] = useState<CreatedCoin[]>([]);
  const [lastCreatedCoin, setLastCreatedCoin] = useState<CreatedCoin | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Contract interactions
  const { data: factoryInfo } = useContractRead({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TOKEN_FACTORY_ABI,
    functionName: 'getFactoryInfo',
  });

  const { data: allCoinsAddresses } = useContractRead({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TOKEN_FACTORY_ABI,
    functionName: 'getAllCoins',
  });

  const { 
    write: createCoin, 
    data: createCoinData,
    error: createCoinError,
    isLoading: isCreateCoinLoading 
  } = useContractWrite({
    address: TOKEN_FACTORY_ADDRESS,
    abi: TOKEN_FACTORY_ABI,
    functionName: 'createCoin',
  });

  const { isLoading: isTransactionLoading, isSuccess: isTransactionSuccess } = useWaitForTransaction({
    hash: createCoinData?.hash,
  });

  // Load created coins
  useEffect(() => {
    if (allCoinsAddresses && allCoinsAddresses.length > 0) {
      // Fetch detailed info for all coins
      // This would use the getTokensInfo function
      // For now, we'll use mock data
      loadCoinsData(allCoinsAddresses);
    }
  }, [allCoinsAddresses]);

  const loadCoinsData = async (addresses: string[]) => {
    // Mock implementation - replace with actual contract call
    const mockCoins: CreatedCoin[] = [
      {
        address: "0x123...abc",
        name: "CryptoKing Coin",
        symbol: "CKING",
        influencerName: "CryptoKing",
        influencerWallet: "0x456...def",
        totalSupply: "1000000",
        launchTime: Date.now() - 86400000
      }
    ];
    setCreatedCoins(mockCoins);
  };

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = "Coin name is required";
    if (!formData.symbol.trim()) newErrors.symbol = "Symbol is required";
    if (formData.symbol.length > 5) newErrors.symbol = "Symbol must be 5 characters or less";
    if (!formData.influencerName.trim()) newErrors.influencerName = "Influencer name is required";
    if (!formData.influencerWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.influencerWallet = "Invalid Ethereum address";
    }
    if (!formData.totalSupply || parseInt(formData.totalSupply) <= 0) {
      newErrors.totalSupply = "Total supply must be positive";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleCreateCoin = async () => {
    if (!validateForm()) return;
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    setIsCreating(true);
    
    try {
      const creationFee = factoryInfo?.[2] || parseEther("0.01"); // Default fee
      
      await createCoin({
        args: [
          formData.name,
          formData.symbol,
          formData.influencerName,
          formData.influencerWallet,
          formData.totalSupply
        ],
        value: creationFee
      });
      
    } catch (error) {
      console.error("Error creating coin:", error);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle successful transaction
  useEffect(() => {
    if (isTransactionSuccess && createCoinData) {
      const newCoin: CreatedCoin = {
        address: "0x...", // Would get from transaction logs
        name: formData.name,
        symbol: formData.symbol,
        influencerName: formData.influencerName,
        influencerWallet: formData.influencerWallet,
        totalSupply: formData.totalSupply,
        launchTime: Date.now(),
        txHash: createCoinData.hash
      };
      
      setLastCreatedCoin(newCoin);
      setCreatedCoins(prev => [newCoin, ...prev]);
      
      // Reset form
      setFormData({
        name: "",
        symbol: "",
        influencerName: "",
        influencerWallet: "",
        totalSupply: "1000000"
      });
    }
  }, [isTransactionSuccess, createCoinData, formData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openEtherscan = (address: string) => {
    window.open(`https://basescan.org/address/${address}`, '_blank');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <Card className="bg-zinc-900 border-zinc-800 max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-primary">Admin Access Required</CardTitle>
              <CardDescription>Connect your wallet to access the Token Factory dashboard</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-400 mb-4">Only authorized admins can create influencer tokens.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Dashboard Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">
              Token <span className="text-primary">Factory</span>
            </h1>
            <p className="text-gray-400 text-lg">Create and manage influencer tokens on Base L2</p>
          </div>

          {/* Success Alert */}
          {lastCreatedCoin && (
            <Alert className="mb-8 border-primary/20 bg-primary/5">
              <CheckCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-primary">
                Successfully created {lastCreatedCoin.name} ({lastCreatedCoin.symbol})!{" "}
                <button 
                  onClick={() => openEtherscan(lastCreatedCoin.address)}
                  className="underline hover:no-underline"
                >
                  View on BaseScan
                </button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Creation Form */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary" />
                  Create New Influencer Token
                </CardTitle>
                <CardDescription>
                  Deploy a new ERC-20 token with automatic allocation (30% influencer, 65% treasury, 5% platform)
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Coin Name</label>
                    <Input
                      placeholder="Logan Paul Coin"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Symbol</label>
                    <Input
                      placeholder="LOGAN"
                      value={formData.symbol}
                      onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      maxLength={5}
                      className={errors.symbol ? 'border-red-500' : ''}
                    />
                    {errors.symbol && <p className="text-red-400 text-xs mt-1">{errors.symbol}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Influencer Name</label>
                  <Input
                    placeholder="Logan Paul"
                    value={formData.influencerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, influencerName: e.target.value }))}
                    className={errors.influencerName ? 'border-red-500' : ''}
                  />
                  {errors.influencerName && <p className="text-red-400 text-xs mt-1">{errors.influencerName}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Influencer Wallet Address</label>
                  <Input
                    placeholder="0xABC...123"
                    value={formData.influencerWallet}
                    onChange={(e) => setFormData(prev => ({ ...prev, influencerWallet: e.target.value }))}
                    className={errors.influencerWallet ? 'border-red-500' : ''}
                  />
                  {errors.influencerWallet && <p className="text-red-400 text-xs mt-1">{errors.influencerWallet}</p>}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Total Supply</label>
                  <Input
                    type="number"
                    placeholder="1000000"
                    value={formData.totalSupply}
                    onChange={(e) => setFormData(prev => ({ ...prev, totalSupply: e.target.value }))}
                    className={errors.totalSupply ? 'border-red-500' : ''}
                  />
                  {errors.totalSupply && <p className="text-red-400 text-xs mt-1">{errors.totalSupply}</p>}
                </div>

                {/* Allocation Preview */}
                <div className="bg-zinc-800 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold mb-2 text-primary">Token Allocation Preview</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Influencer (30%):</span>
                      <span>{(parseInt(formData.totalSupply || "0") * 0.3).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Treasury (65%):</span>
                      <span>{(parseInt(formData.totalSupply || "0") * 0.65).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform (5%):</span>
                      <span>{(parseInt(formData.totalSupply || "0") * 0.05).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleCreateCoin}
                  disabled={isCreating || isCreateCoinLoading || isTransactionLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-black font-semibold"
                >
                  {(isCreating || isCreateCoinLoading || isTransactionLoading) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating Token...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Create Token ({factoryInfo ? formatEther(factoryInfo[2]) : "0.01"} ETH fee)
                    </>
                  )}
                </Button>

                {createCoinError && (
                  <Alert className="border-red-500/20 bg-red-500/5">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-400">
                      Error: {createCoinError.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Created Tokens List */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Created Tokens ({createdCoins.length})
                </CardTitle>
                <CardDescription>
                  All influencer tokens created through this factory
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {createdCoins.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      No tokens created yet. Create your first influencer token above!
                    </div>
                  ) : (
                    createdCoins.map((coin, index) => (
                      <div key={index} className="border border-zinc-700 rounded-lg p-4 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-white">{coin.name}</h4>
                            <p className="text-sm text-gray-400">{coin.influencerName}</p>
                          </div>
                          <Badge className="bg-primary/20 text-primary border-primary/30">
                            {coin.symbol}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{parseInt(coin.totalSupply).toLocaleString()} supply</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(coin.launchTime).toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-zinc-600 hover:border-primary/50"
                            onClick={() => copyToClipboard(coin.address)}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy Address
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-zinc-600 hover:border-primary/50"
                            onClick={() => openEtherscan(coin.address)}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            BaseScan
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TokenFactoryDashboard;