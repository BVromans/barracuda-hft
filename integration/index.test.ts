import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import { Rujira } from "../src/rujira";
import { BIG_NUMBER_0, FEE_PAYMENT_TOKEN, MarketStatus, SystemStatus, TransactionStatus, Wallet } from "../src/types";

let rujira: Rujira;

let testsTimeout: number;
let rpcEndpoint: string;
let restEndpoint: string;
let walletPrivateKey: string;
let walletMnemonic: string;
let wallet: Wallet;
let transactionHash: string;
let marketSymbol: string;
let marketAddress: string;
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
		'MARKET_SYMBOL',
		'MARKET_ADDRESS',
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
		restEndpoint = process.env.REST_ENDPOINT!;
		walletPrivateKey = process.env.WALLET_PRIVATE_KEY!;
		walletMnemonic = process.env.WALLET_MNEMONIC!;
		transactionHash = process.env.TRANSACTION_HASH!;
		marketSymbol = process.env.MARKET_SYMBOL!;
		marketAddress = process.env.MARKET_ADDRESS!;
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
			restEndpoint: restEndpoint,
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

				// noinspection DuplicatedCode
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

				// noinspection DuplicatedCode
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

		describe("orderbook", () => {
			it("should be able to get the order book for a market", async () => {
				const maximumNumberOfOrders = 10;

				const result = await rujira.fin.getOrderBook({
					marketAddress: marketAddress,
					marketSymbol: undefined,
					maximumNumberOfOrders: maximumNumberOfOrders,
				});

				expect(result).toBeDefined();

				expect(result.market).toBeDefined();
				expect(result.market.address).toBe(marketAddress);
				expect(result.market.symbol).toBe(marketSymbol);

				expect(result.market.tokens.base).toBeDefined();
				expect(result.market.tokens.base.address).toBe(baseTokenAddress);
				expect(result.market.tokens.base.symbol).toBe(baseTokenSymbol);
				expect(result.market.tokens.base.name).toBe(baseTokenSymbol);
				expect(result.market.tokens.base.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.base.raw).toBeDefined();

				expect(result.market.tokens.quote).toBeDefined();
				expect(result.market.tokens.quote.address).toBe(quoteTokenAddress);
				expect(result.market.tokens.quote.symbol).toBe(quoteTokenSymbol);
				expect(result.market.tokens.quote.name).toBe(quoteTokenSymbol);
				expect(result.market.tokens.quote.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.tokens.quote.raw).toBeDefined();

				expect(result.market.decimals).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.market.price).toBeUndefined();
				expect(result.market.status).toBe(MarketStatus.ACTIVE);
				expect(result.market.raw).toBeDefined();

				expect(result.book).toBeDefined();

				expect(Array.isArray(result.book.asks)).toBe(true);
				expect(result.book.asks.length).toBeLessThanOrEqual(maximumNumberOfOrders);

				const firstBidOrder = result.book.bids[0];
				expect(firstBidOrder).toBeDefined();
				expect(firstBidOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstBidOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstBidOrder.raw).toBeDefined();

				expect(Array.isArray(result.book.bids)).toBe(true);
				expect(result.book.bids.length).toBeLessThanOrEqual(maximumNumberOfOrders);

				const firstAskOrder = result.book.asks[0];
				expect(firstAskOrder).toBeDefined();
				expect(firstAskOrder.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstAskOrder.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(firstAskOrder.raw).toBeDefined();

				expect(result.book.bestAsk).toBeDefined();
				expect(result.book.bestAsk!.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.book.bestAsk!.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.book.bestAsk!.raw).toBeDefined();

				expect(result.book.bestBid).toBeDefined();
				expect(result.book.bestBid!.price.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.book.bestBid!.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.book.bestBid!.raw).toBeDefined();

				expect(result.book.bestAsk!.price.toNumber()).toBeGreaterThanOrEqual(result.book.bestBid!.price.toNumber());

				expect(result.book.middlePrice).toBeDefined();
				expect(result.book.middlePrice!.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
				expect(result.book.middlePrice!.toNumber()).toBeLessThanOrEqual(result.book.bestAsk!.price.toNumber());
				expect(result.book.middlePrice!.toNumber()).toBeGreaterThanOrEqual(result.book.bestBid!.price.toNumber());

				expect(result.raw).toBeDefined();
			});
		});
	});
});

// TODO fix and remove!!!
// let fin: Fin;

// beforeAll(async () => {
//   fin = new Fin({
//     restEndpoint: FIN_RPC_ENDPOINT
//   });
//   const wallet = await DirectSecp256k1Wallet.fromKey(
//     fromBase64(TEAM_RUJIRA_WALLET_PRIVATE_KEY),
//     DEFAULT_WALLET_PREFIX
//   );
//   const cosmClient = await SigningCosmWasmClient.connectWithSigner(
//     FIN_RPC_ENDPOINT,
//     wallet
//   );
//   await fin.initialize({
//     wallet,
//     cosmClient
//   });
// });

