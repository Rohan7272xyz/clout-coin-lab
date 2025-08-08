// src/components/ProtectedRoute.tsx - Updated to handle the new user flow
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth/auth-context';
import Header from '@/components/ui/header';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredStatus?: 'investor' | 'influencer' | 'admin';
  showUpgrade?: boolean;
}

const ProtectedRoute = ({ 
  children, 
  requiredStatus = 'investor', 
  showUpgrade = false 
}: ProtectedRouteProps) => {
  const { firebaseUser, databaseUser, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated with Firebase, redirect to sign in
  if (!firebaseUser) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
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
              There was an issue setting up your account. Please try signing out and signing in again.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-primary text-black px-4 py-2 rounded hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check user status requirements
  const statusHierarchy = {
    'investor': 1,
    'influencer': 2,
    'admin': 3
  };

  const userLevel = statusHierarchy[databaseUser.status as keyof typeof statusHierarchy] || 0;
  const requiredLevel = statusHierarchy[requiredStatus] || 1;

  // If user doesn't have required status
  if (userLevel < requiredLevel) {
    if (showUpgrade) {
      return (
        <div className="min-h-screen bg-black">
          <Header />
          <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-bold text-yellow-400 mb-4">Upgrade Required</h2>
              <p className="text-gray-400 mb-4">
                You need {requiredStatus} status to access this page. 
                Current status: {databaseUser.status}
              </p>
              <p className="text-sm text-gray-500">
                Contact an admin to upgrade your account status.
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      // Redirect to appropriate dashboard based on their status
      const redirectPath = databaseUser.status === 'admin' ? '/dashboard/admin' :
                          databaseUser.status === 'influencer' ? '/dashboard/influencer' :
                          '/dashboard/investor';
      return <Navigate to={redirectPath} replace />;
    }
  }

  // User has required permissions, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;