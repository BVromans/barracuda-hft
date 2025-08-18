import Decimal from "decimal.js";
import "./bootstrap";
import { properties } from "./properties";
import { Rujira } from "./rujira";
import { Indicator, Market, MarketSymbol, OrderSide, OrderStatus, OrderType, RujiraConstructorOptions, RujiraInitializeOptions, Token, TokenSymbol, WalletAddress, WalletMnemonic, WalletPrivateKey } from "./types";
import { dump } from "./utils";

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
		getOrder: false,
		getOrders: false,
		placeOrder: false,
		placeOrders: false,
		replaceOrder: false,
		replaceOrders: false,
		cancelOrder: false,
		cancelOrders: false,
		withdrawOrders: false,
		persistOrders: false,
	};

	const walletAddress = properties.getAs<WalletAddress>('rujira.wallet.publicKeys.thor');

	const RUJIUSDCMarketAddress = 'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a';

	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

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
		console.log('getMarkets:addresses\n', dump(getMarkets.valueSeq().map(market => market.address).toJS()));
		console.log('getMarkets:symbols->addresses:\n', dump(getMarkets.entrySeq().map((entry: [MarketSymbol, Market]) => `${entry[0]} -> ${entry[1].address}`).toJS()));
		// console.log('getMarkets\n', getMarkets.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getMarket) {
		const getMarket = await rujira.fin.getMarket({
			// address: 'thor12ds7fxj5g47jwzfzvzzhzxxd3cp6v55flgwxva0803r8k5mzm44skth6wa',
				symbol: 'THOR-TCY/THOR-RUNE'
		});
		console.log('getMarket:address:', dump(getMarket.address));
		console.log('getMarket:symbol:', dump(getMarket.symbol));
		console.log('getMarket\n', dump(getMarket));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrderBook) {
		const getOrderBook = await rujira.fin.getOrderBook({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('getOrderBook:\n', dump(getOrderBook));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getTicker) {
		const getTicker = await rujira.fin.getTicker({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('getTicker:\n', dump(getTicker));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getCandles) {
		const getCandles = await rujira.fin.getCandles({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			// market: undefined,
			// interval: CandleInterval.ONE_MINUTE,
			// maximumNumberOfCandles: 100,
		});
		console.log('getCandles:size:', dump(getCandles.size));
		console.log('getCandles:\n', dump(getCandles.toJS()));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getIndicators) {
		const getIndicators = await rujira.fin.getIndicators({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			// market: undefined,
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
			walletAddress
		});
		console.log('getBalances:\n', dump(getBalances));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrder) {
		const getOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			orderSide: OrderSide.BUY,
			orderPrice: Decimal('0.04')
		});
		console.log('getOrder:\n', dump(getOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrders) {
		const getOrders = await rujira.fin.getOrders({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			orderTypes: [OrderType.FIXED_PRICE],
			orderSides: [OrderSide.BUY],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED],
			// orderPrices: [Decimal('0.9')],
			// maximumNumberOfOrders: 2
		});
			console.log('getOrders:size:', dump(getOrders.size));
		console.log('getOrders:ids:\n', dump(getOrders.keySeq().toJS()));
		console.log('getOrders:\n', dump(getOrders.toJS()));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.placeOrder) {
		const placeOrder = await rujira.fin.placeOrder({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			type: OrderType.FIXED_PRICE,
			side: OrderSide.BUY,
			amount: Decimal('0.000001'),
			price: Decimal('0.000001')
		});
		console.log('placeOrder:\n', dump(placeOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.placeOrders) {
		const placeOrders = await rujira.fin.placeOrders({
			ownerAddress: walletAddress,
			orders: [
				{
					marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
					// marketSymbol: 'THOR-RUJI/ETH-USDC',
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: Decimal('0.000001'),
					price: Decimal('0.000002')
				},
				{
					marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
					// marketSymbol: 'THOR-RUJI/ETH-USDC',
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: Decimal('0.000001'),
					price: Decimal('0.000003')
				}
			]
		});
		console.log('placeOrders:\n', dump(placeOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrder) {
		const replaceOrder = await rujira.fin.replaceOrder({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			side: OrderSide.BUY,
			type: OrderType.FIXED_PRICE,
			amount: Decimal('0.000002'),
			price: Decimal('0.000001')
		});
		console.log('replaceOrder:\n', dump(replaceOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrders) {
		const replaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			orders: []
		});
		console.log('replaceOrders:\n', dump(replaceOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrder) {
		const cancelOrder = await rujira.fin.cancelOrder({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			orderId: `${walletAddress}-${RUJIUSDCMarketAddress}-${OrderSide.BUY}-${Decimal('0.80')}}`
		});
		console.log('cancelOrder:\n', dump(cancelOrder));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrders) {
		const cancelOrders = await rujira.fin.cancelOrders({
			ownerAddress: walletAddress,
			orders: []
		});
		console.log('cancelOrders:\n', dump(cancelOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.withdrawOrders) {
		const withdrawOrders = await rujira.fin.withdrawFilledOrders({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('withdrawOrders:\n', dump(withdrawOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.persistOrders) {
		const persistOrders = await rujira.fin.persistOrders({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			orders: {
				place: undefined,
				replace: undefined,
				cancel: undefined,
				withdraw: undefined,
			}
		});
		console.log('persistOrders:\n', dump(persistOrders));
		console.log('\n--------------------------------------------------------------------------------\n');
	}
})();
