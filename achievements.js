const ACHIEVEMENT_KEY='skinator-achievements-v1';
const ACHIEVEMENT_ICON_BASE='assets/achievements/';
const ACHIEVEMENT_SEED_VERSION=2;
const ACHIEVEMENT_SEED_UPDATED_AT='2026-09-15T00:00:00.000Z';
const ACHIEVEMENT_SEED=[
  ['ACH_DOMINATION','DOMINATION','BEAT KNU-RAO.','domination'],
  ['ACH_VETERAN','VETERAN','DEFEAT BOTH SANGO AND KNU-RAO AT LEAST ONCE.','veteran'],
  ['ACH_PERSUATION','PERSUASION',"EXTRACT KNU-RAO'S SPAWN.",'persuasion'],
  ['ACH_EVOLUTION','EVOLUTION','REPLACE ONE OF YOUR BODY PARTS.','evolution'],
  ['ACH_SEEKER','SEEKER','USE THE RESET BUTTON ON THE BODY PART SWAP SCREEN.','seeker'],
  ['ACH_OPERATOR_LICENSE','OPERATOR LICENSE','COMPLETE THE TUTORIAL.','operator_license'],
  ['ACH_FIRST_BLOOD','FIRST BLOOD','DEFEAT AN ENEMY IN THE MAIN GAME.','first_blood'],
  ['ACH_MASTERY','MASTERY','BEAT 5 ENEMIES IN THE MAIN GAME.','mastery'],
  ['ACH_CLEANUP','CLEANUP','DEFEAT 10 ENEMIES IN A SINGLE RUN.','cleanup'],
  ['ACH_THIRST','THIRST','DRINK A POTION.','thirst'],
  ['ACH_BUSINESS','BUSINESS','BUY A BODY PART FROM THE SHOP KEEPER.','business'],
  ['ACH_CONTABAND','CONTABAND','PURCHASE A SPIN AT THE CORPSE MONGER.','contraband'],
  ['ACH_CURSE','CURSE','ASCEND A PART WITH THE TEMPLE PRIEST.','curse'],
  ['ACH_DEXTERITY','DEXTERITY','SKINATE KNU-RAO.','dexterity'],
  ['ACH_SKINATED','SKINATED','SKINATE AN ENEMY.','skinated'],
  ['ACH_MOGUL','MOGUL','BUY ALL 3 PARTS AT THE SHOP KEEPER IN A SINGLE INTERACTION.','mogul'],
  ['ACH_UNMATCHED','UNMATCHED','BEAT KNU-RAO WITH AT LEAST HALF YOUR MAXIMUM HEALTH REMAINING.','unmatched'],
  ['ACH_REPLACEMENT','REPLACEMENT','REPLACE ALL DEFAULT SKELETON PARTS IN A SINGLE RUN.','replacement'],
  ['ACH_BETRAYAL','BETRAYAL','GET THE CROW CARD AT THE WANDERING MONK.','betrayal'],
  ['ACH_OBLITERATION','OBLITERATION','DEFEAT EVERY ENEMY ON A SINGLE MAP.','obliteration'],
  ['ACH_PATH_FINDER','PATH FINDER','TALK WITH EVERY NPC ON THE MAP.','path_finder'],
  ['ACH_FORGIVENESS','FORGIVENESS','ESCAPE FROM A FIGHT.','forgiveness'],
  ['ACH_BRITTLE_BONE','BRITTLE BONE','GET YOUR HEALTH POOL UNDER 10 MAX HEALTH.','brittle_bone'],
  ['ACH_IRON_SKIN','IRON SKIN','GET YOUR MAX HEALTH IN THE HEALTH POOL TO 50 POINTS.','iron_skin'],
  ['ACH_RIP','RIP','TALK WITH OBOROGUMO.','rip'],
  ['ACH_TARGET_ACQUIRED','TARGET ACQUIRED','GET INTO A FIGHT WITH KNU-RAO.','target_acquired'],
  ['ACH_STURDINESS','STURDINESS','GET YOUR MAX HEALTH IN THE HEALTH POOL TO 30 POINTS.','sturdiness'],
  ['ACH_LUCK','LUCK','GET A PART FROM THE CORPSE MONGER.','luck'],
  ['ACH_MUTATION','MUTATION','GET A BODY PART WITH 3 MODIFIERS.','mutation'],
  ['ACH_VELOCITY','VELOCITY','GET YOUR MAX SPEED OVER 40 POINTS.','velocity'],
  ['ACH_BURIAL','BURIAL','DIE IN THE MAIN GAME.','burial'],
  ['ACH_RESURRECTION','RESURRECTION','PLAY A SECOND RUN.','resurrection'],
  ['ACH_SKINATOR','SKINATOR','NO DESC. NOT YET USED.','skinator'],
  ['ACH_ACTIVATION','ACTIVATION','USE A SPAWN ABILITY FOR THE FIRST TIME.','activation'],
  ['ACH_INTROSPECTION','INTROSPECTION','EQUIP GRAVEYARD DRONE PET.','introspection'],
  ['ACH_AUTOPSY','AUTOPSY','CLICK THE INSPECT BUTTON IN THE BODY PART SWAP SCREEN.','autopsy'],
  ['ACH_MENAGERIE','MENAGERIE','CHECK SPAWN INVENTORY IN THE MAIN MENU.','menagerie'],
  ['ACH_ENCYCLOPEDIA','ENCYCLOPEDIA','GET ALL BODY PARTS FROM GRAVEYARD.','encyclopedia'],
  ['ACH_ACCLIMATION','ACCLIMATION','DEFEAT 3 ENEMIES.','acclimation'],
  ['ACH_BIOLOGY','BIOLOGY','CHECK PARASITE INVENTORY IN THE MAIN MENU.','biology'],
  ['ACH_RESEARCH','RESEARCH','CHECK YOUR MODIFIER INVENTORY IN THE MAIN MENU.','research'],
  ['ACH_EXORCIST','EXORCIST','SELECT SANGO AS TARGET IN THE MAIN MENU','exorcist'],
  ['ACH_SERVANT','SERVANT',"EQUIP GENKE'S SPAWN",'servant'],
  ['ACH_OSTENTATION','OSTENTATION','EQUIP KNU-RAO SPAWN.','ostentation'],
  ['ACH_PURIFICATION','PURIFICATION','DEFEAT SANGO.','purification'],
  ['ACH_MITOSIS','MITOSIS','GET GRAVEYARD DRONE PET.','mitosis'],
  ['ACH_CAPTURE','CAPTURE',"EXTRACT GENKE'S SPAWN.",'capture']
].map(([apiName,displayName,description,fileBase],index)=>({
  id:apiName.toLowerCase(),
  order:index,
  apiName,
  progressStat:'',
  displayName,
  description,
  hidden:false,
  unlockedIcon:`${ACHIEVEMENT_ICON_BASE}ach_${fileBase}_unlocked.png`,
  lockedIcon:`${ACHIEVEMENT_ICON_BASE}ach_${fileBase}_locked.png`,
  seedVersion:ACHIEVEMENT_SEED_VERSION,
  updatedAt:ACHIEVEMENT_SEED_UPDATED_AT
}));

