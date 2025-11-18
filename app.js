// ================================
// QUEERZ! PLAYER COMPANION V2
// Complete Game Mechanics System
// ================================

import {
    saveCharacterToCloud,
    loadCharactersFromCloud
} from './firebase-config.js';

import {
    broadcastPlayerToMc
} from './firebase-broadcast.js';

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
    clues: 0, // NEW: Clues tracker
    characterLocked: false, // NEW: Lock character after creation
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
    usedWeakness: false,
    lastRollResult: null, // NEW: Track last roll for Juice spending
    createdItemsThisRoll: [], // NEW: Track items created during Juice spending
    lastRoll: null // NEW: Last dice roll for MC broadcast
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
        burntWeakness: false,
        locked: false // NEW: Theme locked after character creation
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
                theme.locked = false; // Unlock theme for editing
                unlockThemeFields(themeIndex);
                alert(`⚠️ ${theme.name || 'This theme'} has faded! All 3 SHADE boxes are filled.\n\nThis theme is now UNLOCKED for editing. Replace it with an Anchor/Realness theme.`);
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
                theme.locked = false; // Unlock theme for editing
                unlockThemeFields(themeIndex);
                alert(`⚠️ ${theme.name || 'This theme'} has faded! All 3 RELEASE boxes are filled.\n\nThis theme is now UNLOCKED for editing. Replace it with a Rainbow/Runway theme.`);
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
            if (input) input.disabled = false;
            if (burnBtn) burnBtn.disabled = false;
        } else {
            item.classList.add('greyed-tag');
            item.classList.remove('unlocked');
            if (input) input.disabled = true;
            if (burnBtn) burnBtn.disabled = true;
        }
    });
}

function lockThemeFields(themeIndex) {
    const theme = characterData.themes[themeIndex];
    const card = document.querySelectorAll('.theme-card')[themeIndex];

    // Make name and quote readonly (can still see and select, but not edit)
    const nameInput = card.querySelector('.theme-name-input');
    const quoteInput = card.querySelector('.runway-quote-input');

    if (nameInput) nameInput.readOnly = true;
    if (quoteInput) quoteInput.readOnly = true;

    // Disable type selector (can't change theme type)
    const typeSelector = card.querySelector('.theme-type-selector');
    if (typeSelector) typeSelector.disabled = true;

    // Make first 3 tags readonly (can still click, but not edit text)
    const tagItems = card.querySelectorAll('.tag-item');
    tagItems.forEach((item, i) => {
        if (i < 3) {
            const input = item.querySelector('.tag-input');
            if (input) input.readOnly = true;
        }
    });

    // Make weakness readonly
    const weaknessInput = card.querySelector('.weakness-input');
    if (weaknessInput) weaknessInput.readOnly = true;

    // Add visual locked class
    card.classList.add('theme-locked');
}

function unlockThemeFields(themeIndex) {
    const theme = characterData.themes[themeIndex];
    const card = document.querySelectorAll('.theme-card')[themeIndex];

    // Make name and quote editable again
    const nameInput = card.querySelector('.theme-name-input');
    const quoteInput = card.querySelector('.runway-quote-input');

    if (nameInput) nameInput.readOnly = false;
    if (quoteInput) quoteInput.readOnly = false;

    // Enable type selector
    const typeSelector = card.querySelector('.theme-type-selector');
    if (typeSelector) typeSelector.disabled = false;

    // Make first 3 tags editable again
    const tagItems = card.querySelectorAll('.tag-item');
    tagItems.forEach((item, i) => {
        if (i < theme.unlockedTags) {
            const input = item.querySelector('.tag-input');
            if (input) input.readOnly = false;
        }
    });

    // Make weakness editable
    const weaknessInput = card.querySelector('.weakness-input');
    if (weaknessInput) weaknessInput.readOnly = false;

    // Remove visual locked class
    card.classList.remove('theme-locked');
}

function lockAllCharacterFields() {
    characterData.characterLocked = true;
    characterData.themes.forEach((theme, index) => {
        theme.locked = true;
        lockThemeFields(index);
    });

    // Update button visibility
    const lockBtn = document.getElementById('lockCharacterBtn');
    if (lockBtn) {
        lockBtn.style.display = 'none';
    }

    showNotification('🔒 Character locked! Themes will unlock when Shade/Release boxes are filled.');
    saveToCloud();
}

// ================================
// TAG MANAGEMENT
// ================================

function setupPowerTags(card, themeIndex) {
    const theme = characterData.themes[themeIndex];
    const tagItems = card.querySelectorAll('.tag-item');

    tagItems.forEach((item, tagIndex) => {
        const input = item.querySelector('.tag-input');

        // Set initial value
        input.value = theme.powerTags[tagIndex] || '';

        // Update on input (only if unlocked)
        input.addEventListener('input', () => {
            if (tagIndex < theme.unlockedTags) {
                theme.powerTags[tagIndex] = input.value;

                // Refresh combo available tags when power tags change
                if (refreshComboAvailableTags) {
                    refreshComboAvailableTags();
                }

                saveToCloud();
            }
        });

        // Click to apply tag to roll (not permanent burning)
        input.addEventListener('click', () => {
            // Can't use if burnt or locked
            if (theme.burntPowerTags[tagIndex] || !input.value || tagIndex >= theme.unlockedTags) {
                return;
            }

            const tagKey = `theme${themeIndex}-power${tagIndex}`;
            if (!characterData.clickedTags.includes(tagKey)) {
                // Apply tag (add to current roll)
                characterData.clickedTags.push(tagKey);
                item.classList.add('applied');
                updatePowerDisplay();
            } else {
                // Un-apply tag
                characterData.clickedTags = characterData.clickedTags.filter(t => t !== tagKey);
                item.classList.remove('applied');
                updatePowerDisplay();
            }
        });

        // Set burnt state (from guaranteed hit burns)
        if (theme.burntPowerTags[tagIndex]) {
            item.classList.add('burnt');
            item.classList.remove('applied');
        }
    });
}

function updateAllThemes() {
    const themeCards = document.querySelectorAll('.theme-card');
    themeCards.forEach((card, themeIndex) => {
        const theme = characterData.themes[themeIndex];
        const tagItems = card.querySelectorAll('.tag-item');

        tagItems.forEach((item, tagIndex) => {
            if (theme.burntPowerTags[tagIndex]) {
                item.classList.add('burnt');
            } else {
                item.classList.remove('burnt');
            }
        });
    });
}

