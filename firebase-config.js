// ================================
// FIREBASE CONFIGURATION
// Player App - Cloud Sync & Broadcast Receiving
// ================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  off,
  goOnline
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
  authDomain: "queerz-mc-live.firebaseapp.com",
  databaseURL: "https://queerz-mc-live-default-rtdb.firebaseio.com",
  projectId: "queerz-mc-live",
  storageBucket: "queerz-mc-live.firebasestorage.app",
  messagingSenderId: "155846709409",
  appId: "1:155846709:web:8c12204dc7d502586a20e0"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

window.auth = auth;
let currentUserId = null;
window.currentUserId = currentUserId;

let cloudSyncActive = false;
window.cloudSyncActive = cloudSyncActive;
let charactersListener = null;
let isInitialLoad = true;

console.log('Firebase initialized');
goOnline(database);

// ================================
// AUTH
// ================================

async function forceSignInAnonymously(retryCount = 0) {
  const maxRetries = 5;
  try {
    console.log(`Sign-in attempt ${retryCount + 1}/${maxRetries}`);
    const userCredential = await signInAnonymously(auth);
    currentUserId = userCredential.user.uid;
    window.currentUserId = currentUserId;
    console.log('SIGNED IN:', currentUserId);
    startCloudCharacterListener();
    updateCloudStatus(true);

    const toggleBtn = document.getElementById('cloudSyncToggle');
    if (toggleBtn?.classList.contains('cloud-disabled')) {
      toggleBtn.classList.remove('cloud-disabled');
      toggleBtn.classList.add('cloud-active');
      toggleBtn.textContent = 'Cloud: ON';
    }
    document.dispatchEvent(new Event('firebase-auth-ready'));
    return true;
  } catch (error) {
    console.error(`Sign-in failed (${retryCount + 1}):`, error.code);
    if (retryCount < maxRetries) {
      await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
      return forceSignInAnonymously(retryCount + 1);
    }
    updateCloudStatus(false);
    document.dispatchEvent(new Event('firebase-auth-failed'));
    return false;
  }
}

onAuthStateChanged(auth, user => {
  if (user) {
    if (currentUserId !== user.uid) {
      currentUserId = user.uid;
      window.currentUserId = currentUserId;
      startCloudCharacterListener();
    }
    updateCloudStatus(true);
  } else {
    forceSignInAnonymously();
  }
});

forceSignInAnonymously();

// ================================
// TAG FORMAT PARSING
// ================================

function parseTagFormat(tag) {
  if (!tag || typeof tag !== 'string') {
    return { displayText: tag, modifier: 0, originalTag: tag };
  }
  const parts = tag.split('-');
  const lastPart = parts[parts.length - 1];
  const modifier = parseInt(lastPart);

  if (!isNaN(modifier) && parts.length > 1) {
    const textParts = parts.slice(0, -1);
    return {
      displayText: textParts.join(' '),
      modifier: -Math.abs(modifier),
      originalTag: tag
    };
  }

  return {
    displayText: tag.replace(/-/g, ' '),
    modifier: 0,
    originalTag: tag
  };
}

function calculateStatusModifier(statusTags) {
  if (!Array.isArray(statusTags) || statusTags.length === 0) return 0;
  return statusTags.reduce((sum, tag) => sum + parseTagFormat(tag).modifier, 0);
}

window.parseTagFormat = parseTagFormat;
window.calculateStatusModifier = calculateStatusModifier;

// ================================
// BROADCAST LISTENER & POLLING
// ================================

let pollingInterval = null;

