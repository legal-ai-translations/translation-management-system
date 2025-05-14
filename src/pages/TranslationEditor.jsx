// pages/TranslationEditor.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Services
import translationService from '../services/translationService';

// Components
import Spinner from '../components/Spinner';
import TinyMCEEditor from '../components/TinyMCEEditor';

const TranslationEditor = () => {
  const { translationId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translation, setTranslation] = useState({
    originalDocument: null,
    aiTranslation: '',
    aiTranslationUrl: null,
    finalTranslation: '',
    sourceLanguage: '',
    targetLanguage: '',
    documentType: '',
    documentHolder: '',
    status: ''
  });

  // Fetch translation data
  useEffect(() => {
    const fetchTranslation = async () => {
      try {
        setLoading(true);
        const data = await translationService.getTranslationById(translationId);
        setTranslation(data);
        
        // Check if the translation is in the right state (ready_for_review)
        if (data.status !== 'ready_for_review') {
          toast.warning('This translation is not ready for review yet');
          navigate('/translator/dashboard');
          return;
        }
        
        // If the AI translation is a URL, we need to fetch the content separately
        if (data.aiTranslationUrl && !data.aiTranslation) {
          await fetchAiTranslationContent(data.aiTranslationUrl);
        }
      } catch (error) {
        console.error('Error fetching translation:', error);
        toast.error('Failed to load translation data');
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
  }, [translationId, navigate]);

  // Fetch AI translation content from URL
  const fetchAiTranslationContent = async (url) => {
    try {
      setContentLoading(true);
      console.log('Fetching translation content from:', url);
      
      // Fetch the content from the URL
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch translation content: ${response.statusText}`);
      }
      
      // Try to determine the content type
      const contentType = response.headers.get('content-type');
      console.log('Content type:', contentType);
      
      let content = '';
      if (contentType && contentType.includes('application/json')) {
        // Handle JSON response
        const jsonData = await response.json();
        content = jsonData.content || JSON.stringify(jsonData, null, 2);
      } else if (contentType && contentType.includes('text/html')) {
        // For HTML files, keep the HTML structure for TinyMCE
        content = await response.text();
      } else if (contentType && (contentType.includes('text/plain'))) {
        // Handle text response - convert newlines to <br> tags for better rendering
        const textContent = await response.text();
        // Preserve paragraphs and line breaks by converting to HTML
        content = textContent
          .split('\n\n')
          .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
          .join('');
      } else if (contentType && contentType.includes('application/pdf')) {
        // For PDF files, we can't directly load the content into TinyMCE
        content = "<p>This is a PDF file. The AI translation content cannot be displayed directly in the editor. Please refer to the original document panel.</p>";
      } else {
        // Default case - try to get as text and convert to HTML
        const textContent = await response.text();
        content = `<p>${textContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`;
      }
      
      console.log('Processed content:', content.substring(0, 100) + '...');
      
      // Update translation state with the fetched content
      setTranslation(prev => ({
        ...prev,
        aiTranslation: content
      }));
    } catch (error) {
      console.error('Error fetching AI translation content:', error);
      toast.error('Failed to load AI translation content');
    } finally {
      setContentLoading(false);
    }
  };

  // Save translation
  const handleSaveTranslation = async () => {
    if (editorRef.current) {
      try {
        setSaving(true);
        const content = editorRef.current.getContent();
        console.log('Saving content:', content.substring(0, 100) + '...');
        
        await translationService.saveTranslation(translationId, content);
        
        // Update the local state
        setTranslation(prev => ({
          ...prev,
          finalTranslation: content
        }));
        
        toast.success('Translation saved successfully');
      } catch (error) {
        console.error('Error saving translation:', error);
        toast.error('Failed to save translation');
      } finally {
        setSaving(false);
      }
    }
  };

  // Complete and approve translation
  const handleApproveTranslation = async () => {
    if (editorRef.current) {
      try {
        setSaving(true);
        const content = editorRef.current.getContent();
        
        await translationService.approveTranslation(translationId, content);
        
        toast.success('Translation approved successfully');
        navigate('/translator/dashboard');
      } catch (error) {
        console.error('Error approving translation:', error);
        toast.error('Failed to approve translation');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="translation-editor">
      <div className="editor-header">
        <h1>Translation Editor</h1>
        <div className="translation-meta">
          <p><strong>Document Type:</strong> {translation.documentType}</p>
          <p><strong>Document Holder:</strong> {translation.documentHolder}</p>
          <p><strong>Source Language:</strong> {translation.sourceLanguage}</p>
          <p><strong>Target Language:</strong> {translation.targetLanguage}</p>
        </div>
      </div>

      <div className="editor-container">
        <div className="original-document">
          <h2>Original Document</h2>
          {translation.originalDocument ? (
            <iframe 
              src={translation.originalDocument} 
              title="Original Document"
              className="document-frame"
            />
          ) : (
            <div className="document-placeholder">Original document not available</div>
          )}
        </div>
        
        <div className="translation-editor-container">
          <h2>Edit Translation</h2>
          {contentLoading ? (
            <Spinner />
          ) : (
            <TinyMCEEditor
              editorRef={editorRef}
              initialValue={translation.finalTranslation || translation.aiTranslation}
              onEditorChange={(content) => {
                // Optional: If you want to update state on each change
                setTranslation(prev => ({...prev, finalTranslation: content}));
              }}
              height={500}
            />
          )}
          <div className="editor-actions">
            <button 
              className="btn btn-secondary" 
              onClick={handleSaveTranslation}
              disabled={saving || contentLoading}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleApproveTranslation}
              disabled={saving || contentLoading}
            >
              {saving ? 'Processing...' : 'Approve Translation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationEditor;