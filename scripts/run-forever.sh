#!/usr/bin/env bash
# Keeps the production server alive (auto-restart on crash). Usage: nohup scripts/run-forever.sh > logs/supervisor.log 2>&1 &
cd "$(dirname "$0")/.."
export PORT="${PORT:-3000}" NODE_ENV=production
while true; do
  echo "[$(date)] starting next on :$PORT"
  ./node_modules/.bin/next start -p "$PORT" >> logs/app.log 2>&1
  echo "[$(date)] server exited with $?; restarting in 3s"
  sleep 3
done