function setupWeaknessTag(card, themeIndex) {
    const theme = characterData.themes[themeIndex];
    const input = card.querySelector('.weakness-input');

    input.value = theme.weaknessTag || '';

    input.addEventListener('input', () => {
        theme.weaknessTag = input.value;
        saveToCloud();
    });

    input.addEventListener('click', () => {
        // Can't use if burnt
        if (theme.burntWeakness || !input.value) {
            return;
        }

        const tagKey = `theme${themeIndex}-weakness`;
        if (!characterData.clickedTags.includes(tagKey)) {
            // Apply weakness (subtract from roll)
            characterData.clickedTags.push(tagKey);
            characterData.usedWeakness = true;
            input.classList.add('applied');
            updatePowerDisplay();
        } else {
            // Un-apply weakness
            characterData.clickedTags = characterData.clickedTags.filter(t => t !== tagKey);
            characterData.usedWeakness = false;
            input.classList.remove('applied');
            updatePowerDisplay();
        }
    });

    // Set burnt state (from guaranteed hit burns)
    if (theme.burntWeakness) {
        input.classList.add('burnt');
        input.classList.remove('applied');
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

// Helper function to get display name for moves
function getMoveDisplayName(moveKey) {
    const moveNames = {
        'strike-a-pose': 'Strike a Pose',
        'slay': 'Slay',
        'get-a-clue': 'Get a Clue',
        'talk-it-out': 'Talk It Out',
        'care': 'Care',
        'be-vulnerable': 'Be Vulnerable',
        'resist': 'Resist'
    };
    return moveNames[moveKey] || moveKey;
}

// ================================
// MOVE-SPECIFIC RESULT HANDLERS
// ================================

function handleMoveSpecificResult(move, total, power) {
    // Determine result type
    const isSuccess = total >= 10;
    const isPartial = total >= 7 && total < 10;
    const isMiss = total < 7;

    // Route to move-specific handler
    switch(move) {
        case 'strike-a-pose':
            handleStrikeAPoseResult(isSuccess, isPartial, isMiss, power);
            break;
        case 'slay':
            handleSlayResult(isSuccess, isPartial, isMiss, power);
            break;
        case 'get-a-clue':
            handleGetAClueResult(isSuccess, isPartial, isMiss, power);
            break;
        case 'talk-it-out':
            handleTalkItOutResult(isSuccess, isPartial, isMiss, power);
            break;
        case 'care':
            handleCareResult(isSuccess, isPartial, isMiss, power);
            break;
        case 'resist':
            handleResistResult(isSuccess, isPartial, isMiss, power);
            break;
        case 'be-vulnerable':
            handleBeVulnerableResult(isSuccess, isPartial, isMiss, power);
            break;
        default:
            console.warn('Unknown move:', move);
    }
}

// STRIKE A POSE - Juice spending
function handleStrikeAPoseResult(isSuccess, isPartial, isMiss, power) {
    if (isMiss) return; // No special handling for miss

    // Open Juice spending modal after a brief delay
    setTimeout(() => {
        openJuiceSpendingModal();
    }, 500);
}

// SLAY - Upgrade selection
function handleSlayResult(isSuccess, isPartial, isMiss, power) {
    if (isMiss) return; // No special handling for miss

    const numUpgrades = isSuccess ? 2 : 1;
    setTimeout(() => {
        openSlayUpgradesModal(numUpgrades, power);
    }, 500);
}

// GET A CLUE - Questions and complications
function handleGetAClueResult(isSuccess, isPartial, isMiss, power) {
    if (isMiss) return; // No special handling for miss

    const cluesGained = power;
    characterData.clues += cluesGained;
    updateCluesDisplay();

    setTimeout(() => {
        openGetAClueModal(cluesGained, isPartial);
    }, 500);
}

// TALK IT OUT - Outcomes and complications
function handleTalkItOutResult(isSuccess, isPartial, isMiss, power) {
    if (isMiss) return; // No special handling for miss

    setTimeout(() => {
        openTalkItOutModal(isPartial, power);
    }, 500);
}

// CARE - Remove statuses/tags
function handleCareResult(isSuccess, isPartial, isMiss, power) {
    if (isMiss) return; // No special handling for miss

    setTimeout(() => {
        openCareModal(power, isPartial);
    }, 500);
}

// RESIST - Simple result display (no modal needed)
function handleResistResult(isSuccess, isPartial, isMiss, power) {
    // Results already shown in main roll display
    // No additional UI needed
}

// BE VULNERABLE - Complication display
function handleBeVulnerableResult(isSuccess, isPartial, isMiss, power) {
    if (!isPartial) return; // Only show complications on 7-9

    setTimeout(() => {
        showBeVulnerableComplications();
    }, 500);
}

function setupDiceRoller() {
    const rollBtn = document.getElementById('rollBtn');
    const burnForGuaranteedHitBtn = document.getElementById('burnForGuaranteedHitBtn');
    const resetBtn = document.getElementById('resetBtn');
    const rollResult = document.getElementById('rollResult');

    // NORMAL ROLL (with applied tags)
    rollBtn.addEventListener('click', () => {
        // Check if move is selected
        if (!characterData.selectedMove) {
            alert('⚠️ You must select a Core Move before rolling!');
            return;
        }

        // Calculate power
        const power = calculateTotalPower();

        // Roll 2d6 (standard PbtA dice roll)
        const die1 = Math.floor(Math.random() * 6) + 1;
        const die2 = Math.floor(Math.random() * 6) + 1;
        const baseRoll = die1 + die2;
        const total = baseRoll + power;

        // Display result
        let resultClass = '';
        let resultText = '';
        let juiceGained = 0;

        // Check if Strike a Pose for special Juice rules
        const isStrikeAPose = characterData.selectedMove === 'strike-a-pose';

        if (total >= 10) {
            resultClass = 'success';
            resultText = '🌟 SUCCESS!';

            if (isStrikeAPose) {
                // Strike a Pose: Gain Juice = Power used, MINIMUM 2
                juiceGained = Math.max(power, 2);
            } else {
                // Normal moves: +3 Juice
                juiceGained = 3;
            }
        } else if (total >= 7) {
            resultClass = 'partial';
            resultText = '⚡ PARTIAL SUCCESS!';

            if (isStrikeAPose) {
                // Strike a Pose: Gain Juice = Power used
                juiceGained = power;
            } else {
                // Normal moves: +1 Juice
                juiceGained = 1;
            }
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
        const powerDisplay = power !== 0 ? ` + ${power} (power)` : '';
        rollResult.textContent = `${resultText}\nRolled: ${die1} + ${die2}${powerDisplay} = ${total}`;

        // Store roll result for Juice spending and MC display
        characterData.lastRollResult = {
            die1: die1,
            die2: die2,
            baseBonus: 0,
            power: power,
            total: total,
            resultClass: resultClass,
            resultText: resultText,
            success: total >= 10,
            partialSuccess: total >= 7 && total < 10,
            timestamp: Date.now()
        };

        // Store roll data for MC broadcast
        characterData.lastRoll = {
            move: characterData.selectedMove,
            moveName: getMoveDisplayName(characterData.selectedMove),
            dice: [die1, die2],
            baseBonus: 0,
            power: power,
            total: total,
            result: total >= 10 ? 'success' : (total >= 7 ? 'partial' : 'miss'),
            resultText: resultText,
            timestamp: Date.now()
        };

        // Add juice
        characterData.juice += juiceGained;
        updateJuiceDisplay();

        if (juiceGained > 0) {
            if (isStrikeAPose) {
                showNotification(`Strike a Pose! +${juiceGained} Juice (Power: ${power})`);
            } else {
                showNotification(`+${juiceGained} Juice!`);
            }
        }

        // CLEAR APPLIED TAGS (not permanent - tags return after roll)
        clearAppliedTags();

        // Remove Temporary MC tags that were clicked
        removeTemporaryMCTags();

        saveToCloud();

        // Handle move-specific results
        handleMoveSpecificResult(characterData.selectedMove, total, power);
    });

    // BURN TAG FOR GUARANTEED HIT
    burnForGuaranteedHitBtn.addEventListener('click', () => {
        // Check if move is selected
        if (!characterData.selectedMove) {
            alert('⚠️ You must select a Core Move before using this!');
            return;
        }

        // Collect all available (non-burnt) tags
        const availableTags = [];
        characterData.themes.forEach((theme, themeIndex) => {
            theme.powerTags.forEach((tag, tagIndex) => {
                if (tag && tagIndex < theme.unlockedTags && !theme.burntPowerTags[tagIndex]) {
                    availableTags.push({
                        name: tag,
                        themeIndex: themeIndex,
                        tagIndex: tagIndex,
                        type: 'power'
                    });
                }
            });
            // Also add weakness tags
            if (theme.weaknessTag && !theme.burntWeakness) {
                availableTags.push({
                    name: theme.weaknessTag,
                    themeIndex: themeIndex,
                    type: 'weakness'
                });
            }
        });

        if (availableTags.length === 0) {
            alert('❌ No available tags to burn! All tags are already burnt.\n\nUse "Recover All Burnt Tags" during Downtime to recover them.');
            return;
        }

        // Prompt user to select ONE tag
        const tagNames = availableTags.map((t, i) => `${i + 1}. ${t.name} (${t.type})`).join('\n');
        const selection = prompt(`🔥 BURN TAG FOR GUARANTEED HIT\n\nSelect ONE tag to burn:\n\n${tagNames}\n\nEnter the number (1-${availableTags.length}):`);

        if (!selection) return; // User cancelled

        const tagNum = parseInt(selection);
        if (isNaN(tagNum) || tagNum < 1 || tagNum > availableTags.length) {
            alert('Invalid selection!');
            return;
        }

        const selectedTag = availableTags[tagNum - 1];

        // Burn the tag permanently
        const theme = characterData.themes[selectedTag.themeIndex];
        if (selectedTag.type === 'power') {
            theme.burntPowerTags[selectedTag.tagIndex] = true;
        } else {
            theme.burntWeakness = true;
        }

        // Add to burnt tags list
        characterData.burntTags.push({
            type: selectedTag.type,
            themeIndex: selectedTag.themeIndex,
            tagIndex: selectedTag.type === 'power' ? selectedTag.tagIndex : undefined,
            name: selectedTag.name
        });

        // Calculate status modifier for final power
        let statusModifier = 0;
        characterData.currentStatuses.forEach(status => {
            if (status.isOngoing && status.modifier) {
                statusModifier += status.modifier;
            } else if (status.isTemporary && status.clicked && status.modifier) {
                statusModifier += status.modifier;
            } else if (status.positive && status.tier) {
                statusModifier += status.tier;
            } else if (!status.positive && status.tier) {
                statusModifier -= status.tier;
            }
        });

        characterData.storyTags.forEach(tag => {
            if (tag.isOngoing && tag.modifier) {
                statusModifier += tag.modifier;
            } else if (tag.isTemporary && tag.clicked && tag.modifier) {
                statusModifier += tag.modifier;
            }
        });

        const finalPower = 3 + statusModifier;
        const finalTotal = 7 + statusModifier;

        // Display guaranteed hit result
        rollResult.className = 'roll-result partial guaranteed-hit';
        rollResult.innerHTML = `🔥 <strong>TAG BURNED FOR GUARANTEED HIT!</strong><br><br>Result: 7 + Power ${finalPower} = ${finalTotal}<br><br>Tag Burnt: "${selectedTag.name}"<br><br>⚡ PARTIAL SUCCESS (Guaranteed)`;

        // Store roll result for MC display
        characterData.lastRollResult = {
            die1: '🔥',
            die2: '🔥',
            baseBonus: 0,
            power: finalPower,
            total: finalTotal,
            resultClass: 'partial',
            resultText: '🔥 GUARANTEED HIT!',
            success: false,
            partialSuccess: true,
            guaranteedHit: true,
            burntTag: selectedTag.name,
            timestamp: Date.now()
        };

        // Add juice (partial success = 1 juice)
        characterData.juice += 1;
        updateJuiceDisplay();

        showNotification(`🔥 Tag Burned: ${selectedTag.name}`);

        // Update UI
        updateAllThemes();
        updateBurntTagsDisplay();

        // CLEAR APPLIED TAGS
        clearAppliedTags();

        // Remove Temporary MC tags that were clicked
        removeTemporaryMCTags();

        saveToCloud();
    });

    resetBtn.addEventListener('click', () => {
        resetDiceRoll();
    });
}

// ================================
// MOVE-SPECIFIC HANDLERS
// ================================

/**
 * Main move handler - dispatches to specific move functions
 */
function handleMoveRoll(rollTotal, power, selectedMove) {
    if (!selectedMove) return;

    setTimeout(() => {
        switch (selectedMove) {
            case 'slay':
                displaySlayResult(rollTotal, power);
                break;
            case 'strike-a-pose':
                // Strike a Pose opens Juice spending modal on hit
                if (rollTotal >= 7) {
                    openJuiceSpendingModal();
                }
                break;
            case 'get-a-clue':
                displayGetAClueResult(rollTotal, power);
                break;
            case 'talk-it-out':
                displayTalkItOutResult(rollTotal, power);
                break;
            case 'care':
                displayCareResult(rollTotal, power);
                break;
            case 'resist':
                displayResistResult(rollTotal, power);
                break;
            case 'be-vulnerable':
                displayBeVulnerableResult(rollTotal, power);
                break;
            default:
                console.log('No specific handler for move:', selectedMove);
        }
    }, 500);
}

/**
 * SLAY - Choose upgrades based on result
 */
function displaySlayResult(rollTotal, power) {
    if (rollTotal >= 7) {
        const numUpgrades = rollTotal >= 10 ? 2 : 1;
        openSlayUpgradesModal(numUpgrades, power);
    }
    // Miss: MC makes hard move (no special UI needed)
}

/**
 * GET A CLUE - Generate Clues and handle complications
 */
function displayGetAClueResult(rollTotal, power) {
    if (rollTotal >= 7) {
        // Generate Clues = Power
        const cluesGained = power;
        characterData.clues += cluesGained;
        updateCluesDisplay();

        // Open Get a Clue modal
        const hasComplications = rollTotal >= 7 && rollTotal < 10;
        openGetAClueModal(cluesGained, hasComplications);

        saveToCloud();
    }
    // Miss: MC makes hard move (no special UI needed)
}

/**
 * TALK IT OUT - Choose outcome and handle complications
 */
function displayTalkItOutResult(rollTotal, power) {
    if (rollTotal >= 7) {
        const hasComplications = rollTotal >= 7 && rollTotal < 10;
        openTalkItOutModal(power, hasComplications);
    }
    // Miss: They put up walls / MC makes hard move
}

/**
 * CARE - Remove statuses/tags equal to Power
 */
function displayCareResult(rollTotal, power) {
    if (rollTotal >= 7) {
        const hasSideEffect = rollTotal >= 7 && rollTotal < 10;
        openCareModal(power, hasSideEffect);
    }
    // Miss: Care backfires / MC makes hard move
}

/**
 * RESIST - Show tier reduction result
 */
function displayResistResult(rollTotal, power) {
    const rollResultDiv = document.getElementById('rollResult');

    if (rollTotal >= 10) {
        // Full resist - take NO status
        rollResultDiv.innerHTML += `<div class="move-result-detail resist-result">
            <h3>🛡️ RESIST: Full Defense!</h3>
            <p>You completely fend off the effect - take NO status!</p>
        </div>`;
    } else if (rollTotal >= 7) {
        // Partial resist - reduce by 1 tier
        rollResultDiv.innerHTML += `<div class="move-result-detail resist-result">
            <h3>🛡️ RESIST: Partial Defense</h3>
            <p>Take the status with <strong>ONE LESS TIER</strong></p>
            <p class="example-text">Example: Guilty-3 becomes Guilty-2</p>
        </div>`;
    } else {
        // Miss - take full status
        rollResultDiv.innerHTML += `<div class="move-result-detail resist-result miss">
            <h3>❌ RESIST: Failed</h3>
            <p>You take the <strong>FULL STATUS</strong> as intended</p>
        </div>`;
    }
}

/**
 * BE VULNERABLE - Show complications on 7-9
 */
function displayBeVulnerableResult(rollTotal, power) {
    const rollResultDiv = document.getElementById('rollResult');

    if (rollTotal >= 10) {
        // Success - it's wonderful!
        rollResultDiv.innerHTML += `<div class="move-result-detail vulnerable-result success">
            <h3>✨ BE VULNERABLE: Success!</h3>
            <p>You do it and it's <strong>WONDERFUL</strong>! 🌟</p>
            <p>The MC will narrate the positive outcome.</p>
        </div>`;
    } else if (rollTotal >= 7) {
        // Partial - MC chooses complication
        rollResultDiv.innerHTML += `<div class="move-result-detail vulnerable-result partial">
            <h3>⚡ BE VULNERABLE: Partial Success</h3>
            <p>You do it, but the MC chooses ONE complication:</p>
            <div class="complications-list">
                <button class="complication-option" onclick="applyBeVulnerableComplication('side-effects')">
                    😰 <strong>Side Effects</strong><br>
                    <span>Take negative status (sweaty-2, laughing-stock-1, etc.) - cannot Resist</span>
                </button>
                <button class="complication-option" onclick="applyBeVulnerableComplication('burnout')">
                    🔥 <strong>Burnout</strong><br>
                    <span>One of your tags is burnt</span>
                </button>
                <button class="complication-option" onclick="applyBeVulnerableComplication('drama')">
                    🎭 <strong>Drama</strong><br>
                    <span>Dramatic story complication (seen by wrong person, etc.)</span>
                </button>
            </div>
        </div>`;
    } else {
        // Miss - fail OR succeed with hard move
        rollResultDiv.innerHTML += `<div class="move-result-detail vulnerable-result miss">
            <h3>💥 BE VULNERABLE: Miss</h3>
            <p>You <strong>FAIL</strong> OR succeed but MC makes a hard move</p>
        </div>`;
    }
}

/**
 * BE VULNERABLE - Apply complication (called by MC)
 */
window.applyBeVulnerableComplication = function(complicationType) {
    let message = '';

    switch (complicationType) {
        case 'side-effects':
            message = '😰 Side Effects applied! MC will assign a negative status (cannot be Resisted).';
            break;
        case 'burnout':
            message = '🔥 Burnout! MC will choose one of your tags to burn.';
            break;
        case 'drama':
            message = '🎭 Drama! MC will narrate a dramatic story complication.';
            break;
    }

    showNotification(message);
    saveToCloud();
};

// ================================
// MODAL FUNCTIONS FOR MOVES
// ================================

/**
 * GET A CLUE MODAL
 */
function openGetAClueModal(cluesGained, hasComplications) {
    const modal = document.getElementById('getAClueModal');
    const cluesCount = document.getElementById('getAClueCluesCount');
    const cluesRemaining = document.getElementById('getAClueCluesRemaining');
    const complicationsSection = document.getElementById('getAClueComplications');
    const questionInput = document.getElementById('clueQuestionInput');
    const questionsList = document.getElementById('clueQuestionsList');

    cluesCount.textContent = cluesGained;
    cluesRemaining.textContent = characterData.clues;

    // Show/hide complications
    if (hasComplications) {
        complicationsSection.style.display = 'block';
    } else {
        complicationsSection.style.display = 'none';
    }

    // Clear previous questions
    questionInput.value = '';
    questionsList.innerHTML = '<p class="empty-message">No questions asked yet</p>';

    // Track questions asked this roll
    if (!characterData.currentClueQuestions) {
        characterData.currentClueQuestions = [];
    }

    modal.classList.remove('hidden');
}

function closeGetAClueModal() {
    document.getElementById('getAClueModal').classList.add('hidden');
    characterData.currentClueQuestions = [];
}

function askClueQuestion() {
    const questionInput = document.getElementById('clueQuestionInput');
    const question = questionInput.value.trim();

    if (!question) {
        alert('Please enter a question!');
        return;
    }

    if (characterData.clues < 1) {
        alert('Not enough Clues! You need 1 Clue per question.');
        return;
    }

    // Deduct Clue
    characterData.clues--;
    updateCluesDisplay();
    document.getElementById('getAClueCluesRemaining').textContent = characterData.clues;

    // Track question
    if (!characterData.currentClueQuestions) {
        characterData.currentClueQuestions = [];
    }
    characterData.currentClueQuestions.push(question);

    // Update questions list
    updateClueQuestionsList();

    // Clear input
    questionInput.value = '';

    showNotification(`Question asked: "${question}" (1 Clue spent)`);
    saveToCloud();
}

function updateClueQuestionsList() {
    const questionsList = document.getElementById('clueQuestionsList');

    if (!characterData.currentClueQuestions || characterData.currentClueQuestions.length === 0) {
        questionsList.innerHTML = '<p class="empty-message">No questions asked yet</p>';
        return;
    }

    questionsList.innerHTML = '';
    characterData.currentClueQuestions.forEach((q, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'clue-question-item';
        questionDiv.innerHTML = `
            <span class="question-number">${index + 1}.</span>
            <span class="question-text">${q}</span>
        `;
        questionsList.appendChild(questionDiv);
    });
}

window.applyGetAClueComplication = function(complicationType) {
    let message = '';

    switch (complicationType) {
        case 'counter-question':
            message = '🔄 Counter Question! The MC/player asks YOU a question for each Clue you spent.';
            break;
        case 'side-effects':
            message = '😰 Side Effects! Take tier-1 relevant status (muddy-1, infatuated-1, etc.) - cannot Resist.';
            break;
        case 'drama':
            message = '🎭 Drama! A dramatic story complication occurs (seen spying, someone notices, etc.).';
            break;
    }

    showNotification(message);
    saveToCloud();
};

/**
 * TALK IT OUT MODAL
 */
function openTalkItOutModal(power, hasComplications) {
    const modal = document.getElementById('talkItOutModal');
    const powerDisplay = document.getElementById('talkItOutPower');
    const complicationsSection = document.getElementById('talkItOutComplications');

    powerDisplay.textContent = power;

    // Reset radio buttons
    document.querySelectorAll('#talkItOutModal input[type="radio"]').forEach(radio => {
        radio.checked = false;
    });

    // Show/hide complications
    if (hasComplications) {
        complicationsSection.style.display = 'block';
    } else {
        complicationsSection.style.display = 'none';
    }

    modal.classList.remove('hidden');
}

function closeTalkItOutModal() {
    document.getElementById('talkItOutModal').classList.add('hidden');
}

function confirmTalkItOut() {
    const selectedOutcome = document.querySelector('#talkItOutModal input[name="talkItOutOutcome"]:checked');

    if (!selectedOutcome) {
        alert('Please select an outcome!');
        return;
    }

    const outcomeLabels = {
        'make-progress': 'Make Progress - They see things more your way',
        'strike-deal': 'Strike a Deal - Agree to trade/compromise',
        'bond': `Bond - Give them relationship status (tier = ${document.getElementById('talkItOutPower').textContent})`
    };

    showNotification(`Talk It Out: ${outcomeLabels[selectedOutcome.value]}`);

    closeTalkItOutModal();
    saveToCloud();
}

window.applyTalkItOutComplication = function(complicationType) {
    let message = '';

    switch (complicationType) {
        case 'condition':
            message = '💰 Condition/Price! They have a condition or price you won\'t like.';
            break;
        case 'understanding':
            message = '👁️ Show Understanding! They want you to prove you understand their perspective.';
            break;
        case 'attached':
            const power = document.getElementById('talkItOutPower').textContent;
            message = `💔 Get Attached! They give YOU a relationship status (tier = ${power}).`;
            break;
    }

    showNotification(message);
    saveToCloud();
};

/**
 * CARE MODAL
 */
function openCareModal(power, hasSideEffect) {
    const modal = document.getElementById('careModal');
    const powerDisplay = document.getElementById('carePowerDisplay');
    const pointsRemaining = document.getElementById('carePointsRemaining');
    const statusList = document.getElementById('careStatusList');
    const storyTagList = document.getElementById('careStoryTagList');
    const sideEffectSection = document.getElementById('careSideEffect');

    powerDisplay.textContent = power;
    pointsRemaining.textContent = power;

    // Store modal state for filtering
    if (!window.careModalState) {
        window.careModalState = {
            showPositive: false,
            showNegative: true,
            showStoryStatuses: false,
            showStoryTags: false
        };
    }

    // Render the status lists with current filters
    renderCareStatusList();
    renderCareStoryTagList();

    // Add change listeners to update remaining points
    modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateCarePointsRemaining);
    });

    // Show/hide side effect warning
    if (hasSideEffect) {
        sideEffectSection.style.display = 'block';
    } else {
        sideEffectSection.style.display = 'none';
    }

    modal.classList.remove('hidden');
}

