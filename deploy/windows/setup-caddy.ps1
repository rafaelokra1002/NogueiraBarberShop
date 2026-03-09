# Requires: PowerShell (Admin), Chocolatey installed or internet access to install it
# This script sets up Caddy on Windows to reverse proxy nogueirabarbershop.shop to the Node API at 127.0.0.1:3007
# Run as Administrator on your VPS Windows:  Right Click -> Run with PowerShell

$ErrorActionPreference = 'Stop'

function Ensure-Choco {
  if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Chocolatey..." -ForegroundColor Yellow
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
    iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
  } else {
    Write-Host "Chocolatey already installed." -ForegroundColor Green
  }
}

function Install-Tools {
  choco install -y caddy nssm
}

function Open-Firewall {
  New-NetFirewallRule -DisplayName "HTTP 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
  New-NetFirewallRule -DisplayName "HTTPS 443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
}

function Stop-IIS {
  $svc = Get-Service W3SVC -ErrorAction SilentlyContinue
  if ($svc -and $svc.Status -eq 'Running') {
    Write-Host "Stopping IIS (W3SVC)..." -ForegroundColor Yellow
    Stop-Service W3SVC -Force
    Set-Service W3SVC -StartupType Disabled
  }
}

function Prepare-Caddyfile {
  New-Item -ItemType Directory -Path C:\caddy -Force | Out-Null
  # Resolve Caddyfile relative to this script location
  $source = Join-Path $PSScriptRoot "..\Caddyfile" | Resolve-Path
  Copy-Item $source "C:\caddy\Caddyfile" -Force
}

function Test-Caddy {
  Write-Host "Starting Caddy in foreground to validate config... (Ctrl+C to stop)" -ForegroundColor Cyan
  & "C:\ProgramData\chocolatey\bin\caddy.exe" run --config C:\caddy\Caddyfile --adapter caddyfile
}

function Install-CaddyService {
  New-Item -ItemType Directory -Path C:\caddy\data -Force | Out-Null
  nssm install Caddy "C:\ProgramData\chocolatey\bin\caddy.exe" "run --config C:\caddy\Caddyfile --adapter caddyfile"
  nssm set Caddy AppDirectory "C:\caddy"
  nssm set Caddy AppEnvironmentExtra "CADDY_HOME=C:\caddy" "CADDY_DATA=C:\caddy\data"
  nssm set Caddy AppStdout "C:\caddy\caddy.log"
  nssm set Caddy AppStderr "C:\caddy\caddy.err.log"
  nssm start Caddy
}

# Main
Ensure-Choco
Install-Tools
Open-Firewall
Stop-IIS
Prepare-Caddyfile
Write-Host @"
If you want to validate before installing as a service, run:
& "C:\ProgramData\chocolatey\bin\caddy.exe" run --config C:\caddy\Caddyfile --adapter caddyfile
"@ -ForegroundColor DarkCyan
Install-CaddyService

Write-Host @"
Done. Test with PowerShell:
Invoke-WebRequest -UseBasicParsing -Uri https://nogueirabarbershop.shop -Method Head
"@ -ForegroundColor Green
