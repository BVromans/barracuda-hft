import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import "dotenv/config";
import { properties } from "../src/properties";
import { Rujira } from "../src/rujira";
import {
	Amount,
	BIG_NUMBER_0,
	Candle,
	DECIMAL_0,
	Integer,
	MarketAddress,
	MarketStatus,
	MarketSymbol,
	OrderBookOrder,
	OrderStatus,
	SystemStatus,
	Token,
	TokenAddress,
	TokenSymbol,
	TransactionHash,
	TransactionStatus,
	Wallet,
	WalletAddress,
	WalletMnemonic
} from "../src/types";
import { getOrThrow } from "../src/utils";
import Decimal from "decimal.js";

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

		describe("tokens", () => {
			it("should be able to get a token by address", async () => {
				const result = await rujira.fin.getToken({
					address: firstMarketBaseTokenAddress,
				});

				// noinspection DuplicatedCode
				expect(result).toBeDefined();
				expect(result.address.toLowerCase()).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(result.symbol.toUpperCase()).toBe(firstMarketBaseTokenSymbol.toUpperCase());
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
				expect(result.address.toLowerCase()).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(result.symbol.toUpperCase()).toBe(firstMarketBaseTokenSymbol.toUpperCase());
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

				const baseToken = result.getOrThrow(firstMarketBaseTokenAddress.toLowerCase());
				expect(baseToken).toBeDefined();
				expect(baseToken.address.toLowerCase()).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(baseToken.symbol.toUpperCase()).toBe(firstMarketBaseTokenSymbol.toUpperCase());
				expect(baseToken.name).toBeDefined();
				expect(baseToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken.raw).toBeDefined();

				const quoteToken = result.getOrThrow(firstMarketQuoteTokenAddress.toLowerCase());
				expect(quoteToken).toBeDefined();
				expect(quoteToken.address.toLowerCase()).toBe(firstMarketQuoteTokenAddress.toLowerCase());
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

				const baseToken = getOrThrow<Token>(
					result.valueSeq().find((token: Token) => token.symbol === firstMarketBaseTokenSymbol),
					`Token with symbol ${firstMarketBaseTokenSymbol} not found`
				);
				const quoteToken = getOrThrow<Token>(
					result.valueSeq().find((token: Token) => token.symbol === firstMarketQuoteTokenSymbol),
					`Token with symbol ${firstMarketQuoteTokenSymbol} not found`
				);

				expect(baseToken).toBeDefined();
				expect(baseToken.address.toLowerCase()).toBe(firstMarketBaseTokenAddress.toLowerCase());
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
			});

			it("should be able to get all tokens and validate base and quote tokens", async () => {
				const result = await rujira.fin.getAllTokens({});

				expect(result).toBeDefined();
				expect(result.size).toBeGreaterThan(1);

				// Use entries() to find tokens since getOrThrow has issues with dot notation
				const baseTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === firstMarketBaseTokenAddress.toLowerCase());
				const quoteTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === firstMarketQuoteTokenAddress.toLowerCase());
				const nativeTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === rujira.fin.nativeToken.address.toLowerCase());

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

				// Find beacon and fee payment tokens using entries() to avoid MMap issues
				const beaconTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === rujira.fin.beaconToken.address.toLowerCase());
				const feePaymentTokenEntry = Array.from(result.entries()).find(([key]) => key.toLowerCase() === rujira.fin.feePaymentToken.address.toLowerCase());

				const beaconToken = beaconTokenEntry ? beaconTokenEntry[1] : null;
				const feePaymentToken = feePaymentTokenEntry ? feePaymentTokenEntry[1] : null;

				if (!beaconToken) {
					throw new Error(`Beacon token not found: ${rujira.fin.beaconToken.address}`);
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

				expect(beaconToken).toBeDefined();
				expect(beaconToken.address.toLowerCase()).toBe(rujira.fin.beaconToken.address.toLowerCase());
				expect(beaconToken.symbol).toBe(rujira.fin.beaconToken.symbol);
				expect(beaconToken.name).toBeDefined();
				expect(beaconToken.decimals).toBeGreaterThan(0);
				expect(beaconToken.raw).toBeDefined();

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

				expect(result.tokens.quote.address).toBe(firstMarketQuoteTokenAddress.toLowerCase());
				expect(result.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.tokens.quote.name).toBeDefined();
				expect(result.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.tokens.quote.raw).toBeDefined();

				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.status).toBe(MarketStatus.ACTIVE);
				expect(result.raw).toBeDefined();
			});

			it.skip("should be able to get market by symbol", async () => {
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

				expect(result.tokens.quote.address).toBe(firstMarketQuoteTokenAddress.toLowerCase());
				expect(result.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
				expect(result.tokens.quote.name).toBeDefined();
				expect(result.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.tokens.quote.raw).toBeDefined();

				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.status).toBe(MarketStatus.ACTIVE);
				expect(result.raw).toBeDefined();

			});

			it.skip("should be able to get markets by addresses", async () => {
				const addresses = [firstMarketAddress, secondMarketAddress];

				const result = await rujira.fin.getMarkets({ addresses });

				expect(result).toBeDefined();

				expect(result.size).toBeGreaterThan(result.valueSeq.length);

				const firstMarket = result.getOrThrow(firstMarketAddress);
				expect(firstMarket).toBeDefined();
				expect(firstMarket.address).toBe(firstMarketAddress.toLowerCase());
				expect(firstMarket.symbol).toBe(firstMarketSymbol);

				expect(firstMarket.tokens.base.address).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(firstMarket.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(firstMarket.tokens.base.name).toBeDefined();
				expect(firstMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.base.raw).toBeDefined();

				expect(firstMarket.tokens.quote.address).toBe(firstMarketQuoteTokenAddress.toLowerCase());
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

				expect(secondMarket.tokens.base.address).toBe(secondMarketBaseTokenAddress.toLowerCase());
				expect(secondMarket.tokens.base.symbol).toBe(secondMarketBaseTokenSymbol);
				expect(secondMarket.tokens.base.name).toBeDefined();
				expect(secondMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.base.raw).toBeDefined();

				expect(secondMarket.tokens.quote.address).toBe(secondMarketQuoteTokenAddress.toLowerCase());
				expect(secondMarket.tokens.quote.symbol).toBe(secondMarketQuoteTokenSymbol);
				expect(secondMarket.tokens.quote.name).toBeDefined();
				expect(secondMarket.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.quote.raw).toBeDefined();

				expect(secondMarket.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.status).toBe(MarketStatus.ACTIVE);
				expect(secondMarket.raw).toBeDefined();
			});

			it.skip("should be able to get markets by symbols", async () => {
				const symbols = [firstMarketSymbol, secondMarketSymbol];

				const result = await rujira.fin.getMarkets({ symbols });

				expect(result).toBeDefined();

				expect(result.size).toBeGreaterThan(result.valueSeq.length);

				const firstMarket = result.getOrThrow(firstMarketAddress);
				expect(firstMarket).toBeDefined();
				expect(firstMarket.address).toBe(firstMarketAddress);
				expect(firstMarket.symbol).toBe(firstMarketSymbol);

				expect(firstMarket.tokens.base.address).toBe(firstMarketBaseTokenAddress.toLowerCase());
				expect(firstMarket.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
				expect(firstMarket.tokens.base.name).toBeDefined();
				expect(firstMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstMarket.tokens.base.raw).toBeDefined();

				expect(firstMarket.tokens.quote.address).toBe(firstMarketQuoteTokenAddress.toLowerCase());
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


				expect(secondMarket.tokens.base.address).toBe(secondMarketBaseTokenAddress.toLowerCase());
				expect(secondMarket.tokens.base.symbol).toBe(secondMarketBaseTokenSymbol);
				expect(secondMarket.tokens.base.name).toBeDefined();
				expect(secondMarket.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(secondMarket.tokens.base.raw).toBeDefined();

				expect(secondMarket.tokens.quote.address).toBe(secondMarketQuoteTokenAddress.toLowerCase());
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
				expect(result.size).toBeGreaterThan(result.valueSeq.length);

				for (const [address, market] of result.entries()) {
					console.log("Market:", market);
					console.log("Market type:", typeof market);
					console.log("Market keys:", Object.keys(market));
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

				expect(asks.size).toBe(result.raw.base.length);
				expect(bids.size).toBe(result.raw.quote.length);

				if (bids.size > 0) {
					const firstBidOrder = bids.getOrThrow(0);
					expect(firstBidOrder).toBeDefined();
					expect(firstBidOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(firstBidOrder.raw).toBeDefined();

					const bestBid = getOrThrow<OrderBookOrder>(
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

					const bestAsk = getOrThrow<OrderBookOrder>(
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
					const bestAsk = getOrThrow<OrderBookOrder>(
						result.book.bestAsk,
						`Best ask order not found`
					);
					const bestBid = getOrThrow<OrderBookOrder>(
						result.book.bestBid,
						`Best bid order not found`
					);
					const middlePrice = getOrThrow<Amount>(
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

		describe.skip("candles", () => {
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

		describe.skip("balances", () => {
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

				let accumulatedBeaconFree = DECIMAL_0;
				let accumulatedBeaconLockedInOrders = DECIMAL_0;
				let accumulatedBeaconLockedInPools = DECIMAL_0;
				let accumulatedBeaconWithdrawable = DECIMAL_0;
				let accumulatedBeaconTotal = DECIMAL_0;

				for (const [tokenAddress, tokenBalance] of result.tokens.entries()) {
					expect(tokenBalance).toBeDefined();
					expect(tokenBalance.token).toBeDefined();
					expect(tokenBalance.token.address).toBe(tokenAddress);
					expect(tokenBalance.token.symbol).toBeDefined();
					expect(tokenBalance.token.name).toBeDefined();
					expect(tokenBalance.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(tokenBalance.token.raw).toBeDefined();

					expect(tokenBalance.balances).toBeDefined();
					expect(tokenBalance.balances.token).toBeDefined();
					expect(tokenBalance.balances.nativeToken).toBeDefined();
					expect(tokenBalance.balances.beaconToken).toBeDefined();

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

					const beaconTokenBalance = tokenBalance.balances.beaconToken;
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

					accumulatedNativeFree = accumulatedNativeFree.plus(nativeTokenBalance.free);
					accumulatedNativeLockedInOrders = accumulatedNativeLockedInOrders.plus(nativeTokenBalance.lockedInOrders);
					accumulatedNativeLockedInPools = accumulatedNativeLockedInPools.plus(nativeTokenBalance.lockedInPools);
					accumulatedNativeWithdrawable = accumulatedNativeWithdrawable.plus(nativeTokenBalance.withdrawable);
					accumulatedNativeTotal = accumulatedNativeTotal.plus(nativeTokenBalance.total);

					accumulatedBeaconFree = accumulatedBeaconFree.plus(beaconTokenBalance.free);
					accumulatedBeaconLockedInOrders = accumulatedBeaconLockedInOrders.plus(beaconTokenBalance.lockedInOrders);
					accumulatedBeaconLockedInPools = accumulatedBeaconLockedInPools.plus(beaconTokenBalance.lockedInPools);
					accumulatedBeaconWithdrawable = accumulatedBeaconWithdrawable.plus(beaconTokenBalance.withdrawable);
					accumulatedBeaconTotal = accumulatedBeaconTotal.plus(beaconTokenBalance.total);
				}

				const marketBaseTokenBalance = result.tokens.getOrThrow(firstMarketBaseTokenAddress);
				expect(marketBaseTokenBalance).toBeDefined();
				expect(marketBaseTokenBalance.token.address).toBe(firstMarketBaseTokenAddress);
				expect(marketBaseTokenBalance.token.symbol).toBe(firstMarketBaseTokenSymbol);

				const marketQuoteTokenBalance = result.tokens.getOrThrow(firstMarketQuoteTokenAddress);
				expect(marketQuoteTokenBalance).toBeDefined();
				expect(marketQuoteTokenBalance.token.address).toBe(firstMarketQuoteTokenAddress);
				expect(marketQuoteTokenBalance.token.symbol).toBe(firstMarketQuoteTokenSymbol);

				const nativeTokenBalance = result.tokens.getOrThrow(rujira.fin.nativeToken.address);
				expect(nativeTokenBalance.token.address).toBe(rujira.fin.nativeToken.address);
				expect(nativeTokenBalance.token.symbol).toBe(rujira.fin.nativeToken.symbol);

				const beaconTokenBalance = result.tokens.getOrThrow(rujira.fin.beaconToken.address);
				expect(beaconTokenBalance.token.address).toBe(rujira.fin.beaconToken.address);
				expect(beaconTokenBalance.token.symbol).toBe(rujira.fin.beaconToken.symbol);

				const feePaymentTokenBalance = result.tokens.getOrThrow(rujira.fin.feePaymentToken.address);
				expect(feePaymentTokenBalance.token.address).toBe(rujira.fin.feePaymentToken.address);
				expect(feePaymentTokenBalance.token.symbol).toBe(rujira.fin.feePaymentToken.symbol);

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

				expect(accumulatedNativeFree.toNumber()).toBe(totalNativeToken.free.toNumber());
				expect(accumulatedNativeLockedInOrders.toNumber()).toBe(totalNativeToken.lockedInOrders.toNumber());
				expect(accumulatedNativeLockedInPools.toNumber()).toBe(totalNativeToken.lockedInPools.toNumber());
				expect(accumulatedNativeWithdrawable.toNumber()).toBe(totalNativeToken.withdrawable.toNumber());
				expect(accumulatedNativeTotal.toNumber()).toBe(totalNativeToken.total.toNumber());

				expect(accumulatedBeaconFree.toNumber()).toBe(totalBeaconToken.free.toNumber());
				expect(accumulatedBeaconLockedInOrders.toNumber()).toBe(totalBeaconToken.lockedInOrders.toNumber());
				expect(accumulatedBeaconLockedInPools.toNumber()).toBe(totalBeaconToken.lockedInPools.toNumber());
				expect(accumulatedBeaconWithdrawable.toNumber()).toBe(totalBeaconToken.withdrawable.toNumber());
				expect(accumulatedBeaconTotal.toNumber()).toBe(totalBeaconToken.total.toNumber());
			});
		});

		describe.skip("withdraw", () => {
			it.skip("should be able to withdraw market by address", async () => {
					const result = await rujira.fin.withdrawFromMarket({
						marketAddress: firstMarketAddress,
						marketSymbol: undefined,
						ownerAddress: walletPublicKeyThor
					});

					expect(result).toBeDefined();

					expect(result.orders).toBeDefined();
					expect(result.orders.size).toBeGreaterThan(0);

					for (const order of result.orders.values()) {
						expect(order).toBeDefined();
						expect(order.id).toBeDefined();
						expect(order.market).toBeDefined();
						expect(order.market.address).toBe(firstMarketAddress);
						expect(order.market.symbol).toBe(firstMarketSymbol);
						expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(order.market.status).toBe(MarketStatus.ACTIVE);
						expect(order.market.raw).toBeDefined();
						expect(order.ownerAddress).toBeDefined();
						expect(order.side).toBeDefined();
						expect(order.type).toBeDefined();
						expect(order.amount).toBeDefined();
						expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.price).toBeDefined();
						expect(order.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.filledAmount).toBeDefined();
						expect(order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.filledPercentage).toBeDefined();
						expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(order.status).toBe(OrderStatus.FILLED);
						expect(order.creationTimestamp).toBeDefined();
						expect(order.updateTimestamp).toBeDefined();
						expect(order.raw).toBeDefined();
					}

					expect(result.transactions).toBeDefined();
					expect(result.transactions.size).toBeGreaterThan(0);

					for (const transaction of result.transactions.values()) {
						expect(transaction).toBeDefined();
						expect(transaction.hash).toBeDefined();
						expect(transaction.status).toBe(TransactionStatus.SUCCESS);
						expect(transaction.fee).toBeDefined();
						expect(transaction.fee.amount).toBeDefined();
						expect(transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
						expect(transaction.fee.token).toBeDefined();
						expect(transaction.fee.token.address).toBeDefined();
						expect(transaction.fee.token.symbol).toBeDefined();
						expect(transaction.fee.token.name).toBeDefined();
						expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
						expect(transaction.fee.token.raw).toBeDefined();
						expect(transaction.raw).toBeDefined();
					}

					expect(result.raw).toBeDefined();
			});

			it("should be able to withdraw market by symbol", async () => {
				const result = await rujira.fin.withdrawFromMarket({
					marketAddress: undefined,
					marketSymbol: firstMarketSymbol,
					ownerAddress: walletPublicKeyThor,
				});

				expect(result).toBeDefined();

				expect(result.orders).toBeDefined();
				expect(result.orders.size).toBeGreaterThan(0);

				for (const order of result.orders.values()) {
					expect(order).toBeDefined();
					expect(order.id).toBeDefined();
					expect(order.market).toBeDefined();
					expect(order.market.address).toBe(firstMarketAddress);
					expect(order.market.symbol).toBe(firstMarketSymbol);
					expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(order.market.status).toBe(MarketStatus.ACTIVE);
					expect(order.market.raw).toBeDefined();
					expect(order.ownerAddress).toBeDefined();
					expect(order.side).toBeDefined();
					expect(order.type).toBeDefined();
					expect(order.amount).toBeDefined();
					expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(order.price).toBeDefined();
					expect(order.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(order.filledAmount).toBeDefined();
					expect(order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(order.filledPercentage).toBeDefined();
					expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(order.status).toBe(OrderStatus.FILLED);
					expect(order.creationTimestamp).toBeDefined();
					expect(order.updateTimestamp).toBeDefined();
					expect(order.raw).toBeDefined();
				}

				expect(result.transactions).toBeDefined();
				expect(result.transactions.size).toBeGreaterThan(0);

				for (const transaction of result.transactions.values()) {
					expect(transaction).toBeDefined();
					expect(transaction.hash).toBeDefined();
					expect(transaction.status).toBe(TransactionStatus.SUCCESS);
					expect(transaction.fee).toBeDefined();
					expect(transaction.fee.amount).toBeDefined();
					expect(transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
					expect(transaction.fee.token).toBeDefined();
					expect(transaction.fee.token.address).toBeDefined();
					expect(transaction.fee.token.symbol).toBeDefined();
					expect(transaction.fee.token.name).toBeDefined();
					expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
					expect(transaction.fee.token.raw).toBeDefined();
					expect(transaction.raw).toBeDefined();
				}

				expect(result.raw).toBeDefined();
			});
		});

		// describe("orders", () => {
		// 	it("should handle complete order lifecycle", async () => {
		// 		==============================================================
		// 		Optimized flow for testing Rujira orders (8 orders total)
		// 		market 1: TOKEN1/TOKEN2 (RUJI/USDC)
		// 		market 2: TOKEN3/TOKEN2 (NAMI/USDC)
		// 		==============================================================

		// 		// Phase 1: Setup and Initial Balances
		// 		// ==============================================================
		// 		const initialBalances = await rujira.fin.getBalances({
		// 			walletAddress: walletPublicKeyThor,
		// 		});

		// 		// Phase 2: Individual Order Testing (4 orders)
		// 		// ==============================================================

		// 		// Order 1: limit buy, market 1
		// 		const order1 = await rujira.fin.placeOrder({
		// 			ownerAddress: walletPublicKeyThor,
		// 			marketSymbol: firstMarketSymbol,
		// 			side: "buy",
		// 			type: "limit",
		// 			amount: firstMarketBaseTokenAmount,
		// 			price: firstMarketQuoteTokenAmount,
		// 		});

		// 		// Order 2: limit sell, market 2 (better than market price) - will fill
		// 		const order2 = await rujira.fin.placeOrder({
		// 			ownerAddress: walletPublicKeyThor,
		// 			marketSymbol: secondMarketSymbol,
		// 			side: "sell",
		// 			type: "limit",
		// 			amount: secondMarketBaseTokenAmount,
		// 			price: secondMarketQuoteTokenAmount.times(0.9), // Better price to ensure fill
		// 		});

		// 		// Order 3: market sell, market 1 - will fill
		// 		const order3 = await rujira.fin.placeOrder({
		// 			ownerAddress: walletPublicKeyThor,
		// 			marketSymbol: firstMarketSymbol,
		// 			side: "sell",
		// 			type: "market",
		// 			amount: firstMarketBaseTokenAmount.times(0.1), // Small amount for market order
		// 		});

		// 		// Order 4: market buy, market 2 - will fill
		// 		const order4 = await rujira.fin.placeOrder({
		// 			ownerAddress: walletPublicKeyThor,
		// 			marketSymbol: secondMarketSymbol,
		// 			side: "buy",
		// 			type: "market",
		// 			amount: secondMarketBaseTokenAmount.times(0.1), // Small amount for market order
		// 		});

		// 		// Check balances after individual orders
		// 		const balancesAfterIndividual = await rujira.fin.getBalances({
		// 			walletAddress: walletPublicKeyThor,
		// 		});

		// 		// Get all open orders and validate order 1 is present
		// 		const openOrdersAfterIndividual = await rujira.fin.getOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderStatus: "open",
		// 		});

		// 		// Test getOrder() with an individual order
		// 		const individualOrder1 = await rujira.fin.getOrder({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderId: order1.order.id,
		// 		});

		// 		// Get all filled orders and validate orders 2, 3, 4 are present
		// 		const filledOrdersAfterIndividual = await rujira.fin.getOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderStatus: "filled",
		// 		});

		// 		// Phase 3: Batch Order Testing (4 orders)
		// 		// ==============================================================

		// 		// Create 4 orders at once
		// 		const batchOrders = await rujira.fin.placeOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orders: [
		// 				{
		// 					marketSymbol: firstMarketSymbol,
		// 					side: "buy",
		// 					type: "limit",
		// 					amount: firstMarketBaseTokenAmount.times(0.5),
		// 					price: firstMarketQuoteTokenAmount.times(0.8),
		// 				}, // order 5
		// 				{
		// 					marketSymbol: secondMarketSymbol,
		// 					side: "sell",
		// 					type: "limit",
		// 					amount: secondMarketBaseTokenAmount.times(0.5),
		// 					price: secondMarketQuoteTokenAmount.times(1.2),
		// 				}, // order 6
		// 				{
		// 					marketSymbol: firstMarketSymbol,
		// 					side: "buy",
		// 					type: "limit",
		// 					amount: firstMarketBaseTokenAmount.times(0.3),
		// 					price: firstMarketQuoteTokenAmount.times(1.1), // Better price to ensure fill
		// 				}, // order 7 - will fill
		// 				{
		// 					marketSymbol: secondMarketSymbol,
		// 					side: "sell",
		// 					type: "limit",
		// 					amount: secondMarketBaseTokenAmount.times(0.3),
		// 					price: secondMarketQuoteTokenAmount.times(0.85), // Better price to ensure fill
		// 				}, // order 8 - will fill
		// 			],
		// 		});

		// 		// Check balances after batch order creation
		// 		const balancesAfterBatch = await rujira.fin.getBalances({
		// 			walletAddress: walletPublicKeyThor,
		// 		});

		// 		// Get all open orders and validate orders 1, 5, 6 are present
		// 		const openOrdersAfterBatch = await rujira.fin.getOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderStatus: "open",
		// 		});

		// 		// Get all filled orders and validate orders 2, 3, 4, 7, 8 are present
		// 		const filledOrdersAfterBatch = await rujira.fin.getOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderStatus: "filled",
		// 		});

		// 		// Phase 4: Replacement Testing
		// 		// ==============================================================

		// 		// Replace order 5 with new price and amount
		// 		const replacedOrder5 = await rujira.fin.replaceOrder({
		// 			ownerAddress: walletPublicKeyThor,
		// 			marketSymbol: firstMarketSymbol,
		// 			side: "buy",
		// 			type: "limit",
		// 			amount: firstMarketBaseTokenAmount.times(0.6),
		// 			price: firstMarketQuoteTokenAmount.times(0.75),
		// 		});

		// 		// Check balances after replacement
		// 		const balancesAfterReplacement = await rujira.fin.getBalances({
		// 			walletAddress: walletPublicKeyThor,
		// 		});

		// 		// Replace orders 6 and 1 as a batch with new parameters
		// 		const replacedOrdersBatch = await rujira.fin.replaceOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orders: [
		// 				{
		// 					marketSymbol: secondMarketSymbol,
		// 					side: "sell",
		// 					type: "limit",
		// 					amount: secondMarketBaseTokenAmount.times(0.7),
		// 					price: secondMarketQuoteTokenAmount.times(1.3),
		// 				}, // new order 6
		// 				{
		// 					marketSymbol: firstMarketSymbol,
		// 					side: "buy",
		// 					type: "limit",
		// 					amount: firstMarketBaseTokenAmount.times(0.8),
		// 					price: firstMarketQuoteTokenAmount.times(0.7),
		// 				}, // new order 1
		// 			],
		// 		});

		// 		// Phase 5: Cancellation Testing
		// 		// ==============================================================

		// 		// Cancel order 5 individually
		// 		const cancelledOrder5 = await rujira.fin.cancelOrder({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderId: replacedOrder5.order.id,
		// 		});

		// 		// Check balances after cancellation
		// 		const balancesAfterCancellation = await rujira.fin.getBalances({
		// 			walletAddress: walletPublicKeyThor,
		// 		});

		// 		// Cancel orders 6 and 1 as a batch
		// 		const cancelledOrdersBatch = await rujira.fin.cancelOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderIds: [
		// 				replacedOrdersBatch.orders.get(0)?.id || "",
		// 				replacedOrdersBatch.orders.get(1)?.id || "",
		// 			],
		// 		});

		// 		// Phase 6: Final Testing
		// 		// ==============================================================

		// 		// Get all orders (open + filled) and validate correct mix
		// 		const allOrders = await rujira.fin.getOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 		});

		// 		// Cancel all open orders
		// 		const cancelledAllOrders = await rujira.fin.cancelAllOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 		});

		// 		// Check balances after cancel all
		// 		const finalBalances = await rujira.fin.getBalances({
		// 			walletAddress: walletPublicKeyThor,
		// 		});

		// 		// Get all open orders and verify no open orders remain
		// 		const finalOpenOrders = await rujira.fin.getOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderStatus: "open",
		// 		});

		// 		// Get all filled orders and verify orders 2, 3, 4, 7, 8 are present
		// 		const finalFilledOrders = await rujira.fin.getOrders({
		// 			ownerAddress: walletPublicKeyThor,
		// 			orderStatus: "filled",
		// 		});

		// 		// Phase 7: Withdrawal Testing
		// 		// ==============================================================

		// 		// Withdraw from market 1
		// 		const withdrawMarket1 = await rujira.fin.withdrawFromMarket({
		// 			ownerAddress: walletPublicKeyThor,
		// 			marketSymbol: firstMarketSymbol,
		// 		});

		// 		// Withdraw from market 2
		// 		const withdrawMarket2 = await rujira.fin.withdrawFromMarket({
		// 			ownerAddress: walletPublicKeyThor,
		// 			marketSymbol: secondMarketSymbol,
		// 		});

		// 		// Check wallet balances after withdraw from the markets
		// 		const balancesAfterWithdraw = await rujira.fin.getBalances({
		// 			walletAddress: walletPublicKeyThor,
		// 		});
		// 	});
		// });
	});
});
