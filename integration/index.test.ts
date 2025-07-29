import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import "dotenv/config";
import { properties } from "../src/properties";
import { Rujira } from "../src/rujira";
import {
	Amount,
	BIG_NUMBER_0,
	Candle,
	DECIMAL_0,
	MarketAddress,
	MarketStatus,
	MarketSymbol,
	OrderBookOrder,
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
import { getNotNullOrThrowError } from "../src/utils";

let rujira: Rujira;

let feePaymentTokenConstant: Token;
let nativeTokenConstant: Token;
let beaconTokenConstant: Token;
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
		'wallet.mnemonic',
		'wallet.publicKeys.thor',
		'rujira.tokens.feePayment',
		'rujira.tokens.native',
		'rujira.tokens.beacon',
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

	const missingProperties = requiredProperties.filter(path => properties.getAs<any>(path));

	if (missingProperties.length > 0) {
		throw new Error(`Missing required properties: ${missingProperties.join(', ')}`);
	}

	walletMnemonic = properties.getAs<WalletMnemonic>('wallet.mnemonic');
	walletPublicKeyThor = properties.getAs<WalletAddress>('wallet.publicKeys.thor');
	feePaymentTokenConstant = properties.getAs<Token>('rujira.tokens.feePayment');
	nativeTokenConstant = properties.getAs<Token>('rujira.tokens.native');
	beaconTokenConstant = properties.getAs<Token>('rujira.tokens.beacon');
	transactionHash = properties.getAs<TransactionHash>('tests.integration.transaction_hash');
	firstMarketSymbol = properties.getAs<MarketSymbol>('tests.integration.first_market_symbol');
	firstMarketAddress = properties.getAs<MarketAddress>('tests.integration.first_market_address');
	firstMarketBaseTokenAddress = properties.getAs<TokenAddress>('tests.integration.first_market_base_token_address');
	firstMarketQuoteTokenAddress = properties.getAs<TokenAddress>('tests.integration.first_market_quote_token_address');
	firstMarketBaseTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.first_market_base_token_symbol');
	firstMarketQuoteTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.first_market_quote_token_symbol');
	firstMarketBaseTokenAmount = properties.getAs<Amount>('tests.integration.first_market_base_token_amount');
	firstMarketQuoteTokenAmount = properties.getAs<Amount>('tests.integration.first_market_quote_token_amount');
	secondMarketSymbol = properties.getAs<MarketSymbol>('tests.integration.second_market_symbol');
	secondMarketAddress = properties.getAs<MarketAddress>('tests.integration.second_market_address');
	secondMarketBaseTokenAddress = properties.getAs<TokenAddress>('tests.integration.second_market_base_token_address');
	secondMarketQuoteTokenAddress = properties.getAs<TokenAddress>('tests.integration.second_market_quote_token_address');
	secondMarketBaseTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.second_market_base_token_symbol');
	secondMarketQuoteTokenSymbol = properties.getAs<TokenSymbol>('tests.integration.second_market_quote_token_symbol');
	secondMarketBaseTokenAmount = properties.getAs<Amount>('tests.integration.second_market_base_token_amount');
	secondMarketQuoteTokenAmount = properties.getAs<Amount>('tests.integration.second_market_quote_token_amount');
	testsTimeout = properties.getAs<number>('tests.integration.timeout');

	rujira = new Rujira({
		walletMnemonic: walletMnemonic,
	});

	await rujira.initialize({});

	wallet = rujira.wallet;

	jest.setTimeout(testsTimeout);

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

		describe.skip("tokens", () => {
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
				expect(result.size).toBeGreaterThan(result.valueSeq.length);

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

		describe.skip("orderbook", () => {
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

		describe.skip("ticker", () => {
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

		// describe("orders", () => {
		// 	describe("cancel orders", () => {
		// 		it("should cancel an order", async () => {
		// 			const result = await rujira.fin.cancelOrder({ orderId: testOrderIds[0] });

		// 			expect(result).toBeDefined();
		// 			expect(result.order).toBeDefined();
		// 			expect(result.order.id).toBeDefined();
		// 			expect(result.order.side).toBe(result.order.side);
		// 			expect(result.order.type).toBe(result.order.type);
		// 			expect(result.order.status).toBe(OrderStatus.CANCELLED);

		// 			expect(result.order.market).toBeDefined();
		// 			expect(result.order.market.address).toBe(firstMarketAddress);
		// 			expect(result.order.market.symbol).toBe(firstMarketSymbol);
		// 			expect(result.order.market.tokens.base).toBeDefined();
		// 			expect(result.order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
		// 			expect(result.order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
		// 			expect(result.order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
		// 			expect(result.order.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(result.order.market.tokens.base.raw).toBeDefined();

		// 			expect(result.order.market.tokens.quote).toBeDefined();
		// 			expect(result.order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
		// 			expect(result.order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
		// 			expect(result.order.market.tokens.quote.name).toBeDefined();
		// 			expect(result.order.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(result.order.market.tokens.quote.raw).toBeDefined();

		// 			expect(result.order.owner).toBeDefined();
		// 			expect(result.order.owner).toBe(ownerAddress);
		// 			expect(result.order.price.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
		// 			expect(result.order.amount.toNumber()).toBeGreaterThan(DECIMAL_0.toNumber());
		// 			expect(result.order.filledAmount).toBeDefined();
		// 			expect(result.order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 			expect(result.order.filledPercentage).toBeDefined();
		// 			expect(result.order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 			expect(result.order.creationTimestamp).toBeDefined();
		// 			expect(result.order.creationTimestamp).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(result.order.updateTimestamp).toBeDefined();
		// 			expect(result.order.updateTimestamp).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(result.order.raw).toBeDefined();

		// 			expect(result.transaction).toBeDefined();
		// 			expect(result.transaction.hash).toBeDefined();
		// 			expect(result.transaction.status).toBe(TransactionStatus.SUCCESS);
		// 			expect(result.transaction.fee).toBeDefined();
		// 			expect(result.transaction.fee.amount).toBeDefined();
		// 			expect(result.transaction.fee.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 			expect(result.transaction.fee.token).toBeDefined();
		// 			expect(result.transaction.fee.token.address).toBeDefined();
		// 			expect(result.transaction.fee.token.symbol).toBeDefined();
		// 			expect(result.transaction.fee.token.name).toBeDefined();
		// 			expect(result.transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 			expect(result.transaction.fee.token.raw).toBeDefined();
		// 			expect(result.transaction.raw).toBeDefined();
		// 		});

		// 		it("should cancel multiple orders", async () => {
		// 			const result = await rujira.fin.cancelOrders({ orderIds: testOrderIds });

		// 			expect(result).toBeDefined();
		// 			expect(result.orders.size).toBe(testOrderIds.length);

		// 			for (const [orderId, order] of result.orders.entries()) {
		// 				expect(order).toBeDefined();
		// 				expect(order.id).toBe(orderId);
		// 				expect(order.side).toBe(order.side);
		// 				expect(order.type).toBe(order.type);
		// 				expect(order.status).toBe(OrderStatus.CANCELLED);

		// 				expect(order.market).toBeDefined();
		// 				expect(order.market.address).toBe(firstMarketAddress);
		// 				expect(order.market.symbol).toBe(firstMarketSymbol);
		// 				expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());

		// 				expect(order.market.tokens.base).toBeDefined();
		// 				expect(order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
		// 				expect(order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
		// 				expect(order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
		// 				expect(order.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(order.market.tokens.base.raw).toBeDefined();

		// 				expect(order.market.tokens.quote).toBeDefined();
		// 				expect(order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
		// 				expect(order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
		// 				expect(order.market.tokens.quote.name).toBeDefined();
		// 				expect(order.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(order.market.tokens.quote.raw).toBeDefined();

		// 				expect(order.owner).toBeDefined();
		// 				expect(order.owner).toBe(ownerAddress);
		// 				expect(order.market.price).toBeDefined();
		// 				expect(order.market.price!.baseQuote.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.market.price!.quoteBase.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.filledAmount).toBeDefined();
		// 				expect(order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.filledPercentage).toBeDefined();
		// 				expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.creationTimestamp).toBeDefined();
		// 				expect(order.creationTimestamp).toBeGreaterThan(0);
		// 				expect(order.updateTimestamp).toBeDefined();
		// 				expect(order.updateTimestamp).toBeGreaterThan(0);

		// 				expect(order.raw).toBeDefined();
		// 			}

		// 			for (const [transactionHash, transaction] of result.transactions.entries()) {
		// 				expect(transaction).toBeDefined();
		// 				expect(transaction.hash).toBeDefined();
		// 				expect(transaction.hash).toBe(transactionHash);
		// 				expect(transaction.status).toBe(TransactionStatus.SUCCESS);
		// 				expect(transaction.fee).toBeDefined();
		// 				expect(transaction.fee.amount).toBeDefined();
		// 				expect(transaction.fee.token).toBeDefined();
		// 				expect(transaction.fee.token.address).toBeDefined();
		// 				expect(transaction.fee.token.symbol).toBeDefined();
		// 				expect(transaction.fee.token.name).toBeDefined();
		// 				expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(transaction.fee.token.raw).toBeDefined();
		// 				expect(transaction.raw).toBeDefined();
		// 			}
		// 		});

		// 		it("should cancel all orders", async () => {
		// 			const result = await rujira.fin.cancelAllOrders({ marketAddress: firstMarketAddress, marketSymbol: undefined });

		// 			expect(result).toBeDefined();
		// 			expect(result.orders.size).toBe(testOrderIds.length);

		// 			result.orders.forEach((order: Order) => {
		// 				expect(order).toBeDefined();
		// 				expect(order.id).toBeDefined();
		// 				expect(order.side).toBe(order.side);
		// 				expect(order.type).toBe(order.type);
		// 				expect(order.status).toBe(OrderStatus.CANCELLED);

		// 				expect(order.market).toBeDefined();
		// 				expect(order.market.address).toBe(firstMarketAddress);
		// 				expect(order.market.symbol).toBe(firstMarketSymbol);
		// 				expect(order.market.status).toBe(MarketStatus.ACTIVE);
		// 				expect(order.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());

		// 				expect(order.market.tokens.base).toBeDefined();
		// 				expect(order.market.tokens.base.address).toBe(firstMarketBaseTokenAddress);
		// 				expect(order.market.tokens.base.symbol).toBe(firstMarketBaseTokenSymbol);
		// 				expect(order.market.tokens.base.name).toBe(firstMarketBaseTokenSymbol);
		// 				expect(order.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(order.market.tokens.base.raw).toBeDefined();

		// 				expect(order.market.tokens.quote).toBeDefined();
		// 				expect(order.market.tokens.quote.symbol).toBe(firstMarketQuoteTokenSymbol);
		// 				expect(order.market.tokens.quote.address).toBe(firstMarketQuoteTokenAddress);
		// 				expect(order.market.tokens.quote.name).toBeDefined();
		// 				expect(order.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(order.market.tokens.quote.raw).toBeDefined();

		// 				expect(order.market.price).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(order.market.price!.baseQuote.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.market.price!.quoteBase.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());

		// 				expect(order.owner).toBeDefined();
		// 				expect(order.owner).toBe(ownerAddress);
		// 				expect(order.price.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.amount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.filledAmount).toBeDefined();
		// 				expect(order.filledAmount.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.filledPercentage).toBeDefined();
		// 				expect(order.filledPercentage.toNumber()).toBeGreaterThanOrEqual(DECIMAL_0.toNumber());
		// 				expect(order.creationTimestamp).toBeDefined();
		// 				expect(order.creationTimestamp).toBeGreaterThan(0);
		// 				expect(order.updateTimestamp).toBeDefined();
		// 				expect(order.updateTimestamp).toBeGreaterThan(0);
		// 			});

		// 			for (const [transactionHash, transaction] of result.transactions.entries()) {
		// 				expect(transaction).toBeDefined();
		// 				expect(transaction.hash).toBeDefined();
		// 				expect(transaction.hash).toBe(transactionHash);
		// 				expect(transaction.status).toBe(TransactionStatus.SUCCESS);
		// 				expect(transaction.fee).toBeDefined();
		// 				expect(transaction.fee.amount).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(transaction.fee.token).toBeDefined();
		// 				expect(transaction.fee.token.address).toBeDefined();
		// 				expect(transaction.fee.token.symbol).toBeDefined();
		// 				expect(transaction.fee.token.name).toBeDefined();
		// 				expect(transaction.fee.token.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
		// 				expect(transaction.fee.token.raw).toBeDefined();
		// 				expect(transaction.fee.token.symbol).toBe(feePaymentTokenConstant.symbol);

		// 				expect(transaction.raw).toBeDefined();
		// 			}
		// 		});
		// 	});
		// });
	});
});
