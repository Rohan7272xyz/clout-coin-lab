// src/lib/auth/sync.ts - Fixed with proper exports and investor default
import { getAuth } from 'firebase/auth';

export interface SyncUserResponse {
  success: boolean;
  user: {
    id: number;
    wallet_address: string;
    email: string;
    display_name: string;
    profile_picture_url?: string;
    status: string;
    created_at: string;
  };
}

export async function syncUserToBackend(additionalData?: {
  wallet_address?: string;
  display_name?: string;
  profile_picture_url?: string;
}): Promise<SyncUserResponse> {
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }

  try {
    console.log('🔄 Syncing user to backend:', {
      uid: user.uid,
      email: user.email,
      additionalData
    });

    // Get ID token for authentication
    const idToken = await user.getIdToken();
    
    const payload = {
      wallet_address: additionalData?.wallet_address || user.uid,
      email: user.email,
      display_name: additionalData?.display_name || user.displayName,
      profile_picture_url: additionalData?.profile_picture_url || user.photoURL,
    };

    console.log('📤 Sending sync payload:', payload);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const response = await fetch(`${apiUrl}/api/auth/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 Sync response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Sync failed:', response.status, errorText);
      throw new Error(`Sync failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json() as SyncUserResponse;
    console.log('✅ Sync successful:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Error syncing user to backend:', error);
    throw error;
  }
}

export async function updateUserProfile(updates: {
  display_name?: string;
  profile_picture_url?: string;
  wallet_address?: string;
}) {
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }

  try {
    const idToken = await user.getIdToken();
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    
    const response = await fetch(`${apiUrl}/api/auth/user/${user.uid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Update failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    throw error;
  }
}