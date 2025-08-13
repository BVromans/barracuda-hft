import Decimal from "decimal.js";
import { List, Map } from "immutable";
import { Balances, DECIMAL_0, DECIMAL_100, DECIMAL_NaN, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, IndicatorData, IndicatorId, Market, MList, Order, OrderBook, OrderId, OrderSide, OrderStatus, OrderType } from "../types";
import { BasePureMarketMakingStrategy } from "./base_pure_market_marking_strategy";
import { Proposal } from "./base_strategy";

/**
 * Pure market marking strategy
 */
export class EnhancedPureMarketMarkingStrategy extends BasePureMarketMakingStrategy {
	/**
	 * Create a proposal for the strategy
	 * @param _options - Options for the strategy
	 */
	protected override async createProposal(_options: {}) {
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
}
