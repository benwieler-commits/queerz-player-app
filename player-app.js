// ===================================
// QUEERZ! PLAYER COMPANION APP
// Updated 2025-11-11 (Integrated with Firebase Config v3)
// ===================================

import {
  database as db,
  ref,
  set,
  get,
  onValue,
  forceSignInAnonymously as initializeAuth, // Alias for compat
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
const characterLibrary = {}; // Local cache of all characters
let activeCharacter = null; // Current active character name
let cloudCharacters = {}; // Cache for cloud-loaded characters

// ================================
// GITHUB CHARACTER LOADING (FALLBACK)
// ================================
async function loadCharacterFromGitHub(characterName) {
  const url = `https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main/characters/${characterName}-character.json`;
  console.log("🌐 Fetching from GitHub:", url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`❌ GitHub fetch failed for ${characterName}`);
    const data = await response.json();
    data.lastModified = Date.now();
    return data;
  } catch (err) {
    console.error("❌ GitHub load error:", err);
    return null;
  }
}

// ================================
// CLOUD SAVE / LOAD (USER-SPECIFIC)
// ================================
async function saveActiveCharacterToCloud() {
  if (!activeCharacter || !characterLibrary[activeCharacter]) {
    console.warn("⚠️ No active character to save");
    return false;
  }
  const success = await saveCharacterToCloud(characterLibrary[activeCharacter]);
  if (success) {
    await saveLastCharacterToCloud(activeCharacter);
    console.log(`✅ Saved ${activeCharacter} to cloud`);
  }
  return success;
}

async function loadAllCharactersFromCloud() {
  try {
    cloudCharacters = await loadCharactersFromCloud() || {};
    console.log("☁️ Loaded cloud library:", Object.keys(cloudCharacters).length, "characters");
    
    // Populate select dropdown
    const select = document.getElementById("characterSelect");
    if (select) {
      select.innerHTML = '<option value="">Load Character...</option>';
      Object.keys(cloudCharacters).forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
      
      // Auto-load last character if exists
      const lastChar = await loadLastCharacterFromCloud();
      if (lastChar && cloudCharacters[lastChar]) {
        select.value = lastChar;
        await loadCharacter(lastChar);
      }
    }
    
    // Merge with local library
    Object.assign(characterLibrary, cloudCharacters);
    return cloudCharacters;
  } catch (err) {
    console.error("❌ Cloud load failed:", err);
    return {};
  }
}

// ================================
// LOAD SINGLE CHARACTER (CLOUD + FALLBACK)
// ================================
async function loadCharacter(characterName) {
  if (!characterName) return;
  
  console.log("📥 Loading:", characterName);
  
  // Check local/cloud cache first
  if (characterLibrary[characterName]) {
    activeCharacter = characterName;
    renderCharacterSheet(characterLibrary[characterName]);
    return;
  }
  
  // Load from cloud
  let data = cloudCharacters[characterName];
  if (!data) {
    data = await loadCharacterFromGitHub(characterName); // Fallback
    if (data) {
      characterLibrary[characterName] = data;
      await saveActiveCharacterToCloud(); // Save new to cloud
    }
  } else {
    characterLibrary[characterName] = data;
  }
  
  if (data) {
    activeCharacter = characterName;
    renderCharacterSheet(data);
    console.log(`✅ Loaded ${characterName}`);
  } else {
    console.error(`❌ Failed to load ${characterName}`);
  }
}

// ================================
// LIVE CLOUD SYNC LISTENER
// ================================
function setupCloudSyncListeners() {
  // Listen for cloud updates (from config events)
  document.addEventListener('cloud-characters-updated', (e) => {
    const updatedChars = e.detail;
    console.log("🔄 Cloud update received:", Object.keys(updatedChars).length);
    Object.assign(cloudCharacters, updatedChars);
    Object.assign(characterLibrary, updatedChars);
    
    // Re-render if active
    if (activeCharacter && characterLibrary[activeCharacter]) {
      renderCharacterSheet(characterLibrary[activeCharacter]);
    }
    
    // Update select if needed
    const select = document.getElementById("characterSelect");
    if (select && !select.querySelector(`option[value="${activeCharacter}"]`)) {
      const option = document.createElement("option");
      option.value = activeCharacter;
      option.textContent = activeCharacter;
      select.appendChild(option);
      select.value = activeCharacter;
    }
  });
  
  document.addEventListener('cloud-characters-loaded', (e) => {
    loadAllCharactersFromCloud(); // Chain to populate
  });
  
  console.log("✅ Cloud sync listeners active");
}

