// components/FullScreenTranslationViewer.jsx - Full-screen viewer for translation editing
import React, { useState, useRef, useEffect } from 'react';
import TinyMCEEditor from './TinyMCEEditor';
import DocumentViewer from './DocumentViewer';
import ChatbotWidget from './ChatbotWidget';

const FullScreenTranslationViewer = ({
  originalDocument,
  htmlContent,
  onHtmlChange,
  editorRef,
  documentType = '',
  documentTitle = 'Document',
  onSave,
  onApprove,
  saving = false,
  selectedPage = 1,
  totalPages = 1,
  onPageChange,
  // Chatbot props
  documentId,
  onHtmlUpdate,
  selectedText = '',
  selectionContext = '',
  onProcessMessage,
  chatbotConfig = {},
  sourceLanguage = '',
  targetLanguage = ''
}) => {
  const [viewMode, setViewMode] = useState('split'); // 'split', 'original-full', 'editor-full'
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [splitRatio, setSplitRatio] = useState(50); // Percentage for left panel
  const [isDragging, setIsDragging] = useState(false);
  const [showChatbot, setShowChatbot] = useState(true);
  const [chatbotMode, setChatbotMode] = useState('overlay'); // 'overlay', 'panel', 'hidden'
  
  const containerRef = useRef(null);
  const resizerRef = useRef(null);

  // Handle full-screen toggle
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('msfullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('msfullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Handle split panel resizing
  const handleMouseDown = (e) => {
    if (viewMode === 'split') {
      setIsDragging(true);
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && viewMode === 'split' && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setSplitRatio(Math.max(20, Math.min(80, newRatio))); // Limit between 20% and 80%
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Calculate dynamic heights
  const getViewerHeight = () => {
    if (isFullScreen) {
      return 'calc(100vh - 120px)'; // Account for toolbar
    }
    return 'calc(100vh - 200px)'; // Account for header and other UI
  };

  const renderToolbar = () => (
    <div className="fullscreen-viewer-toolbar">
      <div className="toolbar-left">
        <div className="view-mode-controls">
          <button
            className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => setViewMode('split')}
            title="Side by side view"
          >
            ⚌ Split
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'original-full' ? 'active' : ''}`}
            onClick={() => setViewMode('original-full')}
            title="Original document full screen"
          >
            📄 Original
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'editor-full' ? 'active' : ''}`}
            onClick={() => setViewMode('editor-full')}
            title="Editor full screen"
          >
            ✏️ Editor
          </button>
        </div>

        {/* Chatbot Controls */}
        <div className="chatbot-controls">
          <button
            className={`chatbot-mode-btn ${chatbotMode === 'panel' ? 'active' : ''}`}
            onClick={() => setChatbotMode(chatbotMode === 'panel' ? 'overlay' : 'panel')}
            title={chatbotMode === 'panel' ? 'Switch to overlay mode' : 'Switch to panel mode'}
          >
            💬 {chatbotMode === 'panel' ? 'Panel' : 'Float'}
          </button>
          <button
            className={`chatbot-toggle-btn ${showChatbot ? 'active' : ''}`}
            onClick={() => setShowChatbot(!showChatbot)}
            title={showChatbot ? 'Hide chatbot' : 'Show chatbot'}
          >
            {showChatbot ? '💬' : '💬'}
          </button>
        </div>

        {totalPages > 1 && (
          <div className="page-controls">
            <button
              onClick={() => onPageChange && onPageChange(selectedPage - 1)}
              disabled={selectedPage <= 1}
              className="page-btn"
            >
              ◀
            </button>
            <span className="page-info">
              Page {selectedPage} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange && onPageChange(selectedPage + 1)}
              disabled={selectedPage >= totalPages}
              className="page-btn"
            >
              ▶
            </button>
          </div>
        )}
      </div>

      <div className="toolbar-center">
        <h3 className="document-title">{documentTitle}</h3>
      </div>

      <div className="toolbar-right">
        <button
          className="action-btn save-btn"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? '💾 Saving...' : '💾 Save'}
        </button>
        <button
          className="action-btn approve-btn"
          onClick={onApprove}
          disabled={saving}
        >
          {saving ? '⏳ Processing...' : '✅ Approve'}
        </button>
        <button
          className="fullscreen-btn"
          onClick={toggleFullScreen}
          title={isFullScreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullScreen ? '⤓' : '⤢'}
        </button>
      </div>
    </div>
  );

  const renderSplitView = () => (
    <div className={`split-view-container ${chatbotMode === 'panel' ? 'with-chatbot-panel' : ''}`} style={{ height: getViewerHeight() }}>
      {/* Original Document Panel */}
      <div 
        className="split-panel original-panel"
        style={{ 
          width: chatbotMode === 'panel' ? `${splitRatio * 0.75}%` : `${splitRatio}%`
        }}
      >
        <div className="panel-header">
          <h4>📄 Original Document</h4>
          <button
            className="expand-btn"
            onClick={() => setViewMode('original-full')}
            title="Expand original document"
          >
            ⤢
          </button>
        </div>
        <div className="panel-content">
          {originalDocument ? (
            <DocumentViewer
              documentUrl={originalDocument}
              title={documentTitle}
              documentType={documentType}
              initialHeight="100%"
              showPageControls={false} // Controls are in main toolbar
            />
          ) : (
            <div className="document-placeholder">
              <div className="placeholder-content">
                <div className="placeholder-icon">📄</div>
                <p>Original document not available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resizer */}
      <div
        ref={resizerRef}
        className="split-resizer"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'col-resize' : 'col-resize' }}
      >
        <div className="resizer-handle">⋮⋮</div>
      </div>

      {/* Editor Panel */}
      <div 
        className="split-panel editor-panel"
        style={{ 
          width: chatbotMode === 'panel' ? `${(100 - splitRatio) * 0.75}%` : `${100 - splitRatio}%`
        }}
      >
        <div className="panel-header">
          <h4>✏️ Translation Editor</h4>
          <div className="panel-header-actions">
            {selectedText && (
              <span className="selection-indicator" title={`Selected: ${selectedText.substring(0, 50)}...`}>
                ✏️ Text Selected
              </span>
            )}
            <button
              className="expand-btn"
              onClick={() => setViewMode('editor-full')}
              title="Expand editor"
            >
              ⤢
            </button>
          </div>
        </div>
        <div className="panel-content">
          <TinyMCEEditor
            editorRef={editorRef}
            initialValue={htmlContent}
            onEditorChange={onHtmlChange}
            height="100%"
          />
        </div>
      </div>

      {/* Chatbot Panel (when in panel mode) */}
      {showChatbot && chatbotMode === 'panel' && (
        <div className="chatbot-panel">
          <div className="chatbot-panel-header">
            <h4>💬 AI Assistant</h4>
            <div className="chatbot-panel-controls">
              <button
                className="panel-control-btn"
                onClick={() => setChatbotMode('overlay')}
                title="Switch to floating mode"
              >
                📱
              </button>
              <button
                className="panel-control-btn"
                onClick={() => setShowChatbot(false)}
                title="Hide chatbot"
              >
                ×
              </button>
            </div>
          </div>
          <div className="chatbot-panel-content">
            <ChatbotWidget
              initialHtml={htmlContent}
              documentId={documentId}
              onHtmlUpdate={onHtmlUpdate}
              enabled={true}
              position="embedded" // Special position for panel mode
              title={chatbotConfig.title || `${sourceLanguage.toUpperCase()} → ${targetLanguage.toUpperCase()} Assistant`}
              welcomeMessage={chatbotConfig.welcomeMessage || "Hi! I can help you improve this translation."}
              selectedText={selectedText}
              selectionContext={selectionContext}
              onProcessMessage={onProcessMessage}
              isEmbedded={true} // Flag to tell chatbot it's embedded
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderOriginalFullView = () => (
    <div className="full-view-container" style={{ height: getViewerHeight() }}>
      <div className="full-view-header">
        <h4>📄 Original Document - Full View</h4>
        <div className="view-controls">
          <button
            className="view-control-btn"
            onClick={() => setViewMode('split')}
            title="Back to split view"
          >
            ⚌ Split View
          </button>
          <button
            className="view-control-btn"
            onClick={() => setViewMode('editor-full')}
            title="Switch to editor"
          >
            ✏️ Editor
          </button>
        </div>
      </div>
      <div className="full-view-content">
        {originalDocument ? (
          <DocumentViewer
            documentUrl={originalDocument}
            title={documentTitle}
            documentType={documentType}
            initialHeight="100%"
            showPageControls={false}
          />
        ) : (
          <div className="document-placeholder full">
            <div className="placeholder-content">
              <div className="placeholder-icon">📄</div>
              <h3>Original document not available</h3>
              <p>Switch to editor view to continue translation work</p>
              <button
                className="btn btn-primary"
                onClick={() => setViewMode('editor-full')}
              >
                Open Editor
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderEditorFullView = () => (
    <div className="full-view-container" style={{ height: getViewerHeight() }}>
      <div className="full-view-header">
        <h4>✏️ Translation Editor - Full View</h4>
        <div className="view-controls">
          <button
            className="view-control-btn"
            onClick={() => setViewMode('split')}
            title="Back to split view"
          >
            ⚌ Split View
          </button>
          <button
            className="view-control-btn"
            onClick={() => setViewMode('original-full')}
            title="Switch to original"
          >
            📄 Original
          </button>
        </div>
      </div>
      <div className="full-view-content">
        <TinyMCEEditor
          editorRef={editorRef}
          initialValue={htmlContent}
          onEditorChange={onHtmlChange}
          height="100%"
        />
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={`fullscreen-translation-viewer ${isFullScreen ? 'fullscreen-active' : ''}`}
    >
      {renderToolbar()}
      
      <div className="viewer-content">
        {viewMode === 'split' && renderSplitView()}
        {viewMode === 'original-full' && renderOriginalFullView()}
        {viewMode === 'editor-full' && renderEditorFullView()}
      </div>

      {/* Floating Chatbot (when in overlay mode) */}
      {showChatbot && chatbotMode === 'overlay' && (
        <ChatbotWidget
          initialHtml={htmlContent}
          documentId={documentId}
          onHtmlUpdate={onHtmlUpdate}
          enabled={true}
          position="bottom-right"
          title={chatbotConfig.title || `${sourceLanguage.toUpperCase()} → ${targetLanguage.toUpperCase()} Assistant`}
          welcomeMessage={chatbotConfig.welcomeMessage || "Hi! I can help you improve this translation."}
          selectedText={selectedText}
          selectionContext={selectionContext}
          onProcessMessage={onProcessMessage}
        />
      )}

      {/* Keyboard shortcuts overlay */}
      {isFullScreen && (
        <div className="keyboard-shortcuts">
          <div className="shortcuts-content">
            <strong>Keyboard Shortcuts:</strong>
            <span>F11: Toggle fullscreen</span>
            <span>Ctrl+1: Split view</span>
            <span>Ctrl+2: Original full</span>
            <span>Ctrl+3: Editor full</span>
            <span>Ctrl+`: Toggle chatbot</span>
            <span>Ctrl+Shift+C: Chatbot panel mode</span>
            <span>Ctrl+S: Save</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullScreenTranslationViewer;