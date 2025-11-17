# 🎮 QUEERZ! JUICE SYSTEM IMPLEMENTATION GUIDE

## ✅ Implementation Complete!

This guide explains the comprehensive Juice system that has been implemented in your QUEERZ! Player Companion App.

---

## 📝 WHAT'S NEW

### 1. **Strike a Pose Special Juice Rules** ⭐
- **Normal Moves**: Auto-award +3 Juice on 10+, +1 Juice on 7-9 (unchanged)
- **Strike a Pose** (NEW special rules):
  - On 7+: Gain Juice equal to **Power used in the roll**
  - On 10+: Gain **minimum of 2 Juice** (even if Power was 0 or 1)
  - Example: If Power is 4 and roll is 11 → gain 4 Juice
  - Example: If Power is 1 and roll is 10 → gain 2 Juice (minimum enforced)

### 2. **Juice Spending Interface** 💰
After a successful Strike a Pose roll (7+), a modal automatically appears allowing you to spend Juice on:

**Create Story Tag** (1 Juice each):
- Enter tag name (e.g., "confident-energy")
- Tag is marked as "temporary" (single-use) by default
- Can be made "ongoing" with the "Prolong Effect" upgrade

**Create Positive Status** (1 Juice per tier):
- Enter status name (e.g., "battle-ready")
- Select tier (1-4)
- Cost = tier value (tier-3 costs 3 Juice)
- Status is "temporary" by default
- Can be made "ongoing" with the "Prolong Effect" upgrade

**Special Upgrades** (Only on 10+ rolls):
- ✅ **Prolong Effect** (1 Juice): Makes the LAST created tag/status "ongoing" instead of temporary
- ✅ **Scale Up Effect** (1 Juice): Narrative flag - makes effect bigger, more powerful
- ✅ **Make It Flashier** (1 Juice): Narrative flag - makes effect more impressive, stylish

### 3. **Downtime Moves** 🌙

**Prepare for Action** button:
- Instantly adds +3 Juice
- Represents downtime move from official rules

**Deepen Relationship** button:
- Opens modal with sliders
- Divide 3 points between Clues and Juice
- Sliders sync automatically (total always = 3)
- Confirm to apply

### 4. **Clues Tracker** 🔍
- New resource tracker below Downtime buttons
- +/- buttons to adjust manually
- Also gained through Deepen Relationship move
- Used for investigation and information gathering

### 5. **Player vs MC Tag Distinction** 👤⭐
- **Player-created tags** (from Juice): Marked with 👤 icon
- **MC-created tags**: Marked with ⭐ icon
- Visual distinction helps track tag sources

---

## 🎯 HOW TO USE THE JUICE SYSTEM

### **Playing Strike a Pose:**

1. **Select "Strike a Pose"** from the move selector
2. **Apply relevant tags** from your themes (click to highlight)
3. **Click "Roll 2d6 + Power"**
4. **Juice is auto-awarded:**
   - Roll 10+ → Gain max(Power, 2) Juice
   - Roll 7-9 → Gain Power Juice
   - Roll 6- → 0 Juice
5. **Juice Spending Modal appears** (on 7+ only)
6. **Spend your Juice:**
   - Create story tags for narrative advantages
   - Create positive statuses for mechanical bonuses
   - On 10+: Apply upgrades to enhance effects
7. **Click "Done Spending Juice"** when finished

### **Using Downtime:**

**To Prepare for Action:**
- Click "Prepare for Action" button
- Instantly gain +3 Juice
- Use this when you have narrative downtime

**To Deepen Relationship:**
- Click "Deepen Relationship" button
- Drag sliders to divide 3 points between Clues and Juice
- Click "Confirm" to apply
- Example: 2 Clues + 1 Juice, or 1 Clues + 2 Juice, etc.

---

## 🔧 TECHNICAL CHANGES SUMMARY

### **Files Modified:**

1. **index.html**
   - Added Downtime section with buttons
   - Added Clues tracker
   - Added Juice Spending Modal
   - Added Deepen Relationship Modal
   - Updated tag source notes

2. **styles.css**
   - Added Downtime section styling (purple gradient, touch-friendly buttons)
   - Added Clues tracker styling
   - Added Juice Spending Modal styling (full-screen overlay, animated)
   - Added Deepen Relationship Modal styling
   - Added player-created vs MC-created tag icons
   - Added responsive design for mobile