function initializeBroadcastListener() {
  console.log('🎧 Initializing MC Broadcast listener...');
  const broadcastRef = ref(database, 'mcBroadcast');
  onValue(broadcastRef, snapshot => {
    console.log('📡 Broadcast listener fired!', snapshot.exists());
    const data = snapshot.val();
    if (!data) {
      console.log('⚠️ No broadcast data received');
      return;
    }
    console.log('✅ Broadcast data received:', data);

    // Scene / Music / NPC handling
    // Update scene information
    const sceneInfo = document.getElementById('sceneInfo');
    const sceneImage = document.getElementById('sceneImage');
    if (sceneInfo) {
      sceneInfo.textContent = data.scene || 'Waiting for scene...';
    }
    if (sceneImage && data.sceneImage) {
      sceneImage.src = data.sceneImage;
      sceneImage.style.display = 'block';
    } else if (sceneImage) {
      sceneImage.style.display = 'none';
    }

    // Update music information
    const musicInfo = document.getElementById('musicInfo');
    const musicPlayer = document.getElementById('musicPlayer');
    if (musicInfo) {
      musicInfo.textContent = data.music || 'No music playing';
    }
    if (musicPlayer && data.musicUrl) {
      musicPlayer.src = data.musicUrl;
      musicPlayer.style.display = 'block';
    } else if (musicPlayer) {
      musicPlayer.style.display = 'none';
    }

    // Update NPC/Spotlight information
    const spotlightInfo = document.getElementById('spotlightInfo');
    const spotlightPortrait = document.getElementById('spotlightPortrait');
    if (spotlightInfo) {
      spotlightInfo.textContent = data.spotlight || data.npc || '—';
    }
    if (spotlightPortrait && data.spotlightPortrait) {
      spotlightPortrait.src = data.spotlightPortrait;
      spotlightPortrait.style.display = 'block';
    } else if (spotlightPortrait) {
      spotlightPortrait.style.display = 'none';
    }

    // Tag extraction (kept exactly as you wrote it)
    let statusTags = [];
    let storyTags = [];

    if (data.players && Array.isArray(data.players)) {
      const currentCharName = localStorage.getItem('currentCharacterName');
      let player = data.players.find(p => p.name === currentCharName) ||
                  data.players[0];

      if (player?.tags) {
        statusTags = player.tags.status || [];
        storyTags = player.tags.story || [];
      }
    }

    if (data.playerUpdates?.[window.currentUserId]) {
      const upd = data.playerUpdates[window.currentUserId];
      statusTags = upd.statusTags || statusTags;
      storyTags = upd.storyTags || storyTags;
    }

    ['statusTags', 'storyTags'].forEach(key => {
      if (data[key]) statusTags = key === 'statusTags' ? data[key] : statusTags;
      if (data[key]) storyTags = key === 'storyTags' ? data[key] : storyTags;
    });

    if (statusTags.length || storyTags.length) {
      const totalModifier = calculateStatusModifier(statusTags);
      document.dispatchEvent(new CustomEvent('mc-tag-update', {
        detail: { statusTags, storyTags, totalModifier }
      }));
    }

    console.log('✅ UI updated with broadcast data');
    updateBroadcastStatus(true);
  }, err => {
    console.error('❌ Broadcast listener error:', err);
    updateBroadcastStatus(false);
  });
  console.log('✅ Broadcast listener attached');
}

