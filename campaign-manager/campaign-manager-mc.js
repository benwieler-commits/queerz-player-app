// ================================
// QUEERZ! CAMPAIGN MANAGER - MC ONLY
// Functions exclusively for Master of Ceremonies
// ================================

import { database, ref, set, get, onValue, push } from "./firebase-config.js";

// ================================
// MC-ONLY: CAMPAIGN CREATION
// ================================

export async function createCampaign(campaignData) {
  if (!window.currentUserId) {
    console.error("❌ Must be authenticated to create campaign");
    alert("You must be signed in to create a campaign");
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
      currentChapter: 1,
      currentArc: campaignData.startingArc || "arc-1",
      status: "active"
    },
    players: {},
    storyState: {
      currentArc: campaignData.startingArc || "arc-1",
      currentChapter: 1,
      branches: {},
      completedScenes: []
    },
    scenes: {},
    chapters: {},
    sessions: {},
    characterStates: {},
    script: campaignData.script || {}
  };

  try {
    await set(ref(database, `campaigns/${campaignId}`), newCampaign);
    console.log("✅ Campaign created:", campaignId);
    return campaignId;
  } catch (error) {
    console.error("❌ Campaign creation failed:", error);
    alert("Failed to create campaign. Check console for details.");
    return null;
  }
}

// ================================
// MC-ONLY: SCENE MANAGEMENT
// ================================