3. **app.js**
   - Added `clues` to characterData
   - Added `lastRollResult` tracking
   - Added `createdItemsThisRoll` tracking
   - Updated dice rolling logic for Strike a Pose special rules
   - Added `openJuiceSpendingModal()` function
   - Added `closeJuiceSpendingModal()` function
   - Added `createStoryTagFromJuice()` function
   - Added `createStatusFromJuice()` function
   - Added `applyJuiceUpgrades()` function
   - Added `setupDowntime()` function
   - Added `updateCluesDisplay()` function
   - Added Deepen Relationship modal functions
   - Updated tag display functions to show MC vs player-created distinction
   - Added clues loading to `loadCharacterToUI()`

---

## ✅ TESTING CHECKLIST

### **Test 1: Strike a Pose Juice Calculation**
- [ ] Select "Strike a Pose" move
- [ ] Apply tags to get Power = 0
- [ ] Roll and get 10+
- [ ] Verify you gained **2 Juice** (minimum enforced) ✅
- [ ] Reset and try with Power = 3
- [ ] Roll and get 10+
- [ ] Verify you gained **3 Juice** (equals Power) ✅
- [ ] Reset and try with Power = 4
- [ ] Roll and get 7-9
- [ ] Verify you gained **4 Juice** (equals Power) ✅

### **Test 2: Juice Spending Modal**
- [ ] Strike a Pose and get 7+
- [ ] Verify modal opens automatically ✅
- [ ] Create a story tag (spend 1 Juice)
- [ ] Verify tag appears in created items list ✅
- [ ] Verify Juice count decreases ✅
- [ ] Create a tier-2 status (spend 2 Juice)
- [ ] Verify status appears in created items list ✅
- [ ] Close modal
- [ ] Verify tags appear in Story Tags section ✅
- [ ] Verify statuses appear in Status Tags section ✅

### **Test 3: Juice Upgrades (10+ only)**
- [ ] Strike a Pose and get 10+
- [ ] Verify "Special Upgrades" section is visible ✅
- [ ] Create a story tag
- [ ] Check "Prolong Effect"
- [ ] Verify tag becomes "Ongoing" instead of "Temporary" ✅
- [ ] Verify 1 Juice was deducted ✅
- [ ] Try "Scale Up Effect" and "Make It Flashier"
- [ ] Verify they cost 1 Juice each ✅

### **Test 4: Downtime - Prepare for Action**
- [ ] Note current Juice count
- [ ] Click "Prepare for Action" button
- [ ] Verify +3 Juice was added ✅
- [ ] Verify notification appears ✅

### **Test 5: Downtime - Deepen Relationship**
- [ ] Click "Deepen Relationship" button
- [ ] Verify modal opens ✅
- [ ] Drag Clues slider to 2
- [ ] Verify Juice slider automatically shows 1 ✅
- [ ] Click "Confirm"
- [ ] Verify +2 Clues, +1 Juice was added ✅
- [ ] Verify notification appears ✅

### **Test 6: Clues Tracker**
- [ ] Click Clues "+" button
- [ ] Verify Clues count increases ✅
- [ ] Click Clues "-" button
- [ ] Verify Clues count decreases ✅
- [ ] Verify can't go below 0 ✅

### **Test 7: Player vs MC Tag Distinction**
- [ ] Create a story tag via Juice spending
- [ ] Verify it has 👤 icon ✅
- [ ] Ask MC to send you a tag (or manually add via MC broadcast)
- [ ] Verify MC tags have ⭐ icon ✅

### **Test 8: Normal Moves Still Work**
- [ ] Select "Slay" move
- [ ] Roll 10+
- [ ] Verify you get **+3 Juice** (normal rules) ✅
- [ ] Verify modal does NOT open ✅
- [ ] Select "Get a Clue"
- [ ] Roll 7-9
- [ ] Verify you get **+1 Juice** (normal rules) ✅

### **Test 9: Save/Load with Clues**
- [ ] Set Clues to 5
- [ ] Export JSON
- [ ] Clear character
- [ ] Import JSON
- [ ] Verify Clues = 5 after load ✅

### **Test 10: Responsive Design (Touch-friendly)**
- [ ] Test on Surface Pro 4 touch interface
- [ ] Verify buttons are large enough to tap ✅
- [ ] Verify modals are easy to interact with ✅
- [ ] Verify sliders work with touch ✅

---

## 🎨 UI LOCATIONS

