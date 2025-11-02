// ============================================================
// 🪙 Rujira Adapter – SDK-Free Edition (Paper/Monitor Mode)
// ------------------------------------------------------------
// Replaces Rujira SDK client with lightweight REST-based helpers.
// ✅ No wallet keys required
// ✅ Works with Synology + systemd
// ✅ Keeps live price feed + Telegram alerts working
// ============================================================

import fs from "fs";
import "dotenv/config";
import { logger } from "../logger";
import { sendTelegram } from "./tcy_api";
import { getRujiraMidrate } from "./rujira_public";

const log = logger;

// ✅ Manual .env load (for Synology runtime)
const envPath = "/volume1/tcy-bot/barracuda-hft-v8/.env";
if (fs.existsSync(envPath)) {
  const result = require("dotenv").config({ path: envPath });
  if (result.error) log.warn("⚠️ Could not load .env:", result.error);
  else log.info("✅ .env manually loaded for Rujira Adapter (SDK-Free)");
}

// ------------------------------------------------------------
// ⚙️ Environment config
// ------------------------------------------------------------
const WALLET_ADDRESS =
  process.env.RUJIRA_WALLET_ADDRESS || process.env.THORCHAIN_WALLET_ADDRESS;
if (!WALLET_ADDRESS) log.warn("⚠️ Missing WALLET_ADDRESS in .env");

// ============================================================
// 💰 Mock wallet balances
// ============================================================
export async function getWalletBalances() {
  try {
    // Replace with real API when available
    const balances = [
      { asset: "TCY", amount: parseFloat(process.env.INITIAL_TCY || "0") },
      { asset: "USDC", amount: parseFloat(process.env.INITIAL_USDC || "0") },
    ];
    log.info(`[RujiraAdapter] Wallet balances (mock): ${JSON.stringify(balances)}`);
    return balances;
  } catch (err: any) {
    log.error(`❌ Failed to fetch balances: ${err.message}`);
    await sendTelegram(`⚠️ Balance fetch failed – ${err.message}`);
    return [];
  }
}

// ============================================================
// 📋 Mock open/filled orders
// ============================================================
export async function getOpenOrders() {
  return [];
}
export async function getFilledOrders() {
  return [];
}

// ============================================================
// 💵 Live market price (uses rujira_public)
// ============================================================
export async function getMarketPrice(symbol = "TCY_USDC") {
  try {
    const mid = await getRujiraMidrate(symbol);
    if (!mid) throw new Error("No valid midrate");
    log.info(`[RujiraAdapter] ${symbol} mid=${mid}`);
    return mid;
  } catch (err: any) {
    log.error(`❌ Failed to fetch market mid: ${err.message}`);
    await sendTelegram(`⚠️ Rujira API: Market mid fetch failed – ${err.message}`);
    return null;
  }
}

// ============================================================
// 🧾 Wallet summary for Telegram
// ============================================================
export async function getWalletSummary() {
  const balances = await getWalletBalances();
  const totalValue = balances.reduce((a, b) => a + (b.amount || 0), 0);
  return {
    wallet: WALLET_ADDRESS,
    balances,
    totalValue,
    openOrders: 0,
    filledOrders: 0,
  };
}
