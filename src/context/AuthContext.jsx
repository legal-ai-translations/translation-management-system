// context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on page load
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Replace with your actual auth status endpoint
        const response = await axios.get('/api/auth/status');
        if (response.data.authenticated) {
          setCurrentUser(response.data.user);
        }
      } catch (error) {
        console.error('Auth status check failed:', error);
        // User is not authenticated, leave currentUser as null
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      // Replace with your actual login endpoint
      const response = await axios.post('/api/auth/login', { email, password });
      setCurrentUser(response.data.user);
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Replace with your actual logout endpoint
      await axios.post('/api/auth/logout');
      setCurrentUser(null);
      return { success: true };
    } catch (error) {
      console.error('Logout failed:', error);
      return { success: false, message: 'Logout failed. Please try again.' };
    }
  };

  // Determine if user has a specific role
  const hasRole = (role) => {
    if (!currentUser) return false;
    return currentUser.roles.includes(role);
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;