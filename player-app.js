import { db } from './firebase-config.js';
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

// Simple state
const els = {
  campaign: document.getElementById('campaignSelect'),
  character: document.getElementById('characterSelect'),
  name: document.getElementById('characterNameDisplay'),
  portrait: document.getElementById('characterPortrait'),
  toggleBtn: document.getElementById('togglePortraitBtn'),
  desc: document.getElementById('charDescription'),
  availableTags: document.getElementById('availableTags'),
  currentPower: document.getElementById('currentPower'),
  rollButton: document.getElementById('rollButton'),
  rollResult: document.getElementById('rollResult'),
  storyTagName: document.getElementById('storyTagName'),
  storyTagOngoing: document.getElementById('storyTagOngoing'),
  addStoryTag: document.getElementById('addStoryTag'),
  storyTagList: document.getElementById('storyTagList'),
  burntTagsList: document.getElementById('burntTagsList'),
  recoverBurntTags: document.getElementById('recoverBurntTags'),
  syncScene: document.getElementById('syncScene'),
  syncMusic: document.getElementById('syncMusic'),
  syncNow: document.getElementById('syncNowBtn'),
  moveSelect: document.getElementById('moveSelect')
};

let currentCharacter = null;
let portraits = {};
let portraitMode = 'streetwear';
let gameState = {
  storyTags: [],
  burntTags: [],
  selectedTags: []
};

// ---------- Campaign & Character loading ----------
async function loadManifest(manifestPath){
  const res = await fetch(manifestPath);
  const manifest = await res.json();
  // populate character dropdown
  els.character.innerHTML = '';
  (manifest.characters || []).forEach((c,i)=>{
    const opt = document.createElement('option');
    opt.value = c.file;
    opt.textContent = c.name;
    els.character.appendChild(opt);
  });
  if (manifest.characters && manifest.characters.length){
    await loadCharacter(els.character.value);
  }else{
    els.name.textContent = 'No characters in this campaign yet';
  }
}
async function loadCharacter(path){
  const res = await fetch(`characters/${path.replace(/^characters\//,'').replace(/^\.\//,'')}`);
  const json = await res.json();
  currentCharacter = json;
  // Set theme color
  if (json.color){
    document.documentElement.style.setProperty('--accent', json.color);
  }
  els.name.textContent = json.name || '';
  els.desc.textContent = json.description || '';
  portraits = json.portraits || {};
  portraitMode = 'streetwear';
  updatePortrait();
  renderAvailableTags(json);
  renderStoryTags();
  renderBurntTags();
}

function updatePortrait(){
  const src = portraits[portraitMode] || portraits.streetwear || portraits.qfactor || 'images/placeholder-portrait.png';
  els.portrait.classList.add('fade-out');
  setTimeout(()=>{
    els.portrait.src = src;
    els.portrait.classList.remove('fade-out');
    els.portrait.classList.add('fade-in');
  },200);
  els.toggleBtn.textContent = portraitMode === 'streetwear' ? 'Switch to Q-Factor' : 'Switch to Streetwear';
}

// ---------- Tags & Dice ----------
function renderAvailableTags(json){
  const all = [];
  (json.themes || []).forEach(theme=>{
    (theme.powerTags||[]).forEach(t=> all.push({name:t,type:'power'}));
    (theme.weaknessTags||[]).forEach(t=> all.push({name:t,type:'weakness'}));
  });
  // Add story tags
  gameState.storyTags.forEach(t=> all.push({name:t.name,type:'story'}));

  els.availableTags.innerHTML = '';
  all.forEach(tag=>{
    const btn = document.createElement('button');
    btn.className = 'selectable-tag';
    if (gameState.burntTags.includes(tag.name)) btn.classList.add('burnt');
    btn.innerHTML = `<span class="tag-name-text">${tag.name}</span>` + (tag.type!=='story' && !gameState.burntTags.includes(tag.name) ? `<span class="burn-icon" title="Burn this tag">🔥</span>`:'');    
    btn.addEventListener('click', (e)=>{
      if (btn.classList.contains('burnt')) return;
      const idx = gameState.selectedTags.indexOf(tag.name);
      if (idx>=0){ gameState.selectedTags.splice(idx,1); btn.classList.remove('selected'); }
      else { gameState.selectedTags.push(tag.name); btn.classList.add('selected'); }
      updatePowerDisplay();
    });
    const burn = btn.querySelector('.burn-icon');
    if (burn){
      burn.addEventListener('click',(e)=>{
        e.stopPropagation();
        if (!gameState.burntTags.includes(tag.name)){
          gameState.burntTags.push(tag.name);
          gameState.selectedTags = gameState.selectedTags.filter(n=>n!==tag.name);
          renderAvailableTags(json);
          renderBurntTags();
          alert(`"${tag.name}" burnt 🔥 → guaranteed hit per your table rules.`);
        }
      });
    }
    els.availableTags.appendChild(btn);
  });
  updatePowerDisplay();
}

