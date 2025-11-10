// ================================
// QUEERZ! PLAYER COMPANION APP
// Firebase Configuration - Fixed (no recursion + dual path loading)
// ================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
  authDomain: "queerz-mc-live.firebaseapp.com",
  databaseURL: "https://queerz-firebase-proxy.benwieler.workers.dev",
  projectId: "queerz-mc-live",
  storageBucket: "queerz-mc-live.firebasestorage.app",
  messagingSenderId: "155846709409",
  appId: "1:155846709409:web:8c12204dc7d502586a20e0"
};

let app, database, auth, currentUserId = null;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  auth = getAuth(app);
  console.log('✅ Firebase initialized successfully - Connected to queerz-mc-live');
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
}

export async function initializeAuth() {
  if (!auth) return false;
  if (auth._initializing) return;
  auth._initializing = true;
  try {
    if (auth.currentUser) {
      currentUserId = auth.currentUser.uid;
      document.dispatchEvent(new Event('firebase-auth-ready'));
      initializeBroadcastListener();
      return true;
    }
    const userCredential = await signInAnonymously(auth);
    currentUserId = userCredential.user.uid;
    document.dispatchEvent(new Event('firebase-auth-ready'));
    initializeBroadcastListener();
    return true;
  } catch (error) {
    console.error('❌ Auth failed:', error);
    return false;
  } finally {
    auth._initializing = false;
  }
}

if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUserId = user.uid;
      document.dispatchEvent(new Event('firebase-auth-ready'));
      initializeBroadcastListener();
    } else {
      currentUserId = null;
    }
  });
}

export async function saveCharacterToCloud(characterData) {
  if (!database || !currentUserId) return false;
  try {
    const charRef = ref(database, `users/${currentUserId}/characters/${characterData.name}`);
    await set(charRef, { ...characterData, lastModified: Date.now() });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function saveLastCharacterToCloud(characterName) {
  if (!database || !currentUserId) return false;
  try {
    const lastCharacterRef = ref(database, `users/${currentUserId}/lastCharacter`);
    await set(lastCharacterRef, characterName || null);
    return true;
  } catch (error) {
    console.error('❌ Failed to save last character name:', error);
    return false;
  }
}

export async function loadLastCharacterFromCloud() {
  if (!database || !currentUserId) return null;
  try {
    const lastCharacterRef = ref(database, `users/${currentUserId}/lastCharacter`);
    const snapshot = await get(lastCharacterRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('❌ Failed to load last character name:', error);
    return null;
  }
}

export async function broadcastCharacterToMc(characterData) {
  if (!database || !currentUserId || !characterData) return false;
  try {
    const broadcastRef = ref(database, `mcBroadcast/playerUpdates/${currentUserId}`);
    await set(broadcastRef, { ...characterData, lastBroadcast: Date.now() });
    return true;
  } catch (error) {
    console.error('❌ Failed to broadcast character to MC:', error);
    return false;
  }
}

export async function loadCharactersFromCloud() {
  if (!database) return null;
  try {
    let charsRef = currentUserId ? ref(database, `users/${currentUserId}/characters`) : null;
    let snapshot = charsRef ? await get(charsRef) : null;
    if (!snapshot || !snapshot.exists()) {
      charsRef = ref(database, 'playerCharacters');
      snapshot = await get(charsRef);
    }
    return snapshot.exists() ? snapshot.val() : {};
  } catch (error) {
    console.error(error);
    return null;
  }
}

function initializeBroadcastListener() {
  if (!database || initializeBroadcastListener._active) return;
  initializeBroadcastListener._active = true;
  const broadcastRef = ref(database, 'mcBroadcast');
  onValue(broadcastRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    if (data.currentScene) {
      const sceneInfo = document.getElementById('sceneInfo');
      if (sceneInfo) sceneInfo.textContent = data.currentScene.name || '';
    }
  });
}

export { database, auth, currentUserId, saveLastCharacterToCloud, loadLastCharacterFromCloud, broadcastCharacterToMc };
window.initializeAuth = initializeAuth;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.saveLastCharacterToCloud = saveLastCharacterToCloud;
window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;
window.broadcastCharacterToMc = broadcastCharacterToMc;
