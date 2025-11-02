// ============================================================
// 🌐 Rujira Public API Helper (Final Hardened Version)
// ------------------------------------------------------------
// Provides midrate and wallet summary data for Telegram control.
// Always respects .env (no .io fallback) and runs fine under
// Synology NAS / systemd detached processes.
// ============================================================

import fs from "fs";
import dotenv from "dotenv";
import { logger } from "../logger";

const log = logger;

// ============================================================
// 🔧 Load environment (hardened loader)
// ============================================================

const envPath = "/volume1/tcy-bot/barracuda-hft-v8/.env";
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  log.info("✅ .env manually loaded for RujiraPublic");
} else {
  log.warn("⚠️ No .env file found at expected path:", envPath);
}

if (!process.env.RUJIRA_API_BASE) {
  log.error("❌ Missing RUJIRA_API_BASE in .env – refusing to start.");
  process.exit(1);
}

const RUJIRA_API_BASE = process.env.RUJIRA_API_BASE!.trim();
const RUJIRA_MARKET_URL =
  process.env.RUJIRA_MARKET_URL || `${RUJIRA_API_BASE}/trade/orderbook`;

log.info(`🌐 Using RUJIRA_API_BASE = ${RUJIRA_API_BASE}`);

// ============================================================
// 🧮 Midrate Fetcher
// ============================================================
export async function getRujiraMidrate(symbol = "TCY_USDC"): Promise<number | null> {
  try {
    const url = `${RUJIRA_MARKET_URL}?ticker_id=${symbol}&depth=1`;
    const response = await fetch(url);
    const json: any = await response.json();

    const bid = Number(json?.bids?.[0]?.[0]) || 0;
    const ask = Number(json?.asks?.[0]?.[0]) || 0;
    const mid = bid && ask ? (bid + ask) / 2 : 0;

    if (!mid || isNaN(mid)) throw new Error(`Invalid bid/ask data for ${symbol}`);

    log.info(`[RujiraPublic] ${symbol} midPrice = $${mid}`);
    return mid;
  } catch (err: any) {
    log.error(`[RujiraPublic] Failed to fetch midrate for ${symbol}: ${err.message}`);
    return null;
  }
}

// ============================================================
// 💰 Public Wallet Summary (for Telegram Dashboard)
// ------------------------------------------------------------
// Returns a rich object compatible with tcy_telegram_control.ts
// ============================================================
export async function getWalletSummaryPublic(address?: string) {
  try {
    // --- Normally fetched from API, but placeholder for now ---
    const tcyUnstaked = parseFloat(process.env.INITIAL_TCY || "0");
    const tcyStaked = parseFloat(process.env.INITIAL_STAKED_TCY || "0");
    const tcyTotal = tcyUnstaked + tcyStaked;

    const usdc = parseFloat(process.env.INITIAL_USDC || "0");
    const rune = parseFloat(process.env.INITIAL_RUNE || "0");
    const totalValue = usdc + rune + tcyTotal * (parseFloat(process.env.LAST_MIDPRICE || "0.15") || 0.15);

    const summary = {
      wallet: address || process.env.RUJIRA_WALLET_ADDRESS || "unknown",
      usdc,
      rune,
      tcyUnstaked,
      tcyStaked,
      tcyTotal,
      totalValue,
      totalValueUSD: totalValue,
      openOrders: 0,
      filledOrders: 0,
    };

    log.info(`[RujiraPublic] Wallet summary built for ${summary.wallet}`);
    return summary;
  } catch (err: any) {
    log.warn(`[RujiraPublic] Wallet summary unavailable: ${err.message}`);
    return {
      wallet: address || "unknown",
      usdc: 0,
      rune: 0,
      tcyUnstaked: 0,
      tcyStaked: 0,
      tcyTotal: 0,
      totalValue: 0,
      totalValueUSD: 0,
      openOrders: 0,
      filledOrders: 0,
    };
  }
}

// ============================================================
// 🧪 Connectivity self-test
// ============================================================
export async function testRujiraConnectivity(): Promise<boolean> {
  try {
    const mid = await getRujiraMidrate("TCY_USDC");
    if (!mid || mid <= 0) throw new Error("No valid midrate");
    log.info(`[RujiraPublic] ✅ Connectivity test passed (mid=${mid})`);
    return true;
  } catch (err: any) {
    log.error(`[RujiraPublic] ❌ Connectivity test failed: ${err.message}`);
    return false;
  }
}

// ============================================================
// ✅ Exports
// ============================================================
export default {
  getRujiraMidrate,
  getWalletSummaryPublic,
  testRujiraConnectivity,
};
