// ===================================
// QUEERZ! PLAYER COMPANION APP
// Updated 2025-11-11 v5 (Adapted to FLEXIBLE-v2 JSON Structure)
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
let isLoading = false;
let currentPortraitMode = 'streetwear'; // 'streetwear' or 'qfactor'

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
// FULL RENDER (Adapted to FLEXIBLE-v2)
// ================================
function renderCharacterSheet(data) {
  console.log("🎨 Full render:", data.name);
  
  // Basics
  document.getElementById("characterName").textContent = data.name || "Unnamed Hero";
  document.querySelector(".pronouns").textContent = data.pronouns || "";
  document.getElementById("playbook") ? document.getElementById("playbook").textContent = data.playbook || "" : null; // If added to HTML
  document.getElementById("runway") ? document.getElementById("runway").textContent = data.runway || "" : null;
  const portrait = document.querySelector(".character-portrait");
  portrait.src = (currentPortraitMode === 'qfactor' ? data.qfactorPortrait : data.streetwearPortrait) || "";
  portrait.alt = data.name || "Portrait";
  document.querySelector(".juice-count").textContent = data.juice || 0;
  
  // Combine themes: rainbow (up to 3) + realness (up to 2) = up to 5 for #theme0-4
  const allThemes = [...(data.rainbowThemes || []), ...(data.realnessThemes || [])];
  allThemes.forEach((theme, index) => {
    if (index > 4) return; // Max 5
    const themeEl = document.getElementById(`theme${index}`);
    if (!themeEl) return;
    
    // Header
    themeEl.querySelector(".theme-name").textContent = theme.name || "Unnamed Theme";
    themeEl.querySelector(".theme-type").textContent = theme.type || "";
    
    // Tracks
    if (theme.type === "REALNESS THEME") {
      // Crack for realness
      renderTrack(themeEl.querySelector(".crack-track .track-boxes"), theme.crack || 0, 3);
      themeEl.querySelector(".shade-track").style.display = 'none';
      if (themeEl.querySelector(".growth-track")) themeEl.querySelector(".growth-track").style.display = 'none';
    } else {
      // Growth/shade for rainbow
      renderTrack(themeEl.querySelector(".growth-track .track-boxes"), theme.growth || 0, 3);
      renderTrack(themeEl.querySelector(".shade-track .track-boxes"), theme.shade || 0, 3);
      if (themeEl.querySelector(".crack-track")) themeEl.querySelector(".crack-track").style.display = 'none';
    }
    
    // Quote (runway)
    themeEl.querySelector(".runway-quote em").textContent = theme.runway || "Your runway here";
    
    // Improvement checkbox (add to HTML if not there, or skip)
    const check = themeEl.querySelector(".improvement-check");
    if (check) {
      check.checked = data.themes?.[index]?.improvement || false; // Fallback if flat
      check.onchange = () => {
        if (activeCharacter) {
          if (!characterLibrary[activeCharacter].themes) characterLibrary[activeCharacter].themes = [...allThemes];
          characterLibrary[activeCharacter].themes[index].improvement = check.checked;
          saveActiveCharacterToCloud();
        }
      };
    }
    
    // Power tags (up to 3)
    const powerList = themeEl.querySelector(".tag-list");
    powerList.innerHTML = '';
    (theme.powerTags || []).filter(tag => tag.trim()).forEach(tag => {
      const li = document.createElement("li");
      li.textContent = tag;
      li.classList.add("tag-item");
      li.onclick = () => burnTag(tag, "power");
      powerList.appendChild(li);
    });
    
    // Weakness
    themeEl.querySelector(".weakness-text").textContent = theme.weaknessTag || "";
  });
  
  // Hide unused themes (if >0 but empty)
  for (let i = 0; i < 5; i++) {
    const themeEl = document.getElementById(`theme${i}`);
    if (themeEl && !allThemes[i]?.name) themeEl.style.display = 'none';
  }
  
  // Statuses (currentStatuses)
  renderTagList("statusList", data.currentStatuses || [], "status-tag", addStatus);
  
  // Story tags
  renderTagList("storyTagList", data.storyTags || [], "story-tag", addStoryTag);
  
  // Burnt tags
  renderTagList("burntTagList", data.burntTags || [], "burnt-tag");
  const recoverBtn = document.getElementById("recoverBtn");
  if (recoverBtn) recoverBtn.onclick = recoverBurntTags;
  
  // Combos (tagCombos)
  const comboList = document.getElementById("comboList");
  if (comboList) {
    comboList.innerHTML = '';
    (data.tagCombos || []).forEach(combo => {
      const div = document.createElement("div");
      div.classList.add("combo-item");
      div.innerHTML = `
        <strong>${combo.name || 'Unnamed'}</strong> (Tags: ${ (combo.tags || []).join(", ") }) - Power: ${combo.power || 1} - Move: ${combo.move || ''}
        <button onclick="this.parentElement.remove(); saveActiveCharacterToCloud();">×</button>
      `;
      comboList.appendChild(div);
    });
  }
  
  // Notes (if HTML has #notes)
  if (data.notes && document.getElementById("notes")) document.getElementById("notes").textContent = data.notes;
  
  // Broadcast
  if (window.broadcastCharacterToMc) broadcastCharacterToMc(data);
}

