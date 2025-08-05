// src/lib/auth/sync.ts - Updated to use new API client
import { getAuth } from 'firebase/auth';
import { authApi } from '@/lib/api';

export interface SyncUserResponse {
  success: boolean;
  user: {
    id: number;
    wallet_address: string;
    email: string;
    display_name: string;
    profile_picture_url?: string;
    created_at: string;
  };
}

// src/lib/auth/sync.ts - Updated to use new API client
import { getAuth } from 'firebase/auth';
import { authApi } from '@/lib/api';

export interface SyncUserResponse {
  success: boolean;
  user: {
    id: number;
    wallet_address: string;
    email: string;
    display_name: string;
    profile_picture_url?: string;
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
    const payload = {
      wallet_address: additionalData?.wallet_address || user.uid,
      email: user.email,
      display_name: additionalData?.display_name || user.displayName,
      profile_picture_url: additionalData?.profile_picture_url || user.photoURL,
    };

    const response = await authApi.syncUser(payload) as SyncUserResponse;
    return response;
  } catch (error) {
    console.error('Error syncing user to backend:', error);
    throw error;
  }
}

export async function updateUserProfile(updates: {
  display_name?: string;
  profile_picture_url?: string;
}) {
  const user = getAuth().currentUser;
  if (!user) {
    throw new Error('No authenticated user found');
  }

  try {
    // Using the simplified API client
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/user/${user.uid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await user.getIdToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}