// src/App.tsx - Updated with all dashboard routes
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { WagmiConfig } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { config } from "./wagmiConfig";
import { AuthProvider } from "@/lib/auth/auth-context";
import ScrollToTop from "@/components/ScrollToTop";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/SignIn";
import Trending from "./pages/Trending";
import PreInvest from "./pages/PreInvest";
import Influencers from "./pages/Influencers";
import CoinDetail from "./pages/CoinDetail";
import TokenFactory from "./pages/TokenFactory";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import InfluencerDashboard from "./pages/InfluencerDashboard";
import InvestorDashboard from "./pages/InvestorDashboard";
import AdminDashboard from "./pages/AdminDashboard";

// Protected Route Component
import { useAuth } from "@/lib/auth/auth-context";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// Protected Route wrapper component
const ProtectedRoute = ({ 
  children, 
  requiredStatus 
}: { 
  children: ReactNode; 
  requiredStatus?: 'investor' | 'influencer' | 'admin';
}) => {
  const { databaseUser, loading } = useAuth();

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

  if (!databaseUser) {
    return <Navigate to="/signin" replace />;
  }

  // Check status hierarchy
  const statusHierarchy = {
    'browser': 1,
    'investor': 2,
    'influencer': 3,
    'admin': 4
  };

  const userLevel = statusHierarchy[databaseUser.status as keyof typeof statusHierarchy] || 0;
  const requiredLevel = requiredStatus ? statusHierarchy[requiredStatus] : 1;

  if (userLevel < requiredLevel) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <WagmiConfig config={config}>
      <RainbowKitProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/trending" element={<Trending />} />
                <Route path="/pre-invest" element={<PreInvest />} />
                <Route path="/influencers" element={<Influencers />} />
                <Route path="/coin/:id" element={<CoinDetail />} />
                
                {/* Dashboard Router - determines which dashboard to show */}
                <Route 
                  path="/dashboard" 
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Specific Dashboard Routes */}
                <Route 
                  path="/dashboard/investor" 
                  element={
                    <ProtectedRoute requiredStatus="investor">
                      <InvestorDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/dashboard/influencer" 
                  element={
                    <ProtectedRoute requiredStatus="influencer">
                      <InfluencerDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/dashboard/admin" 
                  element={
                    <ProtectedRoute requiredStatus="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin-only Token Factory */}
                <Route 
                  path="/admin/token-factory" 
                  element={
                    <ProtectedRoute requiredStatus="admin">
                      <TokenFactory />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Catch-all route must be last */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </RainbowKitProvider>
    </WagmiConfig>
  </QueryClientProvider>
);

export default App;