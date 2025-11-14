// ================================
// QUEERZ! CAMPAIGN MANAGER
// Multi-Campaign & Branching Story System
// ================================

import { database, ref, set, get, onValue, push } from "./firebase-config.js";

// ================================
// FIREBASE STRUCTURE
// ================================
/*
campaigns/
  {campaignId}/
    metadata/
      name: "Pride City Resistance"
      description: "A fight for equality in a divided city"
      mcUserId: "uid-of-mc"
      createdAt: timestamp
      currentScene: "scene-id"
      status: "active" | "paused" | "completed"

    players/
      {userId}/
        characterName: "Gertrude Benson"
        joinedAt: timestamp
        status: "active" | "inactive"

    storyState/
      currentArc: "arc-1"
      currentChapter: 3
      branches/
        {branchId}/
          name: "Chose to trust the Council"
          chosenAt: timestamp
          chosenBy: {userId}
          consequences: ["council-ally", "resistance-suspicious"]

    scenes/
      {sceneId}/
        name: "Confrontation at City Hall"
        description: "The heroes face the corrupt mayor..."
        arcId: "arc-1"
        order: 5
        imageUrl: "url"
        musicUrl: "url"
        timestamp: when-played
        branchPoints: [
          {
            id: "branch-1",
            question: "Do you trust the Council?",
            options: [
              {id: "opt-a", text: "Yes, work with them", consequences: ["council-ally"]},
              {id: "opt-b", text: "No, go alone", consequences: ["lone-wolf"]}
            ]
          }
        ]

    sessions/
      {sessionId}/
        sessionNumber: 1
        date: timestamp
        duration: 7200000 (2 hours in ms)
        scenesPlayed: ["scene-1", "scene-2"]
        playersPresent: [{userId}, {userId}]
        majorEvents: ["first-combat", "met-villain"]

    characterStates/
      {userId}/
        {characterName}/
          juice: 5
          burntTags: ["tag1", "tag2"]
          currentStatuses: [...]
          storyTags: [...]
          sessionSnapshot: timestamp
*/

// ================================
// CAMPAIGN MANAGEMENT
// ================================

let activeCampaignId = null;
let activeCampaignData = null;

export async function createCampaign(campaignData) {
  if (!window.currentUserId) {
    console.error("❌ Must be authenticated to create campaign");
    return null;
  }

  const campaignRef = push(ref(database, 'campaigns'));
  const campaignId = campaignRef.key;

  const newCampaign = {
    metadata: {
      name: campaignData.name || "Untitled Campaign",
      description: campaignData.description || "",
      mcUserId: window.currentUserId,
      createdAt: Date.now(),
      currentScene: null,
      status: "active"
    },
    players: {},
    storyState: {
      currentArc: "arc-1",
      currentChapter: 1,
      branches: {}
    },
    scenes: {},
    sessions: {},
    characterStates: {}
  };

  try {
    await set(ref(database, `campaigns/${campaignId}`), newCampaign);
    console.log("✅ Campaign created:", campaignId);
    return campaignId;
  } catch (error) {
    console.error("❌ Campaign creation failed:", error);
    return null;
  }
}

