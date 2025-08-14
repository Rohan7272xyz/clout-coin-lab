// src/components/ui/header.tsx - Fixed structure
// Navbar updated: Added Influencers and About links
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAuth } from "@/lib/auth/auth-context";
import { useAccount, useDisconnect } from "wagmi";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, User, LogOut, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";

const Header = () => {
  const { firebaseUser, databaseUser, loading, signOut } = useAuth();
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
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

  const handleDashboardClick = () => {
    if (!firebaseUser) {
      // If not signed in, go to sign in page
      navigate('/signin');
      return;
    }

    // If signed in, go to the dashboard (it will route based on user status)
    navigate('/dashboard');
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

  // Add Influencers and About to the main nav
  const navLinks = [
    { name: 'Influencers', to: '/influencers' },
    { name: 'About', to: '/about' },
  ];

  // Get user menu button styling based on status
  const getUserMenuButtonStyle = () => {
    const baseClasses = "px-4 py-2 font-semibold flex items-center gap-2";
    
    if (databaseUser?.status === 'admin') {
      // Admin gets red/crown styling
      return `${baseClasses} border-red-500 text-red-500 hover:bg-red-500 hover:!text-black [&>svg]:hover:!text-black border-2`;
    } else {
      // All other statuses get primary green styling to match site colors
      return `${baseClasses} border-primary text-primary hover:bg-primary hover:!text-black [&>svg]:hover:!text-black neon-glow border-2`;
    }
  };

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center gap-10 max-w-6xl mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 h-12" data-cf-tip="Return to the CoinFluence homepage." aria-label="Go to homepage">
            <img
              src="/20250805_1007_Modern Coinfluence Logo_simple_compose_01k1x8x0hheaaraepnewcd4d46.png"
              alt="CoinFluence Logo"
              className="w-16 h-16 object-contain drop-shadow-md"
              style={{ 
                imageRendering: 'crisp-edges',
              }}
            />
            <span className="text-xl font-bold group-hover:underline">CoinFluence</span>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-lg font-semibold text-gray-200 hover:text-primary transition-colors px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {link.name}
              </Link>
            ))}
          </nav>
          
          {/* Buttons Container */}
          <div className="flex items-center gap-6">
            {/* Dashboard button */}
            {firebaseUser && (
              <Button
                variant="outline"
                size="lg"
                className="px-4 py-2 font-semibold border-primary text-primary hover:bg-primary hover:!text-black [&>svg]:hover:!text-black neon-glow border-2"
                onClick={handleDashboardClick}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            )}

            {/* RainbowKit Connect Button */}
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
                            className="px-4 py-2 font-semibold hover:!text-black [&>svg]:hover:!text-black"
                            onClick={openConnectModal}
                            type="button"
                            data-cf-tip="Connect your crypto wallet to start investing."
                            aria-label="Connect Wallet"
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
                            className="px-4 py-2 font-semibold"
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
                          className="px-4 py-2 font-semibold hover:!text-black [&>svg]:hover:!text-black"
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
            
            {/* Authentication Section */}
            {loading ? (
              <Button variant="outline" size="lg" className="px-4 py-2 font-semibold" disabled>
                Loading...
              </Button>
            ) : firebaseUser ? (
              // User is signed in - show user menu with status-based styling
              <div className="relative user-menu-container">
                <Button
                  variant="outline"
                  size="lg"
                  className={getUserMenuButtonStyle()}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <User className="w-4 h-4" />
                  {databaseUser?.display_name || firebaseUser.email?.split('@')[0] || 'User'}
                  {databaseUser?.status && (
                    <span className={`text-xs px-2 py-1 rounded-full ml-1 ${
                      databaseUser.status === 'admin' 
                        ? 'bg-red-500/20 border border-red-500/30' 
                        : 'bg-primary/20 border border-primary/30'
                    }`}>
                      {databaseUser.status}
                    </span>
                  )}
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
                      <p className={`text-xs mt-1 capitalize font-medium ${
                        databaseUser?.status === 'admin' ? 'text-red-400' : 'text-primary'
                      }`}>
                        Status: {databaseUser?.status || 'browser'}
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
                        className="w-full justify-start text-left hover:bg-primary/10"
                        onClick={() => {
                          handleDashboardClick();
                          setShowUserMenu(false);
                        }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
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
                className="px-4 py-2 font-semibold border-primary text-primary hover:bg-primary hover:!text-black neon-glow"
                asChild
                data-cf-tip="Sign in to access your portfolio and saved preferences."
                aria-label="Sign In"
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