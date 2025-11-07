// ============================================
// QUEERZ! Player Companion App - Production Version
// Tag Burning, Combos, Core Moves, Firebase Sync
// ============================================

import { database } from './firebase-config.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

// ============================================
// CHARACTER DATA & STATE
// ============================================

let currentCharacter = null;
let burntPowerTags = [];
let burntWeaknessTags = [];
let tagCombos = [];

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    // Character Display
    characterPortrait: document.getElementById('characterPortrait'),
    characterName: document.getElementById('characterName'),
    characterPronouns: document.getElementById('characterPronouns'),
    
    // Stats Display
    juiceCount: document.getElementById('juiceCount'),
    totalPower: document.getElementById('totalPower'),
    rollResult: document.getElementById('rollResult'),
    
    // Tag Containers
    powerTagsContainer: document.getElementById('power-tags-container'),
    weaknessTagsContainer: document.getElementById('weakness-tags-container'),
    
    // Tag Combos
    comboTagsContainer: document.getElementById('combo-tags-container'),
    comboNameInput: document.getElementById('combo-name-input'),
    comboPowerInput: document.getElementById('combo-power-input'),
    addComboBtn: document.getElementById('add-combo-btn'),
    activeCombosContainer: document.getElementById('active-combos-container'),
    
    // Buttons
    recoverTagsBtn: document.getElementById('recover-tags-btn'),
    toggleMovesBtn: document.getElementById('toggle-moves-btn'),
    
    // Panels
    coreMovesPanel: document.getElementById('core-moves-panel'),
    
    // Character Loading
    loadCharacterBtn: document.getElementById('load-character-btn'),
    characterFileInput: document.getElementById('character-file-input'),
    
    // Scene Display (Firebase)
    currentSceneTitle: document.getElementById('current-scene-title'),
    locationImage: document.getElementById('location-image'),
    currentMusicDisplay: document.getElementById('current-music-display')
};

// Verify all required elements exist
console.log('=== ELEMENT CHECK ===');
Object.entries(elements).forEach(([name, element]) => {
    if (element) {
        console.log(`✓ Found element: ${name}`);
    } else {
        console.warn(`✗ Missing element: ${name}`);
    }
});
console.log('All required elements found!');

// ============================================
// CHARACTER LOADING
// ============================================

elements.loadCharacterBtn?.addEventListener('click', () => {
    elements.characterFileInput?.click();
});

elements.characterFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();

    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            currentCharacter = data;

            // Basic character display updates
            if (elements.characterPortrait) elements.characterPortrait.src = data.portrait || '';
            if (elements.characterName) elements.characterName.textContent = data.name || 'Unknown';
            if (elements.characterPronouns) elements.characterPronouns.textContent = data.pronouns || '';
            if (elements.juiceCount) elements.juiceCount.textContent = (data.juice != null) ? String(data.juice) : '';
            if (elements.totalPower) elements.totalPower.textContent = (data.totalPower != null) ? String(data.totalPower) : '';

            // Initialize tag state from file
            const powerTags = Array.isArray(data.powerTags) ? data.powerTags : [];
            const weaknessTags = Array.isArray(data.weaknessTags) ? data.weaknessTags : [];
            burntPowerTags = [];
            burntWeaknessTags = [];
            tagCombos = Array.isArray(data.tagCombos) ? data.tagCombos : [];

            // Render tag buttons
            if (elements.powerTagsContainer) {
                elements.powerTagsContainer.innerHTML = '';
                powerTags.forEach(tag => {
                    const btn = document.createElement('button');
                    btn.className = 'tag power-tag';
                    btn.textContent = tag;
                    elements.powerTagsContainer.appendChild(btn);
                });
            }

            if (elements.weaknessTagsContainer) {
                elements.weaknessTagsContainer.innerHTML = '';
                weaknessTags.forEach(tag => {
                    const btn = document.createElement('button');
                    btn.className = 'tag weakness-tag';
                    btn.textContent = tag;
                    elements.weaknessTagsContainer.appendChild(btn);
                });
            }

            // Render combos list if present
            if (elements.activeCombosContainer) {
                elements.activeCombosContainer.innerHTML = '';
                tagCombos.forEach(c => {
                    const div = document.createElement('div');
                    div.className = 'combo-item';
                    const name = c && c.name ? c.name : 'Unnamed Combo';
                    const power = c && (c.power != null) ? c.power : 0;
                    div.textContent = `${name} (${power})`;
                    elements.activeCombosContainer.appendChild(div);
                });
            }
        } catch (err) {
            console.error('Failed to parse character file:', err);
            alert('Invalid character file. Please select a valid JSON file.');
        }
    };

    reader.readAsText(file);
});