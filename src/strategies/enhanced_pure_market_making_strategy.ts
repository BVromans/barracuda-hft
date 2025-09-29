import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { loggedClass } from "../annotations";
import { logger } from "../logger";
import { properties } from "../properties";
import { Amount, Balances, DECIMAL_0, DECIMAL_100, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, IndicatorData, IndicatorId, Market, MList, Order, OrderBook, OrderId, OrderSide, OrderStatus, OrderType } from "../types";
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
export class EnhancedPureMarketMakingStrategy extends BasePureMarketMakingStrategy {
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

		const market: Market = cast<Market>(this.state.get('market'));
		const balances: Balances = cast<Balances>(this.state.get('balances.current'));
		const orderBook: OrderBook = cast<OrderBook>(this.state.get('orderBook'));
		const indicators: Map<IndicatorId, IndicatorData> = cast<Map<IndicatorId, IndicatorData>>(this.state.get('indicators'));
		const currentOrders: Map<OrderId, Order> = cast<Map<OrderId, Order>>(this.state.get('orders'));

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
		const bollingerBandsSeries = cast<[number[], number[], number[]]>(indicators.get(Indicator.bollinger_bands.id)?.value);
		const bollingerBandsLowerSeries = List<number>(bollingerBandsSeries[0]);
		const bollingerBandsMiddleSeries = List<number>(bollingerBandsSeries[1]);
		const bollingerBandsUpperSeries = List<number>(bollingerBandsSeries[2]);
		const volumeWeightedAveragePriceSeries = List<number>(cast<number[]>(indicators.get(Indicator.volume_weighted_average_price.id)?.value));
		const averageTrueRangeSeries = List<number>(cast<number[]>(indicators.get(Indicator.average_true_range.id)?.value));

		// Extract the most recent values for spread components
		const bollingerBandsMiddle = Decimal(bollingerBandsMiddleSeries.last() || DECIMAL_NaN);
		const bollingerBandsLower = Decimal(bollingerBandsLowerSeries.last() || bollingerBandsMiddle);
		const bollingerBandsUpper = Decimal(bollingerBandsUpperSeries.last() || bollingerBandsMiddle);
		const bollingerBandsWidth = bollingerBandsUpper.minus(bollingerBandsLower).div(bollingerBandsMiddle); // Unitless bandwidth

		// Extract the most recent values for skew components
		const volumeWeightedAveragePrice = volumeWeightedAveragePriceSeries.last() && Decimal(volumeWeightedAveragePriceSeries.last()!).isFinite() ? Decimal(volumeWeightedAveragePriceSeries.last()!) : middlePrice;

		// Extract the most recent values for size components
		const averageTrueRange = Decimal(averageTrueRangeSeries.last() || DECIMAL_NaN);

		// Validation
		if (!middlePrice || !middlePrice.isFinite() || middlePrice.lessThanOrEqualTo(0)) {
			throw new Error('Middle price is not valid');
		}

		if (!bollingerBandsWidth || !bollingerBandsWidth.isFinite() || bollingerBandsWidth.lessThan(0)) {
			throw new Error('Bollinger bands width is not valid');
		}

		if (!volumeWeightedAveragePrice || !volumeWeightedAveragePrice.isFinite() || volumeWeightedAveragePrice.lessThanOrEqualTo(0)) {
			throw new Error('Volume weighted average price is not valid');
		}

		if (!averageTrueRange || !averageTrueRange.isFinite() || averageTrueRange.lessThan(0)) {
			throw new Error('Average true range is not valid');
		}

		const baseTokenSymbol = market.tokens.base.symbol;
		const quoteTokenSymbol = market.tokens.quote.symbol;
		const baseTokenFreeBalanceAmount = cast<Amount>(balances.tokens.get(baseTokenSymbol)?.balances.token.free);
		const quoteTokenFreeBalanceAmount = cast<Amount>(balances.tokens.get(quoteTokenSymbol)?.balances.token.free);
		const quoteTokenFreeBalanceAmountInBaseToken = quoteTokenFreeBalanceAmount.div(middlePrice);

