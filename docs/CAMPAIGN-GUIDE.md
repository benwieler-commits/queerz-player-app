# 🎭 QUEERZ! Campaign & Branching System Guide

## Overview

This guide explains how to create, manage, and run campaigns with branching storylines in the QUEERZ! Player Companion app.

---

## 📚 Table of Contents

1. [Campaign Structure](#campaign-structure)
2. [Creating a New Campaign](#creating-a-new-campaign)
3. [Adding Players to a Campaign](#adding-players-to-a-campaign)
4. [Managing Scenes and Story Arcs](#managing-scenes-and-story-arcs)
5. [Branching Storylines](#branching-storylines)
6. [Session Tracking](#session-tracking)
7. [Character State Per Campaign](#character-state-per-campaign)
8. [Example Workflows](#example-workflows)

---

## Campaign Structure

Campaigns are organized in Firebase with the following structure:

```
campaigns/
  {campaignId}/
    metadata/           - Campaign info (name, MC, status)
    players/            - All players in the campaign
    storyState/         - Current arc, branches taken
    scenes/             - All scenes in the campaign
    sessions/           - Session history
    characterStates/    - Per-campaign character data
```

---

## Creating a New Campaign

### As MC (Master of Ceremonies)

```javascript
import { createCampaign } from './campaign-manager.js';

// Create a new campaign
const campaignId = await createCampaign({
  name: "Pride City Resistance",
  description: "A fight for equality in a divided city where corruption runs deep"
});

console.log("Campaign ID:", campaignId);
// Save this ID - you'll need it to manage the campaign!
```

### In the Browser Console (Testing)

```javascript
// Create campaign
const id = await createCampaign({
  name: "My First Campaign",
  description: "A test campaign"
});

// Copy the campaign ID that's logged
```

---

## Adding Players to a Campaign

### Players Join a Campaign

```javascript
import { joinCampaign } from './campaign-manager.js';

// Player joins with their character
await joinCampaign("campaign-id-here", "Gertrude Benson");
```

### MC Invites Players

Players need the **Campaign ID** to join. Share this ID with your players:

1. MC creates campaign → gets `campaignId`
2. MC shares `campaignId` with players
3. Players use `joinCampaign(campaignId, characterName)`

### List Your Campaigns

```javascript
import { listUserCampaigns } from './campaign-manager.js';

const campaigns = await listUserCampaigns();
campaigns.forEach(c => {
  console.log(`${c.name} - ${c.role} (${c.status})`);
});
```

---

## Managing Scenes and Story Arcs

### Add a Scene

```javascript
import { addScene, setCurrentScene } from './campaign-manager.js';

// First, load your campaign
await loadCampaign("campaign-id");

// Add a scene
const sceneId = await addScene({
  name: "Confrontation at City Hall",
  description: "The heroes face the corrupt mayor in a tense standoff",
  arcId: "arc-1-resistance",
  order: 5,
  imageUrl: "https://example.com/city-hall.jpg",
  musicUrl: "https://example.com/tense-music.mp3"
});

// Set as current scene (broadcast to all players)
await setCurrentScene(sceneId);
```

### Story Arcs

Organize scenes into arcs for better narrative structure:

- **Arc 1**: "The Awakening" (scenes 1-8)
- **Arc 2**: "The Resistance Grows" (scenes 9-16)
- **Arc 3**: "The Final Stand" (scenes 17-24)

Use the `arcId` field when creating scenes:

```javascript
await addScene({
  name: "Scene Name",
  arcId: "arc-2-resistance-grows",
  order: 10
});
```

---

## Branching Storylines

### Create a Branch Point

Branch points are decision moments where the story can go different ways:

```javascript
import { createBranchPoint } from './campaign-manager.js';

// Add a branch point to a scene
const branchId = await createBranchPoint("scene-id", {
  question: "Do you trust the Council of Equality?",
  options: [
    {
      id: "trust-council",
      text: "Yes, work with the Council",
      consequences: ["council-ally", "resistance-suspicious"]
    },
    {
      id: "go-alone",
      text: "No, we work alone",
      consequences: ["lone-wolf", "council-enemy"]
    },
    {
      id: "infiltrate",
      text: "Pretend to join them",
      consequences: ["double-agent", "trust-issues"]
    }
  ],
  votingEnabled: true  // All players vote on this choice
});
```

### Players Make Choices

**Single Choice** (one player decides):

```javascript
import { makeChoice } from './campaign-manager.js';

// Player makes a choice
await makeChoice("branch-id", "trust-council", "scene-id");
```

**Group Vote** (all players vote):

```javascript
import { voteOnBranch, getBranchVotes } from './campaign-manager.js';

// Each player votes
await voteOnBranch("branch-id", "trust-council", "scene-id");

// MC gets vote tally
const votes = await getBranchVotes("branch-id", "scene-id");
console.log(votes);
// { "trust-council": 3, "go-alone": 1 }
```

### Tracking Story Consequences

Consequences are tracked automatically in the campaign's `storyState`:

```javascript
// View all branches taken
const campaign = await loadCampaign("campaign-id");
const branches = campaign.storyState.branches;

Object.values(branches).forEach(branch => {
  console.log(`${branch.name} - Consequences: ${branch.consequences.join(", ")}`);
});
```

### Example: Multi-Path Story

```javascript
// Scene 1: The Invitation
await addScene({
  name: "A Mysterious Invitation",
  arcId: "arc-1",
  order: 1
});

await createBranchPoint("scene-1-id", {
  question: "You receive an invitation to an underground resistance meeting. Do you go?",
  options: [
    { id: "attend", text: "Attend the meeting", consequences: ["met-resistance"] },
    { id: "ignore", text: "Ignore it", consequences: ["missed-opportunity"] }
  ]
});

// Scene 2A: If attended meeting
await addScene({
  name: "The Resistance HQ",
  arcId: "arc-1",
  order: 2,
  // Only shown if "met-resistance" is in consequences
});

// Scene 2B: If ignored
await addScene({
  name: "A Normal Day... Or Is It?",
  arcId: "arc-1",
  order: 2,
  // Only shown if "missed-opportunity" is in consequences
});
```

---

## Session Tracking

### Start a Session

```javascript
import { startSession, endSession } from './campaign-manager.js';

// MC starts a session
const sessionId = await startSession();
console.log("Session started:", sessionId);
```

### End a Session

```javascript
// MC ends session and logs major events
await endSession(sessionId, [
  "first-combat",
  "met-villain-shadowlord",
  "chose-to-trust-council"
]);
```

### Session Data

Each session tracks:
- **Session number** (auto-increments)
- **Date and duration**
- **Scenes played**
- **Players present**
- **Major events**

---

## Character State Per Campaign

Characters maintain **separate states** for each campaign they're in!

### Save Character State (After Each Scene)

```javascript
import { saveCharacterState } from './campaign-manager.js';

// Save current character data to campaign
await saveCharacterState({
  name: "Gertrude Benson",
  juice: 5,
  burntTags: ["I Know What I'm Talking About"],
  currentStatuses: [
    { name: "Inspired", tier: 2, type: "positive" }
  ],
  storyTags: [
    { name: "Council Ally", ongoing: true }
  ]
});
```

### Load Character State (At Session Start)

```javascript
import { loadCharacterState } from './campaign-manager.js';

// Load character state for this campaign
const state = await loadCharacterState("Gertrude Benson");

if (state) {
  // Apply state to character
  character.juice = state.juice;
  character.burntTags = state.burntTags;
  character.currentStatuses = state.currentStatuses;
  character.storyTags = state.storyTags;
}
```

**Why Per-Campaign States?**
- Play the same character in multiple campaigns
- Each campaign has different story progression
- Don't mix up story tags from different campaigns

---

## Example Workflows

### Workflow 1: Creating Your First Campaign

```javascript
// 1. MC creates campaign
const campaignId = await createCampaign({
  name: "Pride City Rising",
  description: "Fight for equality!"
});

// 2. MC shares campaignId with players

// 3. Player 1 joins
await joinCampaign(campaignId, "Luxy Charms");

// 4. Player 2 joins
await joinCampaign(campaignId, "Gertrude Benson");

// 5. MC starts session
const sessionId = await startSession();

// 6. MC adds and sets first scene
const scene1 = await addScene({
  name: "The Call to Action",
  description: "News breaks: Pride Center is under attack!",
  arcId: "arc-1-awakening",
  order: 1
});
await setCurrentScene(scene1);

// 7. Play the scene!

// 8. MC ends session
await endSession(sessionId, ["pride-center-saved"]);
```

### Workflow 2: Branch-Heavy Story Session

```javascript
// Load campaign
await loadCampaign("campaign-id");

// Scene with major choice
const sceneId = await addScene({
  name: "The Council's Offer",
  description: "The Council offers an alliance... but at what cost?",
  arcId: "arc-2",
  order: 10
});

await setCurrentScene(sceneId);

// Create branch point
const branchId = await createBranchPoint(sceneId, {
  question: "Accept the Council's terms?",
  options: [
    { id: "accept", text: "Accept (gain resources, lose independence)", consequences: ["council-bound"] },
    { id: "reject", text: "Reject (stay independent, lose support)", consequences: ["going-it-alone"] },
    { id: "negotiate", text: "Negotiate new terms", consequences: ["earned-respect"] }
  ],
  votingEnabled: true
});

// Players vote
// (Each player uses voteOnBranch)

// MC checks results
const votes = await getBranchVotes(branchId, sceneId);
const winner = Object.entries(votes).sort((a,b) => b[1] - a[1])[0][0];

// Record the choice
await makeChoice(branchId, winner, sceneId);

// Continue story based on choice...
if (winner === "accept") {
  // Load alliance path scenes
} else if (winner === "reject") {
  // Load independent path scenes
} else {
  // Load negotiation path scenes
}
```

### Workflow 3: Multi-Campaign Character

```javascript
// Player plays Gertrude in Campaign A
await joinCampaign("campaign-a-id", "Gertrude Benson");
await loadCampaign("campaign-a-id");
await saveCharacterState({
  name: "Gertrude Benson",
  juice: 3,
  storyTags: [{ name: "Met the Villain", ongoing: true }]
});

// Same player, same character, different campaign!
await joinCampaign("campaign-b-id", "Gertrude Benson");
await loadCampaign("campaign-b-id");
await saveCharacterState({
  name: "Gertrude Benson",
  juice: 7,
  storyTags: [{ name: "Council Leader", ongoing: true }]
});

// States are separate!
// In Campaign A: juice=3, met villain
// In Campaign B: juice=7, council leader
```

---

## Firebase Console Management

You can also view/edit campaigns directly in Firebase:

1. Go to https://console.firebase.google.com/
2. Select your project: **queerz-mc-live**
3. Go to **Realtime Database**
4. Navigate to `campaigns/`

You'll see all campaigns and can manually edit:
- Campaign metadata
- Add/remove players
- View story branches
- See session history

---

## Tips for Great Campaigns

### 📖 Story Planning

1. **Plan major branch points** before the session
2. **Limit branches** to 2-4 options per choice
3. **Track consequences** - they should matter later!
4. **Use arcs** to organize your story

### 🎬 Scene Management

1. **Name scenes clearly**: "The Warehouse Fight" not "Scene 5"
2. **Add images/music** for atmosphere
3. **Keep descriptions brief** in the scene data
4. **Order matters**: Use order numbers for arc flow

### 🎭 Player Engagement

1. **Use voting** for big decisions
2. **Let individuals** make personal choices
3. **Show consequences** - reference old branches
4. **Save states** after each session

### 🔀 Branching Best Practices

1. **Converging paths**: Different choices can lead to same outcome
2. **Delayed consequences**: Choices matter later in the campaign
3. **Multiple factors**: Combine several choices for complex outcomes
4. **Track in spreadsheet**: Keep a story tree diagram

---

## Integration with Player App

To integrate campaigns into the player app UI, add:

### Campaign Selector

```javascript
// In player-app.js
import { listUserCampaigns, joinCampaign, loadCampaign } from './campaign-manager.js';

async function setupCampaignUI() {
  const campaigns = await listUserCampaigns();

  const select = document.getElementById("campaignSelect");
  campaigns.forEach(c => {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = `${c.name} (${c.role})`;
    select.appendChild(option);
  });

  select.addEventListener("change", async (e) => {
    const campaignId = e.target.value;
    await loadCampaign(campaignId);

    // Load character state for this campaign
    if (activeCharacter) {
      const state = await loadCharacterState(activeCharacter);
      if (state) {
        Object.assign(characterLibrary[activeCharacter], state);
        renderCharacterSheet(characterLibrary[activeCharacter]);
      }
    }
  });
}
```

---

## Next Steps

1. **Add UI elements** to index.html for campaign selection
2. **Auto-save states** when scenes change
3. **Listen to branch votes** in real-time
4. **Create MC dashboard** for managing campaigns
5. **Add campaign export** (backup campaigns as JSON)

---

## Support & Questions

- Check Firebase Rules to ensure proper permissions
- Use browser console to test functions
- Monitor Firebase database for real-time updates
- Join the QUEERZ! community for campaign ideas

Happy storytelling! 🌈✨
