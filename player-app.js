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
  loadCharacters
} from './firebase-config.js';

// Global State
let characters = {}; // {id: {name, json, ...}}
let currentCharacterId = null;
let currentCharacter = null;
let isInitialized = false;
let themeCache = {}; // For quick theme lookups
let tagCache = {}; // For tag filtering

// DOM Elements Cache (for performance)
const elements = {
  fileInput: document.getElementById('file-upload'),
  dropdown: document.getElementById('character-select'),
  renderArea: document.getElementById('character-render'),
  uploadBtn: document.getElementById('upload-btn'),
  portraitImg: document.getElementById('portrait'),
  themeSelect: document.getElementById('theme-dropdown'),
  tagFilter: document.getElementById('tag-filter'),
  consoleLog: document.getElementById('console') // Hidden debug div
};

// Utility: Log to console + on-page (for debug)
const log = (msg, type = 'info') => {
  console[type](`[Queerz] ${msg}`);
  if (elements.consoleLog) {
    elements.consoleLog.innerHTML += `<div class="${type}">[${new Date().toLocaleTimeString()}] ${msg}</div>`;
  }
};

// Error Handler
window.onerror = (msg, url, line) => {
  log(`❌ Error: ${msg} at ${url}:${line}`, 'error');
  alert(`Debug error: ${msg}. Check console.`);
};
// ===================================
// CORE FUNCTIONS
// ===================================

// Parse JSON File & Validate
const parseCharacterJson = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.name || !json.description || !json.tags) {
          throw new Error('Missing required fields: name, description, tags');
        }
        log(`✅ Parsed: ${json.name}`);
        resolve(json);
      } catch (err) {
        log(`❌ Parse Error: ${err.message}`, 'error');
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};

// Render Character (FLEXIBLE-v2: Themes, Tags, Portrait)
const renderCharacter = (char) => {
  if (!char || !elements.renderArea) return;

  log(`🎨 Rendering: ${char.name}`);
  
  // Clear previous render
  elements.renderArea.innerHTML = '';

  // Portrait
  if (char.portrait && elements.portraitImg) {
    elements.portraitImg.src = char.portrait;
    elements.portraitImg.alt = `${char.name} portrait`;
    elements.portraitImg.style.display = 'block';
  }

  // Themes (Dynamic CSS injection for queerz vibes)
  const themeStyle = document.createElement('style');
  const theme = char.theme || 'default';
  themeStyle.textContent = `
    #character-render { 
      background: ${themeCache[theme]?.bg || '#f0f8ff'}; 
      color: ${themeCache[theme]?.text || '#333'}; 
      border: 2px solid ${themeCache[theme]?.accent || '#ff69b4'};
      padding: 20px; 
      border-radius: 10px; 
    }
    .tag { background: ${themeCache[theme]?.accent || '#ff69b4'}; }
  `;
  document.head.appendChild(themeStyle);

  // Main Content
  const content = document.createElement('div');
  content.innerHTML = `
    <h2>${char.name}</h2>
    <p><strong>Description:</strong> ${char.description}</p>
    <div class="tags">
      <strong>Tags:</strong> 
      ${char.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
    </div>
    ${char.personality ? `<p><strong>Personality:</strong> ${char.personality}</p>` : ''}
    ${char.scenarios ? `<details><summary>Scenarios</summary><ul>${char.scenarios.map(s => `<li>${s}</li>`).join('')}</ul></details>` : ''}
  `;
  elements.renderArea.appendChild(content);

  // Filter Tags (if active)
  if (elements.tagFilter && elements.tagFilter.value) {
    const filterTag = elements.tagFilter.value.toLowerCase();
    const tagElements = content.querySelectorAll('.tag');
    tagElements.forEach(el => {
      el.style.display = el.textContent.toLowerCase().includes(filterTag) ? 'inline' : 'none';
    });
  }
};

// Load Characters from Cloud/DB
const loadAllCharacters = async () => {
  try {
    const snapshot = await get(ref(db, 'characters'));
    if (snapshot.exists()) {
      characters = snapshot.val() || {};
      log(`📥 Loaded ${Object.keys(characters).length} characters`);
      populateDropdown();
    } else {
      log('📭 No characters found in DB');
    }
  } catch (err) {
    log(`❌ Load Error: ${err.message}`, 'error');
  }
};

// Populate Dropdown
const populateDropdown = () => {
  if (!elements.dropdown) return;
  elements.dropdown.innerHTML = '<option value="">Select Character...</option>';
  Object.entries(characters).forEach(([id, char]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = char.name;
    elements.dropdown.appendChild(option);
  });
  log('🔽 Dropdown populated');
};