// ================================
// HELPER FUNCTIONS
// ================================
function renderTrack(container, filledCount, total) {
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const box = document.createElement("div");
    box.classList.add("track-box");
    if (i < filledCount) box.classList.add("filled");
    box.onclick = () => toggleTrackBox(box, container.parentElement.parentElement.id); // Pass theme ID
    container.appendChild(box);
  }
}

function toggleTrackBox(box, themeId) {
  if (!activeCharacter) return;
  box.classList.toggle("filled");
  // Update data (growth/shade/crack based on track)
  const char = characterLibrary[activeCharacter];
  const themeIndex = parseInt(themeId.replace('theme', ''));
  const theme = allThemes[themeIndex]; // From render scope? Use char.rainbow/realness
  const trackType = box.parentElement.classList.contains("growth-track") ? "growth" : 
                    box.parentElement.classList.contains("shade-track") ? "shade" : "crack";
  const current = theme[trackType] || 0;
  theme[trackType] = box.classList.contains("filled") ? current + 1 : current - 1;
  // Save theme array
  if (themeIndex < 3) char.rainbowThemes[themeIndex] = theme;
  else char.realnessThemes[themeIndex - 3] = theme;
  saveActiveCharacterToCloud();
}

function renderTagList(containerId, tags, className, addFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  tags.forEach(tag => {
    const div = document.createElement("div");
    div.classList.add(className);
    div.textContent = `${tag.name || tag} ${tag.tier ? `(Tier ${tag.tier})` : ''} ${tag.type ? `(${tag.type})` : ''} ${tag.ongoing ? '(Ongoing)' : ''}`;
    if (addFn !== addStatus && addFn !== addStoryTag) div.onclick = () => burnTag(tag.name || tag, containerId);
    container.appendChild(div);
  });
}

function burnTag(tag, type) {
  if (!activeCharacter) return;
  const char = characterLibrary[activeCharacter];
  if (!char.burntTags) char.burntTags = [];
  if (!char.burntTags.includes(tag)) {
    char.burntTags.push(tag);
    renderCharacterSheet(char);
    saveActiveCharacterToCloud();
  }
}

function recoverBurntTags() {
  if (!activeCharacter) return;
  characterLibrary[activeCharacter].burntTags = [];
  renderCharacterSheet(characterLibrary[activeCharacter]);
  saveActiveCharacterToCloud();
}

// Add functions
function addStatus() {
  const name = document.getElementById("statusName").value;
  const tier = parseInt(document.getElementById("statusTier").value);
  const type = document.getElementById("statusType").value;
  if (name && activeCharacter) {
    if (!characterLibrary[activeCharacter].currentStatuses) characterLibrary[activeCharacter].currentStatuses = [];
    characterLibrary[activeCharacter].currentStatuses.push({name, tier, type});
    document.getElementById("statusName").value = '';
    renderCharacterSheet(characterLibrary[activeCharacter]);
    saveActiveCharacterToCloud();
  }
}

function addStoryTag() {
  const name = document.getElementById("storyTagName").value;
  const ongoing = document.getElementById("storyOngoing").checked;
  if (name && activeCharacter) {
    if (!characterLibrary[activeCharacter].storyTags) characterLibrary[activeCharacter].storyTags = [];
    characterLibrary[activeCharacter].storyTags.push({name, ongoing});
    document.getElementById("storyTagName").value = '';
    document.getElementById("storyOngoing").checked = false;
    renderCharacterSheet(characterLibrary[activeCharacter]);
    saveActiveCharacterToCloud();
  }
}

// ================================
// LIVE SYNC
// ================================
function setupCloudSyncListeners() {
  let updateCount = 0;
  document.addEventListener('cloud-characters-updated', (e) => {
    updateCount++;
    if (updateCount % 5 !== 0) return;
    console.log(`🔄 Cloud update #${updateCount}`);
    const updatedChars = e.detail;
    Object.assign(cloudCharacters, updatedChars);
    Object.assign(characterLibrary, updatedChars);
    
    if (activeCharacter && characterLibrary[activeCharacter]) {
      renderCharacterSheet(characterLibrary[activeCharacter]);
    }
    
    if (!isLoading) loadAllCharactersFromCloud();
  });
  
  document.addEventListener('cloud-characters-loaded', (e) => {
    if (!isLoading) loadAllCharactersFromCloud();
  });
  
  console.log("✅ Cloud listeners active");
}

