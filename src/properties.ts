import { promises as fs } from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { Map } from './types';

/**
 * Centralized, singleton application properties/configuration.
 */
export class Properties {
	/**
	 * Singleton instance
	 */
	private static instance: Properties;

	/**
	 * Properties
	 */
	private readonly map: Map<string, any>;

	/**
	 * Constructor
	 */
	private constructor() {
		this.map = new Map();
	}

	/**
	 * Returns the singleton, initializing on first call.
	 */
	public static async getInstance(): Promise<Properties> {
		if (!Properties.instance) {
			Properties.instance = new Properties();
			await Properties.instance.initialize();
		}

		return Properties.instance;
	}

	/**
	 * Load everything in order.
	 */
	private async initialize(): Promise<void> {
		this.initialLoad();
		this.loadFromConstants();
		await this.loadFromConfigurationFiles();
		await this.loadFromDatabase();
		this.loadFromEnvironmentVariables();
		this.defineExtraProperties();
	}

	/**
	 * Initial load
	 */
	private initialLoad(): void {
		this.map.setIn('paths.root', process.cwd());
		this.map.setIn('paths.resources', path.join(this.get<string>('paths.root'), 'resources'));
		this.map.setIn('paths.resources.configuration', path.join(this.get<string>('paths.resources'), 'configuration'));
	}

	/**
	 * Load from constants
	 */
	private loadFromConstants(): void {
	}

	/**
	 * Load from configuration files
	 */
	private async loadFromConfigurationFiles(): Promise<void> {
		const configurationFolder = this.get<string>('paths.resources.configuration');

		let configuration: Map<string, any> = new Map<string, any>();

		const loadYaml = async (file: string): Promise<Map<string, any>> => {
			const content = await fs.readFile(path.join(configurationFolder, file), 'utf8');

			return new Map<string, any>(parse(content));
		};

		configuration = configuration.mergeDeep(await loadYaml('main.yaml'));
		configuration = configuration.mergeDeep(await loadYaml('common.yaml'));

		// override env if set
		const environment = process.env.ENVIRONMENT || configuration.getIn('environment');
		if (environment) {
			configuration.setIn('environment', environment);
			configuration = configuration.mergeDeep(await loadYaml(configuration.getIn<string>(`${environment}.yml`)));
		}

		this.map.mergeDeep(configuration);
	}

	/**
	 * Load from database
	 */
	private async loadFromDatabase(): Promise<void> {
	}

	/**
	 * Load from environment variables
	 */
	private loadFromEnvironmentVariables(): void {
		const parseEnvironmentVariableValue = (value?: string): any => {
			if (!value) return value;

			if (/^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';

			if (!isNaN(Number(value))) return Number(value);

			try {
				return JSON.parse(value);
			} catch {
			}

			return value;
		}

		for (let [key, value] of Object.entries(process.env)) {
			key = key.toLowerCase();

			this.map.setIn(key, parseEnvironmentVariableValue(value));
		}
	}

	/**
	 * Define extra properties
	 */
	private defineExtraProperties(): void {
	}

	/**
	 * Retrieve a value or throw if missing.
	 * @param key
	 * @returns
	 */
	public get<T = any>(key: string): T {
		const value = this.getOrDefault<T>(key);

		if (value === undefined) {
			throw new Error(`Property "${key}" not found.`);
		}

		return value;
	}

	/**
	 * Retrieve a value or return default.
	 * @param key
	 * @param defaultValue
	 * @returns
	 */
	public getOrDefault<T = any>(key: string, defaultValue?: T): T | undefined {
		let result: T | undefined = this.map.getIn(key);

		if (result) {
			return result;
		}

		const modifiedKey = key.toLowerCase().replace(/\./g, '_');

		result = this.map.getIn(modifiedKey);

		if (result) {
			return result;
		}

		return defaultValue;
	}

	/**
	 * Like getOrDefault but *always* returns T (never undefined).
	 * Use when you know a default.
	 * @param key
	 * @param defaultValue
	 * @returns
	 */
	public getAs<T>(key: string, defaultValue?: T): T {
		const value = this.getOrDefault<T>(key, defaultValue);

		return value as T;
	}

	// noinspection JSUnusedGlobalSymbols
	/**
	 * Set a value
	 * @param key
	 * @param value
	 */
	public set(key: string, value: any): void {
		this.map.setIn(key, value);
	}
}

/**
 * Singleton instance of properties
 */
export const properties = await Properties.getInstance();
