// ================================
// FIREBASE CONFIGURATION
// Player App - Cloud Sync & Broadcast Receiving
// ⭐ FIXED: Using real Firebase URL (not broken proxy)
// ================================

// Import Firebase SDK modules from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ⭐ Firebase Configuration (from queerz-mc-live project)
// ⚠️ FIXED: Using real Firebase database URL instead of broken Cloudflare proxy
const firebaseConfig = {
  apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
  authDomain: "queerz-mc-live.firebaseapp.com",
  databaseURL: "https://queerz-mc-live-default-rtdb.firebaseio.com",  // ⭐ REAL Firebase URL
  projectId: "queerz-mc-live",
  storageBucket: "queerz-mc-live.firebasestorage.app",
  messagingSenderId: "155846709409",
  appId: "1:155846709409:web:8c12204dc7d502586a20e0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

let currentUserId = null;

console.log('🔥 Firebase initialized for Player App');
console.log('📡 Database URL:', firebaseConfig.databaseURL);
console.log('👂 Listening for broadcasts from MC App...');

// ================================
// AUTHENTICATION (CLOUD SYNC)
// ================================

/**
 * Initialize Firebase Authentication (anonymous)
 * Required for cloud character storage
 */
export async function initializeAuth() {
  try {
    // Sign in anonymously
    const userCredential = await signInAnonymously(auth);
    currentUserId = userCredential.user.uid;
    
    console.log('✅ Firebase Auth initialized (Anonymous)');
    console.log('👤 User ID:', currentUserId);
    
    // Start listening for broadcasts once authenticated
    initializeBroadcastListener();
    
    // Dispatch event so other parts of app know auth is ready
    document.dispatchEvent(new Event('firebase-auth-ready'));
    
    return true;
  } catch (error) {
    console.error('❌ Firebase Auth error:', error);
    return false;
  }
}

// Monitor auth state changes
if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserId = user.uid;
      console.log('✅ User authenticated:', currentUserId);
      
      // Start broadcast listener if not already active
      if (!initializeBroadcastListener._active) {
        initializeBroadcastListener();
      }
      
      document.dispatchEvent(new Event('firebase-auth-ready'));
    } else {
      currentUserId = null;
      console.log('⚠️ User signed out');
    }
  });
}

// ================================
// CLOUD CHARACTER STORAGE
// ================================

/**
 * Save character data to Firebase cloud storage
 * @param {Object} characterData - Complete character object
 * @returns {Boolean} Success status
 */
export async function saveCharacterToCloud(characterData) {
  if (!database || !currentUserId) {
    console.warn('⚠️ Cannot save to cloud: Not authenticated');
    return false;
  }
  
  try {
    const charRef = ref(database, `users/${currentUserId}/characters/${characterData.name}`);
    await set(charRef, { 
      ...characterData, 
      lastModified: Date.now() 
    });
    
    console.log('✅ Character saved to cloud:', characterData.name);
    return true;
  } catch (error) {
    console.error('❌ Failed to save character to cloud:', error);
    return false;
  }
}

/**
 * Load all characters from Firebase cloud storage
 * @returns {Object|null} Characters object or null
 */
export async function loadCharactersFromCloud() {
  if (!database) {
    console.warn('⚠️ Cannot load from cloud: Database not initialized');
    return null;
  }
  
  try {
    // Try to load from user's personal storage if authenticated
    if (currentUserId) {
      const charsRef = ref(database, `users/${currentUserId}/characters`);
      const snapshot = await get(charsRef);
      
      if (snapshot.exists()) {
        console.log('✅ Characters loaded from cloud');
        return snapshot.val();
      }
    }
    
    // Fallback: Try legacy shared storage
    const legacyRef = ref(database, 'playerCharacters');
    const legacySnapshot = await get(legacyRef);
    
    if (legacySnapshot.exists()) {
      console.log('✅ Characters loaded from legacy storage');
      return legacySnapshot.val();
    }
    
    console.log('ℹ️ No characters found in cloud');
    return {};
  } catch (error) {
    console.error('❌ Failed to load characters from cloud:', error);
    return null;
  }
}

/**
 * Save last loaded character name to cloud
 * @param {String} characterName - Name of last loaded character
 * @returns {Boolean} Success status
 */
export async function saveLastCharacterToCloud(characterName) {
  if (!database || !currentUserId) {
    return false;
  }
  
  try {
    const lastCharacterRef = ref(database, `users/${currentUserId}/lastCharacter`);
    await set(lastCharacterRef, characterName || null);
    return true;
  } catch (error) {
    console.error('❌ Failed to save last character name:', error);
    return false;
  }
}

/**
 * Load last character name from cloud
 * @returns {String|null} Last character name or null
 */
