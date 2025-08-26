import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import Decimal from "decimal.js";
import "dotenv/config";
import { properties } from "../src/properties";
import { Rujira } from "../src/rujira";
import {
	Amount,
	BIG_NUMBER_0,
	Candle,
	CandleInterval,
	DECIMAL_0,
	DECIMAL_1,
	Indicator,
	Integer,
	MarketAddress,
	MarketStatus,
	MarketSymbol,
	OrderAmount,
	OrderBookOrder,
	OrderPrice,
	OrderSide,
	OrderType,
	SystemStatus,
	TokenAddress,
	TokenSymbol,
	TransactionHash,
	TransactionStatus,
	Wallet,
	WalletAddress,
	WalletMnemonic
} from "../src/types";
import { get } from "../src/utils";

let rujira: Rujira;

let walletMnemonic: WalletMnemonic;
let walletPublicKeyThor: WalletAddress;
let wallet: Wallet;
let testsTimeout: number;
let transactionHash: TransactionHash;
let firstMarketSymbol: MarketSymbol;
let firstMarketAddress: MarketAddress;
let firstMarketBaseTokenAddress: TokenAddress;
let firstMarketQuoteTokenAddress: TokenAddress;
let firstMarketBaseTokenSymbol: TokenSymbol;
let firstMarketQuoteTokenSymbol: TokenSymbol;
let secondMarketSymbol: MarketSymbol;
let secondMarketAddress: MarketAddress;
let secondMarketBaseTokenAddress: TokenAddress;
let secondMarketQuoteTokenAddress: TokenAddress;
let secondMarketBaseTokenSymbol: TokenSymbol;
let secondMarketQuoteTokenSymbol: TokenSymbol;
let fixedPricePlaceSingleBuyOrderPrice: OrderPrice;
let fixedPricePlaceSingleBuyOrderAmount: OrderAmount;
let fixedPricePlaceSingleSellOrderPrice: OrderPrice;
let fixedPricePlaceSingleSellOrderAmount: OrderAmount;
let marketPlaceSingleBuyOrderPrice: OrderPrice;
let marketPlaceSingleBuyOrderAmount: OrderAmount;
let marketPlaceSingleSellOrderPrice: OrderPrice;
let marketPlaceSingleSellOrderAmount: OrderAmount;
let trackingPlaceSingleBuyOrderDeviation: OrderPrice;
let trackingPlaceSingleBuyOrderAmount: OrderAmount;
let trackingPlaceSingleSellOrderDeviation: OrderPrice;
let trackingPlaceSingleSellOrderAmount: OrderAmount;
let limitPlaceSingleBuyOrderPrice: OrderPrice;
let limitPlaceSingleBuyOrderAmount: OrderAmount;
let limitPlaceSingleSellOrderPrice: OrderPrice;
let limitPlaceSingleSellOrderAmount: OrderAmount;
let fixedPriceReplaceSingleBuyOrderAmount: OrderAmount;
let fixedPriceReplaceSingleSellOrderAmount: OrderAmount;
let trackingReplaceSingleBuyOrderAmount: OrderAmount;
let trackingReplaceSingleSellOrderAmount: OrderAmount;
let limitReplaceSingleBuyOrderAmount: OrderAmount;
let limitReplaceSingleSellOrderAmount: OrderAmount;

beforeAll(async () => {
	const requiredProperties = [
		'rujira.wallet.mnemonic',
		'rujira.wallet.publicKeys.thor',

		'tests.integration.timeout',

		'tests.integration.transaction.hash',

		'tests.integration.markets.first.symbol',
		'tests.integration.markets.first.address',
		'tests.integration.markets.first.tokens.base.address',
		'tests.integration.markets.first.tokens.base.symbol',
		'tests.integration.markets.first.tokens.quote.address',
		'tests.integration.markets.first.tokens.quote.symbol',

		'tests.integration.markets.second.symbol',
		'tests.integration.markets.second.address',
		'tests.integration.markets.second.tokens.base.address',
		'tests.integration.markets.second.tokens.base.symbol',
		'tests.integration.markets.second.tokens.quote.address',
		'tests.integration.markets.second.tokens.quote.symbol',

		'tests.integration.orders.place.fixed_price.single.buy.price',
		'tests.integration.orders.place.fixed_price.single.buy.amount',
		'tests.integration.orders.place.fixed_price.single.sell.price',
		'tests.integration.orders.place.fixed_price.single.sell.amount',
		// 'tests.integration.orders.place.fixed_price.multiple',

		'tests.integration.orders.place.market.single.buy.amount',
		'tests.integration.orders.place.market.single.sell.amount',
		// 'tests.integration.orders.place.market.multiple',

		'tests.integration.orders.place.tracking.single.buy.deviation',
		'tests.integration.orders.place.tracking.single.buy.amount',
		'tests.integration.orders.place.tracking.single.sell.deviation',
		'tests.integration.orders.place.tracking.single.sell.amount',
		// 'tests.integration.orders.place.tracking.multiple',

		'tests.integration.orders.place.limit.single.buy.price',
		'tests.integration.orders.place.limit.single.buy.amount',
		'tests.integration.orders.place.limit.single.sell.price',
		'tests.integration.orders.place.limit.single.sell.amount',
		// 'tests.integration.orders.place.limit.multiple',

		'tests.integration.orders.replace.fixed_price.single.buy.amount',
		'tests.integration.orders.replace.fixed_price.single.sell.amount',
		// 'tests.integration.orders.replace.fixed_price.multiple',

		'tests.integration.orders.replace.tracking.single.buy.amount',
		'tests.integration.orders.replace.tracking.single.sell.amount',
		// 'tests.integration.orders.replace.tracking.multiple',

		'tests.integration.orders.replace.limit.single.buy.amount',
		'tests.integration.orders.replace.limit.single.sell.amount',
		// 'tests.integration.orders.replace.limit.multiple',
	];

	const missingProperties = requiredProperties.filter(path => !properties.getAs<any>(path));

	if (missingProperties.length > 0) {
		throw new Error(`Missing required properties: ${missingProperties.join(', ')}`);
	}

	walletMnemonic = properties.getAs<WalletMnemonic>('rujira.wallet.mnemonic');
	walletPublicKeyThor = properties.getAs<WalletAddress>('rujira.wallet.publicKeys.thor');
	testsTimeout = Number(properties.getAs<Integer>('tests.integration.timeout'));

	transactionHash = properties.getAs<TransactionHash>('tests.integration.transaction.hash');

	firstMarketSymbol = properties.getAs<MarketSymbol>('tests.integration.markets.first.symbol').toUpperCase();
	firstMarketAddress = properties.getAs<MarketAddress>('tests.integration.markets.first.address').toLowerCase();
	firstMarketBaseTokenAddress = properties.getAs<TokenAddress>('tests.integration.markets.first.tokens.base.address').toLowerCase();
	firstMarketQuoteTokenAddress = properties.getAs<TokenAddress>('tests.integration.markets.first.tokens.quote.address').toLowerCase();
	firstMarketBaseTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.markets.first.tokens.base.symbol').toUpperCase();
	firstMarketQuoteTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.markets.first.tokens.quote.symbol').toUpperCase();

	secondMarketSymbol = properties.getAs<MarketSymbol>('tests.integration.markets.second.symbol').toUpperCase();
	secondMarketAddress = properties.getAs<MarketAddress>('tests.integration.markets.second.address').toLowerCase();
	secondMarketBaseTokenAddress = properties.getAs<TokenAddress>('tests.integration.markets.second.tokens.base.address').toLowerCase();
	secondMarketQuoteTokenAddress = properties.getAs<TokenAddress>('tests.integration.markets.second.tokens.quote.address').toLowerCase();
	secondMarketBaseTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.markets.second.tokens.base.symbol').toUpperCase();
	secondMarketQuoteTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.markets.second.tokens.quote.symbol').toUpperCase();

	fixedPricePlaceSingleBuyOrderPrice = Decimal(properties.getAs<Amount>('tests.integration.orders.place.fixed_price.single.buy.price'));
	fixedPricePlaceSingleBuyOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.fixed_price.single.buy.amount'));
	fixedPricePlaceSingleSellOrderPrice = Decimal(properties.getAs<Amount>('tests.integration.orders.place.fixed_price.single.sell.price'));
	fixedPricePlaceSingleSellOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.fixed_price.single.sell.amount'));

	marketPlaceSingleBuyOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.market.single.buy.amount'));
	marketPlaceSingleSellOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.market.single.sell.amount'));

	trackingPlaceSingleBuyOrderDeviation = Decimal(properties.getAs<Amount>('tests.integration.orders.place.tracking.single.buy.deviation'));
	trackingPlaceSingleBuyOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.tracking.single.buy.amount'));
	trackingPlaceSingleSellOrderDeviation = Decimal(properties.getAs<Amount>('tests.integration.orders.place.tracking.single.sell.deviation'));
	trackingPlaceSingleSellOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.tracking.single.sell.amount'));

	limitPlaceSingleBuyOrderPrice = Decimal(properties.getAs<Amount>('tests.integration.orders.place.limit.single.buy.price'));
	limitPlaceSingleBuyOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.limit.single.buy.amount'));
	limitPlaceSingleSellOrderPrice = Decimal(properties.getAs<Amount>('tests.integration.orders.place.limit.single.sell.price'));
	limitPlaceSingleSellOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.place.limit.single.sell.amount'));

	fixedPriceReplaceSingleBuyOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.replace.fixed_price.single.buy.amount'));
	fixedPriceReplaceSingleSellOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.replace.fixed_price.single.sell.amount'));

	trackingReplaceSingleBuyOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.replace.tracking.single.buy.amount'));
	trackingReplaceSingleSellOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.replace.tracking.single.sell.amount'));

	limitReplaceSingleBuyOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.replace.limit.single.buy.amount'));
	limitReplaceSingleSellOrderAmount = Decimal(properties.getAs<Amount>('tests.integration.orders.replace.limit.single.sell.amount'));

	rujira = new Rujira({
		walletMnemonic: walletMnemonic,
	});

	await rujira.initialize({});

	jest.setTimeout(testsTimeout);

	await cleanUp();
});

