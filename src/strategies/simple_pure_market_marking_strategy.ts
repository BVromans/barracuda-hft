import Decimal from "decimal.js";
import { Map } from "immutable";
import { properties } from "../properties";
import { Balances, DECIMAL_0, DECIMAL_1, DECIMAL_100, DECIMAL_INFINITY, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Market, MList, Order, OrderBook, OrderId, OrderSide, OrderStatus, OrderType } from "../types";
import { BasePureMarketMakingStrategy } from "./base_pure_market_marking_strategy";
import { Proposal } from "./base_strategy";
import { logger } from "../logger";
import { loggedClass } from "../annotations";
import { get } from "../utils";

/**
 * Pure market marking strategy
 */
@loggedClass({
	enabled: false,
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
export class SimplePureMarketMarkingStrategy extends BasePureMarketMakingStrategy {
	/**
	 * Create a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	protected async createProposal(_options: {}) {
		// Percentages must be expressed on a 0–100 scale.
		const spreadPercentage = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.orders.spreadPercentage'));
		const minimumTokenAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.minimumTokenAmountPerOrder'));
		const maximumTokenAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.maximumTokenAmountPerOrder'));
		const desiredTokenFreeBalanceAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.desiredTokenFreeBalanceAmountPerOrder')) || DECIMAL_0;

		const market: Market = this.state.getOrThrow('market');
		const balances: Balances = this.state.getOrThrow('balances');
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

		// Compute fixed spread around the middle price
		const spreadRatio = spreadPercentage.div(DECIMAL_100);
		const halfSpreadRatio = spreadRatio.div(2);
		const buyPrice = middlePrice.mul(DECIMAL_1.minus(halfSpreadRatio));
		const sellPrice = middlePrice.mul(DECIMAL_1.plus(halfSpreadRatio));

		// Determine final order sizes using configured per-order targets clamped by min/max and free balances
		const amount = Decimal.min(
			Decimal.min(
				maximumTokenAmountPerOrder,
				Decimal.max(
					minimumTokenAmountPerOrder,
					desiredTokenFreeBalanceAmountPerOrder
				)
			),
			baseTokenFreeBalanceAmount,
			quoteTokenFreeBalanceAmount.mul(middlePrice)
		);

		// Populate orders only if within constraints

		if (amount.gt(DECIMAL_0)) {
			buyOrder.amount = amount;
			sellOrder.amount = amount;
		}

		if (buyPrice.isFinite() && buyPrice.gt(DECIMAL_0) && buyPrice.lt(get(orderBook.book.bestAsk?.price, DECIMAL_NaN))) {
			buyOrder.price = buyPrice;
		}
		if (sellPrice.isFinite() && sellPrice.gt(DECIMAL_0) && sellPrice.gt(get(orderBook.book.bestBid?.price, DECIMAL_NaN))) {
			sellOrder.price = sellPrice;
		}

		currentOrders.valueSeq().forEach((order: Order) => {
			// Cancel current open/partial orders to re-quote fresh
			if (order.status === OrderStatus.OPEN || order.status === OrderStatus.PARTIALLY_FILLED) {
				proposal.cancel?.push(order as any);
			}

			// Withdraw current filled orders to withdraw funds
			if (order.status === OrderStatus.FILLED) {
				proposal.withdraw?.push(order as any);
			}
		});

		const buyOrderId = this.rujira.fin.getOrderId({ order: buyOrder });
		const sellOrderId = this.rujira.fin.getOrderId({ order: sellOrder });

		currentOrders.valueSeq().forEach((order: Order) => {
			const orderId = this.rujira.fin.getOrderId({ order });

			// Cancel current open/partial orders to re-quote fresh
			if (
				(order.status === OrderStatus.OPEN || order.status === OrderStatus.PARTIALLY_FILLED)
				&& orderId !== buyOrderId
				&& orderId !== sellOrderId
			) {
				proposal.cancel?.push(order as any);
			}

			// Withdraw current filled orders to withdraw funds
			if (order.status === OrderStatus.FILLED) {
				proposal.withdraw?.push(order as any);
			}
		});

		if (buyOrder.amount && buyOrder.price && buyOrder.amount.gt(DECIMAL_0) && buyOrder.price.gt(DECIMAL_0)) {
			proposal.place?.push(buyOrder);
		}
		if (sellOrder.amount && sellOrder.price && sellOrder.amount.gt(DECIMAL_0) && sellOrder.price.gt(DECIMAL_0)) {
			proposal.place?.push(sellOrder);
		}

		this.state.set('proposal', proposal);
	}
}
