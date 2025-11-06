import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';import { getDatabase, ref, onValue, goOnline } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';import { firebaseConfig } from './firebase-config.js';const app=initializeApp(firebaseConfig);const db=getDatabase(app);try{goOnline(db);const b=document.getElementById('syncBadge');b.textContent='● Live Sync';b.classList.replace('offline','online');}catch(e){}let character=null,themeMeta=null,portraitMode='street',selectedTags=new Set(),burntTags=new Set(),storyTags=[];async function loadLuxy(){const [c,t]=await Promise.all([fetch('characters/luxy-charms.json').then(r=>r.json()),fetch('themes/luxy-charms.json').then(r=>r.json())]);character=c;themeMeta=t;document.documentElement.style.setProperty('--accent',c.colorHex||t.colorHex||'#93E9BE');buildCharacterSelect();renderFolio();setPortrait('street');}function buildCharacterSelect(){const s=document.getElementById('characterSelect');s.innerHTML='<option value="luxy-charms" selected>Luxy Charms</option>';s.addEventListener('change',()=>{});}function setPortrait(m){portraitMode=m;const img=document.getElementById('portraitImg');img.src=m==='street'?themeMeta.portraits.street:themeMeta.portraits.qfactor;document.getElementById('portraitToggle').textContent=m==='street'?'Switch to Q-Factor':'Switch to Streetwear';}document.getElementById('portraitToggle').addEventListener('click',()=>setPortrait(portraitMode==='street'?'qfactor':'street'));function renderFolio(){(character.themes||[]).forEach((th,i)=>{const el=document.querySelector(`.theme-card[data-theme-index="${i}"]`);if(!el) return;const tags=(th.powerTags||[]).map(tag=>`<span class='pill' data-tag='${tag}'>${tag} <button class='tag-btn' data-burn='${tag}'>🔥</button></span>`).join('');el.innerHTML=`<h4>${th.name}</h4><div><em>${th.type==='rainbow'?'Runway':'Identity'}:</em> ${th.runway||th.identity||''}</div><div style='margin:.3rem 0;'><strong>Weakness:</strong> ${th.weaknessTag||''}</div><div class='tags'>${tags}</div><div style='margin-top:.4rem;font-size:.9em;opacity:.8;'><strong>Theme Improvement:</strong> ${th.themeImprovement||''}</div>`;});document.querySelectorAll('[data-burn]').forEach(btn=>btn.addEventListener('click',e=>{const tag=e.currentTarget.dataset.burn;burntTags.add(tag);selectedTags.delete(tag);const pill=e.currentTarget.closest('.pill');if(pill) pill.classList.add('burnt');renderBurntList();updatePower();alert(`"${tag}" burnt!`);}));document.querySelectorAll('.pill').forEach(p=>p.addEventListener('click',()=>{const tag=p.dataset.tag;if(burntTags.has(tag)) return;if(selectedTags.has(tag)) selectedTags.delete(tag); else selectedTags.add(tag);p.classList.toggle('active');updatePower();}));updatePower();}function renderBurntList(){const b=document.getElementById('burntList');b.innerHTML=Array.from(burntTags).map(t=>`<span class='pill burnt'>${t}</span>`).join('')||'<em>No burnt tags</em>'; }document.getElementById('recoverBtn').addEventListener('click',()=>{burntTags.clear();document.querySelectorAll('.pill.burnt').forEach(p=>p.classList.remove('burnt'));renderBurntList();});document.getElementById('storyAdd').addEventListener('click',()=>{const name=document.getElementById('storyName').value.trim();const ongoing=document.getElementById('storyOngoing').checked;if(!name) return;storyTags.push({name,ongoing});document.getElementById('storyName').value='';document.getElementById('storyOngoing').checked=false;renderStoryList();updatePower();});function renderStoryList(){const box=document.getElementById('storyList');box.innerHTML=storyTags.map((t,i)=>`<span class='pill' data-story='${i}'>${t.name} ${t.ongoing?'(ongoing)':''} <button data-use-story='${i}' class='tag-btn'>+1</button> <button data-remove-story='${i}' class='tag-btn'>✕</button></span>`).join('');box.querySelectorAll('[data-use-story]').forEach(b=>b.addEventListener('click',e=>{const i=+e.currentTarget.dataset.useStory;storyTags[i].used=(storyTags[i].used||0)+1;if(!storyTags[i].ongoing){storyTags.splice(i,1);}renderStoryList();updatePower();}));box.querySelectorAll('[data-remove-story]').forEach(b=>b.addEventListener('click',e=>{const i=+e.currentTarget.dataset.removeStory;storyTags.splice(i,1);renderStoryList();updatePower();}));}function calcPower(){let p=selectedTags.size;p+=storyTags.reduce((a,t)=>a+(t.used?t.used:0),0);return p;}function updatePower(){document.getElementById('totalPower').textContent=calcPower();}document.getElementById('rollBtn').addEventListener('click',()=>{const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6),power=calcPower(),total=d1+d2+power;const out=total>=10?'FULL SUCCESS':(total>=7?'PARTIAL SUCCESS':'MISS');document.getElementById('rollOut').innerHTML=`🎲 ${d1} + ${d2} + ${power} = <strong>${total}</strong> — ${out}`;storyTags.forEach(t=>{ if(!t.ongoing) t.used=0;});renderStoryList();updatePower();});onValue(ref(db,'mcBroadcast'),snap=>{const data=snap.val()||{};document.getElementById('sceneFromMC').innerHTML=data.sceneImage?`<img src='${data.sceneImage}' alt='Scene'>`:'Waiting for MC scene…';document.getElementById('musicFromMC').textContent=data.music?`♪ ${data.music.split('/').pop()}`:'♪ No music playing';if(data.characterImage){document.getElementById('portraitImg').src=data.characterImage;}});loadLuxy();

