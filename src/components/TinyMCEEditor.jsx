// components/TinyMCEEditor.jsx - Enhanced with table preview fix
import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';

const TinyMCEEditor = ({ 
  initialValue, 
  onEditorChange, 
  height = 500,
  disabled = false,
  editorRef = null
}) => {
  const scrollPositionRef = useRef({ top: 0, left: 0 });
  const activeElementRef = useRef(null);
  const isRestoringRef = useRef(false);

  // Log initial value type for debugging
  console.log('TinyMCE initial value type:', typeof initialValue);
  console.log('TinyMCE initial value preview:', initialValue?.substring(0, 100));

  // Save scroll position and active element
  const saveScrollPosition = (editor) => {
    try {
      if (!editor || !editor.getBody() || isRestoringRef.current) return;
      
      const editorBody = editor.getBody();
      const selection = editor.selection;
      
      // Save scroll position
      scrollPositionRef.current = {
        top: editorBody.scrollTop,
        left: editorBody.scrollLeft
      };
      
      // Save active element and cursor position
      if (selection) {
        try {
          const activeNode = selection.getNode();
          const range = selection.getRng();
          
          activeElementRef.current = {
            bookmark: selection.getBookmark(2, true),
            elementTagName: activeNode ? activeNode.tagName : null,
            elementId: activeNode ? activeNode.id : null,
            elementClassName: activeNode ? activeNode.className : null,
            textContent: activeNode ? activeNode.textContent?.substring(0, 50) : null,
            rangeInfo: {
              startOffset: range.startOffset,
              endOffset: range.endOffset,
              collapsed: range.collapsed
            }
          };
        } catch (selectionError) {
          // Ignore selection errors
        }
      }
    } catch (error) {
      console.log('Could not save scroll position:', error);
    }
  };

  // Restore scroll position and keep active element in view
  const restoreScrollPosition = (editor) => {
    if (!editor || !editor.getBody() || isRestoringRef.current) return;
    
    isRestoringRef.current = true;
    
    try {
      const editorBody = editor.getBody();
      
      // Restore scroll position first
      if (scrollPositionRef.current) {
        editorBody.scrollTop = scrollPositionRef.current.top;
        editorBody.scrollLeft = scrollPositionRef.current.left;
      }
      
      // Restore cursor position
      if (activeElementRef.current && activeElementRef.current.bookmark) {
        try {
          editor.selection.moveToBookmark(activeElementRef.current.bookmark);
          
          // Ensure the active element is visible
          const currentNode = editor.selection.getNode();
          if (currentNode) {
            // Check if element is in viewport
            const rect = currentNode.getBoundingClientRect();
            const editorRect = editorBody.getBoundingClientRect();
            
            // If element is outside visible area, scroll it into view
            if (rect.top < editorRect.top || rect.bottom > editorRect.bottom) {
              currentNode.scrollIntoView({
                behavior: 'auto',
                block: 'center',
                inline: 'nearest'
              });
            }
          }
        } catch (bookmarkError) {
          // Fallback: maintain scroll position
          if (scrollPositionRef.current) {
            editorBody.scrollTop = scrollPositionRef.current.top;
            editorBody.scrollLeft = scrollPositionRef.current.left;
          }
        }
      }
    } catch (error) {
      console.log('Could not restore scroll position:', error);
    }
    
    // Reset flag after a short delay
    setTimeout(() => {
      isRestoringRef.current = false;
    }, 100);
  };

  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js" // Path to your self-hosted TinyMCE
      onInit={(evt, editor) => {
        if (editorRef) {
          editorRef.current = editor;
        }
        console.log('TinyMCE initialized');
      }}
      initialValue={initialValue}
      disabled={disabled}
      init={{
        height: height,
        menubar: true,
        plugins: [
          'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
          'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
          'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons'
        ],

        toolbar: 'undo redo | blocks | ' +
          'bold italic forecolor | alignleft aligncenter ' +
          'alignright alignjustify | bullist numlist outdent indent | ' +
          'removeformat | table | image | code | preview | help',
        
        // ENHANCED: Content style with better table styling for preview
        content_style: `
          body { 
            font-family: Helvetica, Arial, sans-serif; 
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 20px;
          }
          
          /* Enhanced table styling for preview */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
            border: 1px solid #ddd;
            background-color: #fff;
          }
          
          table th,
          table td {
            border: 1px solid #ddd;
            padding: 12px 8px;
            text-align: left;
            vertical-align: top;
          }
          
          table th {
            background-color: #f5f5f5;
            font-weight: bold;
            color: #333;
          }
          
          table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          table tr:hover {
            background-color: #f0f8ff;
          }
          
          /* Improve table cell editing visibility */
          td:focus, th:focus {
            outline: 2px solid #007cba;
            outline-offset: -1px;
            background-color: rgba(0, 124, 186, 0.1);
          }
          
          /* Better selection visibility */
          ::selection {
            background-color: rgba(0, 124, 186, 0.3);
          }
          
          /* Additional styling for better preview */
          h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
          }
          
          p {
            margin-bottom: 16px;
            line-height: 1.6;
          }
          
          ul, ol {
            margin: 16px 0;
            padding-left: 32px;
          }
          
          li {
            margin-bottom: 8px;
          }
          
          blockquote {
            border-left: 4px solid #ddd;
            margin: 16px 0;
            padding-left: 16px;
            color: #666;
            font-style: italic;
          }
          
          code {
            background-color: #f1f1f1;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          
          pre {
            background-color: #f1f1f1;
            padding: 16px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 16px 0;
          }
        `,
        
        // ENHANCED: Preview styles - inject CSS directly into preview window (must be a single string)
        preview_styles: `
          body { 
            font-family: Helvetica, Arial, sans-serif; 
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 20px;
          }
          
          table {
            border-collapse: collapse !important;
            width: 100%;
            margin: 16px 0;
            border: 1px solid #ddd !important;
            background-color: #fff;
          }
          
          table th,
          table td {
            border: 1px solid #ddd !important;
            padding: 12px 8px !important;
            text-align: left;
            vertical-align: top;
          }
          
          table th {
            background-color: #f5f5f5 !important;
            font-weight: bold;
            color: #333;
          }
          
          table tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          table tr:hover {
            background-color: #f0f8ff;
          }
          
          h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 24px;
            margin-bottom: 16px;
          }
          
          p {
            margin-bottom: 16px;
            line-height: 1.6;
          }
          
          ul, ol {
            margin: 16px 0;
            padding-left: 32px;
          }
          
          li {
            margin-bottom: 8px;
          }
          
          blockquote {
            border-left: 4px solid #ddd;
            margin: 16px 0;
            padding-left: 16px;
            color: #666;
            font-style: italic;
          }
          
          code {
            background-color: #f1f1f1;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          
          pre {
            background-color: #f1f1f1;
            padding: 16px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 16px 0;
          }
        `,
        
        branding: false,
        promotion: false,
        
        // Additional settings for better HTML handling
        valid_elements: '*[*]', // Allow all elements and attributes
        extended_valid_elements: '*[*]', // Additional validation for custom elements
        entity_encoding: 'raw', // Keep HTML entities as is
        encoding: 'html', // Use HTML encoding
        convert_fonts_to_spans: true,
        fix_list_elements: true,
        browser_spellcheck: true,
        
        // ENHANCED: Table-specific configuration
        table_default_attributes: {
          border: '1',
          cellpadding: '8',
          cellspacing: '0'
        },
        table_default_styles: {
          'border-collapse': 'collapse',
          'width': '100%',
          'border': '1px solid #ddd'
        },
        table_cell_class_list: [
          {title: 'Header cell', value: 'header-cell'},
          {title: 'Data cell', value: 'data-cell'}
        ],
        table_row_class_list: [
          {title: 'Header row', value: 'header-row'},
          {title: 'Odd row', value: 'odd-row'},
          {title: 'Even row', value: 'even-row'}
        ],
        
        // Scroll position management settings
        auto_focus: false,
        
        // Format HTML on initialization
        setup: (editor) => {
          // ENHANCED: Custom preview handler for better table display
          editor.addCommand('mcePreview', () => {
            const content = editor.getContent();
            const previewWindow = window.open('', 'preview', 'width=800,height=600,scrollbars=yes,resizable=yes');
            
            const previewHTML = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Preview</title>
                <style>
                  body { 
                    font-family: Helvetica, Arial, sans-serif; 
                    font-size: 14px;
                    line-height: 1.6;
                    color: #333;
                    max-width: 100%;
                    margin: 0;
                    padding: 20px;
                    background-color: #fff;
                  }
                  
                  table {
                    border-collapse: collapse !important;
                    width: 100%;
                    margin: 16px 0;
                    border: 1px solid #ddd !important;
                    background-color: #fff;
                  }
                  
                  table th,
                  table td {
                    border: 1px solid #ddd !important;
                    padding: 12px 8px !important;
                    text-align: left;
                    vertical-align: top;
                  }
                  
                  table th {
                    background-color: #f5f5f5 !important;
                    font-weight: bold;
                    color: #333;
                  }
                  
                  table tr:nth-child(even) {
                    background-color: #f9f9f9;
                  }
                  
                  table tr:hover {
                    background-color: #f0f8ff;
                  }
                  
                  h1, h2, h3, h4, h5, h6 {
                    color: #2c3e50;
                    margin-top: 24px;
                    margin-bottom: 16px;
                  }
                  
                  p {
                    margin-bottom: 16px;
                    line-height: 1.6;
                  }
                  
                  ul, ol {
                    margin: 16px 0;
                    padding-left: 32px;
                  }
                  
                  li {
                    margin-bottom: 8px;
                  }
                  
                  blockquote {
                    border-left: 4px solid #ddd;
                    margin: 16px 0;
                    padding-left: 16px;
                    color: #666;
                    font-style: italic;
                  }
                  
                  code {
                    background-color: #f1f1f1;
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: 'Courier New', monospace;
                  }
                  
                  pre {
                    background-color: #f1f1f1;
                    padding: 16px;
                    border-radius: 4px;
                    overflow-x: auto;
                    margin: 16px 0;
                  }
                  
                  /* Print styles */
                  @media print {
                    table, table th, table td {
                      border: 1px solid #000 !important;
                    }
                  }
                </style>
              </head>
              <body>
                ${content}
              </body>
              </html>
            `;
            
            previewWindow.document.write(previewHTML);
            previewWindow.document.close();
            previewWindow.focus();
          });

          // Save scroll position before content changes
          editor.on('BeforeSetContent', (e) => {
            if (!e.initial) {
              saveScrollPosition(editor);
            }
          });
          
          // Restore scroll position after content changes
          editor.on('SetContent', (e) => {
            if (!e.initial) {
              setTimeout(() => restoreScrollPosition(editor), 10);
              setTimeout(() => restoreScrollPosition(editor), 50);
              setTimeout(() => restoreScrollPosition(editor), 100);
            }
          });
          
          // Save position on various user interactions
          editor.on('keyup mouseup click focus', (e) => {
            setTimeout(() => saveScrollPosition(editor), 10);
          });
          
          // Handle input events to maintain scroll position
          editor.on('input', (e) => {
            saveScrollPosition(editor);
            
            setTimeout(() => {
              const editorBody = editor.getBody();
              const currentScrollTop = editorBody.scrollTop;
              
              if (currentScrollTop === 0 && scrollPositionRef.current.top > 50) {
                console.log('Detected scroll jump, restoring position...');
                restoreScrollPosition(editor);
              }
            }, 50);
          });
          
          // Handle paste events
          editor.on('paste', (e) => {
            saveScrollPosition(editor);
            setTimeout(() => {
              restoreScrollPosition(editor);
            }, 100);
          });
          
          // Handle table modifications
          editor.on('TableModified', (e) => {
            setTimeout(() => {
              restoreScrollPosition(editor);
            }, 50);
          });
          
          // Handle undo/redo
          editor.on('undo redo', (e) => {
            setTimeout(() => {
              restoreScrollPosition(editor);
            }, 50);
          });
          
          // Debug events
          editor.on('PreInit', (e) => {
            console.log('TinyMCE PreInit event');
          });
          
          // Additional keyboard shortcuts for manual scroll management
          editor.addShortcut('ctrl+shift+s', 'Save scroll position', () => {
            saveScrollPosition(editor);
            editor.notificationManager.open({
              text: 'Scroll position saved',
              type: 'info',
              timeout: 1000
            });
          });
          
          editor.addShortcut('ctrl+shift+r', 'Restore scroll position', () => {
            restoreScrollPosition(editor);
            editor.notificationManager.open({
              text: 'Scroll position restored',
              type: 'info',
              timeout: 1000
            });
          });
        }
      }}
      onEditorChange={(content, editor) => {
        // Save position before calling the change handler
        if (editor && editor.getBody) {
          saveScrollPosition(editor);
        }
        
        // Call the original change handler
        if (onEditorChange) {
          onEditorChange(content, editor);
        }
        
        // Restore position after change handler
        if (editor && editor.getBody) {
          setTimeout(() => restoreScrollPosition(editor), 10);
        }
      }}
    />
  );
};

export default TinyMCEEditor;