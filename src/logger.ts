import Decimal from "decimal.js";
import { List, Map } from "immutable";
import * as fs from "fs";
import * as path from "path";

// ANSI color codes for console output
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

// === Safe JSON serialization helpers ===
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

// === Log Levels ===
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  CRITICAL = "critical",
}

// === Centralized Logger (colorized + NAS-safe) ===
export class Logger {
  private readonly name: string;
  private readonly logDirectory: string;

  constructor(name = "GLOBAL") {
    this.name = name;

    // Pick a writable log directory (NAS or fallback)
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
      case LogLevel.DEBUG:
        return COLORS.gray;
      case LogLevel.INFO:
        return COLORS.green;
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

  private log(level: LogLevel, message: string, object?: any, ...params: any[]): void {
    const now = new Date().toISOString();
    const color = this.getColor(level);
    const formatted = `[${now}][${level.toUpperCase()}][${this.name}] ${message}`;
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

    // File output (plain, no colors)
    this.writeToLogFile(`${level}.log`, formatted);
    this.writeToLogFile("all.log", formatted);
  }

  // === Level helpers ===
  debug(message: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.DEBUG, message, obj, ...p);
  }
  info(message: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.INFO, message, obj, ...p);
  }
  warn(message: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.WARNING, message, obj, ...p);
  }
  error(message: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.ERROR, message, obj, ...p);
  }
  critical(message: string, obj?: any, ...p: any[]) {
    this.log(LogLevel.CRITICAL, message, obj, ...p);
  }

  /**
   * Used by older strategies – prevents crashes on recoverable exceptions.
   */
  ignoreException(error: unknown, context?: string): void {
    const label = context ? `(${context})` : "";
    this.warn(`Ignored exception ${label}: ${String(error)}`);
  }
}

// === Global default logger instance ===
export const logger = new Logger();
