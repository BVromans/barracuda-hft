import Decimal from "decimal.js";
import "./bootstrap";
import { properties } from "./properties";
import { Rujira } from "./rujira";
import { DECIMAL_100, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, Map, Market, MarketSymbol, Order, OrderBookOrder, OrderId, OrderPrice, OrderSide, OrderStatus, OrderType, Price, RujiraConstructorOptions, RujiraInitializeOptions, Token, TokenSymbol, WalletAddress, WalletMnemonic, WalletPrivateKey } from "./types";
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
		persistOrders: false,
	};

	active.persistOrders = false;

	const walletAddress = properties.getAs<WalletAddress>('rujira.wallet.publicKeys.thor');

	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

	console.log('\n--------------------------------------------------------------------------------\n');

	const fixedOrdersMarketAddress = 'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a';
	const fixedOrdersMarketSymbol = 'THOR-RUJI/ETH-USDC';
	const fixedOrdersMarket = await rujira.fin.getMarket({
		address: fixedOrdersMarketAddress,
		symbol: fixedOrdersMarketSymbol,
	});

	const trackingOrdersMarketAddress = 'thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz';
	const trackingOrdersMarketSymbol = 'BTC-BTC/ETH-USDC';
	const trackingOrdersMarket = await rujira.fin.getMarket({
		address: trackingOrdersMarketAddress,
		symbol: trackingOrdersMarketSymbol,
	});

	const defaultMarketTicker = await rujira.fin.getTicker({
		marketAddress: fixedOrdersMarketAddress,
		marketSymbol: fixedOrdersMarketSymbol,
	});

	console.log('defaultMarketTicker:\n', defaultMarketTicker?.middlePrice?.baseToQuote?.toFixed());

	const defaultMarketOrderBook = await rujira.fin.getOrderBook({
		marketAddress: fixedOrdersMarketAddress,
		marketSymbol: fixedOrdersMarketSymbol,
	});

	console.log('defaultMarketOrderBook:bestBid:\n', defaultMarketOrderBook?.book?.bestBid?.price?.toFixed());
	console.log('defaultMarketOrderBook:bestAsk:\n', defaultMarketOrderBook?.book?.bestAsk?.price?.toFixed());

	const defaultSpreadPercentage = Decimal('50');
	const defaultFillableSpreadPercentage = Decimal('1');
	const defaultPriceIncrementPercentage = Decimal('1');
	const defaultMaximumMarketOrderSlippagePercentage = Decimal('2.5');

	const defaultOrderMininumAmountIncrement = Decimal('0.00000001'); // Depends on the market decimals
	const defaultOrderMinimumPriceIncrement = Decimal('0.000000000001'); // Usually 1e-12

	// const defaultBuyOrderMininumAmount = Decimal('0.00000001'); // Depends on the market decimals
	const defaultBuyOrderMiddleAmount = Decimal('0.01234567'); // Depends on the market decimals
	const defaultBuyOrderMaximumAmount = Decimal('0.12345678'); // Depends on the market decimals

	const defaultBuyOrderMininumPrice = Decimal('0.01000000'); // Usually 1e-12
	const defaultBuyOrderMiddlePrice = Decimal('0.02234'); // Depends on the market tick
	const defaultBuyOrderMaximumPrice = cast<Price>(defaultMarketTicker.middlePrice.baseToQuote).mul(defaultSpreadPercentage.div(DECIMAL_100)); // Depends on the market tick
	const defaultBuyOrderFillablePrice = cast<OrderBookOrder>(defaultMarketOrderBook.book.bestAsk).price.mul(defaultFillableSpreadPercentage.plus(DECIMAL_100).div(DECIMAL_100)); // Depends on the market tick

	// const defaultSellOrderMininumAmount = Decimal('0.00000001'); // Depends on the market decimals
	const defaultSellOrderMiddleAmount = Decimal('0.01234567'); // Depends on the market decimals
	const defaultSellOrderMaximumAmount = Decimal('0.12345678'); // Depends on the market decimals

	const defaultSellOrderMinimumPrice = cast<Price>(defaultMarketTicker.middlePrice.baseToQuote).mul(defaultSpreadPercentage.plus(DECIMAL_100).div(DECIMAL_100)); // Depends on the market tick
	const defaultSellOrderMiddlePrice = Decimal('98.76'); // Depends on the market tick
	const defaultSellOrderMaximumPrice = Decimal('9999'); // Depends from the market "tick", which blocks the max precision
	const defaultSellOrderFillablePrice = cast<OrderBookOrder>(defaultMarketOrderBook.book.bestBid).price.mul(DECIMAL_100.minus(defaultFillableSpreadPercentage).div(DECIMAL_100)); // Depends on the market tick

	const trackingOrderMinimumAmount = Decimal('0.00000001');
	const trackingOrderMiddleAmount = Decimal('0.0000001');
	const trackingOrderMaximumAmount = Decimal('0.000001');

	const trackingOrderMinimumDeviationBasisPoints = Decimal('10'); // 0.1%
	const trackingOrderMinimumDeviationPercentage = Decimal('0.1');
	const trackingOrderMiddleDeviationBasisPoints = Decimal('150'); // 1.5%
	const trackingOrderMiddleDeviationPercentage = Decimal('1.5');
	const trackingOrderMaximumDeviationBasisPoints = Decimal('250'); // 2.5%
	const trackingOrderMaximumDeviationPercentage = Decimal('2.5');

	const orderTemplates = {
		place: {
			single: {
				fixedPrice: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						market: fixedOrdersMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice, fixedOrdersMarket.tick)
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						market: fixedOrdersMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultSellOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultSellOrderMiddlePrice, fixedOrdersMarket.tick)
					} as FinPlaceOrderRequest,
				},
				limit: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: fixedOrdersMarketAddress,
					// 	marketSymbol: fixedOrdersMarketSymbol,
					// 	market: fixedOrdersMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount,
					// 	price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice, fixedOrdersMarket.tick)
					// } as FinPlaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: fixedOrdersMarketAddress,
					// 	marketSymbol: fixedOrdersMarketSymbol,
					// 	market: fixedOrdersMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount,
					// 	price: sanitizeOrderPrice(defaultSellOrderMiddlePrice, fixedOrdersMarket.tick)
					// } as FinPlaceOrderRequest,
				},
				tracking: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: trackingOrdersMarketAddress,
						marketSymbol: trackingOrdersMarketSymbol,
						market: trackingOrdersMarket,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.BUY,
						amount: trackingOrderMinimumAmount,
						deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMinimumDeviationPercentage
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: trackingOrdersMarketAddress,
						marketSymbol: trackingOrdersMarketSymbol,
						market: trackingOrdersMarket,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.SELL,
						amount: trackingOrderMinimumAmount,
						deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMinimumDeviationPercentage
					} as FinPlaceOrderRequest,
				},
				market: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						market: fixedOrdersMarket,
						type: OrderType.MARKET,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount,
						// price: defaultBuyOrderMiddlePrice
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						market: fixedOrdersMarket,
						type: OrderType.MARKET,
						side: OrderSide.SELL,
						amount: defaultSellOrderMiddleAmount,
						// price: defaultSellOrderMiddlePrice
					} as FinPlaceOrderRequest,
				},
			},
			multiple: [
				{
					ownerAddress: walletAddress,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMaximumAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMaximumPrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderFillablePrice, fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				// {
				// 	ownerAddress: walletAddress,
				// 	marketAddress: fixedOrdersMarketAddress,
				// 	marketSymbol: fixedOrdersMarketSymbol,
				// 	market: fixedOrdersMarket,
				// 	type: OrderType.MARKET,
				// 	side: OrderSide.BUY,
				// 	amount: defaultBuyOrderMiddleAmount,
				// 	// price: undefined,
				// 	// maximumSlippagePercentage: defaultMaximumMarketOrderSlippagePercentage
				// } as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMaximumAmount,
					price: sanitizeOrderPrice(defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderFillablePrice, fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				// {
				// 	ownerAddress: walletAddress,
				// 	// owner: undefined,
				// 	marketAddress: fixedOrdersMarketAddress,
				// 	marketSymbol: fixedOrdersMarketSymbol,
				// 	market: fixedOrdersMarket,
				// 	type: OrderType.MARKET,
				// 	side: OrderSide.SELL,
				// 	amount: defaultSellOrderMiddleAmount,
				// 	// price: undefined,
				// 	// maximumSlippagePercentage: defaultMaximumMarketOrderSlippagePercentage
				// } as FinPlaceOrderRequest,

				// BTC TRACKING order templates
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: trackingOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMinimumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: trackingOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: trackingOrderMaximumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: trackingOrderMinimumAmount,
					deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMinimumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: trackingOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: trackingOrderMaximumAmount,
					deviationInBasisPoints: trackingOrderMaximumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMaximumDeviationPercentage
				} as FinPlaceOrderRequest,
			]
		},
		replace: {
			single: {
				fixedPrice: {
					buy: {
						ownerAddress: walletAddress,
						// marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						// market: fixedOrdersMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultBuyOrderMiddleAmount)),
						price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice, fixedOrdersMarket.tick)
					} as FinReplaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						// market: fixedOrdersMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultSellOrderMiddleAmount.plus(Decimal(1).mul(defaultSellOrderMiddleAmount)),
						price: sanitizeOrderPrice(defaultSellOrderMiddlePrice, fixedOrdersMarket.tick)
					} as FinReplaceOrderRequest,
				},
				limit: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// marketAddress: fixedOrdersMarketAddress,
					// 	marketSymbol: fixedOrdersMarketSymbol,
					// 	// market: fixedOrdersMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultBuyOrderMiddleAmount)),
					// 	price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice, fixedOrdersMarket.tick)
					// } as FinReplaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// marketAddress: fixedOrdersMarketAddress,
					// 	marketSymbol: fixedOrdersMarketSymbol,
					// 	// market: fixedOrdersMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount.plus(Decimal(1).mul(defaultSellOrderMiddleAmount)),
					// 	price: sanitizeOrderPrice(defaultSellOrderMiddlePrice, fixedOrdersMarket.tick)
					// } as FinReplaceOrderRequest,
				},
				tracking: {
					buy: {
						ownerAddress: walletAddress,
						// marketAddress: trackingOrdersMarketAddress,
						marketSymbol: trackingOrdersMarketSymbol,
						// market: trackingOrdersMarket,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.BUY,
						amount: trackingOrderMiddleAmount.plus(Decimal(1).mul(trackingOrderMinimumAmount)),
						deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMinimumDeviationPercentage
					} as FinReplaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// marketAddress: trackingOrdersMarketAddress,
						marketSymbol: trackingOrdersMarketSymbol,
						// market: trackingOrdersMarket,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.SELL,
						amount: trackingOrderMiddleAmount.plus(Decimal(1).mul(trackingOrderMinimumAmount)),
						deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
						deviationInPercentage: trackingOrderMinimumDeviationPercentage
					} as FinReplaceOrderRequest,
				},
				market: {
					buy: undefined as unknown as FinReplaceOrderRequest,
					sell: undefined as unknown as FinReplaceOrderRequest,
				},
			},
			multiple: [
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultBuyOrderMiddleAmount)),
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultBuyOrderMiddleAmount)),
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount.plus(Decimal(1).mul(defaultSellOrderMiddleAmount)),
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMaximumAmount.plus(Decimal(1).mul(defaultSellOrderMaximumAmount)),
					price: sanitizeOrderPrice(defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinReplaceOrderRequest,

				// BTC TRACKING order replacement templates
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: trackingOrderMinimumAmount.plus(Decimal(1).mul(trackingOrderMinimumAmount)),
					deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMinimumDeviationPercentage
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: trackingOrderMiddleAmount.plus(Decimal(1).mul(trackingOrderMiddleAmount)),
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: trackingOrderMinimumAmount.plus(Decimal(1).mul(trackingOrderMinimumAmount)),
					deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMinimumDeviationPercentage
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: trackingOrderMinimumAmount.plus(Decimal(1).mul(trackingOrderMiddleAmount)),
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinReplaceOrderRequest,
			]
		},
		cancel: {
			single: {
				fixedPrice: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						market: fixedOrdersMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice, fixedOrdersMarket.tick)
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: fixedOrdersMarketAddress,
						marketSymbol: fixedOrdersMarketSymbol,
						market: fixedOrdersMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultSellOrderMiddleAmount,
						price: sanitizeOrderPrice(defaultSellOrderMiddlePrice, fixedOrdersMarket.tick)
					} as FinPlaceOrderRequest,
				},
				limit: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: fixedOrdersMarketAddress,
					// 	marketSymbol: fixedOrdersMarketSymbol,
					// 	market: fixedOrdersMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount,
					// 	price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice, fixedOrdersMarket.tick)
					// } as FinPlaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: fixedOrdersMarketAddress,
					// 	marketSymbol: fixedOrdersMarketSymbol,
					// 	market: fixedOrdersMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount,
					// 	price: sanitizeOrderPrice(defaultSellOrderMiddlePrice, fixedOrdersMarket.tick)
					// } as FinPlaceOrderRequest,
				},
				tracking: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: trackingOrdersMarketAddress,
						marketSymbol: trackingOrdersMarketSymbol,
						market: trackingOrdersMarket,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.BUY,
						amount: trackingOrderMiddleAmount,
						deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
						deviationInPercentage: trackingOrderMiddleDeviationPercentage
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: trackingOrdersMarketAddress,
						marketSymbol: trackingOrdersMarketSymbol,
						market: trackingOrdersMarket,
						type: OrderType.TRACKING_ORDER,
						side: OrderSide.SELL,
						amount: trackingOrderMiddleAmount,
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
				{
					ownerAddress: walletAddress,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount,
					price: sanitizeOrderPrice(defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: fixedOrdersMarketAddress,
					marketSymbol: fixedOrdersMarketSymbol,
					market: fixedOrdersMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMaximumAmount,
					price: sanitizeOrderPrice(defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100)), fixedOrdersMarket.tick)
				} as FinPlaceOrderRequest,

				// BTC TRACKING order cancel templates
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: trackingOrderMinimumAmount,
					deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMinimumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.BUY,
					amount: trackingOrderMiddleAmount,
					deviationInBasisPoints: trackingOrderMiddleDeviationBasisPoints,
					deviationInPercentage: trackingOrderMiddleDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: trackingOrderMinimumAmount,
					deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMinimumDeviationPercentage
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: trackingOrdersMarketAddress,
					marketSymbol: trackingOrdersMarketSymbol,
					market: trackingOrdersMarket,
					type: OrderType.TRACKING_ORDER,
					side: OrderSide.SELL,
					amount: trackingOrderMinimumAmount,
					deviationInBasisPoints: trackingOrderMinimumDeviationBasisPoints,
					deviationInPercentage: trackingOrderMinimumDeviationPercentage
				} as FinPlaceOrderRequest,
			]
		},
		persist: {
			place: [],
			replace: [],
			cancel: [],
			withdraw: [],
		}
	}

	const orders = {
		get: {
			single: {
				fixedPriceBuy: undefined as unknown as Order,
				fixedPriceSell: undefined as unknown as Order,
				trackingBuy: undefined as unknown as Order,
				trackingSell: undefined as unknown as Order,
			},
			fixedPriceMultiple: undefined as unknown as Map<OrderId, Order>,
			trackingMultiple: undefined as unknown as Map<OrderId, Order>,
		},
		place: {
			single: {
				fixedPrice: {
					buy: undefined as unknown as Order,
					sell: undefined as unknown as Order,
				},
				limit: {
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
			},
			marketFixedPricePlaceOrders: undefined as unknown as Map<OrderId, Order>,
			trackingPlaceOrders: undefined as unknown as Map<OrderId, Order>,
		},
		replace: {
			single: {
				fixedPrice: {
					buy: undefined as unknown as Order,
					sell: undefined as unknown as Order,
				},
				limit: {
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
			},
			fixedPriceMultiple: undefined as unknown as Map<OrderId, Order>,
			trackingMultiple: undefined as unknown as Map<OrderId, Order>,
		},
		cancel: {
			single: {
				fixedPrice: {
					buy: undefined as unknown as Order,
					sell: undefined as unknown as Order,
				},
				limit: {
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
			},
			fixedPriceMultiple: undefined as unknown as Map<OrderId, Order>,
			trackingMultiple: undefined as unknown as Map<OrderId, Order>,
			fixedPriceAll: undefined as unknown as Map<OrderId, Order>,
			trackingAll: undefined as unknown as Map<OrderId, Order>,
		},
		withdraw: {
			single: {
				fixedPrice: {
					buy: undefined as unknown as Order,
					sell: undefined as unknown as Order,
				},
				limit: {
					buy: undefined as unknown as Order,
					sell: undefined as unknown as Order,
				},
				market: {
					buy: undefined as unknown as Order,
					sell: undefined as unknown as Order,
				},
			},
			multiple: undefined as unknown as Map<OrderId, Order>,
			fixedPriceAll: undefined as unknown as Map<OrderId, Order>,
			trackingAll: undefined as unknown as Map<OrderId, Order>,
		},
		persist: {
			placedOrders: undefined as unknown as Map<OrderId, Order> | undefined,
			replacedOrders: undefined as unknown as Map<OrderId, Order> | undefined,
			cancelledOrders: undefined as unknown as Map<OrderId, Order> | undefined,
			withdrawnOrders: undefined as unknown as Map<OrderId, Order> | undefined,
		}
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
			marketAddress: fixedOrdersMarketAddress,
			// marketSymbol: fixedOrdersMarketSymbol,
		});
		console.log('getOrderBook:\n', dump(getOrderBook));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getTicker) {
		const getTicker = await rujira.fin.getTicker({
			marketAddress: fixedOrdersMarketAddress,
			// marketSymbol: fixedOrdersMarketSymbol,
		});
		console.log('getTicker:\n', dump(getTicker));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getCandles) {
		const getCandles = await rujira.fin.getCandles({
			marketAddress: fixedOrdersMarketAddress,
			// marketSymbol: fixedOrdersMarketSymbol,
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
			marketAddress: fixedOrdersMarketAddress,
			// marketSymbol: fixedOrdersMarketSymbol,
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
		const fixedPriceBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.fixedPrice.buy);
		const fixedPriceSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.fixedPrice.sell);
		// const limitBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.limit.buy);
		// const limitSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.limit.sell);
		const trackingBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.buy);
		const trackingSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.sell);
		const marketBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.buy);
		const marketSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.sell);
		orders.place.single.fixedPrice.buy = fixedPriceBuyOrder.order;
		orders.place.single.fixedPrice.sell = fixedPriceSellOrder.order;
		// orders.place.single.limit.buy = limitBuyOrder.order;
		// orders.place.single.limit.sell = limitSellOrder.order;
		orders.place.single.tracking.buy = trackingBuyOrder.order;
		orders.place.single.tracking.sell = trackingSellOrder.order;
		orders.place.single.market.buy = marketBuyOrder.order;
		orders.place.single.market.sell = marketSellOrder.order;
		console.log('placeOrder:fixedPrice:buy:\n', dump(fixedPriceBuyOrder));
		console.log('placeOrder:fixedPrice:sell:\n', dump(fixedPriceSellOrder));
		// console.log('placeOrder:limit:buy:\n', dump(limitBuyOrder));
		// console.log('placeOrder:limit:sell:\n', dump(limitSellOrder));
		console.log('placeOrder:tracking:buy:\n', dump(trackingBuyOrder));
		console.log('placeOrder:tracking:sell:\n', dump(trackingSellOrder));
		console.log('placeOrder:market:buy:\n', dump(marketBuyOrder));
		console.log('placeOrder:market:sell:\n', dump(marketSellOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.placeOrders) {
		const marketFixedPricePlaceOrders = await rujira.fin.placeOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.place.multiple.filter((order) => [OrderType.MARKET, OrderType.FIXED_PRICE].includes(order.type))
		});
		orders.place.marketFixedPricePlaceOrders = marketFixedPricePlaceOrders.orders;
		console.log('marketFixedPricePlaceOrders:size:', dump(marketFixedPricePlaceOrders.orders.size));
		console.log('marketFixedPricePlaceOrders:ids:\n', dump(marketFixedPricePlaceOrders.orders.keySeq().toJS()));
		console.log('marketFixedPricePlaceOrders:transactions:hashes:\n', dump(marketFixedPricePlaceOrders.transactions.keySeq().toJS()));
		// console.log('marketFixedPricePlaceOrders:orders:\n', dump(placeOrders.orders.toJS()));


		const trackingPlaceOrders = await rujira.fin.placeOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.place.multiple.filter((order) => [OrderType.TRACKING_ORDER].includes(order.type))
		});
		orders.place.trackingPlaceOrders = trackingPlaceOrders.orders;
		console.log('trackingPlaceOrders:size:', dump(trackingPlaceOrders.orders.size));
		console.log('trackingPlaceOrders:ids:\n', dump(trackingPlaceOrders.orders.keySeq().toJS()));
		console.log('trackingPlaceOrders:transactions:hashes:\n', dump(trackingPlaceOrders.transactions.keySeq().toJS()));
		// console.log('trackingPlaceOrders:orders:\n', dump(placeOrders.orders.toJS()));

		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrder) {
		const buyFixedPriceOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: fixedOrdersMarketAddress,
			marketSymbol: fixedOrdersMarketSymbol,
			// market: fixedOrdersMarket,
			orderSide: orderTemplates.place.single.fixedPrice.buy.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.fixedPrice.buy.price)
		});
		const sellFixedPriceOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: fixedOrdersMarketAddress,
			marketSymbol: fixedOrdersMarketSymbol,
			// market: fixedOrdersMarket,
			orderSide: orderTemplates.place.single.fixedPrice.sell.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.fixedPrice.sell.price)
		});
		orders.get.single.fixedPriceBuy = buyFixedPriceOrder;
		orders.get.single.fixedPriceSell = sellFixedPriceOrder;
		console.log('getOrder:fixedPrice:buy:\n', dump(buyFixedPriceOrder));
		console.log('getOrder:fixedPrice:sell:\n', dump(sellFixedPriceOrder));

		const buyTrackingOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: trackingOrdersMarketSymbol,
			// market: trackingOrdersMarket,
			orderSide: orderTemplates.place.single.tracking.buy.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.tracking.buy.price)
		});
		const sellTrackingOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: trackingOrdersMarketSymbol,
			// market: trackingOrdersMarket,
			orderSide: orderTemplates.place.single.tracking.sell.side,
			orderPrice: cast<OrderPrice>(orderTemplates.place.single.tracking.sell.price)
		});
		orders.get.single.trackingBuy = buyTrackingOrder;
		orders.get.single.trackingSell = sellTrackingOrder;
		console.log('getOrder:tracking:buy:\n', dump(buyTrackingOrder));
		console.log('getOrder:tracking:sell:\n', dump(sellTrackingOrder));

		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrders) {
		const fixedPriceGetOrders = await rujira.fin.getOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: fixedOrdersMarketAddress,
			marketSymbol: fixedOrdersMarketSymbol,
			// market: fixedOrdersMarket,
			orderTypes: [OrderType.FIXED_PRICE],
			orderSides: [OrderSide.BUY, OrderSide.SELL],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED],
			// orderPrices: orderTemplates.place.multiple.map(order => get<OrderPrice>(order.price)),
			// maximumNumberOfOrders: orderTemplates.place.multiple.length
		});
		orders.get.fixedPriceMultiple = fixedPriceGetOrders;
		console.log('getOrders:fixedPrice:size:', dump(fixedPriceGetOrders.size));
		console.log('getOrders:fixedPrice:ids:\n', dump(fixedPriceGetOrders.keySeq().toJS()));
		console.log('getOrders:fixedPrice:\n', dump(fixedPriceGetOrders.toJS()));

		const trackingGetOrders = await rujira.fin.getOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: trackingOrdersMarketSymbol,
			// market: trackingOrdersMarket,
			orderTypes: [OrderType.TRACKING_ORDER],
			orderSides: [OrderSide.BUY, OrderSide.SELL],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED],
			// orderPrices: orderTemplates.place.multiple.map(order => get<OrderPrice>(order.price)),
			// maximumNumberOfOrders: orderTemplates.place.multiple.length
		});
		orders.get.trackingMultiple = trackingGetOrders;
		console.log('getOrders:tracking:size:', dump(trackingGetOrders.size));
		console.log('getOrders:tracking:ids:\n', dump(trackingGetOrders.keySeq().toJS()));
		console.log('getOrders:tracking:\n', dump(trackingGetOrders.toJS()));

		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrder) {
		const fixedPriceBuyOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.buy);
		const fixedPriceSellOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.sell);
		const trackingBuyOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.tracking.buy);
		const trackingSellOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.tracking.sell);
		orders.replace.single.fixedPrice.buy = fixedPriceBuyOrder.order;
		orders.replace.single.fixedPrice.sell = fixedPriceSellOrder.order;
		orders.replace.single.tracking.buy = trackingBuyOrder.order;
		orders.replace.single.tracking.sell = trackingSellOrder.order;
		console.log('replaceOrder:fixedPrice:buy:\n', dump(fixedPriceBuyOrder));
		console.log('replaceOrder:fixedPrice:sell:\n', dump(fixedPriceSellOrder));
		console.log('replaceOrder:tracking:buy:\n', dump(trackingBuyOrder));
		console.log('replaceOrder:tracking:sell:\n', dump(trackingSellOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrders) {
		const fixedPriceReplaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.replace.multiple.filter((order) => [OrderType.FIXED_PRICE].includes(order.type))
		});
		orders.replace.fixedPriceMultiple = fixedPriceReplaceOrders.orders;
		console.log('replaceOrders:fixedPrice:size:', dump(fixedPriceReplaceOrders.orders.size));
		console.log('replaceOrders:fixedPrice:ids:\n', dump(fixedPriceReplaceOrders.orders.keySeq().toJS()));
		console.log('replaceOrders:fixedPrice:transactions:hashes:\n', dump(fixedPriceReplaceOrders.transactions.keySeq().toJS()));
		// console.log('replaceOrders:fixedPrice:replacedOrders:\n', dump(fixedPriceReplaceOrders.orders.toJS()));

		const trackingReplaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.replace.multiple.filter((order) => [OrderType.TRACKING_ORDER].includes(order.type))
		});
		orders.replace.trackingMultiple = trackingReplaceOrders.orders;
		console.log('replaceOrders:tracking:size:', dump(trackingReplaceOrders.orders.size));
		console.log('replaceOrders:tracking:ids:\n', dump(trackingReplaceOrders.orders.keySeq().toJS()));
		console.log('replaceOrders:tracking:transactions:hashes:\n', dump(trackingReplaceOrders.transactions.keySeq().toJS()));
		// console.log('replaceOrders:tracking:replacedOrders:\n', dump(trackingReplaceOrders.orders.toJS()));

		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrder) {
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
		orders.cancel.single.fixedPrice.buy = fixedPriceBuyOrder.order;
		orders.cancel.single.fixedPrice.sell = fixedPriceSellOrder.order;
		orders.cancel.single.tracking.buy = trackingBuyOrder.order;
		orders.cancel.single.tracking.sell = trackingSellOrder.order;
		console.log('cancelOrder:fixedPrice:buy:\n', dump(fixedPriceBuyOrder));
		console.log('cancelOrder:fixedPrice:sell:\n', dump(fixedPriceSellOrder));
		console.log('cancelOrder:tracking:buy:\n', dump(trackingBuyOrder));
		console.log('cancelOrder:tracking:sell:\n', dump(trackingSellOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrders) {
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
			// marketAddress: fixedOrdersMarketAddress,
			marketSymbol: fixedOrdersMarketSymbol,
			// market: fixedOrdersMarket,
		});
		orders.cancel.fixedPriceMultiple = fixedPriceCancelOrders.orders;
		console.log('cancelOrders:fixedPrice:size:', dump(fixedPriceCancelOrders.orders.size));
		console.log('cancelOrders:fixedPrice:ids:\n', dump(fixedPriceCancelOrders.orders.keySeq().toJS()));
		console.log('cancelOrders:fixedPrice:transactions:hashes:\n', dump(fixedPriceCancelOrders.transactions.keySeq().toJS()));
		// console.log('cancelOrders:cancelledOrders:\n', dump(cancelOrders.orders.toJS()));

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
		orders.cancel.trackingMultiple = trackingCancelOrders.orders;
		console.log('cancelOrders:tracking:size:', dump(trackingCancelOrders.orders.size));
		console.log('cancelOrders:tracking:ids:\n', dump(trackingCancelOrders.orders.keySeq().toJS()));
		console.log('cancelOrders:tracking:transactions:hashes:\n', dump(trackingCancelOrders.transactions.keySeq().toJS()));
		// console.log('cancelOrders:tracking:cancelledOrders:\n', dump(trackingCancelOrders.orders.toJS()));

		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelAllOrders) {
		const fixedPriceCancelAllOrders = await rujira.fin.cancelAllOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: fixedOrdersMarketAddress,
			marketSymbol: fixedOrdersMarketSymbol,
			// market: fixedOrdersMarket,
		});
		orders.cancel.fixedPriceAll = fixedPriceCancelAllOrders.orders;
		console.log('cancelAllOrders:fixedPrice:size:', dump(fixedPriceCancelAllOrders.orders.size));
		console.log('cancelAllOrders:fixedPrice:ids:\n', dump(fixedPriceCancelAllOrders.orders.keySeq().toJS()));
		console.log('cancelAllOrders:fixedPrice:transactions:hashes:\n', dump(fixedPriceCancelAllOrders.transactions.keySeq().toJS()));
		// console.log('cancelAllOrders:cancelledOrders:\n', dump(cancelAllOrders.orders.toJS()));

		const trackingCancelAllOrders = await rujira.fin.cancelAllOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: trackingOrdersMarketSymbol,
			// market: trackingOrdersMarket,
		});
		orders.cancel.trackingAll = trackingCancelAllOrders.orders;
		console.log('cancelAllOrders:tracking:size:', dump(trackingCancelAllOrders.orders.size));
		console.log('cancelAllOrders:tracking:ids:\n', dump(trackingCancelAllOrders.orders.keySeq().toJS()));
		console.log('cancelAllOrders:tracking:transactions:hashes:\n', dump(trackingCancelAllOrders.transactions.keySeq().toJS()));
		// console.log('cancelAllOrders:tracking:cancelledOrders:\n', dump(trackingCancelAllOrders.orders.toJS()));

		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.withdrawAllFilledOrders) {
		const fixedPriceWithdrawAllFilledOrders = await rujira.fin.withdrawAllFilledOrders({
			ownerAddress: walletAddress,
			marketAddress: fixedOrdersMarketAddress,
			marketSymbol: fixedOrdersMarketSymbol,
		});
		orders.withdraw.fixedPriceAll = fixedPriceWithdrawAllFilledOrders.orders;
		console.log('withdrawAllFilledOrders:fixedPrice:size:', dump(fixedPriceWithdrawAllFilledOrders.orders.size));
		console.log('withdrawAllFilledOrders:fixedPrice:ids:\n', dump(fixedPriceWithdrawAllFilledOrders.orders.keySeq().toJS()));
		console.log('withdrawAllFilledOrders:fixedPrice:transactions:hashes:\n', dump(fixedPriceWithdrawAllFilledOrders.transactions.keySeq().toJS()));
		// console.log('withdrawAllFilledOrders:withdrawnOrders:\n', dump(withdrawAllFilledOrders.orders.toJS()));

		const trackingWithdrawAllFilledOrders = await rujira.fin.withdrawAllFilledOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: trackingOrdersMarketAddress,
			marketSymbol: trackingOrdersMarketSymbol,
			// market: trackingOrdersMarket,
		});
		orders.withdraw.trackingAll = trackingWithdrawAllFilledOrders.orders;
		console.log('withdrawAllFilledOrders:tracking:size:', dump(trackingWithdrawAllFilledOrders.orders.size));
		console.log('withdrawAllFilledOrders:tracking:ids:\n', dump(trackingWithdrawAllFilledOrders.orders.keySeq().toJS()));
		console.log('withdrawAllFilledOrders:tracking:transactions:hashes:\n', dump(trackingWithdrawAllFilledOrders.transactions.keySeq().toJS()));
		// console.log('withdrawAllFilledOrders:tracking:withdrawnOrders:\n', dump(trackingWithdrawAllFilledOrders.orders.toJS()));

		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.persistOrders) {
		const persistOrders = await rujira.fin.persistOrders({
			ownerAddress: walletAddress,
			owner: undefined,
			// marketAddress: fixedOrdersMarketAddress,
			marketSymbol: fixedOrdersMarketSymbol,
			// market: fixedOrdersMarket,
			orders: {
				// place: orderTemplates.place.multiple,
				// replace: orderTemplates.replace.multiple,
				// cancel: orderTemplates.cancel.multiple.map(orderTemplate => rujira.fin.getOrderId({
				// 	ownerAddress: orderTemplate.ownerAddress,
				// 	marketSymbol: orderTemplate.marketSymbol,
				// 	// market: fixedOrdersMarket,
				// 	orderType: orderTemplate.type,
				// 	orderSide: orderTemplate.side,
				// 	orderPrice: orderTemplate.price,
				// 	// order: orderTemplate
				// })),
				// cancel: orders.cancel.multiple.valueSeq().toList(),
				// withdraw: orders.withdraw.multiple.keySeq().toList(),
				// withdraw: orders.withdraw.multiple.valueSeq().toList(),
			}
		});
		orders.persist.placedOrders = persistOrders.placedOrders;
		orders.persist.replacedOrders = persistOrders.replacedOrders;
		orders.persist.cancelledOrders = persistOrders.cancelledOrders;
		orders.persist.withdrawnOrders = persistOrders.withdrawnOrders;
		console.log('persistOrders:placedOrders:size:', dump(persistOrders.placedOrders?.size));
		console.log('persistOrders:replacedOrders:size:', dump(persistOrders.replacedOrders?.size));
		console.log('persistOrders:cancelledOrders:size:', dump(persistOrders.cancelledOrders?.size));
		console.log('persistOrders:withdrawnOrders:size:', dump(persistOrders.withdrawnOrders?.size));
		console.log('persistOrders:placedOrders:ids:\n', dump(persistOrders.placedOrders?.keySeq().toJS()));
		console.log('persistOrders:replacedOrders:ids:\n', dump(persistOrders.replacedOrders?.keySeq().toJS()));
		console.log('persistOrders:cancelledOrders:ids:\n', dump(persistOrders.cancelledOrders?.keySeq().toJS()));
		console.log('persistOrders:withdrawnOrders:ids:\n', dump(persistOrders.withdrawnOrders?.keySeq().toJS()));
		console.log('persistOrders:transactions:hashes:\n', dump(persistOrders.transactions.keySeq().toJS()));
		console.log('persistOrders:\n', dump(persistOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}
})();
