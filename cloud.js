if(!publishedSnapshot){
const CLOUD_CONFIG=window.SKINATOR_SUPABASE_CONFIG;
const cloudClient=CLOUD_CONFIG&&window.supabase?.createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
let cloudUser=null,cloudRole=null,cloudReady=false,cloudSaving=false,cloudTimer=null,cloudServerSignature='',cloudPresenceChannel=null,cloudReloadTimer=null;
const cloudRemoteKeys=new Set(),cloudHashes=new Map(),cloudAssetPaths=new Map();

document.body.insertAdjacentHTML('beforeend',`<section class="cloud-auth" id="cloudAuth"><form class="cloud-login" id="cloudLogin"><div class="cloud-mark">S</div><small>SKINATOR SHARED CONTROL ROOM</small><h1>Team sign in</h1><p>Use the account approved for this production tracker.</p><label>EMAIL<input id="cloudEmail" type="email" required autocomplete="email"></label><label>PASSWORD<input id="cloudPassword" type="password" required autocomplete="current-password"></label><button class="btn red" type="submit">SIGN IN</button><p class="cloud-error" id="cloudError"></p></form></section><div class="cloud-bar" id="cloudBar" hidden><i class="cloud-dot"></i><div><b id="cloudState">CONNECTED</b><small id="cloudIdentity"></small><small class="cloud-online" id="cloudOnline">1 ONLINE</small></div><button class="cloud-logout" id="cloudLogout">SIGN OUT</button></div><section class="cloud-migrate" id="cloudMigrate" hidden><div><b>SUPABASE IS EMPTY</b><p>Your local tracker is still safe. Upload its current characters, modifiers, NPCs, Parasytes and calendar to create the shared version.</p></div><button class="btn red" id="cloudUploadLocal">UPLOAD LOCAL TRACKER</button></section>`);

const cloudSetState=(label,synced=false)=>{const bar=$('cloudBar');$('cloudState').textContent=label;bar.classList.toggle('synced',synced)};
const cloudStable=value=>JSON.stringify(value,Object.keys(value||{}).sort());
const cloudAssetFields={character:['mainGif','petImage'],modifier:['iconData'],npc:['image'],parasyte:['gif']};
const cloudMimeExtension=mime=>({'image/gif':'gif','image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg'})[mime]||'bin';
const cloudSafe=value=>String(value||'asset').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'asset';

async function cloudUploadDataUrl(value,kind,id,label){
  const blob=await fetch(value).then(r=>r.blob()),path=`${kind}/${cloudSafe(id)}/${Date.now()}-${crypto.randomUUID()}-${cloudSafe(label)}.${cloudMimeExtension(blob.type)}`;
  const {error}=await cloudClient.storage.from(CLOUD_CONFIG.bucket).upload(path,blob,{contentType:blob.type,cacheControl:'3600'});if(error)throw error;return`storage://${path}`;
}
async function cloudSerialize(kind,id,source){
  const data=structuredClone(source),fields=cloudAssetFields[kind]||[];
  for(const field of fields){const value=data[field],assetKey=`${kind}:${id}:${field}`;if(typeof value==='string'&&value.startsWith('data:')){data[field]=await cloudUploadDataUrl(value,kind,id,field);cloudAssetPaths.set(assetKey,data[field].slice(10))}else if(cloudAssetPaths.has(assetKey))data[field]=`storage://${cloudAssetPaths.get(assetKey)}`;delete data[`${field}StoragePath`]}
  if(kind==='character')for(const [index,v] of (data.variants||[]).entries()){const variantKey=`${kind}:${id}:variant:${v.id||index}`;if(typeof v.gif==='string'&&v.gif.startsWith('data:')){v.gif=await cloudUploadDataUrl(v.gif,kind,id,v.name||`variant-${index+1}`);cloudAssetPaths.set(variantKey,v.gif.slice(10))}else if(cloudAssetPaths.has(variantKey))v.gif=`storage://${cloudAssetPaths.get(variantKey)}`;delete v.gifStoragePath}
  return data;
}
async function cloudSigned(path){const {data,error}=await cloudClient.storage.from(CLOUD_CONFIG.bucket).createSignedUrl(path,60*60*24);if(error)throw error;return data.signedUrl}
async function cloudHydrate(kind,source){
  const data=structuredClone(source),fields=cloudAssetFields[kind]||[];
  for(const field of fields){const value=data[field];if(typeof value==='string'&&value.startsWith('storage://')){const path=value.slice(10);cloudAssetPaths.set(`${kind}:${data.id}:${field}`,path);data[`${field}StoragePath`]=path;data[field]=await cloudSigned(path)}}
  if(kind==='character')for(const [index,v] of (data.variants||[]).entries()){if(typeof v.gif==='string'&&v.gif.startsWith('storage://')){const path=v.gif.slice(10);cloudAssetPaths.set(`${kind}:${data.id}:variant:${v.id||index}`,path);v.gifStoragePath=path;v.gif=await cloudSigned(path)}}
  return data;
}
function cloudRecords(){return[{kind:'character',items:state.characters},{kind:'modifier',items:state.modifiers},{kind:'npc',items:state.npcs},{kind:'parasyte',items:parasytes},{kind:'outreach',items:outreachRecords},{kind:'publisher',items:publisherRecords},{kind:'idea',items:ideaRecords},{kind:'idea_category',items:ideaCategoryRecords},{kind:'ongoing_task',items:ongoingTaskRecords},{kind:'task_option',items:taskOptionRecords}]}
async function cloudSaveNow(force=false){
  if(!cloudReady||!['owner','editor'].includes(cloudRole)||cloudSaving)return;cloudSaving=true;cloudSetState('SAVING…');
  try{
    const rows=[],current=new Set();
    for(const group of cloudRecords())for(const item of group.items){const key=`${group.kind}:${item.id}`,data=await cloudSerialize(group.kind,item.id,item),hash=JSON.stringify(data);current.add(key);if(force||cloudHashes.get(key)!==hash){rows.push({id:String(item.id),record_type:group.kind,data,updated_by:cloudUser.id});cloudHashes.set(key,hash)}}
    if(rows.length){const {error}=await cloudClient.from('skinator_records').upsert(rows,{onConflict:'record_type,id'});if(error)throw error}
    const removed=[...cloudRemoteKeys].filter(key=>!current.has(key));for(const key of removed){const split=key.indexOf(':'),kind=key.slice(0,split),id=key.slice(split+1),{error}=await cloudClient.from('skinator_records').delete().eq('record_type',kind).eq('id',id);if(error)throw error;cloudRemoteKeys.delete(key);cloudHashes.delete(key)}
    current.forEach(key=>cloudRemoteKeys.add(key));const {error:plannerError}=await cloudClient.from('skinator_planner').upsert({id:'main',data:planner,updated_by:cloudUser.id},{onConflict:'id'});if(plannerError)throw plannerError;cloudServerSignature=await cloudReadSignature();cloudSetState('ALL CHANGES SAVED',true);
  }catch(error){console.error(error);cloudSetState('SYNC ERROR');toast(`CLOUD SAVE FAILED — ${error.message||'CHECK CONNECTION'}`)}finally{cloudSaving=false}
}
window.skinatorCloudSave=()=>{clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>{cloudTimer=null;cloudSaveNow(false)},700)};

