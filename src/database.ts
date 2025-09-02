import * as path from "path";
import * as fs from "fs";
import { Database as BunSqliteDatabase } from "bun:sqlite";
import { properties } from "./properties";

/**
 * Connection type
 */
export enum ConnectionType {
	READ_WRITE = 0,
	READ_ONLY = 1,
}

/**
 * Centralized, singleton application Database.
 */
export class Database {
	/**
	 * Singleton instance
	 */
	private static instance: Database;

	/**
	 * Database directory path
	 */
	private readonly databaseDirectory: string;

	/**
	 * Database file path
	 */
	private readonly databaseFilePath: string;

	/**
	 * Read-write connection
	 */
	private readWriteConnection: BunSqliteDatabase | null = null;

	/**
	 * Read-only connection
	 */
	private readOnlyConnection: BunSqliteDatabase | null = null;

	/**
	 * Constructor
	 */
	private constructor() {
		this.databaseDirectory = properties.get('paths.resources.database.path');
		this.databaseFilePath = path.join(this.databaseDirectory, "database.sqlite");

		this.ensureLogDatabaseFileExists();

		this.connect();
	}

	/**
	 * Returns the singleton, initializing on first call.
	 */
	public static getInstance(): Database {
		if (!Database.instance) {
			Database.instance = new Database();
		}

		return Database.instance;
	}

	/**
	 * Ensures the database directory exists, creating it if necessary
	 */
	private ensureLogDatabaseFileExists(): void {
		if (!fs.existsSync(this.databaseDirectory)) {
			fs.mkdirSync(this.databaseDirectory, { recursive: true });
		}

		if (!fs.existsSync(this.databaseFilePath)) {
			fs.writeFileSync(this.databaseFilePath, "");
		}
	}

	/**
	 * Establishes read-write and read-only connections
	 */
	private connect(): void {
		if (this.readWriteConnection == null) {
			this.readWriteConnection = new BunSqliteDatabase(this.databaseFilePath);
		}

		if (this.readOnlyConnection == null) {
			// Try to open an immutable, read-only handle when possible
			try {
				this.readOnlyConnection = new BunSqliteDatabase(`file:${this.databaseFilePath}?immutable=1`, { readonly: true });
			} catch {
				this.readOnlyConnection = new BunSqliteDatabase(this.databaseFilePath, { readonly: true });
			}
		}
	}

	/**
	 * Closes connections
	 */
	public close(): void {
		if (this.readWriteConnection) {
			this.readWriteConnection.close();
			this.readWriteConnection = null;
		}
		if (this.readOnlyConnection) {
			this.readOnlyConnection.close();
			this.readOnlyConnection = null;
		}
	}

	/**
	 * Executes a database query
	 */
	public execute(connectionType: ConnectionType, query: string, parameters?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[]): Array<Record<string, unknown>> {
		const connection = connectionType === ConnectionType.READ_WRITE ? this.readWriteConnection : this.readOnlyConnection;
		if (!connection) {
			throw new Error("Database connections are not initialized");
		}

		const statement = connection.prepare(query);
		const results: Array<Record<string, unknown>> = [];
		const isSelect = /^\s*(select|pragma)\b/i.test(query);

		if (parameters === undefined) {
			if (isSelect) {
				return statement.all() as Array<Record<string, unknown>>;
			}
			statement.run();
			return results;
		}

		if (Array.isArray(parameters) && parameters.length > 0 && typeof parameters[0] === "object" && parameters[0] !== null) {
			for (const params of parameters as Array<Record<string, unknown>>) {
				if (isSelect) {
					const rows = (statement as any).all(params) as Array<Record<string, unknown>>;
					for (const row of rows) results.push(row);
				} else {
					(statement as any).run(params);
				}
			}
			return results;
		}

		if (isSelect) {
			return (statement as any).all(parameters as any) as Array<Record<string, unknown>>;
		}

		(statement as any).run(parameters as any);
		return results;
	}

	/**
	 * Selects a single row from the database
	 * @param query - The query to execute
	 * @param parameters - The parameters to pass to the query
	 * @returns The first row from the database
	 */
	public select_single(query: string, parameters?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[]): Record<string, unknown> {
		const rows = this.execute(ConnectionType.READ_ONLY, query, parameters);
		return rows[0];
	}

	/**
	 * Selects multiple rows from the database
	 * @param query - The query to execute
	 * @param parameters - The parameters to pass to the query
	 * @returns The rows from the database
	 */
	public select(query: string, parameters?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[]): Array<Record<string, unknown>> {
		return this.execute(ConnectionType.READ_ONLY, query, parameters);
	}

	/**
	 * Inserts a new row into the database
	 * @param query - The query to execute
	 * @param parameters - The parameters to pass to the query
	 * @returns The rows from the database
	 */
	public insert(query: string, parameters?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[]): Array<Record<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Updates an existing row in the database
	 * @param query - The query to execute
	 * @param parameters - The parameters to pass to the query
	 * @returns The rows from the database
	 */
	public update(query: string, parameters?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[]): Array<Record<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Deletes a row from the database
	 * @param query - The query to execute
	 * @param parameters - The parameters to pass to the query
	 * @returns The rows from the database
	 */
	public delete(query: string, parameters?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[]): Array<Record<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Mutates the database
	 * @param query - The query to execute
	 * @param parameters - The parameters to pass to the query
	 * @returns The rows from the database
	 */
	public mutate(query: string, parameters?: Record<string, unknown> | Array<Record<string, unknown>> | unknown[]): Array<Record<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Commits the current transaction
	 * @returns The rows from the database
	 */
	public commit(): void {
		if (!this.readWriteConnection) return;

		this.readWriteConnection.exec("COMMIT");
	}

	/**
	 * Rolls back the current transaction
	 * @returns The rows from the database
	 */
	public rollback(): void {
		if (!this.readWriteConnection) return;

		this.readWriteConnection.exec("ROLLBACK");
	}
}

/**
 * Singleton instance of database
 */
export const database = Database.getInstance();
