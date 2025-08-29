import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { loggedClass } from "../annotations";
import { logger } from "../logger";
import { properties } from "../properties";
import { Rujira } from "../rujira";
import { Balances, Candle, CandleInterval, CandleTimestamp, DECIMAL_100, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Market, MarketSymbol, MList, MMap, Order, OrderId, OrderStatus, OrderType, RujiraConstructorOptions, StrategyStatus, TokenSymbol, WalletMnemonic, WalletPrivateKey } from "../types";
import { runAndRepeat, sleep } from "../utils";
import { BaseStrategy, Proposal } from "./base_strategy";

/**
 * Pure market making strategy
 */
@loggedClass({
	enabled: false,
	logger: logger,
	allowedMethods: [
		'initialize',
		'run',
		'stop',
		'createProposal',
		'applyProposal',
		'startRepeatingTasks',
		'stopRepeatingTasks',
		// 'updateTokens',
		// 'updateMarkets',
		// 'updateOrderBook',
		// 'updateIndicators',
		'updateBalances',
		'updateOrders',
		'updateSummary',
		// 'monitorProfitAndLoss',
		'cancelAllOrdersIfConfigured',
		'withdrawAllFilledOrdersIfConfigured',
	],
	disallowedMethods: [
	],
	includeStaticMethods: true,
	logStart: true,
	logEnd: true,
	logInput: false,
	logOutput: false,
	logExecutionTime: true,
})
export abstract class BasePureMarketMakingStrategy implements BaseStrategy {

	/**
	 * Status of the strategy
	 */
	public status: StrategyStatus;

	/**
	 * Rujira instance
	 */
	protected readonly rujira: Rujira;

	/**
	 * State of the strategy
	 */
	protected readonly state: Map<string, any> = MMap<string, any>({}, '.');

	/**
	 * Constructor
	 * @param options - Options for the strategy
	 */
	constructor(options: {
		walletMnemonic?: WalletMnemonic | undefined;
		walletPrivateKey?: WalletPrivateKey | undefined;
	}) {
		this.rujira = new Rujira({
			walletMnemonic: options.walletMnemonic ?? properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
			walletPrivateKey: options.walletPrivateKey ?? properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
		} as RujiraConstructorOptions);

		this.status = StrategyStatus.CREATED;
	}

	/**
	 * Initialize the strategy
	 * @param _options - Options for the strategy
	 */
	async initialize(_options: {}) {
		try {
			logger.info("Initializing strategy...");

			this.status = StrategyStatus.INITIALIZING;

			await this.rujira.initialize({});

			const tickInterval = Number(properties.getAs<number>('strategy.pure_market_making.common.tickInterval'));

			this.state.set('tickInterval', tickInterval);

			const market = await this.rujira.fin.getMarket({
				symbol: properties.getAs<MarketSymbol>('strategy.pure_market_making.common.market')
			});

			this.state.set('market', market);

			this.state.set('summary.market.symbol', market.symbol);
			this.state.set('summary.balances.initial.base', DECIMAL_NaN);
			this.state.set('summary.balances.initial.quote', DECIMAL_NaN);
			this.state.set('summary.balances.initial.native', DECIMAL_NaN);
			this.state.set('summary.balances.initial.feePayment', DECIMAL_NaN);
			this.state.set('summary.balances.initial.usd', DECIMAL_NaN);
			this.state.set('summary.balances.initial.total', DECIMAL_NaN);
			this.state.set('summary.balances.previous.base', DECIMAL_NaN);
			this.state.set('summary.balances.previous.quote', DECIMAL_NaN);
			this.state.set('summary.balances.previous.native', DECIMAL_NaN);
			this.state.set('summary.balances.previous.feePayment', DECIMAL_NaN);
			this.state.set('summary.balances.previous.usd', DECIMAL_NaN);
			this.state.set('summary.balances.previous.total', DECIMAL_NaN);
			this.state.set('summary.balances.current.base', DECIMAL_NaN);
			this.state.set('summary.balances.current.quote', DECIMAL_NaN);
			this.state.set('summary.balances.current.native', DECIMAL_NaN);
			this.state.set('summary.balances.current.feePayment', DECIMAL_NaN);
			this.state.set('summary.balances.current.usd', DECIMAL_NaN);
			this.state.set('summary.balances.current.total', DECIMAL_NaN);
			this.state.set('summary.profitAndLoss.currentToInitial.absolute', DECIMAL_NaN);
			this.state.set('summary.profitAndLoss.currentToPrevious.absolute', DECIMAL_NaN);
			this.state.set('summary.profitAndLoss.currentToInitial.percentage', DECIMAL_NaN);
			this.state.set('summary.profitAndLoss.currentToPrevious.percentage', DECIMAL_NaN);

			const candles = await this.rujira.fin.getCandles({
				market: market,
				after: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
				before: new Date(), // Now
				interval: CandleInterval.ONE_MINUTE
			});
			this.state.set('candles', candles);

			await this.cancelAllOrdersIfConfigured({});
			await this.withdrawAllFilledOrdersIfConfigured({});

			await this.startRepeatingTasks({});

			await this.updateBalances({});
			await this.updateSummary({});

			this.status = StrategyStatus.IDLE;

			logger.info("Strategy initialized successfully.");
		} catch (exception) {
			logger.error("Strategy failed to initialize.");

			throw exception;
		}
	}

