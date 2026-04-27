<#
.SYNOPSIS
  Micro-Earth Desktop Build Script
  一键将前端 + Electron + PyInstaller 后端打包为 Windows .exe 安装包

.STEPS
  1. Build React frontend  (vite build)
  2. PyInstaller backend   (pyinstaller micro_earth_backend.spec)
  3. npm install electron  (in electron/)
  4. electron-builder dist (生成 NSIS 安装包到 dist-electron/)

.USAGE
  cd micro-earth
  powershell -ExecutionPolicy Bypass -File scripts/build-desktop.ps1
#>

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot   # micro-earth/

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  MICRO-EARTH · DESKTOP BUILD PIPELINE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""

# ── Step 0: 检查必要工具 ─────────────────────────────────────
function Check-Command($cmd) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] '$cmd' not found. Please install it first." -ForegroundColor Red
    exit 1
  }
}
Check-Command "node"
Check-Command "npm"
Write-Host "[OK] Node $(node --version), npm $(npm --version)" -ForegroundColor Green

# ── Step 1: 构建 React 前端 ──────────────────────────────────
Write-Host ""
Write-Host "[1/4] Building React frontend..." -ForegroundColor Yellow
Set-Location "$ROOT\frontend"
npm run build
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Frontend build failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Frontend built → frontend/dist/" -ForegroundColor Green

# ── Step 2: PyInstaller 打包后端 ─────────────────────────────
Write-Host ""
Write-Host "[2/4] Packaging Python backend with PyInstaller..." -ForegroundColor Yellow
Set-Location "$ROOT\backend"

# 寻找 Python（优先 venv，其次 conda，最后系统）
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
if (-not $pyExe) {
  Write-Host "[WARN] No venv Python found, trying system python..." -ForegroundColor Yellow
  $pyExe = "python"
}
Write-Host "  Using Python: $pyExe" -ForegroundColor Gray

# 安装 PyInstaller（如未安装）
& $pyExe -m pip install pyinstaller --quiet
& $pyExe -m PyInstaller micro_earth_backend.spec --noconfirm --clean
if ($LASTEXITCODE -ne 0) {
  Write-Host "[WARN] PyInstaller failed. Backend won't be bundled." -ForegroundColor Yellow
  Write-Host "       In dev mode, Electron will launch uvicorn directly." -ForegroundColor Gray
} else {
  Write-Host "[OK] Backend bundled → backend/dist/micro_earth_backend/" -ForegroundColor Green
}

# ── Step 3: 安装 Electron 依赖 ───────────────────────────────
Write-Host ""
Write-Host "[3/4] Installing Electron dependencies..." -ForegroundColor Yellow
Set-Location "$ROOT\electron"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] npm install failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Electron deps installed" -ForegroundColor Green

# ── Step 4: electron-builder 打包 ───────────────────────────
Write-Host ""
Write-Host "[4/4] Running electron-builder (Windows NSIS)..." -ForegroundColor Yellow
Set-Location "$ROOT\electron"
npx electron-builder --win --x64
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] electron-builder failed!" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  BUILD COMPLETE!" -ForegroundColor Green
Write-Host "  Installer → dist-electron/Micro-Earth-Digital-Twin Setup *.exe" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Magenta