function updatePowerDisplay(){
  let p=0;
  gameState.selectedTags.forEach(n=>{
    // weakness?
    let isWeak=false;
    (currentCharacter.themes||[]).forEach(th=>{
      if ((th.weaknessTags||[]).includes(n)) isWeak=true;
    });
    if (isWeak) p-=1; else p+=1;
  });
  els.currentPower.textContent = p;
}

function rollDice(){
  const move = els.moveSelect.value;
  if (!move){ alert('Pick a move first'); return; }
  let p=0, weakness=false;
  gameState.selectedTags.forEach(n=>{
    let isWeak=false;
    (currentCharacter.themes||[]).forEach(th=>{
      if ((th.weaknessTags||[]).includes(n)) isWeak=true;
    });
    if (isWeak){ p-=1; weakness=true; } else { p+=1; }
  });
  const d1 = Math.floor(Math.random()*6)+1;
  const d2 = Math.floor(Math.random()*6)+1;
  const total = d1+d2+p;
  let cls='miss', txt='MISS — the MC makes a hard move.';
  if (total>=10){ cls='success'; txt='FULL SUCCESS — you do it, clean.'; }
  else if (total>=7){ cls='partial'; txt='PARTIAL SUCCESS — you do it, but…'; }
  els.rollResult.className = `roll-result ${cls}`;
  els.rollResult.innerHTML = `<div class="dice-display">🎲 ${d1} + ${d2}</div><div class="total-display">Total: ${total} (Power: ${p})</div><div class="outcome-text">${txt}</div>`;
  els.rollResult.classList.remove('hidden');
  if (weakness) alert('You used a weakness tag — remember to mark Growth on that theme!');
  gameState.selectedTags = [];
  renderAvailableTags(currentCharacter);
}

// ---------- Story Tags & Burnt ----------
function renderStoryTags(){
  const c = els.storyTagList;
  c.innerHTML='';
  if (!gameState.storyTags.length){ c.innerHTML = '<div class="empty-state">No story tags</div>'; return; }
  gameState.storyTags.forEach((t,i)=>{
    const row = document.createElement('div');
    row.className='tag-item';
    row.innerHTML = `<div class="tag-info"><span class="tag-name">${t.name}</span> <span class="tag-type">${t.ongoing?'(Ongoing)':'(Temp)'}</span></div><button class="remove-btn">Remove</button>`;
    row.querySelector('.remove-btn').addEventListener('click',()=>{
      gameState.storyTags.splice(i,1); renderStoryTags(); renderAvailableTags(currentCharacter);
    });
    c.appendChild(row);
  });
}
function renderBurntTags(){
  const c = els.burntTagsList;
  c.innerHTML='';
  if (!gameState.burntTags.length){ c.innerHTML='<div class="empty-state">No burnt tags</div>'; return; }
  gameState.burntTags.forEach(n=>{
    const div=document.createElement('div'); div.className='burnt-tag-item'; div.textContent=n; c.appendChild(div);
  });
}

// ---------- Firebase Sync ----------
async function manualSync(){
  const snap = await get(ref(db,'broadcast/current'));
  const data = snap.val();
  applyBroadcast(data);
}
function applyBroadcast(data){
  if (!data) return;
  // Scene
  if (data.image || data.sceneText){
    if (data.image){
      els.syncScene.innerHTML = `<img src="${data.image}" class="scene-image" alt="Scene Image">`;
    } else if (data.sceneText){
      els.syncScene.innerHTML = `<div class="scene-text">${data.sceneText}</div>`;
    }
  }
  // Music
  if (data.music){
    els.syncMusic.innerHTML = `<div class="music-player"><audio controls autoplay loop><source src="${data.music}" type="audio/mpeg"></audio></div>`;
  }
}
// Real-time listener
onValue(ref(db,'broadcast/current'), (snapshot)=>{
  applyBroadcast(snapshot.val());
});

// ---------- Events ----------
els.toggleBtn.addEventListener('click', ()=>{
  portraitMode = portraitMode === 'streetwear' ? 'qfactor' : 'streetwear';
  updatePortrait();
});
els.rollButton.addEventListener('click', rollDice);
els.addStoryTag.addEventListener('click', ()=>{
  const name = els.storyTagName.value.trim();
  if (!name) return alert('Enter a story tag');
  const ongoing = !!els.storyTagOngoing.checked;
  gameState.storyTags.push({name, ongoing});
  els.storyTagName.value=''; els.storyTagOngoing.checked=false;
  renderStoryTags(); renderAvailableTags(currentCharacter);
});
els.recoverBurntTags.addEventListener('click', ()=>{
  gameState.burntTags = [];
  renderBurntTags(); renderAvailableTags(currentCharacter);
});
els.syncNow.addEventListener('click', manualSync);

els.campaign.addEventListener('change', ()=> loadManifest(els.campaign.value));
els.character.addEventListener('change', ()=> loadCharacter(els.character.value));

// Boot
loadManifest(els.campaign.value);
