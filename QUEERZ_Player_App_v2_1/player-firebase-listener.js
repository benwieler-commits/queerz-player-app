
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";
const cfg={apiKey:"AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",authDomain:"queerz-mc-live.firebaseapp.com",databaseURL:"https://queerz-mc-live-default-rtdb.firebaseio.com",projectId:"queerz-mc-live",storageBucket:"queerz-mc-live.firebasestorage.app",messagingSenderId:"155846709409",appId:"1:155846709409:web:8c12204dc7d502586a20e0"};
let app,db;try{app=initializeApp(cfg);db=getDatabase(app);setSync(true);}catch(e){console.error(e);setSync(false);}
function setSync(on){const p=document.getElementById('syncStatus'); if(!p)return; p.textContent=on?"● Live Sync":"● Offline"; p.classList.toggle('online',on);}
const ROOM="default-room"; if(db){onValue(ref(db,`broadcast/${ROOM}/state`),(snap)=>{const v=snap.val(); if(!v)return; apply(v); setSync(true);});}
document.getElementById('manualSync')?.addEventListener('click',()=>setSync(!!db));
function apply(s){
  const sc=document.getElementById('syncScene'); if(s.sceneImage){sc.innerHTML=`<img class="scene-image" src="${s.sceneImage}" alt="Scene">`;}
  else if(s.sceneName){sc.innerHTML=`<div class="scene-text">${s.sceneName}</div>`;}
  const mu=document.getElementById('syncMusic'); if(s.musicUrl){mu.innerHTML=`<div class="music-info"><div class="music-title">♪ Now Playing</div><div class="music-player"><audio controls autoplay loop><source src="${s.musicUrl}" type="audio/mpeg"></audio></div></div>`;} else {mu.innerHTML='<div class="music-placeholder">♪ No music playing</div>'; }
}
