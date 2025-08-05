import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CoinStatsProps {
  coinData: any;
}

const CoinStats = ({ coinData }: CoinStatsProps) => {
  return (
    <>
      {/* Price Info */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">{coinData.currentPrice} ETH</div>
            <div className="text-sm text-green-500">
              {coinData.priceChange24h}% (24h)
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Market Cap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-1">${coinData.marketCap}</div>
            <div className="text-sm text-gray-400">
              Volume: ${coinData.volume24h}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Supply Info */}
      <Card>
        <CardHeader>
          <CardTitle>Token Supply</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Supply</div>
              <div className="font-semibold">{coinData.totalSupply} {coinData.symbol}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Circulating Supply</div>
              <div className="font-semibold">{coinData.circulatingSupply} {coinData.symbol}</div>
            </div>
          </div>
          
          {/* Supply Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Circulating</span>
              <span>{((parseInt(coinData.circulatingSupply.replace(/,/g, '')) / parseInt(coinData.totalSupply.replace(/,/g, ''))) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full" 
                style={{ 
                  width: `${(parseInt(coinData.circulatingSupply.replace(/,/g, '')) / parseInt(coinData.totalSupply.replace(/,/g, ''))) * 100}%` 
                }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default CoinStats;