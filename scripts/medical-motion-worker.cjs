// Catch bootstrap failures too; raw module/provider diagnostics never reach logs.
(async()=>{
  try {
    require('./medical-motion-loader.cjs').install();
    const {runIsolatedWorker}=require('../lib/medical-motion/worker/entry.ts');
    const result=await runIsolatedWorker();
    process.exitCode=result.startupFailed?1:result.settled?0:2;
  } catch {
    console.error(JSON.stringify({event:'STARTUP_FAILED',code:'ISOLATED_WORKER_UNAVAILABLE'}));
    process.exitCode=1;
  }
})();
