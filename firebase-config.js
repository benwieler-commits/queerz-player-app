// ================================
// FIREBASE CONFIG - PLAYER APP
// ================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, set, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Firebase configuration - SAME PROJECT AS MC APP
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
let auth;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  auth = getAuth(app);
  
  console.log('✅ Firebase initialized - Player App connected to queerz-mc-live');
  
  // Make database available globally
  window.firebaseDatabase = database;
  window.firebaseRef = ref;
  window.firebaseSet = set;
  
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

// ================================
// AUTHENTICATION
// ================================

if (auth) {
  signInAnonymously(auth)
    .then(() => console.log('✅ Player authenticated anonymously'))
    .catch((error) => console.error('❌ Auth failed:', error));

  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.currentUserId = user.uid;
      console.log('✅ Player ID:', user.uid);
      
      // Dispatch auth ready event
      window.dispatchEvent(new CustomEvent('firebaseAuthReady', {
        detail: { userId: user.uid }
      }));
    } else {
      window.currentUserId = null;
    }
  });
}

// ================================
// LISTEN FOR MC BROADCASTS
// ================================

if (database) {
  console.log('📡 Setting up MC broadcast listener...');
  
  const mcBroadcastRef = ref(database, 'mcBroadcast');
  
  onValue(mcBroadcastRef, (snapshot) => {
    const data = snapshot.val();
    
    if (!data) return;
    
    console.log('📥 MC Broadcast received:', data);
    
    // ================================
    // LOCATION UPDATE
    // ================================
    if (data.location) {
      const locationDisplay = document.getElementById('sceneFromMC');
      if (locationDisplay) {
        locationDisplay.innerHTML = `
          <strong>${data.location.name || 'Unknown Location'}</strong>
          ${data.location.description ? `<br><small>${data.location.description}</small>` : ''}
        `;
      }
      
      // Update location image if available
      const locationImg = document.getElementById('locationImage');
      if (locationImg && data.location.imageUrl) {
        locationImg.src = data.location.imageUrl;
        locationImg.style.display = 'block';
      }
      
      console.log('📍 Location updated:', data.location.name);
    }
    
    // ================================
    // NPC UPDATE
    // ================================
    if (data.npc) {
      const npcDisplay = document.getElementById('npcInfo');
      if (npcDisplay) {
        npcDisplay.innerHTML = `
          <strong>NPC: ${data.npc.name || 'Unknown'}</strong>
          ${data.npc.description ? `<br><small>${data.npc.description}</small>` : ''}
        `;
        npcDisplay.style.display = 'block';
      }
      
      // Update NPC portrait if available
      const npcPortrait = document.getElementById('npcPortrait');
      if (npcPortrait && data.npc.portraitUrl) {
        npcPortrait.src = data.npc.portraitUrl;
        npcPortrait.style.display = 'block';
      }
      
      console.log('👤 NPC updated:', data.npc.name);
    }
    
    // ================================
    // MUSIC UPDATE
    // ================================
    if (data.music) {
      const musicDisplay = document.getElementById('musicFromMC');
      if (musicDisplay) {
        musicDisplay.innerHTML = `♪ ${data.music.name || 'Unknown Track'}`;
      }
      
      // Update audio player if available
      const audioPlayer = document.getElementById('musicPlayer');
      if (audioPlayer && data.music.url) {
        audioPlayer.src = data.music.url;
        
        // Auto-play if MC is playing
        if (data.music.isPlaying) {
          audioPlayer.play().catch(err => {
            console.log('ℹ️ Autoplay blocked - user must interact first');
          });
        } else {
          audioPlayer.pause();
        }
      }
      
      console.log('🎵 Music updated:', data.music.name);
    }
    
    // ================================
    // TAG UPDATES (STATUS + STORY)
    // ================================
    if (data.tags) {
      console.log('🏷️ Tags received from MC:', data.tags);
      
      // Dispatch custom event for tag updates
      const tagEvent = new CustomEvent('mc-tag-update', {
        detail: {
          statusTags: data.tags.status || [],
          storyTags: data.tags.story || []
        }
      });
      document.dispatchEvent(tagEvent);
      
      // Apply tags to character if player-app.js is ready
      if (window.applyMcTagsToCharacter) {
        window.applyMcTagsToCharacter(data.tags);
      }
    }
    
    // ================================
    // SPOTLIGHT UPDATE
    // ================================
    if (data.spotlight) {
      const spotlightDisplay = document.getElementById('spotlightInfo');
      if (spotlightDisplay) {
        spotlightDisplay.innerHTML = `🎭 ${data.spotlight.characterName || 'Unknown'}`;
        spotlightDisplay.style.display = 'block';
      }
      
      console.log('🎭 Spotlight on:', data.spotlight.characterName);
    }
    
    // Update sync status badge
    updateSyncBadge(true);
    
  }, (error) => {
    console.error('❌ Error listening to MC broadcasts:', error);
    updateSyncBadge(false);
  });
  
  console.log('✅ MC broadcast listener active');
}

