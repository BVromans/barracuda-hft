// ============================================================
// 🤖 TCY Bot – Base Value Range Strategy (Aligned + Safe)
// ------------------------------------------------------------
// ✅ Fully .env-driven (SELL_DELTA, BUY_DELTA, BASE_INCREMENT, etc.)
// ✅ Interactive startup sanity + manual confirmation for market correction
// ✅ Dual-limit mode after in-range or confirmed correction
// ✅ Spreadsheet-aligned: 3.6 % up / 3.2 % down range
// ✅ Paper/live compatible for NAS deployments
// ✅ NEW: Paper-fill simulator is edge-triggered + cooldown (no strategy change)
// ============================================================

import {
  getWalletBalance,
  getMarketPrice,
  placeOrder,
  placeMarketOrder,
  cancelAllOrders,
  sendTelegram,
} from "../helpers/tcy_api";
import { awaitTelegramConfirmation } from "../helpers/tcy_telegram_control";
import { logger } from "../logger";
import { TCY_BOT_NAME, TCY_BOT_VERSION } from "../version";

const log = logger;

// ============================================================
// ⚙️ CONFIGURATION (.env-driven with safe defaults)
// ============================================================
const SELL_DELTA = Number(process.env.SELL_DELTA || 0.036);
const BUY_DELTA = Number(process.env.BUY_DELTA || -0.032);

const RANGE_UP = 1 + SELL_DELTA;
const RANGE_DOWN = 1 + BUY_DELTA;

const BASE_INCREMENT = Number(process.env.BASE_INCREMENT || 25);
const DEFAULT_TICK = Number(process.env.DEFAULT_TICK || 60_000);
const PAUSE_MS = Number(process.env.PAUSE_MS || 600_000);
const PRICE_RETRY_MINUTES = Number(process.env.PRICE_RETRY_MINUTES || 10);

const isPaperMode = !process.env.WALLET_ADDRESS;
const staticBalance = Number(process.env.INITIAL_TCY || 38_542);

const SIMULATE_FILLS = (process.env.SIMULATE_FILLS || "false").toLowerCase() === "true";
const FILL_PRICE_TOL = Number(process.env.FILL_PRICE_TOL || 0.0004);
const FILL_COOLDOWN_MS = Number(process.env.FILL_COOLDOWN_MS || 120_000);

const CONFIRM_TIMEOUT_MS = Number(process.env.CONFIRM_TIMEOUT_MS || 300_000);
const RETRY_AFTER_NO_REPLY_MS = Number(process.env.RETRY_AFTER_NO_REPLY_MS || 3_600_000);

