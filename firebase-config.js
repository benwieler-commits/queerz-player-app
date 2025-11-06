// ================================
// FIREBASE CONFIGURATION
// ================================

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

// Your Firebase configuration
// Replace these values with your actual Firebase project credentials
const firebaseConfig = {
    apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
    authDomain: "queerz-mc-live.firebaseapp.com",
    databaseURL: "https://queerz-mc-live-default-rtdb.firebaseio.com",
    projectId: "queerz-mc-live",
    storageBucket: "queerz-mc-live.firebasestorage.app",
    messagingSenderId: "155846709409",
    appId: "1:155846709409:web:8c12204dc7d502586a20e0"
};

// Initialize Firebase
let app;
let database;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    
    console.log('✅ Firebase initialized successfully');
    
    // Dispatch custom event to notify app that Firebase is ready
    window.dispatchEvent(new CustomEvent('firebaseReady', {
        detail: {
            db: null, // Firestore not used in this version
            realtimeDb: {
                ref: (path) => ref(database, path),
                on: onValue,
                set: set
            }
        }
    }));
    
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.log('⚠️ Running in offline mode');
}

export { database, ref, onValue, set };