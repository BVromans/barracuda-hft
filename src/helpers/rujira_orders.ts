// ============================================================
// 📡 Rujira Orders Watcher (Refined Safe Mode)
// ------------------------------------------------------------
// ✅ Uses your /logs/order_ids.json created by tcy_api.ts
// ✅ Checks live orderbook REST endpoint
// ✅ Confirms disappearance twice (to avoid double-stream flicker)
// ✅ Removes filled orders automatically
// ✅ Sends Telegram only when truly filled/disappeared
// ============================================================

import fs from "fs";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { logger } from "../logger";
import { sendTelegram } from "./tcy_api";

const log = logger;

// ============================================================
// 🔧 Environment
// ============================================================
const envPath = "/volume1/tcy-bot/barracuda-hft-v8/.env";
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  log.info("✅ .env manually loaded for Rujira Orders Watcher");
}

const API_BASE = process.env.RUJIRA_API_BASE?.trim() || "https://api.rujira.network/api";
const ORDERBOOK_URL = `${API_BASE}/trade/orderbook?ticker_id=TCY_USDC`;
const WALLET = process.env.WALLET_ADDRESS?.trim() || process.env.RUJIRA_WALLET_ADDRESS?.trim();

if (!WALLET) {
  log.error("❌ Missing WALLET_ADDRESS in .env");
  process.exit(1);
}

// ============================================================
// 📁 File helpers
// ============================================================
const ORDER_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/order_ids.json";

function loadOrderIds(): string[] {
  try {
    if (!fs.existsSync(ORDER_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(ORDER_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch (err: any) {
    log.warn(`[Orders] Failed to read order_ids.json: ${err.message}`);
    return [];
  }
}

function saveOrderIds(ids: string[]) {
  try {
    fs.writeFileSync(ORDER_FILE, JSON.stringify([...new Set(ids)], null, 2));
  } catch (err: any) {
    log.error(`[Orders] Failed to write order_ids.json: ${err.message}`);
  }
}

// ============================================================
// 🔍 REST orderbook fetcher
// ============================================================
async function fetchOrderbook() {
  try {
    const res = await fetch(ORDERBOOK_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: any) {
    log.error(`[Orders] Fetch error: ${err.message}`);
    return null;
  }
}

// ============================================================
// 🔁 Main watcher loop
// ============================================================
const POLL_INTERVAL_MS = 60_000;
const CONFIRMATION_CYCLES = 2; // vanish twice before confirmed filled
const disappearanceTracker: Record<string, number> = {};

export async function startOrderWatcher(): Promise<void> {
  log.info(`[Orders] ✅ Starting open order watcher for ${WALLET}`);
  await sendTelegram(`🟢 Order tracker active for ${WALLET}`);

  let knownOrders = loadOrderIds();
  log.info(`[Orders] Tracking ${knownOrders.length} orders initially.`);

  while (true) {
    try {
      const orderbook = await fetchOrderbook();
      if (!orderbook) {
        log.warn("[Orders] No data returned from orderbook API.");
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      const bids = (orderbook?.bids || []).map((b: any) => Number(b[0]));
      const asks = (orderbook?.asks || []).map((a: any) => Number(a[0]));
      const nowVisible: string[] = [];

      for (const id of knownOrders) {
        const [side, priceStr] = id.split(":");
        const price = parseFloat(priceStr);
        if (!side || isNaN(price)) continue;

        const list = side === "BUY" ? bids : asks;
        const visible = list.some((p) => Math.abs(p - price) < 1e-6);

        if (visible) {
          disappearanceTracker[id] = 0; // reset disappearance counter
          nowVisible.push(id);
        } else {
          disappearanceTracker[id] = (disappearanceTracker[id] || 0) + 1;

          if (disappearanceTracker[id] >= CONFIRMATION_CYCLES) {
            const msg = `✅ ${side} order @ $${price.toFixed(4)} likely filled (vanished from orderbook).`;
            log.info(`[Orders] ${msg}`);
            await sendTelegram(msg);
            delete disappearanceTracker[id];
          } else {
            nowVisible.push(id); // wait for confirmation
          }
        }
      }

      if (nowVisible.length !== knownOrders.length) {
        knownOrders = nowVisible;
        saveOrderIds(knownOrders);
        log.info(`[Orders] Updated tracked orders: ${knownOrders.length} remaining.`);
      } else {
        log.info(`[Orders] Currently tracking ${knownOrders.length} active orders.`);
      }
    } catch (err: any) {
      log.error(`[Orders] Runtime error: ${err.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// ============================================================
// 🧾 CLI start
// ============================================================
if (require.main === module) {
  startOrderWatcher();
}
