// Shared festival application tracker. Records live in the planner payload so
// the existing Supabase sync can share them without a new record-type migration.
const FESTIVAL_CLEANUP_REVISION=2;
const FESTIVAL_STATUSES=['WAITING','SELECTED','REJECTED'];
const FESTIVAL_FORMATS=['PRESENTIAL','ONLINE'];
let editingFestivalId=null;
let festivalMutationBusy=false,festivalCleanupTimer=null;

function ensureFestivalRecords(){
  if(!Array.isArray(planner.festivals))planner.festivals=[];
  return planner.festivals;
}
function festivalRecordKey(record){return String(record?.name||'').trim().toLowerCase().replace(/\s+/g,' ')}
function cleanupAccidentalFestivalRecords(){
  const records=ensureFestivalRecords();
  if(Number(planner.festivalCleanupRevision||0)>=FESTIVAL_CLEANUP_REVISION)return records;
  const filtered=records.filter(record=>festivalRecordKey(record)!=='unity dev day 2026 - eva');
  const removed=records.length-filtered.length;
  planner.festivalCleanupRevision=FESTIVAL_CLEANUP_REVISION;
  if(!removed)return records;
  planner.festivals=filtered;
  if(!publishedSnapshot){
    clearTimeout(festivalCleanupTimer);
    festivalCleanupTimer=setTimeout(()=>{savePlanner();renderFestivals();toast(`${removed} ACCIDENTAL FESTIVAL RECORD${removed===1?'':'S'} REMOVED`)},0);
  }
  return filtered;
}
function festivalRecords(){return cleanupAccidentalFestivalRecords()}
function persistFestivalRecords(nextRecords){
  const previous=ensureFestivalRecords();
  try{
    planner.festivals=nextRecords;
    savePlanner();
    return true;
  }catch(error){
    console.error('Festival save failed',error);
    planner.festivals=previous;
    toast(`FESTIVAL SAVE FAILED // ${error.message||'PLEASE TRY AGAIN'}`);
    return false;
  }
}
function festivalCloudReady(){return !!publishedSnapshot||window.skinatorCloudReady!==false}
function festivalWebsite(value){
  const text=String(value||'').trim();
  if(!text)return'';
  try{
    const url=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text)?text:`https://${text}`);
    return ['http:','https:'].includes(url.protocol)?url.href:'';
  }catch{return''}
}
function festivalFormatValue(value){return String(value||'').toUpperCase()==='ONLINE'?'ONLINE':'PRESENTIAL'}
function festivalDisplayDate(value){return value?new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):''}
function festivalDateRange(record){
  const start=festivalDisplayDate(record.startDate),end=festivalDisplayDate(record.endDate);
  if(start&&end)return start===end?start:`${start} — ${end}`;
  return start||end||'DATES NOT SET';
}

ensureFestivalRecords();
try{localStorage.removeItem('skinator-festivals-v1')}catch{}

document.querySelector('aside nav').insertAdjacentHTML('beforeend','<button class="nav" data-tab="festivals"><i>✹</i> FESTIVALS <span id="navFestivalCount">0</span></button>');
const festivalNav=document.querySelector('.nav[data-tab="festivals"]');
document.querySelector('.nav[data-tab="publishers"]')?.insertAdjacentElement('afterend',festivalNav);

