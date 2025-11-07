// Firebase Configuration for QUEERZ! Player Companion App
// SYNCED TO: queerz-mc-live (same project as MC App)

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

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
    console.log('✓ Firebase initialized successfully - Connected to queerz-mc-live');
} catch (error) {
    console.error('✗ Firebase initialization failed:', error);
}

// Update sync status badge
function updateSyncStatus(isOnline) {
    const badge = document.getElementById('sync-status-badge');
    if (badge) {
        badge.textContent = isOnline ? '● Online' : '○ Offline';
        badge.style.color = isOnline ? '#4ade80' : '#f87171';
    }
}

// Only set up listeners if Firebase initialized successfully
if (database) {
    // Listen for scene updates from MC
    const sceneRef = ref(database, 'currentScene');
    onValue(sceneRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log('Scene update received:', data);
            
            const sceneTitle = document.getElementById('current-scene-title');
            if (sceneTitle && data.title) {
                sceneTitle.textContent = data.title;
            }
            
            const locationImg = document.getElementById('location-image');
            if (locationImg && data.locationImage) {
                locationImg.src = data.locationImage;
                locationImg.style.display = 'block';
            }
            
            updateSyncStatus(true);
        }
    }, (error) => {
        console.error('Error listening to scene updates:', error);
        updateSyncStatus(false);
    });

    // Listen for music updates from MC
    const musicRef = ref(database, 'currentMusic');
    onValue(musicRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log('Music update received:', data);
            
            const musicDisplay = document.getElementById('current-music-display');
            if (musicDisplay && data.title) {
                musicDisplay.textContent = `♪ ${data.title}`;
            }
            
            updateSyncStatus(true);
        }
    }, (error) => {
        console.error('Error listening to music updates:', error);
    });

    // Listen for character updates from MC
    const characterRef = ref(database, 'currentCharacter');
    onValue(characterRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            console.log('Character update received:', data);
            
            const charImg = document.getElementById('character-portrait');
            if (charImg && data.portraitUrl) {
                charImg.src = data.portraitUrl;
                charImg.style.display = 'block';
            }
            
            const charName = document.getElementById('character-name-display');
            if (charName && data.name) {
                charName.textContent = data.name;
            }
            
            updateSyncStatus(true);
        }
    }, (error) => {
        console.error('Error listening to character updates:', error);
    });

    console.log('✓ Firebase listeners active - Player App ready to receive from MC App');
} else {
    console.error('✗ Firebase not initialized - sync will not work');
}

// Export database for use in other modules
export { database };