// ================================
// SYNC STATUS BADGE
// ================================

function updateSyncBadge(isConnected) {
  const badge = document.getElementById('syncBadge');
  if (!badge) return;
  
  if (isConnected) {
    badge.textContent = '● Live Sync';
    badge.classList.remove('offline');
    badge.classList.add('online');
  } else {
    badge.textContent = '● Offline';
    badge.classList.remove('online');
    badge.classList.add('offline');
  }
}

// ================================
// CLOUD STORAGE FUNCTIONS
// ================================
// These functions save/load character data to Firebase
// Used by player-app.js for cross-device character access

/**
 * Save a character to cloud storage
 */
export async function saveCharacterToCloud(characterData) {
  if (!database || !window.currentUserId) {
    console.error('❌ Cannot save to cloud - not authenticated');
    return false;
  }
  
  if (!characterData || !characterData.name) {
    console.error('❌ Cannot save to cloud - invalid character data');
    return false;
  }
  
  try {
    const charRef = ref(database, `users/${window.currentUserId}/characters/${characterData.name}`);
    
    // Add timestamp
    const dataToSave = {
      ...characterData,
      lastModified: Date.now()
    };
    
    await set(charRef, dataToSave);
    console.log('☁️ Character saved to cloud:', characterData.name);
    return true;
  } catch (error) {
    console.error('❌ Failed to save character to cloud:', error);
    return false;
  }
}

/**
 * Load a specific character from cloud storage by name
 */
export async function loadCharacterFromCloud(characterName) {
  if (!database || !window.currentUserId) {
    console.error('❌ Cannot load from cloud - not authenticated');
    return null;
  }
  
  if (!characterName) {
    console.error('❌ Cannot load from cloud - no character name provided');
    return null;
  }
  
  try {
    const { get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const charRef = ref(database, `users/${window.currentUserId}/characters/${characterName}`);
    
    console.log('☁️ Loading character from cloud:', characterName);
    
    const snapshot = await get(charRef);
    
    if (snapshot.exists()) {
      const character = snapshot.val();
      console.log('✅ Character loaded from cloud:', characterName);
      return character;
    } else {
      console.log('ℹ️ Character not found in cloud:', characterName);
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to load character from cloud:', error);
    return null;
  }
}

/**
 * Load all characters from cloud storage
 */
export async function loadCharactersFromCloud() {
  if (!database || !window.currentUserId) {
    console.error('❌ Cannot load from cloud - not authenticated');
    return null;
  }
  
  try {
    const { get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const charsRef = ref(database, `users/${window.currentUserId}/characters`);
    
    console.log('☁️ Loading characters from cloud...');
    
    const snapshot = await get(charsRef);
    
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

/**
 * Delete a character from cloud storage
 */
export async function deleteCharacterFromCloud(characterName) {
  if (!database || !window.currentUserId) {
    console.error('❌ Cannot delete from cloud - not authenticated');
    return false;
  }
  
  try {
    const { remove } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const charRef = ref(database, `users/${window.currentUserId}/characters/${characterName}`);
    
    console.log('☁️ Deleting character from cloud:', characterName);
    
    await remove(charRef);
    console.log('✅ Character deleted from cloud successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to delete character from cloud:', error);
    return false;
  }
}

/**
 * Save the name of the last character used
 */
export async function saveLastCharacterToCloud(characterName) {
  if (!database || !window.currentUserId) {
    return false;
  }
  
  try {
    const lastCharRef = ref(database, `users/${window.currentUserId}/lastCharacter`);
    await set(lastCharRef, characterName);
    console.log('☁️ Last character saved to cloud:', characterName);
    return true;
  } catch (error) {
    console.error('❌ Failed to save last character to cloud:', error);
    return false;
  }
}

/**
 * Load the name of the last character used
 */
export async function loadLastCharacterFromCloud() {
  if (!database || !window.currentUserId) {
    return null;
  }
  
  try {
    const { get } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
    const lastCharRef = ref(database, `users/${window.currentUserId}/lastCharacter`);
    
    const snapshot = await get(lastCharRef);
    
    if (snapshot.exists()) {
      const lastCharName = snapshot.val();
      console.log('☁️ Last character loaded from cloud:', lastCharName);
      return lastCharName;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to load last character from cloud:', error);
    return null;
  }
}

// ================================
// EXPORTS
// ================================

export { database, ref, set };

// Make all cloud functions available globally for player-app.js
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharacterFromCloud = loadCharacterFromCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.deleteCharacterFromCloud = deleteCharacterFromCloud;
window.saveLastCharacterToCloud = saveLastCharacterToCloud;
window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;

console.log('✅ player-firebase-config.js loaded');
console.log('   📥 Listening: mcBroadcast');
console.log('   📤 Broadcasting: playerCharacters/{userId}, playerRolls/{userId}');
console.log('   ☁️ Cloud storage: characters, lastCharacter');
