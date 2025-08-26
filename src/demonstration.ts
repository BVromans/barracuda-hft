import Decimal from "decimal.js";
import "./bootstrap";
import { properties } from "./properties";
import { Rujira } from "./rujira";
import { DECIMAL_100, FinPlaceOrderRequest, FinReplaceOrderRequest, Indicator, Map, List, Market, MarketSymbol, Order, OrderBookOrder, OrderId, OrderPrice, OrderSide, OrderStatus, OrderType, Price, RujiraConstructorOptions, RujiraInitializeOptions, Token, TokenSymbol, WalletAddress, WalletMnemonic, WalletPrivateKey } from "./types";
import { dump, get } from "./utils";

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

	const walletAddress = properties.getAs<WalletAddress>('rujira.wallet.publicKeys.thor');

	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

	console.log('\n--------------------------------------------------------------------------------\n');

	const defaultMarketAddress = 'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a';
	const defaultMarketSymbol = 'THOR-RUJI/ETH-USDC';
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

	const defaultBuyOrderMininumAmount = Decimal('0.00000001'); // Depends on the market decimals
	const defaultBuyOrderMiddleAmount = Decimal('0.01234567'); // Depends on the market decimals
	const defaultBuyOrderMaximumAmount = Decimal('0.12345678'); // Depends on the market decimals

	const defaultBuyOrderMininumPrice = Decimal('0.000000000001'); // Usually 1e-12
	const defaultBuyOrderMiddlePrice = Decimal('0.001234'); // Depends on the market tick
	const defaultBuyOrderMaximumPrice = get<Price>(defaultMarketTicker.middlePrice.baseToQuote).mul(defaultSpreadPercentage.div(DECIMAL_100)); // Depends on the market tick
	const defaultBuyOrderFillablePrice = get<OrderBookOrder>(defaultMarketOrderBook.book.bestAsk).price.mul(defaultFillableSpreadPercentage.plus(DECIMAL_100).div(DECIMAL_100)); // Depends on the market tick

	const defaultSellOrderMininumAmount = Decimal('0.00000001'); // Depends on the market decimals
	const defaultSellOrderMiddleAmount = Decimal('0.01234567'); // Depends on the market decimals
	const defaultSellOrderMaximumAmount = Decimal('0.12345678'); // Depends on the market decimals

	const defaultSellOrderMinimumPrice = get<Price>(defaultMarketTicker.middlePrice.baseToQuote).mul(defaultSpreadPercentage.plus(DECIMAL_100).div(DECIMAL_100)); // Depends on the market tick
	const defaultSellOrderMiddlePrice = Decimal('98.76'); // Depends on the market tick
	const defaultSellOrderMaximumPrice = Decimal('9999'); // Depends from the market "tick", which blocks the max precision
	const defaultSellOrderFillablePrice = get<OrderBookOrder>(defaultMarketOrderBook.book.bestBid).price.mul(DECIMAL_100.minus(defaultFillableSpreadPercentage).div(DECIMAL_100)); // Depends on the market tick

	const orderTemplates = {
		place: {
			single: {
				fixedPrice: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						market: defaultMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount,
						price: defaultBuyOrderMiddlePrice
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						market: defaultMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultSellOrderMiddleAmount,
						price: defaultSellOrderMiddlePrice
					} as FinPlaceOrderRequest,
				},
				limit: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount,
					// 	price: defaultBuyOrderMiddlePrice
					// } as FinPlaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount,
					// 	price: defaultSellOrderMiddlePrice
					// } as FinPlaceOrderRequest,
				},
				tracking: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.TRACKING_ORDER,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount,
					// 	price: defaultBuyOrderMiddlePrice
					// } as FinPlaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.TRACKING_ORDER,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount,
					// 	price: defaultSellOrderMiddlePrice
					// } as FinPlaceOrderRequest,
				},
				market: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						market: defaultMarket,
						type: OrderType.MARKET,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount,
						// price: defaultBuyOrderMiddlePrice
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						market: defaultMarket,
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
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMininumAmount,
					price: defaultBuyOrderMininumPrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount,
					price: defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMaximumAmount,
					price: defaultBuyOrderMaximumPrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMininumAmount,
					price: defaultBuyOrderFillablePrice
				} as FinPlaceOrderRequest,
				// {
				// 	ownerAddress: walletAddress,
				// 	marketAddress: defaultMarketAddress,
				// 	marketSymbol: defaultMarketSymbol,
				// 	market: defaultMarket,
				// 	type: OrderType.MARKET,
				// 	side: OrderSide.BUY,
				// 	amount: defaultBuyOrderMiddleAmount,
				// 	// price: undefined,
				// 	// maximumSlippagePercentage: defaultMaximumMarketOrderSlippagePercentage
				// } as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMininumAmount,
					price: defaultSellOrderMinimumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount,
					price: defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMaximumAmount,
					price: defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMininumAmount,
					price: defaultSellOrderFillablePrice
				} as FinPlaceOrderRequest,
				// {
				// 	ownerAddress: walletAddress,
				// 	// owner: undefined,
				// 	marketAddress: defaultMarketAddress,
				// 	marketSymbol: defaultMarketSymbol,
				// 	market: defaultMarket,
				// 	type: OrderType.MARKET,
				// 	side: OrderSide.SELL,
				// 	amount: defaultSellOrderMiddleAmount,
				// 	// price: undefined,
				// 	// maximumSlippagePercentage: defaultMaximumMarketOrderSlippagePercentage
				// } as FinPlaceOrderRequest,
			]
		},
		replace: {
			single: {
				fixedPrice: {
					buy: {
						ownerAddress: walletAddress,
						// marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						// market: defaultMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultBuyOrderMiddleAmount)),
						price: defaultBuyOrderMiddlePrice
					} as FinReplaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						// market: defaultMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultSellOrderMiddleAmount.plus(Decimal(1).mul(defaultSellOrderMiddleAmount)),
						price: defaultSellOrderMiddlePrice
					} as FinReplaceOrderRequest,
				},
				limit: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	// market: defaultMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultBuyOrderMiddleAmount)),
					// 	price: defaultBuyOrderMiddlePrice
					// } as FinReplaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	// market: defaultMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount.plus(Decimal(1).mul(defaultSellOrderMiddleAmount)),
					// 	price: defaultSellOrderMiddlePrice
					// } as FinReplaceOrderRequest,
				},
				tracking: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	// market: defaultMarket,
					// 	type: OrderType.TRACKING_ORDER,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultBuyOrderMiddleAmount)),
					// 	price: defaultBuyOrderMiddlePrice
					// } as FinReplaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	// market: defaultMarket,
					// 	type: OrderType.TRACKING_ORDER,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount.plus(Decimal(1).mul(defaultSellOrderMiddleAmount)),
					// 	price: defaultSellOrderMiddlePrice
					// } as FinReplaceOrderRequest,
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
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMininumAmount.plus(Decimal(1).mul(defaultOrderMininumAmountIncrement)),
					price: defaultBuyOrderMininumPrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMininumAmountIncrement)),
					price: defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount.plus(Decimal(1).mul(defaultOrderMininumAmountIncrement)),
					price: defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinReplaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMaximumAmount.plus(Decimal(1).mul(defaultOrderMininumAmountIncrement)),
					price: defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinReplaceOrderRequest,
			]
		},
		cancel: {
			single: {
				fixedPrice: {
					buy: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						market: defaultMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.BUY,
						amount: defaultBuyOrderMiddleAmount,
						price: defaultBuyOrderMiddlePrice
					} as FinPlaceOrderRequest,
					sell: {
						ownerAddress: walletAddress,
						// owner: undefined,
						marketAddress: defaultMarketAddress,
						marketSymbol: defaultMarketSymbol,
						market: defaultMarket,
						type: OrderType.FIXED_PRICE,
						side: OrderSide.SELL,
						amount: defaultSellOrderMiddleAmount,
						price: defaultSellOrderMiddlePrice
					} as FinPlaceOrderRequest,
				},
				limit: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount,
					// 	price: defaultBuyOrderMiddlePrice
					// } as FinPlaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.LIMIT,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount,
					// 	price: defaultSellOrderMiddlePrice
					// } as FinPlaceOrderRequest,
				},
				tracking: {
					// buy: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.TRACKING_ORDER,
					// 	side: OrderSide.BUY,
					// 	amount: defaultBuyOrderMiddleAmount,
					// 	price: defaultBuyOrderMiddlePrice
					// } as FinPlaceOrderRequest,
					// sell: {
					// 	ownerAddress: walletAddress,
					// 	// owner: undefined,
					// 	marketAddress: defaultMarketAddress,
					// 	marketSymbol: defaultMarketSymbol,
					// 	market: defaultMarket,
					// 	type: OrderType.TRACKING_ORDER,
					// 	side: OrderSide.SELL,
					// 	amount: defaultSellOrderMiddleAmount,
					// 	price: defaultSellOrderMiddlePrice
					// } as FinPlaceOrderRequest,
				},
				market: {
					buy: undefined as unknown as FinPlaceOrderRequest,
					sell: undefined as unknown as FinPlaceOrderRequest,
				}
			},
			multiple: [
				{
					ownerAddress: walletAddress,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMininumAmount,
					price: defaultBuyOrderMininumPrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: defaultBuyOrderMiddleAmount,
					price: defaultBuyOrderMiddlePrice.mul(DECIMAL_100.plus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMiddleAmount,
					price: defaultSellOrderMiddlePrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100))
				} as FinPlaceOrderRequest,
				{
					ownerAddress: walletAddress,
					// owner: undefined,
					marketAddress: defaultMarketAddress,
					marketSymbol: defaultMarketSymbol,
					market: defaultMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: defaultSellOrderMaximumAmount,
					price: defaultSellOrderMaximumPrice.mul(DECIMAL_100.minus(defaultPriceIncrementPercentage).div(DECIMAL_100))
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
				buy: undefined as unknown as Order,
				sell: undefined as unknown as Order,
			},
			multiple: undefined as unknown as Map<OrderId, Order>,
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
			multiple: undefined as unknown as Map<OrderId, Order>,
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
			multiple: undefined as unknown as Map<OrderId, Order>,
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
			multiple: undefined as unknown as Map<OrderId, Order>,
			all: undefined as unknown as Map<OrderId, Order>,
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
			all: undefined as unknown as Map<OrderId, Order>,
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
			hash: '0BD692147F4D28106113FA28963E2D47FB861FFE13D33ECDD1AAF33845B090E2'
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
			// market: defaultMarket,
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
		// const trackingBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.buy);
		// const trackingSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.tracking.sell);
		const marketBuyOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.buy);
		const marketSellOrder = await rujira.fin.placeOrder(orderTemplates.place.single.market.sell);
		orders.place.single.fixedPrice.buy = fixedPriceBuyOrder.order;
		orders.place.single.fixedPrice.sell = fixedPriceSellOrder.order;
		// orders.place.single.limit.buy = limitBuyOrder.order;
		// orders.place.single.limit.sell = limitSellOrder.order;
		// orders.place.single.tracking.buy = trackingBuyOrder.order;
		// orders.place.single.tracking.sell = trackingSellOrder.order;
		orders.place.single.market.buy = marketBuyOrder.order;
		orders.place.single.market.sell = marketSellOrder.order;
		console.log('placeOrder:fixedPrice:buy:\n', dump(fixedPriceBuyOrder));
		console.log('placeOrder:fixedPrice:sell:\n', dump(fixedPriceSellOrder));
		// console.log('placeOrder:limit:buy:\n', dump(limitBuyOrder));
		// console.log('placeOrder:limit:sell:\n', dump(limitSellOrder));
		// console.log('placeOrder:tracking:buy:\n', dump(trackingBuyOrder));
		// console.log('placeOrder:tracking:sell:\n', dump(trackingSellOrder));
		console.log('placeOrder:market:buy:\n', dump(marketBuyOrder));
		console.log('placeOrder:market:sell:\n', dump(marketSellOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.placeOrders) {
		const placeOrders = await rujira.fin.placeOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.place.multiple
		});
		orders.place.multiple = placeOrders.orders;
		console.log('placeOrders:size:', dump(placeOrders.orders.size));
		console.log('placeOrders:ids:\n', dump(placeOrders.orders.keySeq().toJS()));
		console.log('placeOrders:transactions:hashes:\n', dump(placeOrders.transactions.keySeq().toJS()));
		console.log('placeOrders:orders:\n', dump(placeOrders.orders.toJS()));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrder) {
		const buyOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orderSide: orderTemplates.place.single.fixedPrice.buy.side,
			orderPrice: get<OrderPrice>(orderTemplates.place.single.fixedPrice.buy.price)
		});
		const sellOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orderSide: orderTemplates.place.single.fixedPrice.sell.side,
			orderPrice: get<OrderPrice>(orderTemplates.place.single.fixedPrice.sell.price)
		});
		orders.get.single.buy = buyOrder;
		orders.get.single.sell = sellOrder;
		console.log('getOrder:buy:\n', dump(buyOrder));
		console.log('getOrder:sell:\n', dump(sellOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrders) {
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
		orders.get.multiple = getOrders;
		console.log('getOrders:size:', dump(getOrders.size));
		console.log('getOrders:ids:\n', dump(getOrders.keySeq().toJS()));
		console.log('getOrders:\n', dump(getOrders.toJS()));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrder) {
		const buyOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.buy);
		const sellOrder = await rujira.fin.replaceOrder(orderTemplates.replace.single.fixedPrice.sell);
		orders.replace.single.fixedPrice.buy = buyOrder.order;
		orders.replace.single.fixedPrice.sell = sellOrder.order;
		console.log('replaceOrder:fixedPrice:buy:\n', dump(buyOrder));
		console.log('replaceOrder:fixedPrice:sell:\n', dump(sellOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrders) {
		const replaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			orders: orderTemplates.replace.multiple
		});
		orders.replace.multiple = replaceOrders.orders;
		console.log('replaceOrders:size:', dump(replaceOrders.orders.size));
		console.log('replaceOrders:ids:\n', dump(replaceOrders.orders.keySeq().toJS()));
		console.log('replaceOrders:transactions:hashes:\n', dump(replaceOrders.transactions.keySeq().toJS()));
		console.log('replaceOrders:replacedOrders:\n', dump(replaceOrders.orders.toJS()));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrder) {
		const buyOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
					ownerAddress: orderTemplates.place.single.fixedPrice.buy.ownerAddress,
					marketSymbol: orderTemplates.place.single.fixedPrice.buy.marketSymbol,
					// market: defaultMarket,
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
			// market: defaultMarket,
		});
		const sellOrder = await rujira.fin.cancelOrder({
			orderId: rujira.fin.getOrderId({
				ownerAddress: orderTemplates.place.single.fixedPrice.sell.ownerAddress,
				marketSymbol: orderTemplates.place.single.fixedPrice.sell.marketSymbol,
				// market: defaultMarket,
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
			// market: defaultMarket,
		})
		orders.cancel.single.fixedPrice.buy = buyOrder.order;
		orders.cancel.single.fixedPrice.sell = sellOrder.order;
		console.log('cancelOrder:fixedPrice:buy:\n', dump(buyOrder));
		console.log('cancelOrder:fixedPrice:sell:\n', dump(sellOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrders) {
		const cancelOrders = await rujira.fin.cancelOrders({
			orderIds: orderTemplates.cancel.multiple.map(orderTemplate => rujira.fin.getOrderId({
				ownerAddress: orderTemplate.ownerAddress,
				marketSymbol: orderTemplate.marketSymbol,
				// market: defaultMarket,
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
			// market: defaultMarket,
		});
		orders.cancel.multiple = cancelOrders.orders;
		console.log('cancelOrders:size:', dump(cancelOrders.orders.size));
		console.log('cancelOrders:ids:\n', dump(cancelOrders.orders.keySeq().toJS()));
		console.log('cancelOrders:transactions:hashes:\n', dump(cancelOrders.transactions.keySeq().toJS()));
		console.log('cancelOrders:cancelledOrders:\n', dump(cancelOrders.orders.toJS()));
		console.log('cancelOrders:\n', dump(cancelOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelAllOrders) {
		const cancelAllOrders = await rujira.fin.cancelAllOrders({
			ownerAddress: walletAddress,
			// owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
		});
		orders.cancel.all = cancelAllOrders.orders;
		console.log('cancelAllOrders:size:', dump(cancelAllOrders.orders.size));
		console.log('cancelAllOrders:ids:\n', dump(cancelAllOrders.orders.keySeq().toJS()));
		console.log('cancelAllOrders:transactions:hashes:\n', dump(cancelAllOrders.transactions.keySeq().toJS()));
		console.log('cancelAllOrders:cancelledOrders:\n', dump(cancelAllOrders.orders.toJS()));
		console.log('cancelAllOrders:\n', dump(cancelAllOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.withdrawAllFilledOrders) {
		const withdrawAllFilledOrders = await rujira.fin.withdrawAllFilledOrders({
			ownerAddress: walletAddress,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
		});
		orders.withdraw.all = withdrawAllFilledOrders.orders;
		console.log('withdrawAllFilledOrders:size:', dump(withdrawAllFilledOrders.orders.size));
		console.log('withdrawAllFilledOrders:ids:\n', dump(withdrawAllFilledOrders.orders.keySeq().toJS()));
		console.log('withdrawAllFilledOrders:transactions:hashes:\n', dump(withdrawAllFilledOrders.transactions.keySeq().toJS()));
		console.log('withdrawAllFilledOrders:withdrawnOrders:\n', dump(withdrawAllFilledOrders.orders.toJS()));
		console.log('withdrawAllFilledOrders:\n', dump(withdrawAllFilledOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.persistOrders) {
		const persistOrders = await rujira.fin.persistOrders({
			ownerAddress: walletAddress,
			owner: undefined,
			// marketAddress: defaultMarketAddress,
			marketSymbol: defaultMarketSymbol,
			// market: defaultMarket,
			orders: {
				// place: orderTemplates.place.multiple,
				// replace: orderTemplates.replace.multiple,
				// cancel: orderTemplates.cancel.multiple.map(orderTemplate => rujira.fin.getOrderId({
				// 	ownerAddress: orderTemplate.ownerAddress,
				// 	marketSymbol: orderTemplate.marketSymbol,
				// 	// market: defaultMarket,
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
