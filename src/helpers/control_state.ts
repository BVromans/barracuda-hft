// ============================================================
// 🤖 TCY Bot – Control State Helper
// ------------------------------------------------------------
// Provides persistent read/write access to control.json,
// used by Telegram commands and strategy loops to coordinate
// /stop, /start, /silent, /resume, and mute states.
// ============================================================

import fs from "fs";

const CONTROL_FILE =
  process.env.CONTROL_FILE || "/volume1/tcy-bot/barracuda-hft-v8/logs/control.json";

export type ControlState = {
  paused?: boolean; // /stop sets true; /start or /resume sets false
  mute?: boolean;   // /silent = true; /resume = false
};

// ============================================================
// 📖 Read control state safely
// ============================================================
export function readControl(): ControlState {
  try {
    if (!fs.existsSync(CONTROL_FILE)) return {};
    const raw = fs.readFileSync(CONTROL_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ============================================================
// ✍️ Write control state (used internally by Telegram module)
// ============================================================
export function writeControl(update: Partial<ControlState>) {
  const current = readControl();
  const merged = { ...current, ...update };
  fs.writeFileSync(CONTROL_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

// ============================================================
// 🧩 Utility shortcuts
// ============================================================
export function isMuted(): boolean {
  return !!readControl().mute;
}

export function isPaused(): boolean {
  return !!readControl().paused;
}
