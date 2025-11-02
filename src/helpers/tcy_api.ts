// ============================================================
// 🌐 TCY API Helper (Hardened Version)
// ------------------------------------------------------------
// Handles GraphQL + REST calls to Rujira API (paper-trading).
// ✅ Enforces .env priority and blocks fallback to .io domain.
// ✅ Telegram-safe logging + graceful network retry loops
// ✅ Auto-registers paper orders for watcher tracking
// ============================================================

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { logger } from "../logger";

const log = logger;

// ============================================================
// 🔧 Load environment (hardened loader)
// ============================================================
const envPath = "/volume1/tcy-bot/barracuda-hft-v8/.env";

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  log.info("✅ .env manually loaded for TCY API");
} else {
  log.warn(`⚠️ No .env file found at expected path: ${envPath}`);
}

if (!process.env.RUJIRA_API_BASE) {
  log.error("❌ Missing RUJIRA_API_BASE in .env – refusing to start.");
  process.exit(1);
}

const GQL_BASE = process.env.RUJIRA_API_BASE!.trim();
const MARKET_URL = process.env.RUJIRA_MARKET_URL || `${GQL_BASE}/trade/orderbook`;
log.info(`🌐 Using RUJIRA_API_BASE = ${GQL_BASE}`);

// ============================================================
// 🧩 Utility helpers
// ============================================================
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNumber(num: number, decimals = 2): string {
  const rounded = num.toFixed(decimals);
  const [intPart, decPart = "0"] = rounded.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parseFloat(decPart) === 0 ? `$${formattedInt},-` : `$${formattedInt},${decPart}`;
}

function formatTcy(num: number, decimals = 2): string {
  const rounded = num.toFixed(decimals);
  const [intPart, decPart = "0"] = rounded.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedInt},${decPart}`;
}

// ============================================================
// 💰 Wallet balance (GraphQL + fallback)
// ============================================================
let walletFallbackWarned = false;

export async function getWalletBalance(address: string): Promise<number> {
  if (!address) {
    log.warn("[Wallet] WALLET_ADDRESS not set; using INITIAL_TCY from .env");
    return parseFloat(process.env.INITIAL_TCY || "0");
  }

  const query = {
    query: `
      query {
        staking {
          pendingBalances {
            tcy { claimable }
          }
        }
      }
    `,
  };

  try {
    const response = await fetch(GQL_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json: any = await response.json();
    const balance = Number(json?.data?.staking?.pendingBalances?.tcy?.claimable || 0);

    if (!balance || balance <= 0) {
      if (!walletFallbackWarned) {
        log.warn("[Wallet] API returned 0 – using INITIAL_TCY fallback");
        walletFallbackWarned = true;
      }
      return Number(process.env.INITIAL_TCY || 0);
    }

    log.info(`[Wallet] Balance fetched successfully: ${balance}`);
    return balance;
  } catch (err) {
    log.warn(`[Wallet] Fallback due to error: ${(err as Error).message}`);
    return Number(process.env.INITIAL_TCY || 0);
  }
}

// ============================================================
// 💹 Market price (REST)
// ============================================================
export async function getMarketPrice(pair = "TCY_USDC"): Promise<number> {
  while (true) {
    try {
      const url = `${MARKET_URL}?ticker_id=${pair}&depth=1`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const json: any = await response.json();
      const bid = Number(json?.bids?.[0]?.[0]) || 0;
      const ask = Number(json?.asks?.[0]?.[0]) || 0;
      const mid = bid && ask ? (bid + ask) / 2 : 0;

      if (!mid || isNaN(mid)) throw new Error("No valid bid/ask data");

      log.info(`[Market] ${pair} mid=$${mid}`);
      return mid;
    } catch (err) {
      log.warn(`[Market] Live price unavailable: ${err}`);
      await sendTelegram("⚠️ Price feed unavailable – retrying in 10 minutes...");
      await sleep((parseInt(process.env.PRICE_RETRY_MINUTES || "10") || 10) * 60 * 1000);
    }
  }
}

// ============================================================
// 📊 Paper order simulation
// ============================================================
export async function placeOrder(side: "BUY" | "SELL", price: number, amount: number): Promise<void> {
  const value = price * amount;
  log.info(`[Order] (PAPER LIMIT) ${side} @ $${price.toFixed(4)} | ${formatTcy(amount)} TCY ≈ ${formatNumber(value)}`);
  registerOrderId(side, price);
}

export async function placeMarketOrder(side: "BUY" | "SELL", price: number, amount: number): Promise<void> {
  const value = price * amount;
  log.info(`[Order] (PAPER MARKET) ${side} @ $${price.toFixed(4)} | ${formatTcy(amount)} TCY ≈ ${formatNumber(value)}`);
  registerOrderId(side, price);
}

export async function cancelAllOrders(): Promise<void> {
  log.info("[Order] All paper orders canceled.");
}

// ============================================================
// ✉️ Telegram integration
// ============================================================
export async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    log.debug(`[Telegram] (skip) ${message}`);
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message }),
    });
    log.info(`[Telegram] Message sent: ${message}`);
  } catch (err) {
    log.warn(`[Telegram] Failed to send message: ${err}`);
  }
}

// ============================================================
// 💾 Auto-register order IDs for watcher tracking
// ------------------------------------------------------------
// When you place a limit order, we'll append a string like
// "BUY:0.1400" to /logs/order_ids.json so the order watcher
// knows what to monitor in the orderbook.
// ============================================================

const ORDER_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/order_ids.json";

function loadOrderIdsSafe(): string[] {
  try {
    if (!fs.existsSync(ORDER_FILE)) return [];
    const parsed = JSON.parse(fs.readFileSync(ORDER_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function registerOrderId(side: "BUY" | "SELL", price: number): void {
  try {
    const ids = loadOrderIdsSafe();
    const id = `${side}:${price.toFixed(4)}`;
    if (!ids.includes(id)) {
      ids.push(id);
      fs.writeFileSync(ORDER_FILE, JSON.stringify(ids, null, 2));
      log.info(`[Order] Registered for watcher: ${id}`);
    } else {
      log.debug(`[Order] ${id} already tracked.`);
    }
  } catch (err: any) {
    log.warn(`[Order] Failed to register ID: ${err.message}`);
  }
}
