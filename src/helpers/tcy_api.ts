// ============================================================
// 🌐 TCY API Helper Module
// ------------------------------------------------------------
// Handles GraphQL + REST calls to Rujira API, simulates orders,
// and sends Telegram notifications. Paper-trading only.
// Fully driven by .env (no hardcoded endpoints).
// ============================================================

import { logger } from "../logger";
const log = logger;

// ============================================================
// 🔧 Environment setup
// ============================================================
const GQL_BASE = process.env.RUJIRA_API_BASE || "https://api.rujira.network/api";
const MARKET_URL =
  process.env.RUJIRA_MARKET_URL || "https://api.rujira.network/api/trade/orderbook";

// ------------------------------------------------------------
// 🧩 Helpers
// ------------------------------------------------------------
function authHeaders(): Record<string, string> {
  const token = process.env.RUJIRA_TOKEN_GRAPHQL || "";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatNumber(num: number, decimals = 2): string {
  const rounded = num.toFixed(decimals);
  const [intPart, decPart] = rounded.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (parseFloat(decPart) === 0) return `$${formattedInt},-`;
  return `$${formattedInt},${decPart}`;
}

function formatTcy(num: number, decimals = 2): string {
  const rounded = num.toFixed(decimals);
  const [intPart, decPart] = rounded.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedInt},${decPart}`;
}

// ============================================================
// 💰 Wallet balance (GraphQL)
// ============================================================
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
      headers: authHeaders(),
      body: JSON.stringify(query),
    });

    const json: any = await response.json();
    const pending = json?.data?.staking?.pendingBalances || [];
    let total = 0;
    for (const item of pending) total += Number(item?.tcy?.claimable || 0);

    if (total <= 0) {
      const fallback = parseFloat(process.env.INITIAL_TCY || "0");
      log.warn(`[Wallet] API returned 0 or null balances — using INITIAL_TCY=${fallback}`);
      return fallback;
    }

    log.info(`[Wallet] TCY balance via API: ${total}`);
    return total;
  } catch (err) {
    const fallback = parseFloat(process.env.INITIAL_TCY || "0");
    log.warn(`[Wallet] GraphQL error, using INITIAL_TCY=${fallback}: ${err}`);
    return fallback;
  }
}

// ============================================================
// 💹 Market price (REST)
// ============================================================
export async function getMarketPrice(pair = "TCY_USDC"): Promise<number> {
  while (true) {
    try {
      const url = `${MARKET_URL}?ticker_id=${pair}&depth=1`;
      const response = await fetch(url, { method: "GET", headers: authHeaders() });
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
      log.info("🕒 Waiting 10 minutes before retry...");
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
}

export async function placeMarketOrder(side: "BUY" | "SELL", price: number, value: number): Promise<void> {
  const amount = value / price;
  log.info(`[Order] (PAPER MARKET) ${side} @ $${price.toFixed(4)} | ${formatTcy(amount)} TCY ≈ ${formatNumber(value)}`);
}

// ============================================================
// ❌ Cancel orders
// ============================================================
export async function cancelAllOrders(): Promise<void> {
  log.info("[Order] (PAPER) All limit orders cancelled");
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
