# Run in PowerShell as Administrator:
#   cd \\wsl.localhost\Ubuntu-24.04\home\mz\workspace\binger-landing\scripts
#   .\expo-wsl-firewall.ps1
#
# Opens WSL2 ports so iPhone on the same Wi‑Fi/hotspot can reach:
#   :8081  Metro (Expo Go bundle)
#   :8080  Docker nginx + API (login, magic link)

$ErrorActionPreference = "Continue"
$vmCreatorId = "{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}"
$ports = @(8080, 8081)

Write-Host "=== Binger WSL LAN firewall (8080 API + 8081 Metro) ===" -ForegroundColor Cyan

Write-Host "[1/5] Hyper-V VM inbound -> Allow"
try {
  Set-NetFirewallHyperVVMSetting -Name $vmCreatorId -DefaultInboundAction Allow
  Write-Host "  OK"
} catch {
  Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "[2/5] Hyper-V + Windows firewall rules"
foreach ($port in $ports) {
  $label = if ($port -eq 8080) { "API" } else { "Metro" }
  $hvRuleName = "Binger WSL $label $port"
  if (Get-NetFirewallHyperVRule -DisplayName $hvRuleName -ErrorAction SilentlyContinue) {
    Write-Host "  Hyper-V $port : already exists"
  } else {
    New-NetFirewallHyperVRule `
      -DisplayName $hvRuleName `
      -Direction Inbound `
      -VMCreatorId $vmCreatorId `
      -Protocol TCP `
      -LocalPorts $port `
      -Action Allow `
      -Enabled True | Out-Null
    Write-Host "  Hyper-V $port : created" -ForegroundColor Green
  }

  $winRuleName = "Binger WSL $label ($port)"
  if (-not (Get-NetFirewallRule -DisplayName $winRuleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $winRuleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Any | Out-Null
    Write-Host "  Windows $port : created" -ForegroundColor Green
  } else {
    Write-Host "  Windows $port : already exists"
  }
}

Write-Host "[3/5] Port proxy Windows -> WSL (LAN IP -> Docker/Metro in WSL)"
$wslIp = (wsl -e hostname -I 2>$null).Trim().Split(" ", [StringSplitOptions]::RemoveEmptyEntries)[0]
if (-not $wslIp) {
  Write-Host "  Could not read WSL IP (is WSL running?)" -ForegroundColor Red
} else {
  Write-Host "  WSL IP: $wslIp"
  foreach ($port in $ports) {
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null | Out-Null
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  portproxy 0.0.0.0:$port -> ${wslIp}:$port" -ForegroundColor Green
    } else {
      Write-Host "  portproxy $port failed (run as Administrator)" -ForegroundColor Red
    }
  }
  netsh interface portproxy show v4tov4
}

Write-Host "[4/5] Network profile -> Private"
Get-NetConnectionProfile | ForEach-Object {
  if ($_.NetworkCategory -eq "Public") {
    Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private
    Write-Host "  $($_.InterfaceAlias) -> Private"
  }
}

Write-Host "[5/5] Detect PC LAN IP for iPhone tests"
$ips = @(
  (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -notmatch "^127\." -and $_.PrefixOrigin -ne "WellKnown"
  }).IPAddress
) | Sort-Object -Unique
$lan = $ips | Where-Object { $_ -match "^(192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)" } | Select-Object -First 1
if (-not $lan) { $lan = $ips | Select-Object -First 1 }

Write-Host ""
Write-Host "=== Next steps ===" -ForegroundColor Yellow
Write-Host "1. wsl --shutdown   (then reopen Ubuntu + restart Docker + Metro)"
Write-Host "2. Docker:  docker compose -f infra/docker-compose.yml --env-file .env up -d"
Write-Host "3. Metro:   EXPO_DEV_HOST=$lan ./scripts/expo-device.sh lan"
Write-Host ""
Write-Host "iPhone Safari (Metro must be running for API on WSL2):" -ForegroundColor Green
Write-Host "  API:   http://${lan}:8081/api/v1/health"
Write-Host "  Metro: http://${lan}:8081/status"
