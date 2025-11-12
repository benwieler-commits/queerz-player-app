# 🎭 MC App Setup & Usage Guide

## Overview

The MC App allows you to create and manage campaigns, broadcast scenes, track player choices, and automatically progress through chapters based on branching story outcomes.

---

## 🚀 Quick Start

### 1. Open the MC App

Open `mc-app.html` in your browser.

### 2. Create Your First Campaign

1. Click **"+ Create Campaign"**
2. Enter campaign name and description
3. Click **"Create Campaign"**
4. **IMPORTANT:** Copy the Campaign ID that appears
5. Share this ID with your players so they can join

### 3. Add Chapters

1. In the right panel, find "Add Chapter"
2. Enter chapter number (1, 2, 3, etc.)
3. Enter chapter name
4. Write your script in the text area
5. Click **"+ Add Chapter"**

### 4. Add Scenes

1. Select your campaign from the dropdown
2. In "Quick Add Scene", enter scene name and description
3. Click **"+ Add Scene"**
4. Scenes are automatically linked to the current chapter

### 5. Start a Session

1. Click **"Start Session"**
2. Broadcast scenes to players
3. Track choices in the script overlay
4. End session when done

---

## 📖 Understanding Firebase Structure

### **Why Campaigns Don't Appear Until Created**

Firebase uses a **lazy creation** model:
- Folders/paths don't exist until data is written to them
- When you call `createCampaign()`, Firebase creates:
  - `campaigns/{campaignId}/`
  - All nested structures (metadata, players, scenes, etc.)

**The campaign folder IS created** when you generate the ID. You can verify in Firebase Console:

1. Go to https://console.firebase.google.com/
2. Select "queerz-mc-live" project
3. Go to "Realtime Database"
4. Navigate to `campaigns/`
5. You'll see your campaign ID

### Firebase Campaign Structure

```
campaigns/
  {campaign-id-here}/           ← Created when createCampaign() is called
    metadata/
      name: "Pride City Resistance"
      mcUserId: "uid-123"
      currentChapter: 1
      status: "active"

    players/                    ← Populated when players join
      {player-uid}/
        characterName: "Gertrude"

    scenes/                     ← Populated when you add scenes
      {scene-id}/
        name: "Opening Scene"

    chapters/                   ← Populated when you add chapters
      1/
        name: "Chapter 1"
        script: "..."
        branchPoints: [...]

    storyState/
      branches/                 ← Populated as choices are made

    sessions/                   ← Created when sessions start
    characterStates/            ← Player character snapshots
```

**To verify campaign exists:**
```javascript
// In browser console
const campaign = await loadCampaign("your-campaign-id");
console.log(campaign);
```

---

## 🎬 Using the Script Overlay

### Opening the Overlay

Click **"📜 Show Script"** in the header.

### What You See

1. **Chapter Script Display**
   - Full script for the current chapter
   - Auto-formatted with headings and paragraphs

2. **Player Choices (Checkboxes)**
   - All branch points for the chapter
   - Check off choices as players make them
   - **Auto-saves when you check a box**

3. **Chapter Progress Bar**
   - Shows % of choices completed
   - Enables "Auto-Progress" when 100%

### Workflow During Play

1. Read script aloud/narrate to players
2. When players reach a choice, they vote via Player App
3. You check the chosen option in the overlay
4. Choice auto-saves to Firebase
5. Progress bar updates
6. When chapter is complete, click "Auto-Progress"

---

## 🔀 Branch Point System

### Creating Branch Points

**Method 1: Add to Chapter**

When creating a chapter, include branch points in the chapter data:

```javascript
await addChapter(campaignId, {
  number: 1,
  name: "The Meeting",
  script: "Chapter script here...",
  branchPoints: [
    {
      id: "branch-1",
      question: "Do you trust the Council?",
      options: [
        {id: "trust", text: "Trust them", consequences: ["council-ally"]},
        {id: "betray", text: "Betray them", consequences: ["council-enemy"]}
      ]
    }
  ]
});
```

