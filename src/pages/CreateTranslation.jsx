// pages/CreateTranslation.jsx - New component for direct document upload
import React from 'react';
import { useNavigate } from 'react-router-dom';

const CreateTranslation = () => {
  const navigate = useNavigate();
  
  // Navigate to translation setup page (without an existing translation ID)
  React.useEffect(() => {
    navigate('/translator/setup');
  }, [navigate]);
  
  return null;
};

export default CreateTranslation;