$ErrorActionPreference = 'Stop'
try {
    $taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
    $taskOutput = Join-Path $taskRoot 'dist\medical-motion-service'
    $taskCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
    if (-not (Test-Path -LiteralPath $taskCompiler)) { throw 'NATIVE_COMPILER_UNAVAILABLE' }
    if (Test-Path -LiteralPath $taskOutput) {
        if ((Get-Item -LiteralPath $taskOutput).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'UNSAFE_BUILD_OUTPUT' }
    }
    [void][IO.Directory]::CreateDirectory($taskOutput)
    $taskSource=Join-Path $PSScriptRoot 'windows\MedicalMotionServiceHost.cs'
    $taskExecutable=Join-Path $taskOutput 'MedicalMotionServiceHost.exe'
    $taskManifest=Join-Path $taskOutput 'build-integrity.json'
    $taskSourceHash=(Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash
    $taskCompilerHash=(Get-FileHash -LiteralPath $taskCompiler -Algorithm SHA256).Hash
    $taskRecipeHash=(Get-FileHash -LiteralPath $PSCommandPath -Algorithm SHA256).Hash
    if((Test-Path -LiteralPath $taskManifest) -and (Test-Path -LiteralPath $taskExecutable)){
        $taskPrevious=Get-Content -LiteralPath $taskManifest -Raw|ConvertFrom-Json
        if($taskPrevious.source -eq $taskSourceHash -and $taskPrevious.compiler -eq $taskCompilerHash -and $taskPrevious.recipe -eq $taskRecipeHash -and $taskPrevious.executable -eq (Get-FileHash -LiteralPath $taskExecutable -Algorithm SHA256).Hash){
            Write-Output '{"event":"SERVICE_HOST_BUILT"}';exit 0
        }
    }
    & $taskCompiler /nologo /target:exe /optimize+ "/out:$taskOutput\MedicalMotionServiceHost.exe" /reference:System.ServiceProcess.dll /reference:System.Security.dll /reference:System.Web.Extensions.dll /reference:System.Management.dll (Join-Path $PSScriptRoot 'windows\MedicalMotionServiceHost.cs')
    if ($LASTEXITCODE -ne 0) { throw 'NATIVE_SERVICE_BUILD_FAILED' }
    [pscustomobject]@{source=$taskSourceHash;compiler=$taskCompilerHash;recipe=$taskRecipeHash;executable=(Get-FileHash -LiteralPath $taskExecutable -Algorithm SHA256).Hash}|ConvertTo-Json -Compress|Set-Content -LiteralPath $taskManifest
    Write-Output '{"event":"SERVICE_HOST_BUILT"}'
} catch { Write-Output '{"event":"SERVICE_HOST_BUILD_FAILED"}'; exit 1 }
