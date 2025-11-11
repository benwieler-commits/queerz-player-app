// ================================
// FIREBASE CONFIGURATION
// Player App - Cloud Sync & Broadcast Receiving
// ⭐ FIXED: Using real Firebase URL (not broken proxy)
// ⭐ NEW: Added local BroadcastChannel for music + two images from MC App
// ⭐ FIXED: Auto-init auth on load; added live character sync listener
// ⭐ FIXED: Enhanced error handling for saves; real-time cloud updates
// ⭐ NEW: Separate status badges (green broadcast, blue cloud sync) + sync button handler
// ================================

// Import Firebase SDK modules from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, onValue, off } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
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
window.auth = auth;
let currentUserId = null;
window.currentUserId = currentUserId;

// BroadcastChannel for local inter-app communication (same origin)
const BROADCAST_CHANNEL_NAME = 'mc-player-broadcast'; // ⭐ NEW: Channel name for MC App sends
let broadcastChannel = null;
let isBroadcastActive = false;
window.isBroadcastActive = isBroadcastActive;

let cloudSyncActive = false;
window.cloudSyncActive = cloudSyncActive;

// Live character listener (for real-time sync)
let charactersListener = null;

console.log('🔥 Firebase initialized for Player App');
console.log('📡 Database URL:', firebaseConfig.databaseURL);
console.log('👂 Preparing local broadcast listener & cloud sync...');

// ================================
// AUTHENTICATION (CLOUD SYNC)
// ================================

/**
 * Initialize Firebase Authentication (anonymous)
 * Required for cloud character storage
 */
async function initializeAuth() {
  try {
    // Sign in anonymously if not already
    if (!currentUserId) {
      const userCredential = await signInAnonymously(auth);
      currentUserId = userCredential.user.uid;
      window.currentUserId = currentUserId;
    }
    
    console.log('✅ Firebase Auth initialized (Anonymous)');
    console.log('👤 User ID:', currentUserId);
    
    // Start cloud sync listener once authenticated
    startCloudCharacterListener();
    
    // Update cloud status
    updateCloudStatus(true);
    
    // Dispatch event so other parts of app know auth is ready
    document.dispatchEvent(new Event('firebase-auth-ready'));
    
    return true;
  } catch (error) {
    console.error('❌ Firebase Auth error:', error);
    updateCloudStatus(false);
    return false;
  }
}

// Monitor auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    window.currentUserId = currentUserId;
    console.log('✅ User authenticated:', currentUserId);

    if (cloudSyncActive === false) {
      startCloudCharacterListener();
      updateCloudStatus(true);
    }
  } else {
    currentUserId = null;
    window.currentUserId = null;
    console.log('⚠️ User signed out');
    updateCloudStatus(false);
    stopCloudCharacterListener();
  }
});

// ================================
// LOCAL BROADCASTCHANNEL (MUSIC + TWO IMAGES)
// ================================

/**
 * Initialize local BroadcastChannel listener for MC App broadcasts
 * Receives music and two images; updates UI in real-time
 */
