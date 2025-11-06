
// player-overrides.js
(function(){
  function safe(fn){try{return fn();}catch(e){console.warn(e);}}
  window.burnTag = function(tagName){
    if(!window.gameState) return;
    if(gameState.burntTags.includes(tagName)) return;
    if(!confirm(`Burn "${tagName}" for a guaranteed hit?`)) return;
    gameState.burntTags.push(tagName);
    gameState.selectedTags = gameState.selectedTags.filter(t=>t!==tagName);
    safe(()=>localStorage.setItem('queerz_player_state', JSON.stringify(gameState)));
    safe(renderAvailableTags); safe(updateTracking);
    alert(`"${tagName}" burnt! 🔥`);
  };
  window.renderAvailableTags = function(){
    const c = document.getElementById('availableTags'); if(!c||!window.gameState) return;
    c.innerHTML='';
    const all=[];
    gameState.character.themes.forEach(th=>{
      th.powerTags.forEach(t=>all.push({name:t,type:'power'}));
      th.weaknessTags.forEach(t=>all.push({name:t,type:'weakness'}));
    });
    gameState.storyTags.forEach(st=>all.push({name:st.name,type:'story',ongoing:st.ongoing}));
    all.forEach(tag=>{
      const isBurnt = gameState.burntTags.includes(tag.name);
      const btn = document.createElement('button');
      btn.className = 'selectable-tag';
      if(isBurnt) btn.classList.add('burnt');
      if(gameState.selectedTags.includes(tag.name)) btn.classList.add('selected');
      btn.innerHTML = `<span class="tag-name-text">${tag.name}</span>${(!isBurnt && tag.type!=='story')?'<span class="burn-icon" title="Burn tag">🔥</span>':''}`;
      btn.addEventListener('click', e=>{
        if(isBurnt) return;
        const name = tag.name;
        if(gameState.selectedTags.includes(name)){
          gameState.selectedTags = gameState.selectedTags.filter(t=>t!==name);
          btn.classList.remove('selected');
        } else {
          gameState.selectedTags.push(name);
          btn.classList.add('selected');
        }
        safe(()=>localStorage.setItem('queerz_player_state', JSON.stringify(gameState)));
        safe(updatePowerDisplay);
      });
      const burn = btn.querySelector('.burn-icon');
      if(burn) burn.addEventListener('click', e=>{e.stopPropagation(); window.burnTag(tag.name);});
      c.appendChild(btn);
    });
    safe(updatePowerDisplay);
  };
  window.renderStoryTagList = function(){
    const c=document.getElementById('storyTagList'); if(!c||!window.gameState) return;
    if(!gameState.storyTags.length){ c.innerHTML='<div class="empty-state">No story tags</div>'; return; }
    c.innerHTML='';
    gameState.storyTags.forEach((tag,idx)=>{
      const div=document.createElement('div'); div.className='tag-item';
      div.innerHTML = `<div class="tag-info"><span class="tag-name">${tag.name}</span><span class="tag-type">${tag.ongoing?'(Ongoing)':'(Temp)'}</span></div><button class="remove-btn">Consume</button>`;
      div.querySelector('.remove-btn').addEventListener('click',()=>{
        gameState.selectedTags = gameState.selectedTags.filter(t=>t!==tag.name);
        gameState.storyTags.splice(idx,1);
        safe(()=>localStorage.setItem('queerz_player_state', JSON.stringify(gameState)));
        safe(updateTracking); safe(renderAvailableTags);
      });
      c.appendChild(div);
    });
  };
  window.updatePowerDisplay = function(){
    let power=0; if(!window.gameState) return;
    gameState.selectedTags.forEach(name=>{
      let isWeak=false;
      gameState.character.themes.forEach(th=>{ if(th.weaknessTags.includes(name)) isWeak=true; });
      power += isWeak ? -1 : 1;
    });
    const el = document.getElementById('currentPower')||document.getElementById('totalPower')||document.getElementById('totalPowerValue');
    if(el) el.textContent = power;
  };
})();