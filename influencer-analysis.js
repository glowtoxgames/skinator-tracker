const INFLUENCER_ANALYSIS_KEY='influencerAnalysisInitialized';
const INFLUENCER_NOTE_FIELDS=[
  {key:'overall',label:'Overall Notes'},
  {key:'positive',label:'Positive Notes'},
  {key:'negative',label:'Negative Notes'},
  {key:'directFeedback',label:'Direct Feedback Notes'}
];
let editingInfluencerCreatorId=null,editingInfluencerVideoId=null;

function ensureInfluencerAnalysisSeed({persist=true}={}){
  if(!Array.isArray(planner.influencerCreators))planner.influencerCreators=[];
  if(!Array.isArray(planner.influencerVideos))planner.influencerVideos=[];
  if(planner[INFLUENCER_ANALYSIS_KEY])return false;
  planner.influencerCreators=structuredClone(INFLUENCER_ANALYSIS_SEED.creators);
  planner.influencerVideos=structuredClone(INFLUENCER_ANALYSIS_SEED.videos);
  planner[INFLUENCER_ANALYSIS_KEY]=true;
  if(persist&&!publishedSnapshot)savePlanner();
  return true;
}
ensureInfluencerAnalysisSeed();

const influencerCreators=()=>planner.influencerCreators||[];
const influencerVideos=()=>planner.influencerVideos||[];
const influencerNormalize=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
const influencerDisplayDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'DATE NOT SET';
const influencerSafeLink=value=>{try{const url=new URL(value);return['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}};
const influencerNumber=value=>{const text=String(value||'').trim().toUpperCase().replaceAll(',','');const match=text.match(/^([0-9.]+)\s*([KM])?$/);if(!match)return 0;return Number(match[1])*(match[2]==='M'?1e6:match[2]==='K'?1e3:1)};
const influencerScore=value=>{const score=Number(String(value||'').replace(/[^0-9.]/g,''));return Number.isFinite(score)&&score>=0&&score<=10?score:null};
const influencerVideoAverage=video=>{const scores=INFLUENCER_VIDEO_FIELDS.filter(field=>field.group==='scores').map(field=>influencerScore(video.values?.[field.key])).filter(value=>value!==null);return scores.length?scores.reduce((sum,value)=>sum+value,0)/scores.length:null};

document.querySelector('aside nav').insertAdjacentHTML('beforeend','<button class="nav" data-tab="influencerAnalysis"><i>▶</i> VIDEO ANALYSIS <span id="navInfluencerCount">0</span></button>');
const influencerNav=document.querySelector('.nav[data-tab="influencerAnalysis"]');
document.querySelector('.nav[data-tab="outreach"]')?.insertAdjacentElement('afterend',influencerNav);

document.querySelector('main').insertAdjacentHTML('beforeend',`
<section id="influencerAnalysisView" hidden>
  <div class="stats influencer-stats">
    <article><label>CREATORS</label><b id="influencerCreatorCount">0</b><small>ANALYSIS FILES</small></article>
    <article><label>VIDEOS</label><b id="influencerVideoCount">0</b><small>REGISTERED SESSIONS</small></article>
    <article><label>RETURNING CREATORS</label><b id="influencerRepeatCount">0</b><small>MULTIPLE VIDEOS</small></article>
    <article><label>AVERAGE ENJOYMENT</label><b id="influencerEnjoymentAverage">—</b><small>FROM SCORED VIDEOS</small></article>
  </div>
  <section class="panel influencer-panel">
    <div class="toolbar influencer-toolbar">
      <label class="search">⌕ <input id="influencerSearch" placeholder="SEARCH CREATORS, VIDEOS OR NOTES"></label>
      <select id="influencerSort" class="toolbar-select">
        <option value="name-asc">CREATOR // A–Z</option>
        <option value="name-desc">CREATOR // Z–A</option>
        <option value="videos-desc">MOST VIDEOS</option>
        <option value="date-desc">NEWEST VIDEO</option>
      </select>
      <span id="influencerResultCount"></span>
    </div>
    <div id="influencerCreatorList" class="influencer-creator-list"></div>
    <div id="influencerEmpty" class="empty" hidden><i>▶</i><h2>NO CREATOR ANALYSIS FOUND</h2><p>Create a creator file and add their first video.</p></div>
  </section>
</section>`);

document.body.insertAdjacentHTML('beforeend',`
<dialog id="influencerCreatorDialog" class="influencer-creator-dialog">
  <form id="influencerCreatorForm">
    <div class="dialog-head"><div><p>INFLUENCER VIDEO ANALYSIS</p><h2 id="influencerCreatorDialogTitle">New Creator</h2></div><button type="button" class="x influencer-creator-close">×</button></div>
    <div class="dialog-body"><label>CREATOR / YOUTUBER NAME *<input id="influencerCreatorName" required placeholder="CREATOR NAME"></label></div>
    <div class="dialog-actions"><button type="button" class="btn danger" id="deleteInfluencerCreator" hidden>DELETE CREATOR</button><span></span><button type="button" class="btn ghost influencer-creator-close">CANCEL</button><button class="btn red" type="submit">SAVE CREATOR</button></div>
  </form>
</dialog>
<dialog id="influencerVideoDialog" class="influencer-video-dialog">
  <form id="influencerVideoForm">
    <div class="dialog-head"><div><p>VIDEO ANALYSIS FILE</p><h2 id="influencerVideoDialogTitle">New Video</h2></div><button type="button" class="x influencer-video-close">×</button></div>
    <div class="dialog-body influencer-video-editor">
      <section class="influencer-form-section"><div class="influencer-section-title"><span>01</span><div><h3>VIDEO DETAILS</h3><p>Identify the creator and the performance of this video.</p></div></div><div class="influencer-meta-grid"><label>CREATOR *<select id="influencerVideoCreator" required></select></label><label>VIDEO DATE<input id="influencerVideoDate" type="date"></label><label>SUBSCRIBERS<input id="influencerSubscribers" placeholder="e.g. 24.2K"></label><label>VIDEO VIEWS<input id="influencerViews" placeholder="e.g. 60K"></label><label class="influencer-link-field">VIDEO LINK<input id="influencerVideoLink" type="url" placeholder="https://youtube.com/watch?v=..."></label></div></section>
      <section class="influencer-form-section"><div class="influencer-section-title"><span>02</span><div><h3>SCORES</h3><p>Use your existing 1–10 scale, or enter N/A when a score does not apply.</p></div></div><div id="influencerScoreFields" class="influencer-field-grid score-fields"></div></section>
      <section class="influencer-form-section"><div class="influencer-section-title"><span>03</span><div><h3>SESSION SIGNALS</h3><p>Record fights and the creator's direct or implied intent.</p></div></div><div id="influencerSessionFields" class="influencer-field-grid"></div></section>
      <section class="influencer-form-section"><div class="influencer-section-title"><span>04</span><div><h3>VIDEO TIMELINE</h3><p>Enter timestamps, Yes / No, Not reached, or any useful observation.</p></div></div><div id="influencerTimelineFields" class="influencer-field-grid timeline-fields"></div></section>
      <section class="influencer-form-section"><div class="influencer-section-title"><span>05</span><div><h3>QUOTES & NOTES</h3><p>Capture the overall reading and the creator's most useful feedback.</p></div></div><div id="influencerNoteFields" class="influencer-note-grid"></div></section>
    </div>
    <div class="dialog-actions"><button type="button" class="btn danger" id="deleteInfluencerVideo" hidden>DELETE VIDEO</button><span></span><button type="button" class="btn ghost influencer-video-close">CANCEL</button><button class="btn red" type="submit">SAVE VIDEO</button></div>
  </form>
</dialog>`);

function influencerFieldInput(field){
  const placeholder=field.group==='scores'?'1–10 OR N/A':field.key==='totalFights'?'e.g. 10+':field.key.startsWith('says')?'YES / IMPLICIT YES / NO':'TIMESTAMP / RESULT';
  return `<label>${escapeHtml(field.label.toUpperCase())}<input data-influencer-field="${field.key}" placeholder="${placeholder}"></label>`;
}
$('influencerScoreFields').innerHTML=INFLUENCER_VIDEO_FIELDS.filter(field=>field.group==='scores').map(influencerFieldInput).join('');
$('influencerSessionFields').innerHTML=INFLUENCER_VIDEO_FIELDS.filter(field=>field.group==='session').map(influencerFieldInput).join('');
$('influencerTimelineFields').innerHTML=INFLUENCER_VIDEO_FIELDS.filter(field=>field.group==='timeline').map(influencerFieldInput).join('');
$('influencerNoteFields').innerHTML=INFLUENCER_NOTE_FIELDS.map(field=>`<label>${field.label.toUpperCase()}<textarea data-influencer-note="${field.key}" rows="7"></textarea></label>`).join('');

function saveInfluencerAnalysis(){
  planner[INFLUENCER_ANALYSIS_KEY]=true;
  savePlanner();
}
function influencerCreatorVideos(creatorId){return influencerVideos().filter(video=>video.creatorId===creatorId)}
function influencerLatestDate(creatorId){return influencerCreatorVideos(creatorId).map(video=>video.date||'').sort().at(-1)||''}
function influencerMatches(creator,query){
  if(!query)return true;
  const videos=influencerCreatorVideos(creator.id);
  return `${creator.name} ${videos.map(video=>`${video.date} ${video.subscribers} ${video.views} ${video.videoLink} ${Object.values(video.values||{}).join(' ')} ${Object.values(video.notes||{}).join(' ')}`).join(' ')}`.toLowerCase().includes(query);
}
function influencerMetricRows(video){
  return INFLUENCER_VIDEO_FIELDS.filter(field=>String(video.values?.[field.key]||'').trim()).map(field=>`<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(video.values[field.key])}</dd></div>`).join('');
}
function influencerNotesPreview(video){
  const notes=INFLUENCER_NOTE_FIELDS.filter(field=>String(video.notes?.[field.key]||'').trim());
  return notes.length?`<section class="influencer-notes-preview">${notes.map(field=>`<article><h5>${escapeHtml(field.label)}</h5><p>${escapeHtml(video.notes[field.key])}</p></article>`).join('')}</section>`:'<p class="influencer-no-notes">NO QUOTES OR NOTES REGISTERED</p>';
}
function influencerVideoCard(video,index){
  const average=influencerVideoAverage(video),link=influencerSafeLink(video.videoLink),scores=INFLUENCER_VIDEO_FIELDS.filter(field=>field.group==='scores'&&String(video.values?.[field.key]||'').trim());
  return `<article class="influencer-video-card" data-video-id="${video.id}">
    <div class="influencer-video-head"><div><small>VIDEO ${String(index+1).padStart(2,'0')} // ${escapeHtml(influencerDisplayDate(video.date).toUpperCase())}</small><h4>${escapeHtml(video.views||'—')} VIEWS</h4></div><div class="influencer-video-actions">${link?`<a href="${escapeHtml(link)}" target="_blank" rel="noopener">WATCH ↗</a>`:''}<button type="button" data-edit-influencer-video="${video.id}">EDIT</button></div></div>
    <div class="influencer-video-meta"><span><b>${escapeHtml(video.subscribers||'—')}</b> SUBSCRIBERS</span><span><b>${average===null?'—':average.toFixed(1)}</b> SCORE AVG</span><span><b>${escapeHtml(video.values?.totalFights||'—')}</b> FIGHTS</span></div>
    <div class="influencer-score-strip">${scores.map(field=>`<span title="${escapeHtml(field.label)}"><i>${escapeHtml(field.label)}</i><b>${escapeHtml(video.values[field.key])}</b></span>`).join('')}</div>
    <details class="influencer-analysis-details"><summary>VIEW FULL ANALYSIS <span>＋</span></summary><dl>${influencerMetricRows(video)}</dl>${influencerNotesPreview(video)}</details>
  </article>`;
}
function renderInfluencerAnalysis(){
  ensureInfluencerAnalysisSeed({persist:false});
  const creators=influencerCreators(),videos=influencerVideos(),query=($('influencerSearch')?.value||'').trim().toLowerCase(),sort=$('influencerSort')?.value||'name-asc';
  const rows=creators.filter(creator=>influencerMatches(creator,query)).sort((left,right)=>{
    if(sort==='name-desc')return right.name.localeCompare(left.name,undefined,{sensitivity:'base'});
    if(sort==='videos-desc')return influencerCreatorVideos(right.id).length-influencerCreatorVideos(left.id).length||left.name.localeCompare(right.name);
    if(sort==='date-desc')return influencerLatestDate(right.id).localeCompare(influencerLatestDate(left.id))||left.name.localeCompare(right.name);
    return left.name.localeCompare(right.name,undefined,{sensitivity:'base'});
  });
  const enjoymentScores=videos.map(video=>influencerScore(video.values?.overallEnjoyment)).filter(value=>value!==null);
  $('influencerCreatorCount').textContent=creators.length;
  $('navInfluencerCount').textContent=videos.length;
  $('influencerVideoCount').textContent=videos.length;
  $('influencerRepeatCount').textContent=creators.filter(creator=>influencerCreatorVideos(creator.id).length>1).length;
  $('influencerEnjoymentAverage').textContent=enjoymentScores.length?(enjoymentScores.reduce((sum,value)=>sum+value,0)/enjoymentScores.length).toFixed(1):'—';
  $('influencerResultCount').textContent=`${rows.length} CREATOR${rows.length===1?'':'S'} // ${rows.reduce((sum,creator)=>sum+influencerCreatorVideos(creator.id).length,0)} VIDEOS`;
  $('influencerEmpty').hidden=rows.length>0;
  $('influencerCreatorList').innerHTML=rows.map(creator=>{
    const creatorVideos=influencerCreatorVideos(creator.id).sort((left,right)=>(right.date||'').localeCompare(left.date||''));
    const latest=creatorVideos[0]?.date||'';
    return `<details class="influencer-creator-card" open data-creator-id="${creator.id}"><summary><span class="influencer-avatar">${escapeHtml((creator.name||'?').trim().charAt(0).toUpperCase())}</span><div><small>CREATOR ANALYSIS FILE</small><h2>${escapeHtml(creator.name)}</h2><p>${creatorVideos.length} VIDEO${creatorVideos.length===1?'':'S'}${latest?` // LATEST ${escapeHtml(influencerDisplayDate(latest).toUpperCase())}`:''}</p></div><span class="influencer-collapse">⌄</span></summary><div class="influencer-creator-actions"><button type="button" data-add-influencer-video="${creator.id}">＋ ADD VIDEO</button><button type="button" data-edit-influencer-creator="${creator.id}">EDIT CREATOR</button></div><div class="influencer-video-list">${creatorVideos.length?creatorVideos.map(influencerVideoCard).join(''):'<div class="influencer-video-empty">NO VIDEOS YET // ADD THE FIRST ANALYSIS</div>'}</div></details>`;
  }).join('');
  document.querySelectorAll('[data-add-influencer-video]').forEach(button=>button.onclick=()=>openInfluencerVideo(null,button.dataset.addInfluencerVideo));
  document.querySelectorAll('[data-edit-influencer-creator]').forEach(button=>button.onclick=()=>openInfluencerCreator(button.dataset.editInfluencerCreator));
  document.querySelectorAll('[data-edit-influencer-video]').forEach(button=>button.onclick=()=>openInfluencerVideo(button.dataset.editInfluencerVideo));
}

function openInfluencerCreator(id=null){
  const creator=id?influencerCreators().find(item=>item.id===id):null;
  if(id&&!creator)return;
  editingInfluencerCreatorId=creator?.id||null;
  $('influencerCreatorForm').reset();
  $('influencerCreatorDialogTitle').textContent=creator?'Edit Creator':'New Creator';
  $('influencerCreatorName').value=creator?.name||'';
  $('deleteInfluencerCreator').hidden=!creator;
  $('influencerCreatorDialog').showModal();
  $('influencerCreatorName').focus();
}
function openInfluencerVideo(id=null,creatorId=''){
  const video=id?influencerVideos().find(item=>item.id===id):null;
  if(id&&!video)return;
  editingInfluencerVideoId=video?.id||null;
  $('influencerVideoForm').reset();
  $('influencerVideoDialogTitle').textContent=video?'Edit Video Analysis':'New Video Analysis';
  $('influencerVideoCreator').innerHTML=influencerCreators().slice().sort((left,right)=>left.name.localeCompare(right.name)).map(creator=>`<option value="${creator.id}">${escapeHtml(creator.name)}</option>`).join('');
  $('influencerVideoCreator').value=video?.creatorId||creatorId||influencerCreators()[0]?.id||'';
  $('influencerVideoDate').value=video?.date||'';
  $('influencerSubscribers').value=video?.subscribers||'';
  $('influencerViews').value=video?.views||'';
  $('influencerVideoLink').value=video?.videoLink||'';
  document.querySelectorAll('[data-influencer-field]').forEach(input=>input.value=video?.values?.[input.dataset.influencerField]||'');
  document.querySelectorAll('[data-influencer-note]').forEach(input=>input.value=video?.notes?.[input.dataset.influencerNote]||'');
  $('deleteInfluencerVideo').hidden=!video;
  $('influencerVideoDialog').showModal();
}

$('influencerSearch').oninput=renderInfluencerAnalysis;
$('influencerSort').onchange=renderInfluencerAnalysis;
document.querySelectorAll('.influencer-creator-close').forEach(button=>button.onclick=()=>$('influencerCreatorDialog').close());
document.querySelectorAll('.influencer-video-close').forEach(button=>button.onclick=()=>$('influencerVideoDialog').close());
$('influencerCreatorForm').onsubmit=event=>{
  event.preventDefault();
  if(!event.currentTarget.reportValidity())return;
  const name=$('influencerCreatorName').value.trim(),duplicate=influencerCreators().find(creator=>creator.id!==editingInfluencerCreatorId&&influencerNormalize(creator.name)===influencerNormalize(name));
  if(duplicate)return toast('THAT CREATOR ALREADY EXISTS');
  const existing=influencerCreators().find(creator=>creator.id===editingInfluencerCreatorId),now=new Date().toISOString(),record=existing||{id:`influencer-${crypto.randomUUID()}`,createdAt:now};
  record.name=name;record.updatedAt=now;
  if(!existing)planner.influencerCreators=[record,...influencerCreators()];
  saveInfluencerAnalysis();renderInfluencerAnalysis();$('influencerCreatorDialog').close();toast(existing?'CREATOR UPDATED':'CREATOR CREATED');
};
$('deleteInfluencerCreator').onclick=()=>{
  const creator=influencerCreators().find(item=>item.id===editingInfluencerCreatorId);if(!creator)return;
  const count=influencerCreatorVideos(creator.id).length;
  if(!confirm(`Delete ${creator.name} and ${count} video${count===1?'':'s'}?`))return;
  planner.influencerCreators=influencerCreators().filter(item=>item.id!==creator.id);
  planner.influencerVideos=influencerVideos().filter(video=>video.creatorId!==creator.id);
  saveInfluencerAnalysis();renderInfluencerAnalysis();$('influencerCreatorDialog').close();toast('CREATOR AND VIDEOS DELETED');
};
$('influencerVideoForm').onsubmit=event=>{
  event.preventDefault();
  if(!event.currentTarget.reportValidity())return;
  const existing=influencerVideos().find(video=>video.id===editingInfluencerVideoId),now=new Date().toISOString(),record=existing||{id:`influencer-video-${crypto.randomUUID()}`,createdAt:now};
  record.creatorId=$('influencerVideoCreator').value;
  record.date=$('influencerVideoDate').value;
  record.subscribers=$('influencerSubscribers').value.trim();
  record.views=$('influencerViews').value.trim();
  record.videoLink=$('influencerVideoLink').value.trim();
  record.values=Object.fromEntries([...document.querySelectorAll('[data-influencer-field]')].map(input=>[input.dataset.influencerField,input.value.trim()]));
  record.notes=Object.fromEntries([...document.querySelectorAll('[data-influencer-note]')].map(input=>[input.dataset.influencerNote,input.value.trim()]));
  record.updatedAt=now;
  if(!existing)planner.influencerVideos=[record,...influencerVideos()];
  saveInfluencerAnalysis();renderInfluencerAnalysis();$('influencerVideoDialog').close();toast(existing?'VIDEO ANALYSIS UPDATED':'VIDEO ANALYSIS CREATED');
};
$('deleteInfluencerVideo').onclick=()=>{
  const video=influencerVideos().find(item=>item.id===editingInfluencerVideoId);if(!video||!confirm(`Delete the video analysis from ${influencerDisplayDate(video.date)}?`))return;
  planner.influencerVideos=influencerVideos().filter(item=>item.id!==video.id);
  saveInfluencerAnalysis();renderInfluencerAnalysis();$('influencerVideoDialog').close();toast('VIDEO ANALYSIS DELETED');
};

const influencerPreviousSetTab=setTab;
setTab=function(tab){
  $('influencerAnalysisView').hidden=tab!=='influencerAnalysis';
  if(tab!=='influencerAnalysis'){influencerPreviousSetTab(tab);return}
  state.tab=tab;
  document.querySelectorAll('.nav[data-tab]').forEach(nav=>nav.classList.toggle('active',nav.dataset.tab===tab));
  ['charactersView','modifiersView','npcsView','trackerView','parasytesView','achievementsView'].forEach(id=>{const view=$(id);if(view)view.hidden=true});
  document.querySelectorAll('.business-view').forEach(view=>view.hidden=true);
  $('pageTitle').textContent='Influencer Video Analysis';
  $('breadcrumb').textContent='LET\'S PLAY RESEARCH';
  $('pageSubtitle').textContent='Track creator reach, video performance, comprehension, reactions, milestones, quotes and feedback.';
  $('createBtn').hidden=!!publishedSnapshot;
  $('createBtn').textContent='＋ NEW CREATOR';
  $('createBtn').onclick=()=>openInfluencerCreator();
  renderInfluencerAnalysis();
};
influencerNav.onclick=()=>setTab('influencerAnalysis');
renderInfluencerAnalysis();
window.addEventListener('skinator-cloud-ready',event=>{
  if(event.detail?.ready)renderInfluencerAnalysis();
});
