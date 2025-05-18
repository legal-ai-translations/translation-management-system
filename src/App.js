// App.js with modern styling
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import modernized CSS
import './styles/Modern.css';

// Import the AuthProvider
import { AuthProvider } from './context/AuthContext';

// Import components
import Login from './pages/Login';
import UserUpload from './pages/UserUpload';
import TranslatorDashboard from './pages/TranslatorDashboard';
import TranslationSetup from './pages/TranslationSetup';
import TranslationEditor from './pages/TranslationEditor';
import CreateTranslation from './pages/CreateTranslation';

// Header component with modern styling
const Header = () => {
  return (
    <header className="app-header">
      <div className="header-content">
        <h1>
          <span className="logo-text">We</span>
          <span className="logo-highlight">Translate</span>
        </h1>
        <nav className="main-nav">
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/translator/dashboard">Dashboard</a></li>
            <li><a href="/login">Login</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

// Footer component with modern styling
const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} WeTranslate. All rights reserved.</p>
        <p>36 RUE SAINT DIDIER 75116 PARIS | +33(1)71736436 | contact@wetranslate.fr</p>
      </div>
    </footer>
  );
};

// Simple pages for 404 and unauthorized
const NotFound = () => (
  <div className="not-found">
    <h1>404</h1>
    <h2>Page Not Found</h2>
    <p>The page you are looking for doesn't exist or has been moved.</p>
    <a href="/" className="btn btn-primary">Return to Home</a>
  </div>
);

const Unauthorized = () => (
  <div className="unauthorized">
    <h1>Access Denied</h1>
    <h2>You don't have permission to access this page</h2>
    <p>Please contact your administrator if you believe this is an error.</p>
    <a href="/" className="btn btn-primary">Return to Home</a>
  </div>
);

// Simple ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  // Just returning children for now
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<UserUpload />} />
              <Route path="/login" element={<Login />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Protected routes - Translator only */}
              <Route 
                path="/translator/dashboard" 
                element={
                  <ProtectedRoute>
                    <TranslatorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/translator/create" 
                element={
                  <ProtectedRoute>
                    <CreateTranslation />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/translator/setup/:translationId?" 
                element={
                  <ProtectedRoute>
                    <TranslationSetup />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/translator/edit/:translationId" 
                element={
                  <ProtectedRoute>
                    <TranslationEditor />
                  </ProtectedRoute>
                } 
              />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <ToastContainer 
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;