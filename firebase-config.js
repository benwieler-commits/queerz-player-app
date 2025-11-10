// ================================
// QUEERZ! PLAYER COMPANION APP
// Firebase Configuration - CLOUD STORAGE VERSION
// ================================
// SYNCED TO: queerz-mc-live (same project as MC App)
// ⭐ COMPLETE FILE - Just replace your firebase-config.js with this!

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, set, get, remove } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Firebase configuration - MUST MATCH MC APP
const firebaseConfig = {
  apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
  authDomain: "queerz-mc-live.firebaseapp.com",
  databaseURL: "https://queerz-mc-live-default-rtdb.firebaseio.com",
  projectId: "queerz-mc-live",
  storageBucket: "queerz-mc-live.firebasestorage.app",
  messagingSenderId: "155846709409",
  appId: "1:155846709409:web:8c12204dc7d502586a20e0"
};

// Initialize Firebase
let app;
let database;
let auth;
let currentUserId = null;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully - Connected to queerz-mc-live');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// ================================
// AUTHENTICATION
// ================================

// Sign in anonymously (no login required!)
export async function initializeAuth() {
    if (!auth) {
        console.error('❌ Firebase Auth not initialized');
        return false;
    }
    
    try {
        // Check if already signed in
        if (auth.currentUser) {
            currentUserId = auth.currentUser.uid;
            console.log('✅ Already signed in with user ID:', currentUserId);
            updateCloudStatus(true);
            return true;
        }
        
        // Sign in anonymously
        console.log('🔐 Signing in anonymously...');
        const userCredential = await signInAnonymously(auth);
        currentUserId = userCredential.user.uid;
        console.log('✅ Signed in with user ID:', currentUserId);
        updateCloudStatus(true);
        return true;
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        updateCloudStatus(false);
        return false;
    }
}

// Listen for auth state changes
if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUserId = user.uid;
            console.log('✅ Auth state changed - User signed in:', currentUserId);
            updateCloudStatus(true);
        } else {
            currentUserId = null;
            console.log('❌ Auth state changed - User signed out');
            updateCloudStatus(false);
        }
    });
}

// ================================
// CLOUD STORAGE FUNCTIONS
// ================================

// Save character to cloud
export async function saveCharacterToCloud(characterData) {
    if (!database || !currentUserId) {
        console.error('❌ Cannot save to cloud - not authenticated');
        return false;
    }
    
    try {
        const characterName = characterData.name;
        const charRef = ref(database, `users/${currentUserId}/characters/${characterName}`);
        
        console.log('☁️ Saving character to cloud:', characterName);
        await set(charRef, {
            ...characterData,
            lastModified: Date.now()
        });
        
        console.log('✅ Character saved to cloud successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to save character to cloud:', error);
        return false;
    }
}

// Load all characters from cloud
export async function loadCharactersFromCloud() {
    if (!database || !currentUserId) {
        console.error('❌ Cannot load from cloud - not authenticated');
        return null;
    }
    
    try {
        const charsRef = ref(database, `users/${currentUserId}/characters`);
        console.log('☁️ Loading characters from cloud...');
        
        const snapshot = await get(charsRef);
        
        if (snapshot.exists()) {
            const characters = snapshot.val();
            console.log('✅ Characters loaded from cloud:', Object.keys(characters));
            return characters;
        } else {
            console.log('ℹ️ No characters found in cloud');
            return {};
        }
    } catch (error) {
        console.error('❌ Failed to load characters from cloud:', error);
        return null;
    }
}

// Delete character from cloud
export async function deleteCharacterFromCloud(characterName) {
    if (!database || !currentUserId) {
        console.error('❌ Cannot delete from cloud - not authenticated');
        return false;
    }
    
    try {
        const charRef = ref(database, `users/${currentUserId}/characters/${characterName}`);
        console.log('☁️ Deleting character from cloud:', characterName);
        
        await remove(charRef);
        console.log('✅ Character deleted from cloud successfully!');
        return true;
    } catch (error) {
        console.error('❌ Failed to delete character from cloud:', error);
        return false;
    }
}

// Save last used character name to cloud
export async function saveLastCharacterToCloud(characterName) {
    if (!database || !currentUserId) {
        console.error('❌ Cannot save last character to cloud - not authenticated');
        return false;
    }
    
    try {
        const lastCharRef = ref(database, `users/${currentUserId}/lastCharacter`);
        await set(lastCharRef, characterName);
        console.log('✅ Last character saved to cloud:', characterName);
        return true;
    } catch (error) {
        console.error('❌ Failed to save last character to cloud:', error);
        return false;
    }
}

// Load last used character name from cloud
export async function loadLastCharacterFromCloud() {
    if (!database || !currentUserId) {
        console.error('❌ Cannot load last character from cloud - not authenticated');
        return null;
    }
    
    try {
        const lastCharRef = ref(database, `users/${currentUserId}/lastCharacter`);
        const snapshot = await get(lastCharRef);
        
        if (snapshot.exists()) {
            const characterName = snapshot.val();
            console.log('✅ Last character loaded from cloud:', characterName);
            return characterName;
        } else {
            console.log('ℹ️ No last character found in cloud');
            return null;
        }
    } catch (error) {
        console.error('❌ Failed to load last character from cloud:', error);
        return null;
    }
}

// ================================
// STATUS UPDATES
// ================================

function updateCloudStatus(isOnline) {
    const cloudBadge = document.getElementById('cloudBadge');
    if (cloudBadge) {
        cloudBadge.textContent = isOnline ? '☁️ Cloud' : '☁️ Offline';
        cloudBadge.className = isOnline ? 'badge cloud-online' : 'badge cloud-offline';
    }
}

