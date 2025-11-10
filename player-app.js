// ================================
// QUEERZ! PLAYER COMPANION APP
// Main JavaScript
// ================================

// Global State
let currentCharacter = null;
let characterLibrary = {};
let usingStreerwearPortrait = true;
let firebaseInitialized = false;
let selectedMove = null; // Track which core move is selected
let cloudSyncEnabled = false;
let cloudSyncInitialized = false;

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
    
    console.log('✅ App initialization complete!');
});

// ================================

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
    document.getElementById('resetBtn').addEventListener('click', resetDice);
    
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
    
    // Move Icon Selection
    initializeMoveIconListeners();
    
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
// Initialize cloud sync if enabled
async function initializeCloudSync() {
    // Check if cloud sync was enabled before
    const cloudEnabled = localStorage.getItem('queerz_cloud_sync_enabled');
    if (cloudEnabled === 'true') {
        cloudSyncEnabled = true;
        updateCloudToggleUI();
        
        // Initialize auth
        if (window.initializeAuth) {
            const success = await window.initializeAuth();
            if (success) {
                cloudSyncInitialized = true;
                console.log('✅ Cloud sync initialized and ready!');
                
                // Try to load characters from cloud
                await syncFromCloud();
            }
        }
    }
}

// Toggle cloud sync on/off
async function toggleCloudSync() {
    cloudSyncEnabled = !cloudSyncEnabled;
    localStorage.setItem('queerz_cloud_sync_enabled', cloudSyncEnabled.toString());
    updateCloudToggleUI();
    
    if (cloudSyncEnabled) {
        console.log('☁️ Enabling cloud sync...');
        
        // Initialize auth if not already done
        if (!cloudSyncInitialized && window.initializeAuth) {
            const success = await window.initializeAuth();
            if (success) {
                cloudSyncInitialized = true;
                console.log('✅ Cloud sync enabled!');
                
                // Upload current localStorage characters to cloud
                await syncToCloud();
            } else {
                console.error('❌ Failed to enable cloud sync');
                cloudSyncEnabled = false;
                localStorage.setItem('queerz_cloud_sync_enabled', 'false');
                updateCloudToggleUI();
                alert('Failed to enable cloud sync. Please check your internet connection.');
            }
        } else {
            await syncToCloud();
        }
    } else {
        console.log('ℹ️ Cloud sync disabled - using local storage only');
        alert('Cloud sync disabled. Characters will only be saved locally.');
    }
}

// Update cloud toggle button appearance
function updateCloudToggleUI() {
    const toggleBtn = document.getElementById('cloudSyncToggle');
    if (toggleBtn) {
        if (cloudSyncEnabled) {
            toggleBtn.textContent = '☁️ Cloud: ON';
            toggleBtn.classList.add('cloud-enabled');
            toggleBtn.classList.remove('cloud-disabled');
        } else {
            toggleBtn.textContent = '☁️ Cloud: OFF';
            toggleBtn.classList.add('cloud-disabled');
            toggleBtn.classList.remove('cloud-enabled');
        }
    }
}

// Sync characters FROM cloud TO localStorage
async function syncFromCloud() {
    if (!cloudSyncEnabled || !window.loadCharactersFromCloud) {
        return;
    }
    
    console.log('⬇️ Syncing from cloud...');
    const cloudCharacters = await window.loadCharactersFromCloud();
    
    if (cloudCharacters) {
        // Merge with local characters (cloud takes precedence for newer versions)
        Object.keys(cloudCharacters).forEach(name => {
            const cloudChar = cloudCharacters[name];
            const localChar = characterLibrary[name];
            
            // Use cloud version if it's newer or if local doesn't exist
            if (!localChar || (cloudChar.lastModified && (!localChar.lastModified || cloudChar.lastModified > localChar.lastModified))) {
                characterLibrary[name] = cloudChar;
                console.log('⬇️ Synced from cloud:', name);
            }
        });
        
        // Save merged library to localStorage
        saveCharacterLibrary();
        updateCharacterDropdown();
        
        console.log('✅ Sync from cloud complete!');
        return true;
    }
    
    return false;
}

// Sync characters FROM localStorage TO cloud
async function syncToCloud() {
    if (!cloudSyncEnabled || !window.saveCharacterToCloud) {
        return;
    }
    
    console.log('⬆️ Syncing to cloud...');
    let successCount = 0;
    
    for (const name in characterLibrary) {
        const character = characterLibrary[name];
        // Add lastModified if not present
        if (!character.lastModified) {
            character.lastModified = Date.now();
        }
        
        const success = await window.saveCharacterToCloud(character);
        if (success) {
            successCount++;
        }
    }
    
    console.log(`✅ Synced ${successCount} characters to cloud`);
    
    // Also save last character to cloud
    const lastCharName = localStorage.getItem('queerz_last_character');
    if (lastCharName && window.saveLastCharacterToCloud) {
        await window.saveLastCharacterToCloud(lastCharName);
    }
    
    return successCount > 0;
}

