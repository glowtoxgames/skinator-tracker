const ACHIEVEMENT_KEY='skinator-achievements-v1';
const ACHIEVEMENT_ICON_BASE='assets/achievements/';
const ACHIEVEMENT_SEED=[
  ['ACH_OPERATOR_LICENSE','OPERATOR LICENSE','Complete the tutorial.','ach_OperatorLicense'],
  ['ACH_EVOLUTION','EVOLUTION','Replace one of your body parts.','ach_evolution'],
  ['ACH_SEEKER','SEEKER','Use the reset button on the Body part swap screen.','ach_seeker'],
  ['ACH_FIRST_BLOOD','FIRST BLOOD','Defeat your first enemy in the main game.','ach_firstBlood'],
  ['ACH_DOMINATION','DOMINATION','Beat Knu Rao.','ach_DOMINATION'],
  ['ACH_MASTERY','MASTERY','Beat 5 enemies in the main game.','ach_mastery'],
  ['ACH_CLEANUP','CLEANUP','Defeat 10 enemies in a single run.','ach_cleanup'],
  ['ACH_THIRST','THIRST','Drink a potion.','ach_thirst'],
  ['ACH_BUSINESS','BUSINESS','Buy a body part from the Shop Keeper.','ach_business'],
  ['ACH_CONTABAND','CONTABAND','Purchase a spin at the Corpse Monger.','ach_contraband'],
  ['ACH_CURSE','CURSE','Ascend a part with the Temple Priest.','ach_curse'],
  ['ACH_MOGUL','MOGUL','Buy all 3 parts at the Shop Keeper in a single interaction.','ach_mogul-copy'],
  ['ACH_UNMATCHED','UNMATCHED','Beat Knu Rao with more than 50% of your Health Pool remaining.','ach_FlawlessVictory'],
  ['ACH_REPLACEMENT','REPLACEMENT','Replace all default skeleton parts in a single run.','ach_replacement'],
  ['ACH_BETRAYAL','BETRAYAL','Get the crow card at the Wandering Monk.','ach_Betrayal'],
  ['ACH_PATH_FINDER','PATH FINDER','Talk with every NPC on the map.','ach_pathfinde'],
  ['ACH_FORGIVENESS','FORGIVENESS','Escape from a fight.','ach_forgiveness-copy'],
  ['ACH_BRITTLE_BONE','BRITTLE BONE','Get your Health Pool under 10 max health.','ach_brittleBone-copy'],
  ['ACH_IRON_SKIN','IRON SKIN','Get your max health in the Health Pool to 50 points.','ach_ironskin-copy'],
  ['ACH_RIP','RIP','Talk with Oborogumo.','ach_RIP'],
  ['ACH_TARGET_ACQUIRED','TARGET ACQUIRED','Get into a fight with Knu Rao.','ach_TargetAcquired'],
  ['ACH_STURDINESS','STURDINESS','Get your max health in the Health Pool to 30 points.','ach_sturdiness'],
  ['ACH_LUCK','LUCK','Get a part from the Corpse Monger.','ach_luck'],
  ['ACH_MUTATION','MUTATION','Get a body part with 3 modifiers.','ach_mutation'],
  ['ACH_VELOCITY','VELOCITY','Get your max speed over 40 points.','ach_velocity'],
  ['ACH_BURIAL','BURIAL','Die in the main game.','ach_burrial'],
  ['ACH_RESURRECTION','RESURRECTION','Play a second run.','ach_Resurrection'],
  ['ACH_SKINATOR','SKINATOR','Get all body parts in your collection.','ach_skinator'],
  ['ACH_OBLITERATION','OBLITERATION','', 'ach_OBLITERATION-copy']
].map(([apiName,displayName,description,fileBase],index)=>({
  id:apiName.toLowerCase(),
  order:index,
  apiName,
  progressStat:'',
  displayName,
  description,
  hidden:false,
  unlockedIcon:`${ACHIEVEMENT_ICON_BASE}${fileBase}_unlocked.png`,
  lockedIcon:`${ACHIEVEMENT_ICON_BASE}${fileBase}_locked.png`,
  updatedAt:new Date().toISOString()
}));