function startBroadcastPolling() {
  console.log('🔄 Starting broadcast polling (every 2s)...');
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(async () => {
    try {
      const snap = await get(ref(database, 'mcBroadcast'));
      const data = snap.val();
      if (!data) {
        console.log('🔄 Poll: No data at mcBroadcast');
        return;
      }
      console.log('🔄 Poll: Data received', data);

      // Scene / Music / NPC handling (same as listener)
      const sceneInfo = document.getElementById('sceneInfo');
      const sceneImage = document.getElementById('sceneImage');
      if (sceneInfo) {
        sceneInfo.textContent = data.scene || 'Waiting for scene...';
      }
      if (sceneImage && data.sceneImage) {
        sceneImage.src = data.sceneImage;
        sceneImage.style.display = 'block';
      } else if (sceneImage) {
        sceneImage.style.display = 'none';
      }

      const musicInfo = document.getElementById('musicInfo');
      const musicPlayer = document.getElementById('musicPlayer');
      if (musicInfo) {
        musicInfo.textContent = data.music || 'No music playing';
      }
      if (musicPlayer && data.musicUrl) {
        musicPlayer.src = data.musicUrl;
        musicPlayer.style.display = 'block';
      } else if (musicPlayer) {
        musicPlayer.style.display = 'none';
      }

      const spotlightInfo = document.getElementById('spotlightInfo');
      const spotlightPortrait = document.getElementById('spotlightPortrait');
      if (spotlightInfo) {
        spotlightInfo.textContent = data.spotlight || data.npc || '—';
      }
      if (spotlightPortrait && data.spotlightPortrait) {
        spotlightPortrait.src = data.spotlightPortrait;
        spotlightPortrait.style.display = 'block';
      } else if (spotlightPortrait) {
        spotlightPortrait.style.display = 'none';
      }

      // Tag extraction (same as listener)
      let statusTags = [];
      let storyTags = [];

      if (data.players && Array.isArray(data.players)) {
        const currentCharName = localStorage.getItem('currentCharacterName');
        let player = data.players.find(p => p.name === currentCharName) ||
                    data.players[0];

        if (player?.tags) {
          statusTags = player.tags.status || [];
          storyTags = player.tags.story || [];
        }
      }

      if (data.playerUpdates?.[window.currentUserId]) {
        const upd = data.playerUpdates[window.currentUserId];
        statusTags = upd.statusTags || statusTags;
        storyTags = upd.storyTags || storyTags;
      }

      ['statusTags', 'storyTags'].forEach(key => {
        if (data[key]) statusTags = key === 'statusTags' ? data[key] : statusTags;
        if (data[key]) storyTags = key === 'storyTags' ? data[key] : storyTags;
      });

      if (statusTags.length || storyTags.length) {
        const totalModifier = calculateStatusModifier(statusTags);
        document.dispatchEvent(new CustomEvent('mc-tag-update', {
          detail: { statusTags, storyTags, totalModifier }
        }));
      }
    } catch (e) {
      console.error('Polling error:', e);
    }
  }, 2000);
}

function updateBroadcastStatus(isActive) {
  const badge = document.getElementById('syncBadge');
  if (badge) {
    badge.className = isActive ? 'badge online' : 'badge offline';
    badge.innerHTML = '●';
    badge.title = isActive ? 'Broadcast Online' : 'Broadcast Offline';
  }
}

initializeBroadcastListener();
startBroadcastPolling();

// ================================
// CLOUD SYNC FUNCTIONS
// ================================

function startCloudCharacterListener() {
  if (!currentUserId || charactersListener) return;
  const charsRef = ref(database, `users/${currentUserId}/characters`);
  charactersListener = onValue(charsRef, (snapshot) => {
    const chars = snapshot.exists() ? snapshot.val() : {};
    if (Object.keys(chars).length > 0) console.log('🔄 Live chars updated:', Object.keys(chars).length);
    document.dispatchEvent(new CustomEvent('cloud-characters-updated', { detail: chars }));
    updateCloudStatus(true);
  }, (error) => {
    console.error('❌ Listener error:', error);
    updateCloudStatus(false);
  });
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
    badge.innerHTML = '☁️';
    badge.title = isActive ? 'Cloud Synced' : 'Cloud Offline';
  }
  cloudSyncActive = isActive;
  window.cloudSyncActive = isActive;
}

// DOM-ready wiring
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('cloudSyncToggle');
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      toggleBtn.classList.toggle('cloud-disabled');
      toggleBtn.classList.toggle('cloud-active');
      toggleBtn.textContent = toggleBtn.classList.contains('cloud-active')
        ? 'Cloud: ON' : 'Cloud: OFF';
      toggleCloudSync();
    };
  }
  loadLastCharacterFromCloud();
});

// ================================
// EXPORTS (no duplicates)
// ================================

// Global window exports (for legacy code that expects them)
window.forceSignInAnonymously = forceSignInAnonymously;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.saveLastCharacterToCloud = saveLastCharacterToCloud;
window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;
window.toggleCloudSync = toggleCloudSync;

// Proper module exports
export {
  database,
  auth,
  currentUserId,
  forceSignInAnonymously,
  saveCharacterToCloud,
  loadCharactersFromCloud,
  saveLastCharacterToCloud,
  loadLastCharacterFromCloud,
  toggleCloudSync,
  parseTagFormat,
  calculateStatusModifier,
  ref,
  set,
  get,
  onValue,
  off
};

console.log('✅ firebase-config.js loaded - broadcast listeners + cloud sync active');