document.querySelector('main').insertAdjacentHTML('beforeend',`
<section id="festivalsView" class="business-view" hidden>
  <div class="stats festival-stats">
    <article><label>FESTIVALS</label><b id="festivalTotalCount">0</b><small>TOTAL RECORDS</small></article>
    <article><label>WAITING</label><b id="festivalWaitingCount">0</b><small>AWAITING DECISION</small></article>
    <article><label>SELECTED</label><b id="festivalSelectedCount">0</b><small>ACCEPTED EVENTS</small></article>
    <article><label>REJECTED</label><b id="festivalRejectedCount">0</b><small>DECLINED ENTRIES</small></article>
  </div>
  <section class="panel festival-panel">
    <div class="toolbar festival-toolbar">
      <label class="search">⌕ <input id="festivalSearch" placeholder="SEARCH FESTIVALS OR LOCATIONS"></label>
      <select id="festivalStatusFilter" class="toolbar-select">
        <option value="All">ALL STATUSES</option>
        <option value="WAITING">WAITING</option>
        <option value="SELECTED">SELECTED</option>
        <option value="REJECTED">REJECTED</option>
      </select>
      <select id="festivalFormatFilter" class="toolbar-select">
        <option value="All">ONLINE + PRESENTIAL</option>
        <option value="ONLINE">ONLINE</option>
        <option value="PRESENTIAL">PRESENTIAL</option>
      </select>
      <span id="festivalResultCount"></span>
    </div>
    <div id="festivalGrid" class="festival-grid"></div>
  </section>
</section>

<dialog id="festivalDialog" class="festival-dialog">
  <form id="festivalForm" novalidate>
    <div class="dialog-head">
      <div><p>FESTIVAL DATABASE</p><h2 id="festivalDialogTitle">New festival</h2></div>
      <button type="button" class="x festival-close">×</button>
    </div>
    <div class="dialog-body">
      <p class="festival-form-error" id="festivalFormError" hidden></p>
      <section class="form-section">
        <h3>01 // FESTIVAL DETAILS</h3>
        <label>FESTIVAL NAME *<input id="festivalName" required placeholder="FESTIVAL NAME"></label>
        <div class="two">
          <label>LOCATION<input id="festivalLocation" placeholder="CITY, COUNTRY OR ONLINE REGION"></label>
          <label>FORMAT<select id="festivalFormat">${FESTIVAL_FORMATS.map(format=>`<option value="${format}">${format}</option>`).join('')}</select></label>
        </div>
        <div class="two festival-date-range">
          <label>START DATE<input id="festivalStartDate" type="date"></label>
          <label>END DATE<input id="festivalEndDate" type="date"></label>
        </div>
        <label>WEBSITE<input id="festivalWebsite" type="text" inputmode="url" placeholder="festival-website.com"></label>
      </section>
      <section class="form-section festival-application-section">
        <h3>02 // APPLICATION STATUS</h3>
        <label>RESULT<select id="festivalStatus">${FESTIVAL_STATUSES.map(status=>`<option value="${status}">${status}</option>`).join('')}</select></label>
      </section>
    </div>
    <div class="dialog-actions">
      <button type="button" class="btn danger" id="deleteFestival" hidden>DELETE FESTIVAL</button>
      <span></span>
      <button type="button" class="btn ghost festival-close">CANCEL</button>
      <button class="btn red" id="saveFestival" type="submit">SAVE FESTIVAL</button>
    </div>
  </form>
</dialog>`);

