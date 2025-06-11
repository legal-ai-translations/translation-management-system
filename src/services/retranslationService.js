// services/retranslationService.js
import apiClient from './api';

/**
 * Service for handling retranslation requests
 */
const retranslationService = {
  /**
   * Retranslate selected text with different modes
   * @param {Object} params - Retranslation parameters
   * @param {string} params.documentId - ID of the document
   * @param {string} params.text - Text to retranslate
   * @param {string} params.mode - Translation mode (standard, alternative, formal)
   * @param {string} params.context - Surrounding context for better translation
   * @param {string} params.sourceLanguage - Source language (optional)
   * @param {string} params.targetLanguage - Target language (optional)
   * @returns {Promise<Object>} - Retranslation result
   */
  retranslateText: async (params) => {
    try {
      const {
        documentId,
        text,
        mode = 'standard',
        context = '',
        sourceLanguage,
        targetLanguage
      } = params;

      const response = await apiClient.post(`/documents/${documentId}/retranslate`, {
        text,
        mode,
        context,
        sourceLanguage,
        targetLanguage
      });

      return response.data;
    } catch (error) {
      console.error('Error retranslating text:', error);
      throw new Error(`Retranslation failed: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Get retranslation suggestions for selected text
   * @param {Object} params - Parameters for getting suggestions
   * @param {string} params.documentId - ID of the document
   * @param {string} params.text - Text to get suggestions for
   * @param {string} params.context - Surrounding context
   * @returns {Promise<Object>} - Retranslation suggestions
   */
  getRetranslationSuggestions: async (params) => {
    try {
      const { documentId, text, context = '' } = params;

      const response = await apiClient.post(`/documents/${documentId}/retranslate/suggestions`, {
        text,
        context
      });

      return response.data;
    } catch (error) {
      console.error('Error getting retranslation suggestions:', error);
      throw new Error(`Failed to get suggestions: ${error.response?.data?.message || error.message}`);
    }
  },

  /**
   * Save retranslation feedback
   * @param {Object} params - Feedback parameters
   * @param {string} params.documentId - ID of the document
   * @param {string} params.originalText - Original text
   * @param {string} params.translatedText - Translated text
   * @param {string} params.mode - Translation mode used
   * @param {boolean} params.approved - Whether the retranslation was approved
   * @param {string} params.feedback - Optional feedback text
   * @returns {Promise<Object>} - Feedback submission result
   */
  submitRetranslationFeedback: async (params) => {
    try {
      const {
        documentId,
        originalText,
        translatedText,
        mode,
        approved,
        feedback = ''
      } = params;

      const response = await apiClient.post(`/documents/${documentId}/retranslate/feedback`, {
        originalText,
        translatedText,
        mode,
        approved,
        feedback
      });

      return response.data;
    } catch (error) {
      console.error('Error submitting retranslation feedback:', error);
      throw new Error(`Failed to submit feedback: ${error.response?.data?.message || error.message}`);
    }
  }
};

export default retranslationService;