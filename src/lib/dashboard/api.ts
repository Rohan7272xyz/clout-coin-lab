// src/lib/dashboard/api.ts
import { getAuth } from 'firebase/auth';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function getAuthHeaders() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

export const dashboardAPI = {
  // Influencer endpoints
  influencer: {
    getStats: async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/influencer/stats`, {
        headers: await getAuthHeaders()
      });
      return response.json();
    },
    
    getPledgers: async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/influencer/pledgers`, {
        headers: await getAuthHeaders()
      });
      return response.json();
    },
    
    giftTokens: async (recipient: string, amount: number, message?: string) => {
      const response = await fetch(`${API_BASE}/api/dashboard/influencer/gift-tokens`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ recipient, amount, message })
      });
      return response.json();
    }
  },
  
  // Investor endpoints
  investor: {
    getPortfolio: async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/investor/portfolio`, {
        headers: await getAuthHeaders()
      });
      return response.json();
    },
    
    getPledges: async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/investor/pledges`, {
        headers: await getAuthHeaders()
      });
      return response.json();
    }
  },
  
  // Admin endpoints
  admin: {
    getStats: async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/admin/stats`, {
        headers: await getAuthHeaders()
      });
      return response.json();
    },
    
    getPendingApprovals: async () => {
      const response = await fetch(`${API_BASE}/api/dashboard/admin/pending-approvals`, {
        headers: await getAuthHeaders()
      });
      return response.json();
    },
    
    processApproval: async (id: string, approved: boolean) => {
      const response = await fetch(`${API_BASE}/api/dashboard/admin/approve/${id}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ approved })
      });
      return response.json();
    }
  }
};