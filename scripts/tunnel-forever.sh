#!/usr/bin/env bash
# Free Cloudflare quick tunnel with auto-restart. The public URL is printed in logs/tunnel.log
cd "$(dirname "$0")/.."
BIN="${CLOUDFLARED:-cloudflared}"
while true; do
  echo "[$(date)] starting tunnel -> http://localhost:${PORT:-3000}"
  "$BIN" tunnel --no-autoupdate --url "http://localhost:${PORT:-3000}" 2>&1
  echo "[$(date)] tunnel exited; restarting in 5s"
  sleep 5
done
