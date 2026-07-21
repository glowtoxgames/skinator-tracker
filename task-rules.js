// A task is finished only when both workflow columns are DONE.
const taskIsFullyFinished=record=>record.status==='DONE'&&record.implementationStatus==='DONE';
if(!$('ongoingSort').querySelector('option[value="category"]'))$('ongoingSort').insertAdjacentHTML('beforeend','<option value="category">SORT: CATEGORY</option>');

renderOngoing=function(){
  const query=($('ongoingSearch').value||'').toLowerCase();
  const priority=$('ongoingPriority').value;
  const status=$('ongoingStatus').value;
  let rows=ongoingTaskRecords.filter(record=>
    !taskIsFullyFinished(record)&&
    `${record.task} ${record.notes} ${record.category} ${record.operator}`.toLowerCase().includes(query)&&
    (priority==='All'||record.priority===priority)&&
    (status==='All'||record.status===status)
  );
  rows=sortTasks(rows,$('ongoingSort').value);
  $('navOngoingCount').textContent=ongoingTaskRecords.filter(record=>!taskIsFullyFinished(record)).length;
  $('ongoingResultCount').textContent=plural(rows.length,'TASK');
  $('ongoingGrid').innerHTML=taskRowsHtml(rows);
  bindTaskBoard($('ongoingGrid'));
};

renderFinished=function(){
  const query=($('finishedSearch').value||'').toLowerCase();
  let rows=ongoingTaskRecords.filter(record=>taskIsFullyFinished(record)&&`${record.task} ${record.notes} ${record.category} ${record.operator}`.toLowerCase().includes(query));
  rows=sortTasks(rows,$('finishedSort').value);
  $('navFinishedCount').textContent=ongoingTaskRecords.filter(taskIsFullyFinished).length;
  $('finishedResultCount').textContent=plural(rows.length,'FINISHED TASK');
  $('finishedGrid').innerHTML=rows.length?taskRowsHtml(rows):'<div class="business-empty">NO FINISHED TASKS YET</div>';
  bindTaskBoard($('finishedGrid'));
};

$('ongoingSort').onchange=renderOngoing;
$('finishedSort').onchange=renderFinished;
$('finishedSearch').oninput=renderFinished;
renderOngoing();renderFinished();
