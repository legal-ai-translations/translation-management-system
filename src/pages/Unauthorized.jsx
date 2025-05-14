// pages/Unauthorized.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="unauthorized">
      <div className="unauthorized-content">
        <h1>Access Denied</h1>
        <h2>You don't have permission to access this page</h2>
        <p>Please contact your administrator if you believe this is an error.</p>
        <Link to="/" className="btn btn-primary">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;