function festivalStatusClass(status){return`festival-${String(status||'WAITING').toLowerCase()}`}
function festivalNewId(){return globalThis.crypto?.randomUUID?.()||`festival-${Date.now()}-${Math.random().toString(36).slice(2)}`}
function festivalSetFormError(message=''){
  const error=$('festivalFormError');
  error.textContent=message;
  error.hidden=!message;
}
function renderFestivals(){
  const records=festivalRecords();
  const query=($('festivalSearch').value||'').trim().toLowerCase();
  const status=$('festivalStatusFilter').value;
  const format=$('festivalFormatFilter').value;
  const rows=records.filter(record=>
    `${record.name||''} ${record.location||''} ${record.website||''}`.toLowerCase().includes(query)&&
    (status==='All'||record.status===status)&&
    (format==='All'||festivalFormatValue(record.format)===format)
  );
  $('navFestivalCount').textContent=records.length;
  $('festivalTotalCount').textContent=records.length;
  $('festivalWaitingCount').textContent=records.filter(record=>record.status==='WAITING').length;
  $('festivalSelectedCount').textContent=records.filter(record=>record.status==='SELECTED').length;
  $('festivalRejectedCount').textContent=records.filter(record=>record.status==='REJECTED').length;
  $('festivalResultCount').textContent=`${rows.length} FESTIVAL${rows.length===1?'':'S'}`;
  $('festivalGrid').innerHTML=rows.map(record=>{
    const website=festivalWebsite(record.website);
    return `<article class="festival-card ${festivalStatusClass(record.status)}" data-festival-id="${escapeHtml(record.id)}">
      <div class="festival-card-top"><span class="festival-format">${escapeHtml(festivalFormatValue(record.format))}</span><span class="festival-status ${festivalStatusClass(record.status)}">${escapeHtml(record.status||'WAITING')}</span></div>
      <h3>${escapeHtml(record.name||'UNTITLED FESTIVAL')}</h3>
      <p class="festival-location"><i>⌖</i> ${escapeHtml(record.location||(festivalFormatValue(record.format)==='ONLINE'?'ONLINE':'LOCATION NOT SET'))}</p>
      <p class="festival-dates"><i>◷</i> ${escapeHtml(festivalDateRange(record))}</p>
      <div class="festival-card-foot">${website?`<a href="${escapeHtml(website)}" target="_blank" rel="noopener">OPEN WEBSITE ↗</a>`:'<span>NO WEBSITE ADDED</span>'}<small>CLICK TO EDIT</small></div>
    </article>`;
  }).join('')||'<div class="business-empty">NO FESTIVALS MATCH THIS FILTER</div>';
  $('festivalGrid').querySelectorAll('[data-festival-id]').forEach(card=>card.onclick=event=>{if(event.target.closest('a'))return;openFestival(card.dataset.festivalId)});
}

function openFestival(id=null){
  if(!festivalCloudReady())return toast('WAIT FOR SHARED DATA TO FINISH LOADING');
  editingFestivalId=id;
  const record=festivalRecords().find(item=>item.id===id)||{};
  $('festivalDialogTitle').textContent=id?'Edit festival':'New festival';
  $('festivalName').value=record.name||'';
  $('festivalLocation').value=record.location||'';
  $('festivalFormat').value=festivalFormatValue(record.format);
  $('festivalStartDate').value=record.startDate||'';
  $('festivalEndDate').value=record.endDate||'';
  $('festivalEndDate').min=record.startDate||'';
  $('festivalWebsite').value=record.website||'';
  $('festivalStatus').value=FESTIVAL_STATUSES.includes(record.status)?record.status:'WAITING';
  $('deleteFestival').hidden=!id||!!publishedSnapshot;
  festivalSetFormError();
  $('festivalDialog').showModal();
  $('festivalName').focus();
}

