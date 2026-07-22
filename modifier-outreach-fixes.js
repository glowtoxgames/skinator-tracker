// Combined modifier counts, additive category filters, Spawn labels and email-sent outreach tracking.
const selectedModifierCategories=new Set();
function ensureSpawnModifiersInState(){const spawnIds=new Set(SPAWN_MODIFIER_SEED.map(modifier=>modifier.id));state.modifiers.forEach(modifier=>{if(spawnIds.has(modifier.id))modifier.isSpawn=true});SPAWN_MODIFIER_SEED.forEach(seed=>{if(!state.modifiers.some(modifier=>modifier.id===seed.id))state.modifiers.push({...seed,isSpawn:true,grade:'',zone:'',trigger:'Spawn',iconData:'',superEnabled:false,superName:'',superGrade:'',superDescription:'',updatedAt:new Date().toISOString()})})}
ensureSpawnModifiersInState();

function modifierDescriptionHtml(description=''){
  const plain=String(description).replace(/<\/?color(?:=[^>]+)?>/gi,'');
  return escapeHtml(plain).replace(/\b(health pool|damage|power|health|speed|range)\b/gi,(word)=>{
    const type=/^(damage|power)$/i.test(word)?'power':/^health(?: pool)?$/i.test(word)?'health':/^speed$/i.test(word)?'speed':'range';
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
  $('modifierGrid').innerHTML=rows.map(modifier=>`<article class="mod-card ${modifier.isSpawn?'spawn-database-card':''}" data-id="${modifier.id}" data-spawn="${modifier.isSpawn?'true':'false'}">${modifier.icon||modifier.iconData?`<img class="mod-icon" src="${mediaSrc(modifier)}" onerror="this.style.opacity=.12">`:'<i class="mod-icon spawn-db-placeholder">?</i>'}<div><div class="mod-meta">${modifier.isSpawn?`SPAWN // ${escapeHtml(modifier.category).toUpperCase()}`:`${escapeHtml(modifier.category).toUpperCase()} // ${escapeHtml(modifier.zone||'GLOBAL')}`}${modifier.superEnabled?`<span class="super-mark">✦ SUPER ${modifier.superGrade||modifier.grade}</span>`:''}</div><h3>${escapeHtml(modifier.name)}</h3><p>${modifierDescriptionHtml(modifier.description)}</p></div>${modifier.isSpawn?'<span class="spawn-db-label">SPAWN</span>':`<img class="grade-icon" src="${gradeIcon(modifier.grade)}" alt="Grade ${modifier.grade}" title="Grade ${modifier.grade}">`}</article>`).join('');
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
if(!$('modifierGrade').querySelector('option[value=""]'))$('modifierGrade').insertAdjacentHTML('afterbegin','<option value="">N/A // SPAWN</option>');
renderSuperPicker=function(selected){$('superPicker').innerHTML=state.modifiers.filter(modifier=>modifier.category!=='God Eye'&&!modifier.isSpawn).map(modifier=>`<label class="pick"><img src="${mediaSrc(modifier)}"><span><b>${escapeHtml(modifier.superName||`Super ${modifier.name}`)}</b><small>${modifier.category} // GRADE ${modifier.superGrade||modifier.grade}</small></span><input type="checkbox" value="${modifier.id}" ${selected.includes(modifier.id)?'checked':''}></label>`).join('')};
renderSpawnPicker=function(selected=[]){const spawnRows=state.modifiers.filter(modifier=>modifier.isSpawn);$('spawnModifierPicker').innerHTML=spawnRows.map(modifier=>`<label class="spawn-mod-pick" title="${escapeHtml(modifier.description)}">${modifier.icon||modifier.iconData?`<img src="${mediaSrc(modifier)}" alt="">`:'<i class="spawn-icon-missing">?</i>'}<span><b>${escapeHtml(modifier.name).toUpperCase()}</b><small>${escapeHtml(modifier.category).toUpperCase()}</small><em>${modifierDescriptionHtml(modifier.description)}</em></span><input type="checkbox" value="${modifier.id}" ${selected.includes(modifier.id)?'checked':''}></label>`).join('');$('spawnModifierPicker').querySelectorAll('input').forEach(input=>input.onchange=()=>{const checked=[...$('spawnModifierPicker').querySelectorAll('input:checked')];if(checked.length>2){input.checked=false;toast('A SPAWN CAN HAVE A MAXIMUM OF 2 MODIFIERS')}})};
renderModifiers();renderOutreach();
