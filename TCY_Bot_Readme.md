
# 🤖 TCY Bot – Base Value Range Strategy

## 📘 Overview
The **TCY Bot** is a high-performance automated Base Value Range (BVR) trading system built with **TypeScript** and deployed on **Synology NAS** using **Node.js** managed by `systemd`.
It supports **paper trading**, **Telegram control**, and **auto-restart** with crash recovery.

---

## 🚀 Key Features

### ✅ Core
- Base Value Range strategy loop (60s updates)
- Paper/live calibration via `.env`
- Telegram command control
- Automatic recovery and logging
- Graceful shutdown and restart

### ⚙️ System Integration
- Runs on Synology NAS (Node.js environment)
- `systemd` service: `tcy-bot-v7.service`
- CLI aliases via `tcybot` for start/stop/status/log

### 💬 Telegram Commands
| Command | Description |
|----------|--------------|
| `/status` | Show bot status |
| `/log` | Show last 15 log lines |
| `/start` | Start bot |
| `/stop` | Stop bot |
| `/restart` | Restart bot |
| `/base <value>` | Update base portfolio value |
| `/tcy <amount>` | Update starting TCY balance |
| `/help` | Show available commands |

---

## 🧭 Installation & Setup

### 1️⃣ Install Dependencies
```bash
cd /volume1/tcy-bot/barracuda-hft
npm install
npm run build:node
```

### 2️⃣ Create Systemd Service
File: `/etc/systemd/system/tcy-bot-v7.service`
```ini
[Unit]
Description=TCY Bot – Base Value Range Strategy (Node.js)
After=network.target

[Service]
ExecStart=/usr/local/bin/npm run start:node
WorkingDirectory=/volume1/tcy-bot/barracuda-hft
Restart=always
User=ssh_admin
Environment=NODE_ENV=production
StandardOutput=append:/volume1/tcy-bot/barracuda-hft/logs/tcy-bot-run.log
StandardError=append:/volume1/tcy-bot/barracuda-hft/logs/tcy-bot-run.log

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable tcy-bot-v7.service
sudo systemctl start tcy-bot-v7.service
```

---

## 🧩 Alias Commands
Edit `~/.bashrc`:
```bash
alias tcybot="/volume1/tcy-bot/tcybot"
```

Then reload:
```bash
source ~/.bashrc
```

Use:
```bash
tcybot start
tcybot stop
tcybot status
tcybot log
```

---

## 💬 Telegram Setup

### 1️⃣ Add to `.env`:
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_USER_ID=123456789
```

### 2️⃣ Auto-Notifications
On startup, you’ll receive:
> 🟢 TCY Bot connected and ready for commands.

### 3️⃣ Example
```
/status  → 📊 Bot active
/base 6000 → ✅ Updated and restarted
/tcy 40000 → ✅ Updated and restarted
```

---

## 📊 Monitoring
View logs:
```bash
tail -f /volume1/tcy-bot/barracuda-hft/logs/tcy-bot-run.log
```

Check service:
```bash
systemctl status tcy-bot-v7.service
```

Restart manually:
```bash
sudo systemctl restart tcy-bot-v7.service
```

---

## 📦 Git Backup
```bash
git add .
git commit -m "TCY Bot v7 – Telegram integration"
git push origin production
git push origin v7.0.0
```

---

## 🧠 Recommendations
- Secure `.env` and Telegram credentials
- Grant `sudo` access to systemctl for ssh_admin
- Use `npm audit fix` monthly
- Add `/info` command (future): real-time base, TCY, mode

---

© 2025 Barracuda HFT – TCY Bot Project
