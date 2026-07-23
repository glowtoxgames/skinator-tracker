// Combined modifier counts, additive category filters, Spawn labels and email-sent outreach tracking.
const selectedModifierCategories=new Set();
function ensureSpawnModifiersInState(){const spawnIds=new Set(SPAWN_MODIFIER_SEED.map(modifier=>modifier.id));state.modifiers.forEach(modifier=>{if(spawnIds.has(modifier.id))modifier.isSpawn=true;if(modifier.isSpawn&&!modifier.grade)modifier.grade='B'});SPAWN_MODIFIER_SEED.forEach(seed=>{if(!state.modifiers.some(modifier=>modifier.id===seed.id))state.modifiers.push({...seed,isSpawn:true,grade:'B',zone:'',trigger:'Spawn',iconData:'',superEnabled:false,superName:'',superGrade:'',superDescription:'',updatedAt:new Date().toISOString()})})}
ensureSpawnModifiersInState();
function normalizeModifierText(value=''){
  if(typeof normalizeModifierDescription==='function')return normalizeModifierDescription(value);
  const colors={'HEALTH POOL':'green',DAMAGE:'red',ATTACK:'red',POWER:'red',HEALTH:'green',RANGE:'yellow',SPEED:'white'};
  return String(value).replace(/<\/?color(?:=[^>]+)?>/gi,'').toUpperCase().replace(/\b(HEALTH POOL|DAMAGE|ATTACK|POWER|HEALTH|RANGE|SPEED)\b/g,word=>`<color=${colors[word]}>${word}</color>`);
}
state.modifiers.forEach(modifier=>{
  modifier.name=(modifier.name||'').toUpperCase();
  modifier.description=normalizeModifierText(modifier.description);
  modifier.superName=(modifier.superName||'').toUpperCase();
  modifier.superDescription=normalizeModifierText(modifier.superDescription);
});

function modifierDescriptionHtml(description=''){
  const plain=normalizeModifierText(description).replace(/<\/?color(?:=[^>]+)?>/gi,'');
  return escapeHtml(plain).replace(/\b(health pool|damage|attack|power|health|speed|range)\b/gi,(word)=>{
    const type=/^(damage|attack|power)$/i.test(word)?'power':/^health(?: pool)?$/i.test(word)?'health':/^speed$/i.test(word)?'speed':'range';
    return `<strong class="modifier-keyword modifier-keyword-${type}">${word}</strong>`;
  });
}
const modifierKeywordStyles=document.createElement('style');
modifierKeywordStyles.textContent='.modifier-keyword{font-weight:800;text-shadow:none}.modifier-keyword-power{color:#ff353d}.modifier-keyword-health{color:#35d66f}.modifier-keyword-speed{color:#fff}.modifier-keyword-range{color:#ffd83d}.mod-card{align-items:start;min-height:142px;padding:14px}.mod-card p{display:block;-webkit-line-clamp:unset;-webkit-box-orient:initial;overflow:visible;line-height:1.55}.mod-card .grade-icon,.mod-card .spawn-db-label{align-self:start}';
document.head.appendChild(modifierKeywordStyles);

