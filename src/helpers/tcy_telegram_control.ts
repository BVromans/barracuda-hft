// ============================================================
// 🤖 TCY Bot – Telegram Control Module (Full Operator Panel)
// ------------------------------------------------------------
// Provides full remote control and diagnostics for NAS/systemd bot.
// Compatible with Base Value Range strategy and TCY API stack.
// Integrates persistent control.json for /stop, /resume, /silent.
// ✅ Restart-aware for /base and /tcy (pre-cancel + reason flag)
// ✅ Watcher management built-in (/watchers start|stop|restart)
// ✅ Improved regex & logging for Telegram command handling
// ✅ Includes awaitTelegramConfirmation for strategy startup
// ============================================================

import TelegramBot, { Message } from "node-telegram-bot-api";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import { TCY_BOT_NAME, TCY_BOT_VERSION } from "../version";
import { getWalletSummaryPublic } from "../helpers/rujira_public";
import { getMarketPrice, cancelAllOrders } from "../helpers/tcy_api";
import { readControl } from "../helpers/control_state";

const TELEGRAM_USER_ID = process.env.TELEGRAM_USER_ID || "";
const LOG_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/tcy-bot-run.log";
const ENV_FILE = "/volume1/tcy-bot/barracuda-hft-v8/.env";
const CONTROL_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/control.json";
const RESTART_REASON_FILE = "/volume1/tcy-bot/barracuda-hft-v8/logs/restart_reason.json";
const SERVICE_NAME = "tcy-bot-v8.service";
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || "";

let botStartTime = Date.now();

