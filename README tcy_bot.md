# 🤖 TCY Bot – Base Value Range Strategy

## 📘 Overview
The **TCY Bot** is an automated Base Value Range (BVR) trading system written in **TypeScript** and executed via **Node.js** on a **Synology NAS**. It performs periodic trading operations every **60 seconds**, monitoring wallet value relative to a dynamically managed **base value** and executing **market** or **dual-limit** trades accordingly.

It integrates deeply with the **Rujira API** for live trading, and **Telegram** for monitoring, command control, and notifications. Versioning is maintained dynamically through **`versions.json`** (no hardcoded version numbers).

---

## 🚀 Core Features
- 🕒 **1-minute trading loop** (non-HFT, efficient polling)
- 💹 **Base Value Range strategy** (market & dual-limit modes)
- 🔄 **Automatic rebalancing** when wallet exceeds range limits
- 💬 **Telegram bot integration** for monitoring and live control
- 🧩 **Dynamic base value updates** via commands or trade results
- 🪙 **Wallet and portfolio tracking** in both TCY and USD
- 🧠 **Crash recovery & auto-restart** (via `systemd`)
- 📜 **Structured logging** and optional debug output

---

## 🗂️ Folder Structure
```
/volume1/tcy-bot/barracuda-hft-v8/
│
├── src/
│   ├── strategies/
│   │   └── tcy_base_value_range.ts    # Core strategy logic
│   ├── tcy_telegram_control.ts        # Telegram bot handler and commands
│   ├── index.ts                       # Main entrypoint and scheduler
│   ├── rujira.ts                      # Market API integration (price, balance, orders)
│   ├── logger.ts                      # Logging and Telegram messaging utilities
│   ├── properties.ts                  # Global constants and environment access
│   ├── utils.ts                       # Helper functions
│   └── versions.json                  # Version information file
│
├── logs/                              # Bot runtime logs
├── .env                               # Configuration and API credentials
└── README.md                          # (This file)
```

---

## ⚙️ Environment Configuration (`.env`)
```bash
# Core Trading Configuration
INITIAL_TCY=40000
INITIAL_PORTFOLIO_VALUE=5950
CHECK_INTERVAL_SEC=60

# API Access
RUJIRA_API_URL=https://api.rujira.io
RUJIRA_API_KEY=your_key_here

# Telegram Configuration
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_USER_ID=123456789

# Node Environment
NODE_ENV=production
```

---

## 💡 Trading Logic – Base Value Range (BVR)

### 🔸 Startup Phase
1. Load `.env` and `versions.json`.
2. Fetch:
   - Total TCY balance from Rujira API
   - Market midrate (TCY/USDC)
   - Base value and initial TCY from `.env`
3. Compute wallet value (USD):
   ```
   wallet_value_usd = wallet_balance_tcy × market_price
   ```
4. Compare to base value:
   ```
   upper_limit = base × 1.036
   lower_limit = base × 0.968
   ```
5. Depending on value:
   - If **above upper** → ⚡ *Market SELL* (rebalance to midrange), then `base += 25`
   - If **below lower** → ⚡ *Market BUY* (rebalance to midrange), base unchanged
   - Repeat until wallet_value is inside range
   - Switch to **Dual-Limit Mode**

### 🔹 Dual-Limit Mode
Maintains two active limit orders:
| Type | Price | Target Value | TCY Amount | On Fill |
|------|--------|---------------|-------------|----------|
| **SELL** | `base × 1.036` | `base × 0.036` | `target_value / price` | `base += 25` |
| **BUY** | `base × 0.968` | `base × 0.032` | `target_value / price` | `base unchanged` |

After any fill:
1. Cancel remaining orders
2. Wait 10 seconds
3. Replace both orders using the updated base

---

## 🧭 Flowchart – Base Value Range Logic
```
       ┌────────────────────────┐
       │ Start / Load .env + ver│
       └────────────┬───────────┘
                    │
           Fetch wallet & price
                    │
          Compute wallet_value
                    │
      ┌─────────────┼─────────────┐
      │                           │
Wallet > upper_limit?       Wallet < lower_limit?
      │                           │
      ▼                           ▼
⚡ Market SELL              ⚡ Market BUY
base += 25                 base unchanged
      │                           │
      └─────────────┬─────────────┘
                    ▼
             Within range?
                    │
                    ▼
          Enter Dual-Limit Mode
                    │
   ┌────────────────┴────────────────┐
   │  Place BUY (base×0.968)        │
   │  Place SELL (base×1.036)       │
   └────────────────┬────────────────┘
                    │
             On order fill
                    ▼
         Cancel → Wait 10s → Re-place
                    │
                    ▼
                Repeat loop
```

---

## 💬 Telegram Integration
All runtime monitoring and manual control are handled via the Telegram bot.

