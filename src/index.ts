// ============================================================
// 🚀 TCY Bot – Entry Point (Base Value Range Mode + Telegram Control)
// ------------------------------------------------------------
// Loads environment, initializes runtime, and starts the
// Base Value Range Strategy. Adds Telegram command interface
// for remote control (status, restart, base updates, etc).
// ============================================================

import "dotenv/config";
import fs from "fs";
import TelegramBot from "node-telegram-bot-api";
import { execSync } from "child_process";

import "./bootstrap";
import { properties } from "./properties";
import { WalletMnemonic, WalletPrivateKey } from "./types";
import { logger } from "./logger";
import { main as tcyV7Main } from "./strategies/tcy_bot_v_7_base_value_range";
import { sendTelegram } from "./helpers/tcy_api";
import { TCY_BOT_NAME, TCY_BOT_VERSION } from "./version";

const log = logger;
let bot: TelegramBot | null = null;
let botRunning = false;

// ✅ Cached values
let baseValueCache = parseFloat(process.env.INITIAL_PORTFOLIO_VALUE || "5950");
let tcyAmountCache = parseFloat(process.env.INITIAL_TCY || "38643");

// ✅ Manual .env loading for Synology NAS
const envPath = "/volume1/tcy-bot/barracuda-hft/.env";
if (fs.existsSync(envPath)) {
  const result = require("dotenv").config({ path: envPath });
  if (result.error) console.error("⚠️ Could not load .env:", result.error);
  else console.log("✅ .env manually loaded – environment variables active");
} else {
  console.warn("⚠️ No .env file found at", envPath);
}

// ------------------------------------------------------------
// 🛠 Safe message sender
// ------------------------------------------------------------
async function safeSendMessage(chatId: string, text: string, options?: any) {
  if (!bot) {
    log.warn(`[Telegram] Tried to send message before bot init: ${text}`);
    return;
  }
  try {
    await bot.sendMessage(chatId, text, options);
  } catch (err: any) {
    log.error(`[Telegram] Send failed: ${err.message}`);
  }
}

// ============================================================
// 💬 Telegram Command Interface
// ============================================================
function initTelegramCommands() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_USER_ID;

  if (!token || !ownerId) {
    log.warn("⚠️ Telegram command control disabled (missing TELEGRAM_BOT_TOKEN or TELEGRAM_USER_ID).");
    return;
  }

  bot = new TelegramBot(token, { polling: true });
  log.info("[Telegram] Command interface activated.");

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text?.trim();
    if (!text) return;

    if (chatId !== ownerId) {
      log.warn(`[Telegram] Unauthorized command from ${chatId}.`);
      await safeSendMessage(chatId, "🚫 Unauthorized.");
      return;
    }

    log.info(`[Telegram] Command received: ${text}`);
    const [command, arg] = text.split(" ");

    try {
      switch (command.toLowerCase()) {
        case "/help":
          await safeSendMessage(
            chatId,
            `🤖 *${TCY_BOT_NAME} v${TCY_BOT_VERSION}*
Available commands:
/status – Show bot status
/start – Start strategy
/stop – Stop bot
/restart – Restart bot
/base <value> – Change base value and restart
/tcy <amount> – Change starting TCY and restart
/log – Show last 10 log lines
/help – Show this message`,
            { parse_mode: "Markdown" }
          );
          break;

        case "/status": {
          const uptimeSec = Math.floor(process.uptime());
          await safeSendMessage(
            chatId,
            `✅ *${TCY_BOT_NAME}*
Version: v${TCY_BOT_VERSION}
Mode: ${process.env.MODE || "unknown"}
Base: $${baseValueCache}
Start TCY: ${tcyAmountCache}
PID: ${process.pid}
Uptime: ${uptimeSec}s
Status: ${botRunning ? "🟢 Running" : "🛑 Stopped"}`,
            { parse_mode: "Markdown" }
          );
          break;
        }

        case "/start":
          if (botRunning) {
            await safeSendMessage(chatId, "⚠️ Bot already running.");
          } else {
            botRunning = true;
            await safeSendMessage(chatId, "🚀 Starting bot...");
            tcyV7Main().catch((err) => log.error("Bot main crashed:", err));
          }
          break;

        case "/stop":
          await safeSendMessage(chatId, "🛑 Stopping bot gracefully...");
          process.kill(process.pid, "SIGTERM");
          break;

        case "/restart":
          await safeSendMessage(chatId, "🔄 Restarting bot...");
          process.exit(1);
          break;

        case "/base": {
          const newBase = parseFloat(arg);
          if (isNaN(newBase) || newBase <= 0) {
            await safeSendMessage(chatId, "⚠️ Usage: /base <number>");
            break;
          }
          baseValueCache = newBase;
          let envData = fs.readFileSync(envPath, "utf8");
          envData = envData.includes("INITIAL_PORTFOLIO_VALUE=")
            ? envData.replace(/INITIAL_PORTFOLIO_VALUE=.*/g, `INITIAL_PORTFOLIO_VALUE=${newBase}`)
            : envData + `\nINITIAL_PORTFOLIO_VALUE=${newBase}`;
          fs.writeFileSync(envPath, envData);
          await safeSendMessage(chatId, `💾 Base value updated to $${newBase}. Restarting bot...`);
          process.exit(1);
          break;
        }

        case "/tcy": {
          const newTcy = parseFloat(arg);
          if (isNaN(newTcy) || newTcy <= 0) {
            await safeSendMessage(chatId, "⚠️ Usage: /tcy <amount>");
            break;
          }
          tcyAmountCache = newTcy;
          let envData = fs.readFileSync(envPath, "utf8");
          envData = envData.includes("INITIAL_TCY=")
            ? envData.replace(/INITIAL_TCY=.*/g, `INITIAL_TCY=${newTcy}`)
            : envData + `\nINITIAL_TCY=${newTcy}`;
          fs.writeFileSync(envPath, envData);
          await safeSendMessage(chatId, `💾 Starting TCY amount updated to ${newTcy}. Restarting bot...`);
          process.exit(1);
          break;
        }

        case "/log": {
          const logPath = "/volume1/tcy-bot/barracuda-hft/logs/tcy-bot-run.log";
          if (fs.existsSync(logPath)) {
            const lastLines = fs.readFileSync(logPath, "utf8").trim().split("\n").slice(-10).join("\n");
            await safeSendMessage(chatId, `📜 Last 10 log lines:\n\n${lastLines}`);
          } else {
            await safeSendMessage(chatId, "⚠️ No log file found.");
          }
          break;
        }

        default:
          await safeSendMessage(chatId, "❓ Unknown command. Try /help");
      }
    } catch (err: any) {
      log.error(`[Telegram] Command failed: ${err.message}`);
      await safeSendMessage(chatId, `⚠️ Error: ${err.message}`);
    }
  });
}

