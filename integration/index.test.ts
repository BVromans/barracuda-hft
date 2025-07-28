import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import "dotenv/config";
import { properties } from "../src/properties";
import { Rujira } from "../src/rujira";
import {
	Amount,
	BIG_NUMBER_0,
	Candle,
	DECIMAL_0,
	List,
	Market,
	MarketAddress,
	MarketStatus,
	Order,
	OrderBookOrder,
	OrderId,
	OrderSide,
	OrderStatus,
	OrderType,
	SystemStatus,
	Token,
	TokenBalance,
	Transaction,
	TransactionStatus,
	Wallet
} from "../src/types";
import { getNotNullOrThrowError } from "../src/utils";

let rujira: Rujira;

let feePaymentTokenConstant: Token;
let nativeTokenConstant: Token;
let beaconTokenConstant: Token;
let walletPrivateKey: string;
let walletMnemonic: string;
let wallet: Wallet;
let transactionHash: string;
let firstMarketSymbol: string;
let firstMarketAddress: string;
let firstMarketBaseTokenAddress: string;
let firstMarketQuoteTokenAddress: string;
let firstMarketBaseTokenSymbol: string;
let firstMarketQuoteTokenSymbol: string;
let firstMarketBaseTokenAmount: string;
let firstMarketQuoteTokenAmount: string;
let secondMarketSymbol: string;
let secondMarketAddress: string;
let secondMarketBaseTokenAddress: string;
let secondMarketQuoteTokenAddress: string;
let secondMarketBaseTokenSymbol: string;
let secondMarketQuoteTokenSymbol: string;
let secondMarketBaseTokenAmount: string;
let ownerAddress: string;
let testOrderIds: OrderId[];

beforeAll(async () => {
	const requiredEnvironmentVariables = [
		'WALLET_PRIVATE_KEY',
		'WALLET_MNEMONIC',
		'TRANSACTION_HASH',
		'FIRST_MARKET_SYMBOL',
		'FIRST_MARKET_ADDRESS',
		'FIRST_MARKET_BASE_TOKEN_ADDRESS',
		'FIRST_MARKET_QUOTE_TOKEN_ADDRESS',
		'FIRST_MARKET_BASE_TOKEN_SYMBOL',
		'FIRST_MARKET_QUOTE_TOKEN_SYMBOL',
		'FIRST_MARKET_BASE_TOKEN_AMOUNT',
		'FIRST_MARKET_QUOTE_TOKEN_AMOUNT',
		'SECOND_MARKET_SYMBOL',
		'SECOND_MARKET_ADDRESS',
		'SECOND_MARKET_BASE_TOKEN_ADDRESS',
		'SECOND_MARKET_QUOTE_TOKEN_ADDRESS',
		'SECOND_MARKET_BASE_TOKEN_SYMBOL',
		'SECOND_MARKET_QUOTE_TOKEN_SYMBOL',
		'SECOND_MARKET_BASE_TOKEN_AMOUNT',
    'OWNER_ADDRESS',
    'PRICE_FIXED',
    'TEST_ORDER_IDS'
	];

	const missingEnvironmentVariables = requiredEnvironmentVariables.filter(varName => !process.env[varName]);

	if (missingEnvironmentVariables.length > 0) {
		throw new Error(`Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`);
	}

	feePaymentTokenConstant = properties.getAs<Token>('rujira.tokens.feePayment');
		nativeTokenConstant = properties.getAs<Token>('rujira.tokens.native');
		beaconTokenConstant = properties.getAs<Token>('rujira.tokens.beacon');
		walletPrivateKey = process.env.WALLET_PRIVATE_KEY!;
		walletMnemonic = process.env.WALLET_MNEMONIC!;
		transactionHash = process.env.TRANSACTION_HASH!;
		firstMarketSymbol = process.env.FIRST_MARKET_SYMBOL!;
		firstMarketAddress = process.env.FIRST_MARKET_ADDRESS!;
		firstMarketBaseTokenAddress = process.env.FIRST_MARKET_BASE_TOKEN_ADDRESS!;
		firstMarketQuoteTokenAddress = process.env.FIRST_MARKET_QUOTE_TOKEN_ADDRESS!;
		firstMarketBaseTokenSymbol = process.env.FIRST_MARKET_BASE_TOKEN_SYMBOL!;
		firstMarketQuoteTokenSymbol = process.env.FIRST_MARKET_QUOTE_TOKEN_SYMBOL!;
		firstMarketBaseTokenAmount = process.env.FIRST_MARKET_BASE_TOKEN_AMOUNT!;
		firstMarketQuoteTokenAmount = process.env.FIRST_MARKET_QUOTE_TOKEN_AMOUNT!;
		secondMarketSymbol = process.env.SECOND_MARKET_SYMBOL!;
		secondMarketAddress = process.env.SECOND_MARKET_ADDRESS!;
		secondMarketBaseTokenAddress = process.env.SECOND_MARKET_BASE_TOKEN_ADDRESS!;
		secondMarketQuoteTokenAddress = process.env.SECOND_MARKET_QUOTE_TOKEN_ADDRESS!;
		secondMarketBaseTokenSymbol = process.env.SECOND_MARKET_BASE_TOKEN_SYMBOL!;
		secondMarketQuoteTokenSymbol = process.env.SECOND_MARKET_QUOTE_TOKEN_SYMBOL!;
		secondMarketBaseTokenAmount = process.env.SECOND_MARKET_BASE_TOKEN_AMOUNT!;
		ownerAddress = process.env.OWNER_ADDRESS!;
		testOrderIds = process.env.TEST_ORDER_IDS!.split(',');
	rujira = new Rujira({
		walletPrivateKey: walletPrivateKey,
		walletMnemonic: walletMnemonic,
	});

	await rujira.initialize({});

	wallet = rujira.wallet;

	jest.setTimeout(properties.getAs<number>('tests.integration.timeout'));

	await cleanUp();
});

