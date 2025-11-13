// ================================
// QUEERZ! PLAYER COMPANION V2
// Complete Game Mechanics System
// ================================

import {
    saveCharacterToCloud,
    loadCharactersFromCloud,
    broadcastCharacterToMc
} from './firebase-config.js';

// ================================
// CHARACTER DATA STATE
// ================================

let characterData = {
    name: '',
    pronouns: '',
    civilianPortrait: '',
    qfactorPortrait: '',
    currentPortraitMode: 'civilian', // 'civilian' or 'qfactor'
    themeColor: '#4A7C7E',
    juice: 0,
    themes: [
        createEmptyTheme('rainbow'),
        createEmptyTheme('rainbow'),
        createEmptyTheme('rainbow'),
        createEmptyTheme('anchor')
    ],
    currentStatuses: [],
    storyTags: [],
    burntTags: [],
    tagCombos: [],
    selectedMove: null,
    clickedTags: [], // Track clicked tags for current roll
    usedWeakness: false
};

function createEmptyTheme(type = 'rainbow') {
    return {
        type: type, // 'rainbow' or 'anchor'
        name: '',
        quote: '',
        growth: 0,
        shade: 0, // For rainbow themes
        release: 0, // For anchor themes
        powerTags: ['', '', '', '', '', ''], // 6 tags total
        unlockedTags: 3, // Start with 3 unlocked
        weaknessTag: '',
        burntPowerTags: [false, false, false, false, false, false],
        burntWeakness: false
    };
}

// ================================
// THEME MANAGEMENT
// ================================

function initializeThemes() {
    const themeCards = document.querySelectorAll('.theme-card');

    themeCards.forEach((card, index) => {
        const theme = characterData.themes[index];

        // Theme type selector
        const typeSelector = card.querySelector('.theme-type-selector');
        typeSelector.value = theme.type;
        typeSelector.addEventListener('change', () => {
            theme.type = typeSelector.value;
            updateThemeVisuals(card, index);
            saveToCloud();
        });

        // Theme name input
        const nameInput = card.querySelector('.theme-name-input');
        nameInput.value = theme.name;
        nameInput.addEventListener('input', () => {
            theme.name = nameInput.value;
            saveToCloud();
        });

        // Quote input
        const quoteInput = card.querySelector('.runway-quote-input');
        quoteInput.value = theme.quote;
        quoteInput.addEventListener('input', () => {
            theme.quote = quoteInput.value;
            saveToCloud();
        });

        // Track boxes
        setupTrackBoxes(card, index);

        // Power tags
        setupPowerTags(card, index);

        // Weakness tag
        setupWeaknessTag(card, index);

        // Initial visual update
        updateThemeVisuals(card, index);
    });
}

function updateThemeVisuals(card, themeIndex) {
    const theme = characterData.themes[themeIndex];
    card.setAttribute('data-theme-type', theme.type);

    // Show/hide appropriate trackers
    const rainbowTrackers = card.querySelector('.rainbow-trackers');
    const anchorTrackers = card.querySelector('.anchor-trackers');

    if (theme.type === 'rainbow') {
        rainbowTrackers.style.display = 'block';
        anchorTrackers.style.display = 'none';
    } else {
        rainbowTrackers.style.display = 'none';
        anchorTrackers.style.display = 'block';
    }

    updateTrackDisplay(card, themeIndex);
    updateTagUnlockStatus(themeIndex);
}

