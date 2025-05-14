// server/server.js
const jsonServer = require('json-server');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const server = jsonServer.create();
const router = jsonServer.router('server/db.json');
const middlewares = jsonServer.defaults();

// Create directories for file storage if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const originalDocumentsDir = path.join(uploadsDir, 'original');
const translatedDocumentsDir = path.join(uploadsDir, 'translated');

[uploadsDir, originalDocumentsDir, translatedDocumentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, originalDocumentsDir);
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter: function (req, file, cb) {
    // Accept only specific file types
    const filetypes = /jpeg|jpg|png|pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, Word, JPG, and PNG files are allowed'));
  }
});

// Set default middlewares (logger, static, cors)
server.use(middlewares);
server.use(jsonServer.bodyParser);

// Authentication middleware
server.use((req, res, next) => {
  // Simple auth check for protected routes
  const protectedRoutes = [
    '/api/translations',
    '/api/translations/',
  ];
  
  const needsAuth = protectedRoutes.some(route => 
    req.url.startsWith(route) && req.method !== 'GET'
  );
  
  if (needsAuth && !req.headers.authorization) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  next();
});

// Add custom routes for file handling
// Document upload endpoint
server.post('/api/documents/upload', upload.array('files', 5), (req, res) => {
  try {
    const files = req.files;
    const { sourceLanguage, targetLanguage, userName, email, documentType } = req.body;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    
    const uploadedFiles = files.map(file => ({
      id: uuidv4(),
      originalName: file.originalname,
      storagePath: file.path,
      fileType: file.mimetype,
      fileSize: file.size,
      uploadDate: new Date().toISOString()
    }));
    
    // Create a document record in the database
    const quoteId = uuidv4();
    const orderId = uuidv4();
    
    // Determine price based on document type
    const priceMap = {
      birth_certificate: 30,
      drivers_license: 25,
      passport: 35,
      academic_transcript: 40,
      other: 50
    };
    
    const basePrice = priceMap[documentType] || 50;
    const totalPrice = basePrice * files.length;
    
    // Determine estimated turnaround
    let estimatedTurnaround = '24 hours';
    if (files.length > 3) {
      estimatedTurnaround = '2-3 business days';
    }
    
    // Success response with quote
    res.status(200).json({
      success: true,
      quoteId,
      orderId,
      files: uploadedFiles,
      totalPrice,
      currency: '€',
      estimatedTurnaround,
      additionalInfo: documentType === 'passport' ? 
        'Original document may be required for stamping.' : null
    });
    
    // Update our db.json with the new document
    const db = router.db.getState();
    
    // Create document entry
    const document = {
      id: quoteId,
      orderId,
      files: uploadedFiles,
      sourceLanguage,
      targetLanguage,
      userName,
      email,
      documentType,
      status: 'quote_generated',
      createdAt: new Date().toISOString()
    };
    
    db.documents.push(document);
    
    // Create placeholder translation entries
    uploadedFiles.forEach(file => {
      // Generate sample AI translation text based on document type
      let aiTranslation = '';
      switch(documentType) {
        case 'birth_certificate':
          aiTranslation = 'BIRTH CERTIFICATE\n\nName: John Doe\nDate of Birth: January 1, 1990\nPlace of Birth: Paris, France\nParents: Robert Doe and Jane Doe\n\nThis document certifies that the above individual was born on the date and at the place indicated.';
          break;
        case 'drivers_license':
          aiTranslation = 'DRIVER\'S LICENSE\n\nName: John Doe\nLicense Number: 12345678\nIssue Date: January 1, 2020\nExpiration Date: January 1, 2025\nAddress: 123 Main St, Paris, France';
          break;
        default:
          aiTranslation = 'This is a sample AI translation for document type: ' + documentType;
      }
      
      const translation = {
        id: uuidv4(),
        documentId: quoteId,
        fileId: file.id,
        originalDocument: '/uploads/original/' + path.basename(file.storagePath),
        aiTranslation,
        finalTranslation: '',
        sourceLanguage,
        targetLanguage,
        documentType,
        documentHolder: userName,
        assignedTranslator: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      db.translations.push(translation);
    });
    
    router.db.setState(db);
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'File upload failed', error: error.message });
  }
});

