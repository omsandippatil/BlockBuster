// wallet-analysis-api.ts
import axios from 'axios';

// Environment variables for API keys (to be defined in your .env.local file)
const ETHERSCAN_API_KEY = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || '';
const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';

// Define interfaces for the API responses
interface EtherscanTransaction {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed: string;
  methodId?: string;
  functionName?: string;
}

interface EtherscanToken {
  tokenName?: string;
  tokenSymbol?: string;
  balance?: string;
  contractAddress?: string;
}

// Interface for the response structure
export interface WalletAnalysisResponse {
  address: string;
  isValid: boolean;
  etherscanData: {
    balance: string;
    transactions: {
      count: number;
      recent: Array<{
        hash: string;
        blockNumber: string;
        timeStamp: string;
        from: string;
        to: string;
        value: string;
        gasPrice: string;
        gasUsed: string;
        methodId: string;
        functionName: string;
      }>;
    };
    tokenBalances: Array<{
      tokenName: string;
      tokenSymbol: string;
      tokenQuantity: string;
      tokenContractAddress: string;
    }>;
  };
  analysis: {
    isFraudulent: boolean;
    riskScore: number; // 0-100, higher means more risk
    confidenceLevel: string; // Low, Medium, High
    flags: string[];
    behaviors: {
      highFrequencyTrading: boolean;
      largeTransfers: boolean;
      interactionsWithFlaggedWallets: boolean;
      unusualContractCalls: boolean;
      gasPriceAnomaly: boolean;
    };
    summary: string;
    recommendations: string[];
    activityPatterns: {
      activityAge: string;
      peakActivityPeriods: string[];
      dormantPeriods: string[];
      commonInteractions: string[];
    };
  };
  timestamp: string;
}

// Define interface for Etherscan data structure
interface EtherscanData {
  balance: string;
  transactions: {
    count: number;
    recent: Array<{
      hash: string;
      blockNumber: string;
      timeStamp: string;
      from: string;
      to: string;
      value: string;
      gasPrice: string;
      gasUsed: string;
      methodId: string;
      functionName: string;
    }>;
  };
  tokenBalances: Array<{
    tokenName: string;
    tokenSymbol: string;
    tokenQuantity: string;
    tokenContractAddress: string;
  }>;
}

/**
 * Analyzes an Ethereum wallet address using Etherscan data and Groq AI
 * @param walletAddress - Ethereum wallet address to analyze
 * @returns Promise with wallet analysis data
 */
export async function analyzeWallet(walletAddress: string): Promise<WalletAnalysisResponse> {
  try {
    // Validate wallet address format
    if (!walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum wallet address format');
    }

    // Fetch data from Etherscan
    const etherscanData = await fetchEtherscanData(walletAddress);

    // Analyze the wallet with Groq
    const analysis = await analyzeWithGroq(walletAddress, etherscanData);

    // Combine data into final response
    return {
      address: walletAddress,
      isValid: true,
      etherscanData,
      analysis,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error analyzing wallet:', error);
    throw error;
  }
}

/**
 * Fetches wallet data from Etherscan
 * @param walletAddress - Ethereum wallet address
 * @returns Promise with Etherscan data
 */
async function fetchEtherscanData(walletAddress: string): Promise<EtherscanData> {
  // Base URL for Etherscan API
  const baseUrl = 'https://api.etherscan.io/api';

  // Get wallet balance
  const balanceResponse = await axios.get(`${baseUrl}`, {
    params: {
      module: 'account',
      action: 'balance',
      address: walletAddress,
      tag: 'latest',
      apikey: ETHERSCAN_API_KEY,
    },
  });

  // Get normal transactions
  const txResponse = await axios.get(`${baseUrl}`, {
    params: {
      module: 'account',
      action: 'txlist',
      address: walletAddress,
      startblock: 0,
      endblock: 99999999,
      page: 1,
      offset: 20, // Get the most recent 20 transactions
      sort: 'desc',
      apikey: ETHERSCAN_API_KEY,
    },
  });

  // Get ERC-20 token balances
  const tokenBalanceResponse = await axios.get(`${baseUrl}`, {
    params: {
      module: 'account',
      action: 'tokenbalance',
      address: walletAddress,
      contractaddress: '', // Get all tokens
      tag: 'latest',
      apikey: ETHERSCAN_API_KEY,
    },
  });

  // Format and return Etherscan data
  return {
    balance: balanceResponse.data.result,
    transactions: {
      count: txResponse.data.result.length,
      recent: txResponse.data.result.slice(0, 20).map((tx: EtherscanTransaction) => ({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        timeStamp: tx.timeStamp,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        gasPrice: tx.gasPrice,
        gasUsed: tx.gasUsed,
        methodId: tx.methodId || '',
        functionName: tx.functionName || '',
      })),
    },
    tokenBalances: Array.isArray(tokenBalanceResponse.data.result)
      ? tokenBalanceResponse.data.result.map((token: EtherscanToken) => ({
          tokenName: token.tokenName || 'Unknown',
          tokenSymbol: token.tokenSymbol || 'Unknown',
          tokenQuantity: token.balance || '0',
          tokenContractAddress: token.contractAddress || '',
        }))
      : [],
  };
}

/**
 * Analyzes wallet data using Groq AI
 * @param walletAddress - Ethereum wallet address
 * @param etherscanData - Data from Etherscan API
 * @returns Promise with analysis results
 */
async function analyzeWithGroq(walletAddress: string, etherscanData: EtherscanData) {
  // Prepare data for Groq
  const payload = {
    messages: [
      {
        role: "system",
        content: `You are a blockchain fraud detection expert. Analyze the provided Ethereum wallet data and return a detailed JSON assessment. Include risk scoring, behavioral analysis, and fraud detection. ONLY RESPOND WITH JSON. Do not include any extra text before or after the JSON.`
      },
      {
        role: "user",
        content: `Analyze this Ethereum wallet address ${walletAddress} with the following Etherscan data: ${JSON.stringify(etherscanData)}. Evaluate for fraud indicators, unusual patterns, and risk factors. Return ONLY a JSON object with these fields:
        {
          "isFraudulent": boolean,
          "riskScore": number (0-100),
          "confidenceLevel": string ("Low", "Medium", or "High"),
          "flags": string[],
          "behaviors": {
            "highFrequencyTrading": boolean,
            "largeTransfers": boolean,
            "interactionsWithFlaggedWallets": boolean,
            "unusualContractCalls": boolean,
            "gasPriceAnomaly": boolean
          },
          "summary": string,
          "recommendations": string[],
          "activityPatterns": {
            "activityAge": string,
            "peakActivityPeriods": string[],
            "dormantPeriods": string[],
            "commonInteractions": string[]
          }
        }`
      }
    ],
    model: "llama3-70b-8192",
    temperature: 0.2,
    response_format: { type: "json_object" }
  };

  // Request analysis from Groq
  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  // Parse and return Groq's JSON response
  try {
    const analysisContent = response.data.choices[0].message.content;
    return JSON.parse(analysisContent);
  } catch (error) {
    console.error('Error parsing Groq response:', error);
    throw new Error('Failed to parse analysis response');
  }
}