afterAll(async () => {
	await cleanUp();
});

const cleanUp = async () => {
};

describe("Rujira", async() => {
	describe("Fin", async () => {
		describe("status", async () => {
			it("should be up", async () => {
				const result = await rujira.fin.getStatus({});

				expect(result).toBeDefined();
				expect(result.status).toBe(SystemStatus.UP);
				expect(result.error).toBeUndefined();
			});
		});

		describe("transactions", () => {
			it("should be able to get a transaction without waiting confirmation", async () => {
				const result = await rujira.fin.getTransaction({
					hash: transactionHash,
					waitForConfirmation: false,
				});

				expect(result).toBeDefined();

				expect(result.hash).toBe(transactionHash);
				expect(result.status).toBe(TransactionStatus.SUCCESS);

				expect(result.fee).toBeDefined();

				expect(result.fee.amount).toBeDefined();
				expect(result.fee.amount.toNumber()).toBeGreaterThanOrEqual(BIG_NUMBER_0.toNumber());

				expect(result.fee.token).toBeDefined();
				expect(result.fee.token.address).toBe(rujira.fin.feePaymentToken.address);
				expect(result.fee.token.symbol).toBe(rujira.fin.feePaymentToken.symbol);
				expect(result.fee.token.name).toBe(rujira.fin.feePaymentToken.name);
				expect(result.fee.token.decimals).toBe(rujira.fin.feePaymentToken.decimals);
				expect(result.fee.token.raw).toBeDefined();

				expect(result.raw).toBeDefined();
			});

			it("should validate a confirmed transaction waiting confirmation", async () => {
				// TODO Add a new call for testing a pending transaction!!!

				const result = await rujira.fin.getTransaction({
					hash: transactionHash,
					waitForConfirmation: true,
				});

				expect(result).toBeDefined();
				expect(result.hash).toBe(transactionHash);
				expect(result.status).toBe(TransactionStatus.SUCCESS);

				expect(result.fee).toBeDefined();

				expect(result.fee.amount).toBeDefined();
				expect(result.fee.amount.toNumber()).toBeGreaterThanOrEqual(BIG_NUMBER_0.toNumber());

				expect(result.fee.token).toBeDefined();
				expect(result.fee.token.address).toBe(rujira.fin.feePaymentToken.address);
				expect(result.fee.token.symbol).toBe(rujira.fin.feePaymentToken.symbol);
				expect(result.fee.token.name).toBe(rujira.fin.feePaymentToken.name);
				expect(result.fee.token.decimals).toBe(rujira.fin.feePaymentToken.decimals);
				expect(result.fee.token.raw).toBeDefined();

				expect(result.raw).toBeDefined();
			});
		});

		describe("tokens", () => {
			it("should be able to get a token by address", async () => {
				const result = await rujira.fin.getToken({
					address: firstMarketBaseTokenAddress,
					symbol: undefined,
				});

				expect(result).toBeDefined();
				expect(result.address.toLowerCase()).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(result.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.name).toBeDefined();
				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.raw).toBeDefined();
			});

			it("should be able to get a token by symbol", async () => {
				const result = await rujira.fin.getToken({
					address: undefined,
					symbol: firstMarketBaseTokenSymbol,
				});

				expect(result).toBeDefined();
				expect(result.address.toLowerCase()).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(result.symbol.toUpperCase()).toBe(firstMarketBaseTokenSymbol.toUpperCase());
				expect(result.name).toBeDefined();
				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.raw).toBeDefined();
			});

			it("should be able to get tokens by addresses", async () => {
				const addresses = [firstMarketBaseTokenAddress, firstMarketQuoteTokenAddress];

				const result = await rujira.fin.getTokens({
					addresses: addresses,
				});

				expect(result).toBeDefined();
				expect(result.size).toBe(addresses.length);

				const baseToken = result.get(firstMarketBaseTokenSymbol);
				expect(baseToken).toBeDefined();
				expect(baseToken?.address.toLowerCase()).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(baseToken?.symbol.toUpperCase()).toBe(firstMarketBaseTokenSymbol.toUpperCase());
				expect(baseToken?.name).toBeDefined();
				expect(baseToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken?.raw).toBeDefined();

				const quoteToken = result.get(firstMarketQuoteTokenSymbol);
				expect(quoteToken).toBeDefined();
				expect(quoteToken?.address.toLowerCase()).toBe(firstMarketQuoteTokenAddress.toLowerCase());
				expect(quoteToken?.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken?.name).toBeDefined();
				expect(quoteToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken?.raw).toBeDefined();
			});

			it("should be able to get tokens by symbols", async () => {
				const symbols = [firstMarketBaseTokenSymbol, firstMarketQuoteTokenSymbol];

				const result = await rujira.fin.getTokens({ symbols });

				expect(result).toBeDefined();
				expect(result.size).toBe(symbols.length);

				const baseToken = result.get(firstMarketBaseTokenSymbol);
				const quoteToken = result.get(firstMarketQuoteTokenSymbol);

				expect(baseToken).toBeDefined();
				expect(quoteToken).toBeDefined();

				expect(baseToken?.address).toBeDefined();
				expect(baseToken?.address.length).toBeGreaterThan(0);
				expect(baseToken?.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken?.name).toBeDefined();
				expect(baseToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken?.raw).toBeDefined();

				expect(quoteToken?.address).toBeDefined();
				expect(quoteToken?.address.length).toBeGreaterThan(0);
				expect(quoteToken?.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken?.name).toBeDefined();
				expect(quoteToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken?.raw).toBeDefined();
			});

			it("should be able to get all tokens and validate base and quote tokens", async () => {
				const result = await rujira.fin.getAllTokens({});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(1);

				// Use entries() to find tokens since get has issues with dot notation
				const baseTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === firstMarketBaseTokenSymbol.toLowerCase());
				const quoteTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === firstMarketQuoteTokenSymbol.toLowerCase());
				const nativeTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === rujira.fin.nativeToken.symbol.toLowerCase());

				const baseToken = baseTokenEntry ? baseTokenEntry[1] : null;
				const quoteToken = quoteTokenEntry ? quoteTokenEntry[1] : null;
				const nativeToken = nativeTokenEntry ? nativeTokenEntry[1] : null;

				if (!baseToken) {
					throw new Error(`Base token not found: ${firstMarketBaseTokenAddress}`);
				}
				if (!quoteToken) {
					throw new Error(`Quote token not found: ${firstMarketQuoteTokenAddress}`);
				}
				if (!nativeToken) {
					throw new Error(`Native token not found: ${rujira.fin.nativeToken.address}`);
				}

				const usdTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === rujira.fin.usdToken.symbol.toLowerCase());
				const feePaymentTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === rujira.fin.feePaymentToken.symbol.toLowerCase());

				const usdToken = usdTokenEntry ? usdTokenEntry[1] : null;
				const feePaymentToken = feePaymentTokenEntry ? feePaymentTokenEntry[1] : null;

				if (!usdToken) {
					throw new Error(`USD token not found: ${rujira.fin.usdToken.address}`);
				}
				if (!feePaymentToken) {
					throw new Error(`Fee payment token not found: ${rujira.fin.feePaymentToken.address}`);
				}

				expect(baseToken).toBeDefined();
				expect(baseToken.address).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(baseToken.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken.name).toBeDefined();
				expect(baseToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken.raw).toBeDefined();

				expect(quoteToken).toBeDefined();
				expect(quoteToken.address.toLowerCase()).toBe(firstMarketQuoteTokenAddress.toLowerCase());
				expect(quoteToken.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken.name).toBeDefined();
				expect(quoteToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken.raw).toBeDefined();

				expect(nativeToken).toBeDefined();
				expect(nativeToken.address.toLowerCase()).toBe(rujira.fin.nativeToken.address.toLowerCase());
				expect(nativeToken.symbol).toBe(rujira.fin.nativeToken.symbol);
				expect(nativeToken.name).toBeDefined();
				expect(nativeToken.decimals).toBeGreaterThan(0);
				expect(nativeToken.raw).toBeDefined();

				expect(usdToken).toBeDefined();
				expect(usdToken.address.toLowerCase()).toBe(rujira.fin.usdToken.address.toLowerCase());
				expect(usdToken.symbol).toBe(rujira.fin.usdToken.symbol);
				expect(usdToken.name).toBeDefined();
				expect(usdToken.decimals).toBeGreaterThan(0);
				expect(usdToken.raw).toBeDefined();

				expect(feePaymentToken).toBeDefined();
				expect(feePaymentToken.address.toLowerCase()).toBe(rujira.fin.feePaymentToken.address.toLowerCase());
				expect(feePaymentToken.symbol).toBe(rujira.fin.feePaymentToken.symbol);
				expect(feePaymentToken.name).toBeDefined();
				expect(feePaymentToken.decimals).toBeGreaterThan(0);
				expect(feePaymentToken.raw).toBeDefined();
			});
		});

		describe("markets", () => {
			it("should be able to get a market by address", async () => {
				const result = await rujira.fin.getMarket({
					address: firstMarketAddress,
					symbol: undefined,
				});

				expect(result).toBeDefined();

				expect(result.address).toBe(firstMarketAddress);
				expect(result.symbol).toBe(firstMarketSymbol);

				expect(result.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(result.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.tokens.base.name).toBeDefined();
				expect(result.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.tokens.base.raw).toBeDefined();

				expect(result.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.tokens.quote.name).toBeDefined();
				expect(result.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.tokens.quote.raw).toBeDefined();

				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.status).toBe(MarketStatus.ACTIVE);
				expect(result.raw).toBeDefined();
			});

			it("should be able to get market by symbol", async () => {
				const result = await rujira.fin.getMarket({
					symbol: firstMarketSymbol,
					address: undefined,
				});

				expect(result).toBeDefined();
				expect(result.address).toBe(firstMarketAddress);
				expect(result.symbol).toBe(firstMarketSymbol);

				expect(result.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(result.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.tokens.base.name).toBeDefined();
				expect(result.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.tokens.base.raw).toBeDefined();

				expect(result.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.tokens.quote.name).toBeDefined();
				expect(result.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.tokens.quote.raw).toBeDefined();

				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.status).toBe(MarketStatus.ACTIVE);
				expect(result.raw).toBeDefined();

			});

			it("should be able to get markets by addresses", async () => {
				const addresses = [firstMarketAddress, secondMarketAddress];

				const result = await rujira.fin.getMarkets({ addresses });

				expect(result).toBeDefined();
				expect(result.size).toBe(addresses.length);

				const firstMarket = result.getOrThrow(firstMarketSymbol);
				expect(firstMarket).toBeDefined();
				expect(firstMarket.address).toBe(firstMarketAddress);
				expect(firstMarket.symbol).toBe(firstMarketSymbol);

				expect(firstMarket.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(firstMarket.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(firstMarket.tokens.base.name).toBeDefined();
				expect(firstMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.base.raw).toBeDefined();

				expect(firstMarket.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(firstMarket.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(firstMarket.tokens.quote.name).toBeDefined();
				expect(firstMarket.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.quote.raw).toBeDefined();

				expect(firstMarket.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.status).toBe(MarketStatus.ACTIVE);
				expect(firstMarket.raw).toBeDefined();

				const secondMarket = result.getOrThrow(secondMarketSymbol);
				expect(secondMarket).toBeDefined();
				expect(secondMarket.address).toBe(secondMarketAddress);
				expect(secondMarket.symbol).toBe(secondMarketSymbol);

				expect(secondMarket.tokens.base.address).toBe(secondMarketBaseTokenAddress);
				expect(secondMarket.tokens.base.symbol).toBe(secondMarketBaseTokenSymbol);
				expect(secondMarket.tokens.base.name).toBeDefined();
				expect(secondMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.base.raw).toBeDefined();

				expect(secondMarket.tokens.quote.address).toBe(secondMarketQuoteTokenAddress);
				expect(secondMarket.tokens.quote.symbol).toBe(secondMarketQuoteTokenSymbol);
				expect(secondMarket.tokens.quote.name).toBeDefined();
				expect(secondMarket.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.quote.raw).toBeDefined();

				expect(secondMarket.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.status).toBe(MarketStatus.ACTIVE);
				expect(secondMarket.raw).toBeDefined();
			});

			it("should be able to get markets by symbols", async () => {
				const symbols = [firstMarketSymbol, secondMarketSymbol];

				const result = await rujira.fin.getMarkets({ symbols });

				expect(result).toBeDefined();
				expect(result.size).toBe(symbols.length);

				const firstMarket = result.getOrThrow(firstMarketSymbol);
				expect(firstMarket).toBeDefined();
				expect(firstMarket.address).toBe(firstMarketAddress);
				expect(firstMarket.symbol).toBe(firstMarketSymbol);

				expect(firstMarket.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(firstMarket.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(firstMarket.tokens.base.name).toBeDefined();
				expect(firstMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.base.raw).toBeDefined();

				expect(firstMarket.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(firstMarket.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(firstMarket.tokens.quote.name).toBeDefined();
				expect(firstMarket.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.quote.raw).toBeDefined();

				expect(firstMarket.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.status).toBe(MarketStatus.ACTIVE);
				expect(firstMarket.raw).toBeDefined();

				const secondMarket = result.getOrThrow(secondMarketSymbol);
				expect(secondMarket).toBeDefined();
				expect(secondMarket.address).toBe(secondMarketAddress);
				expect(secondMarket.symbol).toBe(secondMarketSymbol);

				expect(secondMarket.tokens.base.address).toBe(secondMarketBaseTokenAddress);
				expect(secondMarket.tokens.base.symbol).toBe(secondMarketBaseTokenSymbol);
				expect(secondMarket.tokens.base.name).toBeDefined();
				expect(secondMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.base.raw).toBeDefined();

				expect(secondMarket.tokens.quote.address).toBe(secondMarketQuoteTokenAddress);
				expect(secondMarket.tokens.quote.symbol).toBe(secondMarketQuoteTokenSymbol);
				expect(secondMarket.tokens.quote.name).toBeDefined();
				expect(secondMarket.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.quote.raw).toBeDefined();

				expect(secondMarket.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.status).toBe(MarketStatus.ACTIVE);
				expect(secondMarket.raw).toBeDefined();
			});

			it("should be able to get all markets", async () => {
				const result = await rujira.fin.getAllMarkets({});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				for (const [symbol, market] of result.entries()) {
					expect(market).toBeDefined();
					expect(market.symbol).toBe(symbol);

					expect(market.tokens.base).toBeDefined();
					expect(market.tokens.base.address).toBeDefined();
					expect(market.tokens.base.symbol).toBeDefined();
					expect(market.tokens.base.name).toBeDefined();
					expect(market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(market.tokens.base.raw).toBeDefined();

					expect(market.tokens.quote).toBeDefined();
					expect(market.tokens.quote.address).toBeDefined();
					expect(market.tokens.quote.symbol).toBeDefined();
					expect(market.tokens.quote.name).toBeDefined();
					expect(market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(market.tokens.quote.raw).toBeDefined();

					expect(market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(market.status).toBe(MarketStatus.ACTIVE);
					expect(market.raw).toBeDefined();
				}

				const firstMarket = result.getOrThrow(firstMarketSymbol);
				expect(firstMarket).toBeDefined();
				expect(firstMarket.address).toBe(firstMarketAddress);
				expect(firstMarket.symbol).toBe(firstMarketSymbol);

				expect(firstMarket.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(firstMarket.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(firstMarket.tokens.base.name).toBeDefined();
				expect(firstMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.base.raw).toBeDefined();

				expect(firstMarket.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(firstMarket.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(firstMarket.tokens.quote.name).toBeDefined();
				expect(firstMarket.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.quote.raw).toBeDefined();

				expect(firstMarket.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.status).toBe(MarketStatus.ACTIVE);
				expect(firstMarket.raw).toBeDefined();

				const secondMarket = result.getOrThrow(secondMarketSymbol);
				expect(secondMarket).toBeDefined();
				expect(secondMarket.address).toBe(secondMarketAddress);
				expect(secondMarket.symbol).toBe(secondMarketSymbol);

				expect(secondMarket.tokens.base.address).toBe(secondMarketBaseTokenAddress);
				expect(secondMarket.tokens.base.symbol).toBe(secondMarketBaseTokenSymbol);
				expect(secondMarket.tokens.base.name).toBeDefined();
				expect(secondMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.base.raw).toBeDefined();

				expect(secondMarket.tokens.quote.address).toBe(secondMarketQuoteTokenAddress);
				expect(secondMarket.tokens.quote.symbol).toBe(secondMarketQuoteTokenSymbol);
				expect(secondMarket.tokens.quote.name).toBeDefined();
				expect(secondMarket.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.quote.raw).toBeDefined();

				expect(secondMarket.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.status).toBe(MarketStatus.ACTIVE);
				expect(secondMarket.raw).toBeDefined();
			});
		});

		describe("orderbook", () => {
			it("should be able to get the order book for a market", async () => {
				const maximumNumberOfOrders = 10;

				const result = await rujira.fin.getOrderBook({
					marketAddress: firstMarketAddress,
					marketSymbol: undefined,
					maximumNumberOfOrders: maximumNumberOfOrders,
				});

				expect(result).toBeDefined();

				expect(result.market).toBeDefined();
				expect(result.market.address).toBe(firstMarketAddress);
				expect(result.market.symbol).toBe(firstMarketSymbol);

				expect(result.market.tokens.base).toBeDefined();
				expect(result.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(result.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.base.raw).toBeDefined();

				expect(result.market.tokens.quote).toBeDefined();
				expect(result.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.quote.raw).toBeDefined();

				expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.status).toBe(MarketStatus.ACTIVE);
				expect(result.market.raw).toBeDefined();

				expect(result.book).toBeDefined();

				const asks = result.book.asks;
				const bids = result.book.bids;

				expect(asks.size).toBeLessThanOrEqual(maximumNumberOfOrders);
				expect(bids.size).toBeLessThanOrEqual(maximumNumberOfOrders);

				expect(asks.size).toBe(result.raw.base.length);
				expect(bids.size).toBe(result.raw.quote.length);

				if (bids.size > 0) {
					const firstBidOrder = bids.getOrThrow(0);
					expect(firstBidOrder).toBeDefined();
					expect(firstBidOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.raw).toBeDefined();

					const bestBid = get<OrderBookOrder>(
						result.book.bestBid,
						undefined,
						`Best bid order not found`
					);
					expect(bestBid).toBeDefined();
					expect(bestBid.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(bestBid.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(bestBid.raw).toBeDefined();
				} else {
					expect(result.book.bestBid).toBeUndefined();
				}

				if (asks.size > 0) {
					const firstAskOrder = asks.getOrThrow(0);
					expect(firstAskOrder).toBeDefined();
					expect(firstAskOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstAskOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstAskOrder.raw).toBeDefined();

					const bestAsk = get<OrderBookOrder>(
						result.book.bestAsk,
						undefined,
						`Best ask order not found`
					);
					expect(bestAsk).toBeDefined();
					expect(bestAsk.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(bestAsk.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(bestAsk.raw).toBeDefined();
				} else {
					expect(result.book.bestAsk).toBeUndefined();
				}

				if (asks.size > 0 && bids.size > 0) {
					const bestAsk = get<OrderBookOrder>(
						result.book.bestAsk,
						undefined,
						`Best ask order not found`
					);
					const bestBid = get<OrderBookOrder>(
						result.book.bestBid,
						undefined,
						`Best bid order not found`
					);
					const baseToQuoteMiddlePrice = get<Amount>(result.statistics.middlePrice.baseToQuote);
					expect(baseToQuoteMiddlePrice).toBeDefined();
					expect(baseToQuoteMiddlePrice.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(baseToQuoteMiddlePrice.toNumber()).toBeLessThanOrEqual(bestAsk.price.toNumber());
					expect(baseToQuoteMiddlePrice.toNumber()).toBeGreaterThanOrEqual(bestBid.price.toNumber());

					const quoteToBaseMiddlePrice = get<Amount>(result.statistics.middlePrice.quoteToBase);
					expect(quoteToBaseMiddlePrice).toBeDefined();
					expect(quoteToBaseMiddlePrice.toNumber()).toBe(DECIMAL_1.div(baseToQuoteMiddlePrice).toNumber());
				} else if (asks.size > 0 && bids.size === 0) {
					expect(result.book.bestAsk).toBeDefined();
					expect(result.book.bestBid).toBeUndefined();
					expect(result.statistics.middlePrice.baseToQuote).toBeUndefined();
					expect(result.statistics.middlePrice.quoteToBase).toBeUndefined();
				} else if (bids.size > 0 && asks.size === 0) {
					expect(result.book.bestBid).toBeDefined();
					expect(result.book.bestAsk).toBeUndefined();
					expect(result.statistics.middlePrice.baseToQuote).toBeUndefined();
					expect(result.statistics.middlePrice.quoteToBase).toBeUndefined();
				} else {
					expect(result.book.bestAsk).toBeUndefined();
					expect(result.book.bestBid).toBeUndefined();
					expect(result.statistics.middlePrice.baseToQuote).toBeUndefined();
					expect(result.statistics.middlePrice.quoteToBase).toBeUndefined();
				}
				expect(result.raw).toBeDefined();
			});
		});

		describe("ticker", () => {
			it("should be able to get a ticker by market address", async () => {
				const result = await rujira.fin.getTicker({ marketAddress: firstMarketAddress });

				expect(result).toBeDefined();
				expect(result.market).toBeDefined();
				expect(result.market.address).toBe(firstMarketAddress);
				expect(result.market.symbol).toBe(firstMarketSymbol);

				expect(result.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(result.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.market.tokens.base.name).toBeDefined();
				expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.base.raw).toBeDefined();

				expect(result.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.name).toBeDefined();
				expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.quote.raw).toBeDefined();

				expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.status).toBe(MarketStatus.ACTIVE);
				expect(result.market.raw).toBeDefined();

				expect(result.middlePrice).toBeDefined();
				expect(result.middlePrice.baseToQuote?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(result.middlePrice.quoteToBase?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				expect(result.timestamp).toBeDefined();
				expect(result.timestamp).toBeGreaterThan(0);

				expect(result.raw).toBeDefined();
			});

			it("should be able to get a ticker by market symbol", async () => {
				const result = await rujira.fin.getTicker({ marketSymbol: firstMarketSymbol });

				expect(result).toBeDefined();
				expect(result.market).toBeDefined();
				expect(result.market.address).toBe(firstMarketAddress);
				expect(result.market.symbol).toBe(firstMarketSymbol);

				expect(result.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(result.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.market.tokens.base.name).toBeDefined();
				expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.base.raw).toBeDefined();

				expect(result.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.name).toBeDefined();
				expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.quote.raw).toBeDefined();

				expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.status).toBe(MarketStatus.ACTIVE);
				expect(result.market.raw).toBeDefined();

				expect(result.middlePrice).toBeDefined();
				expect(result.middlePrice.baseToQuote?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(result.middlePrice.quoteToBase?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				expect(result.volumeWeightedAveragePrice).toBeDefined();
				expect(result.volumeWeightedAveragePrice.baseToQuote?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(result.volumeWeightedAveragePrice.quoteToBase?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				expect(result.timestamp).toBeDefined();
				expect(result.timestamp).toBeGreaterThan(0);

				expect(result.raw).toBeDefined();
			});
		});

		describe("candles", () => {
			it("should be able to get candles by market address", async () => {
				const result = await rujira.fin.getCandles({ marketAddress: firstMarketAddress });

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				result.forEach((candle: Candle) => {
					expect(candle).toBeDefined();
					expect(candle.timestamp).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(candle.open.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.high.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.low.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.close.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.volume.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.raw).toBeDefined();
				});
			});

			it("should be able to get candles by market symbol", async () => {
				const result = await rujira.fin.getCandles({ marketSymbol: firstMarketSymbol });

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				result.forEach((candle: Candle) => {
					expect(candle).toBeDefined();
					expect(candle.timestamp).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(candle.open.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.high.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.low.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.close.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(candle.volume.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.raw).toBeDefined();
				});
			});

			it("should be able to get candles with specific interval", async () => {

				const result = await rujira.fin.getCandles({
					marketSymbol: firstMarketSymbol,
					interval: CandleInterval.ONE_MINUTE
				});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThanOrEqual(0);

				result.forEach((candle: Candle) => {
					expect(candle).toBeDefined();
					expect(candle.timestamp).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(candle.open.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.high.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.low.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.close.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.volume.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.raw).toBeDefined();
				});
			});

			it("should verify that candles are exactly 1 minute apart", async () => {


				const result = await rujira.fin.getCandles({
					marketSymbol: firstMarketSymbol,
					interval: CandleInterval.ONE_MINUTE,
					maximumNumberOfCandles: 2
				});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThanOrEqual(2);

				const firstCandle = result.getOrThrow(0);
				const secondCandle = result.getOrThrow(1);

				expect(firstCandle).toBeDefined();
				expect(secondCandle).toBeDefined();

				const firstTimestamp = new Date(firstCandle!.timestamp);
				const secondTimestamp = new Date(secondCandle!.timestamp);

				const timeDifferenceMs = Math.abs(secondTimestamp.getTime() - firstTimestamp.getTime());
				const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

				console.log(`First candle timestamp: ${firstTimestamp.toISOString()}`);
				console.log(`Second candle timestamp: ${secondTimestamp.toISOString()}`);
				console.log(`Time difference: ${timeDifferenceMinutes.toFixed(2)} minutes`);

				expect(timeDifferenceMinutes).toBeCloseTo(1, 1);

				expect(firstCandle.open.toNumber()).toBeGreaterThan(0);
				expect(firstCandle.high.toNumber()).toBeGreaterThan(0);
				expect(firstCandle.low.toNumber()).toBeGreaterThan(0);
				expect(firstCandle.close.toNumber()).toBeGreaterThan(0);
				expect(firstCandle.volume.toNumber()).toBeGreaterThanOrEqual(0);

				expect(secondCandle.open.toNumber()).toBeGreaterThan(0);
				expect(secondCandle.high.toNumber()).toBeGreaterThan(0);
				expect(secondCandle.low.toNumber()).toBeGreaterThan(0);
				expect(secondCandle.close.toNumber()).toBeGreaterThan(0);
				expect(secondCandle.volume.toNumber()).toBeGreaterThanOrEqual(0);
			});


		});

		describe("indicators", () => {

			it("should be able to get indicators", async () => {

				const result = await rujira.fin.getIndicators({ marketAddress: firstMarketAddress });
				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				for (const [indicatorId, indicatorData] of result.entries()) {
					expect(indicatorId).toBeDefined();

					expect(indicatorData).toBeDefined();
					expect(indicatorData.indicator).toBeDefined();
					expect(indicatorData.indicator.id).toBe(indicatorId);
					expect(indicatorData.indicator.name).toBeDefined();
					expect(indicatorData.indicator.parameters).toBeDefined();
					expect(Array.isArray(indicatorData.indicator.parameters)).toBe(true);

					expect(indicatorData.value).toBeDefined();
				}
			});

			it("should verify that a indicator has the same quantity as maximumNumberOfCandles", async () => {

				const maximumNumberOfCandles = 100;
				const specificIndicator = Indicator.bollinger_bands.id;

				const result = await rujira.fin.getIndicators({
					marketAddress: firstMarketAddress,
					indicatorsIds: [specificIndicator],
					maximumNumberOfCandles: maximumNumberOfCandles
				});

				expect(result).toBeDefined();
				expect(result.size).toBe(1);

				const indicatorData = result.getOrThrow(specificIndicator);
				expect(indicatorData).toBeDefined();
				expect(indicatorData.indicator.id).toBe(specificIndicator);
				expect(indicatorData.indicator.name).toBeDefined();
				expect(indicatorData.value).toBeDefined();
				expect(indicatorData.value.length).toBeLessThanOrEqual(maximumNumberOfCandles);
			});

			it("should be able to get indicators by market address", async () => {

				const result = await rujira.fin.getIndicators({
					marketAddress: firstMarketAddress,
				});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				for (const [indicatorId, indicatorData] of result.entries()) {
					expect(indicatorId).toBeDefined();

					expect(indicatorData).toBeDefined();
					expect(indicatorData.indicator).toBeDefined();
					expect(indicatorData.indicator.id).toBe(indicatorId);
					expect(indicatorData.indicator.name).toBeDefined();
					expect(indicatorData.indicator.parameters).toBeDefined();
					expect(Array.isArray(indicatorData.indicator.parameters)).toBe(true);

					expect(indicatorData.value).toBeDefined();
				}
			});

			it("should be able to get all indicators by market address", async () => {
				const result = await rujira.fin.getIndicators({
					marketAddress: firstMarketAddress,
				});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				for (const [indicatorId, indicatorData] of result.entries()) {
					expect(indicatorId).toBeDefined();

					expect(indicatorData).toBeDefined();
					expect(indicatorData.indicator).toBeDefined();
					expect(indicatorData.indicator.id).toBe(indicatorId);
					expect(indicatorData.indicator.name).toBeDefined();
					expect(indicatorData.indicator.parameters).toBeDefined();
					expect(Array.isArray(indicatorData.indicator.parameters)).toBe(true);

					expect(indicatorData.value).toBeDefined();
				}
			});

			it("should be able to get all indicators by market symbol", async () => {

				const result = await rujira.fin.getIndicators({
					marketSymbol: firstMarketSymbol,
				});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				for (const [indicatorId, indicatorData] of result.entries()) {
					expect(indicatorId).toBeDefined();

					expect(indicatorData).toBeDefined();
					expect(indicatorData.indicator).toBeDefined();
					expect(indicatorData.indicator.id).toBe(indicatorId);
					expect(indicatorData.indicator.name).toBeDefined();
					expect(indicatorData.indicator.parameters).toBeDefined();
					expect(Array.isArray(indicatorData.indicator.parameters)).toBe(true);

					expect(indicatorData.value).toBeDefined();
				}
			});

			it("should be able to get specific indicators by market address", async () => {

				const indicatorsIds = [Indicator.bollinger_bands.id];

				const result = await rujira.fin.getIndicators({
					marketAddress: firstMarketAddress,
					indicatorsIds: indicatorsIds
				});

				expect(result).toBeDefined();
				expect(result.size).toBe(indicatorsIds.length);

				for (const [indicatorId, indicatorData] of result.entries()) {
					expect(indicatorId).toBeDefined();

					expect(indicatorData).toBeDefined();
					expect(indicatorData.indicator.id).toBe(indicatorId);
					expect(indicatorData.indicator.name).toBeDefined();
					expect(indicatorData.indicator.parameters).toBeDefined();
					expect(Array.isArray(indicatorData.indicator.parameters)).toBe(true);
					expect(indicatorData.value).toBeDefined();
				}
			});

			it("should be able to get specific indicators by market symbol", async () => {

				const indicatorsIds = [Indicator.bollinger_bands.id];

				const result = await rujira.fin.getIndicators({
					marketSymbol: firstMarketSymbol,
					indicatorsIds: indicatorsIds
				});

				expect(result).toBeDefined();
				expect(result.size).toBe(indicatorsIds.length);

				for (const indicatorId of indicatorsIds) {
					const indicatorData = result.get(indicatorId);
					expect(indicatorData).toBeDefined();
					expect(indicatorData?.indicator.id).toBe(indicatorId);
					expect(indicatorData?.indicator.name).toBeDefined();
					expect(indicatorData?.value).toBeDefined();
				}

				for (const [indicatorId] of result.entries()) {
					expect(indicatorsIds).toContain(indicatorId);
				}
			});

		});

		describe("balances", () => {
			it("should be able to get balances for a wallet", async () => {
				const result = await rujira.fin.getBalances({ walletAddress: walletPublicKeyThor });

				expect(result).toBeDefined();
				expect(result.tokens).toBeDefined();
				expect(result.total).toBeDefined();

				expect(result.tokens.size).toBeGreaterThan(0);

				let accumulatedNativeFree = DECIMAL_0;
				let accumulatedNativeLockedInOrders = DECIMAL_0;
				let accumulatedNativeLockedInPools = DECIMAL_0;
				let accumulatedNativeWithdrawable = DECIMAL_0;
				let accumulatedNativeTotal = DECIMAL_0;

				let accumulatedUSDFree = DECIMAL_0;
				let accumulatedUSDLockedInOrders = DECIMAL_0;
				let accumulatedUSDLockedInPools = DECIMAL_0;
				let accumulatedUSDWithdrawable = DECIMAL_0;
				let accumulatedUSDTotal = DECIMAL_0;

				for (const [tokenSymbol, tokenBalance] of result.tokens.entries()) {
					expect(tokenBalance).toBeDefined();
					expect(tokenBalance.token).toBeDefined();
					expect(tokenBalance.token.symbol).toBe(tokenSymbol);
					expect(tokenBalance.token.symbol).toBeDefined();
					expect(tokenBalance.token.name).toBeDefined();
					expect(tokenBalance.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(tokenBalance.token.raw).toBeDefined();

					expect(tokenBalance.balances).toBeDefined();
					expect(tokenBalance.balances.token).toBeDefined();
					expect(tokenBalance.balances.nativeToken).toBeDefined();
					expect(tokenBalance.balances.usdToken).toBeDefined();

					const tokenBalanceData = tokenBalance.balances.token;
					expect(tokenBalanceData.free).toBeDefined();
					expect(tokenBalanceData.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(tokenBalanceData.lockedInOrders).toBeDefined();
					expect(tokenBalanceData.lockedInOrders.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(tokenBalanceData.lockedInPools).toBeDefined();
					expect(tokenBalanceData.lockedInPools.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(tokenBalanceData.withdrawable).toBeDefined();
					expect(tokenBalanceData.withdrawable.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(tokenBalanceData.total).toBeDefined();
					expect(tokenBalanceData.total.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

					const nativeTokenBalance = tokenBalance.balances.nativeToken;
					expect(nativeTokenBalance.free).toBeDefined();
					expect(nativeTokenBalance.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(nativeTokenBalance.lockedInOrders).toBeDefined();
					expect(nativeTokenBalance.lockedInOrders.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(nativeTokenBalance.lockedInPools).toBeDefined();
					expect(nativeTokenBalance.lockedInPools.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(nativeTokenBalance.withdrawable).toBeDefined();
					expect(nativeTokenBalance.withdrawable.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(nativeTokenBalance.total).toBeDefined();
					expect(nativeTokenBalance.total.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(nativeTokenBalance.quotation).toBeDefined();
					expect(nativeTokenBalance.quotation.token).toBeDefined();
					expect(nativeTokenBalance.quotation.token.address).toBeDefined();
					expect(nativeTokenBalance.quotation.token.symbol).toBeDefined();
					expect(nativeTokenBalance.quotation.token.name).toBeDefined();
					expect(nativeTokenBalance.quotation.token.decimals).toBeGreaterThan(0);
					expect(nativeTokenBalance.quotation.token.raw).toBeDefined();
					expect(nativeTokenBalance.quotation.tokenToQuote).toBeDefined();
					expect(nativeTokenBalance.quotation.tokenToQuote.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(nativeTokenBalance.quotation.quoteToToken).toBeDefined();
					expect(nativeTokenBalance.quotation.quoteToToken.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

					const usdTokenBalance = tokenBalance.balances.usdToken;
					expect(usdTokenBalance.free).toBeDefined();
					expect(usdTokenBalance.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(usdTokenBalance.lockedInOrders).toBeDefined();
					expect(usdTokenBalance.lockedInOrders.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(usdTokenBalance.lockedInPools).toBeDefined();
					expect(usdTokenBalance.lockedInPools.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(usdTokenBalance.withdrawable).toBeDefined();
					expect(usdTokenBalance.withdrawable.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(usdTokenBalance.total).toBeDefined();
					expect(usdTokenBalance.total.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(usdTokenBalance.quotation).toBeDefined();
					expect(usdTokenBalance.quotation.token).toBeDefined();
					expect(usdTokenBalance.quotation.token.address).toBeDefined();
					expect(usdTokenBalance.quotation.token.symbol).toBeDefined();
					expect(usdTokenBalance.quotation.token.name).toBeDefined();
					expect(usdTokenBalance.quotation.token.decimals).toBeGreaterThan(0);
					expect(usdTokenBalance.quotation.token.raw).toBeDefined();
					expect(usdTokenBalance.quotation.tokenToQuote).toBeDefined();
					expect(usdTokenBalance.quotation.tokenToQuote.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(usdTokenBalance.quotation.quoteToToken).toBeDefined();
					expect(usdTokenBalance.quotation.quoteToToken.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

					accumulatedNativeFree = accumulatedNativeFree.plus(nativeTokenBalance.free);
					accumulatedNativeLockedInOrders = accumulatedNativeLockedInOrders.plus(nativeTokenBalance.lockedInOrders);
					accumulatedNativeLockedInPools = accumulatedNativeLockedInPools.plus(nativeTokenBalance.lockedInPools);
					accumulatedNativeWithdrawable = accumulatedNativeWithdrawable.plus(nativeTokenBalance.withdrawable);
					accumulatedNativeTotal = accumulatedNativeTotal.plus(nativeTokenBalance.total);

					accumulatedUSDFree = accumulatedUSDFree.plus(usdTokenBalance.free);
					accumulatedUSDLockedInOrders = accumulatedUSDLockedInOrders.plus(usdTokenBalance.lockedInOrders);
					accumulatedUSDLockedInPools = accumulatedUSDLockedInPools.plus(usdTokenBalance.lockedInPools);
					accumulatedUSDWithdrawable = accumulatedUSDWithdrawable.plus(usdTokenBalance.withdrawable);
					accumulatedUSDTotal = accumulatedUSDTotal.plus(usdTokenBalance.total);
				}

				if (result.tokens.has(firstMarketBaseTokenSymbol)) {
					const marketBaseTokenBalance = result.tokens.getOrThrow(firstMarketBaseTokenSymbol);
					expect(marketBaseTokenBalance).toBeDefined();
					expect(marketBaseTokenBalance.token.address).toBe(firstMarketBaseTokenAddress);
					expect(marketBaseTokenBalance.token.symbol).toBe(firstMarketBaseTokenSymbol);
				}

				if (result.tokens.has(firstMarketQuoteTokenSymbol)) {
					const marketQuoteTokenBalance = result.tokens.getOrThrow(firstMarketQuoteTokenSymbol);
					expect(marketQuoteTokenBalance).toBeDefined();
					expect(marketQuoteTokenBalance.token.address).toBe(firstMarketQuoteTokenAddress);
					expect(marketQuoteTokenBalance.token.symbol).toBe(firstMarketQuoteTokenSymbol);
				}

				if (result.tokens.has(rujira.fin.nativeToken.symbol)) {
					const nativeTokenBalance = result.tokens.getOrThrow(rujira.fin.nativeToken.symbol);
					expect(nativeTokenBalance.token.address).toBe(rujira.fin.nativeToken.address);
					expect(nativeTokenBalance.token.symbol).toBe(rujira.fin.nativeToken.symbol);
				}

				if (result.tokens.has(rujira.fin.usdToken.symbol)) {
					const usdTokenBalance = result.tokens.getOrThrow(rujira.fin.usdToken.symbol);
					expect(usdTokenBalance.token.address).toBe(rujira.fin.usdToken.address);
					expect(usdTokenBalance.token.symbol).toBe(rujira.fin.usdToken.symbol);
				}

				if (result.tokens.has(rujira.fin.feePaymentToken.symbol)) {
					const feePaymentTokenBalance = result.tokens.getOrThrow(rujira.fin.feePaymentToken.symbol);
					expect(feePaymentTokenBalance.token.address).toBe(rujira.fin.feePaymentToken.address);
					expect(feePaymentTokenBalance.token.symbol).toBe(rujira.fin.feePaymentToken.symbol);
				}

				expect(result.total.nativeToken).toBeDefined();
				expect(result.total.usdToken).toBeDefined();

				const totalNativeToken = result.total.nativeToken;
				expect(totalNativeToken.free).toBeDefined();
				expect(totalNativeToken.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalNativeToken.lockedInOrders).toBeDefined();
				expect(totalNativeToken.lockedInOrders.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalNativeToken.lockedInPools).toBeDefined();
				expect(totalNativeToken.lockedInPools.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalNativeToken.withdrawable).toBeDefined();
				expect(totalNativeToken.withdrawable.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalNativeToken.total).toBeDefined();
				expect(totalNativeToken.total.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				const totalUSDToken = result.total.usdToken;
				expect(totalUSDToken.free).toBeDefined();
				expect(totalUSDToken.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalUSDToken.lockedInOrders).toBeDefined();
				expect(totalUSDToken.lockedInOrders.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalUSDToken.lockedInPools).toBeDefined();
				expect(totalUSDToken.lockedInPools.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalUSDToken.withdrawable).toBeDefined();
				expect(totalUSDToken.withdrawable.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalUSDToken.total).toBeDefined();
				expect(totalUSDToken.total.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				expect(accumulatedNativeFree.toNumber()).toBe(totalNativeToken.free.toNumber());
				expect(accumulatedNativeLockedInOrders.toNumber()).toBe(totalNativeToken.lockedInOrders.toNumber());
				expect(accumulatedNativeLockedInPools.toNumber()).toBe(totalNativeToken.lockedInPools.toNumber());
				expect(accumulatedNativeWithdrawable.toNumber()).toBe(totalNativeToken.withdrawable.toNumber());
				expect(accumulatedNativeTotal.toNumber()).toBe(totalNativeToken.total.toNumber());

				expect(accumulatedUSDFree.toNumber()).toBe(totalUSDToken.free.toNumber());
				expect(accumulatedUSDLockedInOrders.toNumber()).toBe(totalUSDToken.lockedInOrders.toNumber());
				expect(accumulatedUSDLockedInPools.toNumber()).toBe(totalUSDToken.lockedInPools.toNumber());
				expect(accumulatedUSDWithdrawable.toNumber()).toBe(totalUSDToken.withdrawable.toNumber());
				expect(accumulatedUSDTotal.toNumber()).toBe(totalUSDToken.total.toNumber());
			});
		});

		describe("orders", async () => {
			const cleanOrders = async () => {
				const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });
				await rujira.fin.cancelAllOrders({ ownerAddress: walletPublicKeyThor, market });
				await rujira.fin.withdrawAllFilledOrders({ ownerAddress: walletPublicKeyThor, market });
			};

			beforeAll(async () => {
				await cleanOrders();
			});

			afterAll(async () => {
				await cleanOrders();
			});

			describe("get", async () => {
				it("get a fixed price buy order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					// place
					const placed = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.BUY,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleBuyOrderAmount,
						price: fixedPricePlaceSingleBuyOrderPrice,
					});
					expect(placed).toBeDefined();
					expect(placed.order).toBeDefined();

					const found = await rujira.fin.getOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						orderType: OrderType.FIXED_PRICE,
						orderSide: OrderSide.BUY,
						orderPrice: fixedPricePlaceSingleBuyOrderPrice,
					});
					expect(found).toBeDefined();
					expect(found.market).toBeDefined();
					expect(found.market.address).toBe(firstMarketAddress);
					expect(found.market.symbol).toBe(firstMarketSymbol);
					expect(found.market.tokens.base).toBeDefined();
					expect(found.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
					expect(found.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
					expect(found.market.tokens.base.name).toBeDefined();
					expect(found.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(found.market.tokens.base.raw).toBeDefined();
					expect(found.market.tokens.quote).toBeDefined();
					expect(found.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
					expect(found.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
					expect(found.market.tokens.quote.name).toBeDefined();
					expect(found.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(found.market.tokens.quote.raw).toBeDefined();
					expect(found.side).toBe(OrderSide.BUY);
					expect(found.type).toBe(OrderType.FIXED_PRICE);
					expect(found.price?.toFixed()).toBe(fixedPricePlaceSingleBuyOrderPrice.toFixed());
					expect(found.amount.toFixed()).toBe(fixedPricePlaceSingleBuyOrderAmount.toFixed());

					// cleanup
					await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: placed.order });
				});

				it("get a fixed price sell order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					// place
					const placed = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.SELL,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleSellOrderAmount,
						price: fixedPricePlaceSingleSellOrderPrice,
					});
					expect(placed).toBeDefined();
					expect(placed.order).toBeDefined();

					const found = await rujira.fin.getOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						orderType: OrderType.FIXED_PRICE,
						orderSide: OrderSide.SELL,
						orderPrice: fixedPricePlaceSingleSellOrderPrice,
					});
					expect(found).toBeDefined();
					expect(found.market).toBeDefined();
					expect(found.market.address).toBe(firstMarketAddress);
					expect(found.market.symbol).toBe(firstMarketSymbol);
					expect(found.market.tokens.base).toBeDefined();
					expect(found.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
					expect(found.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
					expect(found.market.tokens.base.name).toBeDefined();
					expect(found.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(found.market.tokens.base.raw).toBeDefined();
					expect(found.market.tokens.quote).toBeDefined();
					expect(found.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
					expect(found.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
					expect(found.market.tokens.quote.name).toBeDefined();
					expect(found.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(found.market.tokens.quote.raw).toBeDefined();
					expect(found.side).toBe(OrderSide.SELL);
					expect(found.type).toBe(OrderType.FIXED_PRICE);
					expect(found.price?.toFixed()).toBe(fixedPricePlaceSingleSellOrderPrice.toFixed());
					expect(found.amount.toFixed()).toBe(fixedPricePlaceSingleSellOrderAmount.toFixed());

					// cleanup
					await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: placed.order });
				});

				it("get multiple orders by type/side/status filters", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					await rujira.fin.placeOrders({
						ownerAddress: walletPublicKeyThor,
						orders: [
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.BUY, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleBuyOrderAmount, price: fixedPricePlaceSingleBuyOrderPrice },
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.SELL, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleSellOrderAmount, price: fixedPricePlaceSingleSellOrderPrice },
						],
					});

					const many = await rujira.fin.getOrders({
						ownerAddress: walletPublicKeyThor,
						market,
						orderTypes: [OrderType.FIXED_PRICE],
						orderSides: [OrderSide.BUY, OrderSide.SELL],
					});
					expect(many).toBeDefined();
					expect(many.size).toBeGreaterThan(1);

					// cleanup
					await rujira.fin.cancelAllOrders({ ownerAddress: walletPublicKeyThor, market });
				});
			});

			describe("place", async () => {
				it("create a fixed price buy order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const result = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.BUY,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleBuyOrderAmount,
						price: fixedPricePlaceSingleBuyOrderPrice
					});

					expect(result).toBeDefined();
					expect(result.order).toBeDefined();
					expect(result.transaction).toBeDefined();

					// cleanup
					await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: result.order });
				});

				it("create a fixed price sell order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const result = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.SELL,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleSellOrderAmount,
						price: fixedPricePlaceSingleSellOrderPrice
					});

					expect(result).toBeDefined();
					expect(result.order).toBeDefined();
					expect(result.transaction).toBeDefined();

					// cleanup
					await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: result.order });
				});

				it("create multiple fixed price orders at the same time", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const result = await rujira.fin.placeOrders({
						ownerAddress: walletPublicKeyThor,
						orders: [
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.BUY, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleBuyOrderAmount, price: fixedPricePlaceSingleBuyOrderPrice },
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.SELL, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleSellOrderAmount, price: fixedPricePlaceSingleSellOrderPrice },
						],
					});

					expect(result).toBeDefined();
					expect(result.orders.size).toBe(2);
					expect(result.transactions.size).toBeGreaterThan(0);

					// cleanup
					await rujira.fin.cancelAllOrders({ ownerAddress: walletPublicKeyThor, market });
				});
			});

			describe("replace", async () => {
				it("replace a fixed price buy order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const original = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.BUY,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleBuyOrderAmount,
						price: fixedPricePlaceSingleBuyOrderPrice
					});

					expect(original.order).toBeDefined();

					const replaced = await rujira.fin.replaceOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.BUY,
						type: OrderType.FIXED_PRICE,
						amount: fixedPriceReplaceSingleBuyOrderAmount,
						price: fixedPricePlaceSingleBuyOrderPrice
					});

					expect(replaced.order).toBeDefined();

					// cleanup
					await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: replaced.order });
				});

				it("replace a fixed price sell order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const original = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.SELL,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleSellOrderAmount,
						price: fixedPricePlaceSingleSellOrderPrice
					});

					expect(original.order).toBeDefined();

					const replaced = await rujira.fin.replaceOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.SELL,
						type: OrderType.FIXED_PRICE,
						amount: fixedPriceReplaceSingleSellOrderAmount,
						price: fixedPricePlaceSingleSellOrderPrice
					});

					expect(replaced.order).toBeDefined();

					// cleanup
					await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: replaced.order });
				});

				it("replace multiple fixed price orders at the same time", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					await rujira.fin.placeOrders({
						ownerAddress: walletPublicKeyThor,
						orders: [
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.BUY, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleBuyOrderAmount, price: fixedPricePlaceSingleBuyOrderPrice },
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.SELL, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleSellOrderAmount, price: fixedPricePlaceSingleSellOrderPrice },
						],
					});

					const result = await rujira.fin.replaceOrders({
						ownerAddress: walletPublicKeyThor,
						orders: [
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.BUY, type: OrderType.FIXED_PRICE, amount: fixedPriceReplaceSingleBuyOrderAmount, price: fixedPricePlaceSingleBuyOrderPrice },
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.SELL, type: OrderType.FIXED_PRICE, amount: fixedPriceReplaceSingleSellOrderAmount, price: fixedPricePlaceSingleSellOrderPrice },
						],
					});

					expect(result).toBeDefined();
					expect(result.orders.size).toBe(2);

					// cleanup
					await rujira.fin.cancelAllOrders({ ownerAddress: walletPublicKeyThor, market });
				});
			});

			describe("cancel", async () => {
				it("cancel a fixed price buy order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const placed = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.BUY,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleBuyOrderAmount,
						price: fixedPricePlaceSingleBuyOrderPrice
					});

					expect(placed.order).toBeDefined();

					const cancelled = await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: placed.order });

					expect(cancelled.order).toBeDefined();
				});

				it("cancel a fixed price sell order", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const placed = await rujira.fin.placeOrder({
						ownerAddress: walletPublicKeyThor,
						market,
						side: OrderSide.SELL,
						type: OrderType.FIXED_PRICE,
						amount: fixedPricePlaceSingleSellOrderAmount,
						price: fixedPricePlaceSingleSellOrderPrice
					});

					expect(placed.order).toBeDefined();

					const cancelled = await rujira.fin.cancelOrder({ ownerAddress: walletPublicKeyThor, market, order: placed.order });

					expect(cancelled.order).toBeDefined();
				});

				it("cancel multiple fixed price orders", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const placed = await rujira.fin.placeOrders({
						ownerAddress: walletPublicKeyThor,
						orders: [
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.BUY, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleBuyOrderAmount, price: fixedPricePlaceSingleBuyOrderPrice },
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.SELL, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleSellOrderAmount, price: fixedPricePlaceSingleSellOrderPrice },
						],
					});

					const ordersToCancel = placed.orders.valueSeq().toList();
					const cancelled = await rujira.fin.cancelOrders({ ownerAddress: walletPublicKeyThor, market, orders: ordersToCancel });

					expect(cancelled.orders.size).toBe(2);
				});

				it("cancel all orders", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					// place a few
					await rujira.fin.placeOrders({
						ownerAddress: walletPublicKeyThor,
						orders: [
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.BUY, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleBuyOrderAmount, price: fixedPricePlaceSingleBuyOrderPrice },
							{ ownerAddress: walletPublicKeyThor, market, side: OrderSide.SELL, type: OrderType.FIXED_PRICE, amount: fixedPricePlaceSingleSellOrderAmount, price: fixedPricePlaceSingleSellOrderPrice },
						],
					});

					const result = await rujira.fin.cancelAllOrders({ ownerAddress: walletPublicKeyThor, market });

					expect(result).toBeDefined();
				});
			});

			describe("withdraw", async () => {
				it("withdraw all filled orders from the market", async () => {
					const market = await rujira.fin.getMarket({ address: firstMarketAddress, symbol: firstMarketSymbol });

					const result = await rujira.fin.withdrawAllFilledOrders({ ownerAddress: walletPublicKeyThor, market });

					expect(result).toBeDefined();
					expect(result.transactions.size).toBeGreaterThanOrEqual(0);
				});
			});
		});
	});
});
