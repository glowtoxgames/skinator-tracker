// Use the Ongoing Tasks database as the shared source for manually created planner work.
function sharedPlannerTaskId(record){return record.plannerId||`ongoing:${record.id}`}
function plannerTaskScheduleKeys(task){
  return [...new Set([
    task?.id,
    task?.recordId,
    task?.recordId?`ongoing:${task.recordId}`:'',
    task?.plannerId
  ].filter(Boolean))];
}
function scheduledDateForPlannerTask(task){
  for(const key of plannerTaskScheduleKeys(task)){
    const date=planner.schedule?.[key];
    if(typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date))return date;
  }
  return '';
}

const TASK_MERGE_BACKUP_KEY='skinator-task-merge-backup-v1';
function normalizedTaskTitle(value){
  return String(value||'').normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
function plannerTaskForRecord(record){
  return {id:sharedPlannerTaskId(record),recordId:record.id,plannerId:record.plannerId};
}
function cloneTaskData(value){
  return JSON.parse(JSON.stringify(value));
}
function taskScheduleSnapshot(task){
  return Object.fromEntries(plannerTaskScheduleKeys(task).filter(key=>planner.schedule?.[key]).map(key=>[key,planner.schedule[key]]));
}
function archiveMergedTask(source,sourceType,canonical){
  planner.taskMergeArchive=Array.isArray(planner.taskMergeArchive)?planner.taskMergeArchive:[];
  const sourceId=String(source.id||'');
  if(planner.taskMergeArchive.some(entry=>entry.sourceType===sourceType&&entry.sourceId===sourceId))return;
  const sourceTask=sourceType==='ongoing'?plannerTaskForRecord(source):source;
  planner.taskMergeArchive.push({
    id:crypto.randomUUID(),
    sourceType,
    sourceId,
    canonicalTaskId:canonical.id,
    title:source.task||source.title||'UNTITLED TASK',
    mergedAt:new Date().toISOString(),
    schedule:taskScheduleSnapshot(sourceTask),
    record:cloneTaskData(source)
  });
}
function taskInformationScore(record){
  let score=0;
  if(String(record.notes||'').trim())score+=4;
  if(record.operator&&record.operator!=='MIXED')score+=2;
  if(record.priority&&record.priority!=='LOW')score++;
  if(record.category&&record.category!=='OTHER')score++;
  if(record.status&&record.status!=='NOT STARTED')score+=2;
  if(record.implementationStatus&&record.implementationStatus!=='NOT STARTED')score+=2;
  if(Number(record.estimatedDays)>1)score++;
  if(scheduledDateForPlannerTask(plannerTaskForRecord(record)))score++;
  return score;
}
function chooseCanonicalTask(records){
  const indexed=records.map(record=>({record,index:ongoingTaskRecords.indexOf(record),updated:Date.parse(record.updatedAt||'')||0,score:taskInformationScore(record)}));
  const hasUpdate=indexed.some(item=>item.updated);
  indexed.sort((left,right)=>{
    if(hasUpdate&&right.updated!==left.updated)return right.updated-left.updated;
    if(right.score!==left.score)return right.score-left.score;
    return left.index-right.index;
  });
  return indexed[0].record;
}
function mergeTaskFields(canonical,duplicate){
  const protectedFields=new Set(['id','plannerId','task','notes','createdAt','updatedAt']);
  Object.entries(duplicate).forEach(([field,value])=>{
    if(protectedFields.has(field))return;
    const current=canonical[field];
    if((current===undefined||current===null||current==='')&&value!==undefined&&value!==null&&value!=='')canonical[field]=cloneTaskData(value);
  });
  const canonicalNotes=String(canonical.notes||'').trim(),duplicateNotes=String(duplicate.notes||'').trim();
  if(duplicateNotes&&duplicateNotes!==canonicalNotes)canonical.notes=canonicalNotes?`${canonicalNotes}\n\nMERGED NOTE:\n${duplicateNotes}`:duplicateNotes;
  const createdDates=[canonical.createdAt,duplicate.createdAt].filter(Boolean).sort();
  if(createdDates.length)canonical.createdAt=createdDates[0];
  const updatedDates=[canonical.updatedAt,duplicate.updatedAt].filter(Boolean).sort();
  if(updatedDates.length)canonical.updatedAt=updatedDates[updatedDates.length-1];
}
function moveSchedulesToCanonical(canonical,sources){
  const targetTask=plannerTaskForRecord(canonical),targetId=targetTask.id;
  const sourceTasks=[targetTask,...sources.map(source=>source.task?plannerTaskForRecord(source):source)];
  const dates=sourceTasks.flatMap(task=>plannerTaskScheduleKeys(task).map(key=>planner.schedule?.[key])).filter(date=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date));
  sourceTasks.flatMap(plannerTaskScheduleKeys).forEach(key=>delete planner.schedule[key]);
  if(dates.length)planner.schedule[targetId]=dates[0];
}
function consolidateOngoingTaskDuplicates(){
  const groups=new Map();
  ongoingTaskRecords.forEach(record=>{
    const key=normalizedTaskTitle(record.task);
    if(!key)return;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(record);
  });
  const mergedIds=new Set();
  let mergedCount=0;
  groups.forEach(records=>{
    if(records.length<2)return;
    const canonical=chooseCanonicalTask(records),duplicates=records.filter(record=>record!==canonical);
    duplicates.forEach(duplicate=>{
      archiveMergedTask(duplicate,'ongoing',canonical);
      mergeTaskFields(canonical,duplicate);
      mergedIds.add(duplicate.id);
      mergedCount++;
    });
    moveSchedulesToCanonical(canonical,duplicates);
  });
  if(mergedIds.size)ongoingTaskRecords=ongoingTaskRecords.filter(record=>!mergedIds.has(record.id));
  return mergedCount;
}
function findSharedTaskByTitle(title,excludeId=''){
  const key=normalizedTaskTitle(title);
  return key?ongoingTaskRecords.find(record=>record.id!==excludeId&&normalizedTaskTitle(record.task)===key):null;
}

