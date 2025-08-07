// src/lib/api.ts
import { API_CONFIG } from '@/lib/config';
import { getAuth } from 'firebase/auth';

// Simple fetch wrapper instead of complex axios setup
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        return await user.getIdToken();
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, config);

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized - could redirect to login
        window.location.href = '/signin';
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // API methods
  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Convenience functions for specific endpoints
export const authApi = {
  syncUser: (data: any) => apiClient.post(API_CONFIG.ENDPOINTS.AUTH + '/sync', data),
  getUser: (walletAddress: string) => apiClient.get(`${API_CONFIG.ENDPOINTS.AUTH}/user/${walletAddress}`),
};

export const influencerApi = {
  getAll: () => apiClient.get(API_CONFIG.ENDPOINTS.INFLUENCERS),
  getById: (id: number) => apiClient.get(`${API_CONFIG.ENDPOINTS.INFLUENCERS}/${id}`),
};

export const tradingApi = {
  getCoinData: (id: number) => apiClient.get(`${API_CONFIG.ENDPOINTS.TRADING}/coin/${id}`),
  getPrice: (tokenAddress: string, ethAmount: string) => 
    apiClient.get(`${API_CONFIG.ENDPOINTS.TRADING}/price/${tokenAddress}/${ethAmount}`),
  recordPurchase: (data: any) => apiClient.post(`${API_CONFIG.ENDPOINTS.TRADING}/record-purchase`, data),
};