// ================================
// FIREBASE CONFIGURATION
// Player App - Cloud Sync & Broadcast Receiving
// ⭐ FIXED v6: Added event guards to prevent dispatch loops/freezes
// ⭐ FIXED: Throttled logs; one-time initial dispatch
// ================================

// Import Firebase SDK modules from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase, ref, set, get, onValue, off, goOnline } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// ⭐ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
  authDomain: "queerz-mc-live.firebaseapp.com",
  databaseURL: "https://queerz-mc-live-default-rtdb.firebaseio.com",
  projectId: "queerz-mc-live",
  storageBucket: "queerz-mc-live.firebasestorage.app",
  messagingSenderId: "155846709409",
  appId: "1:155846709:web:8c12204dc7d502586a20e0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);
window.auth = auth;
let currentUserId = null;
window.currentUserId = currentUserId;

let cloudSyncActive = false;
window.cloudSyncActive = cloudSyncActive;
let charactersListener = null;
let isInitialLoad = true; // ⭐ NEW: Guard for one-time initial dispatch

console.log('🔥 Firebase initialized');
console.log('📡 URL:', firebaseConfig.databaseURL);

// Force online
goOnline(database);

// ================================
// IMMEDIATE ROBUST AUTH
// ================================

async function forceSignInAnonymously(retryCount = 0) {
  const maxRetries = 5;
  try {
    console.log(`🔐 Sign-in attempt ${retryCount + 1}/${maxRetries}`);
    const userCredential = await signInAnonymously(auth);
    currentUserId = userCredential.user.uid;
    window.currentUserId = currentUserId;
    console.log('✅ SIGNED IN:', currentUserId);
    startCloudCharacterListener();
    updateCloudStatus(true);
    // Auto-enable toggle button after auth
    const toggleBtn = document.getElementById('cloudSyncToggle');
    if (toggleBtn && toggleBtn.classList.contains('cloud-disabled')) {
      toggleBtn.classList.remove('cloud-disabled');
      toggleBtn.classList.add('cloud-active');
      toggleBtn.textContent = '☁️ Cloud: ON';
    }
    document.dispatchEvent(new Event('firebase-auth-ready'));
    return true;
  } catch (error) {
    console.error(`❌ Sign-in failed (${retryCount + 1}):`, error.code, error.message);
    if (retryCount < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return forceSignInAnonymously(retryCount + 1);
    }
    console.error('💡 Check: Network? API key? Rules allow anonymous?');
    updateCloudStatus(false);
    document.dispatchEvent(new Event('firebase-auth-failed'));
    return false;
  }
}

onAuthStateChanged(auth, (user) => {
  console.log('🔍 Auth change:', user ? `UID ${user.uid}` : 'NULL USER');
  if (user) {
    if (currentUserId !== user.uid) {
      currentUserId = user.uid;
      window.currentUserId = currentUserId;
      startCloudCharacterListener();
    }
    updateCloudStatus(true);
  } else {
    console.log('⚠️ NULL detected - retrying sign-in...');
    forceSignInAnonymously();
  }
});

// Start auth IMMEDIATELY
forceSignInAnonymously();

// ================================
// BROADCAST LISTENER (FIREBASE-ONLY)
// ================================

