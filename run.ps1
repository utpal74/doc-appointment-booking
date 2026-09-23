#Requires -Version 5.1
<#
.SYNOPSIS
    Doctor Appointment Booking System — start/stop script

.DESCRIPTION
    Starts the application in development mode (Docker DB + native npm processes)
    or in full Docker Compose mode.

.PARAMETER Docker
    Start the full Docker Compose stack (db + api + frontend).

.PARAMETER Stop
    Stop all running services.

.PARAMETER Clean
    Stop all services and remove Docker volumes (full database reset).

.PARAMETER Test
    Run the Jest test suite and the document quality check.

.EXAMPLE
    .\run.ps1              # Dev mode: Docker DB + npm dev servers
    .\run.ps1 -Docker      # Full Docker Compose stack
    .\run.ps1 -Stop        # Stop all running services
    .\run.ps1 -Clean       # Stop + remove volumes
    .\run.ps1 -Test        # Run verification suite
#>
param(
    [switch]$Docker,
    [switch]$Stop,
    [switch]$Clean,
    [switch]$Test
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ── Paths ──────────────────────────────────────────────────────────────────────
$Root      = $PSScriptRoot
$EnvFile   = Join-Path $Root '.env'
$EnvExample= Join-Path $Root '.env.example'
$Compose   = Join-Path $Root 'docker-compose.yml'
$Backend   = Join-Path $Root 'backend'
$Frontend  = Join-Path $Root 'frontend'
$Scripts   = Join-Path $Root 'scripts'

# ── Background process tracking ────────────────────────────────────────────────
$script:BackgroundJobs = @()

# ── Colour helpers ─────────────────────────────────────────────────────────────
function Write-Info    { param($Msg) Write-Host "  > " -ForegroundColor Cyan -NoNewline; Write-Host $Msg }
function Write-Success { param($Msg) Write-Host "  v " -ForegroundColor Green -NoNewline; Write-Host $Msg }
function Write-Warn    { param($Msg) Write-Host "  ! " -ForegroundColor Yellow -NoNewline; Write-Host $Msg }
function Write-Fail    { param($Msg) Write-Host "  x " -ForegroundColor Red -NoNewline; Write-Host $Msg }
function Write-Step    { param($Msg) Write-Host "`n---- $Msg ----" -ForegroundColor Cyan }
function Write-Fatal   { param($Msg) Write-Fail $Msg; exit 1 }

# ── Banner ─────────────────────────────────────────────────────────────────────
function Show-Banner {
    Write-Host ""
    Write-Host "  +======================================================+" -ForegroundColor Blue
    Write-Host "  |       Doctor Appointment Booking System              |" -ForegroundColor Blue
    Write-Host "  |          Agentic SDLC Capstone  -  v1.0.0            |" -ForegroundColor Blue
    Write-Host "  +======================================================+" -ForegroundColor Blue
    Write-Host ""
}

# ── Cleanup ────────────────────────────────────────────────────────────────────
function Invoke-Cleanup {
    Write-Step "Shutting down"
    foreach ($job in $script:BackgroundJobs) {
        if ($job -and ($job | Get-Job -ErrorAction SilentlyContinue)) {
            Write-Info "Stopping job: $($job.Name)"
            $job | Stop-Job -ErrorAction SilentlyContinue
            $job | Remove-Job -ErrorAction SilentlyContinue
        }
    }
    # Stop any orphaned node / vite processes
    Get-Process -Name node -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'server\.js|vite' } |
        ForEach-Object { Write-Info "Stopping PID $($_.Id)"; $_ | Stop-Process -Force -ErrorAction SilentlyContinue }
    # Stop the Docker DB
    $null = docker compose -f $Compose stop db 2>$null
    Write-Success "All services stopped. Goodbye!"
}

# Register Ctrl+C handler
[Console]::CancelKeyPress += {
    param($sender, $e)
    $e.Cancel = $true
    Invoke-Cleanup
    exit 0
}

