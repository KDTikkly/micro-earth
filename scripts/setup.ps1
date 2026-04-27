<#
.SYNOPSIS
  Micro-Earth one-click environment setup
  Installs Python 3.12 (if needed), creates venv, installs all dependencies

.USAGE
  cd micro-earth
  powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
#>

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "  MICRO-EARTH SETUP" -ForegroundColor Cyan
Write-Host "  Checking and installing all dependencies..." -ForegroundColor Gray
Write-Host ""

# ── Step 1: Check Node.js ─────────────────────────────────────
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
try {
  $nodeVer = (node --version 2>&1).ToString().Trim()
  Write-Host "    Node.js $nodeVer [OK]" -ForegroundColor Green
} catch {
  Write-Host "    [ERROR] Node.js not found. Please install Node.js >= 18 from https://nodejs.org" -ForegroundColor Red
  exit 1
}

# ── Step 2: Check/Install Python 3.12 ────────────────────────
Write-Host "[2/5] Checking Python 3.12..." -ForegroundColor Yellow
$py312 = $null

# Check if py launcher has 3.12
try {
  $pyList = (py --list 2>&1).ToString()
  if ($pyList -match "3\.12") {
    $py312 = "py"
    Write-Host "    Python 3.12 found via py launcher [OK]" -ForegroundColor Green
  }
} catch {}

# Check venv if already created
if (-not $py312) {
  $venvPy = "$ROOT\backend\.venv\Scripts\python.exe"
  if (Test-Path $venvPy) {
    $ver = (& $venvPy --version 2>&1).ToString()
    if ($ver -match "3\.1[0-2]") {
      Write-Host "    Existing venv has $ver [OK]" -ForegroundColor Green
      $py312 = "VENV_EXISTS"
    }
  }
}

# Need to install Python 3.12
if (-not $py312) {
  Write-Host "    Python 3.12 not found. Downloading installer..." -ForegroundColor Gray
  $installerUrl = "https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe"
  $installerPath = "$env:TEMP\python-3.12.8-amd64.exe"

  $tcp = New-Object System.Net.Sockets.TcpClient
  try {
    $tcp.Connect("www.python.org", 443)
    $tcp.Close()
  } catch {
    Write-Host "    [ERROR] Cannot reach python.org. Check internet connection." -ForegroundColor Red
    exit 1
  }

  $wc = New-Object System.Net.WebClient
  $wc.DownloadFile($installerUrl, $installerPath)
  Write-Host "    Downloaded. Installing Python 3.12.8 (this takes ~30s)..." -ForegroundColor Gray

  Start-Process -FilePath $installerPath `
    -ArgumentList "/quiet","InstallAllUsers=0","PrependPath=0","Include_launcher=1","Include_pip=1" `
    -Wait -NoNewWindow

  # Verify
  try {
    $pyList = (py --list 2>&1).ToString()
    if ($pyList -match "3\.12") {
      $py312 = "py"
      Write-Host "    Python 3.12.8 installed [OK]" -ForegroundColor Green
    } else {
      Write-Host "    [ERROR] Installation failed. Please install Python 3.12 manually." -ForegroundColor Red
      exit 1
    }
  } catch {
    Write-Host "    [ERROR] py launcher not available. Please install Python 3.12 manually." -ForegroundColor Red
    exit 1
  }
}

# ── Step 3: Create Python venv + install backend deps ─────────
Write-Host "[3/5] Setting up Python backend..." -ForegroundColor Yellow
$venvDir = "$ROOT\backend\.venv"
$venvPy  = "$venvDir\Scripts\python.exe"
$venvPip = "$venvDir\Scripts\pip.exe"

if ($py312 -ne "VENV_EXISTS") {
  if (Test-Path $venvDir) {
    Write-Host "    Removing old venv..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $venvDir
  }
  Write-Host "    Creating virtual environment..." -ForegroundColor Gray
  & py -3.12 -m venv $venvDir
  if (-not (Test-Path $venvPy)) {
    Write-Host "    [ERROR] Failed to create venv" -ForegroundColor Red
    exit 1
  }
  Write-Host "    venv created [OK]" -ForegroundColor Green
}

Write-Host "    Installing backend dependencies (this may take 1-2 min)..." -ForegroundColor Gray
& $venvPip install -r "$ROOT\backend\requirements.txt" --quiet
if ($LASTEXITCODE -ne 0) {
  Write-Host "    [ERROR] pip install failed" -ForegroundColor Red
  exit 1
}
Write-Host "    Backend dependencies [OK]" -ForegroundColor Green

# ── Step 4: Install frontend deps ─────────────────────────────
Write-Host "[4/5] Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location "$ROOT\frontend"
npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "    [ERROR] npm install failed in frontend/" -ForegroundColor Red
    exit 1
  }
}
Write-Host "    Frontend dependencies [OK]" -ForegroundColor Green

# ── Step 5: Install Electron deps ─────────────────────────────
Write-Host "[5/5] Installing Electron dependencies..." -ForegroundColor Yellow
Set-Location "$ROOT\electron"
npm install --silent 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  npm install
  if ($LASTEXITCODE -ne 0) {
    Write-Host "    [ERROR] npm install failed in electron/" -ForegroundColor Red
    exit 1
  }
}
Write-Host "    Electron dependencies [OK]" -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────
Set-Location $ROOT
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "  SETUP COMPLETE!" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To start the app:" -ForegroundColor White
Write-Host "    powershell -ExecutionPolicy Bypass -File scripts/dev-electron.ps1" -ForegroundColor Yellow
Write-Host ""
