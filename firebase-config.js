// ================================
// QUEERZ! PLAYER COMPANION APP
// Firebase Configuration - WITH PLAYLIST BROADCASTING
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

// ===================================
// PLAYLIST STATE (received from MC)
// ===================================
let currentPlaylist = [];
let currentTrackIndex = 0;
let isLooping = false;
let isPlaying = false;

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

// ===================================
// PLAYLIST BROADCAST HANDLER
// ===================================
function handlePlaylistBroadcast(data) {
    console.log('🎵 Playlist broadcast received:', data);
    
    // Update playlist state
    if (data.playlist && Array.isArray(data.playlist)) {
        currentPlaylist = data.playlist;
        currentTrackIndex = data.currentTrackIndex || 0;
        isLooping = data.isLooping || false;
        isPlaying = data.isPlaying || false;
        
        console.log(`📋 Playlist: ${currentPlaylist.length} tracks`);
        console.log(`▶️ Current track: ${currentTrackIndex + 1}/${currentPlaylist.length}`);
        console.log(`🔁 Loop: ${isLooping ? 'ON' : 'OFF'}`);
        
        // Update the playlist display
        renderPlaylistDisplay();
        
        // Update the audio player
        updateAudioPlayer();
    } else {
        console.log('ℹ️ No playlist in broadcast');
    }
}

// ===================================
// RENDER PLAYLIST DISPLAY
// ===================================
function renderPlaylistDisplay() {
    const playlistContainer = document.getElementById('playlistDisplay');
    
    if (!playlistContainer) {
        console.warn('⚠️ Playlist container not found in HTML');
        return;
    }
    
    // Clear existing content
    playlistContainer.innerHTML = '';
    
    // If no playlist, show message
    if (currentPlaylist.length === 0) {
        playlistContainer.innerHTML = '<p style="color: #999; font-style: italic;">No playlist</p>';
        playlistContainer.style.display = 'none';
        return;
    }
    
    // Show playlist container
    playlistContainer.style.display = 'block';
    
    // Create playlist tracks
    currentPlaylist.forEach((track, index) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'playlist-track';
        
        // Highlight current track
        if (index === currentTrackIndex) {
            trackDiv.classList.add('current-track');
        }
        
        // Track number and name
        const trackInfo = document.createElement('span');
        trackInfo.className = 'track-info';
        trackInfo.textContent = `${index === currentTrackIndex ? '▶ ' : ''}${index + 1}. ${track.name}`;
        
        trackDiv.appendChild(trackInfo);
        playlistContainer.appendChild(trackDiv);
    });
    
    // Update loop indicator
    updateLoopIndicator();
}

// ===================================
// UPDATE LOOP INDICATOR
// ===================================
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

// ===================================
// UPDATE AUDIO PLAYER
// ===================================
function updateAudioPlayer() {
    const musicPlayer = document.getElementById('musicPlayer');
    
    if (!musicPlayer) {
        console.warn('⚠️ Music player element not found');
        return;
    }
    
    // If no tracks, hide player
    if (currentPlaylist.length === 0) {
        musicPlayer.style.display = 'none';
        musicPlayer.pause();
        musicPlayer.src = '';
        document.getElementById('musicInfo').textContent = 'No music playing';
        return;
    }
    
    // Get current track
    const currentTrack = currentPlaylist[currentTrackIndex];
    
    if (!currentTrack) {
        console.warn('⚠️ Invalid track index:', currentTrackIndex);
        return;
    }
    
    console.log(`🎵 Loading track: ${currentTrack.name}`);
    
    // Update audio source
    musicPlayer.src = currentTrack.path;
    musicPlayer.loop = isLooping;
    musicPlayer.style.display = 'block';
    
    // Update music info
    const loopStatus = isLooping ? ' 🔁' : '';
    document.getElementById('musicInfo').innerHTML = `♪ ${currentTrack.name}${loopStatus}`;
    
    // Auto-play if MC is playing
    if (isPlaying) {
        const playPromise = musicPlayer.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log('✅ Music playing:', currentTrack.name);
                })
                .catch(error => {
                    console.log('ℹ️ Autoplay blocked - user must click play button');
                });
        }
    } else {
        musicPlayer.pause();
    }
}

// ===================================
// AUTO-ADVANCE TO NEXT TRACK
// ===================================
function setupAudioListeners() {
    const musicPlayer = document.getElementById('musicPlayer');
    
    if (!musicPlayer) return;
    
    // When track ends, advance to next (if not looping)
    musicPlayer.addEventListener('ended', () => {
        console.log('🎵 Track ended');
        
        // If looping one track, the audio element handles it automatically
        // If we have a playlist and not looping, advance to next track
        if (currentPlaylist.length > 0 && !isLooping) {
            // Move to next track
            currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
            
            console.log(`⏭️ Advancing to track ${currentTrackIndex + 1}/${currentPlaylist.length}`);
            
            // Update display and player
            renderPlaylistDisplay();
            updateAudioPlayer();
        }
    });
    
    console.log('✅ Audio player listeners set up');
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
        look: characterData.look || '',
        portrait: characterData.portrait || '',
        timestamp: Date.now()
    }).then(() => {
        console.log('✅ Character sent to MC App successfully!');
    }).catch((error) => {
        console.error('❌ Failed to send character to MC App:', error);
        throw error;
    });
}

// Only set up listeners if Firebase initialized successfully
if (database) {
    console.log('✅ Setting up Firebase listeners...');
    
    // Listen to mcBroadcast path (where MC App sends data)
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
                }
                
                const sceneImage = document.getElementById('sceneImage');
                if (sceneImage && data.currentScene.imageUrl) {
                    sceneImage.src = data.currentScene.imageUrl;
                    sceneImage.style.display = 'block';
                } else if (sceneImage) {
                    sceneImage.style.display = 'none';
                }
            }
            
            // 🎵 HANDLE PLAYLIST BROADCAST
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
            
            updateSyncStatus(true);
        }
    }, (error) => {
        console.error('❌ Error listening to MC broadcasts:', error);
        updateSyncStatus(false);
    });
    
    // Set up audio player listeners for auto-advance
    setupAudioListeners();

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
