// This test file is intended to be run with Vitest or a compatible test runner.
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import Decimal from 'decimal.js';


const ENV = {
  FIN_RPC_ENDPOINT: 'https://thornode-mainnet-rpc.bryanlabs.net',
  FIN_CONTRACT_ADDRESS: 'thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a',
  
  TEAM_RUJIRA_ORDER_OWNER: 'thor1gsgx5xtw82r8qw06mrcxjzypuynqwjxcugk5fy',
};

// Mocked ASSET_INFO for test using ENV
const ASSET_INFO = {
  [ENV.FIN_CONTRACT_ADDRESS]: {
    symbol: 'RUJI',
    name: 'Rujira',
    denom: ENV.FIN_CONTRACT_ADDRESS,
    decimals: 6,
    chain: 'THOR',
    icon: 'https://example.com/ruji.png',
  },
  [ENV.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR]: {
    symbol: 'USDC',
    name: 'USD Coin',
    denom: ENV.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR,
    decimals: 6,
    chain: 'THOR',
    icon: 'https://example.com/usdc.png',
  },
};

// Usar apenas os endereços definidos em ENV
const envAddresses = [ENV.FIN_CONTRACT_ADDRESS];
const allSymbols = Object.keys(ASSET_INFO);


describe('FinProtocolClient Market Methods (Positive Cases)', () => {
  // No beforeAll/afterAll needed since we are not using createFinProtocolClient

  it('ASSET_INFO contains valid asset definitions', () => {
    const seenSymbols = new Set();
    const seenDenoms = new Set();
    const seenNames = new Set();
    for (const [key, asset] of Object.entries(ASSET_INFO) as [string, {
      symbol: string;
      name: string;
      denom: string;
      decimals: number;
      chain: string;
      icon: string;
    }][]) {
      expect(asset).toBeDefined();
      expect(typeof asset.symbol).toBe('string');
      expect(asset.symbol.length).toBeGreaterThan(0);
      expect(asset.symbol).toMatch(/^[A-Z0-9]+$/);
      expect(typeof asset.name).toBe('string');
      expect(asset.name.length).toBeGreaterThan(0);
      expect(asset.name.trim()).not.toBe('');
      expect(typeof asset.denom).toBe('string');
      expect(asset.denom.length).toBeGreaterThan(0);
      expect(key).toBe(asset.denom);
      if (asset.symbol === 'USDC') {
        expect(asset.symbol).toBe('USDC');
      } else {
        expect(asset.denom).toContain(asset.symbol);
      }
      expect(typeof asset.decimals).toBe('number');
      expect(Number.isFinite(asset.decimals)).toBe(true);
      expect(Number.isInteger(asset.decimals)).toBe(true);
      expect(asset.decimals).toBeGreaterThanOrEqual(0);
      expect(typeof asset.chain).toBe('string');
      expect(asset.chain.length).toBeGreaterThan(0);
      expect(asset.chain.trim()).not.toBe('');
      expect(typeof asset.icon).toBe('string');
      expect(asset.icon.length).toBeGreaterThan(0);
      expect(asset.icon).toMatch(/^https?:\/\//);
      seenSymbols.add(asset.symbol);
      seenDenoms.add(asset.denom);
      seenNames.add(asset.name);
      for (const field of Object.keys(asset)) {
        expect(['symbol','name','denom','decimals','chain','icon']).toContain(field);
      }
      expect(Object.values(asset)).not.toContain('');
    }
    expect(seenSymbols.size).toBe(Object.keys(ASSET_INFO).length);
    expect(seenDenoms.size).toBe(Object.keys(ASSET_INFO).length);
    expect(seenNames.size).toBe(Object.keys(ASSET_INFO).length);
  });

  it('getMarket returns correct market for each symbol', async () => {
    for (const symbol of allSymbols) {
      const market = await client.getMarket(symbol);
      expect(market).toBeDefined();
      expect(typeof market.address).toBe('string');
      expect(market.address.length).toBeGreaterThan(0);
      expect(market.address).toMatch(/^thor[0-9a-z]+$/);
      expect(typeof market.symbol).toBe('string');
      expect(market.symbol.length).toBeGreaterThan(0);
      expect(market.symbol).toMatch(/^[A-Z0-9]+\/[A-Z0-9]+$/);
      expect(market.tokens).toBeDefined();
      expect(market.tokens.base).toBeDefined();
      expect(market.tokens.quote).toBeDefined();
      // Base token
      const base = market.tokens.base;
      expect(base).toBeDefined();
      expect(typeof base.address).toBe('string');
      expect(base.address.length).toBeGreaterThan(0);
      expect(typeof base.symbol).toBe('string');
      expect(base.symbol.length).toBeGreaterThan(0);
      expect(typeof base.name).toBe('string');
      expect(base.name.length).toBeGreaterThan(0);
      expect(typeof base.decimals).toBe('number');
      expect(Number.isInteger(base.decimals)).toBe(true);
      expect(base.decimals).toBeGreaterThanOrEqual(0);
      expect(base.raw).toBeDefined();
      // Quote token
      const quote = market.tokens.quote;
      expect(quote).toBeDefined();
      expect(typeof quote.address).toBe('string');
      expect(quote.address.length).toBeGreaterThan(0);
      expect(typeof quote.symbol).toBe('string');
      expect(quote.symbol.length).toBeGreaterThan(0);
      expect(typeof quote.name).toBe('string');
      expect(quote.name.length).toBeGreaterThan(0);
      expect(typeof quote.decimals).toBe('number');
      expect(Number.isInteger(quote.decimals)).toBe(true);
      expect(quote.decimals).toBeGreaterThanOrEqual(0);
      expect(quote.raw).toBeDefined();
      expect(typeof market.decimals).toBe('number');
      expect(Number.isInteger(market.decimals)).toBe(true);
      expect(market.decimals).toBeGreaterThanOrEqual(0);
      expect(market.status).toBeDefined();
      expect(market.status.toLowerCase()).toBe('active');
      expect(market.raw).toBeDefined();
      if (market.price) {
        expect(typeof market.price).toBe('object');
        expect(market.price.baseQuote).toBeDefined();
        expect(market.price.quoteBase).toBeDefined();
        expect(Number(market.price.baseQuote)).not.toBeNaN();
        expect(Number(market.price.quoteBase)).not.toBeNaN();
      }
    }
  });

  it('getMarket returns correct market for each address', async () => {
    for (const [i, address] of envAddresses.entries()) {
      const market = await client.getMarket(address);
      expect(market).toBeDefined();
      expect(market.address).toBe(address);
      expect(typeof market.address).toBe('string');
      expect(market.address.length).toBeGreaterThan(0);
      expect(market.address).toMatch(/^thor[0-9a-z]+$/);
      expect(typeof market.symbol).toBe('string');
      expect(market.symbol.length).toBeGreaterThan(0);
      expect(market.symbol).toMatch(/^[A-Z0-9]+\/[A-Z0-9]+$/);
      expect(market.tokens).toBeDefined();
      expect(market.tokens.base).toBeDefined();
      expect(market.tokens.quote).toBeDefined();
      // Base token
      const base = market.tokens.base;
      expect(base).toBeDefined();
      expect(typeof base.address).toBe('string');
      expect(base.address.length).toBeGreaterThan(0);
      expect(typeof base.symbol).toBe('string');
      expect(base.symbol.length).toBeGreaterThan(0);
      expect(typeof base.name).toBe('string');
      expect(base.name.length).toBeGreaterThan(0);
      expect(typeof base.decimals).toBe('number');
      expect(Number.isInteger(base.decimals)).toBe(true);
      expect(base.decimals).toBeGreaterThanOrEqual(0);
      expect(base.raw).toBeDefined();
      // Quote token
      const quote = market.tokens.quote;
      expect(quote).toBeDefined();
      expect(typeof quote.address).toBe('string');
      expect(quote.address.length).toBeGreaterThan(0);
      expect(typeof quote.symbol).toBe('string');
      expect(quote.symbol.length).toBeGreaterThan(0);
      expect(typeof quote.name).toBe('string');
      expect(quote.name.length).toBeGreaterThan(0);
      expect(typeof quote.decimals).toBe('number');
      expect(Number.isInteger(quote.decimals)).toBe(true);
      expect(quote.decimals).toBeGreaterThanOrEqual(0);
      expect(quote.raw).toBeDefined();
      expect(typeof market.decimals).toBe('number');
      expect(Number.isInteger(market.decimals)).toBe(true);
      expect(market.decimals).toBeGreaterThanOrEqual(0);
      expect(market.status).toBeDefined();
      expect(market.status.toLowerCase()).toBe('active');
      expect(market.raw).toBeDefined();
      if (market.price) {
        expect(typeof market.price).toBe('object');
        expect(market.price.baseQuote).toBeDefined();
        expect(market.price.quoteBase).toBeDefined();
        expect(Number(market.price.baseQuote)).not.toBeNaN();
        expect(Number(market.price.quoteBase)).not.toBeNaN();
      }
    }
  });

  it('getMarkets returns correct markets for all addresses', async () => {
    const markets = await client.getMarkets(envAddresses);
    expect(typeof markets).toBe('object');
    expect((markets instanceof Map ? markets.size : Object.keys(markets).length)).toBe(envAddresses.length);
    const returnedAddresses = Array.from(markets instanceof Map ? markets.values() : Object.values(markets)).map((market: any) => market.address);
    for (const address of envAddresses) {
      expect(returnedAddresses).toContain(address);
      const market = Array.from(markets instanceof Map ? markets.values() : Object.values(markets))
        .find((market: any) => market.address === address) as any;
      expect(market).toBeDefined();
      expect(typeof market.address).toBe('string');
      expect(market.address.length).toBeGreaterThan(0);
      expect(market.address).toMatch(/^thor[0-9a-z]+$/);
      expect(market.tokens).toBeDefined();
      expect(market.tokens.base).toBeDefined();
      expect(market.tokens.quote).toBeDefined();
      // Base token
      const base = market.tokens.base;
      expect(base).toBeDefined();
      expect(typeof base.address).toBe('string');
      expect(base.address.length).toBeGreaterThan(0);
      expect(typeof base.symbol).toBe('string');
      expect(base.symbol.length).toBeGreaterThan(0);
      expect(typeof base.name).toBe('string');
      expect(base.name.length).toBeGreaterThan(0);
      expect(typeof base.decimals).toBe('number');
      expect(Number.isInteger(base.decimals)).toBe(true);
      expect(base.decimals).toBeGreaterThanOrEqual(0);
      expect(base.raw).toBeDefined();
      // Quote token
      const quote = market.tokens.quote;
      expect(quote).toBeDefined();
      expect(typeof quote.address).toBe('string');
      expect(quote.address.length).toBeGreaterThan(0);
      expect(typeof quote.symbol).toBe('string');
      expect(quote.symbol.length).toBeGreaterThan(0);
      expect(typeof quote.name).toBe('string');
      expect(quote.name.length).toBeGreaterThan(0);
      expect(typeof quote.decimals).toBe('number');
      expect(Number.isInteger(quote.decimals)).toBe(true);
      expect(quote.decimals).toBeGreaterThanOrEqual(0);
      expect(quote.raw).toBeDefined();
      expect(typeof market.decimals).toBe('number');
      expect(Number.isInteger(market.decimals)).toBe(true);
      expect(market.decimals).toBeGreaterThanOrEqual(0);
      expect(market.status).toBeDefined();
      expect(market.status.toLowerCase()).toBe('active');
      expect(market.raw).toBeDefined();
      if (market.price) {
        expect(typeof market.price).toBe('object');
        expect(market.price.baseQuote).toBeDefined();
        expect(market.price.quoteBase).toBeDefined();
        expect(Number(market.price.baseQuote)).not.toBeNaN();
        expect(Number(market.price.quoteBase)).not.toBeNaN();
      }
    }
  });

  it('getMarkets returns all markets with correct structure', async () => {
    const markets = await client.getMarkets();
    expect(typeof markets).toBe('object');
    expect((markets instanceof Map ? markets.size : Object.keys(markets).length)).toBe(allSymbols.length);
    for (const symbol of allSymbols) {
      const market = Array.from(markets instanceof Map ? markets.values() : Object.values(markets))
        .find((m: any) => m.symbol === symbol) as any;
      expect(market).toBeDefined();
      expect(typeof market.address).toBe('string');
      expect(market.address.length).toBeGreaterThan(0);
      expect(market.address).toMatch(/^thor[0-9a-z]+$/);
      expect(typeof market.symbol).toBe('string');
      expect(market.symbol.length).toBeGreaterThan(0);
      expect(market.symbol).toMatch(/^[A-Z0-9]+\/[A-Z0-9]+$/);
      expect(market.tokens).toBeDefined();
      expect(market.tokens.base).toBeDefined();
      expect(market.tokens.quote).toBeDefined();
      // Base token
      const base = market.tokens.base;
      expect(base).toBeDefined();
      expect(typeof base.address).toBe('string');
      expect(base.address.length).toBeGreaterThan(0);
      expect(typeof base.symbol).toBe('string');
      expect(base.symbol.length).toBeGreaterThan(0);
      expect(typeof base.name).toBe('string');
      expect(base.name.length).toBeGreaterThan(0);
      expect(typeof base.decimals).toBe('number');
      expect(Number.isInteger(base.decimals)).toBe(true);
      expect(base.decimals).toBeGreaterThanOrEqual(0);
      expect(base.raw).toBeDefined();
      // Quote token
      const quote = market.tokens.quote;
      expect(quote).toBeDefined();
      expect(typeof quote.address).toBe('string');
      expect(quote.address.length).toBeGreaterThan(0);
      expect(typeof quote.symbol).toBe('string');
      expect(quote.symbol.length).toBeGreaterThan(0);
      expect(typeof quote.name).toBe('string');
      expect(quote.name.length).toBeGreaterThan(0);
      expect(typeof quote.decimals).toBe('number');
      expect(Number.isInteger(quote.decimals)).toBe(true);
      expect(quote.decimals).toBeGreaterThanOrEqual(0);
      expect(quote.raw).toBeDefined();
      expect(typeof market.decimals).toBe('number');
      expect(Number.isInteger(market.decimals)).toBe(true);
      expect(market.decimals).toBeGreaterThanOrEqual(0);
      expect(market.status).toBeDefined();
      expect(market.status.toLowerCase()).toBe('active');
      expect(market.raw).toBeDefined();
      if (market.price) {
        expect(typeof market.price).toBe('object');
        expect(market.price.baseQuote).toBeDefined();
        expect(market.price.quoteBase).toBeDefined();
        expect(Number(market.price.baseQuote)).not.toBeNaN();
        expect(Number(market.price.quoteBase)).not.toBeNaN();
      }
    }
    const returnedAddresses2 = Array.from(markets instanceof Map ? markets.values() : Object.values(markets)).map((m: any) => m.address);
    for (const address of envAddresses) {
      expect(returnedAddresses2).toContain(address);
    }
  });

  it('getMarkets returns only requested markets by symbols', async () => {
    const subset = allSymbols.slice(0, 2);
    const markets = await client.getMarkets(subset);
    expect(typeof markets).toBe('object');
    expect((markets instanceof Map ? markets.size : Object.keys(markets).length)).toBe(subset.length);
    for (const symbol of subset) {
      const market = Array.from(markets instanceof Map ? markets.values() : Object.values(markets))
        .find((m: any) => m.symbol === symbol) as any;
      expect(market).toBeDefined();
      expect(typeof market.address).toBe('string');
      expect(market.address.length).toBeGreaterThan(0);
      expect(market.address).toMatch(/^thor[0-9a-z]+$/);
      expect(typeof market.symbol).toBe('string');
      expect(market.symbol.length).toBeGreaterThan(0);
      expect(market.symbol).toMatch(/^[A-Z0-9]+\/[A-Z0-9]+$/);
      expect(market.tokens).toBeDefined();
      expect(market.tokens.base).toBeDefined();
      expect(market.tokens.quote).toBeDefined();
      // Base token
      const base = market.tokens.base;
      expect(base).toBeDefined();
      expect(typeof base.address).toBe('string');
      expect(base.address.length).toBeGreaterThan(0);
      expect(typeof base.symbol).toBe('string');
      expect(base.symbol.length).toBeGreaterThan(0);
      expect(typeof base.name).toBe('string');
      expect(base.name.length).toBeGreaterThan(0);
      expect(typeof base.decimals).toBe('number');
      expect(Number.isInteger(base.decimals)).toBe(true);
      expect(base.decimals).toBeGreaterThanOrEqual(0);
      expect(base.raw).toBeDefined();
      // Quote token
      const quote = market.tokens.quote;
      expect(quote).toBeDefined();
      expect(typeof quote.address).toBe('string');
      expect(quote.address.length).toBeGreaterThan(0);
      expect(typeof quote.symbol).toBe('string');
      expect(quote.symbol.length).toBeGreaterThan(0);
      expect(typeof quote.name).toBe('string');
      expect(quote.name.length).toBeGreaterThan(0);
      expect(typeof quote.decimals).toBe('number');
      expect(Number.isInteger(quote.decimals)).toBe(true);
      expect(quote.decimals).toBeGreaterThanOrEqual(0);
      expect(quote.raw).toBeDefined();
      expect(typeof market.decimals).toBe('number');
      expect(Number.isInteger(market.decimals)).toBe(true);
      expect(market.decimals).toBeGreaterThanOrEqual(0);
      expect(market.status).toBeDefined();
      expect(market.status.toLowerCase()).toBe('active');
      expect(market.raw).toBeDefined();
      if (market.price) {
        expect(typeof market.price).toBe('object');
        expect(market.price.baseQuote).toBeDefined();
        expect(market.price.quoteBase).toBeDefined();
        expect(Number(market.price.baseQuote)).not.toBeNaN();
        expect(Number(market.price.quoteBase)).not.toBeNaN();
      }
    }
  });

  it('getOrderBook returns valid order book for each market by symbol', async () => {
    for (const symbol of allSymbols) {
      const market = await client.getMarket(symbol);
      const orderBook = await client.getOrderbook({ marketSymbol: symbol, maximumNumberOfOrders: 2 });
      expect(orderBook).toBeDefined();
      expect(orderBook.market).toBeDefined();
      expect(orderBook.market.address).toBe(market.address);
      expect(orderBook.market.symbol).toBe(market.symbol);
      expect(typeof orderBook.book).toBe('object');
      // Asks e bids podem ser List ou Array, mas devem ser iteráveis
      expect(typeof orderBook.book.asks?.map === 'function' || Array.isArray(orderBook.book.asks)).toBe(true);
      expect(typeof orderBook.book.bids?.map === 'function' || Array.isArray(orderBook.book.bids)).toBe(true);
      // Testa asks
      orderBook.book.asks.forEach((order: any) => {
        expect(order).toBeDefined();
        expect(typeof order.orderId).toBe('string');
        expect(order.price).toBeInstanceOf(Decimal);
        expect(order.amount).toBeInstanceOf(Decimal);
        expect(typeof order.raw).toBe('object');
      });
      // Testa bids
      orderBook.book.bids.forEach((order: any) => {
        expect(order).toBeDefined();
        expect(typeof order.orderId).toBe('string');
        expect(order.price).toBeInstanceOf(Decimal);
        expect(order.amount).toBeInstanceOf(Decimal);
        expect(typeof order.raw).toBe('object');
      });
      expect(orderBook.book.bestAsk).toBeDefined();
      expect(typeof orderBook.book.bestAsk.orderId).toBe('string');
      expect(orderBook.book.bestAsk.price).toBeInstanceOf(Decimal);
      expect(orderBook.book.bestAsk.amount).toBeInstanceOf(Decimal);
      expect(typeof orderBook.book.bestAsk.raw).toBe('object');
      expect(orderBook.book.bestBid).toBeDefined();
      expect(typeof orderBook.book.bestBid.orderId).toBe('string');
      expect(orderBook.book.bestBid.price).toBeInstanceOf(Decimal);
      expect(orderBook.book.bestBid.amount).toBeInstanceOf(Decimal);
      expect(typeof orderBook.book.bestBid.raw).toBe('object');
      expect(orderBook.book.middlePrice).toBeInstanceOf(Decimal);
      if (orderBook.book.asks.length > 0 && orderBook.book.bids.length > 0) {
        const avg = orderBook.book.bestAsk.price.plus(orderBook.book.bestBid.price).div(2);
        expect(orderBook.book.middlePrice.eq(avg)).toBe(true);
      }
      expect(typeof orderBook.raw).toBe('object');
    }
  });
});
