#!/usr/bin/env node

/**
 * Firebase Database Truncation Script (Auto Mode)
 * 
 * This script truncates all data from Firebase Realtime Database without confirmation.
 * Use with caution - this will permanently delete all data!
 * 
 * Usage: node truncate-firebase-db-auto.js
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  };

  // Check if Firebase should be enabled
  const hasRequiredVars = process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_DATABASE_URL;
  
  if (!hasRequiredVars) {
    console.error('❌ Firebase disabled - missing environment variables. Set FIREBASE_PROJECT_ID and FIREBASE_DATABASE_URL to enable.');
    process.exit(1);
  }

  try {
    // Try Application Default Credentials first
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT) {
      return admin.initializeApp({
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

      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: firebaseConfig.databaseURL,
      });
    } else {
      throw new Error('No Firebase credentials found');
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
};

// Main truncation function
const truncateDatabase = async () => {
  console.log('🔥 Starting Firebase Database Truncation (Auto Mode)...\n');

  try {
    // Initialize Firebase
    const app = initializeFirebase();
    const db = admin.database();

    console.log('✅ Firebase initialized successfully');
    console.log(`📊 Database URL: ${process.env.FIREBASE_DATABASE_URL}\n`);

    // Define all known collections/paths to truncate
    const collectionsToTruncate = [
      'jupiter_tokens',
      'conversations', 
      'oracle-session',
      'oracle-messages',
      'test_connection' // Clean up any test data
    ];

    console.log('🗑️  Truncating collections...\n');

    // Truncate each collection
    for (const collection of collectionsToTruncate) {
      try {
        console.log(`   Clearing: ${collection}`);
        await db.ref(collection).remove();
        console.log(`   ✅ Cleared: ${collection}`);
      } catch (error) {
        console.log(`   ⚠️  Warning: Could not clear ${collection} - ${error.message}`);
      }
    }

    // Also clear any other root-level data that might exist
    console.log('\n🔍 Checking for additional root-level data...');
    const snapshot = await db.ref('/').once('value');
    const data = snapshot.val();
    
    if (data && Object.keys(data).length > 0) {
      console.log('   Found additional data, clearing...');
      const additionalKeys = Object.keys(data);
      for (const key of additionalKeys) {
        if (!collectionsToTruncate.includes(key)) {
          console.log(`   Clearing additional: ${key}`);
          await db.ref(key).remove();
        }
      }
    }

    console.log('\n✅ Database truncation completed successfully!');
    console.log('📝 Note: Database structure and rules are preserved');
    console.log('🔄 All collections have been cleared but can be repopulated');

  } catch (error) {
    console.error('❌ Truncation failed:', error);
    process.exit(1);
  }
};

// Run the script immediately
if (require.main === module) {
  console.log('⚠️  WARNING: This will permanently delete ALL data from your Firebase Realtime Database!');
  console.log('📊 Database URL:', process.env.FIREBASE_DATABASE_URL);
  console.log('🏗️  Structure and rules will be preserved\n');
  
  truncateDatabase().then(() => {
    console.log('\n🎉 Truncation completed! Exiting...');
    process.exit(0);
  });
}

module.exports = { truncateDatabase, initializeFirebase };
