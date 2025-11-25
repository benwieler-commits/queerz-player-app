// ================================
// FIREBASE BROADCAST - PLAYER APP
// COMPLETE REWRITE - Dice Roll Broadcasting
// ================================

import { database, ref, set } from './firebase-config.js';

let lastBroadcastData = null;
let broadcastCount = 0;

// Track MC-created tags to avoid echo and duplication
const mcCreatedStatusTags = new Set();
const mcCreatedStoryTags = new Set();

// Listen for MC tag updates and track them
document.addEventListener('mc-tag-update', e => {
  const { statusTags = [], storyTags = [] } = e.detail || {};
  
  console.log('🏷️ MC tags received via event:', { statusTags, storyTags });
  
  // Track all MC-created tags
  statusTags.forEach(tag => {
    if (tag) {
      // Handle both string and object formats
      const tagKey = typeof tag === 'string' ? tag : (tag.rawString || tag.name);
      if (tagKey) mcCreatedStatusTags.add(tagKey);
    }
  });
  
  storyTags.forEach(tag => {
    if (tag) {
      const tagKey = typeof tag === 'string' ? tag : (tag.rawString || tag.name);
      if (tagKey) mcCreatedStoryTags.add(tagKey);
    }
  });
});

// ================================
// MAIN BROADCAST FUNCTION
// Sends character data to MC
// ================================

