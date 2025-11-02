// ============================================================
// 🔍 Rujira Live Fills Watcher (Bot Orders Only, Filtered)
// ------------------------------------------------------------
// ✅ Ignores trades without order_id
// ✅ Skips initial historical backfill
// ✅ Sends Telegram only for new bot-linked fills
// ✅ Debounced to prevent spam (10s cooldown)
// ============================================================

import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { logger } from "../logger";
import { sendTelegram } from "./tcy_api";

const log = logger;

// ============================================================
// 🔧 Environment loader
// ============================================================
const envPath = "/volume1/tcy-bot/barracuda-hft-v8/.env";
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  log.info("✅ .env manually loaded for Rujira Fills Watcher");
}

const API_BASE = process.env.RUJIRA_API_BASE?.trim() || "https://api.rujira.network/api";
const WALLET = process.env.WALLET_ADDRESS?.trim() || process.env.RUJIRA_WALLET_ADDRESS?.trim();
if (!WALLET) {
  log.error("❌ Missing WALLET_ADDRESS in .env");
  process.exit(1);
}

const FILLS_URL = `${API_BASE}/trade/historical_trades`;
const ORDER_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/order_ids.json";
const CURSOR_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/last_trade_id.json";

const POLL_INTERVAL_MS = 60_000;
const TELEGRAM_COOLDOWN_MS = 10_000;
let lastTelegramSent = 0;
let lastTradeId = 0;
let initialized = false; // suppress Telegram on first poll

// ============================================================
// 📄 Helpers
// ============================================================
function loadCursor(): number {
  try {
    if (!fs.existsSync(CURSOR_FILE)) return 0;
    return Number(fs.readFileSync(CURSOR_FILE, "utf8").trim()) || 0;
  } catch {
    return 0;
  }
}

function saveCursor(id: number): void {
  try {
    fs.writeFileSync(CURSOR_FILE, String(id));
  } catch (err: any) {
    log.warn(`[Fills] Failed to save cursor: ${err.message}`);
  }
}

function loadBotOrderIds(): Set<string> {
  try {
    if (!fs.existsSync(ORDER_FILE)) return new Set();
    const parsed = JSON.parse(fs.readFileSync(ORDER_FILE, "utf8"));
    return new Set(parsed.filter((x: any) => typeof x === "string" && x.length > 0));
  } catch (err: any) {
    log.warn(`[Fills] Failed to load bot order IDs: ${err.message}`);
    return new Set();
  }
}

// ============================================================
// 🧩 Fetch wallet fills
// ============================================================
async function fetchWalletFills(wallet: string): Promise<any[]> {
  const q = new URLSearchParams();
  q.set("ticker_id", "TCY_USDC");
  q.set("wallet", wallet);
  const url = `${FILLS_URL}?${q.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    if (!Array.isArray(raw)) return [];

    return raw
      .map((t) => ({
        type: t.type,
        price: Number(t.price),
        base_volume: Number(t.base_volume),
        trade_id: Number(t.trade_id),
        order_id: String(t.order_id || ""),
        trade_timestamp: Number(t.trade_timestamp),
      }))
      .filter((t) => t.trade_id && !Number.isNaN(t.trade_id))
      .sort((a, b) => a.trade_id - b.trade_id);
  } catch (err: any) {
    log.warn(`[Fills] Failed to fetch wallet fills: ${err.message}`);
    return [];
  }
}

// ============================================================
// 🔁 Main watcher
// ============================================================
export async function startFillWatcher(): Promise<void> {
  log.info(`[Fills] ✅ Starting filtered watcher for wallet ${WALLET}`);
  await sendTelegram(`🟢 Live fills watcher active for ${WALLET}`);

  lastTradeId = loadCursor();

  while (true) {
    try {
      const botOrders = loadBotOrderIds();
      const fills = await fetchWalletFills(WALLET);

      const newFills = fills.filter((f) => f.trade_id > lastTradeId);
      if (!newFills.length) {
        log.info("[Fills] No new trades found.");
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      // Determine new max ID
      const maxId = Math.max(...newFills.map((f) => f.trade_id));
      const relevant = newFills.filter(
        (f) => f.order_id && botOrders.has(f.order_id)
      );

      if (!initialized) {
        // Skip Telegram messages during initial catch-up
        initialized = true;
        lastTradeId = maxId;
        saveCursor(lastTradeId);
        log.info(`[Fills] Initial sync complete (latest trade ID ${lastTradeId}).`);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      if (!relevant.length) {
        log.info(`[Fills] ${newFills.length} new trades, none linked to bot orders.`);
      } else {
        for (const f of relevant) {
          const now = Date.now();
          if (now - lastTelegramSent < TELEGRAM_COOLDOWN_MS) continue;
          lastTelegramSent = now;

          const msg = `✅ ${f.type.toUpperCase()} filled @ $${f.price.toFixed(4)} (${f.base_volume.toFixed(
            2
          )} TCY)\nOrder ID: ${f.order_id}\nTrade ID: ${f.trade_id}`;
          log.info(`[Fills] ${msg}`);
          await sendTelegram(msg);
        }
      }

      if (maxId > lastTradeId) {
        lastTradeId = maxId;
        saveCursor(lastTradeId);
        log.info(`[Fills] Cursor updated → ${lastTradeId}`);
      }
    } catch (err: any) {
      log.error(`[Fills] Runtime error: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

if (require.main === module) startFillWatcher();
