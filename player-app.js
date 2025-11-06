import { db } from './firebase-config.js';
import { ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js";

const els = {
  campaign: document.getElementById('campaignSelect'),
  character: document.getElementById('characterSelect'),
  name: document.getElementById('characterNameDisplay'),
  desc: document.getElementById('charDescription'),
  portrait: document.getElementById('characterPortrait'),
  toggleBtn: document.getElementById('togglePortraitBtn'),
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
let gameState = JSON.parse(localStorage.getItem('folio_state')||'{}') || {};
gameState.storyTags = gameState.storyTags || [];
gameState.burntTags = gameState.burntTags || [];
gameState.selectedTags = gameState.selectedTags || [];

function persist(){ localStorage.setItem('folio_state', JSON.stringify(gameState)); }

// Campaign/Character
async function loadManifest(path){
  const res = await fetch(path);
  const m = await res.json();
  els.character.innerHTML = '';
  (m.characters||[]).forEach(c=>{
    const opt = document.createElement('option'); opt.value=c.file; opt.textContent=c.name; els.character.appendChild(opt);
  });
  if ((m.characters||[]).length){ await loadCharacter(els.character.value); }
  document.documentElement.style.setProperty('--accent', m.themeColor || '#93E9BE');
}
async function loadCharacter(file){
  const res = await fetch(`characters/${file}`);
  const json = await res.json();
  currentCharacter = json;
  els.name.textContent = json.name || '';
  els.desc.textContent = json.description || '';
  if (json.color) document.documentElement.style.setProperty('--accent', json.color);
  portraits = json.portraits || {};
  portraitMode = 'streetwear';
  updatePortrait();
  renderTags();
  renderStory();
  renderBurnt();
}
function updatePortrait(){
  const src = portraits[portraitMode] || portraits.streetwear || portraits.qfactor || 'images/placeholder-portrait.png';
  els.portrait.classList.add('fade-out');
  setTimeout(()=>{
    els.portrait.src = src;
    els.portrait.classList.remove('fade-out');
    els.portrait.classList.add('fade-in');
  },180);
  els.toggleBtn.textContent = portraitMode==='streetwear' ? 'Switch to Q-Factor' : 'Switch to Streetwear';
}

// Tags & Dice
function renderTags(){
  const host = els.availableTags;
  host.innerHTML='';
  const rows = [];
  (currentCharacter.themes||[]).forEach(th=>{
    (th.powerTags||[]).forEach(t=> rows.push({name:t,type:'power'}));
    (th.weaknessTags||[]).forEach(t=> rows.push({name:t,type:'weakness'}));
  });
  gameState.storyTags.forEach(t=> rows.push({name:t.name,type:'story'}));
  rows.forEach(tag=>{
    const div = document.createElement('div'); div.className='tag';
    if (gameState.selectedTags.includes(tag.name)) div.classList.add('selected');
    if (gameState.burntTags.includes(tag.name)) div.classList.add('burnt');
    div.innerHTML = `<span>${tag.name}</span>` + (!gameState.burntTags.includes(tag.name) && tag.type!=='story' ? `<span class="burn" title="Burn tag">🔥</span>` : '');
    div.addEventListener('click', (e)=>{
      if (div.classList.contains('burnt')) return;
      const i = gameState.selectedTags.indexOf(tag.name);
      if (i>=0){ gameState.selectedTags.splice(i,1); div.classList.remove('selected'); }
      else { gameState.selectedTags.push(tag.name); div.classList.add('selected'); }
      updatePower();
      persist();
    });
    const burn = div.querySelector('.burn');
    if (burn){
      burn.addEventListener('click', (e)=>{
        e.stopPropagation();
        if (!gameState.burntTags.includes(tag.name)){
          gameState.burntTags.push(tag.name);
          gameState.selectedTags = gameState.selectedTags.filter(n=>n!==tag.name);
          renderTags(); renderBurnt(); updatePower(); persist();
          alert(`"${tag.name}" burnt 🔥 → auto success by table rule.`);
        }
      });
    }
    host.appendChild(div);
  });
  updatePower();
}
function updatePower(){
  let p=0;
  gameState.selectedTags.forEach(n=>{
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
  if (!move) return alert('Pick a move');
  let p=0, weak=false;
  gameState.selectedTags.forEach(n=>{
    let isW=false;
    (currentCharacter.themes||[]).forEach(th=>{ if ((th.weaknessTags||[]).includes(n)) isW=true; });
    if (isW){ p-=1; weak=true; } else { p+=1; }
  });
  const d1 = Math.floor(Math.random()*6)+1, d2 = Math.floor(Math.random()*6)+1;
  const total = d1+d2+p;
  let cls='miss', txt='MISS — MC makes a hard move.';
  if (total>=10){ cls='success'; txt='FULL SUCCESS — clean.'; }
  else if (total>=7){ cls='partial'; txt='PARTIAL — you do it, but…'; }
  els.rollResult.className = `roll ${cls}`;
  els.rollResult.innerHTML = `🎲 ${d1} + ${d2} + Power(${p}) = <b>${total}</b>`;
  if (weak) alert('Weakness tag used — mark Growth on that theme.');
  gameState.selectedTags=[]; renderTags(); persist();
}

// Story/Burnt
function renderStory(){
  const host = els.storyTagList; host.innerHTML='';
  if (!gameState.storyTags.length){ host.innerHTML='<div class="muted">No story tags</div>'; return; }
  gameState.storyTags.forEach((t,i)=>{
    const row = document.createElement('div'); row.className='item';
    row.innerHTML = `<div><b>${t.name}</b> ${t.ongoing?'(Ongoing)':''}</div><button class="remove">Remove</button>`;
    row.querySelector('.remove').addEventListener('click', ()=>{ gameState.storyTags.splice(i,1); renderStory(); renderTags(); persist(); });
    host.appendChild(row);
  });
}
function renderBurnt(){
  const host = els.burntTagsList; host.innerHTML='';
  if (!gameState.burntTags.length){ host.innerHTML='<div class="muted">No burnt tags</div>'; return; }
  gameState.burntTags.forEach(n=>{
    const chip = document.createElement('div'); chip.className='chip'; chip.textContent=n; host.appendChild(chip);
  });
}

// Firebase sync
async function manualSync(){
  const snap = await get(ref(db,'broadcast/current')); applyBroadcast(snap.val());
}
function applyBroadcast(data){
  if (!data) return;
  if (data.image){
    els.syncScene.innerHTML = `<img src="${data.image}" class="portrait" style="border-width:4px" alt="Scene">`;
  }else if (data.sceneText){
    els.syncScene.textContent = data.sceneText;
  }
  if (data.music){
    els.syncMusic.innerHTML = `<audio controls autoplay loop><source src="${data.music}" type="audio/mpeg"></audio>`;
  }
}
onValue(ref(db,'broadcast/current'), snap => applyBroadcast(snap.val()));

// Events
els.toggleBtn.addEventListener('click', ()=>{
  portraitMode = portraitMode==='streetwear' ? 'qfactor' : 'streetwear'; updatePortrait();
});
els.rollButton.addEventListener('click', rollDice);
els.addStoryTag.addEventListener('click', ()=>{
  const name = els.storyTagName.value.trim(); if (!name) return;
  const ongoing = !!els.storyTagOngoing.checked;
  gameState.storyTags.push({name,ongoing}); els.storyTagName.value=''; els.storyTagOngoing.checked=false;
  renderStory(); renderTags(); persist();
});
els.recoverBurntTags.addEventListener('click', ()=>{ gameState.burntTags=[]; renderBurnt(); renderTags(); persist(); });
els.syncNow.addEventListener('click', manualSync);
els.campaign.addEventListener('change', ()=> loadManifest(els.campaign.value));
els.character.addEventListener('change', ()=> loadCharacter(els.character.value));

// Boot
loadManifest(els.campaign.value);


// --- Added: accent color + Firebase listener (no removals) ---
(function(){ window.applyAccentColor=function(hex){ if(!hex)return; document.documentElement.style.setProperty('--accent', hex); }; })();
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    if(!window._firebaseDb){ console.warn('[Player] Firebase not ready'); return; }
    window._firebaseDb.ref('/broadcast/current').on('value', function(snap){
      var v=snap.val()||{};
      if(v.sceneImage){ var sc=document.getElementById('syncScene')||document.getElementById('sceneDisplay')||document.body; var img=sc.querySelector('img.scene-image')||(function(){var i=document.createElement('img');i.className='scene-image'; sc.innerHTML=''; sc.appendChild(i); return i;})();
        img.src=v.sceneImage; }
      if(v.characterImage){ var cc=document.getElementById('portraitContainer')||document.getElementById('characterPortrait')||document.body; var ci=cc.querySelector('img')||(function(){var i=document.createElement('img'); cc.innerHTML=''; cc.appendChild(i); return i;})();
        ci.src=v.characterImage; }
      if(v.musicUrl){ var ap=document.getElementById('audioPlayer')||document.querySelector('audio'); if(ap){ ap.src=v.musicUrl; ap.play().catch(()=>{}); } }
    });
  });
})();