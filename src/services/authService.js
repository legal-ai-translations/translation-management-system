// services/authService.js
import apiClient from './api';

/**
 * Service for handling authentication and user management API calls
 */
const authService = {
  /**
   * Login a user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - User data and authentication token
   */
  login: async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      
      // Store token for future authenticated requests
      if (response.data.token) {
        localStorage.setItem('auth_token', response.data.token);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout the current user
   * @returns {Promise<Object>} - Logout confirmation
   */
  logout: async () => {
    try {
      const response = await apiClient.post('/auth/logout');
      
      // Remove authentication token
      localStorage.removeItem('auth_token');
      
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server request fails, remove the token
      localStorage.removeItem('auth_token');
      throw error;
    }
  },

  /**
   * Check authentication status
   * @returns {Promise<Object>} - Authentication status and user data if authenticated
   */
  checkAuthStatus: async () => {
    try {
      const response = await apiClient.get('/auth/status');
      return response.data;
    } catch (error) {
      console.error('Auth status check error:', error);
      throw error;
    }
  },

  /**
   * Get the current user's authentication token
   * @returns {string|null} - Authentication token or null if not authenticated
   */
  getToken: () => {
    return localStorage.getItem('auth_token');
  },

  /**
   * Check if a user is currently authenticated
   * @returns {boolean} - True if authenticated, false otherwise
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  }
};

export default authService;