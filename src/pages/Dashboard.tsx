// src/pages/Dashboard.tsx - Fixed dashboard router
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Dashboard Router - Routes users to their appropriate dashboard based on status
 * This acts as a smart router that determines which dashboard to show
 */
const Dashboard = () => {
  const { databaseUser, firebaseUser, loading } = useAuth();

  useEffect(() => {
    console.log("Dashboard Router - User status:", databaseUser?.status);
    console.log("Dashboard Router - Firebase user:", !!firebaseUser);
    console.log("Dashboard Router - Database user:", !!databaseUser);
  }, [databaseUser, firebaseUser]);

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!firebaseUser) {
    return <Navigate to="/signin" replace />;
  }

  // If Firebase user exists but no database user, show loading
  // This handles the brief moment between Firebase auth and database sync
  if (!databaseUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Route based on user status
  switch (databaseUser.status) {
    case 'admin':
      console.log("Redirecting to admin dashboard");
      return <Navigate to="/dashboard/admin" replace />;
    
    case 'influencer':
      console.log("Redirecting to influencer dashboard");
      return <Navigate to="/dashboard/influencer" replace />;
    
    case 'investor':
      console.log("Redirecting to investor dashboard");
      return <Navigate to="/dashboard/investor" replace />;
    
    case 'browser':
    default:
      console.log("Browser user - showing upgrade options");
      // For browser users, show an upgrade page instead of redirecting away
      return <BrowserDashboard />;
  }
};

// Component for browser users to upgrade their status
const BrowserDashboard = () => {
  const { databaseUser } = useAuth();
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Welcome to CoinFluence!</h1>
          <p className="text-gray-400 text-lg">
            Hello {databaseUser?.display_name || 'there'}! You're currently browsing with basic access.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Investor Option */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Become an Investor</h3>
            <p className="text-gray-400 mb-4">
              Invest in promising influencers and profit from their success.
            </p>
            <button 
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors"
              onClick={() => window.location.href = '/pre-invest'}
            >
              Start Investing
            </button>
          </div>

          {/* Influencer Option */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Become an Influencer</h3>
            <p className="text-gray-400 mb-4">
              Launch your own token and monetize your influence.
            </p>
            <button 
              className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-lg transition-colors"
              onClick={() => alert('Influencer applications coming soon! Join our waitlist.')}
            >
              Apply Now
            </button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">
            Need help choosing? Contact our support team.
          </p>
          <button 
            className="text-primary hover:underline"
            onClick={() => window.location.href = '/#about'}
          >
            Learn More About CoinFluence
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;