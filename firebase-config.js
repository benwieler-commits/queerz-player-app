// ================================
// QUEERZ! PLAYER COMPANION APP
// Firebase Configuration - COMPLETE VERSION
// WITH CLOUD CHARACTER SYNC + PLAYLIST BROADCASTING
// ================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue, set, get } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// Firebase configuration
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
let currentUser = null;

try {
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization failed:', error);
}

// ===================================
// PLAYLIST STATE (received from MC)
// ===================================
let currentPlaylist = [];
let currentTrackIndex = 0;
let isLooping = false;
let isPlaying = false;

// ===================================
// CLOUD CHARACTER SYNC - Update badges
// ===================================
function updateCloudStatus(isOnline) {
    const cloudBadge = document.getElementById('cloudStatus');
    if (cloudBadge) {
        cloudBadge.textContent = isOnline ? '● Online' : '● Offline';
        cloudBadge.className = isOnline ? 'badge online' : 'badge offline';
    }
}

function updateMCStatus(isOnline) {
    const mcBadge = document.getElementById('syncBadge');
    if (mcBadge) {
        mcBadge.textContent = isOnline ? '● Online' : '● Offline';
        mcBadge.className = isOnline ? 'badge online' : 'badge offline';
    }
    
    const mcStatus = document.getElementById('mcStatus');
    if (mcStatus) {
        mcStatus.textContent = isOnline ? 'Connected to MC' : 'Waiting for MC...';
    }
}

// ===================================
// FIREBASE AUTH - Anonymous Sign-in
// ===================================
if (auth) {
    // Sign in anonymously for cloud character storage
    signInAnonymously(auth)
        .then(() => {
            console.log('✅ Anonymous auth successful');
        })
        .catch((error) => {
            console.error('❌ Auth failed:', error);
            updateCloudStatus(false);
        });
    
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log('✅ User authenticated:', user.uid);
            updateCloudStatus(true);
        } else {
            currentUser = null;
            console.log('⚠️ User not authenticated');
            updateCloudStatus(false);
        }
    });
}

// ===================================
// CLOUD CHARACTER FUNCTIONS
// ===================================
export async function saveCharacterToCloud(characterData) {
    if (!currentUser || !database) {
        console.error('❌ Cannot save - not authenticated');
        throw new Error('Not authenticated');
    }
    
    const charRef = ref(database, `users/${currentUser.uid}/characters/${characterData.name}`);
    await set(charRef, {
        ...characterData,
        lastUpdated: Date.now()
    });
    console.log('✅ Character saved to cloud:', characterData.name);
}

export async function loadCharactersFromCloud() {
    if (!currentUser || !database) {
        console.error('❌ Cannot load - not authenticated');
        return [];
    }
    
    const charsRef = ref(database, `users/${currentUser.uid}/characters`);
    const snapshot = await get(charsRef);
    
    if (snapshot.exists()) {
        const characters = Object.values(snapshot.val());
        console.log('✅ Loaded characters from cloud:', characters.length);
        return characters;
    }
    
    return [];
}

export async function deleteCharacterFromCloud(characterName) {
    if (!currentUser || !database) {
        console.error('❌ Cannot delete - not authenticated');
        throw new Error('Not authenticated');
    }
    
    const charRef = ref(database, `users/${currentUser.uid}/characters/${characterName}`);
    await set(charRef, null);
    console.log('✅ Character deleted from cloud:', characterName);
}

// Make functions available globally
window.saveCharacterToCloud = saveCharacterToCloud;
window.loadCharactersFromCloud = loadCharactersFromCloud;
window.deleteCharacterFromCloud = deleteCharacterFromCloud;

// ===================================
// PLAYLIST BROADCAST HANDLER
// ===================================
function handlePlaylistBroadcast(data) {
    console.log('🎵 Playlist broadcast received');
    
    if (data.playlist && Array.isArray(data.playlist)) {
        currentPlaylist = data.playlist;
        currentTrackIndex = data.currentTrackIndex || 0;
        isLooping = data.isLooping || false;
        isPlaying = data.isPlaying || false;
        
        renderPlaylistDisplay();
        updateAudioPlayer();
    }
}

function renderPlaylistDisplay() {
    const playlistContainer = document.getElementById('playlistDisplay');
    
    if (!playlistContainer) return;
    
    if (currentPlaylist.length === 0) {
        playlistContainer.innerHTML = '<p style="color: #999; font-style: italic;">No playlist</p>';
        playlistContainer.style.display = 'none';
        return;
    }
    
    playlistContainer.style.display = 'block';
    playlistContainer.innerHTML = '';
    
    currentPlaylist.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-track';
        
        if (index === currentTrackIndex) {
            trackDiv.classList.add('current-track');
        }
        
        const trackInfo = document.createElement('span');
        trackInfo.className = 'track-info';
        trackInfo.textContent = `${index === currentTrackIndex ? '▶ ' : ''}${index + 1}. ${track.name}`;
        
        trackDiv.appendChild(trackInfo);
        playlistContainer.appendChild(trackDiv);
    });
    
    updateLoopIndicator();
}

