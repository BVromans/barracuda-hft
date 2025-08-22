import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { Amount, Balances, DECIMAL_0, DECIMAL_1, DECIMAL_100, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, IndicatorData, IndicatorId, Market, MList, Order, OrderBook, OrderId, OrderSide, OrderStatus, OrderType } from "../types";
import { BasePureMarketMakingStrategy } from "./base_pure_market_marking_strategy";
import { Proposal } from "./base_strategy";
import { get } from "../utils";
import { properties } from "../properties";
import { logger } from "../logger";
import { loggedClass } from "../annotations";

/**
 * Pure market marking strategy
 */
@loggedClass({
	logger: logger,
	allowedMethods: [],
	disallowedMethods: [],
	includeStaticMethods: true,
	logStart: true,
	logEnd: true,
	logInput: true,
	logOutput: true,
	logExecutionTime: true,
})
export class EnhancedPureMarketMarkingStrategy extends BasePureMarketMakingStrategy {
	/**
	 * Create a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	protected override async createProposal(_options: {}) {
		// Token parameters
		const minimumTokenAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.minimumTokenAmountPerOrder')); // Lower bound safeguard for token size per order
		const desiredTokenFreeBalancePercentagePerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.desiredTokenFreeBalancePercentagePerOrder')); // Desired token percentage of the free balance per order (0-100)
		const desiredTokenFreeBalanceAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.desiredTokenFreeBalanceAmountPerOrder')); // Desired token free balance amount per order
		const maximumTokenAmountPerOrder = Decimal(properties.getAs<number>('strategy.pure_market_making.common.orders.maximumTokenAmountPerOrder')); // Upper bound for token size per order

		// Spread parameters
		const minimumSpreadPercentage = Decimal(properties.getAs<number>('strategy.pure_market_making.enhanced.orders.minimumSpreadPercentage')); // Minimum spread as a percentage of the middle price (example: 1 means 1%)
		const bollingerBandsWidthSpreadWidthMultiplier = Decimal(properties.getAs<number>('strategy.pure_market_making.enhanced.orders.bollingerBandsWidthSpreadWidthMultiplier')); // Multiplier for the spread using Bollinger Bands width (≈1.0–1.8)

		// Skew parameters
		const volumeWeightedAveragePriceSkewMultiplier = Decimal(properties.getAs<number>('strategy.pure_market_making.enhanced.orders.volumeWeightedAveragePriceSkewMultiplier')); // Pull intensity toward the volume weighted average price (≈0.5–1.2)
		const maximumSkewPercentage = Decimal(properties.getAs<number>('strategy.pure_market_making.enhanced.orders.maximumSkewPercentage')); // Maximum absolute skew as a percentage (example: 1 means 1%)

		// Size parameters
		const volatilitySizeShrinkageMultiplier = Decimal(properties.getAs<number>('strategy.pure_market_making.enhanced.orders.volatilitySizeShrinkageMultiplier')); // Multiplier for size shrinkage based on average true range (≈3–6)

		const market: Market = get<Market>(this.state.get('market'));
		const balances: Balances = get<Balances>(this.state.get('balances'));
		const orderBook: OrderBook = get<OrderBook>(this.state.get('orderBook'));
		const indicators: Map<IndicatorId, IndicatorData> = get<Map<IndicatorId, IndicatorData>>(this.state.get('indicators'));
		const currentOrders: Map<OrderId, Order> = get<Map<OrderId, Order>>(this.state.get('orders'));

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
		const bollingerBandsSeries = get<[number[], number[], number[]]>(indicators.get(Indicator.bollinger_bands.id)?.value);
		const bollingerBandsLowerSeries = List<number>(bollingerBandsSeries[0]);
		const bollingerBandsMiddleSeries = List<number>(bollingerBandsSeries[1]);
		const bollingerBandsUpperSeries = List<number>(bollingerBandsSeries[2]);
		const volumeWeightedAveragePriceSeries = List<number>(get<number[]>(indicators.get(Indicator.volume_weighted_average_price.id)?.value));
		const averageTrueRangeSeries = List<number>(get<number[]>(indicators.get(Indicator.average_true_range.id)?.value));

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

		const baseTokenSymbol = market.tokens.base.symbol;
		const quoteTokenSymbol = market.tokens.quote.symbol;
		const baseTokenFreeBalance = get<Amount>(balances.tokens.get(baseTokenSymbol)?.balances.token.free);
		const quoteTokenFreeBalance = get<Amount>(balances.tokens.get(quoteTokenSymbol)?.balances.token.free);

		// Compute spread using Bollinger Bands width
		// spreadAmount = max(minimumPriceSpreadAmount, bollingerBandsWidthSpreadWidthMultiplier * middlePrice * bollingerBandsWidth)
		const minimumPriceSpreadAmount = middlePrice.mul(minimumSpreadPercentage.div(DECIMAL_100));
		const bollingerBandsWidthSpreadAmount = bollingerBandsWidthSpreadWidthMultiplier.mul(middlePrice).mul(bollingerBandsWidth);
		const spreadAmount = Decimal.max(minimumPriceSpreadAmount, bollingerBandsWidthSpreadAmount);

		// Compute skew using the volume weighted average price, clamping/restricting it to an interval
		// skewRatioPercentage = max(-maximumSkewRatio, min(volumeWeightedAveragePriceSkewMultiplier * (middlePrice − volumeWeightedAveragePrice) / middlePrice, +maximumSkewRatio)) * 100
		const volumeWeightedAveragePricePullRatio = middlePrice.minus(volumeWeightedAveragePrice).div(middlePrice);
		const maximumSkewRatio = maximumSkewPercentage.div(DECIMAL_100);
		const unclampedSkewRatio = volumeWeightedAveragePriceSkewMultiplier.mul(volumeWeightedAveragePricePullRatio);
		const skewRatioPercentage = Decimal.max(maximumSkewRatio.neg(), Decimal.min(maximumSkewRatio, unclampedSkewRatio)).mul(DECIMAL_100);

		// Compute order prices by shifting around a skewed fair price
		const fairPrice = middlePrice.mul(DECIMAL_100.plus(skewRatioPercentage).div(DECIMAL_100));

		let buyPrice = fairPrice.minus(spreadAmount.div(2));
		let sellPrice = fairPrice.plus(spreadAmount.div(2));

		if (sellPrice.lte(buyPrice)) {
			sellPrice = buyPrice;
			const minimalSeparationAmount = middlePrice.mul(minimumSpreadPercentage.div(DECIMAL_100));
			buyPrice = Decimal.min(buyPrice, middlePrice.minus(minimalSeparationAmount.div(2)));
			sellPrice = Decimal.max(sellPrice, middlePrice.plus(minimalSeparationAmount.div(2)));
		}

		// Compute order size scaling factor using the average true range
		// size = baseNotional / (1 + volatilitySizeShrinkageMultiplier * averageTrueRange / middlePrice)
		const averageTrueRangeTerm = volatilitySizeShrinkageMultiplier.mul(averageTrueRange.div(middlePrice));
		const sizePercentageMultipler = DECIMAL_100.div(DECIMAL_1.plus(averageTrueRangeTerm));

		// Determine budgets and convert to final order amounts
		const buyOrderBudget = Decimal.max(
			DECIMAL_0,
			quoteTokenFreeBalance.mul(desiredTokenFreeBalancePercentagePerOrder.div(DECIMAL_100)).mul(middlePrice),
			desiredTokenFreeBalanceAmountPerOrder.mul(middlePrice)
		);
		const sellOrderBudget = Decimal.max(
			DECIMAL_0,
			baseTokenFreeBalance.mul(desiredTokenFreeBalancePercentagePerOrder.div(DECIMAL_100)),
			desiredTokenFreeBalanceAmountPerOrder
		);

		const amount = Decimal.max(
			minimumTokenAmountPerOrder,
			Decimal.min(
				maximumTokenAmountPerOrder,
				sellOrderBudget.mul(sizePercentageMultipler.div(DECIMAL_100))
			),
			baseTokenFreeBalance,
			quoteTokenFreeBalance.mul(middlePrice)
		);

		// Populate orders only if valid, with final prices and amounts
		if (amount.gt(DECIMAL_0)) {
			buyOrder.amount = amount;
			sellOrder.amount = amount;
		}

		if (buyPrice.isFinite() && buyPrice.gt(DECIMAL_0)) {
			buyOrder.price = buyPrice;
		}
		if (sellPrice.isFinite() && sellPrice.gt(DECIMAL_0)) {
			sellOrder.price = sellPrice;
		}

		const buyOrderId = this.rujira.fin.getOrderId(buyOrder);
		const sellOrderId = this.rujira.fin.getOrderId(sellOrder);

		currentOrders.valueSeq().forEach((order: Order) => {
			const orderId = this.rujira.fin.getOrderId(order);

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
