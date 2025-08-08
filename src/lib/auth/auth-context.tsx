// src/contexts/AuthContext.tsx
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
  status?: 'browser' | 'investor' | 'influencer' | 'admin';
}

interface AuthContextType {
  firebaseUser: User | null;
  databaseUser: DatabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [databaseUser, setDatabaseUser] = useState<DatabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!firebaseUser) {
      setDatabaseUser(null);
      return;
    }

    try {
      // Sync user to backend and get updated user data
      await syncUserToBackend();
      
      // Fetch the user data from your backend
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch(`http://localhost:3000/api/auth/user/${firebaseUser.uid}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setDatabaseUser(userData);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const signOut = async () => {
    try {
      await auth.signOut();
      setFirebaseUser(null);
      setDatabaseUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔥 Firebase auth state changed:", user ? user.email : "No user");
      setFirebaseUser(user);
      setLoading(false);
      
      if (user) {
        // Auto-sync user when they sign in
        try {
          console.log("🔄 Starting user sync to backend...");
          // Sync user to backend and get updated user data
          const syncResult = await syncUserToBackend();
          console.log("✅ User sync successful:", syncResult);
          
          // Fetch the user data from your backend
          const idToken = await user.getIdToken();
          console.log("🔍 Fetching user data from backend...");
          const response = await fetch(`http://localhost:3000/api/auth/user/${user.uid}`, {
            headers: {
              'Authorization': `Bearer ${idToken}`
            }
          });

          if (response.ok) {
            const userData = await response.json();
            console.log("✅ Database user data loaded:", userData);
            setDatabaseUser(userData);
          } else {
            console.error("❌ Failed to fetch user data:", response.status);
          }
        } catch (error) {
          console.error('❌ Error syncing user data:', error);
        }
      } else {
        setDatabaseUser(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    firebaseUser,
    databaseUser,
    loading,
    signOut,
    refreshUser
  };

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