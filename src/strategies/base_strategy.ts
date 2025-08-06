import { StrategyStatus } from "../types";

/**
 * Base strategy interface
 */
export interface BaseStrategy {
	/**
	 * Strategy status
	 */
	status: StrategyStatus;

	/**
	 * Initialize the strategy
	 */
	initialize(options: {}): Promise<void>;

	/**
	 * Run the strategy
	 */
	run(options: {}): Promise<void>;

	/**
	 * Stop the strategy
	 */
	stop(options: {}): Promise<void>;
}
