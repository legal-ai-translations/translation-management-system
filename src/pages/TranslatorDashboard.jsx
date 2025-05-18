// pages/TranslatorDashboard.jsx with "Create New Translation" button
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Services
import translationService from '../services/translationService';

// Components
import Spinner from '../components/Spinner';

const TranslatorDashboard = () => {
  const navigate = useNavigate();
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [filters, setFilters] = useState({
    sourceLanguage: '',
    targetLanguage: '',
    status: 'pending', // Default to showing pending translations
  });
  
  // Fetch translations
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        setLoading(true);
        const data = await translationService.getAllTranslations(filters);
        setTranslations(data);
      } catch (error) {
        console.error('Error fetching translations:', error);
        toast.error('Failed to load translations');
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [filters]);

  // Handle claiming a translation
  const handleClaimTranslation = async (translationId) => {
    try {
      setClaimingId(translationId);
      
      // Use the translation service to claim the translation
      await translationService.claimTranslation(translationId);
      
      // Update local state to reflect the change
      setTranslations(prevTranslations =>
        prevTranslations.map(translation => 
          translation.id === translationId 
            ? { ...translation, status: 'claimed', assignedTranslator: 'current_user' } 
            : translation
        )
      );
      
      toast.success('Translation claimed successfully');
      
      // Redirect to the translation setup page
      navigate(`/translator/setup/${translationId}`);
    } catch (error) {
      console.error('Error claiming translation:', error);
      toast.error('Failed to claim translation');
    } finally {
      setClaimingId(null);
    }
  };

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Navigate to create new translation page
  const handleCreateNewTranslation = () => {
    navigate('/translator/setup');
  };

  if (loading && translations.length === 0) {
    return <Spinner />;
  }

  return (
    <div className="translator-dashboard">
      <div className="dashboard-header">
        <h1>Translator Dashboard</h1>
        <button 
          className="btn btn-primary create-translation-btn" 
          onClick={handleCreateNewTranslation}
        >
          Create New Translation
        </button>
      </div>
      
      <div className="filter-controls">
        <div className="filter-group">
          <label htmlFor="sourceLanguage">Source Language:</label>
          <select 
            id="sourceLanguage" 
            name="sourceLanguage" 
            value={filters.sourceLanguage} 
            onChange={handleFilterChange}
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="pt">Portuguese</option>
            <option value="it">Italian</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="targetLanguage">Target Language:</label>
          <select 
            id="targetLanguage" 
            name="targetLanguage" 
            value={filters.targetLanguage} 
            onChange={handleFilterChange}
          >
            <option value="">All Languages</option>
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
            <option value="pt">Portuguese</option>
            <option value="it">Italian</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="status">Status:</label>
          <select 
            id="status" 
            name="status" 
            value={filters.status} 
            onChange={handleFilterChange}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="claimed">Claimed</option>
            <option value="translation_in_progress">Translation In Progress</option>
            <option value="ready_for_review">Ready For Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      
      {translations.length === 0 ? (
        <div className="no-translations">
          <p>No translations found matching your filters.</p>
          <button 
            className="btn btn-primary mt-4"
            onClick={handleCreateNewTranslation}
          >
            Create Your First Translation
          </button>
        </div>
      ) : (
        <div className="translations-table-container">
          <table className="translations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Document Type</th>
                <th>Document Holder</th>
                <th>Source Language</th>
                <th>Target Language</th>
                <th>Submitted Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {translations.map(translation => (
                <tr key={translation.id}>
                  <td>{translation.id}</td>
                  <td>{translation.documentType}</td>
                  <td>{translation.documentHolder}</td>
                  <td>{translation.sourceLanguage}</td>
                  <td>{translation.targetLanguage}</td>
                  <td>{new Date(translation.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${translation.status}`}>
                      {translation.status === 'pending' && 'Pending'}
                      {translation.status === 'claimed' && 'Claimed'}
                      {translation.status === 'translation_in_progress' && 'Translation in Progress'}
                      {translation.status === 'ready_for_review' && 'Ready for Review'}
                      {translation.status === 'completed' && 'Completed'}
                    </span>
                  </td>
                  <td>
                    {translation.status === 'pending' && (
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleClaimTranslation(translation.id)}
                        disabled={claimingId === translation.id}
                      >
                        {claimingId === translation.id ? 'Claiming...' : 'Claim'}
                      </button>
                    )}
                    {translation.status === 'claimed' && 
                      translation.assignedTranslator === 'current_user' && (
                      <Link 
                        to={`/translator/setup/${translation.id}`} 
                        className="btn btn-sm btn-secondary"
                      >
                        Set Up Translation
                      </Link>
                    )}
                    {translation.status === 'translation_in_progress' && 
                      translation.assignedTranslator === 'current_user' && (
                      <button 
                        className="btn btn-sm btn-secondary disabled"
                        disabled
                      >
                        Processing...
                      </button>
                    )}
                    {translation.status === 'ready_for_review' && 
                      translation.assignedTranslator === 'current_user' && (
                      <Link 
                        to={`/translator/edit/${translation.id}`} 
                        className="btn btn-sm btn-secondary"
                      >
                        Review
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TranslatorDashboard;