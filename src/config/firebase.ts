import admin from 'firebase-admin';
import { logger } from '../utils/logger';

// Firebase configuration
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'illusio-b9d0b',
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || 
    `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC0gRct1M5EYFlH
/rQJEUpLewC6rsTX0wXMAcLHVE0c5jxanNxeUBbHkSrXShxxhJly3CngNphnxSTu
4jtCHmGhXIWNHbHajhSZ/TPS7+V5UsBP6a0pzPP9xv7JB5xJQEsXYAz7Jzd1TN4j
0LlvYOrg3eRw/RjiwB4ie90ouoWxYqEK65518SBM4DsKyYFiVuYWY5nh1G7JXlXI
OeljjB1qZuBnGMalVC9hmcCQFXHhhzfzM7i3s2oeeSTkiehXfGko+nsaftsl5lhi
mPKo06llJ4FgBWEk+0yfxuyE80y3a94Aun/bRCqUgEc/vNlJ14rfePB4+5Q4/r56
FilyXxJJAgMBAAECggEAVwm2VRW73pG9C2/AfWzWb94ghGQ4q79oGK6yru4x/uDw
MltYEaw5x8Jyr3xficeAPLf4A1MgG02fWQdCvseqmSXlih3LAJGpUnWbMzgVZXKn
JAGQS8s1zeXSPrqKPHIho2Rf7g1Dey71IL0JZbEMoSCuAmOwx8oO3d7vTi/evqD5
8/UMfXdbydc6oTdEvlgdYkPps1UZZugXfO520RhAcDbgeiGZ4tTf7pMvUOLH9KP1
p6WVrUaPZINJwE1+m1akHo44WcHpppR7s/XoiQhbBl508n4K6rqEa2WYrgwx/QCO
lECT5baATRTTydNQpodYq1ogefsXUt+m/2tQ/WaphwKBgQDph2OAexzlcY1dEwcn
ySutUhPaZuuoYj/jiCTbt69S9h1oLzmXqFf8phfviPxhtJCNF9hvqsgAwFOt4tQA
iTyrTsZifon689e2krP25YOy1POQ0Ax3tA+2V1eaXBihQBg/39SzISyzUuCr3SMC
jhviYuIq9fivnWZmmUuIiYVA0wKBgQDF34Z6I6zFwsxS5XjmTj+9S09vtXCUkO6C
mxaCce/CP5JuxLzGYMcdcZkGw6xpUYDVafqP8DhklWankhtWXSFdGAXK0Q5Brn1a
Rg6cH9l/2u8E1dOH9gOkM3IBeUCcab/Kyks95d6hRE/ZziW7rXrEu5t7zAMIRKYF
zKRfdO0O8wKBgQCi3WNNlY7fjcPzJ3QUET6+z8E8zg6IDo1UF/zspzxE9ZQottbJ
qARFFWkYC0dItO8jF4BA0LBPpdI2MT19aji/mF7PDkUYmbrVf5a3F/YzYETFt/Ma
AJ/8oQldg+FBhDvlQCtNClPsdF5wPfdOruFPj3sATy8y+ukRoNOG07H1NQKBgQCx
794IO8iEVjZTXVOpFziuSuj2NZ01nFc/T6OgTkEi1vQhc/2mDyU/TwYjVRbX5pkK
UTEm+whbOxaDHhpDQaBdDNs4lWJSokzLPzCoKOP327MREBAWtZ50rGaa+KSng1kb
TWr4EJxxPPLplD3OVaSPAX5ChyU67DC4ClzOEmGTDQKBgAl03IRUimBgXGKw/G4t
RdX2YrcR0kaVspXzz9CUhWtGtf3H9+lDLCR0oY6S2Sku5MslSufNVQZuxm1P9Vog
lu6U2Xd4k3DTWfjbYEW3zndDcFl59x1R3aiUYiwbhTd3dgannI5+vJFmZDFkQf2M
OBPwQs4LgiS2x/9kTVsPAhZc
-----END PRIVATE KEY-----`,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@illusio-b9d0b.iam.gserviceaccount.com',
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://illusio-b9d0b-default-rtdb.firebaseio.com',
};

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App | null = null;

export const initializeFirebase = (): admin.app.App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: firebaseConfig.databaseURL,
    });

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
