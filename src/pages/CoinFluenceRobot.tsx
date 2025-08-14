import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot } from 'lucide-react';

// CSS Variables for CoinFluence theme
const cfTheme = {
  '--cf-bg': '#0b0f10',
  '--cf-surface': '#0f1417',
  '--cf-grid': 'rgba(255,255,255,0.04)',
  '--cf-green': '#22e384',
  '--cf-green-2': '#13c36b',
  '--cf-text': '#e9f4ee',
  '--cf-muted': '#9fb6ac',
  '--cf-border': 'rgba(255,255,255,0.08)',
  '--cf-shadow': '0 10px 30px rgba(34,227,132,0.15)'
};

// Tip registry - maps selectors to tip content
const CF_TIP_REGISTRY = [
  { selector: 'button[data-cf-tip]', tip: null }, // Will use data-cf-tip value
  { selector: '.btn-primary', tip: 'Click to proceed.' },
  { selector: '.btn-secondary', tip: 'This is a secondary action that provides an alternative option for users.' },
  { selector: '[href*="pre-invest"]', tip: 'Access early investment opportunities in upcoming influencer tokens before they go live.' },
  { selector: '[href*="influencers"]', tip: 'Browse all available influencer tokens and investment opportunities.' },
  { selector: '[href*="about"]', tip: 'Learn about CoinFluence and how the platform works.' },
  { selector: 'button[aria-label*="Connect"]', tip: 'Connect your crypto wallet to start investing.' },
  { selector: 'button[aria-label*="Sign"]', tip: 'Sign in to access your portfolio and saved preferences.' },
  { selector: '.trade-button', tip: 'Buy or sell this influencer token on the live market with real-time pricing.' },
  { selector: '.pledge-button', tip: 'Show interest in this upcoming token before launch.' },
  { selector: '.follow-button', tip: 'Get notifications about this influencer\'s updates.' },
  { selector: '.wallet-button', tip: 'Connect wallet to fund trades and access features.' }
];