		/*
			SPREAD:
			=======

			Compute spread using Bollinger Bands width (BBW), but as a safeguard, we also include a minimum spread percentage.
			Here 10%, for example, is inputted as 10 instead of 0.1.

			Formula:
			spreadPercentageMultiplier = max(minimumSpreadPercentage, bollingerBandsWidthSpreadWidthMultiplier * bollingerBandsWidth)
			spreadAmount = middlePrice * spreadPercentageMultiplier / 100

			Intuition: Bollinger Bands width is a measure of volatility, when the width is high (expansion), the price is more volatile and the spread should be larger.
				On the other hand, when the width is low (contraction), the price is more stable and the spread should be smaller.
		*/
		const bollingerBandsWidthSpreadPercentage = bollingerBandsWidthSpreadWidthMultiplier.mul(bollingerBandsWidth);
		const spreadPercentageMultiplier = Decimal.max(minimumSpreadPercentage, bollingerBandsWidthSpreadPercentage);
		const spreadAmount = middlePrice.mul(spreadPercentageMultiplier.div(DECIMAL_100));

		/*
			SKEW / FAIR PRICE
			=================

			We compute a fair price from the current middle price, skewed based on how far
			the middle price is from the VWAP (volume-weighted average price over a chosen
			window). A cap prevents excessive skew.
			Here 10%, for example, is inputted as 10 instead of 0.1.

			Definitions:
				volumeWeightedAveragePricePullRatio =
					(middlePrice - volumeWeightedAveragePrice) / middlePrice

				volumeWeightedAveragePricePercentageMultiplier =
					100 * volumeWeightedAveragePriceSkewMultiplier * volumeWeightedAveragePricePullRatio

				skewPercentageMultiplier = max(-maximumSkewPercentage, min(maximumSkewPercentage, volumeWeightedAveragePricePercentageMultiplier))

				fairPrice = middlePrice * (100 + skewPercentageMultiplier) / 100

			Intuition:
				- If middlePrice > VWAP → positive skew → fairPrice > middlePrice (upward bias).
				- If middlePrice < VWAP → negative skew → fairPrice < middlePrice (downward bias).
		*/
		const volumeWeightedAveragePricePullRatio = middlePrice.minus(volumeWeightedAveragePrice).div(middlePrice);
		const volumeWeightedAveragePricePercentageMultiplier = volumeWeightedAveragePriceSkewMultiplier.mul(volumeWeightedAveragePricePullRatio).mul(DECIMAL_100);
		const skewPercentageMultiplier = Decimal.max(
			maximumSkewPercentage.neg(),
			Decimal.min(maximumSkewPercentage, volumeWeightedAveragePricePercentageMultiplier)
		);
		const fairPrice = middlePrice.mul(DECIMAL_100.plus(skewPercentageMultiplier).div(DECIMAL_100));


		let buyPrice = fairPrice.minus(spreadAmount.div(2));
		let sellPrice = fairPrice.plus(spreadAmount.div(2));

		if (sellPrice.lte(buyPrice)) {
			sellPrice = buyPrice;
			const minimalSeparationAmount = middlePrice.mul(minimumSpreadPercentage.div(DECIMAL_100));
			buyPrice = Decimal.min(buyPrice, middlePrice.minus(minimalSeparationAmount.div(2)));
			sellPrice = Decimal.max(sellPrice, middlePrice.plus(minimalSeparationAmount.div(2)));
		}

		buyPrice = buyPrice.toDecimalPlaces(market.tick);
		sellPrice = sellPrice.toDecimalPlaces(market.tick);

