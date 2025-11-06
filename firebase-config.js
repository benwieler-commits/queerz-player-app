import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
  authDomain: "queerz-mc-live.firebaseapp.com",
  databaseURL: "https://queerz-mc-live-default-rtdb.firebaseio.com",
  projectId: "queerz-mc-live",
  storageBucket: "queerz-mc-live.firebasestorage.app",
  messagingSenderId: "155846709409",
  appId: "1:155846709409:web:8c12204dc7d502586a20e0"
};

console.log('Initializing Firebase for Player App');

try {
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  
  console.log('Firebase initialized successfully');
  
  const badge = document.getElementById('syncBadge');
  if (badge) {
    badge.textContent = '● Online';
    badge.classList.remove('offline');
    badge.classList.add('online');
  }
  
  console.log('Starting MC broadcast listeners');
  
  const sceneRef = ref(database, 'mcBroadcast/currentScene');
  onValue(sceneRef, (snapshot) => {
    const sceneData = snapshot.val();
    const sceneInfo = document.getElementById('sceneInfo');
    if (sceneInfo && sceneData) {
      sceneInfo.textContent = sceneData.name || 'Unknown Scene';
      console.log('Scene updated:', sceneData.name);
    }
  });
  
  const musicRef = ref(database, 'mcBroadcast/currentMusic');
  onValue(musicRef, (snapshot) => {
    const musicData = snapshot.val();
    const musicInfo = document.getElementById('musicInfo');
    if (musicInfo && musicData) {
      musicInfo.textContent = musicData.name || 'No music';
      console.log('Music updated:', musicData.name);
    }
  });
  
  const charRef = ref(database, 'mcBroadcast/activeCharacter');
  onValue(charRef, (snapshot) => {
    const charData = snapshot.val();
    const spotlightInfo = document.getElementById('spotlightInfo');
    if (spotlightInfo && charData) {
      spotlightInfo.textContent = charData.name || '';
      console.log('Spotlight updated:', charData.name);
    }
  });
  
  console.log('MC broadcast listeners active');
  
} catch (error) {
  console.error('Firebase initialization failed:', error);
  console.log('Running in offline mode');
}

export { database, ref, onValue };
