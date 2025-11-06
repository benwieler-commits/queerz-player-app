
// player-sync.js
(function(){

  function inject(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
  async function ensureFirebase(){
    if(window.firebase && window.firebase.app) return;
    await inject("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
    await inject("https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js");
  }

  function pill(){
    let p=document.getElementById("syncPill");
    if(!p){
      p=document.createElement("div");
      p.id="syncPill";
      p.textContent="● Offline";
      p.style.position="fixed";p.style.left="12px";p.style.bottom="12px";
      p.style.padding="8px 12px";p.style.borderRadius="999px";
      p.style.background="rgba(239,68,68,0.9)";p.style.color="#fff";
      p.style.font="600 12px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial";
      p.style.zIndex="2147483647";
      document.body.appendChild(p);
    }
    return p;
  }

  function toFull(path){
    if(!path) return "";
    if(/^https?:\/\//i.test(path)) return path;
    const clean = path.replace(/^\/+/, "");
    return "https://benwieler-commits.github.io/queerz-mc-app/" + clean;
  }

  async function init(){
    await ensureFirebase();
    if(!window._PL_FB_READY){
      window._PL_FB_READY = true;
      const config = {
        apiKey: "AIzaSyDOeJQjTm0xuFDAhhLaWP6d_kK_hNwRY58",
        authDomain: "queerz-mc-live.firebaseapp.com",
        databaseURL: "https://queerz-mc-live-default-rtdb.firebaseio.com",
        projectId: "queerz-mc-live",
        storageBucket: "queerz-mc-live.firebasestorage.app",
        messagingSenderId: "155846709409",
        appId: "1:155846709409:web:8c12204dc7d502586a20e0"
      };
      if(!firebase.apps.length) firebase.initializeApp(config);
      const db = firebase.database();
      const p = pill();
      db.ref(".info/connected").on("value", s=>{
        const on=!!s.val(); p.textContent = on?"● Live Sync":"● Offline";
        p.style.background = on?"rgba(16,185,129,0.9)":"rgba(239,68,68,0.9)";
      });

      db.ref("/broadcast/current").on("value", snap=>{
        const d=snap.val(); if(!d) return;
        if(d.sceneImagePath){
          const el = document.getElementById("syncScene") || document.getElementById("sceneContainer") || document.getElementById("syncSceneImage");
          if(el) el.innerHTML = '<img class="scene-image" alt="Scene">';
          const img = el && el.querySelector('img');
          if(img) img.src = toFull(d.sceneImagePath);
        }
        if(d.characterImagePath){
          const el = document.getElementById("syncCharacter") || document.getElementById("characterContainer") || document.getElementById("syncCharacterImage");
          if(el) el.innerHTML = '<img class="character-image" alt="Character">';
          const img = el && el.querySelector('img');
          if(img) img.src = toFull(d.characterImagePath);
        }
        if(d.musicPath){
          const el = document.getElementById("syncMusic") || document.getElementById("musicContainer");
          if(el){
            el.innerHTML = '<div class="music-info">♪ Now Playing</div><audio id="syncAudio" controls autoplay loop></audio>';
            const a = el.querySelector("#syncAudio");
            a.src = toFull(d.musicPath);
            a.play().catch(()=>{});
          }
        }
        if(d.sceneText){
          const t=document.getElementById("syncSceneText");
          if(t) t.textContent = d.sceneText;
        }
      });
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();