afterAll(async () => {
	await cleanUp();
});

const cleanUp = async () => {
};

describe("Rujira", () => {
	describe("Fin", () => {
		describe("status", () => {
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
				expect(result.fee.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.fee.token).toBeDefined();
				expect(result.fee.token.address).toBe(feePaymentTokenConstant.address);
				expect(result.fee.token.symbol).toBe(feePaymentTokenConstant.symbol);
				expect(result.fee.token.name).toBe(feePaymentTokenConstant.name);
				expect(result.fee.token.decimals).toBe(feePaymentTokenConstant.decimals);
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
				expect(result.fee.amount.constructor.name).toBe("Decimal");
				expect(result.fee.amount.toNumber()).toBeGreaterThan(0);

				expect(result.fee.token).toBeDefined();
				expect(result.fee.token.address).toBe(feePaymentTokenConstant.address);
				expect(result.fee.token.symbol).toBe(feePaymentTokenConstant.symbol);
				expect(result.fee.token.name).toBe(feePaymentTokenConstant.name);
				expect(result.fee.token.decimals).toBe(feePaymentTokenConstant.decimals);
				expect(result.fee.token.raw).toBeDefined();

				expect(result.raw).toBeDefined();
				expect(result.raw.hash).toBe(transactionHash);
			});
		});

		describe("tokens", () => {
			it("should be able to get a token by address", async () => {
				const result = await rujira.fin.getToken({
					address: firstMarketBaseTokenAddress,
				});

				// noinspection DuplicatedCode
				expect(result).toBeDefined();
				expect(result.address).toBe(firstMarketBaseTokenAddress);
				expect(result.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.name).toBe(firstMarketBaseTokenSymbol);
				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.raw).toBeDefined();
			});

			it("should be able to get a token by symbol", async () => {
				const result = await rujira.fin.getToken({
					symbol: firstMarketBaseTokenSymbol,
				});

				// noinspection DuplicatedCode
				expect(result).toBeDefined();
				expect(result.address).toBe(firstMarketBaseTokenAddress);
				expect(result.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(result.name).toBe(firstMarketBaseTokenSymbol);
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

				const baseToken = result.get(firstMarketBaseTokenAddress)!;
				expect(baseToken).toBeDefined();
				expect(baseToken.address).toBe(firstMarketBaseTokenAddress);
				expect(baseToken.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken.name).toBeDefined();
				expect(baseToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken.raw).toBeDefined();

				const quoteToken = result.get(firstMarketQuoteTokenAddress)!;
				expect(quoteToken).toBeDefined();
				expect(quoteToken.address).toBe(firstMarketQuoteTokenAddress);
				expect(quoteToken.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken.name).toBeDefined();
				expect(quoteToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken.raw).toBeDefined();
			});

			it("should be able to get tokens by symbols", async () => {
				const symbols = [firstMarketBaseTokenSymbol, firstMarketQuoteTokenSymbol];

				const result = await rujira.fin.getTokens({ symbols });

				expect(result).toBeDefined();
				expect(result.size).toBe(symbols.length);

				const baseToken = getNotNullOrThrowError<Token>(
					result.valueSeq().find((token: Token) => token.symbol === firstMarketBaseTokenSymbol),
					`Token with symbol ${firstMarketBaseTokenSymbol} not found`
				);
				const quoteToken = getNotNullOrThrowError<Token>(
					result.valueSeq().find((token: Token) => token.symbol === firstMarketQuoteTokenSymbol),
					`Token with symbol ${firstMarketQuoteTokenSymbol} not found`
				);

				expect(baseToken).toBeDefined();
				expect(baseToken.address).toBe(firstMarketBaseTokenAddress);
				expect(baseToken.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken.name).toBeDefined();
				expect(baseToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken.raw).toBeDefined();

				expect(quoteToken).toBeDefined();
				expect(quoteToken.address).toBe(firstMarketQuoteTokenAddress);
				expect(quoteToken.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken.name).toBeDefined();
				expect(quoteToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken.raw).toBeDefined();
			});

			it("should be able to get all tokens and validate base and quote tokens", async () => {
				const result = await rujira.fin.getAllTokens({});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(1);

				const baseToken = result.getOrThrow(firstMarketBaseTokenAddress);
				const quoteToken = result.getOrThrow(firstMarketQuoteTokenAddress);
				const nativeToken = result.getOrThrow(nativeTokenConstant.address);
				const beaconToken = result.getOrThrow(beaconTokenConstant.address);
				const feePaymentToken = result.getOrThrow(feePaymentTokenConstant.address);

				expect(baseToken).toBeDefined();
				expect(baseToken.address).toBe(firstMarketBaseTokenAddress);
				expect(baseToken.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken.name).toBeDefined();
				expect(baseToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken.raw).toBeDefined();

				expect(quoteToken).toBeDefined();
				expect(quoteToken.address).toBe(firstMarketQuoteTokenAddress);
				expect(quoteToken.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken.name).toBeDefined();
				expect(quoteToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken.raw).toBeDefined();

				expect(nativeToken).toBeDefined();
				expect(nativeToken.address).toBe(nativeTokenConstant.address);
				expect(nativeToken.symbol).toBe(nativeTokenConstant.symbol);
				expect(nativeToken.name).toBeDefined();
				expect(nativeToken.decimals).toBeGreaterThan(0);
				expect(nativeToken.raw).toBeDefined();

				expect(beaconToken).toBeDefined();
				expect(beaconToken.address).toBe(beaconTokenConstant.address);
				expect(beaconToken.symbol).toBe(beaconTokenConstant.symbol);
				expect(beaconToken.name).toBeDefined();
				expect(beaconToken.decimals).toBeGreaterThan(0);
				expect(beaconToken.raw).toBeDefined();

				expect(feePaymentToken).toBeDefined();
				expect(feePaymentToken.address).toBe(feePaymentTokenConstant.address);
				expect(feePaymentToken.symbol).toBe(feePaymentTokenConstant.symbol);
				expect(feePaymentToken.name).toBeDefined();
				expect(feePaymentToken.decimals).toBeGreaterThan(0);
				expect(feePaymentToken.raw).toBeDefined();
			});
		});

		describe("markets", () => {
			it("should be able to get a market by address", async () => {
				const result = await rujira.fin.getMarket({
					address: firstMarketAddress,
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

				const firstMarket = result.getOrThrow(firstMarketAddress);
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

				const secondMarket = result.getOrThrow(secondMarketAddress);
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

				const firstMarket = result.getOrThrow(firstMarketAddress);
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

				const secondMarket = result.getOrThrow(secondMarketAddress);
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
				expect(result.size).toBeGreaterThan(1);

				for (const [address, market] of result.entries()) {
					expect(market).toBeDefined();
					expect(market.address).toBe(address);

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

				const firstMarket = result.getOrThrow(firstMarketAddress);
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

				const secondMarket = result.getOrThrow(secondMarketAddress);
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
				expect(result.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
				expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.base.raw).toBeDefined();

				expect(result.market.tokens.quote).toBeDefined();
				expect(result.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.name).toBe(firstMarketQuoteTokenSymbol);
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

				if (bids.size > 0) {
					const firstBidOrder = bids.getOrThrow(0);
					expect(firstBidOrder).toBeDefined();
					expect(firstBidOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.raw).toBeDefined();

					const bestBid = getNotNullOrThrowError<OrderBookOrder>(
						result.book.bestBid,
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

					const bestAsk = getNotNullOrThrowError<OrderBookOrder>(
						result.book.bestAsk,
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
					const bestAsk = getNotNullOrThrowError<OrderBookOrder>(
						result.book.bestAsk,
						`Best ask order not found`
					);
					const bestBid = getNotNullOrThrowError<OrderBookOrder>(
						result.book.bestBid,
						`Best bid order not found`
					);
					const middlePrice = getNotNullOrThrowError<Amount>(
						result.book.middlePrice,
						`Middle price not found`
					);
					expect(middlePrice).toBeDefined();
					expect(middlePrice.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(middlePrice.toNumber()).toBeLessThanOrEqual(bestAsk.price.toNumber());
					expect(middlePrice.toNumber()).toBeGreaterThanOrEqual(bestBid.price.toNumber());
				} else if (asks.size > 0 && bids.size === 0) {
					expect(result.book.bestAsk).toBeDefined();
					expect(result.book.bestBid).toBeUndefined();
					expect(result.book.middlePrice).toBeDefined();
					expect(result.book.middlePrice!.toNumber()).toBe(result.book.bestAsk!.price.toNumber());
				} else if (bids.size > 0 && asks.size === 0) {
					expect(result.book.bestBid).toBeDefined();
					expect(result.book.bestAsk).toBeUndefined();
					expect(result.book.middlePrice).toBeDefined();
					expect(result.book.middlePrice!.toNumber()).toBe(result.book.bestBid!.price.toNumber());
				} else {
					expect(result.book.bestAsk).toBeUndefined();
					expect(result.book.bestBid).toBeUndefined();
					expect(result.book.middlePrice).toBeUndefined();
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
				expect(result.market.tokens.quote.name).toBeDefined;
				expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.quote.raw).toBeDefined();

				expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.status).toBe(MarketStatus.ACTIVE);
				expect(result.market.raw).toBeDefined();

				expect(result.price).toBeDefined();
				expect(result.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

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

				expect(result.price).toBeDefined();
				expect(result.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

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
					expect(candle.open.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.high.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.low.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.close.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
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
					expect(candle.open.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.high.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.low.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.close.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.volume.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(candle.raw).toBeDefined();
				});
			});
		});

		describe("balances", () => {
			it("should be able to get balances for a wallet", async () => {
				const result = await rujira.fin.getBalances({ walletAddress: ownerAddress });

				expect(result).toBeDefined();
				expect(result.tokens).toBeDefined();
				expect(result.total).toBeDefined();

				expect(result.tokens.size).toBeGreaterThan(0);

				// TODO Improve this test to be accumulating the balances (native and beacon) and check them against the totals!!!
				for (const [tokenAddress, balances] of result.tokens.entries()) {
					expect(balances).toBeDefined();
					expect(balances.token).toBeDefined();
					expect(balances.balances).toBeDefined();

					expect(balances.token.address).toBe(tokenAddress);
					expect(balances.token.symbol).toBeDefined();
					expect(balances.token.name).toBeDefined();
					expect(balances.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(balances.token.raw).toBeDefined();

					const tokenBalance = balances.balances;
					expect(tokenBalance.token).toBeDefined();
					expect(tokenBalance.nativeToken).toBeDefined();
					expect(tokenBalance.beaconToken).toBeDefined();

					const tokenBalanceData = tokenBalance.token;
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

					const nativeTokenBalance = tokenBalance.nativeToken;
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

					const beaconTokenBalance = tokenBalance.beaconToken;
					expect(beaconTokenBalance.free).toBeDefined();
					expect(beaconTokenBalance.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(beaconTokenBalance.lockedInOrders).toBeDefined();
					expect(beaconTokenBalance.lockedInOrders.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(beaconTokenBalance.lockedInPools).toBeDefined();
					expect(beaconTokenBalance.lockedInPools.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(beaconTokenBalance.withdrawable).toBeDefined();
					expect(beaconTokenBalance.withdrawable.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(beaconTokenBalance.total).toBeDefined();
					expect(beaconTokenBalance.total.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(beaconTokenBalance.quotation).toBeDefined();
					expect(beaconTokenBalance.quotation.token).toBeDefined();
					expect(beaconTokenBalance.quotation.token.address).toBeDefined();
					expect(beaconTokenBalance.quotation.token.symbol).toBeDefined();
					expect(beaconTokenBalance.quotation.token.name).toBeDefined();
					expect(beaconTokenBalance.quotation.token.decimals).toBeGreaterThan(0);
					expect(beaconTokenBalance.quotation.token.raw).toBeDefined();
					expect(beaconTokenBalance.quotation.tokenToQuote).toBeDefined();
					expect(beaconTokenBalance.quotation.tokenToQuote.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(beaconTokenBalance.quotation.quoteToToken).toBeDefined();
					expect(beaconTokenBalance.quotation.quoteToToken.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				}

				const baseTokenBalance = result.tokens.getOrThrow(firstMarketBaseTokenAddress);
				expect(baseTokenBalance).toBeDefined();
				expect(baseTokenBalance.token.address).toBe(firstMarketBaseTokenAddress);
				expect(baseTokenBalance.token.symbol).toBe(firstMarketBaseTokenSymbol);

				const quoteTokenBalance = result.tokens.getOrThrow(firstMarketQuoteTokenAddress);
				expect(quoteTokenBalance).toBeDefined();
				expect(quoteTokenBalance.token.address).toBe(firstMarketQuoteTokenAddress);
				expect(quoteTokenBalance.token.symbol).toBe(firstMarketQuoteTokenSymbol);

				const nativeTokenBalance = result.tokens.getOrThrow(nativeTokenConstant.address);
				expect(nativeTokenBalance.token.address).toBe(nativeTokenConstant.address);
				expect(nativeTokenBalance.token.symbol).toBe(nativeTokenConstant.symbol);

				const beaconTokenBalance = result.tokens.getOrThrow(beaconTokenConstant.address);
				expect(beaconTokenBalance.token.address).toBe(beaconTokenConstant.address);
				expect(beaconTokenBalance.token.symbol).toBe(beaconTokenConstant.symbol);

				const feePaymentTokenBalance = result.tokens.getOrThrow(feePaymentTokenConstant.address);
				expect(feePaymentTokenBalance.token.address).toBe(feePaymentTokenConstant.address);
				expect(feePaymentTokenBalance.token.symbol).toBe(feePaymentTokenConstant.symbol);

				expect(result.total.nativeToken).toBeDefined();
				expect(result.total.beaconToken).toBeDefined();

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

				const totalBeaconToken = result.total.beaconToken;
				expect(totalBeaconToken.free).toBeDefined();
				expect(totalBeaconToken.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalBeaconToken.lockedInOrders).toBeDefined();
				expect(totalBeaconToken.lockedInOrders.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalBeaconToken.lockedInPools).toBeDefined();
				expect(totalBeaconToken.lockedInPools.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalBeaconToken.withdrawable).toBeDefined();
				expect(totalBeaconToken.withdrawable.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(totalBeaconToken.total).toBeDefined();
				expect(totalBeaconToken.total.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
			});
		});

		describe("withdraw", () => {
			it("should be able to withdraw market by address", async () => {
				const result = await rujira.fin.withdrawFromMarket({ marketAddress: firstMarketAddress, marketSymbol: undefined });

				expect(result).toBeDefined();

				expect(result.transaction).toBeDefined();
				expect(result.transaction.hash).toBeDefined();
				expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
				expect(result.transaction.fee).toBeDefined();
				expect(result.transaction.fee.amount).toBeDefined();
				expect(result.transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(result.transaction.fee.token).toBeDefined();
				expect(result.transaction.fee.token.address).toBeDefined();
				expect(result.transaction.fee.token.symbol).toBeDefined();
				expect(result.transaction.fee.token.name).toBeDefined();
				expect(result.transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.transaction.fee.token.raw).toBeDefined();
				expect(result.transaction.raw).toBeDefined();

				expect(result.raw).toBeDefined();
			});

			it("should be able to withdraw market by symbol", async () => {
				const result = await rujira.fin.withdrawFromMarket({ marketAddress: undefined, marketSymbol: firstMarketSymbol });

				expect(result).toBeDefined();

				expect(result.transaction).toBeDefined();
				expect(result.transaction.hash).toBeDefined();
				expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
				expect(result.transaction.fee).toBeDefined();
				expect(result.transaction.fee.amount).toBeDefined();
				expect(result.transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
				expect(result.transaction.fee.token).toBeDefined();
				expect(result.transaction.fee.token.address).toBeDefined();
				expect(result.transaction.fee.token.symbol).toBeDefined();
				expect(result.transaction.fee.token.name).toBeDefined();
				expect(result.transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.transaction.fee.token.raw).toBeDefined();
				expect(result.transaction.raw).toBeDefined();

				expect(result.raw).toBeDefined();
			});
		});

		describe("orders", () => {
			describe("cancel orders", () => {
				it("should cancel an order", async () => {
					const result = await rujira.fin.cancelOrder({ orderId: testOrderIds[0] });

					expect(result).toBeDefined();
					expect(result.order).toBeDefined();
					expect(result.order.id).toBeDefined();
					expect(result.order.side).toBe(OrderSide.BUY);
					expect(result.order.type).toBe(OrderType.LIMIT);
					expect(result.order.status).toBe(OrderStatus.CANCELLED);

					expect(result.order.market).toBeDefined();
					expect(result.order.market.address).toBe(firstMarketAddress);
					expect(result.order.market.symbol).toBe(firstMarketSymbol);
					expect(result.order.market.tokens.base).toBeDefined();
					expect(result.order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
					expect(result.order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
					expect(result.order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
					expect(result.order.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.order.market.tokens.base.raw).toBeDefined();

					expect(result.order.market.tokens.quote).toBeDefined();
					expect(result.order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
					expect(result.order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
					expect(result.order.market.tokens.quote.name).toBeDefined();
					expect(result.order.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.order.market.tokens.quote.raw).toBeDefined();

					expect(result.order.owner).toBeDefined();
					expect(result.order.owner).toBe(ownerAddress);
					expect(result.order.price.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(result.order.amount.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
					expect(result.order.filledAmount).toBeDefined();
					expect(result.order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(result.order.filledPercentage).toBeDefined();
					expect(result.order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(result.order.creationTimestamp).toBeDefined();
					expect(result.order.creationTimestamp).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.order.updateTimestamp).toBeDefined();
					expect(result.order.updateTimestamp).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.order.raw).toBeDefined();

					expect(result.transaction).toBeDefined();
					expect(result.transaction.hash).toBeDefined();
					expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
					expect(result.transaction.fee).toBeDefined();
					expect(result.transaction.fee.amount).toBeDefined();
					expect(result.transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(result.transaction.fee.token).toBeDefined();
					expect(result.transaction.fee.token.address).toBeDefined();
					expect(result.transaction.fee.token.symbol).toBeDefined();
					expect(result.transaction.fee.token.name).toBeDefined();
					expect(result.transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.transaction.fee.token.raw).toBeDefined();
					expect(result.transaction.raw).toBeDefined();
				});

				it("should cancel multiple orders", async () => {
					const result = await rujira.fin.cancelOrders({ orderIds: testOrderIds });

					expect(result).toBeDefined();
					expect(result.orders.size).toBe(testOrderIds.length);

					for (const [orderId, order] of result.orders.entries()) {
						expect(order).toBeDefined();
						expect(order.id).toBe(orderId);
						expect(order.side).toBe(order.side);
						expect(order.type).toBe(order.type);
						expect(order.status).toBe(OrderStatus.CANCELLED);

						expect(order.market).toBeDefined();
						expect(order.market.address).toBe(firstMarketAddress);
						expect(order.market.symbol).toBe(firstMarketSymbol);
						expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());

						expect(order.market.tokens.base).toBeDefined();
						expect(order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
						expect(order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
						expect(order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
						expect(order.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(order.market.tokens.base.raw).toBeDefined();

						expect(order.market.tokens.quote).toBeDefined();
						expect(order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
						expect(order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
						expect(order.market.tokens.quote.name).toBeDefined();
						expect(order.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(order.market.tokens.quote.raw).toBeDefined();

						expect(order.owner).toBeDefined();
						expect(order.owner).toBe(ownerAddress);
						expect(order.market.price).toBeDefined();
						expect(order.market.price!.baseQuote.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.market.price!.quoteBase.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.filledAmount).toBeDefined();
						expect(order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.filledPercentage).toBeDefined();
						expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.creationTimestamp).toBeDefined();
						expect(order.creationTimestamp).toBeGreaterThan(0);
						expect(order.updateTimestamp).toBeDefined();
						expect(order.updateTimestamp).toBeGreaterThan(0);

						expect(order.raw).toBeDefined();
					}

					for (const [transactionHash, transaction] of result.transactions.entries()) {
						expect(transaction).toBeDefined();
						expect(transaction.hash).toBeDefined();
						expect(transaction.hash).toBe(transactionHash);
						expect(transaction.status).toBe(TransactionStatus.SUCCESS);
						expect(transaction.fee).toBeDefined();
						expect(transaction.fee.amount).toBeDefined();
						expect(transaction.fee.token).toBeDefined();
						expect(transaction.fee.token.address).toBeDefined();
						expect(transaction.fee.token.symbol).toBeDefined();
						expect(transaction.fee.token.name).toBeDefined();
						expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(transaction.fee.token.raw).toBeDefined();
						expect(transaction.raw).toBeDefined();
					}
				});

				it("should cancel all orders", async () => {
					const result = await rujira.fin.cancelAllOrders({ marketAddress: firstMarketAddress, marketSymbol: undefined });

					expect(result).toBeDefined();
					expect(result.orders.size).toBe(testOrderIds.length);

					result.orders.forEach((order: Order) => {
						expect(order).toBeDefined();
						expect(order.id).toBeDefined();
						expect(order.side).toBe(OrderSide.BUY);
						expect(order.type).toBe(OrderType.LIMIT);
						expect(order.status).toBe(OrderStatus.CANCELLED);

						expect(order.market).toBeDefined();
						expect(order.market.address).toBe(firstMarketAddress);
						expect(order.market.symbol).toBe(firstMarketSymbol);
						expect(order.market.status).toBe(MarketStatus.ACTIVE);
						expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());

						expect(order.market.tokens.base).toBeDefined();
						expect(order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
						expect(order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
						expect(order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
						expect(order.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(order.market.tokens.base.raw).toBeDefined();

						expect(order.market.tokens.quote).toBeDefined();
						expect(order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
						expect(order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
						expect(order.market.tokens.quote.name).toBeDefined();
						expect(order.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(order.market.tokens.quote.raw).toBeDefined();

						expect(order.market.price).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(order.market.price!.baseQuote.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.market.price!.quoteBase.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

						expect(order.owner).toBeDefined();
						expect(order.owner).toBe(ownerAddress);
						expect(order.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.filledAmount).toBeDefined();
						expect(order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.filledPercentage).toBeDefined();
						expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.creationTimestamp).toBeDefined();
						expect(order.creationTimestamp).toBeGreaterThan(0);
						expect(order.updateTimestamp).toBeDefined();
						expect(order.updateTimestamp).toBeGreaterThan(0);
					});

					for (const [transactionHash, transaction] of result.transactions.entries()) {
						expect(transaction).toBeDefined();
						expect(transaction.hash).toBeDefined();
						expect(transaction.hash).toBe(transactionHash);
						expect(transaction.status).toBe(TransactionStatus.SUCCESS);
						expect(transaction.fee).toBeDefined();
						expect(transaction.fee.amount).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(transaction.fee.token).toBeDefined();
						expect(transaction.fee.token.address).toBeDefined();
						expect(transaction.fee.token.symbol).toBeDefined();
						expect(transaction.fee.token.name).toBeDefined();
						expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(transaction.fee.token.raw).toBeDefined();
						expect(transaction.fee.token.symbol).toBe(feePaymentTokenConstant.symbol);

						expect(transaction.raw).toBeDefined();
					}
				});
			});
		});
	});
});
