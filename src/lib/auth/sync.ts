// src/lib/auth/sync.ts
import axios from 'axios';
import { getAuth } from 'firebase/auth';

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
    const idToken = await user.getIdToken();
    const payload = {
      wallet_address: additionalData?.wallet_address || user.uid,
      email: user.email,
      display_name: additionalData?.display_name || user.displayName,
      profile_picture_url: additionalData?.profile_picture_url || user.photoURL,
    };

    const response = await axios.post<SyncUserResponse>(
      'http://localhost:3000/api/auth/sync', 
      payload, 
      {
        headers: { 
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
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
    const idToken = await user.getIdToken();
    const response = await axios.put(
      `http://localhost:3000/api/auth/user/${user.uid}`,
      updates,
      {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}