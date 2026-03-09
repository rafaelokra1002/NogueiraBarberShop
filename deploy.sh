#!/bin/bash

# Script de deploy para VPS Ubuntu
# Execute este script na sua VPS após clonar o repositório

set -e

echo "🚀 Iniciando deploy do Nogueira Barber Shop..."

# 1. Instalar dependências do Node.js
echo "📦 Instalando dependências..."
npm ci

# 2. Gerar Prisma Client
echo "🗄️ Configurando banco de dados..."
npm run db:generate
npm run db:push

# 3. Fazer build do frontend
echo "🏗️ Fazendo build do frontend..."
npm run build

# 4. Configurar serviço systemd
echo "⚙️ Configurando serviço systemd..."
sudo cp deploy/systemd/nogueira.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable nogueira
sudo systemctl restart nogueira

# 5. Configurar Caddy
echo "🌐 Configurando Caddy (HTTPS automático)..."
sudo cp deploy/Caddyfile /etc/caddy/
sudo systemctl enable caddy
sudo systemctl reload caddy

# 6. Verificar status dos serviços
echo "✅ Verificando status dos serviços..."
echo "Status do Node.js:"
sudo systemctl status nogueira --no-pager -l

echo "Status do Caddy:"
sudo systemctl status caddy --no-pager -l

echo "🎉 Deploy concluído!"
echo "Seu site estará disponível em: https://nogueirabarbershop.shop"
echo "Para verificar logs:"
echo "  - Node.js: journalctl -u nogueira -f"
echo "  - Caddy: journalctl -u caddy -f"