// ================================
// MOVE ICON SELECTION
// ================================

function initializeMoveIconListeners() {
    // Add click listeners to all move icons
    document.querySelectorAll('.move-icon').forEach(icon => {
        icon.addEventListener('click', function() {
            // Remove selection from all icons
            document.querySelectorAll('.move-icon').forEach(i => i.classList.remove('selected'));
            
            // Add selection to clicked icon
            this.classList.add('selected');
            
            // Store selected move
            selectedMove = this.dataset.move;
            console.log('✅ Move selected:', selectedMove);
        });
    });
    console.log('✅ Move icon listeners initialized');
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
    
    // Send character to MC App via Firebase (two-way sync)
    if (typeof window.sendCharacterToMC === 'function') {
        console.log('📤 Sending character to MC App...');
        window.sendCharacterToMC(charData)
            .then(() => {
                console.log('✅ Character synced to MC App!');
            })
            .catch((error) => {
                console.warn('⚠️ Could not sync character to MC App:', error.message);
            });
    } else {
        console.log('ℹ️ Firebase character sync not available (offline mode)');
    }
    
    console.log('✅✅✅ CHARACTER LOADED SUCCESSFULLY ✅✅✅');
    console.log('=== LOAD CHARACTER COMPLETE ===');
}

function loadThemes(charData) {
    console.log('🎨 Loading themes with FLEXIBLE display...');
    
    // Get all theme card slots
    const themeSlots = ['theme0', 'theme1', 'theme2', 'theme3', 'theme4'];
    
    // Get Rainbow and Realness themes from character data
    const rainbowThemes = charData.rainbowThemes || [];
    const realnessThemes = charData.realnessThemes || [];
    
    console.log(`📊 Character has ${rainbowThemes.length} Rainbow themes, ${realnessThemes.length} Realness themes`);
    
    // Strategy: Fill slots 0-2 with Rainbow themes, slots 3-4 with Realness themes
    
    let slotIndex = 0;
    
    // Load Rainbow themes into first 3 slots (theme0, theme1, theme2)
    for (let i = 0; i < rainbowThemes.length && slotIndex < 3; i++) {
        const themeCard = document.getElementById(themeSlots[slotIndex]);
        if (themeCard) {
            populateThemeCard(themeCard, rainbowThemes[i], 'rainbow');
            themeCard.style.display = 'block'; // Make sure it's visible
            console.log(`✅ Loaded Rainbow theme "${rainbowThemes[i].name}" into slot ${slotIndex}`);
        }
        slotIndex++;
    }
    
    // Hide unused Rainbow slots
    while (slotIndex < 3) {
        const themeCard = document.getElementById(themeSlots[slotIndex]);
        if (themeCard) {
            clearThemeCard(themeCard);
            themeCard.style.display = 'none'; // Hide empty slots
            console.log(`🔒 Hidden empty Rainbow slot ${slotIndex}`);
        }
        slotIndex++;
    }
    
    // Load Realness themes into slots 3 and 4 (up to 2 Realness themes)
    for (let i = 0; i < realnessThemes.length && i < 2; i++) {
        const realnessSlot = 3 + i; // theme3 or theme4
        const realnessCard = document.getElementById(themeSlots[realnessSlot]);
        if (realnessCard && realnessThemes[i]) {
            populateThemeCard(realnessCard, realnessThemes[i], 'realness');
            realnessCard.style.display = 'block';
            console.log(`✅ Loaded Realness theme "${realnessThemes[i].name}" into slot ${realnessSlot}`);
        }
    }
    
    // Hide unused Realness slots
    for (let i = realnessThemes.length; i < 2; i++) {
        const realnessSlot = 3 + i; // theme3 or theme4
        const realnessCard = document.getElementById(themeSlots[realnessSlot]);
        if (realnessCard) {
            clearThemeCard(realnessCard);
            realnessCard.style.display = 'none';
            console.log(`🔒 Hidden empty Realness slot ${realnessSlot}`);
        }
    }
    
    // Warn if there are more themes than available slots
    if (rainbowThemes.length > 3) {
        console.warn(`⚠️ Character has ${rainbowThemes.length} Rainbow themes, but only 3 slots available. Extra themes not displayed.`);
    }
    if (realnessThemes.length > 2) {
        console.warn(`⚠️ Character has ${realnessThemes.length} Realness themes, but only 2 slots available. Extra themes not displayed.`);
    }
    
    console.log('✅ Theme loading complete with flexible display (supports up to 3 Rainbow + 2 Realness)');
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
// BURNT TAGS DISPLAY
// ================================

function updateBurntTagsDisplay() {
    const burntPanel = document.getElementById('burntTagList');
    if (!burntPanel) {
        console.warn('⚠️ burntTagList element not found');
        return;
    }
    
    burntPanel.innerHTML = '';
    
    // Show burnt power tags
    activePowerTags.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'burnt-tag-item power-burnt';
        div.innerHTML = `<span class="tag-icon">🔥</span><span class="tag-text">+1 ${tag}</span>`;
        burntPanel.appendChild(div);
    });
    
    // Show burnt weakness tags  
    activeWeaknessTags.forEach(tag => {
        const div = document.createElement('div');
        div.className = 'burnt-tag-item weakness-burnt';
        div.innerHTML = `<span class="tag-icon">🔥</span><span class="tag-text">-1 ${tag}</span>`;
        burntPanel.appendChild(div);
    });
    
    if (activePowerTags.length === 0 && activeWeaknessTags.length === 0) {
        burntPanel.innerHTML = '<p class="empty-text">No burnt tags yet - click theme tags to burn them!</p>';
    }
    
    console.log('🔥 Burnt tags display updated');
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
    
    // Update burnt tags display
    updateBurntTagsDisplay();
    
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
    
    // Update burnt tags display
    updateBurntTagsDisplay();
    
    console.log('🔄 All burnt tags cleared');
}

