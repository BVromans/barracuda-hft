
import { beforeAll, describe, expect, it } from 'bun:test';
import { Decimal } from 'decimal.js';
import {
  FinCreateOrderRequest as FinPlaceOrderRequest,
  FinCreateOrdersRequest as FinPlaceOrdersRequest,
  FinCreateOrdersResponse as FinPlaceOrdersResponse,
  OrderSide,
  OrderType,
  Order
} from '../../src/types';

// Mock Fin client
class MockFin {
  async initialize() {
    // No-op for mock
  }

  async placeOrder(orderRequest: any) {
    // Return a fake order object
    return {
      market: { symbol: orderRequest.marketSymbol },
      amount: orderRequest.amount,
      side: orderRequest.side,
      type: orderRequest.type,
      price: orderRequest.price,
      owner: orderRequest.ownerAddress,
    };
  }

  async placeOrders(ordersRequest: any) {
    // Return a fake response with two orders
    const orders = new Map();
    ordersRequest.orders.forEach((order: any, idx: number) => {
      orders.set(`order${idx + 1}`, {
        market: { symbol: order.marketSymbol },
        amount: order.amount,
        side: order.side,
        type: order.type,
        price: order.price,
        owner: order.ownerAddress,
      });
    });
    return {
      orders,
      transactions: new Map(),
    };
  }
}

const DUMMY_MARKET_SYMBOL = process.env.MARKET_SYMBOL || 'RUJI/USDC';
const DUMMY_OWNER_ADDRESS = process.env.OWNER_ADDRESS || 'thor1...';

let fin: any;

describe('Fin Order Placement', () => {
  beforeAll(async () => {
    fin = new MockFin();
    await fin.initialize();
  });

  it('should place a single order', async () => {
    const orderRequest: FinPlaceOrderRequest = {
      ownerAddress: DUMMY_OWNER_ADDRESS,
      marketSymbol: DUMMY_MARKET_SYMBOL,
      side: OrderSide.BUY,
      type: OrderType.LIMIT,
      price: new Decimal('0.01'),
      amount: new Decimal('1')
    };
    const result: any = await fin.placeOrder(orderRequest);
    expect(result).toBeDefined();
    expect(result.market).toBeDefined();
    expect(result.amount).toBeDefined();
    expect(result.side).toBe(OrderSide.BUY);
    expect(result.type).toBe(OrderType.LIMIT);
    expect(result.price).toBeDefined();
    expect(result.amount.toString()).toBe('1');
    expect(result.owner).toBe(DUMMY_OWNER_ADDRESS);
  });

  it('should place multiple orders', async () => {
    const ordersRequest: FinPlaceOrdersRequest = {
      ownerAddress: DUMMY_OWNER_ADDRESS,
      orders: [
        {
          ownerAddress: DUMMY_OWNER_ADDRESS,
          marketSymbol: DUMMY_MARKET_SYMBOL,
          side: OrderSide.BUY,
          type: OrderType.LIMIT,
          price: new Decimal('0.02'),
          amount: new Decimal('2')
        },
        {
          ownerAddress: DUMMY_OWNER_ADDRESS,
          marketSymbol: DUMMY_MARKET_SYMBOL,
          side: OrderSide.SELL,
          type: OrderType.LIMIT,
          price: new Decimal('0.03'),
          amount: new Decimal('3')
        }
      ]
    };
    const result: FinPlaceOrdersResponse | null = await fin.placeOrders(ordersRequest);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.orders.size).toBe(2);
      const ordersArr = Array.from(result.orders.values());
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
      expect(ordersArr[0].owner).toBe(DUMMY_OWNER_ADDRESS);
      expect(ordersArr[1].owner).toBe(DUMMY_OWNER_ADDRESS);
    }
  });
}); 