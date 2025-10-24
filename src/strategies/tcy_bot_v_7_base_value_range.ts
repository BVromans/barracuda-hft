// ============================================================
// 🤖 TCY Bot – Base Value Range Strategy (v7.0.0, Final Anchor Logic)
// ------------------------------------------------------------
// ✅ Fully aligned with spreadsheet logic:
//   - Limit prices derived from base value (not midprice)
//   - Order values fixed at base×0.032 (buy) / base×0.036 (sell)
//   - Stable 60s scan loop – no redundant reorders
//   - European number formatting
// ============================================================

import {
  getWalletBalance,
  getMarketPrice,
  placeOrder,
  placeMarketOrder,
  cancelAllOrders,
  sendTelegram,
} from "../helpers/tcy_api";
import { logger } from "../logger";
import { TCY_BOT_NAME, TCY_BOT_VERSION } from "../version";

const log = logger;

// === Config ===
const RANGE_UP = 1.036;   // +3.6%
const RANGE_DOWN = 0.968; // -3.2%
const BASE_INCREMENT = 25; // Increase base only after SELL
const DEFAULT_TICK = 60_000; // 60s per scan
const PAUSE_MS = 600_000; // 10 min on data failure

// ------------------------------------------------------------
// 🔢 Helpers
// ------------------------------------------------------------
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

function tagMessage(message: string, base?: number): string {
  const prefix = `🤖 ${TCY_BOT_NAME} v${TCY_BOT_VERSION}`;
  const baseLine = base !== undefined ? `\nBase = ${formatNumber(base)}` : "";
  return `${prefix}${baseLine}\n${message}`;
}

// ------------------------------------------------------------
// 🚀 Main Entry
// ------------------------------------------------------------
export async function main(): Promise<void> {
  log.info(`🚀 ${TCY_BOT_NAME} started (v${TCY_BOT_VERSION}) – real data + paper orders`);
  await sendTelegram(`🤖 ${TCY_BOT_NAME} v${TCY_BOT_VERSION}\nPaper trading started successfully.`);

  const walletAddress = process.env.WALLET_ADDRESS || "";
  const initialBaseValue = parseFloat(process.env.INITIAL_PORTFOLIO_VALUE || "5950");
  let baseValue = initialBaseValue;

  // --- Phase 1: calibration ---
  baseValue = await calibrateToRange(walletAddress, baseValue);

  // --- Phase 2: dual-limit mode ---
  await runDualLimitMode(walletAddress, baseValue);
}

// ------------------------------------------------------------
// ⚙️ Phase 1 – Calibration
// ------------------------------------------------------------
async function calibrateToRange(walletAddress: string, startBase: number): Promise<number> {
  let baseValue = startBase;

  while (true) {
    try {
      const balance = await getWalletBalance(walletAddress);
      const price = await getMarketPrice("TCY_USDC");

      if (!price || price <= 0) {
        log.warn("[Calib] No valid price data – pausing 10 minutes...");
        await sendTelegram(tagMessage("⚠️ No live market price available. Retrying in 10 minutes...", baseValue));
        await sleep(PAUSE_MS);
        continue;
      }

      const walletValue = balance * price;
      const upper = baseValue * RANGE_UP;
      const lower = baseValue * RANGE_DOWN;

      log.info(`[Calib] Wallet = ${formatNumber(walletValue)} | Range = [${formatNumber(lower)} – ${formatNumber(upper)}] | Base = ${formatNumber(baseValue)}`);

      if (walletValue > upper) {
        log.info(`⚡ Wallet above +3.6% → SELL @ $${price.toFixed(4)}`);
        const sellValue = baseValue * 0.036;
        await placeMarketOrder("SELL", price, sellValue);
        baseValue += BASE_INCREMENT;
        await sendTelegram(tagMessage(`⚡ Market SELL executed @ $${price.toFixed(4)} (${formatNumber(sellValue)}) → new base: ${formatNumber(baseValue)}`, baseValue));
      } else if (walletValue < lower) {
        log.info(`⚡ Wallet below −3.2% → BUY @ $${price.toFixed(4)}`);
        const buyValue = baseValue * 0.032;
        await placeMarketOrder("BUY", price, buyValue);
        await sendTelegram(tagMessage(`⚡ Market BUY executed @ $${price.toFixed(4)} (${formatNumber(buyValue)}) (base unchanged: ${formatNumber(baseValue)})`, baseValue));
      } else {
        log.info("✅ Wallet within range – switching to dual-limit mode");
        await sendTelegram(tagMessage("✅ Wallet within range – switching to dual-limit mode", baseValue));
        break;
      }

      await sleep(PAUSE_MS);
    } catch (err) {
      log.error(`[Calib] ${err}`);
      await sleep(PAUSE_MS);
    }
  }

  return baseValue;
}