function renderCareStatusList() {
    const statusList = document.getElementById('careStatusList');
    statusList.innerHTML = '';

    if (characterData.currentStatuses.length === 0) {
        statusList.innerHTML = '<p class="empty-message">No current statuses</p>';
        return;
    }

    // Add filter controls
    const filterDiv = document.createElement('div');
    filterDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;';
    filterDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: var(--text-primary);">Filter Statuses:</div>
        <label style="display: block; margin: 5px 0; cursor: pointer;">
            <input type="checkbox" id="careShowNegative" ${window.careModalState.showNegative ? 'checked' : ''} style="margin-right: 8px;">
            Show Negative (debuffs) - Recommended
        </label>
        <label style="display: block; margin: 5px 0; cursor: pointer;">
            <input type="checkbox" id="careShowPositive" ${window.careModalState.showPositive ? 'checked' : ''} style="margin-right: 8px;">
            Show Positive (buffs)
        </label>
        <label style="display: block; margin: 5px 0; cursor: pointer;">
            <input type="checkbox" id="careShowStoryStatuses" ${window.careModalState.showStoryStatuses ? 'checked' : ''} style="margin-right: 8px;">
            Show Story Statuses
        </label>
    `;
    statusList.appendChild(filterDiv);

    // Add filter change listeners
    document.getElementById('careShowNegative').addEventListener('change', (e) => {
        window.careModalState.showNegative = e.target.checked;
        renderCareStatusList();
    });
    document.getElementById('careShowPositive').addEventListener('change', (e) => {
        window.careModalState.showPositive = e.target.checked;
        renderCareStatusList();
    });
    document.getElementById('careShowStoryStatuses').addEventListener('change', (e) => {
        window.careModalState.showStoryStatuses = e.target.checked;
        renderCareStatusList();
    });

    // Filter and display statuses
    let visibleCount = 0;
    characterData.currentStatuses.forEach((status, index) => {
        const category = categorizeStatus(status.name);

        // Apply filters
        if (category === 'negative' && !window.careModalState.showNegative) return;
        if (category === 'positive' && !window.careModalState.showPositive) return;
        if (category === 'story' && !window.careModalState.showStoryStatuses) return;

        visibleCount++;
        const statusDiv = document.createElement('div');
        statusDiv.className = 'care-removable-item';
        const tier = status.tier || Math.abs(status.modifier) || 1;

        // Add category indicator
        let categoryIcon = '';
        if (category === 'positive') categoryIcon = '✓';
        else if (category === 'negative') categoryIcon = '✗';
        else categoryIcon = '○';

        statusDiv.innerHTML = `
            <label>
                <input type="checkbox" data-type="status" data-index="${index}" data-tier="${tier}">
                <span>${categoryIcon} ${status.name} (Tier ${tier})</span>
            </label>
        `;
        statusList.appendChild(statusDiv);
    });

    if (visibleCount === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'No statuses match current filters';
        statusList.appendChild(emptyMsg);
    }
}

function renderCareStoryTagList() {
    const storyTagList = document.getElementById('careStoryTagList');
    storyTagList.innerHTML = '';

    if (characterData.storyTags.length === 0) {
        storyTagList.innerHTML = '<p class="empty-message">No story tags</p>';
        return;
    }

    // Add filter toggle
    const filterDiv = document.createElement('div');
    filterDiv.style.cssText = 'margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px;';
    filterDiv.innerHTML = `
        <label style="display: block; margin: 5px 0; cursor: pointer;">
            <input type="checkbox" id="careShowStoryTags" ${window.careModalState.showStoryTags ? 'checked' : ''} style="margin-right: 8px;">
            Show Story Tags
        </label>
    `;
    storyTagList.appendChild(filterDiv);

    document.getElementById('careShowStoryTags').addEventListener('change', (e) => {
        window.careModalState.showStoryTags = e.target.checked;
        renderCareStoryTagList();
    });

    if (!window.careModalState.showStoryTags) {
        const emptyMsg = document.createElement('p');
        emptyMsg.className = 'empty-message';
        emptyMsg.textContent = 'Story tags hidden (use checkbox above to show)';
        storyTagList.appendChild(emptyMsg);
        return;
    }

    characterData.storyTags.forEach((tag, index) => {
        const tagDiv = document.createElement('div');
        tagDiv.className = 'care-removable-item';
        tagDiv.innerHTML = `
            <label>
                <input type="checkbox" data-type="story-tag" data-index="${index}" data-tier="1">
                <span>○ ${tag.name} (1 point)</span>
            </label>
        `;
        storyTagList.appendChild(tagDiv);
    });
}

function updateCarePointsRemaining() {
    const power = parseInt(document.getElementById('carePowerDisplay').textContent);
    const checkboxes = document.querySelectorAll('#careModal input[type="checkbox"]:checked');

    let pointsUsed = 0;
    checkboxes.forEach(cb => {
        pointsUsed += parseInt(cb.dataset.tier);
    });

    const remaining = power - pointsUsed;
    document.getElementById('carePointsRemaining').textContent = Math.max(0, remaining);

    // Disable checkboxes if no points remaining
    const allCheckboxes = document.querySelectorAll('#careModal input[type="checkbox"]');
    allCheckboxes.forEach(cb => {
        if (!cb.checked && remaining <= 0) {
            cb.disabled = true;
        } else if (!cb.checked) {
            cb.disabled = false;
        }
    });
}

function closeCareModal() {
    document.getElementById('careModal').classList.add('hidden');
}

function confirmCare() {
    const power = parseInt(document.getElementById('carePowerDisplay').textContent);
    const checkboxes = document.querySelectorAll('#careModal input[type="checkbox"]:checked');

    let pointsUsed = 0;
    checkboxes.forEach(cb => {
        pointsUsed += parseInt(cb.dataset.tier);
    });

    if (pointsUsed > power) {
        alert(`You can only remove ${power} points worth of statuses/tags!`);
        return;
    }

    // Remove selected items
    const toRemove = {
        statuses: [],
        storyTags: []
    };

    checkboxes.forEach(cb => {
        const type = cb.dataset.type;
        const index = parseInt(cb.dataset.index);

        if (type === 'status') {
            toRemove.statuses.push(index);
        } else if (type === 'story-tag') {
            toRemove.storyTags.push(index);
        }
    });

    // Remove in reverse order to avoid index issues
    toRemove.statuses.sort((a, b) => b - a).forEach(index => {
        characterData.currentStatuses.splice(index, 1);
    });
    toRemove.storyTags.sort((a, b) => b - a).forEach(index => {
        characterData.storyTags.splice(index, 1);
    });

    // Update displays
    updateStatusTagsDisplay();
    updateStoryTagsDisplay();

    showNotification(`Care: Removed ${pointsUsed} tiers of statuses/tags`);

    // Handle side effect (7-9)
    const hasSideEffect = document.getElementById('careSideEffect').style.display !== 'none';
    if (hasSideEffect) {
        const sideEffects = ['concerned-1', 'tired-1', 'saddened-1', 'dirty-1', 'drained-1'];
        const randomEffect = sideEffects[Math.floor(Math.random() * sideEffects.length)];

        characterData.currentStatuses.push({
            name: randomEffect.replace('-1', ''),
            tier: 1,
            modifier: -1,
            positive: false,
            isOngoing: false,
            isTemporary: true,
            clicked: false,
            playerCreated: false
        });

        updateStatusTagsDisplay();
        showNotification(`Side Effect: You gain ${randomEffect} (cannot Resist)`);
    }

    closeCareModal();
    saveToCloud();
}

// Helper function to clear applied tags (not burned tags)
function clearAppliedTags() {
    // Clear clicked/applied tags
    characterData.clickedTags = [];
    characterData.usedWeakness = false;

    // Remove "applied" class from all tags
    document.querySelectorAll('.tag-item.applied, .weakness-input.applied').forEach(el => {
        el.classList.remove('applied');
    });

    updatePowerDisplay();
}

// Helper function to remove temporary MC tags
function removeTemporaryMCTags() {
    const removedTags = [];

    // Remove temporary status tags
    characterData.currentStatuses = characterData.currentStatuses.filter(status => {
        if (status.isTemporary && status.clicked) {
            removedTags.push(status.name);
            return false;
        }
        return true;
    });

    // Remove temporary story tags
    characterData.storyTags = characterData.storyTags.filter(tag => {
        if (tag.isTemporary && tag.clicked) {
            removedTags.push(tag.name);
            return false;
        }
        return true;
    });

    if (removedTags.length > 0) {
        console.log('📤 Broadcasting removed Temporary tags to MC:', removedTags);
        broadcastTemporaryTagRemoval(removedTags);
        showNotification(`Removed MC Tags: ${removedTags.join(', ')}`);
    }

    // Update displays
    updateStatusTagsDisplay();
    updateStoryTagsDisplay();
}

function calculateTotalPower() {
    let power = 0;
    let breakdown = [];

    // Count clicked power tags (+1 each)
    const powerTagClicks = characterData.clickedTags.filter(t => t.includes('power')).length;
    if (powerTagClicks > 0) {
        power += powerTagClicks;
        breakdown.push(`Power Tags: +${powerTagClicks}`);
    }

    // Count clicked weakness tags (-1 each)
    const weaknessClicks = characterData.clickedTags.filter(t => t.includes('weakness')).length;
    if (weaknessClicks > 0) {
        power -= weaknessClicks;
        breakdown.push(`Weakness: -${weaknessClicks}`);
    }

    // Status tags - Ongoing tags are automatically applied, Temporary only if clicked
    let statusModifier = 0;
    characterData.currentStatuses.forEach(status => {
        if (status.isOngoing && status.modifier) {
            // Ongoing tags are always applied
            statusModifier += status.modifier;
        } else if (status.isTemporary && status.clicked && status.modifier) {
            // Temporary tags only applied if clicked
            statusModifier += status.modifier;
        } else if (status.positive && status.tier) {
            // Legacy format
            statusModifier += status.tier;
        } else if (!status.positive && status.tier) {
            // Legacy negative format
            statusModifier -= status.tier;
        }
    });

    // Story tags - same logic
    characterData.storyTags.forEach(tag => {
        if (tag.isOngoing && tag.modifier) {
            statusModifier += tag.modifier;
        } else if (tag.isTemporary && tag.clicked && tag.modifier) {
            statusModifier += tag.modifier;
        }
    });

    if (statusModifier !== 0) {
        power += statusModifier;
        breakdown.push(`MC Tags: ${statusModifier > 0 ? '+' : ''}${statusModifier}`);
    }

    // Update display
    document.getElementById('totalPower').value = power;
    updatePowerBreakdown(breakdown.join(' | ') || 'No modifiers');

    return power;
}

function updatePowerDisplay() {
    calculateTotalPower();
}

function updatePowerBreakdown(breakdownText) {
    const breakdown = document.getElementById('powerBreakdown');
    breakdown.textContent = breakdownText;
}

function resetDiceRoll() {
    // Clear applied tags (NOT burnt tags - those persist)
    clearAppliedTags();

    characterData.selectedMove = null;

    // Clear unused juice
    characterData.juice = 0;
    updateJuiceDisplay();

    // Reset UI
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
        alert('Scroll down to the Tag Combos section to select and activate a combo!');
    });

    updateJuiceDisplay();
}

function updateJuiceDisplay() {
    document.getElementById('juiceCount').textContent = characterData.juice;

    const spendBtn = document.getElementById('spendJuiceBtn');
    const comboBtn = document.getElementById('useComboBtn');

    spendBtn.disabled = characterData.juice === 0;
    // Combos no longer require Juice - they only burn tags
    comboBtn.disabled = false;
}

// ================================
// COMBO SYSTEM
// ================================

// Store reference to tag population function for use in loadCharacterToUI
let refreshComboAvailableTags = null;

function setupCombos() {
    let selectedTags = [];

    // Populate available tags
    function populateAvailableTags() {
        const availableTagsContainer = document.getElementById('comboAvailableTags');
        availableTagsContainer.innerHTML = '';

        // Collect all non-empty power tags from all themes
        const allPowerTags = [];
        characterData.themes.forEach((theme, themeIndex) => {
            theme.powerTags.forEach((tag, tagIndex) => {
                if (tag.trim() !== '') {
                    allPowerTags.push({
                        name: tag,
                        themeIndex: themeIndex,
                        tagIndex: tagIndex
                    });
                }
            });
        });

        if (allPowerTags.length === 0) {
            availableTagsContainer.innerHTML = '<p style="color: var(--text-secondary); margin: 0;">No power tags available. Create some power tags in your themes first!</p>';
            return;
        }

        allPowerTags.forEach(tagInfo => {
            const tagBtn = document.createElement('button');
            tagBtn.className = 'combo-available-tag';
            tagBtn.textContent = tagInfo.name;
            tagBtn.dataset.themeIndex = tagInfo.themeIndex;
            tagBtn.dataset.tagIndex = tagInfo.tagIndex;
            tagBtn.dataset.tagName = tagInfo.name;

            tagBtn.addEventListener('click', () => {
                const tagName = tagBtn.dataset.tagName;
                const themeIdx = parseInt(tagBtn.dataset.themeIndex);
                const tagIdx = parseInt(tagBtn.dataset.tagIndex);

                // Check if already selected
                const existingIndex = selectedTags.findIndex(t =>
                    t.themeIndex === themeIdx && t.tagIndex === tagIdx
                );

                if (existingIndex !== -1) {
                    // Deselect
                    selectedTags.splice(existingIndex, 1);
                    tagBtn.classList.remove('selected');
                } else {
                    // Select (if less than 2 tags selected)
                    if (selectedTags.length < 2) {
                        selectedTags.push({
                            name: tagName,
                            themeIndex: themeIdx,
                            tagIndex: tagIdx
                        });
                        tagBtn.classList.add('selected');
                    } else {
                        alert('You can only select 2 tags for a combo!');
                    }
                }

                updateSelectedTagsDisplay();
                updateTagButtonStates();
            });

            availableTagsContainer.appendChild(tagBtn);
        });
    }

    function updateSelectedTagsDisplay() {
        const display = document.getElementById('comboSelectedTagsDisplay');
        if (selectedTags.length === 0) {
            display.textContent = 'None';
            display.style.color = 'var(--text-secondary)';
        } else {
            display.textContent = selectedTags.map(t => t.name).join(', ');
            display.style.color = 'var(--gold-tag)';
        }
    }

    function updateTagButtonStates() {
        const tagButtons = document.querySelectorAll('.combo-available-tag');
        tagButtons.forEach(btn => {
            if (selectedTags.length >= 2 && !btn.classList.contains('selected')) {
                btn.classList.add('disabled');
                btn.style.pointerEvents = 'none';
            } else {
                btn.classList.remove('disabled');
                btn.style.pointerEvents = 'auto';
            }
        });
    }

    function clearComboForm() {
        document.getElementById('comboName').value = '';
        document.getElementById('comboPower').value = '';
        document.getElementById('comboCoreMove').value = '';
        selectedTags = [];
        updateSelectedTagsDisplay();
        document.querySelectorAll('.combo-available-tag').forEach(btn => {
            btn.classList.remove('selected', 'disabled');
            btn.style.pointerEvents = 'auto';
        });
    }

    const addComboBtn = document.getElementById('addComboBtn');

    addComboBtn.addEventListener('click', () => {
        const name = document.getElementById('comboName').value.trim();
        const power = document.getElementById('comboPower').value;
        const coreMove = document.getElementById('comboCoreMove').value.trim();

        if (!name) {
            alert('Please enter a combo name!');
            return;
        }

        if (!power) {
            alert('Please select a Power value (1-4)!');
            return;
        }

        if (!coreMove) {
            alert('Please select a Core Move!');
            return;
        }

        if (selectedTags.length !== 2) {
            alert('Please select exactly 2 tags for the combo!');
            return;
        }

        const combo = {
            name: name,
            power: parseInt(power),
            coreMove: coreMove,
            tags: selectedTags.map(t => ({
                name: t.name,
                themeIndex: t.themeIndex,
                tagIndex: t.tagIndex
            })),
            id: Date.now()
        };

        characterData.tagCombos.push(combo);

        clearComboForm();
        updateCombosDisplay();
        saveToCloud();
    });

    // Expose tag population function for external use
    refreshComboAvailableTags = populateAvailableTags;

    // Initialize
    populateAvailableTags();
    updateSelectedTagsDisplay();
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

        // Handle both old format (tags as strings) and new format (tags as objects)
        const tagNames = combo.tags.map(tag => typeof tag === 'string' ? tag : tag.name);

        comboCard.innerHTML = `
            <div class="combo-header">
                <h4 class="combo-name">${combo.name}</h4>
                <button class="combo-remove-btn" data-combo-id="${combo.id}">×</button>
            </div>
            ${combo.power && combo.coreMove ? `
            <div class="combo-metadata">
                <span class="combo-power">Power: ${combo.power}</span>
                <span class="combo-core-move">${combo.coreMove}</span>
            </div>
            ` : ''}
            <div class="combo-tags">
                ${tagNames.map(tag => `<span class="combo-tag-pill">${tag}</span>`).join('')}
            </div>
            <button class="combo-use-btn" data-combo-id="${combo.id}">
                Use Combo
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
            const combo = characterData.tagCombos.find(c => c.id === parseInt(btn.dataset.comboId));

            // Check if tags can be burned (new format combos only)
            if (combo.tags && combo.tags.length > 0 && typeof combo.tags[0] === 'object') {
                // Verify both tags are not already burnt
                const tag1 = combo.tags[0];
                const tag2 = combo.tags[1];

                const tag1Burnt = characterData.themes[tag1.themeIndex].burntPowerTags[tag1.tagIndex];
                const tag2Burnt = characterData.themes[tag2.themeIndex].burntPowerTags[tag2.tagIndex];

                if (tag1Burnt || tag2Burnt) {
                    alert(`Cannot use combo! One or both of the required tags are already burnt.\n\nRequired tags: ${tag1.name}, ${tag2.name}\n\nYou must recover burnt tags before using this combo again.`);
                    return;
                }

                // Burn both tags
                characterData.themes[tag1.themeIndex].burntPowerTags[tag1.tagIndex] = true;
                characterData.themes[tag2.themeIndex].burntPowerTags[tag2.tagIndex] = true;

                // Add to burnt tags list
                characterData.burntTags.push({
                    type: 'power',
                    themeIndex: tag1.themeIndex,
                    tagIndex: tag1.tagIndex,
                    name: tag1.name
                });
                characterData.burntTags.push({
                    type: 'power',
                    themeIndex: tag2.themeIndex,
                    tagIndex: tag2.tagIndex,
                    name: tag2.name
                });

                // Update theme displays
                updateAllThemes();
                updateBurntTagsDisplay();

                alert(`✨ Combo Activated: ${combo.name}!\n\nCore Move: ${combo.coreMove}\nPower: ${combo.power}\n\nTags Used (BURNT): ${tag1.name}, ${tag2.name}\n\n⚠️ Both tags have been burnt and must be recovered before you can use this combo again!`);
            } else {
                // Old format combo
                const tagNames = combo.tags.map(tag => typeof tag === 'string' ? tag : tag.name);
                alert(`✨ Combo Activated: ${combo.name}!\n\nYou used ${tagNames.join(', ')}\n\n(Note: This is an old-format combo. Recreate it to enable tag burning.)`);
            }

            saveToCloud();
        });
    });
}