function setupTrackBoxes(card, themeIndex) {
    const theme = characterData.themes[themeIndex];

    // Growth track (both rainbow and anchor have this)
    const growthBoxes = card.querySelectorAll('.growth-track .track-box');
    growthBoxes.forEach((box, boxIndex) => {
        box.addEventListener('click', () => {
            if (boxIndex < theme.growth) {
                theme.growth = boxIndex;
            } else {
                theme.growth = boxIndex + 1;
            }

            // Check if growth is filled (3/3)
            if (theme.growth === 3) {
                checkGrowthCompletion(themeIndex);
            }

            updateTrackDisplay(card, themeIndex);
            saveToCloud();
        });
    });

    // Shade track (rainbow only)
    const shadeBoxes = card.querySelectorAll('.shade-track .track-box');
    shadeBoxes.forEach((box, boxIndex) => {
        box.addEventListener('click', () => {
            if (boxIndex < theme.shade) {
                theme.shade = boxIndex;
            } else {
                theme.shade = boxIndex + 1;
            }

            // Check if shade is filled (3/3)
            if (theme.shade === 3) {
                alert(`⚠️ ${theme.name || 'This theme'} has faded! All 3 SHADE boxes are filled.\n\nYou must replace it with an Anchor/Realness theme.`);
            }

            updateTrackDisplay(card, themeIndex);
            saveToCloud();
        });
    });

    // Release track (anchor only)
    const releaseBoxes = card.querySelectorAll('.release-track .track-box');
    releaseBoxes.forEach((box, boxIndex) => {
        box.addEventListener('click', () => {
            if (boxIndex < theme.release) {
                theme.release = boxIndex;
            } else {
                theme.release = boxIndex + 1;
            }

            // Check if release is filled (3/3)
            if (theme.release === 3) {
                alert(`⚠️ ${theme.name || 'This theme'} has faded! All 3 RELEASE boxes are filled.\n\nYou must replace it with a Rainbow/Runway theme.`);
            }

            updateTrackDisplay(card, themeIndex);
            saveToCloud();
        });
    });
}

function updateTrackDisplay(card, themeIndex) {
    const theme = characterData.themes[themeIndex];

    // Update growth
    const growthBoxes = card.querySelectorAll('.growth-track .track-box');
    growthBoxes.forEach((box, i) => {
        box.classList.toggle('filled', i < theme.growth);
    });

    // Update shade (rainbow)
    const shadeBoxes = card.querySelectorAll('.shade-track .track-box');
    shadeBoxes.forEach((box, i) => {
        box.classList.toggle('filled', i < theme.shade);
    });

    // Update release (anchor)
    const releaseBoxes = card.querySelectorAll('.release-track .track-box');
    releaseBoxes.forEach((box, i) => {
        box.classList.toggle('filled', i < theme.release);
    });
}

function checkGrowthCompletion(themeIndex) {
    const theme = characterData.themes[themeIndex];

    if (theme.unlockedTags < 6) {
        // Unlock next tag
        theme.unlockedTags++;
        alert(`✨ Growth Complete! You've unlocked tag #${theme.unlockedTags} in ${theme.name || 'this theme'}!`);

        // Reset growth
        theme.growth = 0;

        updateTagUnlockStatus(themeIndex);
    } else {
        // All tags unlocked
        alert(`🌟 All tags unlocked in ${theme.name || 'this theme'}!\n\nYou can now create a new theme with enhanced tags!`);
        theme.growth = 0;
    }
}

function updateTagUnlockStatus(themeIndex) {
    const theme = characterData.themes[themeIndex];
    const card = document.querySelectorAll('.theme-card')[themeIndex];
    const tagItems = card.querySelectorAll('.tag-item');

    tagItems.forEach((item, i) => {
        const input = item.querySelector('.tag-input');
        const burnBtn = item.querySelector('.btn-burn');

        if (i < theme.unlockedTags) {
            item.classList.remove('greyed-tag');
            item.classList.add('unlocked');
            input.disabled = false;
            burnBtn.disabled = false;
        } else {
            item.classList.add('greyed-tag');
            item.classList.remove('unlocked');
            input.disabled = true;
            burnBtn.disabled = true;
        }
    });
}

// ================================
// TAG MANAGEMENT
// ================================

