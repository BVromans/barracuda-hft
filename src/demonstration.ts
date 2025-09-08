import Decimal from "decimal.js";
import "./bootstrap";
import { properties } from "./properties";
import { Rujira } from "./rujira";
import { DECIMAL_100, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, Map, Market, MarketSymbol, Order, OrderBookOrder, OrderDeviationInBasisPoints, OrderId, OrderPrice, OrderSide, OrderStatus, OrderType, Price, RujiraConstructorOptions, RujiraInitializeOptions, Token, TokenSymbol, WalletAddress, WalletMnemonic, WalletPrivateKey } from "./types";
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
		placeOrders: false,
		getOrder: false,
		getOrders: false,
		replaceOrder: false,
		replaceOrders: false,
		cancelOrder: false,
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

	console.log('defaultMarketTicker:\n', defaultMarketTicker?.middlePrice?.baseToQuote?.toFixed());

	const defaultMarketOrderBook = await rujira.fin.getOrderBook({
		marketAddress: defaultMarketAddress,
		marketSymbol: defaultMarketSymbol,
	});

	console.log('defaultMarketOrderBook:bestBid:\n', defaultMarketOrderBook?.book?.bestBid?.price?.toFixed());
	console.log('defaultMarketOrderBook:bestAsk:\n', defaultMarketOrderBook?.book?.bestAsk?.price?.toFixed());

	const defaultSpreadPercentage = Decimal('50');
	const defaultFillableSpreadPercentage = Decimal('1');
	const defaultPriceIncrementPercentage = Decimal('1');
	const defaultMaximumMarketOrderSlippagePercentage = Decimal('2.5');

	const defaultOrderMininumAmountIncrement = Decimal('0.00000001'); // Depends on the market decimals
	const defaultOrderMinimumPriceIncrement = Decimal('0.000000000001'); // Usually 1e-12

	const defaultOrderMininumAmount = Decimal('0.00000001'); // Depends on the market decimals
	const defaultOrderMiddleAmount = Decimal('0.01234567'); // Depends on the market decimals
	const defaultOrderMaximumAmount = Decimal('0.12345678'); // Depends on the market decimals

	const defaultBuyOrderMininumPrice = Decimal('0.01000000'); // Usually 1e-12
	const defaultBuyOrderMiddlePrice = Decimal('0.01234'); // Depends on the market tick
	const defaultBuyOrderMaximumPrice = cast<Price>(defaultMarketTicker.middlePrice.baseToQuote).mul(defaultSpreadPercentage.div(DECIMAL_100)); // Depends on the market tick
	const defaultBuyOrderFillablePrice = cast<OrderBookOrder>(defaultMarketOrderBook.book.bestAsk).price.mul(defaultFillableSpreadPercentage.plus(DECIMAL_100).div(DECIMAL_100)); // Depends on the market tick

	const defaultSellOrderMininumPrice = cast<Price>(defaultMarketTicker.middlePrice.baseToQuote).mul(defaultSpreadPercentage.plus(DECIMAL_100).div(DECIMAL_100)); // Depends on the market tick
	const defaultSellOrderMiddlePrice = Decimal('98.76'); // Depends on the market tick
	const defaultSellOrderMaximumPrice = Decimal('9999'); // Depends from the market "tick", which blocks the max precision
	const defaultSellOrderFillablePrice = cast<OrderBookOrder>(defaultMarketOrderBook.book.bestBid).price.mul(DECIMAL_100.minus(defaultFillableSpreadPercentage).div(DECIMAL_100)); // Depends on the market tick

	const trackingOrderMinimumDeviationBasisPoints = Decimal('10'); // 0.1%
	const trackingOrderMinimumDeviationPercentage = Decimal('0.1');
	const trackingOrderMiddleDeviationBasisPoints = Decimal('150'); // 1.5%
	const trackingOrderMiddleDeviationPercentage = Decimal('1.5');
	const trackingOrderMaximumDeviationBasisPoints = Decimal('250'); // 2.5%
	const trackingOrderMaximumDeviationPercentage = Decimal('2.5');

	// Base template for all order types
	const baseOrder = {
		ownerAddress: walletAddress,
		marketAddress: defaultMarketAddress,
		marketSymbol: defaultMarketSymbol,
		market: defaultMarket,
	} as const;

	const orderTemplates = {
		place: {
			single: {
				fixedPrice: {
					buy: {
						...baseOrder,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.toDecimalPlaces(4), defaultMarket.tick)
					} as FinPlaceOrderRequest,
					sell: {
						...baseOrder,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.toDecimalPlaces(4), defaultMarket.tick)
					} as FinPlaceOrderRequest,
				},
				limit: {},
				tracking: {
					buy: {
						...baseOrder,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.BUY,
						amount: defaultOrderMininumAmount,
						deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMaximumDeviationPercentage
					} as FinPlaceOrderRequest,
					sell: {
						...baseOrder,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.SELL,
						amount: defaultOrderMininumAmount,
						deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMaximumDeviationPercentage
					} as FinPlaceOrderRequest,
				},
				market: {
					buy: {
						...baseOrder,
						type: OrderType.MARKET,
						side: OrderSide.BUY,
						amount: defaultOrderMiddleAmount,
						// price: undefined for market orders
					} as FinPlaceOrderRequest,
					sell: {
						...baseOrder,
						type: OrderType.MARKET,
						side: OrderSide.SELL,
						amount: defaultOrderMiddleAmount,
						// price: undefined for market orders
					} as FinPlaceOrderRequest,
				},

			},
			multiple: [
				// Fixed price buy orders
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMaximumAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMaximumPrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderFillablePrice.toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,

				// Fixed price sell orders
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMaximumAmount,
					price: sanitizeOrderPrice(defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderFillablePrice.toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,

				// Tracking buy orders
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: defaultOrderMaximumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,

				// Tracking sell orders
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: defaultOrderMininumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: defaultOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: defaultOrderMaximumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
			]
		},
		replace: {
			single: {
				fixedPrice: {
					buy: {
						...baseOrder,
						marketSymbol: defaultMarketSymbol,
						side: OrderSide.BUY,
						amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMiddleAmount)),
						price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.toDecimalPlaces(4), defaultMarket.tick)
					} as FinReplaceOrderRequest,
					sell: {
						...baseOrder,
						marketSymbol: defaultMarketSymbol,
						side: OrderSide.SELL,
						amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMiddleAmount)),
						price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.toDecimalPlaces(4), defaultMarket.tick)
					} as FinReplaceOrderRequest,
				},
				limit: {},
				tracking: {
					buy: {
						...baseOrder,
						marketSymbol: defaultMarketSymbol,
						side: OrderSide.BUY,
						amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMininumAmount)),
						deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMaximumDeviationPercentage
					} as FinReplaceOrderRequest,
					sell: {
						...baseOrder,
						marketSymbol: defaultMarketSymbol,
						side: OrderSide.SELL,
						amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMininumAmount)),
						deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMaximumDeviationPercentage
					} as FinReplaceOrderRequest,
				},
				market: {
					buy: undefined as unknown as FinReplaceOrderRequest,
					sell: undefined as unknown as FinReplaceOrderRequest,
				},
			},
			multiple: [
				// Fixed price replace orders
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMiddleAmount)),
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinReplaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMiddleAmount)),
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinReplaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMiddleAmount)),
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinReplaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMaximumAmount.plus(Decimal(1).mul(defaultOrderMaximumAmount)),
					price: sanitizeOrderPrice(defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinReplaceOrderRequest,

				// Tracking order replacements
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMininumAmount.plus(Decimal(1).mul(defaultOrderMininumAmount)),
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinReplaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMiddleAmount)),
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinReplaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMininumAmount.plus(Decimal(1).mul(defaultOrderMininumAmount)),
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinReplaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMininumAmount.plus(Decimal(1).mul(defaultOrderMiddleAmount)),
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinReplaceOrderRequest,
			]
		},
		cancel: {
			single: {
				fixedPrice: {
					buy: {
						...baseOrder,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.toDecimalPlaces(4), defaultMarket.tick)
					} as FinPlaceOrderRequest,
					sell: {
						...baseOrder,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.toDecimalPlaces(4), defaultMarket.tick)
					} as FinPlaceOrderRequest,
				},
				limit: {},
				tracking: {
					buy: {
						...baseOrder,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultOrderMiddleAmount,
						deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
						deviationInPercentage: trackingOrderMiddleDeviationPercentage
					} as FinPlaceOrderRequest,
					sell: {
						...baseOrder,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultOrderMiddleAmount,
						deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
						deviationInPercentage: trackingOrderMiddleDeviationPercentage
					} as FinPlaceOrderRequest,
				},
				market: {
					buy: undefined as unknown as FinPlaceOrderRequest,
					sell: undefined as unknown as FinPlaceOrderRequest,
				}
			},
			multiple: [
				// Fixed price cancel orders
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					side: OrderSide.SELL,
					amount: defaultOrderMaximumAmount,
					price: sanitizeOrderPrice(defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)).toDecimalPlaces(4), defaultMarket.tick)
				} as FinPlaceOrderRequest,

				// Tracking order cancellations
				{
					...baseOrder,
					side: OrderSide.BUY,
					amount: defaultOrderMininumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: defaultOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: defaultOrderMininumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					...baseOrder,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: defaultOrderMininumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
			]
		},
	}

	const orders = {
		fixedPrice: {
			buy: {
				single: undefined as unknown as Order,
				multiple: undefined as unknown as Map<OrderId, Order>,
				all: undefined as unknown as Map<OrderId, Order>,
			},
			sell: {
				single: undefined as unknown as Order,
				multiple: undefined as unknown as Map<OrderId, Order>,
				all: undefined as unknown as Map<OrderId, Order>,
			},
		},
		tracking: {
			buy: {
				single: undefined as unknown as Order,
				multiple: undefined as unknown as Map<OrderId, Order>,
				all: undefined as unknown as Map<OrderId, Order>,
			},
			sell: {
				single: undefined as unknown as Order,
				multiple: undefined as unknown as Map<OrderId, Order>,
				all: undefined as unknown as Map<OrderId, Order>,
			},
		},
		market: {
			buy: {
				single: undefined as unknown as Order,
			},
			sell: {
				single: undefined as unknown as Order,
			},
		},
	}

	console.log('\n--------------------------------------------------------------------------------\n');

	if (active.getStatus) {
		const getStatus = await rujira.fin.getStatus({});
		console.log('getStatus:\n', dump(getStatus));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getTransaction) {
		const getTransaction = await rujira.fin.getTransaction({
			// Too old transactions cannot be fetched from NineRealms, maybe the hash needs to be updated.
			hash: '6A2B2D1821B1E248410BA3CF273D65215C357DE559E0ED4117AEA3AA7967C05B'
		});
		console.log('getTransaction:\n', dump(getTransaction));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getAllTokens) {
		const getAllTokens = await rujira.fin.getAllTokens({});
		console.log('getAllTokens:size:', dump(getAllTokens.size));
		console.log('getAllTokens:symbols:\n', dump(getAllTokens.keySeq().toJS()));
		console.log('getAllTokens:addresses\n', dump(getAllTokens.valueSeq().map(token => token.address).toJS()));
		console.log('getAllTokens:symbols->addresses:\n', dump(getAllTokens.entrySeq().map((entry: [TokenSymbol, Token]) => `${entry[0]} -> ${entry[1].address}`).toJS()));
		// console.log('getAllTokens\n', getAllTokens.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
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
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getToken) {
		const getToken = await rujira.fin.getToken({
			address: 'avax-avax', // AVAX-AVAX
			// symbol: 'AVAX-AVAX'
		});
		console.log('getToken:address:', dump(getToken.address));
		console.log('getToken:symbol:', dump(getToken.symbol));
		console.log('getToken\n', dump(getToken));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getAllMarkets) {
		const getAllMarkets = await rujira.fin.getAllMarkets({});
		console.log('getAllMarkets:size:', dump(getAllMarkets.size));
		console.log('getAllMarkets:symbols:\n', dump(getAllMarkets.keySeq().toJS()));
		console.log('getAllMarkets:addresses\n', dump(getAllMarkets.valueSeq().map(market => market.address).toJS()));
		console.log('getAllMarkets:symbols->addresses:\n', dump(getAllMarkets.entrySeq().map((entry: [MarketSymbol, Market]) => `${entry[0]} -> ${entry[1].address}`).toJS()));
		// console.log('getAllMarkets\n', getAllMarkets.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
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
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getMarket) {
		const getMarket = await rujira.fin.getMarket({
			// address: 'thor12ds7fxj5g47jwzfzvzzhzxxd3cp6v55flgwxva0803r8k5mzm44skth6wa', // THOR-TCY/THOR-RUNE
				symbol: 'THOR-TCY/THOR-RUNE'
		});
		console.log('getMarket:address:', dump(getMarket.address));
		console.log('getMarket:symbol:', dump(getMarket.symbol));
		console.log('getMarket\n', dump(getMarket));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrderBook) {
		const getOrderBook = await rujira.fin.getOrderBook({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
		});
		console.log('getOrderBook:\n', dump(getOrderBook));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getTicker) {
		const getTicker = await rujira.fin.getTicker({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
		});
		console.log('getTicker:\n', dump(getTicker));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getCandles) {
		const getCandles = await rujira.fin.getCandles({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
			// market: fixedOrdersMarket,
			// interval: CandleInterval.ONE_MINUTE,
			// maximumNumberOfCandles: 100,
		});
		console.log('getCandles:size:', dump(getCandles.size));
		console.log('getCandles:\n', dump(getCandles.toJS()));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getIndicators) {
		const getIndicators = await rujira.fin.getIndicators({
			marketAddress: defaultMarketAddress,
			// marketSymbol: defaultMarketSymbol,
			// market: fixedOrdersMarket,
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
		console.log('\n--------------------------------------------------------------------------------\n');
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
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.placeOrder) {
		console.log('🔥 PLACING SINGLE ORDERS ================================================================================');

		const fixedPriceBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.fixedPrice.buy);
		orders.fixedPrice.buy.single = fixedPriceBuyOrder.order;
		console.log('✅ Fixed Price BUY Order Placed:\n', dump(fixedPriceBuyOrder));

		const fixedPriceSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.fixedPrice.sell);
		orders.fixedPrice.sell.single = fixedPriceSellOrder.order;
		console.log('✅ Fixed Price SELL Order Placed:\n', dump(fixedPriceSellOrder));

		const trackingBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.buy);
		orders.tracking.buy.single = trackingBuyOrder.order;
		console.log('✅ Tracking BUY Order Placed:\n', dump(trackingBuyOrder));

		const trackingSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.sell);
		orders.tracking.sell.single = trackingSellOrder.order;
		console.log('✅ Tracking SELL Order Placed:\n', dump(trackingSellOrder));

		const marketBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.buy);
		orders.market.buy.single = marketBuyOrder.order;
		console.log('✅ Market BUY Order Placed:\n', dump(marketBuyOrder));

		const marketSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.sell);
		orders.market.sell.single = marketSellOrder.order;
		console.log('✅ Market SELL Order Placed:\n', dump(marketSellOrder));

		console.log('🎉 ALL SINGLE ORDERS PLACED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.placeOrders) {
		console.log('🔥 PLACING MULTIPLE ORDERS ================================================================================');

		const marketFixedPricePlaceOrders = await rujira.fin.placeOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.place.multiple.filter((order) => [OrderType.MARKET, OrderType.FIXED_PRICE].includes(order.type))
		});
		// Store fixed price orders (both buy and sell)
		const fixedPriceOrders = marketFixedPricePlaceOrders.orders;
		orders.fixedPrice.buy.multiple = fixedPriceOrders.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.fixedPrice.sell.multiple = fixedPriceOrders.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Fixed Price Orders Placed:');
		console.log('   📊 Total Orders:', dump(fixedPriceOrders.size));
		console.log('   🆔 Order IDs:', dump(fixedPriceOrders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(marketFixedPricePlaceOrders.transactions.keySeq().toJS()));
		console.log('');

		const trackingPlaceOrders = await rujira.fin.placeOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.place.multiple.filter((order) => [OrderType.TRACKING_ORDER].includes(order.type))
		});
		// Store tracking orders (both buy and sell)
		const trackingOrders = trackingPlaceOrders.orders;
		orders.tracking.buy.multiple = trackingOrders.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.tracking.sell.multiple = trackingOrders.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Tracking Orders Placed:');
		console.log('   📊 Total Orders:', dump(trackingOrders.size));
		console.log('   🆔 Order IDs:', dump(trackingOrders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(trackingPlaceOrders.transactions.keySeq().toJS()));
		console.log('');

		console.log('🎉 ALL MULTIPLE ORDERS PLACED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrder) {
		console.log('🔍 GETTING SINGLE ORDERS ================================================================================');

		const buyFixedPriceOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: fixedOrdersMarket,
			orderSide: orderTemplates.place.single.fixedPrice.buy.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.fixedPrice.buy.price)
		});
		orders.fixedPrice.buy.single = buyFixedPriceOrder;
		console.log('✅ Fixed Price BUY Order Retrieved:\n', dump(buyFixedPriceOrder));
		console.log('');

		const sellFixedPriceOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: fixedOrdersMarket,
			orderSide: orderTemplates.place.single.fixedPrice.sell.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.fixedPrice.sell.price)
		});
		orders.fixedPrice.sell.single = sellFixedPriceOrder;
		console.log('✅ Fixed Price SELL Order Retrieved:\n', dump(sellFixedPriceOrder));
		console.log('');

		const buyTrackingOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: trackingOrdersMarket,
			orderSide: orderTemplates.place.single.tracking.buy.side,
			orderDeviationInBasisPoints: cast<OrderDeviationInBasisPoints>(orderTemplates.place.single.tracking.buy.deviationInBasisPoints)
		});
		orders.tracking.buy.single = buyTrackingOrder;
		console.log('✅ Tracking BUY Order Retrieved:\n', dump(buyTrackingOrder));
		console.log('');

		const sellTrackingOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: trackingOrdersMarket,
			orderSide: orderTemplates.place.single.tracking.sell.side,
			orderDeviationInBasisPoints: cast<OrderDeviationInBasisPoints>(orderTemplates.place.single.tracking.sell.deviationInBasisPoints)
		});
		orders.tracking.sell.single = sellTrackingOrder;
		console.log('✅ Tracking SELL Order Retrieved:\n', dump(sellTrackingOrder));

		console.log('🎉 ALL SINGLE ORDERS RETRIEVED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrders) {
		console.log('🔍 GETTING MULTIPLE ORDERS ================================================================================');

		const fixedPriceGetOrders = await rujira.fin.getOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: fixedOrdersMarket,
			orderTypes: [OrderType.FIXED_PRICE],
			orderSides: [OrderSide.BUY, OrderSide.SELL],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED],
			// orderPrices: orderTemplates.place.multiple.map(order => get<OrderPrice>(order.price)),
			// maximumNumberOfOrders: orderTemplates.place.multiple.length
		});
		// Store fixed price orders by side
		orders.fixedPrice.buy.multiple = fixedPriceGetOrders.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.fixedPrice.sell.multiple = fixedPriceGetOrders.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Fixed Price Orders Retrieved:');
		console.log('   📊 Total Orders:', dump(fixedPriceGetOrders.size));
		console.log('   🆔 Order IDs:', dump(fixedPriceGetOrders.keySeq().toJS()));
		console.log('   📋 Order Details:', dump(fixedPriceGetOrders.toJS()));

		const trackingGetOrders = await rujira.fin.getOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: trackingOrdersMarket,
			orderTypes: [OrderType.TRACKING_ORDER],
			orderSides: [OrderSide.BUY, OrderSide.SELL],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED],
			// orderPrices: orderTemplates.place.multiple.map(order => get<OrderPrice>(order.price)),
			// maximumNumberOfOrders: orderTemplates.place.multiple.length
		});
		// Store tracking orders by side
		orders.tracking.buy.multiple = trackingGetOrders.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.tracking.sell.multiple = trackingGetOrders.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Tracking Orders Retrieved:');
		console.log('   📊 Total Orders:', dump(trackingGetOrders.size));
		console.log('   🆔 Order IDs:', dump(trackingGetOrders.keySeq().toJS()));
		console.log('   📋 Order Details:', dump(trackingGetOrders.toJS()));

		console.log('🎉 ALL MULTIPLE ORDERS RETRIEVED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrder) {
		console.log('🔄 REPLACING SINGLE ORDERS ================================================================================');

		const fixedPriceBuyOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.buy);
		orders.fixedPrice.buy.single = fixedPriceBuyOrder.order;
		console.log('✅ Fixed Price BUY Order Replaced:\n', dump(fixedPriceBuyOrder));

		const fixedPriceSellOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.sell);
		orders.fixedPrice.sell.single = fixedPriceSellOrder.order;
		console.log('✅ Fixed Price SELL Order Replaced:\n', dump(fixedPriceSellOrder));

		const trackingBuyOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.tracking.buy);
		orders.tracking.buy.single = trackingBuyOrder.order;
		console.log('✅ Tracking BUY Order Replaced:\n', dump(trackingBuyOrder));

		const trackingSellOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.tracking.sell);
		orders.tracking.sell.single = trackingSellOrder.order;
		console.log('✅ Tracking SELL Order Replaced:\n', dump(trackingSellOrder));

		console.log('🎉 ALL SINGLE ORDERS REPLACED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrders) {
		console.log('🔄 REPLACING MULTIPLE ORDERS ================================================================================');

		const fixedPriceReplaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.replace.multiple.filter((order) => [OrderType.FIXED_PRICE].includes(order.type))
		});
		// Store fixed price replace orders by side
		const fixedPriceReplaceOrdersMap = fixedPriceReplaceOrders.orders;
		orders.fixedPrice.buy.multiple = fixedPriceReplaceOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.fixedPrice.sell.multiple = fixedPriceReplaceOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Fixed Price Orders Replaced:');
		console.log('   📊 Total Orders:', dump(fixedPriceReplaceOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(fixedPriceReplaceOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(fixedPriceReplaceOrders.transactions.keySeq().toJS()));

		const trackingReplaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.replace.multiple.filter((order) => [OrderType.TRACKING_ORDER].includes(order.type))
		});
		// Store tracking replace orders by side
		const trackingReplaceOrdersMap = trackingReplaceOrders.orders;
		orders.tracking.buy.multiple = trackingReplaceOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.tracking.sell.multiple = trackingReplaceOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Tracking Orders Replaced:');
		console.log('   📊 Total Orders:', dump(trackingReplaceOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(trackingReplaceOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(trackingReplaceOrders.transactions.keySeq().toJS()));

		console.log('🎉 ALL MULTIPLE ORDERS REPLACED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrder) {
		console.log('❌ CANCELLING SINGLE ORDERS ================================================================================');

		const fixedPriceBuyOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
					ownerAddress: orderTemplates.place.single.fixedPrice.buy.ownerAddress,
					marketSymbol: orderTemplates.place.single.fixedPrice.buy.marketSymbol,
					// market: fixedOrdersMarket,
					orderType: orderTemplates.place.single.fixedPrice.buy.type,
					orderSide: orderTemplates.place.single.fixedPrice.buy.side,
					orderPrice: orderTemplates.place.single.fixedPrice.buy.price,
					// order: orderTemplates.place.single.buy
			}),
			// order: orders.place.single.buy,
			ownerAddress: orderTemplates.place.single.fixedPrice.buy.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.place.single.buy.marketAddress,
			marketSymbol: orderTemplates.place.single.fixedPrice.buy.marketSymbol,
			// market: fixedOrdersMarket,
		});
		orders.fixedPrice.buy.single = fixedPriceBuyOrder.order;
		console.log('✅ Fixed Price BUY Order Cancelled:\n', dump(fixedPriceBuyOrder));

		const fixedPriceSellOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				ownerAddress: orderTemplates.place.single.fixedPrice.sell.ownerAddress,
				marketSymbol: orderTemplates.place.single.fixedPrice.sell.marketSymbol,
				// market: fixedOrdersMarket,
				orderType: orderTemplates.place.single.fixedPrice.sell.type,
				orderSide: orderTemplates.place.single.fixedPrice.sell.side,
				orderPrice: orderTemplates.place.single.fixedPrice.sell.price,
				// order: orderTemplates.place.single.sell
			}),
			// order: orders.place.single.buy,
			ownerAddress: orderTemplates.place.single.fixedPrice.sell.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.place.single.sell.marketAddress,
			marketSymbol: orderTemplates.place.single.fixedPrice.sell.marketSymbol,
			// market: fixedOrdersMarket,
		});
		orders.fixedPrice.sell.single = fixedPriceSellOrder.order;
		console.log('✅ Fixed Price SELL Order Cancelled:\n', dump(fixedPriceSellOrder));

		const trackingBuyOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				ownerAddress: orderTemplates.cancel.single.tracking.buy.ownerAddress,
				marketSymbol: orderTemplates.cancel.single.tracking.buy.marketSymbol,
				// market: trackingOrdersMarket,
				orderType: orderTemplates.cancel.single.tracking.buy.type,
				orderSide: orderTemplates.cancel.single.tracking.buy.side,
				orderDeviationInBasisPoints: orderTemplates.cancel.single.tracking.buy.deviationInBasisPoints,
				// order: orderTemplates.cancel.single.tracking.buy
			}),
			ownerAddress: orderTemplates.cancel.single.tracking.buy.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.cancel.single.tracking.buy.marketAddress,
			marketSymbol: orderTemplates.cancel.single.tracking.buy.marketSymbol,
			// market: trackingOrdersMarket,
		});
		orders.tracking.buy.single = trackingBuyOrder.order;
		console.log('✅ Tracking BUY Order Cancelled:\n', dump(trackingBuyOrder));

		const trackingSellOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				ownerAddress: orderTemplates.cancel.single.tracking.sell.ownerAddress,
				marketSymbol: orderTemplates.cancel.single.tracking.sell.marketSymbol,
				// market: trackingOrdersMarket,
				orderType: orderTemplates.cancel.single.tracking.sell.type,
				orderSide: orderTemplates.cancel.single.tracking.sell.side,
				orderDeviationInBasisPoints: orderTemplates.cancel.single.tracking.sell.deviationInBasisPoints,
				// order: orderTemplates.cancel.single.tracking.sell
			}),
			ownerAddress: orderTemplates.cancel.single.tracking.sell.ownerAddress,
			// owner: undefined,
			// marketAddress: orderTemplates.cancel.single.tracking.sell.marketAddress,
			marketSymbol: orderTemplates.cancel.single.tracking.sell.marketSymbol,
			// market: trackingOrdersMarket,
		});
		orders.tracking.sell.single = trackingSellOrder.order;
		console.log('✅ Tracking SELL Order Cancelled:\n', dump(trackingSellOrder));

		console.log('🎉 ALL SINGLE ORDERS CANCELLED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrders) {
		console.log('❌ CANCELLING MULTIPLE ORDERS ================================================================================');

		const fixedPriceCancelOrders = await rujira.fin.cancelOrders({
			orderIds: orderTemplates.cancel.multiple.filter((order) => [OrderType.FIXED_PRICE].includes(order.type)).map(orderTemplate => rujira.fin.getOrderId({
				ownerAddress: orderTemplate.ownerAddress,
				marketSymbol: orderTemplate.marketSymbol,
				// market: fixedOrdersMarket,
				orderType: orderTemplate.type,
				orderSide: orderTemplate.side,
				orderPrice: orderTemplate.price,
				// order: orderTemplate
			})),
			// orders: orders.place.multiple.valueSeq().toList(),
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: fixedOrdersMarket,
		});
		// Store fixed price cancel orders by side
		const fixedPriceCancelOrdersMap = fixedPriceCancelOrders.orders;
		orders.fixedPrice.buy.multiple = fixedPriceCancelOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.fixedPrice.sell.multiple = fixedPriceCancelOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Fixed Price Orders Cancelled:');
		console.log('   📊 Total Orders:', dump(fixedPriceCancelOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(fixedPriceCancelOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(fixedPriceCancelOrders.transactions.keySeq().toJS()));

		const trackingCancelOrders = await rujira.fin.cancelOrders({
			orderIds: orderTemplates.cancel.multiple.filter((order) => [OrderType.TRACKING_ORDER].includes(order.type)).map(orderTemplate => rujira.fin.getOrderId({
				ownerAddress: orderTemplate.ownerAddress,
				marketSymbol: orderTemplate.marketSymbol,
				// market: trackingOrdersMarket,
				orderType: orderTemplate.type,
				orderSide: orderTemplate.side,
				orderDeviationInBasisPoints: orderTemplate.deviationInBasisPoints,
				// order: orderTemplate
			})),
		});
		// Store tracking cancel orders by side
		const trackingCancelOrdersMap = trackingCancelOrders.orders;
		orders.tracking.buy.multiple = trackingCancelOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.tracking.sell.multiple = trackingCancelOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Tracking Orders Cancelled:');
		console.log('   📊 Total Orders:', dump(trackingCancelOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(trackingCancelOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(trackingCancelOrders.transactions.keySeq().toJS()));

		console.log('🎉 ALL MULTIPLE ORDERS CANCELLED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelAllOrders) {
		console.log('❌ CANCELLING ALL ORDERS ================================================================================');

		const fixedPriceCancelAllOrders = await rujira.fin.cancelAllOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: fixedOrdersMarket,
		});
		// Store fixed price cancel all orders by side
		const fixedPriceCancelAllOrdersMap = fixedPriceCancelAllOrders.orders;
		orders.fixedPrice.buy.all = fixedPriceCancelAllOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.fixedPrice.sell.all = fixedPriceCancelAllOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ All Fixed Price Orders Cancelled:');
		console.log('   📊 Total Orders:', dump(fixedPriceCancelAllOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(fixedPriceCancelAllOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(fixedPriceCancelAllOrders.transactions.keySeq().toJS()));

		const trackingCancelAllOrders = await rujira.fin.cancelAllOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: trackingOrdersMarket,
		});
		// Store tracking cancel all orders by side
		const trackingCancelAllOrdersMap = trackingCancelAllOrders.orders;
		orders.tracking.buy.all = trackingCancelAllOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.tracking.sell.all = trackingCancelAllOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ All Tracking Orders Cancelled:');
		console.log('   📊 Total Orders:', dump(trackingCancelAllOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(trackingCancelAllOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(trackingCancelAllOrders.transactions.keySeq().toJS()));

		console.log('🎉 ALL ORDERS CANCELLED SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.withdrawAllFilledOrders) {
		console.log('💰 WITHDRAWING ALL FILLED ORDERS ================================================================================');

		const fixedPriceWithdrawAllFilledOrders = await rujira.fin.withdrawAllFilledOrders({
			ownerAddress: walletAddress,
			marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
		});
		// Store fixed price withdraw all orders by side
		const fixedPriceWithdrawAllOrdersMap = fixedPriceWithdrawAllFilledOrders.orders;
		orders.fixedPrice.buy.all = fixedPriceWithdrawAllOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.fixedPrice.sell.all = fixedPriceWithdrawAllOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Fixed Price Filled Orders Withdrawn:');
		console.log('   📊 Total Orders:', dump(fixedPriceWithdrawAllFilledOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(fixedPriceWithdrawAllFilledOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(fixedPriceWithdrawAllFilledOrders.transactions.keySeq().toJS()));

		const trackingWithdrawAllFilledOrders = await rujira.fin.withdrawAllFilledOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: trackingOrdersMarket,
		});
		// Store tracking withdraw all orders by side
		const trackingWithdrawAllOrdersMap = trackingWithdrawAllFilledOrders.orders;
		orders.tracking.buy.all = trackingWithdrawAllOrdersMap.filter((order, orderId) => order.side === OrderSide.BUY);
		orders.tracking.sell.all = trackingWithdrawAllOrdersMap.filter((order, orderId) => order.side === OrderSide.SELL);
		console.log('✅ Tracking Filled Orders Withdrawn:');
		console.log('   📊 Total Orders:', dump(trackingWithdrawAllFilledOrders.orders.size));
		console.log('   🆔 Order IDs:', dump(trackingWithdrawAllFilledOrders.orders.keySeq().toJS()));
		console.log('   🔗 Transaction Hashes:', dump(trackingWithdrawAllFilledOrders.transactions.keySeq().toJS()));

		console.log('🎉 ALL FILLED ORDERS WITHDRAWN SUCCESSFULLY!');
		console.log('\n--------------------------------------------------------------------------------\n');
	}
})();