// ================================
// STATUS & STORY TAGS (From MC)
// ================================

/**
 * Parse tag string from MC
 * Format: "Tag Name (±number) Temporary/Ongoing" OR "tag-name (+1 Temporary)"
 * Example: "Inspired (+2) Ongoing" or "mama-jays-blessing (+1 Temporary)"
 */
function parseTagFromMC(tagString) {
    console.log('🔍 Parsing tag string:', tagString);

    // Try format 1: "Tag Name (±number) Temporary/Ongoing" with space before parenthesis
    let match = tagString.match(/^(.+?)\s*\(([+-]?\d+)\)\s*(Temporary|Ongoing)$/i);

    // Try format 2: "tag-name (+1 Temporary)" with number AND type inside parenthesis
    if (!match) {
        match = tagString.match(/^(.+?)\s*\(([+-]?\d+)\s+(Temporary|Ongoing)\)$/i);
    }

    if (match) {
        const [, name, modifier, type] = match;
        const parsed = {
            name: name.trim(),
            modifier: parseInt(modifier),
            isTemporary: type.toLowerCase() === 'temporary',
            isOngoing: type.toLowerCase() === 'ongoing',
            rawString: tagString
        };
        console.log('✅ Parsed successfully:', parsed);
        return parsed;
    }

    // Fallback for tags without proper format
    console.warn('⚠️ Could not parse tag format, using fallback:', tagString);
    return {
        name: tagString,
        modifier: 0,
        isTemporary: false,
        isOngoing: false,
        rawString: tagString
    };
}