function setupPowerTags(card, themeIndex) {
    const theme = characterData.themes[themeIndex];
    const tagItems = card.querySelectorAll('.tag-item');

    tagItems.forEach((item, tagIndex) => {
        const input = item.querySelector('.tag-input');
        const burnBtn = item.querySelector('.btn-burn');

        // Set initial value
        input.value = theme.powerTags[tagIndex] || '';

        // Update on input (only if unlocked)
        input.addEventListener('input', () => {
            if (tagIndex < theme.unlockedTags) {
                theme.powerTags[tagIndex] = input.value;
                saveToCloud();
            }
        });

        // Click to add to roll
        input.addEventListener('click', () => {
            if (!theme.burntPowerTags[tagIndex] && input.value && tagIndex < theme.unlockedTags) {
                const tagKey = `theme${themeIndex}-power${tagIndex}`;
                if (!characterData.clickedTags.includes(tagKey)) {
                    characterData.clickedTags.push(tagKey);
                    item.classList.add('clicked');
                    updatePowerDisplay();
                } else {
                    // Unclick
                    characterData.clickedTags = characterData.clickedTags.filter(t => t !== tagKey);
                    item.classList.remove('clicked');
                    updatePowerDisplay();
                }
            }
        });

        // Burn button
        burnBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!theme.burntPowerTags[tagIndex]) {
                theme.burntPowerTags[tagIndex] = true;
                item.classList.add('burnt');
                characterData.burntTags.push({
                    type: 'power',
                    themeIndex: themeIndex,
                    tagIndex: tagIndex,
                    name: input.value
                });
                updateBurntTagsDisplay();
                saveToCloud();
            }
        });

        // Set burnt state
        if (theme.burntPowerTags[tagIndex]) {
            item.classList.add('burnt');
        }
    });
}

function setupWeaknessTag(card, themeIndex) {
    const theme = characterData.themes[themeIndex];
    const input = card.querySelector('.weakness-input');
    const burnBtn = card.querySelector('.btn-burn-weakness');

    input.value = theme.weaknessTag || '';

    input.addEventListener('input', () => {
        theme.weaknessTag = input.value;
        saveToCloud();
    });

    input.addEventListener('click', () => {
        if (!theme.burntWeakness && input.value) {
            const tagKey = `theme${themeIndex}-weakness`;
            if (!characterData.clickedTags.includes(tagKey)) {
                characterData.clickedTags.push(tagKey);
                characterData.usedWeakness = true;
                input.classList.add('clicked');
                updatePowerDisplay();
            } else {
                characterData.clickedTags = characterData.clickedTags.filter(t => t !== tagKey);
                characterData.usedWeakness = false;
                input.classList.remove('clicked');
                updatePowerDisplay();
            }
        }
    });

    burnBtn.addEventListener('click', () => {
        if (!theme.burntWeakness) {
            theme.burntWeakness = true;
            input.classList.add('burnt');
            characterData.burntTags.push({
                type: 'weakness',
                themeIndex: themeIndex,
                name: input.value
            });
            updateBurntTagsDisplay();
            saveToCloud();
        }
    });

    if (theme.burntWeakness) {
        input.classList.add('burnt');
    }
}

function updateBurntTagsDisplay() {
    const burntList = document.getElementById('burntTagList');
    burntList.innerHTML = '';

    if (characterData.burntTags.length === 0) {
        burntList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No burnt tags</p>';
        return;
    }

    characterData.burntTags.forEach(tag => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'burnt-tag-item';
        tagDiv.textContent = `${tag.type === 'power' ? '⚡' : '❌'} ${tag.name}`;
        burntList.appendChild(tagDiv);
    });
}

function recoverAllBurntTags() {
    characterData.burntTags.forEach(tag => {
        const theme = characterData.themes[tag.themeIndex];
        if (tag.type === 'power') {
            theme.burntPowerTags[tag.tagIndex] = false;
        } else {
            theme.burntWeakness = false;
        }
    });

    characterData.burntTags = [];

    // Update UI
    document.querySelectorAll('.tag-item.burnt, .weakness-input.burnt').forEach(el => {
        el.classList.remove('burnt');
    });

    updateBurntTagsDisplay();
    saveToCloud();
    alert('✨ All burnt tags have been recovered!');
}

// ================================
// MOVE SELECTION
// ================================

