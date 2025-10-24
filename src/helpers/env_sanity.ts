// ============================================================
// 🧩 Environment Sanity Checker
// ------------------------------------------------------------
// Ensures all required environment variables are loaded and
// valid before bot execution.
// Warns for missing, empty, or invalid numeric values.
// ============================================================

import { logger } from "../logger";
const log = logger;

// --- Required variables ---
const REQUIRED_ENV_VARS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "WALLET_ADDRESS",
  "RUJIRA_TOKEN_GRAPHQL",
  "INITIAL_PORTFOLIO_VALUE",
  "INITIAL_TCY",
];

// --- Numeric variables to validate ---
const NUMERIC_ENV_VARS = [
  "INITIAL_PORTFOLIO_VALUE",
  "INITIAL_TCY",
  "BASE_INCREMENT",
  "SELL_DELTA",
  "BUY_DELTA",
  "COOLDOWN_SECONDS",
];

export function sanityCheckEnv(): void {
  log.info("🧩 Running environment sanity check...");

  const missing: string[] = [];
  const invalidNumbers: string[] = [];

  // Check for missing environment variables
  for (const key of REQUIRED_ENV_VARS) {
    const value = process.env[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  // Validate numeric environment variables
  for (const key of NUMERIC_ENV_VARS) {
    const raw = process.env[key];
    if (raw !== undefined && raw.trim() !== "") {
      const num = Number(raw);
      if (isNaN(num)) {
        invalidNumbers.push(`${key}=${raw} (not a number)`);
      }
    }
  }

  // --- Summary ---
  if (missing.length === 0 && invalidNumbers.length === 0) {
    log.info("✅ Environment sanity check passed successfully.");
  } else {
    if (missing.length > 0) {
      log.warn(`⚠️ Missing environment variables: ${missing.join(", ")}`);
    }
    if (invalidNumbers.length > 0) {
      log.warn(`⚠️ Invalid numeric values: ${invalidNumbers.join(", ")}`);
    }
  }

  log.info("🧩 Sanity check complete.");
}
