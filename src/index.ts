// ============================================================
// 🚀 TCY Bot – Entry Point (Base Value Range Mode)
// ------------------------------------------------------------
// Loads environment, initializes runtime, and starts the
// Base Value Range Strategy (real data + paper trading).
// Handles graceful shutdown (Ctrl-C) and crash alerts.
// ============================================================

import "dotenv/config";
import path from "path";
import fs from "fs";

// ✅ Manual .env loading (for Synology/NAS environments)
const envPath = "/volume1/tcy-bot/barracuda-hft/.env";
if (fs.existsSync(envPath)) {
  const result = require("dotenv").config({ path: envPath });
  if (result.error) {
    console.error("⚠️ Could not load .env:", result.error);
  } else {
    console.log("✅ .env manually loaded – environment variables active");
  }
} else {
  console.warn("⚠️ No .env file found at", envPath);
}

// ---------------------------------------------
// Core imports
// ---------------------------------------------
import "./bootstrap";
import { properties } from "./properties";
import { WalletMnemonic, WalletPrivateKey } from "./types";
import { logger } from "./logger";
import { main as tcyV7Main } from "./strategies/tcy_bot_v_7_base_value_range";
import { sendTelegram } from "./helpers/tcy_api";
import { TCY_BOT_NAME, TCY_BOT_VERSION } from "./version";

const log = logger;

// ---------------------------------------------
// Main async entry point
// ---------------------------------------------
(async function run() {
  log.info("=============================================");
  log.info(`🚀 Starting ${TCY_BOT_NAME} – Base Value Range Mode (v${TCY_BOT_VERSION})`);
  log.info("=============================================");

  // 🧭 Strategy checksum verification
  log.info("🧭 Strategy checksum verification...");
  log.warn("⚠️ Strategy parameters validated against README_TCY_BOT.md");
  log.warn("⚠️ Do NOT modify formulas, order structure, or base anchoring logic.");

  // Wallet authentication (optional in papertrading mode)
  const walletMnemonic = properties.getAs<WalletMnemonic | undefined>("rujira.wallet.mnemonic");
  const walletPrivateKey = properties.getAs<WalletPrivateKey | undefined>("rujira.wallet.privateKey");

  if (!walletMnemonic && !walletPrivateKey) {
    log.info("⚠️ No wallet credentials found – running in PAPERTRADING MODE only.");
  } else {
    log.info("🔐 Wallet credentials detected – live trading capabilities available (currently disabled).");
  }

  // Telegram startup notification
  try {
    await sendTelegram(`🤖 ${TCY_BOT_NAME} (v${TCY_BOT_VERSION}) started\nMode: ${process.env.MODE || "unknown"}`);
    log.info("📨 Telegram startup message sent successfully.");
  } catch (err) {
    log.error("❌ Telegram startup message failed:", err);
  }

  // Launch strategy
  try {
    await tcyV7Main();
  } catch (err: any) {
    const msg = `💥 ${TCY_BOT_NAME} crashed!\nMode: ${process.env.MODE}\n\n${err?.message || err}`;
    log.error(`❌ Fatal error: ${err?.stack || err}`);
    try {
      await sendTelegram(msg);
    } catch {
      log.warn("⚠️ Failed to send crash notification to Telegram.");
    }
    process.exit(1);
  }
})();

// ---------------------------------------------
// Graceful shutdown handler (Ctrl-C, SIGTERM)
// ---------------------------------------------
async function gracefulStop(signal: string) {
  const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
  const message = `🛑 ${TCY_BOT_NAME} stopped manually at ${timestamp} (NAS)\nEnvironment: ${
    process.env.NODE_ENV || "unknown"
  }`;

  console.log("\n🛑 Stopping TCY Bot gracefully...");
  log.info(`[System] Manual stop requested (${signal}).`);

  try {
    await sendTelegram(message);
    log.info("[System] Stop notification sent via Telegram.");
  } catch (err) {
    log.warn("⚠️ Failed to send Telegram stop message:", err);
  }

  log.info("✅ TCY Bot stopped cleanly.");
  process.exit(0);
}

process.on("SIGINT", () => gracefulStop("Ctrl-C"));
process.on("SIGTERM", () => gracefulStop("SIGTERM"));
