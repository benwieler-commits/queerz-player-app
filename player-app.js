// ===================================
// QUEERZ! PLAYER COMPANION APP
// Updated 2025-11-11 v2 (Enhanced Upload/GitHub Error Handling)
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
const characterLibrary = {}; // Local cache of all characters
let activeCharacter = null; // Current active character name
let cloudCharacters = {}; // Cache for cloud-loaded characters

// ================================
// GITHUB CHARACTER LOADING (FALLBACK w/ Better Errors)
// ================================
async function loadCharacterFromGitHub(characterName) {
  const url = `https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main/characters/${characterName}-character.json`;
  console.log("🌐 Attempting GitHub fetch:", url);

  try {
    const response = await fetch(url);
    console.log("🌐 Fetch status:", response.status, response.statusText);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`⚠️ 404: No file at ${url}. Add '${characterName}-character.json' to repo /characters/.`);
      } else {
        console.error(`❌ GitHub fetch failed (${response.status}):`, response.statusText);
      }
      return null;
    }
    const data = await response.json();
    console.log("✅ GitHub fetched:", data.name || characterName);
    data.lastModified = Date.now();
    return data;
  } catch (err) {
    console.error("❌ GitHub network/parse error:", err.message);
    return null;
  }
}

// ================================
// CLOUD SAVE / LOAD
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
    // Refresh library to include it
    await loadAllCharactersFromCloud();
  } else {
    console.error("❌ Cloud save failed—check console/auth/rules");
  }
  return success;
}

async function loadAllCharactersFromCloud() {
  try {
    cloudCharacters = await loadCharactersFromCloud() || {};
    console.log("☁️ Cloud library loaded:", Object.keys(cloudCharacters).length, "characters");

    // Populate select dropdown
    const select = document.getElementById("characterSelect");
    if (select) {
      const currentValue = select.value; // Preserve selection
      select.innerHTML = '<option value="">Load Character...</option>';
      Object.keys(cloudCharacters).forEach(name => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
      });
      select.value = currentValue; // Restore if possible
      
      // Auto-load last if no selection
      if (!select.value) {
        const lastChar = await loadLastCharacterFromCloud();
        if (lastChar && cloudCharacters[lastChar]) {
          select.value = lastChar;
          await loadCharacter(lastChar);
        }
      }
    }
    
    // Merge with local
    Object.assign(characterLibrary, cloudCharacters);
    return cloudCharacters;
  } catch (err) {
    console.error("❌ Cloud load error:", err);
    return {};
  }
}

// ================================
// LOAD SINGLE CHARACTER
// ================================
async function loadCharacter(characterName) {
  if (!characterName) return;
  
  console.log("📥 Loading:", characterName);
  
  // Check cache first
  if (characterLibrary[characterName]) {
    activeCharacter = characterName;
    renderCharacterSheet(characterLibrary[characterName]);
    return;
  }
  
  // Try cloud (via library)
  let data = cloudCharacters[characterName];
  if (!data) {
    console.log("☁️ Not in cloud—trying GitHub fallback");
    data = await loadCharacterFromGitHub(characterName);
    if (data) {
      characterLibrary[characterName] = data;
      await saveActiveCharacterToCloud(); // Cache to cloud
    } else {
      console.error(`❌ Load failed for ${characterName}—add to GitHub or upload JSON`);
      return;
    }
  } else {
    characterLibrary[characterName] = data;
  }
  
  if (data) {
    activeCharacter = characterName;
    renderCharacterSheet(data);
    console.log(`✅ Loaded & rendered: ${characterName}`);
  }
}

// ================================
// LIVE CLOUD SYNC
// ================================
function setupCloudSyncListeners() {
  document.addEventListener('cloud-characters-updated', (e) => {
    const updatedChars = e.detail;
    console.log("🔄 Cloud update merged:", Object.keys(updatedChars).length);
    Object.assign(cloudCharacters, updatedChars);
    Object.assign(characterLibrary, updatedChars);
    
    if (activeCharacter && characterLibrary[activeCharacter]) {
      renderCharacterSheet(characterLibrary[activeCharacter]);
    }
    
    // Refresh select
    loadAllCharactersFromCloud();
  });
  
  document.addEventListener('cloud-characters-loaded', (e) => {
    loadAllCharactersFromCloud();
  });
  
  console.log("✅ Cloud listeners active");
}