function initializeBroadcastListener() {
  console.log('👂 Broadcast listener starting...');
  let hasReceived = false;
  const broadcastRef = ref(database, 'mcBroadcast');
  
  onValue(broadcastRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      console.log('📡 Broadcast data received:', data); // Full data logging
    }

    if (!data) return;

    hasReceived = true;

    // Scene/Environment + Image
    const environment = data.environment || data.currentScene;
    if (environment) {
      const sceneInfo = document.getElementById('sceneInfo');
      if (sceneInfo) {
        sceneInfo.textContent = environment.name || 'Unknown Scene';
      }
      const sceneImg = document.getElementById('sceneImage');
      if (sceneImg && environment.imageUrl) {
        sceneImg.src = environment.imageUrl;
        sceneImg.style.display = 'block';
      }
    }

    // Music + Audio Player
    const music = data.music || data.currentMusic;
    if (music) {
      const musicInfo = document.getElementById('musicInfo');
      if (musicInfo) {
        musicInfo.textContent = music.name || 'No music';
      }
      const musicPlayer = document.getElementById('musicPlayer');
      if (musicPlayer && music.url) {
        musicPlayer.src = music.url;
        musicPlayer.style.display = 'block';
        // Auto-loop if specified
        if (music.isLooping !== undefined) {
          musicPlayer.loop = music.isLooping;
        }
      }
    }

    // NPC/Spotlight Character + Image
    const npc = data.npc || data.activeCharacter;
    if (npc) {
      const spotlightInfo = document.getElementById('spotlightInfo');
      if (spotlightInfo) {
        spotlightInfo.textContent = npc.name || 'No spotlight';
      }
      const spotImg = document.getElementById('spotlightPortrait');
      if (spotImg && npc.imageUrl) {
        spotImg.src = npc.imageUrl;
        spotImg.style.display = 'block';
      }
    }

    // ⭐ NEW: Handle Status Tags and Story Tags from MC
    let statusTags = [];
    let storyTags = [];

    // Check multiple possible locations for tags

    // Option 1: Tags in players array (actual MC app structure)
    if (data.players && Array.isArray(data.players)) {
      console.log('🔍 Found players array, length:', data.players.length);

      // Try to find current player by matching character name
      const currentCharName = localStorage.getItem('currentCharacterName');
      console.log('🔍 Looking for character name:', currentCharName);
      let currentPlayer = null;

      if (currentCharName) {
        currentPlayer = data.players.find(p => p.name === currentCharName);
        console.log('🔍 Found by name match:', currentPlayer ? 'YES' : 'NO');
      }

      // If no match by name, try first player (for single player scenarios)
      if (!currentPlayer && data.players.length > 0) {
        currentPlayer = data.players[0];
        console.log('🔍 Using first player:', currentPlayer.name);
      }

      console.log('🔍 Current player object:', currentPlayer);

      if (currentPlayer && currentPlayer.tags) {
        console.log('🔍 Player has tags:', currentPlayer.tags);
        statusTags = currentPlayer.tags.status || [];
        storyTags = currentPlayer.tags.story || [];
        console.log('📥 Found tags for player:', currentPlayer.name, { statusTags, storyTags });
      } else {
        console.log('⚠️ Player missing tags property');
      }
    } else {
      console.log('⚠️ No players array in broadcast data');
    }

    // Option 2: Tags in playerUpdates (alternative structure)
    if (data.playerUpdates && window.currentUserId) {
      const playerUpdate = data.playerUpdates[window.currentUserId];
      if (playerUpdate) {
        statusTags = playerUpdate.statusTags || statusTags;
        storyTags = playerUpdate.storyTags || storyTags;
      }
    }

    // Option 3: Direct properties (fallback)
    if (data.statusTags) {
      statusTags = data.statusTags;
    }
    if (data.storyTags) {
      storyTags = data.storyTags;
    }

    // Dispatch if we have any tags
    if (statusTags.length > 0 || storyTags.length > 0) {
      console.log('📥 Broadcasting tag update:', { statusTags, storyTags });
      document.dispatchEvent(new CustomEvent('mc-tag-update', {
        detail: {
          statusTags: statusTags,
          storyTags: storyTags
        }
      }));
    }

    // Update statuses
    updateBroadcastStatus(true);
    const mcStatus = document.getElementById('mcStatus');
    if (mcStatus) mcStatus.textContent = 'Receiving from MC...';
    
  }, (error) => {
    console.error('❌ Broadcast error:', error);
    updateBroadcastStatus(false);
  });
  
  console.log('✅ Listener active');
}

// Start broadcast IMMEDIATELY
initializeBroadcastListener();

// Add polling fallback to ensure tags are fetched frequently (every 2 seconds)
// This ensures immediate application of MC-broadcasted status/story tags
let pollingInterval = null;

function startBroadcastPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  console.log('⏱️ Starting broadcast polling (every 2 seconds for immediate tag sync)');

  pollingInterval = setInterval(async () => {
    try {
      const broadcastRef = ref(database, 'mcBroadcast');
      const snapshot = await get(broadcastRef);
      const data = snapshot.val();

      if (!data) return;

      // Extract tags using same logic as real-time listener
      let statusTags = [];
      let storyTags = [];

      if (data.players && Array.isArray(data.players)) {
        const currentCharName = localStorage.getItem('currentCharacterName');
        let currentPlayer = null;

        if (currentCharName) {
          currentPlayer = data.players.find(p => p.name === currentCharName);
        }

        if (!currentPlayer && data.players.length > 0) {
          currentPlayer = data.players[0];
        }

        if (currentPlayer && currentPlayer.tags) {
          statusTags = currentPlayer.tags.status || [];
          storyTags = currentPlayer.tags.story || [];
        }
      }

      if (data.playerUpdates && window.currentUserId) {
        const playerUpdate = data.playerUpdates[window.currentUserId];
        if (playerUpdate) {
          statusTags = playerUpdate.statusTags || statusTags;
          storyTags = playerUpdate.storyTags || storyTags;
        }
      }

      if (data.statusTags) {
        statusTags = data.statusTags;
      }
      if (data.storyTags) {
        storyTags = data.storyTags;
      }

      // Dispatch if we have any tags
      if (statusTags.length > 0 || storyTags.length > 0) {
        document.dispatchEvent(new CustomEvent('mc-tag-update', {
          detail: {
            statusTags: statusTags,
            storyTags: storyTags
          }
        }));
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  }, 2000); // Poll every 2 seconds for immediate updates
}

// Start polling immediately
startBroadcastPolling();

function updateBroadcastStatus(isActive) {
  const badge = document.getElementById('syncBadge');
  if (badge) {
    badge.className = isActive ? 'badge online' : 'badge offline';
    badge.innerHTML = isActive ? '●' : '●';
    badge.title = isActive ? 'Broadcast Online' : 'Broadcast Offline';
  }
}

// ================================
// CHARACTER BROADCAST TO MC
// ================================

async function broadcastCharacterToMc(characterData) {
  if (!database || !currentUserId || !characterData) {
    console.warn('⚠️ Cannot broadcast: Missing data/auth');
    return false;
  }
  
  try {
    const broadcastRef = ref(database, `mcBroadcast/playerUpdates/${currentUserId}`);
    await set(broadcastRef, { 
      ...characterData, 
      lastBroadcast: Date.now() 
    });
    
    console.log('📤 Broadcast to MC:', characterData.name);
    return true;
  } catch (error) {
    console.error('❌ Broadcast failed:', error);
    return false;
  }
}

// ================================
// CLOUD SYNC (LOOP-GUARDED)
// ================================

function startCloudCharacterListener() {
  if (!currentUserId || charactersListener) return;
  const charsRef = ref(database, `users/${currentUserId}/characters`);
  charactersListener = onValue(charsRef, (snapshot) => {
    const chars = snapshot.exists() ? snapshot.val() : {};
    if (Object.keys(chars).length > 0) console.log('🔄 Live chars updated:', Object.keys(chars).length); // Throttled
    document.dispatchEvent(new CustomEvent('cloud-characters-updated', { detail: chars }));
    updateCloudStatus(true);
  }, (error) => {
    console.error('❌ Listener error:', error);
    updateCloudStatus(false);
  });
  // Initial load: Dispatch only once
  if (isInitialLoad) {
    document.dispatchEvent(new CustomEvent('cloud-characters-loaded', { detail: {} }));
    isInitialLoad = false;
  }
  console.log('✅ Cloud listener on');
}

function stopCloudCharacterListener() {
  if (charactersListener) {
    const charsRef = ref(database, `users/${currentUserId}/characters`);
    off(charsRef, 'value', charactersListener);
    charactersListener = null;
  }
  updateCloudStatus(false);
}

async function saveCharacterToCloud(characterData) {
  if (!currentUserId || !characterData?.name) return false;
  try {
    const serialData = JSON.parse(JSON.stringify(characterData));
    const charRef = ref(database, `users/${currentUserId}/characters/${characterData.name}`);
    await set(charRef, { ...serialData, lastModified: Date.now() });
    console.log('✅ Saved:', characterData.name);
    return true;
  } catch (error) {
    console.error('❌ Save failed:', error.code);
    return false;
  }
}

async function loadCharactersFromCloud() {
  if (!currentUserId) return null;
  try {
    let chars = {};
    const userRef = ref(database, `users/${currentUserId}/characters`);
    const snap = await get(userRef);
    if (snap.exists()) {
      chars = snap.val();
    } else {
      console.log('ℹ️ No user chars - trying legacy');
      const legacyRef = ref(database, 'playerCharacters');
      const legacySnap = await get(legacyRef);
      if (legacySnap.exists()) chars = legacySnap.val();
    }
    console.log('✅ Loaded:', Object.keys(chars).length);
    // Dispatch only if not initial (guard against loop)
    if (!isInitialLoad) {
      document.dispatchEvent(new CustomEvent('cloud-characters-loaded', { detail: chars }));
    }
    return chars;
  } catch (error) {
    console.error('❌ Load failed:', error);
    return null;
  }
}

async function saveLastCharacterToCloud(charName) {
  if (!currentUserId) return false;
  try {
    await set(ref(database, `users/${currentUserId}/lastCharacter`), charName || null);
    return true;
  } catch (error) {
    console.error('❌ Last char save:', error);
    return false;
  }
}

async function loadLastCharacterFromCloud() {
  if (!currentUserId) return null;
  try {
    const snap = await get(ref(database, `users/${currentUserId}/lastCharacter`));
    return snap.exists() ? snap.val() : null;
  } catch (error) {
    console.error('❌ Last char load:', error);
    return null;
  }
}

async function toggleCloudSync(currentChar = null) {
  console.log('🔄 Sync toggle...');
  updateCloudStatus(false);
  try {
    if (currentChar) await saveCharacterToCloud(currentChar);
    await loadCharactersFromCloud();
    if (currentChar?.name) await saveLastCharacterToCloud(currentChar.name);
    console.log('✅ Synced');
    updateCloudStatus(true);
  } catch (error) {
    console.error('❌ Sync error:', error);
    updateCloudStatus(false);
  }
}

function updateCloudStatus(isActive) {
  const badge = document.getElementById('cloudBadge');
  if (badge) {
    badge.className = isActive ? 'badge cloud-online' : 'badge cloud-offline';
    badge.innerHTML = isActive ? '☁️' : '☁️';
    badge.title = isActive ? 'Cloud Synced' : 'Cloud Offline';
  }
  cloudSyncActive = isActive;
}

// Wire button on DOMLoaded
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('cloudSyncToggle');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      toggleBtn.classList.toggle('cloud-disabled');
      toggleBtn.classList.toggle('cloud-active');
      toggleBtn.textContent = toggleBtn.classList.contains('cloud-active') ? '☁️ Cloud: ON' : '☁️ Cloud: OFF';
      toggleCloudSync();
    };
    console.log('✅ Cloud toggle button wired');
  }
  loadLastCharacterFromCloud();
});

// ================================
// EXPORTS
// ================================

window.forceSignInAnonymously = forceSignInAnonymously;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.saveLastCharacterToCloud = saveLastCharacterToCloud;
window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;
window.toggleCloudSync = toggleCloudSync;

export {
  database, auth, currentUserId,
  forceSignInAnonymously,
  saveCharacterToCloud, loadCharactersFromCloud,
  saveLastCharacterToCloud, loadLastCharacterFromCloud,
  toggleCloudSync,
  ref, set, get, onValue, off
};

console.log('✅ Config v6 loaded - Loop guards added');
console.log('💡 Initial load guarded—no infinite dispatches');