export async function addScene(campaignId, sceneData) {
  if (!campaignId) {
    console.error("❌ No campaign ID provided");
    return null;
  }

  const sceneRef = push(ref(database, `campaigns/${campaignId}/scenes`));
  const sceneId = sceneRef.key;

  const newScene = {
    name: sceneData.name || "Untitled Scene",
    description: sceneData.description || "",
    arcId: sceneData.arcId || "arc-1",
    chapterId: sceneData.chapterId || 1,
    order: sceneData.order || 1,
    imageUrl: sceneData.imageUrl || "",
    musicUrl: sceneData.musicUrl || "",
    script: sceneData.script || "",
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

export async function setCurrentScene(campaignId, sceneId) {
  if (!campaignId) return false;

  try {
    await set(ref(database, `campaigns/${campaignId}/metadata/currentScene`), sceneId);

    // Add to completed scenes
    const completedRef = ref(database, `campaigns/${campaignId}/storyState/completedScenes`);
    const snapshot = await get(completedRef);
    const completed = snapshot.exists() ? snapshot.val() : [];
    if (!completed.includes(sceneId)) {
      completed.push(sceneId);
      await set(completedRef, completed);
    }

    console.log("✅ Current scene set:", sceneId);
    return true;
  } catch (error) {
    console.error("❌ Failed to set current scene:", error);
    return false;
  }
}

// ================================
// MC-ONLY: CHAPTER MANAGEMENT
// ================================

export async function addChapter(campaignId, chapterData) {
  if (!campaignId) {
    console.error("❌ No campaign ID provided");
    return null;
  }

  const chapterRef = ref(database, `campaigns/${campaignId}/chapters/${chapterData.number || 1}`);

  const newChapter = {
    number: chapterData.number || 1,
    name: chapterData.name || `Chapter ${chapterData.number}`,
    arcId: chapterData.arcId || "arc-1",
    script: chapterData.script || "",
    scenes: chapterData.scenes || [],
    branchPoints: chapterData.branchPoints || [],
    completionConditions: chapterData.completionConditions || [],
    nextChapter: chapterData.nextChapter || null
  };

  try {
    await set(chapterRef, newChapter);
    console.log("✅ Chapter added:", chapterData.number);
    return chapterData.number;
  } catch (error) {
    console.error("❌ Failed to add chapter:", error);
    return null;
  }
}

export async function setCurrentChapter(campaignId, chapterNumber) {
  if (!campaignId) return false;

  try {
    await set(ref(database, `campaigns/${campaignId}/metadata/currentChapter`), chapterNumber);
    await set(ref(database, `campaigns/${campaignId}/storyState/currentChapter`), chapterNumber);
    console.log("✅ Current chapter set:", chapterNumber);
    return true;
  } catch (error) {
    console.error("❌ Failed to set current chapter:", error);
    return false;
  }
}

export async function progressToNextChapter(campaignId) {
  if (!campaignId) return false;

  try {
    // Get current chapter
    const currentChapterNum = await get(ref(database, `campaigns/${campaignId}/metadata/currentChapter`));
    const currentNum = currentChapterNum.exists() ? currentChapterNum.val() : 1;

    // Get chapter data to find next chapter
    const chapterData = await get(ref(database, `campaigns/${campaignId}/chapters/${currentNum}`));

    if (chapterData.exists() && chapterData.val().nextChapter) {
      const nextChapter = chapterData.val().nextChapter;
      await setCurrentChapter(campaignId, nextChapter);
      console.log(`✅ Progressed to chapter ${nextChapter}`);
      return nextChapter;
    } else {
      // Auto-increment if no specific next chapter
      const nextNum = currentNum + 1;
      const nextExists = await get(ref(database, `campaigns/${campaignId}/chapters/${nextNum}`));

      if (nextExists.exists()) {
        await setCurrentChapter(campaignId, nextNum);
        console.log(`✅ Progressed to chapter ${nextNum}`);
        return nextNum;
      } else {
        console.log("ℹ️ No next chapter available");
        return null;
      }
    }
  } catch (error) {
    console.error("❌ Failed to progress chapter:", error);
    return false;
  }
}

// ================================
// MC-ONLY: BRANCH POINT MANAGEMENT
// ================================

export async function createBranchPoint(campaignId, sceneId, branchData) {
  if (!campaignId) {
    console.error("❌ No campaign ID provided");
    return null;
  }

  const branchRef = push(ref(database, `campaigns/${campaignId}/scenes/${sceneId}/branchPoints`));
  const branchId = branchRef.key;

  const branchPoint = {
    id: branchId,
    question: branchData.question,
    options: branchData.options || [],
    votingEnabled: branchData.votingEnabled || false,
    votes: {},
    chosenOption: null,
    resolved: false
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

export async function resolveBranchPoint(campaignId, sceneId, branchId, optionId) {
  if (!campaignId) return false;

  try {
    // Mark branch as resolved
    await set(ref(database, `campaigns/${campaignId}/scenes/${sceneId}/branchPoints/${branchId}/resolved`), true);
    await set(ref(database, `campaigns/${campaignId}/scenes/${sceneId}/branchPoints/${branchId}/chosenOption`), optionId);

    // Get option consequences
    const branchData = await get(ref(database, `campaigns/${campaignId}/scenes/${sceneId}/branchPoints/${branchId}`));
    if (branchData.exists()) {
      const option = branchData.val().options.find(opt => opt.id === optionId);
      if (option && option.consequences) {
        // Save to story state
        const choiceRecord = {
          branchId: branchId,
          sceneId: sceneId,
          optionId: optionId,
          consequences: option.consequences,
          timestamp: Date.now()
        };

        const choiceRef = push(ref(database, `campaigns/${campaignId}/storyState/branches`));
        await set(choiceRef, choiceRecord);
      }
    }

    console.log("✅ Branch resolved:", optionId);
    return true;
  } catch (error) {
    console.error("❌ Failed to resolve branch:", error);
    return false;
  }
}

// ================================
// MC-ONLY: SESSION MANAGEMENT
// ================================

export async function startSession(campaignId) {
  if (!campaignId) {
    console.error("❌ No campaign ID provided");
    return null;
  }

  const sessionRef = push(ref(database, `campaigns/${campaignId}/sessions`));
  const sessionId = sessionRef.key;

  // Get list of active players
  const playersSnapshot = await get(ref(database, `campaigns/${campaignId}/players`));
  const playersPresent = playersSnapshot.exists() ? Object.keys(playersSnapshot.val()) : [];

  const sessionData = {
    sessionNumber: await getNextSessionNumber(campaignId),
    date: Date.now(),
    startTime: Date.now(),
    endTime: null,
    duration: null,
    scenesPlayed: [],
    playersPresent: playersPresent,
    majorEvents: [],
    branchesResolved: []
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

export async function endSession(campaignId, sessionId, majorEvents = []) {
  if (!campaignId) return false;

  const endTime = Date.now();
  const sessionRef = ref(database, `campaigns/${campaignId}/sessions/${sessionId}`);

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

async function getNextSessionNumber(campaignId) {
  if (!campaignId) return 1;

  try {
    const sessionsRef = ref(database, `campaigns/${campaignId}/sessions`);
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
// MC-ONLY: PLAYER MANAGEMENT
// ================================

export async function addPlayerToCampaign(campaignId, userId, characterName) {
  if (!campaignId) return false;

  try {
    const playerRef = ref(database, `campaigns/${campaignId}/players/${userId}`);
    await set(playerRef, {
      characterName: characterName,
      joinedAt: Date.now(),
      status: "active"
    });

    console.log(`✅ Added player ${characterName} to campaign`);
    return true;
  } catch (error) {
    console.error("❌ Failed to add player:", error);
    return false;
  }
}

export async function removePlayerFromCampaign(campaignId, userId) {
  if (!campaignId) return false;

  try {
    await set(ref(database, `campaigns/${campaignId}/players/${userId}`), null);
    console.log(`✅ Removed player from campaign`);
    return true;
  } catch (error) {
    console.error("❌ Failed to remove player:", error);
    return false;
  }
}

// ================================
// MC-ONLY: CAMPAIGN DATA RETRIEVAL
// ================================

export async function loadCampaign(campaignId) {
  try {
    const campaignRef = ref(database, `campaigns/${campaignId}`);
    const snapshot = await get(campaignRef);

    if (snapshot.exists()) {
      const campaign = snapshot.val();
      console.log("✅ Campaign loaded:", campaign.metadata.name);
      return campaign;
    } else {
      console.error("❌ Campaign not found:", campaignId);
      return null;
    }
  } catch (error) {
    console.error("❌ Failed to load campaign:", error);
    return null;
  }
}

export async function getMyCampaigns() {
  if (!window.currentUserId) return [];

  try {
    const campaignsRef = ref(database, 'campaigns');
    const snapshot = await get(campaignsRef);

    if (!snapshot.exists()) return [];

    const allCampaigns = snapshot.val();
    const myCampaigns = [];

    // Find campaigns where user is MC
    Object.entries(allCampaigns).forEach(([id, campaign]) => {
      if (campaign.metadata.mcUserId === window.currentUserId) {
        myCampaigns.push({
          id,
          name: campaign.metadata.name,
          description: campaign.metadata.description,
          status: campaign.metadata.status,
          currentChapter: campaign.metadata.currentChapter || 1,
          playerCount: campaign.players ? Object.keys(campaign.players).length : 0,
          createdAt: campaign.metadata.createdAt
        });
      }
    });

    console.log("✅ Found MC campaigns:", myCampaigns.length);
    return myCampaigns;
  } catch (error) {
    console.error("❌ Failed to list campaigns:", error);
    return [];
  }
}

// ================================
// REAL-TIME LISTENERS
// ================================

export function listenToCampaign(campaignId, callback) {
  const campaignRef = ref(database, `campaigns/${campaignId}`);

  return onValue(campaignRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    }
  });
}

export function listenToPlayers(campaignId, callback) {
  const playersRef = ref(database, `campaigns/${campaignId}/players`);

  return onValue(playersRef, (snapshot) => {
    const players = snapshot.exists() ? snapshot.val() : {};
    callback(players);
  });
}

console.log("✅ MC Campaign Manager loaded");
