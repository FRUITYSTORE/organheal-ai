// Windows service composition only. Queue ownership stays in the packaged worker.
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),readline=require('node:readline');
const root=process.env.MEDICAL_MOTION_SERVICE_ROOT;
let child,policy,budget,timer,restarting=false,stopping=false,lastHealth=0,startTime=0,everReady=false;
const probes=[];let acceptance=false;
let queueBusy=false,lastQueueCheck=0,database;
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const events=new Set(['STARTING','READY','RECOVERY_OK','RECOVERY_FAILED','POLL_FAILED','CLAIM','JOB_STARTED','JOB_FINISHED','OWNERSHIP_LOST','PUBLICATION_RECONCILED','STOPPING','STOPPED','STARTUP_FAILED']);
function write(value){process.stdout.write(JSON.stringify(value)+'\n');}
function atomic(name,value){const file=path.join(root,'state',name),temporary=file+'.new';fs.writeFileSync(temporary,JSON.stringify(value),{mode:0o600});fs.renameSync(temporary,file);}
function health(state={phase:stopping?'shutting-down':'starting',ready:false,recoveryComplete:false,activeJobCount:0}){
  atomic('health.json',{...state,workerPid:child?.pid??null,supervisorPid:process.pid,sessionId:Number(process.env.MEDICAL_MOTION_SERVICE_SESSION_ID),nonAdmin:process.env.MEDICAL_MOTION_SERVICE_NONADMIN==='true',timestamp:new Date().toISOString()});
}
function fatal(code){try{policy?.emit(code,'CRITICAL');health({phase:'fatal',ready:false,recoveryComplete:false,activeJobCount:0});}catch{}clearInterval(timer);process.exitCode=70;shutdown();}
function log(line){if(line.length>4096)return policy.emit('LOG_SCHEMA_REJECTED','WARNING');
  try{const record=JSON.parse(line);if(!events.has(record.event))throw Error();
    const safe={event:record.event,timestamp:new Date().toISOString()};
    for(const key of ['workerId','jobId'])if(record[key]!==undefined){if(!uuid(record[key]))throw Error();safe[key]=record[key];}
    if(record.activeJobCount!==undefined){if(!Number.isInteger(record.activeJobCount)||record.activeJobCount<0||record.activeJobCount>2)throw Error();safe.activeJobCount=record.activeJobCount;}
    if(record.disposition!==undefined){if(!['complete','completed','retry','fail','failed','cancelled','ownership-lost','already-finalized','defer-completion'].includes(record.disposition))throw Error();safe.disposition=record.disposition;}
    write(safe);policy.observe(safe);
  }catch{policy.emit('LOG_SCHEMA_REJECTED','WARNING');}}
