// components/DocumentViewer.jsx - Fixed version for flexible height
import React, { useState, useEffect, useRef } from 'react';

/**
 * Enhanced DocumentViewer component with truly flexible height
 * @param {Object} props
 * @param {string} props.documentUrl - URL of the document to display
 * @param {string} props.title - Title of the document
 * @param {string} props.documentType - Type of document (pdf, image, etc.)
 * @param {number} props.initialHeight - Initial height in pixels (default: 600)
 * @param {boolean} props.showPageControls - Whether to show page navigation controls
 */
const DocumentViewer = ({ 
  documentUrl, 
  title = 'Document', 
  documentType = '',
  initialHeight = 600,
  showPageControls = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewerHeight, setViewerHeight] = useState(initialHeight); // Track viewer height separately
  
  const iframeRef = useRef(null);
  const viewerRef = useRef(null);
  
  // Effect for height adjustment based on window size
  useEffect(() => {
    // Function to adjust height based on window size
    const adjustHeight = () => {
      const windowHeight = window.innerHeight;
      const headerHeight = 60; // Height of the toolbar
      
      // Calculate document height based on window and container size
      // Keeping minimum and maximum constraints for good UX
      let calculatedHeight;
      
      if (documentType === 'image' || 
          documentUrl?.toLowerCase().match(/\.(jpe?g|png|gif|bmp)$/i)) {
        // For images, make viewer taller
        calculatedHeight = Math.max(
          Math.min(Math.floor(windowHeight * 0.7), 800), // Max 800px
          450 // Min 450px for images
        );
      } else {
        // For other document types (PDF, Word, etc.)
        calculatedHeight = Math.max(
          Math.min(Math.floor(windowHeight * 0.6), 700), // Max 700px
          400 // Min 400px
        );
      }
      
      // Set the new height
      setViewerHeight(calculatedHeight);
    };

    // Adjust height initially and on window resize
    adjustHeight();
    window.addEventListener('resize', adjustHeight);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', adjustHeight);
    };
  }, [documentType, documentUrl]);
  
  // Effect to handle iframe loading
  useEffect(() => {
    // Set initial loading state
    setIsLoading(true);
    
    // Function to handle iframe load event
    const handleIframeLoad = () => {
      console.log('Document iframe loaded');
      setIsLoading(false);
      
      // Try to determine total pages for PDFs
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          // For PDF.js viewers
          if (iframe.contentWindow.PDFViewerApplication) {
            const pdfViewer = iframe.contentWindow.PDFViewerApplication;
            pdfViewer.initializedPromise.then(() => {
              setTotalPages(pdfViewer.pagesCount || 1);
            });
          }
          
          // For other PDF viewers that expose page count
          else if (iframe.contentWindow.document.querySelector('.page-count')) {
            const pageCountElement = iframe.contentWindow.document.querySelector('.page-count');
            const pageCount = parseInt(pageCountElement.textContent, 10);
            if (!isNaN(pageCount)) {
              setTotalPages(pageCount);
            }
          }
        }
      } catch (error) {
        console.log('Could not determine PDF pages count:', error);
      }
    };
    
    // Add load event listener to iframe
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      
      // Clean up on unmount
      return () => {
        iframe.removeEventListener('load', handleIframeLoad);
      };
    }
  }, [documentUrl]);
  
  // Toggle fullscreen view
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  // Handle zoom in
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 20, 200));
  };
  
  // Handle zoom out
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 20, 50));
  };
  
  // Reset zoom
  const handleZoomReset = () => {
    setZoom(100);
  };
  
  // Handle page navigation
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      
      // Attempt to change page in PDF viewers
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          // For PDF.js viewers
          if (iframe.contentWindow.PDFViewerApplication) {
            const pdfViewer = iframe.contentWindow.PDFViewerApplication;
            pdfViewer.page = currentPage - 1;
          }
        }
      } catch (error) {
        console.log('Could not change PDF page');
      }
    }
  };
  
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
      
      // Attempt to change page in PDF viewers
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentWindow) {
          // For PDF.js viewers
          if (iframe.contentWindow.PDFViewerApplication) {
            const pdfViewer = iframe.contentWindow.PDFViewerApplication;
            pdfViewer.page = currentPage + 1;
          }
        }
      } catch (error) {
        console.log('Could not change PDF page');
      }
    }
  };
  
  // Determine document icon/type label
  const getDocumentTypeIcon = () => {
    if (documentType === 'pdf' || documentUrl?.toLowerCase().endsWith('.pdf')) {
      return '📄';
    } else if (
      documentType === 'image' || 
      documentUrl?.toLowerCase().match(/\.(jpe?g|png|gif|bmp)$/i)
    ) {
      return '🖼️';
    } else if (
      documentType === 'word' || 
      documentUrl?.toLowerCase().match(/\.(docx?|rtf)$/i)
    ) {
      return '📝';
    }
    
    return '📄';
  };
  
  const getDocumentTypeLabel = () => {
    if (documentType === 'pdf' || documentUrl?.toLowerCase().endsWith('.pdf')) {
      return 'PDF';
    } else if (
      documentType === 'image' || 
      documentUrl?.toLowerCase().match(/\.(jpe?g|png|gif|bmp)$/i)
    ) {
      return 'IMAGE';
    } else if (
      documentType === 'word' || 
      documentUrl?.toLowerCase().match(/\.(docx?|rtf)$/i)
    ) {
      return 'WORD';
    }
    
    return documentType?.toUpperCase() || 'DOCUMENT';
  };
  
  // If no document URL is provided
  if (!documentUrl) {
    return (
      <div 
        className="document-viewer document-placeholder" 
        ref={viewerRef} 
        style={{height: `${viewerHeight}px`}}
      >
        <div className="document-placeholder-content">
          <i className="document-icon">📄</i>
          <p>No document available</p>
        </div>
      </div>
    );
  }
  
  // Document viewer content
  const viewerContent = (
    <>
      <div className="document-viewer-toolbar">
        <div className="document-type">
          <span className="document-type-icon">{getDocumentTypeIcon()}</span>
          <span className="document-type-label">{getDocumentTypeLabel()}</span>
        </div>
        
        {showPageControls && getDocumentTypeLabel() === 'PDF' && (
          <div className="document-page-controls">
            <button
              className="page-button"
              onClick={handlePreviousPage}
              disabled={currentPage <= 1}
              aria-label="Previous Page"
            >
              ◀
            </button>
            <span className="page-number">
              {currentPage} / {totalPages}
            </span>
            <button
              className="page-button"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              aria-label="Next Page"
            >
              ▶
            </button>
          </div>
        )}
        
        <div className="document-zoom-controls">
          <button
            className="zoom-button"
            onClick={handleZoomOut}
            title="Zoom Out"
            disabled={zoom <= 50}
            aria-label="Zoom Out"
          >
            －
          </button>
          <span className="zoom-level">{zoom}%</span>
          <button
            className="zoom-button"
            onClick={handleZoomIn}
            title="Zoom In"
            disabled={zoom >= 200}
            aria-label="Zoom In"
          >
            ＋
          </button>
          <button
            className="zoom-button"
            onClick={handleZoomReset}
            title="Reset Zoom"
            aria-label="Reset Zoom"
          >
            ↺
          </button>
        </div>
        
        <button
          className="fullscreen-button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? "⤓" : "⤢"}
        </button>
      </div>
      
      <div className="document-viewer-content">
        {isLoading && (
          <div className="document-loading">
            <div className="document-loading-spinner"></div>
            <div className="document-loading-text">Loading document...</div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={documentUrl}
          title={title}
          className="document-frame"
          style={{ 
            transform: `scale(${zoom / 100})`, 
            transformOrigin: 'top left',
            width: `${100 * (100 / zoom)}%`,
            height: `${100 * (100 / zoom)}%`
          }}
        />
      </div>
    </>
  );
  
  // Render the component
  return isFullscreen ? (
    <div className="document-viewer-fullscreen">
      <div className="document-viewer-fullscreen-modal">
        <div className="document-viewer-fullscreen-header">
          <h3>{title}</h3>
          <button 
            className="close-button" 
            onClick={toggleFullscreen}
            aria-label="Close fullscreen view"
          >
            ×
          </button>
        </div>
        <div className="document-viewer-fullscreen-body">
          {viewerContent}
        </div>
      </div>
    </div>
  ) : (
    <div 
      className="document-viewer" 
      ref={viewerRef}
      style={{
        height: `${viewerHeight}px`
      }}
    >
      {viewerContent}
    </div>
  );
};

export default DocumentViewer;