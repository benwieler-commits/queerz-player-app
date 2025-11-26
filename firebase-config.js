// ================================
// FIREBASE CONFIG - PLAYER APP  
// COMPLETE FIX - Music, Tags, & Rolls
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
    .then(() => {
      console.log('✅ Player authenticated anonymously');
      updateSyncBadge(true);
    })
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
    
    if (!data) {
      console.log('📭 No MC broadcast data yet');
      return;
    }
    
    console.log('📥 MC Broadcast received:', data);
    
    // Update MC Status
    const mcStatus = document.getElementById('mcStatus');
    if (mcStatus) {
      mcStatus.textContent = 'Receiving MC data...';
      mcStatus.style.color = '#00FF00';
    }
    
    // ================================
    // LOCATION UPDATE (environment OR location)
    // ================================
    const locationData = data.location || data.environment;
    if (locationData && !data.tagsOnly) {  // Skip if tags-only update
      const sceneInfo = document.getElementById('sceneInfo');
      if (sceneInfo) {
        sceneInfo.textContent = locationData.name || 'Unknown Location';
        if (locationData.description) {
          sceneInfo.textContent += ` - ${locationData.description}`;
        }
      }
      
      // Update scene image if available
      const sceneImage = document.getElementById('sceneImage');
      if (sceneImage && locationData.imageUrl) {
        sceneImage.src = locationData.imageUrl;
        sceneImage.style.display = 'block';
        console.log('🖼️ Location image loaded:', locationData.imageUrl);
      } else if (sceneImage) {
        sceneImage.style.display = 'none';
      }

            // STOP MUSIC on location change (if no new music provided)
      // Music should only continue if explicitly sent with location change
      const audioPlayer = document.getElementById('musicPlayer');
      if (audioPlayer && !data.music) {
        audioPlayer.pause();
        audioPlayer.src = '';
        console.log('🎵 Music stopped due to location change');
      }
      
      console.log('📍 Location updated:', locationData.name);
    }
    
    // ================================
    // NPC/SPOTLIGHT UPDATE
    // ================================
    if (data.npc && !data.tagsOnly) {  // Skip if tags-only update
      const spotlightInfo = document.getElementById('spotlightInfo');
      if (spotlightInfo) {
        spotlightInfo.textContent = `NPC: ${data.npc.name || 'Unknown'}`;
        if (data.npc.description) {
          spotlightInfo.textContent += ` - ${data.npc.description}`;
        }
      }
      
      // Update spotlight portrait if available
      const spotlightPortrait = document.getElementById('spotlightPortrait');
      if (spotlightPortrait && (data.npc.portraitUrl || data.npc.imageUrl)) {
        spotlightPortrait.src = data.npc.portraitUrl || data.npc.imageUrl;
        spotlightPortrait.style.display = 'block';
        console.log('👤 NPC portrait loaded:', data.npc.portraitUrl || data.npc.imageUrl);
      } else if (spotlightPortrait) {
        spotlightPortrait.style.display = 'none';
      }
      
      console.log('👤 NPC updated:', data.npc.name);
    }
    
    // ================================
    // CHARACTER SPOTLIGHT CHECK
    // ================================
    if (data.spotlight) {
      const spotlightInfo = document.getElementById('spotlightInfo');
      if (spotlightInfo) {
        spotlightInfo.textContent = `Spotlight: ${data.spotlight.characterName || 'Unknown'}`;
      }
      console.log('🎭 Spotlight on:', data.spotlight.characterName);
    }
    
    // ================================
    // MUSIC UPDATE - ENHANCED!
    // ================================
    if (data.music && !data.tagsOnly) {  // Skip if tags-only update
      const musicInfo = document.getElementById('musicInfo');
      if (musicInfo) {
        musicInfo.textContent = data.music.name || 'Unknown Track';
      }
      
      // Update audio player - ALWAYS show if URL exists
      const audioPlayer = document.getElementById('musicPlayer');
      if (audioPlayer) {
        if (data.music.url) {
          console.log('🎵 Music URL found:', data.music.url);
          
          // Set source
          audioPlayer.src = data.music.url;
          
          // ALWAYS show player if there's a URL
          audioPlayer.style.display = 'block';
          
          // Set loop if needed
          audioPlayer.loop = !!(data.music.loop || data.music.isLooping);
          
          // Try to auto-play
          audioPlayer.play().then(() => {
            console.log('✅ Music autoplaying:', data.music.name);
          }).catch(err => {
            console.log('ℹ️ Autoplay blocked - user must click play button');
            console.log('   (This is normal browser behavior for security)');
          });
          
          console.log('🎵 Music player ready:', data.music.name);
        } else {
          // No URL, hide player
          audioPlayer.style.display = 'none';
          console.log('ℹ️ No music URL provided');
        }
      } else {
        console.warn('⚠️ Music player element (#musicPlayer) not found in HTML!');
      }
      
      console.log('🎵 Music updated:', data.music.name);
    }
    
    // ================================
    // DOWNTIME UNLOCK FROM MC
    // Allows players to edit Growth/Shade/Release
    // ================================
    if (data.downtimeUnlocked !== undefined) {
      console.log('🌙 Downtime status received:', data.downtimeUnlocked);
      
      // Update characterData
      if (window.characterData) {
        window.characterData.downtimeUnlocked = data.downtimeUnlocked;
        console.log('🌙 characterData.downtimeUnlocked set to:', data.downtimeUnlocked);
      }
      
      // Show/hide downtime indicator
      const indicator = document.getElementById('downtimeIndicator');
      if (indicator) {
        indicator.style.display = data.downtimeUnlocked ? 'block' : 'none';
      }
      
      // Show notification to player
      if (window.showNotification) {
        if (data.downtimeUnlocked) {
          window.showNotification('🌙 DOWNTIME: You may now update Growth/Shade/Release!');
        } else {
          window.showNotification('🔒 Downtime ended - Growth/Shade/Release locked');
        }
      }
    }
    
    // ================================
    // TAG UPDATES - FIXED STRUCTURE!
    // MC sends: {players: [{name, storyTags, currentStatuses}], spotlightedPlayer: "name"}
    // ================================
    if (data.players && Array.isArray(data.players)) {
      console.log('🏷️ Player tags received from MC:', data.players);
      console.log('🎯 Spotlighted player:', data.spotlightedPlayer);
      
      // Get our character name - try multiple sources
      let ourCharacterName = window.characterData?.name;
      
      // Fallback 1: Check DOM element if window.characterData.name is empty
      if (!ourCharacterName) {
        const nameElement = document.getElementById('characterName');
        if (nameElement) {
          // Could be an input or a text element
          const domName = nameElement.value || nameElement.textContent;
          if (domName && domName !== 'Character Name' && domName.trim() !== '') {
            ourCharacterName = domName.trim();
            console.log('📛 Got character name from DOM:', ourCharacterName);
          }
        }
      }
      
      // Fallback 2: Check localStorage for current character name
      if (!ourCharacterName) {
        const storedName = localStorage.getItem('currentCharacterName');
        if (storedName) {
          ourCharacterName = storedName;
          console.log('📛 Got character name from localStorage:', ourCharacterName);
        }
      }
      
      // Fallback 3: If we're the spotlighted player and only one player in broadcast, use that
      if (!ourCharacterName && data.players.length === 1) {
        ourCharacterName = data.players[0].name;
        console.log('📛 Using only player in broadcast:', ourCharacterName);
      }
      
      // Fallback 4: If spotlighted player matches a player in broadcast, use that
      if (!ourCharacterName && data.spotlightedPlayer) {
        const spotlightedInBroadcast = data.players.find(p => p.name === data.spotlightedPlayer);
        if (spotlightedInBroadcast) {
          ourCharacterName = data.spotlightedPlayer;
          console.log('📛 Using spotlighted player name:', ourCharacterName);
        }
      }
      
      if (!ourCharacterName) {
        console.log('⚠️ Could not determine character name from any source');
        console.log('   window.characterData:', window.characterData);
        console.log('   window.characterData?.name:', window.characterData?.name);
        console.log('   DOM #characterName:', document.getElementById('characterName')?.value);
        console.log('   localStorage currentCharacterName:', localStorage.getItem('currentCharacterName'));
        return;
      }
      
      console.log('✅ Looking for our character:', ourCharacterName);
      
      // Find our player data in the broadcast
      const ourPlayerData = data.players.find(p => p.name === ourCharacterName);
      
      if (ourPlayerData) {
        console.log('✅ Found our character data in broadcast:', ourPlayerData);
        
        // Check if we're spotlighted
        const isSpotlighted = data.spotlightedPlayer === ourCharacterName;
        if (isSpotlighted) {
          console.log('🎭 WE ARE SPOTLIGHTED!');
        }
        
        // Update character data with tags from MC
        if (window.characterData) {
          // Update story tags
          if (ourPlayerData.storyTags) {
            window.characterData.storyTags = [...ourPlayerData.storyTags];
            console.log('📖 Story tags updated:', window.characterData.storyTags);
          }
          
          // Update status tags (already formatted by MC)
          if (ourPlayerData.currentStatuses) {
            window.characterData.currentStatuses = [...ourPlayerData.currentStatuses];
            console.log('📌 Status tags updated:', window.characterData.currentStatuses);
          }
          
          // Dispatch mc-tag-update event FIRST for firebase-broadcast.js to track MC tags
          // This MUST happen before any UI updates that might trigger a broadcast
          const tagTrackingEvent = new CustomEvent('mc-tag-update', {
            detail: {
              statusTags: ourPlayerData.currentStatuses || [],
              storyTags: ourPlayerData.storyTags || []
            }
          });
          document.dispatchEvent(tagTrackingEvent);
          console.log('📡 mc-tag-update event dispatched for tag tracking');
          
          // Dispatch custom event for UI update
          const tagEvent = new CustomEvent('mc-tags-updated', {
            detail: {
              storyTags: ourPlayerData.storyTags || [],
              currentStatuses: ourPlayerData.currentStatuses || [],
              isSpotlighted: isSpotlighted
            }
          });
          document.dispatchEvent(tagEvent);
          console.log('📡 mc-tags-updated event dispatched for UI');
          
          // Call update function if it exists
          if (window.updateCharacterDisplay) {
            window.updateCharacterDisplay();
            console.log('🔄 Character display updated');
          }
          
          // Calculate power with new status tags if function exists
          if (window.calculateTotalPower) {
            window.calculateTotalPower();
            console.log('⚡ Power recalculated with status modifiers');
          }
        }
      } else {
        console.log('ℹ️ Our character not found in MC broadcast (we might not be in the session yet)');
      }
    }
    
    // Legacy tag format support (direct tags object)
    if (data.tags && !data.players) {
      console.log('🏷️ Legacy tag format received:', data.tags);
      
      // Dispatch custom event for tag updates
      const tagEvent = new CustomEvent('mc-tag-update', {
        detail: {
          statusTags: data.tags.status || [],
          storyTags: data.tags.story || []
        }
      });
      document.dispatchEvent(tagEvent);
      
      // Apply tags to character if function exists
      if (window.applyMcTagsToCharacter) {
        console.log('📝 Applying legacy tags to character...');
        window.applyMcTagsToCharacter(data.tags);
      }
    }
    
    // Update sync status badge
    updateSyncBadge(true);
    
  }, (error) => {
    console.error('❌ Error listening to MC broadcasts:', error);
    updateSyncBadge(false);
  });
  
  console.log('✅ MC broadcast listener active');
  console.log('   📥 Listening for: location, music, npc, players (with tags), spotlightedPlayer');
}