// ------------------------------------------------------------
// ♻️ Phase 2 – Dual-limit mode (Base-anchored logic)
// ------------------------------------------------------------
async function runDualLimitMode(walletAddress: string, baseValue: number) {
  let lastBuyPrice: number | null = null;
  let lastSellPrice: number | null = null;

  while (true) {
    try {
      const balance = await getWalletBalance(walletAddress);
      const price = await getMarketPrice("TCY_USDC");

      if (!price || price <= 0 || !balance || balance <= 0) {
        log.warn("[DualLimit] Missing or invalid data – pausing 10 minutes...");
        await sendTelegram(tagMessage("⚠️ No valid balance or price. Retrying in 10 minutes...", baseValue));
        await sleep(PAUSE_MS);
        continue;
      }

      const buyValue = baseValue * 0.032;
      const sellValue = baseValue * 0.036;

      // ✅ Correct base-anchored limit prices (spreadsheet formula)
      const buyPrice = (baseValue * RANGE_DOWN) / balance;
      const sellPrice = (baseValue * RANGE_UP) / balance;

      const buyAmount = buyValue / buyPrice;
      const sellAmount = sellValue / sellPrice;

      const pricesChanged =
        !lastBuyPrice || !lastSellPrice ||
        Math.abs(buyPrice - lastBuyPrice) > 0.0001 ||
        Math.abs(sellPrice - lastSellPrice) > 0.0001;

      if (pricesChanged) {
        await cancelAllOrders();
        log.info(`📈 New limit orders: BUY @ $${buyPrice.toFixed(4)}, SELL @ $${sellPrice.toFixed(4)}`);
        await placeOrder("BUY", buyPrice, buyAmount);
        await placeOrder("SELL", sellPrice, sellAmount);

        await sendTelegram(
          tagMessage(
            `📊 New limit orders placed:\nBUY @ $${buyPrice.toFixed(4)} (${formatTcy(buyAmount)} TCY ≈ ${formatNumber(buyValue)})\nSELL @ $${sellPrice.toFixed(4)} (${formatTcy(sellAmount)} TCY ≈ ${formatNumber(sellValue)})\nCurrent rate: $${price.toFixed(4)}`,
            baseValue
          )
        );

        lastBuyPrice = buyPrice;
        lastSellPrice = sellPrice;
      } else {
        log.info(`[Cycle] Prices unchanged – keeping existing limit orders active.`);
      }

      await sleep(DEFAULT_TICK);

      const newPrice = await getMarketPrice("TCY_USDC");
      if (!newPrice || newPrice <= 0) continue;

      if (newPrice <= buyPrice) {
        await cancelAllOrders();
        await sendTelegram(tagMessage(`✅ BUY filled @ $${newPrice.toFixed(4)} (${formatTcy(buyAmount)} TCY ≈ ${formatNumber(buyValue)})`, baseValue));
        lastBuyPrice = null;
        lastSellPrice = null;
      } else if (newPrice >= sellPrice) {
        await cancelAllOrders();
        baseValue += BASE_INCREMENT;
        await sendTelegram(tagMessage(`✅ SELL filled @ $${newPrice.toFixed(4)} (${formatTcy(sellAmount)} TCY ≈ ${formatNumber(sellValue)}) → new base: ${formatNumber(baseValue)}`, baseValue));
        lastBuyPrice = null;
        lastSellPrice = null;
      }

      log.info(`[Cycle] Waiting ${DEFAULT_TICK / 1000}s for next check...`);
    } catch (err) {
      log.error(`[Runtime] Error in cycle: ${(err as Error).message}`);
      await sleep(DEFAULT_TICK);
    }
  }
}
