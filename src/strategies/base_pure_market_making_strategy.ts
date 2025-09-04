import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { loggedClass } from "../annotations";
import { logger } from "../logger";
import { properties } from "../properties";
import { Rujira } from "../rujira";
import { Balances, Candle, CandleInterval, CandleTimestamp, DECIMAL_0, DECIMAL_100, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Market, MarketSymbol, MList, MMap, Order, OrderId, OrderStatus, OrderType, RujiraConstructorOptions, StrategyStatus, TokenSymbol, WalletMnemonic, WalletPrivateKey } from "../types";
import { database } from "../database";
import { runAndRepeat, sleep, dump } from "../utils";
import { BaseStrategy, Proposal } from "./base_strategy";

/**
 * Pure market making strategy
 */
@loggedClass({
	enabled: true,
	logger: logger,
	allowedMethods: [
		'initialize',
		'run',
		'stop',
		'createProposal',
		'applyProposal',
		'updateOrdersDatabaseFromProposal',
		'startRepeatingTasks',
		'stopRepeatingTasks',
		'updateBalances',
		'updateOrders',
		'updateSummary',
		'cancelAllOrdersIfConfigured',
		'withdrawAllFilledOrdersIfConfigured',
		'updateTokens',
		'updateMarkets',
		'updateOrderBook',
		'updateIndicators',
		'monitorProfitAndLoss',
	],
	disallowedMethods: [
		// 'updateTokens',
		// 'updateMarkets',
		// 'updateOrderBook',
		// 'updateIndicators',
		// 'monitorProfitAndLoss',
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

			await this.loadOrCreateSummaryFromDatabase({});

			this.state.set('summary.market.symbol', market.symbol);

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
	 * Stop the strategy, gracefully
	 * This method will make the strategy stop in the next cycle.
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

		await this.updateOrdersDatabaseFromProposal({});

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

		const currentBalances = await this.rujira.fin.getBalances({
			walletAddress: this.rujira.walletAddress,
			tokenSymbols
		});

		const initialBalances = this.state.get('balances.initial') as Balances | undefined;
		const previousBalances = this.state.get('balances.current') as Balances | undefined;

		if (!initialBalances) {
			this.state.set('balances.initial', currentBalances);
			this.state.set('balances.current', currentBalances);
		} else {
			this.state.set('balances.previous', previousBalances);
			this.state.set('balances.current', currentBalances);
		}
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
		const currentBalances = this.state.getOrThrow('balances.current') as Balances;
		const tokenSymbols = currentBalances.tokens.keySeq().toArray();
		const uniqueSymbols = Array.from(new Set<string>(tokenSymbols));

		const percentage = (absoluteChange: Decimal, baseTotal: Decimal) =>
			baseTotal.eq(0) ? DECIMAL_NaN : absoluteChange.div(baseTotal).mul(DECIMAL_100);

		const readDecimal = (path: string): Decimal => {
			const value = this.state.get(path);
			if (value instanceof Decimal)
				return value;

			if (typeof value === 'number' || typeof value === 'string')
				return new Decimal(value);

			return DECIMAL_0;
		};

		for (const symbol of uniqueSymbols) {
			const balanceTotal = currentBalances.tokens.get(symbol)?.balances.token.total ?? DECIMAL_0;
			const priceUsd = currentBalances.tokens.get(symbol)?.balances.usdToken.quotation.tokenToQuote ?? DECIMAL_0;

			if (this.state.get(`summary.tokens.balances.initial.${symbol}`) === undefined) {
				this.state.set(`summary.tokens.balances.initial.${symbol}`, balanceTotal);
			}
			if (this.state.get(`summary.tokens.prices.initial.${symbol}`) === undefined) {
				this.state.set(`summary.tokens.prices.initial.${symbol}`, priceUsd);
			}

			this.state.set(`summary.tokens.balances.current.${symbol}`, balanceTotal);
			this.state.set(`summary.tokens.prices.current.${symbol}`, priceUsd);
		}

		const computeTotal = (when: 'initial' | 'current'): Decimal => {
			let total = DECIMAL_0;
			for (const symbol of uniqueSymbols) {
				const balance = readDecimal(`summary.tokens.balances.${when}.${symbol}`);
				const price = readDecimal(`summary.tokens.prices.${when}.${symbol}`);
				total = total.plus(balance.mul(price));
			}

			return total;
		};

		const computeTotalValuedAtCurrent = (when: 'initial' | 'current'): Decimal => {
			let total = DECIMAL_0;
			for (const symbol of uniqueSymbols) {
				const balance = readDecimal(`summary.tokens.balances.${when}.${symbol}`);
				const currentPrice = readDecimal(`summary.tokens.prices.current.${symbol}`);
				total = total.plus(balance.mul(currentPrice));
			}

			return total;
		};

		const initialTotal = computeTotal('initial');
		const currentTotal = computeTotal('current');

		const absoluteChangeCurrentToInitial = currentTotal.minus(initialTotal);
		this.state.set('summary.profitAndLoss.currentToInitial.totalBalanceChange.absolute', absoluteChangeCurrentToInitial);
		this.state.set('summary.profitAndLoss.currentToInitial.totalBalanceChange.percentage', percentage(absoluteChangeCurrentToInitial, initialTotal));

		const initialTotalValuedAtCurrent = computeTotalValuedAtCurrent('initial');
		const currentTotalValuedAtCurrent = computeTotalValuedAtCurrent('current');

		const absoluteAgainstInitial = currentTotalValuedAtCurrent.minus(initialTotalValuedAtCurrent);
		this.state.set('summary.profitAndLoss.currentToInitial.totalBalanceChangeAgainstIfNotTrading.absolute', absoluteAgainstInitial);
		this.state.set('summary.profitAndLoss.currentToInitial.totalBalanceChangeAgainstIfNotTrading.percentage', percentage(absoluteAgainstInitial, initialTotalValuedAtCurrent));

		const summary = this.state.get('summary').toJS();

		logger.info(`Summary:\n${dump(summary)}`);

		await this.persistSummaryToDatabase({});
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

				const currentToInitialProfitAndLoss: Decimal = this.state.getOrThrow('summary.profitAndLoss.currentToInitial.totalBalanceChange.absolute');

				if (currentToInitialProfitAndLoss.lte(maximumAllowedWalletLossFromInitialValue.neg())) {
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
	 * Load the summary from the database or create it if it does not exist.
	 */
	private async loadOrCreateSummaryFromDatabase(_options: {}) {
		const existing = database.select_single(`SELECT data FROM summary LIMIT 1`);

		if (existing) {
			const data = (existing.get('data') as string) ?? '';
			const parsed = JSON.parse(data, (_key, value) => {
				if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) {
					return new Decimal(value);
				}
				return value;
			});

			this.state.set('summary', MMap<string, any>(parsed as Record<string, unknown>, '.'));
		} else {
			const currentSummaryMap = this.state.get('summary');
			const currentSummaryObject = currentSummaryMap ? (currentSummaryMap as any).toJS() : {};
			const json = JSON.stringify(currentSummaryObject);
			database.insert(`INSERT INTO summary (data) VALUES (:data)`, { data: json });
		}
	}

	/**
	 * Persist the current in-memory summary into the database (upsert behavior).
	 */
	private async persistSummaryToDatabase(_options: {}) {
		const summaryMap = this.state.get('summary');
		const summaryObject = summaryMap ? (summaryMap as any).toJS() : {};
		const json = JSON.stringify(summaryObject);

		const existing = database.select_single(`SELECT rowid AS id FROM summary LIMIT 1`);
		if (existing) {
			database.update(`UPDATE summary SET data = :data`, { data: json });
		} else {
			database.insert(`INSERT INTO summary (data) VALUES (:data)`, { data: json });
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

	/**
 * Persist affected orders from the last proposal into the local database
 * using current state orders and the proposal details.
 */
	private async updateOrdersDatabaseFromProposal(_options: {}) {
		const market: Market = this.state.getOrThrow('market');
		const currentOrders = this.state.getOrThrow('orders') as Map<OrderId, Order>;
		const proposal: Proposal = this.state.getOrThrow('proposal');

		const nowIso = new Date().toISOString();

		const rows: Array<Record<string, unknown>> = [];

		const mapOrderToRow = (order: Order, statusOverride?: OrderStatus): Record<string, unknown> => ({
			id: this.rujira.fin.getOrderId({ order: order }),
			owner_address: order.ownerAddress,
			market_address: order.market.address,
			side: order.side,
			type: order.type,
			amount: order.amount?.toString?.() ?? String(order.amount),
			price: order.price?.toString?.() ?? null,
			deviation_in_percentage: order.deviationInPercentage?.toString?.() ?? null,
			filled_percentage: order.filledPercentage?.toString?.() ?? '0',
			status: (statusOverride ?? order.status),
			creation_timestamp: (order.creationTimestamp ? String(order.creationTimestamp) : nowIso),
			update_timestamp: (order.updateTimestamp ? String(order.updateTimestamp) : nowIso),
		});

		const mapPlaceRequestToRow = (request: FinPlaceOrderRequest, status: OrderStatus): Record<string, unknown> => ({
			id: this.rujira.fin.getOrderId({ order: request }),
			owner_address: this.rujira.walletAddress,
			market_address: market.address,
			side: request.side,
			type: request.type,
			amount: request.amount?.toString?.() ?? String(request.amount),
			price: request.price?.toString?.() ?? null,
			deviation_in_percentage: request.deviationInPercentage?.toString?.() ?? null,
			filled_percentage: '0',
			status,
			creation_timestamp: nowIso,
			update_timestamp: nowIso,
		});

		const findMatchingOrder = (candidate: OrderId | Order): Order | undefined => {
			if (typeof candidate === 'string') {
				return currentOrders.get(candidate as OrderId);
			} else {
				const id = (candidate as Order)?.id ?? this.rujira.fin.getOrderId({ order: candidate as Order });

				return currentOrders.get(id);
			}
		};

		// PLACE
		if (proposal.place) {
			const placeArray = (MList<FinPlaceOrderRequest>(proposal.place as any)).toArray();
			for (const request of placeArray) {
				rows.push(mapPlaceRequestToRow(request, OrderStatus.OPEN));
			}
		}

		// REPLACE
		if (proposal.replace) {
			const replaceArray = (MList<FinReplaceOrderRequest>(proposal.replace as any)).toArray();
			for (const request of replaceArray) {
				rows.push(mapPlaceRequestToRow(request, OrderStatus.OPEN));
			}
		}

		// CANCEL
		if (proposal.cancel) {
			const cancelArray = (MList<OrderId | Order>(proposal.cancel as any)).toArray();
			for (const candidate of cancelArray) {
				const order = findMatchingOrder(candidate);
				if (order) {
					rows.push(mapOrderToRow(order, OrderStatus.CANCELLED));
				}
			}
		}

		// WITHDRAW
		if (proposal.withdraw) {
			const withdrawArray = (MList<OrderId | Order>(proposal.withdraw as any)).toArray();
			for (const candidate of withdrawArray) {
				const order = findMatchingOrder(candidate);
				if (order) {
					const row = mapOrderToRow(order, OrderStatus.FILLED);
					(row as any).filled_percentage = '100';
					rows.push(row);
				}
			}
		}

		if (rows.length > 0) {
			for (const row of rows) {
				if (!(row as any)?.id) throw new Error('Order id is required');

				const existing = database.select_single(
					`SELECT id FROM orders WHERE id = :id`,
					row
				);

				if (existing) {
					database.update(
						`UPDATE orders
						   SET amount = :amount,
						       price = :price,
						       deviation_in_percentage = :deviation_in_percentage,
						       filled_percentage = :filled_percentage,
						       status = :status,
						       update_timestamp = :update_timestamp
						 WHERE id = :id`,
						row
					);
				} else {
					database.insert(
						`INSERT INTO orders (id, owner_address, market_address, side, type, amount, price, deviation_in_percentage, filled_percentage, status, creation_timestamp, update_timestamp)
						 VALUES (:id, :owner_address, :market_address, :side, :type, :amount, :price, :deviation_in_percentage, :filled_percentage, :status, :creation_timestamp, :update_timestamp)`,
						row
					);
				}
			}
		}

		// Reconcile: any DB order for this owner+market not present in current orders or in this proposal should be marked as cancelled
		const currentOrderIds = new Set((currentOrders?.keySeq?.().toArray?.() ?? []) as string[]);

		const proposalIds = new Set<string>();
		if (proposal.place) {
			const list = (MList<FinPlaceOrderRequest>(proposal.place as any)).toArray();
			for (const request of list) {
				proposalIds.add(this.rujira.fin.getOrderId({ order: request }));
			}
		}
		if (proposal.replace) {
			const list = (MList<FinReplaceOrderRequest>(proposal.replace as any)).toArray();
			for (const request of list) {
				proposalIds.add(this.rujira.fin.getOrderId({ order: request }));
			}
		}
		if (proposal.cancel) {
			const list = (MList<OrderId | Order>(proposal.cancel as any)).toArray();
			for (const candidate of list) {
				if (typeof candidate === 'string') {
					proposalIds.add(candidate);
				} else {
					const id = (candidate as Order)?.id ?? this.rujira.fin.getOrderId({ order: candidate as Order });
					proposalIds.add(id);
				}
			}
		}
		if (proposal.withdraw) {
			const list = (MList<OrderId | Order>(proposal.withdraw as any)).toArray();
			for (const candidate of list) {
				if (typeof candidate === 'string') {
					proposalIds.add(candidate);
				} else {
					const id = (candidate as Order)?.id ?? this.rujira.fin.getOrderId({ order: candidate as Order });
					proposalIds.add(id);
				}
			}
		}

		const dbOrders = database.select(
			`SELECT id FROM orders WHERE owner_address = :owner_address AND market_address = :market_address`,
			{ owner_address: this.rujira.walletAddress, market_address: market.address }
		);

		for (const row of dbOrders.toArray()) {
			const id = (row.get('id') as string) ?? '';
			if (!id) continue;
			if (!currentOrderIds.has(id) && !proposalIds.has(id)) {
				database.update(
					`UPDATE orders SET status = :status, update_timestamp = :update_timestamp WHERE id = :id`,
					{ id, status: OrderStatus.CANCELLED, update_timestamp: nowIso }
				);
			}
		}
	}
}