function syncTaskSources({persist=true}={}){
  planner.customTasks=Array.isArray(planner.customTasks)?planner.customTasks:[];
  let changed=false;
  planner.customTasks.forEach(custom=>{
    const linked=ongoingTaskRecords.find(record=>record.plannerId===custom.id||record.id===custom.id)||findSharedTaskByTitle(custom.title);
    if(linked){
      archiveMergedTask(custom,'legacy-planner',linked);
      if(!linked.estimatedDays)linked.estimatedDays=Number(custom.days)||1;
      if(!linked.createdAt&&custom.createdAt)linked.createdAt=custom.createdAt;
      moveSchedulesToCanonical(linked,[custom]);
      changed=true;
      return;
    }
    const category=String(custom.type||custom.source||'OTHER').toUpperCase();
    ongoingTaskRecords.push({
      id:custom.id,
      plannerId:custom.id,
      priority:'LOW',
      task:custom.title||'UNTITLED TASK',
      category,
      operator:'MIXED',
      status:custom.complete?'DONE':'NOT STARTED',
      implementationStatus:custom.complete?'DONE':'NOT STARTED',
      notes:'',
      estimatedDays:Number(custom.days)||1,
      createdAt:custom.createdAt||new Date().toISOString(),
      updatedAt:custom.updatedAt||custom.createdAt||new Date().toISOString()
    });
    if(!taskOptions('category').includes(category))taskOptionRecords.push({id:crypto.randomUUID(),optionType:'category',name:category});
    changed=true;
  });
  if(planner.customTasks.length){planner.customTasks=[];changed=true}
  ongoingTaskRecords.forEach((record,index)=>{
    if(record.createdAt)return;
    record.createdAt=new Date(Date.now()-(ongoingTaskRecords.length-index)*1000).toISOString();
    changed=true;
  });
  const mergedCount=consolidateOngoingTaskDuplicates();
  if(mergedCount)changed=true;
  if(changed&&planner.taskMergeArchive?.length)localStorage.setItem(TASK_MERGE_BACKUP_KEY,JSON.stringify(planner.taskMergeArchive));
  if(changed&&persist){saveBusiness();savePlanner()}
  return changed;
}

