const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const output = mkdtempSync(path.join(tmpdir(), 'cfts-volume-test-'));
execFileSync(process.execPath, [path.join(root,'node_modules/typescript/bin/tsc'), path.join(root,'src/utils/planAnalysis.ts'), '--outDir', output, '--module','commonjs','--target','es2023','--skipLibCheck'], {stdio:'inherit'});
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
