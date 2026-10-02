import "server-only";

export const ALERT_CODES = {
  STARTED:"WORKER_STARTED",READY:"WORKER_READY",STOPPED:"WORKER_STOPPED",RECOVERED:"RECOVERY_COMPLETED",
  RESTARTED:"UNUSUAL_RESTART",BUDGET:"RESTART_BUDGET_EXHAUSTED",CONFIG:"SERVICE_CONFIGURATION_FAILED",
  PACKAGE:"PACKAGE_INTEGRITY_FAILED",BLENDER:"BLENDER_UNAVAILABLE",DATABASE:"DATABASE_READINESS_FAILED",
  STORAGE:"STORAGE_READINESS_FAILED",RECOVERY:"RECOVERY_REPEATED_FAILURE",RETRY:"REPEATED_JOB_RETRY",
  RECONCILE:"PUBLICATION_RECONCILIATION",DISK:"DISK_RESERVE_LOW",WAITING:"JOB_WAIT_TOO_LONG",
  DEGRADED:"PROLONGED_DEGRADED",HEALTH:"HEALTH_UNAVAILABLE",LOG:"LOG_SCHEMA_REJECTED",
} as const;
export type AlertCode=typeof ALERT_CODES[keyof typeof ALERT_CODES];
type Severity="INFO"|"WARNING"|"CRITICAL";
export type OperationalAlert=Readonly<{event:"OPERATIONAL_ALERT";code:AlertCode;severity:Severity;timestamp:string;count:number;suppressed:number;workerId?:string}>;
export type OperationalHealth={phase:"starting"|"ready"|"degraded"|"shutting-down"|"fatal";ready:boolean;recoveryComplete:boolean;activeJobCount:number};
const uuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Fixed-code, process-local alert policy. No event bodies or provider diagnostics
 * enter the sink; codes form a finite keyspace independent of jobs/input text. */
export class WorkerOperationalAlerts {
  private readonly records=new Map<AlertCode,{last:number;suppressed:number}>();
  private readonly failures=new Map<string,{start:number;count:number}>();
  private degradedAt:number|undefined;private lastHealth:number|undefined;
  private windowStart:number|undefined;private emitted=0;private workerId:string|undefined;
  constructor(private readonly sink:(alert:OperationalAlert)=>void,private readonly now:()=>number=Date.now){}
  emit(code:AlertCode,severity:Severity,count=1){
    if(!Object.values(ALERT_CODES).includes(code)||!Number.isSafeInteger(count)||count<0)return;
    const now=this.now(),previous=this.records.get(code);
    if(this.windowStart===undefined||now-this.windowStart>=60000){this.windowStart=now;this.emitted=0;}
    if(previous&&now-previous.last<60000){previous.suppressed=Math.min(previous.suppressed+1,1000000);return;}
    if(this.emitted>=20)return;
    const alert:OperationalAlert={event:"OPERATIONAL_ALERT",code,severity,timestamp:new Date(now).toISOString(),count,
      suppressed:previous?.suppressed??0,...(this.workerId?{workerId:this.workerId}:{})};
    this.records.set(code,{last:now,suppressed:0});this.emitted++;
    try{this.sink(Object.freeze(alert));}catch{/* Observability never grants ownership. */}
  }
  private fail(kind:"database"|"recovery"|"retry"|"storage",code:AlertCode,severity:Severity){
    const now=this.now(),previous=this.failures.get(kind);
    const state=!previous||now-previous.start>=60000?{start:now,count:0}:previous;
    state.count=Math.min(state.count+1,1000000);this.failures.set(kind,state);
    if(state.count>=3)this.emit(code,severity,state.count);
  }
  observe(event:Readonly<Record<string,unknown>>){
    if(uuid(event.workerId))this.workerId=event.workerId;
    switch(event.event){
      case "STARTING":this.emit(ALERT_CODES.STARTED,"INFO");break;
      case "READY":this.emit(ALERT_CODES.READY,"INFO");break;
      case "STOPPED":this.emit(ALERT_CODES.STOPPED,"INFO");break;
      case "RECOVERY_OK":this.emit(ALERT_CODES.RECOVERED,"INFO");this.failures.delete("recovery");break;
      case "POLL_FAILED":this.fail("database",ALERT_CODES.DATABASE,"CRITICAL");break;
      case "RECOVERY_FAILED":this.fail("recovery",ALERT_CODES.RECOVERY,"CRITICAL");break;
      case "PUBLICATION_RECONCILED":this.emit(ALERT_CODES.RECONCILE,"WARNING");break;
      case "JOB_FINISHED":if(event.disposition==="retry")this.fail("retry",ALERT_CODES.RETRY,"WARNING");break;
    }
  }
  startupFailure(exitCode:number){
    const code=exitCode===64?ALERT_CODES.CONFIG:exitCode===69?ALERT_CODES.BLENDER:exitCode===75?ALERT_CODES.DATABASE:
      exitCode===76?ALERT_CODES.STORAGE:exitCode===78?ALERT_CODES.DISK:ALERT_CODES.PACKAGE;
    this.emit(code,"CRITICAL");
  }
  health(state:OperationalHealth){
    const now=this.now();this.lastHealth=now;
    if(state.phase==="degraded"){this.degradedAt??=now;if(now-this.degradedAt>=60000)this.emit(ALERT_CODES.DEGRADED,"WARNING");}
    else this.degradedAt=undefined;
  }
  tick(input:{freeBytes?:number;diskFloorBytes?:number;oldestWaitingMs?:number;waitingCount?:number}){
    if(this.lastHealth!==undefined&&this.now()-this.lastHealth>=15000)this.emit(ALERT_CODES.HEALTH,"WARNING");
    if(Number.isFinite(input.freeBytes)&&Number.isFinite(input.diskFloorBytes)&&input.freeBytes!<input.diskFloorBytes!*2)this.emit(ALERT_CODES.DISK,"WARNING");
    if(Number.isFinite(input.oldestWaitingMs)&&input.oldestWaitingMs!>=120000)this.emit(ALERT_CODES.WAITING,"WARNING",input.waitingCount??1);
  }
}

/** Three retries per rolling ten-minute window. Persist this small numeric state
 * outside the worker; corrupt state must stop the supervisor, never reset budget. */
export class WorkerRestartBudget {
  private attempts:number[];
  constructor(saved:unknown=[],private readonly now:()=>number=Date.now){
    if(!Array.isArray(saved)||saved.length>3||saved.some(value=>!Number.isSafeInteger(value)||value<0||value>now()))throw Error("INVALID_RESTART_STATE");
    this.attempts=[...saved];
  }
  reserve():number|undefined{
    const now=this.now();this.attempts=this.attempts.filter(time=>now-time<600000);
    if(this.attempts.length>=3)return undefined;
    const delay=1000*2**this.attempts.length;this.attempts.push(now);return delay;
  }
  snapshot(){return Object.freeze([...this.attempts]);}
}

export function serviceOperationalState(running:boolean,health?:OperationalHealth){
  if(!running)return "stopped";
  return health?.ready&&health.recoveryComplete&&health.phase==="ready"?"ready":health?.phase==="ready"?"starting":health?.phase??"starting";
}
