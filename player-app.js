import { database } from './firebase-config.js';
// ================================
// QUEERZ! PLAYER COMPANION APP
// Main JavaScript
// ================================

// Global State
let currentCharacter = null;
let characterLibrary = {};
let usingStreerwearPortrait = true;
let firebaseInitialized = false;

// Firebase references (will be set when Firebase initializes)
let db = null;
let realtimeDb = null;

// Power tracking from burnt tags
let activePowerTags = []; // Tags that add to power (burnt power tags)
let activeWeaknessTags = []; // Tags that subtract from power (burnt weakness tags)
let activeStatusTags = []; // Negative status tags that subtract from power

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌈 QUEERZ! Player App Starting...');
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 Page loaded at:', new Date().toISOString());
    
    // Check if all required elements exist
    console.log('🔍 Checking for required HTML elements...');
    const requiredElements = [
        'characterSelect',
        'characterUpload',
        'portraitToggle',
        'saveCharBtn',
        'rollBtn',
        'juiceUp',
        'juiceDown',
        'addStatusBtn',
        'addStoryBtn',
        'recoverBtn',
        'characterPortrait',
        'characterName',
        'characterPronouns',
        'juiceCount',
        'totalPower',
        'rollResult'
    ];
    
    let missingElements = [];
    requiredElements.forEach(id => {
        const el = document.getElementById(id);
        if (!el) {
            missingElements.push(id);
            console.error('❌ Missing element:', id);
        } else {
            console.log('✅ Found element:', id);
        }
    });
    
    if (missingElements.length > 0) {
        console.error('❌ Missing elements:', missingElements);
        alert('App error: Some required elements are missing. Check console for details.');
    } else {
        console.log('✅ All required elements found!');
    }
    
    // Initialize UI event listeners
    initializeEventListeners();
    
    // Load saved character library from localStorage
    loadCharacterLibrary();
    
    // Try to initialize Firebase
    initializeFirebase();
    
    // Load last used character if available
    loadLastCharacter();
    
    // Add test button for debugging (remove in production)
    addTestButton();
    
    console.log('✅ App initialization complete!');
});

// ================================
// TEST/DEBUG FUNCTIONS
// ================================

