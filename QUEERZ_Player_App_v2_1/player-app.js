const els = {
  select: document.getElementById('characterSelect'),
  btnLoadLocal: document.getElementById('btnLoadLocal'),
  fileLocal: document.getElementById('fileLocal'),
  portrait: document.getElementById('portrait'),
  charName: document.getElementById('charName'),
  charPronouns: document.getElementById('charPronouns'),
  charColor: document.getElementById('charColor'),
  runway: document.getElementById('runway'),
  balance: document.getElementById('balance'),
  themes: document.getElementById('themes'),
  comboList: document.getElementById('comboList'),
  juiceVal: document.getElementById('juiceVal'),
  overdrivePips: document.getElementById('overdrivePips'),
};
let current = { data:null, trackers:{juice:0,overdrive:0} };
let styleLinkEl = null;

async function loadManifest(){
  try{
    const res = await fetch('characters/manifest.json', {cache:'no-store'});
    if (!res.ok) throw new Error('No manifest');
    const manifest = await res.json();
    (manifest.files||[]).forEach(f=>{
      const opt = document.createElement('option');
      opt.value = f.path;
      opt.textContent = f.label || f.path.replace(/^.*\//,'');
      els.select.appendChild(opt);
    });
  }catch(e){
    console.warn('No manifest.json found; you can still load a local JSON.', e);
  }
}

function rememberSelection(path){ localStorage.setItem('qz_selected_character', path || ''); }
function getRemembered(){ return localStorage.getItem('qz_selected_character') || ''; }

async function loadCharacterFromPath(path){
  const res = await fetch(path + '?t=' + Date.now());
  const json = await res.json();
  await applyCharacter(json);
  rememberSelection(path);
}

async function applyCharacter(json){
  current.data = json;
  await applyStyle(json);
  if (json.color){ document.documentElement.style.setProperty('--accent', json.color); }

  els.charName.textContent = json.name || '—';
  els.charPronouns.textContent = json.pronouns ? `• ${json.pronouns}` : '';
  els.charColor.textContent = json.color ? `• ${json.color}` : '';
  els.runway.textContent = json.runway || '';
  if (json.balance) els.balance.textContent = `${json.balance.rainbow||0} Rainbow | ${json.balance.realness||0} Realness`;

  const p = json.portraits || {};
  const src = p.streetwear || p.qfactor || '';
  if (src){ els.portrait.src = src; els.portrait.style.display='block'; } else { els.portrait.style.display='none'; }

  const t = json.trackers || {};
  current.trackers.juice = Number.isFinite(t.juice) ? t.juice : 0;
  current.trackers.overdrive = Number.isFinite(t.overdrive) ? t.overdrive : 0;
  renderTrackers();

  renderThemes(json.themes || []);
  renderCombos(json.tagCombos || []);
}

async function applyStyle(json){
  const href = json.styleSheet || null;
  if (styleLinkEl && styleLinkEl.parentNode){ styleLinkEl.parentNode.removeChild(styleLinkEl); styleLinkEl = null; }
  if (href){
    styleLinkEl = document.createElement('link');
    styleLinkEl.rel = 'stylesheet';
    styleLinkEl.href = href + '?t=' + Date.now();
    document.head.appendChild(styleLinkEl);
    await new Promise(r => styleLinkEl.onload = r);
  }
}

function renderTrackers(){
  els.juiceVal.textContent = current.trackers.juice;
  [...els.overdrivePips.querySelectorAll('.pip')].forEach((pip, i)=>{
    pip.classList.toggle('on', i < current.trackers.overdrive);
  });
}

function addTagList(containerLabel, list){
  const block = document.createElement('div');
  block.className = 'block';
  block.innerHTML = `<div class="label">${containerLabel}</div>`;
  const ul = document.createElement('ul');
  (list||[]).forEach(t=>{
    const li = document.createElement('li');
    li.innerHTML = `<span class="tag">${escapeHtml(t)}</span>`;
    ul.appendChild(li);
  });
  block.appendChild(ul);
  return block;
}

function renderThemes(themes){
  els.themes.innerHTML = '';
  themes.forEach(th => {
    const wrap = document.createElement('div');
    wrap.className = 'theme card';

    const head = document.createElement('div');
    head.className = 'head';
    head.innerHTML = `<div><strong>${escapeHtml(th.name||'')}</strong></div><span class="chip">${escapeHtml(th.category||th.type||'')}</span>`;
    wrap.appendChild(head);

    wrap.appendChild(addTagList('Power Tags', th.powerTags));
    wrap.appendChild(addTagList('Weakness Tags', th.weaknessTags));
    wrap.appendChild(addTagList('New Power Tag Options', th.newPowerTagOptions));

    if (th.themeImprovement){
      const imp = document.createElement('div');
      imp.className = 'improvement';
      imp.innerHTML = `<span class="checkbox" role="checkbox" aria-checked="false" tabindex="0"></span><div>${escapeHtml(th.themeImprovement)}</div>`;
      wrap.appendChild(imp);
    }

    if (th.assignedMoves && th.assignedMoves.length){
      const tblLabel = document.createElement('div');
      tblLabel.className = 'label';
      tblLabel.textContent = 'Assigned Moves';
      wrap.appendChild(tblLabel);

      th.assignedMoves.forEach(row=>{
        const r = document.createElement('div');
        r.className = 'move-row';
        const tags = (row.recommendedTags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
        r.innerHTML = `<div class="move-name">${escapeHtml(row.move||'')}</div><div class="tags">${tags}</div><div class="power-chip">POWER ${row.powerHint||1}</div>`;
        wrap.appendChild(r);
      });
    }

    const tracks = document.createElement('div');
    tracks.className = 'block';
    const growth = (th.growth||[]).map(on => `<span class="pip ${on?'on':''}"></span>`).join('');
    const shade  = (th.shade ||[]).map(on => `<span class="pip ${on?'on':''}"></span>`).join('');
    const crack  = (th.crack ||[]).map(on => `<span class="pip ${on?'on':''}"></span>`).join('');
    tracks.innerHTML = `<div class="label">Progress</div>
      <div>Growth: <span class="pips">${growth||'<span class=\"muted\">—</span>'}</span></div>
      <div>${th.type==='realness'?'Crack':'Shade'}: <span class="pips">${(th.type==='realness'?crack:shade)||'<span class=\"muted\">—</span>'}</span></div>`;
    wrap.appendChild(tracks);

    els.themes.appendChild(wrap);
  });
}

function renderCombos(combos){
  els.comboList.innerHTML='';
  combos.forEach(c=>{
    const row = document.createElement('div');
    row.className = 'combo';
    const tags = (c.tags||[]).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
    row.innerHTML = `<div class="left"><strong>${escapeHtml(c.name||'')}</strong> • <span class="muted">${escapeHtml(c.move||'')}</span></div>
                     <div class="tags">${tags}</div>
                     <div class="power-chip">POWER ${c.powerHint||1}</div>`;
    els.comboList.appendChild(row);
  });
}

function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

document.addEventListener('click', (e)=>{
  const b = e.target.closest('button[data-counter]');
  if (!b) return;
  const key = b.getAttribute('data-counter');
  const delta = parseInt(b.getAttribute('data-delta'),10);
  if (key==='juice'){ current.trackers.juice = Math.max(0, current.trackers.juice + delta); }
  if (key==='overdrive'){ current.trackers.overdrive = Math.max(0, Math.min(3, (current.trackers.overdrive + delta))); }
  renderTrackers();
});

els.select.addEventListener('change', (e)=>{
  const path = e.target.value;
  if (!path) return;
  loadCharacterFromPath(path);
});

els.btnLoadLocal.addEventListener('click', ()=> els.fileLocal.click());
els.fileLocal.addEventListener('change', (e)=>{
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = async ()=>{
    try{
      const json = JSON.parse(r.result);
      await applyCharacter(json);
      rememberSelection('');
    }catch(err){ alert('Invalid JSON file.'); }
  };
  r.readAsText(f);
});

loadManifest().then(()=>{
  const remembered = getRemembered();
  if (remembered){
    const opt = [...els.select.options].find(o=>o.value===remembered);
    if (opt){ els.select.value = remembered; loadCharacterFromPath(remembered); }
  }
});