// Payment processing endpoint
server.post('/api/documents/:quoteId/payment', (req, res) => {
  const { quoteId } = req.params;
  
  // Get the document from our db
  const db = router.db.getState();
  const document = db.documents.find(doc => doc.id === quoteId);
  
  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }
  
  // Update document status
  const updatedDocuments = db.documents.map(doc => {
    if (doc.id === quoteId) {
      return { ...doc, status: 'payment_completed' };
    }
    return doc;
  });
  
  // Update translation status for this document
  const updatedTranslations = db.translations.map(translation => {
    if (translation.documentId === quoteId) {
      return { ...translation, status: 'pending' };
    }
    return translation;
  });
  
  // Update db
  db.documents = updatedDocuments;
  db.translations = updatedTranslations;
  router.db.setState(db);
  
  // Send success response
  res.status(200).json({
    success: true,
    message: 'Payment processed successfully',
    orderId: document.orderId
  });
});

// Translation endpoints
server.get('/api/translations', (req, res) => {
  const { sourceLanguage, targetLanguage, status } = req.query;
  
  const db = router.db.getState();
  let translations = db.translations;
  
  // Apply filters
  if (sourceLanguage) {
    translations = translations.filter(t => t.sourceLanguage === sourceLanguage);
  }
  
  if (targetLanguage) {
    translations = translations.filter(t => t.targetLanguage === targetLanguage);
  }
  
  if (status) {
    translations = translations.filter(t => t.status === status);
  }
  
  res.json(translations);
});

server.get('/api/translations/:id', (req, res) => {
  const { id } = req.params;
  
  const db = router.db.getState();
  const translation = db.translations.find(t => t.id === id);
  
  if (!translation) {
    return res.status(404).json({ message: 'Translation not found' });
  }
  
  res.json(translation);
});

// server.post('/api/translations/:id/claim', (req, res) => {
//   const { id } = req.params;
  
//   // Get auth info from header
//   const authHeader = req.headers.authorization || '';
//   const token = authHeader.split(' ')[1];
  
//   // For demo, we'll just use a fixed translator
//   const translatorId = 'translator-123';
//   const translatorName = 'John Translator';
  
//   const db = router.db.getState();
//   const translation = db.translations.find(t => t.id === id);
  
//   if (!translation) {
//     return res.status(404).json({ message: 'Translation not found' });
//   }
  
//   if (translation.status !== 'pending') {
//     return res.status(400).json({ message: 'Translation is not available for claiming' });
//   }
  
//   // Update translation
//   const updatedTranslations = db.translations.map(t => {
//     if (t.id === id) {
//       return { 
//         ...t, 
//         status: 'in_progress', 
//         assignedTranslator: translatorId,
//         assignedTranslatorName: translatorName,
//         updatedAt: new Date().toISOString()
//       };
//     }
//     return t;
//   });
  
//   db.translations = updatedTranslations;
//   router.db.setState(db);
  
//   res.json({ 
//     success: true, 
//     message: 'Translation claimed successfully',
//     translationId: id
//   });
// });
// Update to server.js for the new translation workflow