const achievementRecordKey=record=>String(record?.apiName||record?.id||'').trim().toUpperCase();
function mergeAchievementSeed(records=[]){
  const existing=new Map();
  records.forEach(record=>{
    existing.set(achievementRecordKey(record),record);
    if(record.id)existing.set(String(record.id).trim().toUpperCase(),record);
  });
  const seedKeys=new Set(ACHIEVEMENT_SEED.flatMap(seed=>[achievementRecordKey(seed),String(seed.id).toUpperCase()]));
  let migrated=false;
  const seeded=ACHIEVEMENT_SEED.map(seed=>{
    const record=existing.get(achievementRecordKey(seed))||existing.get(String(seed.id).toUpperCase());
    if(!record){migrated=true;return{...seed}}
    if((Number(record.seedVersion)||0)<ACHIEVEMENT_SEED_VERSION){
      migrated=true;
      return {...record,...seed,progressStat:record.progressStat||'',hidden:!!record.hidden,deleted:!!record.deleted};
    }
    return {...seed,...record};
  });
  const extras=records.filter(record=>!seedKeys.has(achievementRecordKey(record))&&!seedKeys.has(String(record.id||'').toUpperCase()));
  window.skinatorAchievementSeedMigrated=!!window.skinatorAchievementSeedMigrated||migrated;
  return seeded.concat(extras);
}

