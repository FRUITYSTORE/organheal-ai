// TEST ONLY external preload. The standalone launcher never installs this file.
// Hypothetical review metadata grants no real medical asset/patient approval.
const entry=require('../../scripts/medical-motion-package.cjs').load();
const run=entry.runIsolatedWorker;
const modules=require('../../dist/medical-motion-worker/lib/medical-motion/organ-modules.js');
const original=modules.getOrganModule;
modules.getOrganModule=function(id){const source=original(id);if(!source||process.env.ORGANHEAL_CACHE_TEST_ANATOMY==='actual')return source;
 const module=structuredClone(source);
 module.anatomyRegistry=module.anatomyRegistry.map(e=>e.availability==='missing'?e:{...e,verification:'verified',fidelity:'reference-derived',representation:e.representation==='placeholder'?'surface':e.representation,
 coverage:{verifiedRegions:['TEST ONLY WHOLE'],unknownRegions:[],excludedRegions:[],evidenceRefs:['TEST ONLY HYPOTHETICAL COVERAGE']},
 assessment:{geometryStatus:'verified',semanticStatus:'verified',clinicalApprovalStatus:'unreviewed',renderCompatibility:'blender-compatible',geometryEvidenceRefs:['TEST ONLY HYPOTHETICAL REVIEW'],semanticEvidenceRefs:['TEST ONLY HYPOTHETICAL REVIEW'],clinicalEvidenceRefs:[]}});
 if(process.env.ORGANHEAL_CACHE_TEST_REVOCATION==='license')for(const e of module.anatomyRegistry)if(e.provenance)e.provenance.licenseReview.status='rejected';
 if(process.env.ORGANHEAL_CACHE_TEST_REVOCATION==='anatomy')module.anatomyVersion='TEST ONLY CHANGED ANATOMY';
 if(process.env.ORGANHEAL_CACHE_TEST_REVOCATION==='asset')module.assetVersion='TEST ONLY CHANGED ASSET';
 return module;};
const db=require('../../dist/medical-motion-worker/lib/medical-motion/worker/local-postgres.js');
const storageModule=require('../../dist/medical-motion-worker/lib/medical-motion/artifacts/storage.js');
const workerEntry=require('../../dist/medical-motion-worker/lib/medical-motion/worker/entry.js');
const cp=require('node:child_process'),spawn=cp.spawn;
cp.spawn=function(...args){const child=spawn(...args);if(String(args[0]).toLowerCase().includes('blender')&&!args[1].includes('--version')){
 process.send?.({type:'blender',pid:child.pid});child.stdout?.on('data',chunk=>{if(String(chunk).includes('HANDLER_SMOKE_STARTED'))process.send?.({type:'stage',stage:'render'});});}return child;};
let paused=false,lost=false;
async function pause(stage){if(paused||process.env.ORGANHEAL_WORKER_TEST_STAGE!==stage)return;paused=true;process.send?.({type:'stage',stage});await new Promise(()=>{});}
workerEntry.runIsolatedWorker=async(env=process.env)=>{
 const database=db.createIsolatedMotionDatabase(env),cloud=entry.isolatedStorageClient(env),storage=new storageModule.SupabasePrivateArtifactStorage(cloud);
 for(const operation of ['put','read','inspect']){const original=storage[operation].bind(storage);storage[operation]=async(...args)=>{
   process.send?.({type:'storage',operation});const result=await original(...args);
   if(operation==='put')await pause('after-upload');
   if(operation==='inspect'&&result){const fault=env.ORGANHEAL_CACHE_TEST_INTEGRITY;
     if(fault==='size')return {...result,byteSize:result.byteSize+1};if(fault==='mime')return {...result,contentType:'image/png'};if(fault==='digest')return {...result,sha256:'0'.repeat(64)};
     if(fault==='metadata-loss'&&!lost){lost=true;throw Error('TEST_METADATA_RESPONSE_LOSS');}}
   return result;};}
 const client={rpc:async(name,p)=>{
   if(name==='publish_background_job_result')await pause('before-publication');
   const result=await database.client.rpc(name,p);
   if(!result.error){if(name==='motion_reuse_operation'&&p.p_action==='reserve')await pause('reservation');
     if(name==='motion_reuse_operation'&&p.p_action==='ready')await pause('ready');
     if(name==='motion_artifact_operation'&&p.p_action==='persist'&&env.ORGANHEAL_CACHE_TEST_RESPONSE_LOSS==='registry'&&!lost){lost=true;throw Error('TEST_REGISTRY_RESPONSE_LOSS');}
     if(name==='publish_background_job_result'&&env.ORGANHEAL_CACHE_TEST_RESPONSE_LOSS==='publication'&&!lost){lost=true;throw Error('TEST_PUBLICATION_RESPONSE_LOSS');}}
   return result;}};
 return run(env,{client,storage});
};