/**
 * Handle tag updates from MC
 */
function handleMCTagUpdate(event) {
    const { statusTags, storyTags } = event.detail;

    console.log('📥 Received tag update from MC:', { statusTags, storyTags });

    // Process status tags
    if (statusTags && Array.isArray(statusTags)) {
        characterData.currentStatuses = statusTags.map(tag => {
            if (typeof tag === 'string') {
                const parsed = parseTagFromMC(tag);
                console.log('  Parsed status tag:', parsed);
                return {
                    name: parsed.name,
                    modifier: parsed.modifier,
                    isTemporary: parsed.isTemporary,
                    isOngoing: parsed.isOngoing,
                    clicked: false // Track if temporary tag has been clicked
                };
            }
            return tag; // Already an object
        });
        console.log('  Updated currentStatuses:', characterData.currentStatuses);
    }

    // Process story tags
    if (storyTags && Array.isArray(storyTags)) {
        characterData.storyTags = storyTags.map(tag => {
            if (typeof tag === 'string') {
                const parsed = parseTagFromMC(tag);
                console.log('  Parsed story tag:', parsed);
                return {
                    name: parsed.name,
                    modifier: parsed.modifier,
                    isTemporary: parsed.isTemporary,
                    isOngoing: parsed.isOngoing,
                    clicked: false
                };
            }
            return tag;
        });
        console.log('  Updated storyTags:', characterData.storyTags);
    }

    // Update displays
    updateStatusTagsDisplay();
    updateStoryTagsDisplay();
    updatePowerDisplay();

    // Show notification to user
    const tagCount = (statusTags?.length || 0) + (storyTags?.length || 0);
    if (tagCount > 0) {
        showNotification(`📥 Received ${tagCount} tag(s) from MC`);
    }

    // Highlight Resist move icon if new status tags were received
    if (statusTags && statusTags.length > 0) {
        highlightResistMove();
    }

    saveToCloud();
}