// ================================
// RENDER CHARACTER SHEET
// ================================
function renderCharacterSheet(data) {
  console.log("🎨 Rendering:", data.name);
  
  const nameField = document.getElementById("characterName");
  const pronounsField = document.querySelector(".pronouns");
  const portrait = document.querySelector(".character-portrait");
  const juiceDisplay = document.querySelector(".juice-count");
  
  if (nameField) nameField.textContent = data.name || "Unknown Hero";
  if (pronounsField) pronounsField.textContent = data.pronouns || "";
  if (portrait) {
    portrait.src = data.streetwearPortrait || data.portrait || ""; // Fallback
    portrait.alt = data.name || "Portrait";
  }
  if (juiceDisplay) juiceDisplay.textContent = data.juice || 0;
  
  // Broadcast to MC
  if (window.broadcastCharacterToMc) {
    broadcastCharacterToMc(data);
  }
  
  // TODO: Add renderThemes, renderTags, etc. here
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
      } else {
        activeCharacter = null;
      }
    });
  }
  
  // Upload JSON (Enhanced Logging)
  const uploadInput = document.getElementById("characterUpload");
  const uploadLabel = document.querySelector("label[for='characterUpload']"); // Target label properly
  if (uploadInput && uploadLabel) {
    uploadLabel.addEventListener("click", (e) => {
      console.log("📁 Upload label clicked");
      uploadInput.click();
    });
    uploadInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      console.log("📁 File selected:", file ? file.name : "None");
      if (!file) return;
      
      try {
        const text = await file.text();
        console.log("📁 Raw file content length:", text.length);
        const data = JSON.parse(text);
        console.log("✅ JSON parsed:", data.name || "Unnamed");
        
        const name = data.name || file.name.replace('.json', '') || "Uploaded Character";
        characterLibrary[name] = { ...data, source: 'upload' };
        activeCharacter = name;
        
        renderCharacterSheet(characterLibrary[name]);
        
        // Add to select
        const select = document.getElementById("characterSelect");
        if (select && !select.querySelector(`option[value="${name}"]`)) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          select.appendChild(option);
          select.value = name;
        }
        
        // Save to cloud
        const saveSuccess = await saveActiveCharacterToCloud();
        console.log("☁️ Upload save result:", saveSuccess ? "Success" : "Failed—check auth");
      } catch (err) {
        console.error("❌ Upload error:", err.message);
        if (err.name === 'SyntaxError') console.error("💡 JSON invalid—check file format");
      }
      // Reset input
      uploadInput.value = '';
    });
    console.log("✅ Upload handler wired");
  } else {
    console.warn("⚠️ Upload elements not found");
  }
  
  // Save button
  const saveBtn = document.getElementById("saveCharBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      console.log("💾 Save button clicked");
      saveActiveCharacterToCloud();
    });
  }
  
  // Juice controls
  document.addEventListener("click", (e) => {
    if (e.target.id === "juiceUp" || e.target.id === "juiceDown") {
      if (!activeCharacter) {
        console.warn("⚠️ No active char for juice update");
        return;
      }
      const delta = e.target.id === "juiceUp" ? 1 : -1;
      const currentJuice = characterLibrary[activeCharacter].juice || 0;
      characterLibrary[activeCharacter].juice = Math.max(0, currentJuice + delta);
      console.log("🥤 Juice updated:", characterLibrary[activeCharacter].juice);
      renderCharacterSheet(characterLibrary[activeCharacter]);
      saveActiveCharacterToCloud();
    }
  });
  
  // Dice roller (basic)
  const rollBtn = document.getElementById("rollBtn");
  if (rollBtn) {
    rollBtn.addEventListener("click", () => {
      const power = parseInt(document.getElementById("totalPower").value) || 0;
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2 + power;
      const resultEl = document.getElementById("rollResult");
      resultEl.innerHTML = `
        <p><strong>${dice1} + ${dice2} + ${power} = ${total}</strong></p>
        <p>${total >= 10 ? '10+ Success!' : total >= 7 ? '7-9 Partial' : 'Miss :('}</p>
      `;
      console.log("🎲 Roll result:", total);
    });
  }
  
  // Init
  initializeAuth();
  loadAllCharactersFromCloud();
  setupCloudSyncListeners();
});

// ================================
// INIT COMPLETE
// ================================
console.log("🎮 App ready—Test upload/GitHub with sample JSON!");
console.log("💡 GitHub tip: Add files to /characters in repo for auto-pull.");