function setupMoveSelection() {
    const moveIcons = document.querySelectorAll('.move-icon');
    const selectedMoveDisplay = document.getElementById('selectedMoveDisplay');

    moveIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Deselect all
            moveIcons.forEach(i => i.classList.remove('selected'));

            // Select this one
            icon.classList.add('selected');
            characterData.selectedMove = icon.dataset.move;

            // Update display
            const moveName = icon.querySelector('span:last-child').textContent;
            selectedMoveDisplay.textContent = `Selected: ${moveName}`;
            selectedMoveDisplay.style.background = 'rgba(138, 43, 226, 0.5)';
        });
    });
}

// ================================
// DICE ROLLING & JUICE
// ================================

function setupDiceRoller() {
    const rollBtn = document.getElementById('rollBtn');
    const resetBtn = document.getElementById('resetBtn');
    const rollResult = document.getElementById('rollResult');

    rollBtn.addEventListener('click', () => {
        // Check if move is selected
        if (!characterData.selectedMove) {
            alert('⚠️ You must select a Core Move before rolling!');
            return;
        }

        // Calculate power
        const power = calculateTotalPower();

        // Roll 2d6
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const total = die1 + die2 + power;

        // Display result
        let resultClass = '';
        let resultText = '';
        let juiceGained = 0;

        if (total >= 10) {
            resultClass = 'success';
            resultText = '🌟 SUCCESS!';
            juiceGained = 3;
        } else if (total >= 7) {
            resultClass = 'partial';
            resultText = '⚡ PARTIAL SUCCESS!';
            juiceGained = 1;
        } else {
            resultClass = 'miss';
            resultText = '💥 MISS!';
            juiceGained = 0;

            // Check for weakness + miss = auto-growth
            if (characterData.usedWeakness) {
                autoIncreaseGrowth();
            }
        }

        rollResult.className = `roll-result ${resultClass}`;
        rollResult.textContent = `${resultText}\nRolled: ${die1} + ${die2} + ${power} = ${total}`;

        // Add juice
        characterData.juice += juiceGained;
        updateJuiceDisplay();

        if (juiceGained > 0) {
            showNotification(`+${juiceGained} Juice!`);
        }

        saveToCloud();
    });

    resetBtn.addEventListener('click', () => {
        resetDiceRoll();
    });
}

function calculateTotalPower() {
    let power = 0;

    // Count clicked power tags (+1 each)
    const powerTagClicks = characterData.clickedTags.filter(t => t.includes('power')).length;
    power += powerTagClicks;

    // Status tags (positive add, negative subtract)
    characterData.currentStatuses.forEach(status => {
        if (status.positive) {
            power += status.tier;
        } else {
            power -= status.tier;
        }
    });

    // Update display
    document.getElementById('totalPower').value = power;
    updatePowerBreakdown(power, powerTagClicks);

    return power;
}

function updatePowerDisplay() {
    calculateTotalPower();
}

function updatePowerBreakdown(totalPower, tagCount) {
    const breakdown = document.getElementById('powerBreakdown');
    breakdown.textContent = `Power Tags: ${tagCount} | Status Modifiers: ${totalPower - tagCount}`;
}

function resetDiceRoll() {
    // Clear all clicked tags
    characterData.clickedTags = [];
    characterData.usedWeakness = false;
    characterData.selectedMove = null;

    // Clear unused juice
    characterData.juice = 0;
    updateJuiceDisplay();

    // Reset UI
    document.querySelectorAll('.tag-item.clicked, .weakness-input.clicked').forEach(el => {
        el.classList.remove('clicked');
    });

    document.querySelectorAll('.move-icon.selected').forEach(el => {
        el.classList.remove('selected');
    });

    document.getElementById('selectedMoveDisplay').textContent = 'No move selected';
    document.getElementById('selectedMoveDisplay').style.background = 'rgba(138, 43, 226, 0.3)';

    document.getElementById('rollResult').textContent = '';
    document.getElementById('rollResult').className = 'roll-result';

    updatePowerDisplay();
    saveToCloud();
}

