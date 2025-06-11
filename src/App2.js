// App.js with updated routes
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Context Provider
import { AuthProvider } from './context/AuthContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import UserUpload from './pages/UserUpload';
import TranslatorDashboard from './pages/TranslatorDashboard';
import TranslationSetup from './pages/TranslationSetup';
import TranslationEditor from './pages/TranslationEditor';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';
import CreateTranslation from './pages/CreateTranslation';

// Styles
import './styles/Modern.css';
import './styles/DocumentViewer.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Header />
          
          <main className="main-content">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<UserUpload />} />
              <Route path="/login" element={<Login />} />
              
              {/* Protected translator routes */}
              <Route 
                path="/translator/dashboard" 
                element={
                  <ProtectedRoute role="translator">
                    <TranslatorDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/translator/create" 
                element={
                  <ProtectedRoute role="translator">
                    <CreateTranslation />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/translator/setup/:translationId?" 
                element={
                  <ProtectedRoute role="translator">
                    <TranslationSetup />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/translator/edit/:translationId" 
                element={
                  <ProtectedRoute role="translator">
                    <TranslationEditor />
                  </ProtectedRoute>
                } 
              />
              
              {/* Error routes */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          
          <Footer />
          
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;