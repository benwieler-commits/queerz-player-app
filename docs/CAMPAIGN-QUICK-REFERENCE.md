# 🎯 Campaign System - Quick Reference

## Common Operations Cheat Sheet

### 🎬 Campaign Basics

```javascript
// Import functions
import {
  createCampaign,
  joinCampaign,
  loadCampaign,
  listUserCampaigns
} from './campaign-manager.js';

// CREATE NEW CAMPAIGN (MC only)
const id = await createCampaign({
  name: "My Campaign",
  description: "Campaign description"
});

// JOIN CAMPAIGN (Players)
await joinCampaign("campaign-id", "Character Name");

// LOAD CAMPAIGN
await loadCampaign("campaign-id");

// LIST MY CAMPAIGNS
const campaigns = await listUserCampaigns();
```

---

### 🎭 Scene Management

```javascript
import { addScene, setCurrentScene } from './campaign-manager.js';

// ADD SCENE
const sceneId = await addScene({
  name: "Scene Name",
  description: "What happens",
  arcId: "arc-1",
  order: 5,
  imageUrl: "image-url",
  musicUrl: "music-url"
});

// SET AS CURRENT SCENE (broadcast to all)
await setCurrentScene(sceneId);
```

---

### 🔀 Branching Choices

```javascript
import {
  createBranchPoint,
  makeChoice,
  voteOnBranch,
  getBranchVotes
} from './campaign-manager.js';

// CREATE BRANCH POINT
const branchId = await createBranchPoint("scene-id", {
  question: "What do you do?",
  options: [
    { id: "opt-a", text: "Option A", consequences: ["tag-a"] },
    { id: "opt-b", text: "Option B", consequences: ["tag-b"] }
  ],
  votingEnabled: true // true for group vote, false for single choice
});

// SINGLE CHOICE (one player decides)
await makeChoice("branch-id", "opt-a", "scene-id");

// GROUP VOTE (all players vote)
await voteOnBranch("branch-id", "opt-a", "scene-id");

// GET VOTE RESULTS
const votes = await getBranchVotes("branch-id", "scene-id");
// Returns: { "opt-a": 3, "opt-b": 1 }
```

---

### 📊 Session Tracking

```javascript
import { startSession, endSession } from './campaign-manager.js';

// START SESSION
const sessionId = await startSession();

// ... play session ...

// END SESSION
await endSession(sessionId, [
  "major-event-1",
  "major-event-2"
]);
```

---

### 💾 Character States

```javascript
import {
  saveCharacterState,
  loadCharacterState
} from './campaign-manager.js';

// SAVE CHARACTER STATE TO CAMPAIGN
await saveCharacterState({
  name: "Character Name",
  juice: 5,
  burntTags: ["tag1"],
  currentStatuses: [{name: "Status", tier: 2}],
  storyTags: [{name: "Story Tag", ongoing: true}]
});

// LOAD CHARACTER STATE FROM CAMPAIGN
const state = await loadCharacterState("Character Name");
if (state) {
  // Apply state to character
  character.juice = state.juice;
  // etc.
}
```

---

### 📡 Real-Time Listeners

```javascript
import {
  listenToCampaignUpdates,
  listenToCurrentScene
} from './campaign-manager.js';

// LISTEN TO ALL CAMPAIGN CHANGES
const unsubscribe = listenToCampaignUpdates("campaign-id", (campaign) => {
  console.log("Campaign updated:", campaign);
});

// LISTEN TO CURRENT SCENE CHANGES
listenToCurrentScene("campaign-id", (scene) => {
  console.log("Scene changed:", scene.name);
  // Update UI
});

// Stop listening when done
unsubscribe();
```

---

## 🎮 Typical Session Flow

### MC Workflow

```javascript
// 1. Load campaign
await loadCampaign("campaign-id");

// 2. Start session
const sessionId = await startSession();

// 3. Set first scene
const scene1 = await addScene({
  name: "Opening Scene",
  arcId: "arc-1",
  order: 1
});
await setCurrentScene(scene1);

// 4. Add branch point if needed
await createBranchPoint(scene1, {
  question: "What do you do?",
  options: [...]
});

// 5. Wait for player choices/votes

// 6. Continue with next scene based on choices

// 7. End session
await endSession(sessionId, ["events-from-session"]);
```

### Player Workflow

```javascript
// 1. Join campaign (first time only)
await joinCampaign("campaign-id", "Character Name");

// 2. Load campaign at session start
await loadCampaign("campaign-id");

// 3. Load character state
const state = await loadCharacterState("Character Name");
if (state) {
  // Apply to character
}

// 4. Listen to current scene
listenToCurrentScene("campaign-id", (scene) => {
  console.log("Now playing:", scene.name);
});

// 5. Vote on choices when prompted
await voteOnBranch("branch-id", "option-id", "scene-id");

// 6. Save state at end of session
await saveCharacterState(character);
```

---

## 📋 Console Testing Commands

Open browser console and try these:

```javascript
// Test: Create campaign
const id = await createCampaign({name: "Test", description: "Test campaign"});
console.log("Campaign ID:", id);

// Test: List campaigns
const camps = await listUserCampaigns();
console.log(camps);

// Test: Load campaign
await loadCampaign("paste-campaign-id-here");

// Test: Add scene
const sid = await addScene({name: "Test Scene", arcId: "arc-1", order: 1});
console.log("Scene ID:", sid);

// Test: Create branch
const bid = await createBranchPoint(sid, {
  question: "Test?",
  options: [
    {id: "a", text: "Option A", consequences: ["test-a"]},
    {id: "b", text: "Option B", consequences: ["test-b"]}
  ]
});

// Test: Vote
await voteOnBranch(bid, "a", sid);

// Test: Get votes
const votes = await getBranchVotes(bid, sid);
console.log("Votes:", votes);
```

---

## 🔥 Firebase Paths

Quick reference to Firebase database paths:

```
campaigns/
  {campaignId}/
    metadata/name              - Campaign name
    metadata/mcUserId          - MC's user ID
    metadata/currentScene      - Current scene ID
    metadata/status            - active/paused/completed

    players/
      {userId}/characterName   - Player's character

    storyState/
      currentArc               - Current story arc
      branches/                - All choices made

    scenes/
      {sceneId}/              - Scene data

    sessions/
      {sessionId}/            - Session data

    characterStates/
      {userId}/
        {characterName}/      - Character snapshot
```

---

## 💡 Pro Tips

1. **Campaign IDs**: Always save the campaign ID! It's the only way to access the campaign.

2. **State Management**: Save character states after each major scene, not just at end of session.

3. **Branching**: Keep consequences simple (1-2 word tags). Use them to filter which scenes to show.

4. **Voting**: Use `votingEnabled: true` for big decisions, false for individual character moments.

5. **Arcs**: Use consistent arc IDs like "arc-1-awakening", "arc-2-conflict", "arc-3-resolution".

6. **Testing**: Test in console before building UI. Firebase console lets you see/edit everything.

7. **Backup**: Periodically export campaign data from Firebase Console.

---

## 🆘 Troubleshooting

**Can't create campaign?**
- Check if authenticated: `console.log(window.currentUserId)`
- Check Firebase rules allow writes to `/campaigns/`

**Can't load campaign?**
- Verify campaign ID is correct
- Check Firebase rules allow reads

**Character state not saving?**
- Make sure campaign is loaded first
- Check character name matches exactly

**Votes not working?**
- Verify scene ID and branch ID are correct
- Check if `votingEnabled: true` in branch point

---

## 📖 Full Documentation

See `CAMPAIGN-GUIDE.md` for complete documentation and examples.
