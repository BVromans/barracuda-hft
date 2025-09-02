import * as path from "path";
import * as fs from "fs";
import { Database as BunSqliteDatabase } from "bun:sqlite";
import { properties } from "./properties";
import { Map, List } from 'immutable';
import { MList, MMap } from './extensions/immutablejs';

/**
 * Connection type selector for database operations.
 */
export enum ConnectionType {
	READ_WRITE = 0,
	READ_ONLY = 1,
}

/**
 * Centralized, singleton application database service.
 *
 * - Provides read-write and read-only SQLite connections.
 * - All result lists are returned as `List` constructed via `MList`.
 * - All result rows are returned as `Map` constructed via `MMap`.
 * - Errors surface as exceptions; no silent handling.
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
	}

	/**
	 * Returns the singleton, initializing on first call.
	 */
	public static getInstance(): Database {
		if (!Database.instance) {
			Database.instance = new Database();

			Database.instance.initialize();
		}

		return Database.instance;
	}

	/**
	 * Establish read-write and read-only connections.
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
	 * Initialize the database
	 */
	private initialize(): void {
		this.connect();

		this.mutate(`
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
			)
		`);
	}

	/**
	 * Close any open connections.
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
	 * Determine if a query uses named parameters.
	 */
	private isNamedParameterQuery(query: string): boolean {
		return /[:@$][A-Za-z_][A-Za-z0-9_]*/.test(query);
	}

	/**
	 * Extract named parameter tokens from a query (e.g. ":name", "$count", "@id").
	 */
	private extractNamedParameterTokens(query: string): string[] {
		const tokens = new Set<string>();
		const regex = /([:@$][A-Za-z_][A-Za-z0-9_]*)/g;
		let match: RegExpExecArray | null;
		while ((match = regex.exec(query)) !== null) {
			tokens.add(match[1]);
		}
		return Array.from(tokens);
	}

	/**
	 * Normalize a single named-parameter object to keys that exactly match the placeholders used in the query.
	 */
	private normalizeNamedParameters(query: string, input: Record<string, unknown> | Map<string, unknown>): Record<string, unknown> {
		const tokens = this.extractNamedParameterTokens(query);
		if (tokens.length === 0) {
			return Map.isMap(input) ? (input as Map<string, unknown>).toObject() : input;
		}

		const source = Map.isMap(input) ? (input as Map<string, unknown>).toObject() : input;
		const normalized: Record<string, unknown> = {};
		for (const token of tokens) {
			const name = token.slice(1);
			if (Object.prototype.hasOwnProperty.call(source, token)) {
				normalized[token] = (source as any)[token];
			} else if (Object.prototype.hasOwnProperty.call(source, name)) {
				normalized[token] = (source as any)[name];
			}
		}
		return normalized;
	}

	/**
	 * Execute a database query.
	 *
	 * - For SELECT/PRAGMA queries, returns a `List` of `Map` (rows).
	 * - For other statements, returns an empty `List`.
	 *
	 * @param connectionType Choose read/write or read-only connection
	 * @param query SQL query text
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 */
	public execute(
		connectionType: ConnectionType,
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): List<Map<string, unknown>> {
		const connection = connectionType === ConnectionType.READ_WRITE ? this.readWriteConnection : this.readOnlyConnection;
		if (!connection) {
			throw new Error("Database connections are not initialized");
		}

		const statement = connection.prepare(query);
		const isSelect = /^\s*(select|pragma)\b/i.test(query);
		const isNamed = this.isNamedParameterQuery(query);

		if (parameters === undefined) {
			if (isSelect) {
				const rows = statement.all() as Array<Record<string, unknown>>;

				return this.convertRowsToImmutableList(rows);
			}

			statement.run();

			return MList<Map<string, unknown>>();
		}

		// Immutable List of parameters
		if (List.isList(parameters)) {
			const parameterList = parameters as List<any>;
			if (parameterList.size === 0) {
				if (isSelect) {
					const rows = statement.all() as Array<Record<string, unknown>>;
					return this.convertRowsToImmutableList(rows);
				}
				(statement as any).run([]);
				return MList<Map<string, unknown>>();
			}

			const firstValue = parameterList.get(0);
			if (firstValue !== null && typeof firstValue === 'object' && !Array.isArray(firstValue)) {
				// List of named parameter maps
				if (isSelect) {
					let aggregated: Array<Record<string, unknown>> = [];
					for (const params of parameterList.toArray() as Array<Record<string, unknown>>) {
						const bound = isNamed ? this.normalizeNamedParameters(query, params) : params;
						const rows = (statement as any).all(bound) as Array<Record<string, unknown>>;
						aggregated = aggregated.concat(rows);
					}
					return this.convertRowsToImmutableList(aggregated);
				} else {
					for (const params of parameterList.toArray() as Array<Record<string, unknown>>) {
						const bound = isNamed ? this.normalizeNamedParameters(query, params) : params;
						(statement as any).run(bound);
					}
					return MList<Map<string, unknown>>();
				}
			}

			// Positional parameters as a List
			const positional = parameterList.toArray();
			if (isSelect) {
				const rows = (statement as any).all(positional as any) as Array<Record<string, unknown>>;
				return this.convertRowsToImmutableList(rows);
			}
			(statement as any).run(positional as any);
			return MList<Map<string, unknown>>();
		}

		// Array of named parameter objects
		if (Array.isArray(parameters) && parameters.length > 0 && typeof parameters[0] === "object" && parameters[0] !== null && !Array.isArray(parameters[0])) {
			if (isSelect) {
				let aggregated: Array<Record<string, unknown>> = [];
				for (const params of parameters as Array<Record<string, unknown>>) {
					const bound = isNamed ? this.normalizeNamedParameters(query, params) : params;
					const rows = (statement as any).all(bound) as Array<Record<string, unknown>>;
					aggregated = aggregated.concat(rows);
				}

				return this.convertRowsToImmutableList(aggregated);
			} else {
				for (const params of parameters as Array<Record<string, unknown>>) {
					const bound = isNamed ? this.normalizeNamedParameters(query, params) : params;
					(statement as any).run(bound);
				}

				return MList<Map<string, unknown>>();
			}
		}

		// Immutable Map of named parameters
		if (Map.isMap(parameters)) {
			const named = isNamed ? this.normalizeNamedParameters(query, parameters as Map<string, unknown>) : (parameters as Map<string, unknown>).toObject();
			if (isSelect) {
				const rows = (statement as any).all(named as any) as Array<Record<string, unknown>>;
				return this.convertRowsToImmutableList(rows);
			}
			(statement as any).run(named as any);
			return MList<Map<string, unknown>>();
		}

		// Plain object of named parameters
		if (parameters !== null && typeof parameters === 'object' && !Array.isArray(parameters)) {
			const named = isNamed ? this.normalizeNamedParameters(query, parameters as Record<string, unknown>) : (parameters as Record<string, unknown>);
			if (isSelect) {
				const rows = (statement as any).all(named as any) as Array<Record<string, unknown>>;
				return this.convertRowsToImmutableList(rows);
			}
			(statement as any).run(named as any);
			return MList<Map<string, unknown>>();
		}

		if (isSelect) {
			const rows = (statement as any).all(parameters as any) as Array<Record<string, unknown>>;

			return this.convertRowsToImmutableList(rows);
		}

		(statement as any).run(parameters as any);

		return MList<Map<string, unknown>>();
	}

	/**
	 * Select a single row from the database.
	 * @param query SQL query text
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 * @returns First row as `Map` or `undefined` if none
	 */
	public select_single(
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): Map<string, unknown> | undefined {
		const rows = this.execute(ConnectionType.READ_ONLY, query, parameters);

		const first = rows.get(0);
		if (!first) return undefined;
		return first;
	}

	/**
	 * Select multiple rows from the database.
	 * @param query SQL query text
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 * @returns Rows as a `List` of `Map`
	 */
	public select(
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): List<Map<string, unknown>> {
		return this.execute(ConnectionType.READ_ONLY, query, parameters);
	}

	/**
	 * Insert rows into the database.
	 * @param query SQL insert statement
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 * @returns Empty `List` (SQLite run result not mapped)
	 */
	public insert(
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): List<Map<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Update existing rows in the database.
	 * @param query SQL update statement
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 * @returns Empty `List` (SQLite run result not mapped)
	 */
	public update(
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): List<Map<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Delete rows from the database.
	 * @param query SQL delete statement
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 * @returns Empty `List` (SQLite run result not mapped)
	 */
	public delete(
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): List<Map<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Execute DDL statements like CREATE/DROP/ALTER.
	 * @param query SQL DDL statement
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 * @returns Empty `List`
	 */
	public create(
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): List<Map<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Execute any mutating statement (insert/update/delete/etc.).
	 * @param query SQL statement
	 * @param parameters Optional parameters (named or positional). Accepts `Map`, `List`, arrays, or plain objects.
	 * @returns Empty `List` (SQLite run result not mapped)
	 */
	public mutate(
		query: string,
		parameters?:
			Record<string, unknown>
			| Map<string, unknown>
			| List<Record<string, unknown>>
			| Array<Record<string, unknown>>
			| List<unknown>
			| unknown[]
	): List<Map<string, unknown>> {
		return this.execute(ConnectionType.READ_WRITE, query, parameters);
	}

	/**
	 * Commit the current transaction.
	 */
	public commit(): void {
		if (!this.readWriteConnection) return;

		this.readWriteConnection.exec("COMMIT");
	}

	/**
	 * Roll back the current transaction.
	 */
	public rollback(): void {
		if (!this.readWriteConnection) return;

		this.readWriteConnection.exec("ROLLBACK");
	}

	/**
	 * Ensure the database directory and file exist, creating them if necessary.
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
	 * Convert plain row objects returned by SQLite into an immutable `List` of immutable `Map`.
	 * @param rows Array of plain row objects
	 */
	private convertRowsToImmutableList(rows: Array<Record<string, unknown>>): List<Map<string, unknown>> {
		return MList<Map<string, unknown>>(rows.map((row) => MMap<string, unknown>(row as Record<string, unknown>)));
	}
}

/**
 * Singleton instance of database
 */
export const database = Database.getInstance();
