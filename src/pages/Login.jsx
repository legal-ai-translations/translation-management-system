// pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the intended destination from the location state or default to translator dashboard
  const from = location.state?.from?.pathname || '/translator/dashboard';
  
  // If already logged in, redirect to intended destination
  useEffect(() => {
    if (currentUser) {
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Use the auth service directly instead of context function
      const result = await authService.login(email, password);
      
      if (result.success) {
        toast.success('Login successful');
        // Refresh the page to update auth state or update context manually
        window.location.href = from;
      } else {
        toast.error(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Translator Login</h1>
        <p>Sign in to access the translation dashboard</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isSubmitting}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Forgot your password? Contact your administrator</p>
          <p className="test-credentials">
            <small>For testing, use any email with password "password"</small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;