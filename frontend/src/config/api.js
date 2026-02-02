// Backend API Configuration
// Change this URL to point to your backend server
// For production (same server): use '/api' (relative URL)
// For development: use 'http://localhost:3060/api' (absolute URL)
export const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Categories
  CATEGORIES: `${API_BASE_URL}/categories`,
  
  // Leads
  LEADS: `${API_BASE_URL}/leads`,
  LEAD_REACHED: (leadId) => `${API_BASE_URL}/leads/${leadId}/reached`,
  
  // Search
  SEARCH: `${API_BASE_URL}/search`,
  LAST_SEARCH: `${API_BASE_URL}/last-search`,
  
  // Analytics
  ANALYTICS: `${API_BASE_URL}/analytics`,
  
  // Messages
  MESSAGES: `${API_BASE_URL}/messages`,
  
  // WhatsApp
  WHATSAPP_STATUS: `${API_BASE_URL}/whatsapp/status`,
  WHATSAPP_ACCOUNT: `${API_BASE_URL}/whatsapp/account`,
  WHATSAPP_DISCONNECT: `${API_BASE_URL}/whatsapp/disconnect`,
  WHATSAPP_SEND_MESSAGES: `${API_BASE_URL}/whatsapp/send-messages`,
  
  // Greeting
  GREETING: `${API_BASE_URL}/greeting`,
};

export default API_ENDPOINTS;

