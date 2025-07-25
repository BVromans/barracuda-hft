import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import "dotenv/config";
import { properties } from "../src/properties";
import { Rujira } from "../src/rujira";
import { getNotNullOrThrowError } from "../src/utils";
import {
	BIG_NUMBER_0,
	Candle,
	DECIMAL_0,
	List,
	Market,
	MarketAddress,
	MarketStatus,
	SystemStatus,
	Token,
	TokenAddress,
	TokenBalance,
	TransactionStatus,
	Wallet,
	Order,
	OrderStatus,
	Transaction,
	OrderType,
	OrderSide
} from "../src/types";
import Decimal from "decimal.js";

let rujira: Rujira;

let feePaymentToken: Token;
let nativeToken: Token;
let beaconToken: Token;
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
let priceFixed: string;

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
    'PRICE_FIXED'
	];

	const missingEnvironmentVariables = requiredEnvironmentVariables.filter(varName => !process.env[varName]);

	if (missingEnvironmentVariables.length > 0) {
		throw new Error(`Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`);
	}

	feePaymentToken = properties.getAs<Token>('rujira.tokens.feePayment');
		nativeToken = properties.getAs<Token>('rujira.tokens.native');
		beaconToken = properties.getAs<Token>('rujira.tokens.beacon');
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
		priceFixed = process.env.PRICE_FIXED!;

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
				expect(result.fee.token.address).toBe(feePaymentToken.address);
				expect(result.fee.token.symbol).toBe(feePaymentToken.symbol);
				expect(result.fee.token.name).toBe(feePaymentToken.name);
				expect(result.fee.token.decimals).toBe(feePaymentToken.decimals);
				expect(result.fee.token.raw).toBeDefined();
				expect(result.raw).toBeDefined();
			});

			it("should validate a confirmed transaction waiting confirmation", async () => {
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
				expect(result.fee.token.address).toBe(feePaymentToken.address);
				expect(result.fee.token.symbol).toBe(feePaymentToken.symbol);
				expect(result.fee.token.name).toBe(feePaymentToken.name);
				expect(result.fee.token.decimals).toBe(feePaymentToken.decimals);
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
				expect(baseToken?.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken?.name).toBeDefined();
				expect(baseToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken?.raw).toBeDefined();

				expect(quoteToken).toBeDefined();
				expect(quoteToken?.address).toBe(firstMarketQuoteTokenAddress);
				expect(quoteToken?.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken?.name).toBeDefined();
				expect(quoteToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken?.raw).toBeDefined();
			});

			it("should be able to get all tokens and validate base and quote tokens", async () => {
				const result = await rujira.fin.getAllTokens({});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(1);

				const baseToken = getNotNullOrThrowError<Token>(
					result.find((token: Token) => token.address === firstMarketBaseTokenAddress),
					`Token with address ${firstMarketBaseTokenAddress} not found`
				);
				const quoteToken = getNotNullOrThrowError<Token>(
					result.valueSeq().find((token: Token) => token.address === firstMarketQuoteTokenAddress),
					`Token with address ${firstMarketQuoteTokenAddress} not found`
				);
				const nativeTokenObj = getNotNullOrThrowError<Token>(
					result.valueSeq().find((token: Token) => token.symbol === nativeToken.symbol),
					`Native token with symbol ${nativeToken.symbol} not found`
				);
				const beaconTokenObj = getNotNullOrThrowError<Token>(
					result.valueSeq().find((token: Token) => token.symbol === beaconToken.symbol),
					`Beacon token with symbol ${beaconToken.symbol} not found`
				);
				const feePaymentTokenObj = getNotNullOrThrowError<Token>(
					result.valueSeq().find((token: Token) => token.symbol === feePaymentToken.symbol),
					`Fee payment token with symbol ${feePaymentToken.symbol} not found`
				);

				expect(baseToken).toBeDefined();
				expect(baseToken?.address).toBe(firstMarketBaseTokenAddress);
				expect(baseToken?.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken?.name).toBeDefined();
				expect(baseToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken?.raw).toBeDefined();

				expect(quoteToken).toBeDefined();
				expect(quoteToken?.address).toBe(firstMarketQuoteTokenAddress);
				expect(quoteToken?.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken?.name).toBeDefined();
				expect(quoteToken?.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken?.raw).toBeDefined();

				expect(nativeTokenObj).toBeDefined();
				expect(nativeTokenObj?.symbol).toBe(nativeToken.symbol);
				expect(nativeTokenObj?.name).toBeDefined();
				expect(nativeTokenObj?.decimals).toBeGreaterThan(0);
				expect(nativeTokenObj?.raw).toBeDefined();

				expect(beaconTokenObj).toBeDefined();
				expect(beaconTokenObj?.symbol).toBe(beaconToken.symbol);
				expect(beaconTokenObj?.name).toBeDefined();
				expect(beaconTokenObj?.decimals).toBeGreaterThan(0);
				expect(beaconTokenObj?.raw).toBeDefined();

				expect(feePaymentTokenObj).toBeDefined();
				expect(feePaymentTokenObj?.symbol).toBe(feePaymentToken.symbol);
				expect(feePaymentTokenObj?.name).toBeDefined();
				expect(feePaymentTokenObj?.decimals).toBeGreaterThan(0);
				expect(feePaymentTokenObj?.raw).toBeDefined();
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

				const firstMarket = result.get(firstMarketAddress)!;
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

				const secondMarket = result.get(secondMarketAddress)!;
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

		it("should be able to get markets by Symbols", async () => {
			const symbols = [firstMarketSymbol, secondMarketSymbol];

			const result = await rujira.fin.getMarkets({ symbols });

				expect(result).toBeDefined();
				expect(result.size).toBe(symbols.length);

				const firstMarket = getNotNullOrThrowError<Market>(
					result.valueSeq().find((market: Market) => market.symbol === firstMarketSymbol),
					`Market with symbol ${firstMarketSymbol} not found`
				);
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

				const secondMarket = getNotNullOrThrowError<Market>(
					result.valueSeq().find((market: Market) => market.symbol === secondMarketSymbol),
					`Market with symbol ${secondMarketSymbol} not found`
				);
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

				for (const [address, market] of result.entries() as Iterable<[MarketAddress, Market]>) {
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

				const firstMarket = result.get(firstMarketAddress as MarketAddress)!;
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

				const secondMarket = result.get(secondMarketAddress as MarketAddress)!;
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
					const firstBidOrder = bids.get(0);
					expect(firstBidOrder).toBeDefined();
					expect(firstBidOrder?.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder?.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder?.raw).toBeDefined();

					expect(result.book.bestBid).toBeDefined();
					expect(result.book.bestBid!.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.book.bestBid!.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.book.bestBid!.raw).toBeDefined();
				} else {
					expect(result.book.bestBid).toBeUndefined();
				}

				if (asks.size > 0) {
					const firstAskOrder = asks.get(0);
					expect(firstAskOrder).toBeDefined();
					expect(firstAskOrder?.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstAskOrder?.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstAskOrder?.raw).toBeDefined();

					expect(result.book.bestAsk).toBeDefined();
					expect(result.book.bestAsk!.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.book.bestAsk!.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.book.bestAsk!.raw).toBeDefined();
				} else {
					expect(result.book.bestAsk).toBeUndefined();
				}

				if (asks.size > 0 && bids.size > 0) {
					expect(result.book.bestAsk!.price.toNumber()).toBeGreaterThanOrEqual(result.book.bestBid!.price.toNumber());
					expect(result.book.middlePrice).toBeDefined();
					expect(result.book.middlePrice!.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(result.book.middlePrice!.toNumber()).toBeLessThanOrEqual(result.book.bestAsk!.price.toNumber());
					expect(result.book.middlePrice!.toNumber()).toBeGreaterThanOrEqual(result.book.bestBid!.price.toNumber());
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
				expect((result as List<Candle>).size).toBeGreaterThan(0);

				(result as List<Candle>).forEach((candle: Candle) => {
					expect(candle).toBeDefined();
					expect(candle.timestamp).toBeGreaterThan(0);
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
				expect((result as List<Candle>).size).toBeGreaterThan(0);

				(result as List<Candle>).forEach((candle: Candle) => {
					expect(candle).toBeDefined();
					expect(candle.timestamp).toBeGreaterThan(0);
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

				for (const [tokenAddress, tokenBalance] of result.tokens.entries()) {
					expect(tokenBalance).toBeDefined();
					expect(tokenBalance.token).toBeDefined();
					expect(tokenBalance.balances).toBeDefined();

					expect(tokenBalance.token.address).toBe(tokenAddress);
					expect(tokenBalance.token.symbol).toBeDefined();
					expect(tokenBalance.token.name).toBeDefined();
					expect(tokenBalance.token.decimals).toBeGreaterThan(0);
					expect(tokenBalance.token.raw).toBeDefined();

					const baseTokenBalance = tokenBalance.balances;
					expect(baseTokenBalance.token).toBeDefined();
					expect(baseTokenBalance.nativeToken).toBeDefined();
					expect(baseTokenBalance.beaconToken).toBeDefined();

					const tokenBalanceData = baseTokenBalance.token;
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

					const nativeTokenBalance = baseTokenBalance.nativeToken;
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

					const beaconTokenBalance = baseTokenBalance.beaconToken;
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

				const baseTokenBalance = result.tokens.get(firstMarketBaseTokenAddress);
				expect(baseTokenBalance).toBeDefined();
				expect(baseTokenBalance.token.address).toBe(firstMarketBaseTokenAddress);

				const quoteTokenBalance = result.tokens.get(firstMarketQuoteTokenAddress);
				expect(quoteTokenBalance).toBeDefined();
				expect(quoteTokenBalance.token.address).toBe(firstMarketQuoteTokenAddress);

				const nativeTokenBalance = getNotNullOrThrowError<TokenBalance>(
					result.tokens.values().find((tokenBalance: TokenBalance) => tokenBalance.token.symbol === nativeToken.symbol),
					`Native token with symbol ${nativeToken.symbol} not found in balances`
				);
				expect(nativeTokenBalance.token.symbol).toBe(nativeToken.symbol);

				const beaconTokenBalance = getNotNullOrThrowError<TokenBalance>(
					result.tokens.values().find((tokenBalance: TokenBalance) => tokenBalance.token.symbol === beaconToken.symbol),
					`Beacon token with symbol ${beaconToken.symbol} not found in balances`
				);
				expect(beaconTokenBalance.token.symbol).toBe(beaconToken.symbol);

				const feePaymentTokenBalance = getNotNullOrThrowError<TokenBalance>(
					result.tokens.values().find((tokenBalance: TokenBalance) => tokenBalance.token.symbol === feePaymentToken.symbol),
					`Fee payment token with symbol ${feePaymentToken.symbol} not found in balances`
				);
				expect(feePaymentTokenBalance.token.symbol).toBe(feePaymentToken.symbol);
			});
		});
	});
});



describe("Withdraw", () => {
	it("should be able to withdraw market by address", async () => {
		const result = await rujira.fin.withdrawFromMarket({ marketAddress: firstMarketAddress, marketSymbol: firstMarketSymbol });
		expect(result).toBeDefined();

		expect(result.transaction).toBeDefined();
		expect(result.transaction.hash).toBeDefined();
		expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
		expect(result.transaction.fee).toBeDefined();
		expect(result.transaction.fee.amount).toBeDefined();
		expect(result.transaction.fee.token).toBeDefined();
		expect(result.transaction.fee.token.symbol).toBeDefined();
		expect(result.transaction.fee.token.address).toBeDefined();
		expect(result.transaction.fee.token.name).toBeDefined();
		expect(result.transaction.raw).toBeDefined();
		expect(result.transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		expect(result.transaction.fee.token.raw).toBeDefined();
		expect(result.transaction.fee.token.name).toBeDefined();
		expect(result.transaction.fee.token.address).toBeDefined();
		expect(result.transaction.fee.token.symbol).toBeDefined();
		expect(result.transaction.fee.token.raw).toBeDefined();

		expect(result.raw).toBeDefined();

	});

	it("should be able to withdraw market by symbol", async () => {
		const result = await rujira.fin.withdrawFromMarket({ marketSymbol: firstMarketSymbol });
		expect(result).toBeDefined();

		expect(result.transaction).toBeDefined();
		expect(result.transaction.hash).toBeDefined();
		expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
		expect(result.transaction.fee).toBeDefined();
		expect(result.transaction.fee.amount).toBeDefined();
		expect(result.transaction.fee.token).toBeDefined();
		expect(result.transaction.fee.token.symbol).toBeDefined();
		expect(result.transaction.fee.token.address).toBeDefined();
		expect(result.transaction.fee.token.name).toBeDefined();
		expect(result.transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		expect(result.transaction.fee.token.raw).toBeDefined();
		expect(result.transaction.fee.token.name).toBeDefined();
		expect(result.transaction.fee.token.address).toBeDefined();
		expect(result.transaction.fee.token.symbol).toBeDefined();
		expect(result.transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		expect(result.transaction.fee.token.raw).toBeDefined();
		expect(result.transaction.fee.token.name).toBeDefined();
		expect(result.transaction.fee.token.address).toBeDefined();
		expect(result.transaction.raw).toBeDefined();

		expect(result.raw).toBeDefined();
	});
});




describe("Cancel Order", () => {
	it("should cancel an order", async () => {
		const result = await rujira.fin.cancelOrder({ orderId: "123" });
		expect(result).toBeDefined();
		expect(result.order).toBeDefined();
		expect(result.order.id).toBeDefined();
		expect(result.order.status).toBe(OrderStatus.CANCELLED);
		expect(result.order.raw).toBeDefined();
		expect(result.order.market).toBeDefined();
		expect(result.order.market.address).toBe(firstMarketAddress);
		expect(result.order.market.symbol).toBe(firstMarketSymbol);
		expect(result.order.market.tokens.base).toBeDefined();
		expect(result.order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
		expect(result.order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
		expect(result.order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);

		expect(result.transaction).toBeDefined();
		expect(result.transaction.hash).toBeDefined();
		expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
		expect(result.transaction.fee).toBeDefined();
		expect(result.transaction.fee.amount).toBeDefined();
		expect(result.transaction.fee.token).toBeDefined();
		expect(result.transaction.fee.token.symbol).toBeDefined();
		expect(result.transaction.fee.token.address).toBeDefined();
		expect(result.transaction.fee.token.name).toBeDefined();
		expect(result.transaction.raw).toBeDefined();
	});

	it("should cancel multiple orders", async () => {
		const result = await rujira.fin.cancelOrders({ orderIds: ["123", "456"] });
		expect(result).toBeDefined();
		expect(result.orders.size).toBe(2);
		expect(result.orders.size).toBeLessThanOrEqual(2);
		expect(result.orders.size).toBeGreaterThan(0);

		result.orders.forEach((order: Order) => {
			expect(order).toBeDefined();
			expect(order.id).toBeDefined();
			expect(order.status).toBe(OrderStatus.CANCELLED);
			expect(order.raw).toBeDefined();
			expect(order.market).toBeDefined();
			expect(order.market.address).toBe(firstMarketAddress);
			expect(order.market.symbol).toBe(firstMarketSymbol);
			expect(order.market.tokens.base).toBeDefined();
			expect(order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
			expect(order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
			expect(order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
			expect(order.market.tokens.quote).toBeDefined();
			expect(order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
			expect(order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
			expect(order.market.tokens.quote.name).toBeDefined();
			expect(order.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
			expect(order.market.tokens.quote.raw).toBeDefined();
			expect(order.type).toBe(OrderType.LIMIT);
			expect(order.side).toBe(OrderSide.BUY);
			expect(order.price).toBeDefined();
			expect(order.amount).toBeDefined();
			expect(order.owner).toBeDefined();
			expect(order.owner).toBe(ownerAddress);
			expect(order.filledAmount).toBeDefined();
			expect(order.filledAmount.toNumber()).toBe(0);
			expect(order.filledPercentage).toBeDefined();
			expect(order.filledPercentage.toNumber()).toBe(0);
			expect(order.creationTimestamp).toBeDefined();
			expect(order.creationTimestamp).toBeGreaterThan(0);
		});

		result.transactions.forEach((transaction: Transaction) => {
			expect(transaction).toBeDefined();
			expect(transaction.hash).toBeDefined();
			expect(transaction.status).toBe(TransactionStatus.SUCCESS);
			expect(transaction.fee).toBeDefined();
			expect(transaction.fee.amount).toBeDefined();
			expect(transaction.fee.token).toBeDefined();
			expect(transaction.fee.token.symbol).toBeDefined();
			expect(transaction.fee.token.address).toBeDefined();
			expect(transaction.fee.token.name).toBeDefined();
			expect(transaction.raw).toBeDefined();
			expect(transaction.fee.amount).toBeDefined();
			expect(transaction.fee.token).toBeDefined();
			expect(transaction.fee.token.symbol).toBeDefined();
			expect(transaction.fee.token.address).toBeDefined();
			expect(transaction.fee.token.name).toBeDefined();
			expect(transaction.raw).toBeDefined();
			expect(transaction.fee.amount).toBeDefined();
			expect(transaction.fee.token).toBeDefined();
			expect(transaction.fee.token.symbol).toBeDefined();
			expect(transaction.fee.token.address).toBeDefined();
			expect(transaction.fee.token.name).toBeDefined();
			expect(transaction.raw).toBeDefined();
		});
	});
});