function initializeBroadcastChannel() {
  if (broadcastChannel) {
    return; // Already initialized
  }

  broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  
  broadcastChannel.onmessage = (event) => {
    const data = event.data;
    console.log('📡 Local broadcast received from MC App:', data);
    
    if (!data) return;
    
    // Handle music
    if (data.music && data.music.name) {
      const musicDisplay = document.getElementById('musicTitle');
      if (musicDisplay) {
        musicDisplay.textContent = `♪ ${data.music.name}`;
        console.log('🎵 Music updated:', data.music.name);
      }
    }
    
    // Handle two images (assume IDs: 'locationImage' and 'spotlightImage')
    if (data.image1) {
      const img1 = document.getElementById('locationImage'); // or 'backgroundImage'
      if (img1) {
        img1.src = data.image1;
        img1.style.display = 'block';
        console.log('🖼️ Image 1 updated');
      }
    }
    
    if (data.image2) {
      const img2 = document.getElementById('spotlightImage'); // or 'overlayImage'
      if (img2) {
        img2.src = data.image2;
        img2.style.display = 'block';
        console.log('🖼️ Image 2 updated');
      }
    }
    
    // Update broadcast status to green/active
    updateBroadcastStatus(true);
    
    // Optional: Handle additional data like scene or playlist
    if (data.scene) {
      const sceneInfo = document.getElementById('sceneInfo');
      if (sceneInfo && data.scene.name) {
        sceneInfo.textContent = data.scene.name;
      }
    }
  };
  
  broadcastChannel.onmessageerror = (error) => {
    console.error('❌ BroadcastChannel message error:', error);
    updateBroadcastStatus(false);
  };
  
  console.log('✅ Local BroadcastChannel listener active on:', BROADCAST_CHANNEL_NAME);
  isBroadcastActive = true;
  window.isBroadcastActive = true;
  updateBroadcastStatus(true);
}

/**
 * Update broadcast status badge (green when active)
 * @param {Boolean} isActive - Connection status
 */
function updateBroadcastStatus(isActive) {
  const badge = document.getElementById('broadcastBadge');
  if (badge) {
    if (isActive) {
      badge.className = 'tag green active'; // Assume CSS: .tag.green { background: green; } .active { opacity: 1; }
      badge.textContent = 'Broadcast: Online';
      badge.innerHTML = '●'; // Or simple dot for "light up"
    } else {
      badge.className = 'tag green inactive';
      badge.textContent = 'Broadcast: Offline';
      badge.innerHTML = '○';
    }
  }
  isBroadcastActive = isActive;
  window.isBroadcastActive = isActive;
}

// ================================
// CLOUD CHARACTER STORAGE & LIVE SYNC
// ================================

/**
 * Start live listener for character changes in cloud
 * Enables real-time sync across devices/sessions
 */
function startCloudCharacterListener() {
  if (!currentUserId || charactersListener) return;
  
  try {
    const charsRef = ref(database, `users/${currentUserId}/characters`);
    charactersListener = onValue(charsRef, (snapshot) => {
      if (snapshot.exists()) {
        const characters = snapshot.val();
        console.log('🔄 Cloud characters updated (live):', Object.keys(characters).length, 'found');
        
        // Dispatch custom event for app to handle (e.g., update local state)
        document.dispatchEvent(new CustomEvent('cloud-characters-updated', { detail: characters }));
        
        updateCloudStatus(true);
      } else {
        console.log('ℹ️ No cloud characters yet');
        updateCloudStatus(true); // Still connected, just empty
      }
    }, (error) => {
      console.error('❌ Cloud listener error:', error);
      updateCloudStatus(false);
    });
    
    console.log('✅ Cloud character listener started');
    cloudSyncActive = true;
    window.cloudSyncActive = true;
  } catch (error) {
    console.error('❌ Failed to start cloud listener:', error);
  }
}

/**
 * Stop cloud character listener (e.g., on disconnect)
 */
function stopCloudCharacterListener() {
  if (charactersListener) {
    off(ref(database, `users/${currentUserId}/characters`), 'value', charactersListener);
    charactersListener = null;
    console.log('⏹️ Cloud character listener stopped');
  }
  cloudSyncActive = false;
  window.cloudSyncActive = false;
  updateCloudStatus(false);
}

/**
 * Save character data to Firebase cloud storage
 * @param {Object} characterData - Complete character object (JSON-serializable)
 * @returns {Promise<Boolean>} Success status
 */