		/*
			SIZE:
			======

			Compute order size using the average true range (ATR), but as a safeguard, we also include a minimum and maximum token amount per order.
			Here 10%, for example, is inputted as 10 instead of 0.1.

			Formula:
			averageTrueRangePercentageMultiplier = 100 * volatilitySizeShrinkageMultiplier * averageTrueRange / middlePrice
			sizePercentageMultiplier = 100 * (100 / (100 + averageTrueRangePercentageMultiplier))

			Intuition: Average True Range (ATR) is a measure of the average price range of the last trades.
				When the ATR is high, the price is more volatile and the order size should be smaller.
				On the other hand, when the ATR is low, the price is more stable and the order size should be larger.
		*/
		const averageTrueRangePercentageMultiplier = DECIMAL_100.mul(volatilitySizeShrinkageMultiplier.mul(averageTrueRange.div(middlePrice)));
		const sizePercentageMultiplier = DECIMAL_100.mul(DECIMAL_100.div(DECIMAL_100.plus(averageTrueRangePercentageMultiplier)));

		// Determine final order sizes using configured per-order targets clamped by min/max and free balances
		const buyAmount = Decimal.min(
			quoteTokenFreeBalanceAmountInBaseToken,
			Decimal.max(
				minimumTokenAmountPerOrder,
				desiredTokenFreeBalanceAmountPerOrder.mul(sizePercentageMultiplier.div(DECIMAL_100)),
				quoteTokenFreeBalanceAmountInBaseToken.mul(sizePercentageMultiplier.div(DECIMAL_100)).mul(desiredTokenFreeBalancePercentagePerOrder.div(DECIMAL_100)),
			),
			maximumTokenAmountPerOrder
		);

		const sellAmount = Decimal.min(
			baseTokenFreeBalanceAmount,
			Decimal.max(
				minimumTokenAmountPerOrder,
				desiredTokenFreeBalanceAmountPerOrder.mul(sizePercentageMultiplier.div(DECIMAL_100)),
				baseTokenFreeBalanceAmount.mul(sizePercentageMultiplier.div(DECIMAL_100)).mul(desiredTokenFreeBalancePercentagePerOrder.div(DECIMAL_100)),
			),
			maximumTokenAmountPerOrder
		);

		if (buyAmount.gt(DECIMAL_0)) {
			buyOrder.amount = buyAmount;
		}

		if (sellAmount.gt(DECIMAL_0)) {
			sellOrder.amount = sellAmount;
		}

		const bestAskPrice = cast(orderBook.book.bestAsk?.price, DECIMAL_NaN);
		const bestBidPrice = cast(orderBook.book.bestBid?.price, DECIMAL_NaN);
		if (buyPrice.isFinite() && buyPrice.gt(DECIMAL_0) && (!bestAskPrice.isFinite() || buyPrice.lt(bestAskPrice))) {
			buyOrder.price = buyPrice;
		}
		if (sellPrice.isFinite() && sellPrice.gt(DECIMAL_0) && (!bestBidPrice.isFinite() || sellPrice.gt(bestBidPrice))) {
			sellOrder.price = sellPrice;
		}

		const isBuyPlaceable = Boolean(buyOrder.amount && buyOrder.price && buyOrder.amount.gt(DECIMAL_0) && buyOrder.price.gt(DECIMAL_0));
		const isSellPlaceable = Boolean(sellOrder.amount && sellOrder.price && sellOrder.amount.gt(DECIMAL_0) && sellOrder.price.gt(DECIMAL_0));
		const buyOrderId = isBuyPlaceable ? this.rujira.fin.getOrderId({ order: buyOrder }) : undefined;
		const sellOrderId = isSellPlaceable ? this.rujira.fin.getOrderId({ order: sellOrder }) : undefined;

		currentOrders.valueSeq().forEach((order: Order) => {
			// Cancel current open orders/partially filled orders to re-quote fresh, only per-side when a replacement exists
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

		if (isBuyPlaceable) {
			if (buyOrderId && currentOrders.has(buyOrderId)) {
				proposal.replace?.push(buyOrder);
			} else {
				proposal.place?.push(buyOrder);
			}
		}
		if (isSellPlaceable) {
			if (sellOrderId && currentOrders.has(sellOrderId)) {
				proposal.replace?.push(sellOrder);
			} else {
				proposal.place?.push(sellOrder);
			}
		}

		logger.info(`Proposal:\n${dump(this.convertProposalToJson(proposal))}`);

		this.state.set('proposal', proposal);
	}
}
