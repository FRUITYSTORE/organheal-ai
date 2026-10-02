// Catch bootstrap failures too; raw module/provider diagnostics never reach logs.
(async()=>{
  try {
    const {runIsolatedWorker}=require('./medical-motion-package.cjs').load();
    const result=await runIsolatedWorker();
    process.exitCode=result.startupFailed?(result.exitCode||70):result.settled?0:74;
  } catch(error) {
    console.error(JSON.stringify({event:'STARTUP_FAILED',code:'ISOLATED_WORKER_UNAVAILABLE'}));
    process.exitCode=error?.workerExitCode===64?64:70;
  }
})();
