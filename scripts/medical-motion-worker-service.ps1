param(
    [ValidateSet('Install','Configure','Start','Stop','Restart','Status','Uninstall')][string]$Action='Status',
    [switch]$Acceptance,
    [ValidateSet('none','render','claim','after-upload','registry','published','before-publication','startup-storage-outage')][string]$TestStage='none',
    [ValidateSet('none','blender','workspace','secret','database','storage')][string]$Failure='none'
)
$ErrorActionPreference='Stop'
$taskName='OrganHealMedicalMotionTest'
$taskRoot=Join-Path $env:ProgramData $taskName
$taskRepo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskAccount="NT SERVICE\$taskName"
function InvokeServiceControl([string[]]$Arguments){
    $taskOutput=& sc.exe @Arguments 2>&1
    if($LASTEXITCODE -ne 0){throw 'SERVICE_MANAGER_OPERATION_FAILED'}
}
function Owned {
    $taskService=Get-CimInstance Win32_Service -Filter "Name='$taskName'"
    if($taskService){
        if($taskService.PathName.Trim('"') -ne (Join-Path $taskRoot 'MedicalMotionServiceHost.exe') -or $taskService.StartName -ne $taskAccount){throw 'UNOWNED_SERVICE'}
    }
    if(Test-Path -LiteralPath $taskRoot){
        if((Get-Item -LiteralPath $taskRoot).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'UNSAFE_SERVICE_ROOT'}
        $taskRootAcl=Get-Acl -LiteralPath $taskRoot
        if(-not $taskRootAcl.AreAccessRulesProtected -or $taskRootAcl.GetOwner([Security.Principal.SecurityIdentifier]).Value -notin @('S-1-5-18','S-1-5-32-544')){throw 'UNTRUSTED_SERVICE_ROOT'}
        $taskWriteMask=[Security.AccessControl.FileSystemRights]'Write,Delete,DeleteSubdirectoriesAndFiles,ChangePermissions,TakeOwnership'
        foreach($taskAccess in $taskRootAcl.Access){
            if($taskAccess.AccessControlType -eq 'Allow' -and ($taskAccess.FileSystemRights -band $taskWriteMask) -and $taskAccess.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin @('S-1-5-18','S-1-5-32-544')){throw 'UNTRUSTED_SERVICE_ROOT'}
        }
        if(-not(Test-Path -LiteralPath (Join-Path $taskRoot 'owned.json'))){throw 'UNOWNED_SERVICE_ROOT'}
        $taskMarker=Get-Content -LiteralPath (Join-Path $taskRoot 'owned.json') -Raw | ConvertFrom-Json
        if($taskMarker.name -ne $taskName -or $taskMarker.version -ne 1){throw 'UNOWNED_SERVICE_ROOT'}
    }
    return $taskService
}
function ProtectDirectory([string]$Directory,[string]$ServiceRights){
    $taskAcl=New-Object Security.AccessControl.DirectorySecurity
    $taskAcl.SetAccessRuleProtection($true,$false)
    $taskAcl.SetOwner((New-Object Security.Principal.SecurityIdentifier('S-1-5-32-544')))
    foreach($taskRule in @(@('S-1-5-18','FullControl'),@('S-1-5-32-544','FullControl'))){
        $taskSid=New-Object Security.Principal.SecurityIdentifier($taskRule[0])
        $taskAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($taskSid,$taskRule[1],'ContainerInherit,ObjectInherit','None','Allow')))
    }
    if($ServiceRights){$taskAcl.AddAccessRule((New-Object Security.AccessControl.FileSystemAccessRule($taskAccount,$ServiceRights,'ContainerInherit,ObjectInherit','None','Allow')))}
    Set-Acl -LiteralPath $Directory -AclObject $taskAcl
}
function WriteProtectedConfiguration {
    Add-Type -AssemblyName System.Security
    $taskConfig=@{NODE_EXECUTABLE=(Join-Path $taskRoot 'node.exe');MEDICAL_MOTION_WORKER_ENVIRONMENT='isolated-test';BLENDER_EXECUTABLE_PATH='C:\Program Files\Blender Foundation\Blender 5.2\blender.exe';MEDICAL_MOTION_OUTPUT_ROOT=(Join-Path $taskRoot 'output');TEMP=(Join-Path $taskRoot 'temp');TMP=(Join-Path $taskRoot 'temp');PATH=($env:SystemRoot+'\System32');MEDICAL_MOTION_WORKER_CONCURRENCY='1'}
    foreach($taskKey in @('ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY')){
        $taskValue=[Environment]::GetEnvironmentVariable($taskKey,'Process')
        if(-not $taskValue){throw 'SERVICE_SECRET_UNAVAILABLE'}
        $taskConfig[$taskKey]=$taskValue
    }
    $taskDb=[Uri]$taskConfig.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL
    $taskCloud=[Uri]$taskConfig.NEXT_PUBLIC_SUPABASE_URL
    if(-not $taskDb.IsAbsoluteUri -or $taskDb.Scheme -notin @('postgres','postgresql') -or $taskDb.Host -notin @('localhost','127.0.0.1') -or $taskDb.AbsolutePath -ne '/organheal_ownership_test_step3c' -or $taskDb.Query -or $taskDb.Fragment){throw 'DATABASE_SAFETY_GATE'}
    if(-not $taskCloud.IsAbsoluteUri -or $taskCloud.Scheme -ne 'https' -or $taskCloud.Host -ne 'pmjuyyqofkdbgqmrdbuh.supabase.co' -or $taskCloud.UserInfo -or $taskCloud.AbsolutePath -ne '/' -or $taskCloud.Query -or $taskCloud.Fragment -or -not $taskCloud.IsDefaultPort){throw 'STORAGE_SAFETY_GATE'}
    if(-not(Test-Path -LiteralPath $taskConfig.BLENDER_EXECUTABLE_PATH -PathType Leaf)){throw 'BLENDER_UNAVAILABLE'}
    $taskVersion=& $taskConfig.BLENDER_EXECUTABLE_PATH --version 2>&1
    if($LASTEXITCODE -ne 0 -or $taskVersion[0] -notmatch '^Blender 5\.2\.1\b'){throw 'BLENDER_VERSION_INVALID'}
    if($Acceptance){
        $taskConfig.MEDICAL_MOTION_WORKER_RECOVERY_MS='1000'
        $taskConfig.MEDICAL_MOTION_RENDER_SCRIPT=Join-Path $taskRoot 'release\tests\fixtures\medical-motion-handler-smoke.py'
        if($TestStage -ne 'none'){$taskConfig.ORGANHEAL_WORKER_TEST_STAGE=$TestStage}
        if($TestStage -eq 'render'){$taskConfig.ORGANHEAL_HANDLER_SMOKE_CANCEL='1'}
    }elseif($TestStage -ne 'none' -or $Failure -ne 'none'){throw 'ACCEPTANCE_MODE_REQUIRED'}
    switch($Failure){
        'blender' {$taskConfig.BLENDER_EXECUTABLE_PATH=Join-Path $taskRoot 'absent-blender.exe'}
        'workspace' {$taskConfig.MEDICAL_MOTION_OUTPUT_ROOT=Join-Path $taskRoot 'MedicalMotionServiceHost.exe'}
        'secret' {$taskConfig.Remove('SUPABASE_SERVICE_ROLE_KEY')}
        'database' {$taskDbBuilder=New-Object UriBuilder($taskDb);$taskDbBuilder.Port=1;$taskConfig.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL=$taskDbBuilder.Uri.AbsoluteUri}
        'storage' {$taskConfig.ORGANHEAL_WORKER_TEST_STAGE='startup-storage-outage'}
    }
    $taskPlain=[Text.Encoding]::UTF8.GetBytes(($taskConfig | ConvertTo-Json -Compress))
    try{$taskCipher=[Security.Cryptography.ProtectedData]::Protect($taskPlain,[Text.Encoding]::UTF8.GetBytes($taskName+':v1'),[Security.Cryptography.DataProtectionScope]::LocalMachine)
        [IO.File]::WriteAllBytes((Join-Path $taskRoot 'service-config.bin'),$taskCipher)
    }finally{[Array]::Clear($taskPlain,0,$taskPlain.Length)}
    $taskAcceptanceFile=Join-Path $taskRoot 'acceptance.json'
    if($Acceptance){[IO.File]::WriteAllText($taskAcceptanceFile,'{"enabled":true}')}elseif(Test-Path -LiteralPath $taskAcceptanceFile){Remove-Item -LiteralPath $taskAcceptanceFile}
}
function ValidateRelease {
    $taskNode=Join-Path $taskRoot 'node.exe'
    $taskInfo=New-Object Diagnostics.ProcessStartInfo
    $taskInfo.FileName=$taskNode
    $taskInfo.Arguments='-e "try{require(''./scripts/medical-motion-package.cjs'').load()}catch{process.exit(70)}"'
    $taskInfo.WorkingDirectory=Join-Path $taskRoot 'release'
    $taskInfo.UseShellExecute=$false;$taskInfo.CreateNoWindow=$true
    $taskInfo.RedirectStandardOutput=$true;$taskInfo.RedirectStandardError=$true
    $taskInfo.EnvironmentVariables.Remove('SENTRY_DSN')
    $taskProcess=[Diagnostics.Process]::Start($taskInfo)
    $taskProcess.StandardOutput.ReadToEnd() | Out-Null
    $taskProcess.StandardError.ReadToEnd() | Out-Null
    if(-not $taskProcess.WaitForExit(15000) -or $taskProcess.ExitCode -ne 0){throw 'INVALID_SERVICE_RELEASE'}
    $taskProcess.Dispose()
    # Fail before SCM creation when Windows cannot execute the compiled host.
    # This pure native self-check reads no configuration and starts no worker.
    $taskNativeInfo=New-Object Diagnostics.ProcessStartInfo
    $taskNativeInfo.FileName=Join-Path $taskRoot 'MedicalMotionServiceHost.exe'
    $taskNativeInfo.Arguments='--verify-log-contract'
    $taskNativeInfo.UseShellExecute=$false;$taskNativeInfo.CreateNoWindow=$true
    $taskNativeInfo.RedirectStandardOutput=$true;$taskNativeInfo.RedirectStandardError=$true
    try{
        $taskNative=[Diagnostics.Process]::Start($taskNativeInfo)
        $taskNativeText=$taskNative.StandardOutput.ReadToEnd()
        $taskNative.StandardError.ReadToEnd()|Out-Null
        if(-not $taskNative.WaitForExit(15000) -or $taskNative.ExitCode -ne 0 -or $taskNativeText.Trim() -ne 'NATIVE_PRIVACY_20_CASES_PASSED'){throw 'NATIVE_RUNTIME_REJECTED'}
        $taskNative.Dispose()
    }catch{throw 'NATIVE_RUNTIME_REJECTED'}
}
try{
    if(-not [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'ADMINISTRATOR_REQUIRED'}
    $taskService=Owned
    switch($Action){
        'Install' {
            if($taskService -and $taskService.State -ne 'Stopped'){Write-Output '{"event":"SERVICE_ALREADY_INSTALLED"}';exit 0}
            if(-not(Test-Path -LiteralPath $taskRoot)){
            & node (Join-Path $PSScriptRoot 'build-medical-motion-worker.cjs') | Out-Null
            if($LASTEXITCODE -ne 0){throw 'WORKER_BUILD_FAILED'}
            & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'build-medical-motion-service.ps1') | Out-Null
            if($LASTEXITCODE -ne 0){throw 'HOST_BUILD_FAILED'}
            [void][IO.Directory]::CreateDirectory($taskRoot)
            ProtectDirectory $taskRoot ''
            [IO.File]::WriteAllText((Join-Path $taskRoot 'owned.json'),'{"name":"OrganHealMedicalMotionTest","version":1}')
            Copy-Item -LiteralPath (Join-Path $taskRepo 'dist\medical-motion-service\MedicalMotionServiceHost.exe') -Destination $taskRoot
            Copy-Item -LiteralPath (Get-Command node.exe).Source -Destination (Join-Path $taskRoot 'node.exe')
            $taskRelease=Join-Path $taskRoot 'release'
            foreach($taskDir in @('release\scripts','release\dist','temp','output','logs','state')){[void][IO.Directory]::CreateDirectory((Join-Path $taskRoot $taskDir))}
            Copy-Item -LiteralPath (Join-Path $taskRepo 'dist\medical-motion-worker') -Destination (Join-Path $taskRelease 'dist') -Recurse
            foreach($taskScript in @('medical-motion-package.cjs','medical-motion-worker.cjs','medical-motion-server-only.cjs','medical-motion-service-supervisor.cjs')){Copy-Item -LiteralPath (Join-Path $PSScriptRoot $taskScript) -Destination (Join-Path $taskRelease 'scripts')}
            Copy-Item -LiteralPath (Join-Path $taskRepo 'render') -Destination $taskRelease -Recurse
            Copy-Item -LiteralPath (Join-Path $taskRepo 'package.json') -Destination $taskRelease
            # Reuse installed production dependencies; no download or installation.
            $taskPackages=@(& npm.cmd ls --omit=dev --parseable --all 2>$null)
            foreach($taskPackage in $taskPackages){
                if($taskPackage.StartsWith((Join-Path $taskRepo 'node_modules')+'\')){
                    $taskRelative=$taskPackage.Substring($taskRepo.Length+1)
                    $taskDestination=Join-Path $taskRelease $taskRelative
                    if(-not(Test-Path -LiteralPath $taskDestination)){
                        [void][IO.Directory]::CreateDirectory((Split-Path $taskDestination))
                        Copy-Item -LiteralPath $taskPackage -Destination $taskDestination -Recurse
                    }
                }
            }
            if($Acceptance){
                $taskFixtures=Join-Path $taskRelease 'tests\fixtures';[void][IO.Directory]::CreateDirectory($taskFixtures)
                foreach($taskFixture in @('medical-motion-packaged-supervisor.cjs','medical-motion-handler-smoke.py')){Copy-Item -LiteralPath (Join-Path $taskRepo ('tests\fixtures\'+$taskFixture)) -Destination $taskFixtures}
            }
            }
            ValidateRelease
            WriteProtectedConfiguration
            if(-not $taskService){InvokeServiceControl -Arguments @('create',$taskName,'binPath=',('"'+(Join-Path $taskRoot 'MedicalMotionServiceHost.exe')+'"'),'start=','delayed-auto','obj=',$taskAccount)}
            InvokeServiceControl -Arguments @('failure',$taskName,'reset=','86400','actions=','restart/3000/restart/10000/none/0')
            InvokeServiceControl -Arguments @('failureflag',$taskName,'0')
            ProtectDirectory $taskRoot 'ReadAndExecute'
            foreach($taskWritable in @('temp','output','logs','state')){ProtectDirectory (Join-Path $taskRoot $taskWritable) 'Modify'}
            Write-Output '{"event":"SERVICE_INSTALLED"}'
        }
        'Configure' {if(-not $taskService -or $taskService.State -ne 'Stopped'){throw 'SERVICE_MUST_BE_STOPPED'};WriteProtectedConfiguration;Write-Output '{"event":"SERVICE_CONFIGURED"}'}
        'Start' {if(-not $taskService){throw 'SERVICE_NOT_INSTALLED'};Start-Service $taskName;Write-Output '{"event":"SERVICE_STARTED"}'}
        'Stop' {if($taskService -and $taskService.State -ne 'Stopped'){Stop-Service $taskName;(Get-Service $taskName).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(45))};Write-Output '{"event":"SERVICE_STOPPED"}'}
        'Restart' {if(-not $taskService){throw 'SERVICE_NOT_INSTALLED'};if($taskService.State -ne 'Stopped'){Stop-Service $taskName;(Get-Service $taskName).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(45))};Start-Service $taskName;Write-Output '{"event":"SERVICE_RESTARTED"}'}
        'Status' {
            $taskOperational='stopped'
            if($taskService.State -eq 'Stop Pending'){$taskOperational='shutting-down'}
            if($taskService.State -eq 'Running'){
                $taskOperational='starting';$taskHealthFile=Join-Path $taskRoot 'state\health.json'
                try{
                    if((Get-Item -LiteralPath $taskHealthFile).Length -gt 4096){throw 'INVALID_HEALTH'}
                    $taskHealth=Get-Content -LiteralPath $taskHealthFile -Raw|ConvertFrom-Json
                    $taskAge=((Get-Date).ToUniversalTime()-[DateTime]::Parse($taskHealth.timestamp).ToUniversalTime()).TotalSeconds
                    if($taskAge -lt 0 -or $taskAge -ge 15){$taskOperational='degraded'}
                    elseif($taskHealth.phase -in @('starting','degraded','shutting-down','fatal')){$taskOperational=$taskHealth.phase}
                    elseif($taskHealth.phase -eq 'ready' -and $taskHealth.ready -eq $true -and $taskHealth.recoveryComplete -eq $true){$taskOperational='ready'}
                }catch{}
            }
            [pscustomobject]@{Installed=($null -ne $taskService);State=$taskService.State;ProcessId=$taskService.ProcessId;OperationalState=$taskOperational} | ConvertTo-Json -Compress
        }
        'Uninstall' {
            if($taskService){if($taskService.State -ne 'Stopped'){Stop-Service $taskName;(Get-Service $taskName).WaitForStatus('Stopped',[TimeSpan]::FromSeconds(45))};InvokeServiceControl -Arguments @('delete',$taskName)}
            # Only known service configuration is removed; logs/artifacts remain.
            foreach($taskKnown in @('service-config.bin','acceptance.json')){$taskFile=Join-Path $taskRoot $taskKnown;if(Test-Path -LiteralPath $taskFile){Remove-Item -LiteralPath $taskFile}}
            Write-Output '{"event":"SERVICE_UNINSTALLED"}'
        }
    }
}catch{[pscustomobject]@{event='SERVICE_OPERATION_FAILED';line=$_.InvocationInfo.ScriptLineNumber} | ConvertTo-Json -Compress;exit 1}
