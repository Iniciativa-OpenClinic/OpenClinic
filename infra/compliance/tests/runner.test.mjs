import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, makePlan, createDraft, verify, rootDir } from '../runner.mjs';
import { loadCatalog, validateCatalog, selectScenarios, coverageRows, localPath } from '../lib/catalog.mjs';
import { exitCode, integrationReady, executeNpm, parseCounts, writeReport } from '../lib/execution.mjs';

function fixture() {
  const base=path.join(rootDir,'.temp');fs.mkdirSync(base,{recursive:true});
  const dir=fs.mkdtempSync(path.join(base,'compliance-test-'));
  return {dir,close:()=>fs.rmSync(dir,{recursive:true,force:true})};
}
test('CLI accepts only canonical commands',()=>{
  for (const flag of ['--quick','--full','--report','--review','report']) assert.throws(()=>parseArgs([flag]));
  assert.equal(parseArgs(['verify','--profile','local']).profile,'local');
  assert.throws(()=>parseArgs(['verify','--scope']));
  assert.throws(()=>parseArgs(['verify','--profile','production']));
  assert.throws(()=>parseArgs(['verify','--timeout-ms','NaN']));
  assert.throws(()=>parseArgs(['verify','--bogus']));
});
test('repository catalog has unique IDs, valid local sources and exact existing test titles',()=>{
  const c=loadCatalog(rootDir);
  assert.ok(c.scenarios.length>0);
  assert.ok(selectScenarios(c,'sessions').every(s=>s.module==='sessions'));
  assert.throws(()=>selectScenarios(c,'unknown'));
  const broken=structuredClone(c);broken.scenarios.push(broken.scenarios[0]);
  assert.ok(validateCatalog(broken,rootDir).some(e=>e.includes('duplicate')));
  const missing=structuredClone(c);missing.scenarios[0].sources=['../missing'];
  assert.ok(validateCatalog(missing,rootDir).some(e=>e.includes('unsafe')));
});
test('full suite success does not promote partially mapped scenarios',()=>{
  const c=loadCatalog(rootDir);
  const rows=coverageRows(selectScenarios(c,'sessions'),[{id:'unit',status:'PASSED'}]);
  assert.ok(rows.every(r=>r.result==='NOT_VERIFIED'));
  assert.ok(rows.some(r=>r.mapping==='gap'));
});
test('integration requires explicit authorization and connection with no fallback',()=>{
  const atoms = {DB_HOST:'127.0.0.1', DB_PORT:'5432', DB_NAME:'postgres', DB_USER:'test', DB_PASS:'synthetic'};
  assert.ok(integrationReady({...atoms, DB_PASS:''},true));
  assert.ok(integrationReady({...atoms, DB_HOST:'example.invalid'},true));
  assert.ok(integrationReady({...atoms, DB_NAME:'application'},true));
  assert.ok(integrationReady(atoms,false));
  assert.equal(integrationReady(atoms,true),null);
});
test('gate failures and skips propagate different exit codes',()=>{
  assert.equal(exitCode([{status:'PASSED'}]),0);
  assert.equal(exitCode([{status:'PASSED'},{status:'FAILED'}]),1);
  assert.equal(exitCode([{status:'PASSED'},{status:'SKIPPED'}]),2);
  assert.equal(exitCode([{status:'BLOCKED'}]),2);
  assert.equal(exitCode([]),2);
});
test('summary parsing never treats unknown counts as zero',()=>{
  assert.equal(parseCounts('application booted'),null);
  assert.equal(parseCounts(' Tests  8 passed | 1 skipped (9)').skipped,1);
  assert.equal(parseCounts('# tests 3\n# pass 2\n# fail 0\n# skipped 1').skipped,1);
});
test('executor captures nonzero exits, skips, unavailable npm and timeout without retaining secrets',async()=>{
  const f=fixture();
  try {
    const cli=path.join(f.dir,'fake-npm.mjs');
    fs.writeFileSync(cli,"console.log('Cookie: synthetic-secret'); console.log('# tests 1\\n# pass 0\\n# fail 1'); process.exit(1);");
    const options={env:{...process.env,npm_execpath:cli},timeoutMs:2000};
    const failure=await executeNpm(f.dir,['run','test'],options);
    assert.equal(failure.status,'FAILED');assert.equal(failure.exitCode,1);
    assert.ok(!JSON.stringify(failure).includes('synthetic-secret'));
    fs.writeFileSync(cli,"console.log('# tests 1\\n# pass 0\\n# fail 0\\n# skipped 1');");
    assert.equal((await executeNpm(f.dir,[],options)).status,'SKIPPED');
    fs.writeFileSync(cli,'setInterval(()=>{},1000);');
    assert.equal((await executeNpm(f.dir,[],{...options,timeoutMs:100})).status,'FAILED');
    assert.equal((await executeNpm(f.dir,[],{env:{}})).status,'BLOCKED');
  } finally {f.close();}
});
test('reports are unique and never claim specialist certification',()=>{
  const f=fixture();
  try {
    const result={createdAt:new Date().toISOString(),project:{name:'derived-app',version:'2.0.0'},identity:{commit:'abc'},scope:'all',profile:'local',exitCode:0,gates:[{id:'unit',status:'PASSED',command:'npm run test',durationMs:5,exitCode:0,counts:null,reason:'completed'}],scenarios:coverageRows(selectScenarios(loadCatalog(rootDir),'auth'))};
    const a=writeReport(f.dir,result),b=writeReport(f.dir,result);
    assert.notEqual(a,b);
    const text=fs.readFileSync(path.join(f.dir,a),'utf8');
    assert.ok(text.includes('NOT_VERIFIED'));assert.ok(text.includes('inconclusivo'));
    assert.ok(!text.includes('100%'));assert.ok(!text.includes('9.82'));
  } finally {f.close();}
});
test('draft creation supports new modules without activating or executing a scenario',()=>{
  const f=fixture();
  try {
    fs.mkdirSync(path.join(f.dir,'infra/compliance/scenarios'),{recursive:true});
    const c={schemaVersion:1,modules:[],scenarios:[]};
    createDraft(f.dir,c,{module:'scheduling',id:'SCH-CREATE-001',title:'Criar agendamento'});
    assert.equal(c.scenarios[0].status,'draft');
    assert.equal(c.scenarios[0].required,false);
    assert.equal(selectScenarios(c,'all').length,0);
    assert.throws(()=>createDraft(f.dir,c,{module:'scheduling',id:'SCH-CREATE-001',title:'Duplicate'}));
    assert.throws(()=>localPath(f.dir,'../outside'));
  } finally {f.close();}
});
test('plan rejects missing scripts instead of silently passing',()=>{
  assert.throws(()=>makePlan({profiles:{local:['x']},gates:{x:{script:'unknown'}}},{scripts:{}},{profile:'local'}));
});

