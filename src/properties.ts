import { readFileSync } from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { Map } from 'immutable';
import { MMap } from './extensions/immutablejs';

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
		this.map = MMap<string, any>();
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
		this.map.set('paths.root.path', process.cwd());
		this.map.set('paths.resources.path', path.join(this.map.get('paths.root.path'), 'resources'));
		this.map.set('paths.resources.configuration.path', path.join(this.map.get('paths.resources.path'), 'configuration'));
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
		const configurationFolder = this.get<string>('paths.resources.configuration.path');

		let configuration: Map<string, any> = Map<string, any>().asMutable();

		const loadYaml = (file: string): Map<string, any> => {
			const content = readFileSync(path.join(configurationFolder, file), 'utf8');

			return Map<string, any>(parse(content)).asMutable();
		};

		configuration = configuration.mergeDeep(loadYaml('main.yml'));
		configuration = configuration.mergeDeep(loadYaml('common.yml'));

		// override env if set
		const environment = process.env.ENVIRONMENT || configuration.get('environment');
		if (environment) {
			configuration = configuration.mergeDeep(loadYaml(`${environment}.yml`));
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

			this.map.set(key, parseEnvironmentVariableValue(value));
		}
	}

	/**
	 * Define extra properties
	 */
	private defineExtraProperties(): void {
		this.map.set('retry.default.maximumNumberOfRetries', 3);
		this.map.set('retry.default.delayBetweenRetries', 1000);
		this.map.set('retry.default.timeout', 30000);
		this.map.set('retry.default.timeoutErrorMessage', 'Timeout exceeded.');

		this.map.set('cache.default.ttlSeconds', 6 * 60 * 60);
		this.map.set('cache.default.cacheKey', (request: any) => request.toString());

		this.map.set('cache.rujira.fin.getAllTokens', 6 * 60 * 60);
		this.map.set('cache.rujira.fin.getAllMarkets', 6 * 60 * 60);

		this.map.set('constant.rujira.markets.active', 'LIVE');
	}

	/**
	 * Retrieve a value or throw if missing.
	 * @param key
	 * @returns
	 */
	public get<T = any>(key: string): T {
		const value = this.getOrDefault(key);

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
		let result: T | undefined = this.map.get(key);

		if (result !== undefined) {
			return result;
		}

		const modifiedKey = key.toLowerCase().replace(/\./g, '_');

		result = this.map.get(modifiedKey);

		if (result !== undefined) {
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
		this.map.set(key, value);
	}
}

/**
 * Singleton instance of properties
 */
export const properties = await Properties.getInstance();