syncTaskSources();

function trackerTaskCompletion(id,sourceComplete){
  planner.completionOverrides=planner.completionOverrides&&typeof planner.completionOverrides==='object'?planner.completionOverrides:{};
  return !!sourceComplete||planner.completionOverrides[id]===true;
}
plannerTasks=function(){
  const characters=state.characters.map(character=>{const id=`character:${character.id}`,sourceComplete=completionFor(character).complete;return{id,source:'Character',sourceId:character.id,title:character.gameName||character.fileName||'Unnamed character',days:character.estimatedDays||1,sourceComplete,complete:trackerTaskCompletion(id,sourceComplete),createdAt:character.createdAt||''}});
  const npcs=state.npcs.map(npc=>{const id=`npc:${npc.id}`,sourceComplete=npcStatus(npc).complete;return{id,source:'NPC',sourceId:npc.id,title:npc.name||'Unnamed NPC',days:npc.estimatedDays||1,sourceComplete,complete:trackerTaskCompletion(id,sourceComplete),createdAt:npc.createdAt||''}});
  const parasiteTasks=parasytes.map(parasite=>{const id=`parasyte:${parasite.id}`,sourceComplete=parasyteIsComplete(parasite);return{id,source:'Parasite',sourceId:parasite.id,title:`${parasite.level} ${parasite.family}`,days:parasite.estimatedDays||1,sourceComplete,complete:trackerTaskCompletion(id,sourceComplete),createdAt:parasite.createdAt||''}});
  const ongoing=ongoingTaskRecords.map(record=>{const id=sharedPlannerTaskId(record),sourceComplete=taskIsFullyFinished(record);return{id,recordId:record.id,source:record.category||'Ongoing Task',title:record.task||'Untitled task',days:Number(record.estimatedDays)||1,sourceComplete,complete:sourceComplete,operator:record.operator||'MIXED',createdAt:record.createdAt||'',sharedTask:true}});
  return[...characters,...npcs,...parasiteTasks,...ongoing];
};

const TRACKER_BACKLOG_SORT_KEY='skinator-tracker-backlog-sort-v1';
const backlogSortControl=document.createElement('select');
backlogSortControl.id='trackerBacklogSort';
backlogSortControl.className='toolbar-select backlog-sort';
backlogSortControl.setAttribute('aria-label','Order draggable tasks');
backlogSortControl.innerHTML='<option value="created-desc">DATE CREATED // NEWEST</option><option value="created-asc">DATE CREATED // OLDEST</option><option value="title-asc">ALPHABETICAL // A–Z</option><option value="title-desc">ALPHABETICAL // Z–A</option>';
backlogSortControl.value=localStorage.getItem(TRACKER_BACKLOG_SORT_KEY)||'created-desc';
$('taskBacklog').querySelector(':scope > p').insertAdjacentElement('afterend',backlogSortControl);

function sortTrackerBacklog(tasks){
  const mode=backlogSortControl.value;
  return [...tasks].sort((left,right)=>{
    if(mode==='title-asc'||mode==='title-desc'){
      const result=String(left.title||'').localeCompare(String(right.title||''),undefined,{numeric:true,sensitivity:'base'});
      return mode==='title-asc'?result:-result;
    }
    const result=String(left.createdAt||'').localeCompare(String(right.createdAt||''));
    return mode==='created-asc'?result:-result;
  });
}

