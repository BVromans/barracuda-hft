import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import { Rujira } from "../src/rujira";
import { BIG_NUMBER_0, FEE_PAYMENT_TOKEN, SystemStatus, TransactionStatus } from "../src/types";

let rujira: Rujira;

let testsTimeout: number;
let rpcEndpoint: string;
let walletPrivateKey: string;
let walletMnemonic: string;
let transactionHash: string;
let baseTokenAddress: string;
let quoteTokenAddress: string;
let baseTokenSymbol: string;
let quoteTokenSymbol: string;
let baseTokenAmount: string;
let quoteTokenAmount: string;

beforeAll(async () => {
	const requiredEnvironmentVariables = [
		'TESTS_TIMEOUT',
		'RPC_ENDPOINT',
		'WALLET_PRIVATE_KEY',
		'WALLET_MNEMONIC',
		'TRANSACTION_HASH',
		'BASE_TOKEN_ADDRESS',
		'QUOTE_TOKEN_ADDRESS',
		'BASE_TOKEN_SYMBOL',
		'QUOTE_TOKEN_SYMBOL',
		'BASE_TOKEN_AMOUNT',
		'QUOTE_TOKEN_AMOUNT',
	];

		const missingEnvironmentVariables = requiredEnvironmentVariables.filter(varName => !process.env[varName]);
		
		if (missingEnvironmentVariables.length > 0) {
			throw new Error(`Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`);
		}

		testsTimeout = Number(process.env.TESTS_TIMEOUT!);
		rpcEndpoint = process.env.RPC_ENDPOINT!;
		walletPrivateKey = process.env.WALLET_PRIVATE_KEY!;
		walletMnemonic = process.env.WALLET_MNEMONIC!;
		transactionHash = process.env.TRANSACTION_HASH!;
		baseTokenAddress = process.env.BASE_TOKEN_ADDRESS!;
		quoteTokenAddress = process.env.QUOTE_TOKEN_ADDRESS!;
		baseTokenSymbol = process.env.BASE_TOKEN_SYMBOL!;
		quoteTokenSymbol = process.env.QUOTE_TOKEN_SYMBOL!;
		baseTokenAmount = process.env.BASE_TOKEN_AMOUNT!;
		quoteTokenAmount = process.env.QUOTE_TOKEN_AMOUNT!;

		rujira = new Rujira({
			rpcEndpoint: rpcEndpoint,
			walletPrivateKey: walletPrivateKey,
			walletMnemonic: walletMnemonic,
			restEndpoint: '' // TODO: add rest endpoint!!!
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
			it("should be able to get a transaction", async () => {
				const result = await rujira.fin.getTransaction({
					hash: transactionHash,
					waitForConfirmation: true,
				});

				expect(result).toBeDefined();
				expect(result.hash).toBe(transactionHash);
				expect(result.status).toBe(TransactionStatus.SUCCESS);
				expect(result.fee).toBeDefined();
				expect(result.fee.amount).toBeDefined();
				expect(result.fee.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.fee.token).toBeDefined();
				expect(result.fee.token.address).toBe(FEE_PAYMENT_TOKEN.address);
				expect(result.fee.token.symbol).toBe(FEE_PAYMENT_TOKEN.symbol);
				expect(result.fee.token.name).toBe(FEE_PAYMENT_TOKEN.name);
				expect(result.fee.token.decimals).toBe(FEE_PAYMENT_TOKEN.decimals);
				expect(result.fee.token.raw).toBeDefined();
				expect(result.raw).toBeDefined();
			});
		});

		describe("tokens", () => {
			it("should be able to get a token by address", async () => {
				const result = await rujira.fin.getToken({
					address: baseTokenAddress,
				});

				expect(result).toBeDefined();
				expect(result.address).toBe(baseTokenAddress);
				expect(result.symbol).toBe(baseTokenSymbol);
				expect(result.name).toBe(baseTokenSymbol);
				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.raw).toBeDefined();
			});

			it("should be able to get a token by symbol", async () => {
				const result = await rujira.fin.getToken({
					symbol: baseTokenSymbol,
				});

				expect(result).toBeDefined();
				expect(result.address).toBe(baseTokenAddress);
				expect(result.symbol).toBe(baseTokenSymbol);
				expect(result.name).toBe(baseTokenSymbol);
				expect(result.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.raw).toBeDefined();
			});

			it("should be able to get tokens by addresses", async () => {
				const addresses = [baseTokenAddress, quoteTokenAddress];

				const result = await rujira.fin.getTokens({
					addresses: addresses,
				});
				
				expect(result).toBeDefined();
				expect(result.size).toBe(addresses.length);
				
				const baseToken = result.get(baseTokenAddress)!;
				expect(baseToken).toBeDefined();
				expect(baseToken.address).toBe(baseTokenAddress);
				expect(baseToken.symbol).toBe(baseTokenSymbol);
				expect(baseToken.name).toBeDefined();
				expect(baseToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(baseToken.raw).toBeDefined();

				const quoteToken = result.get(quoteTokenAddress)!;
				expect(quoteToken).toBeDefined();
				expect(quoteToken.address).toBe(quoteTokenAddress);
				expect(quoteToken.symbol).toBe(quoteTokenSymbol);
				expect(quoteToken.name).toBeDefined();
				expect(quoteToken.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(quoteToken.raw).toBeDefined();
			});
		});
	});
});
