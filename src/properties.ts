/**
 * Singleton class for properties
 */
class Properties {

	/**
	 * Singleton instance
	 */
	private static instance: Properties;

	/**
	 * Properties
	 */
	private readonly properties: Map<string, any>;

	/**
	 * Constructor
	 */
	private constructor() {
		this.properties = new Map<string, any>();
	}

	/**
	 * Get the singleton instance
	 * @returns The singleton instance
	 */
	public static async getInstance(): Promise<Properties> {
		if (!Properties.instance) {
			Properties.instance = new Properties();
			await Properties.instance.initialize();
		}

		return Properties.instance;
	}

	/**
	 * Initialize the properties
	 */
	public async initialize(): Promise<void> {
	}

	public get(key: string): any {
		return this.properties.get(key);
	}

	public set(key: string, value: any): void {
		this.properties.set(key, value);
	}
}

/**
 * Singleton instance of the properties
 */
export const properties = await Properties.getInstance();
