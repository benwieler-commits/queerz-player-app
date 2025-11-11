// ===================================
// QUEERZ! PLAYER COMPANION APP
// Updated 2025-11-10
// ===================================

import { db } from "./firebase-config.js";
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

console.log("✅ Player App Loaded");

// ================================
// GLOBAL STATE
// ================================
const characterLibrary = {}; // Local cache of all characters
let activeCharacter = null;

// ================================
// GITHUB CHARACTER LOADING
// ================================
async function loadCharacterFromGitHub(characterName) {
  const url = `https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main/characters/${characterName}-character.json`;
  console.log("🌐 Fetching character data from GitHub:", url);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`❌ Failed to fetch ${characterName} JSON`);
  const data = await response.json();
  data.lastModified = Date.now();
  return data;
}

// ================================
// FIREBASE SAVE / SYNC
// ================================
async function saveCharacterToFirebase(characterName) {
  if (!characterLibrary[characterName]) return console.warn("⚠️ Nothing to save for", characterName);

  const charRef = ref(db, `playerCharacters/${characterName}`);
  const data = { ...characterLibrary[characterName], lastModified: Date.now() };

  try {
    await set(charRef, data);
    console.log(`✅ Full character sheet saved for ${characterName}`);
  } catch (err) {
    console.error("❌ Error saving to Firebase:", err);
  }
}

async function loadCharacter(characterName) {
  const charRef = ref(db, `playerCharacters/${characterName}`);
  let data;

  try {
    const snapshot = await get(charRef);
    if (snapshot.exists()) {
      console.log("☁️ Loaded from Firebase:", characterName);
      data = snapshot.val();
    } else {
      console.log("🌐 Not found in Firebase, fetching from GitHub...");
      data = await loadCharacterFromGitHub(characterName);
      await saveCharacterToFirebase(characterName);
    }

    characterLibrary[characterName] = data;
    activeCharacter = characterName;
    renderCharacterSheet(data);
  } catch (err) {
    console.error("❌ Load failed:", err);
  }
}

// ================================
// FIREBASE AUTO SYNC
// ================================
function setupFirebaseSync(characterName) {
  const charRef = ref(db, `playerCharacters/${characterName}`);
  onValue(charRef, (snapshot) => {
    const cloudChar = snapshot.val();
    if (!cloudChar) return;

    const localChar = characterLibrary[characterName];
    if (!localChar || cloudChar.lastModified > (localChar.lastModified || 0)) {
      characterLibrary[characterName] = cloudChar;
      console.log(`⬇️ Synced ${characterName} from Firebase`);
      renderCharacterSheet(cloudChar);
    }
  });
}

// ================================
// RENDER CHARACTER SHEET
// ================================
function renderCharacterSheet(data) {
  console.log("🎨 Rendering character sheet for", data.name);
  const nameField = document.getElementById("characterName");
  const pronounsField = document.querySelector(".pronouns");
  const portrait = document.querySelector(".character-portrait");
  const juiceDisplay = document.querySelector(".juice-count");

  if (nameField) nameField.textContent = data.name || "Unknown Hero";
  if (pronounsField) pronounsField.textContent = data.pronouns || "";
  if (portrait && data.streetwearPortrait) portrait.src = data.streetwearPortrait;
  if (juiceDisplay && typeof data.juice !== "undefined") juiceDisplay.textContent = data.juice;

  // Additional rendering logic (themes, tags, etc.) remains handled by your existing UI functions.
}

// ================================
// EVENT HANDLERS
// ================================
document.addEventListener("click", (e) => {
  // JUICE CONTROL
  if (e.target.classList.contains("juice-btn")) {
    if (!activeCharacter) return;
    const char = characterLibrary[activeCharacter];
    if (e.target.textContent.includes("+")) char.juice++;
    if (e.target.textContent.includes("-")) char.juice = Math.max(0, char.juice - 1);
    renderCharacterSheet(char);
    saveCharacterToFirebase(activeCharacter);
  }

  // TAG BURN
  if (e.target.classList.contains("tag-list")) {
    if (!activeCharacter) return;
    const tag = e.target.textContent.trim();
    const char = characterLibrary[activeCharacter];
    if (!char.burntTags) char.burntTags = [];
    if (!char.burntTags.includes(tag)) char.burntTags.push(tag);
    console.log(`🔥 Burned tag: ${tag}`);
    saveCharacterToFirebase(activeCharacter);
  }
});

// ================================
// CHARACTER SELECTION
// ================================
const characterSelect = document.getElementById("characterSelect");
if (characterSelect) {
  characterSelect.addEventListener("change", async (e) => {
    const selected = e.target.value;
    if (selected) {
      await loadCharacter(selected);
      setupFirebaseSync(selected);
    }
  });
}

// ================================
// INIT
// ================================
console.log("🎮 Player App initialized with full Firebase + GitHub sync");
