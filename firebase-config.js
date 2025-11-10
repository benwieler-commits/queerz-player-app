// ================================
// QUEERZ! PLAYER COMPANION APP - CLOUD STORAGE + MC SYNC
// ================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, set, get, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ================================
// FIREBASE CONFIG
// ================================
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
let app, database, auth, currentUserId = null;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully - Connected to queerz-mc-live');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// ================================
// AUTHENTICATION
// ================================
export async function initializeAuth() {
    if (!auth) {
        console.error('❌ Firebase Auth not initialized');
        return false;
    }

    try {
        if (auth.currentUser) {
            currentUserId = auth.currentUser.uid;
            console.log('✅ Already signed in with user ID:', currentUserId);
            updateCloudStatus(true);
            document.dispatchEvent(new Event('firebase-auth-ready'));
            return true;
        }

        console.log('🔐 Signing in anonymously...');
        const userCredential = await signInAnonymously(auth);
        currentUserId = userCredential.user.uid;
        console.log('✅ Signed in with user ID:', currentUserId);
        updateCloudStatus(true);
        document.dispatchEvent(new Event('firebase-auth-ready'));
        return true;
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        updateCloudStatus(false);
        return false;
    }
}

if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log('✅ Auth state changed - User signed in:', currentUserId);
            updateCloudStatus(true);
            document.dispatchEvent(new Event('firebase-auth-ready'));
        } else {
            currentUserId = null;
            console.log('❌ Auth state changed - User signed out');
            updateCloudStatus(false);
        }
    });
}

// ================================
// CLOUD FUNCTIONS
// ================================
export async function saveCharacterToCloud(characterData) {
    if (!database || !currentUserId) {
        console.error('❌ Cannot save to cloud - not authenticated');
        return false;
    }

    try {
        const characterName = characterData.name;
        const charRef = ref(database, `users/${currentUserId}/characters/${characterName}`);
        console.log('☁️ Saving character to cloud:', characterName);
        await set(charRef, { ...characterData, lastModified: Date.now() });
        console.log('✅ Character saved to cloud successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to save character to cloud:', error);
        return false;
    }
}

export async function loadCharactersFromCloud() {
    if (!database || !currentUserId) {
        console.error('❌ Cannot load from cloud - not authenticated');
        return null;
    }

    try {
        const charsRef = ref(database, `users/${currentUserId}/characters`);
        console.log('☁️ Loading characters from cloud...');
        const snapshot = await get(charsRef);
        console.log('📡 Firebase responded, snapshot:', snapshot.val());
        if (snapshot.exists()) {
            const characters = snapshot.val();
            console.log('✅ Characters loaded from cloud:', Object.keys(characters));
            return characters;
        } else {
            console.log('ℹ️ No characters found in cloud');
            return {};
        }
    } catch (error) {
        console.error('❌ Failed to load characters from cloud:', error);
        return null;
    }
}

// ================================
// STATUS BADGES
// ================================
function updateCloudStatus(isOnline) {
    const cloudBadge = document.getElementById('cloudBadge');
    if (cloudBadge) {
        cloudBadge.textContent = isOnline ? '☁️ Cloud' : '☁️ Offline';
        cloudBadge.className = isOnline ? 'badge cloud-online' : 'badge cloud-offline';
    }
}

export { database, auth, currentUserId };

// Expose for use in player-app.js
window.initializeAuth = initializeAuth;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;

console.log('✅ Firebase ready - Cloud storage + MC sync available!');