// ============================================================
// 💾 Utility: Read/write control state
// ============================================================
function writeControlState(update: Partial<{ paused: boolean; mute: boolean }>) {
  const current = readControl();
  const merged = { ...current, ...update };
  fs.writeFileSync(CONTROL_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

async function maybeReply(bot: TelegramBot, chatId: number, text: string, muteRespect = true) {
  const ctl = readControl();
  if (muteRespect && ctl.mute) return;
  await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
}

// ============================================================
// 📡 Register commands on existing Telegram bot
// ============================================================
export function registerTelegramControl(bot: TelegramBot) {
  console.log(`[TelegramControl] ✅ Registered full control commands for ${TCY_BOT_NAME} v${TCY_BOT_VERSION}`);

  // 🔎 Debug: log every incoming message
  bot.on("message", (msg: Message) => {
    console.log(`[Telegram] 📥 Message from ${msg.from?.username || msg.from?.first_name || "unknown"}: ${msg.text}`);

    if (TELEGRAM_USER_ID && msg.from?.id.toString() !== TELEGRAM_USER_ID) {
      console.warn(`[Telegram] ⚠️ Unauthorized user attempted: ${msg.from?.id}`);
      bot.sendMessage(msg.chat.id, "⛔ Unauthorized user.");
      return;
    }
  });

  // ============================================================
  // 📋 COMMAND HANDLER (supports /restart@BotName syntax)
  // ============================================================
  bot.onText(
    /(\/(status|log|start|stop|restart|base|tcy|wallet|cancel|info|debug|mode|about|price|ping|uptime|system|reboot|backup|update|alert|silent|resume|watchers?|help)(?:@[\w_]+)?)(.*)/i,
    async (msg: Message, match: RegExpExecArray | null) => {
      const chatId = msg.chat.id;

      // ✅ Authorization double-check
      if (TELEGRAM_USER_ID && msg.from?.id.toString() !== TELEGRAM_USER_ID) {
        console.warn(`[Telegram] ⛔ Unauthorized command attempt from ${msg.from?.id}`);
        bot.sendMessage(chatId, "⛔ Unauthorized user.");
        return;
      }

      const command = match?.[2]?.toLowerCase();
      const arg = match?.[3]?.trim() || "";
      console.log(`[Telegram] 🧭 Command detected: /${command} ${arg}`);

      try {
        switch (command) {
          // ============================================================
          // ✅ STATUS / SYSTEM / INFO
          // ============================================================
          case "status": {
            const status = execSync(`systemctl is-active ${SERVICE_NAME}`).toString().trim();
            const uptimeSec = (Date.now() - botStartTime) / 1000;
            const uptime = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`;
            const ctl = readControl();

            await maybeReply(
              bot,
              chatId,
              `📊 *${TCY_BOT_NAME} v${TCY_BOT_VERSION}*\n` +
                `Status: \`${status}\`\n` +
                `Paused: ${ctl.paused ? "✅ yes" : "❌ no"}\n` +
                `Mute: ${ctl.mute ? "🔕 on" : "🔔 off"}\n` +
                `Uptime: ${uptime}\n` +
                `Mode: Dual-Limit\n` +
                `Base = $${process.env.INITIAL_PORTFOLIO_VALUE}\nTCY = ${process.env.INITIAL_TCY}`
            );
            break;
          }

          case "log": {
            const logs = fs.existsSync(LOG_FILE)
              ? fs.readFileSync(LOG_FILE, "utf8").split("\n").slice(-15).join("\n")
              : "No log file found.";
            await bot.sendMessage(chatId, `📜 *Last log lines:*\n\n\`\`\`\n${logs}\n\`\`\``, { parse_mode: "Markdown" });
            break;
          }

          case "system": {
            const mem = (os.totalmem() - os.freemem()) / 1024 / 1024;
            const load = os.loadavg()[0].toFixed(2);
            await maybeReply(
              bot,
              chatId,
              `🖥 *System*\nMemory used: ${mem.toFixed(0)} MB\nCPU load: ${load}\nUptime: ${(os.uptime() / 3600).toFixed(1)} h`
            );
            break;
          }

          // ============================================================
          // ⚙️ START/STOP/RESTART CONTROL
          // ============================================================
          case "start":
            writeControlState({ paused: false });
            execSync(`sudo systemctl start ${SERVICE_NAME}`);
            await bot.sendMessage(chatId, "🚀 TCY Bot started via Telegram.");
            break;

          case "stop":
            writeControlState({ paused: true });
            execSync(`sudo systemctl stop ${SERVICE_NAME}`);
            await bot.sendMessage(chatId, "🛑 TCY Bot stopped via Telegram (paused state saved).");
            break;

          case "restart":
            await bot.sendMessage(chatId, "♻️ Restarting TCY Bot service...");
            execSync(`sudo systemctl restart ${SERVICE_NAME}`);
            break;

          case "reboot":
            await bot.sendMessage(chatId, "🔁 Rebooting NAS system...");
            execSync("sudo reboot");
            break;

          // ============================================================
          // ⚖️ PARAMETER ADJUSTMENT (RESTART-AWARE)
          // ============================================================
          case "base":
          case "tcy": {
            const isBase = command === "base";
            const newVal = parseFloat(arg);
            if (isNaN(newVal) || newVal <= 0) {
              await bot.sendMessage(chatId, `⚠️ Invalid ${isBase ? "base" : "TCY"} value. Example: \`/${command} 6000\``, {
                parse_mode: "Markdown",
              });
              return;
            }

            let env = fs.readFileSync(ENV_FILE, "utf8");
            const pattern = isBase ? /INITIAL_PORTFOLIO_VALUE=.*/g : /INITIAL_TCY=.*/g;
            const line = isBase ? `INITIAL_PORTFOLIO_VALUE=${newVal}` : `INITIAL_TCY=${newVal}`;
            env = env.replace(pattern, line);
            fs.writeFileSync(ENV_FILE, env);

            await bot.sendMessage(
              chatId,
              `✅ ${isBase ? "Base" : "TCY"} updated to ${newVal}. Cancelling open orders and restarting...`
            );

            try {
              await cancelAllOrders();
            } catch {}

            fs.writeFileSync(
              RESTART_REASON_FILE,
              JSON.stringify(
                { reason: `${command}_update`, value: newVal, timestamp: Date.now() },
                null,
                2
              )
            );

            execSync(`sudo systemctl restart ${SERVICE_NAME}`);
            break;
          }

          // ============================================================
          // 🛰 WATCHER CONTROL
          // ============================================================
          case "watchers":
          case "watcher": {
            const sub = arg.toLowerCase();

            if (sub === "status") {
              const status = execSync("pgrep -fl 'rujira_.*\\.js' || echo 'none'").toString().trim();
              const running = status === "none" ? "🔴 No watchers running." : `🟢 Active watchers:\n${status}`;
              await bot.sendMessage(chatId, running);
            } else if (sub === "restart") {
              await bot.sendMessage(chatId, "🔄 Restarting Rujira watchers...");
              execSync("pkill -f 'rujira_.*\\.js' || true");
              execSync("bash /volume1/tcy-bot/barracuda-hft-v8/start-watchers.sh");
              await bot.sendMessage(chatId, "✅ Watchers restarted successfully.");
            } else if (sub === "stop") {
              await bot.sendMessage(chatId, "🛑 Stopping all watchers...");
              execSync("pkill -f 'rujira_.*\\.js' || true");
              await bot.sendMessage(chatId, "✅ Watchers stopped.");
            } else if (sub === "start") {
              await bot.sendMessage(chatId, "🚀 Starting watchers...");
              execSync("bash /volume1/tcy-bot/barracuda-hft-v8/start-watchers.sh");
              await bot.sendMessage(chatId, "✅ Watchers launched.");
            } else {
              await bot.sendMessage(
                chatId,
                "🤖 Watcher control usage:\n" +
                  "/watchers status – show running processes\n" +
                  "/watchers start – launch watchers\n" +
                  "/watchers stop – kill watchers\n" +
                  "/watchers restart – restart both watchers"
              );
            }
            break;
          }

          // ============================================================
          // 💰 WALLET / PRICE / MARKET
          // ============================================================
          case "wallet": {
            if (!WALLET_ADDRESS) {
              await bot.sendMessage(chatId, "⚠️ WALLET_ADDRESS not set in .env file.");
              break;
            }
            const summary = await getWalletSummaryPublic(WALLET_ADDRESS);
            await maybeReply(
              bot,
              chatId,
              `💰 *Wallet Summary*\nUSDC: ${summary.usdc.toFixed(2)}\nTCY: ${summary.tcyTotal.toFixed(2)}\nValue: ~$${summary.totalValue.toFixed(2)}`
            );
            break;
          }

          case "price": {
            const mid = await getMarketPrice("TCY_USDC");
            await maybeReply(bot, chatId, `💹 Current TCY/USDC midrate: *$${mid.toFixed(4)}*`);
            break;
          }

          case "cancel":
            await cancelAllOrders();
            await maybeReply(bot, chatId, "❎ All open limit orders canceled.");
            break;

          // ============================================================
          // 🔍 DEBUG / INFO / MODE
          // ============================================================
          case "info": {
            const ctl = readControl();
            const mid = await getMarketPrice("TCY_USDC");
            const state = execSync(`systemctl is-active ${SERVICE_NAME}`).toString().trim();
            await maybeReply(
              bot,
              chatId,
              `📖 *Detailed State*\nMode: Dual-Limit\nService: ${state}\nMute: ${ctl.mute}\nPaused: ${ctl.paused}\nMid: $${mid.toFixed(4)}`
            );
            break;
          }

          case "debug": {
            const uptimeSec = Math.floor((Date.now() - botStartTime) / 1000);
            const ctl = readControl();
            await maybeReply(
              bot,
              chatId,
              `🔧 *Diagnostics*\nUptime: ${uptimeSec}s\nSilent: ${ctl.mute}\nPaused: ${ctl.paused}\nHostname: ${os.hostname()}`
            );
            break;
          }

          case "mode":
            await maybeReply(bot, chatId, "🔄 Current mode: *Dual-Limit* (Base Value Range Strategy)");
            break;

          // ============================================================
          // 🧩 BACKUP / UPDATE / ABOUT
          // ============================================================
          case "backup":
            execSync("cd /volume1/tcy-bot/barracuda-hft-v8 && git add . && git commit -m 'Auto backup' && git push");
            await bot.sendMessage(chatId, "💾 Backup committed and pushed to remote.");
            break;

          case "update":
            execSync("cd /volume1/tcy-bot/barracuda-hft-v8 && git pull && npm run build");
            await bot.sendMessage(chatId, "⬆️ Repository updated and rebuilt successfully.");
            break;

          case "about":
            await maybeReply(
              bot,
              chatId,
              `🤖 *${TCY_BOT_NAME}* v${TCY_BOT_VERSION}\nBase Value Range Strategy\nEnvironment: NAS/systemd\nRepository: Barracuda-HFT`
            );
            break;

          // ============================================================
          // 🔕 SILENT / ALERT / RESUME
          // ============================================================
          case "silent":
            writeControlState({ mute: true });
            await bot.sendMessage(chatId, "🔕 Telegram notifications paused.");
            break;

          case "resume":
            writeControlState({ mute: false, paused: false });
            await bot.sendMessage(chatId, "🔔 Telegram notifications resumed.");
            break;

          case "alert": {
            const on = arg.toLowerCase() === "on";
            writeControlState({ mute: !on });
            await bot.sendMessage(chatId, `🔔 Alerts ${on ? "enabled" : "disabled"}.`);
            break;
          }

          // ============================================================
          // 🆘 HELP
          // ============================================================
          case "help":
          default:
            await bot.sendMessage(
              chatId,
              `🤖 *${TCY_BOT_NAME}* v${TCY_BOT_VERSION}\n` +
                `Available commands:\n` +
                `/status, /info, /debug, /log\n` +
                `/start, /stop, /restart, /reboot\n` +
                `/base <value>, /tcy <amount>\n` +
                `/wallet, /price, /cancel\n` +
                `/watchers status|start|stop|restart\n` +
                `/system, /backup, /update\n` +
                `/silent, /resume, /alert <on/off>\n` +
                `/about, /mode, /help`,
              { parse_mode: "Markdown" }
            );
        }
      } catch (err) {
        const msgText = (err as Error).message || String(err);
        console.error(`[Telegram] ⚠️ Command error: ${msgText}`);
        await bot.sendMessage(chatId, `⚠️ Error: ${msgText}`);
      }
    }
  );
}

// ============================================================
// 🔄 Interactive Confirmation Helper (for strategy startup)
// ============================================================
export async function awaitTelegramConfirmation(
  bot: TelegramBot,
  chatId: number,
  prompt: string,
  timeoutMs = 300000,
  retryAfterMs = 3600000
): Promise<true | false | null> {
  await bot.sendMessage(
    chatId,
    `${prompt}\n\nPlease reply with /yes to confirm or /no to cancel.`,
    { parse_mode: "Markdown" }
  );

  return new Promise((resolve) => {
    const start = Date.now();

    const listener = async (msg: Message) => {
      if (msg.chat.id !== chatId) return;
      if (msg.from?.id.toString() !== TELEGRAM_USER_ID) return;

      const text = msg.text?.trim().toLowerCase();
      if (text === "/yes") {
        await bot.sendMessage(chatId, "✅ Confirmation received. Proceeding...");
        cleanup();
        resolve(true);
      } else if (text === "/no") {
        await bot.sendMessage(chatId, "❌ Confirmation declined. Halting startup.");
        cleanup();
        resolve(false);
      }
    };

    const cleanup = () => {
      bot.removeListener("message", listener);
      clearInterval(interval);
    };

    bot.on("message", listener);

    const interval = setInterval(() => {
      if (Date.now() - start > timeoutMs) {
        cleanup();
        bot.sendMessage(chatId, "⏲️ No reply within 5 minutes. Will retry in 1 hour.");
        setTimeout(() => resolve(null), retryAfterMs);
      }
    }, 1000);
  });
}