export async function joinCampaign(campaignId, characterName) {
  if (!window.currentUserId) {
    console.error("❌ Must be authenticated to join campaign");
    return false;
  }

  try {
    const playerRef = ref(database, `campaigns/${campaignId}/players/${window.currentUserId}`);
    await set(playerRef, {
      characterName: characterName,
      joinedAt: Date.now(),
      status: "active"
    });

    activeCampaignId = campaignId;
    console.log(`✅ Joined campaign ${campaignId} as ${characterName}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to join campaign:", error);
    return false;
  }
}

export async function loadCampaign(campaignId) {
  try {
    const campaignRef = ref(database, `campaigns/${campaignId}`);
    const snapshot = await get(campaignRef);

    if (snapshot.exists()) {
      activeCampaignId = campaignId;
      activeCampaignData = snapshot.val();
      console.log("✅ Campaign loaded:", activeCampaignData.metadata.name);
      return activeCampaignData;
    } else {
      console.error("❌ Campaign not found:", campaignId);
      return null;
    }
  } catch (error) {
    console.error("❌ Failed to load campaign:", error);
    return null;
  }
}

export async function listUserCampaigns() {
  if (!window.currentUserId) return [];

  try {
    const campaignsRef = ref(database, 'campaigns');
    const snapshot = await get(campaignsRef);

    if (!snapshot.exists()) return [];

    const allCampaigns = snapshot.val();
    const userCampaigns = [];

    // Find campaigns where user is MC or player
    Object.entries(allCampaigns).forEach(([id, campaign]) => {
      if (campaign.metadata.mcUserId === window.currentUserId ||
          campaign.players?.[window.currentUserId]) {
        userCampaigns.push({
          id,
          name: campaign.metadata.name,
          role: campaign.metadata.mcUserId === window.currentUserId ? 'mc' : 'player',
          status: campaign.metadata.status,
          characterName: campaign.players?.[window.currentUserId]?.characterName
        });
      }
    });

    console.log("✅ Found campaigns:", userCampaigns.length);
    return userCampaigns;
  } catch (error) {
    console.error("❌ Failed to list campaigns:", error);
    return [];
  }
}

// ================================
// BRANCHING STORY PATHS
// ================================

export async function createBranchPoint(sceneId, branchData) {
  if (!activeCampaignId) {
    console.error("❌ No active campaign");
    return null;
  }

  const branchRef = push(ref(database, `campaigns/${activeCampaignId}/scenes/${sceneId}/branchPoints`));
  const branchId = branchRef.key;

  const branchPoint = {
    id: branchId,
    question: branchData.question,
    options: branchData.options || [],
    votingEnabled: branchData.votingEnabled || false,
    votes: {}
  };

  try {
    await set(branchRef, branchPoint);
    console.log("✅ Branch point created:", branchId);
    return branchId;
  } catch (error) {
    console.error("❌ Failed to create branch point:", error);
    return null;
  }
}

export async function makeChoice(branchId, optionId, sceneId) {
  if (!activeCampaignId || !window.currentUserId) {
    console.error("❌ No active campaign or user");
    return false;
  }

  const choiceData = {
    name: `Branch choice at ${new Date().toLocaleString()}`,
    chosenAt: Date.now(),
    chosenBy: window.currentUserId,
    branchId: branchId,
    optionId: optionId,
    sceneId: sceneId
  };

  try {
    const choiceRef = push(ref(database, `campaigns/${activeCampaignId}/storyState/branches`));
    await set(choiceRef, choiceData);

    console.log("✅ Choice recorded:", optionId);
    return true;
  } catch (error) {
    console.error("❌ Failed to record choice:", error);
    return false;
  }
}

export async function voteOnBranch(branchId, optionId, sceneId) {
  if (!activeCampaignId || !window.currentUserId) return false;

  try {
    const voteRef = ref(database, `campaigns/${activeCampaignId}/scenes/${sceneId}/branchPoints/${branchId}/votes/${window.currentUserId}`);
    await set(voteRef, {
      optionId: optionId,
      votedAt: Date.now()
    });

    console.log("✅ Vote recorded for option:", optionId);
    return true;
  } catch (error) {
    console.error("❌ Failed to vote:", error);
    return false;
  }
}

export async function getBranchVotes(branchId, sceneId) {
  if (!activeCampaignId) return null;

  try {
    const votesRef = ref(database, `campaigns/${activeCampaignId}/scenes/${sceneId}/branchPoints/${branchId}/votes`);
    const snapshot = await get(votesRef);

    if (!snapshot.exists()) return {};

    const votes = snapshot.val();
    const tally = {};

    Object.values(votes).forEach(vote => {
      tally[vote.optionId] = (tally[vote.optionId] || 0) + 1;
    });

    return tally;
  } catch (error) {
    console.error("❌ Failed to get votes:", error);
    return null;
  }
}

// ================================
// SCENE MANAGEMENT
// ================================

export async function addScene(sceneData) {
  if (!activeCampaignId) {
    console.error("❌ No active campaign");
    return null;
  }

  const sceneRef = push(ref(database, `campaigns/${activeCampaignId}/scenes`));
  const sceneId = sceneRef.key;

  const newScene = {
    name: sceneData.name || "Untitled Scene",
    description: sceneData.description || "",
    arcId: sceneData.arcId || "arc-1",
    order: sceneData.order || 1,
    imageUrl: sceneData.imageUrl || "",
    musicUrl: sceneData.musicUrl || "",
    timestamp: Date.now(),
    branchPoints: []
  };

  try {
    await set(sceneRef, newScene);
    console.log("✅ Scene added:", sceneId);
    return sceneId;
  } catch (error) {
    console.error("❌ Failed to add scene:", error);
    return null;
  }
}

export async function setCurrentScene(sceneId) {
  if (!activeCampaignId) return false;

  try {
    await set(ref(database, `campaigns/${activeCampaignId}/metadata/currentScene`), sceneId);
    console.log("✅ Current scene set:", sceneId);
    return true;
  } catch (error) {
    console.error("❌ Failed to set current scene:", error);
    return false;
  }
}

// ================================
// SESSION TRACKING
// ================================

export async function startSession() {
  if (!activeCampaignId) {
    console.error("❌ No active campaign");
    return null;
  }

  const sessionRef = push(ref(database, `campaigns/${activeCampaignId}/sessions`));
  const sessionId = sessionRef.key;

  // Get list of active players
  const playersSnapshot = await get(ref(database, `campaigns/${activeCampaignId}/players`));
  const playersPresent = playersSnapshot.exists() ? Object.keys(playersSnapshot.val()) : [];

  const sessionData = {
    sessionNumber: await getNextSessionNumber(),
    date: Date.now(),
    startTime: Date.now(),
    endTime: null,
    duration: null,
    scenesPlayed: [],
    playersPresent: playersPresent,
    majorEvents: []
  };

  try {
    await set(sessionRef, sessionData);
    console.log("✅ Session started:", sessionId);
    return sessionId;
  } catch (error) {
    console.error("❌ Failed to start session:", error);
    return null;
  }
}

export async function endSession(sessionId, majorEvents = []) {
  if (!activeCampaignId) return false;

  const endTime = Date.now();
  const sessionRef = ref(database, `campaigns/${activeCampaignId}/sessions/${sessionId}`);

  try {
    const snapshot = await get(sessionRef);
    if (!snapshot.exists()) return false;

    const session = snapshot.val();
    const duration = endTime - session.startTime;

    await set(sessionRef, {
      ...session,
      endTime: endTime,
      duration: duration,
      majorEvents: majorEvents
    });

    console.log("✅ Session ended:", sessionId);
    return true;
  } catch (error) {
    console.error("❌ Failed to end session:", error);
    return false;
  }
}

async function getNextSessionNumber() {
  if (!activeCampaignId) return 1;

  try {
    const sessionsRef = ref(database, `campaigns/${activeCampaignId}/sessions`);
    const snapshot = await get(sessionsRef);

    if (!snapshot.exists()) return 1;

    const sessions = Object.values(snapshot.val());
    const maxSession = Math.max(...sessions.map(s => s.sessionNumber || 0));
    return maxSession + 1;
  } catch (error) {
    return 1;
  }
}

// ================================
// CHARACTER STATE SNAPSHOTS
// ================================

export async function saveCharacterState(characterData) {
  if (!activeCampaignId || !window.currentUserId) {
    console.error("❌ No active campaign or user");
    return false;
  }

  const stateRef = ref(database,
    `campaigns/${activeCampaignId}/characterStates/${window.currentUserId}/${characterData.name}`
  );

  const snapshot = {
    juice: characterData.juice || 0,
    burntTags: characterData.burntTags || [],
    currentStatuses: characterData.currentStatuses || [],
    storyTags: characterData.storyTags || [],
    sessionSnapshot: Date.now()
  };

  try {
    await set(stateRef, snapshot);
    console.log("✅ Character state saved for campaign");
    return true;
  } catch (error) {
    console.error("❌ Failed to save character state:", error);
    return false;
  }
}

export async function loadCharacterState(characterName) {
  if (!activeCampaignId || !window.currentUserId) return null;

  try {
    const stateRef = ref(database,
      `campaigns/${activeCampaignId}/characterStates/${window.currentUserId}/${characterName}`
    );
    const snapshot = await get(stateRef);

    if (snapshot.exists()) {
      console.log("✅ Character state loaded from campaign");
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("❌ Failed to load character state:", error);
    return null;
  }
}

// ================================
// REAL-TIME LISTENERS
// ================================

export function listenToCampaignUpdates(campaignId, callback) {
  const campaignRef = ref(database, `campaigns/${campaignId}`);

  return onValue(campaignRef, (snapshot) => {
    if (snapshot.exists()) {
      activeCampaignData = snapshot.val();
      callback(activeCampaignData);
    }
  });
}

export function listenToCurrentScene(campaignId, callback) {
  const sceneRef = ref(database, `campaigns/${campaignId}/metadata/currentScene`);

  return onValue(sceneRef, async (snapshot) => {
    if (snapshot.exists()) {
      const sceneId = snapshot.val();
      const sceneData = await get(ref(database, `campaigns/${campaignId}/scenes/${sceneId}`));
      if (sceneData.exists()) {
        callback(sceneData.val());
      }
    }
  });
}

// ================================
// EXPORTS
// ================================

export {
  activeCampaignId,
  activeCampaignData
};

console.log("✅ Campaign Manager loaded");
