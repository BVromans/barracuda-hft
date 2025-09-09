import Decimal from "decimal.js";
import "./bootstrap";
import { properties } from "./properties";
import { Rujira } from "./rujira";
import { DECIMAL_100, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, Map, Market, MarketSymbol, Order, OrderDeviationInBasisPoints, OrderId, OrderPrice, OrderSide, OrderStatus, OrderType, Price, RujiraConstructorOptions, RujiraInitializeOptions, Token, TokenSymbol, WalletAddress, WalletMnemonic, WalletPrivateKey } from "./types";
import { cast, dump, sanitizeOrderPrice } from "./utils";

(async function run() {
	const active = {
		getStatus: false,
		getTransaction: false,
		getAllTokens: false,
		getTokens: false,
		getToken: false,
		getAllMarkets: false,
		getMarkets: false,
		getMarket: false,
		getOrderBook: false,
		getTicker: false,
		getCandles: false,
		getIndicators: false,
		getBalances: false,
		placeOrder: false,
		getOrder: false,
		replaceOrder: false,
		cancelOrder: false,
		placeOrders: false,
		getOrders: false,
		replaceOrders: false,
		cancelOrders: false,
		cancelAllOrders: false,
		withdrawAllFilledOrders: false,
	};

	const walletAddress = properties.getAs<WalletAddress>('rujira.wallet.publicKeys.thor');

	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

	console.log('\n--------------------------------------------------------------------------------\n');

	const defaultTransactionHash = '6A2B2D1821B1E248410BA3CF273D65215C357DE559E0ED4117AEA3AA7967C05B';

	const defaultMarketAddress = 'thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz';
	const defaultMarketSymbol = 'BTC-BTC/ETH-USDC';
	const defaultMarket = await rujira.fin.getMarket({
		address: defaultMarketAddress,
		symbol: defaultMarketSymbol,
	});

	const defaultMarketTicker = await rujira.fin.getTicker({
		marketAddress: defaultMarketAddress,
		marketSymbol: defaultMarketSymbol,
	});

	const defaultMarketPrice = cast<Price>(defaultMarketTicker.middlePrice.baseToQuote);

	console.log('defaultMarketPrice:\n', defaultMarketPrice.toFixed());

	const defaultMarketOrderBook = await rujira.fin.getOrderBook({
		marketAddress: defaultMarketAddress,
		marketSymbol: defaultMarketSymbol,
	});

	console.log('defaultMarketOrderBook:bestBid:\n', defaultMarketOrderBook?.book?.bestBid?.price?.toFixed());
	console.log('defaultMarketOrderBook:bestAsk:\n', defaultMarketOrderBook?.book?.bestAsk?.price?.toFixed());

	const defaultSpreadPercentage = Decimal('50');
	const defaultFillableSpreadPercentage = Decimal('0.01'); // 1 means 1%
	const defaultPriceIncrementPercentage = Decimal('0.1'); // 1 means 1%
	const defaultDeviationIncrementPercentage = Decimal('0.1'); // 1 means 1%
	const defaultDeviationIncrementBasisPoints = defaultDeviationIncrementPercentage.mul(DECIMAL_100); // 1bps means 0.01%, 10bps means 0.1%
	const defaultMaximumMarketOrderSlippagePercentage = Decimal('2.5'); // 1 means 1%

	const defaultOrderMinimumAmountIncrement = Decimal('0.00000001'); // Depends on the market (BTC uses 8 decimals)
	const defaultOrderMinimumPriceIncrement = Decimal('0.000000000001'); // Depends on the market (BTC uses 12 decimals)

	const defaultOrderMinimumAmount = Decimal('0.00000009'); // Depends on the market, for BTC at the current price, this is ~$0.01 (1 cent)
	const defaultOrderMiddleAmount = Decimal('0.00000018'); // Depends on the market, for BTC at the current price, this is ~$0.02 (2 cents)
	const defaultOrderMaximumAmount = Decimal('0.00000027'); // Depends on the market, for BTC at the current price, this is ~$0.05 (5 cents)

	const defaultBuyOrderMinimumPrice = Decimal('1'); // Depends on the market, buying 1 BTC for $1 is profitable
	const defaultBuyOrderMiddlePrice = Decimal('2'); // Depends on the market, buying 1 BTC for $2 is profitable
	const defaultBuyOrderMaximumPrice = defaultMarketPrice.mul(DECIMAL_100.minus(defaultSpreadPercentage).div(DECIMAL_100)); // Depends on the market, buying 1 BTC for $5 is profitable
	const defaultBuyOrderFillablePrice = defaultMarketPrice.mul(DECIMAL_100.plus(defaultFillableSpreadPercentage).div(DECIMAL_100));

	const defaultSellOrderFillablePrice = defaultMarketPrice.mul(DECIMAL_100.minus(defaultFillableSpreadPercentage).div(DECIMAL_100));
	const defaultSellOrderMinimumPrice = defaultMarketPrice.mul(DECIMAL_100.plus(defaultSpreadPercentage).div(DECIMAL_100));
	const defaultSellOrderMiddlePrice = Decimal('500000'); // Depends on the market, selling 1 BTC for $500,000 is profitable
	const defaultSellOrderMaximumPrice = Decimal('799999'); // Depends on the market, selling 1 BTC for $999,999 is profitable

	const defaultTrackingOrderMaximumDeviationPercentage = Decimal('2.5'); // 1% means 100bps, 2.5% means 250bps
	const defaultTrackingOrderMaximumDeviationBasisPoints = defaultTrackingOrderMaximumDeviationPercentage.mul(DECIMAL_100); // 1bps means 0.01%, 250bps means 2.5%
	const defaultFillableTrackingOrderPercentage = defaultFillableSpreadPercentage.neg(); // 1% means 100bps, -0.01% means -1bps
	const defaultFillableTrackingOrderBasisPoints = defaultFillableTrackingOrderPercentage.mul(DECIMAL_100); // 1bps means 0.01%, -1 bps means -0.01%

	const sanitizeOrderPriceForDefaultMarket = (price: Decimal, side: OrderSide) => {
		try {
			return sanitizeOrderPrice(price, defaultMarket.tick)
		} catch (error) {
			if (side === OrderSide.BUY) {
				if (price.toDecimalPlaces(0).lte(defaultBuyOrderFillablePrice)) {
					return sanitizeOrderPrice(price.toDecimalPlaces(0), defaultMarket.tick)
				}
			} else if (side === OrderSide.SELL) {
				if (price.toDecimalPlaces(0).gte(defaultSellOrderFillablePrice)) {
					return sanitizeOrderPrice(price.toDecimalPlaces(0), defaultMarket.tick)
				}
			} else {
				throw error;
			}

			throw error;
		};
	}

	const orderTemplates = {
		place: {
			single: {
				fixedPrice: {
					buy: null as unknown as FinPlaceOrderRequest,
					sell: null as unknown as FinPlaceOrderRequest,
				},
				limit: {
					buy: null as unknown as FinPlaceOrderRequest,
					sell: null as unknown as FinPlaceOrderRequest,
				},
				tracking: {
					buy: null as unknown as FinPlaceOrderRequest,
					sell: null as unknown as FinPlaceOrderRequest,
				},
				market: {
					buy: null as unknown as FinPlaceOrderRequest,
					sell: null as unknown as FinPlaceOrderRequest,
				},
			},
			multiple: Array<FinPlaceOrderRequest>(),
		},
		replace: {
			single: {
				fixedPrice: {
					buy: null as unknown as FinReplaceOrderRequest,
					sell: null as unknown as FinReplaceOrderRequest,
				},
				limit: {
					buy: null as unknown as FinReplaceOrderRequest,
					sell: null as unknown as FinReplaceOrderRequest,
				},
				tracking: {
					buy: null as unknown as FinReplaceOrderRequest,
					sell: null as unknown as FinReplaceOrderRequest,
				},
				market: {
					buy: undefined as unknown as FinReplaceOrderRequest,
					sell: undefined as unknown as FinReplaceOrderRequest,
				},
			},
			multiple: Array<FinReplaceOrderRequest>(),
		},
		cancel: {
			single: {
				fixedPrice: {
					buy: null as unknown as FinPlaceOrderRequest,
					sell: null as unknown as FinPlaceOrderRequest,
				},
				limit: {
					buy: null as unknown as FinReplaceOrderRequest,
					sell: null as unknown as FinReplaceOrderRequest,
				},
				tracking: {
					buy: null as unknown as FinPlaceOrderRequest,
					sell: null as unknown as FinPlaceOrderRequest,
				},
				market: {
					buy: undefined as unknown as FinPlaceOrderRequest,
					sell: undefined as unknown as FinPlaceOrderRequest,
				}
			},
			multiple: Array<FinPlaceOrderRequest>(),
		},
	}

	const baseOrder = {
		ownerAddress: walletAddress,
		marketAddress: defaultMarketAddress,
		marketSymbol: defaultMarketSymbol,
		market: defaultMarket,
	};

	orderTemplates.place.single.fixedPrice.buy = {
		...baseOrder,
		type: OrderType.FIXED_PRICE,
		side: OrderSide.BUY,
		amount: defaultOrderMinimumAmount,
		price: sanitizeOrderPriceForDefaultMarket(defaultBuyOrderMaximumPrice.toDecimalPlaces(4), OrderSide.BUY)
	} as FinPlaceOrderRequest;

	orderTemplates.place.single.fixedPrice.sell = {
		...baseOrder,
		type: OrderType.FIXED_PRICE,
		side: OrderSide.SELL,
		amount: defaultOrderMinimumAmount,
		price: sanitizeOrderPriceForDefaultMarket(defaultSellOrderMinimumPrice.toDecimalPlaces(4), OrderSide.SELL)
	} as FinPlaceOrderRequest;

	orderTemplates.place.single.tracking.buy = {
		...baseOrder,
		type: OrderType.TRACKING_ORDER,
		side: OrderSide.BUY,
		amount: defaultOrderMinimumAmount,
		deviationInBasisPoints: defaultTrackingOrderMaximumDeviationBasisPoints,
		deviationInPercentage: defaultTrackingOrderMaximumDeviationPercentage,
	} as FinPlaceOrderRequest;

	orderTemplates.place.single.tracking.sell = {
		...baseOrder,
		type: OrderType.TRACKING_ORDER,
		side: OrderSide.SELL,
		amount: defaultOrderMinimumAmount,
		deviationInBasisPoints: defaultTrackingOrderMaximumDeviationBasisPoints,
		deviationInPercentage: defaultTrackingOrderMaximumDeviationPercentage,
	} as FinPlaceOrderRequest;

	orderTemplates.place.single.market.buy = {
		...baseOrder,
		type: OrderType.MARKET,
		side: OrderSide.BUY,
		amount: defaultOrderMinimumAmount,
	} as FinPlaceOrderRequest;

	orderTemplates.place.single.market.sell = {
		...baseOrder,
		type: OrderType.MARKET,
		side: OrderSide.SELL,
		amount: defaultOrderMinimumAmount,
	} as FinPlaceOrderRequest;

	orderTemplates.place.multiple = [
		// Fixed price buy orders
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.BUY, amount: defaultOrderMaximumAmount, price: defaultBuyOrderMinimumPrice },
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.BUY, amount: defaultOrderMiddleAmount, price: defaultBuyOrderMiddlePrice },
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.BUY, amount: defaultOrderMinimumAmount, price: defaultBuyOrderMaximumPrice },
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.BUY, amount: defaultOrderMinimumAmount, price: defaultBuyOrderFillablePrice },

		// Fixed price sell orders
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.SELL, amount: defaultOrderMinimumAmount, price: defaultSellOrderFillablePrice },
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.SELL, amount: defaultOrderMinimumAmount, price: defaultSellOrderMinimumPrice },
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.SELL, amount: defaultOrderMiddleAmount, price: defaultSellOrderMiddlePrice },
		{ ...baseOrder, type: OrderType.FIXED_PRICE, side: OrderSide.SELL, amount: defaultOrderMaximumAmount, price: defaultSellOrderMaximumPrice },

		// Tracking buy orders
		{ ...baseOrder, type: OrderType.TRACKING_ORDER, side: OrderSide.BUY, amount: defaultOrderMinimumAmount, deviationInBasisPoints: defaultTrackingOrderMaximumDeviationBasisPoints, deviationInPercentage: defaultTrackingOrderMaximumDeviationPercentage },
		{ ...baseOrder, type: OrderType.TRACKING_ORDER, side: OrderSide.BUY, amount: defaultOrderMinimumAmount, deviationInBasisPoints: defaultFillableTrackingOrderBasisPoints, deviationInPercentage: defaultFillableTrackingOrderPercentage },

		// Tracking sell orders
		{ ...baseOrder, type: OrderType.TRACKING_ORDER, side: OrderSide.SELL, amount: defaultOrderMinimumAmount, deviationInBasisPoints: defaultFillableTrackingOrderBasisPoints, deviationInPercentage: defaultFillableTrackingOrderPercentage },
		{ ...baseOrder, type: OrderType.TRACKING_ORDER, side: OrderSide.SELL, amount: defaultOrderMinimumAmount, deviationInBasisPoints: defaultTrackingOrderMaximumDeviationBasisPoints, deviationInPercentage: defaultTrackingOrderMaximumDeviationPercentage },
	];

	orderTemplates.place.multiple = orderTemplates.place.multiple.map(order => ({
		...order,
		amount: order.amount.plus(defaultOrderMinimumAmount), // To differentiate between single and multiple orders
		price: order.price ? sanitizeOrderPriceForDefaultMarket(order.price.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), order.side) : undefined, // To differentiate between single and multiple orders
		deviationInBasisPoints: order.deviationInBasisPoints ? order.deviationInBasisPoints.plus(defaultDeviationIncrementBasisPoints) : undefined, // To differentiate between single and multiple orders
		deviationInPercentage: order.deviationInPercentage ? order.deviationInPercentage.plus(defaultDeviationIncrementPercentage) : undefined, // To differentiate between single and multiple orders
	})) as FinPlaceOrderRequest[];

	orderTemplates.replace.single.fixedPrice.buy = {
		...orderTemplates.place.single.fixedPrice.buy,
		amount: orderTemplates.place.single.fixedPrice.buy.amount.plus(orderTemplates.place.single.fixedPrice.buy.amount)
	} as FinReplaceOrderRequest;

	orderTemplates.replace.single.fixedPrice.sell = {
		...orderTemplates.place.single.fixedPrice.sell,
		amount: orderTemplates.place.single.fixedPrice.sell.amount.plus(orderTemplates.place.single.fixedPrice.sell.amount)
	} as FinReplaceOrderRequest;

	orderTemplates.replace.single.tracking.buy = {
		...orderTemplates.place.single.tracking.buy,
		amount: orderTemplates.place.single.tracking.buy.amount.plus(orderTemplates.place.single.tracking.buy.amount)
	} as FinReplaceOrderRequest;

	orderTemplates.replace.single.tracking.sell = {
		...orderTemplates.place.single.tracking.sell,
		amount: orderTemplates.place.single.tracking.sell.amount.plus(orderTemplates.place.single.tracking.sell.amount)
	} as FinReplaceOrderRequest;

	orderTemplates.replace.multiple = orderTemplates.place.multiple.map((order: FinPlaceOrderRequest) => ({
		...order,
		amount: order.amount.plus(order.amount)
	})) as FinReplaceOrderRequest[];

	orderTemplates.cancel.single.fixedPrice.buy = orderTemplates.replace.single.fixedPrice.buy as FinReplaceOrderRequest;
	orderTemplates.cancel.single.fixedPrice.sell = orderTemplates.replace.single.fixedPrice.sell as FinReplaceOrderRequest;
	orderTemplates.cancel.single.tracking.buy = orderTemplates.replace.single.tracking.buy as FinReplaceOrderRequest;
	orderTemplates.cancel.single.tracking.sell = orderTemplates.replace.single.tracking.sell as FinReplaceOrderRequest;

	orderTemplates.cancel.multiple = orderTemplates.replace.multiple as FinReplaceOrderRequest[];

	const orders = {
		fixedPrice: {
			buy: undefined as unknown as Order,
			sell: undefined as unknown as Order,
		},
		tracking: {
			buy: undefined as unknown as Order,
			sell: undefined as unknown as Order,
		},
		market: {
			buy: undefined as unknown as Order,
			sell: undefined as unknown as Order,
		},
		multiple: undefined as unknown as Map<OrderId, Order>,
		allCanceled: undefined as unknown as Map<OrderId, Order>,
		allWithdrawn: undefined as unknown as Map<OrderId, Order>,
	}

	if (active.getStatus) {
		const getStatus = await rujira.fin.getStatus({});
		console.log('getStatus:\n', dump(getStatus));
	}

	if (active.getTransaction) {
		const getTransaction = await rujira.fin.getTransaction({
			// Too old transactions cannot be fetched from NineRealms, maybe the hash needs to be updated.
			hash: defaultTransactionHash
		});
		console.log('getTransaction:\n', dump(getTransaction));
	}

	if (active.getAllTokens) {
		const getAllTokens = await rujira.fin.getAllTokens({});
		console.log('getAllTokens:size:', dump(getAllTokens.size));
		console.log('getAllTokens:symbols:\n', dump(getAllTokens.keySeq().toJS()));
		console.log('getAllTokens:addresses\n', dump(getAllTokens.valueSeq().map(token => token.address).toJS()));
		console.log('getAllTokens:symbols->addresses:\n', dump(getAllTokens.entrySeq().map((entry: [TokenSymbol, Token]) => `${entry[0]} -> ${entry[1].address}`).toJS()));
		// console.log('getAllTokens\n', getAllTokens.toJS());
	}

	if (active.getTokens) {
		const getTokens = await rujira.fin.getTokens({
			addresses: [
				'x/ruji', // THOR-RUJI
				'bsc-usdc-0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', // ETH-USDT
			],
			symbols: [
				'THOR-NAMI',
				'THOR-RUNE',
			]
		});
		console.log('getTokens:size:', dump(getTokens.size));
		console.log('getTokens:symbols:\n', dump(getTokens.keySeq().toJS()));
		console.log('getTokens:addresses\n', dump(getTokens.valueSeq().map(token => token.address).toJS()));
		console.log('getTokens:symbols->addresses:\n', dump(getTokens.entrySeq().map((entry: [TokenSymbol, Token]) => `${entry[0]} -> ${entry[1].address}`).toJS()));
		// console.log('getTokens\n', getTokens.toJS());
	}

	if (active.getToken) {
		const getToken = await rujira.fin.getToken({
			address: 'avax-avax', // AVAX-AVAX
			// symbol: 'AVAX-AVAX'
		});
		console.log('getToken:address:', dump(getToken.address));
		console.log('getToken:symbol:', dump(getToken.symbol));
		console.log('getToken\n', dump(getToken));
	}

	if (active.getAllMarkets) {
		const getAllMarkets = await rujira.fin.getAllMarkets({});
		console.log('getAllMarkets:size:', dump(getAllMarkets.size));
		console.log('getAllMarkets:symbols:\n', dump(getAllMarkets.keySeq().toJS()));
		console.log('getAllMarkets:addresses\n', dump(getAllMarkets.valueSeq().map(market => market.address).toJS()));
		console.log('getAllMarkets:symbols->addresses:\n', dump(getAllMarkets.entrySeq().map((entry: [MarketSymbol, Market]) => `${entry[0]} -> ${entry[1].address}`).toJS()));
		// console.log('getAllMarkets\n', getAllMarkets.toJS());
	}

	if (active.getMarkets) {
		const getMarkets = await rujira.fin.getMarkets({
			addresses: [
				'thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz', // BTC-BTC/ETH-USDC
				'thor1ax94w4rldvdgc4xgsfwgve7g7xfyxhvuvquvx57vtmr6y4alev0qw3mlvr', // THOR-LQDY/ETH-USDC
			],
			symbols: [
				'THOR-RUJI/ETH-USDC',
				'THOR-RUJI/THOR-RUNE',
			]
		});
		console.log('getMarkets:size:', dump(getMarkets.size));
		console.log('getMarkets:symbols:\n', dump(getMarkets.keySeq().toJS()));
		console.log('getMarkets:addresses:\n', dump(getMarkets.valueSeq().map(market => market.address).toJS()));
		console.log('getMarkets:symbols->addresses:\n', dump(getMarkets.entrySeq().map((entry: [MarketSymbol, Market]) => `${entry[0]} -> ${entry[1].address}`).toJS()));
		// console.log('getMarkets\n', getMarkets.toJS());
	}

	if (active.getMarket) {
		const getMarket = await rujira.fin.getMarket({
			// address: 'thor12ds7fxj5g47jwzfzvzzhzxxd3cp6v55flgwxva0803r8k5mzm44skth6wa', // THOR-TCY/THOR-RUNE
			symbol: 'THOR-TCY/THOR-RUNE'
		});
		console.log('getMarket:address:', dump(getMarket.address));
		console.log('getMarket:symbol:', dump(getMarket.symbol));
		console.log('getMarket\n', dump(getMarket));
	}

	if (active.getOrderBook) {
		const getOrderBook = await rujira.fin.getOrderBook({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
		});
		console.log('getOrderBook:\n', dump(getOrderBook));
	}

	if (active.getTicker) {
		const getTicker = await rujira.fin.getTicker({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
		});
		console.log('getTicker:\n', dump(getTicker));
	}

	if (active.getCandles) {
		const getCandles = await rujira.fin.getCandles({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			// interval: CandleInterval.ONE_MINUTE,
			// maximumNumberOfCandles: 100,
		});
		console.log('getCandles:size:', dump(getCandles.size));
		console.log('getCandles:\n', dump(getCandles.toJS()));
	}

	if (active.getIndicators) {
		const getIndicators = await rujira.fin.getIndicators({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			// interval: CandleInterval.ONE_MINUTE,
			// maximumNumberOfCandles: 100,
			// candles: undefined,
			indicatorsIds: [
				Indicator.bollinger_bands.id,
				Indicator.moving_average_convergence_divergence.id,
				Indicator.relative_strength_index.id,
			]
		});
		console.log('getIndicators:size:', dump(getIndicators.size));
		console.log('getIndicators:\n', dump(getIndicators.toJS()));
	}

	if (active.getBalances) {
		const getBalances = await rujira.fin.getBalances({
			walletAddress,
			// wallet: undefined,
			// tokenAddresses: [],
			// tokenSymbols: [
			// 	'THOR-NAMI',
			// 	// 'ETH-GUSD',
			// ],
		});
		console.log('getBalances:\n', dump(getBalances));
	}

	if (active.placeOrder) {
		console.log('🔥 PLACING SINGLE ORDERS ================================================================================');

		const fixedPriceBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.fixedPrice.buy);
		orders.fixedPrice.buy = fixedPriceBuyOrder.order;
		console.log(`✅ Fixed Price BUY Order Placed: ${fixedPriceBuyOrder.order.id}`);
		// console.log('\n', dump(fixedPriceBuyOrder));

		const fixedPriceSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.fixedPrice.sell);
		orders.fixedPrice.sell = fixedPriceSellOrder.order;
		console.log(`✅ Fixed Price SELL Order Placed: ${fixedPriceSellOrder.order.id}`);
		// console.log('\n', dump(fixedPriceSellOrder));

		const trackingBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.buy);
		orders.tracking.buy = trackingBuyOrder.order;
		console.log(`✅ Tracking BUY Order Placed: ${trackingBuyOrder.order.id}`);
		// console.log('\n', dump(trackingBuyOrder));

		const trackingSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.sell);
		orders.tracking.sell = trackingSellOrder.order;
		console.log(`✅ Tracking SELL Order Placed: ${trackingSellOrder.order.id}`);
		// console.log('\n', dump(trackingSellOrder));

		// const marketBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.buy);
		// orders.market.buy = marketBuyOrder.order;
		// console.log(`✅ Market BUY Order Placed: ${marketBuyOrder.order.id}`);
		// console.log('\n', dump(marketBuyOrder));

		// const marketSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.sell);
		// orders.market.sell = marketSellOrder.order;
		// console.log(`✅ Market SELL Order Placed: ${marketSellOrder.order.id}`);
		// console.log('\n', dump(marketSellOrder));

		console.log('🎉 ALL SINGLE ORDERS PLACED SUCCESSFULLY!');
	}

	if (active.getOrder) {
		console.log('🔍 GETTING SINGLE ORDERS ================================================================================');

		const buyFixedPriceOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orderType: orderTemplates.place.single.fixedPrice.buy.type,
			orderSide: orderTemplates.place.single.fixedPrice.buy.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.fixedPrice.buy.price),
		});
		orders.fixedPrice.buy = buyFixedPriceOrder;
		console.log(`✅ Fixed Price BUY Order Retrieved: ${buyFixedPriceOrder.id}`);
		// console.log('\n', dump(buyFixedPriceOrder));
		console.log('');

		const sellFixedPriceOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orderType: orderTemplates.place.single.fixedPrice.sell.type,
			orderSide: orderTemplates.place.single.fixedPrice.sell.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.fixedPrice.sell.price)
		});
		orders.fixedPrice.sell = sellFixedPriceOrder;
		console.log(`✅ Fixed Price SELL Order Retrieved: ${sellFixedPriceOrder.id}`);
		// console.log('\n', dump(sellFixedPriceOrder));
		console.log('');

		const buyTrackingOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orderType: orderTemplates.place.single.tracking.buy.type,
			orderSide: orderTemplates.place.single.tracking.buy.side,
			orderDeviationInBasisPoints: cast<OrderDeviationInBasisPoints>(orderTemplates.place.single.tracking.buy.deviationInBasisPoints),
			// orderDeviationInPercentage: cast<OrderDeviationInPercentage>(orderTemplates.place.single.tracking.buy.deviationInPercentage)
		});
		orders.tracking.buy = buyTrackingOrder;
		console.log(`✅ Tracking BUY Order Retrieved: ${buyTrackingOrder.id}`);
		// console.log('\n', dump(buyTrackingOrder));
		console.log('');

		const sellTrackingOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orderType: orderTemplates.place.single.tracking.sell.type,
			orderSide: orderTemplates.place.single.tracking.sell.side,
			orderDeviationInBasisPoints: cast<OrderDeviationInBasisPoints>(orderTemplates.place.single.tracking.sell.deviationInBasisPoints),
			// orderDeviationInPercentage: cast<OrderDeviationInPercentage>(orderTemplates.place.single.tracking.sell.deviationInPercentage)
		});
		orders.tracking.sell = sellTrackingOrder;
		console.log(`✅ Tracking SELL Order Retrieved: ${sellTrackingOrder.id}`);
		// console.log('\n', dump(sellTrackingOrder));

		console.log('🎉 ALL SINGLE ORDERS RETRIEVED SUCCESSFULLY!');
	}

	if (active.replaceOrder) {
		console.log('🔄 REPLACING SINGLE ORDERS ================================================================================');

		const fixedPriceBuyOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.buy);
		orders.fixedPrice.buy = fixedPriceBuyOrder.order;
		console.log(`✅ Fixed Price BUY Order Replaced: ${fixedPriceBuyOrder.order.id}`);
		// console.log('\n', dump(fixedPriceBuyOrder));

		const fixedPriceSellOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.sell);
		orders.fixedPrice.sell = fixedPriceSellOrder.order;
		console.log(`✅ Fixed Price SELL Order Replaced: ${fixedPriceSellOrder.order.id}`);
		// console.log('\n', dump(fixedPriceSellOrder));

		const trackingBuyOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.tracking.buy);
		orders.tracking.buy = trackingBuyOrder.order;
		console.log(`✅ Tracking BUY Order Replaced: ${trackingBuyOrder.order.id}`);
		// console.log('\n', dump(trackingBuyOrder));

		const trackingSellOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.tracking.sell);
		orders.tracking.sell = trackingSellOrder.order;
		console.log(`✅ Tracking SELL Order Replaced: ${trackingSellOrder.order.id}`);
		// console.log('\n', dump(trackingSellOrder));

		console.log('🎉 ALL SINGLE ORDERS REPLACED SUCCESSFULLY!');
	}

	if (active.cancelOrder) {
		console.log('❌ CANCELLING SINGLE ORDERS ================================================================================');

		const fixedPriceBuyOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				// ownerAddress: orderTemplates.place.single.fixedPrice.buy.ownerAddress,
				// marketSymbol: orderTemplates.place.single.fixedPrice.buy.marketSymbol,
				// market: orderTemplates.place.single.fixedPrice.buy.market,
				// orderType: orderTemplates.place.single.fixedPrice.buy.type,
				// orderSide: orderTemplates.place.single.fixedPrice.buy.side,
				// orderPrice: orderTemplates.place.single.fixedPrice.buy.price,
				// orderDeviationInBasisPoints: orderTemplates.place.single.fixedPrice.buy.deviationInBasisPoints,
				// orderDeviationInPercentage: orderTemplates.place.single.fixedPrice.buy.deviationInPercentage,
				order: orderTemplates.place.single.fixedPrice.buy
			}),
			// order: orders.fixedPrice.buy,
			ownerAddress: orderTemplates.place.single.fixedPrice.buy.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.place.single.fixedPrice.buy.marketAddress,
			marketSymbol: orderTemplates.place.single.fixedPrice.buy.marketSymbol,
			// market: orderTemplates.place.single.fixedPrice.buy.market,
		});
		orders.fixedPrice.buy = fixedPriceBuyOrder.order;
		console.log(`✅ Fixed Price BUY Order Cancelled: ${fixedPriceBuyOrder.order.id}`);
		// console.log('\n', dump(fixedPriceBuyOrder));

		const fixedPriceSellOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				// ownerAddress: orderTemplates.place.single.fixedPrice.sell.ownerAddress,
				// marketSymbol: orderTemplates.place.single.fixedPrice.sell.marketSymbol,
				// market: orderTemplates.place.single.fixedPrice.sell.market,
				// orderType: orderTemplates.place.single.fixedPrice.sell.type,
				// orderSide: orderTemplates.place.single.fixedPrice.sell.side,
				// orderPrice: orderTemplates.place.single.fixedPrice.sell.price,
				// orderDeviationInBasisPoints: orderTemplates.place.single.fixedPrice.sell.deviationInBasisPoints,
				// orderDeviationInPercentage: orderTemplates.place.single.fixedPrice.sell.deviationInPercentage,
				order: orderTemplates.place.single.fixedPrice.sell
			}),
			// order: orders.fixedPrice.sell,
			ownerAddress: orderTemplates.place.single.fixedPrice.sell.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.place.single.fixedPrice.sell.marketAddress,
			marketSymbol: orderTemplates.place.single.fixedPrice.sell.marketSymbol,
			// market: orderTemplates.place.single.fixedPrice.sell.market,
		});
		orders.fixedPrice.sell = fixedPriceSellOrder.order;
		console.log(`✅ Fixed Price SELL Order Cancelled: ${fixedPriceSellOrder.order.id}`);
		// console.log('\n', dump(fixedPriceSellOrder));

		const trackingBuyOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				// ownerAddress: orderTemplates.place.single.tracking.buy.ownerAddress,
				// marketSymbol: orderTemplates.place.single.tracking.buy.marketSymbol,
				// market: orderTemplates.place.single.tracking.buy.market,
				// orderType: orderTemplates.place.single.tracking.buy.type,
				// orderSide: orderTemplates.place.single.tracking.buy.side,
				// orderPrice: orderTemplates.place.single.tracking.buy.price,
				// orderDeviationInBasisPoints: orderTemplates.place.single.tracking.buy.deviationInBasisPoints,
				// orderDeviationInPercentage: orderTemplates.place.single.tracking.buy.deviationInPercentage,
				order: orderTemplates.place.single.tracking.buy
			}),
			// order: orders.tracking.buy,
			ownerAddress: orderTemplates.place.single.tracking.buy.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.place.single.tracking.buy.marketAddress,
			marketSymbol: orderTemplates.place.single.tracking.buy.marketSymbol,
			// market: orderTemplates.place.single.tracking.buy.market,
		});
		orders.tracking.buy = trackingBuyOrder.order;
		console.log(`✅ Tracking BUY Order Cancelled: ${trackingBuyOrder.order.id}`);
		// console.log('\n', dump(trackingBuyOrder));

		const trackingSellOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				// ownerAddress: orderTemplates.place.single.tracking.sell.ownerAddress,
				// marketSymbol: orderTemplates.place.single.tracking.sell.marketSymbol,
				// market: orderTemplates.place.single.tracking.sell.market,
				// orderType: orderTemplates.place.single.tracking.sell.type,
				// orderSide: orderTemplates.place.single.tracking.sell.side,
				// orderPrice: orderTemplates.place.single.tracking.sell.price,
				// orderDeviationInBasisPoints: orderTemplates.place.single.tracking.sell.deviationInBasisPoints,
				// orderDeviationInPercentage: orderTemplates.place.single.tracking.sell.deviationInPercentage,
				order: orderTemplates.place.single.tracking.sell
			}),
			// order: orders.tracking.sell,
			ownerAddress: orderTemplates.place.single.tracking.sell.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.place.single.tracking.sell.marketAddress,
			marketSymbol: orderTemplates.place.single.tracking.sell.marketSymbol,
			// market: orderTemplates.place.single.tracking.sell.market,
		});
		orders.tracking.sell = trackingSellOrder.order;
		console.log(`✅ Tracking SELL Order Cancelled: ${trackingSellOrder.order.id}`);
		// console.log('\n', dump(trackingSellOrder));

		console.log('🎉 ALL SINGLE ORDERS CANCELLED SUCCESSFULLY!');
	}

	if (active.placeOrders) {
		console.log('🔥 PLACING MULTIPLE ORDERS ================================================================================');

		const placeOrders = await rujira.fin.placeOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.place.multiple
		});
		orders.multiple = placeOrders.orders;
		console.log('✅ Orders Placed:');
		console.log('   📊 Total Orders:', dump(placeOrders.orders.size));
		console.log('   🆔 Order IDs\n:', dump(placeOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes\n:', dump(placeOrders.transactions.keySeq().toJS()));
		console.log('');

		console.log('🎉 ALL MULTIPLE ORDERS PLACED SUCCESSFULLY!');
	}

	if (active.getOrders) {
		console.log('🔍 GETTING MULTIPLE ORDERS ================================================================================');

		const getOrders = await rujira.fin.getOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orderTypes: [OrderType.FIXED_PRICE, OrderType.TRACKING_ORDER],
			orderSides: [OrderSide.BUY, OrderSide.SELL],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED],
			// orderPrices: orderTemplates.place.multiple.map(order => get<OrderPrice>(order.price)),
			// maximumNumberOfOrders: orderTemplates.place.multiple.length
		});
		orders.multiple = getOrders;
		console.log('✅ Orders Retrieved:');
		console.log('   📊 Total Orders:', dump(getOrders.size));
		console.log('   🆔 Order IDs\n:', dump(getOrders.keySeq().toJS()));
		// console.log('   📋 Order Details:\n', dump(getOrders.toJS()));

		console.log('🎉 ALL MULTIPLE ORDERS RETRIEVED SUCCESSFULLY!');
	}

	if (active.replaceOrders) {
		console.log('🔄 REPLACING MULTIPLE ORDERS ================================================================================');

		const replaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.replace.multiple
		});
		orders.multiple = replaceOrders.orders;
		console.log('✅ Orders Replaced:');
		console.log('   📊 Total Orders:', dump(replaceOrders.orders.size));
		console.log('   🆔 Order IDs\n:', dump(replaceOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes\n:', dump(replaceOrders.transactions.keySeq().toJS()));

		console.log('🎉 ALL MULTIPLE ORDERS REPLACED SUCCESSFULLY!');
	}

	if (active.cancelOrders) {
		console.log('❌ CANCELLING MULTIPLE ORDERS ================================================================================');

		const cancelOrders = await rujira.fin.cancelOrders({
			orderIds: orderTemplates.cancel.multiple.map(order => rujira.fin.getOrderId({
				// ownerAddress: order.ownerAddress,
				// marketSymbol: order.marketSymbol,
				// market: order.market,
				// orderType: order.type,
				// orderSide: order.side,
				// orderPrice: order.price,
				// orderDeviationInBasisPoints: order.deviationInBasisPoints,
				// orderDeviationInPercentage: order.deviationInPercentage,
				order: order
			})),
			// orders: orders.multiple.valueSeq().toList(),
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
		});
		// Store fixed price cancel orders by side
		orders.multiple = cancelOrders.orders;
		console.log('✅ Orders Cancelled:');
		console.log('   📊 Total Orders:', dump(cancelOrders.orders.size));
		console.log('   🆔 Order IDs\n:', dump(cancelOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes\n:', dump(cancelOrders.transactions.keySeq().toJS()));

		console.log('🎉 ALL MULTIPLE ORDERS CANCELLED SUCCESSFULLY!');
	}

	if (active.cancelAllOrders) {
		console.log('❌ CANCELLING ALL ORDERS ================================================================================');

		const cancelAllOrders = await rujira.fin.cancelAllOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
		});
		orders.allCanceled = cancelAllOrders.orders;
		console.log('✅ All Orders Cancelled:');
		console.log('   📊 Total Orders:', dump(cancelAllOrders.orders.size));
		console.log('   🆔 Order IDs\n:', dump(cancelAllOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes\n:', dump(cancelAllOrders.transactions.keySeq().toJS()));

		console.log('🎉 ALL ORDERS CANCELLED SUCCESSFULLY!');
	}

	if (active.withdrawAllFilledOrders) {
		console.log('💰 WITHDRAWING ALL FILLED ORDERS ================================================================================');

		const withdrawAllFilledOrders = await rujira.fin.withdrawAllFilledOrders({
			ownerAddress: walletAddress,
			marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
		});
		orders.allWithdrawn = withdrawAllFilledOrders.orders;
		console.log('✅ Filled Orders Withdrawn:');
		console.log('   📊 Total Orders:', dump(withdrawAllFilledOrders.orders.size));
		console.log('   🆔 Order IDs\n:', dump(withdrawAllFilledOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes\n:', dump(withdrawAllFilledOrders.transactions.keySeq().toJS()));
	}
})();

