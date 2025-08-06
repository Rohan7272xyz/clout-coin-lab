// src/components/ui/header.tsx - Updated to use both wallet and auth states
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/lib/auth/auth-context";
import { useAccount, useDisconnect } from "wagmi";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, User, LogOut } from "lucide-react";
import { useState, useEffect } from "react";

const Header = () => {
  const { firebaseUser, databaseUser, loading, signOut } = useAuth();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      disconnect(); // Also disconnect wallet
      setShowUserMenu(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Auto-close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showUserMenu && !target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-center">
        <div className="flex items-center gap-x-14 mx-auto">

        <Link to="/" className="flex items-center space-x-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
          <span className="text-xl font-bold group-hover:underline">CoinFluence</span>
        </Link>
        
        <nav className="hidden md:flex items-center space-x-12">
          <Link to="/trending" className="text-gray-light hover:text-foreground transition-colors">
            Trending
          </Link>
          <Link to="/#how-it-works" className="text-gray-light hover:text-foreground transition-colors">
            How it Works
          </Link>
          <Link to="/#about" className="text-gray-light hover:text-foreground transition-colors">
            About
          </Link>
        </nav>
        
        <div className="flex items-center gap-6">
          {/* RainbowKit Connect Button - Always show this for wallet connection */}
          <ConnectButton.Custom>
            {({ 
              account, 
              chain, 
              openAccountModal, 
              openChainModal, 
              openConnectModal, 
              authenticationStatus, 
              mounted 
            }) => {
              // Make sure the component is mounted and ready
              const ready = mounted && authenticationStatus !== 'loading';
              const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    'style': {
                      opacity: 0,
                      pointerEvents: 'none',
                      userSelect: 'none',
                    },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <Button
                          variant="wallet"
                          size="lg"
                          className="px-6 py-2 font-semibold"
                          onClick={openConnectModal}
                          type="button"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Connect Wallet
                        </Button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <Button
                          variant="destructive"
                          size="lg"
                          className="px-6 py-2 font-semibold"
                          onClick={openChainModal}
                          type="button"
                        >
                          Wrong network
                        </Button>
                      );
                    }

                    return (
                      <Button
                        variant="wallet"
                        size="lg"
                        className="px-6 py-2 font-semibold"
                        onClick={openAccountModal}
                        type="button"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Wallet Connected
                      </Button>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
          
          {/* Authentication Section - Show user info if signed in */}
          {loading ? (
            <Button variant="outline" size="lg" className="px-6 py-2 font-semibold" disabled>
              Loading...
            </Button>
          ) : firebaseUser ? (
            // User is signed in - show user menu
            <div className="relative user-menu-container">
              <Button
                variant="outline"
                size="lg"
                className="px-6 py-2 font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground neon-glow flex items-center gap-2"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <User className="w-4 h-4" />
                {databaseUser?.display_name || firebaseUser.email?.split('@')[0] || 'User'}
              </Button>
              
              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
                  <div className="p-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">
                      {databaseUser?.display_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-light">
                      {firebaseUser.email}
                    </p>
                    {isConnected && (
                      <p className="text-xs text-primary mt-1">
                        Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
                      </p>
                    )}
                  </div>
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left hover:bg-red-500/10 hover:text-red-500"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // User is not signed in - show sign in button
            <Button
              variant="outline"
              size="lg"
              className="px-6 py-2 font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground neon-glow"
              asChild
            >
              <Link to="/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};

export default Header;