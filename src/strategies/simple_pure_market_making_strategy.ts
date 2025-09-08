import Decimal from "decimal.js";
import { Map } from "immutable";
import { loggedClass } from "../annotations";
import { logger } from "../logger";
import { properties } from "../properties";
import { Balances, DECIMAL_0, DECIMAL_1, DECIMAL_100, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Market, MList, Order, OrderBook, OrderId, OrderSide, OrderStatus, OrderType } from "../types";
import { cast, dump } from "../utils";
import { BasePureMarketMakingStrategy } from "./base_pure_market_making_strategy";
import { Proposal } from "./base_strategy";

/**
 * Pure market making strategy
 */
@loggedClass({
	enabled: true,
	logger: logger,
	allowedMethods: [],
	disallowedMethods: [],
	includeStaticMethods: true,
	logStart: true,
	logEnd: true,
	logInput: false,
	logOutput: false,
	logExecutionTime: true,
})
export class SimplePureMarketMakingStrategy extends BasePureMarketMakingStrategy {
	/**
	 * Create a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	protected async createProposal(_options: {}) {
		const minimumTokenAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.minimumTokenAmountPerOrder'));
		const desiredTokenFreeBalanceAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.desiredTokenFreeBalanceAmountPerOrder')) || DECIMAL_0;
		const desiredTokenFreeBalancePercentagePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.desiredTokenFreeBalancePercentagePerOrder')) || DECIMAL_0;
		const maximumTokenAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.maximumTokenAmountPerOrder'));
		// Percentages must be expressed on a 0–100 scale.
		const spreadPercentage = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.orders.spreadPercentage'));

		const market: Market = this.state.getOrThrow('market');
		const balances: Balances = this.state.getOrThrow('balances.current');
		const orderBook: OrderBook = this.state.getOrThrow('orderBook');
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

		// Validation
		if (!middlePrice || !middlePrice.isFinite() || middlePrice.lte(0)) {
			throw new Error('Middle price is not valid');
		}

		const baseTokenSymbol = market.tokens.base.symbol;
		const quoteTokenSymbol = market.tokens.quote.symbol;
		const baseTokenFreeBalanceAmount = balances.tokens.getOrThrow(baseTokenSymbol).balances.token.free;
		const quoteTokenFreeBalanceAmount = balances.tokens.getOrThrow(quoteTokenSymbol).balances.token.free;
		const quoteTokenFreeBalanceInBaseToken = quoteTokenFreeBalanceAmount.div(middlePrice);

		// Compute fixed spread around the middle price
		const spreadRatio = spreadPercentage.div(DECIMAL_100);
		const halfSpreadRatio = spreadRatio.div(2);
		const buyPrice = middlePrice.mul(DECIMAL_1.minus(halfSpreadRatio));
		const sellPrice = middlePrice.mul(DECIMAL_1.plus(halfSpreadRatio));

		// Determine final order sizes using configured per-order targets clamped by min/max and free balances
		const buyAmount = Decimal.min(
			quoteTokenFreeBalanceInBaseToken,
			Decimal.max(
				minimumTokenAmountPerOrder,
				desiredTokenFreeBalanceAmountPerOrder,
				quoteTokenFreeBalanceInBaseToken.mul(desiredTokenFreeBalancePercentagePerOrder.div(DECIMAL_100)),
			),
			maximumTokenAmountPerOrder
		);

		const sellAmount = Decimal.min(
			baseTokenFreeBalanceAmount,
			Decimal.max(
				minimumTokenAmountPerOrder,
				desiredTokenFreeBalanceAmountPerOrder,
				baseTokenFreeBalanceAmount.mul(desiredTokenFreeBalancePercentagePerOrder.div(DECIMAL_100)),
			),
			maximumTokenAmountPerOrder
		);

		if (buyAmount.gt(DECIMAL_0)) {
			buyOrder.amount = buyAmount;
		}

		if (sellAmount.gt(DECIMAL_0)) {
			sellOrder.amount = sellAmount;
		}

		if (buyPrice.isFinite() && buyPrice.gt(DECIMAL_0) && buyPrice.lt(cast(orderBook.book.bestAsk?.price, DECIMAL_NaN))) {
			buyOrder.price = buyPrice;
		}

		if (sellPrice.isFinite() && sellPrice.gt(DECIMAL_0) && sellPrice.gt(cast(orderBook.book.bestBid?.price, DECIMAL_NaN))) {
			sellOrder.price = sellPrice;
		}

		const buyOrderId = this.rujira.fin.getOrderId({ order: buyOrder });
		const sellOrderId = this.rujira.fin.getOrderId({ order: sellOrder });

		currentOrders.valueSeq().forEach((order: Order) => {
			// Cancel current open/partially filled orders to re-quote fresh
			if (
				[OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED].includes(order.status)
				&& order.id !== buyOrderId
				&& order.id !== sellOrderId
			) {
				proposal.cancel?.push(order as any);
			}

			// Withdraw current filled orders to withdraw funds
			if (order.status === OrderStatus.FILLED) {
				proposal.withdraw?.push(order as any);
			}
		});

		if (buyOrder.amount && buyOrder.price && buyOrder.amount.gt(DECIMAL_0) && buyOrder.price.gt(DECIMAL_0)) {
			if (currentOrders.has(buyOrderId)) {
				proposal.replace?.push(buyOrder);
			} else {
				proposal.place?.push(buyOrder);
			}

		}
		if (sellOrder.amount && sellOrder.price && sellOrder.amount.gt(DECIMAL_0) && sellOrder.price.gt(DECIMAL_0)) {
			if (currentOrders.has(sellOrderId)) {
				proposal.replace?.push(sellOrder);
			} else {
				proposal.place?.push(sellOrder);
			}
		}

		logger.info(`Proposal:\n${dump(this.convertProposalToJson(proposal))}`);

		this.state.set('proposal', proposal);
	}
}