// ================================
// EVENTS
// ================================
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM ready");
  
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
  
  // Upload
  const uploadInput = document.getElementById("characterUpload");
  const uploadLabel = document.querySelector("label[for='characterUpload']");
  if (uploadInput && uploadLabel) {
    uploadLabel.addEventListener("click", () => {
      console.log("📁 Upload clicked");
      uploadInput.click();
    });
    uploadInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      console.log("📁 File:", file ? file.name : "None");
      if (!file) return;
      
      try {
        const text = await file.text();
        console.log("📁 Length:", text.length);
        const data = JSON.parse(text);
        console.log("✅ Parsed:", data.name);
        
        const name = data.name || file.name.replace('.json', '') || "Uploaded";
        characterLibrary[name] = { ...data, source: 'upload' };
        activeCharacter = name;
        
        renderCharacterSheet(characterLibrary[name]);
        
        const select = document.getElementById("characterSelect");
        if (select && !select.querySelector(`option[value="${name}"]`)) {
          const option = document.createElement("option");
          option.value = name;
          option.textContent = name;
          select.appendChild(option);
          select.value = name;
        }
        
        await saveActiveCharacterToCloud();
        console.log("☁️ Upload saved");
      } catch (err) {
        console.error("❌ Upload:", err.message);
      }
      uploadInput.value = '';
    });
  }
  
  // Portrait toggle
  const portraitToggle = document.getElementById("portraitToggle");
  if (portraitToggle) {
    portraitToggle.addEventListener("click", () => {
      currentPortraitMode = currentPortraitMode === 'streetwear' ? 'qfactor' : 'streetwear';
      portraitToggle.textContent = currentPortraitMode === 'streetwear' ? 'Switch to Q-Factor' : 'Switch to Streetwear';
      if (activeCharacter) {
        renderCharacterSheet(characterLibrary[activeCharacter]);
      }
    });
  }
  
  // Save btn
  const saveBtn = document.getElementById("saveCharBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveActiveCharacterToCloud);
  
  // Add status
  const addStatusBtn = document.getElementById("addStatusBtn");
  if (addStatusBtn) addStatusBtn.addEventListener("click", addStatus);
  
  // Add story
  const addStoryBtn = document.getElementById("addStoryBtn");
  if (addStoryBtn) addStoryBtn.addEventListener("click", addStoryTag);
  
  // Clear combos
  const clearCombosBtn = document.getElementById("clearCombosBtn");
  if (clearCombosBtn) clearCombosBtn.addEventListener("click", () => {
    if (activeCharacter) {
      characterLibrary[activeCharacter].tagCombos = [];
      renderCharacterSheet(characterLibrary[activeCharacter]);
      saveActiveCharacterToCloud();
    }
  });
  
  // Add combo
  const addComboBtn = document.getElementById("addComboBtn");
  if (addComboBtn) addComboBtn.addEventListener("click", () => {
    const name = document.getElementById("comboName").value;
    const tags = [document.getElementById("comboTag1").value, document.getElementById("comboTag2").value, document.getElementById("comboTag3").value].filter(t => t);
    const power = parseInt(document.getElementById("comboPower").value) || 1;
    const move = document.getElementById("comboMove").value;
    if (name && tags.length && activeCharacter) {
      if (!characterLibrary[activeCharacter].tagCombos) characterLibrary[activeCharacter].tagCombos = [];
      characterLibrary[activeCharacter].tagCombos.push({name, tags, power, move});
      // Clear inputs
      document.getElementById("comboName").value = '';
      ["comboTag1", "comboTag2", "comboTag3"].forEach(id => document.getElementById(id).value = '');
      document.getElementById("comboPower").value = 2;
      document.getElementById("comboMove").value = '';
      renderCharacterSheet(characterLibrary[activeCharacter]);
      saveActiveCharacterToCloud();
    }
  });
  
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
  
  // Toggle moves
  const toggleMovesBtn = document.getElementById("toggleMovesBtn");
  const movesPanel = document.getElementById("movesPanel");
  if (toggleMovesBtn && movesPanel) {
    toggleMovesBtn.addEventListener("click", () => {
      movesPanel.classList.toggle("hidden");
      toggleMovesBtn.textContent = movesPanel.classList.contains("hidden") ? "Show Moves" : "Hide Moves";
    });
  }
  
  // Init
  initializeAuth();
  loadAllCharactersFromCloud();
  setupCloudSyncListeners();
});

console.log("🎮 App ready—full render for FLEXIBLE-v2!");
