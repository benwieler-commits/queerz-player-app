// ================================
// FIREBASE CONFIG - PLAYER APP  
// COMPLETE REWRITE - Proper Tag Parsing
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
// TAG PARSING UTILITIES
// ================================

/**
 * Parse a STATUS tag from MC format
 * INPUT: "example-tag-1" through "example-tag-6"
 * OUTPUT: { name: "Example Tag", tier: 1, modifier: -1, isOngoing: true }
 * 
 * Status tags are ALWAYS:
 * - Ongoing (until removed by MC)
 * - Negative modifier (penalty to Power)
 * - Tier 1-6
 * 
 * @param {string} tagString - Raw tag string from MC
 * @returns {Object} Parsed status object
 */
function parseStatusTagFromMC(tagString) {
  if (!tagString || typeof tagString !== 'string') {
    return null;
  }
  
  console.log('🔍 Parsing STATUS tag:', tagString);
  
  // Match format: "anything-here-1" through "anything-here-6"
  const match = tagString.match(/^(.+)-([1-6])$/);
  
  if (match) {
    const [, namePart, tierStr] = match;
    const tier = parseInt(tierStr);
    
    // Convert kebab-case to Title Case for display
    const displayName = namePart
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const parsed = {
      name: displayName,
      tier: tier,
      modifier: -tier,           // Status tags are always NEGATIVE
      isTemporary: false,        // Status tags from MC are ALWAYS Ongoing
      isOngoing: true,           // Status tags from MC are ALWAYS Ongoing
      mcCreated: true,           // Flag to identify MC-created tags
      rawString: tagString       // Keep original for reference
    };
    
    console.log('✅ Parsed STATUS tag:', parsed);
    return parsed;
  }
  
  // Fallback: treat as tier 2 if no valid suffix
  console.warn('⚠️ Invalid status tag format, using default tier 2:', tagString);
  return {
    name: tagString.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    tier: 2,
    modifier: -2,
    isTemporary: false,
    isOngoing: true,
    mcCreated: true,
    rawString: tagString
  };
}

/**
 * Parse a STORY tag from MC format
 * INPUT: "example-story-tag" (no numerical suffix)
 * OUTPUT: { name: "Example Story Tag", modifier: 0, isOngoing: true }
 * 
 * Story tags are ALWAYS:
 * - Ongoing (until removed by MC)
 * - NO modifier (they are clue reminders, not power bonuses)
 * 
 * @param {string} tagString - Raw tag string from MC
 * @returns {Object} Parsed story tag object
 */
function parseStoryTagFromMC(tagString) {
  if (!tagString || typeof tagString !== 'string') {
    return null;
  }
  
  console.log('🔍 Parsing STORY tag:', tagString);
  
  // Convert kebab-case to Title Case for display
  const displayName = tagString
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  const parsed = {
    name: displayName,
    modifier: 0,               // Story tags have NO modifier
    isTemporary: false,        // Story tags from MC are ALWAYS Ongoing
    isOngoing: true,           // Story tags from MC are ALWAYS Ongoing
    mcCreated: true,           // Flag to identify MC-created tags
    rawString: tagString       // Keep original for reference
  };
  
  console.log('✅ Parsed STORY tag:', parsed);
  return parsed;
}

