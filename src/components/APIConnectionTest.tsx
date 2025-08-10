// src/components/APIConnectionTest.tsx
// Quick test component to verify backend API connection
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnalyticsAPI } from '@/services/analyticsAPI';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const APIConnectionTest: React.FC = () => {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const testEndpoint = async (name: string, testFn: () => Promise<any>) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    try {
      const result = await testFn();
      setResults(prev => ({ ...prev, [name]: { success: true, data: result } }));
    } catch (error) {
      setResults(prev => ({ 
        ...prev, 
        [name]: { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const testAllEndpoints = async () => {
    const tests = [
      { name: 'quotes', fn: () => AnalyticsAPI.getQuote(1) },
      { name: 'chart', fn: () => AnalyticsAPI.getChart(1, '1D') },
      { name: 'performance', fn: () => AnalyticsAPI.getPerformance(1) },
      { name: 'statistics', fn: () => AnalyticsAPI.getStatistics(1) },
      { name: 'news', fn: () => AnalyticsAPI.getNews(1) },
      { name: 'profile', fn: () => AnalyticsAPI.getProfile(1) }
    ];

    for (const test of tests) {
      await testEndpoint(test.name, test.fn);
    }
  };

  const renderResult = (name: string) => {
    const result = results[name];
    const isLoading = loading[name];

    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Testing...</span>
        </div>
      );
    }

    if (!result) {
      return <Badge variant="outline">Not tested</Badge>;
    }

    if (result.success) {
      return (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <Badge className="bg-green-500/20 text-green-400">Success</Badge>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-red-500" />
        <Badge className="bg-red-500/20 text-red-400">Failed</Badge>
      </div>
    );
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>API Connection Test</CardTitle>
        <p className="text-gray-400">Test connection to your Phase 2C backend APIs</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testAllEndpoints} 
          className="w-full bg-primary hover:bg-primary/90 text-black"
          disabled={Object.values(loading).some(Boolean)}
        >
          Test All Endpoints
        </Button>

        <div className="space-y-3">
          {[
            { name: 'quotes', label: 'Quotes API', endpoint: '/api/quotes/1' },
            { name: 'chart', label: 'Chart API', endpoint: '/api/chart/1/1D' },
            { name: 'performance', label: 'Performance API', endpoint: '/api/analytics/1/performance' },
            { name: 'statistics', label: 'Statistics API', endpoint: '/api/analytics/1/statistics' },
            { name: 'news', label: 'News API', endpoint: '/api/analytics/1/news' },
            { name: 'profile', label: 'Profile API', endpoint: '/api/analytics/1/profile' }
          ].map(({ name, label, endpoint }) => (
            <div key={name} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div>
                <div className="font-medium">{label}</div>
                <div className="text-sm text-gray-400">{endpoint}</div>
              </div>
              {renderResult(name)}
            </div>
          ))}
        </div>

        {/* Show sample data */}
        {results.quotes?.success && (
          <div className="mt-6 p-4 bg-zinc-800/30 rounded-lg">
            <h4 className="font-medium mb-2">Sample Quote Data:</h4>
            <pre className="text-xs text-gray-400 overflow-auto">
              {JSON.stringify(results.quotes.data, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default APIConnectionTest;