renderTracker=function(){
  const tasks=plannerTasks(),open=tasks.filter(task=>!task.complete),done=tasks.filter(task=>task.complete);
  const backlog=sortTrackerBacklog(open.filter(task=>!scheduledDateForPlannerTask(task)));
  $('navTaskCount').textContent=open.length;
  $('trackerOpen').textContent=open.length;
  $('trackerScheduled').textContent=tasks.filter(task=>scheduledDateForPlannerTask(task)).length;
  $('trackerDone').textContent=done.length;
  $('backlogTasks').innerHTML=backlog.map(task=>taskCard(task)).join('')||'<div class="backlog-empty">ALL OPEN WORK IS SCHEDULED</div>';
  renderCalendar(tasks);
  bindTaskInteractions();
};
backlogSortControl.onchange=()=>{
  localStorage.setItem(TRACKER_BACKLOG_SORT_KEY,backlogSortControl.value);
  renderTracker();
};

function taskOperatorClass(task){const operator=String(task.operator||'').toUpperCase();return operator==='CRAIG'?'operator-craig':operator==='PEDRO'?'operator-pedro':''}
function taskCompletionButton(task){
  if(task.sharedTask)return `<button type="button" class="task-done tracker-completion" data-shared-task-id="${task.recordId}" aria-pressed="${task.complete?'true':'false'}" title="${task.complete?'Reopen task':'Mark task complete'}">${task.complete?'✓':''}</button>`;
  return `<button type="button" class="task-done tracker-completion" data-tracker-complete-id="${escapeHtml(task.id)}" aria-pressed="${task.complete?'true':'false'}" title="${task.sourceComplete?'Completed in its source tab':task.complete?'Reopen task':'Mark task complete'}">${task.complete?'✓':''}</button>`;
}
function taskCardContent(task){return `<span class="task-type">${escapeHtml(task.source)}</span><b>${escapeHtml(task.title)}</b><small>${task.days} DAY${task.days===1?'':'S'} ${task.complete?'// COMPLETE':''}</small>${taskCompletionButton(task)}`}
taskCard=function(task,calendar=false){return `<article class="planner-task ${task.complete?'done':''} ${calendar?'compact':''} ${taskOperatorClass(task)}" draggable="true" data-task-id="${task.id}" ${task.sharedTask?`data-shared-record-id="${task.recordId}"`:''}>${taskCardContent(task)}</article>`};

function plannerDateDifference(startIso,currentIso){
  const [sy,sm,sd]=startIso.split('-').map(Number),[cy,cm,cd]=currentIso.split('-').map(Number);
  return Math.round((Date.UTC(cy,cm-1,cd)-Date.UTC(sy,sm-1,sd))/86400000);
}
function durationTaskCard(task,offset,weekday){
  const days=Math.max(1,Number(task.days)||1),weekStart=weekday===0,weekEnd=weekday===6;
  const visualStart=offset===0||weekStart,visualEnd=offset===days-1||weekEnd;
  const classes=['planner-task','compact','duration-segment',task.complete?'done':'',taskOperatorClass(task),visualStart?'duration-start':'duration-middle',visualEnd?'duration-end':''].filter(Boolean).join(' ');
  return `<article class="${classes}" draggable="true" data-task-id="${task.id}" ${task.sharedTask?`data-shared-record-id="${task.recordId}"`:''}>${visualStart?taskCardContent(task):'<span class="duration-continuation" aria-hidden="true">&nbsp;</span>'}</article>`;
}

