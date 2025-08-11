// src/App.tsx - Updated with RobotAssistant mount
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
import ProtectedRoute from "@/components/ProtectedRoute";

// ADD: RobotAssistant
import RobotAssistant from "@/components/onboarding/RobotAssistant";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SignIn from "./pages/SignIn";
import Trending from "./pages/Trending";
import PreInvest from "./pages/PreInvest";
import Influencers from "./pages/Influencers";
import CoinDetail from "./pages/CoinDetail";
import TokenFactory from "./pages/TokenFactory";
import About from "./pages/About";

// Dashboard pages
import Dashboard from "./pages/Dashboard";
import InfluencerDashboard from "./pages/InfluencerDashboard";
import InvestorDashboard from "./pages/InvestorDashboard";
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

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

              {/* ADD: Mount once, outside <Routes>, inside providers */}
              <RobotAssistant />

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
                
                {/* Specific Dashboard Routes with proper protection */}
                <Route 
                  path="/dashboard/investor" 
                  element={
                    <ProtectedRoute requiredStatus="investor" showUpgrade={true}>
                      <InvestorDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/dashboard/influencer" 
                  element={
                    <ProtectedRoute requiredStatus="influencer" showUpgrade={true}>
                      <InfluencerDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                <Route 
                  path="/dashboard/admin" 
                  element={
                    <ProtectedRoute requiredStatus="admin" showUpgrade={true}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin-only Token Factory */}
                <Route 
                  path="/admin/token-factory" 
                  element={
                    <ProtectedRoute requiredStatus="admin" showUpgrade={true}>
                      <TokenFactory />
                    </ProtectedRoute>
                  } 
                />
                
                {/* About Page route */}
                <Route path="/about" element={<About />} />

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
