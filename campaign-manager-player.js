// ================================
// QUEERZ! CAMPAIGN MANAGER - PLAYER ONLY
// Functions exclusively for Players
// ================================

import { database, ref, set, get, onValue } from "./firebase-config.js";

// ================================
// PLAYER-ONLY: JOIN CAMPAIGN
// ================================

export async function joinCampaign(campaignId, characterName) {
  if (!window.currentUserId) {
    console.error("❌ Must be authenticated to join campaign");
    alert("You must be signed in to join a campaign");
    return false;
  }

  if (!campaignId || !characterName) {
    alert("Campaign ID and Character Name are required");
    return false;
  }

  try {
    // Check if campaign exists
    const campaignRef = ref(database, `campaigns/${campaignId}`);
    const campaignSnapshot = await get(campaignRef);

    if (!campaignSnapshot.exists()) {
      alert("Campaign not found. Check the Campaign ID and try again.");
      return false;
    }

    // Add player to campaign
    const playerRef = ref(database, `campaigns/${campaignId}/players/${window.currentUserId}`);
    await set(playerRef, {
      characterName: characterName,
      joinedAt: Date.now(),
      status: "active"
    });

    console.log(`✅ Joined campaign ${campaignId} as ${characterName}`);
    return true;
  } catch (error) {
    console.error("❌ Failed to join campaign:", error);
    alert("Failed to join campaign. Check console for details.");
    return false;
  }
}

export async function leaveCampaign(campaignId) {
  if (!window.currentUserId) return false;

  try {
    await set(ref(database, `campaigns/${campaignId}/players/${window.currentUserId}/status`), "inactive");
    console.log("✅ Left campaign");
    return true;
  } catch (error) {
    console.error("❌ Failed to leave campaign:", error);
    return false;
  }
}

// ================================
// PLAYER: VIEW CAMPAIGN INFO
// ================================

export async function getMyCampaigns() {
  if (!window.currentUserId) return [];

  try {
    const campaignsRef = ref(database, 'campaigns');
    const snapshot = await get(campaignsRef);

    if (!snapshot.exists()) return [];

    const allCampaigns = snapshot.val();
    const myCampaigns = [];

    // Find campaigns where user is a player
    Object.entries(allCampaigns).forEach(([id, campaign]) => {
      if (campaign.players && campaign.players[window.currentUserId]) {
        myCampaigns.push({
          id,
          name: campaign.metadata.name,
          description: campaign.metadata.description,
          status: campaign.metadata.status,
          characterName: campaign.players[window.currentUserId].characterName,
          mcName: campaign.metadata.mcUserId
        });
      }
    });

    console.log("✅ Found player campaigns:", myCampaigns.length);
    return myCampaigns;
  } catch (error) {
    console.error("❌ Failed to list campaigns:", error);
    return [];
  }
}

export async function getCampaignInfo(campaignId) {
  try {
    const campaignRef = ref(database, `campaigns/${campaignId}/metadata`);
    const snapshot = await get(campaignRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("❌ Failed to get campaign info:", error);
    return null;
  }
}

// ================================
// PLAYER: VOTE ON BRANCHES
// ================================

export async function voteOnBranch(campaignId, sceneId, branchId, optionId) {
  if (!window.currentUserId) return false;

  try {
    const voteRef = ref(database,
      `campaigns/${campaignId}/scenes/${sceneId}/branchPoints/${branchId}/votes/${window.currentUserId}`
    );
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

// ================================
// PLAYER: CHARACTER STATE
// ================================

export async function saveCharacterState(campaignId, characterData) {
  if (!window.currentUserId || !characterData) {
    console.error("❌ No user or character data");
    return false;
  }

  const stateRef = ref(database,
    `campaigns/${campaignId}/characterStates/${window.currentUserId}/${characterData.name}`
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

export async function loadCharacterState(campaignId, characterName) {
  if (!window.currentUserId) return null;

  try {
    const stateRef = ref(database,
      `campaigns/${campaignId}/characterStates/${window.currentUserId}/${characterName}`
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

export function listenToBranchVotes(campaignId, sceneId, branchId, callback) {
  const votesRef = ref(database, `campaigns/${campaignId}/scenes/${sceneId}/branchPoints/${branchId}/votes`);

  return onValue(votesRef, (snapshot) => {
    if (snapshot.exists()) {
      const votes = snapshot.val();
      const tally = {};

      Object.values(votes).forEach(vote => {
        tally[vote.optionId] = (tally[vote.optionId] || 0) + 1;
      });

      callback(tally);
    }
  });
}

console.log("✅ Player Campaign Manager loaded");
