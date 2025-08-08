// src/components/ui/header.tsx
// Updated Header component with conditional Dashboard link based on user status

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, Home, TrendingUp, Users, MessageCircle, BarChart3 } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { firebaseUser, databaseUser, signOut } = useAuth();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Determine if user should see Dashboard link
  // Only show Dashboard for users with investor status or higher (not browser users)
  const shouldShowDashboard = databaseUser && 
    databaseUser.status && 
    ['investor', 'influencer', 'admin'].includes(databaseUser.status);

  // Determine if user should see admin-only features
  const shouldShowAdminFeatures = databaseUser?.status === 'admin';

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Trending", href: "/trending", icon: TrendingUp },
    { name: "Influencers", href: "/influencers", icon: Users },
    { name: "Pre-Invest", href: "/pre-invest", icon: MessageCircle },
    // Conditionally include Dashboard link
    ...(shouldShowDashboard ? [
      { name: "Dashboard", href: "/dashboard", icon: BarChart3 }
    ] : []),
    // Conditionally include Admin features
    ...(shouldShowAdminFeatures ? [
      { name: "Token Factory", href: "/admin/token-factory", icon: BarChart3 }
    ] : [])
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-md border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-bold text-white">CoinFluence</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-gray-300 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Side - Auth & Wallet */}
          <div className="hidden md:flex items-center space-x-4">
            {firebaseUser ? (
              <div className="flex items-center space-x-3">
                {/* User Status Badge */}
                {databaseUser?.status && (
                  <div className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                    {databaseUser.status === 'admin' && '👑 Admin'}
                    {databaseUser.status === 'influencer' && '🌟 Influencer'}
                    {databaseUser.status === 'investor' && '💰 Investor'}
                    {databaseUser.status === 'browser' && '👀 Browser'}
                  </div>
                )}
                
                {/* User Info */}
                <div className="text-right">
                  <div className="text-sm font-medium text-white">
                    {databaseUser?.display_name || firebaseUser.email}
                  </div>
                  {databaseUser?.status !== 'browser' && (
                    <div className="text-xs text-gray-400">
                      {databaseUser?.email}
                    </div>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => navigate('/signin')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Sign In
              </Button>
            )}
            
            <ConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-800"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4">
            <div className="flex flex-col space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-left transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-gray-300 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </button>
                );
              })}
              
              {/* Mobile Auth Section */}
              <div className="pt-4 border-t border-gray-800">
                {firebaseUser ? (
                  <div className="space-y-3">
                    {/* User Status Badge */}
                    {databaseUser?.status && (
                      <div className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700 w-fit">
                        {databaseUser.status === 'admin' && '👑 Admin'}
                        {databaseUser.status === 'influencer' && '🌟 Influencer'}
                        {databaseUser.status === 'investor' && '💰 Investor'}
                        {databaseUser.status === 'browser' && '👀 Browser'}
                      </div>
                    )}
                    
                    <div className="text-sm text-white">
                      {databaseUser?.display_name || firebaseUser.email}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSignOut}
                      className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
                    >
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      navigate('/signin');
                      setIsMenuOpen(false);
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Sign In
                  </Button>
                )}
                
                <div className="mt-3">
                  <ConnectButton />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;