function addTestButton() {
    // Create a test button to load Luxy without file upload
    const testBtn = document.createElement('button');
    testBtn.textContent = '🧪 Test Load Luxy';
    testBtn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        background: #FF1493;
        color: white;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        font-weight: bold;
        z-index: 9999;
        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
    `;
    testBtn.onclick = function() {
        console.log('🧪 TEST BUTTON CLICKED - Loading Luxy Charms...');
        loadTestCharacter();
    };
    document.body.appendChild(testBtn);
    console.log('🧪 Test button added to page');
}

function loadTestCharacter() {
    const luxyData = {
        "name": "Luxy Charms",
        "pronouns": "She/Her",
        "playbook": "Drag Icon",
        "runway": "Never Following the Path, Always Blazing the Trail",
        "streetwearPortrait": "https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main/images/characters/luxy-charms-streetwear.png",
        "qfactorPortrait": "https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main/images/characters/luxy-charms-qfactor.png",
        "juice": 0,
        "rainbowThemes": [
            {
                "name": "UNWAVERING SENSE OF SELF",
                "type": "SIGNATURE",
                "runway": "The fiercest confidence isn't just style—it's survival.",
                "growth": 0,
                "shade": 0,
                "powerTags": [
                    "You don't get to dull my sparkle",
                    "I've survived worse than you",
                    "Watch me shine anyway"
                ],
                "weaknessTag": "But was I enough?"
            },
            {
                "name": "CINNAMON TOAST PUNCH!",
                "type": "FIGHTING STYLE",
                "runway": "A whirlwind of glitter, heels, and spicy justice.",
                "growth": 0,
                "shade": 0,
                "powerTags": [
                    "Hot and crunchy!",
                    "Heels-first entrance!",
                    "Sugar rush combo!"
                ],
                "weaknessTag": "Too flashy for my own good?"
            },
            {
                "name": "PERFECT DEFENSE",
                "type": "Q-GEAR - Aura of Motherly Love",
                "runway": "A shimmering bubble weave made from decades of emotional labor turned super-shield.",
                "growth": 0,
                "shade": 0,
                "powerTags": [
                    "I shield who I love",
                    "Not today, hatred!",
                    "My drag babies come first"
                ],
                "weaknessTag": "Can I protect myself too?"
            }
        ],
        "realnessThemes": [
            {
                "name": "THE LAST CEREAL KILLER CLOWN QUEEN ON EARTH™️",
                "type": "PERSONALITY / OCCUPATION",
                "runway": "This city forgot where its heart came from… but Luxy remembers every spilled milkshake, every late-night makeup meltdown before dawn shows.",
                "crack": 0,
                "powerTags": [
                    "Catchphrase saves lives",
                    "Legendary name recognition",
                    "Only one left means pressure..."
                ],
                "weaknessTag": "Am I truly alone now?"
            }
        ],
        "currentStatuses": [],
        "storyTags": [
            {
                "name": "Echoes Under Static",
                "ongoing": true,
                "description": "Can be used once to hear a true memory in corrupted spaces"
            }
        ],
        "burntTags": [],
        "notes": "Balance: 3 Rainbow Themes, 1 Realness Theme."
    };
    
    console.log('🧪 Test data prepared, calling loadCharacter...');
    loadCharacter(luxyData);
}

// ================================
// INITIALIZATION (ORIGINAL)
// ================================

/*
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌈 QUEERZ! Player App Starting...');
    
    // Initialize UI event listeners
    initializeEventListeners();
    
    // Load saved character library from localStorage
    loadCharacterLibrary();
    
    // Try to initialize Firebase
    initializeFirebase();
    
    // Load last used character if available
    loadLastCharacter();
});
*/

// ================================
// EVENT LISTENERS
// ================================

function initializeEventListeners() {
    // Character Selection
    document.getElementById('characterSelect').addEventListener('change', handleCharacterSelect);
    
    // File Upload
    document.getElementById('characterUpload').addEventListener('change', handleFileUpload);
    
    // Portrait Toggle
    document.getElementById('portraitToggle').addEventListener('click', togglePortrait);
    
    // Save Character
    document.getElementById('saveCharBtn').addEventListener('click', saveCurrentCharacter);
    
    // Dice Roller
    document.getElementById('rollBtn').addEventListener('click', rollDice);
    
    // Juice Tracker
    document.getElementById('juiceUp').addEventListener('click', () => adjustJuice(1));
    document.getElementById('juiceDown').addEventListener('click', () => adjustJuice(-1));
    
    // Status Management
    document.getElementById('addStatusBtn').addEventListener('click', addStatus);
    
    // Story Tags
    document.getElementById('addStoryBtn').addEventListener('click', addStoryTag);
    
    // Burnt Tags Recovery
    document.getElementById('recoverBtn').addEventListener('click', recoverAllTags);
    
    // Tag Combos
    document.getElementById('addComboBtn').addEventListener('click', addCombo);
    document.getElementById('clearCombosBtn').addEventListener('click', clearAllCombos);
    
    // Core Moves Toggle
    document.getElementById('toggleMovesBtn').addEventListener('click', toggleMoves);
    
    // Track box clicking for Growth/Shade/Crack
    initializeTrackBoxListeners();
}

function initializeTrackBoxListeners() {
    // Add click listeners to all track boxes
    document.querySelectorAll('.track-box').forEach(box => {
        box.addEventListener('click', function() {
            this.classList.toggle('filled');
            saveCurrentCharacter();
        });
    });
}

// ================================
// CHARACTER DATA MANAGEMENT
// ================================

function loadCharacterLibrary() {
    const saved = localStorage.getItem('queerz_character_library');
    if (saved) {
        try {
            characterLibrary = JSON.parse(saved);
            updateCharacterDropdown();
            console.log('✅ Loaded character library:', Object.keys(characterLibrary));
        } catch (error) {
            console.error('❌ Error loading character library:', error);
        }
    }
}

function saveCharacterLibrary() {
    localStorage.setItem('queerz_character_library', JSON.stringify(characterLibrary));
    console.log('💾 Character library saved');
}

function loadLastCharacter() {
    const lastCharName = localStorage.getItem('queerz_last_character');
    if (lastCharName && characterLibrary[lastCharName]) {
        loadCharacter(characterLibrary[lastCharName]);
    }
}

function updateCharacterDropdown() {
    const select = document.getElementById('characterSelect');
    select.innerHTML = '<option value="">Load Character...</option>';
    
    Object.keys(characterLibrary).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    });
}

// ================================
// CHARACTER LOADING
// ================================

function handleCharacterSelect(event) {
    const charName = event.target.value;
    if (charName && characterLibrary[charName]) {
        loadCharacter(characterLibrary[charName]);
    }
}

function handleFileUpload(event) {
    console.log('=== FILE UPLOAD STARTED ===');
    const file = event.target.files[0];
    
    if (!file) {
        console.log('❌ No file selected');
        return;
    }
    
    console.log('📄 File selected:', file.name);
    console.log('📄 File size:', file.size, 'bytes');
    console.log('📄 File type:', file.type);
    
    const reader = new FileReader();
    
    reader.onerror = function(error) {
        console.error('❌ FileReader error:', error);
        alert('Error reading file. Please try again.');
    };
    
    reader.onload = function(e) {
        console.log('📖 File read successfully');
        console.log('📖 Content length:', e.target.result.length);
        
        try {
            console.log('🔍 Attempting to parse JSON...');
            const data = JSON.parse(e.target.result);
            console.log('✅ JSON parsed successfully!');
            console.log('📋 Character data:', data);
            
            // Validate required fields
            if (!data.name) {
                throw new Error('Character data missing "name" field');
            }
            
            console.log('✅ Character name found:', data.name);
            console.log('🌈 Rainbow themes:', data.rainbowThemes?.length || 0);
            console.log('💼 Realness themes:', data.realnessThemes?.length || 0);
            
            // Load the character
            console.log('📥 Loading character into app...');
            loadCharacter(data);
            
            // Add to library
            if (data.name) {
                characterLibrary[data.name] = data;
                saveCharacterLibrary();
                updateCharacterDropdown();
                console.log('💾 Character saved to library');
            }
            
            alert(`✅ Character "${data.name}" loaded successfully!`);
            console.log('=== FILE UPLOAD COMPLETE ===');
            
        } catch (error) {
            console.error('❌ Error during JSON processing:');
            console.error('Error type:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Raw file content (first 200 chars):', e.target.result.substring(0, 200));
            alert(`Error loading character file:\n\n${error.message}\n\nCheck browser console (F12) for details.`);
        }
    };
    
    console.log('📖 Starting to read file...');
    reader.readAsText(file);
}

function loadCharacter(charData) {
    console.log('=== LOAD CHARACTER STARTED ===');
    console.log('📋 Character data received:', charData);
    console.log('📋 Character name:', charData.name);
    
    if (!charData || !charData.name) {
        console.error('❌ Invalid character data - missing name');
        alert('Invalid character data: missing name field');
        return;
    }
    
    currentCharacter = charData;
    console.log('✅ Set currentCharacter');
    
    // Save as last used character
    localStorage.setItem('queerz_last_character', charData.name);
    console.log('💾 Saved to localStorage');
    
    // Update portrait and basic info
    try {
        console.log('🖼️ Updating portrait...');
        updatePortrait();
        console.log('✅ Portrait updated');
    } catch (error) {
        console.error('❌ Error updating portrait:', error);
    }
    
    try {
        console.log('📝 Updating character name and pronouns...');
        const nameEl = document.getElementById('characterName');
        const pronounsEl = document.getElementById('characterPronouns');
        
        if (nameEl) {
            nameEl.textContent = charData.name || 'Unknown Character';
            console.log('✅ Name set to:', nameEl.textContent);
        } else {
            console.error('❌ characterName element not found');
        }
        
        if (pronounsEl) {
            pronounsEl.textContent = charData.pronouns || '';
            console.log('✅ Pronouns set to:', pronounsEl.textContent);
        } else {
            console.error('❌ characterPronouns element not found');
        }
    } catch (error) {
        console.error('❌ Error updating basic info:', error);
    }
    
    // Load themes
    try {
        console.log('🌈 Loading themes...');
        loadThemes(charData);
        console.log('✅ Themes loaded');
    } catch (error) {
        console.error('❌ Error loading themes:', error);
    }
    
    // Load juice
    try {
        console.log('✨ Setting juice...');
        const juiceEl = document.getElementById('juiceCount');
        if (juiceEl) {
            juiceEl.textContent = charData.juice || 0;
            console.log('✅ Juice set to:', juiceEl.textContent);
        }
    } catch (error) {
        console.error('❌ Error setting juice:', error);
    }
    
    // Load statuses
    try {
        console.log('📊 Loading statuses...');
        loadStatuses(charData.currentStatuses || []);
        console.log('✅ Statuses loaded');
    } catch (error) {
        console.error('❌ Error loading statuses:', error);
    }
    
    // Load story tags
    try {
        console.log('🏷️ Loading story tags...');
        loadStoryTags(charData.storyTags || []);
        console.log('✅ Story tags loaded');
    } catch (error) {
        console.error('❌ Error loading story tags:', error);
    }
    
    // Load burnt tags
    try {
        console.log('🔥 Loading burnt tags...');
        loadBurntTags(charData.burntTags || []);
        console.log('✅ Burnt tags loaded');
    } catch (error) {
        console.error('❌ Error loading burnt tags:', error);
    }
    
    // Load tag combos
    try {
        console.log('🎯 Loading tag combos...');
        tagCombos = charData.tagCombos || [];
        renderCombos();
        console.log('✅ Tag combos loaded');
    } catch (error) {
        console.error('❌ Error loading tag combos:', error);
    }
    
    console.log('✅✅✅ CHARACTER LOADED SUCCESSFULLY ✅✅✅');
    console.log('=== LOAD CHARACTER COMPLETE ===');
}

function loadThemes(charData) {
    // Load Rainbow Themes (0, 1, 2)
    const rainbowThemes = charData.rainbowThemes || [];
    for (let i = 0; i < 3; i++) {
        const themeCard = document.getElementById(`theme${i}`);
        if (rainbowThemes[i]) {
            populateThemeCard(themeCard, rainbowThemes[i], 'rainbow');
        } else {
            clearThemeCard(themeCard);
        }
    }
    
    // Load Realness Theme (3)
    const realnessThemes = charData.realnessThemes || [];
    const realnessCard = document.getElementById('theme3');
    if (realnessThemes[0]) {
        populateThemeCard(realnessCard, realnessThemes[0], 'realness');
    } else {
        clearThemeCard(realnessCard);
    }
}

function populateThemeCard(card, themeData, type) {
    // Update theme name
    card.querySelector('.theme-name').textContent = themeData.name || 'Unnamed Theme';
    
    // Update theme type label
    card.querySelector('.theme-type').textContent = themeData.type || 'THEME';
    
    // Update runway quote
    card.querySelector('.runway-quote em').textContent = themeData.runway || 'No quote set';
    
    // Update power tags - MAKE THEM CLICKABLE
    const tagList = card.querySelector('.power-tags .tag-list');
    tagList.innerHTML = '';
    if (themeData.powerTags) {
        themeData.powerTags.forEach((tag, index) => {
            const li = document.createElement('li');
            li.textContent = tag;
            li.classList.add('burnable-tag');
            li.dataset.tag = tag;
            li.dataset.type = 'power';
            li.dataset.themeIndex = card.id.replace('theme', '');
            li.dataset.tagIndex = index;
            
            // Click to burn
            li.addEventListener('click', function() {
                burnThemeTag(this);
            });
            
            tagList.appendChild(li);
        });
    }
    
    // Update weakness tag - MAKE IT CLICKABLE
    const weaknessText = card.querySelector('.weakness-text');
    weaknessText.textContent = themeData.weaknessTag || 'No weakness tag set';
    weaknessText.classList.add('burnable-tag', 'weakness-burnable');
    weaknessText.dataset.tag = themeData.weaknessTag;
    weaknessText.dataset.type = 'weakness';
    weaknessText.dataset.themeIndex = card.id.replace('theme', '');
    
    // Click to burn
    weaknessText.addEventListener('click', function() {
        burnThemeTag(this);
    });
    
    // Update Growth/Shade/Crack tracks
    if (type === 'rainbow') {
        updateTrack(card.querySelector('.growth-track .track-boxes'), themeData.growth || 0);
        updateTrack(card.querySelector('.shade-track .track-boxes'), themeData.shade || 0);
    } else if (type === 'realness') {
        updateTrack(card.querySelector('.crack-track .track-boxes'), themeData.crack || 0);
    }
}

function updateTrack(trackContainer, filledCount) {
    const boxes = trackContainer.querySelectorAll('.track-box');
    boxes.forEach((box, index) => {
        if (index < filledCount) {
            box.classList.add('filled');
        } else {
            box.classList.remove('filled');
        }
    });
}

function clearThemeCard(card) {
    card.querySelector('.theme-name').textContent = 'No Theme';
    card.querySelector('.runway-quote em').textContent = '';
    card.querySelector('.power-tags .tag-list').innerHTML = '';
    card.querySelector('.weakness-text').textContent = '';
}

// ================================
// PORTRAIT MANAGEMENT
// ================================

function updatePortrait() {
    const portraitImg = document.getElementById('characterPortrait');
    
    if (!currentCharacter) {
        portraitImg.src = '';
        return;
    }
    
    // Determine which portrait to show
    let portraitPath;
    if (usingStreerwearPortrait) {
        portraitPath = currentCharacter.streetwearPortrait || currentCharacter.portrait || '';
    } else {
        portraitPath = currentCharacter.qfactorPortrait || currentCharacter.portrait || '';
    }
    
    // Handle both local paths and URLs
    if (portraitPath.startsWith('http')) {
        portraitImg.src = portraitPath;
    } else if (portraitPath.startsWith('/')) {
        // Assume it's a GitHub path
        portraitImg.src = `https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main${portraitPath}`;
    } else {
        portraitImg.src = portraitPath;
    }
    
    console.log('🖼️ Portrait updated:', portraitImg.src);
}

function togglePortrait() {
    usingStreerwearPortrait = !usingStreerwearPortrait;
    updatePortrait();
    
    const btn = document.getElementById('portraitToggle');
    btn.textContent = usingStreerwearPortrait ? 'Switch to Q-Factor' : 'Switch to Streetwear';
}

// ================================
// THEME TAG BURNING & POWER CALCULATION
// ================================

function burnThemeTag(element) {
    const tag = element.dataset.tag;
    const type = element.dataset.type;
    
    console.log(`🔥 Burning ${type} tag:`, tag);
    
    // Visual feedback
    element.style.opacity = '0.3';
    element.style.textDecoration = 'line-through';
    element.classList.add('burnt');
    
    // Add to appropriate tracking array
    if (type === 'power') {
        if (!activePowerTags.includes(tag)) {
            activePowerTags.push(tag);
            console.log('➕ Added to active power tags');
        }
    } else if (type === 'weakness') {
        if (!activeWeaknessTags.includes(tag)) {
            activeWeaknessTags.push(tag);
            console.log('➖ Added to active weakness tags');
        }
    }
    
    // Update power display
    updatePowerCalculation();
    
    // Disable further clicks
    element.style.cursor = 'not-allowed';
    element.onclick = null;
}

function updatePowerCalculation() {
    // Calculate total power modifier
    let totalPower = 0;
    
    // Add power from burnt power tags (+1 each)
    totalPower += activePowerTags.length;
    
    // Subtract power from burnt weakness tags (-1 each)
    totalPower -= activeWeaknessTags.length;
    
    // Subtract power from negative status tags
    totalPower -= activeStatusTags.length;
    
    // Update display
    const powerInput = document.getElementById('totalPower');
    if (powerInput) {
        powerInput.value = totalPower;
    }
    
    // Update power breakdown display
    updatePowerBreakdown();
    
    console.log('⚡ Total Power:', totalPower);
    console.log('  Power Tags:', activePowerTags.length);
    console.log('  Weakness Tags:', -activeWeaknessTags.length);
    console.log('  Status Tags:', -activeStatusTags.length);
}

function updatePowerBreakdown() {
    // Find or create power breakdown element
    let breakdown = document.getElementById('powerBreakdown');
    if (!breakdown) {
        breakdown = document.createElement('div');
        breakdown.id = 'powerBreakdown';
        breakdown.className = 'power-breakdown';
        
        const powerDisplay = document.querySelector('.power-display');
        if (powerDisplay) {
            powerDisplay.appendChild(breakdown);
        }
    }
    
    // Build breakdown text
    let parts = [];
    if (activePowerTags.length > 0) {
        parts.push(`+${activePowerTags.length} Power Tags`);
    }
    if (activeWeaknessTags.length > 0) {
        parts.push(`-${activeWeaknessTags.length} Weakness Tags`);
    }
    if (activeStatusTags.length > 0) {
        parts.push(`-${activeStatusTags.length} Status Tags`);
    }
    
    breakdown.textContent = parts.length > 0 ? parts.join(', ') : '';
}

function clearAllBurntTags() {
    // Reset arrays
    activePowerTags = [];
    activeWeaknessTags = [];
    activeStatusTags = [];
    
    // Reset visual state of all tags
    document.querySelectorAll('.burnable-tag.burnt').forEach(tag => {
        tag.style.opacity = '1';
        tag.style.textDecoration = 'none';
        tag.classList.remove('burnt');
        tag.style.cursor = 'pointer';
        
        // Re-enable clicking
        if (tag.dataset.type === 'power' || tag.dataset.type === 'weakness') {
            tag.addEventListener('click', function() {
                burnThemeTag(this);
            });
        }
    });
    
    // Update power
    updatePowerCalculation();
    
    console.log('🔄 All burnt tags cleared');
}

// ================================
// DICE ROLLING (UPDATED)
// ================================

function rollDice() {
    const power = parseInt(document.getElementById('totalPower').value) || 0;
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2 + power;
    
    const resultDiv = document.getElementById('rollResult');
    
    let resultText = `🎲 ${die1} + ${die2}`;
    if (power !== 0) {
        resultText += ` ${power >= 0 ? '+' : ''}${power}`;
    }
    resultText += ` = ${total}`;
    
    // Add result interpretation
    let interpretation = '';
    if (total >= 10) {
        interpretation = ' ✨ FULL SUCCESS!';
        resultDiv.style.color = '#4CAF50';
    } else if (total >= 7) {
        interpretation = ' ⚡ PARTIAL SUCCESS';
        resultDiv.style.color = '#F4D35E';
    } else {
        interpretation = ' 💔 MISS';
        resultDiv.style.color = '#E89B9B';
    }
    
    resultDiv.textContent = resultText + interpretation;
    
    // Animate result
    resultDiv.style.transform = 'scale(1.1)';
    setTimeout(() => {
        resultDiv.style.transform = 'scale(1)';
    }, 300);
}

// ================================
// JUICE MANAGEMENT
// ================================

function adjustJuice(amount) {
    if (!currentCharacter) return;
    
    const juiceCountEl = document.getElementById('juiceCount');
    let currentJuice = parseInt(juiceCountEl.textContent) || 0;
    currentJuice = Math.max(0, currentJuice + amount);
    juiceCountEl.textContent = currentJuice;
    
    if (currentCharacter) {
        currentCharacter.juice = currentJuice;
        saveCurrentCharacter();
    }
}

// ================================
// STATUS MANAGEMENT
// ================================

function loadStatuses(statuses) {
    const statusList = document.getElementById('statusList');
    statusList.innerHTML = '';
    
    statuses.forEach(status => {
        addStatusPill(status);
    });
}

function addStatus() {
    const name = document.getElementById('statusName').value.trim();
    const tier = parseInt(document.getElementById('statusTier').value) || 1;
    const type = document.getElementById('statusType').value;
    
    if (!name) return;
    
    const status = {
        name: name,
        tier: tier,
        beneficial: type === 'positive'
    };
    
    addStatusPill(status);
    
    // Save to current character
    if (currentCharacter) {
        if (!currentCharacter.currentStatuses) {
            currentCharacter.currentStatuses = [];
        }
        currentCharacter.currentStatuses.push(status);
        saveCurrentCharacter();
    }
    
    // Clear inputs
    document.getElementById('statusName').value = '';
    document.getElementById('statusTier').value = '1';
}

function addStatusPill(status) {
    const statusList = document.getElementById('statusList');
    const pill = document.createElement('div');
    pill.className = `tag-pill ${status.beneficial ? 'positive' : 'negative'}`;
    pill.dataset.statusName = status.name;
    pill.dataset.statusTier = status.tier;
    pill.dataset.beneficial = status.beneficial;
    
    pill.innerHTML = `
        ${status.name}-${status.tier}
        <button class="remove-btn" onclick="removeStatus(this)">×</button>
    `;
    statusList.appendChild(pill);
    
    // If negative status, add to power calculation
    if (!status.beneficial) {
        for (let i = 0; i < status.tier; i++) {
            activeStatusTags.push(`${status.name}-${i+1}`);
        }
        updatePowerCalculation();
    }
}

function removeStatus(btn) {
    const pill = btn.parentElement;
    const statusText = pill.textContent.replace('×', '').trim();
    
    // Remove from power calculation if negative
    const beneficial = pill.dataset.beneficial === 'true';
    if (!beneficial) {
        const tier = parseInt(pill.dataset.statusTier) || 1;
        const name = pill.dataset.statusName;
        
        // Remove from activeStatusTags
        for (let i = 0; i < tier; i++) {
            const tagToRemove = `${name}-${i+1}`;
            const index = activeStatusTags.indexOf(tagToRemove);
            if (index > -1) {
                activeStatusTags.splice(index, 1);
            }
        }
        updatePowerCalculation();
    }
    
    pill.remove();
    
    // Remove from current character
    if (currentCharacter && currentCharacter.currentStatuses) {
        currentCharacter.currentStatuses = currentCharacter.currentStatuses.filter(s => {
            return `${s.name}-${s.tier}` !== statusText;
        });
        saveCurrentCharacter();
    }
}

// ================================
// STORY TAGS MANAGEMENT
// ================================

function loadStoryTags(tags) {
    const tagList = document.getElementById('storyTagList');
    tagList.innerHTML = '';
    
    tags.forEach(tag => {
        addStoryTagPill(tag);
    });
}

function addStoryTag() {
    const name = document.getElementById('storyTagName').value.trim();
    const ongoing = document.getElementById('storyOngoing').checked;
    
    if (!name) return;
    
    const tag = { name: name, ongoing: ongoing };
    addStoryTagPill(tag);
    
    // Save to current character
    if (currentCharacter) {
        if (!currentCharacter.storyTags) {
            currentCharacter.storyTags = [];
        }
        currentCharacter.storyTags.push(tag);
        saveCurrentCharacter();
    }
    
    // Clear inputs
    document.getElementById('storyTagName').value = '';
    document.getElementById('storyOngoing').checked = false;
}

function addStoryTagPill(tag) {
    const tagList = document.getElementById('storyTagList');
    const pill = document.createElement('div');
    pill.className = 'tag-pill';
    pill.innerHTML = `
        ${tag.name}${tag.ongoing ? ' (Ongoing)' : ''}
        <button class="remove-btn" onclick="burnTag(this)">🔥</button>
    `;
    tagList.appendChild(pill);
}

function burnTag(btn) {
    const pill = btn.parentElement;
    const tagText = pill.textContent.replace('🔥', '').trim();
    
    // Move to burnt tags
    if (currentCharacter) {
        if (!currentCharacter.burntTags) {
            currentCharacter.burntTags = [];
        }
        currentCharacter.burntTags.push(tagText);
        
        // Remove from story tags
        if (currentCharacter.storyTags) {
            currentCharacter.storyTags = currentCharacter.storyTags.filter(t => {
                const fullName = t.name + (t.ongoing ? ' (Ongoing)' : '');
                return fullName !== tagText;
            });
        }
        
        saveCurrentCharacter();
        loadStoryTags(currentCharacter.storyTags || []);
        loadBurntTags(currentCharacter.burntTags || []);
    }
}

// ================================
// BURNT TAGS MANAGEMENT
// ================================

function loadBurntTags(tags) {
    const tagList = document.getElementById('burntTagList');
    tagList.innerHTML = '';
    
    tags.forEach(tag => {
        const pill = document.createElement('div');
        pill.className = 'tag-pill';
        pill.style.opacity = '0.6';
        pill.textContent = tag;
        tagList.appendChild(pill);
    });
}

function recoverAllTags() {
    if (!currentCharacter) return;
    
    // Recover burnt story tags
    if (currentCharacter.burntTags && currentCharacter.burntTags.length > 0) {
        // Move all burnt tags back to story tags
        currentCharacter.burntTags.forEach(tag => {
            currentCharacter.storyTags.push({ name: tag, ongoing: false });
        });
        currentCharacter.burntTags = [];
        
        loadStoryTags(currentCharacter.storyTags || []);
        loadBurntTags([]);
    }
    
    // Clear all burnt theme tags (power and weakness)
    clearAllBurntTags();
    
    saveCurrentCharacter();
    
    alert('✨ All burnt tags recovered!');
}

// ================================
// SAVE CURRENT CHARACTER
// ================================

function saveCurrentCharacter() {
    if (!currentCharacter) return;
    
    // Update character library
    characterLibrary[currentCharacter.name] = currentCharacter;
    saveCharacterLibrary();
    
    console.log('💾 Current character saved:', currentCharacter.name);
}

// ================================
// FIREBASE INTEGRATION
// ================================

function initializeFirebase() {
    // Check if Firebase config is loaded

    try {
        // Firebase initialization will be handled by firebase-config
        // js
        console.log('🔥 Firebase initialization starting...');
        
        // Listen for Firebase ready event
        window.addEventListener('firebaseReady', (event) => {
            db = event.detail.db;
            realtimeDb = event.detail.realtimeDb;
            firebaseInitialized = true;
            
            console.log('✅ Firebase connected!');
            document.getElementById('syncBadge').textContent = '● Online';
            document.getElementById('syncBadge').classList.remove('offline');
            document.getElementById('syncBadge').classList.add('online');
            
            // Start listening for MC broadcasts
            listenForMCBroadcasts();
        });
        
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
    }
}

function listenForMCBroadcasts() {
    if (!realtimeDb) {
        console.log('⚠️ Realtime database not available');
        return;
    }
    
    // Listen for scene updates
    const sceneRef = realtimeDb.ref('mcBroadcast/currentScene');
    sceneRef.on('value', (snapshot) => {
        const sceneData = snapshot.val();
        if (sceneData) {
            document.getElementById('sceneInfo').textContent = sceneData.name || 'Unknown Scene';
            console.log('📍 Scene updated:', sceneData.name);
        }
    });
    
    // Listen for music updates
    const musicRef = realtimeDb.ref('mcBroadcast/currentMusic');
    musicRef.on('value', (snapshot) => {
        const musicData = snapshot.val();
        if (musicData) {
            document.getElementById('musicInfo').textContent = musicData.name || 'Unknown Track';
            console.log('🎵 Music updated:', musicData.name);
        }
    });
    
    // Listen for spotlight updates
    const spotlightRef = realtimeDb.ref('mcBroadcast/activeCharacter');
    spotlightRef.on('value', (snapshot) => {
        const charData = snapshot.val();
        if (charData) {
            document.getElementById('spotlightInfo').textContent = charData.name || 'Unknown Character';
            console.log('✨ Spotlight updated:', charData.name);
        }
    });
    
    console.log('👂 Listening for MC broadcasts...');
}

// ================================
// TAG COMBOS MANAGEMENT
// ================================

let tagCombos = [];

function addCombo() {
    const name = document.getElementById('comboName').value.trim();
    const tag1 = document.getElementById('comboTag1').value.trim();
    const tag2 = document.getElementById('comboTag2').value.trim();
    const tag3 = document.getElementById('comboTag3').value.trim();
    const power = parseInt(document.getElementById('comboPower').value) || 2;
    const move = document.getElementById('comboMove').value;
    
    if (!name || !tag1 || !tag2) {
        alert('Please enter combo name and at least 2 tags');
        return;
    }
    
    const combo = {
        name: name,
        tags: [tag1, tag2],
        power: power,
        move: move || 'Any'
    };
    
    if (tag3) {
        combo.tags.push(tag3);
    }
    
    tagCombos.push(combo);
    renderCombos();
    
    // Save to character
    if (currentCharacter) {
        currentCharacter.tagCombos = tagCombos;
        saveCurrentCharacter();
    }
    
    // Clear inputs
    document.getElementById('comboName').value = '';
    document.getElementById('comboTag1').value = '';
    document.getElementById('comboTag2').value = '';
    document.getElementById('comboTag3').value = '';
    document.getElementById('comboPower').value = '2';
    document.getElementById('comboMove').value = '';
    
    console.log('✅ Combo added:', combo);
}

function renderCombos() {
    const comboList = document.getElementById('comboList');
    comboList.innerHTML = '';
    
    if (tagCombos.length === 0) {
        comboList.innerHTML = '<p style="color: rgba(255,255,255,0.5); text-align: center; padding: 20px;">No combos created yet</p>';
        return;
    }
    
    tagCombos.forEach((combo, index) => {
        const comboCard = document.createElement('div');
        comboCard.className = 'combo-card';
        comboCard.innerHTML = `
            <div class="combo-header">
                <h4 class="combo-name">${combo.name}</h4>
                <button class="combo-remove-btn" onclick="removeCombo(${index})">×</button>
            </div>
            <div class="combo-tags">
                ${combo.tags.map(tag => `<span class="combo-tag-pill">${tag}</span>`).join(' + ')}
            </div>
            <div class="combo-details">
                <span class="combo-power">⚡ +${combo.power} Power</span>
                <span class="combo-move">📖 ${combo.move}</span>
            </div>
        `;
        comboList.appendChild(comboCard);
    });
}

function removeCombo(index) {
    tagCombos.splice(index, 1);
    renderCombos();
    
    if (currentCharacter) {
        currentCharacter.tagCombos = tagCombos;
        saveCurrentCharacter();
    }
}

function clearAllCombos() {
    if (confirm('Clear all tag combos?')) {
        tagCombos = [];
        renderCombos();
        
        if (currentCharacter) {
            currentCharacter.tagCombos = [];
            saveCurrentCharacter();
        }
    }
}

// ================================
// CORE MOVES TOGGLE
// ================================

function toggleMoves() {
    const panel = document.getElementById('movesPanel');
    panel.classList.toggle('hidden');
}

// ================================
// UTILITY FUNCTIONS
// ================================

// Make functions available globally for onclick handlers
window.removeStatus = removeStatus;
window.burnTag = burnTag;
window.removeCombo = removeCombo;

console.log('✅ Player App JavaScript loaded');