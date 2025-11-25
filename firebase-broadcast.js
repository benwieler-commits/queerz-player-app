// ================================
// FIREBASE BROADCAST - PLAYER APP
// ================================

import { database, ref, set } from './firebase-config.js';

let lastBroadcastData = null;
let broadcastCount = 0;

// Track MC-created tags to avoid echo
const mcCreatedStatusTags = new Set();
const mcCreatedStoryTags = new Set();

document.addEventListener('mc-tag-update', e => {
  const { statusTags = [], storyTags = [] } = e.detail || {};
  statusTags.forEach(t => mcCreatedStatusTags.add(t));
  storyTags.forEach(t => mcCreatedStoryTags.add(t));
});

// ================================
// MAIN BROADCAST FUNCTION
// ================================

export async function broadcastPlayerToMc(characterData) {
  if (!database || !window.currentUserId || !characterData) {
    console.warn('Cannot broadcast – missing db/auth/data');
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

      // Filter out MC-created tags
      currentStatuses: filterPlayerCreatedTags(characterData.currentStatuses || [], mcCreatedStatusTags),
      storyTags: filterPlayerCreatedTags(characterData.storyTags || [], mcCreatedStoryTags),

      lastBroadcast: Date.now(),
      sessionId: window.currentUserId,
      characterLocked: !!characterData.characterLocked
    };

    await set(playerRef, broadcastData);
    broadcastCount++;
    lastBroadcastData = broadcastData;

    console.log(`Broadcast #${broadcastCount} – ${broadcastData.name}`);
    return true;
  } catch (err) {
    console.error('Broadcast failed:', err);
    return false;
  }
}

// ================================
// DICE ROLL BROADCAST
// ================================

export async function broadcastDiceRoll(rollData) {
  if (!database || !window.currentUserId || !rollData) return false;

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
    console.log('Dice roll broadcast:', payload);
    return true;
  } catch (err) {
    console.error('Dice roll broadcast failed:', err);
    return false;
  }
}

// ================================
// UTILITIES
// ================================

function filterPlayerCreatedTags(tags, mcSet) {
  if (!Array.isArray(tags)) return [];
  return tags.filter(t => !mcSet.has(t));
}

export function getLastBroadcast() { return lastBroadcastData; }
export function getBroadcastCount() { return broadcastCount; }

// Global fall-backs (for code that still uses window.)
window.broadcastPlayerToMc = broadcastPlayerToMc;
window.broadcastDiceRoll = broadcastDiceRoll;

console.log('firebase-broadcast.js loaded – clean & deduplicated');
