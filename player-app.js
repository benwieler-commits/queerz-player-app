// ===================================
// QUEERZ! PLAYER COMPANION APP
// Updated 2025-11-11 v3 (Loop Guards + Throttled Loads)
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
const characterLibrary = {}; // Local cache
let activeCharacter = null;
let cloudCharacters = {}; // Cache
let isLoading = false; // ⭐ NEW: Guard for recursive loads

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
      }
      return null;
    }
    const data = await response.json();
    console.log("✅ GitHub fetched:", data.name || characterName);
    data.lastModified = Date.now();
    return data;
  } catch (err) {
    console.error("❌ GitHub error:", err.message);
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
    // Guarded refresh
    if (!isLoading) await loadAllCharactersFromCloud();
  }
  return success;
}

async function loadAllCharactersFromCloud() {
  if (isLoading) {
    console.log("⏳ Load skipped—already loading");
    return {};
  }
  isLoading = true;
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
          await loadCharacter(lastChar);
        }
      }
    }
    
    Object.assign(characterLibrary, cloudCharacters);
    return cloudCharacters;
  } catch (err) {
    console.error("❌ Cloud load error:", err);
    return {};
  } finally {
    isLoading = false;
  }
}

// ================================
// LOAD SINGLE
// ================================
async function loadCharacter(characterName) {
  if (!characterName || isLoading) return;
  isLoading = true;
  console.log("📥 Loading:", characterName);
  
  if (characterLibrary[characterName]) {
    activeCharacter = characterName;
    renderCharacterSheet(characterLibrary[characterName]);
    isLoading = false;
    return;
  }
  
  let data = cloudCharacters[characterName];
  if (!data) {
    console.log("☁️ Not in cloud—GitHub fallback");
    data = await loadCharacterFromGitHub(characterName);
    if (data) {
      characterLibrary[characterName] = data;
      await saveActiveCharacterToCloud();
    } else {
      console.error(`❌ Load failed for ${characterName}`);
      isLoading = false;
      return;
    }
  } else {
    characterLibrary[characterName] = data;
  }
  
  activeCharacter = characterName;
  renderCharacterSheet(data);
  console.log(`✅ Loaded: ${characterName}`);
  isLoading = false;
}

// ================================
// LIVE SYNC (GUARDED)
// ================================
function setupCloudSyncListeners() {
  let updateCount = 0; // Throttle
  document.addEventListener('cloud-characters-updated', (e) => {
    updateCount++;
    if (updateCount % 5 !== 0) return; // Log every 5th
    console.log(`🔄 Cloud update #${updateCount} merged`);
    const updatedChars = e.detail;
    Object.assign(cloudCharacters, updatedChars);
    Object.assign(characterLibrary, updatedChars);
    
    if (activeCharacter && characterLibrary[activeCharacter]) {
      renderCharacterSheet(characterLibrary[activeCharacter]);
    }
    
    loadAllCharactersFromCloud(); // Safe with guard
  });
  
  document.addEventListener('cloud-characters-loaded', (e) => {
    if (!isLoading) loadAllCharactersFromCloud();
  });
  
  console.log("✅ Cloud listeners active (guarded)");
}

// ================================
// RENDER
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
    portrait.src = data.streetwearPortrait || data.portrait || "";
    portrait.alt = data.name || "Portrait";
  }
  if (juiceDisplay) juiceDisplay.textContent = data.juice || 0;
  
  if (window.broadcastCharacterToMc) {
    broadcastCharacterToMc(data);
  }
}

// ================================
// EVENTS
// ================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM ready - Wiring events");
  
  // Select
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
  
  // Upload (Enhanced)
  const uploadInput = document.getElementById("characterUpload");
  const uploadLabel = document.querySelector("label[for='characterUpload']");
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
        console.log("📁 Content length:", text.length);
        const data = JSON.parse(text);
        console.log("✅ Parsed:", data.name || "Unnamed");
        
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
        
        // Save
        const saveSuccess = await saveActiveCharacterToCloud();
        console.log("☁️ Upload save:", saveSuccess ? "Success" : "Failed");
      } catch (err) {
        console.error("❌ Upload error:", err.message);
      }
      uploadInput.value = '';
    });
    console.log("✅ Upload wired");
  }
  
  // Save btn
  const saveBtn = document.getElementById("saveCharBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      console.log("💾 Save clicked");
      saveActiveCharacterToCloud();
    });
  }
  
  // Juice
  document.addEventListener("click", (e) => {
    if (e.target.id === "juiceUp" || e.target.id === "juiceDown") {
      if (!activeCharacter) return console.warn("⚠️ No char for juice");
      const delta = e.target.id === "juiceUp" ? 1 : -1;
      const current = characterLibrary[activeCharacter].juice || 0;
      characterLibrary[activeCharacter].juice = Math.max(0, current + delta);
      console.log("🥤 Juice:", characterLibrary[activeCharacter].juice);
      renderCharacterSheet(characterLibrary[activeCharacter]);
      saveActiveCharacterToCloud();
    }
  });
  
  // Roller
  const rollBtn = document.getElementById("rollBtn");
  if (rollBtn) {
    rollBtn.addEventListener("click", () => {
      const power = parseInt(document.getElementById("totalPower").value) || 0;
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + power;
      document.getElementById("rollResult").innerHTML = `
        <p><strong>${d1} + ${d2} + ${power} = ${total}</strong></p>
        <p>${total >= 10 ? '10+!' : total >= 7 ? '7-9' : 'Miss'}</p>
      `;
    });
  }
  
  // Init
  initializeAuth();
  loadAllCharactersFromCloud();
  setupCloudSyncListeners();
});

console.log("🎮 App ready—no loops!");
