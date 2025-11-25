// ================================
// FIREBASE BROADCAST - PLAYER APP
// ================================

import { database, ref, set } from './firebase-config.js';

let lastBroadcastData = null;
let broadcastCount = 0;

// Track MC-created tags to avoid echo and duplication
const mcCreatedStatusTags = new Set();
const mcCreatedStoryTags = new Set();

// Listen for MC tag updates from firebase-config.js
document.addEventListener('mc-tag-update', e => {
  const { statusTags = [], storyTags = [] } = e.detail || {};
  
  console.log('🏷️ MC tags received via event:', { statusTags, storyTags });
  
  // Track all MC-created tags
  statusTags.forEach(tag => {
    if (tag && typeof tag === 'string') {
      mcCreatedStatusTags.add(tag);
    }
  });
  
  storyTags.forEach(tag => {
    if (tag && typeof tag === 'string') {
      mcCreatedStoryTags.add(tag);
    }
  });
});

// ================================
// APPLY MC TAGS TO CHARACTER
// ================================

/**
 * Apply tags received from MC to the current character
 * This function should be called by player-app.js when it receives MC tags
 */
window.applyMcTagsToCharacter = function(tags) {
  if (!tags) return;
  
  console.log('🏷️ Applying MC tags to character:', tags);
  
  // Get current character from localStorage
  const currentCharName = localStorage.getItem('currentCharacterName');
  if (!currentCharName) {
    console.warn('⚠️ No character loaded - cannot apply tags');
    return;
  }
  
  const charData = localStorage.getItem(`character_${currentCharName}`);
  if (!charData) {
    console.warn('⚠️ Character data not found');
    return;
  }
  
  let character;
  try {
    character = JSON.parse(charData);
  } catch (err) {
    console.error('❌ Failed to parse character data:', err);
    return;
  }
  
  // Apply status tags with modifiers
  if (tags.status && Array.isArray(tags.status)) {
    tags.status.forEach(tagData => {
      const tagText = typeof tagData === 'string' ? tagData : tagData.text;
      const modifier = typeof tagData === 'object' ? (tagData.modifier || 0) : 0;
      
      if (tagText) {
        // Add to character's current statuses if not already present
        if (!character.currentStatuses) {
          character.currentStatuses = [];
        }
        
        if (!character.currentStatuses.includes(tagText)) {
          character.currentStatuses.push(tagText);
          mcCreatedStatusTags.add(tagText);
          console.log(`✅ Applied status tag: ${tagText} (modifier: ${modifier})`);
        }
      }
    });
  }
  
  // Apply story tags
  if (tags.story && Array.isArray(tags.story)) {
    tags.story.forEach(tagText => {
      if (tagText && typeof tagText === 'string') {
        // Add to character's story tags if not already present
        if (!character.storyTags) {
          character.storyTags = [];
        }
        
        if (!character.storyTags.includes(tagText)) {
          character.storyTags.push(tagText);
          mcCreatedStoryTags.add(tagText);
          console.log(`✅ Applied story tag: ${tagText}`);
        }
      }
    });
  }
  
  // Save updated character
  try {
    localStorage.setItem(`character_${currentCharName}`, JSON.stringify(character));
    console.log('✅ Character saved with MC tags');
    
    // Trigger UI update if function exists
    if (window.updateCharacterDisplay) {
      window.updateCharacterDisplay();
    }
    
    // Broadcast updated character back to MC
    broadcastPlayerToMc(character);
    
  } catch (err) {
    console.error('❌ Failed to save character with tags:', err);
  }
};

// ================================
// MAIN BROADCAST FUNCTION
// ================================