function modifierCategoryMatches(record){return selectedModifierCategories.size===0||selectedModifierCategories.has(record.isSpawn?'Spawn':record.category)}
renderModifiers=function(){
  const query=state.modQuery;
  const spawnRows=state.modifiers.filter(modifier=>modifier.isSpawn);
  const source=state.modifiers;
  const rows=source.filter(modifier=>modifierCategoryMatches(modifier)&&(state.modGrade==='All'||modifier.grade===state.modGrade)&&(modifier.isSpawn?state.modZone==='All':zoneMatches(modifier))&&`${modifier.name} ${modifier.description} ${modifier.grade} ${modifier.category}`.toLowerCase().includes(query));
  $('navModCount').textContent=source.length;
  $('modifierCount').textContent=source.length;
  $('godEyeCount').textContent=state.modifiers.filter(modifier=>modifier.category==='God Eye').length;
  $('iconCount').textContent=state.modifiers.filter(modifier=>modifier.icon||modifier.iconData).length;
  $('superCount').textContent=state.modifiers.filter(modifier=>modifier.superEnabled).length;
  $('modifierResultCount').textContent=plural(rows.length,'RESULT');
  $('modifierGrid').innerHTML=rows.map(modifier=>`<article class="mod-card ${modifier.isSpawn?'spawn-database-card':''}" data-id="${modifier.id}" data-spawn="${modifier.isSpawn?'true':'false'}">${modifier.icon||modifier.iconData?`<img class="mod-icon" src="${mediaSrc(modifier)}" onerror="this.style.opacity=.12">`:'<i class="mod-icon spawn-db-placeholder">?</i>'}<div><div class="mod-meta">${modifier.isSpawn?`SPAWN // ${escapeHtml(modifier.category).toUpperCase()}`:`${escapeHtml(modifier.category).toUpperCase()} // ${escapeHtml(modifier.zone||'GLOBAL')}`}${modifier.superEnabled?`<span class="super-mark">✦ SUPER ${modifier.superGrade||modifier.grade}</span>`:''}</div><h3>${escapeHtml(modifier.name)}</h3><p>${modifierDescriptionHtml(modifier.description)}</p></div><img class="grade-icon" src="${gradeIcon(modifier.grade)}" alt="Grade ${modifier.grade}" title="Grade ${modifier.grade}"></article>`).join('');
  document.querySelectorAll('.mod-card').forEach(card=>card.onclick=()=>openModifier(card.dataset.id));
};

function refreshModifierFilterButtons(){document.querySelectorAll('.filter[data-category]').forEach(button=>button.classList.toggle('active',button.dataset.category==='All'?selectedModifierCategories.size===0:selectedModifierCategories.has(button.dataset.category)))}
document.querySelectorAll('.filter[data-category]').forEach(button=>button.onclick=()=>{const category=button.dataset.category;if(category==='All')selectedModifierCategories.clear();else{selectedModifierCategories.has(category)?selectedModifierCategories.delete(category):selectedModifierCategories.add(category)}if(selectedModifierCategories.has('Spawn')){state.modZone='All';state.modGrade='All';$('modifierZoneFilter').value='All';$('modifierGradeFilter').value='All'}refreshModifierFilterButtons();renderModifiers()});
const renderBeforeModifierCountFix=render;
render=function(){renderBeforeModifierCountFix();$('navModCount').textContent=state.modifiers.length;refreshModifierFilterButtons()};

$('outreachReplyFilter').innerHTML='<option value="All">ALL EMAIL STATUS</option><option value="Sent">EMAIL SENT</option><option value="Not sent">EMAIL NOT SENT</option>';
const emailSentColumnLabel=$('outreachColumnPicker').querySelector('[data-column="reply"]')?.closest('label');
if(emailSentColumnLabel)emailSentColumnLabel.lastChild.textContent=' EMAIL SENT';
renderOutreach=function(){
  const query=($('outreachSearch').value||'').toLowerCase(),filter=$('outreachReplyFilter').value;
  const rows=outreachRecords.filter(record=>`${record.name} ${record.channel} ${record.email} ${record.relevancy} ${record.country}`.toLowerCase().includes(query)&&(filter==='All'||(filter==='Sent')===!!record.emailSent));
  $('navOutreachCount').textContent=outreachRecords.length;
  $('outreachResultCount').textContent=plural(rows.length,'CONTACT');
  const columns=['minmax(210px,1.35fr)',...Object.keys(outreachColumns).filter(key=>outreachColumns[key]).map(()=>'minmax(135px,1fr)')].join(' ');
  $('outreachGrid').innerHTML=rows.map(record=>`<article class="detail-line" style="grid-template-columns:${columns}" data-business="outreach" data-id="${record.id}"><div><span class="line-label">CREATOR</span><h3>${escapeHtml(record.name)}</h3><p>${escapeHtml(record.relevancy||'No relevance notes yet.')}</p></div>${outreachColumns.followers?`<div><span class="line-label">FOLLOWERS</span><p>${escapeHtml(record.followers||'—')}</p></div>`:''}${outreachColumns.email?`<div><span class="line-label">EMAIL</span>${record.email?`<a href="mailto:${escapeHtml(record.email)}">${escapeHtml(record.email)}</a>`:'<p>—</p>'}</div>`:''}${outreachColumns.social?`<div><span class="line-label">SOCIAL / CHANNEL</span>${record.channel?`<a href="${escapeHtml(record.channel)}" target="_blank" rel="noopener">OPEN CHANNEL</a>`:''}${record.socialLink?`<a href="${escapeHtml(record.socialLink)}" target="_blank" rel="noopener">OTHER SOCIAL</a>`:''}</div>`:''}${outreachColumns.country?`<div><span class="line-label">COUNTRY</span><p>${escapeHtml(record.country||'—')}</p></div>`:''}${outreachColumns.timing?`<div><span class="line-label">BEST CONTACT TIME</span><p>${escapeHtml([record.bestDay,record.bestTime].filter(Boolean).join(' // ')||'—')}</p></div>`:''}${outreachColumns.reply?`<div><span class="line-label">EMAIL STATUS</span><span class="line-status ${record.emailSent?'yes':''}">${record.emailSent?'EMAIL SENT':'NOT SENT'}</span></div>`:''}</article>`).join('')||'<div class="business-empty">NO CONTACTS MATCH THIS FILTER</div>';
  bindBusinessCards();
};
$('outreachReplyFilter').onchange=renderOutreach;
$('outreachSearch').oninput=renderOutreach;
['Offensive','Defensive','Passive'].forEach(category=>{if(!$('modifierCategory').querySelector(`option[value="${category}"]`))$('modifierCategory').insertAdjacentHTML('beforeend',`<option value="${category}">${category.toUpperCase()}</option>`)});
renderSuperPicker=function(selected){$('superPicker').innerHTML=state.modifiers.filter(modifier=>modifier.category!=='God Eye'&&!modifier.isSpawn).map(modifier=>`<label class="pick"><img src="${mediaSrc(modifier)}"><span><b>${escapeHtml(modifier.superName||`Super ${modifier.name}`)}</b><small>${modifier.category} // GRADE ${modifier.superGrade||modifier.grade}</small></span><input type="checkbox" value="${modifier.id}" ${selected.includes(modifier.id)?'checked':''}></label>`).join('')};
renderSpawnPicker=function(selected=[]){const spawnRows=state.modifiers.filter(modifier=>modifier.isSpawn);$('spawnModifierPicker').innerHTML=spawnRows.map(modifier=>`<label class="spawn-mod-pick" title="${escapeHtml(modifier.description)}">${modifier.icon||modifier.iconData?`<img src="${mediaSrc(modifier)}" alt="">`:'<i class="spawn-icon-missing">?</i>'}<span><b>${escapeHtml(modifier.name).toUpperCase()}</b><small>${escapeHtml(modifier.category).toUpperCase()} // GRADE ${escapeHtml(modifier.grade)}</small><em>${modifierDescriptionHtml(modifier.description)}</em></span><input type="checkbox" value="${modifier.id}" ${selected.includes(modifier.id)?'checked':''}></label>`).join('');$('spawnModifierPicker').querySelectorAll('input').forEach(input=>input.onchange=()=>{const checked=[...$('spawnModifierPicker').querySelectorAll('input:checked')];if(checked.length>2){input.checked=false;toast('A SPAWN CAN HAVE A MAXIMUM OF 2 MODIFIERS')}})};
renderModifiers();renderOutreach();

const openModifierBeforeFormatting=openModifier;
openModifier=function(id){
  openModifierBeforeFormatting(id);
  $('modifierDialogTitle').textContent=$('modifierDialogTitle').textContent.toUpperCase();
  $('modifierName').value=$('modifierName').value.toUpperCase();
  $('modifierDescription').value=normalizeModifierText($('modifierDescription').value);
  $('superName').value=$('superName').value.toUpperCase();
  $('superDescription').value=normalizeModifierText($('superDescription').value);
};

function uppercaseModifierField(event){
  const field=event.target,start=field.selectionStart,end=field.selectionEnd;
  field.value=field.value.toUpperCase();
  field.setSelectionRange(start,end);
}
function uppercaseUnityModifierField(event){
  const field=event.target,start=field.selectionStart,end=field.selectionEnd;
  field.value=uppercaseModifierInput(field.value);
  field.setSelectionRange(start,end);
}
$('modifierName').oninput=uppercaseModifierField;
$('superName').oninput=uppercaseModifierField;
$('modifierDescription').oninput=uppercaseUnityModifierField;
$('superDescription').oninput=uppercaseUnityModifierField;
$('modifierDescription').onblur=event=>event.target.value=normalizeModifierText(event.target.value);
$('superDescription').onblur=event=>event.target.value=normalizeModifierText(event.target.value);

$('modifierForm').addEventListener('submit',()=>{
  const modifier=state.editingMod?state.modifiers.find(item=>item.id===state.editingMod):state.modifiers[0];
  if(!modifier)return;
  modifier.name=(modifier.name||'').toUpperCase();
  modifier.description=normalizeModifierText(modifier.description);
  modifier.superName=(modifier.superName||'').toUpperCase();
  modifier.superDescription=normalizeModifierText(modifier.superDescription);
  save();
  render();
});
renderModifiers();

// Keep the four asset databases together in the requested sidebar order.
const primaryNav=document.querySelector('aside nav');
const characterNav=primaryNav.querySelector('[data-tab="characters"]');
const npcNav=primaryNav.querySelector('[data-tab="npcs"]');
const parasiteNav=primaryNav.querySelector('[data-tab="parasytes"]');
const modifierNav=primaryNav.querySelector('[data-tab="modifiers"]');
if(characterNav&&npcNav&&parasiteNav&&modifierNav){
  characterNav.insertAdjacentElement('afterend',npcNav);
  npcNav.insertAdjacentElement('afterend',parasiteNav);
  parasiteNav.insertAdjacentElement('afterend',modifierNav);
}

const nodeZoomStyles=document.createElement('style');
nodeZoomStyles.textContent=`
  .node-zoom-control{display:flex;align-items:center;gap:7px;margin-left:auto;white-space:nowrap;color:#73777e;font:700 7px inherit;letter-spacing:.09em}
  .node-zoom-control input{width:112px;margin:0;padding:0;accent-color:var(--red);cursor:pointer}
  .node-zoom-control output{width:34px;color:#aaa;text-align:right}
  #characterGrid{grid-template-columns:repeat(auto-fill,minmax(calc(220px * var(--node-zoom,1)),1fr))}
  #characterGrid .char-info{padding:calc(13px * var(--node-zoom,1))}
  #characterGrid .char-info h3{font-size:calc(18px * var(--node-zoom,1))}
  #characterGrid .code{font-size:calc(8px * var(--node-zoom,1))}
  #characterGrid .chip,#characterGrid .completion span{font-size:calc(7px * var(--node-zoom,1));padding:calc(5px * var(--node-zoom,1)) calc(7px * var(--node-zoom,1))}
  #npcGrid{grid-template-columns:repeat(auto-fill,minmax(calc(280px * var(--node-zoom,1)),1fr))}
  #npcGrid .npc-visual{height:calc(185px * var(--node-zoom,1))}
  #npcGrid .npc-info{padding:calc(14px * var(--node-zoom,1))}
  #npcGrid .npc-info h3{font-size:calc(19px * var(--node-zoom,1))}
  #npcGrid .npc-info p{font-size:calc(9px * var(--node-zoom,1))}
  #npcGrid .npc-progress span{font-size:calc(7px * var(--node-zoom,1))}
  #npcGrid .npc-progress b{font-size:calc(18px * var(--node-zoom,1))}
  #parasyteFamilies .parasyte-grid{grid-template-columns:repeat(auto-fit,minmax(calc(190px * var(--node-zoom,1)),1fr));gap:calc(11px * var(--node-zoom,1))}
  #parasyteFamilies .parasyte-info{padding:calc(13px * var(--node-zoom,1))}
  #parasyteFamilies .parasyte-info h3{font-size:calc(17px * var(--node-zoom,1))}
  #parasyteFamilies .parasyte-info p{font-size:calc(11px * var(--node-zoom,1))}
  #parasyteFamilies .parasyte-info>span,#parasyteFamilies .parasyte-visual>b,#parasyteFamilies .parasyte-status{font-size:calc(9px * var(--node-zoom,1))}
  #modifierGrid{grid-template-columns:repeat(auto-fill,minmax(calc(285px * var(--node-zoom,1)),1fr));gap:calc(9px * var(--node-zoom,1))}
  #modifierGrid .mod-card{grid-template-columns:calc(62px * var(--node-zoom,1)) 1fr auto;gap:calc(12px * var(--node-zoom,1));padding:calc(14px * var(--node-zoom,1));min-height:calc(142px * var(--node-zoom,1))}
  #modifierGrid .mod-icon{width:calc(62px * var(--node-zoom,1));height:calc(62px * var(--node-zoom,1))}
  #modifierGrid .mod-card h3{font-size:calc(11px * var(--node-zoom,1))}
  #modifierGrid .mod-card p{font-size:calc(8px * var(--node-zoom,1))}
  #modifierGrid .mod-meta{font-size:calc(7px * var(--node-zoom,1))}
  #modifierGrid .grade-icon{width:calc(34px * var(--node-zoom,1));height:calc(34px * var(--node-zoom,1))}
  @media(max-width:700px){.node-zoom-control{width:100%;margin-left:0;justify-content:flex-end}.node-zoom-control input{flex:1;max-width:180px}}
`;
document.head.appendChild(nodeZoomStyles);

function addNodeZoom({viewId,gridId,label,key}){
  const view=$(viewId),grid=$(gridId),toolbar=view?.querySelector('.toolbar');
  if(!view||!grid||!toolbar||toolbar.querySelector(`[data-node-zoom="${key}"]`))return;
  const stored=Math.min(1.6,Math.max(.75,Number(localStorage.getItem(`skinator-node-zoom-${key}`))||1));
  grid.style.setProperty('--node-zoom',stored);
  toolbar.insertAdjacentHTML('beforeend',`<label class="node-zoom-control" data-node-zoom="${key}"><span>${label} SIZE</span><input type="range" min="0.75" max="1.6" step="0.05" value="${stored}"><output>${Math.round(stored*100)}%</output></label>`);
  const control=toolbar.querySelector(`[data-node-zoom="${key}"]`),slider=control.querySelector('input'),output=control.querySelector('output');
  slider.oninput=()=>{const value=Number(slider.value);grid.style.setProperty('--node-zoom',value);output.value=`${Math.round(value*100)}%`;localStorage.setItem(`skinator-node-zoom-${key}`,value)};
}
addNodeZoom({viewId:'charactersView',gridId:'characterGrid',label:'CHARACTER',key:'characters'});
addNodeZoom({viewId:'npcsView',gridId:'npcGrid',label:'NPC',key:'npcs'});
addNodeZoom({viewId:'parasytesView',gridId:'parasyteFamilies',label:'PARASITE',key:'parasites'});
addNodeZoom({viewId:'modifiersView',gridId:'modifierGrid',label:'MODIFIER',key:'modifiers'});
