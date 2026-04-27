<#
.SYNOPSIS
  Micro-Earth dev launcher
  Starts: Vite dev-server + Python uvicorn + Electron window

.USAGE
  cd micro-earth
  powershell -ExecutionPolicy Bypass -File scripts/dev-electron.ps1
#>

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "  MICRO-EARTH DEV MODE (Electron + Vite + FastAPI)" -ForegroundColor Cyan
Write-Host ""

# ── Find backend Python ──────────────────────────────────────
$pyExe = $null
$candidates = @(
  "$ROOT\backend\.venv\Scripts\python.exe",
  "$ROOT\backend\venv\Scripts\python.exe",
  "$env:USERPROFILE\anaconda3\python.exe",
  "$env:USERPROFILE\miniconda3\python.exe"
)
foreach ($c in $candidates) {
  if (Test-Path $c) { $pyExe = $c; break }
}
if (-not $pyExe) { $pyExe = "python" }
Write-Host "[INFO] Python: $pyExe" -ForegroundColor Gray

# ── 1. Start Python backend (background) ─────────────────────
Write-Host "[1] Starting Python backend on :8000..." -ForegroundColor Yellow
$beLog = "$ROOT\backend\uvicorn.log"
$beErr = "$ROOT\backend\uvicorn.err.log"
$beJob = Start-Process -FilePath $pyExe `
  -ArgumentList "-m","uvicorn","api.main:app","--host","127.0.0.1","--port","8000" `
  -WorkingDirectory "$ROOT\backend" -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $beLog -RedirectStandardError $beErr
Write-Host "    PID: $($beJob.Id)  (logs: backend\uvicorn.log)" -ForegroundColor Gray

# ── 2. Start Vite dev-server (background) ────────────────────
Write-Host "[2] Starting Vite dev-server on :5180..." -ForegroundColor Yellow
$feLog = "$ROOT\frontend\vite.log"
$feErr = "$ROOT\frontend\vite.err.log"
$feJob = Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c","npm","run","dev" `
  -WorkingDirectory "$ROOT\frontend" -PassThru -WindowStyle Hidden `
  -RedirectStandardOutput $feLog -RedirectStandardError $feErr
Write-Host "    PID: $($feJob.Id)  (logs: frontend\vite.log)" -ForegroundColor Gray

# ── 3. Wait for services (TCP port check, up to 30s) ─────────
Write-Host "[3] Waiting for services to be ready..."

function Wait-ForPort {
  param([int]$Port, [string]$Label, [int]$MaxSeconds = 30)
  $deadline = (Get-Date).AddSeconds($MaxSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $tcp = New-Object System.Net.Sockets.TcpClient
      $tcp.Connect("127.0.0.1", $Port)
      $tcp.Close()
      Write-Host "    $Label ready [OK]" -ForegroundColor Green
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  Write-Host "    [WARN] $Label not responding after ${MaxSeconds}s, proceeding anyway" -ForegroundColor Red
}

Wait-ForPort -Port 8000 -Label "Backend"
Wait-ForPort -Port 5180 -Label "Vite"

# ── 4. Launch Electron (foreground, closing ends everything) ──
Write-Host "[4] Launching Electron window..." -ForegroundColor Cyan
Set-Location "$ROOT\electron"

# Ensure electron is installed
if (-not (Test-Path "$ROOT\electron\node_modules\.bin\electron.cmd")) {
  Write-Host "    Installing electron deps first..." -ForegroundColor Gray
  npm install
}

npx electron . --dev

# ── 5. Cleanup child processes ────────────────────────────────
Write-Host ""
Write-Host "[5] Cleaning up background processes..." -ForegroundColor Yellow
function Stop-OwnedProcessTree {
  param([int]$ProcessId)
  if ($ProcessId -le 0) { return }
  & taskkill.exe /PID $ProcessId /T /F 2>$null | Out-Null
}
Stop-OwnedProcessTree -ProcessId $beJob.Id
Stop-OwnedProcessTree -ProcessId $feJob.Id
Write-Host "[OK] Backend/Vite process trees terminated. Goodbye." -ForegroundColor Green