// Add a new route to handle translation claiming
server.post('/api/translations/:id/claim', (req, res) => {
    const { id } = req.params;
    
    // Get auth info from header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.split(' ')[1];
    
    // For demo, we'll just use a fixed translator
    const translatorId = 'translator-123';
    const translatorName = 'John Translator';
    
    const db = router.db.getState();
    const translation = db.translations.find(t => t.id === id);
    
    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }
    
    if (translation.status !== 'pending') {
      return res.status(400).json({ message: 'Translation is not available for claiming' });
    }
    
    // Update translation status to 'claimed'
    const updatedTranslations = db.translations.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          status: 'claimed', 
          assignedTranslator: translatorId,
          assignedTranslatorName: translatorName,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    
    db.translations = updatedTranslations;
    router.db.setState(db);
    
    res.json({ 
      success: true, 
      message: 'Translation claimed successfully',
      translationId: id
    });
  });
  
  // Add a new route to start the translation process
  server.post('/api/translations/:id/translate', (req, res) => {
    const { id } = req.params;
    const { translationMode, additionalContext, templateId } = req.body;
    
    const db = router.db.getState();
    const translation = db.translations.find(t => t.id === id);
    
    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }
    
    if (translation.status !== 'claimed') {
      return res.status(400).json({ message: 'Translation is not in the correct state for processing' });
    }
    
    // Update translation status to 'translation_in_progress'
    const updatedTranslations = db.translations.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          status: 'translation_in_progress',
          translationContext: {
            translationMode,
            additionalContext,
            templateId
          },
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    });
    
    db.translations = updatedTranslations;
    router.db.setState(db);
    
    // In a real implementation, this would trigger an asynchronous process
    // For our mock server, we'll simulate this with a timeout
    setTimeout(() => {
      // Generate HTML content for the AI translation based on the translation mode and context
      let aiTranslationContent = '';
      const translationData = db.translations.find(t => t.id === id);
      
      switch(translationData.documentType) {
        case 'birth_certificate':
          aiTranslationContent = generateBirthCertificateTranslation(translationData, translationMode, additionalContext, templateId);
          break;
        case 'drivers_license':
          aiTranslationContent = generateDriversLicenseTranslation(translationData, translationMode, additionalContext, templateId);
          break;
        case 'passport':
          aiTranslationContent = generatePassportTranslation(translationData, translationMode, additionalContext, templateId);
          break;
        default:
          aiTranslationContent = generateGenericTranslation(translationData, translationMode, additionalContext, templateId);
      }
      
      // Create a file for the AI translation - use HTML extension
      const aiTranslationFileName = `ai_translation_${uuidv4()}.html`;
      const aiTranslationPath = path.join(aiTranslationsDir, aiTranslationFileName);
      
      // Write the AI translation to a file
      fs.writeFileSync(aiTranslationPath, aiTranslationContent);
      
      // Update the translation in the database
      const updatedDb = router.db.getState();
      const finalUpdatedTranslations = updatedDb.translations.map(t => {
        if (t.id === id) {
          return {
            ...t,
            status: 'ready_for_review',
            aiTranslationUrl: `/uploads/ai_translations/${aiTranslationFileName}`,
            updatedAt: new Date().toISOString()
          };
        }
        return t;
      });
      
      updatedDb.translations = finalUpdatedTranslations;
      router.db.setState(updatedDb);
      
      console.log(`Translation ${id} processing completed`);
    }, 5000); // 5 second timeout to simulate processing
    
    res.json({ 
      success: true, 
      message: 'Translation process started',
      translationId: id
    });
  });
  
  // Helper functions for generating translations
  function generateBirthCertificateTranslation(translation, mode, context, templateId) {
    const { documentHolder, sourceLanguage, targetLanguage } = translation;
    const isTemplate = mode === 'template' && templateId === 'birth_certificate';
    
    if (isTemplate) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Birth Certificate Translation</title>
          <style>
            body { font-family: Arial, sans-serif; }
            .certificate { border: 2px solid #000; padding: 20px; margin: 20px; }
            .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; }
            .content { margin-top: 20px; }
            .row { display: flex; margin-bottom: 10px; }
            .label { font-weight: bold; width: 200px; }
            .footer { margin-top: 30px; text-align: center; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <h1>BIRTH CERTIFICATE</h1>
              <p>Official Translation</p>
            </div>
            
            <div class="content">
              <div class="row">
                <div class="label">Name:</div>
                <div>${documentHolder}</div>
              </div>
              <div class="row">
                <div class="label">Date of Birth:</div>
                <div>January 1, 1990</div>
              </div>
              <div class="row">
                <div class="label">Place of Birth:</div>
                <div>Paris, France</div>
              </div>
              <div class="row">
                <div class="label">Parents:</div>
                <div>John Doe and Jane Doe</div>
              </div>
              <div class="row">
                <div class="label">Registry Number:</div>
                <div>1990-143-2291</div>
              </div>
            </div>
            
            <div class="footer">
              <p>This document certifies that the above individual was born on the date and at the place indicated.</p>
              <p>The document has been issued in accordance with French civil registration procedures.</p>
              <p>Translated from ${sourceLanguage} to ${targetLanguage} by WeTranslate</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // Standard mode or interactive mode
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Birth Certificate Translation</title>
        </head>
        <body>
          <h1>BIRTH CERTIFICATE</h1>
          
          <p><strong>Name:</strong> ${documentHolder}</p>
          <p><strong>Date of Birth:</strong> January 1, 1990</p>
          <p><strong>Place of Birth:</strong> Paris, France</p>
          <p><strong>Parents:</strong> John Doe and Jane Doe</p>
          
          <p>This document certifies that the above individual was born on the date and at the place indicated.</p>
          <p>The document has been issued in accordance with French civil registration procedures.</p>
          
          <p><strong>Registry Number:</strong> 1990-143-2291</p>
          <p><strong>Date of Issue:</strong> January 15, 1990</p>
          
          <p><em>Additional context: ${context || 'None provided'}</em></p>
          <p><em>Translation mode: ${mode}</em></p>
        </body>
        </html>
      `;
    }
  }
  
  function generateDriversLicenseTranslation(translation, mode, context, templateId) {
    const { documentHolder, sourceLanguage, targetLanguage } = translation;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Driver's License Translation</title>
      </head>
      <body>
        <h1>DRIVER'S LICENSE</h1>
        
        <table border="1" cellpadding="5" cellspacing="0" width="100%">
          <tr>
            <td width="40%"><strong>Name:</strong></td>
            <td>${documentHolder}</td>
          </tr>
          <tr>
            <td><strong>License Number:</strong></td>
            <td>12345678</td>
          </tr>
          <tr>
            <td><strong>Issue Date:</strong></td>
            <td>January 1, 2020</td>
          </tr>
          <tr>
            <td><strong>Expiration Date:</strong></td>
            <td>January 1, 2025</td>
          </tr>
          <tr>
            <td><strong>Address:</strong></td>
            <td>123 Main St, City, Country</td>
          </tr>
          <tr>
            <td><strong>Categories:</strong></td>
            <td>B</td>
          </tr>
          <tr>
            <td><strong>Restrictions:</strong></td>
            <td>None</td>
          </tr>
        </table>
        
        <p>This document is an official translation of the driver's license issued to ${documentHolder}.</p>
        <p>Translated from ${sourceLanguage} to ${targetLanguage} by WeTranslate</p>
        
        <p><em>Additional context: ${context || 'None provided'}</em></p>
        <p><em>Translation mode: ${mode}</em></p>
      </body>
      </html>
    `;
  }
  
  function generatePassportTranslation(translation, mode, context, templateId) {
    const { documentHolder, sourceLanguage, targetLanguage } = translation;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Passport Translation</title>
      </head>
      <body>
        <h1>PASSPORT</h1>
        
        <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 20px;">
          <h2>Personal Information</h2>
          <p><strong>Name:</strong> ${documentHolder}</p>
          <p><strong>Passport Number:</strong> AB123456</p>
          <p><strong>Date of Issue:</strong> January 1, 2020</p>
          <p><strong>Date of Expiry:</strong> January 1, 2030</p>
          <p><strong>Nationality:</strong> French</p>
          <p><strong>Place of Birth:</strong> Paris, France</p>
          <p><strong>Date of Birth:</strong> January 1, 1990</p>
        </div>
        
        <div style="border: 1px solid #ccc; padding: 10px;">
          <h2>Translation Note</h2>
          <p>This document is an official translation of the passport issued to ${documentHolder}.</p>
          <p>The original document contains security features that cannot be reproduced in this translation.</p>
          <p>Translated from ${sourceLanguage} to ${targetLanguage} by WeTranslate</p>
        </div>
        
        <p><em>Additional context: ${context || 'None provided'}</em></p>
        <p><em>Translation mode: ${mode}</em></p>
      </body>
      </html>
    `;
  }
  
  function generateGenericTranslation(translation, mode, context, templateId) {
    const { documentHolder, documentType, sourceLanguage, targetLanguage } = translation;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${documentType.toUpperCase()} Translation</title>
      </head>
      <body>
        <h1>${documentType.toUpperCase()}</h1>
        
        <p>This is an AI-generated translation of a ${documentType} document for ${documentHolder}.</p>
        
        <p>The document contains various sections and information that have been translated from ${sourceLanguage} to ${targetLanguage}.</p>
        
        <p>Since the specific document type is not one of our standard templates, this is a generic translation format.</p>
        
        <p>The translator should review and format this translation according to the requirements for ${documentType} documents.</p>
        
        <p><em>Additional context: ${context || 'None provided'}</em></p>
        <p><em>Translation mode: ${mode}</em></p>
      </body>
      </html>
    `;
  }
server.put('/api/translations/:id', (req, res) => {
  const { id } = req.params;
  const { finalTranslation } = req.body;
  
  const db = router.db.getState();
  const translation = db.translations.find(t => t.id === id);
  
  if (!translation) {
    return res.status(404).json({ message: 'Translation not found' });
  }
  
  // Update translation
  const updatedTranslations = db.translations.map(t => {
    if (t.id === id) {
      return { 
        ...t, 
        finalTranslation, 
        updatedAt: new Date().toISOString()
      };
    }
    return t;
  });
  
  db.translations = updatedTranslations;
  router.db.setState(db);
  
  res.json({ 
    success: true, 
    message: 'Translation updated successfully',
    translationId: id
  });
});

server.put('/api/translations/:id/approve', (req, res) => {
  const { id } = req.params;
  const { finalTranslation } = req.body;
  
  const db = router.db.getState();
  const translation = db.translations.find(t => t.id === id);
  
  if (!translation) {
    return res.status(404).json({ message: 'Translation not found' });
  }
  
  // Generate a file path for the translated document
  const translatedFilePath = path.join(translatedDocumentsDir, `translated-${uuidv4()}.pdf`);
  
  // For a real implementation, you would generate the PDF here
  // For demo purposes, we'll just create an empty file
  fs.writeFileSync(translatedFilePath, '');
  
  // Update translation
  const updatedTranslations = db.translations.map(t => {
    if (t.id === id) {
      return { 
        ...t, 
        finalTranslation, 
        status: 'completed',
        translatedDocument: '/uploads/translated/' + path.basename(translatedFilePath),
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    return t;
  });
  
  db.translations = updatedTranslations;
  router.db.setState(db);
  
  // Get document info to update its status if all translations are complete
  const completedTranslation = updatedTranslations.find(t => t.id === id);
  const documentId = completedTranslation.documentId;
  
  const allTranslationsForDocument = updatedTranslations.filter(t => t.documentId === documentId);
  const allCompleted = allTranslationsForDocument.every(t => t.status === 'completed');
  
  if (allCompleted) {
    // Update document status
    const updatedDocuments = db.documents.map(doc => {
      if (doc.id === documentId) {
        return { 
          ...doc, 
          status: 'completed',
          completedAt: new Date().toISOString()
        };
      }
      return doc;
    });
    
    db.documents = updatedDocuments;
    router.db.setState(db);
    
    // In a real implementation, you would send an email to the user here
  }
  
  res.json({ 
    success: true, 
    message: 'Translation approved successfully',
    translationId: id
  });
});

// Authentication endpoints
server.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // For demo, accept any email with password "password"
  if (password !== 'password') {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  
  // Create a dummy user based on email
  const user = {
    id: 'translator-123',
    email,
    name: email.split('@')[0],
    roles: ['translator'],
    languages: ['en', 'fr', 'es', 'it', 'pt'],
    title: 'Certified Translator'
  };
  
  // Send successful response with user data and token
  res.json({
    success: true,
    user,
    token: 'dummy-jwt-token-' + Math.random().toString(36).substring(7)
  });
});

server.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

server.get('/api/auth/status', (req, res) => {
  // Check for token in Authorization header
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  
  if (token && token.startsWith('dummy-jwt-token-')) {
    // Return dummy user for demo
    res.json({
      authenticated: true,
      user: {
        id: 'translator-123',
        email: 'translator@example.com',
        name: 'John Translator',
        roles: ['translator'],
        languages: ['en', 'fr', 'es', 'it', 'pt'],
        title: 'Certified Translator'
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Use default router
server.use('/api', router);

// Start server
const port = 3001;
server.listen(port, () => {
  console.log(`JSON Server is running on port ${port}`);
  console.log(`Access the API at http://localhost:${port}/api`);
});