// src/lib/pledge/types.ts - Updated with better category classifications
export interface InfluencerPledgeData {
  address: string;
  name: string;
  handle: string;
  tokenName: string;
  symbol: string;
  totalPledgedETH: string;
  totalPledgedUSDC: string;
  thresholdETH: string;
  thresholdUSDC: string;
  pledgerCount: number;
  thresholdMet: boolean;
  isApproved: boolean;
  isLaunched: boolean;
  tokenAddress?: string;
  createdAt: number;
  launchedAt?: number;

  // Additional UI data from database with better classification
  avatar?: string;
  followers?: string;
  category?: InfluencerCategory;
  description?: string;
  verified?: boolean;
}

// Well-defined influencer categories with clear descriptions
export type InfluencerCategory = 
| 'Cryptocurrency & Blockchain'
| 'Technology & Innovation'
| 'Fitness & Wellness'
| 'Entertainment & Media'
| 'Business & Finance'
| 'Gaming & Esports'
| 'Fashion & Lifestyle'
| 'Education & Learning'
| 'Food & Cooking'
| 'Travel & Adventure'
| 'Art & Design'
| 'Music & Audio'
| 'Sports & Athletics'
| 'Science & Research'
| 'Politics & Current Events';

// Category metadata for better UI representation
export const CATEGORY_METADATA: Record<InfluencerCategory, {
label: string;
description: string;
color: string;
icon: string;
}> = {
'Cryptocurrency & Blockchain': {
  label: 'Crypto & Blockchain',
  description: 'Digital currencies, DeFi, NFTs, and blockchain technology',
  color: 'orange',
  icon: '₿'
},
'Technology & Innovation': {
  label: 'Tech & Innovation',
  description: 'Software, AI, hardware, and emerging technologies',
  color: 'blue',
  icon: '💻'
},
'Fitness & Wellness': {
  label: 'Fitness & Wellness',
  description: 'Health, exercise, nutrition, and mental wellness',
  color: 'green',
  icon: '💪'
},
'Entertainment & Media': {
  label: 'Entertainment',
  description: 'Movies, TV, streaming, comedy, and media content',
  color: 'purple',
  icon: '🎬'
},
'Business & Finance': {
  label: 'Business & Finance',
  description: 'Entrepreneurship, investing, and financial education',
  color: 'emerald',
  icon: '📈'
},
'Gaming & Esports': {
  label: 'Gaming & Esports',
  description: 'Video games, streaming, and competitive gaming',
  color: 'pink',
  icon: '🎮'
},
'Fashion & Lifestyle': {
  label: 'Fashion & Lifestyle',
  description: 'Style, beauty, trends, and lifestyle content',
  color: 'rose',
  icon: '👗'
},
'Education & Learning': {
  label: 'Education',
  description: 'Teaching, tutorials, and educational content',
  color: 'indigo',
  icon: '📚'
},
'Food & Cooking': {
  label: 'Food & Cooking',
  description: 'Recipes, restaurants, and culinary content',
  color: 'yellow',
  icon: '🍳'
},
'Travel & Adventure': {
  label: 'Travel & Adventure',
  description: 'Travel guides, adventures, and exploration',
  color: 'cyan',
  icon: '✈️'
},
'Art & Design': {
  label: 'Art & Design',
  description: 'Visual arts, graphic design, and creative content',
  color: 'violet',
  icon: '🎨'
},
'Music & Audio': {
  label: 'Music & Audio',
  description: 'Music production, podcasts, and audio content',
  color: 'red',
  icon: '🎵'
},
'Sports & Athletics': {
  label: 'Sports',
  description: 'Professional sports, athletics, and sports commentary',
  color: 'orange',
  icon: '⚽'
},
'Science & Research': {
  label: 'Science & Research',
  description: 'Scientific research, discoveries, and STEM education',
  color: 'teal',
  icon: '🔬'
},
'Politics & Current Events': {
  label: 'Politics & News',
  description: 'Political commentary and current events analysis',
  color: 'slate',
  icon: '🗳️'
}
};