function mergeAchievementSeed(records=[]){
  const existing=new Map(records.map(record=>[record.apiName||record.id,record]));
  return ACHIEVEMENT_SEED.map(seed=>({...seed,...(existing.get(seed.apiName)||existing.get(seed.id)||{})}))
    .concat(records.filter(record=>!ACHIEVEMENT_SEED.some(seed=>seed.apiName===(record.apiName||record.id))));
}

const savedAchievements=(()=>{try{return JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY))||[]}catch{return[]}})();
let achievements=mergeAchievementSeed(publishedSnapshot?.achievements||savedAchievements);
let editingAchievementId=null;
let editingAchievementUnlocked='';
let editingAchievementLocked='';
let displayLockedAchievements=localStorage.getItem('skinator-achievements-display-locked')==='true';

document.querySelector('aside nav').insertAdjacentHTML('beforeend','<button class="nav" data-tab="achievements"><i>★</i> ACHIEVEMENTS <span id="navAchievementCount">0</span></button>');
const achievementNav=document.querySelector('.nav[data-tab="achievements"]');
document.querySelector('.nav[data-tab="modifiers"]')?.insertAdjacentElement('afterend',achievementNav);

document.querySelector('main').insertAdjacentHTML('beforeend',`
<section id="achievementsView" hidden>
  <div class="stats achievement-stats">
    <article><label>ACHIEVEMENTS</label><b id="achievementCount">0</b><small>TOTAL RECORDS</small></article>
    <article><label>HIDDEN / SECRET</label><b id="achievementHiddenCount">0</b><small>SECRET ACHIEVEMENTS</small></article>
    <article><label>ICON VIEW</label><b id="achievementIconMode">OPEN</b><small>DISPLAY MODE</small></article>
  </div>
  <section class="panel">
    <div class="toolbar achievement-toolbar">
      <label class="search">⌕ <input id="achievementSearch" placeholder="SEARCH ACHIEVEMENTS"></label>
      <label class="achievement-lock-switch"><input id="achievementDisplayLocked" type="checkbox"> DISPLAY LOCKED</label>
      <span id="achievementResultCount"></span>
    </div>
    <div id="achievementGrid" class="achievement-grid"></div>
  </section>
</section>`);

document.body.insertAdjacentHTML('beforeend',`
<dialog id="achievementDialog" class="achievement-dialog">
  <form id="achievementForm">
    <div class="dialog-head"><div><p>ACHIEVEMENT DATABASE</p><h2 id="achievementDialogTitle">EDIT ACHIEVEMENT</h2></div><button type="button" class="x achievement-close">×</button></div>
    <div class="dialog-body">
      <section class="achievement-icon-editor">
        <label class="achievement-upload drop-target" id="achievementUnlockedDrop"><input id="achievementUnlockedInput" type="file" accept="image/*" hidden><img id="achievementUnlockedPreview"><span>UNLOCKED ICON</span></label>
        <label class="achievement-upload locked drop-target" id="achievementLockedDrop"><input id="achievementLockedInput" type="file" accept="image/*" hidden><img id="achievementLockedPreview"><span>LOCKED ICON</span></label>
      </section>
      <div class="two"><label>API NAME *<input id="achievementApiName" required></label><label>PROGRESS STAT<input id="achievementProgressStat"></label></div>
      <label>DISPLAY NAME *<input id="achievementDisplayName" required></label>
      <label>DESCRIPTION<textarea id="achievementDescription" rows="4"></textarea></label>
      <div class="achievement-checks"><label><input id="achievementHidden" type="checkbox"> HIDDEN / SECRET ACHIEVEMENT</label></div>
    </div>
    <div class="dialog-actions"><span></span><span></span><button type="button" class="btn ghost achievement-close">CANCEL</button><button class="btn red" type="submit">SAVE ACHIEVEMENT</button></div>
  </form>
</dialog>`);

