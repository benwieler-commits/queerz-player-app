// ===================================
// QUEERZ! PLAYER COMPANION APP
// Updated 2025-11-11 v7 (Bidirectional: Broadcast on Changes)
// ===================================

import {
  database as db,
  ref,
  set,
  get,
  onValue,
  forceSignInAnonymously as initializeAuth,
  saveCharacterToCloud,
  loadCharactersFromCloud,
  loadLastCharacterFromCloud,
  saveLastCharacterToCloud,
  toggleCloudSync,
  broadcastCharacterToMc
} from "./firebase-config.js";

console.log("✅ Player App Loaded");

// ================================
// GLOBAL STATE
// ================================
const characterLibrary = {};
let activeCharacter = null;
let cloudCharacters = {};
let isGlobalLoading = false;
const loadingChars = new Set();
let currentPortraitMode = 'streetwear';

// ================================
// GITHUB LOADING (unchanged)
// ================================
async function load
