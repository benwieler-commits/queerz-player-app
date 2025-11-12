// ===================================
// QUEERZ! MC CONTROL PANEL
// Main application logic for MC
// ===================================

import {
  createCampaign,
  addScene,
  setCurrentScene,
  addChapter,
  setCurrentChapter,
  progressToNextChapter,
  createBranchPoint,
  resolveBranchPoint,
  startSession,
  endSession,
  loadCampaign,
  getMyCampaigns,
  listenToCampaign,
  listenToPlayers
} from './campaign-manager-mc.js';

import {
  forceSignInAnonymously as initializeAuth
} from './firebase-config.js';

// ================================
// STATE
// ================================
let activeCampaignId = null;
let activeCampaign = null;
let activeSessionId = null;
let currentChapterData = null;

// ================================
// INITIALIZATION
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎭 MC App Loading...");

  // Initialize Firebase Auth
  await initializeAuth();

  // Setup UI
  await loadMyCampaigns();
  setupEventListeners();
  updateAuthStatus();

  console.log("✅ MC App Ready");
});

// ================================
// AUTH STATUS
// ================================
function updateAuthStatus() {
  const statusEl = document.getElementById("authStatus");
  if (window.currentUserId) {
    statusEl.textContent = "● Connected";
    statusEl.style.color = "#4CAF50";
  } else {
    statusEl.textContent = "● Offline";
    statusEl.style.color = "#f44336";
  }
}

// ================================
// CAMPAIGN MANAGEMENT
// ================================
async function loadMyCampaigns() {
  const campaigns = await getMyCampaigns();
  const select = document.getElementById("campaignSelect");

  select.innerHTML = '<option value="">Select Campaign...</option>';
  campaigns.forEach(c => {
    const option = document.createElement("option");
    option.value = c.id;
    option.textContent = `${c.name} (Ch.${c.currentChapter})`;
    select.appendChild(option);
  });
}

async function loadCampaignData(campaignId) {
  activeCampaignId = campaignId;
  activeCampaign = await loadCampaign(campaignId);

  if (!activeCampaign) {
    alert("Failed to load campaign");
    return;
  }

  // Update UI
  document.getElementById("campaignName").textContent = activeCampaign.metadata.name;
  document.getElementById("campaignDescription").textContent = activeCampaign.metadata.description || "";
  document.getElementById("currentChapter").textContent = activeCampaign.metadata.currentChapter || 1;
  document.getElementById("currentArc").textContent = activeCampaign.metadata.currentArc || "arc-1";

  // Load scenes
  loadScenesList();

  // Load current chapter
  await loadCurrentChapter();

  // Setup real-time listeners
  setupCampaignListeners();

  console.log("✅ Campaign loaded:", activeCampaign.metadata.name);
}

async function loadCurrentChapter() {
  if (!activeCampaign) return;

  const chapterNum = activeCampaign.metadata.currentChapter || 1;
  currentChapterData = activeCampaign.chapters?.[chapterNum];

  if (currentChapterData) {
    document.getElementById("chapterTitle").textContent = currentChapterData.name || `Chapter ${chapterNum}`;

    // Update overlay
    document.getElementById("overlayChapterNum").textContent = chapterNum;
    document.getElementById("overlayChapterName").textContent = currentChapterData.name || `Chapter ${chapterNum}`;
    document.getElementById("scriptDisplay").innerHTML = formatScript(currentChapterData.script || "No script available");

    // Load branch point checkboxes
    loadBranchCheckboxes();

    // Update progress
    updateChapterProgress();
  }
}

function formatScript(script) {
  // Convert plain text script to formatted HTML
  return script
    .split('\n')
    .map(line => {
      if (line.startsWith('##')) {
        return `<h4>${line.replace('##', '').trim()}</h4>`;
      } else if (line.startsWith('**')) {
        return `<p><strong>${line.replace(/\*\*/g, '')}</strong></p>`;
      } else if (line.trim()) {
        return `<p>${line}</p>`;
      }
      return '<br>';
    })
    .join('');
}