export async function broadcastPlayerToMc(characterData) {
  if (!database || !window.currentUserId || !characterData) {
    console.warn('⚠️ Cannot broadcast – missing db/auth/data');
    return false;
  }

  try {
    const playerRef = ref(database, `playerCharacters/${window.currentUserId}`);

    const broadcastData = {
      name: characterData.name || 'Unnamed Character',
      pronouns: characterData.pronouns || '',
      houseAffiliation: characterData.houseAffiliation || 'Unknown House',
      houseBasicAttack: characterData.houseBasicAttack || 'Basic Attack',
      signatureThemeIndex: characterData.signatureThemeIndex ?? 0,

      portraitUrl: characterData.currentPortraitMode === 'civilian'
        ? (characterData.civilianPortrait || '')
        : (characterData.qfactorPortrait || ''),
      currentPortraitMode: characterData.currentPortraitMode || 'civilian',

      themeColor: characterData.themeColor || '#4A7C7E',

      juice: characterData.juice || 0,
      clues: characterData.clues || 0,
      lastRoll: characterData.lastRoll || null,
      lastRollResult: characterData.lastRollResult || null,
      selectedMove: characterData.selectedMove || null,

      themes: (characterData.themes || []).map(t => ({
        name: t.name || 'Unnamed Theme',
        type: t.type || 'rainbow',
        locked: !!t.locked,
        growth: t.growth || 0,
        shade: t.shade || 0,
        release: t.release || 0
      })),

      // Filter out MC-created tags to prevent echo
      currentStatuses: filterPlayerCreatedTags(characterData.currentStatuses || [], mcCreatedStatusTags),
      storyTags: filterPlayerCreatedTags(characterData.storyTags || [], mcCreatedStoryTags),
      
      // Also send ALL tags (including MC-created) for display purposes
      allStatusTags: characterData.currentStatuses || [],
      allStoryTags: characterData.storyTags || [],

      lastBroadcast: Date.now(),
      sessionId: window.currentUserId,
      characterLocked: !!characterData.characterLocked
    };

    await set(playerRef, broadcastData);
    broadcastCount++;
    lastBroadcastData = broadcastData;

    console.log(`📡 Broadcast #${broadcastCount} – ${broadcastData.name}`);
    return true;
  } catch (err) {
    console.error('❌ Broadcast failed:', err);
    return false;
  }
}

// ================================
// DICE ROLL BROADCAST
// ================================

export async function broadcastDiceRoll(rollData) {
  if (!database || !window.currentUserId || !rollData) {
    console.warn('⚠️ Cannot broadcast roll – missing data');
    return false;
  }

  try {
    const rollRef = ref(database, `playerRolls/${window.currentUserId}`);
    const payload = {
      characterName: rollData.characterName || 'Unknown',
      roll: rollData.roll || 0,
      result: rollData.result || null,
      move: rollData.move || null,
      modifier: rollData.modifier || 0,
      timestamp: Date.now(),
      sessionId: window.currentUserId
    };

    await set(rollRef, payload);
    console.log('🎲 Dice roll broadcast:', payload);
    return true;
  } catch (err) {
    console.error('❌ Dice roll broadcast failed:', err);
    return false;
  }
}

// ================================
// UTILITIES
// ================================

/**
 * Filter out MC-created tags from player's tag list
 * This prevents echo/duplication when broadcasting back to MC
 */
function filterPlayerCreatedTags(tags, mcSet) {
  if (!Array.isArray(tags)) return [];
  return tags.filter(t => !mcSet.has(t));
}

/**
 * Get list of MC-created tags for reference
 */
export function getMcCreatedTags() {
  return {
    statusTags: Array.from(mcCreatedStatusTags),
    storyTags: Array.from(mcCreatedStoryTags)
  };
}

/**
 * Clear MC tag tracking (useful for new sessions)
 */
export function clearMcTagTracking() {
  mcCreatedStatusTags.clear();
  mcCreatedStoryTags.clear();
  console.log('✅ MC tag tracking cleared');
}

export function getLastBroadcast() { return lastBroadcastData; }
export function getBroadcastCount() { return broadcastCount; }

// Global fall-backs (for code that still uses window.)
window.broadcastPlayerToMc = broadcastPlayerToMc;
window.broadcastDiceRoll = broadcastDiceRoll;
window.getMcCreatedTags = getMcCreatedTags;
window.clearMcTagTracking = clearMcTagTracking;

console.log('✅ player-firebase-broadcast.js loaded');
console.log('   📤 Broadcasts TO: playerCharacters/{userId}, playerRolls/{userId}');
console.log('   📥 Receives: mc-tag-update events');
console.log('   🏷️ Tag filtering active (prevents echo)');
