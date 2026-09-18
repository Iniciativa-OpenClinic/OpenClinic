#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { randomUUID } from 'node:crypto';
import { loadCatalog, selectScenarios, coverageRows, localPath } from './lib/catalog.mjs';
import { executeNpm, integrationReady, exitCode, repositoryIdentity, writeReport } from './lib/execution.mjs';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const messages = readJson(new URL('./locales/pt-BR.json', import.meta.url));
const help = `npm run compliance -- <command> [options]

Commands:
  verify                  Run registered gates and record evidence
  catalog list            List scenarios and mapping gaps
  catalog validate        Validate IDs, local sources and test references
  catalog new             Create a draft scenario; never marks it verified
  guide                   Prepare a local prompt bundle for an AI assistant

Options:
  --scope auth,sessions    Catalog scope; all selects every active module
  --profile local          local or integration
  --task review            verification, architecture, governance, review, catalog
  --non-interactive        Never prompt (CI)
  --dry-run                Display plan without running gates or writing reports
  --allow-disposable       Explicit authorization for integration test resources
  --timeout-ms 600000       Timeout per gate (1000..3600000)
  --strict                 Exit 2 while any selected scenario is unverified
  --no-report              Do not persist verification results
  --module <id> --id <ID> --title <text>   Draft scenario inputs
  --help                   Show help

No arguments: interactive menu when a terminal is available.
No default database credentials.
Exit codes: 0 selected operation/gates completed; 1 failures;
2 invalid input, missing prerequisites or incomplete strict verification.
`;

export function parseArgs(argv) {
  const result = { command: null, action: null, scope: 'all', profile: 'local', task: 'review', timeoutMs: 600000 };
  const values = new Map([['--scope','scope'],['--profile','profile'],['--task','task'],['--timeout-ms','timeoutMs'],['--module','module'],['--id','id'],['--title','title']]);
  const booleans = new Map([['--non-interactive','nonInteractive'],['--dry-run','dryRun'],['--allow-disposable','allowDisposable'],['--strict','strict'],['--no-report','noReport'],['--help','help']]);
  for (let i=0;i<argv.length;i++) {
    const arg=argv[i];
    if (values.has(arg)) {
      if (!argv[i+1] || argv[i+1].startsWith('--')) throw new Error('Missing value: ' + arg);
      result[values.get(arg)] = argv[++i];
    } else if (booleans.has(arg)) result[booleans.get(arg)]=true;
    else if (!arg.startsWith('-') && !result.command) result.command=arg;
    else if (!arg.startsWith('-') && result.command==='catalog' && !result.action) result.action=arg;
    else throw new Error('Unknown argument: ' + arg);
  }
  if(result.command && !['verify','catalog','guide'].includes(result.command)) throw new Error('Unknown command');
  if(!['local','integration'].includes(result.profile)) throw new Error('Unknown profile');
  result.timeoutMs=Number(result.timeoutMs);
  if(!Number.isInteger(result.timeoutMs)||result.timeoutMs<1000||result.timeoutMs>3600000) throw new Error('Invalid timeout');
  return result;
}

export function makePlan(config, manifest, options) {
  const ids=config.profiles[options.profile];
  if(!Array.isArray(ids)||!ids.length) throw new Error('Empty profile');
  return ids.map(id=>{
    const g=config.gates[id];
    if(!g || (g.kind!=='catalog' && (!/^[a-z][a-z0-9:-]*$/.test(g.script) || typeof manifest.scripts?.[g.script]!=='string'))) throw new Error('Invalid gate or missing npm script: '+id);
    return { ...g, id, command:g.kind==='catalog'?'catalog validate':'npm run '+g.script };
  });
}

