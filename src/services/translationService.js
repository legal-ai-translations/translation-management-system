// services/translationService.js
import apiClient from './api';

/**
 * Service for handling translation-related API calls
 */
const translationService = {
  /**
   * Get all translations with optional filters
   * @param {Object} filters - Filter options for translations
   * @param {string} filters.sourceLanguage - Filter by source language
   * @param {string} filters.targetLanguage - Filter by target language
   * @param {string} filters.status - Filter by status
   * @returns {Promise<Array>} - Array of translation objects
   */
  getAllTranslations: async (filters = {}) => {
    try {
      const response = await apiClient.get('/translations', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching translations:', error);
      throw error;
    }
  },

  /**
   * Get a specific translation by ID
   * @param {string} translationId - ID of the translation to retrieve
   * @returns {Promise<Object>} - Translation object
   */
  getTranslationById: async (translationId) => {
    try {
      const response = await apiClient.get(`/translations/${translationId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching translation ${translationId}:`, error);
      throw error;
    }
  },

  /**
   * Fetch AI translation content from a file URL
   * @param {string} url - URL of the AI translation file
   * @returns {Promise<string>} - Content of the AI translation
   */
  fetchAiTranslationContent: async (url) => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch translation content: ${response.statusText}`);
      }
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const jsonData = await response.json();
        return jsonData.content || JSON.stringify(jsonData, null, 2);
      } else if (contentType && contentType.includes('text/html')) {
        return await response.text();
      } else if (contentType && contentType.includes('application/pdf')) {
        return "<p>This is a PDF file. The content cannot be displayed directly in the editor.</p>";
      } else {
        // Default to text for most other formats
        const text = await response.text();
        return text
          .split('\n\n')
          .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
          .join('');
      }
    } catch (error) {
      console.error('Error fetching AI translation content:', error);
      throw error;
    }
  },

  /**
   * Claim a translation task as a translator
   * @param {string} translationId - ID of the translation to claim
   * @returns {Promise<Object>} - Response object
   */
  claimTranslation: async (translationId) => {
    try {
      const response = await apiClient.post(`/translations/${translationId}/claim`);
      return response.data;
    } catch (error) {
      console.error(`Error claiming translation ${translationId}:`, error);
      throw error;
    }
  },

  /**
   * Start the AI translation process
   * @param {string} translationId - ID of the translation to process
   * @param {Object} context - Context for the translation
   * @param {string} context.translationMode - Mode of translation (standard, interactive, template)
   * @param {string} context.additionalContext - Additional context for translation
   * @param {string} context.templateId - ID of template to use (if applicable)
   * @returns {Promise<Object>} - Response object
   */
  startTranslation: async (translationId, context) => {
    try {
      const response = await apiClient.post(`/translations/${translationId}/translate`, context);
      return response.data;
    } catch (error) {
      console.error(`Error starting translation ${translationId}:`, error);
      throw error;
    }
  },

  /**
   * Update a translation draft
   * @param {string} translationId - ID of the translation to update
   * @param {string} finalTranslation - Updated translation content
   * @returns {Promise<Object>} - Response object
   */
  saveTranslation: async (translationId, finalTranslation) => {
    try {
      const response = await apiClient.put(`/translations/${translationId}`, {
        finalTranslation
      });
      return response.data;
    } catch (error) {
      console.error(`Error saving translation ${translationId}:`, error);
      throw error;
    }
  },

  /**
   * Approve and finalize a translation
   * @param {string} translationId - ID of the translation to approve
   * @param {string} finalTranslation - Final translation content
   * @returns {Promise<Object>} - Response object
   */
  approveTranslation: async (translationId, finalTranslation) => {
    try {
      const response = await apiClient.put(`/translations/${translationId}/approve`, {
        finalTranslation
      });
      return response.data;
    } catch (error) {
      console.error(`Error approving translation ${translationId}:`, error);
      throw error;
    }
  },

  /**
   * Upload a translated file
   * @param {string} translationId - ID of the translation
   * @param {File} file - Translated file to upload
   * @returns {Promise<Object>} - Response object with file URL
   */
  uploadTranslatedFile: async (translationId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient.post(`/translations/${translationId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error uploading translated file for ${translationId}:`, error);
      throw error;
    }
  }
};

export default translationService;