	/**
	 * Run the strategy
	 * @param _options - Options for the strategy
	 */
	async run(_options: {}) {
		while (true) {
			try {
				if (this.status !== StrategyStatus.IDLE) return;

				logger.info("Initiating new cycle...");

				this.status = StrategyStatus.RUNNING;

				await this.updateOrders({});
				await this.updateBalances({});

				await this.createProposal({});
				await this.applyProposal({});

				await this.updateBalances({});
				await this.updateSummary({});

				logger.info("Cycle completed successfully.");
			} catch (exception) {
				logger.error("Cycle failed.");

				logger.ignoreException(exception);
			} finally {
				if (this.status === StrategyStatus.RUNNING) {
					const tickInterval = this.state.getOrThrow('tickInterval');

					logger.info(`Waiting for ${Decimal(tickInterval).div(Decimal(1000)).toFixed(2)}s before next cycle...`);

					await sleep(tickInterval);

					this.status = StrategyStatus.IDLE;
				}
			}
		}
	}

	/**
	 * Stop the strategy
	 * @param _options - Options for the strategy
	 */
	async stop(_options: {}) {
		try {
			this.status = StrategyStatus.STOPPING;

			await this.stopRepeatingTasks({});
		} catch (exception) {
			throw exception;
		} finally {
			try {
				await this.cancelAllOrdersIfConfigured({});
			} catch (exception) {
				throw exception;
			} finally {
				try {
					await this.withdrawAllFilledOrdersIfConfigured({});
				} catch (exception) {
					throw exception;
				} finally {
					this.status = StrategyStatus.STOPPED;
				}
			}
		}
	}

	/**
	 * Create a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	protected async createProposal(_options: {}) {
		throw new Error('Not implemented');
	}

	/**
	 * Apply a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	private async applyProposal(_options: {}) {
		const market: Market = this.state.getOrThrow('market');
		const proposal: Proposal = this.state.getOrThrow('proposal');

		if (
			!proposal ||
			(
				(
					!proposal.place ||
					(Array.isArray(proposal.place) ? proposal.place.length === 0 : proposal.place.isEmpty())
				) &&
				(
					!proposal.replace ||
					(Array.isArray(proposal.replace) ? proposal.replace.length === 0 : proposal.replace.isEmpty())
				) &&
				(
					!proposal.cancel ||
					(proposal.cancel instanceof List ? (proposal.cancel as List<OrderId | Order>).isEmpty() : (proposal.cancel as (OrderId[] | Order[])).length === 0)
				) &&
				(
					!proposal.withdraw ||
					(proposal.withdraw instanceof List ? (proposal.withdraw as List<OrderId | Order>).isEmpty() : (proposal.withdraw as (OrderId[] | Order[])).length === 0)
				)
			)
		) {
			logger.debug(`No proposal to apply.`);

			return;
		}

		const result = await this.rujira.fin.persistOrders({
			ownerAddress: this.rujira.walletAddress,
			market: market,
			orders: proposal,
		});

		logger.debug(`Proposal applied successfully. Transactions:\n${result.transactions.keySeq().toJS().join('\n')}`);
	}

	/**
	 * Start repeating tasks for the strategy
	 * @param _options - Options for the strategy
	 */
	private async startRepeatingTasks(_options: {}) {
		const tasks = MMap<string, NodeJS.Timeout>();

		this.state.set('tasks', tasks);

		if (properties.getAs<number>('strategy.pure_market_making.common.tasks.updateTokens.interval')) {
			tasks.set(
				'updateTokens',
				await runAndRepeat(
					this.updateTokens.bind(this),
					properties.getAs<number>('strategy.pure_market_making.common.tasks.updateTokens.interval')
				)
			);
		}

		if (properties.getAs<number>('strategy.pure_market_making.common.tasks.updateMarkets.interval')) {
			tasks.set(
				'updateMarkets',
				await runAndRepeat(
					this.updateMarkets.bind(this),
					properties.getAs<number>('strategy.pure_market_making.common.tasks.updateMarkets.interval')
				)
			);
		}

		if (properties.getAs<number>('strategy.pure_market_making.common.tasks.updateOrderBook.interval')) {
			tasks.set(
				'updateOrderBook',
				await runAndRepeat(
					this.updateOrderBook.bind(this),
					properties.getAs<number>('strategy.pure_market_making.common.tasks.updateOrderBook.interval')
				)
			);
		}

		if (properties.getAs<number>('strategy.pure_market_making.common.tasks.updateIndicators.interval')) {
			tasks.set(
				'updateIndicators',
				await runAndRepeat(
					this.updateIndicators.bind(this),
					properties.getAs<number>('strategy.pure_market_making.common.tasks.updateIndicators.interval')
				)
			);
		}

		if (properties.getAs<number>('strategy.pure_market_making.common.tasks.monitorProfitAndLoss.interval')) {
			tasks.set(
				'monitorProfitAndLoss',
				await runAndRepeat(
					this.monitorProfitAndLoss.bind(this),
					properties.getAs<number>('strategy.pure_market_making.common.tasks.monitorProfitAndLoss.interval')
				)
			);
		}
	}