function lines(stream){let buffered='',discard=false;stream.setEncoding('utf8');stream.on('data',chunk=>{
  for(const part of chunk.split(/(?<=\n)/)){if(discard){if(part.endsWith('\n'))discard=false;continue;}buffered+=part;
    if(buffered.length>4096){buffered='';discard=!part.endsWith('\n');policy.emit('LOG_SCHEMA_REJECTED','WARNING');}
    else if(buffered.endsWith('\n')){log(buffered.trim());buffered='';}}
});}
function launch(){if(stopping)return;restarting=false;startTime=Date.now();lastHealth=0;everReady=false;health();
  const execArgv=[];
  // The protected installer can enable the existing synthetic fault fixture.
  // It is not selected by jobs, clinical input, or an external request.
  if(fs.existsSync(path.join(root,'acceptance.json'))){
    const a=JSON.parse(fs.readFileSync(path.join(root,'acceptance.json'),'utf8'));
    if(a.enabled!==true)throw Error();acceptance=true;execArgv.push('--require',path.join(__dirname,'..','tests','fixtures','medical-motion-packaged-supervisor.cjs'));
  }
  child=cp.fork(path.join(__dirname,'medical-motion-worker.cjs'),[],{cwd:path.dirname(__dirname),env:{...process.env,MEDICAL_MOTION_SERVICE_CHILD_GATE:'1'},execArgv,silent:true,windowsHide:true});
  write({event:'SERVICE_WORKER_ATTACH',pid:child.pid});
  lines(child.stdout);lines(child.stderr);
  child.on('message',message=>{
    if(acceptance&&message?.type==='stage'&&['render','claim','after-upload','registry','published','before-publication'].includes(message.stage)){
      probes.push({type:'stage',stage:message.stage,workerPid:child.pid});if(probes.length>100)probes.shift();atomic('acceptance-probes.json',probes);return;
    }
    if(acceptance&&message?.type==='blender'&&Number.isInteger(message.pid)&&message.pid>0){
      probes.push({type:'blender',pid:message.pid,workerPid:child.pid});if(probes.length>100)probes.shift();atomic('acceptance-probes.json',probes);return;
    }
    if(message?.type!=='health'||stopping)return;
    const s=message.state;if(!s||!['starting','ready','degraded','shutting-down','fatal'].includes(s.phase)||typeof s.ready!=='boolean'||typeof s.recoveryComplete!=='boolean'||!Number.isInteger(s.activeJobCount)||s.activeJobCount<0||s.activeJobCount>2)return;
    if(['blenderAvailable','dbReachable','storageConfigured'].some(key=>typeof s[key]!=='boolean'))return;
    lastHealth=Date.now();const safe={phase:s.phase,ready:s.ready&&s.recoveryComplete&&s.phase==='ready',recoveryComplete:s.recoveryComplete,activeJobCount:s.activeJobCount,blenderAvailable:s.blenderAvailable,dbReachable:s.dbReachable,storageConfigured:s.storageConfigured};everReady ||= safe.ready;policy.health(safe);health(safe);
  });
  child.on('error',()=>fatal('PACKAGE_INTEGRITY_FAILED'));
  child.on('exit',(code)=>{write({event:'SERVICE_WORKER_RELEASE',pid:child.pid});child=undefined;if(stopping){clearInterval(timer);process.stdout.write('',()=>process.exit(process.exitCode??(code===0?0:74)));return;}
    if(acceptance&&process.env.ORGANHEAL_WORKER_TEST_STAGE!=='startup-storage-outage'){delete process.env.ORGANHEAL_WORKER_TEST_STAGE;delete process.env.ORGANHEAL_HANDLER_SMOKE_CANCEL;}
    if(!everReady)policy.startupFailure(code??70);const delay=budget.reserve();atomic('restart.json',budget.snapshot());
    if(delay===undefined)return fatal('RESTART_BUDGET_EXHAUSTED');policy.emit('UNUSUAL_RESTART','WARNING',budget.snapshot().length);
    restarting=true;health();setTimeout(()=>{try{launch();}catch{fatal('PACKAGE_INTEGRITY_FAILED');}},delay).unref();
  });
}
function shutdown(){if(stopping)return;stopping=true;clearInterval(timer);input.close();try{health({phase:process.exitCode===70?'fatal':'shutting-down',ready:false,recoveryComplete:false,activeJobCount:0});}catch{}if(child?.connected){child.send('shutdown',()=>{});const current=child;setTimeout(()=>{if(current.exitCode===null)process.exit(74);},34000).unref();}else process.stdout.write('',()=>process.exit(process.exitCode??0));}
async function start(){try{
  if(!root||!path.isAbsolute(root)||process.env.MEDICAL_MOTION_SERVICE_SESSION_ID!=='0'||process.env.MEDICAL_MOTION_SERVICE_NONADMIN!=='true')throw Error();
  require('./medical-motion-package.cjs').load();
  const {WorkerOperationalAlerts,WorkerRestartBudget}=require('../dist/medical-motion-worker/lib/medical-motion/worker/operations.js');
  database=require('../dist/medical-motion-worker/lib/medical-motion/worker/local-postgres.js').createIsolatedMotionDatabase(process.env);
  policy=new WorkerOperationalAlerts(write);const file=path.join(root,'state','restart.json');
  budget=new WorkerRestartBudget(fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[]);
  launch();timer=setInterval(()=>{try{
    if(child?.connected)child.send('health',()=>{});
    policy.tick({freeBytes:Number(fs.statfsSync(process.env.TEMP).bavail)*Number(fs.statfsSync(process.env.TEMP).bsize),diskFloorBytes:((Number(process.env.MEDICAL_MOTION_WORKER_CONCURRENCY)||1)+1)*67108864});
    if(child&&!lastHealth&&Date.now()-startTime>=90000)fatal('HEALTH_UNAVAILABLE');
    if(lastHealth&&Date.now()-lastHealth>=15000)health({phase:'degraded',ready:false,recoveryComplete:false,activeJobCount:0});
    if(!stopping&&!queueBusy&&lastHealth&&Date.now()-lastQueueCheck>=30000){queueBusy=true;lastQueueCheck=Date.now();database.operationalQueueHealth().then(value=>policy.tick(value),()=>policy.observe({event:'POLL_FAILED'})).finally(()=>{queueBusy=false;});}
  }catch{fatal('SERVICE_CONFIGURATION_FAILED');}},2000);
}catch{write({event:'OPERATIONAL_ALERT',code:'PACKAGE_INTEGRITY_FAILED',severity:'CRITICAL',timestamp:new Date().toISOString(),count:1,suppressed:0});process.exitCode=70;shutdown();}}
const input=readline.createInterface({input:process.stdin});let started=false;
input.on('line',line=>{if(line==='start'&&!started){started=true;start();}else if(line===`worker-ready:${child?.pid}`){child.send('service-start',()=>{});}else if(line==='shutdown'){shutdown();}});
input.on('close',()=>{shutdown();});
process.on('SIGTERM',shutdown);
