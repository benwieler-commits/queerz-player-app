import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';import { getDatabase, ref, onValue, goOnline } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';import { firebaseConfig } from './firebase-config.js';const app=initializeApp(firebaseConfig);const db=getDatabase(app);try{goOnline(db);const b=document.getElementById('syncBadge');b.textContent='● Live Sync';b.classList.replace('offline','online');}catch(e){}let character=null,themeMeta=null,portraitMode='street',selectedTags=new Set(),burntTags=new Set(),storyTags=[];async function loadLuxy(){const [c,t]=await Promise.all([fetch('characters/luxy-charms.json').then(r=>r.json()),fetch('themes/luxy-charms.json').then(r=>r.json())]);character=c;themeMeta=t;document.documentElement.style.setProperty('--accent',c.colorHex||t.colorHex||'#93E9BE');buildCharacterSelect();renderFolio();setPortrait('street');}function buildCharacterSelect(){const s=document.getElementById('characterSelect');s.innerHTML='<option value="luxy-charms" selected>Luxy Charms</option>';s.addEventListener('change',()=>{});}function setPortrait(m){portraitMode=m;const img=document.getElementById('portraitImg');img.src=m==='street'?themeMeta.portraits.street:themeMeta.portraits.qfactor;document.getElementById('portraitToggle').textContent=m==='street'?'Switch to Q-Factor':'Switch to Streetwear';}document.getElementById('portraitToggle').addEventListener('click',()=>setPortrait(portraitMode==='street'?'qfactor':'street'));function renderFolio(){(character.themes||[]).forEach((th,i)=>{const el=document.querySelector(`.theme-card[data-theme-index="${i}"]`);if(!el) return;const tags=(th.powerTags||[]).map(tag=>`<span class='pill' data-tag='${tag}'>${tag} <button class='tag-btn' data-burn='${tag}'>🔥</button></span>`).join('');el.innerHTML=`<h4>${th.name}</h4><div><em>${th.type==='rainbow'?'Runway':'Identity'}:</em> ${th.runway||th.identity||''}</div><div style='margin:.3rem 0;'><strong>Weakness:</strong> ${th.weaknessTag||''}</div><div class='tags'>${tags}</div><div style='margin-top:.4rem;font-size:.9em;opacity:.8;'><strong>Theme Improvement:</strong> ${th.themeImprovement||''}</div>`;});document.querySelectorAll('[data-burn]').forEach(btn=>btn.addEventListener('click',e=>{const tag=e.currentTarget.dataset.burn;burntTags.add(tag);selectedTags.delete(tag);const pill=e.currentTarget.closest('.pill');if(pill) pill.classList.add('burnt');renderBurntList();updatePower();alert(`"${tag}" burnt!`);}));document.querySelectorAll('.pill').forEach(p=>p.addEventListener('click',()=>{const tag=p.dataset.tag;if(burntTags.has(tag)) return;if(selectedTags.has(tag)) selectedTags.delete(tag); else selectedTags.add(tag);p.classList.toggle('active');updatePower();}));updatePower();}function renderBurntList(){const b=document.getElementById('burntList');b.innerHTML=Array.from(burntTags).map(t=>`<span class='pill burnt'>${t}</span>`).join('')||'<em>No burnt tags</em>'; }document.getElementById('recoverBtn').addEventListener('click',()=>{burntTags.clear();document.querySelectorAll('.pill.burnt').forEach(p=>p.classList.remove('burnt'));renderBurntList();});document.getElementById('storyAdd').addEventListener('click',()=>{const name=document.getElementById('storyName').value.trim();const ongoing=document.getElementById('storyOngoing').checked;if(!name) return;storyTags.push({name,ongoing});document.getElementById('storyName').value='';document.getElementById('storyOngoing').checked=false;renderStoryList();updatePower();});function renderStoryList(){const box=document.getElementById('storyList');box.innerHTML=storyTags.map((t,i)=>`<span class='pill' data-story='${i}'>${t.name} ${t.ongoing?'(ongoing)':''} <button data-use-story='${i}' class='tag-btn'>+1</button> <button data-remove-story='${i}' class='tag-btn'>✕</button></span>`).join('');box.querySelectorAll('[data-use-story]').forEach(b=>b.addEventListener('click',e=>{const i=+e.currentTarget.dataset.useStory;storyTags[i].used=(storyTags[i].used||0)+1;if(!storyTags[i].ongoing){storyTags.splice(i,1);}renderStoryList();updatePower();}));box.querySelectorAll('[data-remove-story]').forEach(b=>b.addEventListener('click',e=>{const i=+e.currentTarget.dataset.removeStory;storyTags.splice(i,1);renderStoryList();updatePower();}));}function calcPower(){let p=selectedTags.size;p+=storyTags.reduce((a,t)=>a+(t.used?t.used:0),0);return p;}function updatePower(){document.getElementById('totalPower').textContent=calcPower();}document.getElementById('rollBtn').addEventListener('click',()=>{const d1=1+Math.floor(Math.random()*6),d2=1+Math.floor(Math.random()*6),power=calcPower(),total=d1+d2+power;const out=total>=10?'FULL SUCCESS':(total>=7?'PARTIAL SUCCESS':'MISS');document.getElementById('rollOut').innerHTML=`🎲 ${d1} + ${d2} + ${power} = <strong>${total}</strong> — ${out}`;storyTags.forEach(t=>{ if(!t.ongoing) t.used=0;});renderStoryList();updatePower();});onValue(ref(db,'mcBroadcast'),snap=>{const data=snap.val()||{};document.getElementById('sceneFromMC').innerHTML=data.sceneImage?`<img src='${data.sceneImage}' alt='Scene'>`:'Waiting for MC scene…';document.getElementById('musicFromMC').textContent=data.music?`♪ ${data.music.split('/').pop()}`:'♪ No music playing';if(data.characterImage){document.getElementById('portraitImg').src=data.characterImage;}});loadLuxy();

