// src/lib/config.ts
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  ENDPOINTS: {
    AUTH: '/api/auth',
    INFLUENCERS: '/api/influencers',
    TRADING: '/api/trading',
    PORTFOLIO: '/api/portfolio'
  }
} as const;

// Helper function to build full URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper to get full endpoint URLs
export const getEndpointUrl = (key: keyof typeof API_CONFIG.ENDPOINTS): string => {
  return buildApiUrl(API_CONFIG.ENDPOINTS[key]);
};