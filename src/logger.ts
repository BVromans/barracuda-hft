import Decimal from "decimal.js";
import { List, Map } from "immutable";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// 🧩 TCY Logger — clean output + Amsterdam local time (YYYY-MM-DD HH:mm:ss)
// ============================================================

const COLORS = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

// ============================================================
// 🧮 Safe JSON serialization helpers
// ============================================================
const jsonReplacer = (key: string, value: any): any => {
  try {
    if (value instanceof Decimal) return value.toFixed();
    if (typeof value === "bigint") return value.toString();
    if (value instanceof Date) return value.toISOString();
    if (value instanceof List || value instanceof Map) return (value as any).toJS();
    if (typeof value === "function") return `[Function: ${value.name || "anonymous"}]`;
    if (typeof value === "symbol") return value.toString();
    if (typeof value === "object" && value !== null) {
      const prototype = Object.getPrototypeOf(value);
      if (prototype === null || prototype === Object.prototype) {
        const clone: any = {};
        for (const k in value) {
          if (Object.prototype.hasOwnProperty.call(value, k)) {
            clone[k] = jsonReplacer(k, value[k]);
          }
        }
        return clone;
      }
      return `[Instance of ${(prototype as any).constructor?.name || "Object"}]`;
    }
    return value;
  } catch {
    return `[Unserializable: ${typeof value}]`;
  }
};

const dump = (target: any): string => {
  try {
    return JSON.stringify(target, jsonReplacer, 2);
  } catch {
    return String(target);
  }
};

// ============================================================
// 📊 Log Levels
// ============================================================
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

// ============================================================
// 🧠 Centralized Logger (local-time + clean console output)
// ============================================================
export class Logger {
  private readonly name: string;
  private readonly logDirectory: string;

  constructor(name = "GLOBAL") {
    this.name = name;

    const preferred = "/volume1/logs";
    const safeBase =
      fs.existsSync(preferred) && fs.lstatSync(preferred).isDirectory()
        ? preferred
        : path.join(process.cwd(), "logs");

    this.logDirectory = safeBase;
    if (!fs.existsSync(this.logDirectory)) {
      try {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      } catch {
        console.warn(`⚠️ Could not create log directory: ${this.logDirectory}`);
      }
    }
  }

  private writeToLogFile(filename: string, message: string): void {
    try {
      const filePath = path.join(this.logDirectory, filename);
      fs.appendFileSync(filePath, message + "\n", { encoding: "utf8", mode: 0o644 });
    } catch (error) {
      console.error(`❌ Failed to write log file (${filename}):`, error);
    }
  }

  private getColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.WARNING:
        return COLORS.yellow;
      case LogLevel.ERROR:
        return COLORS.red;
      case LogLevel.CRITICAL:
        return COLORS.magenta;
      default:
        return COLORS.reset;
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    const ams = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Amsterdam" }));
    const y = ams.getFullYear();
    const m = String(ams.getMonth() + 1).padStart(2, "0");
    const d = String(ams.getDate()).padStart(2, "0");
    const hh = String(ams.getHours()).padStart(2, "0");
    const mm = String(ams.getMinutes()).padStart(2, "0");
    const ss = String(ams.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  private log(level: LogLevel, message: string, object?: any, ...params: any[]): void {
    const timestamp = this.formatTimestamp();
    const color = this.getColor(level);
    const formatted = `[${timestamp}] ${message}`;
    const colored = `${color}${formatted}${COLORS.reset}`;

    const method =
      level === LogLevel.ERROR || level === LogLevel.CRITICAL
        ? "error"
        : level === LogLevel.WARNING
        ? "warn"
        : "log";

    // Console output
    if (object || params.length > 0) {
      (console as any)[method](colored, dump(object || params));
    } else {
      (console as any)[method](colored);
    }

    // File output (keep timestamp + message)
    this.writeToLogFile(`${level}.log`, formatted);
    this.writeToLogFile("all.log", formatted);
  }

  // Level helpers
  debug(msg: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.DEBUG, msg, obj, ...p);
  }
  info(msg: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.INFO, msg, obj, ...p);
  }
  warn(msg: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.WARNING, msg, obj, ...p);
  }
  error(msg: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.ERROR, msg, obj, ...p);
  }
  critical(msg: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.CRITICAL, msg, obj, ...p);
  }

  ignoreException(error: unknown, context?: string): void {
    const label = context ? `(${context})` : "";
    this.warn(`Ignored exception ${label}: ${String(error)}`);
  }
}

// ============================================================
// 🌐 Global default logger
// ============================================================
export const logger = new Logger();