async function saveCharacterToCloud(characterData) {
  if (!database || !currentUserId || !characterData || !characterData.name) {
    console.warn('⚠️ Cannot save to cloud: Missing auth/data');
    updateCloudStatus(false);
    return false;
  }
  
  try {
    // ⭐ FIXED: Ensure data is deeply serializable (strip functions, etc.)
    const serializableData = JSON.parse(JSON.stringify(characterData)); // Deep clone to remove non-JSON props
    
    const charRef = ref(database, `users/${currentUserId}/characters/${characterData.name}`);
    await set(charRef, { 
      ...serializableData, 
      lastModified: Date.now(),
      synced: true // Flag for sync status
    });
    
    console.log('✅ Character saved to cloud:', characterData.name);
    updateCloudStatus(true);
    return true;
  } catch (error) {
    console.error('❌ Failed to save character to cloud:', error.code, error.message);
    // Common fixes: Check Firebase rules allow anonymous writes to /users/{uid}/*
    updateCloudStatus(false);
    return false;
  }
}

/**
 * Load all characters from Firebase cloud storage (initial load)
 * @returns {Promise<Object|null>} Characters object or null
 */
async function loadCharactersFromCloud() {
  if (!database || !currentUserId) {
    console.warn('⚠️ Cannot load from cloud: Not authenticated');
    return null;
  }
  
  try {
    const charsRef = ref(database, `users/${currentUserId}/characters`);
    const snapshot = await get(charsRef);
    
    if (snapshot.exists()) {
      const characters = snapshot.val();
      console.log('✅ Characters loaded from cloud:', Object.keys(characters).length);
      updateCloudStatus(true);
      
      // Dispatch event for app to handle
      document.dispatchEvent(new CustomEvent('cloud-characters-loaded', { detail: characters }));
      
      return characters;
    }
    
    console.log('ℹ️ No characters found in cloud');
    updateCloudStatus(true);
    return {};
  } catch (error) {
    console.error('❌ Failed to load characters from cloud:', error);
    updateCloudStatus(false);
    return null;
  }
}

/**
 * Save last loaded character name to cloud
 * @param {String} characterName - Name of last loaded character
 * @returns {Promise<Boolean>} Success status
 */
