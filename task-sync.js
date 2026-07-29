// Use the Ongoing Tasks database as the shared source for manually created planner work.
function sharedPlannerTaskId(record){return record.plannerId||`ongoing:${record.id}`}

function syncTaskSources({persist=true}={}){
  planner.customTasks=Array.isArray(planner.customTasks)?planner.customTasks:[];
  let changed=false;
  planner.customTasks.forEach(custom=>{
    if(ongoingTaskRecords.some(record=>record.plannerId===custom.id||record.id===custom.id))return;
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
      estimatedDays:Number(custom.days)||1
    });
    if(!taskOptions('category').includes(category))taskOptionRecords.push({id:crypto.randomUUID(),optionType:'category',name:category});
    changed=true;
  });
  if(planner.customTasks.length){planner.customTasks=[];changed=true}
  if(changed&&persist){saveBusiness();savePlanner()}
  return changed;
}

syncTaskSources();

plannerTasks=function(){
  const characters=state.characters.map(character=>({id:`character:${character.id}`,source:'Character',sourceId:character.id,title:character.gameName||character.fileName||'Unnamed character',days:character.estimatedDays||1,complete:completionFor(character).complete}));
  const npcs=state.npcs.map(npc=>({id:`npc:${npc.id}`,source:'NPC',sourceId:npc.id,title:npc.name||'Unnamed NPC',days:npc.estimatedDays||1,complete:npcStatus(npc).complete}));
  const parasiteTasks=parasytes.map(parasite=>({id:`parasyte:${parasite.id}`,source:'Parasite',sourceId:parasite.id,title:`${parasite.level} ${parasite.family}`,days:parasite.estimatedDays||1,complete:parasyteIsComplete(parasite)}));
  const ongoing=ongoingTaskRecords.map(record=>({id:sharedPlannerTaskId(record),recordId:record.id,source:record.category||'Ongoing Task',title:record.task||'Untitled task',days:Number(record.estimatedDays)||1,complete:taskIsFullyFinished(record),operator:record.operator||'MIXED',sharedTask:true}));
  return[...characters,...npcs,...parasiteTasks,...ongoing];
};

function taskOperatorClass(task){const operator=String(task.operator||'').toUpperCase();return operator==='CRAIG'?'operator-craig':operator==='PEDRO'?'operator-pedro':''}
function sharedTaskButton(task){return task.sharedTask?`<button type="button" class="task-done shared-completion" data-shared-task-id="${task.recordId}" aria-pressed="${task.complete?'true':'false'}" title="${task.complete?'Reopen task':'Mark task complete'}">${task.complete?'✓':''}</button>`:''}
function taskCardContent(task){return `<span class="task-type">${escapeHtml(task.source)}</span><b>${escapeHtml(task.title)}</b><small>${task.days} DAY${task.days===1?'':'S'} ${task.complete?'// COMPLETE':''}</small>${sharedTaskButton(task)}`}
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
    const active=tasks.map(task=>({task,offset:planner.schedule[task.id]?plannerDateDifference(planner.schedule[task.id],iso):-1}))
      .filter(item=>item.offset>=0&&item.offset<Math.max(1,Number(item.task.days)||1))
      .sort((a,b)=>String(planner.schedule[a.task.id]).localeCompare(String(planner.schedule[b.task.id]))||String(a.task.id).localeCompare(String(b.task.id)));
    html+=`<div class="calendar-day ${outside?'outside':''} ${iso===today?'today':''}" data-date="${iso}"><div class="day-number"><span>${date.getDate()}</span>${iso===today?'<em>TODAY</em>':''}</div><div class="day-tasks">${active.map(item=>durationTaskCard(item.task,item.offset,weekday)).join('')}</div></div>`;
  }
  $('calendarGrid').innerHTML=html;
};

const bindSharedTaskInteractions=bindTaskInteractions;
bindTaskInteractions=function(){
  bindSharedTaskInteractions();
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
    saveBusiness();
    renderOngoing();
    renderFinished();
    renderTracker();
  });
};

const openSharedTaskEditor=openBusiness;
openBusiness=function(type,id=null){
  openSharedTaskEditor(type,id);
  if(type!=='task')return;
  const record=ongoingTaskRecords.find(task=>task.id===id)||{};
  const taskField=$('bizTask')?.closest('label');
  if(taskField&&!$('bizEstimatedDays'))taskField.insertAdjacentHTML('beforebegin',`<label>ESTIMATED DAYS<input id="bizEstimatedDays" type="number" min="1" max="365" value="${Number(record.estimatedDays)||1}"></label>`);
};

let pendingSharedTaskMetadata=null;
$('businessForm').addEventListener('submit',()=>{
  if(businessEditing?.type!=='task'){pendingSharedTaskMetadata=null;return}
  const existing=ongoingTaskRecords.find(task=>task.id===businessEditing.id);
  pendingSharedTaskMetadata={
    id:businessEditing.id,
    beforeIds:new Set(ongoingTaskRecords.map(task=>task.id)),
    plannerId:existing?.plannerId,
    estimatedDays:Number($('bizEstimatedDays')?.value)||Number(existing?.estimatedDays)||1
  };
},true);

$('customTaskForm').onsubmit=event=>{
  event.preventDefault();
  const type=$('customTaskType').value;
  const category=type.toUpperCase();
  if(!taskOptions('category').includes(category))taskOptionRecords.push({id:crypto.randomUUID(),optionType:'category',name:category});
  ongoingTaskRecords.unshift({
    id:crypto.randomUUID(),
    priority:'LOW',
    task:$('customTaskTitle').value.trim(),
    category,
    operator:'MIXED',
    status:'NOT STARTED',
    implementationStatus:'NOT STARTED',
    notes:'',
    estimatedDays:Number($('customTaskDays').value)||1
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
      saveBusiness();
    }
    pendingSharedTaskMetadata=null;
  }
  renderOngoing();
  renderFinished();
  renderTracker();
},0));
$('businessDelete').addEventListener('click',()=>setTimeout(renderTracker,0));
document.addEventListener('change',event=>{
  if(event.target.matches('select[data-task-field]'))setTimeout(renderTracker,0);
});

renderTracker();
