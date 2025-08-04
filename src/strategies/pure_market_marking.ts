import { Map } from "immutable";
import { MMap, StrategyStatus } from "../types";
import { BaseStrategy } from "./base_strategy";
import { runAndRepeat } from "../utils";
import { properties } from "../properties";

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

		try {
			await this.cancelAllOrdersIfWanted(options);
		} catch (exception) {
			throw exception;
		} finally {
			try {
				await this.withdrawAllFilledOrdersIfWanted(options);
			} catch (exception) {
				throw exception;
			} finally {
				await this.startRepeatingTasks(options);
			}
		}

		this.status = StrategyStatus.IDLE;
	}

	async run(options: {}) {
		try {
			if (this.status !== StrategyStatus.IDLE) return;

			await this.updateBalances(options);
			await this.updateOrderBook(options);
			await this.updateOrders(options);
			await this.createProposal(options);
			await this.applyProposal(options);
			await this.updateBalances(options);
			await this.updateSummary(options);

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

			try {
				await this.stopRepeatingTasks(options);
			} catch (exception) {
				throw exception;
			} finally {
				try {
					await this.cancelAllOrdersIfWanted(options);
				} catch (exception) {
					throw exception;
				} finally {
					await this.withdrawAllFilledOrdersIfWanted(options);
				}
			}
		} catch (exception) {
			throw exception;
		} finally {
			this.status = StrategyStatus.STOPPED;
		}
	}

	private async startRepeatingTasks(options: {}) {
		const tasks = MMap<string, NodeJS.Timeout>();

		this.state.set('tasks', tasks);

		tasks.set(
			'updateTokens',
			await runAndRepeat(
				this.updateTokens.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.updateTokens.interval')
			)
		);

		tasks.set(
			'updateMarkets',
			await runAndRepeat(
				this.updateMarkets.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.updateMarkets.interval')
			)
		);

		tasks.set(
			'updateIndicators',
			await runAndRepeat(
				this.updateIndicators.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.updateIndicators.interval')
			)
		);

		tasks.set(
			'updateBalances',
			await runAndRepeat(
				this.updateBalances.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.updateBalances.interval')
			)
		);

		tasks.set(
			'updateOrders',
			await runAndRepeat(
				this.updateOrders.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.updateOrders.interval')
			)
		);

		tasks.set(
			'updateSummary',
			await runAndRepeat(
				this.updateSummary.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.updateSummary.interval')
			)
		);
	}

	private async stopRepeatingTasks(options: {}) {
		const tasks = this.state.getOrThrow('tasks').valueSeq().toArray();

		if (tasks) {
			tasks.forEach((task: NodeJS.Timeout) => clearInterval(task));
		}

		this.state.delete('tasks');
	}

	private async updateTokens(options: {}) {
	}

	private async updateMarkets(options: {}) {
	}

	private async updateOrderBook(options: {}) {
	}

	private async updateIndicators(options: {}) {
	}

	private async updateBalances(options: {}) {
	}

	private async updateOrders(options: {}) {
	}

	private async updateSummary(options: {}) {
	}

	private async cancelAllOrdersIfWanted(options: {}) {
	}

	private async withdrawAllFilledOrdersIfWanted(options: {}) {
	}

	private async createProposal(options: {}) {
	}

	private async applyProposal(options: {}) {
	}
}