/**
 * Highlight the Resist move icon when MC sends a status
 */
function highlightResistMove() {
    const resistIcon = document.querySelector('.move-icon[data-move="resist"]');
    if (resistIcon) {
        resistIcon.classList.add('resist-ready');

        // Auto-remove after 30 seconds
        setTimeout(() => {
            resistIcon.classList.remove('resist-ready');
        }, 30000);
    }
}

// ================================
// STATUS CATEGORIZATION
// ================================

/**
 * Categorizes a status by its name (positive, negative, or story tag)
 * @param {string} statusName - The name of the status (without tier number)
 * @returns {string} - 'positive', 'negative', or 'story'
 */
function categorizeStatus(statusName) {
    // Normalize the name: lowercase and remove tier numbers (e.g., "Guilty-2" → "guilty")
    const baseName = statusName.toLowerCase().split('-')[0].trim();

    // Positive statuses (helpful buffs)
    const positiveStatuses = [
        'supported', 'confident', 'inspired', 'protected', 'empowered',
        'loved', 'validated', 'energized', 'clear-headed', 'focused',
        'determined', 'hopeful', 'clearheaded'
    ];

    // Negative statuses (harmful debuffs)
    const negativeStatuses = [
        'guilty', 'shaken', 'trapped', 'judged', 'obligated',
        'unworthy', 'bound', 'exhausted', 'confused', 'afraid',
        'isolated', 'broken', 'concerned', 'tired', 'saddened',
        'dirty', 'drained', 'muddy', 'infatuated'
    ];

    if (positiveStatuses.includes(baseName)) {
        return 'positive';
    } else if (negativeStatuses.includes(baseName)) {
        return 'negative';
    } else {
        // Everything else is a story tag
        return 'story';
    }
}

function updateStatusTagsDisplay() {
    const statusList = document.getElementById('statusList');
    if (!statusList) {
        console.error('❌ statusList element not found!');
        return;
    }

    console.log('🔄 Updating status tags display. Count:', characterData.currentStatuses.length);
    statusList.innerHTML = '';

    if (characterData.currentStatuses.length === 0) {
        statusList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No status tags yet</p>';
        return;
    }

    // Categorize statuses into three groups
    const positiveStatuses = [];
    const negativeStatuses = [];
    const storyTags = [];

    characterData.currentStatuses.forEach(status => {
        const category = categorizeStatus(status.name);
        if (category === 'positive') {
            positiveStatuses.push(status);
        } else if (category === 'negative') {
            negativeStatuses.push(status);
        } else {
            storyTags.push(status);
        }
    });

    // Render each category with headers
    if (positiveStatuses.length > 0) {
        const header = document.createElement('div');
        header.className = 'status-category-header positive-header';
        header.textContent = '💚 HELPING YOU';
        statusList.appendChild(header);

        const group = document.createElement('div');
        group.className = 'status-category-group';
        positiveStatuses.forEach(status => {
            group.appendChild(createStatusPill(status, 'positive'));
        });
        statusList.appendChild(group);
    }

    if (negativeStatuses.length > 0) {
        const header = document.createElement('div');
        header.className = 'status-category-header negative-header';
        header.textContent = '⚠️ HINDERING YOU';
        statusList.appendChild(header);

        const group = document.createElement('div');
        group.className = 'status-category-group';
        negativeStatuses.forEach(status => {
            group.appendChild(createStatusPill(status, 'negative'));
        });
        statusList.appendChild(group);
    }

    if (storyTags.length > 0) {
        const header = document.createElement('div');
        header.className = 'status-category-header story-header';
        header.textContent = '📋 STORY TAGS';
        statusList.appendChild(header);

        const group = document.createElement('div');
        group.className = 'status-category-group';
        storyTags.forEach(status => {
            group.appendChild(createStatusPill(status, 'story'));
        });
        statusList.appendChild(group);
    }

    console.log('✅ Status tags display updated (grouped by type)');
}

/**
 * Creates a status pill element with appropriate styling
 * @param {Object} status - The status object
 * @param {string} category - 'positive', 'negative', or 'story'
 * @returns {HTMLElement} - The pill element
 */
function createStatusPill(status, category) {
    const pill = document.createElement('span');

    // Base classes
    let pillClasses = ['tag-pill', `status-${category}`];

    // Add source class (MC vs player-created)
    if (status.playerCreated) {
        pillClasses.push('player-created');
    } else {
        pillClasses.push('mc-created');
    }

    // Determine if tag is Temporary or Ongoing
    if (status.isTemporary) {
        pillClasses.push('temporary-tag');
        if (status.clicked) pillClasses.push('clicked');
        pill.style.cursor = 'pointer';
        pill.title = 'Click to apply to next roll (will be removed after rolling)';

        // Make clickable for Temporary tags
        pill.addEventListener('click', () => {
            status.clicked = !status.clicked;
            updateStatusTagsDisplay();
            updatePowerDisplay();
        });
    } else if (status.isOngoing) {
        pillClasses.push('ongoing-tag');
        pill.title = 'Ongoing - automatically applied to all rolls';
    }

    pill.className = pillClasses.join(' ');

    const modifierStr = status.modifier
        ? `(${status.modifier > 0 ? '+' : ''}${status.modifier})`
        : (status.tier ? `(${status.positive ? '+' : '-'}${status.tier})` : '');
    const typeStr = status.isTemporary ? ' Temporary' : (status.isOngoing ? ' Ongoing' : '');

    pill.textContent = `${status.name} ${modifierStr}${typeStr}`;
    return pill;
}

function updateStoryTagsDisplay() {
    const storyList = document.getElementById('storyTagList');
    if (!storyList) {
        console.error('❌ storyTagList element not found!');
        return;
    }

    console.log('🔄 Updating story tags display. Count:', characterData.storyTags.length);
    storyList.innerHTML = '';

    if (characterData.storyTags.length === 0) {
        storyList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No story tags yet</p>';
        return;
    }

    characterData.storyTags.forEach((tag, index) => {
        console.log(`  Rendering story tag #${index}:`, tag);
        const pill = document.createElement('span');

        // Base class
        let pillClasses = ['tag-pill'];

        // Add source class (MC vs player-created)
        if (tag.playerCreated) {
            pillClasses.push('player-created');
        } else {
            pillClasses.push('mc-created');
        }

        // Determine if tag is Temporary or Ongoing
        if (tag.isTemporary) {
            pillClasses.push('temporary-tag');
            if (tag.clicked) pillClasses.push('clicked');
            pill.style.cursor = 'pointer';
            pill.title = 'Click to apply to next roll (will be removed after rolling)';

            pill.addEventListener('click', () => {
                tag.clicked = !tag.clicked;
                updateStoryTagsDisplay();
                updatePowerDisplay();
            });
        } else if (tag.isOngoing) {
            pillClasses.push('ongoing-tag');
            pill.title = 'Ongoing - automatically applied to all rolls';
        }

        pill.className = pillClasses.join(' ');

        const modifierStr = tag.modifier ? `(${tag.modifier > 0 ? '+' : ''}${tag.modifier})` : '';
        const typeStr = tag.isTemporary ? ' Temporary' : (tag.isOngoing ? ' Ongoing' : (tag.ongoing ? ' (Ongoing)' : ''));

        pill.textContent = `${tag.name}${modifierStr}${typeStr}`;
        storyList.appendChild(pill);
    });

    console.log('✅ Story tags display updated');
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
    // Apply to main theme color
    document.documentElement.style.setProperty('--character-theme-color', hexColor);

    // Apply to various UI elements throughout the app
    document.documentElement.style.setProperty('--teal-primary', hexColor);

    // Create a slightly darker version for hover states
    const rgb = hexToRgb(hexColor);
    if (rgb) {
        const darkerColor = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
        document.documentElement.style.setProperty('--teal-dark', darkerColor);
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// ================================
// CHARACTER INFO
// ================================

function setupCharacterInfo() {
    const nameInput = document.getElementById('characterName');
    const pronounsInput = document.getElementById('characterPronouns');

    nameInput.addEventListener('input', () => {
        characterData.name = nameInput.value;
        // Store character name in localStorage for MC broadcast matching
        localStorage.setItem('currentCharacterName', nameInput.value);
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

    // Store character name in localStorage for MC broadcast matching
    if (characterData.name) {
        localStorage.setItem('currentCharacterName', characterData.name);
    }

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

    // Clues (NEW)
    if (characterData.clues !== undefined) {
        updateCluesDisplay();
    }

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

        // Apply locked status if theme is locked
        if (theme.locked) {
            lockThemeFields(index);
        }
    });

    // Hide lock button if character is locked
    if (characterData.characterLocked) {
        const lockBtn = document.getElementById('lockCharacterBtn');
        if (lockBtn) lockBtn.style.display = 'none';
    }

    // Combos
    updateCombosDisplay();

    // Refresh available tags for combo creation based on loaded character's power tags
    if (refreshComboAvailableTags) {
        refreshComboAvailableTags();
    }

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
        // Check if cloud save is disabled
        const disableCloudSave = localStorage.getItem('disableCloudSave') === 'true';

        if (!disableCloudSave) {
            // Only save to cloud if not disabled
            saveCharacterToCloud(characterData);
        } else {
            console.log('☁️ Cloud save disabled - skipping save to Firebase');
        }

        // Always broadcast to MC (separate from cloud save)
        broadcastToMc();
    }, 1000);
}

