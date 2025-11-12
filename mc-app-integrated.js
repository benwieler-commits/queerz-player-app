// ===================================
// QUEERZ! MC CONTROL PANEL - INTEGRATED
// Complete MC app with HTML rendering built-in
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
// HTML TEMPLATES
// ================================
const HTML_TEMPLATE = `
    <header class="mc-header">
        <h1 class="mc-title">🎭 QUEERZ! MC Control Panel</h1>
        <div class="header-controls">
            <select id="campaignSelect" class="campaign-select">
                <option value="">Select Campaign...</option>
            </select>
            <button id="createCampaignBtn" class="btn-create">+ Create Campaign</button>
            <button id="toggleScriptBtn" class="btn-toggle-script">📜 Show Script</button>
            <span id="authStatus" class="auth-status">● Connecting...</span>
        </div>
    </header>

    <main class="mc-container">
        <section class="left-panel">
            <div class="campaign-info">
                <h2 id="campaignName">No Campaign Loaded</h2>
                <p id="campaignDescription"></p>
                <div class="campaign-stats">
                    <span>Chapter: <strong id="currentChapter">-</strong></span>
                    <span>Arc: <strong id="currentArc">-</strong></span>
                    <span>Players: <strong id="playerCount">0</strong></span>
                </div>
            </div>

            <div class="scene-broadcaster">
                <h3>🎬 Scene Broadcaster</h3>
                <div class="broadcast-controls">
                    <select id="sceneSelect" class="scene-select">
                        <option value="">Select Scene...</option>
                    </select>
                    <button id="broadcastSceneBtn" class="btn-broadcast">Broadcast Scene</button>
                </div>

                <div class="current-scene-display">
                    <h4>Current Scene</h4>
                    <p id="currentSceneName">None</p>
                    <p id="currentSceneDesc" class="scene-desc"></p>
                </div>

                <div class="quick-scene-add">
                    <h4>Quick Add Scene</h4>
                    <input type="text" id="quickSceneName" placeholder="Scene name">
                    <textarea id="quickSceneDesc" placeholder="Scene description" rows="2"></textarea>
                    <button id="addSceneBtn" class="btn-add">+ Add Scene</button>
                </div>
            </div>

            <div class="session-controls">
                <h3>📊 Session Control</h3>
                <button id="startSessionBtn" class="btn-session">Start Session</button>
                <button id="endSessionBtn" class="btn-session" disabled>End Session</button>
                <p id="sessionStatus">No active session</p>
            </div>
        </section>

        <section class="center-panel">
            <div class="players-panel">
                <h3>👥 Active Players</h3>
                <div id="playersList" class="players-list">
                    <p class="empty-state">No players connected</p>
                </div>
            </div>

            <div class="voting-panel">
                <h3>🗳️ Current Vote</h3>
                <div id="currentVote" class="vote-display">
                    <p class="empty-state">No active vote</p>
                </div>
            </div>

            <div class="chapter-panel">
                <h3>📖 Chapter Progress</h3>
                <div class="chapter-info">
                    <p><strong>Current:</strong> <span id="chapterTitle">-</span></p>
                    <div id="chapterScript" class="chapter-script-mini"></div>
                    <button id="nextChapterBtn" class="btn-next-chapter">▶ Next Chapter</button>
                </div>
            </div>
        </section>

        <section class="right-panel">
            <div class="management-panel">
                <h3>⚙️ Campaign Management</h3>

                <div class="add-chapter-section">
                    <h4>Add Chapter</h4>
                    <input type="number" id="chapterNumber" placeholder="Chapter #" min="1">
                    <input type="text" id="chapterName" placeholder="Chapter name">
                    <textarea id="chapterScriptInput" placeholder="Chapter script..." rows="4"></textarea>
                    <button id="addChapterBtn" class="btn-add">+ Add Chapter</button>
                </div>

                <div class="branch-creator">
                    <h4>Create Branch Point</h4>
                    <input type="text" id="branchQuestion" placeholder="Choice question">
                    <div id="branchOptions">
                        <input type="text" class="branch-option" placeholder="Option 1">
                        <input type="text" class="branch-option" placeholder="Option 2">
                    </div>
                    <button id="addOptionBtn" class="btn-small">+ Option</button>
                    <button id="createBranchBtn" class="btn-add">Create Branch</button>
                </div>
            </div>
        </section>
    </main>

    <aside id="scriptOverlay" class="script-overlay">
        <div class="overlay-header">
            <h2>📜 Script & Choices</h2>
            <button id="closeScriptBtn" class="btn-close">×</button>
        </div>

        <div class="overlay-content">
            <div class="script-section">
                <h3>Chapter <span id="overlayChapterNum">1</span>: <span id="overlayChapterName">-</span></h3>
                <div id="scriptDisplay" class="script-text">
                    No script loaded. Select a campaign with chapters.
                </div>
            </div>

            <div class="choices-section">
                <h3>Player Choices</h3>
                <p class="choices-hint">Check off choices as players make them. Choices auto-save.</p>
                <div id="choicesCheckboxes" class="choices-list">
                    <p class="empty-state">No branch points in current chapter</p>
                </div>
            </div>

            <div class="progress-section">
                <h3>Chapter Completion</h3>
                <div id="completionStatus" class="completion-display">
                    <p>Progress: <span id="progressPercent">0%</span></p>
                    <div class="progress-bar">
                        <div id="progressFill" class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                <button id="autoProgressBtn" class="btn-auto-progress">
                    ▶ Auto-Progress to Next Chapter
                </button>
            </div>
        </div>
    </aside>

    <div id="createCampaignModal" class="modal">
        <div class="modal-content">
            <span class="modal-close">&times;</span>
            <h2>Create New Campaign</h2>
            <form id="createCampaignForm">
                <label for="newCampaignName">Campaign Name:</label>
                <input type="text" id="newCampaignName" required>

                <label for="newCampaignDesc">Description:</label>
                <textarea id="newCampaignDesc" rows="3"></textarea>

                <label for="startingArc">Starting Arc:</label>
                <input type="text" id="startingArc" value="arc-1">

                <button type="submit" class="btn-submit">Create Campaign</button>
            </form>
            <div id="campaignIdDisplay" style="display: none;">
                <h3>Campaign Created! 🎉</h3>
                <p>Campaign ID (share with players):</p>
                <input type="text" id="createdCampaignId" readonly>
                <button id="copyCampaignId" class="btn-copy">Copy ID</button>
            </div>
        </div>
    </div>
`;