# ── Prerequisites check ────────────────────────────────────────────────────────
function Test-Prerequisites {
    Write-Step "Checking prerequisites"
    $ok = $true

    # Node.js
    try {
        $nodeVer = (node --version 2>&1).ToString().TrimStart('v').Split('.')[0]
        if ([int]$nodeVer -lt 18) {
            Write-Warn "Node.js v$nodeVer detected — v18+ recommended"
        } else {
            Write-Success "Node.js $(node --version)"
        }
    } catch {
        Write-Fail "Node.js not found. Download from https://nodejs.org (v20 LTS)"
        $ok = $false
    }

    # npm
    try {
        Write-Success "npm $(npm --version)"
    } catch {
        Write-Fail "npm not found (usually bundled with Node.js)"
        $ok = $false
    }

    # Docker
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -ne 0) { throw "Docker daemon not running" }
        Write-Success "Docker $(docker --version | Select-String -Pattern '\d+\.\d+\.\d+' | ForEach-Object { $_.Matches[0].Value })"
    } catch {
        Write-Fail "Docker is not running. Start Docker Desktop and retry."
        $ok = $false
    }

    if (-not $ok) { Write-Fatal "Missing prerequisites — install them and retry." }
}

# ── .env setup ─────────────────────────────────────────────────────────────────
function Initialize-EnvFile {
    Write-Step "Environment configuration"

    if (-not (Test-Path $EnvFile)) {
        Write-Info "Copying .env.example -> .env"
        Copy-Item $EnvExample $EnvFile
    } else {
        Write-Success ".env already exists"
    }

    # Check if RECEPTIONIST_PASSWORD_HASH is set
    $content  = Get-Content $EnvFile -Raw
    $hashLine = $content | Select-String 'RECEPTIONIST_PASSWORD_HASH=(.*)' | ForEach-Object { $_.Matches[0].Groups[1].Value }

    if ([string]::IsNullOrWhiteSpace($hashLine)) {
        Write-Info "Generating bcrypt hash for default password 'admin123'..."
        Push-Location $Backend
        try {
            $hash = node -e "require('bcrypt').hash('admin123',10).then(h=>process.stdout.write(h))" 2>$null
            if ($hash) {
                $content = $content -replace 'RECEPTIONIST_PASSWORD_HASH=.*', "RECEPTIONIST_PASSWORD_HASH=$hash"
                Set-Content -Path $EnvFile -Value $content -Encoding UTF8 -NoNewline
                Write-Success "Password hash written to .env  (login: receptionist / admin123)"
            } else {
                Write-Warn "Could not generate hash now — run .\run.ps1 again after deps are installed"
            }
        } finally {
            Pop-Location
        }
    } else {
        Write-Success "RECEPTIONIST_PASSWORD_HASH already set"
    }
}

# ── Read .env into current process ─────────────────────────────────────────────
function Import-EnvFile {
    if (-not (Test-Path $EnvFile)) { return }
    Get-Content $EnvFile | Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' } | ForEach-Object {
        $parts = $_ -split '=', 2
        $key   = $parts[0].Trim()
        $val   = if ($parts.Length -gt 1) { $parts[1].Trim() } else { '' }
        if ($key -and -not [System.Environment]::GetEnvironmentVariable($key)) {
            [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
        }
    }
}

# ── Start PostgreSQL ────────────────────────────────────────────────────────────
function Start-Database {
    Write-Step "Starting PostgreSQL (Docker)"
    docker compose -f $Compose up -d db | Out-Null

    Write-Info "Waiting for PostgreSQL to be ready..."
    $retries = 30
    do {
        $result = docker compose -f $Compose exec -T db pg_isready -U postgres 2>$null
        if ($LASTEXITCODE -eq 0) { break }
        $retries--
        if ($retries -le 0) { Write-Fatal "PostgreSQL did not become ready after 30 attempts" }
        Start-Sleep -Seconds 1
        Write-Host "." -NoNewline
    } while ($true)
    Write-Host ""
    Write-Success "PostgreSQL is ready"
}

# ── Install npm dependencies ───────────────────────────────────────────────────
function Install-Dependencies {
    Write-Step "Installing dependencies"

    if (-not (Test-Path (Join-Path $Backend 'node_modules'))) {
        Write-Info "Installing backend dependencies..."
        Push-Location $Backend
        try { npm install --silent } finally { Pop-Location }
    } else {
        Write-Success "Backend node_modules already present (skip)"
    }

    if (-not (Test-Path (Join-Path $Frontend 'node_modules'))) {
        Write-Info "Installing frontend dependencies..."
        Push-Location $Frontend
        try { npm install --silent } finally { Pop-Location }
    } else {
        Write-Success "Frontend node_modules already present (skip)"
    }
}