// ============================================================
// 🧠 Main Runtime
// ============================================================
(async function run() {
  log.info("=============================================");
  log.info(`🚀 Starting ${TCY_BOT_NAME} – Base Value Range Mode (v${TCY_BOT_VERSION})`);
  log.info("=============================================");

  const walletMnemonic = properties.getAs<WalletMnemonic | undefined>("rujira.wallet.mnemonic");
  const walletPrivateKey = properties.getAs<WalletPrivateKey | undefined>("rujira.wallet.privateKey");

  if (!walletMnemonic && !walletPrivateKey) {
    log.info("⚠️ No wallet credentials found – running in PAPERTRADING MODE only.");
  } else {
    log.info("🔐 Wallet credentials detected – live trading capabilities available (currently disabled).");
  }

  try {
    await sendTelegram(`🤖 ${TCY_BOT_NAME} v${TCY_BOT_VERSION}\nMode: ${process.env.MODE || "unknown"}\nBot starting up...`);
    log.info("📨 Telegram startup message sent successfully.");
  } catch (err) {
    log.error("❌ Telegram startup message failed:", err);
  }

  initTelegramCommands();

  // --- systemd watchdog heartbeat (every 30 s)
  if (process.env.WATCHDOG_USEC) {
    setInterval(() => {
      try {
        execSync("systemd-notify WATCHDOG=1");
      } catch {
        /* ignore */
      }
    }, 30000);
  }

  try {
    botRunning = true;
    await tcyV7Main();
  } catch (err: any) {
    botRunning = false;
    const msg = `💥 ${TCY_BOT_NAME} crashed!\n${err?.message || err}`;
    log.error(`❌ Fatal error: ${err?.stack || err}`);
    try {
      await sendTelegram(msg);
    } catch {
      log.warn("⚠️ Failed to send crash notification to Telegram.");
    }
    process.exit(1);
  }
})();

// ============================================================
// 🛑 Graceful Shutdown & Crash Handlers
// ============================================================
async function gracefulStop(signal: string) {
  const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
  const message = `🛑 ${TCY_BOT_NAME} stopped manually at ${timestamp}\nEnvironment: ${process.env.NODE_ENV || "unknown"}`;
  console.log("\n🛑 Stopping TCY Bot gracefully...");
  log.info(`[System] Manual stop requested (${signal}).`);
  botRunning = false;

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

process.on("uncaughtException", async (err) => {
  log.error(`💥 Uncaught Exception: ${err.stack || err}`);
  try {
    await sendTelegram(`💥 TCY Bot crashed!\n${err.message}`);
  } catch {}
  process.exit(1);
});

process.on("unhandledRejection", async (reason: any) => {
  log.error(`⚠️ Unhandled Promise rejection: ${reason}`);
  try {
    await sendTelegram(`⚠️ Unhandled rejection: ${reason}`);
  } catch {}
});
