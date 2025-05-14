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
  }
};

export default documentService;