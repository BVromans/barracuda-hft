import { Map } from "immutable";
import { MMap, StrategyStatus } from "../types";
import { BaseStrategy } from "./base_strategy";

/**
 * Pure market marking strategy
 */
export class PureMarketMarking implements BaseStrategy {

	status: StrategyStatus;

	private readonly state: Map<string, any> = MMap<string, any>();

	constructor(private readonly options: {}) {
		this.status = StrategyStatus.CREATED;
	}

	async initialize(options: {}) {
		this.status = StrategyStatus.INITIALIZING;

		await this.startRepeatingTasks(options);

		this.status = StrategyStatus.IDLE;
	}

	async run(options: {}) {
		try {
			if (this.status !== StrategyStatus.IDLE) return;

			this.status = StrategyStatus.RUNNING;
		} catch (exception) {
			throw exception;
		} finally {
			if (this.status === StrategyStatus.RUNNING) {
				this.status = StrategyStatus.IDLE;
			}
		}
	}

	async stop(options: {}) {
		try {
			this.status = StrategyStatus.STOPPING;

			await this.stopRepeatingTasks(options);
		} catch (exception) {
			throw exception;
		} finally {
			this.status = StrategyStatus.STOPPED;
		}
	}

	private async startRepeatingTasks(options: {}) {
	}

	private async stopRepeatingTasks(options: {}) {
	}
}