// ================================
// RENDER CHARACTER SHEET
// ================================
function renderCharacterSheet(data) {
  console.log("🎨 Rendering:", data.name);
  
  // Basic info
  const nameField = document.getElementById("characterName");
  const pronounsField = document.querySelector(".pronouns");
  const portrait = document.querySelector(".character-portrait");
  const juiceDisplay = document.querySelector(".juice-count");
  
  if (nameField) nameField.textContent = data.name || "Unknown Hero";
  if (pronounsField) pronounsField.textContent = data.pronouns || "";
  if (portrait && data.streetwearPortrait) portrait.src = data.streetwearPortrait;
  if (juiceDisplay && typeof data.juice !== "undefined") juiceDisplay.textContent = data.juice;
  
  // TODO: Render themes, tags, statuses, combos from data
  // e.g., if (data.themes) renderThemes(data.themes);
  // Assume existing functions like renderThemes, renderTags, etc. are added below or in separate modules
  
  // Broadcast to MC if needed
  if (data && window.broadcastCharacterToMc) {
    broadcastCharacterToMc(data);
  }
}

// ================================
// UI EVENT HANDLERS
// ================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM ready - Wiring events");
  
  // Character select
  const characterSelect = document.getElementById("characterSelect");
  if (characterSelect) {
    characterSelect.addEventListener("change", async (e) => {
      const selected = e.target.value;
      if (selected) {
        await loadCharacter(selected);
      }
    });
  }
  
  // Upload JSON
  const uploadInput = document.getElementById("characterUpload");
  const uploadLabel = document.querySelector(".btn-upload");
  if (uploadInput && uploadLabel) {
    uploadLabel.addEventListener("click", () => uploadInput.click());
    uploadInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          const name = data.name || "Uploaded Character";
          characterLibrary[name] = data;
          activeCharacter = name;
          renderCharacterSheet(data);
          await saveActiveCharacterToCloud();
          console.log(`✅ Uploaded & saved: ${name}`);
        } catch (err) {
          console.error("❌ Invalid JSON:", err);
        }
      }
    });
  }
  
  // Save button
  const saveBtn = document.getElementById("saveCharBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveActiveCharacterToCloud);
  }
  
  // Juice controls
  document.addEventListener("click", (e) => {
    if (e.target.id === "juiceUp") {
      if (activeCharacter) {
        characterLibrary[activeCharacter].juice = (characterLibrary[activeCharacter].juice || 0) + 1;
        renderCharacterSheet(characterLibrary[activeCharacter]);
        saveActiveCharacterToCloud();
      }
    } else if (e.target.id === "juiceDown") {
      if (activeCharacter) {
        characterLibrary[activeCharacter].juice = Math.max(0, (characterLibrary[activeCharacter].juice || 0) - 1);
        renderCharacterSheet(characterLibrary[activeCharacter]);
        saveActiveCharacterToCloud();
      }
    }
  });
  
  // Dice roller (stub - add full logic as needed)
  const rollBtn = document.getElementById("rollBtn");
  if (rollBtn) {
    rollBtn.addEventListener("click", () => {
      const power = parseInt(document.getElementById("totalPower").value) || 0;
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2 + power;
      document.getElementById("rollResult").innerHTML = `
        <p><strong>${dice1} + ${dice2} + ${power} = ${total}</strong></p>
        <p>${total >= 10 ? '10+ Success!' : total >= 7 ? '7-9 Partial' : 'Miss :('}</p>
      `;
    });
  }
  
  // TODO: Add handlers for moves, tags, combos, etc. (e.g., update char data on change, save)
  
  // Init auth & cloud
  initializeAuth(); // Triggers force sign-in
  loadAllCharactersFromCloud();
  setupCloudSyncListeners();
});

// ================================
// INIT COMPLETE
// ================================
console.log("🎮 Player App fully initialized - Cloud sync + GitHub fallback ready");
console.log("💡 Select a character or upload JSON to start!");
