#!/usr/bin/env bash
# Atualização automatizada da aplicação NogueiraBarberShop (produção)
# Uso: executar na VPS dentro de /opt/NogueiraBarberShop
#   chmod +x deploy/deploy_update.sh
#   ./deploy/deploy_update.sh

set -euo pipefail

APP_DIR="/opt/NogueiraBarberShop"
SERVICE_NAME="nogueira"

if [ "$(pwd)" != "$APP_DIR" ]; then
  echo "[ERRO] Rode dentro de $APP_DIR" >&2
  exit 1
fi

echo "==> Parando serviço (se rodando)"
sudo systemctl stop "$SERVICE_NAME" || true

TS=$(date +%Y%m%d-%H%M%S)
DB_FILE="prisma/dev.db"
if [ -f "$DB_FILE" ]; then
  echo "==> Backup banco: $DB_FILE -> prisma/dev.db.bak.$TS"
  cp "$DB_FILE" "prisma/dev.db.bak.$TS"
fi

if [ -d .git ]; then
  echo "==> Atualizando código (git pull)"
  git pull --ff-only
else
  echo "[AVISO] Repositório sem .git (pule git pull)"
fi

echo "==> Instalando dependências (limpas)"
npm ci

echo "==> Gerando client Prisma"
npm run db:generate

echo "==> Aplicando migrações ao banco"
npx prisma migrate deploy

echo "==> Escrevendo version.txt"
echo "$(git rev-parse --short HEAD 2>/dev/null || echo unknown)" > public/version.txt

echo "==> Build frontend"
npm run build

echo "==> Iniciando serviço"
sudo systemctl start "$SERVICE_NAME"

sleep 2
sudo systemctl status "$SERVICE_NAME" -n 20 --no-pager || true

echo "==> Teste rápido"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3007/api/health || echo 000)
echo "Health HTTP: $STATUS"

VERSION=$(curl -s http://127.0.0.1:3007/api/version || echo '{}')
echo "Version API: $VERSION"

echo "==> Finalizado. Acesse: https://nogueirabarbershop.shop (force refresh: Ctrl+F5)"