	/**
	 * Stop repeating tasks for the strategy
	 * @param _options - Options for the strategy
	 */
	private async stopRepeatingTasks(_options: {}) {
		const tasks = this.state.getOrThrow('tasks').valueSeq().toArray();

		if (tasks) {
			tasks.forEach((task: NodeJS.Timeout) => clearInterval(task));
		}

		this.state.delete('tasks');
	}

	/**
	 * Update the tokens of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateTokens(_options: {}) {
		try {
			const tokens = await this.rujira.fin.getAllTokens({});

			this.state.set("tokens", tokens);
		} catch (exception) {
			logger.ignoreException(exception);
		}
	}

	/**
	 * Update the markets of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateMarkets(_options: {}) {
		try {
			const markets = await this.rujira.fin.getAllMarkets({});

			this.state.set("markets", markets);
		} catch (exception) {
			logger.ignoreException(exception);
		}
	}

	/**
	 * Update the order book of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateOrderBook(_options: {}) {
		try {
			const market = this.state.getOrThrow('market');
			const orderBook = await this.rujira.fin.getOrderBook({
				market: market
			});

			this.state.set("orderBook", orderBook);
		} catch (exception) {
			logger.ignoreException(exception);
		}
	}

	/**
	 * Update the indicators of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateIndicators(_options: {}) {
		try {
			const market = this.state.getOrThrow('market');
			let candles: Map<CandleTimestamp, Candle> = this.state.getOrThrow('candles');

			const after = new Date(Date.now() - Number(properties.getAs<number>('strategy.pure_market_making.common.candles.updateLookbackInterval')));
			const before = new Date();

			const newCandles = await this.rujira.fin.getCandles({
				market: market,
				interval: CandleInterval.ONE_MINUTE,
				after,
				before
			});

			newCandles.forEach((candle: Candle) => {
				candles.set(candle.timestamp, candle);
			});

			candles = candles.slice(-Number(properties.getAs<number>('strategy.pure_market_making.common.candles.maximumNumberOfCandlesKept')));
			this.state.set('candles', candles);

			const indicators = await this.rujira.fin.getIndicators({
				market: market
			});

			this.state.set("indicators", indicators);
		} catch (exception) {
			logger.ignoreException(exception);
		}
	}

	/**
	 * Update the balances of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateBalances(_options: {}) {
		const market: Market = this.state.getOrThrow('market');

		const tokenSymbols = MList<TokenSymbol>([
			market.tokens.base.symbol,
			market.tokens.quote.symbol,
			this.rujira.fin.nativeToken.symbol,
			this.rujira.fin.feePaymentToken.symbol,
			this.rujira.fin.usdToken.symbol
		]).toSet().toList().asMutable();

		const balances = await this.rujira.fin.getBalances({
			walletAddress: this.rujira.walletAddress,
			tokenSymbols
		});

		this.state.set("balances", balances);
	}

	/**
	 * Update the orders of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateOrders(_options: {}) {
		const market: Market = this.state.getOrThrow('market');

		const orders = await this.rujira.fin.getOrders({
			ownerAddress: this.rujira.walletAddress,
			market: market,
			orderTypes: MList<OrderType>([
				OrderType.FIXED_PRICE,
			]),
			orderStatuses: MList<OrderStatus>([
				OrderStatus.OPEN,
				OrderStatus.CREATION_PENDING,
				OrderStatus.CANCELLATION_PENDING,
				OrderStatus.PARTIALLY_FILLED,
				OrderStatus.FILLED,
			]),
		});

		this.state.set("orders", orders);
	}

	/**
	 * Update the summary of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateSummary(_options: {}) {
		const market: Market = this.state.getOrThrow('market');
		const balances: Balances = this.state.getOrThrow('balances');

		if (!this.state.getOrThrow('summary.balances.initial.base').isFinite()) {
			this.state.set('summary.balances.initial.base', balances.tokens.getOrThrow(market.tokens.base.symbol).balances.token.total);
			this.state.set('summary.balances.initial.quote', balances.tokens.getOrThrow(market.tokens.quote.symbol).balances.token.total);
			this.state.set('summary.balances.initial.native', balances.tokens.getOrThrow(this.rujira.fin.nativeToken.symbol).balances.token.total);
			this.state.set('summary.balances.initial.feePayment', balances.tokens.getOrThrow(this.rujira.fin.feePaymentToken.symbol).balances.token.total);
			this.state.set('summary.balances.initial.usd', balances.tokens.getOrThrow(this.rujira.fin.usdToken.symbol).balances.token.total);
			this.state.set('summary.balances.initial.total', balances.total.usdToken.total);

			this.state.set('summary.balances.current.base', balances.tokens.getOrThrow(market.tokens.base.symbol).balances.token.total);
			this.state.set('summary.balances.current.quote', balances.tokens.getOrThrow(market.tokens.quote.symbol).balances.token.total);
			this.state.set('summary.balances.current.native', balances.tokens.getOrThrow(this.rujira.fin.nativeToken.symbol).balances.token.total);
			this.state.set('summary.balances.current.feePayment', balances.tokens.getOrThrow(this.rujira.fin.feePaymentToken.symbol).balances.token.total);
			this.state.set('summary.balances.current.usd', balances.tokens.getOrThrow(this.rujira.fin.usdToken.symbol).balances.token.total);
			this.state.set('summary.balances.current.total', balances.total.usdToken.total);
		} else {
			this.state.set('summary.balances.previous.base', this.state.getOrThrow('summary.balances.current.base'));
			this.state.set('summary.balances.previous.quote', this.state.getOrThrow('summary.balances.current.quote'));
			this.state.set('summary.balances.previous.native', this.state.getOrThrow('summary.balances.current.native'));
			this.state.set('summary.balances.previous.feePayment', this.state.getOrThrow('summary.balances.current.feePayment'));
			this.state.set('summary.balances.previous.usd', this.state.getOrThrow('summary.balances.current.usd'));
			this.state.set('summary.balances.previous.total', this.state.getOrThrow('summary.balances.current.total'));

			this.state.set('summary.balances.current.base', balances.tokens.getOrThrow(market.tokens.base.symbol).balances.token.total);
			this.state.set('summary.balances.current.quote', balances.tokens.getOrThrow(market.tokens.quote.symbol).balances.token.total);
			this.state.set('summary.balances.current.native', balances.tokens.getOrThrow(this.rujira.fin.nativeToken.symbol).balances.token.total);
			this.state.set('summary.balances.current.feePayment', balances.tokens.getOrThrow(this.rujira.fin.feePaymentToken.symbol).balances.token.total);
			this.state.set('summary.balances.current.usd', balances.tokens.getOrThrow(this.rujira.fin.usdToken.symbol).balances.token.total);
			this.state.set('summary.balances.current.total', balances.total.usdToken.total);

			this.state.set(
				'summary.profitAndLoss.currentToInitial.absolute',
				this.state.getOrThrow('summary.balances.current.total').minus(this.state.getOrThrow('summary.balances.initial.total'))
			);
			this.state.set(
				'summary.profitAndLoss.currentToPrevious.absolute',
				this.state.getOrThrow('summary.balances.current.total').minus(this.state.getOrThrow('summary.balances.previous.total'))
			);
			this.state.set(
				'summary.profitAndLoss.currentToInitial.percentage',
				this.state.getOrThrow('summary.profitAndLoss.currentToInitial.absolute').div(this.state.getOrThrow('summary.balances.initial.total')).mul(DECIMAL_100)
			);
			this.state.set(
				'summary.profitAndLoss.currentToPrevious.percentage',
				this.state.getOrThrow('summary.profitAndLoss.currentToPrevious.absolute').div(this.state.getOrThrow('summary.balances.previous.total')).mul(DECIMAL_100)
			);
		}

		const summary = this.state.get('summary').toJS();

		logger.info(`Summary:\n${dump(summary)}`);
	}

	/**
	 * Monitor the profit and loss of the strategy
	 * @param _options - Options for the strategy
	 */
	private async monitorProfitAndLoss(_options: {}) {
		try {
			const enabled = properties.getAs<boolean>('strategy.pure_market_making.common.monitorProfitAndLoss.enabled');

			if (enabled) {
				const maximumAllowedWalletLossFromInitialValue = Decimal(properties.getAs<number>('strategy.pure_market_making.common.monitorProfitAndLoss.maximumAllowedWalletLossFromInitialValue'));
				const maximumAllowedWalletLossFromPreviousValue = Decimal(properties.getAs<number>('strategy.pure_market_making.common.monitorProfitAndLoss.maximumAllowedWalletLossFromPreviousValue'));

				const currentToInitialProfitAndLoss: Decimal = this.state.getOrThrow('summary.profitAndLoss.currentToInitial.percentage');
				const currentToPreviousProfitAndLoss: Decimal = this.state.getOrThrow('summary.profitAndLoss.currentToPrevious.percentage');

				if (
					currentToInitialProfitAndLoss.gte(maximumAllowedWalletLossFromInitialValue)
					|| currentToPreviousProfitAndLoss.gte(maximumAllowedWalletLossFromPreviousValue)
				) {
					this.status = StrategyStatus.STOP_REQUESTED;

					await this.stop({});
				}
			}
		} catch (exception) {
			logger.ignoreException(exception);
		}
	}