const CoinFluenceRobot: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [justMinimized, setJustMinimized] = useState(false);
  const [currentTip, setCurrentTip] = useState('');
  const [visitCount, setVisitCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showContent, setShowContent] = useState(false);
  const [isContentFadingOut, setIsContentFadingOut] = useState(false);
  
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const graceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentHoveredElement = useRef<Element | null>(null);
  const currentTypingText = useRef<string>(''); // Track what we're currently typing

  // Visit tracking
  useEffect(() => {
    const LS_VISITS = 'cf_visit_count';
    const SS_STATE = 'cf_bot_state';
    
    // Increment visit count
    const visits = parseInt(localStorage.getItem(LS_VISITS) || '0') + 1;
    localStorage.setItem(LS_VISITS, String(visits));
    setVisitCount(visits);
    
    // Determine initial state
    const sessionState = sessionStorage.getItem(SS_STATE);
    const shouldAutoMinimize = visits >= 3;
    const startExpanded = sessionState 
      ? sessionState === 'expanded' 
      : !shouldAutoMinimize;
    
    setIsExpanded(startExpanded);
  }, []);

  // Improved typing animation with better error handling
  const typeText = useCallback((text: string) => {
    if (!text || text.trim() === '') {
      setIsTyping(false);
      setTypedText('');
      return;
    }
    
    // Clear any existing typing animation first
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    
    // Update tracking ref
    currentTypingText.current = text;
    
    // Reset typing state
    setIsTyping(true);
    setTypedText('');
    
    // Improved timing calculation
    const maxMs = Math.min(1200, 100 * text.length); // Slightly slower max
    const minCps = 8; // Minimum characters per second
    const maxCps = 15; // Maximum characters per second
    const cps = Math.max(minCps, Math.min(maxCps, Math.floor(text.length / (maxMs / 1000))));
    const delay = Math.max(50, 1000 / cps); // Minimum 50ms delay between characters
    
    let charIndex = 0;
    
    const typeNextChar = () => {
      // Safety checks to prevent freezing
      if (!typingTimerRef.current) return;
      if (currentTypingText.current !== text) return; // Text changed, abort
      if (charIndex >= text.length) {
        // Finished typing
        setTypedText(text);
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTyping(false);
        return;
      }
      
      // Type next character
      charIndex++;
      const newText = text.slice(0, charIndex);
      setTypedText(newText);
      
      // Check if we're done
      if (charIndex >= text.length) {
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        setIsTyping(false);
      }
    };
    
    // Start the typing animation
    typingTimerRef.current = setInterval(typeNextChar, delay);
  }, []);

  const clearTip = useCallback(() => {
    // Clear the timer first
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    
    // Clear typing text reference
    currentTypingText.current = '';
    
    // Start graceful fade-out but keep width until animation completes
    setShowContent(false);
    setIsContentFadingOut(true);
    
    // Reset text state after fade-out completes
    setTimeout(() => {
      setCurrentTip('');
      setTypedText('');
      setIsTyping(false);
      
      // Wait a bit more for width transition to complete before resetting fade state
      setTimeout(() => {
        setIsContentFadingOut(false);
      }, 300); // Match width transition duration
    }, 200); // Match the content fade transition duration
  }, []);

  // Get tip for element
  const getTipFor = useCallback((element: Element | null): string | null => {
    if (!element) return null;
    
    // Check data attribute first
    const dataTip = element.getAttribute('data-cf-tip');
    if (dataTip) return dataTip;
    
    // Check registry
    for (const entry of CF_TIP_REGISTRY) {
      if (element.matches(entry.selector)) {
        return entry.tip;
      }
    }
    
    return null;
  }, []);

  // Check if element is interactive
  const isInteractiveElement = useCallback((element: Element | null): boolean => {
    return element !== null && (
      element.tagName === 'BUTTON' ||
      element.getAttribute('role') === 'button' ||
      element.classList.contains('btn') ||
      element.tagName === 'A' ||
      element.hasAttribute('onclick') ||
      (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1')
    );
  }, []);

  // Event handlers with smooth transitions
  const handleMouseEnter = useCallback((event: Event) => {
    const element = (event.target as Element).closest('button, [role="button"], .btn, a, [data-cf-tip]');
    
    if (!element || !isInteractiveElement(element)) return;
    
    const tip = getTipFor(element);
    if (!tip) return;
    
    // Store the current element
    currentHoveredElement.current = element;
    
    // Clear ALL existing timers to prevent conflicts
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (graceTimerRef.current) {
      clearTimeout(graceTimerRef.current);
      graceTimerRef.current = null;
    }
    
    // Debounced tip show
    debounceTimerRef.current = setTimeout(() => {
      // Only proceed if this element is still hovered and bot is expanded
      if (currentHoveredElement.current === element && isExpanded) {
        // Stop any existing typing animation
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        
        // Clear typing text reference
        currentTypingText.current = '';
        
        // Set new content and start animation
        setCurrentTip(tip);
        setShowContent(true);
        setIsContentFadingOut(false);
        
        // Small delay to ensure state is set before typing starts
        setTimeout(() => {
          typeText(tip);
        }, 10);
      }
    }, 150); // Slightly increased debounce to reduce rapid changes
  }, [getTipFor, isInteractiveElement, typeText, isExpanded]);

  const handleMouseLeave = useCallback((event: Event) => {
    const element = (event.target as Element).closest('button, [role="button"], .btn, a, [data-cf-tip]');
    
    // Only clear if we're leaving the currently tracked element
    if (currentHoveredElement.current === element) {
      currentHoveredElement.current = null;
      
      // Clear any pending enter timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      
      // Grace period before clearing (but clear any existing grace timer first)
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
      }
      
      graceTimerRef.current = setTimeout(() => {
        // Only clear if no element is currently hovered
        if (!currentHoveredElement.current) {
          clearTip();
        }
        graceTimerRef.current = null;
      }, 200); // Slightly longer grace period
    }
  }, [clearTip]);

  // Focus handlers for accessibility
  const handleFocusIn = useCallback((event: Event) => {
    handleMouseEnter(event);
  }, [handleMouseEnter]);

  const handleFocusOut = useCallback((event: Event) => {
    handleMouseLeave(event);
  }, [handleMouseLeave]);

  // Event delegation with comprehensive cleanup
  useEffect(() => {
    document.addEventListener('mouseover', handleMouseEnter, true);
    document.addEventListener('mouseout', handleMouseLeave, true);
    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);
    
    return () => {
      document.removeEventListener('mouseover', handleMouseEnter, true);
      document.removeEventListener('mouseout', handleMouseLeave, true);
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
      
      // Comprehensive cleanup to prevent memory leaks and race conditions
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      
      // Reset tracking refs
      currentHoveredElement.current = null;
      currentTypingText.current = '';
    };
  }, [handleMouseEnter, handleMouseLeave, handleFocusIn, handleFocusOut]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      sessionStorage.setItem('cf_bot_state', next ? 'expanded' : 'minimized');
      if (!next) {
        setJustMinimized(true);
        setTimeout(() => setJustMinimized(false), 600); // match new slower animation duration
      }
      return next;
    });
    // Clear everything when minimizing
    clearTip();
    currentHoveredElement.current = null;
    currentTypingText.current = '';
    setShowContent(false);
    setIsContentFadingOut(false);
    
    // Focus management for accessibility
    if (!isExpanded) {
      setTimeout(() => {
        const panel = document.getElementById('cf-assistant-panel');
        panel?.focus();
      }, 200);
    }
  }, [clearTip, isExpanded]);

  // Apply theme variables
  useEffect(() => {
    Object.entries(cfTheme).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, []);

  const shouldShowPulse = visitCount <= 2 && !isExpanded;
  const isVeteranUser = visitCount >= 3;

  return (
    <div 
      className="fixed bottom-6 right-6 z-[9999]"
      style={{ 
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {isExpanded ? (
        // Expanded Panel
        <div 
          className="rounded-2xl border overflow-hidden will-change-transform"
          style={{
            background: 'var(--cf-surface)',
            borderColor: 'var(--cf-border)',
            boxShadow: 'var(--cf-shadow)',
            transformOrigin: 'bottom right',
            animation: 'expandIn 260ms cubic-bezier(0.2, 0.9, 0.2, 1)',
            transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            // Fixed width approach - calculate based on content
            width: currentTip ? 
              `${Math.min(420, Math.max(320, currentTip.length * 8 + 80))}px` : 
              '360px',
            maxWidth: 'min(420px, calc(100vw - 32px))'
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-3.5 py-3 border-b"
            style={{
              borderColor: 'var(--cf-border)'
            }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center border"
                style={{
                  background: 'linear-gradient(180deg, var(--cf-surface), #0a1012)',
                  borderColor: 'var(--cf-border)'
                }}
              >
                <Bot className="w-5 h-5" style={{ color: 'var(--cf-green)' }} />
              </div>
              <span 
                className="font-semibold text-sm"
                style={{ color: 'var(--cf-text)' }}
              >
                CF Assistant
              </span>
              {isVeteranUser && (
                <span 
                  className="text-xs px-2 py-1 rounded-full border text-[10px]"
                  style={{
                    color: 'var(--cf-green)',
                    borderColor: 'rgba(34, 227, 132, 0.3)',
                    background: 'rgba(34, 227, 132, 0.1)'
                  }}
                >
                  Expert Mode
                </span>
              )}
            </div>
            <button
              onClick={toggleExpanded}
              className="w-6 h-6 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'var(--cf-text)'
              }}
              aria-label="Minimize assistant"
            >
              –
            </button>
          </div>
          
          {/* Content */}
          <div 
            className="px-3.5 py-3.5 min-h-[64px] flex items-start gap-1.5"
            style={{ 
              background: 'var(--cf-surface)'
            }}
          >
            <div className="flex-1 min-w-0">
              {currentTip ? (
                <div 
                  className={`text-sm leading-5 transition-all duration-200 ease-in-out ${
                    showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                  }`}
                  style={{ 
                    color: 'var(--cf-text)',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}
                >
                  {typedText}
                  {isTyping && (
                    <span 
                      className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
                      style={{ background: 'var(--cf-green)' }}
                    />
                  )}
                </div>
              ) : (
                <div 
                  className={`text-sm transition-all duration-200 ease-in-out ${
                    showContent ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
                  }`}
                  style={{ color: 'var(--cf-muted)' }}
                >
                  {isVeteranUser 
                    ? 'Hover over buttons and elements for helpful tips.'
                    : 'Hover over buttons to learn what they do!'
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Minimized Button
        <button
          onClick={toggleExpanded}
          className={`w-14 h-14 rounded-full border flex items-center justify-center hover:scale-105 transition-all duration-200 ${
            shouldShowPulse ? 'animate-pulse' : ''
          } ${justMinimized ? 'cf-minimize-anim' : ''}`}
          style={{
            background: 'linear-gradient(180deg, var(--cf-surface), #0a1012)',
            borderColor: 'var(--cf-border)',
            boxShadow: 'var(--cf-shadow)'
          }}
          aria-label="Open assistant"
          aria-expanded="false"
        >
          <Bot className="w-7 h-7" style={{ color: 'var(--cf-green)' }} />
          {currentTip && (
            <div 
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
              style={{ background: '#ef4444' }}
            />
          )}
        </button>
      )}
      
      <style>{`
        @keyframes expandIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes cfMinimize {
          0% {
            opacity: 0;
            transform: scale(0.94) translateY(4px);
          }
          60% {
            opacity: 1;
            transform: scale(1.005) translateY(-0.5px);
          }
          85% {
            opacity: 1;
            transform: scale(0.998) translateY(0.2px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .cf-minimize-anim {
          animation: cfMinimize 600ms cubic-bezier(0.25, 0.46, 0.45, 0.84);
        }
        
        @media (prefers-reduced-motion: reduce) {
          * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CoinFluenceRobot;