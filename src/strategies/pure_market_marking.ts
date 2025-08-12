import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { properties } from "../properties";
import { Rujira } from "../rujira";
import { Balances, DECIMAL_100, DECIMAL_NaN, FinExecuteOrdersRequest, FinPlaceOrderRequest, FinReplaceOrderRequest, Market, MarketSymbol, MList, MMap, Order, OrderId, OrderStatus, OrderType, RujiraConstructorOptions, StrategyStatus, TokenSymbol, WalletMnemonic, WalletPrivateKey } from "../types";
import { runAndRepeat } from "../utils";
import { BaseStrategy } from "./base_strategy";

/**
 * Proposal for the strategy
 */
type Proposal = FinExecuteOrdersRequest['orders'];

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
	private async createProposal(_options: {}): Promise<Proposal> {
		const market: Market = this.state.getOrThrow('market');
		const currentOrders: Map<OrderId, Order> = this.state.getOrThrow('orders');
		const balances: Balances = this.state.getOrThrow('balances');

		const proposal: Proposal = {
			place: List<FinPlaceOrderRequest>(),
			replace: List<FinReplaceOrderRequest>(),
			cancel: List<Order>(),
			withdraw: List<Order>(),
		};

		return proposal;
	}

	/**
	 * Apply a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	private async applyProposal(_options: {}) {
		const market: Market = this.state.getOrThrow('market');
		const proposal: Proposal = this.state.getOrThrow('proposal');

		const result = await this.rujira.fin.executeOrders({
			ownerAddress: this.rujira.walletAddress,
			market: market,
			orders: proposal,
		});

		console.log(`Proposal applied successfully. Transactions: `, result.transactions.toJS());
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
			await this.rujira.fin.withdrawOrders({
				ownerAddress: this.rujira.walletAddress,
				market: this.state.getOrThrow('market'),
			});
		}
	}
}
