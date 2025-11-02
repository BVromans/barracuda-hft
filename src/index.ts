// ============================================================
// 🚀 TCY Bot – Main Bootstrap (Value-Anchored Strategy + Telegram Control)
// ------------------------------------------------------------
// Loads environment, validates configuration & formulas,
// launches Base Value Range strategy, Telegram control,
// and auto-syncs order IDs for the Rujira order watcher.
// ============================================================

// ------------------------------------------------------------
// 🛡️ Global Guards – prevent silent crashes
// ------------------------------------------------------------
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] UnhandledPromiseRejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] UncaughtException:", err);
});

import fs from "fs";
import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";
import { TCY_BOT_NAME, TCY_BOT_VERSION } from "./version";
import {
  getMarketPrice,
  sendTelegram,
  registerOrderId,
  cancelAllOrders,
} from "./helpers/tcy_api";
import {
  runBaseValueRange,
  calculateValueAnchoredLimits,
  valueAnchoredSanityCheck,
} from "./strategies/tcy_base_value_range";
import { registerTelegramControl } from "./helpers/tcy_telegram_control";

// ------------------------------------------------------------
// ⚙️ Load Environment (.env manual fallback for Synology)
// ------------------------------------------------------------
const envPath = "/volume1/tcy-bot/barracuda-hft-v8/.env";
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ [Env] Loaded manually from ${envPath}`);
} else {
  console.warn(`⚠️ [Env] Missing .env at ${envPath}`);
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
console.log(`[Debug] TELEGRAM_BOT_TOKEN length = ${TELEGRAM_BOT_TOKEN.length}`);

const BASE_VALUE = parseFloat(process.env.INITIAL_PORTFOLIO_VALUE || "6000");
const TOTAL_TCY = parseFloat(process.env.INITIAL_TCY || "0");
const ORDER_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/order_ids.json";

// ------------------------------------------------------------
// 🧭 Sanity Checks – Static (formula) + Dynamic (API validation)
// ------------------------------------------------------------
async function runStartupSanityCheck(): Promise<void> {
  console.log("[Startup] 🧭 Running static sanity check...");
  try {
    valueAnchoredSanityCheck();
    console.log("[Startup] ✅ Formula sanity check passed.");
  } catch (err: any) {
    console.error(`[Startup] ❌ Formula check failed: ${err.message}`);
    await sendTelegram(`❌ ${TCY_BOT_NAME} halted – formula drift.\n${err.message}`);
    process.exit(1);
  }
}

async function dynamicEnvCheck(): Promise<void> {
  console.log("[Startup] 🧭 Running dynamic sanity check...");
  const pauseMs = Number(process.env.PAUSE_MS || 600000);
  const t0 = Date.now();
  let attempts = 0;

  while (true) {
    try {
      const mid = await getMarketPrice("TCY_USDC");
      const { buy, sell } = calculateValueAnchoredLimits(BASE_VALUE, TOTAL_TCY, mid);

      if (buy.price <= 0 || sell.price <= 0 || sell.price <= buy.price) {
        throw new Error(`Unrealistic computed limits (buy=${buy.price}, sell=${sell.price})`);
      }

      console.log(
        `[Startup] ✅ Sanity check passed: buy=${buy.price.toFixed(4)}, sell=${sell.price.toFixed(
          4
        )}, mid=${mid.toFixed(4)}`
      );

      await sendTelegram(
        `🤖 ${TCY_BOT_NAME} v${TCY_BOT_VERSION}\n✅ Startup check passed.\n` +
          `Base=$${BASE_VALUE.toFixed(2)}\nTotal=${TOTAL_TCY.toFixed(2)} TCY\n` +
          `Buy @ $${buy.price.toFixed(4)} | Sell @ $${sell.price.toFixed(4)}\nMarket ≈ $${mid.toFixed(4)}`
      );

      // ✨ Reset watcher file with new orders
      fs.writeFileSync(ORDER_FILE, JSON.stringify([], null, 2));
      registerOrderId("BUY", buy.price);
      registerOrderId("SELL", sell.price);

      if (attempts > 0) {
        const mins = Math.round((Date.now() - t0) / 60000);
        await sendTelegram(`✅ Connection recovered after ~${mins} min (${attempts} attempts).`);
      }

      break;
    } catch (err: any) {
      attempts++;
      const msg = `[Startup] ❌ Dynamic check failed: ${err.message} – retrying in ${(pauseMs / 60000).toFixed(0)} min`;
      console.error(msg);
      try {
        await sendTelegram(msg);
      } catch {}
      await new Promise((r) => setTimeout(r, pauseMs));
    }
  }
}

// ------------------------------------------------------------
// 🔄 Runtime auto-sync hook for watcher
// ------------------------------------------------------------
async function syncWatcherOrders(buyPrice: number, sellPrice: number) {
  try {
    fs.writeFileSync(ORDER_FILE, JSON.stringify([], null, 2)); // clear old
    registerOrderId("BUY", buyPrice);
    registerOrderId("SELL", sellPrice);
    console.log(`[WatcherSync] Updated watcher with BUY=${buyPrice} SELL=${sellPrice}`);
  } catch (err: any) {
    console.warn(`[WatcherSync] Failed to sync: ${err.message}`);
  }
}

// ------------------------------------------------------------
// 🧩 Main Entrypoint
// ------------------------------------------------------------
(async () => {
  console.log("=============================================");
  console.log(`🚀 Starting ${TCY_BOT_NAME} v${TCY_BOT_VERSION}`);
  console.log("=============================================");

  await runStartupSanityCheck();
  await dynamicEnvCheck();

  // ✅ Initialize Telegram bot
  if (TELEGRAM_BOT_TOKEN.length > 0) {
    console.log(`[Init] Creating Telegram bot instance...`);
    const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
    registerTelegramControl(bot);
  } else {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN missing – control disabled.");
  }

  // ✅ Start Base Value Range strategy
  const runAndSync = async () => {
    try {
      const mid = await getMarketPrice("TCY_USDC");
      const { buy, sell } = calculateValueAnchoredLimits(BASE_VALUE, TOTAL_TCY, mid);
      await syncWatcherOrders(buy.price, sell.price);
      await runBaseValueRange(process.env.WALLET_ADDRESS || "", BASE_VALUE);
    } catch (err: any) {
      console.error(`[Main] Strategy error: ${err.message}`);
      await sendTelegram(`⚠️ Strategy runtime error: ${err.message}`);
    }
  };

  await runAndSync();

  // 🔁 Periodic refresh for watcher sync (default 15 min)
  setInterval(runAndSync, Number(process.env.WATCHER_REFRESH_MS || 900000));

  // 🩺 Heartbeat every 5 min
  setInterval(() => {
    globalThis.lastHeartbeat = new Date().toISOString();
    console.log(`[Health] ${TCY_BOT_NAME} alive @ ${globalThis.lastHeartbeat}`);
  }, Number(process.env.HEALTH_MS || 300000));
})();