# ── Database migrations + seed ─────────────────────────────────────────────────
function Initialize-Database {
    Write-Step "Database setup"
    Import-EnvFile

    Push-Location $Backend
    try {
        Write-Info "Generating Prisma client..."
        npx prisma generate --schema=prisma/schema.prisma 2>$null | Out-Null

        Write-Info "Running migrations..."
        npx prisma migrate deploy 2>&1 | Select-String -Pattern 'Applying|sync|already' | ForEach-Object { Write-Host "    $_" }

        Write-Info "Seeding database..."
        node prisma/seed.js 2>&1 | Select-String -Pattern 'Seeding|complete|v ' | ForEach-Object { Write-Host "    $_" }
    } finally {
        Pop-Location
    }
    Write-Success "Database ready"
}

# ── Start dev services ──────────────────────────────────────────────────────────
function Start-DevServices {
    Write-Step "Starting application (dev mode)"
    Import-EnvFile

    $apiLog      = Join-Path $Backend  'api.log'
    $frontendLog = Join-Path $Frontend 'frontend.log'

    # Start API server as a background job
    Write-Info "Starting API server on port 4000..."
    $apiJob = Start-Job -Name "ApiServer" -ScriptBlock {
        param($Dir, $Log)
        Set-Location $Dir
        # Load env vars from .env
        Get-Content (Join-Path (Split-Path $Dir -Parent) '.env') |
            Where-Object { $_ -match '^\s*[^#]' -and $_ -match '=' } |
            ForEach-Object {
                $p = $_ -split '=', 2
                $k = $p[0].Trim(); $v = if ($p.Length -gt 1) { $p[1].Trim() } else { '' }
                [System.Environment]::SetEnvironmentVariable($k, $v, 'Process')
            }
        npm run dev *>&1 | Tee-Object -FilePath $Log
    } -ArgumentList $Backend, $apiLog

    $script:BackgroundJobs += $apiJob
    Write-Success "API server starting (Job: $($apiJob.Name)) — logs: backend\api.log"

    # Start frontend dev server as a background job
    Write-Info "Starting frontend dev server on port 3000..."
    $frontJob = Start-Job -Name "FrontendServer" -ScriptBlock {
        param($Dir, $Log)
        Set-Location $Dir
        npm run dev *>&1 | Tee-Object -FilePath $Log
    } -ArgumentList $Frontend, $frontendLog

    $script:BackgroundJobs += $frontJob
    Write-Success "Frontend starting (Job: $($frontJob.Name)) — logs: frontend\frontend.log"

    # Wait for API to respond
    Write-Info "Waiting for API to respond..."
    $retries = 40
    do {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-WebRequest -Uri 'http://localhost:4000/health' -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) { break }
        } catch { }
        $retries--
        Write-Host "." -NoNewline
        if ($retries -le 0) { Write-Warn "API did not respond — check backend\api.log"; break }
    } while ($true)
    Write-Host ""
}

# ── Start Docker services ──────────────────────────────────────────────────────
function Start-DockerServices {
    Write-Step "Starting full Docker Compose stack"
    docker compose -f $Compose up --build -d
    Write-Success "All containers started"
}