export async function verify(root, config, manifest, catalog, options, executor=executeNpm) {
  const scenarios=selectScenarios(catalog, options.scope);
  if(!scenarios.length) throw new Error('No active scenarios selected');
  const plan=makePlan(config,manifest,options);
  console.log(messages.plan);
  for(const g of plan) console.log('  '+g.id+': '+g.command+(g.disposable?' [disposable]':''));
  console.log('  Catalog: '+scenarios.length+'; unit/typecheck suites run globally.');
  if(options.dryRun) return 0;
  const identity=repositoryIdentity(root);
  const gates=[];
  for(const g of plan) {
    console.log(messages.start+': '+g.id);
    let outcome;
    const blocked=g.disposable?integrationReady(process.env,options.allowDisposable):null;
    if(blocked) outcome={status:'BLOCKED',exitCode:null,durationMs:0,counts:null,reason:blocked};
    else if(g.kind==='catalog') {
      const start=Date.now();loadCatalog(root);
      outcome={status:'PASSED',exitCode:0,durationMs:Date.now()-start,counts:null,reason:'Catalog references validated; application scenarios not executed'};
    } else {
      const heartbeat=setInterval(()=>console.log(messages.running+' '+g.id),30000);
      try { outcome=await executor(root,['run',g.script],{timeoutMs:options.timeoutMs}); }
      finally { clearInterval(heartbeat); }
    }
    if(g.requiresTests && outcome.status==='PASSED' && (!outcome.counts || !outcome.counts.executed)) outcome={...outcome,status:'BLOCKED',reason:'No recognized executed-test summary; no approval inferred'};
    gates.push({id:g.id,command:g.command,...outcome});
    console.log('  '+outcome.status+' ('+outcome.durationMs+' ms)');
    if(outcome.cancelled) {for(const pending of plan.slice(gates.length))gates.push({id:pending.id,command:pending.command,status:'BLOCKED',exitCode:null,durationMs:0,counts:null,reason:'Not started after cancellation'});break;}
  }
  const rows=coverageRows(scenarios,gates);
  let code=exitCode(gates);
  if(!code && options.strict && rows.some(s=>s.required&&s.result!=='PASSED')) code=2;
  const result={schemaVersion:1,createdAt:new Date().toISOString(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,project:{name:manifest.name,version:manifest.version},identity,scope:options.scope,profile:options.profile,exitCode:code,gates,scenarios:rows};
  if(!options.noReport) console.log(messages.report+': '+writeReport(root,result));
  return code;
}

export function createDraft(root,catalog,options) {
  if(!/^[a-z][a-z0-9-]*$/.test(options.module??'')||!/^[A-Z][A-Z0-9]*-[A-Z0-9]+-\d{3}$/.test(options.id??'')||!options.title?.trim()) throw new Error('Draft requires valid --module, --id and --title');
  if(catalog.scenarios.some(s=>s.id===options.id)) throw new Error('Scenario ID already exists');
  if(options.dryRun) return;
  if(!catalog.modules.some(m=>m.id===options.module)) catalog.modules.push({id:options.module,title:options.module});
  catalog.scenarios.push({id:options.id,module:options.module,title:options.title,status:'draft',priority:'P2',required:false,method:'manual',applicability:'Definir contrato e condição de aplicação antes de ativar.',sources:['infra/compliance/prompts/scenario-catalog-maintenance.md'],preconditions:['Definir fixtures e ambiente autorizado.'],steps:['Descrever reprodução concreta.'],expected:['Definir resultado observável.'],cleanup:'Definir limpeza restrita às fixtures.',tests:[],coverageNote:'Rascunho sem cobertura; revisar antes de ativar.'});
  const file=path.join(root,'infra/compliance/scenarios/catalog.json');
  fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
}

export function prepareGuide(root, config, catalog, options) {
  const chosen=config.tasks[options.task];
  if(!chosen) throw new Error('Unknown guide task');
  const active=selectScenarios(catalog,options.scope);
  const selected=options.task==='catalog'?catalog.scenarios.filter(s=>options.scope==='all'||options.scope.split(',').includes(s.module)):active;
  const names=[...new Set(['audit-protocol.md',...Object.values(config.tasks)])];
  const content=names.map(name=>{
    if(!/^[a-z-]+\.md$/.test(name)) throw new Error('Invalid prompt path');
    const relative='infra/compliance/prompts/'+name;
    return '\n\n<!-- Local source: '+relative+' -->\n'+fs.readFileSync(localPath(root,relative),'utf8');
  }).join('');
  if(options.dryRun) {console.log(chosen+'; '+selected.length+' scenarios');return;}
  const dir=path.join(root,'.temp/compliance');
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'guide-'+Date.now()+'-'+randomUUID().slice(0,8)+'.md');
  fs.writeFileSync(file,'# Auditoria assistida — pacote local\n\nExecute a tarefa '+options.task+' seguindo infra/compliance/prompts/'+chosen+'.\nEscopo: '+options.scope+'. Confirme a raiz do clone aberto. Os textos abaixo são cópias; leia as versões atuais se houver mudanças. Não há autorização de deploy, banco operacional ou acesso a secrets.\n\n## Catálogo selecionado\n\n'+JSON.stringify(selected,null,2)+content+'\n',{flag:'wx'});
  console.log(messages.bundle+': '+path.relative(root,file).replaceAll('\\','/'));
  console.log(messages.noAI);
}

