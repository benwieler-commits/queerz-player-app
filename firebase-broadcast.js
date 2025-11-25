// ================================
// FIREBASE BROADCAST - PLAYER APP
// Broadcasts player character data to MC
// ================================

import { database, auth, currentUserId, ref, set } from './firebase-config.js';

let lastBroadcastData = null;
let broadcastCount = 0;
 
// Track which tags came from MC (to prevent broadcasting them back)
let mcCreatedStatusTags = new Set();
let mcCreatedStoryTags = new Set();

// Listen for MC tag updates to track MC-created tags
document.addEventListener('mc-tag-update', (event) => {
  const { statusTags, storyTags } = event.detail;

  // Track all MC-created tags
  if (statusTags && Array.isArray(statusTags)) {
    statusTags.forEach(tag => mcCreatedStatusTags.add(tag));
  }
  if (storyTags && Array.isArray(storyTags)) {
    storyTags.forEach(tag => mcCreatedStoryTags.add(tag));
  }

  console.log('📝 Tracking MC tags:', {
    statusCount: mcCreatedStatusTags.size,
    storyCount: mcCreatedStoryTags.size
  });
});
// ================================
// BROADCAST PLAYER DATA TO MC
// ================================

/**
 * Broadcast player character data to Firebase for MC to receive
 * @param {Object} characterData - Complete character data object
 * @returns {Promise<boolean>} Success status
 */
export async function broadcastPlayerToMc(characterData) {
  // Validation
  if (!database) {
    console.error('❌ Firebase database not initialized');
    return false;
  }

  if (!window.currentUserId) {
    console.warn('⚠️ Cannot broadcast: Not authenticated yet');
    return false;
  }

  if (!characterData) {
    console.warn('⚠️ Cannot broadcast: No character data provided');
    return false;
  }

  try {
    // Broadcast to playerCharacters/{userId} - where MC is listening
    const playerRef = ref(database, `playerCharacters/${window.currentUserId}`);

    // Prepare broadcast data
    const broadcastData = {
      // Core character info
      name: characterData.name || 'Unnamed Character',
      pronouns: characterData.pronouns || '',

      // Creator Guide: House affiliation
      houseAffiliation: characterData.houseAffiliation || 'Unknown House',
      houseBasicAttack: characterData.houseBasicAttack || 'Basic Attack',
      signatureThemeIndex: characterData.signatureThemeIndex ?? 0,

      // Portrait
      portraitUrl: characterData.currentPortraitMode === 'civilian'
        ? (characterData.civilianPortrait || '')
        : (characterData.qfactorPortrait || ''),
      currentPortraitMode: characterData.currentPortraitMode || 'civilian',

      // Theme color
      themeColor: characterData.themeColor || '#4A7C7E',

      // Game state
      juice: characterData.juice || 0,
      clues: characterData.clues || 0,

      // Last dice roll (for MC to see player's roll results)
      lastRoll: characterData.lastRoll || null,

      // Dice roll result (NEW - for MC to display)
      lastRollResult: characterData.lastRollResult || null,
      selectedMove: characterData.selectedMove || null,

      // Themes (simplified for MC display)
      themes: (characterData.themes || []).map(theme => ({
        name: theme.name || 'Unnamed Theme',
        type: theme.type || 'rainbow',
        locked: theme.locked || false,
        growth: theme.growth || 0,
        shade: theme.shade || 0,
        release: theme.release || 0
      })),

            // Tags - ONLY broadcast player-created tags (filter out MC-created to prevent duplicates)
      currentStatuses: filterPlayerCreatedTags(characterData.currentStatuses || [], mcCreatedStatusTags),
      storyTags: filterPlayerCreatedTags(characterData.storyTags || [], mcCreatedStoryTags),

      // Metadata
      lastBroadcast: Date.now(),
      sessionId: window.currentUserId,
      characterLocked: characterData.characterLocked || false
    };

    // Broadcast to Firebase
    await set(playerRef, broadcastData);

    broadcastCount++;
    lastBroadcastData = broadcastData;

    console.log(`📤 Broadcasting to MC (${broadcastCount}):`, {
      name: broadcastData.name,
      pronouns: broadcastData.pronouns,
      juice: broadcastData.juice,
      themes: broadcastData.themes.length
    });

    return true;

  } catch (error) {
    console.error('❌ Broadcast to MC failed:', error.code || error.message);
    return false;
  }
}

// ================================
// BROADCAST DICE ROLL TO MC
// ================================

/**
 * Broadcast ONLY dice roll results to MC (separate from character data)
 * @param {Object} rollData - Dice roll information
 * @returns {Promise<boolean>} Success status
 */
export async function broadcastDiceRoll(rollData) {
  if (!database || !window.currentUserId) {
    console.warn('⚠️ Cannot broadcast roll: Not authenticated');
    return false;
  }

  if (!rollData) {
    console.warn('⚠️ Cannot broadcast roll: No roll data provided');
    return false;
  }

   try {
    // Broadcast to playerRolls/{userId} - where MC is listening
    const rollRef = ref(database, `playerRolls/${window.currentUserId}`);

    const rollBroadcast = {
      characterName: rollData.characterName || 'Unknown',
      roll: rollData.roll || 0,
      result: rollData.result || null,
      move: rollData.move || null,
      modifier: rollData.modifier || 0,
      timestamp: Date.now(),
      sessionId: window.currentUserId
    };

    await set(rollRef, rollBroadcast);

    console.log('🎲 Broadcasting dice roll to MC:', {
      character: rollBroadcast.characterName,
      roll: rollBroadcast.roll,
      result: rollBroadcast.result
    });

    return true;

  } catch (error) {
    console.error('❌ Dice roll broadcast failed:', error.code || error.message);
    return false;
  }
}
 
// ================================
// UTILITIES
// ================================

/**
 * Filter out MC-created tags to only broadcast player-created tags
 * @param {Array} tags - All tags
 * @param {Set} mcTags - Set of MC-created tags
 * @returns {Array} Only player-created tags
 */

function filterPlayerCreatedTags(tags, mcTags) {
  if (!Array.isArray(tags)) return [];

  // Filter out any tags that were created by MC
  const playerTags = tags.filter(tag => !mcTags.has(tag));

  if (playerTags.length !== tags.length) {
    console.log('🔍 Filtered MC tags:', {
      total: tags.length,
      playerCreated: playerTags.length,
      filtered: tags.length - playerTags.length
    });
  }

  return playerTags;
}
/**
 * Get last broadcast data for debugging
 */
export function getLastBroadcast() {
  return lastBroadcastData;
}

/**
 * Get broadcast count for debugging
 */
export function getBroadcastCount() {
  return broadcastCount;
}

// ================================
// EXPORTS
// ================================

window.broadcastPlayerToMc = broadcastPlayerToMc;
window.broadcastDiceRoll = broadcastDiceRoll;

export { broadcastPlayerToMc };

console.log('✅ firebase-broadcast.js (Player) loaded');
console.log('   📤 Character data → playerCharacters/{userId}');
console.log('   🎲 Dice rolls → playerRolls/{userId}');
console.log('   🚫 MC-created tags filtered to prevent duplicates');
