const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'cfts-volume-test-'));
execFileSync(process.execPath, [path.join(root,'node_modules/typescript/bin/tsc'), path.join(root,'src/utils/planAnalysis.ts'), path.join(root,'src/utils/fineTuning.ts'), path.join(root,'src/utils/weightTools.ts'), '--outDir', output, '--module','commonjs','--target','es2023','--skipLibCheck'], {stdio:'inherit'});
after(() => {
  const relative = path.relative(path.resolve(tmpdir()), path.resolve(output));
  assert.ok(!relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(output).startsWith('cfts-volume-test-'));
  rmSync(output, {recursive:true,force:true});
});
const { analysePlan } = require(path.join(output,'utils/planAnalysis.js'));
const ex = (muscle, sets, id=1) => ({exercise_id:id, muscle,target_sets:sets,joint_action:null,plane:null,name:`Exercise ${id}`});
const day = (id, weekday, sets, muscle='quads') => ({id,weekday,name:`Day ${id}`,exercises:[ex(muscle,sets)]});
const analyse = workouts => analysePlan({workouts}, ['quads','abs']);
const row = result => result.rows.find(r=>r.muscle==='quads');
test('TNF 2x: six per day, twelve per week is in range',()=>{
  const a=analyse([day(1,0,6),day(2,3,6)]);
  assert.equal(row(a).status,'ok'); assert.equal(row(a).frequency,2);
  assert.deepEqual(row(a).baseline,{min:2,max:6});
  assert.equal(a.warnings.filter(w=>w.kind==='volumen').length,0);
});
test('TNF 3+ uses 1–3 per day, not fixed weekly limits',()=>{
  assert.equal(row(analyse([day(1,0,3),day(2,2,3),day(3,4,3)])).status,'ok');
  assert.equal(row(analyse([day(1,0,4),day(2,2,2),day(3,4,2)])).status,'high');
  assert.equal(row(analyse([day(1,0,1),day(2,2,1),day(3,4,1),day(4,6,1)])).baseline.max,3);
});
test('TNF 1x has six-plus, with no invented upper limit or frequency warning',()=>{
  const a=analyse([day(1,0,20)]);
  assert.equal(row(a).status,'ok'); assert.equal(row(a).baseline.max,null);
  assert.equal(a.warnings.filter(w=>w.kind==='frecuencia').length,0);
  assert.equal(row(analyse([day(1,0,5)])).status,'low');
});
test('uneven 1 and 7 sets warns twice, even though average four is in range',()=>{
  const a=analyse([day(1,0,1),day(2,3,7)]);
  assert.equal(row(a).status,'mixed');
  assert.equal(a.warnings.filter(w=>w.kind==='volumen').length,2);
});
test('two workouts on same weekday count as one exposure with summed sets',()=>{
  const r=row(analyse([day(1,0,3),day(2,0,3)]));
  assert.equal(r.frequency,1); assert.equal(r.weeklySets,6); assert.equal(r.status,'ok');
});
test('zero/unset sets do not add frequency, missing muscles are descriptive',()=>{
  const a=analyse([day(1,0,0),day(2,3,6)]);
  assert.equal(row(a).frequency,1);
  assert.equal(a.rows.find(r=>r.muscle==='abs').status,'missing');
  assert.equal(a.warnings.filter(w=>w.kind==='volumen').length,0);
});
test('unscheduled copies are excluded once calendar exists',()=>{
  assert.equal(row(analyse([day(1,0,6),day(2,null,99)])).weeklySets,6);
});
test('chest regions and traps/rhomboids use common TNF muscle groups',()=>{
  const a=analyse([{id:1,weekday:0,name:'Upper',exercises:[ex('chest',2,1),ex('upper_pec',2,2),ex('lower_pec',2,3),ex('upper_back',3,4),ex('traps',3,5)]}]);
  assert.equal(a.rows.find(r=>r.muscle==='chest').weeklySets,6);
  assert.equal(a.rows.find(r=>r.muscle==='upper_back').weeklySets,6);
  assert.equal(a.rows.some(r=>r.muscle==='upper_pec'||r.muscle==='traps'),false);
});

const { fineTune, tuningTarget } = require(path.join(output,'utils/fineTuning.js'));
const { redundantPairs } = require(path.join(output,'utils/planAnalysis.js'));
const options = {minutes:60,restMinutes:3,executionMinutes:1,priorities:{chest:'high',triceps:'medium'}};
const trainingDay = (id, weekday) => ({id,weekday,name:`Upper ${id}`,exercises:[
  {...ex('upper_pec',3,1),id:id*10+1}, {...ex('chest',3,2),id:id*10+2}, {...ex('lower_pec',3,3),id:id*10+3},
  {...ex('triceps',3,4),id:id*10+4}, {...ex('side_delt',3,5),id:id*10+5}]});
