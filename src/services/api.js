// services/api.js
import axios from 'axios';

// Make sure we have a default API URL if environment variable isn't loaded
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create an axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for authentication cookies
});

console.log('API client initialized with baseURL:', API_URL);

// Add a request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.baseURL}${config.url}`);
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.message);
    console.error('Request URL:', error.config?.url);
    console.error('Response:', error.response?.data);
    
    // Handle session expiration or authentication errors
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;