// Update MC sync status badge
function updateSyncStatus(isOnline) {
    const badge = document.getElementById('syncBadge');
    if (badge) {
        badge.textContent = isOnline ? '● Online' : '● Offline';
        badge.className = isOnline ? 'badge online' : 'badge offline';
    }
    
    const mcStatus = document.getElementById('mcStatus');
    if (mcStatus && isOnline) {
        mcStatus.textContent = 'Connected to MC';
    } else if (mcStatus) {
        mcStatus.textContent = 'Waiting for MC...';
    }
}

// ================================
// MC SYNC FUNCTIONS (EXISTING)
// ================================

// Function to send character data to MC App
export function sendCharacterToMC(characterData) {
    if (!database) {
        console.error('❌ Firebase not initialized - cannot send character data');
        return Promise.reject(new Error('Firebase not initialized'));
    }
    
    console.log('📤 Sending character to MC App:', characterData.name);
    
    // Send to playerCharacters/{characterName}
    const charRef = ref(database, `playerCharacters/${characterData.name}`);
    return set(charRef, {
        name: characterData.name,
        pronouns: characterData.pronouns || '',
        look: characterData.runway || characterData.playbook || '',
        playbook: characterData.playbook || '',
        portrait: characterData.streetwearPortrait || characterData.qfactorPortrait || '',
        timestamp: Date.now()
    }).then(() => {
        console.log('✅ Character sent to MC App successfully!');
        console.log('📦 Character data sent:', {
            name: characterData.name,
            pronouns: characterData.pronouns,
            portrait: characterData.streetwearPortrait || characterData.qfactorPortrait
        });
    }).catch((error) => {
        console.error('❌ Failed to send character to MC App:', error);
        throw error;
    });
}

// ================================
// MC BROADCAST LISTENERS (EXISTING)
// ================================

// Only set up listeners if Firebase initialized successfully
if (database) {
    console.log('✅ Setting up Firebase listeners...');
    
    // Listen to mcBroadcast path (where MC App actually sends data)
    const broadcastRef = ref(database, 'mcBroadcast');
    onValue(broadcastRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log('📡 Broadcast received from MC:', data);
            
            // Update scene display
            if (data.currentScene) {
                const sceneInfo = document.getElementById('sceneInfo');
                if (sceneInfo && data.currentScene.name) {
                    sceneInfo.textContent = data.currentScene.name;
                    console.log('✅ Scene updated:', data.currentScene.name);
                }
                
                // Display scene image
                const sceneImage = document.getElementById('sceneImage');
                if (sceneImage && data.currentScene.imageUrl) {
                    sceneImage.src = data.currentScene.imageUrl;
                    sceneImage.style.display = 'block';
                    console.log('🖼️ Scene image displayed:', data.currentScene.imageUrl);
                } else if (sceneImage) {
                    sceneImage.style.display = 'none';
                }
            }
            
            // Update music display and play audio
            if (data.currentMusic) {
                const musicInfo = document.getElementById('musicInfo');
                if (musicInfo && data.currentMusic.name) {
                    musicInfo.textContent = data.currentMusic.name;
                    console.log('✅ Music updated:', data.currentMusic.name);
                }
                
                // Play music
                const musicPlayer = document.getElementById('musicPlayer');
                if (musicPlayer && data.currentMusic.url) {
                    musicPlayer.src = data.currentMusic.url;
                    musicPlayer.style.display = 'block';
                    
                    // Auto-play with error handling
                    const playPromise = musicPlayer.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('🎵 Music playing:', data.currentMusic.name);
                            })
                            .catch(error => {
                                console.log('ℹ️ Autoplay blocked - user must click play button');
                            });
                    }
                } else if (musicPlayer) {
                    musicPlayer.pause();
                    musicPlayer.style.display = 'none';
                }
            }
            
            // Update character spotlight
            if (data.activeCharacter) {
                const spotlightInfo = document.getElementById('spotlightInfo');
                if (spotlightInfo && data.activeCharacter.name) {
                    spotlightInfo.textContent = data.activeCharacter.name;
                    console.log('✅ Spotlight updated:', data.activeCharacter.name);
                }
                
                // Display spotlight character portrait
                const spotlightPortrait = document.getElementById('spotlightPortrait');
                if (spotlightPortrait && data.activeCharacter.imageUrl) {
                    spotlightPortrait.src = data.activeCharacter.imageUrl;
                    spotlightPortrait.style.display = 'block';
                    console.log('🎭 Spotlight portrait displayed:', data.activeCharacter.imageUrl);
                } else if (spotlightPortrait) {
                    spotlightPortrait.style.display = 'none';
                }
            }
            
            updateSyncStatus(true);
        }
    }, (error) => {
        console.error('❌ Error listening to MC broadcasts:', error);
        updateSyncStatus(false);
    });

    console.log('✅ Firebase listeners active - Player App ready to receive from MC App');
} else {
    console.error('❌ Firebase not initialized - sync will not work');
    updateSyncStatus(false);
}

// ================================
// EXPORTS
// ================================

export { database, auth, currentUserId };

// Expose functions globally for non-module scripts
window.sendCharacterToMC = sendCharacterToMC;
window.initializeAuth = initializeAuth;
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.deleteCharacterFromCloud = deleteCharacterFromCloud;
window.saveLastCharacterToCloud = saveLastCharacterToCloud;
window.loadLastCharacterFromCloud = loadLastCharacterFromCloud;

console.log('✅ Firebase ready - Cloud storage and MC sync available!');
