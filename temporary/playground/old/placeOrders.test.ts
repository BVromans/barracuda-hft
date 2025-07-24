
import { beforeAll, describe, expect, it } from 'bun:test';
import { Decimal } from 'decimal.js';
import {
  FinPlaceOrderRequest as FinPlaceOrderRequest,
  FinPlaceOrdersRequest as FinPlaceOrdersRequest,
  FinPlaceOrdersResponse as FinPlaceOrdersResponse,
  OrderSide,
  OrderType,
  Order,
  BIG_NUMBER_0
} from '../../../src/types';
import { Fin } from '../../../src/rujira';
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { fromBase64 } from "@cosmjs/encoding";

const FIN_RPC_ENDPOINT = process.env.FIN_RPC_ENDPOINT!;
const FIN_CONTRACT_ADDRESS = process.env.FIN_CONTRACT_ADDRESS!;
const TEAM_RUJIRA_WALLET_PRIVATE_KEY = process.env.TEAM_RUJIRA_WALLET_PRIVATE_KEY!;
const FIN_ORDER_OWNER = process.env.FIN_ORDER_OWNER!;
const FIN_ORDER_PRICE_FIXED = process.env.FIN_ORDER_PRICE_FIXED!;

let fin: Fin;

beforeAll(async () => {
  fin = new Fin({
    restEndpoint: FIN_RPC_ENDPOINT
  });
  const wallet = await DirectSecp256k1Wallet.fromKey(
    fromBase64(TEAM_RUJIRA_WALLET_PRIVATE_KEY),
    'thor'
  );
  const cosmClient = await SigningCosmWasmClient.connectWithSigner(
    FIN_RPC_ENDPOINT,
    wallet
  );
  await fin.initialize({
    wallet,
    cosmClient
  });
});

describe('Fin Real Order Placement', () => {
  it('should place a single real order', async () => {
    const orderRequest: FinPlaceOrderRequest = {
      ownerAddress: FIN_ORDER_OWNER,
      marketAddress: FIN_CONTRACT_ADDRESS,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: new Decimal(FIN_ORDER_PRICE_FIXED),
      amount: undefined as any
    } as FinPlaceOrderRequest;
    try {
      const result = await fin.placeOrder(orderRequest);
      expect(result).toBeDefined();
      expect(result.order).toBeDefined();
      expect(result.order.owner).toBe(FIN_ORDER_OWNER);
      expect(result.order.side).toBe(OrderSide.BUY);
      expect(result.order.type).toBe(OrderType.LIMIT);
      expect(result.order.price).toBeDefined();
      expect(result.order.amount).toBeDefined();
      expect(result.order.amount.toNumber()).toBeGreaterThan(BIG_NUMBER_0.toNumber());
      expect(result.transaction).toBeDefined();
    } catch (err: any) {
      console.error('Error creating single order:', err?.response || err);
      throw err;
    }
  });

  it('should place multiple real orders', async () => {
    const ordersRequest: FinPlaceOrdersRequest = {
      ownerAddress: FIN_ORDER_OWNER,
      orders: [
        {
          ownerAddress: FIN_ORDER_OWNER,
          marketAddress: FIN_CONTRACT_ADDRESS,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          price: new Decimal(FIN_ORDER_PRICE_FIXED),
          amount: new Decimal('1')
        },
        {
          ownerAddress: FIN_ORDER_OWNER,
          marketAddress: FIN_CONTRACT_ADDRESS,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          price: new Decimal(FIN_ORDER_PRICE_FIXED),
          amount: new Decimal('2')
        }
      ]
    };
    try {
      const result: FinPlaceOrdersResponse = await fin.placeOrders(ordersRequest);
      expect(result).toBeDefined();
      expect(result.orders.size).toBe(ordersRequest.orders.length);
      const ordersArr = Array.from(result.orders.values()) as Order[];
      expect(ordersArr[0]).toBeDefined();
      expect(ordersArr[1]).toBeDefined();
      expect([OrderSide.BUY, OrderSide.SELL]).toContain(ordersArr[0].side);
      expect([OrderSide.BUY, OrderSide.SELL]).toContain(ordersArr[1].side);
      expect([OrderType.LIMIT]).toContain(ordersArr[0].type);
      expect([OrderType.LIMIT]).toContain(ordersArr[1].type);
      expect(ordersArr[0].price).toBeDefined();
      expect(ordersArr[1].price).toBeDefined();
      expect(ordersArr[0].amount).toBeDefined();
      expect(ordersArr[1].amount).toBeDefined();
      expect(ordersArr[0].owner).toBe(FIN_ORDER_OWNER);
      expect(ordersArr[1].owner).toBe(FIN_ORDER_OWNER);
    } catch (err: any) {
      console.error('Error creating multiple orders:', err?.response || err);
      throw err;
    }
  });
});