function autoIncreaseGrowth() {
    // Find which theme's weakness was used
    const weaknessTag = characterData.clickedTags.find(t => t.includes('weakness'));
    if (weaknessTag) {
        const themeIndex = parseInt(weaknessTag.match(/theme(\d+)/)[1]);
        const theme = characterData.themes[themeIndex];

        theme.growth = Math.min(theme.growth + 1, 3);

        const card = document.querySelectorAll('.theme-card')[themeIndex];
        updateTrackDisplay(card, themeIndex);

        if (theme.growth === 3) {
            checkGrowthCompletion(themeIndex);
        }

        alert(`📈 Auto-Growth! ${theme.name || 'Theme'} gained +1 Growth (Weakness + Miss)`);
        saveToCloud();
    }
}

// ================================
// JUICE SYSTEM
// ================================

function setupJuiceTracker() {
    const juiceUp = document.getElementById('juiceUp');
    const juiceDown = document.getElementById('juiceDown');
    const spendJuiceBtn = document.getElementById('spendJuiceBtn');
    const useComboBtn = document.getElementById('useComboBtn');

    juiceUp.addEventListener('click', () => {
        characterData.juice++;
        updateJuiceDisplay();
        saveToCloud();
    });

    juiceDown.addEventListener('click', () => {
        if (characterData.juice > 0) {
            characterData.juice--;
            updateJuiceDisplay();
            saveToCloud();
        }
    });

    spendJuiceBtn.addEventListener('click', () => {
        if (characterData.juice > 0) {
            const spend = Math.min(characterData.juice, 3);
            const currentPower = parseInt(document.getElementById('totalPower').value);
            document.getElementById('totalPower').value = currentPower + spend;
            characterData.juice -= spend;
            updateJuiceDisplay();
            showNotification(`Spent ${spend} Juice for +${spend} Power!`);
            saveToCloud();
        }
    });

    useComboBtn.addEventListener('click', () => {
        if (characterData.juice >= 3) {
            alert('Select a combo below to activate it for 3 Juice!');
        } else {
            alert('Not enough Juice! Combos cost 3 Juice.');
        }
    });

    updateJuiceDisplay();
}

function updateJuiceDisplay() {
    document.getElementById('juiceCount').textContent = characterData.juice;

    const spendBtn = document.getElementById('spendJuiceBtn');
    const comboBtn = document.getElementById('useComboBtn');

    spendBtn.disabled = characterData.juice === 0;
    comboBtn.disabled = characterData.juice < 3;
}

// ================================
// COMBO SYSTEM
// ================================

function setupCombos() {
    const addComboBtn = document.getElementById('addComboBtn');

    addComboBtn.addEventListener('click', () => {
        const name = document.getElementById('comboName').value.trim();
        const tag1 = document.getElementById('comboTag1').value.trim();
        const tag2 = document.getElementById('comboTag2').value.trim();
        const tag3 = document.getElementById('comboTag3').value.trim();

        if (!name || !tag1 || !tag2) {
            alert('Please enter at least a name and 2 tags for the combo!');
            return;
        }

        const combo = {
            name: name,
            tags: [tag1, tag2, tag3].filter(t => t),
            id: Date.now()
        };

        characterData.tagCombos.push(combo);

        // Clear inputs
        document.getElementById('comboName').value = '';
        document.getElementById('comboTag1').value = '';
        document.getElementById('comboTag2').value = '';
        document.getElementById('comboTag3').value = '';

        updateCombosDisplay();
        saveToCloud();
    });

    updateCombosDisplay();
}

function updateCombosDisplay() {
    const comboList = document.getElementById('comboList');
    comboList.innerHTML = '';

    if (characterData.tagCombos.length === 0) {
        comboList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No combos created yet</p>';
        return;
    }

    characterData.tagCombos.forEach(combo => {
        const comboCard = document.createElement('div');
        comboCard.className = 'combo-card';

        comboCard.innerHTML = `
            <div class="combo-header">
                <h4 class="combo-name">${combo.name}</h4>
                <button class="combo-remove-btn" data-combo-id="${combo.id}">×</button>
            </div>
            <div class="combo-tags">
                ${combo.tags.map(tag => `<span class="combo-tag-pill">${tag}</span>`).join('')}
            </div>
            <button class="combo-use-btn" data-combo-id="${combo.id}">
                Use Combo (3 Juice)
            </button>
        `;

        comboList.appendChild(comboCard);
    });

    // Add event listeners
    document.querySelectorAll('.combo-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.comboId);
            characterData.tagCombos = characterData.tagCombos.filter(c => c.id !== id);
            updateCombosDisplay();
            saveToCloud();
        });
    });

    document.querySelectorAll('.combo-use-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (characterData.juice >= 3) {
                characterData.juice -= 3;
                updateJuiceDisplay();
                const combo = characterData.tagCombos.find(c => c.id === parseInt(btn.dataset.comboId));
                alert(`✨ Combo Activated: ${combo.name}!\n\nYou used ${combo.tags.join(', ')}`);
                saveToCloud();
            } else {
                alert('Not enough Juice! Combos cost 3 Juice.');
            }
        });
    });
}

