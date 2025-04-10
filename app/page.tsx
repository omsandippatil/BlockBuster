// app/page.tsx
"use client";

import { useState } from 'react';
import { analyzeWallet, WalletAnalysisResponse } from '@/app/api/analyze';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// Define interfaces for our data structures
interface Transaction {
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
}

interface TransactionData {
  count: number;
  recent: Transaction[];
}

interface ActivityDataPoint {
  name: string;
  transactions: number;
}

interface RiskDataPoint {
  name: string;
  value: number;
}

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<WalletAnalysisResponse | null>(null);

  // Mock transaction history data for visualization
  const generateActivityData = (transactions: TransactionData | undefined): ActivityDataPoint[] => {
    if (!transactions || !transactions.recent || transactions.recent.length === 0) {
      return [];
    }

    // Group transactions by month
    const grouped = transactions.recent.reduce((acc: Record<string, number>, tx: Transaction) => {
      const date = new Date(parseInt(tx.timeStamp) * 1000);
      const month = date.toLocaleString('default', { month: 'short' });
      if (!acc[month]) acc[month] = 0;
      acc[month]++;
      return acc;
    }, {});

    return Object.keys(grouped).map(month => ({
      name: month,
      transactions: grouped[month]
    }));
  };

  // Generate risk data for visualization
  const generateRiskData = (analysis: { riskScore: number } | undefined): RiskDataPoint[] => {
    if (!analysis) return [];
    
    return [
      { name: 'Low Risk', value: 100 - analysis.riskScore },
      { name: 'Risk Score', value: analysis.riskScore }
    ];
  };

  const RISK_COLORS = ['#E0E0E0', '#000000'];

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid Ethereum wallet address format');
      }
      
      const data = await analyzeWallet(walletAddress);
      setWalletData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setWalletData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="py-12 border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-bold tracking-tight">BlockBuster</h1>
          <p className="text-lg mt-3 text-gray-600">Professional Ethereum Wallet Analysis</p>
        </div>
      </header>

      {/* Search Form */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-4 items-center">
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter Ethereum wallet address (0x...)"
              className="flex-grow p-4 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-black focus:border-transparent"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="w-full md:w-auto px-8 py-4 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? 'Analyzing...' : 'Analyze Wallet'}
            </button>
          </form>
          {error && (
            <p className="mt-4 text-red-600 text-center">{error}</p>
          )}
        </div>
      </section>

      {/* Results Section */}
      {walletData && (
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-6">
            {/* Overview Panel */}
            <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Address & Balance */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-100">Wallet Identity</h2>
                <p className="mb-2 overflow-hidden overflow-ellipsis">
                  <span className="text-gray-500 text-sm">Address:</span><br />
                  <span className="font-mono text-sm">{walletData.address}</span>
                </p>
                <p className="mb-1">
                  <span className="text-gray-500 text-sm">Balance:</span><br />
                  <span className="text-3xl font-bold">{(parseFloat(walletData.etherscanData.balance) / 1e18).toFixed(4)} ETH</span>
                </p>
              </div>
              
              {/* Transaction Stats */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-100">Activity Summary</h2>
                <p className="mb-1">
                  <span className="text-gray-500 text-sm">Total Transactions:</span><br />
                  <span className="text-3xl font-bold">{walletData.etherscanData.transactions.count}</span>
                </p>
                <p className="mb-1">
                  <span className="text-gray-500 text-sm">Activity Age:</span><br />
                  <span className="text-lg">{walletData.analysis.activityPatterns.activityAge}</span>
                </p>
              </div>

              {/* Risk Assessment */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-100">Risk Assessment</h2>
                <div className="flex items-center mb-2">
                  <span className="text-gray-500 text-sm mr-2">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${walletData.analysis.isFraudulent ? 'bg-black text-white' : 'bg-gray-100 text-black'}`}>
                    {walletData.analysis.isFraudulent ? 'Suspicious' : 'Safe'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Risk Score</p>
                    <p className="text-3xl font-bold">{walletData.analysis.riskScore}</p>
                  </div>
                  <div className="h-20 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={generateRiskData(walletData.analysis)}
                          cx="50%"
                          cy="50%"
                          innerRadius={25}
                          outerRadius={35}
                          paddingAngle={0}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {generateRiskData(walletData.analysis).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Confidence: <span className="font-medium">{walletData.analysis.confidenceLevel}</span>
                </p>
              </div>
            </div>

            {/* Activity Graph */}
            <div className="mb-12 bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">Transaction Activity</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={generateActivityData(walletData.etherscanData.transactions)}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', borderColor: '#e0e0e0' }}
                    />
                    <Bar dataKey="transactions" fill="#000000" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Analysis Details */}
            <div className="mb-12 bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">Analysis Summary</h2>
              <p className="text-lg mb-6 leading-relaxed">{walletData.analysis.summary}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                {/* Risk Flags */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-100">Risk Flags</h3>
                  {walletData.analysis.flags.length > 0 ? (
                    <ul className="space-y-2">
                      {walletData.analysis.flags.map((flag, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block w-5 h-5 bg-black text-white rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">!</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No risk flags detected</p>
                  )}
                </div>
                
                {/* Recommendations */}
                <div>
                  <h3 className="text-xl font-semibold mb-4 pb-2 border-b border-gray-100">Recommendations</h3>
                  {walletData.analysis.recommendations.length > 0 ? (
                    <ul className="space-y-2">
                      {walletData.analysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start">
                          <span className="inline-block w-5 h-5 bg-gray-200 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">→</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No specific recommendations</p>
                  )}
                </div>
              </div>
            </div>

            {/* Behavior Analysis */}
            <div className="mb-12 bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">Behavior Analysis</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(walletData.analysis.behaviors).map(([key, value]) => (
                  <div 
                    key={key} 
                    className={`p-4 rounded-lg border ${value ? 'border-black bg-gray-50' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="text-sm font-medium text-gray-500 mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </div>
                    <div className={`font-bold ${value ? 'text-black' : 'text-gray-400'}`}>
                      {value ? 'Yes' : 'No'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity Patterns */}
            <div className="mb-12 bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">Activity Patterns</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Peak Activity */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Peak Activity Periods</h3>
                  {walletData.analysis.activityPatterns.peakActivityPeriods.length > 0 ? (
                    <ul className="space-y-2">
                      {walletData.analysis.activityPatterns.peakActivityPeriods.map((period, index) => (
                        <li key={index} className="p-2 bg-gray-50 rounded">{period}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No specific peak periods detected</p>
                  )}
                </div>
                
                {/* Dormant Periods */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Dormant Periods</h3>
                  {walletData.analysis.activityPatterns.dormantPeriods.length > 0 ? (
                    <ul className="space-y-2">
                      {walletData.analysis.activityPatterns.dormantPeriods.map((period, index) => (
                        <li key={index} className="p-2 bg-gray-50 rounded">{period}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No dormant periods detected</p>
                  )}
                </div>
                
                {/* Common Interactions */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Common Interactions</h3>
                  {walletData.analysis.activityPatterns.commonInteractions.length > 0 ? (
                    <ul className="space-y-2">
                      {walletData.analysis.activityPatterns.commonInteractions.map((interaction, index) => (
                        <li key={index} className="p-2 bg-gray-50 rounded">{interaction}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-600">No common interactions detected</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="mb-12 bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">Recent Transactions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hash</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value (ETH)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {walletData.etherscanData.transactions.recent.map((tx, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                          {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 6)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {new Date(parseInt(tx.timeStamp) * 1000).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                          {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                          {tx.to.substring(0, 6)}...{tx.to.substring(tx.to.length - 4)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {(parseFloat(tx.value) / 1e18).toFixed(6)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Token Balances */}
            {walletData.etherscanData.tokenBalances.length > 0 && (
              <div className="mb-12 bg-white p-6 rounded-lg shadow-md border border-gray-100">
                <h2 className="text-2xl font-bold mb-6">Token Holdings</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {walletData.etherscanData.tokenBalances.map((token, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">{token.tokenName}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{token.tokenSymbol}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">{token.tokenQuantity}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-mono">
                            {token.tokenContractAddress.substring(0, 6)}...{token.tokenContractAddress.substring(token.tokenContractAddress.length - 4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Raw Data (expandable) */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <details>
                <summary className="text-xl font-semibold cursor-pointer">Raw JSON Data</summary>
                <div className="mt-4 overflow-auto max-h-96">
                  <pre className="bg-gray-50 p-4 rounded-lg text-xs">
                    {JSON.stringify(walletData, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}