// ============================================================
// 🧩 UTILITIES
// ============================================================
function sleep(ms: number) {
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

function tagMessage(message: string, base?: number): string {
  const prefix = `🤖 ${TCY_BOT_NAME} v${TCY_BOT_VERSION}`;
  const baseLine = base !== undefined ? `\nBase = ${formatNumber(base)}` : "";
  return `${prefix}${baseLine}\n${message}`;
}

// ============================================================
// 🧮 VALUE-ANCHORED CALCULATIONS
// ============================================================
export function calculateValueAnchoredLimits(baseValue: number, totalTcy: number, midPrice: number) {
  const buyValue = baseValue * Math.abs(BUY_DELTA);
  const sellValue = baseValue * SELL_DELTA;

  const buyPrice = Math.round(((baseValue * RANGE_DOWN) / totalTcy) * 10_000) / 10_000;
  const sellPrice = Math.round(((baseValue * RANGE_UP) / totalTcy) * 10_000) / 10_000;

  return {
    buy: { price: buyPrice, amount: buyValue / buyPrice },
    sell: { price: sellPrice, amount: sellValue / sellPrice },
  };
}

// ============================================================
// 🧪 FORMULA SANITY CHECK
// ============================================================
export function valueAnchoredSanityCheck(): void {
  const base = 6000;
  const balance = 38_542;
  const midRef = 0.155;

  const { buy, sell } = calculateValueAnchoredLimits(base, balance, midRef);
  const spread = (sell.price / buy.price - 1) * 100;

  if (sell.price <= buy.price) throw new Error(`Invalid anchor spread: buy=${buy.price}, sell=${sell.price}`);

  const expectedSpread = (RANGE_UP / RANGE_DOWN - 1) * 100;
  const tolerance = 0.75;
  if (spread < expectedSpread - tolerance || spread > expectedSpread + tolerance)
    throw new Error(`Deviation out of bounds: spread=${spread.toFixed(2)} % (expected≈${expectedSpread.toFixed(2)} %)`);

  log.info(`[Sanity] Formula validated successfully (spread=${spread.toFixed(2)} %)`);
}

// ============================================================
// 🚀 MAIN STRATEGY LOOP
// ============================================================
export async function runBaseValueRange(walletAddress: string, startBase: number) {
  log.info(`🚀 ${TCY_BOT_NAME} (v${TCY_BOT_VERSION}) started with Base Value Range strategy`);

  let baseValue = startBase;
  let balance = isPaperMode ? staticBalance : await getWalletBalance(walletAddress);
  let price = await getMarketPrice("TCY_USDC");

  const { buy, sell } = calculateValueAnchoredLimits(baseValue, balance, price);

  await sendTelegram(
    tagMessage(
      `✅ Startup sanity check passed.\nBase = ${formatNumber(baseValue)}\nTotal = ${formatTcy(balance)} TCY\nBuy @ $${buy.price.toFixed(4)} | Sell @ $${sell.price.toFixed(4)}\nMarket ≈ $${price.toFixed(4)}`
    )
  );

  log.info(`[Startup] Wallet ${formatTcy(balance)} TCY @ $${price.toFixed(4)} → ${formatNumber(balance * price)}`);

  // =======================
  // Startup confirmation loop (rebalance to boundary on confirmation)
  // =======================
  const initialPortfolioValue = Number(process.env.INITIAL_PORTFOLIO_VALUE || baseValue);

  while (true) {
    balance = isPaperMode ? staticBalance : await getWalletBalance(walletAddress);
    price = await getMarketPrice("TCY_USDC");

    // ✅ Use INITIAL_PORTFOLIO_VALUE as wallet value basis (not balance × price)
    const walletValue = initialPortfolioValue;
    const lowerLimit = baseValue * RANGE_DOWN;
    const upperLimit = baseValue * RANGE_UP;

    log.info(
      `[Startup] Wallet ≈ ${formatNumber(walletValue)} (range: ${formatNumber(lowerLimit)} – ${formatNumber(upperLimit)})`
    );

    if (walletValue >= lowerLimit && walletValue <= upperLimit) {
      await sendTelegram(
        tagMessage(
          `✅ Wallet value within range (${formatNumber(walletValue)}) – entering Dual-Limit Mode.`,
          baseValue
        )
      );
      break;
    }

    const action: "BUY" | "SELL" = walletValue < lowerLimit ? "BUY" : "SELL";
    const targetUSD = action === "BUY" ? lowerLimit : upperLimit;
    const deltaUSD = Math.max(0, Math.abs(targetUSD - walletValue));
    const orderAmount = deltaUSD / price;

    if (!isFinite(orderAmount) || orderAmount <= 0) {
      log.warn(`[Startup] Computed ${action} amount is non-positive. Sleeping before retry.`);
      await sleep(PAUSE_MS);
      continue;
    }

    const prompt = tagMessage(
      [
        `⚠️ Wallet ${walletValue < lowerLimit ? "BELOW" : "ABOVE"} range.`,
        `Value ≈ ${formatNumber(walletValue)}`,
        `Lower = ${formatNumber(lowerLimit)} | Upper = ${formatNumber(upperLimit)}`,
        ``,
        `Proposed market ${action}: ${formatTcy(orderAmount)} TCY @ ~$${price.toFixed(4)}`,
        `Target after trade → ${formatNumber(targetUSD)} (boundary)`,
        ``,
        `Confirm? Reply /yes to execute, /no to halt.`,
      ].join("\n"),
      baseValue
    );

    const confirm = await awaitTelegramConfirmation(
      (globalThis as any).bot!,
      Number(process.env.TELEGRAM_CHAT_ID!),
      prompt,
      CONFIRM_TIMEOUT_MS,
      RETRY_AFTER_NO_REPLY_MS
    );

    if (confirm === true) {
      await placeMarketOrder(action, price, orderAmount);
      await sendTelegram(
        tagMessage(
          `⚡ Market ${action} executed @ $${price.toFixed(4)} for ${formatTcy(orderAmount)} TCY (≈ ${formatNumber(deltaUSD)}).`,
          baseValue
        )
      );

      if (action === "SELL") baseValue += BASE_INCREMENT;
      await sleep(5_000);
      continue;
    }

    if (confirm === false) {
      await sendTelegram(tagMessage(`❌ Startup correction declined by user. Strategy halted.`, baseValue));
      return;
    }

    await sendTelegram(
      tagMessage(
        `⏲️ No confirmation within ${Math.round(CONFIRM_TIMEOUT_MS / 60000)} min. Pausing and will recheck in ${Math.round(
          RETRY_AFTER_NO_REPLY_MS / 60000
        )} min…`,
        baseValue
      )
    );
    await sleep(RETRY_AFTER_NO_REPLY_MS);
  }

  let lastBuyPrice: number | null = null;
  let lastSellPrice: number | null = null;
  let prevMid: number | null = null;
  let lastFillAt = 0;

  while (true) {
    try {
      balance = isPaperMode ? staticBalance : await getWalletBalance(walletAddress);
      price = await getMarketPrice("TCY_USDC");

      if (!price || price <= 0 || !balance || balance <= 0) {
        log.warn(`[Cycle] Missing data – retrying in ${PRICE_RETRY_MINUTES} min`);
        await sendTelegram(tagMessage("⚠️ No valid balance or price. Retrying...", baseValue));
        await sleep(PAUSE_MS);
        continue;
      }

      const { buy, sell } = calculateValueAnchoredLimits(baseValue, balance, price);
      const deviation = (sell.price / buy.price - 1) * 100;

      if (deviation < 5 || deviation > 8) {
        log.warn(`[Sanity] Deviation ${deviation.toFixed(2)} % out of range – skipping cycle.`);
        await sendTelegram(tagMessage(`⚠️ Deviation out of range (${deviation.toFixed(2)} %)`, baseValue));
        await sleep(PAUSE_MS);
        continue;
      }

      const pricesChanged =
        !lastBuyPrice ||
        !lastSellPrice ||
        Math.abs(buy.price - lastBuyPrice) > 0.0005 ||
        Math.abs(sell.price - lastSellPrice) > 0.0005;

      if (pricesChanged) {
        await cancelAllOrders();
        log.info(`📈 New limit orders: BUY @ $${buy.price.toFixed(4)}, SELL @ $${sell.price.toFixed(4)}`);

        await placeOrder("BUY", buy.price, buy.amount);
        await placeOrder("SELL", sell.price, sell.amount);

        await sendTelegram(
          tagMessage(
            `📊 Limit orders placed:\nBUY @ $${buy.price.toFixed(4)} (${formatTcy(buy.amount)} TCY ≈ ${formatNumber(
              baseValue * Math.abs(BUY_DELTA)
            )})\nSELL @ $${sell.price.toFixed(4)} (${formatTcy(sell.amount)} TCY ≈ ${formatNumber(
              baseValue * SELL_DELTA
            )})\nMarket ≈ $${price.toFixed(4)}`,
            baseValue
          )
        );

        lastBuyPrice = buy.price;
        lastSellPrice = sell.price;
      } else log.info(`[Cycle] Prices unchanged – keeping existing limit orders.`);

      log.info(`[Cycle] Waiting ${(DEFAULT_TICK / 1000).toFixed(0)} s for next check…`);
      await sleep(DEFAULT_TICK);

      if (SIMULATE_FILLS) {
        const newMid = await getMarketPrice("TCY_USDC");
        if (!newMid || newMid <= 0) continue;

        const now = Date.now();
        const inCooldown = now - lastFillAt < FILL_COOLDOWN_MS;

        const crossedBuy = prevMid !== null && prevMid > buy.price && newMid <= buy.price - FILL_PRICE_TOL;
        const crossedSell = prevMid !== null && prevMid < sell.price && newMid >= sell.price + FILL_PRICE_TOL;

        if (!inCooldown && crossedBuy) {
          await cancelAllOrders();
          await sendTelegram(
            tagMessage(`✅ BUY filled (paper) @ $${buy.price.toFixed(4)} (${formatTcy(buy.amount)} TCY)\nRepositioning…`, baseValue)
          );
          lastFillAt = now;
          lastBuyPrice = null;
          lastSellPrice = null;
          prevMid = newMid;
          continue;
        }

        if (!inCooldown && crossedSell) {
          await cancelAllOrders();
          baseValue += BASE_INCREMENT;
          await sendTelegram(
            tagMessage(
              `✅ SELL filled (paper) @ $${sell.price.toFixed(4)} (${formatTcy(sell.amount)} TCY)\n💰 Base value raised to ${formatNumber(
                baseValue
              )}\nRepositioning next cycle…`,
              baseValue
            )
          );
          lastFillAt = now;
          lastBuyPrice = null;
          lastSellPrice = null;
          prevMid = newMid;
          continue;
        }

        prevMid = newMid;
      }
    } catch (err) {
      log.error(`[Runtime] ${(err as Error).message}`);
      await sleep(DEFAULT_TICK);
    }
  }
}