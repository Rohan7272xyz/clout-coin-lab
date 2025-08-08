// Backend/config/firebase-admin.js
// Create this file to initialize Firebase Admin SDK

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      // Option 1: Using service account key file (recommended for development)
      // Download your service account key from Firebase Console > Project Settings > Service Accounts
      // and save it as Backend/config/serviceAccountKey.json
      
      // Uncomment this if you have the service account key file:
      /*
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id'
      });
      */
      
      // Option 2: Using environment variables (recommended for production)
      // Set these environment variables in your .env file:
      /*
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      */
      
      // Option 3: Simple initialization for development (use your project ID)
      // Replace 'your-project-id' with your actual Firebase project ID
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'your-project-id'
      });
      
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
  return admin;
}

module.exports = { initializeFirebaseAdmin, admin };