# ── Ready panel ────────────────────────────────────────────────────────────────
function Show-ReadyPanel {
    param([string]$Mode)
    Write-Host ""
    Write-Host "  +-----------------------------------------------------+" -ForegroundColor Green
    Write-Host "  |              Application Ready                      |" -ForegroundColor Green
    Write-Host "  +-----------------------------------------------------+" -ForegroundColor Green
    if ($Mode -eq 'docker') {
    Write-Host "  |  Frontend  -> http://localhost:3000                 |" -ForegroundColor Green
    Write-Host "  |  API       -> http://localhost:4000                 |" -ForegroundColor Green
    Write-Host "  |  Mode      -> Full Docker Compose                   |" -ForegroundColor Green
    } else {
    Write-Host "  |  Frontend  -> http://localhost:3000                 |" -ForegroundColor Green
    Write-Host "  |  API       -> http://localhost:4000                 |" -ForegroundColor Green
    Write-Host "  |  Health    -> http://localhost:4000/health          |" -ForegroundColor Green
    Write-Host "  |  Mode      -> Dev (Docker DB + native npm)          |" -ForegroundColor Green
    }
    Write-Host "  +-----------------------------------------------------+" -ForegroundColor Green
    Write-Host "  |  Login     -> receptionist / admin123               |" -ForegroundColor Green
    Write-Host "  +-----------------------------------------------------+" -ForegroundColor Green
    Write-Host "  |  Logs  backend\api.log  |  frontend\frontend.log    |" -ForegroundColor Green
    Write-Host "  |  Stop  -> Ctrl+C  or  .\run.ps1 -Stop               |" -ForegroundColor Green
    Write-Host "  +-----------------------------------------------------+" -ForegroundColor Green
    Write-Host ""

    # Attempt to open browser
    try { Start-Process 'http://localhost:3000' } catch { }
}

# ── Mode: --stop ───────────────────────────────────────────────────────────────
function Invoke-Stop {
    Write-Step "Stopping all services"
    $null = docker compose -f $Compose stop 2>$null
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Job | Stop-Job -ErrorAction SilentlyContinue
    Get-Job | Remove-Job -ErrorAction SilentlyContinue
    Write-Success "All services stopped"
    exit 0
}

# ── Mode: --clean ──────────────────────────────────────────────────────────────
function Invoke-Clean {
    Write-Step "Clean up (stop + remove volumes)"
    Write-Warn "This will DELETE all appointment data. Are you sure? [y/N]"
    $confirm = Read-Host
    if ($confirm -match '^[Yy]$') {
        $null = docker compose -f $Compose down -v 2>$null
        Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Get-Job | Stop-Job -ErrorAction SilentlyContinue
        Get-Job | Remove-Job -ErrorAction SilentlyContinue
        Write-Success "Cleaned — volumes removed"
    } else {
        Write-Info "Aborted"
    }
    exit 0
}

# ── Mode: --test ───────────────────────────────────────────────────────────────
function Invoke-Test {
    Write-Step "Running verification suite"
    Test-Prerequisites

    Write-Info "Starting test database..."
    docker compose -f $Compose up -d db | Out-Null
    Start-Sleep -Seconds 3

    Write-Info "Running Jest test suite..."
    Push-Location $Backend
    try { npm test } finally { Pop-Location }

    Write-Info "Running document quality check..."
    node (Join-Path $Scripts 'check-docs.js')

    Write-Success "All verification complete"
    $null = docker compose -f $Compose stop db 2>$null
    exit 0
}

# ── Main ───────────────────────────────────────────────────────────────────────
Show-Banner

if ($Stop)   { Invoke-Stop }
if ($Clean)  { Invoke-Clean }
if ($Test)   { Invoke-Test }

if ($Docker) {
    Test-Prerequisites
    Initialize-EnvFile
    Start-DockerServices
    Show-ReadyPanel -Mode 'docker'
    Write-Host "  Press Ctrl+C to stop all containers" -ForegroundColor DarkGray

    # Keep script alive while containers run
    try {
        while ($true) {
            Start-Sleep -Seconds 5
            $running = docker compose -f $Compose ps --services --filter status=running 2>$null
            if (-not $running) { Write-Warn "All containers have stopped."; break }
        }
    } finally {
        Invoke-Cleanup
    }
} else {
    # Default: dev mode
    Test-Prerequisites
    Install-Dependencies
    Initialize-EnvFile
    Start-Database
    Initialize-Database
    Start-DevServices
    Show-ReadyPanel -Mode 'dev'
    Write-Host "  Press Ctrl+C to stop all services" -ForegroundColor DarkGray

    # Keep script alive while jobs are running
    try {
        while ($true) {
            Start-Sleep -Seconds 5
            $aliveJobs = $script:BackgroundJobs | Where-Object { $_ -and ($_.State -eq 'Running') }
            if ($aliveJobs.Count -eq 0) {
                Write-Warn "All background jobs have exited — check logs for errors"
                break
            }
        }
    } finally {
        Invoke-Cleanup
    }
}
