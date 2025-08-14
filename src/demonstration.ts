import Decimal from "decimal.js";
import { properties } from "./properties";
import { Rujira } from "./rujira";
import { Market, MarketSymbol, OrderSide, OrderStatus, OrderType, RujiraConstructorOptions, RujiraInitializeOptions, Token, TokenSymbol, WalletAddress, WalletMnemonic, WalletPrivateKey } from "./types";

(async function run() {
	const active = {
		getStatus: true,
		getTransaction: true,
		getAllTokens: true,
		getTokens: true,
		getToken: true,
		getAllMarkets: true,
		getMarkets: true,
		getMarket: true,
		getOrderBook: true,
		getTicker: true,
		getCandles: true,
		getIndicators: true,
		getBalances: true,
		getOrder: true,
		getOrders: true,
		placeOrder: undefined,
		placeOrders: undefined,
		replaceOrder: undefined,
		replaceOrders: undefined,
		cancelOrder: undefined,
		cancelOrders: undefined,
		withdrawOrders: undefined,
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
		console.log('getStatus:\n', getStatus);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getTransaction) {
		const getTransaction = await rujira.fin.getTransaction({
			hash: '07F95225F84BF9E5C69E4BAA54100F8AB078EB5801EB1761F8F70F746927B100'
		});
		console.log('getTransaction:\n', getTransaction);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getAllTokens) {
		const getAllTokens = await rujira.fin.getAllTokens({});
		console.log('getAllTokens:size:', getAllTokens.size);
		console.log('getAllTokens:symbols:\n', getAllTokens.keySeq().toJS());
		console.log('getAllTokens:addresses\n', getAllTokens.valueSeq().map(token => token.address).toJS());
		console.log('getAllTokens:symbols->addresses:\n', getAllTokens.entrySeq().map((entry: [TokenSymbol, Token]) => `${entry[0]} -> ${entry[1].address}`).toJS());
		// console.log('getAllTokens\n', getAllTokens.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getTokens) {
		const getTokens = await rujira.fin.getTokens({
			addresses: [
				'thor.ruji', // THOR-RUJI
				'bsc-usdt-0x55d398326f99059ff775485246999027b3197955', // ETH-USDT
			],
			symbols: [
				'THOR-NAMI',
				'THOR-RUNE',
			]
		});
		console.log('getTokens:size:', getTokens.size);
		console.log('getTokens:symbols:\n', getTokens.keySeq().toJS());
		console.log('getTokens:addresses\n', getTokens.valueSeq().map(token => token.address).toJS());
		console.log('getTokens:symbols->addresses:\n', getTokens.entrySeq().map((entry: [TokenSymbol, Token]) => `${entry[0]} -> ${entry[1].address}`).toJS());
		// console.log('getTokens\n', getTokens.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getToken) {
		const getToken = await rujira.fin.getToken({
			address: 'avax-avax', // AVAX-AVAX
			// symbol: 'AVAX-AVAX'
		});
		console.log('getToken:address:', getToken.address);
		console.log('getToken:symbol:', getToken.symbol);
		console.log('getToken\n', getToken);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getAllMarkets) {
		const getAllMarkets = await rujira.fin.getAllMarkets({});
		console.log('getAllMarkets:size:', getAllMarkets.size);
		console.log('getAllMarkets:symbols:\n', getAllMarkets.keySeq().toJS());
		console.log('getAllMarkets:addresses\n', getAllMarkets.valueSeq().map(market => market.address).toJS());
		console.log('getAllMarkets:symbols->addresses:\n', getAllMarkets.entrySeq().map((entry: [MarketSymbol, Market]) => `${entry[0]} -> ${entry[1].address}`).toJS());
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
		console.log('getMarkets:size:', getMarkets.size);
		console.log('getMarkets:symbols:\n', getMarkets.keySeq().toJS());
		console.log('getMarkets:addresses\n', getMarkets.valueSeq().map(market => market.address).toJS());
		console.log('getMarkets:symbols->addresses:\n', getMarkets.entrySeq().map((entry: [MarketSymbol, Market]) => `${entry[0]} -> ${entry[1].address}`).toJS());
		// console.log('getMarkets\n', getMarkets.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getMarket) {
		const getMarket = await rujira.fin.getMarket({
			// address: 'thor12ds7fxj5g47jwzfzvzzhzxxd3cp6v55flgwxva0803r8k5mzm44skth6wa',
				symbol: 'THOR-TCY/THOR-RUNE'
		});
		console.log('getMarket:address:', getMarket.address);
		console.log('getMarket:symbol:', getMarket.symbol);
		console.log('getMarket\n', getMarket);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrderBook) {
		const getOrderBook = await rujira.fin.getOrderBook({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('getOrderBook:\n', getOrderBook);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getTicker) {
		const getTicker = await rujira.fin.getTicker({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('getTicker:\n', getTicker);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getCandles) {
		const getCandles = await rujira.fin.getCandles({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('getCandles:size:', getCandles.size);
		console.log('getCandles:\n', getCandles.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getIndicators) {
		const getIndicators = await rujira.fin.getIndicators({
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('getIndicators:size:', getIndicators.size);
		console.log('getIndicators:\n', getIndicators.toJS());
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getBalances) {
		const getBalances = await rujira.fin.getBalances({
			walletAddress
		});
		console.log('getBalances:\n', JSON.stringify(getBalances, null, 2));
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.getOrder) {
		const getOrder = await rujira.fin.getOrder({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			orderSide: OrderSide.BUY,
			orderPrice: Decimal('0.000002')
		});
		console.log('getOrder:\n', getOrder);
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
		console.log('getOrders:size:', getOrders.size);
		console.log('getOrders:ids:\n', getOrders.keySeq().toJS());
		console.log('getOrders:\n', getOrders.toJS());
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
		console.log('placeOrder:\n', placeOrder);
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
		console.log('placeOrders:\n', placeOrders);
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
		console.log('replaceOrder:\n', replaceOrder);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.replaceOrders) {
		const replaceOrders = await rujira.fin.replaceOrders({
			ownerAddress: walletAddress,
			orders: []
		});
		console.log('replaceOrders:\n', replaceOrders);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrder) {
		const cancelOrder = await rujira.fin.cancelOrder({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
			orderId: `${walletAddress}-${RUJIUSDCMarketAddress}-${OrderSide.BUY}-${Decimal('0.80')}}`
		});
		console.log('cancelOrder:\n', cancelOrder);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.cancelOrders) {
		const cancelOrders = await rujira.fin.cancelOrders({
			ownerAddress: walletAddress,
			orders: []
		});
		console.log('cancelOrders:\n', cancelOrders);
		console.log('\n--------------------------------------------------------------------------------\n');
	}

	if (active.withdrawOrders) {
		const withdrawOrders = await rujira.fin.withdrawFilledOrders({
			ownerAddress: walletAddress,
			marketAddress: RUJIUSDCMarketAddress, // THOR-RUJI/ETH-USDC
			// marketSymbol: 'THOR-RUJI/ETH-USDC',
		});
		console.log('withdrawOrders:\n', withdrawOrders);
		console.log('\n--------------------------------------------------------------------------------\n');
	}
})();
