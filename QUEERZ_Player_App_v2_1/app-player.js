
let gameState = {storyTags:[], burntTags:[], selectedTags:[], character:{themes:[]}};
document.addEventListener('DOMContentLoaded', ()=>{ renderAvailableTags(); bind(); });
function bind(){
  document.getElementById('addStoryTag').addEventListener('click', ()=>{
    const name = document.getElementById('storyTagName').value.trim();
    const ongoing = document.getElementById('storyTagOngoing').checked;
    if (!name) return;
    gameState.storyTags.push({name, ongoing});
    document.getElementById('storyTagName').value=''; document.getElementById('storyTagOngoing').checked=false;
    renderAvailableTags(); renderStoryTags();
  });
  document.getElementById('recoverBurntTags').addEventListener('click', ()=>{
    gameState.burntTags = []; renderAvailableTags(); renderBurnt();
  });
  document.getElementById('rollButton').addEventListener('click', roll);
}
function renderStoryTags(){
  const c = document.getElementById('storyTagList'); c.innerHTML='';
  gameState.storyTags.forEach((t,i)=>{
    const d=document.createElement('div'); d.className='tag-item'; d.innerHTML=`<div class="tag-info"><span class="tag-name">${t.name}</span> <span class="tag-type">${t.ongoing?'(Ongoing)':'(Temp)'}</span></div><button class="remove-btn">Remove</button>`;
    d.querySelector('.remove-btn').addEventListener('click', ()=>{ gameState.storyTags.splice(i,1); renderStoryTags(); renderAvailableTags(); });
    c.appendChild(d);
  });
}
function renderBurnt(){
  const c = document.getElementById('burntTagsList'); c.innerHTML='';
  gameState.burntTags.forEach(n=>{ const d=document.createElement('div'); d.className='burnt-tag-item'; d.textContent=n; c.appendChild(d); });
}
function renderAvailableTags(){
  const c = document.getElementById('availableTags'); c.innerHTML='';
  const all = [];
  gameState.character.themes.forEach(t=>{
    (t.powerTags||[]).forEach(n=>all.push({name:n,type:'power'}));
    (t.weaknessTags||[]).forEach(n=>all.push({name:n,type:'weakness'}));
  });
  gameState.storyTags.forEach(t=>all.push({name:t.name,type:'story'}));
  all.forEach(tag=>{
    const btn=document.createElement('button'); btn.className='selectable-tag'; btn.dataset.name=tag.name; btn.textContent=tag.name;
    const burnt = gameState.burntTags.includes(tag.name); if (burnt) btn.classList.add('burnt');
    const burn=document.createElement('span'); burn.className='burn-icon'; burn.textContent='🔥'; if (!burnt) btn.appendChild(burn);
    burn.addEventListener('click', e=>{ e.stopPropagation(); burnTag(tag.name); });
    btn.addEventListener('click', ()=>{
      if (btn.classList.contains('burnt')) return;
      const i = gameState.selectedTags.indexOf(tag.name);
      if (i>=0){ gameState.selectedTags.splice(i,1); btn.classList.remove('selected'); }
      else { gameState.selectedTags.push(tag.name); btn.classList.add('selected'); }
      updatePower();
    });
    c.appendChild(btn);
  });
  updatePower(); renderBurnt(); renderStoryTags();
}
function burnTag(name){
  if (!confirm(`Burn "${name}" for a guaranteed hit?`)) return;
  if (!gameState.burntTags.includes(name)) gameState.burntTags.push(name);
  gameState.selectedTags = gameState.selectedTags.filter(x=>x!==name);
  renderAvailableTags();
  alert('Tag burnt. Auto-success at MC discretion.');
}
function updatePower(){
  let p=0;
  gameState.selectedTags.forEach(n=>{
    let weak=false;
    gameState.character.themes.forEach(t=>{ if ((t.weaknessTags||[]).includes(n)) weak=true; });
    p += weak? -1 : 1;
  });
  p += gameState.storyTags.length;
  document.getElementById('currentPower').textContent=p;
  return p;
}
function roll(){
  const mv = document.getElementById('moveSelect').value; if (!mv){ alert('Select a move first'); return; }
  const p = updatePower(); const d1=1+Math.floor(Math.random()*6); const d2=1+Math.floor(Math.random()*6); const tot=d1+d2+p;
  const r = document.getElementById('rollResult'); r.classList.remove('hidden','success','partial','miss');
  let cls='', txt=''; if (tot>=10){cls='success';txt='FULL SUCCESS';} else if (tot>=7){cls='partial';txt='PARTIAL SUCCESS';} else {cls='miss';txt='MISS';}
  r.classList.add(cls); r.innerHTML = `🎲 ${d1} + ${d2} + Power(${p}) = <strong>${tot}</strong><br>${txt}`;
  // consume non-ongoing story tags
  gameState.storyTags = gameState.storyTags.filter(t=>t.ongoing);
  renderStoryTags(); renderAvailableTags();
}
