// src/components/CoinFluenceRobot.tsx
// Copy this file directly into your project

import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, HelpCircle, Eye, EyeOff, Sparkles, Zap } from 'lucide-react';

// Component information database - customize this for your specific needs
const COMPONENT_INFO = {
  // Navigation & Header
  'header': {
    title: 'Navigation Header',
    description: 'Main navigation with user account controls and wallet connection',
    tips: 'Click your profile to access dashboard or connect wallet to start investing'
  },
  'nav-link': {
    title: 'Navigation Link',
    description: 'Navigate between different sections of CoinFluence',
    tips: 'Explore Influencers to see all available tokens, or About to learn more'
  },
  'wallet-button': {
    title: 'Wallet Connection',
    description: 'Connect your crypto wallet to start investing in influencer tokens',
    tips: 'Required for pledging ETH/USDC to upcoming influencers'
  },
  'sign-in-button': {
    title: 'Account Access',
    description: 'Sign in to track your investments and access personalized features',
    tips: 'Create an account to save your portfolio and get notifications'
  },
  'dashboard-button': {
    title: 'Dashboard Access',
    description: 'View your portfolio, track investments, and manage account settings',
    tips: 'Your central hub for all investment activity and performance'
  },

  // Hero & Main Content
  'hero-section': {
    title: 'Hero Section',
    description: 'Main landing area showcasing CoinFluence platform benefits',
    tips: 'Start by clicking "Pre-Invest Now" to explore available opportunities'
  },
  'pre-invest-button': {
    title: 'Pre-Investment Portal',
    description: 'Access early investment opportunities in upcoming influencer tokens',
    tips: 'Get exclusive access before tokens go live on the market'
  },
  'cta-button': {
    title: 'Call to Action',
    description: 'Primary action button to start your investing journey',
    tips: 'Click to begin exploring investment opportunities'
  },

  // Cards & Components
  'influencer-card': {
    title: 'Influencer Investment Card',
    description: 'Shows investment opportunity with progress, stats, and current status',
    tips: 'Click to invest or view detailed information about this influencer'
  },
  'coin-card': {
    title: 'Token Trading Card',
    description: 'Live trading information for launched influencer tokens',
    tips: 'Shows real-time price, volume, and trading opportunities'
  },
  'pledge-card': {
    title: 'Pre-Investment Card',
    description: 'Show interest in upcoming tokens before they launch',
    tips: 'Pledge ETH/USDC to secure early access when token goes live'
  },
  'progress-bar': {
    title: 'Interest Progress',
    description: 'Shows how close an influencer is to meeting their funding threshold',
    tips: 'When target is reached, the influencer may approve token creation'
  },
  'status-badge': {
    title: 'Token Status',
    description: 'Current state of the influencer token (Live, Approved, Pledging, etc.)',
    tips: 'Live = tradeable now, Approved = launching soon, Pledging = accepting interest'
  },

  // Buttons & Actions
  'trade-button': {
    title: 'Trade Token',
    description: 'Buy or sell this influencer token on the live market',
    tips: 'Requires wallet connection and sufficient ETH balance'
  },
  'pledge-button': {
    title: 'Show Interest',
    description: 'Pledge ETH/USDC to support this influencer before token launch',
    tips: 'Early supporters often get better prices when token goes live'
  },
  'follow-button': {
    title: 'Follow Updates',
    description: 'Get notifications about this influencer\'s token progress',
    tips: 'Stay informed about price changes and important announcements'
  },
  'gift-button': {
    title: 'Gift Tokens',
    description: 'Send tokens to other users as gifts or rewards',
    tips: 'Great way to introduce friends to your favorite influencer tokens'
  },

  // Data & Stats
  'price-display': {
    title: 'Token Price',
    description: 'Current market price of this influencer token',
    tips: 'Updates in real-time during trading hours'
  },
  'volume-display': {
    title: 'Trading Volume',
    description: '24-hour trading volume showing market activity',
    tips: 'Higher volume indicates more active trading and liquidity'
  },
  'market-cap': {
    title: 'Market Capitalization',
    description: 'Total value of all tokens in circulation',
    tips: 'Calculated as: Current Price × Circulating Supply'
  },
  'holder-count': {
    title: 'Token Holders',
    description: 'Number of unique wallets holding this token',
    tips: 'More holders typically indicates stronger community support'
  },
  'followers-count': {
    title: 'Follower Count',
    description: 'Social media followers of this influencer',
    tips: 'Larger following may correlate with token demand'
  },

  // Forms & Inputs
  'amount-input': {
    title: 'Investment Amount',
    description: 'Enter how much ETH or USDC you want to invest',
    tips: 'Start small if you\'re new to crypto investing'
  },
  'currency-selector': {
    title: 'Currency Selection',
    description: 'Choose between ETH or USDC for your investment',
    tips: 'USDC is a stable coin, ETH value fluctuates with the market'
  },
  'search-input': {
    title: 'Search Function',
    description: 'Find specific influencers or tokens quickly',
    tips: 'Search by name, symbol, or category to find what you\'re looking for'
  },

  // Dashboard Elements
  'portfolio-value': {
    title: 'Portfolio Value',
    description: 'Total current value of all your token holdings',
    tips: 'Updates in real-time as token prices change'
  },
  'profit-loss': {
    title: 'Profit & Loss',
    description: 'How much you\'ve gained or lost on your investments',
    tips: 'Green = profit, Red = loss. Remember: only a loss if you sell!'
  },
  'holdings-table': {
    title: 'Your Holdings',
    description: 'Detailed view of all your token investments',
    tips: 'Click on any holding to view detailed performance and trading options'
  },

  // Charts & Graphs
  'price-chart': {
    title: 'Price Chart',
    description: 'Visual representation of token price movement over time',
    tips: 'Use different timeframes to analyze short and long-term trends'
  },
  'performance-chart': {
    title: 'Performance Chart',
    description: 'Shows how your investment has performed over time',
    tips: 'Look for trends to make informed decisions about buying or selling'
  },

  // Footer & Legal
  'footer': {
    title: 'Site Footer',
    description: 'Important links, legal information, and platform details',
    tips: 'Find terms of service, privacy policy, and contact information here'
  },
  'social-links': {
    title: 'Social Media',
    description: 'Follow CoinFluence on social platforms for updates',
    tips: 'Get the latest news, tips, and community discussions'
  },

  // Admin specific
  'admin-button': {
    title: 'Admin Function',
    description: 'Administrative function for managing the platform',
    tips: 'Only available to platform administrators'
  },
  'create-card-button': {
    title: 'Create Influencer Card',
    description: 'Create a new influencer marketing card for the platform',
    tips: 'This creates the initial card that appears on the pre-invest page'
  },
  'deploy-token-button': {
    title: 'Deploy Token',
    description: 'Deploy an actual blockchain token for an approved influencer',
    tips: 'This creates a real ERC-20 token that can be traded'
  },

  // Default fallback
  'default': {
    title: 'Interactive Element',
    description: 'This element is part of the CoinFluence platform interface',
    tips: 'Hover over different elements to learn more about how they work'
  }
};