function broadcastToMc() {
    console.log('📤 Preparing broadcast to MC...');
    broadcastPlayerToMc(characterData);
}

/**
 * Broadcast temporary tag removal to MC
 */
function broadcastTemporaryTagRemoval(removedTags) {
    // Send a simple notification to MC about removed tags
    // Don't try to update the full character state
    console.log('📤 Notifying MC about removed tags:', removedTags);

    // The MC should handle tag removal on their side
    // For now, we'll just log it - the MC will see the tags are gone
    // when the player broadcasts their normal character update

    // Trigger a character save which will broadcast the updated state
    saveToCloud();
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
// JUICE SPENDING MODAL (NEW)
// ================================

function openJuiceSpendingModal() {
    const modal = document.getElementById('juiceSpendingModal');
    const modalJuiceCount = document.getElementById('modalJuiceCount');
    const specialUpgrades = document.getElementById('specialUpgrades');

    // Reset created items list
    characterData.createdItemsThisRoll = [];
    updateCreatedItemsList();

    // Update available Juice display
    modalJuiceCount.textContent = characterData.juice;

    // Show special upgrades only on 10+
    if (characterData.lastRollResult && characterData.lastRollResult.success) {
        specialUpgrades.style.display = 'block';
    } else {
        specialUpgrades.style.display = 'none';
    }

    // Reset upgrade checkboxes
    document.getElementById('prolongEffect').checked = false;
    document.getElementById('scaleUpEffect').checked = false;
    document.getElementById('makeFlashier').checked = false;

    // Show modal
    modal.classList.remove('hidden');
}

function closeJuiceSpendingModal() {
    const modal = document.getElementById('juiceSpendingModal');
    modal.classList.add('hidden');

    // Clear input fields
    document.getElementById('newStoryTagName').value = '';
    document.getElementById('newStatusName').value = '';
    document.getElementById('statusTier').value = '1';

    // Reset created items
    characterData.createdItemsThisRoll = [];

    // Save state
    saveToCloud();
}

function createStoryTagFromJuice() {
    const tagName = document.getElementById('newStoryTagName').value.trim();

    if (!tagName) {
        alert('Please enter a tag name!');
        return;
    }

    if (characterData.juice < 1) {
        alert('Not enough Juice! Story tags cost 1 Juice each.');
        return;
    }

    // Deduct Juice
    characterData.juice -= 1;
    updateJuiceDisplay();
    document.getElementById('modalJuiceCount').textContent = characterData.juice;

    // Create story tag (default to temporary)
    const newTag = {
        name: tagName,
        modifier: 0,
        isTemporary: true,
        isOngoing: false,
        clicked: false,
        playerCreated: true // Mark as player-created
    };

    characterData.storyTags.push(newTag);

    // Track created item
    characterData.createdItemsThisRoll.push({
        type: 'Story Tag',
        name: tagName,
        duration: 'Temporary'
    });

    // Clear input
    document.getElementById('newStoryTagName').value = '';

    // Update displays
    updateStoryTagsDisplay();
    updateCreatedItemsList();
    saveToCloud();

    showNotification(`Created story tag: ${tagName} (1 Juice spent)`);
}

function createStatusFromJuice() {
    const statusName = document.getElementById('newStatusName').value.trim();
    const tier = parseInt(document.getElementById('statusTier').value);

    if (!statusName) {
        alert('Please enter a status name!');
        return;
    }

    if (characterData.juice < tier) {
        alert(`Not enough Juice! Tier ${tier} status costs ${tier} Juice.`);
        return;
    }

    // Deduct Juice
    characterData.juice -= tier;
    updateJuiceDisplay();
    document.getElementById('modalJuiceCount').textContent = characterData.juice;

    // Create status (default to temporary, positive)
    const newStatus = {
        name: statusName,
        modifier: tier,
        tier: tier,
        positive: true,
        isTemporary: true,
        isOngoing: false,
        clicked: false,
        playerCreated: true // Mark as player-created
    };

    characterData.currentStatuses.push(newStatus);

    // Track created item
    characterData.createdItemsThisRoll.push({
        type: `Status (Tier ${tier})`,
        name: statusName,
        duration: 'Temporary'
    });

    // Clear input
    document.getElementById('newStatusName').value = '';
    document.getElementById('statusTier').value = '1';

    // Update displays
    updateStatusTagsDisplay();
    updateCreatedItemsList();
    saveToCloud();

    showNotification(`Created status: ${statusName} (${tier} Juice spent)`);
}

function applyJuiceUpgrades() {
    const prolongEffect = document.getElementById('prolongEffect').checked;
    const scaleUpEffect = document.getElementById('scaleUpEffect').checked;
    const makeFlashier = document.getElementById('makeFlashier').checked;

    let juiceCost = 0;
    const upgrades = [];

    // Check Prolong Effect
    if (prolongEffect) {
        if (characterData.createdItemsThisRoll.length === 0) {
            alert('You need to create at least one tag or status before using "Prolong Effect"!');
            document.getElementById('prolongEffect').checked = false;
            return;
        }
        juiceCost += 1;
        upgrades.push('Prolong Effect');

        // Make last created item ongoing instead of temporary
        const lastItem = characterData.createdItemsThisRoll[characterData.createdItemsThisRoll.length - 1];

        if (lastItem.type.startsWith('Status')) {
            // Find and update the status
            const status = characterData.currentStatuses.find(s => s.name === lastItem.name && s.playerCreated);
            if (status) {
                status.isTemporary = false;
                status.isOngoing = true;
                lastItem.duration = 'Ongoing';
            }
        } else {
            // Find and update the story tag
            const tag = characterData.storyTags.find(t => t.name === lastItem.name && t.playerCreated);
            if (tag) {
                tag.isTemporary = false;
                tag.isOngoing = true;
                lastItem.duration = 'Ongoing';
            }
        }
    }

    // Check Scale Up Effect
    if (scaleUpEffect) {
        juiceCost += 1;
        upgrades.push('Scale Up Effect');
    }

    // Check Make It Flashier
    if (makeFlashier) {
        juiceCost += 1;
        upgrades.push('Make It Flashier');
    }

    if (juiceCost > 0) {
        if (characterData.juice < juiceCost) {
            alert(`Not enough Juice! These upgrades cost ${juiceCost} Juice total.`);
            return;
        }

        // Deduct Juice
        characterData.juice -= juiceCost;
        updateJuiceDisplay();
        document.getElementById('modalJuiceCount').textContent = characterData.juice;

        // Update displays
        updateStatusTagsDisplay();
        updateStoryTagsDisplay();
        updateCreatedItemsList();
        saveToCloud();

        showNotification(`Applied upgrades: ${upgrades.join(', ')} (${juiceCost} Juice spent)`);

        // Uncheck boxes
        document.getElementById('prolongEffect').checked = false;
        document.getElementById('scaleUpEffect').checked = false;
        document.getElementById('makeFlashier').checked = false;
    }
}

function updateCreatedItemsList() {
    const list = document.getElementById('createdItemsList');

    if (characterData.createdItemsThisRoll.length === 0) {
        list.innerHTML = '<p class="empty-message">No items created yet</p>';
        return;
    }

    list.innerHTML = '';
    characterData.createdItemsThisRoll.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'created-item';
        itemDiv.innerHTML = `
            <div>
                <span class="created-item-name">${item.name}</span>
                <span class="created-item-type"> - ${item.type} (${item.duration})</span>
            </div>
        `;
        list.appendChild(itemDiv);
    });
}

// ================================
// DOWNTIME MOVES (NEW)
// ================================

function setupDowntime() {
    // Prepare for Action button
    const prepareBtn = document.getElementById('downtimePrepareBtn');
    prepareBtn.addEventListener('click', () => {
        characterData.juice += 3;
        updateJuiceDisplay();
        showNotification('✨ Downtime: Prepared for action! +3 Juice');
        saveToCloud();
    });

    // Deepen Relationship button
    const deepenBtn = document.getElementById('downtimeDeepenBtn');
    deepenBtn.addEventListener('click', () => {
        openDeepenRelationshipModal();
    });

    // Clues tracker
    const cluesUp = document.getElementById('cluesUp');
    const cluesDown = document.getElementById('cluesDown');

    cluesUp.addEventListener('click', () => {
        characterData.clues++;
        updateCluesDisplay();
        saveToCloud();
    });

    cluesDown.addEventListener('click', () => {
        if (characterData.clues > 0) {
            characterData.clues--;
            updateCluesDisplay();
            saveToCloud();
        }
    });

    updateCluesDisplay();
}

function updateCluesDisplay() {
    document.getElementById('cluesCount').textContent = characterData.clues;
}

function openDeepenRelationshipModal() {
    const modal = document.getElementById('deepenRelationshipModal');
    const cluesSlider = document.getElementById('deepenCluesSlider');
    const juiceSlider = document.getElementById('deepenJuiceSlider');
    const cluesValue = document.getElementById('deepenCluesValue');
    const juiceValue = document.getElementById('deepenJuiceValue');

    // Reset sliders
    cluesSlider.value = 0;
    juiceSlider.value = 3;
    cluesValue.textContent = 0;
    juiceValue.textContent = 3;

    // Setup slider sync
    cluesSlider.addEventListener('input', () => {
        const cluesVal = parseInt(cluesSlider.value);
        juiceSlider.value = 3 - cluesVal;
        cluesValue.textContent = cluesVal;
        juiceValue.textContent = 3 - cluesVal;
    });

    juiceSlider.addEventListener('input', () => {
        const juiceVal = parseInt(juiceSlider.value);
        cluesSlider.value = 3 - juiceVal;
        cluesValue.textContent = 3 - juiceVal;
        juiceValue.textContent = juiceVal;
    });

    // Show modal
    modal.classList.remove('hidden');
}

function closeDeepenRelationshipModal() {
    const modal = document.getElementById('deepenRelationshipModal');
    modal.classList.add('hidden');
}