export async function broadcastPlayerToMc(characterData) {
  if (!database || !window.currentUserId || !characterData) {
    console.warn('⚠️ Cannot broadcast – missing db/auth/data');
    return false;
  }

  try {
    const playerRef = ref(database, `playerCharacters/${window.currentUserId}`);

    const broadcastData = {
      // Basic character info
      name: characterData.name || 'Unnamed Character',
      pronouns: characterData.pronouns || '',
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

      // Trackers
      juice: characterData.juice || 0,
      clues: characterData.clues || 0,
      
      // Last roll result (for MC to see)
      lastRoll: characterData.lastRoll || null,
      lastRollResult: characterData.lastRollResult || null,
      selectedMove: characterData.selectedMove || null,

      // Themes (simplified for MC display)
      themes: (characterData.themes || []).map(t => ({
        name: t.name || 'Unnamed Theme',
        type: t.type || 'rainbow',
        locked: !!t.locked,
        growth: t.growth || 0,
        shade: t.shade || 0,
        release: t.release || 0
      })),

      // Tags - filter out MC-created to prevent echo
      currentStatuses: filterPlayerCreatedTags(characterData.currentStatuses || [], mcCreatedStatusTags),
      storyTags: filterPlayerCreatedTags(characterData.storyTags || [], mcCreatedStoryTags),
      
      // Also send ALL tags for display purposes (including MC-created)
      allStatusTags: (characterData.currentStatuses || []).map(formatTagForBroadcast),
      allStoryTags: (characterData.storyTags || []).map(formatTagForBroadcast),

      // Metadata
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
// Sends dice roll results to MC
// ================================

/**
 * Broadcast a dice roll result to the MC
 * The MC App will display move prompts based on the result:
 * - 6 or less: HARD MOVE prompt
 * - 7-9: SOFT MOVE prompt
 * - 10+: SUCCESS prompt
 * 
 * @param {Object} rollData - The roll data object
 * @param {string} rollData.characterName - Name of the character
 * @param {number} rollData.roll - Total roll result (dice + modifiers)
 * @param {string} rollData.result - Result type: 'miss', 'partial', 'success'
 * @param {string} rollData.move - The move ID (e.g., 'slay', 'strike-a-pose')
 * @param {string} rollData.moveName - Display name of the move
 * @param {number} rollData.modifier - Total modifier applied
 * @param {number[]} rollData.dice - Array of individual die results [die1, die2]
 * @param {number} rollData.power - Power value used
 */
export async function broadcastDiceRoll(rollData) {
  if (!database || !window.currentUserId || !rollData) {
    console.warn('⚠️ Cannot broadcast roll – missing data');
    return false;
  }

  try {
    const rollRef = ref(database, `playerRolls/${window.currentUserId}`);
    
    // Determine result type if not provided
    let resultType = rollData.result || rollData.resultType;
    const total = rollData.roll || rollData.total || 0;
    
    if (!resultType) {
      if (total <= 6) {
        resultType = 'miss';
      } else if (total <= 9) {
        resultType = 'partial';
      } else {
        resultType = 'success';
      }
    }
    
    const payload = {
      // Character info
      characterName: rollData.characterName || window.characterData?.name || 'Unknown',
      
      // Roll details
      roll: total,
      total: total, // Include both for compatibility
      dice: rollData.dice || [0, 0],
      power: rollData.power || 0,
      modifier: rollData.modifier || 0,
      
      // Result
      result: resultType,
      resultType: resultType, // Include both for compatibility
      resultText: rollData.resultText || getResultText(resultType),
      
      // Move info
      move: rollData.move || rollData.moveId || null,
      moveName: rollData.moveName || getMoveDisplayName(rollData.move) || 'Unknown Move',
      
      // Special flags
      burntTagUsed: rollData.burntTagUsed || false,
      guaranteedHit: rollData.guaranteedHit || false,
      
      // Metadata
      timestamp: Date.now(),
      sessionId: window.currentUserId
    };

    await set(rollRef, payload);
    console.log('🎲 Dice roll broadcast:', payload);
    console.log(`   Result: ${resultType.toUpperCase()} (${total})`);
    
    return true;
  } catch (err) {
    console.error('❌ Dice roll broadcast failed:', err);
    return false;
  }
}

/**
 * Get the result text for a given result type
 */
function getResultText(resultType) {
  switch (resultType?.toLowerCase()) {
    case 'miss':
    case 'failure':
      return '❌ MISS!';
    case 'partial':
    case 'partial success':
      return '⚡ PARTIAL SUCCESS!';
    case 'success':
    case 'hit':
    case 'full':
      return '✅ SUCCESS!';
    default:
      return 'Roll Complete';
  }
}

/**
 * Get the display name for a move ID
 */
function getMoveDisplayName(moveId) {
  const moveNames = {
    'strike-a-pose': 'Strike a Pose',
    'slay': 'Slay',
    'get-a-clue': 'Get a Clue',
    'talk-it-out': 'Talk It Out',
    'care': 'Care',
    'resist': 'Resist',
    'be-vulnerable': 'Be Vulnerable'
  };
  return moveNames[moveId] || moveId;
}

// ================================
// UTILITIES
// ================================

/**
 * Format a tag for broadcast (handles both string and object formats)
 */
function formatTagForBroadcast(tag) {
  if (!tag) return null;
  if (typeof tag === 'string') return tag;
  
  // If it's an object, try to get the raw string or name
  return tag.rawString || tag.name || null;
}

/**
 * Filter out MC-created tags from player's tag list
 * This prevents echo/duplication when broadcasting back to MC
 */
function filterPlayerCreatedTags(tags, mcSet) {
  if (!Array.isArray(tags)) return [];
  
  return tags.filter(tag => {
    if (!tag) return false;
    
    // Get the tag key for comparison
    const tagKey = typeof tag === 'string' ? tag : (tag.rawString || tag.name);
    
    // Filter out MC-created tags
    if (mcSet.has(tagKey)) return false;
    
    // Also filter out if it's marked as MC-created
    if (typeof tag === 'object' && tag.mcCreated) return false;
    
    return true;
  }).map(formatTagForBroadcast).filter(t => t);
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

/**
 * Get last broadcast data
 */
export function getLastBroadcast() { 
  return lastBroadcastData; 
}

/**
 * Get total broadcast count
 */
export function getBroadcastCount() { 
  return broadcastCount; 
}

// ================================
// GLOBAL FALLBACKS
// For code that still uses window.
// ================================

window.broadcastPlayerToMc = broadcastPlayerToMc;
window.broadcastDiceRoll = broadcastDiceRoll;
window.getMcCreatedTags = getMcCreatedTags;
window.clearMcTagTracking = clearMcTagTracking;

console.log('✅ player-firebase-broadcast.js loaded (COMPLETE REWRITE)');
console.log('   📤 Broadcasts TO: playerCharacters/{userId}, playerRolls/{userId}');
console.log('   📥 Receives: mc-tag-update events');
console.log('   🏷️ Tag filtering active (prevents echo)');
console.log('   🎲 Dice roll broadcasting with move info');
console.log('   📊 Roll results: miss (6-), partial (7-9), success (10+)');
