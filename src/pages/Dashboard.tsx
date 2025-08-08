// src/pages/Dashboard.tsx - Updated for new user flow
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";
import Header from "@/components/ui/header";

/**
 * Dashboard Router - Routes users to their appropriate dashboard based on status
 * This acts as a smart router that determines which dashboard to show
 */
const Dashboard = () => {
  const { databaseUser, loading, firebaseUser } = useAuth();

  useEffect(() => {
    console.log("Dashboard Router - User status:", databaseUser?.status);
  }, [databaseUser]);

  // Show loading state with header
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated with Firebase
  if (!firebaseUser) {
    return <Navigate to="/signin" replace />;
  }

  // If Firebase user exists but no database user, there was a sync error
  if (!databaseUser) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-bold text-red-400 mb-4">Account Setup Error</h2>
            <p className="text-gray-400 mb-4">
              There was an issue setting up your account. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary text-black px-4 py-2 rounded hover:bg-primary/90 font-semibold"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Route based on user status (all users in DB are now investor+ level)
  switch (databaseUser.status) {
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    
    case 'influencer':
      return <Navigate to="/dashboard/influencer" replace />;
    
    case 'investor':
    default:
      return <Navigate to="/dashboard/investor" replace />;
  }
};

export default Dashboard;