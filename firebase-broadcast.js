// ================================
// FIREBASE BROADCAST - PLAYER APP
// Broadcasts player character data to MC
// ================================

import { database, auth, currentUserId, ref, set } from './firebase-config.js';

let lastBroadcastData = null;
let broadcastCount = 0;

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

      // Portrait
      portraitUrl: characterData.currentPortraitMode === 'civilian'
        ? (characterData.civilianPortrait || '')
        : (characterData.qfactorPortrait || ''),
      currentPortraitMode: characterData.currentPortraitMode || 'civilian',

      // Theme color
      themeColor: characterData.themeColor || '#4A7C7E',

      // Game state
      juice: characterData.juice || 0,

      // Themes (simplified for MC display)
      themes: (characterData.themes || []).map(theme => ({
        name: theme.name || 'Unnamed Theme',
        type: theme.type || 'rainbow',
        locked: theme.locked || false,
        growth: theme.growth || 0,
        shade: theme.shade || 0,
        release: theme.release || 0
      })),

      // Tags managed by MC
      currentStatuses: characterData.currentStatuses || [],
      storyTags: characterData.storyTags || [],

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
// UTILITIES
// ================================

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

console.log('✅ firebase-broadcast.js (Player) loaded - Broadcasting to playerCharacters/{userId}');
