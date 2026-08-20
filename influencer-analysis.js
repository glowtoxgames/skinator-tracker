const INFLUENCER_ANALYSIS_KEY='influencerAnalysisInitialized';
const INFLUENCER_ANALYSIS_REVISION_KEY='influencerAnalysisDataRevision';
const INFLUENCER_NOTE_FIELDS=[
  {key:'overall',label:'Overall Notes'},
  {key:'positive',label:'Positive Notes'},
  {key:'negative',label:'Negative Notes'},
  {key:'directFeedback',label:'Direct Feedback Notes'}
];
const INFLUENCER_DEMO_VERSIONS=[
  {key:'playtest-demo',label:'PLAYTEST'},
  {key:'official-demo',label:'OFFICIAL DEMO'},
  {key:'demo-version',label:'DEMO VERSION'}
];
let editingInfluencerCreatorId=null,editingInfluencerVideoId=null;
let influencerViewMode='files';
const influencerNormalize=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,' ');
const influencerVersionLabel=value=>INFLUENCER_DEMO_VERSIONS.find(version=>version.key===value)?.label||'PLAYTEST';
function influencerVideoIdentity(value=''){
  try{const url=new URL(value),host=url.hostname.replace(/^www\./,'');if(host==='youtu.be')return`youtube:${url.pathname.split('/').filter(Boolean)[0]||''}`;if(host.endsWith('youtube.com'))return`youtube:${url.searchParams.get('v')||url.pathname}`;return`${url.origin}${url.pathname}`.toLowerCase()}catch{return influencerNormalize(value)}
}

function ensureInfluencerAnalysisSeed({persist=true}={}){
  if(!Array.isArray(planner.influencerCreators))planner.influencerCreators=[];
  if(!Array.isArray(planner.influencerVideos))planner.influencerVideos=[];
  const targetRevision=typeof INFLUENCER_ANALYSIS_DATA_REVISION==='number'?INFLUENCER_ANALYSIS_DATA_REVISION:1,currentRevision=Number(planner[INFLUENCER_ANALYSIS_REVISION_KEY]||0);
  const creators=planner.influencerCreators,videos=planner.influencerVideos;let changed=false;
  for(const video of videos){if(!video.versionPlayed){video.versionPlayed='playtest-demo';video.updatedAt=new Date().toISOString();changed=true}}
  if(planner[INFLUENCER_ANALYSIS_KEY]&&currentRevision>=targetRevision){if(changed&&persist&&!publishedSnapshot)savePlanner();return changed}
  for(const seedCreator of INFLUENCER_ANALYSIS_SEED.creators){if(!creators.some(creator=>influencerNormalize(creator.name)===influencerNormalize(seedCreator.name))){creators.push(structuredClone(seedCreator));changed=true}}
  for(const supplied of INFLUENCER_ANALYSIS_COMPLETE_DATA){
    let creator=creators.find(item=>influencerNormalize(item.name)===influencerNormalize(supplied.creator));
    if(!creator){const slug=influencerNormalize(supplied.creator).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||crypto.randomUUID();creator={id:`influencer-${slug}`,name:supplied.creator,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};creators.push(creator);changed=true}
    const identity=influencerVideoIdentity(supplied.videoLink),seedVideo=identity?INFLUENCER_ANALYSIS_SEED.videos.find(video=>influencerVideoIdentity(video.videoLink)===identity):null;
    let video=(identity&&videos.find(item=>influencerVideoIdentity(item.videoLink)===identity))||(supplied.date&&videos.find(item=>item.creatorId===creator.id&&item.date===supplied.date));
    if(!video){video=structuredClone(seedVideo||{id:`influencer-video-${crypto.randomUUID()}`,date:'',subscribers:'',views:'',videoLink:'',createdAt:new Date().toISOString(),notes:{}});videos.push(video);changed=true}
    const before=JSON.stringify(video),seedNotes=seedVideo?.notes||{},suppliedNotes=supplied.notes||{},currentNotes=video.notes||{};
    video.creatorId=creator.id;
    for(const field of ['date','subscribers','views','videoLink'])if(String(supplied[field]||'').trim())video[field]=supplied[field];
    if(!video.versionPlayed)video.versionPlayed=supplied.versionPlayed||'playtest-demo';
    video.values={...(video.values||{}),...supplied.values};
    video.notes=Object.fromEntries(INFLUENCER_NOTE_FIELDS.map(field=>[field.key,supplied.replaceNotes?(suppliedNotes[field.key]||seedNotes[field.key]||''):(String(currentNotes[field.key]||'').trim()?currentNotes[field.key]:(suppliedNotes[field.key]||seedNotes[field.key]||''))]));
    if(JSON.stringify(video)!==before){video.updatedAt=new Date().toISOString();changed=true}
  }
  if(typeof INFLUENCER_ANALYSIS_CREATOR_EMAILS==='object'&&INFLUENCER_ANALYSIS_CREATOR_EMAILS){
    for(const [creatorName,email] of Object.entries(INFLUENCER_ANALYSIS_CREATOR_EMAILS)){
      const creator=creators.find(item=>influencerNormalize(item.name)===influencerNormalize(creatorName));
      if(creator&&email&&creator.email!==email){creator.email=email;creator.updatedAt=new Date().toISOString();changed=true}
    }
  }
  planner[INFLUENCER_ANALYSIS_KEY]=true;
  planner[INFLUENCER_ANALYSIS_REVISION_KEY]=targetRevision;
  if(currentRevision!==targetRevision)changed=true;
  if(changed&&persist&&!publishedSnapshot)savePlanner();
  return changed;
}
ensureInfluencerAnalysisSeed();

