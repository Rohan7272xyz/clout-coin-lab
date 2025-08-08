// Backend/config/firebase-admin.js
// Updated Firebase Admin SDK configuration

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      // Use the correct project ID from your environment variables
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'token-factory-78e3d';
      
      console.log('🔧 Initializing Firebase Admin with project ID:', projectId);
      
      // Initialize with the correct project ID
      admin.initializeApp({
        projectId: projectId,
        // Add other config if you have service account credentials
        // credential: admin.credential.cert({
        //   projectId: projectId,
        //   clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        //   privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        // })
      });
      
      console.log('✅ Firebase Admin SDK initialized successfully with project:', projectId);
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }
  return admin;
}

module.exports = { initializeFirebaseAdmin, admin };