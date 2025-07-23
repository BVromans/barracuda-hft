import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, jest } from "bun:test";
import { Rujira } from "../src/rujira";
import { BIG_NUMBER_0, DECIMAL_0, DECIMAL_1, DECIMAL_2, DECIMAL_3, DECIMAL_4, DECIMAL_5, DECIMAL_6, FEE_PAYMENT_TOKEN, MarketStatus, Order, OrderStatus, SystemStatus, TransactionStatus, Wallet } from "../src/types";
import {
  FinPlaceOrderRequest,
  FinPlaceOrdersRequest,
  FinPlaceOrdersResponse,
  OrderSide,
  OrderType,
  Map,
  Integer
} from "../src/types";
import Decimal from "decimal.js";
import { Fin } from "../src/rujira";

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
let ownerAddress: string;
let priceFixed: string;

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
    'OWNER_ADDRESS',
    'PRICE_FIXED'
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
		ownerAddress = process.env.OWNER_ADDRESS!;
		priceFixed = process.env.PRICE_FIXED!;

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
	});
});


describe('Fin Real Order Placement', () => {
  it('should place a single real order', async () => {
    const orderRequest: FinPlaceOrderRequest = {
      ownerAddress: ownerAddress,
      marketAddress: marketAddress,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: new Decimal(priceFixed),
      amount: new Decimal('1')
    };
    try {
      const result = await rujira.fin.placeOrder(orderRequest);
      expect(result).toBeDefined();
      expect(result.order).toBeDefined();
      expect(typeof result.order.id).toBe('string');
      expect(['buy', 'sell']).toContain(result.order.side);
      expect(['limit', 'market']).toContain(result.order.type);
      expect(result.order.price.constructor.name).toBe('Decimal');
      expect(result.order.amount.constructor.name).toBe('Decimal');
      expect(result.order.filledAmount.constructor.name).toBe('Decimal');
      expect(result.order.filledPercentage.constructor.name).toBe('Decimal');
      expect([
        'open', 'cancelled', 'partially_filled', 'filled', 'creation_pending', 'cancellation_pending', 'unknown'
      ]).toContain(result.order.status);
      expect(typeof result.order.market).toBe('object');
      expect(typeof result.order.market.symbol).toBe('string');
      expect(typeof result.order.market.address).toBe('string');
      expect(typeof result.order.market.decimals).toBe('number');
      expect(['active', 'inactive']).toContain(result.order.market.status);
      expect(typeof result.order.market.tokens).toBe('object');
      expect(typeof result.order.market.tokens.base).toBe('object');
      expect(typeof result.order.market.tokens.base.symbol).toBe('string');
      expect(typeof result.order.market.tokens.base.address).toBe('string');
      expect(typeof result.order.market.tokens.base.name).toBe('string');
      expect(typeof result.order.market.tokens.base.decimals).toBe('number');
      expect(typeof result.order.market.tokens.quote).toBe('object');
      expect(typeof result.order.market.tokens.quote.symbol).toBe('string');
      expect(typeof result.order.market.tokens.quote.address).toBe('string');
      expect(typeof result.order.market.tokens.quote.name).toBe('string');
      expect(typeof result.order.market.tokens.quote.decimals).toBe('number');
      expect(typeof result.order.raw).toBe('object');
      // Transaction checks
      expect(result.transaction).toBeDefined();
      expect(typeof result.transaction.hash).toBe('string');
      expect(['pending', 'success', 'failed']).toContain(result.transaction.status.toLowerCase());
      expect(result.transaction.fee.amount.constructor.name).toBe('Decimal');
      expect(typeof result.transaction.fee.token).toBe('object');
      expect(typeof result.transaction.fee.token.symbol).toBe('string');
      expect(typeof result.transaction.fee.token.address).toBe('string');
      expect(typeof result.transaction.fee.token.name).toBe('string');
      expect(typeof result.transaction.raw).toBe('object');
    } catch (err: any) {
      console.error('Error creating single order:', err?.response || err);
      throw err;
    }
  });

  it('should place multiple real orders', async () => {
    const maximumNumberOfOrders = 10;

    const ordersRequest: FinPlaceOrdersRequest = {
      ownerAddress: ownerAddress,
      orders: [
        {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          price: new Decimal(priceFixed),
          amount: new Decimal('1')
        },
        {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          price: new Decimal(priceFixed),
          amount: new Decimal('2')
        }
      ]
    };
    const result: FinPlaceOrdersResponse = await rujira.fin.placeOrders(ordersRequest);
    expect(result).toBeDefined();
    expect(result.orders.size).toBe(ordersRequest.orders.length);
    expect(result.orders.size).toBeLessThanOrEqual(maximumNumberOfOrders);
    expect(Array.from(result.orders.values()).length).toBe(result.orders.size);
    const ordersArr = result.orders.valueSeq().toArray() as Order[];
    expect(ordersArr[0]).toBeDefined();

    const ordersList = Array.isArray(ordersRequest.orders)
  ? ordersRequest.orders
  : (ordersRequest.orders as any).toArray();

    expect(ordersArr[DECIMAL_0.toNumber()].side).toBe(ordersList[DECIMAL_0.toNumber()]!.side);
    expect(ordersArr[DECIMAL_0.toNumber()].type).toBe(ordersList[DECIMAL_0.toNumber()]!.type);
    expect(ordersArr[DECIMAL_0.toNumber()].price.toString()).toBe(ordersList[DECIMAL_0.toNumber()]!.price.toString());
    expect(ordersArr[DECIMAL_0.toNumber()].amount.toString()).toBe(ordersList[DECIMAL_0.toNumber()]!.amount.toString());
    expect(ordersArr[DECIMAL_0.toNumber()].owner).toBe(ordersList[DECIMAL_0.toNumber()]!.ownerAddress ?? '');
    if (ordersArr[DECIMAL_0.toNumber()].market && ordersArr[DECIMAL_0.toNumber()].market.address && ordersList[DECIMAL_0.toNumber()]!.marketAddress) {
      expect(ordersArr[DECIMAL_0.toNumber()].market.address).toBe(ordersList[DECIMAL_0.toNumber()]!.marketAddress);
    }
    // Deep checks for first order
    expect(typeof ordersArr[DECIMAL_0.toNumber()].id).toBe('string');
    expect(['buy', 'sell']).toContain(ordersArr[DECIMAL_0.toNumber()].side);
    expect(['limit', 'market']).toContain(ordersArr[DECIMAL_0.toNumber()].type);
    expect(ordersArr[DECIMAL_0.toNumber()].price.constructor.name).toBe('Decimal');
    expect(ordersArr[DECIMAL_0.toNumber()].amount.constructor.name).toBe('Decimal');
    expect(ordersArr[DECIMAL_0.toNumber()].filledAmount.constructor.name).toBe('Decimal');
    expect(ordersArr[DECIMAL_0.toNumber()].filledPercentage.constructor.name).toBe('Decimal');
    expect([
      'open', 'cancelled', 'partially_filled', 'filled', 'creation_pending', 'cancellation_pending', 'unknown'
    ]).toContain(ordersArr[DECIMAL_0.toNumber()].status);
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market).toBe('object');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.symbol).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.address).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.decimals).toBe('number');
    expect(['active', 'inactive']).toContain(ordersArr[DECIMAL_0.toNumber()].market.status);
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens).toBe('object');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base).toBe('object');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.symbol).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.address).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.name).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.base.decimals).toBe('number');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote).toBe('object');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.symbol).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.address).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.name).toBe('string');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].market.tokens.quote.decimals).toBe('number');
    expect(typeof ordersArr[DECIMAL_0.toNumber()].raw).toBe('object');
    // Also check second order for key fields
    expect(ordersArr[DECIMAL_1.toNumber()]).toBeDefined();
    expect(['buy', 'sell']).toContain(ordersArr[DECIMAL_1.toNumber()].side);
    expect(['limit', 'market']).toContain(ordersArr[DECIMAL_1.toNumber()].type);
    expect(ordersArr[DECIMAL_1.toNumber()].price.constructor.name).toBe('Decimal');
    expect(ordersArr[DECIMAL_1.toNumber()].amount.constructor.name).toBe('Decimal');
    expect(ordersArr[DECIMAL_1.toNumber()].owner).toBe(ordersList[DECIMAL_1.toNumber()]!.ownerAddress ?? '');
    if (ordersArr[DECIMAL_1.toNumber()].market && ordersArr[DECIMAL_1.toNumber()].market.address && ordersList[DECIMAL_1.toNumber()]!.marketAddress) {
      expect(ordersArr[DECIMAL_1.toNumber()].market.address).toBe(ordersList[DECIMAL_1.toNumber()]!.marketAddress);
    }
    // Order 1
    expect(ordersArr[DECIMAL_1.toNumber()].id).toBeDefined();
    expect([OrderSide.BUY, OrderSide.SELL]).toContain(ordersArr[DECIMAL_1.toNumber()].side);
    expect([OrderType.LIMIT]).toContain(ordersArr[DECIMAL_1.toNumber()].type);
    expect(ordersArr[DECIMAL_1.toNumber()].price).toBeDefined();
    expect(ordersArr[DECIMAL_1.toNumber()].amount).toBeDefined();
    expect(ordersArr[DECIMAL_1.toNumber()].owner).toBe(ownerAddress);
    expect(ordersArr[DECIMAL_1.toNumber()].market).toBeDefined();
    expect(ordersArr[DECIMAL_1.toNumber()].status).toBeDefined();
    expect(ordersArr[DECIMAL_1.toNumber()].filledAmount).toBeDefined();
    expect(ordersArr[DECIMAL_1.toNumber()].filledPercentage).toBeDefined();
    expect(ordersArr[DECIMAL_1.toNumber()].raw).toBeDefined();
    // Transaction checks (if available)
    expect(result.transactions).toBeDefined();
    expect(result.transactions.size).toBeGreaterThan(0);
    for (const tx of result.transactions.values()) {
      expect(typeof tx.hash).toBe('string');
      expect(['pending', 'success', 'failed']).toContain(tx.status.toLowerCase());
      expect(tx.fee.amount.constructor.name).toBe('Decimal');
      expect(typeof tx.fee.token).toBe('object');
      expect(typeof tx.fee.token.symbol).toBe('string');
      expect(typeof tx.fee.token.address).toBe('string');
      expect(typeof tx.fee.token.name).toBe('string');
      expect(typeof tx.raw).toBe('object');
    }
  });
});