function saveFestival(event){
  event?.preventDefault();
  event?.stopPropagation();
  if(festivalMutationBusy)return;
  festivalSetFormError();
  try{
    if(publishedSnapshot)throw Error('THIS PUBLISHED SNAPSHOT IS VIEW ONLY');
    if(!festivalCloudReady())throw Error('WAIT FOR SHARED DATA TO FINISH LOADING');
    const name=$('festivalName').value.trim();
    const startDate=$('festivalStartDate').value;
    const endDate=$('festivalEndDate').value;
    const websiteText=$('festivalWebsite').value.trim();
    const website=festivalWebsite(websiteText);
    if(!name){$('festivalName').focus();throw Error('ADD A FESTIVAL NAME')}
    if((startDate&&!endDate)||(!startDate&&endDate))throw Error('ADD BOTH START AND END DATES');
    if(startDate&&endDate&&endDate<startDate)throw Error('END DATE MUST BE AFTER START DATE');
    if(websiteText&&!website){$('festivalWebsite').focus();throw Error('CHECK THE FESTIVAL WEBSITE')}
    const now=new Date().toISOString();
    const existing=festivalRecords().find(record=>record.id===editingFestivalId);
    const record={
      id:editingFestivalId||festivalNewId(),
      name,
      location:$('festivalLocation').value.trim(),
      format:$('festivalFormat').value,
      startDate,
      endDate,
      website,
      status:$('festivalStatus').value,
      createdAt:existing?.createdAt||now,
      updatedAt:now
    };
    const records=festivalRecords();
    const nextRecords=existing?records.map(item=>item.id===record.id?record:item):[record,...records];
    festivalMutationBusy=true;
    $('saveFestival').disabled=true;
    if(!persistFestivalRecords(nextRecords))throw Error('THE FESTIVAL COULD NOT BE SAVED');
    editingFestivalId=record.id;
    renderFestivals();
    $('festivalDialog').close();
    toast(existing?'FESTIVAL UPDATED':'FESTIVAL CREATED');
  }catch(error){
    console.error('Festival form failed',error);
    festivalSetFormError(error.message||'FESTIVAL SAVE FAILED');
    toast(error.message||'FESTIVAL SAVE FAILED');
  }finally{
    festivalMutationBusy=false;
    $('saveFestival').disabled=false;
  }
}
$('festivalForm').onsubmit=saveFestival;
$('deleteFestival').onclick=event=>{
  event.preventDefault();
  event.stopPropagation();
  if(festivalMutationBusy)return;
  if(!festivalCloudReady())return toast('WAIT FOR SHARED DATA TO FINISH LOADING');
  const record=festivalRecords().find(item=>item.id===editingFestivalId);
  if(!record||!confirm(`Delete ${record.name}?`))return;
  const nextRecords=festivalRecords().filter(item=>item.id!==record.id);
  festivalMutationBusy=true;
  $('deleteFestival').disabled=true;
  const deleted=persistFestivalRecords(nextRecords);
  festivalMutationBusy=false;
  $('deleteFestival').disabled=false;
  if(!deleted)return;
  $('festivalDialog').close();
  renderFestivals();
  toast('FESTIVAL DELETED');
};
document.querySelectorAll('.festival-close').forEach(button=>button.onclick=()=>$('festivalDialog').close());
$('festivalSearch').oninput=renderFestivals;
$('festivalStatusFilter').onchange=renderFestivals;
$('festivalFormatFilter').onchange=renderFestivals;
$('festivalStartDate').onchange=()=>{
  $('festivalEndDate').min=$('festivalStartDate').value||'';
  if($('festivalEndDate').value&&$('festivalEndDate').value<$('festivalStartDate').value)$('festivalEndDate').value=$('festivalStartDate').value;
};

const festivalPreviousSetTab=setTab;
setTab=function(tab){
  $('festivalsView').hidden=tab!=='festivals';
  if(tab!=='festivals'){festivalPreviousSetTab(tab);return}
  state.tab=tab;
  document.querySelectorAll('.nav[data-tab]').forEach(nav=>nav.classList.toggle('active',nav.dataset.tab===tab));
  document.querySelectorAll('main>section[id]').forEach(view=>view.hidden=view.id!=='festivalsView');
  $('pageTitle').textContent='Festivals';
  $('breadcrumb').textContent='FESTIVAL APPLICATIONS';
  $('pageSubtitle').textContent='Track event locations, format, websites and application results.';
  $('createBtn').hidden=!!publishedSnapshot;
  $('createBtn').disabled=!festivalCloudReady();
  $('createBtn').textContent='＋ NEW FESTIVAL';
  $('createBtn').onclick=()=>openFestival();
  renderFestivals();
};
festivalNav.onclick=()=>setTab('festivals');
window.addEventListener('skinator-cloud-ready',()=>{
  renderFestivals();
  if(state.tab==='festivals')$('createBtn').disabled=!festivalCloudReady();
});
renderFestivals();
