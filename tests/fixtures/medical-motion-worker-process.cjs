// Process-only trusted fault seam. Not reachable from the standalone entrypoint.
require('../../scripts/medical-motion-loader.cjs').install();
const {createIsolatedMotionDatabase}=require('../../lib/medical-motion/worker/local-postgres.ts');
const {runIsolatedWorker,isolatedStorageClient}=require('../../lib/medical-motion/worker/entry.ts');
const {SupabasePrivateArtifactStorage}=require('../../lib/medical-motion/artifacts/storage.ts');
const cp=require('node:child_process');
const stage=process.env.ORGANHEAL_WORKER_TEST_STAGE;
let paused=false;
async function pause(point){if(stage!==point||paused)return;paused=true;process.send?.({type:'stage',stage:point});await new Promise(()=>{});}
const database=createIsolatedMotionDatabase(process.env),cloud=isolatedStorageClient(process.env);
const storage=new SupabasePrivateArtifactStorage(cloud),put=storage.put.bind(storage);
storage.put=async(...args)=>{await pause('before-upload');if(stage==='storage-outage')throw Error('TEST_STORAGE_UNAVAILABLE');await put(...args);await pause('after-upload');};
const client={rpc:async(name,p)=>{
  if(stage==='db-outage'&&name==='mutate_background_job_attempt'&&p.p_action==='renew')return {data:null,error:{message:'TEST_DATABASE_UNAVAILABLE'}};
  const result=await database.client.rpc(name,p);
  if(!result.error){
    if(name==='claim_next_background_job'&&result.data?.length)await pause('claim');
    if(name==='read_medical_motion_execution_context')await pause('context');
    if(name==='motion_artifact_operation'&&p.p_action==='persist')await pause('registry');
    if(name==='publish_background_job_result')await pause('published');
  }
  return result;
}};
const spawn=cp.spawn;
cp.spawn=function(...args){const child=spawn(...args);if(String(args[0]).toLowerCase().includes('blender')&&!args[1].includes('--version')){
  process.send?.({type:'blender',pid:child.pid});
  child.stdout?.on('data',chunk=>{if(String(chunk).includes('HANDLER_SMOKE_STARTED'))process.send?.({type:'stage',stage:'render'});});
}return child;};
runIsolatedWorker(process.env,{client,storage}).then(result=>{process.exitCode=result.startupFailed?1:result.settled?0:2;},()=>{process.stdout.write('{"event":"STARTUP_FAILED"}\n');process.exitCode=1;});
