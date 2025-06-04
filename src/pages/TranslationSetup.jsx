// pages/TranslationSetup.jsx with clear upload states
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Services
import translationService from '../services/translationService';
import documentService from '../services/documentService';

// Components
import Spinner from '../components/Spinner';
import DocumentViewer from '../components/DocumentViewer';

const TranslationSetup = () => {
  const { translationId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [documentHeight, setDocumentHeight] = useState(600);
  const [documentFile, setDocumentFile] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [uploadState, setUploadState] = useState('none'); // 'none', 'selected', 'uploading', 'uploaded'
  const [uploadProgress, setUploadProgress] = useState(0);
  const [translation, setTranslation] = useState({
    originalDocument: null,
    sourceLanguage: '',
    targetLanguage: '',
    documentType: '',
    documentHolder: '',
    status: ''
  });
  
  const fileInputRef = useRef(null);
  
  // Form state for translation context
  const [translationContext, setTranslationContext] = useState({
    translationMode: 'standard',
    additionalContext: '',
    templateId: '',
    sourceLanguage: 'en',
    targetLanguage: 'fr',
  });

  // Fetch translation data if translationId is provided
  useEffect(() => {
    const fetchTranslation = async () => {
      if (!translationId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // First, try the traditional flow to get translation by ID
        try {
          const data = await translationService.getTranslationById(translationId);
          setTranslation(data);
          setUploadState('uploaded'); // Mark as uploaded if we have existing data
        } catch (error) {
          console.log('Not a traditional translation ID, trying as document ID');
          
          // If not found, assume it's a document ID from new flow
          const statusData = await documentService.checkTranslationStatus(translationId);
          
          // Set the preview URL for the original document
          const previewUrl = documentService.getOriginalDocumentPreviewUrl(translationId);
          
          // Update translation state with the document ID and preview URL
          setTranslation(prev => ({
            ...prev,
            originalDocument: previewUrl,
            documentId: translationId
          }));
          
          setUploadState('uploaded'); // Mark as uploaded since document exists
        }
        
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
    
    const newHeight = Math.max(
      Math.min(Math.floor(windowHeight * 0.6), 800),
      400
    );
    
    setDocumentHeight(newHeight);
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTranslationContext(prev => ({ ...prev, [name]: value }));
  };

  // Handle file selection - NO PREVIEW YET
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDocumentFile(file);
      setUploadState('selected');
      setUploadProgress(0);
      
      // Clear any previous upload state
      setUploadedDocument(null);
      setTranslation(prev => ({
        ...prev,
        originalDocument: null,
        documentType: '',
        documentHolder: '',
        documentId: null
      }));
    }
  };

  // Trigger file input click
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  // Upload document
  const handleUploadDocument = async () => {
    if (!documentFile) {
      toast.error('Please select a document to upload');
      return;
    }

    try {
      setUploadState('uploading');
      setProcessing(true);
      setUploadProgress(0);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) {
            return prev + 10;
          }
          return prev;
        });
      }, 300);
      
      const result = await documentService.uploadDocument(documentFile);
      
      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setUploadedDocument(result);
      setUploadState('uploaded');
      
      toast.success('Document uploaded successfully!');
      
      // Get preview URL for original document
      const previewUrl = documentService.getOriginalDocumentPreviewUrl(result.documentId);
      
      // Update translation info with uploaded document data
      setTranslation(prev => ({
        ...prev,
        originalDocument: previewUrl,
        documentType: documentFile.type,
        documentHolder: documentFile.name,
        documentId: result.documentId
      }));
      
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      setUploadState('selected'); // Go back to selected state
      setUploadProgress(0);
    } finally {
      setProcessing(false);
    }
  };

  // Start the translation process
  const handleStartTranslation = async () => {
    try {
      if (!uploadedDocument?.documentId) {
        toast.error('Please upload a document first');
        return;
      }
      
      setProcessing(true);
      
      // Prepare translation options
      const translationOptions = {
        sourceLanguage: translationContext.sourceLanguage,
        targetLanguage: translationContext.targetLanguage,
        additionalContext: translationContext.additionalContext,
        mode: translationContext.translationMode,
        templateId: translationContext.templateId || undefined
      };
      
      // Trigger translation
      const result = await documentService.triggerTranslation(
        uploadedDocument.documentId, 
        translationOptions
      );
      
      toast.success('Translation process started');
      
      // Store job ID
      const jobId = result.jobId;
      
      // Poll for translation status
      await pollTranslationStatus(uploadedDocument.documentId, jobId);
    } catch (error) {
      console.error('Error starting translation:', error);
      toast.error('Failed to start translation process');
    } finally {
      setProcessing(false);
    }
  };
  
  // Poll for translation status until it's ready
  const pollTranslationStatus = async (documentId, jobId) => {
    try {
      let isCompleted = false;
      const maxAttempts = 30;
      let attempts = 0;
      
      while (!isCompleted && attempts < maxAttempts) {
        attempts++;
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const statusData = await documentService.checkTranslationStatus(documentId);
        
        console.log('Translation status:', statusData);
        
        if (statusData.status === 'completed') {
          isCompleted = true;
          navigate(`/translator/edit/${documentId}`);
          return;
        }
      }
      
      if (!isCompleted) {
        toast.info('Translation is taking longer than expected. Please check back later.');
        navigate('/translator/dashboard');
      }
    } catch (error) {
      console.error('Error polling translation status:', error);
      toast.error('Error checking translation status');
    }
  };

  if (loading) {
    return <Spinner />;
  }

  // Get document type from filename extension
  const getDocumentType = (file) => {
    if (!file) return '';
    
    let extension = '';
    if (typeof file === 'string') {
      extension = file.split('.').pop().toLowerCase();
    } else {
      extension = file.name.split('.').pop().toLowerCase();
    }
    
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
      
      {/* Document Upload Progress */}
      {uploadState !== 'none' && (
        <div className="upload-progress-container">
          <div className="upload-status-header">
            <h3>Document Upload Status</h3>
            <div className={`upload-status-badge ${uploadState}`}>
              {uploadState === 'selected' && '📄 File Selected'}
              {uploadState === 'uploading' && '⏳ Uploading...'}
              {uploadState === 'uploaded' && '✅ Upload Complete'}
            </div>
          </div>
          
          {uploadState === 'uploading' && (
            <div className="progress-bar-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="progress-text">{uploadProgress}%</span>
            </div>
          )}
        </div>
      )}
      
      {/* Display document info if uploaded */}
      {uploadState === 'uploaded' && (translation.documentId || uploadedDocument?.documentId) && (
        <div className="document-info">
          <div className="section-header">
            <h2>Document Information</h2>
            <div className="document-badge">
              Document ID: {(uploadedDocument?.documentId || translation.documentId || '').substring(0, 8)}
            </div>
          </div>
          
          <div className="info-container">
            <div className="info-item">
              <label>Document Type</label>
              <span>{getDocumentType(documentFile) || translation.documentType || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Document Name</label>
              <span>{documentFile?.name || translation.documentHolder || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Document Uploader Section */}
      <div className="document-upload-section">
        <div className="section-header">
          <h2>Upload Document</h2>
        </div>
        
        <div className="upload-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
          />
          
          {/* File Selection State */}
          {uploadState === 'none' && (
            <div className="upload-box" onClick={handleBrowseClick}>
              <div className="upload-content">
                <i className="upload-icon">📤</i>
                <p>Drag and drop your document here, or</p>
                <button 
                  className="btn btn-primary"
                  type="button"
                >
                  Browse Files
                </button>
                <p className="upload-hint">Supported formats: PDF, Word, JPG, PNG</p>
              </div>
            </div>
          )}
          
          {/* File Selected State */}
          {uploadState === 'selected' && (
            <div className="file-selected-state">
              <div className="selected-file-info">
                <div className="file-details">
                  <i className="file-icon">📄</i>
                  <div className="file-meta">
                    <p className="file-name">{documentFile.name}</p>
                    <span className="file-size">({Math.round(documentFile.size / 1024)} KB)</span>
                  </div>
                </div>
                
                <div className="upload-reminder">
                  <div className="reminder-icon">⚠️</div>
                  <div className="reminder-text">
                    <strong>Ready to Upload</strong>
                    <p>Click "Upload Document" to proceed with the translation setup</p>
                  </div>
                </div>
              </div>
              
              <div className="file-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={handleBrowseClick}
                  disabled={processing}
                >
                  Change File
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleUploadDocument}
                  disabled={processing}
                >
                  {processing ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </div>
          )}
          
          {/* Uploading State */}
          {uploadState === 'uploading' && (
            <div className="uploading-state">
              <div className="upload-spinner">
                <div className="spinner"></div>
              </div>
              <p>Uploading your document...</p>
              <small>Please don't close this page</small>
            </div>
          )}
          
          {/* Upload Complete State */}
          {uploadState === 'uploaded' && (
            <div className="upload-complete-state">
              <div className="success-icon">✅</div>
              <p><strong>Upload Successful!</strong></p>
              <p>Your document is ready for translation setup</p>
              {documentFile && (
                <div className="uploaded-file-info">
                  <span>{documentFile.name}</span>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={handleBrowseClick}
                  >
                    Upload Different File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Original Document Viewer - Only show after upload */}
      {uploadState === 'uploaded' && translation.originalDocument && (
        <div className="original-document-section">
          <div className="section-header">
            <h2>Document Preview</h2>
            <div className="document-actions">
              <a 
                href={translation.originalDocument} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-sm btn-secondary"
              >
                <i className="icon-download"></i> View Original
              </a>
            </div>
          </div>
          <DocumentViewer 
            documentUrl={translation.originalDocument} 
            title={`${translation.documentType || 'Document'} - ${translation.documentHolder || 'Preview'}`}
            documentType={getDocumentType(documentFile) || getDocumentType(translation.originalDocument)}
            initialHeight={documentHeight}
            showPageControls={true}
          />
        </div>
      )}
      
      {/* Translation Options Form - Only show after upload */}
      {uploadState === 'uploaded' && (
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
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="sourceLanguage">Source Language</label>
                <select
                  id="sourceLanguage"
                  name="sourceLanguage"
                  value={translationContext.sourceLanguage}
                  onChange={handleInputChange}
                  disabled={processing}
                  className="form-select"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                  <option value="it">Italian</option>
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="targetLanguage">Target Language</label>
                <select
                  id="targetLanguage"
                  name="targetLanguage"
                  value={translationContext.targetLanguage}
                  onChange={handleInputChange}
                  disabled={processing}
                  className="form-select"
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                  <option value="it">Italian</option>
                </select>
              </div>
            </div>
            
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
                rows={4}
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
                disabled={processing || !uploadedDocument}
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
      )}
    </div>
  );
};

export default TranslationSetup;