renderCalendar=function(tasks){
  const [year,month]=planner.month.split('-').map(Number),first=new Date(year,month-1,1),start=new Date(first);
  start.setDate(first.getDate()-((first.getDay()+6)%7));
  $('calendarTitle').textContent=first.toLocaleDateString(undefined,{month:'long',year:'numeric'}).toUpperCase();
  const today=isoDate(new Date());
  let html='';
  for(let index=0;index<42;index++){
    const date=new Date(start);date.setDate(start.getDate()+index);
    const iso=isoDate(date),outside=date.getMonth()!==month-1,weekday=index%7;
    const active=tasks.map(task=>{const scheduledDate=scheduledDateForPlannerTask(task);return{task,scheduledDate,offset:scheduledDate?plannerDateDifference(scheduledDate,iso):-1}})
      .filter(item=>item.offset>=0&&item.offset<Math.max(1,Number(item.task.days)||1))
      .sort((a,b)=>a.scheduledDate.localeCompare(b.scheduledDate)||String(a.task.id).localeCompare(String(b.task.id)));
    html+=`<div class="calendar-day ${outside?'outside':''} ${iso===today?'today':''}" data-date="${iso}"><div class="day-number"><span>${date.getDate()}</span>${iso===today?'<em>TODAY</em>':''}</div><div class="day-tasks">${active.map(item=>durationTaskCard(item.task,item.offset,weekday)).join('')}</div></div>`;
  }
  $('calendarGrid').innerHTML=html;
};

const bindSharedTaskInteractions=bindTaskInteractions;
bindTaskInteractions=function(){
  bindSharedTaskInteractions();
  document.querySelectorAll('.calendar-day').forEach(day=>day.ondrop=event=>{
    event.preventDefault();
    day.classList.remove('drag-over');
    const id=event.dataTransfer.getData('text/plain');
    if(!id)return;
    const task=plannerTasks().find(item=>item.id===id);
    plannerTaskScheduleKeys(task||{id}).filter(key=>key!==id).forEach(key=>delete planner.schedule[key]);
    planner.schedule[id]=day.dataset.date;
    document.querySelector(`#backlogTasks .planner-task[data-task-id="${CSS.escape(id)}"]`)?.remove();
    savePlanner();
    renderTracker();
  });
  $('taskBacklog').ondrop=event=>{
    event.preventDefault();
    const id=event.dataTransfer.getData('text/plain');
    if(!id)return;
    const task=plannerTasks().find(item=>item.id===id);
    plannerTaskScheduleKeys(task||{id}).forEach(key=>delete planner.schedule[key]);
    savePlanner();
    renderTracker();
  };
  document.querySelectorAll('.planner-task[data-shared-record-id]').forEach(card=>card.onclick=event=>{
    if(event.target.closest('button'))return;
    openBusiness('task',card.dataset.sharedRecordId);
  });
  document.querySelectorAll('[data-shared-task-id]').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const record=ongoingTaskRecords.find(task=>task.id===button.dataset.sharedTaskId);
    if(!record)return;
    const finished=taskIsFullyFinished(record);
    record.status=finished?'NOT STARTED':'DONE';
    record.implementationStatus=finished?'NOT STARTED':'DONE';
    record.updatedAt=new Date().toISOString();
    saveBusiness();
    renderOngoing();
    renderFinished();
    renderTracker();
  });
  document.querySelectorAll('[data-tracker-complete-id]').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const id=button.dataset.trackerCompleteId,task=plannerTasks().find(item=>item.id===id);
    if(!task)return;
    planner.completionOverrides=planner.completionOverrides&&typeof planner.completionOverrides==='object'?planner.completionOverrides:{};
    if(task.sourceComplete){
      toast('THIS TASK IS COMPLETE IN ITS SOURCE TAB');
      return;
    }
    if(planner.completionOverrides[id])delete planner.completionOverrides[id];
    else planner.completionOverrides[id]=true;
    savePlanner();
    renderTracker();
  });
};

const ongoingCalendarMenu=document.createElement('div');
ongoingCalendarMenu.id='ongoingCalendarMenu';
ongoingCalendarMenu.className='task-calendar-menu';
ongoingCalendarMenu.hidden=true;
ongoingCalendarMenu.innerHTML='<button type="button" data-calendar-action="view">VIEW ON CALENDAR</button><span data-calendar-empty>NOT SCHEDULED YET</span>';
document.body.append(ongoingCalendarMenu);
let ongoingCalendarRecordId='';