describe('Fin Order Replacement', () => {
  it('should replace a single order successfully', async () => {
    // Primeiro, crie uma ordem para cancelar
    const orderRequest: FinPlaceOrderRequest = {
      ownerAddress: ownerAddress,
      marketAddress: marketAddress,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: new Decimal(priceFixed),
      amount: new Decimal('1')
    };
    const placed = await rujira.fin.placeOrder(orderRequest);
    expect(placed).toBeDefined();
    expect(placed.order).toBeDefined();
    const cancelRequest = {
      ownerAddress: ownerAddress,
      marketAddress: marketAddress,
      orderId: placed.order.id
    };
    const newOrderRequest: FinPlaceOrderRequest = {
      ownerAddress: ownerAddress,
      marketAddress: marketAddress,
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: new Decimal(priceFixed),
      amount: new Decimal('2')
    };
    const result = await rujira.fin.replaceOrder(cancelRequest, newOrderRequest);
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();

    expect(result.cancelResult).toBeDefined();
    expect(result.cancelResult!.order).toBeDefined();
    expect(result.cancelResult!.order).toMatchObject({
      id: expect.any(String),
      status: OrderStatus.CANCELLED,
      owner: expect.any(String),
      side: expect.any(String),
      type: expect.any(String),
      price: expect.any(Decimal),
      amount: expect.any(Decimal),
      filledAmount: expect.any(Decimal),
      filledPercentage: expect.any(Decimal),
      raw: expect.any(Object),
    });
    expect(result.cancelResult!.transaction).toBeDefined();
    expect(result.cancelResult!.transaction).toMatchObject({
      hash: expect.any(String),
      status: expect.any(String),
      fee: expect.objectContaining({
        amount: expect.any(Decimal),
        token: expect.any(Object),
      }),
      raw: expect.any(Object),
    });

    expect(result.placeResult).toBeDefined();
    expect(result.placeResult!.order).toBeDefined();
    expect(result.placeResult!.order).toMatchObject({
      id: expect.any(String),
      owner: expect.any(String),
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: expect.any(Decimal),
      amount: expect.any(Decimal),
      filledAmount: expect.any(Decimal),
      filledPercentage: expect.any(Decimal),
      status: expect.any(String),
      market: expect.any(Object),
      raw: expect.any(Object),
    });
    expect(result.placeResult!.transaction).toBeDefined();
    expect(result.placeResult!.transaction).toMatchObject({
      hash: expect.any(String),
      status: expect.any(String),
      fee: expect.objectContaining({
        amount: expect.any(Decimal),
        token: expect.any(Object),
      }),
      raw: expect.any(Object),
    });
  });

  it('should handle error if cancel or place is missing', async () => {
    const result1 = await rujira.fin.replaceOrder(undefined as any, {} as any);
    expect(result1).toBeDefined();
    expect(result1.cancelResult).toBeUndefined();
    expect(result1.placeResult).toBeUndefined();
    expect(result1.error).toBeInstanceOf(Error);
    expect(result1.error!.message).toMatch(/Both cancel and place must be provided/);
    const result2 = await rujira.fin.replaceOrder({} as any, undefined as any);
    expect(result2).toBeDefined();
    expect(result2.cancelResult).toBeUndefined();
    expect(result2.placeResult).toBeUndefined();
    expect(result2.error).toBeInstanceOf(Error);
  });

  it('should replace multiple orders (replaceOrders) successfully', async () => {
    const orderReq1: FinPlaceOrderRequest = {
      ownerAddress: ownerAddress,
      marketAddress: marketAddress,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: new Decimal(priceFixed),
      amount: new Decimal('1')
    };
    const orderReq2: FinPlaceOrderRequest = {
      ownerAddress: ownerAddress,
      marketAddress: marketAddress,
      side: OrderSide.SELL,
      type: OrderType.LIMIT,
      price: new Decimal(priceFixed),
      amount: new Decimal('2')
    };
    const placed1 = await rujira.fin.placeOrder(orderReq1);
    const placed2 = await rujira.fin.placeOrder(orderReq2);

    expect(placed1.order).toBeDefined();
    expect(placed2.order).toBeDefined();

    const replaces = [
      {
        cancel: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          orderId: placed1.order.id
        },
        place: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          price: new Decimal(priceFixed),
          amount: new Decimal('3')
        }
      },
      {
        cancel: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          orderId: placed2.order.id
        },
        place: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          price: new Decimal(priceFixed),
          amount: new Decimal('4')
        }
      }
    ];

    const results = await rujira.fin.replaceOrders(replaces);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(2);

    for (const [i, res] of (results as Array<{ cancelResult?: any, placeResult?: any, error?: Error }>).entries()) {
      expect(res).toBeDefined();
      expect(res.error).toBeUndefined();

      expect(res.cancelResult).toBeDefined();
      expect(res.cancelResult!.order).toBeDefined();
      expect(res.cancelResult!.order).toMatchObject({
        id: expect.any(String),
        status: OrderStatus.CANCELLED,
        owner: expect.any(String),
        side: expect.any(String),
        type: expect.any(String),
        price: expect.any(Decimal),
        amount: expect.any(Decimal),
        filledAmount: expect.any(Decimal),
        filledPercentage: expect.any(Decimal),
        raw: expect.any(Object),
      });
      expect(typeof res.cancelResult!.order.id).toBe('string');
      expect(res.cancelResult!.order.status).toBe(OrderStatus.CANCELLED);
      expect(res.cancelResult!.transaction).toBeDefined();
      expect(res.cancelResult!.transaction).toMatchObject({
        hash: expect.any(String),
        status: expect.any(String),
        fee: expect.objectContaining({
          amount: expect.any(Decimal),
          token: expect.any(Object),
        }),
        raw: expect.any(Object),
      });
      expect(typeof res.cancelResult!.transaction.hash).toBe('string');
      expect(res.cancelResult!.transaction.fee.amount).toBeInstanceOf(Decimal);

      expect(res.placeResult).toBeDefined();
      expect(res.placeResult!.order).toBeDefined();
      expect(res.placeResult!.order).toMatchObject({
        id: expect.any(String),
        owner: expect.any(String),
        side: expect.any(String),
        type: expect.any(String),
        price: expect.any(Decimal),
        amount: expect.any(Decimal),
        filledAmount: expect.any(Decimal),
        filledPercentage: expect.any(Decimal),
        status: expect.any(String),
        market: expect.any(Object),
        raw: expect.any(Object),
      });
      expect(['buy', 'sell']).toContain(res.placeResult!.order.side);
      expect(['limit', 'market']).toContain(res.placeResult!.order.type);
      expect(res.placeResult!.order.price).toBeInstanceOf(Decimal);
      expect(res.placeResult!.order.amount).toBeInstanceOf(Decimal);

      expect(res.placeResult!.order.side).toBe(replaces[i].place.side);
      expect(res.placeResult!.order.type).toBe(replaces[i].place.type);
      expect(res.placeResult!.order.amount.toString()).toBe(replaces[i].place.amount.toString());
      expect(res.placeResult!.order.price.toString()).toBe(replaces[i].place.price.toString());

      expect(res.placeResult!.transaction).toBeDefined();
      expect(res.placeResult!.transaction).toMatchObject({
        hash: expect.any(String),
        status: expect.any(String),
        fee: expect.objectContaining({
          amount: expect.any(Decimal),
          token: expect.any(Object),
        }),
        raw: expect.any(Object),
      });
      expect(typeof res.placeResult!.transaction.hash).toBe('string');
      expect(res.placeResult!.transaction.fee.amount).toBeInstanceOf(Decimal);
    }
  });

  it('should replace three orders (replaceOrders) successfully', async () => {
    const orderReqs: FinPlaceOrderRequest[] = [
      {
        ownerAddress: ownerAddress,
        marketAddress: marketAddress,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: new Decimal(priceFixed),
        amount: new Decimal(DECIMAL_1)
      },
      {
        ownerAddress: ownerAddress,
        marketAddress: marketAddress,
        side: OrderSide.SELL,
        type: OrderType.LIMIT,
        price: new Decimal(priceFixed),
        amount: new Decimal(DECIMAL_2)
      },
      {
        ownerAddress: ownerAddress,
        marketAddress: marketAddress,
        side: OrderSide.BUY,
        type: OrderType.LIMIT,
        price: new Decimal(priceFixed),
        amount: new Decimal(DECIMAL_3)
      }
    ];
    const placed = [];
    for (const req of orderReqs) {
      placed.push(await rujira.fin.placeOrder(req));
    }
    placed.forEach(p => expect(p.order).toBeDefined());

    const replaces = [
      {
        cancel: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          orderId: placed[0].order.id
        },
        place: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          price: new Decimal(priceFixed),
          amount: new Decimal(DECIMAL_4)
        }
      },
      {
        cancel: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          orderId: placed[1].order.id
        },
        place: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          price: new Decimal(priceFixed),
          amount: new Decimal(DECIMAL_5)
        }
      },
      {
        cancel: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          orderId: placed[2].order.id
        },
        place: {
          ownerAddress: ownerAddress,
          marketAddress: marketAddress,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          price: new Decimal(priceFixed),
          amount: new Decimal(DECIMAL_6)
        }
      }
    ];

    const results = await rujira.fin.replaceOrders(replaces);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3);

    for (const [i, res] of (results as Array<{ cancelResult?: any, placeResult?: any, error?: Error }>).entries()) {
      expect(res).toBeDefined();
      expect(res.error).toBeUndefined();
      expect(res.cancelResult).toBeDefined();
      expect(res.cancelResult!.order).toBeDefined();
      expect(res.cancelResult!.order.status).toBe(OrderStatus.CANCELLED);
      expect(res.cancelResult!.transaction).toBeDefined();
      expect(res.placeResult).toBeDefined();
      expect(res.placeResult!.order).toBeDefined();
      expect(['buy', 'sell']).toContain(res.placeResult!.order.side);
      expect(['limit', 'market']).toContain(res.placeResult!.order.type);
      expect(res.placeResult!.order.price).toBeInstanceOf(Decimal);
      expect(res.placeResult!.order.amount).toBeInstanceOf(Decimal);
      expect(res.placeResult!.order.side).toBe(replaces[i].place.side);
      expect(res.placeResult!.order.type).toBe(replaces[i].place.type);
      expect(res.placeResult!.order.amount.toString()).toBe(replaces[i].place.amount.toString());
      expect(res.placeResult!.order.price.toString()).toBe(replaces[i].place.price.toString());
      expect(res.placeResult!.transaction).toBeDefined();
      expect(typeof res.placeResult!.transaction.hash).toBe('string');
      expect(res.placeResult!.transaction.fee.amount).toBeInstanceOf(Decimal);
    }
  });
});