const influencerCreators=()=>planner.influencerCreators||[];
const influencerVideos=()=>planner.influencerVideos||[];
const influencerDisplayDate=value=>value?new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'DATE NOT SET';
const influencerSafeLink=value=>{try{const url=new URL(value);return['http:','https:'].includes(url.protocol)?url.href:''}catch{return''}};
const influencerNumber=value=>{const text=String(value||'').trim().toUpperCase().replaceAll(',','');const match=text.match(/^([0-9.]+)\s*([KM])?$/);if(!match)return 0;return Number(match[1])*(match[2]==='M'?1e6:match[2]==='K'?1e3:1)};
const influencerScore=value=>{const text=String(value||'').trim();if(!text||/^(N\/?A|SKIPPED)/i.test(text))return null;const match=text.match(/^\s*(10(?:\.0+)?|[0-9](?:\.\d+)?)\s*$/);return match?Number(match[1]):null};
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
      <select id="influencerVersionFilter" class="toolbar-select" aria-label="Filter by demo version"><option value="">ALL DEMO VERSIONS</option><option value="playtest-demo">PLAYTEST</option><option value="official-demo">OFFICIAL DEMO</option><option value="demo-version">DEMO VERSION</option></select>
      <div class="influencer-view-switch"><button type="button" id="influencerFilesMode" class="active">CREATOR FILES</button><button type="button" id="influencerComparisonMode">DATA COMPARISON</button><button type="button" id="influencerGraphsMode">GRAPHS</button></div>
      <span id="influencerResultCount"></span>
    </div>
    <div id="influencerCreatorList" class="influencer-creator-list"></div>
    <div id="influencerComparison" class="influencer-comparison" hidden></div>
    <div id="influencerGraphs" class="influencer-graphs" hidden>
      <div class="influencer-graph-toolbar">
        <label>CREATOR<select id="influencerGraphCreator"><option value="">ALL CREATORS</option></select></label>
        <label>FROM<input id="influencerGraphDateFrom" type="date"></label>
        <label>TO<input id="influencerGraphDateTo" type="date"></label>
        <label>SUMMARY<select id="influencerGraphAggregate"><option value="average">AVERAGE</option><option value="median">MEDIAN</option></select></label>
        <button type="button" id="influencerGraphClear">CLEAR FILTERS</button>
      </div>
      <div id="influencerGraphSummary" class="influencer-graph-summary"></div>
      <div id="influencerGraphGrid" class="influencer-graph-grid"></div>
    </div>
    <div id="influencerEmpty" class="empty" hidden><i>▶</i><h2>NO CREATOR ANALYSIS FOUND</h2><p>Create a creator file and add their first video.</p></div>
  </section>
</section>`);

document.body.insertAdjacentHTML('beforeend',`
<dialog id="influencerCreatorDialog" class="influencer-creator-dialog">
  <form id="influencerCreatorForm">
    <div class="dialog-head"><div><p>INFLUENCER VIDEO ANALYSIS</p><h2 id="influencerCreatorDialogTitle">New Creator</h2></div><button type="button" class="x influencer-creator-close">×</button></div>
    <div class="dialog-body"><label>CREATOR / YOUTUBER NAME *<input id="influencerCreatorName" required placeholder="CREATOR NAME"></label><label>EMAIL<input id="influencerCreatorEmail" type="email" placeholder="creator@example.com"></label></div>
    <div class="dialog-actions"><button type="button" class="btn danger" id="deleteInfluencerCreator" hidden>DELETE CREATOR</button><span></span><button type="button" class="btn ghost influencer-creator-close">CANCEL</button><button class="btn red" type="submit">SAVE CREATOR</button></div>
  </form>
</dialog>
<dialog id="influencerVideoDialog" class="influencer-video-dialog">
  <form id="influencerVideoForm">
    <div class="dialog-head"><div><p>VIDEO ANALYSIS FILE</p><h2 id="influencerVideoDialogTitle">New Video</h2></div><button type="button" class="x influencer-video-close">×</button></div>
    <div class="dialog-body influencer-video-editor">
      <section class="influencer-form-section"><div class="influencer-section-title"><span>01</span><div><h3>VIDEO DETAILS</h3><p>Identify the creator, demo version and performance of this video.</p></div></div><div class="influencer-meta-grid"><label>CREATOR *<select id="influencerVideoCreator" required></select></label><label>VIDEO DATE<input id="influencerVideoDate" type="date"></label><label>DEMO VERSION *<select id="influencerVideoVersion" required><option value="playtest-demo">PLAYTEST</option><option value="official-demo">OFFICIAL DEMO</option><option value="demo-version">DEMO VERSION</option></select></label><label>SUBSCRIBERS<input id="influencerSubscribers" placeholder="e.g. 24.2K"></label><label>VIDEO VIEWS<input id="influencerViews" placeholder="e.g. 60K"></label><label class="influencer-link-field">VIDEO LINK<input id="influencerVideoLink" type="url" placeholder="https://youtube.com/watch?v=..."></label></div></section>
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
function influencerVisibleCreatorVideos(creatorId){const version=$('influencerVersionFilter')?.value||'';return influencerCreatorVideos(creatorId).filter(video=>!version||video.versionPlayed===version)}
function influencerLatestDate(creatorId){return influencerCreatorVideos(creatorId).map(video=>video.date||'').sort().at(-1)||''}
function influencerMatches(creator,query){
  if(!query)return true;
  const videos=influencerCreatorVideos(creator.id);
  return `${creator.name} ${creator.email||''} ${videos.map(video=>`${video.date} ${video.subscribers} ${video.views} ${video.videoLink} ${influencerVersionLabel(video.versionPlayed)} ${Object.values(video.values||{}).join(' ')} ${Object.values(video.notes||{}).join(' ')}`).join(' ')}`.toLowerCase().includes(query);
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
    <div class="influencer-video-meta"><span><b>${escapeHtml(video.subscribers||'—')}</b> SUBSCRIBERS</span><span><b>${average===null?'—':average.toFixed(1)}</b> SCORE AVG</span><span><b>${escapeHtml(video.values?.totalFights||'—')}</b> FIGHTS</span><span><b>${escapeHtml(influencerVersionLabel(video.versionPlayed))}</b> VERSION PLAYED</span></div>
    <div class="influencer-score-strip">${scores.map(field=>`<span title="${escapeHtml(field.label)}"><i>${escapeHtml(field.label)}</i><b>${escapeHtml(video.values[field.key])}</b></span>`).join('')}</div>
    <details class="influencer-analysis-details"><summary>VIEW FULL ANALYSIS <span>＋</span></summary><dl>${influencerMetricRows(video)}</dl>${influencerNotesPreview(video)}</details>
  </article>`;
}
function influencerCountNumber(value){const text=String(value||'').trim();if(!text||/^(N\/?A|SKIPPED|NOT)/i.test(text))return null;const numbers=(text.match(/\d+(?:\.\d+)?/g)||[]).map(Number);if(!numbers.length)return null;return numbers.length>1&&text.includes('-')?(numbers[0]+numbers[1])/2:numbers[0]}
function influencerCompactNumber(value){if(value===null||!Number.isFinite(value))return'—';return new Intl.NumberFormat(undefined,{notation:value>=1000?'compact':'standard',maximumFractionDigits:1}).format(value)}
function influencerTimeSeconds(value){
  const text=String(value||'').trim();
  if(!text||/N\/?A|SKIPPED|NOT (?:REACHED|OBSERVED|CALCULATED)|NONE|^NO$/i.test(text))return null;
  const match=text.match(/(\d{1,3}):(\d{2})(?::(\d{2}))?/);if(!match)return null;
  const first=Number(match[1]),second=Number(match[2]),third=match[3]===undefined?null:Number(match[3]);
  if(second>=60||(third!==null&&third>=60))return null;
  if(third===null)return first*60+second;
  return first>=10&&third===0?first*60+second:first*3600+second*60+third;
}
function influencerFormatTime(seconds){
  if(seconds===null||!Number.isFinite(seconds))return'—';
  const rounded=Math.round(seconds),hours=Math.floor(rounded/3600),minutes=Math.floor(rounded%3600/60),secs=rounded%60;
  return hours?`${hours}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}