// ================================
// INITIALIZATION
// ================================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🎭 MC App Loading...");

  // Render HTML
  document.getElementById("mcApp").innerHTML = HTML_TEMPLATE;

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

      if (branch.resolved && branch.chosenOption === option.id) {
        checkbox.checked = true;
        checkbox.disabled = true;
      }

      checkbox.addEventListener("change", async (e) => {
        if (e.target.checked) {
          const group = e.target.closest(".choice-group");
          group.querySelectorAll("input[type='checkbox']").forEach(cb => {
            if (cb !== e.target) {
              cb.checked = false;
              cb.disabled = true;
            }
          });

          await resolveBranchPoint(
            activeCampaignId,
            e.target.dataset.sceneId,
            e.target.dataset.branchId,
            e.target.value
          );

          e.target.disabled = true;
          console.log("✅ Choice saved:", option.text);
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
    await loadCampaignData(activeCampaignId);
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
    await loadCampaignData(activeCampaignId);
    alert("Scene added!");
  }
}

// ================================
// PLAYERS DISPLAY
// ================================
function setupCampaignListeners() {
  if (!activeCampaignId) return;

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

  listenToCampaign(activeCampaignId, (campaign) => {
    activeCampaign = campaign;
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
  document.getElementById("campaignSelect").addEventListener("change", (e) => {
    const campaignId = e.target.value;
    if (campaignId) {
      loadCampaignData(campaignId);
    }
  });

  document.getElementById("createCampaignBtn").addEventListener("click", () => {
    document.getElementById("createCampaignModal").style.display = "block";
  });

  document.getElementById("createCampaignForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("newCampaignName").value;
    const description = document.getElementById("newCampaignDesc").value;
    const startingArc = document.getElementById("startingArc").value;

    const campaignId = await createCampaign({ name, description, startingArc });

    if (campaignId) {
      document.getElementById("createCampaignForm").style.display = "none";
      document.getElementById("campaignIdDisplay").style.display = "block";
      document.getElementById("createdCampaignId").value = campaignId;

      await loadMyCampaigns();
    }
  });

  document.getElementById("copyCampaignId").addEventListener("click", () => {
    const input = document.getElementById("createdCampaignId");
    input.select();
    document.execCommand("copy");
    alert("Campaign ID copied!");
  });

  document.querySelector(".modal-close").addEventListener("click", () => {
    document.getElementById("createCampaignModal").style.display = "none";
    document.getElementById("createCampaignForm").reset();
    document.getElementById("createCampaignForm").style.display = "block";
    document.getElementById("campaignIdDisplay").style.display = "none";
  });

  document.getElementById("broadcastSceneBtn").addEventListener("click", () => {
    const sceneId = document.getElementById("sceneSelect").value;
    if (sceneId) {
      broadcastScene(sceneId);
    }
  });

  document.getElementById("addSceneBtn").addEventListener("click", quickAddScene);
  document.getElementById("startSessionBtn").addEventListener("click", startNewSession);
  document.getElementById("endSessionBtn").addEventListener("click", endCurrentSession);

  document.getElementById("toggleScriptBtn").addEventListener("click", () => {
    document.getElementById("scriptOverlay").classList.toggle("open");
  });

  document.getElementById("closeScriptBtn").addEventListener("click", () => {
    document.getElementById("scriptOverlay").classList.remove("open");
  });

  document.getElementById("autoProgressBtn").addEventListener("click", autoProgressChapter);

  document.getElementById("addChapterBtn").addEventListener("click", async () => {
    if (!activeCampaignId) {
      alert("Load a campaign first");
      return;
    }

    const num = parseInt(document.getElementById("chapterNumber").value);
    const name = document.getElementById("chapterName").value;
    const script = document.getElementById("chapterScriptInput").value;

    if (!num || !name) {
      alert("Chapter number and name required");
      return;
    }

    const chapterId = await addChapter(activeCampaignId, { number: num, name, script });

    if (chapterId) {
      alert(`Chapter ${num} added!`);
      document.getElementById("chapterNumber").value = '';
      document.getElementById("chapterName").value = '';
      document.getElementById("chapterScriptInput").value = '';
    }
  });

  document.getElementById("nextChapterBtn").addEventListener("click", autoProgressChapter);

  console.log("✅ Event listeners setup");
}

console.log("✅ MC App Integrated script loaded");