function calendarEntryForOngoingRecord(record){
  if(!record)return null;
  const task={id:sharedPlannerTaskId(record),recordId:record.id,plannerId:record.plannerId};
  const date=scheduledDateForPlannerTask(task);
  return date?{task,date}:null;
}
function hideOngoingCalendarMenu(){
  ongoingCalendarMenu.hidden=true;
  ongoingCalendarRecordId='';
}
function openOngoingCalendarMenu(event,recordId){
  const record=ongoingTaskRecords.find(task=>task.id===recordId);
  if(!record)return;
  event.preventDefault();
  event.stopPropagation();
  ongoingCalendarRecordId=recordId;
  const scheduled=calendarEntryForOngoingRecord(record);
  ongoingCalendarMenu.querySelector('[data-calendar-action="view"]').hidden=!scheduled;
  ongoingCalendarMenu.querySelector('[data-calendar-empty]').hidden=!!scheduled;
  ongoingCalendarMenu.hidden=false;
  const bounds=ongoingCalendarMenu.getBoundingClientRect();
  ongoingCalendarMenu.style.left=`${Math.max(8,Math.min(event.clientX,window.innerWidth-bounds.width-8))}px`;
  ongoingCalendarMenu.style.top=`${Math.max(8,Math.min(event.clientY,window.innerHeight-bounds.height-8))}px`;
}
function bindOngoingCalendarMenu(){
  $('ongoingGrid').querySelectorAll('article.task-line').forEach(row=>{
    const recordId=row.querySelector('[data-business="task"][data-id]')?.dataset.id;
    if(!recordId)return;
    row.dataset.taskRecordId=recordId;
    row.classList.toggle('scheduled-task-row',!!calendarEntryForOngoingRecord(ongoingTaskRecords.find(task=>task.id===recordId)));
    row.oncontextmenu=event=>openOngoingCalendarMenu(event,recordId);
  });
}
function viewOngoingTaskOnCalendar(recordId){
  const record=ongoingTaskRecords.find(task=>task.id===recordId);
  const scheduled=calendarEntryForOngoingRecord(record);
  if(!scheduled){toast('THIS TASK IS NOT SCHEDULED YET');return}
  planner.month=scheduled.date.slice(0,7);
  savePlanner();
  setTab('tracker');
  renderTracker();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const day=$('calendarGrid').querySelector(`.calendar-day[data-date="${scheduled.date}"]`);
    if(!day)return;
    day.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
    day.classList.add('calendar-task-focus');
    setTimeout(()=>day.classList.remove('calendar-task-focus'),2200);
  }));
}

const renderOngoingBeforeCalendarMenu=renderOngoing;
renderOngoing=function(){
  renderOngoingBeforeCalendarMenu();
  bindOngoingCalendarMenu();
};
ongoingCalendarMenu.querySelector('[data-calendar-action="view"]').onclick=()=>{
  const recordId=ongoingCalendarRecordId;
  hideOngoingCalendarMenu();
  viewOngoingTaskOnCalendar(recordId);
};
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#ongoingCalendarMenu'))hideOngoingCalendarMenu()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideOngoingCalendarMenu()});
window.addEventListener('blur',hideOngoingCalendarMenu);
window.addEventListener('resize',hideOngoingCalendarMenu);
window.addEventListener('scroll',hideOngoingCalendarMenu,true);

const openSharedTaskEditor=openBusiness;
openBusiness=function(type,id=null){
  openSharedTaskEditor(type,id);
  if(type!=='task')return;
  const record=ongoingTaskRecords.find(task=>task.id===id)||{};
  const taskField=$('bizTask')?.closest('label');
  if(taskField&&!$('bizEstimatedDays'))taskField.insertAdjacentHTML('beforebegin',`<label>ESTIMATED DAYS<input id="bizEstimatedDays" type="number" min="1" max="365" value="${Number(record.estimatedDays)||1}"></label>`);
};

