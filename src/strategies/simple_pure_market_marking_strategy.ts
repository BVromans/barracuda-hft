import Decimal from "decimal.js";
import { Map } from "immutable";
import { properties } from "../properties";
import { Balances, DECIMAL_0, DECIMAL_100, DECIMAL_INFINITY, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Market, MList, Order, OrderBook, OrderId, OrderSide, OrderStatus, OrderType } from "../types";
import { BasePureMarketMakingStrategy } from "./base_pure_market_marking_strategy";
import { Proposal } from "./base_strategy";

/**
 * Pure market marking strategy
 */
export class SimplePureMarketMarkingStrategy extends BasePureMarketMakingStrategy {
	/**
	 * Create a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	protected async createProposal(_options: {}) {
		// Percentages must be expressed on a 0–100 scale.
		const spreadPercentage = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.spreadPercentage'));
		const minimumBasePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.minimumBasePerOrder')) || DECIMAL_0;
		const minimumQuotePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.minimumQuotePerOrder')) || DECIMAL_0;
		const maximumBasePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.maximumBasePerOrder')) || DECIMAL_INFINITY;
		const maximumQuotePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.maximumQuotePerOrder')) || DECIMAL_INFINITY;
		const targetBuyQuotePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.buyQuotePerOrder')) || DECIMAL_0;
		const targetSellBasePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.simple.sellBasePerOrder')) || DECIMAL_0;

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

		// Compute fixed spread around the middle price
		const spreadRatio = spreadPercentage.div(DECIMAL_100);
		const halfSpreadRatio = spreadRatio.div(2);
		const buyPrice = middlePrice.mul(Decimal(1).minus(halfSpreadRatio));
		const sellPrice = middlePrice.mul(Decimal(1).plus(halfSpreadRatio));

		// Determine final order sizes using configured per-order targets clamped by min/max and free balances
		const baseTokenSymbol = market.tokens.base.symbol;
		const quoteTokenSymbol = market.tokens.quote.symbol;
		const baseTokenFreeBalance = balances.tokens.getOrThrow(baseTokenSymbol).balances.token.free;
		const quoteTokenFreeBalance = balances.tokens.getOrThrow(quoteTokenSymbol).balances.token.free;

		const requestedBuyQuote = Decimal.min(maximumQuotePerOrder, Decimal.max(minimumQuotePerOrder, targetBuyQuotePerOrder));
		const requestedSellBase = Decimal.min(maximumBasePerOrder, Decimal.max(minimumBasePerOrder, targetSellBasePerOrder));

		const finalBuyQuote = Decimal.min(requestedBuyQuote, quoteTokenFreeBalance);
		const finalSellBase = Decimal.min(requestedSellBase, baseTokenFreeBalance);

		// Populate orders only if within constraints
		if (finalBuyQuote.gte(minimumQuotePerOrder) && finalBuyQuote.gt(0) && buyPrice.isFinite() && buyPrice.gt(0)) {
			buyOrder.price = buyPrice;
			buyOrder.amount = finalBuyQuote;
		}
		if (finalSellBase.gte(minimumBasePerOrder) && finalSellBase.gt(0) && sellPrice.isFinite() && sellPrice.gt(0)) {
			sellOrder.price = sellPrice;
			sellOrder.amount = finalSellBase;
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
}
