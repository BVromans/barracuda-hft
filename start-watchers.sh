#!/bin/bash
cd /volume1/tcy-bot/barracuda-hft-v8

# Redirect all output to logs/all.log
exec >> logs/all.log 2>&1

echo "[Watcher] Starting Rujira watchers..."

# Start both watchers silently in background
/usr/local/bin/node dist/helpers/rujira_orders.js &
/usr/local/bin/node dist/helpers/rujira_fills.js &