let pendingSharedTaskMetadata=null;
$('businessForm').addEventListener('submit',event=>{
  if(businessEditing?.type!=='task'){pendingSharedTaskMetadata=null;return}
  const existing=ongoingTaskRecords.find(task=>task.id===businessEditing.id);
  const duplicate=findSharedTaskByTitle($('bizTask')?.value,businessEditing.id||'');
  if(duplicate){
    event.preventDefault();
    event.stopImmediatePropagation();
    pendingSharedTaskMetadata=null;
    openBusiness('task',duplicate.id);
    toast('THIS TASK ALREADY EXISTS // OPENED THE SHARED RECORD');
    return;
  }
  pendingSharedTaskMetadata={
    id:businessEditing.id,
    beforeIds:new Set(ongoingTaskRecords.map(task=>task.id)),
    plannerId:existing?.plannerId,
    estimatedDays:Number($('bizEstimatedDays')?.value)||Number(existing?.estimatedDays)||1,
    createdAt:existing?.createdAt||new Date().toISOString(),
    updatedAt:new Date().toISOString()
  };
},true);

$('customTaskForm').onsubmit=event=>{
  event.preventDefault();
  const title=$('customTaskTitle').value.trim(),duplicate=findSharedTaskByTitle(title);
  if(duplicate){
    event.currentTarget.hidden=true;
    openBusiness('task',duplicate.id);
    toast('THIS TASK ALREADY EXISTS // OPENED THE SHARED RECORD');
    return;
  }
  const type=$('customTaskType').value;
  const category=type.toUpperCase();
  if(!taskOptions('category').includes(category))taskOptionRecords.push({id:crypto.randomUUID(),optionType:'category',name:category});
  ongoingTaskRecords.unshift({
    id:crypto.randomUUID(),
    priority:'LOW',
    task:title,
    category,
    operator:'MIXED',
    status:'NOT STARTED',
    implementationStatus:'NOT STARTED',
    notes:'',
    estimatedDays:Number($('customTaskDays').value)||1,
    createdAt:new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
  saveBusiness();
  event.currentTarget.reset();
  $('customTaskDays').value=1;
  event.currentTarget.hidden=true;
  renderOngoing();
  renderFinished();
  renderTracker();
  toast('TASK ADDED TO TRACKER AND ONGOING TASKS');
};

$('businessForm').addEventListener('submit',()=>setTimeout(()=>{
  if(pendingSharedTaskMetadata){
    const metadata=pendingSharedTaskMetadata;
    const record=metadata.id?ongoingTaskRecords.find(task=>task.id===metadata.id):ongoingTaskRecords.find(task=>!metadata.beforeIds.has(task.id));
    if(record){
      if(metadata.plannerId)record.plannerId=metadata.plannerId;
      record.estimatedDays=metadata.estimatedDays;
      record.createdAt=metadata.createdAt;
      record.updatedAt=metadata.updatedAt;
      syncTaskSources({persist:false});
      saveBusiness();
      savePlanner();
    }
    pendingSharedTaskMetadata=null;
  }
  renderOngoing();
  renderFinished();
  renderTracker();
},0));
$('businessDelete').addEventListener('click',()=>{
  const record=businessEditing?.type==='task'?ongoingTaskRecords.find(task=>task.id===businessEditing.id):null;
  const scheduleKeys=record?plannerTaskScheduleKeys(plannerTaskForRecord(record)):[];
  setTimeout(()=>{
    scheduleKeys.forEach(key=>delete planner.schedule[key]);
    if(scheduleKeys.length)savePlanner();
    renderTracker();
  },0);
});
document.addEventListener('change',event=>{
  if(!event.target.matches('select[data-task-field]'))return;
  const record=ongoingTaskRecords.find(task=>task.id===event.target.dataset.id);
  if(record){record.updatedAt=new Date().toISOString();saveBusiness()}
  setTimeout(renderTracker,0);
});

renderTracker();
