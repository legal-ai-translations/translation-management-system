// pages/NotFound.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-container" style={{ 
      textAlign: 'center', 
      padding: '5rem 2rem',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <div style={{ marginTop: '2rem' }}>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;