function confirmDeepenRelationship() {
    const cluesGained = parseInt(document.getElementById('deepenCluesSlider').value);
    const juiceGained = parseInt(document.getElementById('deepenJuiceSlider').value);

    // Add to character
    characterData.clues += cluesGained;
    characterData.juice += juiceGained;

    // Update displays
    updateCluesDisplay();
    updateJuiceDisplay();

    // Close modal
    closeDeepenRelationshipModal();

    // Notify
    showNotification(`💖 Deepen Relationship: +${cluesGained} Clues, +${juiceGained} Juice`);

    saveToCloud();
}

// ================================
// SLAY UPGRADES MODAL
// ================================

let slaySelectedUpgrades = [];
let slayMaxUpgrades = 2;

function openSlayUpgradesModal(numUpgrades, power) {
    slaySelectedUpgrades = [];
    slayMaxUpgrades = numUpgrades;

    const modal = document.getElementById('slayUpgradesModal');
    const countText = document.getElementById('slayUpgradeCount');
    const confirmBtn = document.getElementById('confirmSlayUpgradesBtn');

    countText.textContent = `Choose ${numUpgrades} upgrade${numUpgrades > 1 ? 's' : ''} (can pick same twice)`;

    // Reset all checkboxes
    document.querySelectorAll('.upgrade-checkbox').forEach(cb => {
        cb.checked = false;
    });

    // Setup checkbox listeners
    document.querySelectorAll('.upgrade-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleSlayUpgradeSelection);
    });

    // Setup confirm button
    confirmBtn.addEventListener('click', confirmSlayUpgrades);

    // Setup cancel button
    document.getElementById('cancelSlayUpgradesBtn').addEventListener('click', closeSlayUpgradesModal);

    updateSlaySelectedDisplay();
    modal.classList.remove('hidden');
}

function handleSlayUpgradeSelection(e) {
    const upgrade = e.target.id.replace('upgrade-', '');

    if (e.target.checked) {
        // Add to selected list
        if (slaySelectedUpgrades.length < slayMaxUpgrades) {
            slaySelectedUpgrades.push(upgrade);
        } else {
            // Already at max, uncheck
            e.target.checked = false;
            alert(`You can only select ${slayMaxUpgrades} upgrade${slayMaxUpgrades > 1 ? 's' : ''}!`);
            return;
        }
    } else {
        // Remove from selected list (remove first occurrence)
        const index = slaySelectedUpgrades.indexOf(upgrade);
        if (index > -1) {
            slaySelectedUpgrades.splice(index, 1);
        }
    }

    updateSlaySelectedDisplay();
}

function updateSlaySelectedDisplay() {
    const display = document.getElementById('selectedSlayUpgrades');
    const confirmBtn = document.getElementById('confirmSlayUpgradesBtn');

    if (slaySelectedUpgrades.length === 0) {
        display.textContent = 'None yet';
        confirmBtn.disabled = true;
    } else {
        const upgradeNames = {
            'killing-it': '⚡ Killing it!',
            'more-power': '💪 More power',
            'more-coverage': '👥 More coverage',
            'take-something': '🎯 Take something',
            'keep-focused': '👀 Keep focused',
            'make-comeback': '🔄 Make a comeback'
        };

        display.innerHTML = slaySelectedUpgrades.map(u => `<div class="selected-upgrade-pill">${upgradeNames[u] || u}</div>`).join('');
        confirmBtn.disabled = slaySelectedUpgrades.length !== slayMaxUpgrades;
    }
}

function confirmSlayUpgrades() {
    if (slaySelectedUpgrades.length !== slayMaxUpgrades) {
        alert(`Please select exactly ${slayMaxUpgrades} upgrade${slayMaxUpgrades > 1 ? 's' : ''}!`);
        return;
    }

    // Show notification of selected upgrades
    const upgradeNames = {
        'killing-it': 'Killing it!',
        'more-power': 'More power',
        'more-coverage': 'More coverage',
        'take-something': 'Take something',
        'keep-focused': 'Keep focused',
        'make-comeback': 'Make a comeback'
    };

    const selectedNames = slaySelectedUpgrades.map(u => upgradeNames[u] || u).join(', ');
    showNotification(`✨ Slay Upgrades: ${selectedNames}`);

    closeSlayUpgradesModal();
    saveToCloud();
}

function closeSlayUpgradesModal() {
    const modal = document.getElementById('slayUpgradesModal');
    modal.classList.add('hidden');
    slaySelectedUpgrades = [];
}

// ================================
// MISC UI
// ================================

function setupMiscUI() {
    // Recover burnt tags button
    document.getElementById('recoverBtn').addEventListener('click', recoverAllBurntTags);

    // Send to MC button
    const sendToMcBtn = document.getElementById('sendToMcBtn');
    if (sendToMcBtn) {
        sendToMcBtn.addEventListener('click', () => {
            broadcastToMc();
            showNotification('📤 Character sent to MC!');
        });
    }

    // Lock character button
    const lockBtn = document.getElementById('lockCharacterBtn');
    if (lockBtn) {
        lockBtn.addEventListener('click', lockAllCharacterFields);
        // Hide button if character is already locked
        if (characterData.characterLocked) {
            lockBtn.style.display = 'none';
        }
    }

    // Toggle moves panel
    const toggleMovesBtn = document.getElementById('toggleMovesBtn');
    const movesPanel = document.getElementById('movesPanel');

    toggleMovesBtn.addEventListener('click', () => {
        movesPanel.classList.toggle('hidden');
    });

    // Juice spending modal buttons
    document.getElementById('createStoryTagBtn').addEventListener('click', createStoryTagFromJuice);
    document.getElementById('createStatusBtn').addEventListener('click', createStatusFromJuice);
    document.getElementById('closeJuiceModalBtn').addEventListener('click', closeJuiceSpendingModal);

    // Setup upgrade checkbox listeners
    const upgradeCheckboxes = ['prolongEffect', 'scaleUpEffect', 'makeFlashier'];
    upgradeCheckboxes.forEach(id => {
        document.getElementById(id).addEventListener('change', applyJuiceUpgrades);
    });

    // Deepen Relationship modal buttons
    document.getElementById('confirmDeepenBtn').addEventListener('click', confirmDeepenRelationship);
    document.getElementById('cancelDeepenBtn').addEventListener('click', closeDeepenRelationshipModal);
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
    setupDowntime(); // NEW: Setup Downtime moves
    setupCombos();
    setupPortraitToggle();
    setupColorPicker();
    setupCharacterInfo();
    setupFileHandling();
    setupMiscUI();

    // Listen for MC tag updates
    document.addEventListener('mc-tag-update', handleMCTagUpdate);

    // Initial UI update
    updateBurntTagsDisplay();
    updateStatusTagsDisplay();
    updateStoryTagsDisplay();
    updateCluesDisplay(); // NEW: Update clues display

    // Store initial character name in localStorage for MC broadcast matching
    if (characterData.name) {
        localStorage.setItem('currentCharacterName', characterData.name);
    }

    // Setup disable cloud save checkbox
    const disableCloudSaveCheckbox = document.getElementById('disableCloudSave');
    if (disableCloudSaveCheckbox) {
        // Load saved preference
        const savedPreference = localStorage.getItem('disableCloudSave') === 'true';
        disableCloudSaveCheckbox.checked = savedPreference;

        // Listen for changes
        disableCloudSaveCheckbox.addEventListener('change', (e) => {
            localStorage.setItem('disableCloudSave', e.target.checked);
            if (e.target.checked) {
                console.log('☁️ Cloud save disabled - will only broadcast to MC');
                showNotification('☁️ Cloud save disabled. Will still broadcast to MC.');
            } else {
                console.log('☁️ Cloud save enabled');
                showNotification('☁️ Cloud save enabled');
            }
        });
    }

    console.log('✅ Player Companion ready!');
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

// ================================
// DEBUG/TEST FUNCTIONS
// ================================

/**
 * Test function to manually add tags (for debugging)
 * Call from browser console: testAddTags()
 */
window.testAddTags = function() {
    console.log('🧪 Testing tag display with sample data...');

    // Simulate MC sending tags
    const testEvent = new CustomEvent('mc-tag-update', {
        detail: {
            statusTags: [
                "Inspired (+2) Ongoing",
                "Weakened (-1) Temporary",
                "Focused (+1) Ongoing"
            ],
            storyTags: [
                "Undercover (+1) Temporary",
                "Suspicious (-2) Ongoing"
            ]
        }
    });

    document.dispatchEvent(testEvent);
    console.log('✅ Test tags dispatched. Check the Status/Story Tags sections.');
};

/**
 * Test function to simulate actual MC broadcast structure
 * Call from browser console: testMCBroadcast()
 */
window.testMCBroadcast = function() {
    console.log('🧪 Testing with actual MC broadcast structure...');

    const currentCharName = localStorage.getItem('currentCharacterName');
    console.log('  Current character name in localStorage:', currentCharName);

    // Simulate the actual MC broadcast structure with ACTUAL format from MC
    const mockBroadcast = {
        players: [
            {
                name: currentCharName || "Test Character",
                tags: {
                    status: [
                        "mama-jays-blessing (+1 Temporary)",  // Actual MC format
                        "weakened (-2 Ongoing)"               // Actual MC format
                    ],
                    story: [
                        "investigating-the-crime (+1 Temporary)"
                    ]
                }
            }
        ]
    };

    console.log('  Mock broadcast data:', mockBroadcast);

    // Manually trigger the tag extraction logic
    const statusTags = mockBroadcast.players[0].tags.status || [];
    const storyTags = mockBroadcast.players[0].tags.story || [];

    const testEvent = new CustomEvent('mc-tag-update', {
        detail: {
            statusTags: statusTags,
            storyTags: storyTags
        }
    });

    document.dispatchEvent(testEvent);
    console.log('✅ MC-style broadcast dispatched. Check the Status/Story Tags sections.');
};

/**
 * Test function to check if display elements exist
 */
window.checkDisplayElements = function() {
    console.log('🔍 Checking display elements...');
    const statusList = document.getElementById('statusList');
    const storyList = document.getElementById('storyTagList');

    console.log('statusList element:', statusList ? '✅ Found' : '❌ NOT FOUND');
    console.log('storyTagList element:', storyList ? '✅ Found' : '❌ NOT FOUND');

    if (statusList) console.log('  statusList parent:', statusList.parentElement);
    if (storyList) console.log('  storyTagList parent:', storyList.parentElement);

    return { statusList: !!statusList, storyList: !!storyList };
};

console.log('💡 Debug functions available:');
console.log('  - testAddTags() - Test with simple tag format');
console.log('  - testMCBroadcast() - Test with actual MC broadcast structure');
console.log('  - checkDisplayElements() - Verify DOM elements exist');
