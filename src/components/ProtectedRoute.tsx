// src/components/ProtectedRoute.tsx - Enhanced protected route component
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth/auth-context";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredStatus?: 'investor' | 'influencer' | 'admin';
  fallbackPath?: string;
  showUpgrade?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requiredStatus,
  fallbackPath = "/",
  showUpgrade = false
}: ProtectedRouteProps) => {
  const { databaseUser, firebaseUser, loading } = useAuth();

  // Show loading state while authentication is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!firebaseUser) {
    return <Navigate to="/signin" replace />;
  }

  // If Firebase user exists but no database user, wait for sync
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

  // If no specific status required, allow access
  if (!requiredStatus) {
    return <>{children}</>;
  }

  // Check status hierarchy for access control
  const statusHierarchy = {
    'browser': 1,
    'investor': 2,
    'influencer': 3,
    'admin': 4
  };

  const userLevel = statusHierarchy[databaseUser.status as keyof typeof statusHierarchy] || 0;
  const requiredLevel = statusHierarchy[requiredStatus];

  // If user doesn't have required status level
  if (userLevel < requiredLevel) {
    if (showUpgrade) {
      return <AccessDeniedPage requiredStatus={requiredStatus} currentStatus={databaseUser.status} />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // User has required access
  return <>{children}</>;
};

// Component shown when user doesn't have required access
const AccessDeniedPage = ({ 
  requiredStatus, 
  currentStatus 
}: { 
  requiredStatus: string; 
  currentStatus?: string; 
}) => {
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'investor':
        return {
          title: 'Investor Access Required',
          description: 'This section is only available to investors.',
          action: 'Start investing in influencers to upgrade your account.',
          buttonText: 'Become an Investor',
          buttonAction: () => window.location.href = '/pre-invest',
          color: 'blue'
        };
      case 'influencer':
        return {
          title: 'Influencer Access Required',
          description: 'This section is only available to verified influencers.',
          action: 'Apply to become an influencer to access these features.',
          buttonText: 'Apply as Influencer',
          buttonAction: () => alert('Influencer applications coming soon!'),
          color: 'purple'
        };
      case 'admin':
        return {
          title: 'Admin Access Required',
          description: 'This section is restricted to platform administrators.',
          action: 'Contact support if you believe this is an error.',
          buttonText: 'Contact Support',
          buttonAction: () => alert('Support: help@coinfluence.com'),
          color: 'red'
        };
      default:
        return {
          title: 'Access Denied',
          description: 'You do not have permission to access this section.',
          action: 'Please check your account status.',
          buttonText: 'Go Home',
          buttonAction: () => window.location.href = '/',
          color: 'gray'
        };
    }
  };

  const statusInfo = getStatusInfo(requiredStatus);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md mx-auto p-8 text-center">
        <div className="mb-8">
          <div className={`w-16 h-16 bg-${statusInfo.color}-500/20 rounded-full flex items-center justify-center mx-auto mb-4`}>
            <svg className={`w-8 h-8 text-${statusInfo.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H9m3-7v3m0 0V9m0 3h3m-3 0H9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">{statusInfo.title}</h1>
          <p className="text-gray-400 mb-4">{statusInfo.description}</p>
          <p className="text-gray-500 text-sm mb-6">{statusInfo.action}</p>
          <p className="text-xs text-gray-600">
            Current status: <span className="capitalize text-primary">{currentStatus || 'browser'}</span>
          </p>
        </div>

        <div className="space-y-4">
          <button 
            className={`w-full bg-${statusInfo.color}-500 hover:bg-${statusInfo.color}-600 text-white py-3 px-4 rounded-lg transition-colors font-semibold`}
            onClick={statusInfo.buttonAction}
          >
            {statusInfo.buttonText}
          </button>
          
          <button 
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-2 px-4 rounded-lg transition-colors"
            onClick={() => window.location.href = '/'}
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;