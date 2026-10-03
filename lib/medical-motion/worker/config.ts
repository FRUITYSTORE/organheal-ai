import "server-only";
/** Only the isolated server entrypoint consumes this opt-in. Missing means off. */
export function readIsolatedReuseConfig(env:Readonly<Record<string,string|undefined>>):boolean {
  const value=env.MEDICAL_MOTION_WORKER_REUSE;
  if(value===undefined||value==="disabled")return false;
  if(value!=="enabled"||env.MEDICAL_MOTION_WORKER_ENVIRONMENT!=="isolated-test")throw Error("INVALID_WORKER_CONFIGURATION");
  return true;
}
export type WorkerConfig=Readonly<{concurrency:number;pollBatch:number;idleMs:number;errorMaxMs:number;recoveryMs:number;shutdownMs:number}>;
export function readWorkerConfig(env:Readonly<Record<string,string|undefined>>):WorkerConfig {
  const number=(name:string,fallback:number,min:number,max:number)=>{
    const raw=env[name];if(raw!==undefined&&!/^[1-9][0-9]*$/.test(raw))throw Error("INVALID_WORKER_CONFIGURATION");
    const value=raw===undefined?fallback:Number(raw);
    if(!Number.isSafeInteger(value)||value<min||value>max)throw Error("INVALID_WORKER_CONFIGURATION");return value;
  };
  const config={concurrency:number("MEDICAL_MOTION_WORKER_CONCURRENCY",1,1,2),pollBatch:number("MEDICAL_MOTION_WORKER_POLL_BATCH",1,1,10),
    idleMs:number("MEDICAL_MOTION_WORKER_IDLE_MS",1000,100,30000),errorMaxMs:number("MEDICAL_MOTION_WORKER_ERROR_MAX_MS",10000,1000,60000),
    recoveryMs:number("MEDICAL_MOTION_WORKER_RECOVERY_MS",30000,1000,300000),shutdownMs:number("MEDICAL_MOTION_WORKER_SHUTDOWN_MS",10000,1000,30000)};
  if(config.errorMaxMs<config.idleMs)throw Error("INVALID_WORKER_CONFIGURATION");return Object.freeze(config);
}
