# Start Expo Metro for iPhone LAN access.
#
# Windows npm/npx CANNOT run on \\wsl.localhost\ paths — you get:
#   "Maximum call stack size exceeded" in realpathCached (npm workspaces).
#
# This script runs Metro inside WSL with your LAN IP (same as expo-device.sh lan).
# Requires: firewall fix applied (expo-wsl-firewall.ps1) + wsl --shutdown once.
#
# Usage (from repo root in PowerShell):
#   Set-ExecutionPolicy -Scope Process Bypass -Force
#   .\scripts\start-metro-windows.ps1

$ErrorActionPreference = "Stop"

$distro = "Ubuntu-24.04"
$repoLinux = "/home/mz/workspace/binger-landing"

$lanIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -match "^192\.168\.\d+\.\d+$" } |
  Select-Object -First 1).IPAddress

if (-not $lanIp) {
  Write-Host "No 192.168.x.x address found. Set EXPO_DEV_HOST manually in WSL." -ForegroundColor Red
  exit 1
}

Write-Host "=== Metro via WSL (Windows npm cannot use \\wsl$\ project paths) ===" -ForegroundColor Cyan
Write-Host "API:   http://${lanIp}:8080"
Write-Host "Metro: exp://${lanIp}:8081"
Write-Host ""
Write-Host "iPhone Safari test BEFORE scanning QR:" -ForegroundColor Green
Write-Host "  http://${lanIp}:8081/status"
Write-Host "  Expected: packager-status:running"
Write-Host ""
Write-Host "After QR scan: wait 1-2 min for first bundle (~14 MB)."
Write-Host ""

wsl -d $distro -e bash -lc "cd '$repoLinux' && EXPO_DEV_HOST=$lanIp ./scripts/expo-device.sh lan"
