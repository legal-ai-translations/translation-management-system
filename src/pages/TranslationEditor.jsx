// pages/TranslationEditor.jsx - Complete implementation with full-screen viewer
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Services
import translationService from '../services/translationService';
import documentService from '../services/documentService';

// Components
import Spinner from '../components/Spinner';
import FullScreenTranslationViewer from '../components/FullScreenTranslationViewer';

// Hooks
import { useChatbot } from '../hooks/useChatbot';

const TranslationEditor = () => {
  const { translationId } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionContext, setSelectionContext] = useState('');
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

  // Initialize chatbot with dynamic configuration
  const { config: chatbotConfig, updateConfig: updateChatbotConfig } = useChatbot({
    enabled: true,
    position: 'bottom-right',
    title: 'Translation Assistant',
    welcomeMessage: `Hi! I can help you improve this translation. You can:
    
🔧 **Quick Commands:**
• Type "/format" to improve formatting
• Type "/grammar" to fix grammar issues
• Type "/formal" to make text more formal
• Type "/casual" to make text more casual
• Type "/translate [text]" to retranslate specific text

📝 **Text Selection:**
• Select text in the editor, then ask me to improve it
• I'll focus on your selected text and provide context-aware suggestions

What would you like me to help you with?`,
    apiEndpoint: '/api/documents'
  });

  // Update chatbot configuration based on translation context
  useEffect(() => {
    if (translation.sourceLanguage && translation.targetLanguage) {
      updateChatbotConfig({
        title: `${translation.sourceLanguage.toUpperCase()} → ${translation.targetLanguage.toUpperCase()} Assistant`,
        welcomeMessage: `Hi! I'm helping you translate from ${translation.sourceLanguage.toUpperCase()} to ${translation.targetLanguage.toUpperCase()}.

🔧 **Quick Commands:**
• "/format" - Improve formatting
• "/grammar" - Fix grammar issues  
• "/formal" - Make text more formal
• "/casual" - Make text more casual
• "/translate [text]" - Retranslate specific text
• "/context" - Add more context to translation

📝 **Text Selection:**
Select any text in the editor and I'll help improve just that part!

What would you like me to help you with?`
      });
    }
  }, [translation.sourceLanguage, translation.targetLanguage, updateChatbotConfig]);

  // Handle text selection in TinyMCE editor
  useEffect(() => {
    const handleSelectionChange = () => {
      if (editorRef.current) {
        const editor = editorRef.current;
        const selection = editor.selection;
        
        if (selection) {
          const selectedContent = selection.getContent({ format: 'text' });
          
          if (selectedContent && selectedContent.trim().length > 0) {
            setSelectedText(selectedContent.trim());
            
            // Get surrounding context (previous and next 100 characters)
            const fullContent = editor.getContent({ format: 'text' });
            const selectionStart = fullContent.indexOf(selectedContent);
            const contextStart = Math.max(0, selectionStart - 100);
            const contextEnd = Math.min(fullContent.length, selectionStart + selectedContent.length + 100);
            const context = fullContent.substring(contextStart, contextEnd);
            
            setSelectionContext(context);
            
            // Update chatbot with selection info
            updateChatbotConfig({
              welcomeMessage: `I see you've selected: "${selectedContent.substring(0, 100)}${selectedContent.length > 100 ? '...' : ''}"

I can help you:
• Improve this specific text
• Retranslate it with different style
• Fix grammar or formatting issues
• Make it more formal/casual

What would you like me to do with this selection?`
            });
          } else {
            setSelectedText('');
            setSelectionContext('');
          }
        }
      }
    };

    // Add selection change listener to TinyMCE
    if (editorRef.current) {
      const editor = editorRef.current;
      editor.on('selectionchange', handleSelectionChange);
      editor.on('keyup', handleSelectionChange);
      editor.on('mouseup', handleSelectionChange);
      
      return () => {
        editor.off('selectionchange', handleSelectionChange);
        editor.off('keyup', handleSelectionChange);
        editor.off('mouseup', handleSelectionChange);
      };
    }
  }, [editorRef.current, updateChatbotConfig]);

  // Fetch translation data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
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
        // Set the preview URL for original document
        const previewUrl = documentService.getOriginalDocumentPreviewUrl(documentId);
        setTranslation(prev => ({
          ...prev,
          originalDocument: previewUrl
        }));
        
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

  // Enhanced HTML update handler with selection support
  const handleHtmlUpdate = (newHtml, changes) => {
    setHtmlContent(newHtml);
    
    // Update the current page in htmlFiles if we're in multi-page mode
    if (htmlFiles.length > 0) {
      const currentPageIndex = selectedPage - 1;
      if (htmlFiles[currentPageIndex]) {
        const updatedHtmlFiles = [...htmlFiles];
        updatedHtmlFiles[currentPageIndex] = {
          ...updatedHtmlFiles[currentPageIndex],
          content: newHtml
        };
        setHtmlFiles(updatedHtmlFiles);
      }
    }
    
    // Clear selection after update
    setSelectedText('');
    setSelectionContext('');
    
    // Reset chatbot welcome message
    updateChatbotConfig({
      welcomeMessage: `Great! I've updated the content. 

🔧 **Quick Commands:**
• "/format" - Improve formatting
• "/grammar" - Fix grammar issues  
• "/formal" - Make text more formal
• "/casual" - Make text more casual
• "/translate [text]" - Retranslate specific text

📝 Select any text to get specific help with that section!`
    });
  };

  // Enhanced chatbot message handler with command processing
  const handleChatbotMessage = async (message, selectedText, context) => {
    // Process quick commands
    if (message.startsWith('/')) {
      const command = message.toLowerCase();
      let processedMessage = '';
      
      if (command === '/format') {
        processedMessage = selectedText 
          ? `Improve the formatting and structure of this selected text: "${selectedText}"`
          : 'Improve the overall formatting and structure of the document';
      } else if (command === '/grammar') {
        processedMessage = selectedText
          ? `Fix any grammar issues in this selected text: "${selectedText}"`
          : 'Check and fix any grammar issues in the document';
      } else if (command === '/formal') {
        processedMessage = selectedText
          ? `Make this selected text more formal: "${selectedText}"`
          : 'Make the entire document more formal in tone';
      } else if (command === '/casual') {
        processedMessage = selectedText
          ? `Make this selected text more casual: "${selectedText}"`
          : 'Make the entire document more casual in tone';
      } else if (command.startsWith('/translate ')) {
        const textToTranslate = command.substring(11);
        processedMessage = `Retranslate this text with improved accuracy: "${textToTranslate}"`;
      } else if (command === '/context') {
        processedMessage = selectedText
          ? `Provide better contextual translation for: "${selectedText}". Consider the surrounding context: "${context}"`
          : 'Improve the overall translation considering document context';
      } else {
        processedMessage = message; // Use original message if command not recognized
      }
      
      return processedMessage;
    }
    
    // If there's selected text, include it in the message
    if (selectedText) {
      return `${message}

**Selected text:** "${selectedText}"
**Context:** "${context}"

Please focus on improving just the selected text based on my request.`;
    }
    
    return message;
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
    <div className="translation-editor-page">
      <FullScreenTranslationViewer
        originalDocument={translation.originalDocument}
        htmlContent={htmlContent || translation.finalTranslation || translation.aiTranslation}
        onHtmlChange={setHtmlContent}
        editorRef={editorRef}
        documentType={translation.documentType}
        documentTitle={translation.documentHolder || `Translation ${translationId}`}
        onSave={handleSaveTranslation}
        onApprove={handleApproveTranslation}
        saving={saving}
        selectedPage={selectedPage}
        totalPages={htmlFiles.length || 1}
        onPageChange={handlePageChange}
        // Chatbot props
        documentId={translation.documentId || translationId}
        onHtmlUpdate={handleHtmlUpdate}
        selectedText={selectedText}
        selectionContext={selectionContext}
        onProcessMessage={handleChatbotMessage}
        chatbotConfig={chatbotConfig}
        sourceLanguage={translation.sourceLanguage}
        targetLanguage={translation.targetLanguage}
      />
    </div>
  );
};

export default TranslationEditor;