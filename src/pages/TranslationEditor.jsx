// pages/TranslationEditor.jsx with HTML content fetching
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Services
import translationService from '../services/translationService';
import documentService from '../services/documentService';

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
  const [htmlContent, setHtmlContent] = useState('');
  const [htmlFiles, setHtmlFiles] = useState([]);
  const [selectedPage, setSelectedPage] = useState(1);

  // Fetch translation data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check if translationId is a job/translation ID or document ID
        if (translationId) {
          try {
            // First try to get translation by ID (traditional flow)
            const data = await translationService.getTranslationById(translationId);
            setTranslation(data);
            
            // If the AI translation is a URL, we need to fetch the content separately
            if (data.aiTranslationUrl && !data.aiTranslation) {
              await fetchAiTranslationContent(data.aiTranslationUrl);
            }
          } catch (error) {
            console.log('Not a traditional translation ID, trying as document ID');
            
            // If not found, assume it's a document ID from new flow
            try {
              // Try to get the htmls response first to get both content and original document URL
              const htmlsData = await documentService.getTranslatedHTMLs(translationId);
              
              if (htmlsData.success) {
                // Process HTML content
                await fetchTranslatedHtmls(translationId);
                
                // Set basic translation data
                setTranslation(prev => ({
                  ...prev,
                  documentType: 'Document',
                  documentHolder: translationId,
                  status: 'completed',
                  documentId: translationId
                }));
              } else {
                // If htmls request failed, check the status
                const statusData = await documentService.checkTranslationStatus(translationId);
                
                if (statusData.status === 'completed') {
                  // Still try to fetch HTML content
                  await fetchTranslatedHtmls(translationId);
                  
                  // Set basic translation data
                  setTranslation(prev => ({
                    ...prev,
                    originalDocument: statusData.dropbox?.url || null,
                    documentType: 'Document',
                    documentHolder: translationId,
                    status: statusData.status,
                    documentId: translationId
                  }));
                } else {
                  toast.warning('This translation is not ready for review yet');
                  navigate('/translator/dashboard');
                  return;
                }
              }
            } catch (innerError) {
              console.error('Error fetching document data:', innerError);
              toast.error('Failed to load document data');
              navigate('/translator/dashboard');
            }
          }
        } else {
          toast.error('No translation ID provided');
          navigate('/translator/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error fetching translation:', error);
        toast.error('Failed to load translation data');
        navigate('/translator/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      
      // Also set the HTML content
      setHtmlContent(content);
    } catch (error) {
      console.error('Error fetching AI translation content:', error);
      toast.error('Failed to load AI translation content');
    } finally {
      setContentLoading(false);
    }
  };

  // Fetch translated HTML files for a document
  const fetchTranslatedHtmls = async (documentId) => {
    try {
      setContentLoading(true);
      
      const response = await documentService.getTranslatedHTMLs(documentId);
      
      if (response.success) {
        // Set the original document URL if available
        if (response.originalDocument && response.originalDocument.url) {
          setTranslation(prev => ({
            ...prev,
            originalDocument: response.originalDocument.url
          }));
        }
        
        // Set HTML files
        if (response.htmlFiles && response.htmlFiles.length > 0) {
          setHtmlFiles(response.htmlFiles);
          
          // Select the first page by default
          if (response.htmlFiles[0]) {
            setSelectedPage(1);
            setHtmlContent(response.htmlFiles[0].content);
          }
        } else {
          toast.warning('No translated HTML files found');
        }
      } else {
        toast.warning('Failed to fetch translated content');
      }
    } catch (error) {
      console.error('Error fetching translated HTMLs:', error);
      toast.error('Failed to load translated content');
    } finally {
      setContentLoading(false);
    }
  };

  // Handle page selection change
  const handlePageChange = (pageNumber) => {
    const pageIndex = pageNumber - 1;
    
    if (htmlFiles[pageIndex]) {
      setSelectedPage(pageNumber);
      setHtmlContent(htmlFiles[pageIndex].content);
    }
  };

  // Save translation
  const handleSaveTranslation = async () => {
    if (editorRef.current) {
      try {
        setSaving(true);
        const content = editorRef.current.getContent();
        console.log('Saving content:', content.substring(0, 100) + '...');
        
        // For traditional flow
        if (!translation.documentId) {
          await translationService.saveTranslation(translationId, content);
        } else {
          // For new document flow, save the current page
          const currentPageIndex = selectedPage - 1;
          
          if (htmlFiles[currentPageIndex]) {
            // Update the content in the htmlFiles array
            const updatedHtmlFiles = [...htmlFiles];
            updatedHtmlFiles[currentPageIndex] = {
              ...updatedHtmlFiles[currentPageIndex],
              content: content
            };
            
            setHtmlFiles(updatedHtmlFiles);
            // TODO: Add endpoint to save edited HTML content
            toast.info('Content saved (Note: API endpoint for saving edited HTML not implemented)');
          }
        }
        
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
        
        // For traditional flow
        if (!translation.documentId) {
          await translationService.approveTranslation(translationId, content);
        } else {
          // For new document flow, approve all pages
          // TODO: Add endpoint to approve HTML content
          toast.info('Translation approved (Note: API endpoint for approving HTML not implemented)');
        }
        
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
          <p><strong>Document ID:</strong> {translation.documentId || translationId}</p>
          <p><strong>Document Type:</strong> {translation.documentType || 'Document'}</p>
          {translation.documentHolder && (
            <p><strong>Document Holder:</strong> {translation.documentHolder}</p>
          )}
          {translation.sourceLanguage && (
            <p><strong>Source Language:</strong> {translation.sourceLanguage}</p>
          )}
          {translation.targetLanguage && (
            <p><strong>Target Language:</strong> {translation.targetLanguage}</p>
          )}
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
          <div className="editor-header-actions">
            <h2>Edit Translation</h2>
            
            {/* Page selector for multi-page documents */}
            {htmlFiles.length > 1 && (
              <div className="page-selector">
                <label htmlFor="pageSelect">Page:</label>
                <select 
                  id="pageSelect" 
                  value={selectedPage}
                  onChange={(e) => handlePageChange(Number(e.target.value))}
                  disabled={contentLoading || saving}
                >
                  {htmlFiles.map((file, index) => (
                    <option key={index} value={index + 1}>
                      Page {index + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          
          {contentLoading ? (
            <Spinner />
          ) : (
            <TinyMCEEditor
              editorRef={editorRef}
              initialValue={htmlContent || translation.finalTranslation || translation.aiTranslation}
              onEditorChange={(content) => {
                // Optional: If you want to update state on each change
                setHtmlContent(content);
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