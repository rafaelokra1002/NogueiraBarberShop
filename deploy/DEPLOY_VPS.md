# Deploy na VPS (Ubuntu + Caddy)

Siga estes passos na sua VPS (Ubuntu 20.04/22.04). Substitua o domínio e caminhos quando necessário.

## 1) Pré-requisitos
- Domínio apontando para o IP público da VPS (A @ e CNAME www -> @)
- Porta 80/443 liberadas no firewall do provedor e no SO (ufw)

## 2) Instalar dependências
```bash
sudo apt-get update -y
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
# Caddy (auto-HTTPS)
sudo apt-get install -y caddy
```

## 3) Enviar o projeto para a VPS
- Opção A (git): `git clone <seu-repo>`
- Opção B (zip/scp): compacte localmente e envie: `scp -r NogueiraBarberShop usuario@IP:/opt/NogueiraBarberShop`

Exemplo assumindo pasta `/opt/NogueiraBarberShop`:
```bash
cd /opt/NogueiraBarberShop
npm ci
npm run db:generate
npm run db:push
npm run build
```

## 4) Rodar o servidor Node com systemd
Crie o serviço:
```bash
sudo cp deploy/systemd/nogueira.service /etc/systemd/system/nogueira.service
sudo systemctl daemon-reload
sudo systemctl enable --now nogueira
sudo systemctl status nogueira -n 50
```
O serviço chama `npm run server` e escuta na porta 3007 (0.0.0.0).

## 5) Configurar Caddy (HTTPS automático)
```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy
sudo systemctl status caddy -n 50
```
O `Caddyfile` já aponta `nogueirabarbershop.shop` -> `127.0.0.1:3007` e redireciona `www`.

## 6) Firewall (Ubuntu)
```bash
sudo ufw allow 80,443/tcp
sudo ufw allow 3007/tcp  # opcional (apenas se precisar acessar direto)
sudo ufw enable
sudo ufw status
```

## 7) Verificação
```bash
curl -I http://127.0.0.1:3007

curl -I http://localhost
curl -I https://nogueirabarbershop.shop
```
Se tudo OK, você verá `HTTP/1.1 200 OK`/`301/308` e, no domínio, certificado TLS emitido automaticamente pela Caddy (Let's Encrypt/ZeroSSL).

## 8) Logs
```bash
journalctl -u nogueira -f
journalctl -u caddy -f
```

## Observações
- Variáveis de ambiente: crie `/etc/default/nogueira` se precisar (e referencie no unit), ou use um `.env` na raiz.
- Banco: atual setup usa SQLite. Faça backup regular do arquivo `prisma/dev.db`.
- Se usar Nginx em vez de Caddy, habilite Certbot para HTTPS.
