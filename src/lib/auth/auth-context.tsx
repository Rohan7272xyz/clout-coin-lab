// src/lib/auth/auth-context.tsx - Updated without browser status
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { syncUserToBackend } from '@/lib/auth/sync';

interface DatabaseUser {
  id: number;
  wallet_address: string;
  email: string;
  display_name: string;
  profile_picture_url?: string;
  created_at: string;
  total_invested: number;
  portfolio_value: number;
  status: 'investor' | 'influencer' | 'admin'; // Removed 'browser' since they're not stored in DB
}

interface AuthContextType {
  firebaseUser: User | null;
  databaseUser: DatabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  user: User | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    if (!firebaseUser) {
      console.log("🔍 No Firebase user, clearing database user");
      setDatabaseUser(null);
      return;
    }

    try {
      console.log("🔄 Refreshing user data for:", firebaseUser.email);
      
      // Sync user to backend and get updated user data
      await syncUserToBackend();
      console.log("✅ User sync completed");
      
      // Fetch the user data from your backend
      const idToken = await firebaseUser.getIdToken();
      console.log("🔑 Got ID token, fetching user data...");
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log("🌐 API URL:", apiUrl);
      
      const response = await fetch(`${apiUrl}/api/auth/user/${firebaseUser.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("📡 Response status:", response.status);
      console.log("📡 Response ok:", response.ok);

      if (response.ok) {
        const userData = await response.json();
        console.log("✅ Database user data loaded:", userData);
        setDatabaseUser(userData);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error("❌ Failed to fetch user data:", response.status, errorText);
        setError(`Failed to fetch user data: ${response.status} ${errorText}`);
      }
    } catch (error: any) {
      console.error('❌ Error refreshing user data:', error);
      setError(`Error refreshing user data: ${error.message}`);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setFirebaseUser(null);
      setDatabaseUser(null);
      setError(null);
    } catch (error: any) {
      console.error('Error signing out:', error);
      setError(`Error signing out: ${error.message}`);
    }
  };

  useEffect(() => {
    console.log("🚀 Setting up auth state listener");
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔥 Firebase auth state changed:", user ? user.email : "No user");
      setFirebaseUser(user);
      setLoading(false);
      
      if (user) {
        console.log("👤 User details:");
        console.log("  - UID:", user.uid);
        console.log("  - Email:", user.email);
        console.log("  - Display Name:", user.displayName);
        console.log("  - Email Verified:", user.emailVerified);
        
        // Auto-sync user when they sign in
        try {
          console.log("🔄 Starting user sync to backend...");
          setError(null);
          
          // Sync user to backend and get updated user data
          const syncResult = await syncUserToBackend();
          console.log("✅ User sync successful:", syncResult);
          
          // Fetch the user data from your backend
          const idToken = await user.getIdToken();
          console.log("🔍 Fetching user data from backend...");
          
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
          console.log("🌐 Using API URL:", apiUrl);
          
          const response = await fetch(`${apiUrl}/api/auth/user/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${idToken}`,
              'Content-Type': 'application/json'
            }
          });

          console.log("📡 Fetch response:");
          console.log("  - Status:", response.status);
          console.log("  - Status Text:", response.statusText);

          if (response.ok) {
            const userData = await response.json();
            console.log("✅ Database user data loaded:", userData);
            setDatabaseUser(userData);
            setError(null);
          } else {
            const errorText = await response.text();
            console.error("❌ Failed to fetch user data:", response.status, errorText);
            setError(`API Error: ${response.status} - ${errorText}`);
            
            // Try to parse error if it's JSON
            try {
              const errorJson = JSON.parse(errorText);
              console.error("❌ Error details:", errorJson);
            } catch {
              console.error("❌ Raw error response:", errorText);
            }
          }
        } catch (error: any) {
          console.error('❌ Error syncing user data:', error);
          setError(`Sync Error: ${error.message}`);
          
          // Log more details about the error
          if (error.name) console.error("Error name:", error.name);
          if (error.stack) console.error("Error stack:", error.stack);
        }
      } else {
        console.log("🚪 No user, clearing state");
        setDatabaseUser(null);
        setError(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    firebaseUser,
    databaseUser,
    loading,
    signOut,
    refreshUser,
    user: firebaseUser,
    error
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}