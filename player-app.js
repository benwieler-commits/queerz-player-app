/* --- BUILT: QUEERZ Player Theme Fix --- */
(function() {
  const CHAR_JSON = "characters/luxy-charms.json";

  const store = {
    get(k, v) { try { return JSON.parse(localStorage.getItem(k)) ?? v; } catch(e) { return v; } },
    set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };

  // Inject global trackers
  function injectGlobalTrackers() {
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
    return `<div class="tracker" data-name="${name}">
      <span class="meter-label">${name}:</span>
      <button data-delta="1">+</button>
      <strong class="val">${val}</strong>
      <button data-delta="-1">-</button>
    </div>`;
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

  // Burn registry
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

  // Dice roller
  function wireMainRoll(){
    const btns = Array.from(document.querySelectorAll("button, .btn")).filter(b=>/Roll 2d6 \+ Power/i.test(b.textContent||""));
    btns.forEach(btn=>{
      if (btn.dataset.wired) return;
      btn.dataset.wired = "1";
      let out = btn.parentElement.querySelector(".roll-out");
      if (!out) { out = document.createElement("div"); out.className = "roll-out"; btn.parentElement.appendChild(out); }

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

  // Enhance per-theme cards with Shade/Growth meters
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
        m.innerHTML = `<span class="meter-label">${kind}:</span>
          <button data-k="${key}" data-d="1">+</button>
          <strong class="val" data-k="${key}">${val}</strong>
          <button data-k="${key}" data-d="-1">-</button>`;
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

  // Render themes with tags
  function renderThemeCard(theme, i) {
    const card = document.querySelector(`.theme-card[data-theme-index="${i}"]`);
    if (!card || !theme) {
      console.warn(`⚠️ Missing data for theme index ${i}`);
      return;
    }

    const header = `<h3>${theme.themeName || "Untitled"} (${theme.themeType || "Theme"})</h3>`;
    const identity = `<p><em>${theme.identity || ""}</em></p>`;
    const weakness = `<p><strong>Weakness:</strong> ${theme.weakness || ""}</p>`;
    const improvement = `<p><strong>Theme Improvement:</strong> ${theme.themeImprovement || ""}</p>`;

    const tagContainer = document.createElement("div");
    tagContainer.className = "tag-container";
    (theme.tags || []).forEach(tag=>{
      const span = document.createElement("span");
      span.className = "tag power";
      span.setAttribute("data-tag-name", tag);
      span.textContent = tag;
      tagContainer.appendChild(span);
    });

    card.innerHTML = header + identity + weakness + improvement;
    card.appendChild(tagContainer);
  }

  async function loadCharacter(){
    try {
      const res = await fetch(CHAR_JSON);
      const data = await res.json();
      console.log(`✅ Loaded Character: ${data.name}`);
      if (data.themes) {
        const names = data.themes.map(t => t.themeName).join(", ");
        console.log(`✅ Loaded Themes: ${names}`);
      }

      // Portraits
      const portraitImg = document.getElementById("portraitImg");
      const toggleBtn  = document.getElementById("portraitToggle");
      if (portraitImg && data.portraits) {
        const street = data.portraits.street || "";
        const qfactor = data.portraits.qfactor || "";
        portraitImg.setAttribute("data-state","street");
        portraitImg.src = street;
        portraitImg.onerror = ()=>{
          portraitImg.src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="%23141b1f"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2393E9BE" font-family="Segoe UI" font-size="20">Portrait unavailable</text></svg>';
        };
        if (toggleBtn && !toggleBtn.dataset.wired) {
          toggleBtn.dataset.wired="1";
          toggleBtn.addEventListener("click", ()=>{
            const cur = portraitImg.getAttribute("data-state") || "street";
            const next = cur==="street" ? "qfactor" : "street";
            portraitImg.setAttribute("data-state", next);
            portraitImg.src = next==="street" ? street : qfactor;
          });
        }
      }

      // Render each theme card
      (data.themes || []).forEach((theme,i)=> renderThemeCard(theme,i));

      afterSheetRendered(()=>{ enhanceThemeCards(); wireMainRoll(); });

    } catch(err) {
      console.warn("❌ Character load failed:", err);
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