**Method 2: Manual in Firebase Console**

1. Go to Firebase Console
2. Navigate to `campaigns/{id}/chapters/{num}/branchPoints/`
3. Add array of branch objects

### Branch Point Format

```javascript
{
  id: "unique-branch-id",
  question: "What do you do?",
  sceneId: "scene-id-where-choice-happens",  // Optional
  options: [
    {
      id: "option-a",
      text: "Description shown to players",
      consequences: ["tag-1", "tag-2"]  // Story tags added when chosen
    }
  ],
  resolved: false,      // Set to true when choice is made
  chosenOption: null    // Set to option id when resolved
}
```

### Consequences System

Consequences are story tags that track narrative paths:

**Example 1: Binary Choice**
```javascript
options: [
  {id: "ally", consequences: ["council-ally"]},
  {id: "enemy", consequences: ["council-enemy"]}
]
```

**Example 2: Multi-Factor Choice**
```javascript
options: [
  {id: "negotiate", consequences: ["diplomatic", "gained-time"]},
  {id: "fight", consequences: ["aggressive", "lost-advantage"]}
]
```

**Checking Consequences Later:**
```javascript
// In your script/logic
if (campaign.storyState.branches.some(b => b.consequences.includes("council-ally"))) {
  // Show scenes for ally path
} else {
  // Show scenes for enemy path
}
```

---

## 📊 Chapter Progression

### Manual Progression

Click **"▶ Next Chapter"** button to manually advance.

### Auto-Progression

When all branch points in a chapter are resolved:
1. Progress bar reaches 100%
2. "Auto-Progress" button becomes enabled
3. Click to automatically advance to next chapter
4. MC App loads the new chapter's script

### Setting Up Chapter Links

**Linear Progression:**
Chapters auto-increment (1 → 2 → 3 → 4...)

**Branching Progression:**
Set `nextChapter` based on consequences:

```javascript
// Chapter 1
{
  number: 1,
  nextChapter: 2  // Default next
}

// Chapter 2A (ally path)
{
  number: 2,
  name: "Chapter 2A: Alliance",
  nextChapter: 4,
  requiredConsequences: ["council-ally"]
}

// Chapter 2B (enemy path)
{
  number: 3,
  name: "Chapter 2B: Resistance",
  nextChapter: 4,
  requiredConsequences: ["council-enemy"]
}

// Chapter 3 (convergence)
{
  number: 4,
  name: "Chapter 3: Confrontation"
}
```

---

## 👥 Player Management

### How Players Join

1. MC shares Campaign ID
2. Players open Player App
3. Click "Join Campaign"
4. Enter Campaign ID and Character Name
5. Player appears in MC's "Active Players" list

### Viewing Players

- Left panel shows all active players
- Real-time updates as players join/leave
- Shows character name and status

### Removing Players

Currently done via Firebase Console:
1. Go to `campaigns/{id}/players/{userId}/`
2. Delete player entry

---

## 🎲 Session Management

### Starting a Session

1. Load your campaign
2. Click **"Start Session"**
3. Session starts tracking:
   - Session number (auto-increments)
   - Start time
   - Players present
   - Scenes played

### During Session

- Broadcast scenes to players
- Track choices in overlay
- Session data saves automatically

### Ending a Session

1. Click **"End Session"**
2. Enter major events (comma-separated)
3. Session data saved with:
   - End time
   - Duration
   - Major events
   - Branches resolved

### Viewing Session History

In Firebase Console:
- Navigate to `campaigns/{id}/sessions/`
- See all past sessions with full data

---

## 🎨 Scene Broadcasting

### Broadcasting a Scene

1. Select scene from dropdown
2. Click **"Broadcast Scene"**
3. All players see the scene in real-time

### What Players See

- Scene name
- Scene description
- Scene image (if provided)
- Music (if provided)

### Scene Data Structure

