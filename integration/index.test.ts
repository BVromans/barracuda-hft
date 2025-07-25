import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import "dotenv/config";
import { properties } from "../src/properties";
import { Rujira } from "../src/rujira";
import {
	BIG_NUMBER_0,
	Market,
	MarketAddress,
	MarketStatus,
	SystemStatus,
	Token,
	TransactionStatus,
	Wallet
} from "../src/types";

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

				const baseToken = result.find((token: Token) => token.symbol === firstMarketBaseTokenSymbol);
				const quoteToken = result.find((token: Token) => token.symbol === firstMarketQuoteTokenSymbol);

				expect(baseToken).toBeDefined();
				expect(baseToken.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken.name).toBeDefined();
				expect(baseToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken.raw).toBeDefined();

				expect(quoteToken).toBeDefined();
				expect(quoteToken.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken.name).toBeDefined();
				expect(quoteToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken.raw).toBeDefined();
			});

			it("should be able to get all tokens and validate base and quote tokens", async () => {
				const result = await rujira.fin.getAllTokens({});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(1);

				const baseToken = result.find((token: Token) => token.address === firstMarketBaseTokenAddress);
				const quoteToken = result.find((token: Token) => token.address === firstMarketQuoteTokenAddress);
				const nativeTokenObj = result.find((token: Token) => token.symbol === nativeToken.symbol);
				const beaconTokenObj = result.find((token: Token) => token.symbol === beaconToken.symbol);
				const feePaymentTokenObj = result.find((token: Token) => token.symbol === feePaymentToken.symbol);

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

				expect(nativeTokenObj).toBeDefined();
				expect(nativeTokenObj.symbol).toBe(nativeToken.symbol);
				expect(nativeTokenObj.name).toBeDefined();
				expect(nativeTokenObj.decimals).toBeGreaterThan(0);
				expect(nativeTokenObj.raw).toBeDefined();

				expect(beaconTokenObj).toBeDefined();
				expect(beaconTokenObj.symbol).toBe(beaconToken.symbol);
				expect(beaconTokenObj.name).toBeDefined();
				expect(beaconTokenObj.decimals).toBeGreaterThan(0);
				expect(beaconTokenObj.raw).toBeDefined();

				expect(feePaymentTokenObj).toBeDefined();
				expect(feePaymentTokenObj.symbol).toBe(feePaymentToken.symbol);
				expect(feePaymentTokenObj.name).toBeDefined();
				expect(feePaymentTokenObj.decimals).toBeGreaterThan(0);
				expect(feePaymentTokenObj.raw).toBeDefined();
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
				const addresses = [firstMarketAddress];

				const result = await rujira.fin.getMarkets({ addresses });

				expect(result).toBeDefined();
				expect(result.size).toBe(addresses.length);

				const market = result.get(firstMarketAddress)!;
				expect(market).toBeDefined();
				expect(market.address).toBe(firstMarketAddress);
				expect(market.symbol).toBe(firstMarketSymbol);

				expect(market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(market.tokens.base.name).toBeDefined();
				expect(market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(market.tokens.base.raw).toBeDefined();

				expect(market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(market.tokens.quote.name).toBeDefined();
				expect(market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(market.tokens.quote.raw).toBeDefined();

				expect(market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(market.status).toBe(MarketStatus.ACTIVE);
				expect(market.raw).toBeDefined();
			});

			it("should be able to get markets by Symbols", async () => {
				const symbols = [firstMarketSymbol];

				const result = await rujira.fin.getMarkets({ symbols });

				expect(result).toBeDefined();
				expect(result.size).toBe(symbols.length);

				const market = result.find((market: Market) => market.symbol === firstMarketSymbol)!;
				expect(market).toBeDefined();
				expect(market.address).toBe(firstMarketAddress);
				expect(market.symbol).toBe(firstMarketSymbol);

				expect(market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(market.tokens.base.name).toBeDefined();
				expect(market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(market.tokens.base.raw).toBeDefined();

				expect(market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(market.tokens.quote.name).toBeDefined();
				expect(market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(market.tokens.quote.raw).toBeDefined();

				expect(market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(market.status).toBe(MarketStatus.ACTIVE);
				expect(market.raw).toBeDefined();
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
					expect(firstBidOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.raw).toBeDefined();

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
					expect(firstAskOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstAskOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstAskOrder.raw).toBeDefined();

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
				expect(result.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
				expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.base.raw).toBeDefined();

				expect(result.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.name).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.quote.raw).toBeDefined();

				expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.status).toBe(MarketStatus.ACTIVE);
				expect(result.market.raw).toBeDefined();

				expect(result.price).toBeDefined();
				expect(result.price.constructor.name).toBe("Decimal");
				expect(result.price.toNumber()).toBeGreaterThanOrEqual(0);

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
				expect(result.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
				expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.base.raw).toBeDefined();

				expect(result.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(result.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.name).toBe(firstMarketQuoteTokenSymbol);
				expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.quote.raw).toBeDefined();

				expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.status).toBe(MarketStatus.ACTIVE);
				expect(result.market.raw).toBeDefined();

				expect(result.price).toBeDefined();
				expect(result.price.constructor.name).toBe("Decimal");
				expect(result.price.toNumber()).toBeGreaterThanOrEqual(0);

				expect(result.timestamp).toBeDefined();
				expect(result.timestamp).toBeGreaterThan(0);

				expect(result.raw).toBeDefined();
			});
		});
	});
});


// describe('Fin Real Order Placement', () => {
//   it('should place a single real order', async () => {
//     const orderRequest: FinPlaceOrderRequest = {
//       ownerAddress: ownerAddress,
//       marketAddress: marketAddress,
//       side: OrderSide.BUY,
//       type: OrderType.LIMIT,
//       price: new Decimal(priceFixed),
//       amount: new Decimal('1')
//     };
//     try {
//       const result = await rujira.fin.placeOrder(orderRequest);
//       expect(result).toBeDefined();
//       expect(result.order).toBeDefined();
//       expect(typeof result.order.id).toBe('string');
//       expect(['buy', 'sell']).toContain(result.order.side);
//       expect(['limit', 'market']).toContain(result.order.type);
//       expect(result.order.price.constructor.name).toBe('Decimal');
//       expect(result.order.amount.constructor.name).toBe('Decimal');
//       expect(result.order.filledAmount.constructor.name).toBe('Decimal');
//       expect(result.order.filledPercentage.constructor.name).toBe('Decimal');
//       expect([
//         'open', 'cancelled', 'partially_filled', 'filled', 'creation_pending', 'cancellation_pending', 'unknown'
//       ]).toContain(result.order.status);
//       expect(typeof result.order.market).toBe('object');
//       expect(typeof result.order.market.symbol).toBe('string');
//       expect(typeof result.order.market.address).toBe('string');
//       expect(typeof result.order.market.decimals).toBe('number');
//       expect(['active', 'inactive']).toContain(result.order.market.status);
//       expect(typeof result.order.market.tokens).toBe('object');
//       expect(typeof result.order.market.tokens.base).toBe('object');
//       expect(typeof result.order.market.tokens.base.symbol).toBe('string');
//       expect(typeof result.order.market.tokens.base.address).toBe('string');
//       expect(typeof result.order.market.tokens.base.name).toBe('string');
//       expect(typeof result.order.market.tokens.base.decimals).toBe('number');
//       expect(typeof result.order.market.tokens.quote).toBe('object');
//       expect(typeof result.order.market.tokens.quote.symbol).toBe('string');
//       expect(typeof result.order.market.tokens.quote.address).toBe('string');
//       expect(typeof result.order.market.tokens.quote.name).toBe('string');
//       expect(typeof result.order.market.tokens.quote.decimals).toBe('number');
//       expect(typeof result.order.raw).toBe('object');
//       // Transaction checks
//       expect(result.transaction).toBeDefined();
//       expect(typeof result.transaction.hash).toBe('string');
//       expect(['pending', 'success', 'failed']).toContain(result.transaction.status.toLowerCase());
//       expect(result.transaction.fee.amount.constructor.name).toBe('Decimal');
//       expect(typeof result.transaction.fee.token).toBe('object');
//       expect(typeof result.transaction.fee.token.symbol).toBe('string');
//       expect(typeof result.transaction.fee.token.address).toBe('string');
//       expect(typeof result.transaction.fee.token.name).toBe('string');
//       expect(typeof result.transaction.raw).toBe('object');
//     } catch (err: any) {
//       console.error('Error creating single order:', err?.response || err);
//       throw err;
//     }
//   });

//   it('should place multiple real orders', async () => {
//     const maximumNumberOfOrders = 10;

//     const ordersRequest: FinPlaceOrdersRequest = {
//       ownerAddress: ownerAddress,
//       orders: [
//         {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           side: OrderSide.BUY,
//           type: OrderType.LIMIT,
//           price: new Decimal(priceFixed),
//           amount: new Decimal('1')
//         },
//         {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           side: OrderSide.SELL,
//           type: OrderType.LIMIT,
//           price: new Decimal(priceFixed),
//           amount: new Decimal('2')
//         }
//       ]
//     };
//     const result: FinPlaceOrdersResponse = await rujira.fin.placeOrders(ordersRequest);
//     expect(result).toBeDefined();
//     expect(result.orders.size).toBe(ordersRequest.orders.length);
//     expect(result.orders.size).toBeLessThanOrEqual(maximumNumberOfOrders);
//     expect(Array.from(result.orders.values()).length).toBe(result.orders.size);
//     const ordersArr = result.orders.valueSeq().toArray() as Order[];
//     expect(ordersArr[0]).toBeDefined();

//     const ordersList = Array.isArray(ordersRequest.orders)
//   ? ordersRequest.orders
//   : (ordersRequest.orders as any).toArray();

//     expect(ordersArr[DECIMAL_0.toNumber()].side).toBe(ordersList[DECIMAL_0.toNumber()]!.side);
//     expect(ordersArr[DECIMAL_0.toNumber()].type).toBe(ordersList[DECIMAL_0.toNumber()]!.type);
//     expect(ordersArr[DECIMAL_0.toNumber()].price.toString()).toBe(ordersList[DECIMAL_0.toNumber()]!.price.toString());
//     expect(ordersArr[DECIMAL_0.toNumber()].amount.toString()).toBe(ordersList[DECIMAL_0.toNumber()]!.amount.toString());
//     expect(ordersArr[DECIMAL_0.toNumber()].owner).toBe(ordersList[DECIMAL_0.toNumber()]!.ownerAddress ?? '');
//     if (ordersArr[DECIMAL_0.toNumber()].market && ordersArr[DECIMAL_0.toNumber()].market.address && ordersList[DECIMAL_0.toNumber()]!.marketAddress) {
//       expect(ordersArr[DECIMAL_0.toNumber()].market.address).toBe(ordersList[DECIMAL_0.toNumber()]!.marketAddress);
//     }
//     // Deep checks for first order
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].id).toBe('string');
//     expect(['buy', 'sell']).toContain(ordersArr[DECIMAL_0.toNumber()].side);
//     expect(['limit', 'market']).toContain(ordersArr[DECIMAL_0.toNumber()].type);
//     expect(ordersArr[DECIMAL_0.toNumber()].price.constructor.name).toBe('Decimal');
//     expect(ordersArr[DECIMAL_0.toNumber()].amount.constructor.name).toBe('Decimal');
//     expect(ordersArr[DECIMAL_0.toNumber()].filledAmount.constructor.name).toBe('Decimal');
//     expect(ordersArr[DECIMAL_0.toNumber()].filledPercentage.constructor.name).toBe('Decimal');
//     expect([
//       'open', 'cancelled', 'partially_filled', 'filled', 'creation_pending', 'cancellation_pending', 'unknown'
//     ]).toContain(ordersArr[DECIMAL_0.toNumber()].status);
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market).toBe('object');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.symbol).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.address).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.decimals).toBe('number');
//     expect(['active', 'inactive']).toContain(ordersArr[DECIMAL_0.toNumber()].market.status);
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens).toBe('object');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base).toBe('object');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.symbol).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.address).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.name).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.decimals).toBe('number');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote).toBe('object');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.symbol).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.address).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.name).toBe('string');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.decimals).toBe('number');
//     expect(typeof ordersArr[DECIMAL_0.toNumber()].raw).toBe('object');
//     // Also check second order for key fields
//     expect(ordersArr[DECIMAL_1.toNumber()]).toBeDefined();
//     expect(['buy', 'sell']).toContain(ordersArr[DECIMAL_1.toNumber()].side);
//     expect(['limit', 'market']).toContain(ordersArr[DECIMAL_1.toNumber()].type);
//     expect(ordersArr[DECIMAL_1.toNumber()].price.constructor.name).toBe('Decimal');
//     expect(ordersArr[DECIMAL_1.toNumber()].amount.constructor.name).toBe('Decimal');
//     expect(ordersArr[DECIMAL_1.toNumber()].owner).toBe(ordersList[DECIMAL_1.toNumber()]!.ownerAddress ?? '');
//     if (ordersArr[DECIMAL_1.toNumber()].market && ordersArr[DECIMAL_1.toNumber()].market.address && ordersList[DECIMAL_1.toNumber()]!.marketAddress) {
//       expect(ordersArr[DECIMAL_1.toNumber()].market.address).toBe(ordersList[DECIMAL_1.toNumber()]!.marketAddress);
//     }
//     // Order 1
//     expect(ordersArr[DECIMAL_1.toNumber()].id).toBeDefined();
//     expect([OrderSide.BUY, OrderSide.SELL]).toContain(ordersArr[DECIMAL_1.toNumber()].side);
//     expect([OrderType.LIMIT]).toContain(ordersArr[DECIMAL_1.toNumber()].type);
//     expect(ordersArr[DECIMAL_1.toNumber()].price).toBeDefined();
//     expect(ordersArr[DECIMAL_1.toNumber()].amount).toBeDefined();
//     expect(ordersArr[DECIMAL_1.toNumber()].owner).toBe(ownerAddress);
//     expect(ordersArr[DECIMAL_1.toNumber()].market).toBeDefined();
//     expect(ordersArr[DECIMAL_1.toNumber()].status).toBeDefined();
//     expect(ordersArr[DECIMAL_1.toNumber()].filledAmount).toBeDefined();
//     expect(ordersArr[DECIMAL_1.toNumber()].filledPercentage).toBeDefined();
//     expect(ordersArr[DECIMAL_1.toNumber()].raw).toBeDefined();
//     // Transaction checks (if available)
//     expect(result.transactions).toBeDefined();
//     expect(result.transactions.size).toBeGreaterThan(0);
//     for (const tx of result.transactions.values()) {
//       expect(typeof tx.hash).toBe('string');
//       expect(['pending', 'success', 'failed']).toContain(tx.status.toLowerCase());
//       expect(tx.fee.amount.constructor.name).toBe('Decimal');
//       expect(typeof tx.fee.token).toBe('object');
//       expect(typeof tx.fee.token.symbol).toBe('string');
//       expect(typeof tx.fee.token.address).toBe('string');
//       expect(typeof tx.fee.token.name).toBe('string');
//       expect(typeof tx.raw).toBe('object');
//     }
//   });
// });

// describe('Fin Order Replacement', () => {
//   it('should replace a single order successfully', async () => {
//     // Primeiro, crie uma ordem para cancelar
//     const orderRequest: FinPlaceOrderRequest = {
//       ownerAddress: ownerAddress,
//       marketAddress: marketAddress,
//       side: OrderSide.BUY,
//       type: OrderType.LIMIT,
//       price: new Decimal(priceFixed),
//       amount: new Decimal('1')
//     };
//     const placed = await rujira.fin.placeOrder(orderRequest);
//     expect(placed).toBeDefined();
//     expect(placed.order).toBeDefined();
//     const cancelRequest = {
//       ownerAddress: ownerAddress,
//       marketAddress: marketAddress,
//       orderId: placed.order.id
//     };
//     const newOrderRequest: FinPlaceOrderRequest = {
//       ownerAddress: ownerAddress,
//       marketAddress: marketAddress,
//       side: OrderSide.SELL,
//       type: OrderType.LIMIT,
//       price: new Decimal(priceFixed),
//       amount: new Decimal('2')
//     };
//     const result = await rujira.fin.replaceOrder(cancelRequest, newOrderRequest);
//     expect(result).toBeDefined();
//     expect(result.error).toBeUndefined();

//     expect(result.cancelResult).toBeDefined();
//     expect(result.cancelResult!.order).toBeDefined();
//     expect(result.cancelResult!.order).toMatchObject({
//       id: expect.any(String),
//       status: OrderStatus.CANCELLED,
//       owner: expect.any(String),
//       side: expect.any(String),
//       type: expect.any(String),
//       price: expect.any(Decimal),
//       amount: expect.any(Decimal),
//       filledAmount: expect.any(Decimal),
//       filledPercentage: expect.any(Decimal),
//       raw: expect.any(Object),
//     });
//     expect(result.cancelResult!.transaction).toBeDefined();
//     expect(result.cancelResult!.transaction).toMatchObject({
//       hash: expect.any(String),
//       status: expect.any(String),
//       fee: expect.objectContaining({
//         amount: expect.any(Decimal),
//         token: expect.any(Object),
//       }),
//       raw: expect.any(Object),
//     });

//     expect(result.placeResult).toBeDefined();
//     expect(result.placeResult!.order).toBeDefined();
//     expect(result.placeResult!.order).toMatchObject({
//       id: expect.any(String),
//       owner: expect.any(String),
//       side: OrderSide.SELL,
//       type: OrderType.LIMIT,
//       price: expect.any(Decimal),
//       amount: expect.any(Decimal),
//       filledAmount: expect.any(Decimal),
//       filledPercentage: expect.any(Decimal),
//       status: expect.any(String),
//       market: expect.any(Object),
//       raw: expect.any(Object),
//     });
//     expect(result.placeResult!.transaction).toBeDefined();
//     expect(result.placeResult!.transaction).toMatchObject({
//       hash: expect.any(String),
//       status: expect.any(String),
//       fee: expect.objectContaining({
//         amount: expect.any(Decimal),
//         token: expect.any(Object),
//       }),
//       raw: expect.any(Object),
//     });
//   });

//   it('should handle error if cancel or place is missing', async () => {
//     const result1 = await rujira.fin.replaceOrder(undefined as any, {} as any);
//     expect(result1).toBeDefined();
//     expect(result1.cancelResult).toBeUndefined();
//     expect(result1.placeResult).toBeUndefined();
//     expect(result1.error).toBeInstanceOf(Error);
//     expect(result1.error!.message).toMatch(/Both cancel and place must be provided/);
//     const result2 = await rujira.fin.replaceOrder({} as any, undefined as any);
//     expect(result2).toBeDefined();
//     expect(result2.cancelResult).toBeUndefined();
//     expect(result2.placeResult).toBeUndefined();
//     expect(result2.error).toBeInstanceOf(Error);
//   });

//   it('should replace multiple orders (replaceOrders) successfully', async () => {
//     const orderReq1: FinPlaceOrderRequest = {
//       ownerAddress: ownerAddress,
//       marketAddress: marketAddress,
//       side: OrderSide.BUY,
//       type: OrderType.LIMIT,
//       price: new Decimal(priceFixed),
//       amount: new Decimal('1')
//     };
//     const orderReq2: FinPlaceOrderRequest = {
//       ownerAddress: ownerAddress,
//       marketAddress: marketAddress,
//       side: OrderSide.SELL,
//       type: OrderType.LIMIT,
//       price: new Decimal(priceFixed),
//       amount: new Decimal('2')
//     };
//     const placed1 = await rujira.fin.placeOrder(orderReq1);
//     const placed2 = await rujira.fin.placeOrder(orderReq2);

//     expect(placed1.order).toBeDefined();
//     expect(placed2.order).toBeDefined();

//     const replaces = [
//       {
//         cancel: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           orderId: placed1.order.id
//         },
//         place: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           side: OrderSide.SELL,
//           type: OrderType.LIMIT,
//           price: new Decimal(priceFixed),
//           amount: new Decimal('3')
//         }
//       },
//       {
//         cancel: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           orderId: placed2.order.id
//         },
//         place: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           side: OrderSide.BUY,
//           type: OrderType.LIMIT,
//           price: new Decimal(priceFixed),
//           amount: new Decimal('4')
//         }
//       }
//     ];

//     const results = await rujira.fin.replaceOrders(replaces);

//     expect(results).toBeDefined();
//     expect(Array.isArray(results)).toBe(true);
//     expect(results.length).toBe(2);

//     for (const [i, res] of (results as Array<{ cancelResult?: any, placeResult?: any, error?: Error }>).entries()) {
//       expect(res).toBeDefined();
//       expect(res.error).toBeUndefined();

//       expect(res.cancelResult).toBeDefined();
//       expect(res.cancelResult!.order).toBeDefined();
//       expect(res.cancelResult!.order).toMatchObject({
//         id: expect.any(String),
//         status: OrderStatus.CANCELLED,
//         owner: expect.any(String),
//         side: expect.any(String),
//         type: expect.any(String),
//         price: expect.any(Decimal),
//         amount: expect.any(Decimal),
//         filledAmount: expect.any(Decimal),
//         filledPercentage: expect.any(Decimal),
//         raw: expect.any(Object),
//       });
//       expect(typeof res.cancelResult!.order.id).toBe('string');
//       expect(res.cancelResult!.order.status).toBe(OrderStatus.CANCELLED);
//       expect(res.cancelResult!.transaction).toBeDefined();
//       expect(res.cancelResult!.transaction).toMatchObject({
//         hash: expect.any(String),
//         status: expect.any(String),
//         fee: expect.objectContaining({
//           amount: expect.any(Decimal),
//           token: expect.any(Object),
//         }),
//         raw: expect.any(Object),
//       });
//       expect(typeof res.cancelResult!.transaction.hash).toBe('string');
//       expect(res.cancelResult!.transaction.fee.amount).toBeInstanceOf(Decimal);

//       expect(res.placeResult).toBeDefined();
//       expect(res.placeResult!.order).toBeDefined();
//       expect(res.placeResult!.order).toMatchObject({
//         id: expect.any(String),
//         owner: expect.any(String),
//         side: expect.any(String),
//         type: expect.any(String),
//         price: expect.any(Decimal),
//         amount: expect.any(Decimal),
//         filledAmount: expect.any(Decimal),
//         filledPercentage: expect.any(Decimal),
//         status: expect.any(String),
//         market: expect.any(Object),
//         raw: expect.any(Object),
//       });
//       expect(['buy', 'sell']).toContain(res.placeResult!.order.side);
//       expect(['limit', 'market']).toContain(res.placeResult!.order.type);
//       expect(res.placeResult!.order.price).toBeInstanceOf(Decimal);
//       expect(res.placeResult!.order.amount).toBeInstanceOf(Decimal);

//       expect(res.placeResult!.order.side).toBe(replaces[i].place.side);
//       expect(res.placeResult!.order.type).toBe(replaces[i].place.type);
//       expect(res.placeResult!.order.amount.toString()).toBe(replaces[i].place.amount.toString());
//       expect(res.placeResult!.order.price.toString()).toBe(replaces[i].place.price.toString());

//       expect(res.placeResult!.transaction).toBeDefined();
//       expect(res.placeResult!.transaction).toMatchObject({
//         hash: expect.any(String),
//         status: expect.any(String),
//         fee: expect.objectContaining({
//           amount: expect.any(Decimal),
//           token: expect.any(Object),
//         }),
//         raw: expect.any(Object),
//       });
//       expect(typeof res.placeResult!.transaction.hash).toBe('string');
//       expect(res.placeResult!.transaction.fee.amount).toBeInstanceOf(Decimal);
//     }
//   });

//   it('should replace three orders (replaceOrders) successfully', async () => {
//     const orderReqs: FinPlaceOrderRequest[] = [
//       {
//         ownerAddress: ownerAddress,
//         marketAddress: marketAddress,
//         side: OrderSide.BUY,
//         type: OrderType.LIMIT,
//         price: new Decimal(priceFixed),
//         amount: new Decimal(DECIMAL_1)
//       },
//       {
//         ownerAddress: ownerAddress,
//         marketAddress: marketAddress,
//         side: OrderSide.SELL,
//         type: OrderType.LIMIT,
//         price: new Decimal(priceFixed),
//         amount: new Decimal(DECIMAL_2)
//       },
//       {
//         ownerAddress: ownerAddress,
//         marketAddress: marketAddress,
//         side: OrderSide.BUY,
//         type: OrderType.LIMIT,
//         price: new Decimal(priceFixed),
//         amount: new Decimal(DECIMAL_3)
//       }
//     ];
//     const placed = [];
//     for (const req of orderReqs) {
//       placed.push(await rujira.fin.placeOrder(req));
//     }
//     placed.forEach(p => expect(p.order).toBeDefined());

//     const replaces = [
//       {
//         cancel: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           orderId: placed[0].order.id
//         },
//         place: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           side: OrderSide.SELL,
//           type: OrderType.LIMIT,
//           price: new Decimal(priceFixed),
//           amount: new Decimal(DECIMAL_4)
//         }
//       },
//       {
//         cancel: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           orderId: placed[1].order.id
//         },
//         place: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           side: OrderSide.BUY,
//           type: OrderType.LIMIT,
//           price: new Decimal(priceFixed),
//           amount: new Decimal(DECIMAL_5)
//         }
//       },
//       {
//         cancel: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           orderId: placed[2].order.id
//         },
//         place: {
//           ownerAddress: ownerAddress,
//           marketAddress: marketAddress,
//           side: OrderSide.SELL,
//           type: OrderType.LIMIT,
//           price: new Decimal(priceFixed),
//           amount: new Decimal(DECIMAL_6)
//         }
//       }
//     ];

//     const results = await rujira.fin.replaceOrders(replaces);
//     expect(results).toBeDefined();
//     expect(Array.isArray(results)).toBe(true);
//     expect(results.length).toBe(3);

//     for (const [i, res] of (results as Array<{ cancelResult?: any, placeResult?: any, error?: Error }>).entries()) {
//       expect(res).toBeDefined();
//       expect(res.error).toBeUndefined();
//       expect(res.cancelResult).toBeDefined();
//       expect(res.cancelResult!.order).toBeDefined();
//       expect(res.cancelResult!.order.status).toBe(OrderStatus.CANCELLED);
//       expect(res.cancelResult!.transaction).toBeDefined();
//       expect(res.placeResult).toBeDefined();
//       expect(res.placeResult!.order).toBeDefined();
//       expect(['buy', 'sell']).toContain(res.placeResult!.order.side);
//       expect(['limit', 'market']).toContain(res.placeResult!.order.type);
//       expect(res.placeResult!.order.price).toBeInstanceOf(Decimal);
//       expect(res.placeResult!.order.amount).toBeInstanceOf(Decimal);
//       expect(res.placeResult!.order.side).toBe(replaces[i].place.side);
//       expect(res.placeResult!.order.type).toBe(replaces[i].place.type);
//       expect(res.placeResult!.order.amount.toString()).toBe(replaces[i].place.amount.toString());
//       expect(res.placeResult!.order.price.toString()).toBe(replaces[i].place.price.toString());
//       expect(res.placeResult!.transaction).toBeDefined();
//       expect(typeof res.placeResult!.transaction.hash).toBe('string');
//       expect(res.placeResult!.transaction.fee.amount).toBeInstanceOf(Decimal);
//     }
//   });
// });