const achievementZoomStyles=document.createElement('style');
achievementZoomStyles.textContent=`
  #achievementGrid{grid-template-columns:repeat(auto-fill,minmax(calc(320px * var(--node-zoom,1)),1fr));gap:calc(12px * var(--node-zoom,1))}
  #achievementGrid .achievement-card{grid-template-columns:calc(128px * var(--node-zoom,1)) 1fr;min-height:calc(170px * var(--node-zoom,1))}
  #achievementGrid .achievement-visual{padding:calc(10px * var(--node-zoom,1))}
  #achievementGrid .achievement-info{padding:calc(15px * var(--node-zoom,1))}
  #achievementGrid .achievement-info small{font-size:calc(8px * var(--node-zoom,1))}
  #achievementGrid .achievement-info h3{font-size:calc(14px * var(--node-zoom,1));margin:calc(7px * var(--node-zoom,1)) 0}
  #achievementGrid .achievement-info p{font-size:calc(11px * var(--node-zoom,1))}
  #achievementGrid .achievement-info>div{margin-top:calc(12px * var(--node-zoom,1))}
  #achievementGrid .achievement-info>div span,#achievementGrid .achievement-info>div b{font-size:calc(7px * var(--node-zoom,1));padding:calc(5px * var(--node-zoom,1)) calc(7px * var(--node-zoom,1))}
  @media(max-width:650px){#achievementGrid{grid-template-columns:1fr}#achievementGrid .achievement-card{grid-template-columns:calc(108px * var(--node-zoom,1)) 1fr}}
`;
document.head.appendChild(achievementZoomStyles);
if(typeof addNodeZoom==='function')addNodeZoom({viewId:'achievementsView',gridId:'achievementGrid',label:'ACHIEVEMENT',key:'achievements'});

function achievementImage(icon,storagePath,name){
  const fallback=icon&&storagePath?` data-fallback="${escapeHtml(icon)}"`:'';
  const storage=storagePath?` data-storage-path="${escapeHtml(storagePath)}" onerror="window.skinatorRefreshCloudImage?.(this)"`:'';
  return `<img src="${escapeHtml(icon||'')}" alt="${escapeHtml(name)}"${storage}${fallback}>`;
}
function saveAchievements(){
  localStorage.setItem(ACHIEVEMENT_KEY,JSON.stringify(achievements));
  window.skinatorCloudSave?.();
}
function renderAchievements(){
  const query=($('achievementSearch').value||'').toLowerCase();
  const rows=achievements.filter(record=>`${record.apiName} ${record.progressStat} ${record.displayName} ${record.description}`.toLowerCase().includes(query));
  $('achievementCount').textContent=achievements.length;
  $('navAchievementCount').textContent=achievements.length;
  $('achievementHiddenCount').textContent=achievements.filter(record=>record.hidden).length;
  $('achievementIconMode').textContent=displayLockedAchievements?'LOCKED':'OPEN';
  $('achievementResultCount').textContent=plural(rows.length,'RESULT');
  $('achievementDisplayLocked').checked=displayLockedAchievements;
  $('achievementGrid').innerHTML=rows.map(record=>{
    const icon=displayLockedAchievements?record.lockedIcon:record.unlockedIcon;
    const storagePath=displayLockedAchievements?record.lockedIconStoragePath:record.unlockedIconStoragePath;
    return `<article class="achievement-card ${record.hidden?'hidden-achievement':''}" data-id="${record.id}">
      <div class="achievement-visual">${achievementImage(icon,storagePath,record.displayName)}</div>
      <div class="achievement-info"><small>${escapeHtml(record.apiName)}</small><h3>${escapeHtml(record.displayName)}</h3><p>${escapeHtml(record.description||'DESCRIPTION TO BE ADDED')}</p><div><span>${displayLockedAchievements?'LOCKED':'UNLOCKED'}</span>${record.hidden?'<b>HIDDEN / SECRET ACHIEVEMENT</b>':''}</div></div>
    </article>`;
  }).join('');
  document.querySelectorAll('.achievement-card').forEach(card=>card.onclick=()=>openAchievement(card.dataset.id));
}
function openAchievement(id){
  const record=achievements.find(item=>item.id===id);
  if(!record)return;
  editingAchievementId=id;
  editingAchievementUnlocked=record.unlockedIcon||'';
  editingAchievementLocked=record.lockedIcon||'';
  $('achievementDialogTitle').textContent=record.displayName;
  $('achievementApiName').value=record.apiName||'';
  $('achievementProgressStat').value=record.progressStat||'';
  $('achievementDisplayName').value=record.displayName||'';
  $('achievementDescription').value=record.description||'';
  $('achievementHidden').checked=!!record.hidden;
  $('achievementUnlockedPreview').src=editingAchievementUnlocked;
  $('achievementLockedPreview').src=editingAchievementLocked;
  $('achievementDialog').showModal();
}
function acceptAchievementIcon(file,locked){
  fileData(file,data=>{
    if(locked){editingAchievementLocked=data;$('achievementLockedPreview').src=data}
    else{editingAchievementUnlocked=data;$('achievementUnlockedPreview').src=data}
  });
}