async function saveLastCharacterToCloud(characterName) {
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
 * @returns {Promise<String|null>} Last character name or null
 */
async function loadLastCharacterFromCloud() {
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
 * Manual cloud sync button handler
 * Forces load + optional save of current character
 * @param {Object} [currentCharacter] - Optional character to save during sync
 */
async function toggleCloudSync(currentCharacter = null) {
  console.log('🔄 Manual cloud sync triggered');
  updateCloudStatus(false); // Show syncing
  
  try {
    // Save if provided
    if (currentCharacter) {
      await saveCharacterToCloud(currentCharacter);
    }
    
    // Force reload
    await loadCharactersFromCloud();
    
    // Update last character if applicable
    if (currentCharacter && currentCharacter.name) {
      await saveLastCharacterToCloud(currentCharacter.name);
    }
    
    console.log('✅ Manual sync complete');
    updateCloudStatus(true);
  } catch (error) {
    console.error('❌ Manual sync failed:', error);
    updateCloudStatus(false);
  }
}

/**
 * Update cloud sync status badge (blue when active)
 * @param {Boolean} isActive - Sync status
 */
function updateCloudStatus(isActive) {
  const badge = document.getElementById('cloudBadge');
  if (badge) {
    if (isActive) {
      badge.className = 'tag blue active'; // Assume CSS: .tag.blue { background: blue; }
      badge.textContent = 'Cloud: Synced';
      badge.innerHTML = '●'; // Light up
    } else {
      badge.className = 'tag blue inactive';
      badge.textContent = 'Cloud: Offline';
      badge.innerHTML = '○';
    }
  }
  cloudSyncActive = isActive;
  window.cloudSyncActive = isActive;
}

// ================================
// LEGACY: FIREBASE-BASED BROADCAST (KEEP FOR COMPAT)
// ================================

/**
 * Legacy Firebase-based broadcast listener (for MC App if using RTDB)
 * ⭐ KEPT: In case MC App sends via Firebase; otherwise, use local channel
 */
function initializeFirebaseBroadcastListener() {
  if (!database || !currentUserId) {
    console.warn('⚠️ Skipping Firebase broadcast: Not ready');
    return;
  }
  
  console.log('👂 Starting legacy Firebase MC broadcast listener...');
  
  const broadcastRef = ref(database, 'mcBroadcast');
  
  onValue(broadcastRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    console.log('📡 Firebase broadcast received:', data);
    
    // Fallback updates (if not using local channel)
    if (data.currentMusic && document.getElementById('musicTitle')) {
      document.getElementById('musicTitle').textContent = `♪ ${data.currentMusic.name}`;
    }
    if (data.currentScene?.imageUrl && document.getElementById('locationImage')) {
      document.getElementById('locationImage').src = data.currentScene.imageUrl;
    }
    // Add second image if sent via Firebase (e.g., data.spotlightImage)
    if (data.spotlightImage && document.getElementById('spotlightImage')) {
      document.getElementById('spotlightImage').src = data.spotlightImage;
    }
    
    updateBroadcastStatus(true);
  }, (error) => {
    console.error('❌ Firebase broadcast error:', error);
    updateBroadcastStatus(false);
  });
  
  console.log('✅ Legacy Firebase broadcast listener active');
}

/**
 * Broadcast character data to MC App (via Firebase, for legacy)
 */
async function broadcastCharacterToMc(characterData) {
  if (!database || !currentUserId || !characterData) {
    return false;
  }
  
  try {
    const broadcastRef = ref(database, `mcBroadcast/playerUpdates/${currentUserId}`);
    await set(broadcastRef, { 
      ...characterData, 
      lastBroadcast: Date.now() 
    });
    
    console.log('📤 Character broadcast to MC App (Firebase):', characterData.name);
    return true;
  } catch (error) {
    console.error('❌ Failed to broadcast character:', error);
    return false;
  }
}

// ================================
// GLOBAL EXPORTS (for non-module scripts)
// ================================

// Make functions available globally via window object
window.initializeAuth = initializeAuth;
window.initializeBroadcastChannel = initializeBroadcastChannel; // ⭐ NEW: Local broadcast
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.saveLastCharacterToCloud = saveLastCharacterToCloud;
window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;
window.broadcastCharacterToMc = broadcastCharacterToMc;
window.toggleCloudSync = toggleCloudSync; // ⭐ NEW: For sync button
window.updateBroadcastStatus = updateBroadcastStatus;
window.updateCloudStatus = updateCloudStatus;

// Export for module imports
export {
  // core initialized objects
  database,
  auth,
  currentUserId,

  // auth / storage helpers
  initializeAuth,
  saveCharacterToCloud,
  loadCharactersFromCloud,
  saveLastCharacterToCloud,
  loadLastCharacterFromCloud,
  broadcastCharacterToMc,
  initializeBroadcastChannel, // ⭐ NEW
  toggleCloudSync, // ⭐ NEW
  startCloudCharacterListener,
  stopCloudCharacterListener,

  // re-export database helper functions
  ref,
  set,
  get,
  onValue,
  off
};

// ⭐ FIXED: Auto-start on load
document.addEventListener('DOMContentLoaded', () => {
  initializeAuth().then(() => {
    initializeBroadcastChannel(); // Start local broadcast
    initializeFirebaseBroadcastListener(); // Legacy support
  });
});

console.log('✅ Firebase config loaded - Auto-initializing auth & listeners');
console.log('💡 Tip: Ensure Firebase rules allow anonymous read/write to /users/{auth.uid}/*');
console.log('💡 For MC App: Send via new BroadcastChannel("mc-player-broadcast") with { music: {name}, image1: url, image2: url }');
console.log('💡 UI: Add <span id="broadcastBadge" class="tag green">○</span> <span id="cloudBadge" class="tag blue">○</span> <button onclick="toggleCloudSync()">Sync Cloud</button>');

