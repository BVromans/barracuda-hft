## 📘 TCY Bot – Base Value Range Strategy (v7.0.0 Final)

### 🔖 Overview
The **TCY Bot – Base Value Range Strategy** is a self-calibrating, paper-trading high-frequency bot that maintains the total portfolio value within a controlled percentage band around a moving “base value.”  

It uses **Rujira’s REST orderbook feed** for live prices, performs simulated limit & market orders, and provides **Telegram notifications** for every state change.

This version (**v7.0.0**) is the *final and locked-in reference* used to verify correct operation.

---

## 🧠 Core Concept

The bot defines a **base portfolio value in USD** (e.g. `$5,950`).  
It aims to keep the wallet’s value near this anchor using:
- +3.6% upper bound (`RANGE_UP = 1.036`)
- −3.2% lower bound (`RANGE_DOWN = 0.968`)

When the wallet value drifts outside that band, the bot re-balances with market orders.  
When within the band, it runs a **dual-limit trading mode**.

---

## ⚙️ Configuration

| Variable | Description | Example |
|-----------|--------------|----------|
| `INITIAL_PORTFOLIO_VALUE` | Starting USD base for calibration | `5950` |
| `INITIAL_TCY` | Paper-trading TCY balance | `38643` |
| `WALLET_ADDRESS` | (Optional) address for GraphQL balance query | *(blank for paper mode)* |
| `TELEGRAM_BOT_TOKEN` | Bot token for notifications | e.g. `123456:ABC...` |
| `TELEGRAM_CHAT_ID` | Telegram chat ID to send messages | e.g. `123456789` |
| `RUJIRA_TOKEN_GRAPHQL` | Optional token for wallet GraphQL endpoint | *(can be blank)* |

---

## 🧩 Market Feed Integration

**Source:**  
```
https://api.rujira.network/api/trade/orderbook?ticker_id=TCY_USDC&depth=1
```

**Response Example:**
```json
{
  "asks": [["0.155632", "3402.07935045"]],
  "bids": [["0.154004", "3420.01396444"]],
  "ticker_id": "TCY_USDC"
}
```

**Bot calculation:**
```ts
mid = (bestBid + bestAsk) / 2;
```
If unavailable, it retries every 10 minutes, pausing safely.

---

## 🧮 Calibration Phase

**Purpose:** Ensure wallet value is within the ±range before trading.

| Condition | Action | Result |
|------------|---------|--------|
| Wallet > Base × 1.036 | Market SELL | Base += 25 |
| Wallet < Base × 0.968 | Market BUY  | Base unchanged |
| Wallet within band     | Switch to dual-limit mode | |

**Market order size:**
- SELL value = `base × 0.036`
- BUY value  = `base × 0.032`

**Message Example:**
```
⚡ Market SELL executed @ $0.1558 ($214.20) → new base: $5.975,-
```

---

## ♻️ Dual-Limit Mode (Core Trading Logic)

When within range, the bot runs continuous limit orders that bracket the base value.

**Base-anchored formula:**
```
buy_price  = (base × 0.968) / wallet_tcy
sell_price = (base × 1.036) / wallet_tcy
buy_value  = base × 0.032
sell_value = base × 0.036
buy_amount  = buy_value / buy_price
sell_amount = sell_value / sell_price
```

**Behavior:**
- If BUY limit fills → base unchanged
- If SELL limit fills → base += 25
- Limit orders remain active unless:
  - a fill occurs, or
  - prices change by > $0.0001

**Cycle frequency:** 60 s  
**Stability:** No re-placement unless necessary.

---

## 📊 Example Run (Validated Output)

```
📈 New limit orders: BUY @ $0.1490, SELL @ $0.1595
BUY  = 1.277,45 TCY ≈ $190,40
SELL = 1.342,81 TCY ≈ $214,20
Current rate: $0.1559
```

Then:
```
[Cycle] Prices unchanged – keeping existing limit orders active.
```

---

## ✉️ Telegram Notifications

Every important event is logged and sent to Telegram:

| Event | Example Message |
|--------|------------------|
| Startup | 🤖 TCY Bot – Base Value Range (v7.0.0) started |
| Within range | ✅ Wallet within range – switching to dual-limit mode |
| New limit placement | 📊 New limit orders placed... |
| Market order executed | ⚡ Market SELL executed... |
| Limit filled | ✅ SELL filled... |
| Stop signal | 🛑 TCY Bot stopped manually |

---

## 🧮 Numerical Anchoring Example

For:  
`base = 5950`  
`wallet_tcy = 38643`

```
buy_price  = (5950 × 0.968) / 38643 = 0.1490
sell_price = (5950 × 1.036) / 38643 = 0.1595
```
These match your Excel spreadsheet exactly.

---

## 🧱 Stability Rules

1. **Base changes only after SELL.**
2. **Orders remain active** unless:
   - a limit fills, or
   - price shift > $0.0001.
3. **Market price** does *not* anchor limit levels.
4. **Rujira orderbook** used for midprice, not for placement anchors.
5. **All prices and notifications use European format** (comma for decimals, dot for thousands).
6. **All cycle delays:**  
   - Trading loop: 60 s  
   - Calibration pause: 10 min on error  

---

## ⚠️ Safety & Sanity Checks

- If API returns 0/null → fallback to `INITIAL_TCY`
- No trading if midprice invalid or missing
- No dependency on WebSocket; REST orderbook only
- All orders paper-simulated (no funds moved)
- Graceful Ctrl-C termination with Telegram notification

---

## 🧾 Reference Output (Ideal Run)

```
✅ .env manually loaded
🚀 Starting TCY Bot – Base Value Range (v7.0.0)
⚠️ No wallet credentials found – PAPERTRADING MODE
✅ Wallet within range – switching to dual-limit mode
📈 New limit orders: BUY @ $0.1490, SELL @ $0.1595
[Cycle] Prices unchanged – keeping existing limit orders active.
```

---

## 🧩 File Structure

| File | Description |
|-------|-------------|
| `/src/strategies/tcy_bot_v_7_base_value_range.ts` | Core trading logic |
| `/src/helpers/tcy_api.ts` | API, order simulation, Telegram |
| `/src/version.ts` | Holds version number & bot name |
| `/README_TCY_BOT.md` | **This document** (baseline) |

---

## ✅ Verification Checklist (for future builds)

| Checkpoint | Expected | Confirmed |
|-------------|-----------|-----------|
| Base formula anchors to USD value | ✅ | |
| Buy/Sell prices = 0.1490 / 0.1595 (for base=5950, tcy=38643) | ✅ | |
| Orders stable between cycles | ✅ | |
| Base increases +25 only after SELL | ✅ | |
| Telegram notifications match format | ✅ | |
| Rujira API REST feed functional | ✅ | |

---

### 🔒 Change Control Notice
This document represents the **locked-in reference** for TCY Bot v7.0.0.  
Any change in:
- formulas,  
- anchoring logic,  
- order triggers, or  
- Telegram structure  

must be considered a **new bot version