export async function loadLastCharacterFromCloud() {
  if (!database || !currentUserId) {
    return null;
  }
  
  try {
    const lastCharacterRef = ref(database, `users/${currentUserId}/lastCharacter`);
    const snapshot = await get(lastCharacterRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('❌ Failed to load last character name:', error);
    return null;
  }
}

/**
 * Broadcast character data to MC App
 * @param {Object} characterData - Complete character object
 * @returns {Boolean} Success status
 */
export async function broadcastCharacterToMc(characterData) {
  if (!database || !currentUserId || !characterData) {
    return false;
  }
  
  try {
    const broadcastRef = ref(database, `mcBroadcast/playerUpdates/${currentUserId}`);
    await set(broadcastRef, { 
      ...characterData, 
      lastBroadcast: Date.now() 
    });
    
    console.log('📤 Character broadcast to MC App:', characterData.name);
    return true;
  } catch (error) {
    console.error('❌ Failed to broadcast character to MC:', error);
    return false;
  }
}

// ================================
// MC BROADCAST LISTENER
// ================================

/**
 * Initialize listener for MC App broadcasts
 * Updates scene, music, and spotlight displays
 */
function initializeBroadcastListener() {
  // Prevent multiple initializations
  if (initializeBroadcastListener._active) {
    return;
  }
  initializeBroadcastListener._active = true;
  
  if (!database) {
    console.error('❌ Cannot start broadcast listener: Database not initialized');
    return;
  }
  
  console.log('👂 Starting MC broadcast listener...');
  
  // Listen to the mcBroadcast path where MC App sends data
  const broadcastRef = ref(database, 'mcBroadcast');
  
  onValue(broadcastRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data) {
      console.log('ℹ️ No broadcast data available');
      return;
    }
    
    console.log('📡 Broadcast received from MC App:', data);
    
    // Update scene display
    if (data.currentScene) {
      const sceneInfo = document.getElementById('sceneInfo');
      if (sceneInfo && data.currentScene.name) {
        sceneInfo.textContent = data.currentScene.name;
        console.log('✅ Scene updated:', data.currentScene.name);
      }
      
      // Update location image if available
      const locationImg = document.getElementById('locationImage');
      if (locationImg && data.currentScene.imageUrl) {
        locationImg.src = data.currentScene.imageUrl;
        locationImg.style.display = 'block';
        console.log('🖼️ Location image updated');
      }
    }
    
    // Update music display
    if (data.currentMusic) {
      const musicDisplay = document.getElementById('musicTitle');
      if (musicDisplay && data.currentMusic.name) {
        musicDisplay.textContent = `♪ ${data.currentMusic.name}`;
        console.log('🎵 Music updated:', data.currentMusic.name);
      }
    }
    
    // Update playlist display (if available)
    if (data.currentPlaylist) {
      handlePlaylistBroadcast(data.currentPlaylist);
    }
    
    // Update character spotlight
    if (data.activeCharacter) {
      const spotlightInfo = document.getElementById('spotlightInfo');
      if (spotlightInfo && data.activeCharacter.name) {
        spotlightInfo.textContent = data.activeCharacter.name;
        console.log('🎭 Spotlight updated:', data.activeCharacter.name);
      }
    }
    
    // Update sync status badge to show we're receiving broadcasts
    updateSyncStatus(true);
    
  }, (error) => {
    console.error('❌ Error listening to MC broadcasts:', error);
    updateSyncStatus(false);
  });
  
  console.log('✅ MC broadcast listener active');
}

/**
 * Handle playlist broadcasts from MC App
 * @param {Object} playlistData - Playlist information from MC
 */
function handlePlaylistBroadcast(playlistData) {
  if (!playlistData || !playlistData.tracks) {
    return;
  }
  
  console.log('🎵 Playlist received:', playlistData);
  
  // You can add playlist UI updates here
  // For example, display the full playlist in the player app
  // playlistData will have: tracks[], currentIndex, looping, playing
}

/**
 * Update the sync status badge
 * @param {Boolean} isOnline - Whether connection is active
 */
function updateSyncStatus(isOnline) {
  const syncBadge = document.getElementById('syncBadge');
  if (syncBadge) {
    if (isOnline) {
      syncBadge.className = 'badge online';
      syncBadge.textContent = '● Online';
    } else {
      syncBadge.className = 'badge offline';
      syncBadge.textContent = '● Offline';
    }
  }
}

// ================================
// GLOBAL EXPORTS (for non-module scripts)
// ================================

// Make functions available globally via window object
// This allows player-app.js to call these functions
window.initializeAuth = initializeAuth;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.saveLastCharacterToCloud = saveLastCharacterToCloud;
window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;
window.broadcastCharacterToMc = broadcastCharacterToMc;

// Export for module imports
export { database, auth, currentUserId };

console.log('✅ Firebase config loaded - functions available on window object');
