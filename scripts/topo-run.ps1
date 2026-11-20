<#
E0 baseline runner (specs/E0-baseline.md, sections A and B).
Measures one git ref in a throwaway worktree: tagged audit build, clean build, boot, walk, audit, aggregate.
  pwsh -NoProfile -File scripts/topo-run.ps1 -DryRun
  pwsh -NoProfile -File scripts/topo-run.ps1 [-BaselineRef 43f71f7] [-Ref <ref>] [-Adapters intel,nvidia] [-Runs 3] [-Only all|audit|boot|walk] [-SkipTagged]
#>
[CmdletBinding()]
param(
    [int]$Port = 3231,
    [int]$Runs = 3,
    [ValidateSet('intel', 'nvidia')] [string[]]$Adapters = @('intel', 'nvidia'),
    [ValidateSet('all', 'audit', 'boot', 'walk')] [string]$Only = 'all',
    [switch]$SkipTagged,
    [switch]$DryRun,
    [string]$BaselineRef = '43f71f7',
    [string]$Ref = '',
    [string]$WorkDir = '',
    [string]$OutDir = '',
    [string]$NodeModulesSource = ''
)

$ErrorActionPreference = 'Stop'
$RamFloorKb = 3000000
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $RepoRoot

$Measured = if ($Ref) { $Ref } else { $BaselineRef }
$Sha = ([string](git rev-parse --verify "$Measured^{commit}" 2>$null)).Trim()
if ($LASTEXITCODE -ne 0 -or -not $Sha) { throw "ref '$Measured' does not resolve to a commit" }
$Short = $Sha.Substring(0, 7)

if (-not $OutDir) { $OutDir = Join-Path $RepoRoot 'verification/topo/e0' }
if (-not $WorkDir) { $WorkDir = Join-Path ([IO.Path]::GetTempPath()) "topo-e0-$Short" }
if (-not $NodeModulesSource) {
    $commonDir = git rev-parse --path-format=absolute --git-common-dir
    $NodeModulesSource = Join-Path (Split-Path -Parent $commonDir) 'node_modules'
}
$RawDir = Join-Path $OutDir 'raw'
$LogDir = Join-Path $OutDir 'logs'
$PidFile = Join-Path $LogDir 'serve.pid'
$MetaFile = Join-Path $RawDir 'meta.json'
$Url = "http://localhost:$Port"
$NodeModules = Join-Path $WorkDir 'node_modules'
$PatchName = 'scripts/topo-tags.patch'
$CopyFiles = @('scripts/topo-audit.mjs', 'scripts/topo-tags.patch', 'scripts/topo-aggregate.mjs')

$DoAudit = ($Only -in 'all', 'audit') -and -not $SkipTagged
$DoBoot = $Only -in 'all', 'boot'
$DoWalk = $Only -in 'all', 'walk'
$DoClean = $DoBoot -or $DoWalk
$Counts = @{ builds = 0; serves = 0; boot = 0; walk = 0; audit = 0 }
$Builds = @{}
$ServerUp = $false
$ServerPid = 0
$WorktreeMade = $false
$JunctionMade = $false
$Patched = $false
$FreeRamKbAtStart = $null

function Write-Plan([string]$Label) { Write-Host "> $Label" }

function Invoke-Planned([string]$Label, [scriptblock]$Action) {
    Write-Plan $Label
    if (-not $DryRun) { & $Action }
}

function Assert-Ram {
    $kb = [int64](Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory
    if ($kb -lt $RamFloorKb) { throw "free RAM $kb KB is below the $RamFloorKb KB floor before build" }
}

function Assert-Clean {
    git -C $WorkDir diff --quiet -- components lib app
    if ($LASTEXITCODE -ne 0) { throw "$WorkDir has changes under components, lib or app" }
}

function Stop-Tree([int]$ProcessId) {
    & taskkill.exe /PID $ProcessId /T /F *> $null
}

function Get-ProcessChain([int]$ProcessId) {
    $ids = @()
    $current = $ProcessId
    for ($i = 0; $i -lt 8 -and $current; $i++) {
        $ids += $current
        $current = (Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue).ParentProcessId
    }
    $ids
}

function Assert-PortFree {
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $listener) { return }
    $known = 0
    if (Test-Path -LiteralPath $PidFile) { $known = [int](Get-Content -LiteralPath $PidFile -Raw) }
    if ($known -and ((Get-ProcessChain $listener.OwningProcess) -contains $known)) { Stop-Tree $known; return }
    throw "port $Port is held by PID $($listener.OwningProcess), not by this runner's pid file; refusing to kill it"
}

function Wait-Http([string]$ErrLog) {
    for ($i = 0; $i -lt 60; $i++) {
        try { if ((Invoke-WebRequest -Uri "$Url/" -UseBasicParsing -TimeoutSec 5).StatusCode -eq 200) { return } } catch { }
        Start-Sleep -Seconds 1
    }
    throw "server on $Url did not answer 200 within 60 s (see $ErrLog)"
}

