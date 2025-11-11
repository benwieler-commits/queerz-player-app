// ===================================
// QUEERZ! PLAYER COMPANION APP
// Updated 2025-11-11 v6 (FLEXIBLE-v2 Render + Fixed Upload/Select)
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
// GITHUB LOADING
// ================================
async function loadCharacterFromGitHub(characterName) {
  const url = `https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main/characters/${characterName}-character.json`;
  console.log("🌐 Attempting GitHub fetch:", url);

  try {
    const response = await fetch(url);
    console.log("🌐 Fetch status:", response.status);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ 404: Add '${characterName}-character.json' to /characters in repo`);
        alert(`GitHub file not found for ${characterName}. Upload JSON instead!`);
      }
      return null;
    }
    const data = await response.json();
    console.log("✅ GitHub fetched:", data.name || characterName);
    data.lastModified = Date.now();
    return data;
  } catch (err) {
    console.error("❌ GitHub error:", err.message);
    alert("GitHub fetch failed—check console or upload JSON");
    return null;
  }
}

// ================================
// CLOUD SAVE/LOAD
// ================================
async function saveActiveCharacterToCloud() {
  if (!activeCharacter || !characterLibrary[activeCharacter]) {
    console.warn("⚠️ No active character to save");
    return false;
  }
  console.log("☁️ Saving to cloud:", activeCharacter);
  const success = await saveCharacterToCloud(characterLibrary[activeCharacter]);
  if (success) {
    await saveLastCharacterToCloud(activeCharacter);
    console.log(`✅ Cloud save complete: ${activeCharacter}`);
    if (!isGlobalLoading) await loadAllCharactersFromCloud();
  } else {
    alert("Save failed—check console/auth/rules");
  }
  return success;
}

async function loadAllCharactersFromCloud() {
  if (isGlobalLoading) {
    console.log("⏳ Global load skipped");
    return {};
  }
  isGlobalLoading = true;
  try {
    cloudCharacters = await loadCharactersFromCloud() || {};
    console.log("☁️ Cloud library loaded:", Object.keys(cloudCharacters).length);

    const select = document.getElementById("characterSelect");
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">Load Character...</option>';
      Object.keys(cloudCharacters).forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
      select.value = currentValue;
      
      if (!select.value) {
        const lastChar = await loadLastCharacterFromCloud();
        if (lastChar && cloudCharacters[lastChar]) {
          select.value = lastChar;
          setTimeout(() => loadCharacter(lastChar), 100); // Debounce auto-load
        }
      }
    }
    
    Object.assign(characterLibrary, cloudCharacters);
    return cloudCharacters;
  } catch (err) {
    console.error("❌ Cloud load error:", err);
    return {};
  } finally {
    isGlobalLoading = false;
  }
}

// ================================
// LOAD SINGLE (Debounced + Guarded)
// ================================
async function loadCharacter(characterName) {
  if (!characterName || loadingChars.has(characterName)) {
    console.log(`⏳ ${characterName} skipped—already loading`);
    return;
  }
  loadingChars.add(characterName);
  isGlobalLoading = true;
  console.log("📥 Loading:", characterName);
  
  if (characterLibrary[characterName]) {
    activeCharacter = characterName;
    renderCharacterSheet(characterLibrary[characterName]);
    loadingChars.delete(characterName);
    isGlobalLoading = false;
    return;
  }
  
  let data = cloudCharacters[characterName];
  if (!data) {
    console.log("☁️ Not in cloud—GitHub fallback");
    data = await loadCharacterFromGitHub(characterName);
    if (data) {
      characterLibrary[characterName] = data;
      await saveActive
