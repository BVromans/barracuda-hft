// ============================================================
// 🤖 TCY Bot – Telegram Control Module
// ------------------------------------------------------------
// Remote control for systemd bot service via Telegram.
//
// Commands:
//   /status, /log, /start, /stop, /restart
//   /base <value> – update base portfolio value
//   /tcy <value>  – update starting TCY amount
//
// Automatically retrieves version info from version.ts.
// ============================================================

import TelegramBot, { Message } from "node-telegram-bot-api";
import { execSync } from "child_process";
import fs from "fs";
import { TCY_BOT_NAME, TCY_BOT_VERSION } from "../version";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID || ""; // restrict to your ID
const LOG_FILE = "/volume1/tcy-bot/barracuda-hft/logs/tcy-bot-run.log";
const ENV_FILE = "/volume1/tcy-bot/barracuda-hft/.env";
const SERVICE_NAME = "tcy-bot-v7.service";

export function initTelegramControl() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("[TelegramControl] ⚠️ No bot token provided – Telegram control disabled.");
    return;
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
  console.log(`[TelegramControl] ✅ Remote control enabled via Telegram for ${TCY_BOT_NAME} v${TCY_BOT_VERSION}`);

  // ------------------------------------------------------------
  // 🟢 Startup confirmation message
  // ------------------------------------------------------------
  bot.getMe().then(() => {
    if (TELEGRAM_USER_ID) {
      bot.sendMessage(
        TELEGRAM_USER_ID,
        `🟢 *${TCY_BOT_NAME} v${TCY_BOT_VERSION}* connected and ready for commands.\nType /help for a full list.`,
        { parse_mode: "Markdown" }
      );
    }
    console.log("[TelegramControl] ✅ Telegram bot connected successfully.");
  });

  // ------------------------------------------------------------
  // 🧩 Command handler
  // ------------------------------------------------------------
  bot.onText(/\/(start|stop|restart|status|log|base|tcy)(.*)/, async (msg: Message, match: RegExpExecArray | null) => {
    try {
      if (TELEGRAM_USER_ID && msg.from?.id.toString() !== TELEGRAM_USER_ID) {
        bot.sendMessage(msg.chat.id, "⛔ Unauthorized user.");
        return;
      }

      const command = match?.[1];
      const arg = match?.[2]?.trim();
      const chatId = msg.chat.id;

      switch (command) {
        case "status": {
          const status = execSync(`systemctl is-active ${SERVICE_NAME}`).toString().trim();
          bot.sendMessage(chatId, `📊 *Bot status:* \`${status}\``, { parse_mode: "Markdown" });
          break;
        }

        case "log": {
          const logs = fs.existsSync(LOG_FILE)
            ? fs.readFileSync(LOG_FILE, "utf8").split("\n").slice(-15).join("\n")
            : "No log file found.";
          bot.sendMessage(chatId, `📜 *Last log lines:*\n\`\`\`\n${logs}\n\`\`\``, {
            parse_mode: "Markdown",
          });
          break;
        }

        case "start":
          execSync(`sudo systemctl start ${SERVICE_NAME}`);
          bot.sendMessage(chatId, "🚀 TCY Bot started via Telegram.");
          break;

        case "stop":
          execSync(`sudo systemctl stop ${SERVICE_NAME}`);
          bot.sendMessage(chatId, "🛑 TCY Bot stopped via Telegram.");
          break;

        case "restart":
          execSync(`sudo systemctl restart ${SERVICE_NAME}`);
          bot.sendMessage(chatId, "🔄 TCY Bot restarted via Telegram.");
          break;

        // --------------------------------------------------------
        // 💰 Update Base Value
        // --------------------------------------------------------
        case "base": {
          const newBase = parseFloat(arg || "0");
          if (isNaN(newBase) || newBase <= 0) {
            bot.sendMessage(chatId, "⚠️ Invalid base value. Example: `/base 5950`", {
              parse_mode: "Markdown",
            });
            return;
          }

          let envContent = fs.readFileSync(ENV_FILE, "utf8");
          envContent = envContent.replace(/INITIAL_PORTFOLIO_VALUE=.*/g, `INITIAL_PORTFOLIO_VALUE=${newBase}`);
          fs.writeFileSync(ENV_FILE, envContent);

          // Confirm update
          const verifiedEnv = fs.readFileSync(ENV_FILE, "utf8");
          const verifiedBase = verifiedEnv.match(/INITIAL_PORTFOLIO_VALUE=(.*)/)?.[1];

          bot.sendMessage(
            chatId,
            `✅ Base portfolio value updated to *${verifiedBase}* in .env.\nRestarting bot...`,
            { parse_mode: "Markdown" }
          );

          execSync(`sudo systemctl restart ${SERVICE_NAME}`);
          break;
        }

        // --------------------------------------------------------
        // 💎 Update Starting TCY Amount
        // --------------------------------------------------------
        case "tcy": {
          const newTcy = parseFloat(arg || "0");
          if (isNaN(newTcy) || newTcy <= 0) {
            bot.sendMessage(chatId, "⚠️ Invalid TCY amount. Example: `/tcy 38643`", {
              parse_mode: "Markdown",
            });
            return;
          }

          let envContent = fs.readFileSync(ENV_FILE, "utf8");
          envContent = envContent.replace(/INITIAL_TCY=.*/g, `INITIAL_TCY=${newTcy}`);
          fs.writeFileSync(ENV_FILE, envContent);

          // Confirm update
          const verifiedEnv = fs.readFileSync(ENV_FILE, "utf8");
          const verifiedTcy = verifiedEnv.match(/INITIAL_TCY=(.*)/)?.[1];

          bot.sendMessage(
            chatId,
            `✅ Starting TCY amount updated to *${verifiedTcy}* in .env.\nRestarting bot...`,
            { parse_mode: "Markdown" }
          );

          execSync(`sudo systemctl restart ${SERVICE_NAME}`);
          break;
        }

        default:
          bot.sendMessage(chatId, "🤖 Unknown command. Use /help to see available options.");
      }
    } catch (err) {
      const errorMessage = (err as Error).message || String(err);
      bot.sendMessage(msg.chat.id, "⚠️ Command failed:\n```\n" + errorMessage + "\n```", {
        parse_mode: "Markdown",
      });
    }
  });

  // ------------------------------------------------------------
  // 🧠 /help command
  // ------------------------------------------------------------
  bot.onText(/\/help/, (msg: Message) => {
    const helpText = `
🤖 *${TCY_BOT_NAME} v${TCY_BOT_VERSION} – Remote Control*
-------------------------------------------
Available commands:
/status – show current status
/log – show last log lines
/start – start bot
/stop – stop bot
/restart – restart bot
/base <value> – update base portfolio value
/tcy <amount> – update starting TCY balance
/help – show this help message
`;
    bot.sendMessage(msg.chat.id, helpText, { parse_mode: "Markdown" });
  });
}
