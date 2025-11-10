// ================================
// QUEERZ! PLAYER COMPANION APP
// Firebase Configuration - Fixed (no recursion + dual path loading)
// ================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

async function loadFirebaseConfig() {
  const response = await fetch('./config/firebase-config.json', { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Unable to load Firebase configuration (${response.status} ${response.statusText})`);
  }
  return response.json();
}

let firebaseConfig;

try {
  firebaseConfig = await loadFirebaseConfig();
} catch (error) {
  console.error('❌ Failed to load Firebase configuration:', error);
}

let app, database, auth, currentUserId = null;

if (firebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully - Connected to queerz-mc-live');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn('⚠️ Firebase configuration unavailable. Cloud features are disabled until configuration loads.');
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

export { database, auth, currentUserId };
window.initializeAuth = initializeAuth;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