$('achievementSearch').oninput=renderAchievements;
$('achievementDisplayLocked').onchange=event=>{
  displayLockedAchievements=event.target.checked;
  localStorage.setItem('skinator-achievements-display-locked',String(displayLockedAchievements));
  renderAchievements();
};
$('achievementUnlockedInput').onchange=event=>acceptAchievementIcon(event.target.files[0],false);
$('achievementLockedInput').onchange=event=>acceptAchievementIcon(event.target.files[0],true);
setupDrop($('achievementUnlockedDrop'),file=>acceptAchievementIcon(file,false));
setupDrop($('achievementLockedDrop'),file=>acceptAchievementIcon(file,true));
document.querySelectorAll('.achievement-close').forEach(button=>button.onclick=()=>$('achievementDialog').close());
$('achievementApiName').oninput=event=>event.target.value=event.target.value.toUpperCase();
$('achievementDisplayName').oninput=event=>event.target.value=event.target.value.toUpperCase();
$('achievementForm').onsubmit=event=>{
  event.preventDefault();
  if(!event.currentTarget.reportValidity())return;
  const record=achievements.find(item=>item.id===editingAchievementId);
  if(!record)return;
  Object.assign(record,{
    apiName:$('achievementApiName').value.trim().toUpperCase(),
    progressStat:$('achievementProgressStat').value.trim(),
    displayName:$('achievementDisplayName').value.trim().toUpperCase(),
    description:$('achievementDescription').value.trim(),
    hidden:$('achievementHidden').checked,
    unlockedIcon:editingAchievementUnlocked,
    lockedIcon:editingAchievementLocked,
    updatedAt:new Date().toISOString()
  });
  saveAchievements();
  renderAchievements();
  $('achievementDialog').close();
  toast('ACHIEVEMENT UPDATED');
};

const achievementPreviousSetTab=setTab;
setTab=function(tab){
  $('achievementsView').hidden=tab!=='achievements';
  if(tab!=='achievements'){achievementPreviousSetTab(tab);return}
  state.tab=tab;
  document.querySelectorAll('.business-view').forEach(view=>view.hidden=true);
  ['charactersView','modifiersView','npcsView','trackerView','parasytesView'].forEach(id=>$(id).hidden=true);
  document.querySelectorAll('.nav[data-tab]').forEach(nav=>nav.classList.toggle('active',nav.dataset.tab===tab));
  $('pageTitle').textContent='Achievements';
  $('breadcrumb').textContent='ACHIEVEMENT DATABASE';
  $('pageSubtitle').textContent='Edit Steam achievement metadata and locked or unlocked icon variants.';
  $('createBtn').hidden=true;
  renderAchievements();
};
achievementNav.onclick=()=>setTab('achievements');
renderAchievements();
