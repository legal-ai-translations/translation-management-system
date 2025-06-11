// Create this file: src/components/HTMLImprovementChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';

const HTMLImprovementChatbot = ({ 
  initialHtml, 
  documentId, 
  onHtmlUpdate,
  isVisible = false,
  onClose
}) => {
  const [messages, setMessages] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentHtml, setCurrentHtml] = useState(initialHtml || '');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isVisible && messages.length === 0) {
      setMessages([{
        id: Date.now(),
        type: 'bot',
        content: 'Hi! I can help you improve this HTML translation. Just tell me what changes you\'d like to make, and I\'ll update the content accordingly.',
        timestamp: new Date()
      }]);
    }
  }, [isVisible, messages.length]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update current HTML when prop changes
  useEffect(() => {
    if (initialHtml && initialHtml !== currentHtml) {
      setCurrentHtml(initialHtml);
    }
  }, [initialHtml]);

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
    return newMessage;
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userMessage = currentInput.trim();
    setCurrentInput('');

    // Add user message
    addMessage('user', userMessage);

    // Add loading message
    const loadingMessage = addMessage('bot', 'Let me improve the HTML based on your feedback...', { isLoading: true });

    setIsLoading(true);

    try {
      // Call the backend API to improve HTML
      const response = await fetch(`/api/documents/${documentId}/improve-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentHtml: currentHtml,
          userFeedback: userMessage,
          conversationHistory: messages.slice(-10) // Send last 10 messages for context
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));

      if (result.success && result.improvedHtml) {
        // Update current HTML
        setCurrentHtml(result.improvedHtml);

        // Add bot response with the changes
        addMessage('bot', result.explanation || 'I\'ve updated the HTML based on your feedback.', {
          htmlUpdate: true,
          previousHtml: currentHtml,
          newHtml: result.improvedHtml,
          changes: result.changes || []
        });

        // Notify parent component of the update
        if (onHtmlUpdate) {
          onHtmlUpdate(result.improvedHtml, result.changes);
        }

        toast.success('HTML updated successfully!');
      } else {
        addMessage('bot', result.message || 'I couldn\'t process your request. Could you please be more specific?');
      }
    } catch (error) {
      console.error('Error improving HTML:', error);
      
      // Remove loading message
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessage.id));
      
      addMessage('bot', 'Sorry, I encountered an error while processing your request. Please try again.');
      toast.error('Failed to improve HTML');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  const getSuggestions = () => [
    "Make the text more formal",
    "Improve the table formatting",
    "Fix any grammar issues",
    "Make dates more consistent",
    "Improve the overall structure",
    "Make it more professional"
  ];

  if (!isVisible) return null;

  return (
    <div className="html-chatbot-overlay">
      <div className="html-chatbot-container">
        <div className="chatbot-header">
          <div className="chatbot-title">
            <h3>HTML Improvement Assistant</h3>
            <p>Document ID: {documentId?.substring(0, 8)}...</p>
          </div>
          <button className="chatbot-close" onClick={onClose}>×</button>
        </div>

        <div className="chatbot-messages">
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-content">
                {message.isLoading ? (
                  <div className="loading-message">
                    <div className="loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span>Processing your request...</span>
                  </div>
                ) : (
                  <>
                    <p>{message.content}</p>
                    
                    {message.htmlUpdate && message.changes && message.changes.length > 0 && (
                      <div className="changes-summary">
                        <h4>Changes made:</h4>
                        <ul>
                          {message.changes.map((change, index) => (
                            <li key={index}>{change}</li>
                          ))}
                        </ul>
                        <button 
                          className="revert-btn"
                          onClick={() => handleRevert(message.id)}
                        >
                          Revert Changes
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="message-timestamp">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {messages.length === 1 && (
          <div className="suggestions-container">
            <p>Try these suggestions:</p>
            <div className="suggestions">
              {getSuggestions().map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-btn"
                  onClick={() => setCurrentInput(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="chatbot-input">
          <div className="input-container">
            <textarea
              ref={inputRef}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe what changes you'd like to make..."
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentInput.trim() || isLoading}
              className="send-btn"
            >
              {isLoading ? '⏳' : '➤'}
            </button>
          </div>
          <div className="input-hint">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default HTMLImprovementChatbot;