import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Suppress Firebase warnings in production
if (process.env.NODE_ENV === 'production') {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    // Suppress Firebase database warnings
    if (args[0]?.includes?.('@firebase/database: FIREBASE WARNING')) {
      return; // Suppress these warnings
    }
    originalConsoleWarn.apply(console, args);
  };
}

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App | null => {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if Firebase should be enabled
  const hasRequiredVars = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_DATABASE_URL;
  
  if (!hasRequiredVars) {
    logger.warn('⚠️ Firebase disabled - missing environment variables. Set FIREBASE_PROJECT_ID and FIREBASE_DATABASE_URL to enable.');
    return null;
  }

  // Log current environment variables (without sensitive data)
  logger.info('🔍 Checking Firebase environment variables...');
  logger.info(`FIREBASE_PROJECT_ID: ${process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING'}`);
  logger.info(`FIREBASE_DATABASE_URL: ${process.env.FIREBASE_DATABASE_URL ? 'SET' : 'MISSING'}`);
  logger.info(`FIREBASE_PRIVATE_KEY: ${process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'MISSING'}`);
  logger.info(`FIREBASE_CLIENT_EMAIL: ${process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING'}`);

  // Validate required environment variables
  const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_DATABASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const errorMessage = `Missing required Firebase environment variables: ${missingVars.join(', ')}`;
    logger.error('❌ Firebase configuration error:', errorMessage);
    return null; // Don't throw error, just return null
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

export const getFirebaseApp = (): admin.app.App | null => {
  if (!firebaseApp) {
    const app = initializeFirebase();
    return app;
  }
  return firebaseApp;
};

export const getFirebaseDatabase = (): admin.database.Database | null => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      logger.warn('⚠️ Firebase not initialized - database unavailable');
      return null;
    }
    return app.database();
  } catch (error) {
    logger.error('❌ Failed to get Firebase database:', error);
    return null;
  }
};

// Test Firebase connection and fix database rules
export const testFirebaseConnection = async (): Promise<boolean> => {
  try {
    const db = getFirebaseDatabase();
    if (!db) {
      logger.warn('⚠️ Firebase database not available');
      return false;
    }

    // Test write/read to a test path
    const testRef = db.ref('test_connection');
    const testData = { timestamp: Date.now(), test: true };
    
    await testRef.set(testData);
    const snapshot = await testRef.once('value');
    await testRef.remove(); // Clean up
    
    if (snapshot.exists()) {
      logger.info('✅ Firebase connection test successful');
      return true;
    } else {
      logger.error('❌ Firebase connection test failed - no data returned');
      return false;
    }
  } catch (error) {
    logger.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// Firebase Realtime Database paths
export const FIREBASE_PATHS = {         
  JUPITER_TOKENS: 'jupiter_tokens',
  RECENT_TOKENS: 'jupiter_tokens/recent',
  METADATA: 'jupiter_tokens/metadata',
} as const;

export default firebaseApp;