// Make parsing functions globally available
window.parseStatusTagFromMC = parseStatusTagFromMC;
window.parseStoryTagFromMC = parseStoryTagFromMC;

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
    // Only process if NOT a tags-only update
    // ================================
    const locationData = data.location || data.environment;
    if (locationData && !data.tagsOnly) {
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

      // STOP MUSIC on location change ONLY if no new music provided
      // This is the ONLY way music stops - location change without new music
      const audioPlayer = document.getElementById('musicPlayer');
      if (audioPlayer && !data.music) {
        audioPlayer.pause();
        audioPlayer.src = '';
        const musicInfo = document.getElementById('musicInfo');
        if (musicInfo) musicInfo.textContent = 'No music playing';
        console.log('🎵 Music stopped due to location change (no new music provided)');
      }
      
      console.log('📍 Location updated:', locationData.name);
    }
    
    // ================================
    // NPC/SPOTLIGHT UPDATE
    // Only process if NOT a tags-only update
    // ================================
    if (data.npc && !data.tagsOnly) {
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
    // MUSIC UPDATE
    // Only process if NOT a tags-only update
    // Tags/NPC updates should NEVER interrupt music
    // ================================
    if (data.music && !data.tagsOnly) {
      const musicInfo = document.getElementById('musicInfo');
      if (musicInfo) {
        musicInfo.textContent = data.music.name || 'Unknown Track';
      }
      
      // Update audio player
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
    // TAG UPDATES - PROPER PARSING
    // MC sends: {players: [{name, storyTags, currentStatuses}], spotlightedPlayer: "name"}
    // 
    // STATUS TAGS: "example-tag-1" through "example-tag-6"
    //   - Always Ongoing until MC removes
    //   - Negative modifier (penalty to Power)
    //   
    // STORY TAGS: "example-tag" (no numerical suffix)
    //   - Always Ongoing until MC removes
    //   - NO modifier (clue reminders)
    // ================================
    if (data.players && Array.isArray(data.players)) {
      console.log('🏷️ Player tags received from MC:', data.players);
      console.log('🎯 Spotlighted player:', data.spotlightedPlayer);
      
      // Get our character name from localStorage
      const ourCharacterName = localStorage.getItem('currentCharacterName') || window.characterData?.name;
      
      if (!ourCharacterName) {
        console.log('ℹ️ No character loaded yet, skipping tag update');
        return;
      }
      
      // Find our player data in the broadcast
      // Check for exact match OR "ALL_PLAYERS" broadcast
      const ourPlayerData = data.players.find(p => 
        p.name === ourCharacterName || 
        p.name === "ALL_PLAYERS"
      );
      
      if (ourPlayerData) {
        console.log('✅ Found applicable tag data:', ourPlayerData);
        
        // Check if we're spotlighted
        const isSpotlighted = data.spotlightedPlayer === ourCharacterName;
        if (isSpotlighted) {
          console.log('🎭 WE ARE SPOTLIGHTED!');
        }
        
        // Parse and apply status tags
        const parsedStatuses = [];
        if (ourPlayerData.currentStatuses && Array.isArray(ourPlayerData.currentStatuses)) {
          ourPlayerData.currentStatuses.forEach(tagString => {
            const parsed = parseStatusTagFromMC(tagString);
            if (parsed) {
              parsedStatuses.push(parsed);
            }
          });
          console.log('📌 Parsed STATUS tags:', parsedStatuses);
        }
        
        // Parse and apply story tags
        const parsedStoryTags = [];
        if (ourPlayerData.storyTags && Array.isArray(ourPlayerData.storyTags)) {
          ourPlayerData.storyTags.forEach(tagString => {
            const parsed = parseStoryTagFromMC(tagString);
            if (parsed) {
              parsedStoryTags.push(parsed);
            }
          });
          console.log('📖 Parsed STORY tags:', parsedStoryTags);
        }
        
        // Dispatch custom event for UI update in player-app.js
        const tagEvent = new CustomEvent('mc-tag-update', {
          detail: {
            statusTags: parsedStatuses,
            storyTags: parsedStoryTags,
            isSpotlighted: isSpotlighted,
            rawStatuses: ourPlayerData.currentStatuses || [],
            rawStoryTags: ourPlayerData.storyTags || []
          }
        });
        document.dispatchEvent(tagEvent);
        console.log('📡 Tag update event dispatched');
        
        // Also dispatch the mc-tags-updated event for backward compatibility
        const compatEvent = new CustomEvent('mc-tags-updated', {
          detail: {
            storyTags: parsedStoryTags,
            currentStatuses: parsedStatuses,
            isSpotlighted: isSpotlighted
          }
        });
        document.dispatchEvent(compatEvent);
        
        // Call update function if it exists
        if (window.updateCharacterDisplay) {
          window.updateCharacterDisplay();
          console.log('🔄 Character display updated');
        }
        
        // Recalculate power with new status modifiers
        if (window.calculateTotalPower) {
          window.calculateTotalPower();
          console.log('⚡ Power recalculated with status modifiers');
        }
        
        // Show notification
        const totalTags = parsedStatuses.length + parsedStoryTags.length;
        if (totalTags > 0) {
          // Try to use app's notification function
          if (window.showNotification) {
            window.showNotification(`📥 Received ${totalTags} tag(s) from MC`);
          }
        }
        
      } else {
        console.log('ℹ️ No tags for our character in this broadcast');
      }
    }
    
    // ================================
    // LEGACY TAG FORMAT SUPPORT
    // For backward compatibility with old format
    // ================================
    if (data.tags && !data.players) {
      console.log('🏷️ Legacy tag format received:', data.tags);
      
      // Parse status tags
      const parsedStatuses = (data.tags.status || []).map(tag => {
        if (typeof tag === 'string') {
          return parseStatusTagFromMC(tag);
        }
        return tag;
      }).filter(t => t);
      
      // Parse story tags
      const parsedStoryTags = (data.tags.story || []).map(tag => {
        if (typeof tag === 'string') {
          return parseStoryTagFromMC(tag);
        }
        return tag;
      }).filter(t => t);
      
      // Dispatch custom event for tag updates
      const tagEvent = new CustomEvent('mc-tag-update', {
        detail: {
          statusTags: parsedStatuses,
          storyTags: parsedStoryTags
        }
      });
      document.dispatchEvent(tagEvent);
    }
    
    // Update sync status badge
    updateSyncBadge(true);
    
  }, (error) => {
    console.error('❌ Error listening to MC broadcasts:', error);
    updateSyncBadge(false);
  });
  
  console.log('✅ MC broadcast listener active');
  console.log('   📥 Listening for: location, music, npc, players (with tags)');
  console.log('   🏷️ STATUS TAGS: "example-tag-1" through "example-tag-6" (negative, ongoing)');
  console.log('   📖 STORY TAGS: "example-tag" (no modifier, ongoing)');
  console.log('   🎵 Music only stops on LOCATION change without new music');
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

console.log('✅ firebase-config.js loaded (COMPLETE REWRITE)');
console.log('   📥 Listening: mcBroadcast');
console.log('   📤 Broadcasting: playerCharacters/{userId}, playerRolls/{userId}');
console.log('   ☁️ Cloud storage: users/{userId}/characters');
console.log('   🎵 Music: ONLY stops on location change without new music');
console.log('   🏷️ STATUS TAGS: "example-tag-1" to "example-tag-6" (negative, ongoing)');
console.log('   📖 STORY TAGS: "example-tag" (no modifier, ongoing, clue reminders)');
