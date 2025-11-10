// ================================
// QUEERZ! PLAYER COMPANION APP
// Firebase Configuration - FIXED VERSION
// ================================
// SYNCED TO: queerz-mc-live (same project as MC App)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

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

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log('✅ Firebase initialized successfully - Connected to queerz-mc-live');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// Update sync status badge
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
        look: characterData.runway || characterData.playbook || '',  // Use runway or playbook as look description
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

// Only set up listeners if Firebase initialized successfully
if (database) {
    console.log('✅ Setting up Firebase listeners...');
    
    // ⭐ FIXED: Listen to mcBroadcast path (where MC App actually sends data)
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

// Export database for use in other modules
export { database };

// Expose sendCharacterToMC globally for non-module scripts
window.sendCharacterToMC = sendCharacterToMC;
console.log('✅ Character sync function ready - use window.sendCharacterToMC(characterData)');