test('verification continues independent gates after failure and propagates the aggregate result',async()=>{
  const calls=[];
  const config={profiles:{local:['first','second']},gates:{first:{script:'first'},second:{script:'second'}}};
  const code=await verify(rootDir,config,{name:'fixture',version:'0',scripts:{first:'x',second:'y'}},loadCatalog(rootDir),{scope:'auth',profile:'local',noReport:true,timeoutMs:1000},async(root,args)=>{calls.push(args[1]);return {status:args[1]==='first'?'FAILED':'PASSED',exitCode:args[1]==='first'?1:0,durationMs:1,counts:null,reason:'synthetic'};});
  assert.equal(code,1);assert.deepEqual(calls,['first','second']);
});
test('strict mode and missing test counts cannot silently approve coverage',async()=>{
  const config={profiles:{local:['test']},gates:{test:{script:'test',requiresTests:true}}};
  const options={scope:'auth',profile:'local',noReport:true,timeoutMs:1000,strict:true};
  const manifest={name:'fixture',version:'0',scripts:{test:'x'}};
  assert.equal(await verify(rootDir,config,manifest,loadCatalog(rootDir),options,async()=>({status:'PASSED',exitCode:0,durationMs:1,counts:null})),2);
  assert.equal(await verify(rootDir,config,manifest,loadCatalog(rootDir),options,async()=>({status:'PASSED',exitCode:0,durationMs:1,counts:{executed:1}})),2);
});
test('unapproved integration never starts the child command',async()=>{
  const config={profiles:{integration:['postgres']},gates:{postgres:{script:'db',disposable:true}}};
  const code=await verify(rootDir,config,{name:'fixture',version:'0',scripts:{db:'x'}},loadCatalog(rootDir),{scope:'sessions',profile:'integration',noReport:true,allowDisposable:false},async()=>{assert.fail('Integration must not execute');});
  assert.equal(code,2);
});
