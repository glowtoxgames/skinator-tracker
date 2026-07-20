// Consistent visual coding for task-board categories, operators and workflow states.
const taskOperatorPalette=['#62b6ff','#ff8f70','#70d79a','#d78cff','#f2c45f','#5fd0ce','#ef78b5','#a6d46f'];
const taskWorkflowColors={
  'NOT STARTED':'#ef5b64',
  'WIP':'#efc14f',
  'TO BE IMPLEMENTED':'#b78cff',
  'DONE':'#5bd28a',
  'ON HOLD':'#9298a2'
};
function stableTaskColor(value,palette){let hash=0;for(const character of String(value||''))hash=(hash*31+character.charCodeAt(0))>>>0;return palette[hash%palette.length]}
function decorateTaskColors(root=document){root.querySelectorAll('select[data-task-field]').forEach(select=>{const field=select.dataset.taskField,value=select.value;let color='';if(field==='category')color=taskCategoryColor(value);else if(field==='operator')color=stableTaskColor(value,taskOperatorPalette);else if(field==='status'||field==='implementationStatus')color=taskWorkflowColors[value]||'#9298a2';if(color){select.style.setProperty('--field-color',color);select.classList.add('task-coded-select')}})}
const renderOngoingBeforeColors=renderOngoing;
renderOngoing=function(){renderOngoingBeforeColors();decorateTaskColors($('ongoingGrid'))};
const renderFinishedBeforeColors=renderFinished;
renderFinished=function(){renderFinishedBeforeColors();decorateTaskColors($('finishedGrid'))};
renderOngoing();renderFinished();
