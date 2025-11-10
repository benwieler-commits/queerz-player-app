 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/firebase-config.js b/firebase-config.js
index 77abd342db4318a30810e41a4d3d4a9be8774e9a..a04838806acf9315b8902444887c4ec898ebef36 100644
--- a/firebase-config.js
+++ b/firebase-config.js
@@ -54,59 +54,98 @@ export async function initializeAuth() {
 
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
 
+export async function saveLastCharacterToCloud(characterName) {
+  if (!database || !currentUserId) return false;
+  try {
+    const lastCharacterRef = ref(database, `users/${currentUserId}/lastCharacter`);
+    await set(lastCharacterRef, characterName || null);
+    return true;
+  } catch (error) {
+    console.error('❌ Failed to save last character name:', error);
+    return false;
+  }
+}
+
+export async function loadLastCharacterFromCloud() {
+  if (!database || !currentUserId) return null;
+  try {
+    const lastCharacterRef = ref(database, `users/${currentUserId}/lastCharacter`);
+    const snapshot = await get(lastCharacterRef);
+    return snapshot.exists() ? snapshot.val() : null;
+  } catch (error) {
+    console.error('❌ Failed to load last character name:', error);
+    return null;
+  }
+}
+
+export async function broadcastCharacterToMc(characterData) {
+  if (!database || !currentUserId || !characterData) return false;
+  try {
+    const broadcastRef = ref(database, `mcBroadcast/playerUpdates/${currentUserId}`);
+    await set(broadcastRef, { ...characterData, lastBroadcast: Date.now() });
+    return true;
+  } catch (error) {
+    console.error('❌ Failed to broadcast character to MC:', error);
+    return false;
+  }
+}
+
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
 
-export { database, auth, currentUserId };
+export { database, auth, currentUserId, saveLastCharacterToCloud, loadLastCharacterFromCloud, broadcastCharacterToMc };
 window.initializeAuth = initializeAuth;
 window.saveCharacterToCloud = saveCharacterToCloud;
 window.loadCharactersFromCloud = loadCharactersFromCloud;
+window.saveLastCharacterToCloud = saveLastCharacterToCloud;
+window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;
+window.broadcastCharacterToMc = broadcastCharacterToMc;
 
EOF
)