/* ===== Player App Additions: Global + Per-Theme Trackers, Core Moves, Image fix ===== */
(function(){
  const RAW_BASE = "https://raw.githubusercontent.com/benwieler-commits/queerz-player-app/main/";
  function toRaw(url){
    if(!url) return url;
    if(url.startsWith("http")) return url;
    return RAW_BASE + url.replace(/^\/+/,''); // convert relative to RAW
  }

  // --- Character portrait fix (force RAW + fallback) ---
  function fixPortraits(){
    const img = document.querySelector('#characterPortrait, img[alt*="Character portrait" i], .character-portrait img');
    if(!img) return;
    const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
    img.src = toRaw(src);
    img.onerror = ()=>{
      img.onerror = null;
      img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23141b1f"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2393E9BE" font-family="Segoe UI, Tahoma, Geneva, Verdana, sans-serif" font-size="20">Portrait unavailable</text></svg>';
    };
  }

  // --- LocalStorage helpers ---
  const store = {
    get(k, v){ try { return JSON.parse(localStorage.getItem(k)) ?? v; } catch(e){ return v; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  };

  // --- Inject Global Juice/Overdrive bar (non-destructive) ---
  function injectGlobalTrackers(){
    if(document.querySelector('.tracker-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'tracker-bar';
    bar.innerHTML = trackerHTML('Juice') + trackerHTML('Overdrive');
    const header = document.querySelector('#appHeader, header, .top-bar');
    const host = header || document.body.firstElementChild;
    host.parentNode.insertBefore(bar, host.nextSibling);
    attachTracker(bar, 'Juice');
    attachTracker(bar, 'Overdrive');
  }
  function trackerHTML(name){
    const val = store.get('global:'+name, 0);
    return `<div class="tracker" data-name="${name}"><span class="meter-label">${name}:</span><button data-delta="1">+</button><strong class="val">${val}</strong><button data-delta="-1">-</button></div>`;
  }
  function attachTracker(root, name){
    const el = root.querySelector(`.tracker[data-name="${name}"]`);
    el.addEventListener('click', (e)=>{
      const b = e.target.closest('button'); if(!b) return;
      const vEl = el.querySelector('.val');
      let v = Number(vEl.textContent)||0;
      v += Number(b.dataset.delta);
      if(v<0) v=0;
      vEl.textContent = v;
      store.set('global:'+name, v);
    });
  }

  // --- Per-theme meters (Shade, Growth, Improvement, Weakness burn) ---
  function enhanceThemeCards(){
    const cards = document.querySelectorAll('.theme-card');
    cards.forEach((card,i)=>{
      if(card.dataset.enhanced) return;
      card.dataset.enhanced = '1';

      const meters = document.createElement('div');
      meters.className = 'theme-meters';

      ['Shade','Growth'].forEach(kind=>{
        const key = `theme:${i}:${kind}`;
        const val = store.get(key, 0);
        const m = document.createElement('div');
        m.className = 'theme-meter';
        m.innerHTML = `<span class="meter-label">${kind}:</span><button data-k="${key}" data-d="1">+</button><strong class="val" data-k="${key}">${val}</strong><button data-k="${key}" data-d="-1">-</button>`;
        meters.appendChild(m);
      });

      const impKey = `theme:${i}:improve`;
      const imp = document.createElement('label');
      imp.style.marginLeft = 'auto';
      const was = store.get(impKey,false) ? 'checked' : '';
      imp.innerHTML = `<input type="checkbox" ${was}> <span class="meter-label">Improvement Achieved</span>`;
      imp.querySelector('input').addEventListener('change', (e)=> store.set(impKey, e.target.checked));
      meters.appendChild(imp);

      card.appendChild(meters);

      meters.addEventListener('click',(e)=>{
        const btn = e.target.closest('button'); if(!btn) return;
        const k = btn.dataset.k, d = Number(btn.dataset.d);
        const valEl = meters.querySelector(`.val[data-k="${k}"]`);
        let v = Number(valEl.textContent)||0;
        v += d; if(v<0) v=0;
        valEl.textContent = v;
        store.set(k, v);
      });

      card.addEventListener('click', (e)=>{
        const tagBtn = e.target.closest('.tag-btn, button[data-burn]');
        if(!tagBtn) return;
        const pill = tagBtn.closest('.tag');
        if(!pill) return;
        pill.classList.toggle('burned');
      });
    });
  }

  // --- Core Moves & Combos ---
  const combos = {
    Slay: {
      tags: [
        "Watch Me Shine Anyway",
        "Hot and Crunchy",
        "Heels-first Entrance",
        "Sugar Rush Combo"
      ],
      power: 4,
      need: 2
    },
    Care: {
      tags: [
        "I Shield Who I Love",
        "My Drag Babies Come First",
        "I've Survived Worse Than You"
      ],
      power: 3,
      need: 2
    },
    "Strike A Pose": {
      tags: [
        "You Don't Get to Dull My Sparkle",
        "Watch Me Shine Anyway",
        "Legendary Name Recognition"
      ],
      power: 4,
      need: 2
    }
  };
  const coreMoves = ['Be Vulnerable','Care','Get A Clue','Resist','Slay','Strike A Pose','Talk it Out'];

  function renderCoreMoves(){
    if(document.querySelector('.core-moves')) return;
    const host = document.querySelector('#coreMovesHost') || document.body;
    const wrap = document.createElement('section');
    wrap.className = 'core-moves';
    coreMoves.forEach(mv=>{
      const c = document.createElement('div');
      c.className = 'core-move';
      const combo = combos[mv];
      const comboHtml = combo ? `<div><small>Combo Tags:</small><div>${combo.tags.map(t=>`<span class='tag'>${t}</span>`).join(' ')}</div><div><small>Power:</small> <span class='power'>${combo.power} when ≥ ${combo.need} used</span></div></div>` : `<div><small>No preset combo. Select relevant tags.</small></div>`;
      c.innerHTML = `<h4>${mv}</h4>${comboHtml}<button class='roll-btn'>🎲 Roll 2d6 + Power</button><div class='roll-out'></div>`;
      c.addEventListener('click', (e)=>{
        const b = e.target.closest('.roll-btn'); if(!b) return;
        const base = combo ? combo.power : 0;
        const r = (1+Math.floor(Math.random()*6))+(1+Math.floor(Math.random()*6))+base;
        c.querySelector('.roll-out').textContent = `Result: ${r} (including +${base} Power)`;
      });
      wrap.appendChild(c);
    });
    host.appendChild(wrap);
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', ()=>{
    fixPortraits();
    injectGlobalTrackers();
    enhanceThemeCards();
    renderCoreMoves();
  });
})();