function influencerEventState(value){
  const text=String(value||'').trim();
  if(!text||/N\/?A|SKIPPED|NOT (?:REACHED|OBSERVED|CALCULATED)/i.test(text))return null;
  if(/^(NO|NONE)$/i.test(text))return false;
  if(/^(YES|IMPLICIT YES)$/i.test(text)||influencerTimeSeconds(text)!==null)return true;
  return null;
}
const INFLUENCER_COMPARISON_GROUPS=[
  {key:'video',label:'VIDEO & REACH',rows:['date','versionPlayed','subscribers','views','videoLink']},
  {key:'tutorial',label:'TUTORIAL INFO',rows:['tutorialClarity','startsTutorial','finishesTutorial','tutorialDuration','firstCombatAfterTutorial']},
  {key:'gameplay',label:'OVERALL GAME INFO',rows:['combatUnderstanding','modifierUnderstanding','strategicDepthPerceived','totalFights','playsSecondRound','firstUnderstandingMoment','firstConfusionEvent','firstStrategicInsight','firstBuildModification']},
  {key:'loot',label:'LOOT & PROGRESSION',rows:['lootExcitement','firstPartAcquired','firstLootChosen','firstShopEncounter','firstPotionEncounter','firstCorpseMongerEncounter']},
  {key:'encounters',label:'CHARACTERS & ENCOUNTERS',rows:['wanderingMonkEncounter','monkDies','oborogumoEncounter','templePriestEncounter','finalBossEncounter']},
  {key:'feelings',label:'OVERALL PLAYER FEELINGS',rows:['overallEnjoyment','replayIntent','saysGameIsFun','saysWouldPlayAgain','firstExcitementSpike','firstCriticism','firstGameIsEasyComment']},
  {key:'ending',label:'VIDEO END',rows:['videoEnds']}
];
const INFLUENCER_EVENT_LABELS={
  startsTutorial:'STARTED',finishesTutorial:'FINISHED',firstCombatAfterTutorial:'REACHED COMBAT',firstPartAcquired:'ACQUIRED',firstShopEncounter:'ENCOUNTERED',firstPotionEncounter:'ENCOUNTERED',firstCorpseMongerEncounter:'ENCOUNTERED',wanderingMonkEncounter:'ENCOUNTERED',monkDies:'DIED',oborogumoEncounter:'ENCOUNTERED',templePriestEncounter:'ENCOUNTERED',finalBossEncounter:'ENCOUNTERED',saysGameIsFun:'POSITIVE',saysWouldPlayAgain:'WOULD PLAY AGAIN',playsSecondRound:'PLAYED SECOND ROUND',firstUnderstandingMoment:'UNDERSTOOD',firstConfusionEvent:'CONFUSED',firstStrategicInsight:'STRATEGIC INSIGHT',firstBuildModification:'MODIFIED BUILD',firstExcitementSpike:'EXCITEMENT',firstCriticism:'CRITICISED',firstGameIsEasyComment:'SAID GAME IS EASY',firstLootChosen:'CHOSE LOOT',videoEnds:'ENDED'
};
function influencerComparisonRows(){
  const fieldMap=new Map(INFLUENCER_VIDEO_FIELDS.map(field=>[field.key,field])),rows=new Map([
    ['date',{key:'date',label:'Video date',raw:video=>influencerDisplayDate(video.date)}],
    ['versionPlayed',{key:'versionPlayed',label:'Demo version',raw:video=>influencerVersionLabel(video.versionPlayed)}],
    ['subscribers',{key:'subscribers',label:'Subscribers',raw:video=>video.subscribers||'—',numeric:video=>{const value=influencerNumber(video.subscribers);return value>0?value:null},format:influencerCompactNumber}],
    ['views',{key:'views',label:'Video views',raw:video=>video.views||'—',numeric:video=>{const value=influencerNumber(video.views);return value>0?value:null},format:influencerCompactNumber}],
    ['videoLink',{key:'videoLink',label:'Video link',raw:video=>video.videoLink||'—',link:true}]
  ]);
  for(const field of INFLUENCER_VIDEO_FIELDS){
    const row={key:field.key,label:field.label,raw:video=>video.values?.[field.key]||'—'};
    if(field.group==='scores'){row.numeric=video=>influencerScore(video.values?.[field.key]);row.format=value=>Number.isInteger(value)?String(value):value.toFixed(1)}
    else if(field.key==='totalFights'){row.numeric=video=>influencerCountNumber(video.values?.[field.key]);row.format=value=>Number.isInteger(value)?String(value):value.toFixed(1)}
    else if(field.group==='timeline'){row.time=video=>influencerTimeSeconds(video.values?.[field.key]);row.format=influencerFormatTime}
    if(INFLUENCER_EVENT_LABELS[field.key]){row.event=video=>influencerEventState(video.values?.[field.key]);row.eventLabel=INFLUENCER_EVENT_LABELS[field.key]}
    rows.set(field.key,row);
  }
  return INFLUENCER_COMPARISON_GROUPS.map(group=>({...group,rows:group.rows.map(key=>rows.get(key)||fieldMap.get(key)).filter(Boolean)}));
}
function influencerComparisonSummary(row,videos){
  const numbers=row.numeric?videos.map(row.numeric).filter(value=>value!==null&&Number.isFinite(value)):[],times=row.time?videos.map(row.time).filter(value=>value!==null&&Number.isFinite(value)):[];
  if(numbers.length){const format=row.format||influencerCompactNumber,average=numbers.reduce((sum,value)=>sum+value,0)/numbers.length;return[format(average),format(Math.min(...numbers)),format(Math.max(...numbers))]}
  const events=row.event?videos.map(row.event).filter(value=>value!==null):[],averageParts=[];
  if(events.length)averageParts.push(`${row.eventLabel} ${Math.round(events.filter(Boolean).length/events.length*100)}%`);
  if(times.length)averageParts.push(`AVG ${influencerFormatTime(times.reduce((sum,value)=>sum+value,0)/times.length)}`);
  if(!averageParts.length&&videos.some(video=>/^not calculated$/i.test(String(row.raw(video)||'').trim())))averageParts.push('NOT CALCULATED');
  return[averageParts.join(' // ')||'—',times.length?influencerFormatTime(Math.min(...times)):'—',times.length?influencerFormatTime(Math.max(...times)):'—'];
}
function renderInfluencerComparison(creators){
  const videos=creators.flatMap(creator=>influencerVisibleCreatorVideos(creator.id).map(video=>({video,creator}))).sort((left,right)=>left.creator.name.localeCompare(right.creator.name,undefined,{sensitivity:'base'})||(left.video.date||'').localeCompare(right.video.date||''));
  const target=$('influencerComparison');if(!videos.length){target.innerHTML='<div class="business-empty">NO VIDEOS MATCH THIS FILTER</div>';return}
  const rawVideos=videos.map(item=>item.video),allScoreValues=rawVideos.flatMap(video=>INFLUENCER_VIDEO_FIELDS.filter(field=>field.group==='scores').map(field=>influencerScore(video.values?.[field.key]))).filter(value=>value!==null),views=rawVideos.map(video=>influencerNumber(video.views)).filter(value=>value>0),filled=rawVideos.reduce((sum,video)=>sum+INFLUENCER_VIDEO_FIELDS.filter(field=>String(video.values?.[field.key]||'').trim()).length,0),possible=rawVideos.length*INFLUENCER_VIDEO_FIELDS.length;
  const metricGroups=influencerComparisonRows(),columnCount=videos.length+3;
  const rowHtml=row=>{const summary=influencerComparisonSummary(row,rawVideos);return`<tr data-group="${row.key}"><th>${escapeHtml(row.label)}</th>${rawVideos.map(video=>{const raw=row.raw(video),link=row.link?influencerSafeLink(raw):'';return`<td>${link?`<a href="${escapeHtml(link)}" target="_blank" rel="noopener">WATCH ↗</a>`:escapeHtml(raw)}</td>`}).join('')}<td class="comparison-summary-cell">${escapeHtml(summary[0])}</td><td class="comparison-summary-cell">${escapeHtml(summary[1])}</td><td class="comparison-summary-cell">${escapeHtml(summary[2])}</td></tr>`};
  target.innerHTML=`<div class="influencer-comparison-summary"><article><small>VIDEOS COMPARED</small><b>${videos.length}</b></article><article><small>AVERAGE SCORE</small><b>${allScoreValues.length?(allScoreValues.reduce((sum,value)=>sum+value,0)/allScoreValues.length).toFixed(1):'—'}</b></article><article><small>AVERAGE VIEWS</small><b>${views.length?influencerCompactNumber(views.reduce((sum,value)=>sum+value,0)/views.length):'—'}</b></article><article><small>DATA COMPLETENESS</small><b>${possible?Math.round(filled/possible*100):0}%</b></article></div><div class="influencer-comparison-scroll"><table><thead><tr><th class="comparison-field-head">METRIC</th>${videos.map(({video,creator})=>`<th><small>${escapeHtml(creator.name)}</small><b>${escapeHtml(influencerDisplayDate(video.date).toUpperCase())}</b><span>${escapeHtml(video.views||'—')} VIEWS</span></th>`).join('')}<th class="comparison-summary-head">AVERAGE / RATE</th><th class="comparison-summary-head">MIN / EARLIEST</th><th class="comparison-summary-head">MAX / LATEST</th></tr></thead><tbody>${metricGroups.map((group,index)=>`<tr class="influencer-comparison-group"><th>${String(index+1).padStart(2,'0')} // ${escapeHtml(group.label)}</th><td colspan="${columnCount}"></td></tr>${group.rows.map(rowHtml).join('')}`).join('')}</tbody></table></div>`;
}

