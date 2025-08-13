import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { properties } from "../properties";
import { Rujira } from "../rujira";
import { Balances, DECIMAL_0, DECIMAL_100, DECIMAL_NaN, FinPersistOrdersRequest, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, IndicatorData, IndicatorId, Market, MarketSymbol, MList, MMap, Order, OrderBook, OrderId, OrderSide, OrderStatus, OrderType, RujiraConstructorOptions, StrategyStatus, TokenSymbol, WalletMnemonic, WalletPrivateKey } from "../types";
import { runAndRepeat } from "../utils";
import { BaseStrategy } from "./base_strategy";

/**
 * Proposal for the strategy
 */
type Proposal = FinPersistOrdersRequest['orders'];

/**
 * Pure market marking strategy
 */
export class PureMarketMarking implements BaseStrategy {

	/**
	 * Status of the strategy
	 */
	status: StrategyStatus;

	/**
	 * Rujira instance
	 */
	private readonly rujira: Rujira;

	/**
	 * State of the strategy
	 */
	private readonly state: Map<string, any> = MMap<string, any>();

	/**
	 * Constructor
	 * @param options - Options for the strategy
	 */
	constructor(options: {
		walletMnemonic: WalletMnemonic | undefined;
		walletPrivateKey: WalletPrivateKey | undefined;
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
		this.status = StrategyStatus.INITIALIZING;

		await this.rujira.initialize({});

		const market = await this.rujira.fin.getMarket({
			symbol: properties.getAs<MarketSymbol>('strategy.pure_market_making.market')
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

		await this.cancelAllOrdersIfConfigured({});
		await this.withdrawAllFilledOrdersIfConfigured({});

		await this.startRepeatingTasks({});

		this.status = StrategyStatus.IDLE;
	}

	/**
	 * Run the strategy
	 * @param _options - Options for the strategy
	 */
	async run(_options: {}) {
		try {
			if (this.status !== StrategyStatus.IDLE) return;

			this.status = StrategyStatus.RUNNING;

			await this.updateOrders({});
			await this.updateBalances({});

			await this.createProposal({});
			await this.applyProposal({});

			await this.updateBalances({});
			await this.updateSummary({});
		} catch (exception) {
			throw exception;
		} finally {
			if (this.status === StrategyStatus.RUNNING) {
				this.status = StrategyStatus.IDLE;
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
	private async createProposal(_options: {}) {
		// Parameters (tunable). Percentages must be expressed on a 0–100 scale.
		const spreadFloorPercentage = new Decimal(0.10); // Minimum spread as a percentage of the middle price (example: 0.10 means 0.10%)
		const spreadBollingerBandsWidthMultiplier = new Decimal(1.2); // Multiplier for the spread using Bollinger Bands width (≈1.0–1.8)
		const volumeWeightedAveragePriceSkewMultiplier = new Decimal(0.8); // Pull intensity toward the volume weighted average price (≈0.5–1.2)
		const skewMaximumPercentage = new Decimal(0.40); // Maximum absolute skew as a percentage (example: 0.40 means 0.40%)
		const quoteUtilizationPercentage = new Decimal(10); // Percentage of free quote balance allocated to buy orders
		const baseUtilizationPercentage = new Decimal(10); // Percentage of free base balance allocated to sell orders
		const volatilitySizeShrinkageMultiplier = new Decimal(4.0); // Multiplier for size shrinkage based on average true range (≈3–6)
		const minimumQuotePerOrder = new Decimal(0.0); // Lower bound safeguard for quote token size per order
		const minimumBasePerOrder = new Decimal(0.0); // Lower bound safeguard for base token size per order
		const maximumQuotePerOrder = new Decimal(Number.MAX_SAFE_INTEGER); // Optional upper bound for quote token size per order
		const maximumBasePerOrder = new Decimal(Number.MAX_SAFE_INTEGER); // Optional upper bound for base token size per order

		const market: Market = this.state.getOrThrow('market');
		const balances: Balances = this.state.getOrThrow('balances');
		const orderBook: OrderBook = this.state.getOrThrow('orderBook');
		const indicators: Map<IndicatorId, IndicatorData> = this.state.getOrThrow('indicators');
		const currentOrders: Map<OrderId, Order> = this.state.getOrThrow('orders');

		const middlePrice = orderBook.statistics.middlePrice?.baseToQuote;

		const buyOrder = {
			ownerAddress: this.rujira.walletAddress,
			market: market,
			side: OrderSide.BUY,
			type: OrderType.FIXED_PRICE,
			amount: DECIMAL_NaN,
			price: DECIMAL_NaN,
		} as FinPlaceOrderRequest;

		const sellOrder = {
			ownerAddress: this.rujira.walletAddress,
			market: market,
			side: OrderSide.SELL,
			type: OrderType.FIXED_PRICE,
			amount: DECIMAL_NaN,
			price: DECIMAL_NaN,
		} as FinPlaceOrderRequest;

		const proposal: Proposal = {
			place: MList<FinPlaceOrderRequest>(),
			replace: MList<FinReplaceOrderRequest>(),
			cancel: MList<Order>(),
			withdraw: MList<Order>(),
		};

		// Retrieve indicator time series used by the strategy
		const bollingerBandsSeries = indicators.getOrThrow(Indicator.bollinger_bands.id).value as [number[], number[], number[]];
		const bollingerBandsLowerSeries = List<number>(bollingerBandsSeries[0]);
		const bollingerBandsMiddleSeries = List<number>(bollingerBandsSeries[1]);
		const bollingerBandsUpperSeries = List<number>(bollingerBandsSeries[2]);
		const volumeWeightedAveragePriceSeries = List<number>(indicators.getOrThrow(Indicator.volume_weighted_average_price.id).value);
		const averageTrueRangeSeries = List<number>(indicators.getOrThrow(Indicator.average_true_range.id).value);

		// Extract the most recent values for spread components
		const bollingerBandsLower = Decimal(bollingerBandsLowerSeries.last() || DECIMAL_NaN);
		const bollingerBandsMiddle = Decimal(bollingerBandsMiddleSeries.last() || DECIMAL_NaN);
		const bollingerBandsUpper = Decimal(bollingerBandsUpperSeries.last() || DECIMAL_NaN);
		const bollingerBandsWidth = bollingerBandsUpper.minus(bollingerBandsLower).div(bollingerBandsMiddle); // Unitless bandwidth

		// Extract the most recent values for skew components
		const volumeWeightedAveragePrice = Decimal(volumeWeightedAveragePriceSeries.last() || DECIMAL_NaN);

		// Extract the most recent values for size components
		const averageTrueRange = Decimal(averageTrueRangeSeries.last() || DECIMAL_NaN);

		// Validation
		if (!middlePrice || !middlePrice.isFinite() || middlePrice.lte(0)) {
			throw new Error('Middle price is not valid');
		}

		if (!bollingerBandsWidth.isFinite() || bollingerBandsWidth.lte(0)) {
			throw new Error('Bollinger bands width is not valid');
		}

		if (!volumeWeightedAveragePrice.isFinite() || volumeWeightedAveragePrice.lte(0)) {
			throw new Error('Volume weighted average price is not valid');
		}

		if (!averageTrueRange.isFinite() || averageTrueRange.lte(0)) {
			throw new Error('Average true range is not valid');
		}

		// Compute spread using Bollinger Bands width
		// spreadAmount = max(minimumSpreadAmount, spreadBollingerBandsWidthMultiplier * middlePrice * bollingerBandsWidth)
		const spreadFloorRatio = spreadFloorPercentage.div(DECIMAL_100); // Convert percentage (0–100) to a unit ratio
		const minimumSpreadAmount = middlePrice.mul(spreadFloorRatio);
		const spread = Decimal.max(minimumSpreadAmount, spreadBollingerBandsWidthMultiplier.mul(middlePrice).mul(bollingerBandsWidth));

		// Compute skew using the volume weighted average price
		// skewRatio = clamp(volumeWeightedAveragePriceSkewMultiplier * (middlePrice − volumeWeightedAveragePrice) / middlePrice, -skewMaximumRatio, +skewMaximumRatio)
		const volumeWeightedAveragePricePullRatio = middlePrice.minus(volumeWeightedAveragePrice).div(middlePrice);
		const skewMaximumRatio = skewMaximumPercentage.div(DECIMAL_100); // Convert percentage (0–100) to a unit ratio
		const unclampedSkewRatio = volumeWeightedAveragePriceSkewMultiplier.mul(volumeWeightedAveragePricePullRatio);
		const skewRatio = Decimal.max(skewMaximumRatio.neg(), Decimal.min(skewMaximumRatio, unclampedSkewRatio));

		// Compute order prices by shifting around a skewed center price
		const centerPrice = middlePrice.mul(Decimal(1).plus(skewRatio));
		let buyPrice = centerPrice.minus(spread.div(2));
		let sellPrice = centerPrice.plus(spread.div(2));
		if (sellPrice.lte(buyPrice)) {
			const minimalSeparationAmount = middlePrice.mul(spreadFloorRatio);
			buyPrice = Decimal.min(buyPrice, middlePrice.minus(minimalSeparationAmount));
			sellPrice = Decimal.max(sellPrice, middlePrice.plus(minimalSeparationAmount));
		}

		// Compute order size scaling factor using the average true range
		// size = baseNotional / (1 + volatilitySizeShrinkageMultiplier * averageTrueRange / middlePrice)
		const averageTrueRangeTerm = volatilitySizeShrinkageMultiplier.mul(averageTrueRange.div(middlePrice));
		const sizeDenominator = Decimal(1).plus(averageTrueRangeTerm);

		// Determine budgets and convert to final order amounts
		const baseTokenSymbol = market.tokens.base.symbol;
		const quoteTokenSymbol = market.tokens.quote.symbol;
		const baseTokenFreeBalance = balances.tokens.getOrThrow(baseTokenSymbol).balances.token.free;
		const quoteTokenFreeBalance = balances.tokens.getOrThrow(quoteTokenSymbol).balances.token.free;

		const buyQuoteTokenBudget = Decimal.max(
			DECIMAL_0,
			quoteTokenFreeBalance.mul(quoteUtilizationPercentage.div(DECIMAL_100))
		);
		const sellBaseTokenBudget = Decimal.max(
			DECIMAL_0,
			baseTokenFreeBalance.mul(baseUtilizationPercentage.div(DECIMAL_100))
		);

		const buyAmountInQuoteToken = Decimal.max(minimumQuotePerOrder, Decimal.min(maximumQuotePerOrder, buyQuoteTokenBudget.div(sizeDenominator)));
		const sellAmountInBaseToken = Decimal.max(minimumBasePerOrder, Decimal.min(maximumBasePerOrder, sellBaseTokenBudget.div(sizeDenominator)));

		// Populate orders only if valid, with final prices and amounts
		if (buyAmountInQuoteToken.gt(0) && buyPrice.isFinite() && buyPrice.gt(0)) {
			buyOrder.price = buyPrice;
			buyOrder.amount = buyAmountInQuoteToken;
		}
		if (sellAmountInBaseToken.gt(0) && sellPrice.isFinite() && sellPrice.gt(0)) {
			sellOrder.price = sellPrice;
			sellOrder.amount = sellAmountInBaseToken;
		}

		// Cancel current open/partial orders to re-quote fresh
		currentOrders.valueSeq().forEach((order: Order) => {
			if (order.status === OrderStatus.OPEN || order.status === OrderStatus.PARTIALLY_FILLED) {
				proposal.cancel?.push(order as any);
			}
		});

		if (buyOrder.amount && buyOrder.price && buyOrder.amount.gt(0) && buyOrder.price.gt(0)) {
			proposal.place?.push(buyOrder);
		}
		if (sellOrder.amount && sellOrder.price && sellOrder.amount.gt(0) && sellOrder.price.gt(0)) {
			proposal.place?.push(sellOrder);
		}

		this.state.set('proposal', proposal);
	}

	/**
	 * Apply a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	private async applyProposal(_options: {}) {
		const market: Market = this.state.getOrThrow('market');
		const proposal: Proposal = this.state.getOrThrow('proposal');

		const result = await this.rujira.fin.persistOrders({
			ownerAddress: this.rujira.walletAddress,
			market: market,
			orders: proposal,
		});

		console.debug(`Proposal applied successfully. Transactions: `, result.transactions.toJS());
	}

	/**
	 * Start repeating tasks for the strategy
	 * @param _options - Options for the strategy
	 */
	private async startRepeatingTasks(_options: {}) {
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
			'updateOrderBook',
			await runAndRepeat(
				this.updateOrderBook.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.updateOrderBook.interval')
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
			'monitoreProfitAndLoss',
			await runAndRepeat(
				this.monitoreProfitAndLoss.bind(this),
				properties.getAs<number>('strategy.pure_market_making.tasks.monitoreProfitAndLoss.interval')
			)
		);
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
		const tokens = await this.rujira.fin.getAllTokens({});

		this.state.set("tokens", tokens);
	}

	/**
	 * Update the markets of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateMarkets(_options: {}) {
		const markets = await this.rujira.fin.getAllMarkets({});

		this.state.set("markets", markets);
	}

	/**
	 * Update the order book of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateOrderBook(_options: {}) {
		const market = this.state.getOrThrow('market');

		const orderBook = await this.rujira.fin.getOrderBook({
			market: market
		});

		this.state.set("orderBook", orderBook);
	}

	/**
	 * Update the indicators of the strategy
	 * @param _options - Options for the strategy
	 */
	private async updateIndicators(_options: {}) {
		const market = this.state.getOrThrow('market');

		const indicators = await this.rujira.fin.getIndicators({
			market: market
		});

		this.state.set("indicators", indicators);
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

		if (this.state.getOrThrow('summary.balances.initial.base').eq(DECIMAL_NaN)) {
			this.state.set('summary.balances.initial.base', balances.tokens.getOrThrow(market.tokens.base.symbol));
			this.state.set('summary.balances.initial.quote', balances.tokens.getOrThrow(market.tokens.quote.symbol));
			this.state.set('summary.balances.initial.native', balances.tokens.getOrThrow(this.rujira.fin.nativeToken.symbol));
			this.state.set('summary.balances.initial.feePayment', balances.tokens.getOrThrow(this.rujira.fin.feePaymentToken.symbol));
			this.state.set('summary.balances.initial.usd', balances.tokens.getOrThrow(this.rujira.fin.usdToken.symbol));
			this.state.set('summary.balances.initial.total', balances.total.usdToken.total);
		}

		this.state.set('summary.balances.previous.base', this.state.getOrThrow('summary.balances.current.base'));
		this.state.set('summary.balances.previous.quote', this.state.getOrThrow('summary.balances.current.quote'));
		this.state.set('summary.balances.previous.native', this.state.getOrThrow('summary.balances.current.native'));
		this.state.set('summary.balances.previous.feePayment', this.state.getOrThrow('summary.balances.current.feePayment'));
		this.state.set('summary.balances.previous.usd', this.state.getOrThrow('summary.balances.current.usd'));
		this.state.set('summary.balances.previous.total', this.state.getOrThrow('summary.balances.current.total'));

		this.state.set('summary.balances.current.base', balances.tokens.getOrThrow(market.tokens.base.symbol));
		this.state.set('summary.balances.current.quote', balances.tokens.getOrThrow(market.tokens.quote.symbol));
		this.state.set('summary.balances.current.native', balances.tokens.getOrThrow(this.rujira.fin.nativeToken.symbol));
		this.state.set('summary.balances.current.feePayment', balances.tokens.getOrThrow(this.rujira.fin.feePaymentToken.symbol));
		this.state.set('summary.balances.current.usd', balances.tokens.getOrThrow(this.rujira.fin.usdToken.symbol));
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

	/**
	 * Monitor the profit and loss of the strategy
	 * @param _options - Options for the strategy
	 */
	private async monitoreProfitAndLoss(_options: {}) {
		const enabled = properties.getAs<boolean>('strategy.pure_market_making.monitorProfitAndLoss.enabled');

		if (enabled) {
			const maximumAllowedWalletLossFromInitialValue = Decimal(properties.getAs<number>('strategy.pure_market_making.monitorProfitAndLoss.maximumAllowedWalletLossFromInitialValue'));
			const maximumAllowedWalletLossFromPreviousValue = Decimal(properties.getAs<number>('strategy.pure_market_making.monitorProfitAndLoss.maximumAllowedWalletLossFromPreviousValue'));

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
	}

	/**
	 * Cancel all orders if configured
	 * @param _options - Options for the strategy
	 */
	private async cancelAllOrdersIfConfigured(_options: {}) {
		let shouldCancelAllOrders = false;

		if (this.status === StrategyStatus.INITIALIZING) {
			shouldCancelAllOrders = properties.getAs<boolean>('strategy.pure_market_making.whenStart.cancelAllOrders');
		} else if (this.status === StrategyStatus.STOPPING) {
			shouldCancelAllOrders = properties.getAs<boolean>('strategy.pure_market_making.whenStop.cancelAllOrders');
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
			shouldWithdrawAllFilledOrders = properties.getAs<boolean>('strategy.pure_market_making.whenStart.withdrawAllFilledOrders');
		} else if (this.status === StrategyStatus.STOPPING) {
			shouldWithdrawAllFilledOrders = properties.getAs<boolean>('strategy.pure_market_making.whenStop.withdrawAllFilledOrders');
		}

		if (shouldWithdrawAllFilledOrders) {
			await this.rujira.fin.withdrawFilledOrders({
				ownerAddress: this.rujira.walletAddress,
				market: this.state.getOrThrow('market'),
			});
		}
	}
}