async function menu(config,catalog) {
  const rl=createInterface({input:process.stdin,output:process.stdout});
  try {
    console.log(messages.menu); messages.options.forEach((s,i)=>console.log((i+1)+'. '+s));
    const choice=(await rl.question('> ')).trim();
    if(choice==='5') return null;
    if(!['1','2','3','4'].includes(choice)) throw new Error(messages.invalid);
    const options=parseArgs([]);
    if(choice==='3') {
      options.command='catalog';options.action='new';
      options.module=(await rl.question(messages.module+': ')).trim();
      options.id=(await rl.question(messages.id+': ')).trim();
      options.title=(await rl.question(messages.scenarioTitle+': ')).trim();
      return options;
    }
    console.log(catalog.modules.map(m=>m.id+' — '+m.title).join('\n'));
    options.scope=(await rl.question(messages.scope+' ['+config.defaultScope+']: ')).trim()||config.defaultScope;
    selectScenarios(catalog,options.scope);
    if(choice==='1') {
      options.command='verify';
      const profile=(await rl.question(messages.profile+': ')).trim();
      if(!['1','2'].includes(profile)) throw new Error(messages.invalid);
      options.profile=profile==='2'?'integration':'local';
      for(const id of config.profiles[options.profile]) console.log(id+': '+(config.gates[id].script??'catalog validate'));
      if(options.profile==='integration') options.allowDisposable=/^s$/i.test((await rl.question(messages.disposable+' ')).trim());
      if(!/^s$/i.test((await rl.question(messages.confirm+' ')).trim())) {console.log(messages.cancelled);return null;}
    } else if(choice==='2') {
      options.command='catalog';
      const action=(await rl.question(messages.catalogAction+': ')).trim();
      if(!['1','2'].includes(action)) throw new Error(messages.invalid);
      options.action=action==='2'?'validate':'list';
    } else {options.command='guide';options.task=(await rl.question(messages.task+' [review]: ')).trim()||'review';}
    return options;
  } finally { rl.close(); }
}

export async function main(argv=process.argv.slice(2)) {
  let options=parseArgs(argv);
  if(options.help){console.log(help);return 0;}
  if(!options.command && (!process.stdin.isTTY || options.nonInteractive)) {console.log(messages.nonTTY+'\n'+help);return 2;}
  const config=readJson(path.join(rootDir,'infra/compliance/config.json'));
  const manifest=readJson(path.join(rootDir,'package.json'));
  const catalog=loadCatalog(rootDir);
  const knownGates=new Set(Object.keys(config.gates));
  for(const s of catalog.scenarios) for(const t of s.tests) if(!knownGates.has(t.gate)) throw new Error('Unknown mapped gate: '+t.gate);
  console.log(messages.title+' — '+manifest.name+' '+manifest.version);
  if(!options.command) options=await menu(config,catalog);
  if(!options) return 0;
  if(options.command==='verify') return verify(rootDir,config,manifest,catalog,options);
  if(options.command==='guide') {prepareGuide(rootDir,config,catalog,options);return 0;}
  if(options.command==='catalog'){
    if(options.action==='new'){createDraft(rootDir,catalog,options);console.log(messages.draft);return 0;}
    if(!['list','validate'].includes(options.action)) throw new Error('Use catalog list, validate or new');
    if(options.action==='validate')console.log(messages.catalogValid+': '+catalog.scenarios.length);
    else {selectScenarios(catalog,options.scope);for(const s of catalog.scenarios.filter(s=>options.scope==='all'||options.scope.split(',').includes(s.module)))console.log(s.id+' | '+s.module+' | '+s.status+' | '+s.title+' | '+(s.tests.length?'mapped/review':'gap'));}
    return 0;
  }
  return 2;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().then(code=>{process.exitCode=code;}).catch(error=>{console.error(messages.failure+' '+error.message);process.exitCode=2;});
}