// describe('Fin Real Order Placement', () => {
//   it('should place a single real order', async () => {
//     const orderRequest: FinPlaceOrderRequest = {
//       ownerAddress: FIN_ORDER_OWNER,
//       marketAddress: FIN_CONTRACT_ADDRESS,
//       side: OrderSide.BUY,
//       type: OrderType.LIMIT,
//       price: new Decimal(FIN_ORDER_PRICE_FIXED),
//       amount: new Decimal('1')
//     };
//     try {
//       const result = await fin.placeOrder(orderRequest);
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
//       ownerAddress: FIN_ORDER_OWNER,
//       orders: [
//         {
//           ownerAddress: FIN_ORDER_OWNER,
//           marketAddress: FIN_CONTRACT_ADDRESS,
//           side: OrderSide.BUY,
//           type: OrderType.LIMIT,
//           price: new Decimal(FIN_ORDER_PRICE_FIXED),
//           amount: new Decimal('1')
//         },
//         {
//           ownerAddress: FIN_ORDER_OWNER,
//           marketAddress: FIN_CONTRACT_ADDRESS,
//           side: OrderSide.SELL,
//           type: OrderType.LIMIT,
//           price: new Decimal(FIN_ORDER_PRICE_FIXED),
//           amount: new Decimal('2')
//         }
//       ]
//     };
//     const result: FinPlaceOrdersResponse = await fin.placeOrders(ordersRequest);
//     expect(result).toBeDefined();
//     expect(result.orders.size).toBe(ordersRequest.orders.length);
//     expect(result.orders.size).toBeLessThanOrEqual(maximumNumberOfOrders);
//     expect(Array.from(result.orders.values()).length).toBe(result.orders.size);
//     const ordersArr = Array.from(result.orders.values());
//     expect(ordersArr[0]).toBeDefined();
//     // Check that the first order matches the first request order
//     expect(ordersArr[0].side).toBe(ordersRequest.orders[0].side);
//     expect(ordersArr[0].type).toBe(ordersRequest.orders[0].type);
//     expect(ordersArr[0].price.toString()).toBe(ordersRequest.orders[0].price.toString());
//     expect(ordersArr[0].amount.toString()).toBe(ordersRequest.orders[0].amount.toString());
//     expect(ordersArr[0].owner).toBe(ordersRequest.orders[0].ownerAddress ?? '');
//     if (ordersArr[0].market && ordersArr[0].market.address && ordersRequest.orders[0].marketAddress) {
//       expect(ordersArr[0].market.address).toBe(ordersRequest.orders[0].marketAddress);
//     }
//     // Deep checks for first order
//     expect(typeof ordersArr[0].id).toBe('string');
//     expect(['buy', 'sell']).toContain(ordersArr[0].side);
//     expect(['limit', 'market']).toContain(ordersArr[0].type);
//     expect(ordersArr[0].price.constructor.name).toBe('Decimal');
//     expect(ordersArr[0].amount.constructor.name).toBe('Decimal');
//     expect(ordersArr[0].filledAmount.constructor.name).toBe('Decimal');
//     expect(ordersArr[0].filledPercentage.constructor.name).toBe('Decimal');
//     expect([
//       'open', 'cancelled', 'partially_filled', 'filled', 'creation_pending', 'cancellation_pending', 'unknown'
//     ]).toContain(ordersArr[0].status);
//     expect(typeof ordersArr[0].market).toBe('object');
//     expect(typeof ordersArr[0].market.symbol).toBe('string');
//     expect(typeof ordersArr[0].market.address).toBe('string');
//     expect(typeof ordersArr[0].market.decimals).toBe('number');
//     expect(['active', 'inactive']).toContain(ordersArr[0].market.status);
//     expect(typeof ordersArr[0].market.tokens).toBe('object');
//     expect(typeof ordersArr[0].market.tokens.base).toBe('object');
//     expect(typeof ordersArr[0].market.tokens.base.symbol).toBe('string');
//     expect(typeof ordersArr[0].market.tokens.base.address).toBe('string');
//     expect(typeof ordersArr[0].market.tokens.base.name).toBe('string');
//     expect(typeof ordersArr[0].market.tokens.base.decimals).toBe('number');
//     expect(typeof ordersArr[0].market.tokens.quote).toBe('object');
//     expect(typeof ordersArr[0].market.tokens.quote.symbol).toBe('string');
//     expect(typeof ordersArr[0].market.tokens.quote.address).toBe('string');
//     expect(typeof ordersArr[0].market.tokens.quote.name).toBe('string');
//     expect(typeof ordersArr[0].market.tokens.quote.decimals).toBe('number');
//     expect(typeof ordersArr[0].raw).toBe('object');
//     // Also check second order for key fields
//     expect(ordersArr[1]).toBeDefined();
//     expect(['buy', 'sell']).toContain(ordersArr[1].side);
//     expect(['limit', 'market']).toContain(ordersArr[1].type);
//     expect(ordersArr[1].price.constructor.name).toBe('Decimal');
//     expect(ordersArr[1].amount.constructor.name).toBe('Decimal');
//     expect(ordersArr[1].owner).toBe(ordersRequest.orders[1].ownerAddress ?? '');
//     if (ordersArr[1].market && ordersArr[1].market.address && ordersRequest.orders[1].marketAddress) {
//       expect(ordersArr[1].market.address).toBe(ordersRequest.orders[1].marketAddress);
//     }
//     // Order 1
//     expect(ordersArr[1].id).toBeDefined();
//     expect([OrderSide.BUY, OrderSide.SELL]).toContain(ordersArr[1].side);
//     expect([OrderType.LIMIT]).toContain(ordersArr[1].type);
//     expect(ordersArr[1].price).toBeDefined();
//     expect(ordersArr[1].amount).toBeDefined();
//     expect(ordersArr[1].owner).toBe(FIN_ORDER_OWNER);
//     expect(ordersArr[1].market).toBeDefined();
//     expect(ordersArr[1].status).toBeDefined();
//     expect(ordersArr[1].filledAmount).toBeDefined();
//     expect(ordersArr[1].filledPercentage).toBeDefined();
//     expect(ordersArr[1].raw).toBeDefined();
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
// });
