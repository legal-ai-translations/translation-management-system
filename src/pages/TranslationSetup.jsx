// pages/TranslationSetup.jsx with flexible document viewer
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Services
import translationService from '../services/translationService';

// Components
import Spinner from '../components/Spinner';
import DocumentViewer from '../components/DocumentViewer';

const TranslationSetup = () => {
  const { translationId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [documentHeight, setDocumentHeight] = useState(600); // Default height
  const [translation, setTranslation] = useState({
    originalDocument: null,
    sourceLanguage: '',
    targetLanguage: '',
    documentType: '',
    documentHolder: '',
    status: ''
  });
  
  // Form state for translation context
  const [translationContext, setTranslationContext] = useState({
    translationMode: 'standard', // standard, interactive, or template
    additionalContext: '', // Any additional context from translator
    templateId: '', // For template-based translations
  });

  // Fetch translation data
  useEffect(() => {
    const fetchTranslation = async () => {
      try {
        setLoading(true);
        const data = await translationService.getTranslationById(translationId);
        setTranslation(data);
        
        // Adjust document height based on window size
        adjustDocumentHeight();
      } catch (error) {
        console.error('Error fetching translation:', error);
        toast.error('Failed to load translation data');
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
    
    // Listen for window resize to adjust document height
    window.addEventListener('resize', adjustDocumentHeight);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('resize', adjustDocumentHeight);
    };
  }, [translationId]);
  
  // Function to adjust document height based on window size
  const adjustDocumentHeight = () => {
    const windowHeight = window.innerHeight;
    
    // Set document viewer height to be proportional to window height
    // with minimum and maximum constraints
    const newHeight = Math.max(
      Math.min(Math.floor(windowHeight * 0.6), 800), // Max 800px
      400 // Min 400px
    );
    
    setDocumentHeight(newHeight);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTranslationContext(prev => ({ ...prev, [name]: value }));
  };

  // Start the translation process
  const handleStartTranslation = async () => {
    try {
      setProcessing(true);
      
      // Call the API to start the translation process
      await translationService.startTranslation(translationId, translationContext);
      
      toast.success('Translation process started');
      
      // Poll for translation status
      await pollTranslationStatus();
    } catch (error) {
      console.error('Error starting translation:', error);
      toast.error('Failed to start translation process');
      setProcessing(false);
    }
  };
  
  // Poll for translation status until it's ready
  const pollTranslationStatus = async () => {
    try {
      let isReady = false;
      const maxAttempts = 20; // Prevent infinite polling
      let attempts = 0;
      
      // Keep checking until translation is ready or max attempts reached
      while (!isReady && attempts < maxAttempts) {
        attempts++;
        
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check translation status
        const data = await translationService.getTranslationById(translationId);
        
        // If translation is ready, redirect to the editor
        if (data.status === 'ready_for_review' && data.aiTranslationUrl) {
          isReady = true;
          navigate(`/translator/edit/${translationId}`);
        }
      }
      
      // If we hit max attempts but translation is not ready
      if (!isReady) {
        toast.info('Translation is taking longer than expected. Please check back later.');
        navigate('/translator/dashboard');
      }
    } catch (error) {
      console.error('Error polling translation status:', error);
      toast.error('Error checking translation status');
      setProcessing(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  // Get document type from filename extension
  const getDocumentType = (url) => {
    if (!url) return '';
    
    const extension = url.split('.').pop().toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image';
      case 'doc':
      case 'docx':
        return 'word';
      default:
        return '';
    }
  };

  return (
    <div className="container translation-setup">
      <h1>Translation Setup</h1>
      
      <div className="document-info">
        <div className="section-header">
          <h2>Document Information</h2>
          <div className="document-badge">
            Document ID: {translationId.substring(0, 8)}
          </div>
        </div>
        
        <div className="info-container">
          <div className="info-item">
            <label>Document Type</label>
            <span>{translation.documentType}</span>
          </div>
          <div className="info-item">
            <label>Document Holder</label>
            <span>{translation.documentHolder}</span>
          </div>
          <div className="info-item">
            <label>Source Language</label>
            <span>{translation.sourceLanguage}</span>
          </div>
          <div className="info-item">
            <label>Target Language</label>
            <span>{translation.targetLanguage}</span>
          </div>
        </div>
      </div>
      
      {/* Original Document Viewer with Flexible Height */}
      <div className="original-document-section">
        <div className="section-header">
          <h2>Original Document</h2>
          <div className="document-actions">
            <button className="btn btn-sm btn-secondary">
              <i className="icon-download"></i> Download Original
            </button>
          </div>
        </div>
        <DocumentViewer 
          documentUrl={translation.originalDocument} 
          title={`${translation.documentType} - ${translation.documentHolder}`}
          documentType={getDocumentType(translation.originalDocument)}
          initialHeight={documentHeight}
          showPageControls={true}
        />
      </div>
      
      <div className="translation-setup-form">
        <div className="section-header">
          <h2>Translation Options</h2>
          <div className="mode-indicator">
            {translationContext.translationMode === 'standard' && (
              <span className="badge badge-primary">Standard Mode</span>
            )}
            {translationContext.translationMode === 'interactive' && (
              <span className="badge badge-info">Interactive Mode</span>
            )}
            {translationContext.translationMode === 'template' && (
              <span className="badge badge-success">Template Mode</span>
            )}
          </div>
        </div>
        
        <form>
          <div className="form-group">
            <label htmlFor="translationMode">Translation Mode</label>
            <select
              id="translationMode"
              name="translationMode"
              value={translationContext.translationMode}
              onChange={handleInputChange}
              disabled={processing}
              className="form-select"
            >
              <option value="standard">Standard Translation</option>
              <option value="interactive">Interactive Translation (with questions)</option>
              <option value="template">Template-Based Translation</option>
            </select>
            <small className="form-text">
              {translationContext.translationMode === 'standard' && 
                'Standard mode translates the document without additional interaction.'}
              {translationContext.translationMode === 'interactive' && 
                'Interactive mode allows the AI to ask questions during translation for better accuracy.'}
              {translationContext.translationMode === 'template' && 
                'Template mode uses predefined templates for common document types.'}
            </small>
          </div>
          
          {translationContext.translationMode === 'template' && (
            <div className="form-group">
              <label htmlFor="templateId">Select Template</label>
              <select
                id="templateId"
                name="templateId"
                value={translationContext.templateId}
                onChange={handleInputChange}
                disabled={processing}
                className="form-select"
              >
                <option value="">Select a template</option>
                <option value="birth_certificate">Birth Certificate</option>
                <option value="drivers_license">Driver's License</option>
                <option value="passport">Passport</option>
                <option value="academic_transcript">Academic Transcript</option>
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="additionalContext">Additional Context for Translation</label>
            <textarea
              id="additionalContext"
              name="additionalContext"
              value={translationContext.additionalContext}
              onChange={handleInputChange}
              placeholder="Add any additional context that might help with the translation..."
              rows={5}
              disabled={processing}
              className="form-control"
            />
            <small className="form-text">
              Provide any additional information that might help the AI produce a better translation.
              This can include specific terminology, formatting requirements, or legal context.
            </small>
          </div>
          
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/translator/dashboard')}
              disabled={processing}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartTranslation}
              disabled={processing}
            >
              {processing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                <>Start Translation</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TranslationSetup;