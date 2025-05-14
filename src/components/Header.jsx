// components/Header.jsx
import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { currentUser, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      navigate('/');
    }
  };
  
  return (
    <header>
      <div className="header-container">
        <Link to="/" className="logo">
          WeTranslate
        </Link>
        
        <nav>
          <ul className="nav-links">
            <li>
              <NavLink to="/" className={({ isActive }) => 
                isActive ? 'nav-link active' : 'nav-link'
              }>
                Upload Document
              </NavLink>
            </li>
            
            {/* Display translator links if user is authenticated and has translator role */}
            {currentUser && hasRole('translator') && (
              <>
                <li>
                  <NavLink to="/translator/dashboard" className={({ isActive }) => 
                    isActive ? 'nav-link active' : 'nav-link'
                  }>
                    Dashboard
                  </NavLink>
                </li>
              </>
            )}
            
            {/* Login/Logout links */}
            {currentUser ? (
              <li>
                <button onClick={handleLogout} className="nav-link" style={{ border: 'none', background: 'none' }}>
                  Logout
                </button>
              </li>
            ) : (
              <li>
                <NavLink to="/login" className={({ isActive }) => 
                  isActive ? 'nav-link active' : 'nav-link'
                }>
                  Translator Login
                </NavLink>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;