test('priority sums chest regions to six, medium four and sufficient two',()=>{
  const routine={workouts:[trainingDay(1,0),trainingDay(2,3)]};
  const before=JSON.stringify(routine);
  const p=fineTune(routine,options);
  assert.equal(p.feasible,true); assert.equal(JSON.stringify(routine),before);
  assert.equal(p.days[0].sets,12); assert.equal(p.days[0].minutes,48);
  assert.equal(p.days[0].groups.find(g=>g.muscle==='chest').sets,6);
  assert.deepEqual(p.changes.slice(0,3).map(c=>c.target_sets),[2,2,2]);
  assert.equal(p.days[0].groups.find(g=>g.muscle==='triceps').sets,4);
});
test('tight budget preserves minimum, prioritizes chest and reduces medium',()=>{
  const p=fineTune({workouts:[trainingDay(1,0),trainingDay(2,3)]},{...options,minutes:40});
  assert.equal(p.feasible,true); assert.equal(p.days[0].minutes,40);
  assert.equal(p.days[0].groups.find(g=>g.muscle==='chest').sets,6);
  assert.equal(p.days[0].groups.find(g=>g.muscle==='triceps').sets,2);
});
test('impossible budget is explicit and cannot be applied',()=>{
  const p=fineTune({workouts:[trainingDay(1,0),trainingDay(2,3)]},{...options,minutes:20});
  assert.equal(p.feasible,false); assert.ok(p.days[0].problems[0].includes('28 min'));
});
test('frequency three cannot hide four selected variants behind an average',()=>{
  const d=[0,2,4].map((weekday,i)=>({id:i+1,weekday,name:'Chest',exercises:[1,2,3,4].map(j=>({...ex('chest',1,j),id:i*10+j}))}));
  const p=fineTune({workouts:d},options); assert.equal(p.feasible,false);
  assert.ok(p.days[0].problems.some(s=>s.includes('4 ejercicios')));
});
test('same weekday gets one joint budget; unassigned days are unchanged',()=>{
  const p=fineTune({workouts:[trainingDay(1,0),trainingDay(2,0),trainingDay(3,null)]},options);
  assert.equal(p.days.length,1); assert.equal(p.changes.length,10);
  assert.equal(p.days[0].groups[0].frequency,1);
  assert.equal(p.feasible,false);
});
test('zero-set slots stay excluded; 2.5-minute rests are stored as 150',()=>{
  const w=trainingDay(1,0);w.exercises.push({...ex('quads',0,100),id:100});
  const p=fineTune({workouts:[w,trainingDay(2,3)]},{...options,restMinutes:2.5});
  assert.ok(!p.changes.some(c=>c.id===100)); assert.equal(p.changes[0].rest_seconds,150);
  assert.equal(p.days[0].minutes,42);
});
test('F1 and F3 have explicit target policies; invalid numbers rejected',()=>{
  assert.deepEqual(['sufficient','medium','high'].map(p=>tuningTarget(1,p)),[6,8,10]);
  assert.deepEqual(['sufficient','medium','high'].map(p=>tuningTarget(3,p)),[1,2,3]);
  assert.throws(()=>fineTune({workouts:[]},{...options,minutes:NaN}));
});
test('same joint action is not proof of redundant exercises',()=>{
  for (const [a,b,muscle,action] of [
    ['Overhead Cable Triceps Extension','Smith Machine JM Press','triceps','Elbow Extension'],
    ['Leg Extension','Hack Squat','quads','Knee Extension'],
    ['1-Arm Cable Row','T-Bar Row','upper_back','Horizontal Pull']]) {
    assert.equal(redundantPairs([{...ex(muscle,3,1),name:a,joint_action:action},{...ex(muscle,3,2),name:b,joint_action:action}]).size,0);
  }
});

test('exercise priorities reorder each day stably without crossing days',()=>{
  const w=trainingDay(1,0); const other=trainingDay(2,3);
  w.exercises.forEach((e,i)=>e.order_index=i);other.exercises.forEach((e,i)=>e.order_index=i);
  const original=JSON.stringify(w);
  const p=fineTune({workouts:[w,other]},{...options,priorities:{triceps:'high',side_delt:'medium'}});
  assert.deepEqual(p.orders[0].slot_ids,[14,15,11,12,13]);
  assert.deepEqual(p.orders[1].slot_ids,[24,25,21,22,23]);
  assert.equal(JSON.stringify(w),original);
});

const {plates,displayWeight,storedWeight}=require(path.join(output,'utils/weightTools.js'));
test('plate calculator includes bar, balances sides and handles unreachable totals',()=>{
 assert.deepEqual(plates(135,45,[45,25,10,5,2.5]).result,[{weight:45,count:1}]);
 assert.equal(plates(22,20,[1.25]).actual,20);
 assert.equal(plates(22,20,[1.25]).exact,false);
 assert.equal(plates(10,20,[5]),null);
 assert.deepEqual(plates(32,20,[4,3]).result,[{weight:3,count:2}]);
 assert.equal(plates(20,20,[5]).exact,true);
});
test('weight unit conversion stores kilograms and round trips within display precision',()=>{
 assert.equal(displayWeight(100,'lb'),220.46);
 assert.ok(Math.abs(storedWeight(220.46,'lb')-100)<.01);
 assert.equal(storedWeight(40,'kg'),40);
});
