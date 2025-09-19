import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Validate required environment variables
  const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required Firebase environment variables: ${missingVars.join(', ')}`;
    logger.error('❌ Firebase configuration error:', errorMessage);
    throw new Error(errorMessage);
  }

  try {
    // Try Application Default Credentials first (simpler)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
      firebaseApp = admin.initializeApp({
        projectId: firebaseConfig.projectId,
        databaseURL: firebaseConfig.databaseURL,
      });
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      // Fallback to service account credentials
      const serviceAccount = {
        projectId: firebaseConfig.projectId,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: firebaseConfig.databaseURL,
      });
    } else {
      throw new Error('No Firebase authentication method available. Set GOOGLE_APPLICATION_CREDENTIALS or provide FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL');
    }

    logger.info('🔥 Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
};

export const getFirebaseApp = (): admin.app.App => {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return firebaseApp;
};

export const getFirebaseDatabase = (): admin.database.Database => {
  const app = getFirebaseApp();
  return app.database();
};

// Firebase Realtime Database paths
export const FIREBASE_PATHS = {
  JUPITER_TOKENS: 'jupiter_tokens',
  RECENT_TOKENS: 'jupiter_tokens/recent',
  METADATA: 'jupiter_tokens/metadata',
} as const;

export default firebaseApp;