const cloudMakeSignature=(rows,plannerUpdated='')=>`${rows.map(row=>`${row.record_type}:${row.id}:${row.updated_at}`).sort().join('|')}|planner:${plannerUpdated||''}`;
async function cloudReadSignature(){const [{data:rows,error},{data:plan,error:planError}]=await Promise.all([cloudClient.from('skinator_records').select('id,record_type,updated_at'),cloudClient.from('skinator_planner').select('updated_at').eq('id','main').maybeSingle()]);if(error)throw error;if(planError)throw planError;return cloudMakeSignature(rows,plan?.updated_at)}
function cloudScheduleReload(){clearTimeout(cloudReloadTimer);cloudReloadTimer=setTimeout(async()=>{cloudReloadTimer=null;if(cloudSaving||cloudTimer||document.querySelector('dialog[open]'))return;try{await cloudLoad(true)}catch(error){console.error(error);cloudSetState('SYNC ERROR')}},700)}
async function cloudCheckUpdates(){if(!cloudReady||cloudSaving||cloudTimer||document.querySelector('dialog[open]'))return;try{const signature=await cloudReadSignature();if(cloudServerSignature&&signature!==cloudServerSignature)cloudScheduleReload()}catch(error){console.error(error)}}
function cloudStartPresence(displayName){
  cloudPresenceChannel=cloudClient.channel('skinator-team-online',{config:{presence:{key:cloudUser.id}}});
  cloudPresenceChannel.on('presence',{event:'sync'},()=>{const presences=Object.values(cloudPresenceChannel.presenceState()).flat(),people=[...new Map(presences.map(p=>[p.user_id,p])).values()],names=people.map(p=>p.name).filter(Boolean);$('cloudOnline').textContent=`${people.length} ONLINE${names.length?` // ${names.join(', ')}`:''}`;$('cloudOnline').title=names.join(', ')}).on('postgres_changes',{event:'*',schema:'public',table:'skinator_records'},cloudScheduleReload).on('postgres_changes',{event:'*',schema:'public',table:'skinator_planner'},cloudScheduleReload).subscribe(async status=>{if(status==='SUBSCRIBED')await cloudPresenceChannel.track({user_id:cloudUser.id,name:displayName,role:cloudRole,online_at:new Date().toISOString()})});
}

async function cloudLoad(isRefresh=false){
  cloudSetState('LOADING…');const {data:rows,error}=await cloudClient.from('skinator_records').select('id,record_type,data,updated_at');if(error)throw error;
  if(!rows.length){cloudReady=true;$('cloudMigrate').hidden=false;cloudSetState('READY FOR FIRST UPLOAD');return}
  cloudRemoteKeys.clear();cloudHashes.clear();cloudAssetPaths.clear();const grouped={character:[],modifier:[],npc:[],parasyte:[],outreach:[],publisher:[],idea:[],idea_category:[],ongoing_task:[],task_option:[]};for(const row of rows){const key=`${row.record_type}:${row.id}`;cloudRemoteKeys.add(key);cloudHashes.set(key,JSON.stringify(row.data));grouped[row.record_type]?.push(await cloudHydrate(row.record_type,row.data))}
  state.characters=grouped.character;state.modifiers=grouped.modifier;ensureSpawnModifiersInState();state.npcs=grouped.npc;parasytes=grouped.parasyte;
  const {data:plan,error:planError}=await cloudClient.from('skinator_planner').select('data,updated_at').eq('id','main').maybeSingle();if(planError)throw planError;if(plan?.data){Object.keys(planner).forEach(k=>delete planner[k]);Object.assign(planner,plan.data)}const businessInitialized=!!planner.businessInitialized,categoriesInitialized=!!planner.ideaCategoriesInitialized,tasksInitialized=!!planner.ongoingTasksInitialized,optionsInitialized=!!planner.taskOptionsInitialized,needsIdeaMigration=(planner.ideaSeedRevision||0)<IDEA_SEED_REVISION,recoveredMissingBusiness=(!grouped.outreach.length&&outreachRecords.length)||(!grouped.idea.length&&ideaRecords.length)||(!grouped.idea_category.length&&ideaCategoryRecords.length)||(!grouped.ongoing_task.length&&ongoingTaskRecords.length)||(!grouped.task_option.length&&taskOptionRecords.length);if(grouped.outreach.length)outreachRecords=grouped.outreach;if(grouped.publisher.length)publisherRecords=grouped.publisher;if(grouped.idea.length)ideaRecords=grouped.idea;if(grouped.idea_category.length)ideaCategoryRecords=grouped.idea_category;if(grouped.ongoing_task.length)ongoingTaskRecords=grouped.ongoing_task;if(grouped.task_option.length)taskOptionRecords=grouped.task_option;if(needsIdeaMigration){mergeLatestIdeaSeed();planner.ideaSeedRevision=IDEA_SEED_REVISION}if(!businessInitialized)planner.businessInitialized=true;if(!categoriesInitialized)planner.ideaCategoriesInitialized=true;if(!tasksInitialized)planner.ongoingTasksInitialized=true;if(!optionsInitialized)planner.taskOptionsInitialized=true;localStorage.setItem(BUSINESS_KEY,JSON.stringify({outreach:outreachRecords,publishers:publisherRecords,ideas:ideaRecords,ideaCategories:ideaCategoryRecords,ongoingTasks:ongoingTaskRecords,taskOptions:taskOptionRecords,ideaSeedRevision:IDEA_SEED_REVISION}));cloudServerSignature=cloudMakeSignature(rows,plan?.updated_at);
  cloudReady=true;render();renderParasytes();renderTracker();renderBusiness();cloudSetState('ALL CHANGES SAVED',true);toast(isRefresh?'TEAM CHANGES LOADED':'SHARED TRACKER LOADED');if(!businessInitialized||!categoriesInitialized||!tasksInitialized||!optionsInitialized||recoveredMissingBusiness||needsIdeaMigration)window.skinatorCloudSave();
}
async function cloudStart(session){
  await window.skinatorLocalReady;
  cloudUser=session.user;const {data:membership,error}=await cloudClient.from('skinator_team_members').select('role,display_name').eq('user_id',cloudUser.id).single();if(error){await cloudClient.auth.signOut();throw Error('THIS ACCOUNT IS NOT APPROVED FOR SKINATOR')}
  const displayName=membership.display_name||'TEAM MEMBER';cloudRole=membership.role;$('cloudAuth').hidden=true;$('cloudBar').hidden=false;$('cloudIdentity').textContent=`${displayName} // ${cloudRole.toUpperCase()}`;await cloudLoad();cloudStartPresence(displayName);setInterval(cloudCheckUpdates,10000);
}
$('cloudLogin').onsubmit=async event=>{event.preventDefault();$('cloudError').textContent='SIGNING IN…';const {data,error}=await cloudClient.auth.signInWithPassword({email:$('cloudEmail').value.trim(),password:$('cloudPassword').value});if(error){$('cloudError').textContent=error.message.toUpperCase();return}try{await cloudStart(data.session)}catch(startError){$('cloudError').textContent=startError.message}};
$('cloudLogout').onclick=async()=>{await cloudClient.auth.signOut();location.reload()};
$('cloudUploadLocal').onclick=async()=>{if(!confirm('Upload this local tracker as the first shared Supabase database?'))return;$('cloudMigrate').hidden=true;await cloudSaveNow(true);if(cloudHashes.size)toast('LOCAL TRACKER UPLOADED TO SUPABASE')};

if(!cloudClient){$('cloudError').textContent='SUPABASE CLIENT COULD NOT START'}else cloudClient.auth.getSession().then(async({data})=>{if(data.session)try{await cloudStart(data.session)}catch(error){$('cloudError').textContent=error.message}});
}