```javascript
{
  name: "The Warehouse",
  description: "A dark, abandoned warehouse...",
  chapterId: 1,
  arcId: "arc-1",
  order: 5,
  imageUrl: "https://example.com/warehouse.jpg",
  musicUrl: "https://example.com/tense.mp3"
}
```

---

## 🔧 Advanced Features

### Custom Chapter Scripts

Use markdown-like formatting in chapter scripts:

```
## Heading Text
This becomes a heading

**Bold Text**
This becomes bold

Normal paragraph
This is regular text
```

### Conditional Content

Based on story state:

```javascript
// In your script or code
if (hasConsequence("council-ally")) {
  showParagraph("The Council welcomes you warmly...");
} else {
  showParagraph("The Council eyes you suspiciously...");
}
```

### Multiple Arcs

Organize campaigns into story arcs:

```javascript
{
  metadata: {
    currentArc: "arc-1-awakening"
  }
}

// Scenes linked to arcs
{
  name: "Scene 1",
  arcId: "arc-1-awakening"
}
```

---

## 🐛 Troubleshooting

### Campaign Not Showing in Dropdown

**Issue:** Created campaign doesn't appear in dropdown

**Solutions:**
1. Refresh the browser
2. Check Firebase Console: `campaigns/{id}`
3. Verify you're signed in (check auth status in header)
4. Try: `await getMyCampaigns()` in console

### Players Can't Join

**Issue:** Players get "Campaign not found"

**Solutions:**
1. Verify Campaign ID is correct (copy-paste exactly)
2. Check Firebase Rules allow players to read campaigns
3. Confirm campaign exists in Firebase Console

### Choices Not Saving

**Issue:** Checkboxes don't save choices

**Solutions:**
1. Ensure branch points have correct IDs
2. Check Firebase Console for errors
3. Verify scene ID is linked to branch point
4. Look for console errors in browser

### Script Overlay Blank

**Issue:** Script overlay shows "No script loaded"

**Solutions:**
1. Ensure campaign has chapters added
2. Check current chapter has script data
3. Verify chapter number matches campaign's currentChapter
4. Add chapter with script via "Add Chapter" section

---

## 📋 Checklist: Creating a Full Campaign

- [ ] Create campaign via MC App
- [ ] Copy and save Campaign ID
- [ ] Share ID with players
- [ ] Add Chapter 1 with script
- [ ] Add branch points to Chapter 1
- [ ] Add scenes for Chapter 1
- [ ] Add Chapter 2 (and set Chapter 1's nextChapter)
- [ ] Test: Start session
- [ ] Test: Broadcast a scene
- [ ] Test: Check a choice in overlay
- [ ] Test: Progress to next chapter
- [ ] End session with major events

---

## 💡 Tips for Great Campaigns

1. **Write Scripts in Advance**: Have chapter scripts ready before session
2. **Clear Branch Points**: Make choices clear and impactful
3. **Use Consequences**: Tag all major decisions
4. **Link Chapters**: Set up chapter progression before playing
5. **Test Branches**: Create test campaigns to verify branching logic
6. **Session Notes**: Use "major events" to track what happened
7. **Player Coordination**: Communicate Campaign ID clearly
8. **Backup Data**: Periodically export campaigns from Firebase

---

## 🆘 Support

### Browser Console Commands

```javascript
// Check if signed in
console.log(window.currentUserId);

// Load your campaigns
const campaigns = await getMyCampaigns();
console.log(campaigns);

// Load specific campaign
const campaign = await loadCampaign("campaign-id");
console.log(campaign);

// Check Firebase connection
console.log(window.database);
```

### Firebase Console

Always available at:
https://console.firebase.google.com/project/queerz-mc-live

---

## 📖 Additional Resources

- See `CAMPAIGN-GUIDE.md` for player-side documentation
- See `CAMPAIGN-QUICK-REFERENCE.md` for command reference
- Firebase docs: https://firebase.google.com/docs

---

Happy storytelling! 🎭✨
