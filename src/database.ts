import * as path from "path";
import * as fs from "fs";

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
	 * Constructor
	 */
	private constructor() {
		this.databaseDirectory = path.join(process.cwd(), "database");
		this.ensureLogDatabaseFileExists();
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
			fs.writeFileSync(path.join(this.databaseDirectory, "database.sqlite"), "");
		}
	}
}

/**
 * Singleton instance of database
 */
export const database = Database.getInstance();