	/**
	 * Cancel all orders if configured
	 * @param _options - Options for the strategy
	 */
	private async cancelAllOrdersIfConfigured(_options: {}) {
		let shouldCancelAllOrders = false;

		if (this.status === StrategyStatus.INITIALIZING) {
			shouldCancelAllOrders = properties.getAs<boolean>('strategy.pure_market_making.common.whenStart.cancelAllOrders');
		} else if (this.status === StrategyStatus.STOPPING) {
			shouldCancelAllOrders = properties.getAs<boolean>('strategy.pure_market_making.common.whenStop.cancelAllOrders');
		}

		if (shouldCancelAllOrders) {
			await this.rujira.fin.cancelAllOrders({
				ownerAddress: this.rujira.walletAddress,
				market: this.state.getOrThrow('market'),
			});
		}
	}

	/**
	 * Withdraw all filled orders if configured
	 * @param _options - Options for the strategy
	 */
	private async withdrawAllFilledOrdersIfConfigured(_options: {}) {
		let shouldWithdrawAllFilledOrders = false;

		if (this.status === StrategyStatus.INITIALIZING) {
			shouldWithdrawAllFilledOrders = properties.getAs<boolean>('strategy.pure_market_making.common.whenStart.withdrawAllFilledOrders');
		} else if (this.status === StrategyStatus.STOPPING) {
			shouldWithdrawAllFilledOrders = properties.getAs<boolean>('strategy.pure_market_making.common.whenStop.withdrawAllFilledOrders');
		}

		if (shouldWithdrawAllFilledOrders) {
			await this.rujira.fin.withdrawAllFilledOrders({
				ownerAddress: this.rujira.walletAddress,
				market: this.state.getOrThrow('market'),
			});
		}
	}

	/**
	 * Convert a proposal to a JSON object
	 * @param proposal - Proposal to convert
	 * @returns JSON object
	 */
	protected convertProposalToJson(proposal: Proposal) {
		return {
			place: (proposal.place as List<FinPlaceOrderRequest>)?.asImmutable().map((order: FinPlaceOrderRequest) => {
				return {
					market: order.market?.symbol,
					side: order.side,
					type: order.type,
					amount: order.amount?.toString(),
					price: order.price?.toString(),
				}
			}).toJS(),
			replace: (proposal.replace as List<FinReplaceOrderRequest>)?.asImmutable().map((order: FinReplaceOrderRequest) => {
				return {
					market: order.market?.symbol,
					side: order.side,
					type: order.type,
					amount: order.amount?.toString(),
					price: order.price?.toString(),
				}
			}).toJS(),
			cancel: (MList<OrderId | Order>(proposal.cancel as List<OrderId | Order>))?.asImmutable().map((order: OrderId | Order) => (order as Order).id || (order as OrderId)).toJS(),
			withdraw: (MList<OrderId | Order>(proposal.withdraw as List<OrderId | Order>))?.asImmutable().map((order: OrderId | Order) => (order as Order).id || (order as OrderId)).toJS(),
		}
	}

}