const INFLUENCER_GRAPH_SCORE_KEYS=['tutorialClarity','combatUnderstanding','modifierUnderstanding','lootExcitement','strategicDepthPerceived','overallEnjoyment','replayIntent'];
const INFLUENCER_GRAPH_TIMELINE=[
  ['startsTutorial','Tutorial start'],['finishesTutorial','Tutorial finish'],['firstCombatAfterTutorial','First combat'],['firstPartAcquired','First part'],['firstLootChosen','First loot'],['firstBuildModification','First build change'],['firstShopEncounter','Shop'],['wanderingMonkEncounter','Wandering Monk'],['firstCorpseMongerEncounter','Corpse Monger'],['templePriestEncounter','Temple Priest'],['finalBossEncounter','Final boss']
];
const influencerGraphCentral=(values,mode='average')=>{
  const clean=values.filter(value=>value!==null&&Number.isFinite(value)).sort((a,b)=>a-b);if(!clean.length)return null;
  if(mode==='median'){const middle=Math.floor(clean.length/2);return clean.length%2?clean[middle]:(clean[middle-1]+clean[middle])/2}
  return clean.reduce((sum,value)=>sum+value,0)/clean.length;
};
function influencerGraphRows(creators){
  const creatorId=$('influencerGraphCreator')?.value||'',from=$('influencerGraphDateFrom')?.value||'',to=$('influencerGraphDateTo')?.value||'';
  return creators.filter(creator=>!creatorId||creator.id===creatorId).flatMap(creator=>influencerVisibleCreatorVideos(creator.id).filter(video=>(!from||video.date>=from)&&(!to||video.date<=to)).map(video=>({creator,video})));
}
function influencerGraphEmpty(title,message){return`<article class="influencer-graph-card"><header><div><small>VIDEO ANALYSIS</small><h3>${escapeHtml(title)}</h3></div></header><div class="influencer-graph-empty">${escapeHtml(message)}</div></article>`}
function influencerUnderstandingBubble(rows){
  const points=rows.map(({creator,video})=>{const understanding=influencerGraphCentral(['tutorialClarity','combatUnderstanding','modifierUnderstanding'].map(key=>influencerScore(video.values?.[key]))),enjoyment=influencerScore(video.values?.overallEnjoyment),replay=influencerScore(video.values?.replayIntent),fights=influencerCountNumber(video.values?.totalFights);return{creator,video,understanding,enjoyment,replay,fights}}).filter(point=>point.understanding!==null&&point.enjoyment!==null);
  if(!points.length)return influencerGraphEmpty('UNDERSTANDING VS ENJOYMENT','NO VIDEOS HAVE BOTH UNDERSTANDING AND ENJOYMENT SCORES IN THIS FILTER.');
  const width=760,height=390,left=58,right=22,top=24,bottom=52,x=value=>left+(Math.max(1,Math.min(10,value))-1)/(10-1)*(width-left-right),y=value=>top+(10-Math.max(1,Math.min(10,value)))/(10-1)*(height-top-bottom),ticks=[1,3,5,7,9];
  const color=replay=>replay===null?'#7b8088':replay>=7?'#43c777':replay>=4?'#efb53d':'#ef454d';
  return`<article class="influencer-graph-card influencer-graph-wide"><header><div><small>RELATIONSHIP</small><h3>UNDERSTANDING VS ENJOYMENT</h3></div><p>BUBBLE SIZE = TOTAL FIGHTS // COLOR = REPLAY INTENT</p></header><div class="influencer-svg-wrap"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Scatter plot comparing understanding and enjoyment scores">
    ${ticks.map(tick=>`<line x1="${x(tick)}" y1="${top}" x2="${x(tick)}" y2="${height-bottom}" class="graph-grid-line"/><text x="${x(tick)}" y="${height-24}" class="graph-axis-label" text-anchor="middle">${tick}</text>`).join('')}
    ${ticks.map(tick=>`<line x1="${left}" y1="${y(tick)}" x2="${width-right}" y2="${y(tick)}" class="graph-grid-line"/><text x="${left-16}" y="${y(tick)+4}" class="graph-axis-label" text-anchor="end">${tick}</text>`).join('')}
    <line x1="${left}" y1="${height-bottom}" x2="${width-right}" y2="${height-bottom}" class="graph-axis"/><line x1="${left}" y1="${top}" x2="${left}" y2="${height-bottom}" class="graph-axis"/>
    <text x="${(left+width-right)/2}" y="${height-5}" class="graph-axis-title" text-anchor="middle">UNDERSTANDING SCORE</text><text x="14" y="${height/2}" class="graph-axis-title" text-anchor="middle" transform="rotate(-90 14 ${height/2})">ENJOYMENT</text>
    ${points.map(point=>{const radius=Math.max(8,Math.min(23,8+Math.sqrt(point.fights||1)*2.7));return`<circle cx="${x(point.understanding)}" cy="${y(point.enjoyment)}" r="${radius}" fill="${color(point.replay)}" fill-opacity=".72" stroke="${color(point.replay)}" stroke-width="2"><title>${escapeHtml(point.creator.name)} // ${escapeHtml(influencerDisplayDate(point.video.date))}\nUnderstanding ${point.understanding.toFixed(1)} // Enjoyment ${point.enjoyment}\n${point.fights||'—'} fights // Replay ${point.replay??'N/A'}</title></circle>`}).join('')}
  </svg></div><div class="influencer-graph-legend"><span class="positive">HIGH REPLAY</span><span class="mixed">MIXED REPLAY</span><span class="negative">LOW REPLAY</span><span class="unknown">N/A</span></div></article>`;
}
function influencerScoreBars(rows,mode){
  const fieldMap=new Map(INFLUENCER_VIDEO_FIELDS.map(field=>[field.key,field.label])),data=INFLUENCER_GRAPH_SCORE_KEYS.map(key=>{const values=rows.map(({video})=>influencerScore(video.values?.[key])).filter(value=>value!==null);return{key,label:fieldMap.get(key)||key,values,value:influencerGraphCentral(values,mode)}});
  if(!data.some(item=>item.value!==null))return influencerGraphEmpty('PLAYER SCORE PROFILE','NO NUMERIC SCORES ARE AVAILABLE IN THIS FILTER.');
  return`<article class="influencer-graph-card"><header><div><small>${mode.toUpperCase()} + RANGE</small><h3>PLAYER SCORE PROFILE</h3></div><p>VALID 1–10 SCORES ONLY</p></header><div class="influencer-score-bars">${data.map(item=>{if(item.value===null)return`<div class="score-bar-row"><span>${escapeHtml(item.label)}</span><i class="empty">NO DATA</i></div>`;const min=Math.min(...item.values),max=Math.max(...item.values);return`<div class="score-bar-row"><span>${escapeHtml(item.label)}</span><div class="score-bar-track"><i style="width:${item.value*10}%"></i><em style="left:${min*10}%;width:${Math.max(1,(max-min)*10)}%"></em></div><b>${item.value.toFixed(1)}</b><small>${min}–${max}</small></div>`}).join('')}</div></article>`;
}
function influencerGraphEventState(value){
  const text=String(value||'').trim();if(!text||/N\/?A|SKIPPED|NOT (?:OBSERVED|CALCULATED)/i.test(text))return null;
  if(/^(NO|NONE|NOT REACHED)$/i.test(text))return false;
  if(/^(YES|IMPLICIT YES|OBSERVED)$/i.test(text)||influencerTimeSeconds(text)!==null)return true;
  return null;
}
function influencerJourneyFunnel(rows){
  const stages=[['startsTutorial','STARTED TUTORIAL'],['finishesTutorial','FINISHED TUTORIAL'],['firstCombatAfterTutorial','REACHED COMBAT'],['firstPartAcquired','ACQUIRED A PART'],['firstBuildModification','MODIFIED BUILD'],['firstShopEncounter','REACHED SHOP'],['wanderingMonkEncounter','MET MONK'],['firstCorpseMongerEncounter','MET CORPSE MONGER'],['templePriestEncounter','MET TEMPLE PRIEST'],['finalBossEncounter','REACHED FINAL BOSS'],['playsSecondRound','PLAYED SECOND ROUND']].map(([key,label])=>{const states=rows.map(({video})=>influencerGraphEventState(video.values?.[key])).filter(value=>value!==null),yes=states.filter(Boolean).length;return{key,label,yes,total:states.length,rate:states.length?yes/states.length*100:null}});
  if(!stages.some(stage=>stage.total))return influencerGraphEmpty('PLAYER JOURNEY FUNNEL','NO JOURNEY EVENTS ARE AVAILABLE IN THIS FILTER.');
  return`<article class="influencer-graph-card"><header><div><small>REACH RATE</small><h3>PLAYER JOURNEY FUNNEL</h3></div><p>SKIPPED AND UNKNOWN VALUES EXCLUDED</p></header><div class="influencer-funnel">${stages.map(stage=>`<div><span>${escapeHtml(stage.label)}</span><i><em style="width:${stage.rate===null?0:Math.max(2,stage.rate)}%"></em></i><b>${stage.rate===null?'—':Math.round(stage.rate)+'%'}</b><small>${stage.yes}/${stage.total}</small></div>`).join('')}</div></article>`;
}
function influencerTimelineChart(rows,mode){
  const data=INFLUENCER_GRAPH_TIMELINE.map(([key,label])=>{const values=rows.map(({video})=>influencerTimeSeconds(video.values?.[key])).filter(value=>value!==null),value=influencerGraphCentral(values,mode);return{key,label,values,value}}),available=data.filter(item=>item.value!==null),max=Math.max(1,...available.map(item=>item.value));
  if(!available.length)return influencerGraphEmpty('FIRST-EXPERIENCE TIMELINE','NO EXACT TIMESTAMPS ARE AVAILABLE IN THIS FILTER.');
  return`<article class="influencer-graph-card"><header><div><small>${mode.toUpperCase()} TIMESTAMP</small><h3>FIRST-EXPERIENCE TIMELINE</h3></div><p>EXACT SRT TIMES ONLY</p></header><div class="influencer-timeline-chart">${data.map(item=>`<div><span>${escapeHtml(item.label)}</span><i><em style="width:${item.value===null?0:item.value/max*100}%"></em></i><b>${item.value===null?'—':influencerFormatTime(item.value)}</b><small>${item.values.length} VIDEO${item.values.length===1?'':'S'}</small></div>`).join('')}</div></article>`;
}
function influencerHeatmap(rows){
  const fields=INFLUENCER_GRAPH_SCORE_KEYS.map(key=>({key,label:INFLUENCER_VIDEO_FIELDS.find(field=>field.key===key)?.label||key}));
  if(!rows.some(({video})=>fields.some(field=>influencerScore(video.values?.[field.key])!==null)))return influencerGraphEmpty('VIDEO COMPARISON HEATMAP','NO NUMERIC SCORES ARE AVAILABLE IN THIS FILTER.');
  const sorted=rows.slice().sort((left,right)=>left.creator.name.localeCompare(right.creator.name)||(left.video.date||'').localeCompare(right.video.date||''));
  return`<article class="influencer-graph-card influencer-graph-wide"><header><div><small>ALL SCORE SIGNALS</small><h3>VIDEO COMPARISON HEATMAP</h3></div><p>RED = LOW // YELLOW = MID // GREEN = HIGH</p></header><div class="influencer-heatmap-scroll"><table><thead><tr><th>CREATOR / VIDEO</th>${fields.map(field=>`<th title="${escapeHtml(field.label)}">${escapeHtml(field.label)}</th>`).join('')}</tr></thead><tbody>${sorted.map(({creator,video})=>`<tr><th><b>${escapeHtml(creator.name)}</b><small>${escapeHtml(influencerDisplayDate(video.date).toUpperCase())}</small></th>${fields.map(field=>{const score=influencerScore(video.values?.[field.key]);return score===null?'<td class="heatmap-empty">—</td>':`<td style="--heat-hue:${Math.round((score-1)/9*120)}"><span>${score}</span></td>`}).join('')}</tr>`).join('')}</tbody></table></div></article>`;
}
function renderInfluencerGraphs(creators){
  const creatorSelect=$('influencerGraphCreator'),selected=creatorSelect.value;
  creatorSelect.innerHTML='<option value="">ALL CREATORS</option>'+influencerCreators().slice().sort((left,right)=>left.name.localeCompare(right.name)).map(creator=>`<option value="${creator.id}">${escapeHtml(creator.name)}</option>`).join('');
  if([...creatorSelect.options].some(option=>option.value===selected))creatorSelect.value=selected;
  const rows=influencerGraphRows(creators),mode=$('influencerGraphAggregate').value||'average',dates=rows.map(({video})=>video.date).filter(Boolean).sort(),scored=rows.filter(({video})=>INFLUENCER_GRAPH_SCORE_KEYS.some(key=>influencerScore(video.values?.[key])!==null)).length;
  $('influencerGraphSummary').innerHTML=`<article><small>VIDEOS IN VIEW</small><b>${rows.length}</b></article><article><small>CREATORS IN VIEW</small><b>${new Set(rows.map(row=>row.creator.id)).size}</b></article><article><small>VIDEOS WITH SCORES</small><b>${scored}</b></article><article><small>DATE RANGE</small><b>${dates.length?`${escapeHtml(influencerDisplayDate(dates[0]).toUpperCase())}<i>TO</i>${escapeHtml(influencerDisplayDate(dates.at(-1)).toUpperCase())}`:'—'}</b></article>`;
  $('influencerGraphGrid').innerHTML=rows.length?[influencerUnderstandingBubble(rows),influencerScoreBars(rows,mode),influencerJourneyFunnel(rows),influencerTimelineChart(rows,mode),influencerHeatmap(rows)].join(''):'<div class="business-empty influencer-graph-no-results">NO VIDEOS MATCH THESE GRAPH FILTERS</div>';
}
function influencerVersionDataset(creators,version){
  const rows=creators.flatMap(creator=>influencerCreatorVideos(creator.id).filter(video=>video.versionPlayed===version).map(video=>({creator,video}))),videos=rows.map(row=>row.video),scoreValues=videos.flatMap(video=>INFLUENCER_GRAPH_SCORE_KEYS.map(key=>influencerScore(video.values?.[key]))).filter(value=>value!==null),enjoyment=videos.map(video=>influencerScore(video.values?.overallEnjoyment)).filter(value=>value!==null),fights=videos.map(video=>influencerCountNumber(video.values?.totalFights)).filter(value=>value!==null);
  return{version,rows,videos,creators:new Set(rows.map(row=>row.creator.id)).size,score:influencerGraphCentral(scoreValues),enjoyment:influencerGraphCentral(enjoyment),fights:influencerGraphCentral(fights)};
}
function influencerVersionRate(dataset,key){const states=dataset.videos.map(video=>influencerGraphEventState(video.values?.[key])).filter(value=>value!==null);return states.length?{rate:states.filter(Boolean).length/states.length*100,count:states.length}:null}
function influencerVersionDelta(first,second,suffix=''){
  if(first===null||second===null)return'—';const delta=second-first,formatted=Math.abs(delta)<.05?'0':`${delta>0?'+':''}${delta.toFixed(1)}`;return`${formatted}${suffix}`;
}
function renderInfluencerVersions(creators){
  const playtest=influencerVersionDataset(creators,'playtest-demo'),official=influencerVersionDataset(creators,'official-demo'),datasets=[playtest,official],fieldMap=new Map(INFLUENCER_VIDEO_FIELDS.map(field=>[field.key,field.label]));
  const versionCard=dataset=>`<article class="influencer-version-card ${dataset.version}"><header><small>VERSION PLAYED</small><h2>${escapeHtml(influencerVersionLabel(dataset.version))}</h2></header><div><span><b>${dataset.videos.length}</b> VIDEOS</span><span><b>${dataset.creators}</b> CREATORS</span><span><b>${dataset.score===null?'—':dataset.score.toFixed(1)}</b> OVERALL SCORE</span><span><b>${dataset.enjoyment===null?'—':dataset.enjoyment.toFixed(1)}</b> ENJOYMENT</span><span><b>${dataset.fights===null?'—':dataset.fights.toFixed(1)}</b> AVG FIGHTS</span></div>${dataset.videos.length?'':`<p>NO ${escapeHtml(influencerVersionLabel(dataset.version))} VIDEOS YET</p>`}</article>`;
  const scoreRows=INFLUENCER_GRAPH_SCORE_KEYS.map(key=>{const values=datasets.map(dataset=>influencerGraphCentral(dataset.videos.map(video=>influencerScore(video.values?.[key])).filter(value=>value!==null)));return{label:fieldMap.get(key)||key,values}});
  const journeyKeys=[['finishesTutorial','FINISHES TUTORIAL'],['firstCombatAfterTutorial','REACHES COMBAT'],['firstBuildModification','MODIFIES BUILD'],['firstShopEncounter','REACHES SHOP'],['wanderingMonkEncounter','MEETS MONK'],['firstCorpseMongerEncounter','MEETS CORPSE MONGER'],['finalBossEncounter','REACHES FINAL BOSS'],['playsSecondRound','PLAYS SECOND ROUND']];
  const timelineKeys=[['tutorialDuration','TUTORIAL DURATION'],['firstCombatAfterTutorial','FIRST COMBAT'],['firstBuildModification','FIRST BUILD CHANGE'],['firstShopEncounter','FIRST SHOP'],['wanderingMonkEncounter','WANDERING MONK']];
  $('influencerVersions').innerHTML=`<div class="influencer-version-intro"><div><small>DEMO VERSION COMPARISON</small><h2>PLAYTEST VS OFFICIAL DEMO</h2></div><p>Existing videos are classified as PLAYTEST DEMO. New videos default to OFFICIAL DEMO and can be changed while editing.</p></div><div class="influencer-version-cards">${datasets.map(versionCard).join('')}</div><div class="influencer-version-grid">
    <article class="influencer-version-comparison"><header><small>1–10 SCORES</small><h3>SCORE COMPARISON</h3></header><div class="version-score-table"><div class="version-table-head"><span>METRIC</span><b>PLAYTEST</b><b>OFFICIAL</b><b>CHANGE</b></div>${scoreRows.map(row=>`<div><span>${escapeHtml(row.label)}</span><b>${row.values[0]===null?'—':row.values[0].toFixed(1)}</b><b>${row.values[1]===null?'—':row.values[1].toFixed(1)}</b><b class="version-delta">${influencerVersionDelta(row.values[0],row.values[1])}</b></div>`).join('')}</div></article>
    <article class="influencer-version-comparison"><header><small>PLAYER PROGRESSION</small><h3>JOURNEY REACH RATES</h3></header><div class="version-score-table"><div class="version-table-head"><span>EVENT</span><b>PLAYTEST</b><b>OFFICIAL</b><b>CHANGE</b></div>${journeyKeys.map(([key,label])=>{const values=datasets.map(dataset=>influencerVersionRate(dataset,key));return`<div><span>${escapeHtml(label)}</span><b>${values[0]?Math.round(values[0].rate)+'%':'—'}</b><b>${values[1]?Math.round(values[1].rate)+'%':'—'}</b><b class="version-delta">${influencerVersionDelta(values[0]?.rate??null,values[1]?.rate??null,'%')}</b></div>`}).join('')}</div></article>
    <article class="influencer-version-comparison influencer-version-wide"><header><small>AVERAGE SRT TIMESTAMP</small><h3>FIRST-EXPERIENCE TIMING</h3></header><div class="version-score-table"><div class="version-table-head"><span>EVENT</span><b>PLAYTEST</b><b>OFFICIAL</b><b>CHANGE</b></div>${timelineKeys.map(([key,label])=>{const values=datasets.map(dataset=>influencerGraphCentral(dataset.videos.map(video=>influencerTimeSeconds(video.values?.[key])).filter(value=>value!==null)));return`<div><span>${escapeHtml(label)}</span><b>${values[0]===null?'—':influencerFormatTime(values[0])}</b><b>${values[1]===null?'—':influencerFormatTime(values[1])}</b><b class="version-delta">${values[0]===null||values[1]===null?'—':influencerFormatTime(Math.abs(values[1]-values[0]))+(values[1]>=values[0]?' LATER':' SOONER')}</b></div>`}).join('')}</div></article>
  </div>`;
}
function renderInfluencerAnalysis(){
  ensureInfluencerAnalysisSeed({persist:false});
  const creators=influencerCreators(),videos=influencerVideos(),query=($('influencerSearch')?.value||'').trim().toLowerCase(),sort=$('influencerSort')?.value||'name-asc',comparisonMode=influencerViewMode==='comparison',graphsMode=influencerViewMode==='graphs',filesMode=!comparisonMode&&!graphsMode,versionFilter=$('influencerVersionFilter')?.value||'';
  const filteredVideos=videos.filter(video=>!versionFilter||video.versionPlayed===versionFilter),baseRows=creators.filter(creator=>influencerMatches(creator,query)),rows=baseRows.filter(creator=>influencerVisibleCreatorVideos(creator.id).length).sort((left,right)=>{
    if(sort==='name-desc')return right.name.localeCompare(left.name,undefined,{sensitivity:'base'});
    if(sort==='videos-desc')return influencerVisibleCreatorVideos(right.id).length-influencerVisibleCreatorVideos(left.id).length||left.name.localeCompare(right.name);
    if(sort==='date-desc')return (influencerVisibleCreatorVideos(right.id).map(video=>video.date||'').sort().at(-1)||'').localeCompare(influencerVisibleCreatorVideos(left.id).map(video=>video.date||'').sort().at(-1)||'')||left.name.localeCompare(right.name);
    return left.name.localeCompare(right.name,undefined,{sensitivity:'base'});
  });
  const statsVideos=filteredVideos,enjoymentScores=statsVideos.map(video=>influencerScore(video.values?.overallEnjoyment)).filter(value=>value!==null);
  $('influencerCreatorCount').textContent=new Set(filteredVideos.map(video=>video.creatorId)).size;
  $('navInfluencerCount').textContent=videos.length;
  $('influencerVideoCount').textContent=statsVideos.length;
  $('influencerRepeatCount').textContent=creators.filter(creator=>influencerVisibleCreatorVideos(creator.id).length>1).length;
  $('influencerEnjoymentAverage').textContent=enjoymentScores.length?(enjoymentScores.reduce((sum,value)=>sum+value,0)/enjoymentScores.length).toFixed(1):'—';
  $('influencerResultCount').textContent=`${rows.length} CREATOR${rows.length===1?'':'S'} // ${rows.reduce((sum,creator)=>sum+influencerVisibleCreatorVideos(creator.id).length,0)} VIDEOS`;
  $('influencerEmpty').hidden=rows.length>0;
  $('influencerFilesMode').classList.toggle('active',filesMode);
  $('influencerComparisonMode').classList.toggle('active',comparisonMode);
  $('influencerGraphsMode').classList.toggle('active',graphsMode);
  $('influencerCreatorList').hidden=!filesMode;
  $('influencerComparison').hidden=!comparisonMode;
  $('influencerGraphs').hidden=!graphsMode;
  if(comparisonMode)renderInfluencerComparison(rows);
  if(graphsMode)renderInfluencerGraphs(rows);
  $('influencerCreatorList').innerHTML=rows.map(creator=>{
    const creatorVideos=influencerVisibleCreatorVideos(creator.id).sort((left,right)=>(right.date||'').localeCompare(left.date||''));
    const latest=creatorVideos[0]?.date||'';
    return `<details class="influencer-creator-card" open data-creator-id="${creator.id}"><summary><span class="influencer-avatar">${escapeHtml((creator.name||'?').trim().charAt(0).toUpperCase())}</span><div><small>CREATOR ANALYSIS FILE</small><h2>${escapeHtml(creator.name)}</h2><p>${creatorVideos.length} VIDEO${creatorVideos.length===1?'':'S'}${latest?` // LATEST ${escapeHtml(influencerDisplayDate(latest).toUpperCase())}`:''}</p><p class="influencer-creator-email">EMAIL // ${escapeHtml(creator.email||'NOT ADDED')}</p></div><span class="influencer-collapse">⌄</span></summary><div class="influencer-creator-actions"><button type="button" data-add-influencer-video="${creator.id}">＋ ADD VIDEO</button><button type="button" data-edit-influencer-creator="${creator.id}">EDIT CREATOR</button></div><div class="influencer-video-list">${creatorVideos.length?creatorVideos.map(influencerVideoCard).join(''):'<div class="influencer-video-empty">NO VIDEOS YET // ADD THE FIRST ANALYSIS</div>'}</div></details>`;
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
  $('influencerCreatorEmail').value=creator?.email||'';
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
  $('influencerVideoVersion').value=video?.versionPlayed||'official-demo';
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
$('influencerVersionFilter').onchange=renderInfluencerAnalysis;
$('influencerFilesMode').onclick=()=>{influencerViewMode='files';renderInfluencerAnalysis()};
$('influencerComparisonMode').onclick=()=>{influencerViewMode='comparison';renderInfluencerAnalysis()};
$('influencerGraphsMode').onclick=()=>{influencerViewMode='graphs';renderInfluencerAnalysis()};
['influencerGraphCreator','influencerGraphDateFrom','influencerGraphDateTo','influencerGraphAggregate'].forEach(id=>$(id).onchange=renderInfluencerAnalysis);
$('influencerGraphClear').onclick=()=>{$('influencerGraphCreator').value='';$('influencerGraphDateFrom').value='';$('influencerGraphDateTo').value='';$('influencerGraphAggregate').value='average';renderInfluencerAnalysis()};
document.querySelectorAll('.influencer-creator-close').forEach(button=>button.onclick=()=>$('influencerCreatorDialog').close());
document.querySelectorAll('.influencer-video-close').forEach(button=>button.onclick=()=>$('influencerVideoDialog').close());
$('influencerCreatorForm').onsubmit=event=>{
  event.preventDefault();
  if(!event.currentTarget.reportValidity())return;
  const name=$('influencerCreatorName').value.trim(),duplicate=influencerCreators().find(creator=>creator.id!==editingInfluencerCreatorId&&influencerNormalize(creator.name)===influencerNormalize(name));
  if(duplicate)return toast('THAT CREATOR ALREADY EXISTS');
  const existing=influencerCreators().find(creator=>creator.id===editingInfluencerCreatorId),now=new Date().toISOString(),record=existing||{id:`influencer-${crypto.randomUUID()}`,createdAt:now};
  record.name=name;record.email=$('influencerCreatorEmail').value.trim();record.updatedAt=now;
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
  record.versionPlayed=$('influencerVideoVersion').value;
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
  if(event.detail?.ready){ensureInfluencerAnalysisSeed({persist:true});renderInfluencerAnalysis()}
});
