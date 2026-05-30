# Run in PowerShell as Administrator:
#   cd \\wsl.localhost\Ubuntu-24.04\home\mz\workspace\binger-landing\scripts
#   .\expo-wsl-firewall.ps1

$ErrorActionPreference = "Continue"
$port = 8081
$vmCreatorId = "{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}"

Write-Host "=== Binger WSL LAN firewall fix ===" -ForegroundColor Cyan

Write-Host "[1/4] Hyper-V VM inbound -> Allow"
try {
  Set-NetFirewallHyperVVMSetting -Name $vmCreatorId -DefaultInboundAction Allow
  Write-Host "  OK"
} catch {
  Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[2/4] Hyper-V rule TCP $port (WSL VMCreatorId)"
$hvRuleName = "Binger WSL Metro 8081"
if (Get-NetFirewallHyperVRule -DisplayName $hvRuleName -ErrorAction SilentlyContinue) {
  Write-Host "  Already exists."
} else {
  New-NetFirewallHyperVRule `
    -DisplayName $hvRuleName `
    -Direction Inbound `
    -VMCreatorId $vmCreatorId `
    -Protocol TCP `
    -LocalPorts $port `
    -Action Allow `
    -Enabled True | Out-Null
  Write-Host "  Created."
}

Write-Host "[3/4] Windows Firewall TCP $port"
$winRuleName = "Binger Expo Metro ($port)"
if (-not (Get-NetFirewallRule -DisplayName $winRuleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName $winRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Any | Out-Null
  Write-Host "  Created."
} else {
  Write-Host "  Already exists."
}

Write-Host "[4/4] Network profile -> Private"
Get-NetConnectionProfile | ForEach-Object {
  if ($_.NetworkCategory -eq "Public") {
    Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private
    Write-Host "  $($_.InterfaceAlias) -> Private"
  }
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match "^192\.168\." } | Select-Object -First 1).IPAddress
Write-Host ""
Write-Host "Run: wsl --shutdown" -ForegroundColor Yellow
Write-Host "Then test iPhone Safari: http://${ip}:$port/status" -ForegroundColor Green
