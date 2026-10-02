// Trusted external process instrumentation/faults. Never installed by the launcher.
const Module=require('node:module'),resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){
  if(request==='typescript'||request.endsWith('.ts'))throw Error('SOURCE_RUNTIME_FORBIDDEN');
  return resolve.call(this,request,...args);
};
const {runIsolatedWorker,isolatedStorageClient}=require('../../scripts/medical-motion-package.cjs').load();
const entry=require('../../dist/medical-motion-worker/lib/medical-motion/worker/entry.js');
const {createIsolatedMotionDatabase}=require('../../dist/medical-motion-worker/lib/medical-motion/worker/local-postgres.js');
const {SupabasePrivateArtifactStorage}=require('../../dist/medical-motion-worker/lib/medical-motion/artifacts/storage.js');
const cp=require('node:child_process'),spawn=cp.spawn;
let paused=false;
async function pause(stage){if(paused||process.env.ORGANHEAL_WORKER_TEST_STAGE!==stage)return;paused=true;process.send?.({type:'stage',stage});await new Promise(()=>{});}
cp.spawn=function(...args){const child=spawn(...args);if(String(args[0]).toLowerCase().includes('blender')&&!args[1].includes('--version')){
  process.send?.({type:'blender',pid:child.pid});
  child.stdout?.on('data',chunk=>{if(String(chunk).includes('HANDLER_SMOKE_STARTED'))process.send?.({type:'stage',stage:'render'});});
}return child;};
if(process.env.ORGANHEAL_WORKER_TEST_STAGE==='startup-storage-outage')global.fetch=async()=>{throw Error('TEST_STORAGE_UNAVAILABLE');};
entry.runIsolatedWorker=async(env=process.env)=>{
  if(!process.env.ORGANHEAL_WORKER_TEST_STAGE)return runIsolatedWorker(env);
  const database=createIsolatedMotionDatabase(env),storage=new SupabasePrivateArtifactStorage(isolatedStorageClient(env));
  const put=storage.put.bind(storage);storage.put=async(...args)=>{await put(...args);await pause('after-upload');};
  const client={rpc:async(name,p)=>{const r=await database.client.rpc(name,p);if(!r.error){
    if(name==='claim_next_background_job'&&r.data?.length)await pause('claim');
    if(name==='motion_artifact_operation'&&p.p_action==='persist')await pause('registry');
    if(name==='publish_background_job_result')await pause('published');
  }return r;}};
  return runIsolatedWorker(env,{client,storage});
};
