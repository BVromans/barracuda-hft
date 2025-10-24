import { readFileSync, existsSync } from "fs";
import * as path from "path";
import { parse } from "yaml";
import { Map } from "immutable";
import { MMap } from "./extensions/immutablejs";

/**
 * ✅ Centralized, singleton configuration manager for TCY-BOT
 * Loads YAML + ENV synchronously at import time (no async/await).
 */
export class Properties {
  private static instance: Properties;
  private readonly map: Map<string, any>;

  private constructor() {
    this.map = MMap<string, any>({}, ".");
    this.initialize();
  }

  /** Get singleton instance (synchronous) */
  public static getInstance(): Properties {
    if (!Properties.instance) {
      Properties.instance = new Properties();
    }
    return Properties.instance;
  }

  /** Full initialization sequence */
  private initialize(): void {
    this.initialLoad();
    this.loadFromConstants();
    this.loadFromConfigurationFiles();
    this.loadFromEnvironmentVariables();
    this.defineExtraProperties();
  }

  /** Setup for key paths */
  private initialLoad(): void {
    const root = process.cwd();
    this.map.set("paths.root.path", root);
    this.map.set("paths.resources.path", path.join(root, "resources"));
    this.map.set("paths.resources.configuration.path", path.join(root, "resources", "configuration"));
    this.map.set("paths.resources.database.path", path.join(root, "resources", "database"));
  }

  /** Load static constants (optional) */
  private loadFromConstants(): void {
    // Reserved for future defaults
  }

  /** Load configuration files from YAML (main.yml, common.yml, and env-specific) */
  private loadFromConfigurationFiles(): void {
    const configFolder =
      this.getOrDefault<string>(
        "paths.resources.configuration.path",
        path.join(process.cwd(), "resources", "configuration")
      ) || path.join(process.cwd(), "resources", "configuration");

    let configuration: Map<string, any> = Map<string, any>().asMutable();

    const loadYaml = (filename: string): Map<string, any> => {
      const fullPath = path.join(configFolder, filename);
      if (!existsSync(fullPath)) {
        console.warn(`⚠️ Configuration file not found: ${fullPath}`);
        return Map<string, any>().asMutable();
      }

      try {
        const content = readFileSync(fullPath, "utf8");
        const parsed = parse(content);
        return Map<string, any>(parsed).asMutable();
      } catch (err) {
        console.error(`❌ Failed to parse YAML: ${filename}`, err);
        return Map<string, any>().asMutable();
      }
    };

    // main.yml and common.yml
    configuration = configuration.mergeDeep(loadYaml("main.yml"));
    configuration = configuration.mergeDeep(loadYaml("common.yml"));

    // Environment override (from ENV or YAML)
    const environment = process.env.ENVIRONMENT || configuration.get("environment");
    if (environment) {
      const envFile = `${environment}.yml`;
      if (existsSync(path.join(configFolder, envFile))) {
        configuration = configuration.mergeDeep(loadYaml(envFile));
        console.log(`✅ Loaded environment config: ${envFile}`);
      }
    }

    this.map.mergeDeep(configuration);
  }

  /** Load environment variables (auto-type conversion) */
  private loadFromEnvironmentVariables(): void {
    const parseValue = (value?: string): any => {
      if (value === undefined) return undefined;
      if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
      if (!isNaN(Number(value))) return Number(value);
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    };

    for (let [key, value] of Object.entries(process.env)) {
      key = key.toLowerCase();
      this.map.set(key, parseValue(value));
    }
  }

  /** Add or override from environment */
  private defineExtraProperties(): void {
    const setIfMissing = (key: string, value?: string) => {
      if (value && !this.map.get(key)) this.map.set(key, value);
    };

    setIfMissing("rujira.wallet.mnemonic", process.env.RUJIRA_WALLET_MNEMONIC);
    setIfMissing("rujira.wallet.privateKey", process.env.RUJIRA_WALLET_PRIVATE_KEY);
    setIfMissing("rujira.wallet.publicKeys.thor", process.env.RUJIRA_WALLET_PUBLIC_KEY_THOR);
    setIfMissing("rujira.wallet.publicKeys.ethereum", process.env.RUJIRA_WALLET_PUBLIC_KEY_ETHEREUM);
    setIfMissing("rujira.tokens.graphql", process.env.RUJIRA_TOKEN_GRAPHQL);
  }

  /** Strict getter — throws if missing */
  public get<T = unknown>(key: string): T {
    const value = this.getOrDefault<T>(key);
    if (value === undefined) throw new Error(`Property "${key}" not found.`);
    return value;
  }

  /** Getter with fallback */
  public getOrDefault<T = unknown>(key: string, defaultValue?: T): T | undefined {
    let result = this.map.get(key);
    if (result !== undefined) return result;

    const altKey = key.toLowerCase().replace(/\./g, "_");
    result = this.map.get(altKey);
    return result !== undefined ? result : defaultValue;
  }

  /** Typed getter (used in index.ts, etc.) */
  public getAs<T = unknown>(key: string, defaultValue?: T): T {
    const value = this.getOrDefault<T>(key, defaultValue);
    return value as T;
  }

  /** Set or override manually */
  public set(key: string, value: any): void {
    this.map.set(key, value);
  }
}

/**
 * ✅ Synchronous singleton export
 * Ensures configs + env vars available immediately.
 */
export const properties = Properties.getInstance();
