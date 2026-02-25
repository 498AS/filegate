#!/usr/bin/env bash
set -euo pipefail

UI_DIR="${1:-apps/ui}"
SF_SITE_NAME="${2:-filegate-upload}"

if ! command -v sf >/dev/null 2>&1; then
  echo "sf command not found"
  exit 1
fi

if [[ ! -d "$UI_DIR" ]]; then
  echo "UI directory not found: $UI_DIR"
  exit 1
fi

echo "Uploading static UI from $UI_DIR to sf site $SF_SITE_NAME"
sf upload "$UI_DIR" "$SF_SITE_NAME"

echo "Done"
echo "Configure Caddy with infra/Caddyfile.example"
echo "Enable API service: sudo systemctl enable --now filegate-api"
echo "Logs: sudo journalctl -u filegate-api -f"