// ================================
// SYNC STATUS BADGE
// ================================

function updateSyncBadge(isConnected) {
  const syncBadge = document.getElementById('syncBadge');
  if (!syncBadge) return;
  
  if (isConnected) {
    syncBadge.textContent = '● Live Sync';
    syncBadge.classList.remove('offline');
    syncBadge.classList.add('online');
  } else {
    syncBadge.textContent = '● Offline';
    syncBadge.classList.remove('online');
    syncBadge.classList.add('offline');
  }
}

// ================================
// CLOUD STORAGE FUNCTIONS
// ================================

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
    
    // Update cloud badge
    const cloudBadge = document.getElementById('cloudBadge');
    if (cloudBadge) {
      cloudBadge.textContent = '☁️ Saved';
      cloudBadge.classList.remove('cloud-offline');
      cloudBadge.classList.add('cloud-online');
      
      // Reset after 2 seconds
      setTimeout(() => {
        cloudBadge.textContent = '☁️';
      }, 2000);
    }
    
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

console.log('✅ firebase-config.js loaded - COMPLETE FIX VERSION');
console.log('   📥 Listening: mcBroadcast');
console.log('   📤 Broadcasting: playerCharacters/{userId}, playerRolls/{userId}');
console.log('   ☁️ Cloud storage: users/{userId}/characters');
console.log('   🎵 Music player: ALWAYS shows when URL present');
console.log('   🏷️ Tags: Handles players array with spotlightedPlayer');
console.log('   🎯 Element IDs: sceneInfo, musicInfo, spotlightInfo, musicPlayer');
