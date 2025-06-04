// hooks/useChatbot.js - Hook for easy chatbot integration
import { useState, useCallback } from 'react';

export const useChatbot = (initialConfig = {}) => {
  const [config, setConfig] = useState({
    enabled: true,
    position: 'bottom-right',
    title: 'AI Assistant',
    welcomeMessage: 'Hi! How can I help you?',
    apiEndpoint: '/api/documents',
    ...initialConfig
  });

  const updateConfig = useCallback((newConfig) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const enableChatbot = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: true }));
  }, []);

  const disableChatbot = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: false }));
  }, []);

  return {
    config,
    updateConfig,
    enableChatbot,
    disableChatbot
  };
};

// Usage examples:
/*
// Basic usage
const { config } = useChatbot();

// Custom configuration
const { config, updateConfig } = useChatbot({
  title: 'Translation Helper',
  position: 'bottom-left',
  welcomeMessage: 'Hello! I can help improve your translations.'
});

// Dynamic configuration
updateConfig({
  title: 'Document Assistant',
  enabled: someCondition
});
*/