/* --- BUILT: QUEERZ Player Full Fix --- */
(function(){
  const CHAR_JSON = "characters/luxy-charms.json";

  const store = {
    get(k, v) { try { return JSON.parse(localStorage.getItem(k)) ?? v; } catch(e) { return v; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  function ensureRollOutput(btn) {
    let out = btn.parentElement && btn.parentElement.querySelector(".roll-out");
    if (!out) { out = document.createElement("div"); out.className = "roll-out"; btn.parentElement.appendChild(out); }
    return out;
  }

  function injectGlobalTrackers(){
    if (document.querySelector(".tracker-bar")) return;
    const bar = document.createElement("div");
    bar.className = "tracker-bar";
    bar.innerHTML = trackerHTML("Juice") + trackerHTML("Overdrive");
    const header = document.querySelector("#appHeader, header, .top-bar");
    const host = header || document.body.firstElementChild;
    if (host && host.parentNode) host.parentNode.insertBefore(bar, host.nextSibling);
    attachTracker(bar, "Juice"); attachTracker(bar, "Overdrive");
  }
  function trackerHTML(name){
    const val = store.get("global:"+name, 0);
    return `<div class="tracker" data-name="${name}"><span class="meter-label">${name}:</span><button data-delta="1">+</button><strong class="val">${val}</strong><button data-delta="-1">-</button></div>`;
  }
  function attachTracker(root, name){
    const el = root.querySelector(`.tracker[data-name="${name}"]`);
    if (!el) return;
    el.addEventListener("click", (e)=>{
      const b = e.target.closest("button"); if(!b) return;
      const vEl = el.querySelector(".val");
      let v = Number(vEl.textContent)||0;
      v += Number(b.dataset.delta); if(v<0) v=0;
      vEl.textContent = v; store.set("global:"+name, v);
    });
  }

  function enhanceThemeCards(){
    const cards = document.querySelectorAll(".theme-card");
    cards.forEach((card,i)=>{
      if (card.dataset.enhanced) return;
      card.dataset.enhanced = "1";

      const meters = document.createElement("div");
      meters.className = "theme-meters";

      ["Shade","Growth"].forEach(kind=>{
        const key = `theme:${i}:${kind}`;
        const val = store.get(key, 0);
        const m = document.createElement("div");
        m.className = "theme-meter";
        m.innerHTML = `<span class="meter-label">${kind}:</span><button data-k="${key}" data-d="1">+</button><strong class="val" data-k="${key}">${val}</strong><button data-k="${key}" data-d="-1">-</button>`;
        meters.appendChild(m);
      });

      const impKey = `theme:${i}:improve`;
      const imp = document.createElement("label");
      imp.style.marginLeft = "auto";
      const was = store.get(impKey,false) ? "checked" : "";
      imp.innerHTML = `<input type="checkbox" ${was}> <span class="meter-label">Improvement Achieved</span>`;
      imp.querySelector("input").addEventListener("change", (e)=> store.set(impKey, e.target.checked));
      meters.appendChild(imp);

      card.appendChild(meters);

      meters.addEventListener("click",(e)=>{
        const btn = e.target.closest("button"); if(!btn) return;
        const k = btn.dataset.k, d = Number(btn.dataset.d);
        const valEl = meters.querySelector(`.val[data-k="${k}"]`);
        let v = Number(valEl.textContent)||0;
        v += d; if(v<0) v=0;
        valEl.textContent = v; store.set(k, v);
      });
    });
  }

  const tagRegistry = window.tagRegistry || (window.tagRegistry = {});
  function syncBurnStates(){
    for (const [name,burned] of Object.entries(tagRegistry)) {
      document.querySelectorAll(`[data-tag-name="${name}"]`).forEach(el=>{
        el.classList.toggle("burned", !!burned);
      });
    }
  }
  document.addEventListener("click",(e)=>{
    const pill = e.target.closest("[data-tag-name]");
    if(!pill) return;
    const name = pill.getAttribute("data-tag-name");
    const newState = !pill.classList.contains("burned");
    tagRegistry[name] = newState;
    syncBurnStates();
  });

  function wireMainRoll(){
    const btns = Array.from(document.querySelectorAll("button, .btn")).filter(b=>/Roll 2d6 \+ Power/i.test(b.textContent||""));
    btns.forEach(btn=>{
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      const out = ensureRollOutput(btn);
      btn.addEventListener("click", ()=>{
        const plus = document.querySelectorAll(".tag.power:not(.burned)").length;
        const minus = document.querySelectorAll(".tag.weakness.burned").length;
        const storyPlus = document.querySelectorAll(".story-tags .tag.positive:not(.burned)").length;
        const storyMinus = document.querySelectorAll(".story-tags .tag.negative.burned").length;
        const power = Math.max(0, plus + storyPlus - minus - storyMinus);

        const d1 = 1+Math.floor(Math.random()*6);
        const d2 = 1+Math.floor(Math.random()*6);
        const total = d1 + d2 + power;
        const tier = total >= 10 ? "SUCCESS" : total >= 7 ? "PARTIAL SUCCESS" : "MISS";
        out.textContent = `🎲 ${d1} + ${d2} + ${power} = ${total} — ${tier}`;
      });
    });
  }

  async function loadCharacter(){
    try {
      const res = await fetch(CHAR_JSON);
      const data = await res.json();

      // Portraits
      const portraitImg = document.getElementById("portraitImg");
      const toggleBtn  = document.getElementById("portraitToggle");
      if (portraitImg && data.portraits) {
        const street = data.portraits.street || "";
        const qfactor = data.portraits.qfactor || "";
        portraitImg.setAttribute("data-state","street");
        portraitImg.src = street;
        portraitImg.onerror = () => {
          portraitImg.onerror = null;
          portraitImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23141b1f"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2393E9BE" font-family="Segoe UI, Tahoma, Geneva, Verdana, sans-serif" font-size="20">Portrait unavailable</text></svg>';
        };
        if (toggleBtn && !toggleBtn.dataset.wired) {
          toggleBtn.dataset.wired = "1";
          toggleBtn.addEventListener("click", ()=>{
            const cur = portraitImg.getAttribute("data-state") || "street";
            const next = cur === "street" ? "qfactor" : "street";
            portraitImg.setAttribute("data-state", next);
            portraitImg.src = next === "street" ? street : qfactor;
          });
        }
      }

      // Tags
      const tagHost = document.querySelector("#coreMovesHost, .core-moves, .sheet, body");
      if (tagHost) {
        const wrapId = "jsonTagWrap";
        if (!document.getElementById(wrapId)) {
          const wrap = document.createElement("div");
          wrap.id = wrapId;
          const pTags = Array.isArray(data.powerTags) ? data.powerTags : [];
          const wTag  = data.weaknessTag ? [data.weaknessTag] : [];
          const pHtml = pTags.map(t => `<span class="tag power" data-tag-name="${t}">${t}</span>`).join(" ");
          const wHtml = wTag.map(t => `<span class="tag weakness" data-tag-name="${t}">${t}</span>`).join(" ");
          wrap.innerHTML = `<div class="story-tags"><small>Power:</small> ${pHtml} &nbsp;&nbsp; <small>Weakness:</small> ${wHtml}</div>`;
          tagHost.appendChild(wrap);
        }
      }

      afterSheetRendered(()=>{ enhanceThemeCards(); wireMainRoll(); });
    } catch(err) {
      console.warn("Character load failed:", err);
      afterSheetRendered(()=>{ enhanceThemeCards(); wireMainRoll(); });
    }
  }

  function afterSheetRendered(callback){
    if (document.querySelector(".theme-card")) return callback();
    const obs = new MutationObserver(()=>{
      if (document.querySelector(".theme-card")) { obs.disconnect(); callback(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    injectGlobalTrackers();
    wireMainRoll();
    loadCharacter();
  });
})();
