#!/bin/bash
# ============================================================
# 🩺 TCY Watcher Healthcheck Script (with Telegram alert)
# ------------------------------------------------------------
# Runs every 5 minutes (DSM Scheduled Task)
# Restarts watchers if not found, and sends Telegram message.
# ============================================================

ROOT="/volume1/tcy-bot/barracuda-hft-v8"
LOG_DIR="$ROOT/logs"
ENV_FILE="$ROOT/.env"

# Load TELEGRAM credentials
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

# Function to send Telegram message
send_telegram() {
  local MESSAGE="$1"
  if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -H "Content-Type: application/json" \
      -d "{\"chat_id\": \"${TELEGRAM_CHAT_ID}\", \"text\": \"${MESSAGE}\"}" >/dev/null
  fi
}

cd "$ROOT" || exit

# Check watchers
pgrep -f "rujira_fills.js" >/dev/null
FILLS_OK=$?

pgrep -f "rujira_orders.js" >/dev/null
ORDERS_OK=$?

if [ $FILLS_OK -ne 0 ] || [ $ORDERS_OK -ne 0 ]; then
  echo "[Healthcheck] Missing watchers detected at $(date). Restarting..." >> "$LOG_DIR/health.log"
  bash "$ROOT/start-watchers.sh"

  MSG="⚠️ Watcher healthcheck detected missing process(es).\nAll watchers have been restarted automatically on $(date '+%Y-%m-%d %H:%M:%S')."
  send_telegram "$MSG"
else
  echo "[Healthcheck] Watchers OK at $(date)." >> "$LOG_DIR/health.log"
fi
