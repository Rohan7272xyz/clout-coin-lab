<<<<<<< HEAD
import React from "react";

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>This is a placeholder for the main Dashboard.</p>
    </div>
  );
};

export default Dashboard;
=======
// src/pages/Dashboard.tsx
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Dashboard Router - Routes users to their appropriate dashboard based on status
 * This acts as a smart router that determines which dashboard to show
 */
const Dashboard = () => {
  const { databaseUser, loading } = useAuth();

  useEffect(() => {
    console.log("Dashboard Router - User status:", databaseUser?.status);
  }, [databaseUser]);

  // Show loading state
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
  if (!databaseUser) {
    return <Navigate to="/signin" replace />;
  }

  // Route based on user status
  switch (databaseUser.status) {
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    
    case 'influencer':
      return <Navigate to="/dashboard/influencer" replace />;
    
    case 'investor':
      return <Navigate to="/dashboard/investor" replace />;
    
    case 'browser':
    default:
      // For browser users, redirect to main page with a message
      // Or you could show a "upgrade to investor" page
      return <Navigate to="/" replace />;
  }
};

export default Dashboard;
>>>>>>> 668e890d2425094ffa187745eb89db6c14dc06e1