// ================================
// STATUS & STORY TAGS (From MC)
// ================================

function updateStatusTagsDisplay() {
    const statusList = document.getElementById('statusList');
    statusList.innerHTML = '';

    if (characterData.currentStatuses.length === 0) {
        statusList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No status tags yet</p>';
        return;
    }

    characterData.currentStatuses.forEach(status => {
        const pill = document.createElement('span');
        pill.className = `tag-pill ${status.positive ? 'positive' : 'negative'}`;
        pill.textContent = `${status.name} (${status.positive ? '+' : '-'}${status.tier})`;
        statusList.appendChild(pill);
    });
}

function updateStoryTagsDisplay() {
    const storyList = document.getElementById('storyTagList');
    storyList.innerHTML = '';

    if (characterData.storyTags.length === 0) {
        storyList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No story tags yet</p>';
        return;
    }

    characterData.storyTags.forEach(tag => {
        const pill = document.createElement('span');
        pill.className = 'tag-pill';
        pill.textContent = tag.name + (tag.ongoing ? ' (Ongoing)' : '');
        storyList.appendChild(pill);
    });
}

// ================================
// PORTRAIT TOGGLE
// ================================

function setupPortraitToggle() {
    const toggleBtn = document.getElementById('portraitToggle');
    const portrait = document.getElementById('characterPortrait');
    const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%232a2a2a' width='400' height='400'/%3E%3Ctext fill='%23666' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Portrait%3C/text%3E%3C/svg%3E";

    toggleBtn.addEventListener('click', () => {
        if (characterData.currentPortraitMode === 'civilian') {
            characterData.currentPortraitMode = 'qfactor';
            portrait.src = characterData.qfactorPortrait || placeholderSvg;
            toggleBtn.textContent = '📸 Show Civilian';
        } else {
            characterData.currentPortraitMode = 'civilian';
            portrait.src = characterData.civilianPortrait || placeholderSvg;
            toggleBtn.textContent = '📸 Show Q-Factor';
        }
        saveToCloud();
    });
}

// ================================
// COLOR CUSTOMIZATION
// ================================

function setupColorPicker() {
    const colorInput = document.getElementById('themeColor');

    colorInput.addEventListener('input', () => {
        characterData.themeColor = colorInput.value;
        applyThemeColor(colorInput.value);
        saveToCloud();
    });

    // Apply initial color
    applyThemeColor(characterData.themeColor);
}

function applyThemeColor(hexColor) {
    document.documentElement.style.setProperty('--character-theme-color', hexColor);
}

// ================================
// CHARACTER INFO
// ================================

function setupCharacterInfo() {
    const nameInput = document.getElementById('characterName');
    const pronounsInput = document.getElementById('characterPronouns');

    nameInput.addEventListener('input', () => {
        characterData.name = nameInput.value;
        saveToCloud();
    });

    pronounsInput.addEventListener('input', () => {
        characterData.pronouns = pronounsInput.value;
        saveToCloud();
    });
}

// ================================
// JSON EXPORT/IMPORT
// ================================

