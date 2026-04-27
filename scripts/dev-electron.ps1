<#
.SYNOPSIS
  Micro-Earth · 开发模式桌面端启动脚本
  自动启动：Vite dev-server + Python uvicorn + Electron 窗口

.USAGE
  cd micro-earth
  powershell -ExecutionPolicy Bypass -File scripts/dev-electron.ps1
#>

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "  MICRO-EARTH · DEV MODE (Electron + Vite + FastAPI)" -ForegroundColor Cyan
Write-Host ""

# ── 寻找后端 Python ──────────────────────────────────────────
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

# ── 1. 启动 Python 后端 (后台) ───────────────────────────────
Write-Host "[1] Starting Python backend on :8000..." -ForegroundColor Yellow
$beJob = Start-Process -NoNewWindow -FilePath $pyExe `
  -ArgumentList "-m","uvicorn","api.main:app","--host","127.0.0.1","--port","8000" `
  -WorkingDirectory "$ROOT\backend" -PassThru
Write-Host "    PID: $($beJob.Id)" -ForegroundColor Gray

# ── 2. 启动 Vite dev-server (后台) ──────────────────────────
Write-Host "[2] Starting Vite dev-server on :5180..." -ForegroundColor Yellow
$feJob = Start-Process -NoNewWindow -FilePath "npm" `
  -ArgumentList "run","dev" `
  -WorkingDirectory "$ROOT\frontend" -PassThru
Write-Host "    PID: $($feJob.Id)" -ForegroundColor Gray

# ── 3. 等待前后端就绪 ────────────────────────────────────────
Write-Host "[3] Waiting for services to be ready..."
Start-Sleep -Seconds 6

# ── 4. 启动 Electron（前台，关闭即结束所有） ─────────────────
Write-Host "[4] Launching Electron window..." -ForegroundColor Cyan
Set-Location "$ROOT\electron"

# 确保 electron 已安装
if (-not (Test-Path "$ROOT\electron\node_modules\.bin\electron.cmd")) {
  Write-Host "    Installing electron deps first..." -ForegroundColor Gray
  npm install
}

npx electron . --dev

# ── 5. 清理子进程 ────────────────────────────────────────────
Write-Host ""
Write-Host "[5] Cleaning up background processes..." -ForegroundColor Yellow
Stop-Process -Id $beJob.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $feJob.Id -Force -ErrorAction SilentlyContinue
# 杀掉所有相关的 uvicorn / vite 进程
Get-Process | Where-Object { $_.Name -match "python|node" } | ForEach-Object {
  $_.Kill() 2>$null
}
Write-Host "[OK] All processes terminated. Goodbye." -ForegroundColor Green
