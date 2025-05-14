// pages/UserUpload.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import documentService from '../services/documentService';

const UserUpload = () => {
  const [step, setStep] = useState(1); // 1: Document Upload, 2: Quote, 3: Payment Confirmation
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quoteData, setQuoteData] = useState(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    sourceLanguage: '',
    targetLanguage: '',
    userName: '',
    email: '',
    documentType: '',
    files: [],
    discountCode: ''
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFormData(prev => ({ ...prev, files: selectedFiles }));
  };

  // Submit document upload form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.sourceLanguage || !formData.targetLanguage || !formData.email || !formData.files.length) {
      toast.error('Please fill in all required fields and upload at least one file');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create form data for file upload
      const uploadData = new FormData();
      uploadData.append('sourceLanguage', formData.sourceLanguage);
      uploadData.append('targetLanguage', formData.targetLanguage);
      uploadData.append('userName', formData.userName);
      uploadData.append('email', formData.email);
      uploadData.append('documentType', formData.documentType);
      uploadData.append('discountCode', formData.discountCode);
      
      // Append each file
      formData.files.forEach(file => {
        uploadData.append('files', file);
      });
      
      // Use document service instead of direct axios call
      const response = await documentService.uploadDocuments(uploadData);
      
      // Move to quote step
      setQuoteData(response);
      setStep(2);
      
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle payment
  const handlePayment = async () => {
    try {
      setIsSubmitting(true);
      
      // Use document service instead of direct axios call
      await documentService.processPayment(quoteData.quoteId);
      
      // Move to confirmation step
      setStep(3);
      setOrderConfirmed(true);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to start over
  const handleStartOver = () => {
    setStep(1);
    setQuoteData(null);
    setOrderConfirmed(false);
    setFormData({
      sourceLanguage: '',
      targetLanguage: '',
      userName: '',
      email: '',
      documentType: '',
      files: [],
      discountCode: ''
    });
  };

  // Render Step 1: Document Upload Form
  const renderUploadForm = () => (
    <div className="upload-container">
      <h1>Upload Documents for Translation</h1>
      <p className="lead">Fill in the details below and upload your documents to get started.</p>
      
      <form onSubmit={handleSubmit} className="upload-form">
        {/* Form content remains the same */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="sourceLanguage">Source Language *</label>
            <select 
              id="sourceLanguage" 
              name="sourceLanguage" 
              value={formData.sourceLanguage} 
              onChange={handleInputChange}
              required
            >
              <option value="">Select Source Language</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
              <option value="it">Italian</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="targetLanguage">Target Language *</label>
            <select 
              id="targetLanguage" 
              name="targetLanguage" 
              value={formData.targetLanguage} 
              onChange={handleInputChange}
              required
            >
              <option value="">Select Target Language</option>
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
              <option value="it">Italian</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="userName">Your Name *</label>
            <input 
              type="text" 
              id="userName" 
              name="userName" 
              value={formData.userName} 
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              value={formData.email} 
              onChange={handleInputChange}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label htmlFor="documentType">Document Type *</label>
          <select 
            id="documentType" 
            name="documentType" 
            value={formData.documentType} 
            onChange={handleInputChange}
            required
          >
            <option value="">Select Document Type</option>
            <option value="birth_certificate">Birth Certificate</option>
            <option value="drivers_license">Driver's License</option>
            <option value="passport">Passport</option>
            <option value="academic_transcript">Academic Transcript</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="files">Upload Files *</label>
          <div className="file-upload-container">
            <input 
              type="file" 
              id="files" 
              name="files" 
              onChange={handleFileChange}
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              required
            />
            <p className="file-help-text">
              Supported formats: PDF, Word, JPG, PNG. Maximum file size: 10MB per file.
            </p>
          </div>
          
          {formData.files.length > 0 && (
            <div className="selected-files">
              <p>Selected Files:</p>
              <ul>
                {formData.files.map((file, index) => (
                  <li key={index}>{file.name} ({Math.round(file.size / 1024)} KB)</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="discountCode">Discount Code (Optional)</label>
          <input 
            type="text" 
            id="discountCode" 
            name="discountCode" 
            value={formData.discountCode} 
            onChange={handleInputChange}
            placeholder="Enter discount code if available"
          />
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Get Quote'}
          </button>
        </div>
      </form>
    </div>
  );

  // Render Step 2: Quote Display
  const renderQuote = () => (
    <div className="quote-container">
      {/* Quote display content remains the same */}
      <h1>Translation Quote</h1>
      
      <div className="quote-details">
        <h2>Quote Summary</h2>
        <div className="quote-summary">
          <div className="quote-row">
            <span>Document Type:</span>
            <span>{formData.documentType}</span>
          </div>
          <div className="quote-row">
            <span>Source Language:</span>
            <span>{formData.sourceLanguage}</span>
          </div>
          <div className="quote-row">
            <span>Target Language:</span>
            <span>{formData.targetLanguage}</span>
          </div>
          <div className="quote-row">
            <span>Number of Documents:</span>
            <span>{formData.files.length}</span>
          </div>
          
          <div className="quote-cost">
            <h3>Total Cost:</h3>
            <p className="price">{quoteData.currency} {quoteData.totalPrice.toFixed(2)}</p>
          </div>
          
          <div className="quote-time">
            <h3>Estimated Turnaround Time:</h3>
            <p>{quoteData.estimatedTurnaround}</p>
          </div>
          
          {quoteData.additionalInfo && (
            <div className="additional-info">
              <h3>Additional Information:</h3>
              <p>{quoteData.additionalInfo}</p>
            </div>
          )}
        </div>
      </div>
      
      <p className="turnaround-info">
        Your translation will be ready within 24 hours or less. For larger documents, 
        delivery times may range from 3 to 10 working days. A member of our support team 
        will keep you updated throughout the process.
      </p>
      
      <p className="contact-info">
        If you have any questions or need further assistance, feel free to contact us at 
        contact@wetranslate.fr.
      </p>
      
      <div className="quote-actions">
        <button 
          className="btn btn-secondary"
          onClick={handleStartOver}
          disabled={isSubmitting}
        >
          Back
        </button>
        <button 
          className="btn btn-primary"
          onClick={handlePayment}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </div>
  );

  // Render Step 3: Confirmation
  const renderConfirmation = () => (
    <div className="confirmation-container">
      {/* Confirmation content remains the same */}
      <div className="confirmation-card">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        <p className="order-id">Order ID: {quoteData.orderId}</p>
        
        <div className="confirmation-details">
          <p>Thank you for your order. We have received your payment and your translation request has been submitted.</p>
          <p>You will receive a confirmation email at <strong>{formData.email}</strong> with your order details.</p>
          <p>Once your translation is complete, we will send you another email with instructions to download your translated documents.</p>
        </div>
        
        <div className="estimated-delivery">
          <h3>Estimated Delivery:</h3>
          <p>{quoteData.estimatedTurnaround}</p>
        </div>
        
        <div className="confirmation-actions">
          <button 
            className="btn btn-primary"
            onClick={handleStartOver}
          >
            Translate Another Document
          </button>
        </div>
      </div>
    </div>
  );

  // Render the appropriate step
  return (
    <div className="user-upload-page">
      {step === 1 && renderUploadForm()}
      {step === 2 && renderQuote()}
      {step === 3 && renderConfirmation()}
    </div>
  );
};

export default UserUpload;