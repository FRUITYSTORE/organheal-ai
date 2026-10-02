// Windows SCM boundary only. The existing Node package owns execution/fencing.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Principal;
using System.ServiceProcess;
using System.Text;
using System.Text.RegularExpressions;
using System.Web.Script.Serialization;

public sealed class MedicalMotionServiceHost : ServiceBase {
    const string Name = "OrganHealMedicalMotionTest";
    readonly string root = AppDomain.CurrentDomain.BaseDirectory;
    readonly bool console;
    readonly object gate = new object();
    Process supervisor;
    IntPtr job;
    IntPtr workerJob;
    int workerPid;
    volatile bool stopping;
    static readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 65536 };

    [StructLayout(LayoutKind.Sequential)] struct BasicLimits {
        public long UserTime, JobTime;
        public uint Flags;
        public UIntPtr MinimumWorkingSet, MaximumWorkingSet;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }
    [StructLayout(LayoutKind.Sequential)] struct IoCounters { public ulong ReadOperations,WriteOperations,OtherOperations,ReadBytes,WriteBytes,OtherBytes; }
    [StructLayout(LayoutKind.Sequential)] struct ExtendedLimits {
        public BasicLimits Basic;
        public IoCounters Io;
        public UIntPtr ProcessMemory,JobMemory,PeakProcessMemory,PeakJobMemory;
    }
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr CreateJobObject(IntPtr security,string name);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool SetInformationJobObject(IntPtr job,int kind,ref ExtendedLimits limits,uint size);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool AssignProcessToJobObject(IntPtr job,IntPtr process);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr handle);

    public MedicalMotionServiceHost(bool consoleMode) { ServiceName=Name; CanStop=true; AutoLog=false; console=consoleMode; }
    protected override void OnStart(string[] args) {
        try {
            bool administrative=new WindowsPrincipal(WindowsIdentity.GetCurrent()).IsInRole(WindowsBuiltInRole.Administrator);
            if (!console && administrative) throw new Exception();
            if (!console && Process.GetCurrentProcess().SessionId!=0)throw new Exception();
            string configFile=Path.Combine(root,"service-config.bin");
            if(new FileInfo(configFile).Length>65536)throw new Exception();
            byte[] plain=ProtectedData.Unprotect(File.ReadAllBytes(configFile),Encoding.UTF8.GetBytes(Name+":v1"),DataProtectionScope.LocalMachine);
            Dictionary<string,string> config;
            try { config=json.Deserialize<Dictionary<string,string>>(Encoding.UTF8.GetString(plain)); }
            finally { Array.Clear(plain,0,plain.Length); }
            string node=config["NODE_EXECUTABLE"];
            if(!Path.IsPathRooted(node)||!File.Exists(node))throw new Exception();
            var info=new ProcessStartInfo(node,"\""+Path.Combine(root,"release","scripts","medical-motion-service-supervisor.cjs")+"\"") {
                WorkingDirectory=root,UseShellExecute=false,CreateNoWindow=true,
                RedirectStandardInput=true,RedirectStandardOutput=true,RedirectStandardError=true
            };
            string systemRoot=Environment.GetEnvironmentVariable("SystemRoot");
            info.EnvironmentVariables.Clear();
            info.EnvironmentVariables["SystemRoot"]=systemRoot;
            foreach(var pair in config)if(pair.Key!="NODE_EXECUTABLE"){
                if(Array.IndexOf(new[]{"ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL","ORGANHEAL_TEST_PSQL","NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY","BLENDER_EXECUTABLE_PATH","MEDICAL_MOTION_WORKER_ENVIRONMENT","MEDICAL_MOTION_OUTPUT_ROOT","MEDICAL_MOTION_WORKER_CONCURRENCY","MEDICAL_MOTION_WORKER_POLL_BATCH","MEDICAL_MOTION_WORKER_IDLE_MS","MEDICAL_MOTION_WORKER_ERROR_MAX_MS","MEDICAL_MOTION_WORKER_RECOVERY_MS","MEDICAL_MOTION_WORKER_SHUTDOWN_MS","MEDICAL_MOTION_RENDER_SCRIPT","ORGANHEAL_WORKER_TEST_STAGE","ORGANHEAL_HANDLER_SMOKE_CANCEL","TEMP","TMP","PATH"},pair.Key)<0)throw new Exception();
                if((pair.Key=="ORGANHEAL_WORKER_TEST_STAGE"||pair.Key=="ORGANHEAL_HANDLER_SMOKE_CANCEL"||pair.Key=="MEDICAL_MOTION_RENDER_SCRIPT")&&!File.Exists(Path.Combine(root,"acceptance.json")))throw new Exception();
                info.EnvironmentVariables[pair.Key]=pair.Value;
            }
            info.EnvironmentVariables["MEDICAL_MOTION_SERVICE_ROOT"]=root.TrimEnd(Path.DirectorySeparatorChar);
            info.EnvironmentVariables["MEDICAL_MOTION_SERVICE_SESSION_ID"]=Process.GetCurrentProcess().SessionId.ToString();
            info.EnvironmentVariables["MEDICAL_MOTION_SERVICE_NONADMIN"]=(!administrative).ToString().ToLowerInvariant();
            job=CreateJobObject(IntPtr.Zero,null); if(job==IntPtr.Zero)throw new Exception();
            var limits=new ExtendedLimits(); limits.Basic.Flags=0x2000; // KILL_ON_JOB_CLOSE
            if(!SetInformationJobObject(job,9,ref limits,(uint)Marshal.SizeOf(typeof(ExtendedLimits))))throw new Exception();
            supervisor=new Process { StartInfo=info,EnableRaisingEvents=true };
            supervisor.OutputDataReceived+=Capture;supervisor.ErrorDataReceived+=Capture;
            supervisor.Exited+=(sender,e)=>{if(!stopping){
                int code;try {code=((Process)sender).ExitCode;}catch {code=1;}
                // Known fatal/budget exits deliberately stop without a second
                // restart loop. An unexpected supervisor exit is an SCM crash.
                if(!console&&code!=70&&code!=74)Environment.Exit(70);
                ExitCode=code;if(!console)Stop();
            }};
            if(!supervisor.Start())throw new Exception();
            // Node waits for this gate before creating any descendants, avoiding
            // the start/assign race without a second process execution engine.
            if(!AssignProcessToJobObject(job,supervisor.Handle))throw new Exception();
            supervisor.BeginOutputReadLine();supervisor.BeginErrorReadLine();
            supervisor.StandardInput.WriteLine("start");supervisor.StandardInput.Flush();
        } catch { stopping=true;ExitCode=70;
            try{WriteLogLine(json.Serialize(new{ @event="OPERATIONAL_ALERT",code="SERVICE_CONFIGURATION_FAILED",severity="CRITICAL",timestamp=DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),count=1,suppressed=0})+Environment.NewLine);}catch{}
            Cleanup();throw new InvalidOperationException("SERVICE_HOST_START_FAILED"); }
    }
    void Capture(object sender,DataReceivedEventArgs args) {
        if(args.Data==null||args.Data.Length>4096)return;
        try {
            var record=json.Deserialize<Dictionary<string,object>>(args.Data);
            if(record.ContainsKey("event")&&((string)record["event"]=="SERVICE_WORKER_ATTACH"||(string)record["event"]=="SERVICE_WORKER_RELEASE")){
                int pid=(int)record["pid"];
                lock(gate){
                    if((string)record["event"]=="SERVICE_WORKER_RELEASE"){
                        if(pid!=workerPid)return;if(workerJob!=IntPtr.Zero)CloseHandle(workerJob);workerJob=IntPtr.Zero;workerPid=0;return;
                    }
                    if(workerJob!=IntPtr.Zero||supervisor==null||pid<=0)throw new Exception();
                    using(var query=new ManagementObject("Win32_Process.Handle='"+pid.ToString()+"'")){
                        query.Get();if(Convert.ToInt32(query["ParentProcessId"])!=supervisor.Id)throw new Exception();
                    }
                    using(var process=Process.GetProcessById(pid)){
                        workerJob=CreateJobObject(IntPtr.Zero,null);var limits=new ExtendedLimits();limits.Basic.Flags=0x2000;
                        if(workerJob==IntPtr.Zero||!SetInformationJobObject(workerJob,9,ref limits,(uint)Marshal.SizeOf(typeof(ExtendedLimits)))||!AssignProcessToJobObject(workerJob,process.Handle))throw new Exception();
                    }
                    workerPid=pid;supervisor.StandardInput.WriteLine("worker-ready:"+pid.ToString());supervisor.StandardInput.Flush();return;
                }
            }
            if(!record.ContainsKey("event")||!record.ContainsKey("timestamp"))return;
            // Keys alone are insufficient: validate every retained value too.
            var safe=new Dictionary<string,object>();
            foreach(string key in new[]{"event","code","severity","timestamp","count","suppressed","workerId","jobId","activeJobCount","disposition"})
                if(record.ContainsKey(key)){if(!SafeValue(key,record[key]))return;safe[key]=record[key];}
            string line=json.Serialize(safe)+Environment.NewLine;
            WriteLogLine(line);
        } catch(IOException) { ExitCode=70;System.Threading.ThreadPool.QueueUserWorkItem(_=>{if(!stopping)Stop();}); }
        catch { /* Invalid operational input is discarded without diagnostics. */ }
    }
    void WriteLogLine(string line){lock(gate){string file=Path.Combine(root,"logs","operations.jsonl");
        if(File.Exists(file)&&new FileInfo(file).Length>=10485760){string previous=file+".1";if(File.Exists(previous))File.Delete(previous);File.Move(file,previous);}
        File.AppendAllText(file,line,Encoding.UTF8);
    }}
    static bool SafeValue(string key,object value){
        string text=value as string;
        if(key=="event")return text!=null&&Array.IndexOf(new[]{"OPERATIONAL_ALERT","STARTING","READY","STOPPING","STOPPED","RECOVERY_OK","RECOVERY_FAILED","POLL_FAILED","CLAIM","JOB_STARTED","JOB_FINISHED","OWNERSHIP_LOST","PUBLICATION_RECONCILED","STARTUP_FAILED","SHUTDOWN"},text)>=0;
        if(key=="severity")return text=="INFO"||text=="WARNING"||text=="CRITICAL";
        if(key=="code")return text!=null&&Array.IndexOf(new[]{"WORKER_STARTED","WORKER_READY","WORKER_STOPPED","RECOVERY_COMPLETED","UNUSUAL_RESTART","RESTART_BUDGET_EXHAUSTED","SERVICE_CONFIGURATION_FAILED","PACKAGE_INTEGRITY_FAILED","BLENDER_UNAVAILABLE","DATABASE_READINESS_FAILED","STORAGE_READINESS_FAILED","RECOVERY_REPEATED_FAILURE","REPEATED_JOB_RETRY","PUBLICATION_RECONCILIATION","DISK_RESERVE_LOW","JOB_WAIT_TOO_LONG","PROLONGED_DEGRADED","HEALTH_UNAVAILABLE","LOG_SCHEMA_REJECTED","ISOLATED_WORKER_UNAVAILABLE"},text)>=0;
        if(key=="timestamp")return text!=null&&Regex.IsMatch(text,@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$");
        if(key=="workerId"||key=="jobId")return text!=null&&Regex.IsMatch(text,@"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");
        if(key=="disposition")return text!=null&&Array.IndexOf(new[]{"complete","completed","retry","fail","failed","cancelled","ownership-lost","already-finalized","defer-completion"},text)>=0;
        return value is int&&(int)value>=0&&(int)value<=(key=="activeJobCount"?2:1000000);
    }
    protected override void OnStop(){
        stopping=true;
        if(!console)RequestAdditionalTime(45000);
        try {if(supervisor!=null&&!supervisor.HasExited){supervisor.StandardInput.WriteLine("shutdown");supervisor.StandardInput.Flush();
            if(!supervisor.WaitForExit(35000))ExitCode=74;}}
        catch {ExitCode=74;}
        finally {Cleanup();}
    }
    void Cleanup(){lock(gate){if(workerJob!=IntPtr.Zero){CloseHandle(workerJob);workerJob=IntPtr.Zero;}if(job!=IntPtr.Zero){CloseHandle(job);job=IntPtr.Zero;}if(supervisor!=null){
        // Also covers a failed parent-job assignment: the start gate guarantees
        // this owned child has created no descendants before assignment.
        try{if(!supervisor.HasExited){supervisor.Kill();supervisor.WaitForExit(5000);}}catch{}
        supervisor.Dispose();supervisor=null;
    }}}
    static void Main(string[] args){
        if(args.Length==1&&args[0]=="--verify-log-contract"){
            object[,] cases={
                {"event","OPERATIONAL_ALERT",true},{"event","clinical-text",false},
                {"code","DATABASE_READINESS_FAILED",true},{"code","postgres://private-diagnostic",false},
                {"severity","CRITICAL",true},{"severity","private-diagnostic",false},
                {"timestamp","2026-10-02T00:00:00.000Z",true},{"timestamp","private-diagnostic",false},
                {"workerId","00000000-0000-4000-8000-000000000001",true},{"workerId","private-diagnostic",false},
                {"jobId","00000000-0000-4000-8000-000000000001",true},{"jobId","private-diagnostic",false},
                {"count",1,true},{"count","private-diagnostic",false},{"count",-1,false},{"count",1000001,false},
                {"activeJobCount",2,true},{"activeJobCount",3,false},{"disposition","retry",true},{"disposition","private-diagnostic",false}
            };
            for(int i=0;i<cases.GetLength(0);i++)if(SafeValue((string)cases[i,0],cases[i,1])!=(bool)cases[i,2]){Environment.ExitCode=1;return;}
            Console.WriteLine("NATIVE_PRIVACY_20_CASES_PASSED");return;
        }
        if(args.Length==1&&args[0]=="--console"){
            var host=new MedicalMotionServiceHost(true);
            try{host.OnStart(new string[0]);string command;while((command=Console.ReadLine())!=null&&command!="shutdown"&&host.supervisor!=null&&!host.supervisor.HasExited){}
                host.OnStop();Environment.ExitCode=host.ExitCode;}
            catch {Console.Error.WriteLine("SERVICE_HOST_FAILED");Environment.ExitCode=70;}
        }else ServiceBase.Run(new MedicalMotionServiceHost(false));
    }
}