// ================================
// DICE ROLLING (UPDATED)
// ================================

function rollDice() {
    // Check if a move is selected
    if (!selectedMove) {
        const resultDiv = document.getElementById('rollResult');
        resultDiv.textContent = '⚠️ Please select a Core Move first!';
        resultDiv.style.color = '#FF6B6B';
        resultDiv.style.transform = 'scale(1.1)';
        setTimeout(() => {
            resultDiv.style.transform = 'scale(1)';
        }, 300);
        return;
    }
    
    const power = parseInt(document.getElementById('totalPower').value) || 0;
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2 + power;
    
    const resultDiv = document.getElementById('rollResult');
    
    // Display which move was used
    const moveName = selectedMove.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    let resultText = `📖 ${moveName}\n🎲 ${die1} + ${die2}`;
    if (power !== 0) {
        resultText += ` ${power >= 0 ? '+' : ''}${power}`;
    }
    resultText += ` = ${total}`;
    
    // Add result interpretation
    let interpretation = '';
    if (total >= 10) {
        interpretation = '\n✨ FULL SUCCESS!';
        resultDiv.style.color = '#4CAF50';
        
        // AUTO-JUICE: Give 3 juice on 10+ roll!
        if (total >= 10) {
    // FULL SUCCESS → +3 Juice
    adjustJuice(3);
    interpretation = '\n✨ FULL SUCCESS! 🌟 +3 JUICE!';
    resultDiv.style.color = '#4CAF50';
    console.log('✨ Full success! Auto-added 3 juice');
} else if (total >= 7) {
    // PARTIAL SUCCESS → +1 Juice
    adjustJuice(1);
    interpretation = '\n⚡ PARTIAL SUCCESS! ⚡ +1 JUICE!';
    resultDiv.style.color = '#F4D35E';
    console.log('⚡ Partial success! Auto-added 1 juice');
} else {
    // MISS → 0 Juice
    interpretation = '\n💔 MISS';
    resultDiv.style.color = '#E89B9B';
    console.log('💔 Miss — no juice awarded');
}

resultDiv.textContent = resultText + interpretation;

// Animate result
resultDiv.style.transform = 'scale(1.1)';
setTimeout(() => {
    resultDiv.style.transform = 'scale(1)';
}, 300);

    // Update combo availability after juice change
    updateComboAvailability();
}

// ================================
// RESET FUNCTION
// ================================

function resetDice() {
    // Clear power
    document.getElementById('totalPower').value = 0;
    
    // Clear result display
    const resultDiv = document.getElementById('rollResult');
    resultDiv.textContent = '';
    resultDiv.style.color = '';
    resultDiv.style.transform = 'scale(1)';
    
    // Clear move selection
    selectedMove = null;
    document.querySelectorAll('.move-icon').forEach(icon => {
        icon.classList.remove('selected');
    });
    
    console.log('🔄 Dice reset complete');
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
    
    // Update combo button states based on new juice amount
    updateComboAvailability();
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
    // Firebase initialization is handled by firebase-config.js module
    // This function kept for compatibility but does nothing
    console.log('ℹ️ Firebase handled by firebase-config.js module');
}

function listenForMCBroadcasts() {
    // Firebase listening is handled by firebase-config.js module
    // This function kept for compatibility but does nothing
    console.log('ℹ️ MC broadcast listening handled by firebase-config.js module');
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
    
    const currentJuice = parseInt(document.getElementById('juiceCount')?.textContent || 0);
    const canAfford = currentJuice >= 3;
    
    tagCombos.forEach((combo, index) => {
        const comboCard = document.createElement('div');
        comboCard.className = 'combo-card';
        comboCard.dataset.comboIndex = index;
        
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
            <button class="combo-use-btn ${canAfford ? '' : 'disabled'}" 
                    onclick="useCombo(${index})"
                    ${canAfford ? '' : 'disabled'}>
                💎 USE COMBO (3 Juice)
            </button>
        `;
        comboList.appendChild(comboCard);
    });
    
    console.log(`✅ Rendered ${tagCombos.length} combos (Juice: ${currentJuice}, Can afford: ${canAfford})`);
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
// COMBO ACTIVATION SYSTEM
// ================================

function useCombo(index) {
    const combo = tagCombos[index];
    if (!combo) return;
    
    const juiceCountEl = document.getElementById('juiceCount');
    const currentJuice = parseInt(juiceCountEl.textContent) || 0;
    
    // Check if player has enough juice
    if (currentJuice < 3) {
        alert('❌ Not enough Juice! You need 3 Juice to use a combo.');
        return;
    }
    
    console.log('🎯 Using combo:', combo.name);
    console.log('📋 Tags to burn:', combo.tags);
    console.log('⚡ Power to add:', combo.power);
    
    // Subtract 3 juice
    adjustJuice(-3);
    console.log('💎 Spent 3 Juice (remaining:', currentJuice - 3, ')');
    
    // Auto-burn all tags in the combo
    let burnedCount = 0;
    combo.tags.forEach(tagName => {
        const burned = burnTagByName(tagName);
        if (burned) {
            burnedCount++;
            console.log('🔥 Auto-burned tag:', tagName);
        } else {
            console.warn('⚠️ Could not burn tag:', tagName, '(might already be burned or not found)');
        }
    });
    
    // Add combo power to total power
    const totalPowerInput = document.getElementById('totalPower');
    const currentPower = parseInt(totalPowerInput.value) || 0;
    totalPowerInput.value = currentPower + combo.power;
    console.log('⚡ Added', combo.power, 'power (total now:', currentPower + combo.power, ')');
    
    // Show success feedback
    const resultDiv = document.getElementById('rollResult');
    resultDiv.textContent = `🎯 COMBO ACTIVATED: ${combo.name}\n🔥 Burned ${burnedCount} tags\n⚡ +${combo.power} Power added\n💎 -3 Juice (${currentJuice - 3} remaining)`;
    resultDiv.style.color = '#A78BFA'; // Purple
    resultDiv.style.transform = 'scale(1.1)';
    setTimeout(() => {
        resultDiv.style.transform = 'scale(1)';
    }, 300);
    
    // Update combo button states
    updateComboAvailability();
    
    console.log('✅ Combo activation complete!');
}

function updateComboAvailability() {
    const currentJuice = parseInt(document.getElementById('juiceCount')?.textContent || 0);
    const canAfford = currentJuice >= 3;
    
    // Update all combo use buttons
    document.querySelectorAll('.combo-use-btn').forEach((btn, index) => {
        if (canAfford) {
            btn.classList.remove('disabled');
            btn.disabled = false;
        } else {
            btn.classList.add('disabled');
            btn.disabled = true;
        }
    });
    
    console.log(`♻️ Updated combo availability (Juice: ${currentJuice}, Can use: ${canAfford})`);
}

function burnTagByName(tagName) {
    // Search through all theme cards for this tag
    const themeCards = document.querySelectorAll('.theme-card');
    
    for (let card of themeCards) {
        // Check power tags
        const powerTags = card.querySelectorAll('.power-tags .burnable-tag');
        for (let tagEl of powerTags) {
            if (tagEl.dataset.tag === tagName && !tagEl.classList.contains('burnt')) {
                // Found it! Burn this tag
                burnThemeTag(tagEl);
                return true;
            }
        }
        
        // Check weakness tag
        const weaknessTag = card.querySelector('.weakness-burnable');
        if (weaknessTag && weaknessTag.dataset.tag === tagName && !weaknessTag.classList.contains('burnt')) {
            // Found it! Burn this weakness tag
            burnThemeTag(weaknessTag);
            return true;
        }
    }
    
    // Tag not found or already burned
    return false;
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
window.useCombo = useCombo;

console.log('✅ Player App JavaScript loaded');