export interface UserPledge {
  id: number;
  user_address: string;
  influencer_address: string;
  eth_amount: string;
  usdc_amount: string;
  has_withdrawn: boolean;
  pledged_at: number;
  influencer_name?: string;
  token_name?: string;
  symbol?: string;
  is_launched?: boolean;
  token_address?: string;
  category?: InfluencerCategory;
  description?: string;
  verified?: boolean;
  avatar?: string;
}

export interface PledgeProgress {
  totalETH: string;
  totalUSDC: string;
  thresholdETH: string;
  thresholdUSDC: string;
  pledgerCount: number;
  thresholdMet: boolean;
  isApproved: boolean;
  isLaunched: boolean;
  ethProgress: number;      // Calculated percentage
  usdcProgress: number;     // Calculated percentage
  overallProgress: number;  // Max of ETH/USDC progress
}

export interface PlatformStats {
  totalInfluencers: number;
  launchedTokens: number;
  approvedInfluencers: number;
  totalPledgedETH: string;
  totalPledgedUSDC: string;
  totalPledgers: number;
  pendingApprovals: number;
}

export interface AdminSetupRequest {
  influencerAddress: string;
  ethThreshold: string;
  usdcThreshold: string;
  tokenName: string;
  symbol: string;
  influencerName: string;
  category?: InfluencerCategory;
  description?: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PledgeEvent {
  id: number;
  eventType: 'pledge_made' | 'threshold_reached' | 'approved' | 'launched' | 'withdrawn';
  influencerAddress: string;
  userAddress?: string;
  ethAmount?: string;
  usdcAmount?: string;
  txHash?: string;
  blockNumber?: number;
  eventData?: Record<string, any>;
  createdAt: string;
}

// Progress Status Types for Better UX
export type ProgressStatus = 
| 'collecting_interest'  // Initial phase - collecting pledges
| 'target_reached'       // Threshold met, awaiting approval
| 'approved'             // Approved by admin, ready for launch
| 'launched'             // Token is live and trading
| 'paused'               // Temporarily paused
| 'cancelled';           // Campaign cancelled

export interface ProgressStatusMetadata {
label: string;
description: string;
color: string;
action: string;
}

export const PROGRESS_STATUS_METADATA: Record<ProgressStatus, ProgressStatusMetadata> = {
collecting_interest: {
  label: 'Accepting Interest',
  description: 'Currently gathering community interest',
  color: 'gray',
  action: 'Show Interest'
},
target_reached: {
  label: 'Target Reached',
  description: 'Interest target met, awaiting admin approval',
  color: 'yellow',
  action: 'Ready to Launch'
},
approved: {
  label: 'Approved',
  description: 'Approved and preparing for token launch',
  color: 'blue',
  action: 'Show Interest'
},
launched: {
  label: 'Live Trading',
  description: 'Token is live and available for trading',
  color: 'green',
  action: 'Trade Now'
},
paused: {
  label: 'Paused',
  description: 'Temporarily paused by administrators',
  color: 'orange',
  action: 'Paused'
},
cancelled: {
  label: 'Cancelled',
  description: 'Campaign has been cancelled',
  color: 'red',
  action: 'Cancelled'
}
};

// Wagmi/Contract specific types
export interface ContractWriteArgs {
  address: `0x${string}`;
  abi: readonly any[];
  functionName: string;
  args?: readonly any[];
  value?: bigint;
}

export interface TransactionStatus {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: Error;
  hash?: `0x${string}`;
}

// Helper functions for better type safety
export const getProgressStatus = (influencer: InfluencerPledgeData): ProgressStatus => {
if (influencer.isLaunched) return 'launched';
if (influencer.isApproved) return 'approved';
if (influencer.thresholdMet) return 'target_reached';
return 'collecting_interest';
};

export const getCategoryMetadata = (category?: InfluencerCategory) => {
if (!category) return null;
return CATEGORY_METADATA[category];
};

export const formatCategoryLabel = (category?: InfluencerCategory): string => {
if (!category) return 'General';
return CATEGORY_METADATA[category]?.label || category;
};