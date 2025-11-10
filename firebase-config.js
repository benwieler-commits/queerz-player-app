// ================================
// QUEERZ! PLAYER COMPANION APP
// Firebase Configuration - Unified Cloud + Broadcast Version
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

// ================================
// INITIALIZATION
// ================================
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
            initializeBroadcastListener();
            return true;
        }

        console.log('🔐 Signing in anonymously...');
        const userCredential = await signInAnonymously(auth);
        currentUserId = userCredential.user.uid;
        console.log('✅ Signed in with user ID:', currentUserId);
        updateCloudStatus(true);
        document.dispatchEvent(new Event('firebase-auth-ready'));
        initializeBroadcastListener();
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
            initializeBroadcastListener();
        } else {
            currentUserId = null;
            console.log('❌ Auth state changed - User signed out');
            updateCloudStatus(false);
        }
    });
}

// ================================
// CLOUD CHARACTER FUNCTIONS
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
// MC BROADCAST LISTENER
// ================================
function initializeBroadcastListener() {
    if (!database) {
        console.error('❌ Firebase not initialized - cannot start MC Broadcast listener');
        return;
    }

    console.log('📡 Setting up MC Broadcast listener...');
    const broadcastRef = ref(database, 'mcBroadcast');

    onValue(broadcastRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        console.log('📡 Broadcast received from MC:', data);

        // Scene updates
        if (data.currentScene) {
            const sceneInfo = document.getElementById('sceneInfo');
            if (sceneInfo && data.currentScene.name)
                sceneInfo.textContent = data.currentScene.name;

            const sceneImage = document.getElementById('sceneImage');
            if (sceneImage) {
                if (data.currentScene.imageUrl) {
                    sceneImage.src = data.currentScene.imageUrl;
                    sceneImage.style.display = 'block';
                } else {
                    sceneImage.style.display = 'none';
                }
            }
        }

        // Music updates
        if (data.currentMusic) {
            const musicInfo = document.getElementById('musicInfo');
            if (musicInfo && data.currentMusic.name)
                musicInfo.textContent = data.currentMusic.name;

            const musicPlayer = document.getElementById('musicPlayer');
            if (musicPlayer) {
                if (data.currentMusic.url) {
                    musicPlayer.src = data.currentMusic.url;
                    musicPlayer.style.display = 'block';
                    musicPlayer.play().catch(() => {
                        console.log('ℹ️ Autoplay blocked, user must click play.');
                    });
                } else {
                    musicPlayer.pause();
                    musicPlayer.style.display = 'none';
                }
            }
        }

        // Spotlight updates
        if (data.activeCharacter) {
            const spotlightInfo = document.getElementById('spotlightInfo');
            if (spotlightInfo)
                spotlightInfo.textContent = data.activeCharacter.name || '—';

            const spotlightPortrait = document.getElementById('spotlightPortrait');
            if (spotlightPortrait) {
                if (data.activeCharacter.imageUrl) {
                    spotlightPortrait.src = data.activeCharacter.imageUrl;
                    spotlightPortrait.style.display = 'block';
                } else {
                    spotlightPortrait.style.display = 'none';
                }
            }
        }

        updateSyncStatus(true);
    }, (error) => {
        console.error('❌ Error listening to MC broadcasts:', error);
        updateSyncStatus(false);
    });

    console.log('✅ MC Broadcast listener active');
}

// Auto-reconnect if auth reconnects
document.addEventListener('firebase-auth-ready', () => {
    console.log('🔁 Firebase auth ready - ensuring broadcast listener active');
    initializeBroadcastListener();
});

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

function updateSyncStatus(isOnline) {
    const badge = document.getElementById('syncBadge');
    if (badge) {
        badge.textContent = isOnline ? '● Online' : '● Offline';
        badge.className = isOnline ? 'badge online' : 'badge offline';
    }

    const mcStatus = document.getElementById('mcStatus');
    if (mcStatus) {
        mcStatus.textContent = isOnline ? 'Connected to MC' : 'Waiting for MC...';
    }
}

// ================================
// EXPORTS
// ================================
export { database, auth, currentUserId };
window.initializeAuth = initializeAuth;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;

console.log('✅ Firebase unified config loaded - Cloud + Broadcast operational');
