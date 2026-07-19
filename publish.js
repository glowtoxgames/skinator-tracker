const PUBLISH_SNAPSHOT=window.SKINATOR_PUBLISHED_SNAPSHOT;

function enablePublishedView(){
  if(!PUBLISH_SNAPSHOT)return;
  document.body.classList.add('published-snapshot');
  document.body.insertAdjacentHTML('afterbegin',`<div class="publish-banner">READ-ONLY PUBLISHED SNAPSHOT // ${new Date(PUBLISH_SNAPSHOT.publishedAt).toLocaleString()}</div>`);
  document.querySelector('.save-state b').textContent='PUBLISHED SNAPSHOT';
  document.querySelector('.save-state small').textContent='View only';
  ['importBtn','exportBtn','createBtn','inlineNewTask'].forEach(id=>{const el=$(id);if(el)el.hidden=true});
  document.querySelectorAll('dialog form').forEach(form=>{
    form.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=true);
    form.querySelectorAll('button[type="submit"],.danger,.remove,.mini').forEach(el=>el.hidden=true);
  });
  document.addEventListener('dragstart',e=>{if(e.target.closest('.planner-task'))e.preventDefault()},true);
  document.addEventListener('submit',e=>{e.preventDefault();toast('THIS PUBLISHED SNAPSHOT IS VIEW ONLY')},true);
}

function crc32(bytes){let crc=-1;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return(crc^-1)>>>0}
const u16=(view,offset,value)=>view.setUint16(offset,value,true);
const u32=(view,offset,value)=>view.setUint32(offset,value,true);
function zipDate(date=new Date()){const year=Math.max(1980,date.getFullYear());return{time:(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),date:((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate()}}
async function makeZip(entries){
  const encoder=new TextEncoder(),locals=[],centrals=[];let offset=0;
  for(const entry of entries){
    const name=encoder.encode(entry.name),bytes=entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer()),crc=crc32(bytes),stamp=zipDate(),local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
    u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x0800);u16(lv,8,0);u16(lv,10,stamp.time);u16(lv,12,stamp.date);u32(lv,14,crc);u32(lv,18,bytes.length);u32(lv,22,bytes.length);u16(lv,26,name.length);u16(lv,28,0);local.set(name,30);locals.push(local,bytes);
    const central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u16(cv,10,0);u16(cv,12,stamp.time);u16(cv,14,stamp.date);u32(cv,16,crc);u32(cv,20,bytes.length);u32(cv,24,bytes.length);u16(cv,28,name.length);u16(cv,30,0);u16(cv,32,0);u16(cv,34,0);u16(cv,36,0);u32(cv,38,0);u32(cv,42,offset);central.set(name,46);centrals.push(central);offset+=local.length+bytes.length;
  }
  const centralSize=centrals.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0,0x06054b50);u16(ev,4,0);u16(ev,6,0);u16(ev,8,entries.length);u16(ev,10,entries.length);u32(ev,12,centralSize);u32(ev,16,offset);u16(ev,20,0);return new Blob([...locals,...centrals,end],{type:'application/zip'});
}
function safeName(value){return String(value||'asset').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').toLowerCase()||'asset'}
function extensionFor(type){return({"image/gif":"gif","image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/svg+xml":"svg"})[type]||'bin'}
async function createPublishSnapshot(){
  const button=$('publishBtn');button.classList.add('publish-working');button.textContent='PACKAGING…';
  try{
    const database=structuredClone({schemaVersion:4,characters:state.characters,modifiers:state.modifiers,npcs:state.npcs}),publishedParasytes=structuredClone(parasytes),publishedPlanner=structuredClone(planner),publishedRoster=structuredClone(rosterView),entries=[],used=new Map();
    const extract=async(value,label)=>{if(typeof value!=='string'||!value.startsWith('data:'))return value;const blob=await fetch(value).then(r=>r.blob()),base=safeName(label),count=used.get(base)||0;used.set(base,count+1);const name=`snapshot-assets/${base}${count?`-${count+1}`:''}.${extensionFor(blob.type)}`;entries.push({name,data:blob});return name};
    for(const c of database.characters){c.mainGif=await extract(c.mainGif,`${c.fileName}-360`);c.petImage=await extract(c.petImage,`${c.fileName}-spawn`);for(const [i,v] of (c.variants||[]).entries())v.gif=await extract(v.gif,`${c.fileName}-${v.name||`variant-${i+1}`}`)}
    for(const m of database.modifiers)m.iconData=await extract(m.iconData,`modifier-${m.name}`);
    for(const n of database.npcs)n.image=await extract(n.image,`npc-${n.name}`);
    for(const p of publishedParasytes)p.gif=await extract(p.gif,`parasyte-${p.level}-${p.family}`);
    const snapshot={publishedAt:new Date().toISOString(),readOnly:true,database,parasytes:publishedParasytes,planner:publishedPlanner,rosterView:publishedRoster};
    entries.unshift({name:'snapshot-data.js',data:new Blob([`window.SKINATOR_PUBLISHED_SNAPSHOT=${JSON.stringify(snapshot)};\n`],{type:'text/javascript'})},{name:'.nojekyll',data:new Blob([''])},{name:'HOW-TO-PUBLISH.txt',data:new Blob(['SKINATOR PUBLISH SNAPSHOT\r\n\r\n1. Copy the complete skinator-tracker application folder into your GitHub repository.\r\n2. Extract this ZIP into that copied folder and replace snapshot-data.js.\r\n3. Commit and push with GitHub Desktop.\r\n4. Enable GitHub Pages from the main branch and root folder.\r\n\r\nThe published website will be read-only. Generate and extract a new snapshot whenever you want to update it.\r\n'])});
    const zip=await makeZip(entries),url=URL.createObjectURL(zip),a=document.createElement('a');a.href=url;a.download=`skinator-publish-snapshot-${new Date().toISOString().slice(0,10)}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);toast('PUBLISH SNAPSHOT READY');
  }catch(error){console.error(error);toast('PUBLISH SNAPSHOT FAILED')}
  finally{button.classList.remove('publish-working');button.textContent='⇩ PUBLISH SNAPSHOT'}
}

if(PUBLISH_SNAPSHOT)enablePublishedView();
else{
  const actions=document.querySelector('header .actions');actions?.insertAdjacentHTML('afterbegin','<button class="btn ghost" id="publishBtn" title="Create a read-only GitHub Pages snapshot">⇩ PUBLISH SNAPSHOT</button>');
  $('publishBtn').onclick=createPublishSnapshot;
}
