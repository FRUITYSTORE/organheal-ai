import "server-only";
import { randomUUID } from "node:crypto";
import type { WorkerConfig } from "./config";
export type WorkerHealth={started:boolean;ready:boolean;blenderAvailable:boolean;dbReachable:boolean;storageConfigured:boolean;
  activeJobCount:number;lastSuccessfulPoll:string|null;lastRecoveryRun:string|null;shuttingDown:boolean;settled:boolean|null};
export type WorkerEvent={event:"STARTING"|"READY"|"RECOVERY_OK"|"RECOVERY_FAILED"|"POLL_FAILED"|"CLAIM"|"JOB_STARTED"|"JOB_FINISHED"|"OWNERSHIP_LOST"|"PUBLICATION_RECONCILED"|"STOPPING"|"STOPPED"|"STARTUP_FAILED";
  workerId:string;timestamp:string;jobId?:string;disposition?:string;activeJobCount:number};
type Dependencies={preflight():Promise<Pick<WorkerHealth,"blenderAvailable"|"dbReachable"|"storageConfigured">>;recover():Promise<void>;processNext():Promise<boolean>;log?(event:WorkerEvent):void};
const wait=(ms:number,signal:AbortSignal)=>new Promise<void>(resolve=>{
  if(signal.aborted){resolve();return;}const finish=()=>{clearTimeout(timer);signal.removeEventListener("abort",finish);resolve();};
  const timer=setTimeout(finish,ms);signal.addEventListener("abort",finish,{once:true});
});
/** Lifecycle around the existing worker, not another queue or ownership model.
 * All provider/process operations must have bounded contracts in composition. */
export class MedicalMotionWorkerHost {
  readonly workerId=randomUUID();readonly controller=new AbortController();
  private state:WorkerHealth={started:false,ready:false,blenderAvailable:false,dbReachable:false,storageConfigured:false,
    activeJobCount:0,lastSuccessfulPoll:null,lastRecoveryRun:null,shuttingDown:false,settled:null};
  private readonly tasks=new Set<Promise<void>>();private failures=0;private fatal=false;
  constructor(private readonly config:WorkerConfig,private readonly dependencies:Dependencies){}
  get signal(){return this.controller.signal;}
  snapshot():Readonly<WorkerHealth>{return Object.freeze({...this.state});}
  dependenciesReady(flags:Partial<Pick<WorkerHealth,"blenderAvailable"|"dbReachable"|"storageConfigured">>){Object.assign(this.state,flags);}
  health(){return {...this.snapshot(),phase:this.fatal?"fatal":this.state.shuttingDown?"shutting-down":!this.state.lastRecoveryRun?"starting":this.state.ready?"ready":"degraded",recoveryComplete:!!this.state.lastRecoveryRun};}
  log(event:WorkerEvent["event"],jobId?:string,disposition?:string){try{this.dependencies.log?.({event,workerId:this.workerId,timestamp:new Date().toISOString(),activeJobCount:this.state.activeJobCount,
    ...(["complete","fail","retry","ownership-lost","already-finalized","defer-completion"].includes(disposition??"")?{disposition}:{}),
    ...(jobId&&/^[0-9a-f-]{36}$/i.test(jobId)?{jobId}:{})});}catch{/* Operational sinks never change ownership. */}}
  beginJob(jobId:string){this.state.activeJobCount++;this.log("JOB_STARTED",jobId);let done=false;return(result?:{disposition:string})=>{if(done)return;done=true;this.state.activeJobCount--;this.log("JOB_FINISHED",jobId,result?.disposition);if(result?.disposition==="ownership-lost")this.log("OWNERSHIP_LOST",jobId);};}
  stop(){if(this.signal.aborted)return;this.state.shuttingDown=true;this.state.ready=false;this.log("STOPPING");this.controller.abort();}
  private async recover(){await this.dependencies.recover();this.state.dbReachable=true;this.state.lastRecoveryRun=new Date().toISOString();this.log("RECOVERY_OK");}
  async run():Promise<{settled:boolean;startupFailed:boolean;exitCode?:number}>{
    if(this.state.started)throw Error("WORKER_ALREADY_STARTED");this.state.started=true;this.log("STARTING");let startupFailed=false;let exitCode:number|undefined;
    try{
      Object.assign(this.state,await this.dependencies.preflight());
      if(!this.state.blenderAvailable||!this.state.dbReachable||!this.state.storageConfigured)throw Error("DEPENDENCY_UNAVAILABLE");
      if(this.signal.aborted)return {settled:true,startupFailed:false};
      await this.recover();if(this.signal.aborted)return {settled:true,startupFailed:false};this.state.ready=true;this.log("READY");
      while(!this.signal.aborted){
        if(this.failures||Date.now()-Date.parse(this.state.lastRecoveryRun!)>=this.config.recoveryMs){
          try{await this.recover();this.state.ready=true;}catch{this.state.ready=false;this.state.dbReachable=false;this.failures=Math.min(this.failures+1,8);this.log("RECOVERY_FAILED");
            await wait(Math.min(this.config.errorMaxMs,this.config.idleMs*2**this.failures),this.signal);continue;}
        }
        let issued=0;
        while(!this.signal.aborted&&this.tasks.size<this.config.concurrency&&issued++<this.config.pollBatch){
          let task:Promise<void>;
          task=Promise.resolve().then(()=>this.signal.aborted?false:this.dependencies.processNext()).then(()=>{
            this.failures=0;this.state.dbReachable=true;this.state.lastSuccessfulPoll=new Date().toISOString();
            if(!this.signal.aborted)this.state.ready=true;
          },()=>{this.state.ready=false;this.state.dbReachable=false;this.failures=Math.min(this.failures+1,8);this.log("POLL_FAILED");})
            .finally(()=>this.tasks.delete(task));this.tasks.add(task);
        }
        await wait(this.failures?Math.min(this.config.errorMaxMs,this.config.idleMs*2**this.failures):this.config.idleMs,this.signal);
      }
    }catch(error){startupFailed=true;this.fatal=true;const code=(error as {workerExitCode?:number})?.workerExitCode;exitCode=[64,69,75,76,78].includes(code??0)?code:70;this.log("STARTUP_FAILED");}
    finally{
      this.stop();let timer:ReturnType<typeof setTimeout>|undefined;
      try{this.state.settled=await Promise.race([Promise.allSettled([...this.tasks]).then(()=>true),new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),this.config.shutdownMs);})]);}
      finally{clearTimeout(timer);this.log("STOPPED");}
    }
    return {settled:this.state.settled===true,startupFailed,...(exitCode?{exitCode}:{})};
  }
}