function Start-Server([string]$Tag) {
    $script:Counts['serves'] += 1
    $outLog = Join-Path $LogDir "serve-$Tag.out.log"
    $errLog = Join-Path $LogDir "serve-$Tag.err.log"
    $script:ServerUp = $true
    Invoke-Planned "refuse if port $Port has a listener that is not this runner's pid file" { Assert-PortFree }
    Invoke-Planned "Start-Process npm.cmd start -- -p $Port (cwd $WorkDir; logs $outLog, $errLog); poll $Url/ for 200" {
        $p = Start-Process -FilePath 'npm.cmd' -ArgumentList @('start', '--', '-p', "$Port") -WorkingDirectory $WorkDir -RedirectStandardOutput $outLog -RedirectStandardError $errLog -WindowStyle Hidden -PassThru
        $script:ServerPid = $p.Id
        Set-Content -LiteralPath $PidFile -Value $p.Id
        Wait-Http $errLog
    }
}

function Stop-Server {
    Write-Plan "taskkill /PID $(if ($script:ServerPid) { $script:ServerPid } else { '<serve pid>' }) /T /F, then assert nothing listens on $Port"
    if (-not $DryRun) {
        if ($script:ServerPid) { Stop-Tree $script:ServerPid; $script:ServerPid = 0 }
        Remove-Item -LiteralPath $PidFile -ErrorAction SilentlyContinue
        if (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { throw "port $Port still has a listener after stop" }
    }
    $script:ServerUp = $false
}

function Invoke-Build([string]$Tag) {
    $script:Counts['builds'] += 1
    $log = Join-Path $LogDir "build-$Tag.log"
    Invoke-Planned "RAM guard before build: FreePhysicalMemory >= $RamFloorKb KB" { Assert-Ram }
    Invoke-Planned "npm run build > $log 2>&1 (cwd $WorkDir)" {
        & npm.cmd run build > $log 2>&1
        if ($LASTEXITCODE -ne 0) { throw "build $Tag failed, see $log" }
    }
    Invoke-Planned "read .next/BUILD_ID for $Tag build" {
        $script:Builds[$Tag] = (Get-Content -LiteralPath (Join-Path $WorkDir '.next/BUILD_ID') -Raw).Trim()
    }
}

function Invoke-TaggedBuild {
    Invoke-Planned "git -C $WorkDir apply $PatchName" {
        git -C $WorkDir apply $PatchName
        if ($LASTEXITCODE -ne 0) { throw "$PatchName does not apply to $Short" }
        $script:Patched = $true
    }
    try { Invoke-Build 'tagged' }
    finally {
        if ($script:Patched -or $DryRun) {
            Invoke-Planned "git -C $WorkDir apply -R $PatchName, then assert clean" {
                git -C $WorkDir apply -R $PatchName
                $script:Patched = $false
                Assert-Clean
            }
        }
    }
}

function Invoke-Node([string[]]$CliArgs, [string]$StdoutFile = '', [string]$StderrFile = '', [switch]$Loose) {
    $label = 'node ' + ($CliArgs -join ' ')
    if ($StdoutFile) { $label += " > $StdoutFile 2> $StderrFile" }
    Invoke-Planned $label {
        if ($StdoutFile) { & node @CliArgs > $StdoutFile 2> $StderrFile } else { & node @CliArgs }
        $code = $LASTEXITCODE
        if ($code -ne 0 -and -not ($Loose -and $code -eq 1)) { throw "exit $code from: $label" }
        if ($Loose) {
            try { $null = Get-Content -LiteralPath $StdoutFile -Raw | ConvertFrom-Json }
            catch { throw "$StdoutFile is not JSON" }
        }
    }
}

function Invoke-Boot([string]$Adapter) {
    for ($n = 1; $n -le $Runs; $n++) {
        foreach ($variant in 'default', 'hudoff') {
            $cli = @('scripts/cut-load.mjs', '--phase', 'boot', '--gpu', $Adapter, '--runs', '1', '--url', $Url)
            if ($variant -eq 'hudoff') { $cli += @('--query', '?hud=off') }
            $cli += @('--out', (Join-Path $RawDir "boot-$Adapter-$variant-r$n.json"))
            $script:Counts['boot'] += 1
            Invoke-Node $cli
        }
    }
}

function Invoke-Walk([string]$Adapter) {
    for ($n = 1; $n -le $Runs; $n++) {
        $script:Counts['walk'] += 1
        $base = Join-Path $RawDir "walk-$Adapter-r$n"
        Invoke-Node @('scripts/perf-frames.mjs', '--phase', 'load,walk,memory', '--secs', '20', '--gpu', $Adapter, '--url', $Url) "$base.json" "$base.err" -Loose
    }
}

function Invoke-Audit {
    foreach ($adapter in $Adapters) {
        for ($n = 1; $n -le $Runs; $n++) {
            foreach ($variant in 'default', 'hudoff') {
                $cli = @('scripts/topo-audit.mjs', '--url', $Url)
                if ($variant -eq 'hudoff') { $cli += @('--query', '?hud=off') }
                $cli += @('--gpu', $adapter, '--run', "$n", '--out', (Join-Path $RawDir "audit-$adapter-$variant-r$n.json"))
                $script:Counts['audit'] += 1
                Invoke-Node $cli
            }
        }
    }
}

function Invoke-Tagged {
    Invoke-TaggedBuild
    Start-Server 'tagged'
    try { Invoke-Audit }
    finally { if ($script:ServerUp) { Stop-Server } }
}

function Invoke-Clean {
    Invoke-Build 'clean'
    Start-Server 'clean'
    try {
        foreach ($adapter in $Adapters) {
            if ($DoBoot) { Invoke-Boot $adapter }
            if ($DoWalk) { Invoke-Walk $adapter }
        }
    }
    finally { if ($script:ServerUp) { Stop-Server } }
}

function Write-Meta {
    $meta = [ordered]@{
        date = (Get-Date).ToString('o')
        ref = $Measured
        commit = $Short
        buildClean = $Builds['clean']
        buildTagged = $Builds['tagged']
        freeRamKbAtStart = $script:FreeRamKbAtStart
        node = (node -v)
        adapters = @($Adapters)
    }
    $meta | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $MetaFile
}

function Invoke-Aggregate {
    $cli = @('scripts/topo-aggregate.mjs', '--raw', $RawDir, '--meta', $MetaFile, '--out', $OutDir)
    if ($Runs -lt 3) { $cli += '--allow-short' }
    Invoke-Node $cli
    Write-Host "E0.md: $(Join-Path $OutDir 'E0.md')"
}

Write-Host "measure $Measured ($Short) in $WorkDir; outputs in $OutDir"

if ($DryRun) {
    if (-not (Test-Path -LiteralPath $NodeModulesSource)) { Write-Host "WARN node_modules not found at $NodeModulesSource (a real run stops here)" }
}
else {
    if (-not (Test-Path -LiteralPath $NodeModulesSource)) { throw "node_modules not found at $NodeModulesSource" }
    if (Test-Path -LiteralPath $WorkDir) { throw "WorkDir $WorkDir already exists; remove it or pass -WorkDir" }
    $script:FreeRamKbAtStart = [int64](Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory
}

try {
    Invoke-Planned "mkdir $RawDir and $LogDir" { New-Item -ItemType Directory -Force -Path $RawDir, $LogDir | Out-Null }
    Invoke-Planned "git worktree add --detach $WorkDir $Sha" {
        git worktree add --detach $WorkDir $Sha
        if ($LASTEXITCODE -ne 0) { throw "git worktree add failed" }
    }
    $script:WorktreeMade = $true
    Invoke-Planned "copy $($CopyFiles -join ', ') from $RepoRoot into $WorkDir" {
        foreach ($f in $CopyFiles) { Copy-Item -LiteralPath (Join-Path $RepoRoot $f) -Destination (Join-Path $WorkDir $f) -Force }
    }
    Invoke-Planned "junction $NodeModules -> $NodeModulesSource" {
        New-Item -ItemType Junction -Path $NodeModules -Target $NodeModulesSource | Out-Null
    }
    $script:JunctionMade = $true
    if (-not $DryRun) { Set-Location -LiteralPath $WorkDir }
    Invoke-Planned "git -C $WorkDir apply --check $PatchName (must apply to $Short)" {
        git -C $WorkDir apply --check $PatchName
        if ($LASTEXITCODE -ne 0) { throw "$PatchName does not apply to $Short" }
    }
    Invoke-Planned "assert $WorkDir clean under components, lib, app" { Assert-Clean }

    if ($DoAudit) { Invoke-Tagged }
    if ($DoClean) { Invoke-Clean }
    Invoke-Planned "write meta to $MetaFile" { Write-Meta }
    if ($Only -eq 'all' -and -not $SkipTagged) { Invoke-Aggregate }
}
finally {
    if ($script:ServerUp) { Stop-Server }
    Set-Location -LiteralPath $RepoRoot
    if ($script:JunctionMade) {
        Invoke-Planned "cmd /c rmdir $NodeModules (junction link only, no /S)" { & cmd.exe /d /c rmdir $NodeModules }
    }
    if ($script:WorktreeMade) {
        Invoke-Planned "git worktree remove --force $WorkDir; git worktree prune" {
            git worktree remove --force $WorkDir
            if ($LASTEXITCODE -ne 0) { Write-Warning "worktree left in place: $WorkDir" }
            git worktree prune
        }
    }
}

$label = if ($DryRun) { 'DRYRUN counts' } else { 'RUN counts' }
Write-Host ('{0}: builds={1} serves={2} boot={3} walk={4} audit={5}' -f $label, $Counts['builds'], $Counts['serves'], $Counts['boot'], $Counts['walk'], $Counts['audit'])
