# QUEERZ! Player Companion App v2

## 🌈 Complete Redesign with Flexible Theme System

This is the **brand new Player App** designed to accompany the [MC App](https://github.com/benwieler-commits/queerz-mc-app). It features a completely flexible theme system, enhanced tag mechanics, and comprehensive game rules implementation.

---

## ✨ NEW FEATURES

### 1. **Flexible 4-Theme System**
- **Any Combination**: Choose any mix of **Rainbow (Runway)** or **Anchor (Realness)** themes
- **Rainbow/Runway Themes** 🌈: Motivation-focused themes with Growth/Shade trackers
- **Anchor/Realness Themes** ⚓: Identity-focused themes with Growth/Release trackers
- Switch theme types on-the-fly with dropdown selectors

### 2. **Tag Unlocking System**
- **6 Total Tags**: Each theme has 6 power tags (3 active + 3 greyed out)
- **Growth Progression**: Fill 3 Growth boxes → unlock 1 greyed-out tag
- **Repeat Until Complete**: Keep unlocking tags until all 6 are available
- **Enhanced Themes**: Once all 6 unlocked, next Growth completion lets you create a new enhanced theme

### 3. **Theme Fading Mechanics**

#### Rainbow Themes
- **Shade Tracker**: 3 boxes
- When all 3 filled → theme **fades** and must be replaced with an **Anchor theme**

#### Anchor Themes
- **Release Tracker**: 3 boxes
- When all 3 filled → theme **fades** and must be replaced with a **Rainbow theme**

### 4. **Tag Burning & Recovery**
- **Flame Icon** (🔥): Click to burn any power tag or weakness
- **Burnt tags cannot be used** until the MC prompts recovery
- **"Recover All Burnt Tags"** button restores all burnt tags during Downtime

### 5. **Core Move Selection (Required)**
- **Must select a move** before rolling dice
- 7 Core Moves available: Strike a Pose, Slay, Get a Clue, Talk It Out, Care, Be Vulnerable, Resist
- Visual feedback with highlighted selection

### 6. **Juice System**
- **Generate Juice on rolls**:
  - **7-9**: +1 Juice
  - **10+**: +3 Juice
- **Spend Juice**:
  - Spend up to 3 Juice to increase Power (+1 per Juice)
  - Spend exactly 3 Juice to activate a Combo
- **Reset clears unused Juice**

### 7. **Auto-Growth on Weakness**
- If you use a **Weakness tag** AND roll **6-** → automatically gain +1 Growth on that theme
- Helps balance risk/reward of using weaknesses

### 8. **Color Customization**
- **Hexcode color picker** to customize your character sheet
- Changes borders, highlights, and theme colors throughout the app
- Saved in character JSON for persistence

### 9. **Portrait Toggle**
- Switch between **Civilian** and **Q-Factor** portrait modes
- Both portraits broadcast to MC

### 10. **MC-Managed Tags**
- **Status Tags** and **Story Tags** are assigned by the MC
- Positive status tags add power, negative tags subtract
- Player receives them via Firebase broadcast

---

## 📋 GAME MECHANICS

### Power Calculation
1. **Click Power Tags** → Each adds +1 Power (once per roll)
2. **Status Tags** automatically modify power (positive = add, negative = subtract)
3. **Spend Juice** to boost power (up to +3)
4. **Total Power** displayed before rolling

### Dice Rolling Flow
1. **Select Core Move** (required)
2. **Click relevant tags** from your themes
3. **Check total power** in dice roller
4. **Roll 2d6 + Power**
5. **Receive Juice** based on result (7-9 = 1, 10+ = 3)
6. **Reset** when done (clears unused Juice and clicked tags)

### Tag Combos
- Create custom combos with 2-3 tags
- Cost: **3 Juice** to activate
- Stored in character data for reuse

### Growth & Fading
- **Growth**: 3 boxes fill → unlock next tag OR create enhanced theme
- **Shade (Rainbow)**: 3 boxes fill → theme fades, replace with Anchor
- **Release (Anchor)**: 3 boxes fill → theme fades, replace with Rainbow

---

## 🔥 FIREBASE INTEGRATION

### Player → MC Broadcast
The player automatically broadcasts to the MC:
- Character name & pronouns
- Current portrait (Civilian or Q-Factor)
- Status tags
- Story tags
- Juice count

### MC → Player Broadcast
The player receives from the MC:
- Current scene name & image
- Background music & audio player
- NPC/Spotlight character portrait
- Status tags (with power modifiers)
- Story tags

---

## 💾 DATA MANAGEMENT

### Export Character (End of Session)
1. Click **"💾 Export JSON"**
2. Send the JSON file to your MC
3. MC manually updates their records

### Import Character (Start of Session)
1. Receive updated JSON from MC
2. Click **"📁 Upload JSON"**
3. Character loads with all progress intact

### Auto-Save (Cloud)
- Character auto-saves to Firebase every second (when cloud is ON)
- Cloud sync indicator in header shows connection status

---

## 🎨 DESIGN PHILOSOPHY

### Folio Style
Based on the original `styles-player.css` design:
- **3-column layout** (themes on sides, portrait/dice in center)
- **Teal primary** (#4A7C7E), **coral accent** (#E89B9B), **gold tags** (#F4D35E)
- **Rainbow theme**: Pink/purple gradient borders with glow
- **Anchor theme**: Teal/blue gradient borders with glow
- **Glass-morphism** effects on combos and move selector

### Responsive
- Collapses to single column on mobile (<900px)
- Touch-friendly buttons and inputs
- Maintains readability across devices

---

## 🚀 GETTING STARTED

### 1. Open the App
Open `player-app-v2.html` in your browser

### 2. Set Up Your Character
- Enter name and pronouns
- Choose a theme color
- Upload portrait images (optional)

### 3. Configure Your Themes
- Select Rainbow or Anchor for each of the 4 themes
- Name each theme
- Add your power tags (first 3 are unlocked)
- Add a weakness tag to each theme

### 4. During Play
- Click a Core Move before each roll
- Click tags you want to use
- Roll dice
- Manage Juice and track Growth
- Let MC update your Status/Story tags

### 5. After Session
- Export JSON
- Send to MC for safekeeping

---

## 📁 FILE STRUCTURE

```
player-app-v2.html          # Main HTML structure
player-app-v2.css           # Complete styling with Rainbow/Anchor themes
player-app-v2.js            # Full game mechanics & Firebase integration
blank-character-v2.json     # Template for new characters
firebase-config.js          # Firebase configuration (shared)
```

---

## 🆚 DIFFERENCES FROM OLD PLAYER APP

| Feature | Old App | New App v2 |
|---------|---------|------------|
| Theme Structure | Fixed layout | Flexible Rainbow/Anchor combination |
| Tags per Theme | 3 | 6 (3 unlocked, 3 greyed out) |
| Growth System | Basic | Unlock tags progressively |
| Fading Mechanics | None | Shade/Release trackers |
| Tag Burning | Basic | Flame icons with recovery system |
| Core Move Selection | Optional | **Required** before rolling |
| Juice System | Manual | Auto-generated on rolls |
| Weakness Mechanics | None | Auto-Growth on 6- rolls |
| Color Customization | Fixed | Hexcode picker |
| Portrait Modes | Single | Civilian + Q-Factor toggle |

---

## 🐛 TROUBLESHOOTING

### Tags Won't Click
- Check if tag is burnt (greyed out with strikethrough)
- Check if tag is locked (greyed out, need to fill Growth)
- Make sure tag has text entered

### Can't Roll Dice
- **You must select a Core Move first**
- Red warning will appear if you try without selecting

### Juice Not Generating
- Juice only generates on **7-9** (1 Juice) or **10+** (3 Juice)
- Rolling **6-** gives no Juice

### Firebase Not Connecting
- Check cloud status badge in header
- Click "☁️ Cloud: OFF" to toggle connection
- Refresh page if connection fails

### Theme Not Fading
- Shade/Release only trigger when **all 3 boxes are filled**
- You must manually replace the theme (system just alerts you)

---

## 📞 SUPPORT

For bugs or feature requests, open an issue on:
- [Player App Repository](https://github.com/benwieler-commits/queerz-player-app)
- [MC App Repository](https://github.com/benwieler-commits/queerz-mc-app)

---

## 🙏 CREDITS

- **Design**: Based on original QUEERZ! physical character sheets
- **CSS Framework**: Folio-style layout from `styles-player.css`
- **Firebase**: Real-time sync and broadcasting
- **Icons**: Unicode emojis for accessibility

---

**Made with 🌈 for the QUEERZ! community**