// Upload Character to Cloud
const uploadCharacter = async (char, fileName) => {
  try {
    const id = char.name.toLowerCase().replace(/\s+/g, '-');
    await saveCharacterToCloud(char, id);
    characters[id] = { ...char, id, uploadedAt: Date.now(), fileName };
    populateDropdown();
    alert(`Uploaded ${char.name}!`);
    log(`☁️ Uploaded: ${id}`);
    if (currentCharacterId === id) renderCharacter(char);
  } catch (err) {
    log(`❌ Upload Error: ${err.message}`, 'error');
    alert(`Upload failed: ${err.message}`);
  }
};

// Change Theme (Global or Per-Char)
const changeTheme = (themeName) => {
  themeCache[themeName] = {
    bg: themes[themeName]?.bg || '#f0f8ff',
    text: themes[themeName]?.text || '#333',
    accent: themes[themeName]?.accent || '#ff69b4'
  };
  if (currentCharacter) renderCharacter(currentCharacter);
  log(`🎨 Theme: ${themeName}`);
};

// Predefined Themes (Queerz Flex)
const themes = {
  rainbow: { bg: 'linear-gradient(45deg, #ff0000, #ff8000, #ffff00, #80ff00, #00ff00, #00ff80, #00ffff, #0080ff, #0000ff, #8000ff, #ff00ff, #ff0080)', text: '#fff', accent: '#ff69b4' },
  neon: { bg: '#000', text: '#fff', accent: '#00ffff' },
  pastel: { bg: '#ffe4e1', text: '#333', accent: '#ffb6c1' },
  default: { bg: '#f0f8ff', text: '#333', accent: '#ff69b4' }
};

// Tag Filter Update
const updateTagFilter = (filterValue) => {
  tagCache[filterValue] = filterValue ? characters : Object.fromEntries(
    Object.entries(characters).filter(([id, char]) => char.tags.some(t => t.toLowerCase().includes(filterValue.toLowerCase())))
  );
  if (currentCharacter) renderCharacter(currentCharacter); // Re-render with filter
  log(`🏷️ Filtered by: ${filterValue}`);
};
// ===================================
// EVENT LISTENERS & INIT
// ===================================

// File Upload Handler
if (elements.fileInput) {
  elements.fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const char = await parseCharacterJson(file);
      await uploadCharacter(char, file.name);
      currentCharacter = char;
      currentCharacterId = char.name.toLowerCase().replace(/\s+/g, '-');
      renderCharacter(char);
    } catch (err) {
      log(`❌ Upload Parse Error: ${err.message}`, 'error');
    }
  });
}

// Dropdown Select Handler
if (elements.dropdown) {
  elements.dropdown.addEventListener('change', (e) => {
    const id = e.target.value;
    log('🔽 Select changed', 'info');
    if (id && characters[id]) {
      currentCharacterId = id;
      currentCharacter = characters[id];
      renderCharacter(currentCharacter);
      log('✅ Loaded', 'success');
    } else {
      currentCharacterId = null;
      currentCharacter = null;
      elements.renderArea.innerHTML = '<p>Select a character to render!</p>';
    }
  });
}

// Theme Dropdown Handler
if (elements.themeSelect) {
  elements.themeSelect.addEventListener('change', (e) => {
    changeTheme(e.target.value);
  });
}

// Tag Filter Handler
if (elements.tagFilter) {
  elements.tagFilter.addEventListener('input', (e) => {
    updateTagFilter(e.target.value);
  });
}

// Upload Button (Manual Trigger)
if (elements.uploadBtn) {
  elements.uploadBtn.addEventListener('click', () => {
    elements.fileInput.click();
  });
}

// ===================================
// INITIALIZATION
// ===================================
const initApp = async () => {
  if (isInitialized) return;
  
  try {
    log('🚀 Initializing Queerz Player...');
    
    // Auth
    await initializeAuth();
    log('🔐 Auth initialized');
    
    // Load Data
    await loadAllCharacters();
    
    // Cache Themes
    Object.keys(themes).forEach(key => changeTheme(key)); // Pre-cache
    
    // Real-time Listener (Optional: Sync on changes)
    onValue(ref(db, 'characters'), (snapshot) => {
      if (snapshot.exists()) {
        characters = snapshot.val();
        populateDropdown();
        if (currentCharacterId && characters[currentCharacterId]) {
          renderCharacter(characters[currentCharacterId]);
        }
      }
    });
    
    log('✅ Player App Loaded');
    isInitialized = true;
  } catch (err) {
    log(`❌ Init Error: ${err.message}`, 'error');
    alert('App failed to load—check console.');
  }
};

// Auto-init on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for Testing (if needed)
window.QueerzDebug = { characters, renderCharacter, loadAllCharacters };
