// =============================================
// TCY Bot v8 — Value-Anchored Dual-Limit Patch
// =============================================
// This patch locks the strategy to compute BUY/SELL
// limits from *base portfolio value*, not mid-price.
// It also adds a startup self-check to prevent regressions.
//
// Files in this canvas:
// 1) src/core/value_based_limits.ts      (NEW)
// 2) src/strategies/tcy_base_value_range.ts  (PATCH snippet)
// 3) src/index.ts (or bootstrap.ts)      (PATCH snippet: startup self-check)
// 4) .env                                (line to add)
// ---------------------------------------------

// ============================================================
// 1) src/core/value_based_limits.ts  (NEW)
// ============================================================
// Create this new file and paste EVERYTHING below in it.

export interface DualLimitParams {
  baseUSD: number;      // e.g. 6000
  totalTCY: number;     // current wallet TCY total (staked + unstaked)
  buyUSD: number;       // target BUY order value in USD (e.g. base * 0.032)
  sellUSD: number;      // target SELL order value in USD (e.g. base * 0.036)
}

export interface DualLimitResult {
  buyRate: number;      // USD/TCY price for BUY limit
  sellRate: number;     // USD/TCY price for SELL limit
  buyAmount: number;    // TCY to buy at buyRate so portfolio → base - buyUSD
  sellAmount: number;   // TCY to sell at sellRate so portfolio → base + sellUSD
}

const EPS = 1e-12;

function assertPositive(name: string, v: number) {
  if (!(Number.isFinite(v) && v > 0)) {
    throw new Error(`[value_based_limits] Invalid ${name}=${v}`);
  }
}

export function round(x: number, dp = 10) {
  const f = Math.pow(10, dp);
  return Math.round((x + Number.EPSILON) * f) / f;
}

/**
 * Canonical value-anchored computation.
 *
 * Definitions:
 *  basePrice = baseUSD / totalTCY
 *  buyRate   = (baseUSD - buyUSD)  / (totalTCY + buyUSD / basePrice)
 *  sellRate  = (baseUSD + sellUSD) / (totalTCY - sellUSD / basePrice)
 *  buyAmount  = buyUSD  / buyRate
 *  sellAmount = sellUSD / sellRate
 *
 * These formulas guarantee that after a BUY/SELL fill, the
 * portfolio value equals baseUSD −/+ buyUSD/sellUSD respectively.
 */
export function calcDualLimitFromBase(
  baseUSD: number,
  totalTCY: number,
  buyUSD: number,
  sellUSD: number
): DualLimitResult {
  assertPositive("baseUSD", baseUSD);
  assertPositive("totalTCY", totalTCY);
  assertPositive("buyUSD", buyUSD);
  assertPositive("sellUSD", sellUSD);

  const basePrice = baseUSD / totalTCY; // USD per TCY

  const denomBuy  = totalTCY + buyUSD / (basePrice + EPS);
  const denomSell = totalTCY - sellUSD / (basePrice + EPS);

  if (denomSell <= 0) {
    throw new Error("[value_based_limits] sell denominator <= 0; reduce sellUSD or increase baseUSD/totalTCY");
  }

  const buyRate  = (baseUSD - buyUSD)  / denomBuy;
  const sellRate = (baseUSD + sellUSD) / denomSell;

  const buyAmount  = buyUSD  / (buyRate  + EPS);
  const sellAmount = sellUSD / (sellRate + EPS);

  return {
    buyRate:  round(buyRate, 6),
    sellRate: round(sellRate, 6),
    buyAmount:  round(buyAmount, 6),
    sellAmount: round(sellAmount, 6),
  };
}

/**
 * Convenience helper: targets from base.
 */
export function calcTargets(baseUSD: number) {
  assertPositive("baseUSD", baseUSD);
  return {
    buyUSD:  round(baseUSD * 0.032, 6), // -3.2%
    sellUSD: round(baseUSD * 0.036, 6), // +3.6%
  };
}

/**
 * Startup self-test: validates formulas against the agreed example.
 * Returns true if within tolerances; otherwise throws.
 */
export function valueAnchoredSanityCheck(): boolean {
  const baseUSD = 6000;
  const totalTCY = 38542;
  const { buyUSD, sellUSD } = calcTargets(baseUSD);
  const res = calcDualLimitFromBase(baseUSD, totalTCY, buyUSD, sellUSD);

  // Expected (from spec / Excel):
  const expBuyRate = 0.1507; // ≈
  const expSellRate = 0.1613; // ≈
  const expBuyAmt = 1274; // ≈
  const expSellAmt = 1339; // ≈

  const ok =
    Math.abs(res.buyRate - expBuyRate) < 0.0018 &&
    Math.abs(res.sellRate - expSellRate) < 0.0018 &&
    Math.abs(res.buyAmount - expBuyAmt) < 3 &&
    Math.abs(res.sellAmount - expSellAmt) < 3;

  if (!ok) {
    throw new Error(
      `[value_based_limits] Sanity check failed:\n` +
      ` got buyRate=${res.buyRate}, sellRate=${res.sellRate}, buyAmt=${res.buyAmount}, sellAmt=${res.sellAmount}`
    );
  }
  return true;
}

// ============================================================
// 2) PATCH — src/strategies/tcy_base_value_range.ts (SNIPPET)
// ============================================================
// Find your current section where BUY/SELL prices & amounts are computed
// (previously derived from mid/market price). Replace that block with this:

/*
import { calcDualLimitFromBase, calcTargets } from "../core/value_based_limits";

// ... inside your dual-limit placement routine:
const baseUSD = state.baseValue;              // e.g. 6000
const totalTCY = wallet.totalTCY;             // staked + unstaked
const { buyUSD, sellUSD } = calcTargets(baseUSD);

const { buyRate, sellRate, buyAmount, sellAmount } = calcDualLimitFromBase(
  baseUSD,
  totalTCY,
  buyUSD,
  sellUSD
);

// Place the two limit orders using these exact figures
await placeLimitBuy(buyRate, buyAmount);   // target value ≈ buyUSD
await placeLimitSell(sellRate, sellAmount); // target value ≈ sellUSD
*/

// ============================================================
// 3) PATCH — src/index.ts (or src/bootstrap.ts) — startup guard
// ============================================================
// Call the self-check ONCE during startup (before trading starts).

/*
import { valueAnchoredSanityCheck } from "./core/value_based_limits";

function guardValueAnchored() {
  const mode = (process.env.STRATEGY_MODE || "value-anchored").trim();
  if (mode !== "value-anchored") {
    throw new Error(`Strategy mismatch: expected value-anchored mode, got ${mode}`);
  }
  valueAnchoredSanityCheck();
  console.log("[Startup] ✅ Value-anchored strategy locked & verified.");
}

// In your main startup flow, before scheduling ticks:
guardValueAnchored();
*/

// ============================================================
// 4) .env — add this line (no quotes)
// ============================================================
// STRATEGY_MODE=value-anchored
// ------------------------------------------------------------
// After changes:
//   npm run build
//   tcybot restart
// Verify log shows BUY @ ~0.1507 (≈1274 TCY) and SELL @ ~0.1613 (≈1339 TCY)
// for base=$6000 and totalTCY=38542.
