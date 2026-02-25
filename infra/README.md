# Filegate deployment

## 1) API service (systemd)

1. Copy `infra/filegate-api.service` to `/etc/systemd/system/filegate-api.service`.
2. Create env file at `/etc/filegate/.env` with at least:

```env
PORT=3100
INBOX_PATH=/var/lib/filegate/inbox
API_SECRET=your-super-secret-token-here
MAX_FILE_SIZE=209715200
UNZIP_ENABLED=false
# TRUSTED_PROXY_IPS=127.0.0.1
```

3. Reload and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now filegate-api
```

4. Check logs:

```bash
sudo journalctl -u filegate-api -f
```

## 2) Static UI deploy via sf

```bash
./infra/deploy-static.sh apps/ui filegate-upload
```

This uploads static files to `/opt/sf-sites/filegate-upload`.

## 3) Caddy reverse proxy

Use `infra/Caddyfile.example` and point your domain, for example `upload.example.com`.

`handle_path /api/*` strips the `/api` prefix and proxies to `localhost:3100`.