// Visit tracking utilities
const STORAGE_KEY = 'coinfluence-robot-visits';
const ROBOT_STATE_KEY = 'coinfluence-robot-state';

const getVisitCount = (): number => {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || '0');
  } catch {
    return 0;
  }
};

const incrementVisitCount = (): number => {
  try {
    const current = getVisitCount();
    localStorage.setItem(STORAGE_KEY, String(current + 1));
    return current + 1;
  } catch {
    return 1;
  }
};

interface RobotState {
  isMinimized: boolean;
  hasSeenIntro: boolean;
}

const getRobotState = (): RobotState => {
  try {
    const state = localStorage.getItem(ROBOT_STATE_KEY);
    return state ? JSON.parse(state) : { isMinimized: false, hasSeenIntro: false };
  } catch {
    return { isMinimized: false, hasSeenIntro: false };
  }
};

const saveRobotState = (state: RobotState): void => {
  try {
    localStorage.setItem(ROBOT_STATE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

interface ComponentInfo {
  title: string;
  description: string;
  tips: string;
}

const CoinFluenceRobot: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<ComponentInfo | null>(null);
  const [visitCount, setVisitCount] = useState(0);
  const [robotState, setRobotState] = useState<RobotState>({ isMinimized: false, hasSeenIntro: false });
  const [showIntro, setShowIntro] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize on mount
  useEffect(() => {
    const visits = incrementVisitCount();
    const savedState = getRobotState();
    
    setVisitCount(visits);
    setRobotState(savedState);
    
    // Auto-show for first 3 visits
    if (visits <= 3) {
      setIsVisible(true);
      setIsMinimized(false);
      if (!savedState.hasSeenIntro) {
        setShowIntro(true);
        const introTimer = setTimeout(() => setShowIntro(false), 8000); // Hide intro after 8 seconds
        saveRobotState({ ...savedState, hasSeenIntro: true });
        return () => clearTimeout(introTimer);
      }
    } else {
      // For veteran users, start minimized
      setIsVisible(true);
      setIsMinimized(savedState.isMinimized !== false); // Default to minimized for veterans
    }

    // Add global mouse move listener
    const handleMouseMove = (e: MouseEvent) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Get element under cursor
      const element = e.target as HTMLElement;
      const info = getElementInfo(element);
      
      if (info) {
        setCurrentInfo(info);
        timeoutRef.current = setTimeout(() => {
          setCurrentInfo(null);
        }, 3000); // Hide after 3 seconds of no movement
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Get information for element
  const getElementInfo = (element: HTMLElement): ComponentInfo | null => {
    // Check for data attributes first
    const dataInfo = element.getAttribute('data-robot-info');
    if (dataInfo && COMPONENT_INFO[dataInfo as keyof typeof COMPONENT_INFO]) {
      return COMPONENT_INFO[dataInfo as keyof typeof COMPONENT_INFO];
    }

    // Check parent elements for data attributes
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentInfo = parent.getAttribute('data-robot-info');
      if (parentInfo && COMPONENT_INFO[parentInfo as keyof typeof COMPONENT_INFO]) {
        return COMPONENT_INFO[parentInfo as keyof typeof COMPONENT_INFO];
      }
      parent = parent.parentElement;
    }

    // Check class names for common patterns
    const className = element.className?.toString() || '';
    const classList = className.split(' ');

    for (const cls of classList) {
      if (cls.includes('button') || cls.includes('btn')) {
        if (cls.includes('primary') || cls.includes('cta')) return COMPONENT_INFO['cta-button'];
        if (cls.includes('wallet')) return COMPONENT_INFO['wallet-button'];
        if (cls.includes('trade')) return COMPONENT_INFO['trade-button'];
        if (cls.includes('pledge')) return COMPONENT_INFO['pledge-button'];
      }
      if (cls.includes('card')) {
        if (cls.includes('influencer')) return COMPONENT_INFO['influencer-card'];
        if (cls.includes('coin')) return COMPONENT_INFO['coin-card'];
      }
      if (cls.includes('progress')) return COMPONENT_INFO['progress-bar'];
      if (cls.includes('badge')) return COMPONENT_INFO['status-badge'];
      if (cls.includes('price')) return COMPONENT_INFO['price-display'];
      if (cls.includes('volume')) return COMPONENT_INFO['volume-display'];
    }

    // Check for semantic elements
    const tagName = element.tagName?.toLowerCase();
    if (tagName === 'button') return COMPONENT_INFO['cta-button'];
    if (tagName === 'input') return COMPONENT_INFO['amount-input'];
    if (tagName === 'header') return COMPONENT_INFO['header'];
    if (tagName === 'footer') return COMPONENT_INFO['footer'];

    // Check for specific text content
    const textContent = element.textContent?.toLowerCase() || '';
    if (textContent.includes('connect wallet')) return COMPONENT_INFO['wallet-button'];
    if (textContent.includes('sign in')) return COMPONENT_INFO['sign-in-button'];
    if (textContent.includes('dashboard')) return COMPONENT_INFO['dashboard-button'];
    if (textContent.includes('pre-invest')) return COMPONENT_INFO['pre-invest-button'];
    if (textContent.includes('trade now')) return COMPONENT_INFO['trade-button'];
    if (textContent.includes('show interest')) return COMPONENT_INFO['pledge-button'];
    if (textContent.includes('create')) return COMPONENT_INFO['create-card-button'];
    if (textContent.includes('deploy')) return COMPONENT_INFO['deploy-token-button'];

    return null;
  };

  const toggleMinimized = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    const newState = { ...robotState, isMinimized: newMinimized };
    setRobotState(newState);
    saveRobotState(newState);
  };

  const dismissRobot = () => {
    setIsVisible(false);
  };

  const getRobotMessage = (): ComponentInfo => {
    if (showIntro) {
      return {
        title: visitCount === 1 ? "Welcome to CoinFluence! 🚀" : `Welcome back! (Visit #${visitCount})`,
        description: visitCount === 1 
          ? "I'm your crypto investing assistant! Hover over any element to learn what it does. I'll help guide you through the platform."
          : "I'm here to help! Hover over elements to see what they do. After 3 visits, I'll be less intrusive but always available.",
        tips: "Click the minimize button to hide me, or the X to dismiss me completely."
      };
    }

    if (currentInfo) {
      return currentInfo;
    }

    if (visitCount <= 3) {
      return {
        title: "Crypto Investment Helper 🤖",
        description: "Hover over buttons, cards, and other elements to learn what they do!",
        tips: `Visit ${visitCount} of 3 - I'll be less chatty after this 😊`
      };
    }

    return {
      title: "Investment Assistant",
      description: "Hover over elements for helpful tips and explanations.",
      tips: "Click me anytime you need help navigating the platform!"
    };
  };

  // Always visible, but minimized when isMinimized is true
  // if (!isVisible) return null;

  const message = getRobotMessage();
  const isVeteranUser = visitCount > 3;

  return (
    <div className={`fixed z-50 transition-all duration-300 ease-in-out ${
      isMinimized 
        ? 'bottom-4 right-4' 
        : 'bottom-4 right-4'
    }`}>
      {/* Main Robot Container */}
      <div className={`bg-gradient-to-br from-primary/90 to-green-500/90 backdrop-blur-md border border-primary/30 rounded-2xl shadow-2xl transition-all duration-300 ${
        isMinimized 
          ? 'w-14 h-14 cursor-pointer hover:scale-110' 
          : 'w-80 max-w-[90vw]'
      }`}>
        
        {isMinimized ? (
          // Minimized State
          <div 
            onClick={toggleMinimized}
            className="w-full h-full flex items-center justify-center group"
          >
            <Bot className="w-7 h-7 text-black group-hover:animate-bounce" />
            {currentInfo && (
              <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
        ) : (
          // Expanded State
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-black" />
                </div>
                <span className="font-semibold text-black text-sm">
                  CF Assistant
                </span>
                {isVeteranUser && (
                  <span className="text-xs bg-black/20 text-black px-2 py-1 rounded-full">
                    Veteran User
                  </span>
                )}
              </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMinimized}
                className="w-6 h-6 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center transition-colors"
                title="Minimize"
              >
                <EyeOff className="w-3 h-3 text-black" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="font-bold text-black text-sm flex items-center gap-1">
              {message.title}
              {currentInfo && <Sparkles className="w-3 h-3" />}
            </h3>
            <p className="text-black/80 text-xs leading-relaxed">
              {message.description}
            </p>
            {message.tips && (
              <div className="bg-black/10 rounded-lg p-2 mt-2">
                <p className="text-black/70 text-xs font-medium flex items-start gap-1">
                  <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {message.tips}
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats for veteran users */}
          {isVeteranUser && !currentInfo && (
            <div className="mt-3 pt-3 border-t border-black/20">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 text-black/70">
                  <Eye className="w-3 h-3" />
                  <span>Visit #{visitCount}</span>
                </div>
                <div className="flex items-center gap-1 text-black/70">
                  <HelpCircle className="w-3 h-3" />
                  <span>Helper Mode</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
)};

// Utility function for easy integration
export const addRobotInfo = (infoKey: string) => ({
  'data-robot-info': infoKey
});

// HOC for wrapping components
export const withRobotInfo = <P extends object>(
  Component: React.ComponentType<P>, 
  infoKey: string
) => {
  return (props: P) => (
    <div data-robot-info={infoKey}>
      <Component {...props} />
    </div>
  );
}; 

export default CoinFluenceRobot;