### **Downtime Section**
- **Location**: Center column, between Juice Tracker and Dice Roller
- **Color**: Purple gradient (matches accent-purple theme)
- **Components**:
  - "Prepare for Action" button (left)
  - "Deepen Relationship" button (right)
  - Clues tracker below

### **Juice Spending Modal**
- **Trigger**: Automatically opens after successful Strike a Pose roll (7+)
- **Appearance**: Full-screen overlay with dark gradient background
- **Sections**:
  - Header showing available Juice
  - Story Tag creation
  - Status creation
  - Special Upgrades (10+ only)
  - Created items list
  - "Done Spending Juice" button

### **Deepen Relationship Modal**
- **Trigger**: Click "Deepen Relationship" button
- **Appearance**: Centered modal with purple border
- **Components**:
  - Clues slider (0-3)
  - Juice slider (0-3)
  - Sliders sync automatically
  - Confirm/Cancel buttons

### **Tag Source Icons**
- **Player-created**: 👤 icon in top-left corner
- **MC-created**: ⭐ icon in top-left corner
- **Location**: Story Tags and Status Tags sections

---

## 🐛 TROUBLESHOOTING

### **Modal doesn't open after Strike a Pose:**
- Check browser console for errors
- Verify you selected "Strike a Pose" before rolling
- Verify roll result was 7 or higher
- Try hard refresh (Ctrl+F5)

### **Clues not showing:**
- Export character JSON
- Verify `"clues": 0` exists in the JSON
- If missing, manually add it or re-import

### **Juice calculation seems wrong:**
- Verify you selected "Strike a Pose" (check selected move display)
- Check roll result and Power value
- Formula: 10+ = max(Power, 2), 7-9 = Power

### **Sliders not syncing in Deepen Relationship:**
- Clear browser cache
- Hard refresh
- Check browser console for JavaScript errors

---

## 📚 CODE LOCATIONS

### **Strike a Pose Juice Logic:**
- **File**: `app.js`
- **Lines**: ~533-626
- **Function**: Inside `rollBtn.addEventListener('click', ...)`

### **Juice Spending Modal:**
- **File**: `app.js`
- **Lines**: ~1710-1956
- **Functions**:
  - `openJuiceSpendingModal()`
  - `closeJuiceSpendingModal()`
  - `createStoryTagFromJuice()`
  - `createStatusFromJuice()`
  - `applyJuiceUpgrades()`
  - `updateCreatedItemsList()`

### **Downtime Functions:**
- **File**: `app.js`
- **Lines**: ~1958-2059
- **Functions**:
  - `setupDowntime()`
  - `updateCluesDisplay()`
  - `openDeepenRelationshipModal()`
  - `closeDeepenRelationshipModal()`
  - `confirmDeepenRelationship()`

### **Tag Display Updates:**
- **File**: `app.js`
- **Lines**: ~1347-1467
- **Functions**:
  - `updateStatusTagsDisplay()` (updated)
  - `updateStoryTagsDisplay()` (updated)

---

## 🎉 FEATURES PRESERVED

All existing features still work:
- ✅ Tag burning mechanics
- ✅ Combo system
- ✅ Firebase cloud sync
- ✅ MC broadcast system
- ✅ Portrait toggling
- ✅ Theme tracking (Rainbow/Anchor)
- ✅ JSON export/import
- ✅ Character locking
- ✅ All other core moves

---

## 💡 USAGE TIPS

1. **Save Juice for Big Moments**: Don't spend all your Juice immediately. Save it for critical Strike a Pose moments.

2. **Prolong Effect Strategy**: Create multiple tags, then use Prolong Effect on the most important one.

3. **Downtime Timing**: Use "Prepare for Action" before entering dangerous situations.

4. **Clues vs Juice Trade-off**: When using Deepen Relationship, consider what you need more - information (Clues) or mechanical power (Juice).

5. **Player-Created Tags**: Track which tags you created vs MC gave you. Player tags show your character's growth!

---

## 📞 SUPPORT

If you encounter issues:
1. Check browser console (F12) for error messages
2. Export your character JSON for backup
3. Try hard refresh (Ctrl+F5)
4. Clear browser cache
5. Check this guide's Troubleshooting section

---

## 🎮 HAVE FUN!

The Juice system adds strategic depth while staying true to QUEERZ! rules. Enjoy creating fabulous narrative effects and building your character through Strike a Pose!

---

**Version**: 1.0
**Date**: 2025-11-17
**Implemented by**: Claude (Anthropic)