function loadScenesList() {
  const select = document.getElementById("sceneSelect");
  select.innerHTML = '<option value="">Select Scene...</option>';

  if (activeCampaign.scenes) {
    Object.entries(activeCampaign.scenes).forEach(([id, scene]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${scene.name} (Ch.${scene.chapterId || '?'})`;
      select.appendChild(option);
    });
  }
}

// ================================
// BRANCH POINT CHECKBOXES
// ================================
function loadBranchCheckboxes() {
  const container = document.getElementById("choicesCheckboxes");
  container.innerHTML = '';

  if (!currentChapterData || !currentChapterData.branchPoints || currentChapterData.branchPoints.length === 0) {
    container.innerHTML = '<p class="empty-state">No branch points in current chapter</p>';
    return;
  }

  currentChapterData.branchPoints.forEach((branch, index) => {
    const branchDiv = document.createElement("div");
    branchDiv.classList.add("choice-group");

    const questionEl = document.createElement("h4");
    questionEl.textContent = branch.question || `Choice ${index + 1}`;
    branchDiv.appendChild(questionEl);

    branch.options.forEach((option) => {
      const label = document.createElement("label");
      label.classList.add("choice-checkbox");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = option.id;
      checkbox.dataset.branchId = branch.id;
      checkbox.dataset.sceneId = branch.sceneId || currentChapterData.scenes?.[0];

      // Check if already resolved
      if (branch.resolved && branch.chosenOption === option.id) {
        checkbox.checked = true;
        checkbox.disabled = true;
      }

      // Auto-save on change
      checkbox.addEventListener("change", async (e) => {
        if (e.target.checked) {
          // Uncheck other options in same group
          const group = e.target.closest(".choice-group");
          group.querySelectorAll("input[type='checkbox']").forEach(cb => {
            if (cb !== e.target) {
              cb.checked = false;
              cb.disabled = true;
            }
          });

          // Save choice
          await resolveBranchPoint(
            activeCampaignId,
            e.target.dataset.sceneId,
            e.target.dataset.branchId,
            e.target.value
          );

          e.target.disabled = true;
          console.log("✅ Choice saved:", option.text);

          // Update progress
          updateChapterProgress();
        }
      });

      const span = document.createElement("span");
      span.textContent = option.text || option.id;

      label.appendChild(checkbox);
      label.appendChild(span);
      branchDiv.appendChild(label);
    });

    container.appendChild(branchDiv);
  });
}

// ================================
// CHAPTER PROGRESS & AUTO-ADVANCE
// ================================
function updateChapterProgress() {
  if (!currentChapterData || !currentChapterData.branchPoints) {
    document.getElementById("progressPercent").textContent = "0%";
    document.getElementById("progressFill").style.width = "0%";
    return;
  }

  const total = currentChapterData.branchPoints.length;
  const resolved = currentChapterData.branchPoints.filter(b => b.resolved).length;
  const percent = total > 0 ? Math.round((resolved / total) * 100) : 0;

  document.getElementById("progressPercent").textContent = `${percent}%`;
  document.getElementById("progressFill").style.width = `${percent}%`;

  // Enable auto-progress if complete
  const autoBtn = document.getElementById("autoProgressBtn");
  if (percent === 100) {
    autoBtn.disabled = false;
    autoBtn.textContent = "✅ Chapter Complete - Progress to Next";
  } else {
    autoBtn.disabled = true;
    autoBtn.textContent = `▶ Auto-Progress (${resolved}/${total} choices made)`;
  }
}

async function autoProgressChapter() {
  if (!activeCampaignId) return;

  const nextChapter = await progressToNextChapter(activeCampaignId);

  if (nextChapter) {
    alert(`Advanced to Chapter ${nextChapter}!`);
    await loadCampaignData(activeCampaignId); // Reload campaign
  } else {
    alert("No next chapter available. Create one first!");
  }
}

// ================================
// SCENE MANAGEMENT
// ================================
async function broadcastScene(sceneId) {
  if (!activeCampaignId || !sceneId) return;

  const success = await setCurrentScene(activeCampaignId, sceneId);

  if (success) {
    const scene = activeCampaign.scenes[sceneId];
    document.getElementById("currentSceneName").textContent = scene.name;
    document.getElementById("currentSceneDesc").textContent = scene.description || "";
    console.log("✅ Scene broadcast:", scene.name);
  }
}

async function quickAddScene() {
  const name = document.getElementById("quickSceneName").value;
  const desc = document.getElementById("quickSceneDesc").value;

  if (!name || !activeCampaignId) {
    alert("Scene name required");
    return;
  }

  const chapterNum = activeCampaign.metadata.currentChapter || 1;

  const sceneId = await addScene(activeCampaignId, {
    name: name,
    description: desc,
    chapterId: chapterNum,
    arcId: activeCampaign.metadata.currentArc,
    order: Object.keys(activeCampaign.scenes || {}).length + 1
  });

  if (sceneId) {
    document.getElementById("quickSceneName").value = '';
    document.getElementById("quickSceneDesc").value = '';
    await loadCampaignData(activeCampaignId); // Reload
    alert("Scene added!");
  }
}

// ================================
// PLAYERS DISPLAY
// ================================
function setupCampaignListeners() {
  if (!activeCampaignId) return;

  // Listen to players
  listenToPlayers(activeCampaignId, (players) => {
    const container = document.getElementById("playersList");
    container.innerHTML = '';

    const playerArray = Object.entries(players);

    if (playerArray.length === 0) {
      container.innerHTML = '<p class="empty-state">No players connected</p>';
      document.getElementById("playerCount").textContent = "0";
      return;
    }

    document.getElementById("playerCount").textContent = playerArray.length;

    playerArray.forEach(([userId, player]) => {
      const playerDiv = document.createElement("div");
      playerDiv.classList.add("player-card");
      playerDiv.innerHTML = `
        <strong>${player.characterName}</strong>
        <span class="player-status ${player.status}">${player.status}</span>
      `;
      container.appendChild(playerDiv);
    });
  });

  // Listen to campaign updates
  listenToCampaign(activeCampaignId, (campaign) => {
    activeCampaign = campaign;
    // Update UI elements that might change
    document.getElementById("currentChapter").textContent = campaign.metadata.currentChapter || 1;
  });
}

// ================================
// SESSION MANAGEMENT
// ================================
async function startNewSession() {
  if (!activeCampaignId) {
    alert("Load a campaign first");
    return;
  }

  activeSessionId = await startSession(activeCampaignId);

  if (activeSessionId) {
    document.getElementById("startSessionBtn").disabled = true;
    document.getElementById("endSessionBtn").disabled = false;
    document.getElementById("sessionStatus").textContent = `Session active (ID: ${activeSessionId.substring(0, 8)}...)`;
    console.log("✅ Session started");
  }
}

async function endCurrentSession() {
  if (!activeCampaignId || !activeSessionId) return;

  const events = prompt("Enter major events (comma-separated):");
  const eventList = events ? events.split(',').map(e => e.trim()) : [];

  const success = await endSession(activeCampaignId, activeSessionId, eventList);

  if (success) {
    document.getElementById("startSessionBtn").disabled = false;
    document.getElementById("endSessionBtn").disabled = true;
    document.getElementById("sessionStatus").textContent = "No active session";
    activeSessionId = null;
    console.log("✅ Session ended");
  }
}

// ================================
// EVENT LISTENERS SETUP
// ================================
function setupEventListeners() {
  // Campaign select
  document.getElementById("campaignSelect").addEventListener("change", (e) => {
    const campaignId = e.target.value;
    if (campaignId) {
      loadCampaignData(campaignId);
    }
  });

  // Create campaign button
  document.getElementById("createCampaignBtn").addEventListener("click", () => {
    document.getElementById("createCampaignModal").style.display = "block";
  });

  // Create campaign form
  document.getElementById("createCampaignForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("newCampaignName").value;
    const description = document.getElementById("newCampaignDesc").value;
    const startingArc = document.getElementById("startingArc").value;

    const campaignId = await createCampaign({ name, description, startingArc });

    if (campaignId) {
      // Show ID
      document.getElementById("createCampaignForm").style.display = "none";
      document.getElementById("campaignIdDisplay").style.display = "block";
      document.getElementById("createdCampaignId").value = campaignId;

      await loadMyCampaigns();
    }
  });

  // Copy campaign ID
  document.getElementById("copyCampaignId").addEventListener("click", () => {
    const input = document.getElementById("createdCampaignId");
    input.select();
    document.execCommand("copy");
    alert("Campaign ID copied!");
  });

  // Close modal
  document.querySelector(".modal-close").addEventListener("click", () => {
    document.getElementById("createCampaignModal").style.display = "none";
    document.getElementById("createCampaignForm").reset();
    document.getElementById("createCampaignForm").style.display = "block";
    document.getElementById("campaignIdDisplay").style.display = "none";
  });

  // Broadcast scene
  document.getElementById("broadcastSceneBtn").addEventListener("click", () => {
    const sceneId = document.getElementById("sceneSelect").value;
    if (sceneId) {
      broadcastScene(sceneId);
    }
  });

  // Quick add scene
  document.getElementById("addSceneBtn").addEventListener("click", quickAddScene);

  // Session controls
  document.getElementById("startSessionBtn").addEventListener("click", startNewSession);
  document.getElementById("endSessionBtn").addEventListener("click", endCurrentSession);

  // Toggle script overlay
  document.getElementById("toggleScriptBtn").addEventListener("click", () => {
    document.getElementById("scriptOverlay").classList.toggle("open");
  });

  document.getElementById("closeScriptBtn").addEventListener("click", () => {
    document.getElementById("scriptOverlay").classList.remove("open");
  });

  // Auto-progress chapter
  document.getElementById("autoProgressBtn").addEventListener("click", autoProgressChapter);

  // Add chapter
  document.getElementById("addChapterBtn").addEventListener("click", async () => {
    if (!activeCampaignId) {
      alert("Load a campaign first");
      return;
    }

    const num = parseInt(document.getElementById("chapterNumber").value);
    const name = document.getElementById("chapterName").value;
    const script = document.getElementById("chapterScript").value;

    if (!num || !name) {
      alert("Chapter number and name required");
      return;
    }

    const chapterId = await addChapter(activeCampaignId, { number: num, name, script });

    if (chapterId) {
      alert(`Chapter ${num} added!`);
      document.getElementById("chapterNumber").value = '';
      document.getElementById("chapterName").value = '';
      document.getElementById("chapterScript").value = '';
    }
  });

  // Next chapter button
  document.getElementById("nextChapterBtn").addEventListener("click", autoProgressChapter);

  console.log("✅ Event listeners setup");
}

console.log("✅ MC App script loaded");