function setupFileHandling() {
    const uploadInput = document.getElementById('characterUpload');
    const exportBtn = document.getElementById('exportBtn');

    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    characterData = imported;
                    loadCharacterToUI();
                    alert('✅ Character loaded successfully!');
                } catch (error) {
                    alert('❌ Error loading character file: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    });

    exportBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(characterData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${characterData.name || 'character'}-queerz.json`;
        a.click();

        URL.revokeObjectURL(url);
        alert('✅ Character exported successfully!');
    });
}

function loadCharacterToUI() {
    // Character info
    document.getElementById('characterName').value = characterData.name;
    document.getElementById('characterPronouns').value = characterData.pronouns;
    document.getElementById('themeColor').value = characterData.themeColor;
    applyThemeColor(characterData.themeColor);

    // Portrait
    const portrait = document.getElementById('characterPortrait');
    const placeholderSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%232a2a2a' width='400' height='400'/%3E%3Ctext fill='%23666' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENo Portrait%3C/text%3E%3C/svg%3E";
    if (characterData.currentPortraitMode === 'civilian') {
        portrait.src = characterData.civilianPortrait || placeholderSvg;
    } else {
        portrait.src = characterData.qfactorPortrait || placeholderSvg;
    }

    // Juice
    updateJuiceDisplay();

    // Themes
    document.querySelectorAll('.theme-card').forEach((card, index) => {
        const theme = characterData.themes[index];

        card.querySelector('.theme-type-selector').value = theme.type;
        card.querySelector('.theme-name-input').value = theme.name;
        card.querySelector('.runway-quote-input').value = theme.quote;

        // Power tags
        const tagInputs = card.querySelectorAll('.tag-input');
        tagInputs.forEach((input, i) => {
            input.value = theme.powerTags[i] || '';
        });

        // Weakness
        card.querySelector('.weakness-input').value = theme.weaknessTag;

        updateThemeVisuals(card, index);
        updateTrackDisplay(card, index);
    });

    // Combos
    updateCombosDisplay();
    updateBurntTagsDisplay();
    updateStatusTagsDisplay();
    updateStoryTagsDisplay();
}

// ================================
// FIREBASE / CLOUD SAVE
// ================================

let saveTimeout = null;
function saveToCloud() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCharacterToCloud(characterData);
        broadcastToMc();
    }, 1000);
}

function broadcastToMc() {
    const broadcastData = {
        name: characterData.name || 'Unnamed Character',
        pronouns: characterData.pronouns || '',
        portraitUrl: characterData.currentPortraitMode === 'civilian'
            ? (characterData.civilianPortrait || '')
            : (characterData.qfactorPortrait || ''),
        currentStatuses: characterData.currentStatuses || [],
        storyTags: characterData.storyTags || [],
        juice: characterData.juice || 0,
        themes: characterData.themes || []
    };

    console.log('📤 Broadcasting to MC:', broadcastData);
    broadcastCharacterToMc(broadcastData);
}

// ================================
// UI HELPERS
// ================================

function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success-green);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ================================
// MISC UI
// ================================

function setupMiscUI() {
    // Recover burnt tags button
    document.getElementById('recoverBtn').addEventListener('click', recoverAllBurntTags);

    // Toggle moves panel
    const toggleMovesBtn = document.getElementById('toggleMovesBtn');
    const movesPanel = document.getElementById('movesPanel');

    toggleMovesBtn.addEventListener('click', () => {
        movesPanel.classList.toggle('hidden');
    });
}

// ================================
// INITIALIZATION
// ================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🌈 QUEERZ! Player Companion v2 initializing...');

    initializeThemes();
    setupMoveSelection();
    setupDiceRoller();
    setupJuiceTracker();
    setupCombos();
    setupPortraitToggle();
    setupColorPicker();
    setupCharacterInfo();
    setupFileHandling();
    setupMiscUI();

    // Initial UI update
    updateBurntTagsDisplay();
    updateStatusTagsDisplay();
    updateStoryTagsDisplay();

    console.log('✅ Player Companion ready!');
});

// Listen for Firebase auth ready, then do initial broadcast
document.addEventListener('firebase-auth-ready', () => {
    console.log('🔥 Firebase auth ready, doing initial broadcast...');
    // Wait a moment for everything to settle
    setTimeout(() => {
        broadcastToMc();
        console.log('📤 Initial broadcast sent to MC');
    }, 500);
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;
document.head.appendChild(style);