const savedAchievements=(()=>{try{return JSON.parse(localStorage.getItem(ACHIEVEMENT_KEY))||[]}catch{return[]}})();
let achievements=mergeAchievementSeed(publishedSnapshot?.achievements||savedAchievements);
if(window.skinatorAchievementSeedMigrated)try{localStorage.setItem(ACHIEVEMENT_KEY,JSON.stringify(achievements))}catch{}
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
      <button class="btn red achievement-create" id="achievementCreate" type="button">＋ NEW ACHIEVEMENT</button>
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
    <div class="dialog-actions"><button type="button" class="btn danger" id="achievementDelete" hidden>DELETE ACHIEVEMENT</button><span></span><button type="button" class="btn ghost achievement-close">CANCEL</button><button class="btn red" type="submit">SAVE ACHIEVEMENT</button></div>
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
  if(!icon)return '<span class="achievement-icon-empty">NO ICON</span>';
  const fallback=icon&&storagePath?` data-fallback="${escapeHtml(icon)}"`:'';
  const storage=storagePath?` data-storage-path="${escapeHtml(storagePath)}" onerror="window.skinatorRefreshCloudImage?.(this)"`:'';
  return `<img src="${escapeHtml(icon||'')}" alt="${escapeHtml(name)}" loading="lazy" decoding="async"${storage}${fallback}>`;
}
function saveAchievements(){
  localStorage.setItem(ACHIEVEMENT_KEY,JSON.stringify(achievements));
  window.skinatorCloudSave?.();
}
const activeAchievements=()=>achievements.filter(record=>!record.deleted);
function renderAchievements(){
  const query=($('achievementSearch').value||'').toLowerCase();
  const active=activeAchievements();
  const rows=active.filter(record=>`${record.apiName} ${record.progressStat} ${record.displayName} ${record.description}`.toLowerCase().includes(query));
  $('achievementCount').textContent=active.length;
  $('navAchievementCount').textContent=active.length;
  $('achievementHiddenCount').textContent=active.filter(record=>record.hidden).length;
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
  const record=achievements.find(item=>item.id===id&&!item.deleted);
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
  $('achievementDelete').hidden=false;
  $('achievementDialog').showModal();
}
function openNewAchievement(){
  editingAchievementId=null;
  editingAchievementUnlocked='';
  editingAchievementLocked='';
  $('achievementDialogTitle').textContent='NEW ACHIEVEMENT';
  $('achievementApiName').value='ACH_';
  $('achievementProgressStat').value='';
  $('achievementDisplayName').value='';
  $('achievementDescription').value='';
  $('achievementHidden').checked=false;
  $('achievementUnlockedPreview').removeAttribute('src');
  $('achievementLockedPreview').removeAttribute('src');
  $('achievementDelete').hidden=true;
  $('achievementApiName').setCustomValidity('');
  $('achievementDialog').showModal();
  $('achievementApiName').focus();
}
function acceptAchievementIcon(file,locked){
  fileData(file,data=>{
    if(locked){editingAchievementLocked=data;$('achievementLockedPreview').src=data}
    else{editingAchievementUnlocked=data;$('achievementUnlockedPreview').src=data}
  });
}

$('achievementSearch').oninput=renderAchievements;
$('achievementCreate').onclick=openNewAchievement;
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
$('achievementApiName').oninput=event=>{event.target.value=event.target.value.toUpperCase();event.target.setCustomValidity('')};
$('achievementDisplayName').oninput=event=>event.target.value=event.target.value.toUpperCase();
$('achievementDelete').onclick=()=>{
  const record=achievements.find(item=>item.id===editingAchievementId&&!item.deleted);
  if(!record||!window.confirm(`Delete ${record.displayName||record.apiName}?`))return;
  record.deleted=true;
  record.updatedAt=new Date().toISOString();
  saveAchievements();
  renderAchievements();
  $('achievementDialog').close();
  toast('ACHIEVEMENT DELETED');
};
$('achievementForm').onsubmit=event=>{
  event.preventDefault();
  if(!event.currentTarget.reportValidity())return;
  const apiName=$('achievementApiName').value.trim().toUpperCase();
  const duplicate=achievements.find(item=>!item.deleted&&item.apiName===apiName&&item.id!==editingAchievementId);
  if(duplicate){$('achievementApiName').setCustomValidity('This API name is already in use.');$('achievementApiName').reportValidity();return}
  let record=achievements.find(item=>item.id===editingAchievementId);
  const created=!record;
  if(!record){
    record=achievements.find(item=>item.deleted&&item.apiName===apiName);
    if(!record){
      const id=`achievement-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      record={id,order:Math.max(-1,...achievements.map(item=>Number(item.order)||0))+1};
      achievements.push(record);
    }
  }
  Object.assign(record,{
    apiName,
    progressStat:$('achievementProgressStat').value.trim(),
    displayName:$('achievementDisplayName').value.trim().toUpperCase(),
    description:$('achievementDescription').value.trim(),
    hidden:$('achievementHidden').checked,
    unlockedIcon:editingAchievementUnlocked,
    lockedIcon:editingAchievementLocked,
    deleted:false,
    seedVersion:ACHIEVEMENT_SEED_VERSION,
    updatedAt:new Date().toISOString()
  });
  saveAchievements();
  renderAchievements();
  $('achievementDialog').close();
  toast(created?'ACHIEVEMENT CREATED':'ACHIEVEMENT UPDATED');
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
