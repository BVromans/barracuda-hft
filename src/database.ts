import * as fs from "fs";
import * as path from "path";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import { properties } from "./properties";
import { Map, List } from "immutable";
import { MMap, MList } from "./extensions/immutablejs";
import { Logger } from "./logger";

/**
 * Connection type selector.
 */
export enum ConnectionType {
  READ_WRITE = 0,
  READ_ONLY = 1,
}

/**
 * ✅ Async SQLite wrapper using `sqlite` (pure JS, works on Node 18)
 * But exported through a lazy loader so you can use it synchronously.
 */
export class DatabaseService {
  private static instance: DatabaseService | null = null;

  private readonly databaseDirectory: string;
  private readonly databaseFilePath: string;
  private connection: Database | null = null;
  private readonly log = new Logger("Database");

  private constructor() {
    this.databaseDirectory = properties.getAs<string>(
      "paths.resources.database.path",
      path.join(process.cwd(), "resources", "database")
    );
    this.databaseFilePath = path.join(this.databaseDirectory, "database.sqlite");
  }

  /** Singleton accessor (async internal) */
  private static async createInstance(): Promise<DatabaseService> {
    const instance = new DatabaseService();
    await instance.ensureDatabaseFileExists();
    await instance.connect();
    await instance.initialize();
    return instance;
  }

  /** Public getter that ensures initialization once */
  public static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = await DatabaseService.createInstance();
    }
    return DatabaseService.instance;
  }

  /** Connect to SQLite database */
  private async connect(): Promise<void> {
    this.connection = await open({
      filename: this.databaseFilePath,
      driver: sqlite3.Database,
    });
    this.log.info(`Connected to SQLite at ${this.databaseFilePath}`);
  }

  /** Create required tables */
  private async initialize(): Promise<void> {
    await this.mutate(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        owner_address TEXT,
        market_address TEXT,
        side TEXT,
        type TEXT,
        amount TEXT,
        price TEXT,
        deviation_in_percentage TEXT,
        filled_percentage TEXT,
        status TEXT,
        creation_timestamp TEXT,
        update_timestamp TEXT
      );
    `);

    await this.mutate(`
      CREATE TABLE IF NOT EXISTS summary (
        data TEXT
      );
    `);
  }

  /** Core executor (select/mutate) */
  private async execute(
    query: string,
    parameters?: Record<string, unknown> | any[]
  ): Promise<List<Map<string, unknown>>> {
    if (!this.connection) throw new Error("Database not initialized.");
    const isSelect = /^\s*(select|pragma)/i.test(query);

    let rows: any[];
    if (isSelect) {
      rows = await this.connection.all(query, parameters || {});
    } else {
      await this.connection.run(query, parameters || {});
      rows = [];
    }

    return MList<Map<string, unknown>>(
      rows.map((row) => MMap<string, unknown>(row))
    );
  }

  /** === High-level wrappers === */

  public async select(query: string, parameters?: any) {
    return this.execute(query, parameters);
  }

  public async select_single(query: string, parameters?: any) {
    const list = await this.select(query, parameters);
    return list.get(0);
  }

  public async mutate(query: string, parameters?: any) {
    return this.execute(query, parameters);
  }

  public async insert(query: string, parameters?: any) {
    this.log.debug(`[SQL:INSERT] ${query}`);
    return this.mutate(query, parameters);
  }

  public async update(query: string, parameters?: any) {
    this.log.debug(`[SQL:UPDATE] ${query}`);
    return this.mutate(query, parameters);
  }

  public async delete(query: string, parameters?: any) {
    this.log.debug(`[SQL:DELETE] ${query}`);
    return this.mutate(query, parameters);
  }

  /** Transaction helpers */
  public async commit(): Promise<void> {
    this.log.debug("[TX] COMMIT");
    await this.connection?.exec("COMMIT");
  }

  public async rollback(): Promise<void> {
    this.log.warn("[TX] ROLLBACK");
    await this.connection?.exec("ROLLBACK");
  }

  /** Ensure folder/file exist */
  private async ensureDatabaseFileExists(): Promise<void> {
    if (!fs.existsSync(this.databaseDirectory)) {
      fs.mkdirSync(this.databaseDirectory, { recursive: true });
      this.log.info(`Created database folder: ${this.databaseDirectory}`);
    }
    if (!fs.existsSync(this.databaseFilePath)) {
      fs.writeFileSync(this.databaseFilePath, "");
      this.log.info(`Initialized new SQLite file: ${this.databaseFilePath}`);
    }
  }

  /** Close connection */
  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.log.info("Closed SQLite connection.");
      this.connection = null;
    }
  }
}

/* ------------------------------------------------------------
   ✅ Lazy loader that makes DatabaseService behave synchronously
   ------------------------------------------------------------ */
let cachedDatabase: DatabaseService | null = null;

export async function databaseReady(): Promise<DatabaseService> {
  if (!cachedDatabase) cachedDatabase = await DatabaseService.getInstance();
  return cachedDatabase;
}

/**
 * ✅ Synchronous-style export
 * (auto-initializes on import — safe for top-level usage)
 */
let database: DatabaseService;
(async () => {
  database = await databaseReady();
})();
export { database };
