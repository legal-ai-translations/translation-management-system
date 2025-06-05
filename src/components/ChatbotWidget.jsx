// components/ChatbotWidget.jsx - Enhanced with text selection and commands
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import documentService from '../services/documentService';

const ChatbotWidget = ({ 
  initialHtml = '', 
  documentId = null, 
  onHtmlUpdate = null,
  enabled = true,
  position = 'bottom-right',
  apiEndpoint = '/api/documents',
  title = 'AI Assistant',
  welcomeMessage = 'Hi! How can I help you improve this content?',
  selectedText = '',
  selectionContext = '',
  onProcessMessage = null,
  isEmbedded = false // NEW: Flag for embedded mode
}) => {
  const [isOpen, setIsOpen] = useState(isEmbedded ? true : false); // Auto-open when embedded
  const [isMinimized, setIsMinimized] = useState(isEmbedded ? false : true); // Never minimized when embedded
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentHtml, setCurrentHtml] = useState(initialHtml);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const widgetRef = useRef(null);

  // Quick command definitions
  const quickCommands = [
    { 
      command: '/format', 
      description: 'Improve formatting and structure',
      icon: '📝'
    },
    { 
      command: '/grammar', 
      description: 'Fix grammar issues',
      icon: '✏️'
    },
    { 
      command: '/formal', 
      description: 'Make text more formal',
      icon: '🎩'
    },
    { 
      command: '/casual', 
      description: 'Make text more casual',
      icon: '😊'
    },
    { 
      command: '/translate', 
      description: 'Retranslate with better accuracy',
      icon: '🔄'
    },
    { 
      command: '/context', 
      description: 'Improve contextual translation',
      icon: '🎯'
    }
  ];

  // Initialize with welcome message when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        type: 'bot',
        content: welcomeMessage,
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length, welcomeMessage]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Update current HTML when prop changes
  useEffect(() => {
    if (initialHtml !== currentHtml) {
      setCurrentHtml(initialHtml);
    }
  }, [initialHtml]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const addMessage = (type, content, metadata = {}) => {
    const newMessage = {
      id: Date.now() + Math.random(),
      type,
      content,
      timestamp: new Date(),
      ...metadata
    };
    setMessages(prev => [...prev, newMessage]);
    
    if (type === 'bot' && (isMinimized || !isOpen)) {
      setHasNewMessage(true);
    }
    
    return newMessage;
  };

  const toggleWidget = () => {
    if (isMinimized) {
      setIsMinimized(false);
      setIsOpen(true);
      setHasNewMessage(false);
    } else {
      setIsMinimized(true);
    }
  };

  const closeWidget = () => {
    setIsOpen(false);
    setIsMinimized(true);
  };

  const handleQuickCommand = (command) => {
    setCurrentInput(command);
    setShowCommands(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading || !documentId) return;
  
    let userMessage = currentInput.trim();
    setCurrentInput('');
    setShowCommands(false);
  
    // Process message through parent handler if available
    if (onProcessMessage) {
      userMessage = await onProcessMessage(userMessage, selectedText, selectionContext);
    }
  
    // Add user message
    addMessage('user', currentInput.trim());
  
    // Add loading message
    const loadingMessage = addMessage('bot', 'Processing your request...', { isLoading: true });
  
    setIsLoading(true);
  
    try {
      // NEW: Enhanced request payload with HTML selection data
      const requestPayload = {
        // Current complete HTML with data-original attributes
        currentHtml: currentHtml,
        
        // User's feedback/command
        userFeedback: userMessage,
        
        // Selected HTML content (if any)
        selectedHtml: getSelectedHtmlFromEditor(),
        
        // Selected text (plain text)
        selectedText: selectedText || null,
        
        // Context around selection
        selectionContext: selectionContext || null,
        
        // Whether user has made a selection
        hasSelection: !!selectedText,
        
        // Command type detection
        isCommand: userMessage.startsWith('/'),
        commandType: userMessage.startsWith('/') ? userMessage.split(' ')[0].substring(1) : null,
        
        // Conversation history for context
        conversationHistory: messages.slice(-10)
      };
  
      // Call the enhanced API endpoint
      const result = await documentService.improveHTMLWithSelection(documentId, requestPayload)

      if (result.success && result.improvedHtml) {
        // Simple approach - just update state
        setCurrentHtml(result.improvedHtml);
        
        if (onHtmlUpdate) {
          onHtmlUpdate(result.improvedHtml, result.changes);
        }
        
        // Add success message
        addMessage('bot', result.explanation || 'Content updated!', {
          htmlUpdate: true,
          changes: result.changes || []
        });
        
        toast.success('Content updated successfully!');
      }
  
      // Rest of your existing response handling...
    } catch (error) {
      // Error handling...
    }
  };
  
  // NEW: Helper function to get selected HTML content with data-original
// NEW: Much simpler function to get selected HTML directly from TinyMCE
const getSelectedHtmlFromEditor = () => {
    // Try to get the editor reference from parent component
    // You'll need to pass editorRef as a prop to ChatbotWidget
    if (window.tinymce && window.tinymce.activeEditor) {
      const editor = window.tinymce.activeEditor;
      const selection = editor.selection;
      
      if (selection && selectedText) {
        // Get the selected HTML content (with formatting, tags, and attributes)
        const selectedHtml = selection.getContent({ format: 'html' });
        console.log('Selected HTML:', selectedHtml);
        return selectedHtml;
      }
    }
    
    return null;
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    } else if (e.key === '/' && currentInput === '') {
      e.preventDefault();
      setShowCommands(true);
    } else if (e.key === 'Escape') {
      setShowCommands(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCurrentInput(value);
    
    // Show commands when typing /
    if (value === '/') {
      setShowCommands(true);
    } else if (!value.startsWith('/')) {
      setShowCommands(false);
    }
  };

  const handleRevert = (messageId) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message && message.previousHtml) {
      setCurrentHtml(message.previousHtml);
      if (onHtmlUpdate) {
        onHtmlUpdate(message.previousHtml, []);
      }
      toast.info('Reverted to previous version');
    }
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPositionClasses = () => {
    if (isEmbedded) {
      return 'chatbot-widget embedded-mode';
    }
    
    const baseClasses = 'chatbot-widget';
    switch (position) {
      case 'bottom-left':
        return `${baseClasses} chatbot-widget-bottom-left`;
      case 'top-right':
        return `${baseClasses} chatbot-widget-top-right`;
      case 'top-left':
        return `${baseClasses} chatbot-widget-top-left`;
      default:
        return `${baseClasses} chatbot-widget-bottom-right`;
    }
  };

  if (!enabled || !documentId) return null;

  // For embedded mode, always show the full interface
  if (isEmbedded) {
    return (
      <div ref={widgetRef} className={getPositionClasses()}>
        <div className="chatbot-container embedded">
          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-message ${message.type}`}>
                <div className="message-content">
                  {message.isLoading ? (
                    <div className="loading-message">
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                      
                      {message.htmlUpdate && message.changes && message.changes.length > 0 && (
                        <div className="changes-summary">
                          <h5>Changes made:</h5>
                          <ul>
                            {message.changes.map((change, index) => (
                              <li key={index}>{change}</li>
                            ))}
                          </ul>
                          {message.selectedText && (
                            <div className="focused-selection">
                              <strong>Focused on:</strong> "{message.selectedText.substring(0, 50)}..."
                            </div>
                          )}
                          <button 
                            className="revert-btn"
                            onClick={() => handleRevert(message.id)}
                          >
                            Undo Changes
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="message-time">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Selection Info Panel for embedded mode */}
          {selectedText && (
            <div className="selection-info-panel embedded">
              <div className="selection-header">
                <span className="selection-icon">✏️</span>
                <span className="selection-title">Selected Text</span>
                <span className="selection-length">({selectedText.length} chars)</span>
              </div>
              <div className="selection-preview">
                "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
              </div>
              <div className="selection-actions">
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickCommand('/grammar')}
                >
                  ✏️ Grammar
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickCommand('/formal')}
                >
                  🎩 Formal
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickCommand('/translate')}
                >
                  🔄 Retranslate
                </button>
              </div>
            </div>
          )}

          {/* Quick Commands Panel for embedded mode */}
          {showCommands && (
            <div className="quick-commands-panel embedded">
              <div className="commands-header">
                <span>Quick Commands</span>
                <button 
                  className="close-commands-btn"
                  onClick={() => setShowCommands(false)}
                >
                  ×
                </button>
              </div>
              <div className="commands-grid">
                {quickCommands.map((cmd, index) => (
                  <button
                    key={index}
                    className="command-btn"
                    onClick={() => handleQuickCommand(cmd.command)}
                    title={cmd.description}
                  >
                    <span className="command-icon">{cmd.icon}</span>
                    <span className="command-text">{cmd.command}</span>
                    <span className="command-desc">{cmd.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions for first-time users in embedded mode */}
          {messages.length === 1 && !selectedText && (
            <div className="suggestions-container embedded">
              <p>Try these quick commands:</p>
              <div className="suggestions">
                <button
                  className="suggestion-btn"
                  onClick={() => handleQuickCommand('/format')}
                >
                  📝 Improve formatting
                </button>
                <button
                  className="suggestion-btn"
                  onClick={() => handleQuickCommand('/grammar')}
                >
                  ✏️ Fix grammar
                </button>
                <button
                  className="suggestion-btn"
                  onClick={() => setCurrentInput('Make this translation more natural and fluent')}
                >
                  🎯 Make more natural
                </button>
              </div>
            </div>
          )}

          {/* Input for embedded mode */}
          <div className="chatbot-input embedded">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                value={currentInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={
                  selectedText 
                    ? "Describe what you want to change about the selected text..." 
                    : "Ask me to improve the content or type / for commands..."
                }
                rows={2}
                disabled={isLoading}
                className="message-input"
              />
              <div className="input-controls">
                <button
                  className="commands-toggle-btn"
                  onClick={() => setShowCommands(!showCommands)}
                  title="Show quick commands"
                  disabled={isLoading}
                >
                  ⚡
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!currentInput.trim() || isLoading}
                  className="send-button"
                >
                  {isLoading ? '⏳' : '➤'}
                </button>
              </div>
            </div>
            <div className="input-hint">
              {selectedText 
                ? `Working with selection: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`
                : 'Press Enter to send • Type / for commands'
              }
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular floating widget mode
  return (
    <div ref={widgetRef} className={getPositionClasses()}>
      {/* Minimized State - Floating Button */}
      {isMinimized && (
        <button 
          className={`chatbot-fab ${hasNewMessage ? 'has-notification' : ''} ${selectedText ? 'has-selection' : ''}`}
          onClick={toggleWidget}
          title={selectedText ? `${title} - Text Selected` : title}
        >
          💬
          {hasNewMessage && <span className="notification-dot"></span>}
          {selectedText && <span className="selection-indicator">✏️</span>}
        </button>
      )}

      {/* Expanded State - Chat Interface */}
      {!isMinimized && isOpen && (
        <div className="chatbot-container">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-icon">💬</span>
              <div>
                <h4>{title}</h4>
                {documentId && (
                  <span className="document-id">Doc: {documentId.substring(0, 8)}...</span>
                )}
                {selectedText && (
                  <span className="selection-status">✏️ Text Selected ({selectedText.length} chars)</span>
                )}
              </div>
            </div>
            <div className="chatbot-controls">
              <button 
                className="chatbot-control-btn minimize-btn"
                onClick={() => setIsMinimized(true)}
                title="Minimize"
              >
                ─
              </button>
              <button 
                className="chatbot-control-btn close-btn"
                onClick={closeWidget}
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Selection Info Panel */}
          {selectedText && (
            <div className="selection-info-panel">
              <div className="selection-header">
                <span className="selection-icon">✏️</span>
                <span className="selection-title">Selected Text</span>
                <span className="selection-length">({selectedText.length} characters)</span>
              </div>
              <div className="selection-preview">
                "{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"
              </div>
              <div className="selection-actions">
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickCommand('/grammar')}
                  title="Fix grammar in selection"
                >
                  ✏️ Grammar
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickCommand('/formal')}
                  title="Make selection more formal"
                >
                  🎩 Formal
                </button>
                <button 
                  className="quick-action-btn"
                  onClick={() => handleQuickCommand('/translate')}
                  title="Retranslate selection"
                >
                  🔄 Retranslate
                </button>
              </div>
            </div>
          )}

          {/* Quick Commands Panel */}
          {showCommands && (
            <div className="quick-commands-panel">
              <div className="commands-header">
                <span>Quick Commands</span>
                <button 
                  className="close-commands-btn"
                  onClick={() => setShowCommands(false)}
                >
                  ×
                </button>
              </div>
              <div className="commands-grid">
                {quickCommands.map((cmd, index) => (
                  <button
                    key={index}
                    className="command-btn"
                    onClick={() => handleQuickCommand(cmd.command)}
                    title={cmd.description}
                  >
                    <span className="command-icon">{cmd.icon}</span>
                    <span className="command-text">{cmd.command}</span>
                    <span className="command-desc">{cmd.description}</span>
                  </button>
                ))}
              </div>
              <div className="commands-tip">
                💡 Type / in the input to see commands
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-message ${message.type}`}>
                <div className="message-content">
                  {message.isLoading ? (
                    <div className="loading-message">
                      <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{message.content}</p>
                      
                      {message.htmlUpdate && message.changes && message.changes.length > 0 && (
                        <div className="changes-summary">
                          <h5>Changes made:</h5>
                          <ul>
                            {message.changes.map((change, index) => (
                              <li key={index}>{change}</li>
                            ))}
                          </ul>
                          {message.selectedText && (
                            <div className="focused-selection">
                              <strong>Focused on:</strong> "{message.selectedText.substring(0, 50)}..."
                            </div>
                          )}
                          <button 
                            className="revert-btn"
                            onClick={() => handleRevert(message.id)}
                          >
                            Undo Changes
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="message-time">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions for first-time users */}
          {messages.length === 1 && !selectedText && (
            <div className="suggestions-container">
              <p>Try these quick commands:</p>
              <div className="suggestions">
                <button
                  className="suggestion-btn"
                  onClick={() => handleQuickCommand('/format')}
                >
                  📝 Improve formatting
                </button>
                <button
                  className="suggestion-btn"
                  onClick={() => handleQuickCommand('/grammar')}
                >
                  ✏️ Fix grammar
                </button>
                <button
                  className="suggestion-btn"
                  onClick={() => setCurrentInput('Make this translation more natural and fluent')}
                >
                  🎯 Make more natural
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input">
            <div className="input-wrapper">
              <textarea
                ref={inputRef}
                value={currentInput}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={
                  selectedText 
                    ? "Describe what you want to change about the selected text..." 
                    : "Ask me to improve the content or type / for commands..."
                }
                rows={1}
                disabled={isLoading}
                className="message-input"
              />
              <div className="input-controls">
                <button
                  className="commands-toggle-btn"
                  onClick={() => setShowCommands(!showCommands)}
                  title="Show quick commands"
                  disabled={isLoading}
                >
                  ⚡
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!currentInput.trim() || isLoading}
                  className="send-button"
                >
                  {isLoading ? '⏳' : '➤'}
                </button>
              </div>
            </div>
            <div className="input-hint">
              {selectedText 
                ? `Working with selection: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`
                : 'Press Enter to send • Type / for commands'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatbotWidget;