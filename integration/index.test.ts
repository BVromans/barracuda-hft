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
	DECIMAL_100,
	Integer,
	Indicator,
	IndicatorId,
	MarketAddress,
	MarketStatus,
	MarketSymbol,
	OrderBookOrder,
	OrderSide,
	OrderStatus,
	OrderType,
	SystemStatus,
	TickerPrice,
	Token,
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
let transactionHash: TransactionHash;
let firstMarketSymbol: MarketSymbol;
let firstMarketAddress: MarketAddress;
let firstMarketBaseTokenAddress: TokenAddress;
let firstMarketQuoteTokenAddress: TokenAddress;
let firstMarketBaseTokenSymbol: TokenSymbol;
let firstMarketQuoteTokenSymbol: TokenSymbol;
let firstMarketBaseTokenAmount: Amount;
let firstMarketQuoteTokenAmount: Amount;
let secondMarketSymbol: MarketSymbol;
let secondMarketAddress: MarketAddress;
let secondMarketBaseTokenAddress: TokenAddress;
let secondMarketQuoteTokenAddress: TokenAddress;
let secondMarketBaseTokenSymbol: TokenSymbol;
let secondMarketQuoteTokenSymbol: TokenSymbol;
let secondMarketBaseTokenAmount: Amount;
let secondMarketQuoteTokenAmount: Amount;
let testsTimeout: number;

const indicatorMap = ["bbands", "bop", "rsi", "macd", "atr", "vwap"]

beforeAll(async () => {
	const requiredProperties = [
		'rujira.wallet.mnemonic',
		'rujira.wallet.publicKeys.thor',
		'tests.integration.transaction_hash',
		'tests.integration.first_market_symbol',
		'tests.integration.first_market_address',
		'tests.integration.first_market_base_token_address',
		'tests.integration.first_market_quote_token_address',
		'tests.integration.first_market_base_token_symbol',
		'tests.integration.first_market_quote_token_symbol',
		'tests.integration.first_market_base_token_amount',
		'tests.integration.first_market_quote_token_amount',
		'tests.integration.second_market_symbol',
		'tests.integration.second_market_address',
		'tests.integration.second_market_base_token_address',
		'tests.integration.second_market_quote_token_address',
		'tests.integration.second_market_base_token_symbol',
		'tests.integration.second_market_quote_token_symbol',
		'tests.integration.second_market_base_token_amount',
		'tests.integration.second_market_quote_token_amount',
	];

	const missingProperties = requiredProperties.filter(path => !properties.getAs<any>(path));

	if (missingProperties.length > 0) {
		throw new Error(`Missing required properties: ${missingProperties.join(', ')}`);
	}

	walletMnemonic = properties.getAs<WalletMnemonic>('rujira.wallet.mnemonic');
	walletPublicKeyThor = properties.getAs<WalletAddress>('rujira.wallet.publicKeys.thor');
	transactionHash = properties.getAs<TransactionHash>('tests.integration.transaction_hash');
	firstMarketSymbol = properties.getAs<MarketSymbol>('tests.integration.first_market_symbol').toUpperCase();
	firstMarketAddress = properties.getAs<MarketAddress>('tests.integration.first_market_address').toLowerCase();
	firstMarketBaseTokenAddress = properties.getAs<TokenAddress>('tests.integration.first_market_base_token_address').toLowerCase();
	firstMarketQuoteTokenAddress = properties.getAs<TokenAddress>('tests.integration.first_market_quote_token_address').toLowerCase();
	firstMarketBaseTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.first_market_base_token_symbol').toUpperCase();
	firstMarketQuoteTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.first_market_quote_token_symbol').toUpperCase();
	firstMarketBaseTokenAmount = Decimal(properties.getAs<Amount>('tests.integration.first_market_base_token_amount'));
	firstMarketQuoteTokenAmount = Decimal(properties.getAs<Amount>('tests.integration.first_market_quote_token_amount'));
	secondMarketSymbol = properties.getAs<MarketSymbol>('tests.integration.second_market_symbol').toUpperCase();
	secondMarketAddress = properties.getAs<MarketAddress>('tests.integration.second_market_address').toLowerCase();
	secondMarketBaseTokenAddress = properties.getAs<TokenAddress>('tests.integration.second_market_base_token_address').toLowerCase();
	secondMarketQuoteTokenAddress = properties.getAs<TokenAddress>('tests.integration.second_market_quote_token_address').toLowerCase();
	secondMarketBaseTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.second_market_base_token_symbol').toUpperCase();
	secondMarketQuoteTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.second_market_quote_token_symbol').toUpperCase();
	secondMarketBaseTokenAmount = Decimal(properties.getAs<Amount>('tests.integration.second_market_base_token_amount'));
	secondMarketQuoteTokenAmount = Decimal(properties.getAs<Amount>('tests.integration.second_market_quote_token_amount'));
	testsTimeout = Number(properties.getAs<Integer>('tests.integration.timeout'));

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
		describe.skip("status", async () => {
			it("should be up", async () => {
				const result = await rujira.fin.getStatus({});

				expect(result).toBeDefined();
				expect(result.status).toBe(SystemStatus.UP);
				expect(result.error).toBeUndefined();
			});
		});

		describe.skip("transactions", () => {

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
				expect(result.fee.amount.toNumber()).toBeGreaterThan(0);

				expect(result.fee.token).toBeDefined();
				expect(result.fee.token.address).toBe(rujira.fin.feePaymentToken.address);
				expect(result.fee.token.symbol).toBe(rujira.fin.feePaymentToken.symbol);
				expect(result.fee.token.name).toBe(rujira.fin.feePaymentToken.name);
				expect(result.fee.token.decimals).toBe(rujira.fin.feePaymentToken.decimals);
				expect(result.fee.token.raw).toBeDefined();

				expect(result.raw).toBeDefined();
			});
		});

		describe.skip("tokens", () => {
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

				expect(baseToken!.address).toBeDefined();
				expect(baseToken!.address.length).toBeGreaterThan(0);
				expect(baseToken!.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(baseToken!.name).toBeDefined();
				expect(baseToken!.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken!.raw).toBeDefined();

				expect(quoteToken!.address).toBeDefined();
				expect(quoteToken!.address.length).toBeGreaterThan(0);
				expect(quoteToken!.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(quoteToken!.name).toBeDefined();
				expect(quoteToken!.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken!.raw).toBeDefined();
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

		describe.skip("markets", () => {
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
				if (!secondMarket) throw new Error("Second market not found");

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

				for (const [address, market] of result.entries()) {
					expect(market).toBeDefined();
					expect(market.address.length).toBeGreaterThan(address.length);

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
				if (!firstMarket) throw new Error("First market not found");

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
				if (!secondMarket) throw new Error("Second market not found");

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
				expect(result.market.tokens.quote.name).toBeDefined;
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

		describe.skip("candles", () => {
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

				const firstTimestamp = new Date(firstCandle!.timestamp * 1000);
				const secondTimestamp = new Date(secondCandle!.timestamp * 1000);

				const timeDifferenceMs = Math.abs(secondTimestamp.getTime() - firstTimestamp.getTime());
				const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);

				console.log(`First candle timestamp: ${firstTimestamp.toISOString()}`);
				console.log(`Second candle timestamp: ${secondTimestamp.toISOString()}`);
				console.log(`Time difference: ${timeDifferenceMinutes.toFixed(2)} minutes`);

				expect(timeDifferenceMinutes).toBeCloseTo(1000, 0.05);

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

		describe.skip("indicators", () => {

			it("should be able to get indicators", async () => {

				const result = await rujira.fin.getIndicators({ marketAddress: firstMarketAddress });
				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(0);

				for (const [indicatorId, indicatorData] of result.entries()) {
					expect(indicatorId).toBeDefined();
					expect(indicatorId.length).toBeGreaterThan(0);

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
				const specificIndicator = indicatorMap[0];

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
					expect(indicatorId.length).toBeGreaterThan(0);

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
					expect(indicatorId.length).toBeGreaterThan(0);

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

				const indicators = [indicatorMap [0]];

				const result = await rujira.fin.getIndicators({
					marketAddress: firstMarketAddress,
					indicatorsIds: indicators
				});

				expect(result).toBeDefined();
				expect(result.size).toBe(indicators.length);

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

				const indicators = [indicatorMap[0]];

				const result = await rujira.fin.getIndicators({
					marketSymbol: firstMarketSymbol,
					indicatorsIds: indicators
				});

				expect(result).toBeDefined();
				expect(result.size).toBe(indicators.length);

				for (const indicatorId of indicators) {
					const indicatorData = result.get(indicatorId);
					expect(indicatorData).toBeDefined();
					expect(indicatorData?.indicator.id).toBe(indicatorId);
					expect(indicatorData?.indicator.name).toBeDefined();
					expect(indicatorData?.value).toBeDefined();
				}

				for (const [indicatorId] of result.entries()) {
					expect(indicators).toContain(indicatorId);
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

				for (const [tokenAddress, tokenBalance] of result.tokens.entries()) {
					expect(tokenBalance).toBeDefined();
					expect(tokenBalance.token).toBeDefined();
					expect(tokenBalance.token.address).toBeDefined();
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

				if (result.tokens.has(firstMarketBaseTokenAddress)) {
					const marketBaseTokenBalance = result.tokens.getOrThrow(firstMarketBaseTokenAddress);
					expect(marketBaseTokenBalance).toBeDefined();
					expect(marketBaseTokenBalance.token.address).toBe(firstMarketBaseTokenAddress);
					expect(marketBaseTokenBalance.token.symbol).toBe(firstMarketBaseTokenSymbol);
				}

				if (result.tokens.has(firstMarketQuoteTokenAddress)) {
					const marketQuoteTokenBalance = result.tokens.getOrThrow(firstMarketQuoteTokenAddress);
					expect(marketQuoteTokenBalance).toBeDefined();
					expect(marketQuoteTokenBalance.token.address).toBe(firstMarketQuoteTokenAddress);
					expect(marketQuoteTokenBalance.token.symbol).toBe(firstMarketQuoteTokenSymbol);
				}

				if (result.tokens.has(rujira.fin.nativeToken.address)) {
					const nativeTokenBalance = result.tokens.getOrThrow(rujira.fin.nativeToken.address);
					expect(nativeTokenBalance.token.address).toBe(rujira.fin.nativeToken.address);
					expect(nativeTokenBalance.token.symbol).toBe(rujira.fin.nativeToken.symbol);
				}

				if (result.tokens.has(rujira.fin.usdToken.address)) {
					const usdTokenBalance = result.tokens.getOrThrow(rujira.fin.usdToken.address);
					expect(usdTokenBalance.token.address).toBe(rujira.fin.usdToken.address);
					expect(usdTokenBalance.token.symbol).toBe(rujira.fin.usdToken.symbol);
				}

				if (result.tokens.has(rujira.fin.feePaymentToken.address)) {
					const feePaymentTokenBalance = result.tokens.getOrThrow(rujira.fin.feePaymentToken.address);
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

		describe("orders", () => {
			it("PHASE 1: Complete order lifecycle - initialization, market data", async () => {
				/*
				 * PHASE 1: INITIALIZATION AND MARKET DATA
				 * ========================================
				 * 1. Initialize Rujira client with wallet credentials
				 * 2. Get market information for both markets
				 * 3. Get market tickers and order books
				 * 4. Get wallet balances for tokens 1, 2, and 3
				 * 5. Verify market liquidity and pricing
				 */

				// 1. Initialize Rujira client with wallet credentials
				expect(rujira).toBeDefined();
				expect(rujira.fin).toBeDefined();
				expect(walletPublicKeyThor).toBeDefined();

				// 2. Get market information for both markets
				const firstMarket = await rujira.fin.getMarket({
					address: firstMarketAddress,
					symbol: firstMarketSymbol,
				});
				expect(firstMarket).toBeDefined();
				expect(firstMarket.address).toBe(firstMarketAddress);
				expect(firstMarket.symbol).toBe(firstMarketSymbol);

				const secondMarket = await rujira.fin.getMarket({
					address: secondMarketAddress,
					symbol: secondMarketSymbol,
				});
				expect(secondMarket).toBeDefined();
				expect(secondMarket.address).toBe(secondMarketAddress);
				expect(secondMarket.symbol).toBe(secondMarketSymbol);

				// 3. Get market tickers and order books
				const firstMarketTicker = await rujira.fin.getTicker({
					marketAddress: firstMarketAddress,
					marketSymbol: firstMarketSymbol,
				});
				expect(firstMarketTicker).toBeDefined();
				expect(firstMarketTicker.middlePrice).toBeDefined();

				const secondMarketTicker = await rujira.fin.getTicker({
					marketAddress: secondMarketAddress,
					marketSymbol: secondMarketSymbol,
				});
				expect(secondMarketTicker).toBeDefined();
				expect(secondMarketTicker.middlePrice).toBeDefined();

				const firstMarketOrderBook = await rujira.fin.getOrderBook({
					marketAddress: firstMarketAddress,
					marketSymbol: firstMarketSymbol,
				});
				expect(firstMarketOrderBook).toBeDefined();
				expect(firstMarketOrderBook.book).toBeDefined();

				const secondMarketOrderBook = await rujira.fin.getOrderBook({
					marketAddress: secondMarketAddress,
					marketSymbol: secondMarketSymbol,
				});
				expect(secondMarketOrderBook).toBeDefined();
				expect(secondMarketOrderBook.book).toBeDefined();

				// 4. Get wallet balances for tokens 1, 2, and 3
				const walletBalances = await rujira.fin.getBalances({
					walletAddress: walletPublicKeyThor,
				});
				expect(walletBalances).toBeDefined();
				expect(walletBalances.tokens.size).toBeGreaterThan(DECIMAL_0.toNumber());

				// Verify balances for specific tokens
				const firstMarketBaseTokenBalance = walletBalances.tokens.getOrThrow(firstMarketBaseTokenSymbol);
				expect(firstMarketBaseTokenBalance).toBeDefined();
				expect(firstMarketBaseTokenBalance.balances.token.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				const firstMarketQuoteTokenBalance = walletBalances.tokens.getOrThrow(firstMarketQuoteTokenSymbol);
				expect(firstMarketQuoteTokenBalance).toBeDefined();
				expect(firstMarketQuoteTokenBalance.balances.token.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				const secondMarketBaseTokenBalance = walletBalances.tokens.getOrThrow(secondMarketBaseTokenSymbol);
				expect(secondMarketBaseTokenBalance).toBeDefined();
				expect(secondMarketBaseTokenBalance.balances.token.free.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

				// 5. Verify market liquidity and pricing
				expect(firstMarketTicker.middlePrice.baseToQuote).toBeDefined();
				expect(firstMarketTicker.middlePrice.baseToQuote!.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
				expect(secondMarketTicker.middlePrice.baseToQuote).toBeDefined();
				expect(secondMarketTicker.middlePrice.baseToQuote!.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());

				// Verify order book has liquidity
				expect(firstMarketOrderBook.book.bestBid).toBeDefined();
				expect(firstMarketOrderBook.book.bestAsk).toBeDefined();
				expect(secondMarketOrderBook.book.bestBid).toBeDefined();
				expect(secondMarketOrderBook.book.bestAsk).toBeDefined();

				console.log(`✅ PHASE 1 COMPLETED: Markets initialized and verified`);
				console.log(`   Market 1: ${firstMarketSymbol} (${firstMarketAddress})`);
				console.log(`   Market 2: ${secondMarketSymbol} (${secondMarketAddress})`);
				console.log(`   Wallet: ${walletPublicKeyThor}`);

			it('PHASE 2: Complete order lifecycle - single order operations', async () => {
				/*
				 * PHASE 2: SINGLE ORDER OPERATIONS
				 * =================================
				 * 6. Create fixedPrice buy order 1 for market 1 (RUJI/USDC)
				 * 7. Create fixedPrice sell order 2 for market 2 (NAMI/USDC)
				 * 8. Create market sell order 3 for market 1
				 * 9. Create market buy order 4 for market 2
				 */

				// 6. Create fixedPrice buy order 1 for market 1 (RUJI/USDC)
				console.log(`🔄 Creating fixedPrice buy order 1 for market 1...`);
				const order1Request = {
					ownerAddress: walletPublicKeyThor,
					marketAddress: firstMarketAddress,
					marketSymbol: firstMarketSymbol,
					market: firstMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.BUY,
					amount: firstMarketBaseTokenAmount,
					price: firstMarketTicker.middlePrice.baseToQuote!.mul(DECIMAL_1.minus(DECIMAL_1.div(DECIMAL_100))) // 1% below market price
				};

				const order1 = await rujira.fin.placeOrder(order1Request);
				expect(order1).toBeDefined();
				expect(order1.order).toBeDefined();
				expect(order1.transaction).toBeDefined();
				expect(order1.order.id).toBeDefined();
				expect(order1.order.market.address).toBe(firstMarketAddress);
				expect(order1.order.market.symbol).toBe(firstMarketSymbol);
				expect(order1.order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
				expect(order1.order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(order1.order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
				expect(order1.order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(order1.order.market.decimals).toBe(firstMarket.decimals);
				expect(order1.order.market.status).toBe(MarketStatus.ACTIVE);
				expect(order1.order.market.raw).toBeDefined();
				expect(order1.order.market.raw.base.length).toBeGreaterThan(DECIMAL_0.toNumber());
				expect(order1.order.market.raw.quote.length).toBeGreaterThan(DECIMAL_0.toNumber());
				expect(order1.order.market.raw.base[0].address).toBe(firstMarketBaseTokenAddress);
				expect(order1.order.market.raw.quote[0].address).toBe(firstMarketQuoteTokenAddress);
				expect(order1.order.ownerAddress).toBe(walletPublicKeyThor);
				expect(order1.order.status).toBe(OrderStatus.OPEN);
				expect(order1.order.side).toBe(OrderSide.BUY);
				expect(order1.order.type).toBe(OrderType.FIXED_PRICE);

				// Verify order placement success
				console.log(`✅ Order 1 created successfully: ${order1.order.id}`);

				// Check the available wallet balances from tokens 1 and 2
				const balancesAfterOrder1 = await rujira.fin.getBalances({
					walletAddress: walletPublicKeyThor,
				});
				expect(balancesAfterOrder1).toBeDefined();

				// Get the open order 1 and verify details
				if (order1Request.price) {
					const retrievedOrder1 = await rujira.fin.getOrder({
						ownerAddress: walletPublicKeyThor,
						marketSymbol: firstMarketSymbol,
						orderSide: OrderSide.BUY,
						orderPrice: order1Request.price
					});
					expect(retrievedOrder1).toBeDefined();
					expect(retrievedOrder1.id).toBe(order1.order.id!);
				}

				// 7. Create fixedPrice sell order 2 for market 2 (NAMI/USDC) - slightly better than market price
				console.log(`🔄 Creating fixedPrice sell order 2 for market 2...`);
				const order2Request = {
					ownerAddress: walletPublicKeyThor,
					marketAddress: secondMarketAddress,
					marketSymbol: secondMarketSymbol,
					market: secondMarket,
					type: OrderType.FIXED_PRICE,
					side: OrderSide.SELL,
					amount: secondMarketBaseTokenAmount,
					price: secondMarketTicker.middlePrice.baseToQuote!.mul(DECIMAL_1.plus(DECIMAL_1.div(DECIMAL_100))) // 1% above market price
				};

				const order2 = await rujira.fin.placeOrder(order2Request);
				expect(order2).toBeDefined();
				expect(order2.order).toBeDefined();
				expect(order2.transaction).toBeDefined();
				expect(order2.order.id).toBeDefined();
				expect(order2.order.status).toBe(OrderStatus.OPEN);
				expect(order2.order.side).toBe(OrderSide.SELL);
				expect(order2.order.type).toBe(OrderType.FIXED_PRICE);

				// Verify order placement success
				console.log(`✅ Order 2 created successfully: ${order2.order.id}`);

				// Check the available wallet balances from tokens 2 and 3
				const balancesAfterOrder2 = await rujira.fin.getBalances({
					walletAddress: walletPublicKeyThor,
				});
				expect(balancesAfterOrder2).toBeDefined();

				// Get the open order 2 and verify details
				if (order2Request.price) {
					const retrievedOrder2 = await rujira.fin.getOrder({
						ownerAddress: walletPublicKeyThor,
						marketSymbol: secondMarketSymbol,
						orderSide: OrderSide.SELL,
						orderPrice: order2Request.price
					});
					expect(retrievedOrder2).toBeDefined();
					expect(retrievedOrder2.id).toBe(order2.order.id!);
				}

				// 8. Create market sell order 3 for market 1
				console.log(`🔄 Creating market sell order 3 for market 1...`);
				const order3Request = {
					ownerAddress: walletPublicKeyThor,
					marketAddress: firstMarketAddress,
					marketSymbol: firstMarketSymbol,
					market: firstMarket,
					type: OrderType.MARKET,
					side: OrderSide.SELL,
					amount: firstMarketBaseTokenAmount.div(DECIMAL_100), // Small amount for market order
					maximumSlippagePercentage: Decimal('2.5') // 2.5% slippage tolerance
				};

				const order3 = await rujira.fin.placeOrder(order3Request);
				expect(order3).toBeDefined();
				expect(order3.order).toBeDefined();
				expect(order3.transaction).toBeDefined();
				expect(order3.order.id).toBeDefined();
				expect(order3.order.type).toBe(OrderType.MARKET);
				expect(order3.order.side).toBe(OrderSide.SELL);

				// Verify order execution (market orders should execute immediately)
				console.log(`✅ Order 3 (market sell) executed: ${order3.order.id}`);

				// Check the available wallet balances from tokens 1 and 2
				const balancesAfterOrder3 = await rujira.fin.getBalances({
					walletAddress: walletPublicKeyThor,
				});
				expect(balancesAfterOrder3).toBeDefined();

				// Get the filled order 3 and verify execution details
				if (order3.order.price) {
					const retrievedOrder3 = await rujira.fin.getOrder({
						ownerAddress: walletPublicKeyThor,
						marketSymbol: firstMarketSymbol,
						orderSide: OrderSide.SELL,
						orderPrice: order3.order.price
					});
					expect(retrievedOrder3).toBeDefined();
					expect(retrievedOrder3.id).toBe(order3.order.id!);
				}

				// 9. Create market buy order 4 for market 2
				console.log(`🔄 Creating market buy order 4 for market 2...`);
				const order4Request = {
					ownerAddress: walletPublicKeyThor,
					marketAddress: secondMarketAddress,
					marketSymbol: secondMarketSymbol,
					market: secondMarket,
					type: OrderType.MARKET,
					side: OrderSide.BUY,
					amount: secondMarketBaseTokenAmount.div(DECIMAL_100), // Small amount for market order
					maximumSlippagePercentage: Decimal('2.5') // 2.5% slippage tolerance
				};

				const order4 = await rujira.fin.placeOrder(order4Request);
				expect(order4).toBeDefined();
				expect(order4.order).toBeDefined();
				expect(order4.transaction).toBeDefined();
				expect(order4.order.id).toBeDefined();
				expect(order4.order.type).toBe(OrderType.MARKET);
				expect(order4.order.side).toBe(OrderSide.BUY);

				// Verify order execution (market orders should execute immediately)
				console.log(`✅ Order 4 (market buy) executed: ${order4.order.id}`);

				// Check the available wallet balances from tokens 2 and 3
				const balancesAfterOrder4 = await rujira.fin.getBalances({
					walletAddress: walletPublicKeyThor,
				});
				expect(balancesAfterOrder4).toBeDefined();

				// Get the filled order 4 and verify execution details
				if (order4.order.price) {
					const retrievedOrder4 = await rujira.fin.getOrder({
						ownerAddress: walletPublicKeyThor,
						marketSymbol: secondMarketSymbol,
						orderSide: OrderSide.BUY,
						orderPrice: order4.order.price
					});
					expect(retrievedOrder4).toBeDefined();
					expect(retrievedOrder4.id).toBe(order4.order.id!);
				}

				console.log(`✅ PHASE 2 COMPLETED: All single orders created and verified`);
				console.log(`   Order 1 (fixedPrice buy): ${order1.order.id} - Status: ${order1.order.status}`);
				console.log(`   Order 2 (fixedPrice sell): ${order2.order.id} - Status: ${order2.order.status}`);
					console.log(`   Order 3 (market sell): ${order3.order.id} - Status: ${order3.order.status}`);
					console.log(`   Order 4 (market buy): ${order4.order.id} - Status: ${order4.order.status}`);
				});
			});


		});




// describe.skip("orderbook", () => {
		// 	it("should be able to get the order book for a market", async () => {
		// 		const maximumNumberOfOrders = 10;

		// 		const result = await rujira.fin.getOrderBook({
		// 			marketAddress: firstMarketAddress,
		// 			marketSymbol: undefined,
		// 			maximumNumberOfOrders: maximumNumberOfOrders,
		// 		});

		// 		expect(result).toBeDefined();

		// 		expect(result.market).toBeDefined();
		// 		expect(result.market.address).toBe(firstMarketAddress);
		// 		expect(result.market.symbol).toBe(firstMarketSymbol);

		// 		expect(result.market.tokens.base).toBeDefined();
		// 		expect(result.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
		// 		expect(result.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
		// 		expect(result.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
		// 		expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 		expect(result.market.tokens.base.raw).toBeDefined();

		// 		expect(result.market.tokens.quote).toBeDefined();
		// 		expect(result.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
		// 		expect(result.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
		// 		expect(result.market.tokens.quote.name).toBe(firstMarketQuoteTokenSymbol);
		// 		expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 		expect(result.market.tokens.quote.raw).toBeDefined();

		// 		expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 		expect(result.market.status).toBe(MarketStatus.ACTIVE);
		// 		expect(result.market.raw).toBeDefined();

		// 		expect(result.book).toBeDefined();

		// 		const asks = result.book.asks;
		// 		const bids = result.book.bids;

		// 		expect(asks.size).toBeLessThanOrEqual(maximumNumberOfOrders);
		// 		expect(bids.size).toBeLessThanOrEqual(maximumNumberOfOrders);

		// 		expect(asks.size).toBe(result.raw.base.length);
		// 		expect(bids.size).toBe(result.raw.quote.length);

		// 		if (bids.size > 0) {
		// 			const firstBidOrder = bids.get(0);
		// 			if (!firstBidOrder) throw new Error("First bid order not found");
		// 			expect(firstBidOrder).toBeDefined();
		// 			expect(firstBidOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(firstBidOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(firstBidOrder.raw).toBeDefined();

		// 			const bestBid = get<OrderBookOrder>(
		// 				result.book.bestBid,
		// 				`Best bid order not found` as any
		// 			);
		// 			expect(bestBid).toBeDefined();
		// 			expect(bestBid.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(bestBid.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(bestBid.raw).toBeDefined();
		// 		} else {
		// 			expect(result.book.bestBid).toBeUndefined();
		// 		}

		// 		if (asks.size > 0) {
		// 			const firstAskOrder = asks.get(0);
		// 			expect(firstAskOrder).toBeDefined();
		// 			if (!firstAskOrder) throw new Error("First ask order not found");

		// 			expect(firstAskOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(firstAskOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(firstAskOrder.raw).toBeDefined();

		// 			const bestAsk = get<OrderBookOrder>(
		// 				result.book.bestAsk,
		// 				`Best ask order not found` as any
		// 			);
		// 			expect(bestAsk).toBeDefined();
		// 			expect(bestAsk.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(bestAsk.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(bestAsk.raw).toBeDefined();
		// 		} else {
		// 			expect(result.book.bestAsk).toBeUndefined();
		// 		}

		// 		if (asks.size > 0 && bids.size > 0) {
		// 			const bestAsk = get<OrderBookOrder>(
		// 				result.book.bestAsk,
		// 				`Best ask order not found` as any
		// 			);
		// 			const bestBid = get<OrderBookOrder>(
		// 				result.book.bestBid,
		// 				`Best bid order not found` as any
		// 			);
		// 			const baseToQuoteMiddlePrice = get<Amount>(result.statistics.middlePrice.baseToQuote);
		// 			expect(baseToQuoteMiddlePrice).toBeDefined();
		// 			expect(baseToQuoteMiddlePrice.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(baseToQuoteMiddlePrice.toNumber()).toBeLessThanOrEqual(bestAsk.price.toNumber());
		// 			expect(baseToQuoteMiddlePrice.toNumber()).toBeGreaterThanOrEqual(bestBid.price.toNumber());

		// 			const quoteToBaseMiddlePrice = get<Amount>(result.statistics.middlePrice.quoteToBase);
		// 			expect(quoteToBaseMiddlePrice).toBeDefined();
		// 			expect(quoteToBaseMiddlePrice.toNumber()).toBe(DECIMAL_1.div(baseToQuoteMiddlePrice).toNumber());
		// 		} else if (asks.size > 0 && bids.size === 0) {
		// 			expect(result.book.bestAsk).toBeDefined();
		// 			expect(result.book.bestBid).toBeUndefined();
		// 			expect(result.statistics.middlePrice.baseToQuote).toBeUndefined();
		// 			expect(result.statistics.middlePrice.quoteToBase).toBeUndefined();
		// 		} else if (bids.size > 0 && asks.size === 0) {
		// 			expect(result.book.bestBid).toBeDefined();
		// 			expect(result.book.bestAsk).toBeUndefined();
		// 			expect(result.statistics.middlePrice.baseToQuote).toBeUndefined();
		// 			expect(result.statistics.middlePrice.quoteToBase).toBeUndefined();
		// 		} else {
		// 			expect(result.book.bestAsk).toBeUndefined();
		// 			expect(result.book.bestBid).toBeUndefined();
		// 			expect(result.statistics.middlePrice.baseToQuote).toBeUndefined();
		// 			expect(result.statistics.middlePrice.quoteToBase).toBeUndefined();
		// 		}
		// 		expect(result.raw).toBeDefined();
		// 	});
		// });


		// describe.skip("withdraw", () => {
		// 	it("should be able to withdraw market by address", async () => {
		// 			const result = await rujira.fin.withdrawAllFilledOrders({
		// 				marketAddress: firstMarketAddress,
		// 				marketSymbol: undefined,
		// 				ownerAddress: walletPublicKeyThor
		// 			});

		// 			expect(result).toBeDefined();

		// 			expect(result.orders).toBeDefined();
		// 			expect(result.orders.size).toBeGreaterThan(0);

		// 			for (const order of result.orders.values()) {
		// 				expect(order).toBeDefined();
		// 				expect(order.id).toBeDefined();
		// 				expect(order.market).toBeDefined();
		// 				expect(order.market.address).toBe(firstMarketAddress);
		// 				expect(order.market.symbol).toBe(firstMarketSymbol);
		// 				expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(order.market.status).toBe(MarketStatus.ACTIVE);
		// 				expect(order.market.raw).toBeDefined();
		// 				expect(order.ownerAddress).toBeDefined();
		// 				expect(order.side).toBeDefined();
		// 				expect(order.type).toBeDefined();
		// 				expect(order.amount).toBeDefined();
		// 				expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.price).toBeDefined();
		// 				expect(order.price?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.filledPercentage).toBeDefined();
		// 				expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.status).toBe(OrderStatus.FILLED);
		// 				expect(order.creationTimestamp).toBeDefined();
		// 				expect(order.updateTimestamp).toBeDefined();
		// 				expect(order.raw).toBeDefined();
		// 			}

		// 			expect(result.transactions).toBeDefined();
		// 			expect(result.transactions.size).toBeGreaterThan(0);

		// 			for (const transaction of result.transactions.values()) {
		// 				expect(transaction).toBeDefined();
		// 				expect(transaction.hash).toBeDefined();
		// 				expect(transaction.status).toBe(TransactionStatus.SUCCESS);
		// 				expect(transaction.fee).toBeDefined();
		// 				expect(transaction.fee.amount).toBeDefined();
		// 				expect(transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(transaction.fee.token).toBeDefined();
		// 				expect(transaction.fee.token.address).toBeDefined();
		// 				expect(transaction.fee.token.symbol).toBeDefined();
		// 				expect(transaction.fee.token.name).toBeDefined();
		// 				expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(transaction.fee.token.raw).toBeDefined();
		// 				expect(transaction.raw).toBeDefined();
		// 			}
		// 	});

		// 	it("should be able to withdraw market by symbol", async () => {
		// 		const result = await rujira.fin.withdrawAllFilledOrders({
		// 			marketAddress: undefined,
		// 			marketSymbol: firstMarketSymbol,
		// 			ownerAddress: walletPublicKeyThor,
		// 		});

		// 		expect(result).toBeDefined();

		// 		expect(result.orders).toBeDefined();
		// 		expect(result.orders.size).toBeGreaterThan(0);

		// 		for (const order of result.orders.values()) {
		// 			expect(order).toBeDefined();
		// 			expect(order.id).toBeDefined();
		// 			expect(order.market).toBeDefined();
		// 			expect(order.market.address).toBe(firstMarketAddress);
		// 			expect(order.market.symbol).toBe(firstMarketSymbol);
		// 			expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(order.market.status).toBe(MarketStatus.ACTIVE);
		// 			expect(order.market.raw).toBeDefined();
		// 			expect(order.ownerAddress).toBeDefined();
		// 			expect(order.side).toBeDefined();
		// 			expect(order.type).toBeDefined();
		// 			expect(order.amount).toBeDefined();
		// 			expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 			expect(order.price).toBeDefined();
		// 			expect(order.price?.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 			expect(order.filledPercentage).toBeDefined();
		// 			expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 			expect(order.status).toBe(OrderStatus.FILLED);
		// 			expect(order.creationTimestamp).toBeDefined();
		// 			expect(order.updateTimestamp).toBeDefined();
		// 			expect(order.raw).toBeDefined();
		// 		}

		// 		expect(result.transactions).toBeDefined();
		// 		expect(result.transactions.size).toBeGreaterThan(0);

		// 		for (const transaction of result.transactions.values()) {
		// 			expect(transaction).toBeDefined();
		// 			expect(transaction.hash).toBeDefined();
		// 			expect(transaction.status).toBe(TransactionStatus.SUCCESS);
		// 			expect(transaction.fee).toBeDefined();
		// 			expect(transaction.fee.amount).toBeDefined();
		// 			expect(transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 			expect(transaction.fee.token).toBeDefined();
		// 			expect(transaction.fee.token.address).toBeDefined();
		// 			expect(transaction.fee.token.symbol).toBeDefined();
		// 			expect(transaction.fee.token.name).toBeDefined();
		// 			expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(transaction.fee.token.raw).toBeDefined();
		// 			expect(transaction.raw).toBeDefined();
		// 		}
		// 	});
		// });
	});
});

