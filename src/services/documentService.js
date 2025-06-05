// services/documentService.js
import apiClient from './api';

/**
 * Service for handling document upload and management API calls
 */
const documentService = {
  /**
   * Upload documents for translation
   * @param {FormData} formData - FormData object containing files and metadata
   * @returns {Promise<Object>} - Quote information
   */
  uploadDocuments: async (formData) => {
    try {
      // Set content type to multipart/form-data for file uploads
      const response = await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading documents:', error);
      throw error;
    }
  },

  /**
   * Process payment for a translation quote
   * @param {string} quoteId - ID of the quote to process payment for
   * @returns {Promise<Object>} - Payment confirmation
   */
  processPayment: async (quoteId) => {
    try {
      const response = await apiClient.post(`/documents/${quoteId}/payment`);
      return response.data;
    } catch (error) {
      console.error(`Error processing payment for quote ${quoteId}:`, error);
      throw error;
    }
  },

  /**
   * Get document details by ID
   * @param {string} documentId - ID of the document to retrieve
   * @returns {Promise<Object>} - Document object
   */
  getDocumentById: async (documentId) => {
    try {
      const response = await apiClient.get(`/documents/${documentId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching document ${documentId}:`, error);
      throw error;
    }
  },

  /**
   * Get all documents for a user by email
   * @param {string} email - Email of the user
   * @returns {Promise<Array>} - Array of document objects
   */
  getDocumentsByUser: async (email) => {
    try {
      const response = await apiClient.get('/documents', { params: { email } });
      return response.data;
    } catch (error) {
      console.error('Error fetching user documents:', error);
      throw error;
    }
  },

  /**
   * Upload a document file for translation
   * @param {File} file - The document file to upload
   * @returns {Promise<Object>} - Document upload response with document ID
   */
  uploadDocument: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post('http://localhost:3002/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  /**
   * Trigger translation for a document
   * @param {string} documentId - ID of the document to translate
   * @param {Object} translationOptions - Options for translation
   * @returns {Promise<Object>} - Translation job response
   */
  triggerTranslation: async (documentId, translationOptions = {}) => {
    try {
      const response = await apiClient.post(`http://localhost:3002/api/documents/${documentId}/translate`, translationOptions);
      return response.data;
    } catch (error) {
      console.error(`Error triggering translation for document ${documentId}:`, error);
      throw error;
    }
  },

  /**
   * Check translation status for a document
   * @param {string} documentId - ID of the document
   * @returns {Promise<Object>} - Translation status response
   */
  checkTranslationStatus: async (documentId) => {
    try {
      const response = await apiClient.get(`http://localhost:3002/api/documents/${documentId}/status`);
      return response.data;
    } catch (error) {
      console.error(`Error checking translation status for document ${documentId}:`, error);
      throw error;
    }
  },

  /**
   * Get translated HTML files for a document
   * @param {string} documentId - ID of the document
   * @returns {Promise<Object>} - HTML files response
   */
  getTranslatedHTMLs: async (documentId) => {
    try {
      const response = await apiClient.get(`http://localhost:3002/api/documents/${documentId}/htmls`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching translated HTMLs for document ${documentId}:`, error);
      throw error;
    }
  },

  getOriginalDocumentPreviewUrl: (documentId) => {
    return `http://localhost:3002/api/documents/${documentId}/original?preview=true`;
  },

  // services/documentService.js
  improveHTMLWithSelection: async (documentId, improveRequest) => {
    try {
      const response = await apiClient.post(`http://localhost:3002/api/documents/${documentId}/improve-html`, {
        currentHtml: improveRequest.currentHtml,
        userFeedback: improveRequest.userFeedback,
        selectedHtml: improveRequest.selectedHtml,
        selectedText: improveRequest.selectedText,
        selectionContext: improveRequest.selectionContext,
        hasSelection: improveRequest.hasSelection,
        isCommand: improveRequest.isCommand,
        commandType: improveRequest.commandType,
        conversationHistory: improveRequest.conversationHistory || []
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error improving HTML with selection for document ${documentId}:`, error);
      throw error;
    }
  }
};

export default documentService;