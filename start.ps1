<#
.SYNOPSIS
  Micro-Earth one-click launcher
  First run: auto-setup environment
  Subsequent runs: directly launch app

.USAGE
  powershell -ExecutionPolicy Bypass -File start.ps1
#>

$ROOT = $PSScriptRoot

# Check if environment is already set up
$venvOk    = Test-Path "$ROOT\backend\.venv\Scripts\python.exe"
$feModsOk  = Test-Path "$ROOT\frontend\node_modules\.package-lock.json"
$elModsOk  = Test-Path "$ROOT\electron\node_modules\.bin\electron.cmd"

if (-not $venvOk -or -not $feModsOk -or -not $elModsOk) {
  Write-Host ""
  Write-Host "  First run detected - running setup..." -ForegroundColor Cyan
  Write-Host ""
  & powershell -ExecutionPolicy Bypass -File "$ROOT\scripts\setup.ps1"
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Setup failed. Fix the errors above and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
  }
}

# Launch the app
& powershell -ExecutionPolicy Bypass -File "$ROOT\scripts\dev-electron.ps1"