function updateLoopIndicator() {
    const musicInfo = document.getElementById('musicInfo');
    
    if (!musicInfo) return;
    
    const loopStatus = isLooping ? ' 🔁' : '';
    
    if (currentPlaylist.length > 0) {
        const currentTrack = currentPlaylist[currentTrackIndex];
        if (currentTrack) {
            musicInfo.innerHTML = `♪ ${currentTrack.name}${loopStatus}`;
        }
    }
}

function updateAudioPlayer() {
    const musicPlayer = document.getElementById('musicPlayer');
    
    if (!musicPlayer) return;
    
    if (currentPlaylist.length === 0) {
        musicPlayer.style.display = 'none';
        musicPlayer.pause();
        musicPlayer.src = '';
        const musicInfo = document.getElementById('musicInfo');
        if (musicInfo) musicInfo.textContent = 'No music playing';
        return;
    }
    
    const currentTrack = currentPlaylist[currentTrackIndex];
    if (!currentTrack) return;
    
    console.log('🎵 Loading track:', currentTrack.name);
    
    musicPlayer.src = currentTrack.path;
    musicPlayer.loop = isLooping;
    musicPlayer.style.display = 'block';
    
    const loopStatus = isLooping ? ' 🔁' : '';
    const musicInfo = document.getElementById('musicInfo');
    if (musicInfo) musicInfo.innerHTML = `♪ ${currentTrack.name}${loopStatus}`;
    
    if (isPlaying) {
        const playPromise = musicPlayer.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => console.log('✅ Music playing:', currentTrack.name))
                .catch(error => console.log('ℹ️ Autoplay blocked'));
        }
    } else {
        musicPlayer.pause();
    }
}

function setupAudioListeners() {
    const musicPlayer = document.getElementById('musicPlayer');
    
    if (!musicPlayer) return;
    
    musicPlayer.addEventListener('ended', () => {
        console.log('🎵 Track ended');
        
        if (currentPlaylist.length > 0 && !isLooping) {
            currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
            console.log(`⏭️ Advancing to track ${currentTrackIndex + 1}`);
            renderPlaylistDisplay();
            updateAudioPlayer();
        }
    });
    
    console.log('✅ Audio player listeners ready');
}

// ===================================
// MC BROADCAST LISTENER
// ===================================
if (database) {
    console.log('✅ Setting up MC broadcast listeners...');
    
    const broadcastRef = ref(database, 'mcBroadcast');
    onValue(broadcastRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log('📡 Broadcast received from MC');
            
            // Update scene
            if (data.currentScene) {
                const sceneInfo = document.getElementById('sceneInfo');
                if (sceneInfo && data.currentScene.name) {
                    sceneInfo.textContent = data.currentScene.name;
                }
                
                const sceneImage = document.getElementById('sceneImage');
                if (sceneImage && data.currentScene.imageUrl) {
                    sceneImage.src = data.currentScene.imageUrl;
                    sceneImage.style.display = 'block';
                } else if (sceneImage) {
                    sceneImage.style.display = 'none';
                }
            }
            
            // Handle playlist broadcast
            if (data.playlist || data.currentMusic) {
                handlePlaylistBroadcast(data);
            }
            
            // Update character spotlight
            if (data.activeCharacter) {
                const spotlightInfo = document.getElementById('spotlightInfo');
                if (spotlightInfo && data.activeCharacter.name) {
                    spotlightInfo.textContent = `🎭 ${data.activeCharacter.name}`;
                }
                
                const spotlightPortrait = document.getElementById('spotlightPortrait');
                if (spotlightPortrait && data.activeCharacter.portrait) {
                    spotlightPortrait.src = data.activeCharacter.portrait;
                    spotlightPortrait.style.display = 'block';
                } else if (spotlightPortrait) {
                    spotlightPortrait.style.display = 'none';
                }
            }
            
            updateMCStatus(true);
        }
    }, (error) => {
        console.error('❌ Error listening to MC broadcasts:', error);
        updateMCStatus(false);
    });
    
    setupAudioListeners();
    
    console.log('✅ Player App ready - Cloud Sync + MC Broadcast active');
} else {
    console.error('❌ Firebase not initialized');
    updateMCStatus(false);
    updateCloudStatus(false);
}

// Export database for other modules
export { database };
