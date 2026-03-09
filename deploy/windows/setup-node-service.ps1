# Instala o servidor Node como serviço Windows usando NSSM
# Garante que o servidor reinicia automaticamente se parar
# Rode como Administrador: Right Click -> Run with PowerShell

$ErrorActionPreference = 'Stop'

$APP_DIR = "C:\Users\Administrador.WIN-NJLHBG4DOBP\Desktop\NogueiraBarberShop"
$SERVICE_NAME = "NogueiraBarberShop"
$NODE_PATH = (Get-Command node).Source
$NPX_PATH = (Get-Command npx).Source

# Verifica se NSSM está instalado
if (-not (Get-Command nssm -ErrorAction SilentlyContinue)) {
    Write-Host "Instalando NSSM..." -ForegroundColor Yellow
    choco install nssm -y
}

# Para e remove serviço existente se houver
$existing = Get-Service -Name $SERVICE_NAME -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Removendo serviço existente..." -ForegroundColor Yellow
    nssm stop $SERVICE_NAME
    nssm remove $SERVICE_NAME confirm
}

# Instala o serviço usando npx tsx
Write-Host "Instalando serviço $SERVICE_NAME..." -ForegroundColor Cyan
nssm install $SERVICE_NAME $NPX_PATH "tsx server/index.ts"
nssm set $SERVICE_NAME AppDirectory $APP_DIR
nssm set $SERVICE_NAME AppEnvironmentExtra "NODE_ENV=production"

# Logs
$logDir = "$APP_DIR\logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
nssm set $SERVICE_NAME AppStdout "$logDir\server.log"
nssm set $SERVICE_NAME AppStderr "$logDir\server.err.log"
nssm set $SERVICE_NAME AppRotateFiles 1
nssm set $SERVICE_NAME AppRotateBytes 5000000

# Auto-restart on failure
nssm set $SERVICE_NAME AppRestartDelay 5000
nssm set $SERVICE_NAME AppExit Default Restart

# Inicia o serviço
Write-Host "Iniciando serviço..." -ForegroundColor Cyan
nssm start $SERVICE_NAME

Write-Host @"

============================================
  Serviço $SERVICE_NAME instalado com sucesso!
============================================

  Status:    nssm status $SERVICE_NAME
  Parar:     nssm stop $SERVICE_NAME
  Iniciar:   nssm start $SERVICE_NAME
  Reiniciar: nssm restart $SERVICE_NAME
  Remover:   nssm remove $SERVICE_NAME confirm
  Logs:      $logDir\server.log

  O servidor reinicia automaticamente se parar!
============================================
"@ -ForegroundColor Green