### 🔧 Commands
| Command | Description |
|----------|--------------|
| `/status` | Display bot state (base, mode, wallet, market, uptime) |
| `/log` | Show last 15 log lines |
| `/start` | Start or resume the trading loop |
| `/stop` | Gracefully stop trading loop |
| `/restart` | Restart via `systemctl restart tcy-bot.service` |
| `/base <value>` | Update base portfolio value and restart |
| `/tcy <amount>` | Update initial TCY balance and restart |
| `/wallet` | Show current TCY and USD wallet value |
| `/cancel` | Cancel all open limit orders |
| `/info` | Show detailed state (base, limits, orders, wallet) |
| `/debug` | Output internal diagnostics (timers, states, latency) |
| `/mode` | Display current mode (MarketRebalance / DualLimit) |
| `/about` | Show version info (from versions.json) |
| `/price` | Get current TCY/USDC market midrate |
| `/ping` | Check latency and system uptime |
| `/help` | List available commands |
| `/uptime` | Show how long the bot has been active |
| `/system` | Show memory and CPU stats from Node.js |
| `/reboot` | Restart full system service via shell command |
| `/backup` | Trigger immediate Git backup operation |
| `/update` | Pull latest repository changes and rebuild |
| `/alert <on/off>` | Enable or disable alert notifications |
| `/silent` | Pause Telegram notifications temporarily |
| `/resume` | Resume Telegram message notifications |

---

### 📨 Telegram Message Templates
| Type | Example |
|------|----------|
| **Startup** | `🤖 TCY Bot Online | Base=$5950 | Wallet=41,000 TCY ($6,355) | Mode=Dual-Limit` |
| **Limit Orders Placed** | `📊 Placed: BUY @ $0.1490 (1,277 TCY), SELL @ $0.1595 (1,343 TCY)` |
| **Limit Fill** | `✅ Limit SELL filled @ $0.1595 | New base: $5975` |
| **Market Trade** | `⚡ Market SELL @ $0.1558 | $200.00 | Base +25` |
| **Error** | `❗ API Error: Connection timeout` |
| **Wallet** | `💰 Wallet: 41,000 TCY ($6,355)` |
| **Mode Change** | `🔄 Mode switched: Dual-Limit active` |
| **Restart** | `♻️ Restarting TCY Bot service...` |

---

## 🧠 Architecture Summary
- **Main loop:** Controlled by `index.ts` via `setInterval` (default: 60s)
- **Strategy logic:** `tcy_base_value_range.ts` (handles computations + order logic)
- **Telegram:** `tcy_telegram_control.ts` (commands + notifications)
- **Rujira API:** Fetches prices, balances, executes orders
- **Versioning:** Dynamically fetched from `versions.json`
- **Logs:** JSON + plain text under `/logs/`
- **Persistence:** Minimal; uses in-memory state with `.env` startup defaults

---

## ⚙️ Systemd Service Configuration
File: `/etc/systemd/system/tcy-bot.service`
```ini
[Unit]
Description=TCY Bot – Base Value Range Strategy (Node.js)
After=network.target

[Service]
ExecStart=/usr/local/bin/npm run start:node
WorkingDirectory=/volume1/tcy-bot/barracuda-hft-v8
Restart=always
User=ssh_admin
Environment=NODE_ENV=production
StandardOutput=append:/volume1/tcy-bot/barracuda-hft-v8/logs/tcy-bot-run.log
StandardError=append:/volume1/tcy-bot/barracuda-hft-v8/logs/tcy-bot-run.log

[Install]
WantedBy=multi-user.target
```

---

## 🧩 Command-Line Aliases
Add to `~/.bashrc`:
```bash
alias tcybot="/volume1/tcy-bot/tcybot"
```
Reload and use:
```bash
tcybot start
tcybot stop
tcybot status
tcybot log
tcybot update
tcybot restart
tcybot wallet
tcybot info
tcybot cancel
tcybot backup
tcybot ping
tcybot help
```

---

## 🧾 Logging and Recovery
- Logs are stored in `/logs/tcy-bot-run.log`
- `systemd` auto-restarts the service on crash
- API and trade errors are logged and sent to Telegram
- Manual recovery available via `/restart` or `/reboot` commands

---

## 🔐 Security & Maintenance
- Restrict `.env` file permissions (`chmod 600`)
- Allow `ssh_admin` user passwordless `sudo` for `systemctl restart`
- Use `npm audit fix` monthly
- Monitor API rate limits on Rujira
- Optional: implement 7-day log rotation

---

## 📦 Git Backup Workflow
```bash
git add .
git commit -m "TCY Bot – Base Value Range updates"
git push origin production
git push origin main
```

---

## ✅ Summary
| Component | Description |
|------------|-------------|
| **Runtime** | Node.js on Synology NAS |
| **Loop Interval** | 60 seconds |
| **Strategy** | Base Value Range (market + dual-limit modes) |
| **Base Adjustment** | +25 after each sell fill |
| **API** | Rujira for prices, balances, and trading |
| **Notifications** | Telegram bot (full command suite) |
| **Startup Wallet Display** | Shows TCY + USD balance automatically |
| **Versioning** | Loaded from `versions.json` |

---

© 2025 Barracuda HFT – TCY Bot Project (Base Value Range Strategy)

