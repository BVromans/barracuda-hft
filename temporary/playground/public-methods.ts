// Rujira FIN Protocol Client
// Implementation of get_ticker and get_orderbook methods using CosmWasm

import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import Decimal from 'decimal.js';
import {
  FinProtocolInterface,
  GetOrderbookRequest,
  GetOrderbookResponse,
  FinBook,
  FinBookEntry,
  FinPair,
  Asset,
  FinContractConfig,
  Network,
} from '../../src/types';

// --- Network Configuration ---
const NETWORKS: Record<Network, {
  rpc: string;
  rest: string;
  chainId: string;
  gasPrice: GasPrice;
}> = {
  [Network.MAINNET]: {
    rpc: "https://thornode-mainnet-rpc.bryanlabs.net",
    rest: "https://api.rujira.network",
    chainId: "thorchain-mainnet-v1",
    gasPrice: GasPrice.fromString("0.025uruji")
  },
  [Network.TESTNET]: {
    rpc: "https://thornode-testnet-rpc.bryanlabs.net",
    rest: "https://testnet-api.rujira.network",
    chainId: "thorchain-testnet-v1",
    gasPrice: GasPrice.fromString("0.025uruji")
  }
};

// --- Verified Working FIN Contracts ---
const WORKING_FIN_CONTRACTS = {
  "LQDY/BTC": {
    address: "thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf",
    denoms: ["thor.lqdy", "btc-btc"],
    market_maker: "thor1lpupl5c5yfa2shd0uk3t0clahsv237zz8a7nvrdrktrjrxwgz56s80kew4",
    tick: 6,
    description: "Liquid staking derivative vs Bitcoin"
  },
  "LQDY/USDC": {
    address: "thor1ax94w4rldvdgc4xgsfwgve7g7xfyxhvuvquvx57vtmr6y4alev0qw3mlvr",
    denoms: ["thor.lqdy", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1c020ygq35hu6fp2hpd3ws0fa9xmlqhpw9g4nz624wnwmvlq7l49s877kkx",
    tick: 6,
    description: "Liquid staking derivative vs USDC"
  },
  "NAMI/USDC": {
    address: "thor1txmrchsrzycmzvlwsjl20q9zkdsp0nywctefuceepf02phpudvxsxtzmty",
    denoms: ["thor.nami", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1j45s6a4ym8ru2zd70acnrwk4fkmew2a43eq2wngu46ur7yg4d8eqnvvfxx",
    tick: 6,
    description: "NAMI token vs USDC"
  },
  "RUJI/USDC": {
    address: "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
    denoms: ["x/ruji", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1z6drgxf8js4mycfqfgqr3v4paep4p5ur7ff0suehyg0a6alm8uks29zyv0",
    tick: 4,
    description: "Rujira token vs USDC"
  },
  "TCY/RUNE": {
    address: "thor12ds7fxj5g47jwzfzvzzhzxxd3cp6v55flgwxva0803r8k5mzm44skth6wa",
    denoms: ["tcy", "rune"],
    market_maker: "thor1mcy9jtp4kzl8q2lvdgfgsl8jvqrf504uphkf0pz2p9wud8tsntesjvccew",
    tick: 6,
    description: "TCY token vs RUNE (with oracle pricing)",
    has_oracles: true
  }
};

// --- Asset Information ---
const ASSET_INFO: Record<string, Asset> = {
  "thor.lqdy": {
    symbol: "LQDY",
    name: "Liquid Staking Derivative",
    denom: "thor.lqdy",
    decimals: 8,
    chain: "thorchain",
    icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png"
  },
  "btc-btc": {
    symbol: "BTC",
    name: "Bitcoin",
    denom: "btc-btc",
    decimals: 8,
    chain: "bitcoin",
    icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png"
  },
  "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
    symbol: "USDC",
    name: "USD Coin",
    denom: "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
    chain: "ethereum",
    icon: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png"
  },
  "thor.nami": {
    symbol: "NAMI",
    name: "NAMI Token",
    denom: "thor.nami",
    decimals: 8,
    chain: "thorchain",
    icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png"
  },
  "x/ruji": {
    symbol: "RUJI",
    name: "Rujira Token",
    denom: "x/ruji",
    decimals: 8,
    chain: "thorchain",
    icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png"
  },
  "tcy": {
    symbol: "TCY",
    name: "TCY Token",
    denom: "tcy",
    decimals: 8,
    chain: "thorchain",
    icon: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png"
  },
  "rune": {
    symbol: "RUNE",
    name: "THORChain",
    denom: "rune",
    decimals: 8,
    chain: "thorchain",
    icon: "https://assets.coingecko.com/coins/images/6595/small/IMG_2021_12_03_14_20_26.png"
  }
};

// --- Market Information ---
interface MarketInfo {
  symbol: string;
  address: string;
  baseAsset: Asset;
  quoteAsset: Asset;
  description: string;
  tick: number;
  marketMaker: string;
  hasOracles: boolean;
  isActive: boolean;
}

// --- Raw Contract Response Types ---
interface RawFinConfig {
  denoms: string[];
  oracles: any[] | null;
  market_maker: string | null;
  tick: number;
  fee_taker: string;
  fee_maker: string;
  fee_address: string;
}

interface RawBookItem {
  price: string;
  total: string;
  value: string;
}

interface RawBookResponse {
  asks: RawBookItem[];
  bids: RawBookItem[];
  spread: string;
  center: string;
}

interface RawSimulateResponse {
  input: string;
  output: string;
  fee: string;
}

// --- FIN Protocol Client Implementation ---
export class FinProtocolClient implements FinProtocolInterface {
  private client: CosmWasmClient;
  private network: Network;

  constructor(network: Network = Network.MAINNET) {
    this.network = network;
    this.client = {} as CosmWasmClient;
  }

  /**
   * Initialize the client by connecting to the network
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔗 Connecting to ${this.network} RPC...`);
      const networkConfig = NETWORKS[this.network];
      this.client = await CosmWasmClient.connect(networkConfig.rpc);
      
      const chainId = await this.client.getChainId();
      console.log(`✅ Connected to chain: ${chainId}`);
    } catch (error) {
      console.error(`❌ Failed to connect to ${this.network} RPC:`, error);
      throw error;
    }
  }

  /**
   * Query contract state with error handling
   */
  private async queryContractState(contractAddress: string, queryMsg: any): Promise<any> {
    try {
      const result = await this.client.queryContractSmart(contractAddress, queryMsg);
      return result;
    } catch (error) {
      console.error(`❌ Contract query failed for ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Get token information by address or symbol
   */
  async getToken(identifier: string): Promise<Asset | null> {
    try {
      console.log(`🪙 Getting token info for: ${identifier}`);
      
      // Check if identifier is a contract address
      if (identifier.startsWith('thor')) {
        // It's a contract address, get the market info first
        const market = await this.getMarket(identifier);
        if (market) {
          // Return base asset by default, could be enhanced to return both
          return market.baseAsset;
        }
      }
      
      // Check if identifier is a symbol
      const symbol = identifier.toUpperCase();
      const market = await this.getMarket(symbol);
      if (market) {
        return market.baseAsset;
      }
      
      // Check if identifier is a denom
      if (ASSET_INFO[identifier]) {
        return ASSET_INFO[identifier];
      }
      
      // Search by symbol in asset info
      for (const [denom, asset] of Object.entries(ASSET_INFO)) {
        if (asset.symbol.toUpperCase() === symbol) {
          return asset;
        }
      }
      
      console.log(`❌ Token not found: ${identifier}`);
      return null;
    } catch (error) {
      console.error(`❌ Failed to get token:`, error);
      return null;
    }
  }

  /**
   * Get market information by address or symbol
   */
  async getMarket(identifier: string): Promise<MarketInfo | null> {
    try {
      console.log(`📊 Getting market info for: ${identifier}`);
      
      let contractInfo: any = null;
      
      // Check if identifier is a contract address
      if (identifier.startsWith('thor')) {
        contractInfo = getContractInfoByAddress(identifier);
      } else {
              // Check if identifier is a symbol (e.g., "LQDY/BTC")
      const symbol = identifier.toUpperCase();
      contractInfo = WORKING_FIN_CONTRACTS[symbol as keyof typeof WORKING_FIN_CONTRACTS];
      }
      
      if (!contractInfo) {
        console.log(`❌ Market not found: ${identifier}`);
        return null;
      }
      
      // Get contract config for additional info
      const { config } = await this.getContractConfig({ address: contractInfo.address });
      
      // Create market info
      const marketInfo: MarketInfo = {
        symbol: Object.keys(WORKING_FIN_CONTRACTS).find(key => 
          WORKING_FIN_CONTRACTS[key as keyof typeof WORKING_FIN_CONTRACTS].address === contractInfo.address
        ) || identifier,
        address: contractInfo.address,
        baseAsset: {
          ...ASSET_INFO[contractInfo.denoms[0]],
          address: contractInfo.denoms[0]
        },
        quoteAsset: {
          ...ASSET_INFO[contractInfo.denoms[1]],
          address: contractInfo.denoms[1]
        },
        description: contractInfo.description,
        tick: contractInfo.tick,
        marketMaker: contractInfo.market_maker,
        hasOracles: contractInfo.has_oracles || false,
        isActive: true // All our contracts are active
      };
      
      console.log('✅ Market info retrieved successfully');
      return marketInfo;
    } catch (error) {
      console.error(`❌ Failed to get market:`, error);
      return null;
    }
  }

  /**
   * Get multiple markets by addresses/symbols or all markets if none specified
   */
  async getMarkets(identifiers?: string[]): Promise<Record<string, MarketInfo>> {
    try {
      console.log(`📊 Getting markets info...`);
      
      const markets: Record<string, MarketInfo> = {};
      
      if (!identifiers || identifiers.length === 0) {
        // Get all markets
        console.log('📋 Getting all available markets...');
        for (const [symbol, contractInfo] of Object.entries(WORKING_FIN_CONTRACTS)) {
          try {
            const market = await this.getMarket(contractInfo.address);
            if (market) {
              markets[symbol] = market;
            }
          } catch (error) {
            console.error(`❌ Failed to get market for ${symbol}:`, error);
          }
        }
      } else {
        // Get specific markets
        console.log(`📋 Getting specific markets: ${identifiers.join(', ')}`);
        for (const identifier of identifiers) {
          try {
            const market = await this.getMarket(identifier);
            if (market) {
              markets[market.symbol] = market;
            }
          } catch (error) {
            console.error(`❌ Failed to get market for ${identifier}:`, error);
          }
        }
      }
      
      console.log(`✅ Retrieved ${Object.keys(markets).length} markets`);
      return markets;
    } catch (error) {
      console.error(`❌ Failed to get markets:`, error);
      return {};
    }
  }

  /**
   * Get contract configuration
   */
  async getContractConfig(request: { address: string }): Promise<{ config: FinContractConfig }> {
    const { address } = request;
    
    try {
      console.log(`📋 Getting config for: ${address}`);
      const rawConfig = await this.queryContractState(address, { config: {} });
      
      if (!rawConfig) {
        throw new Error(`Failed to get config for contract ${address}`);
      }

      // Debug: Log the raw config response
      console.log(`🔍 Raw config response:`, JSON.stringify(rawConfig, null, 2));

      const config: FinContractConfig = {
        address,
        denoms: rawConfig.denoms,
        oracles: rawConfig.oracles,
        marketMaker: rawConfig.market_maker,
        tick: rawConfig.tick,
        feeTaker: new Decimal(rawConfig.fee_taker),
        feeMaker: new Decimal(rawConfig.fee_maker),
        feeAddress: rawConfig.fee_address,
        hasOracles: rawConfig.oracles && rawConfig.oracles.length > 0
      };

      console.log('✅ Config retrieved successfully');
      return { config };
    } catch (error) {
      console.error(`❌ Failed to get config:`, error);
      throw error;
    }
  }

  /**
   * Get orderbook with ticker information
   */
  async getOrderbook(request: GetOrderbookRequest): Promise<GetOrderbookResponse> {
    const { address, limit = 10 } = request;
    
    try {
      console.log(`📊 Getting orderbook (limit: ${limit}) for: ${address}`);
      
      // Get contract config first
      const { config } = await this.getContractConfig({ address });
      
      // Get raw orderbook data
      const rawBook = await this.queryContractState(address, { book: { limit } });
      
      if (!rawBook) {
        throw new Error(`Failed to get orderbook for contract ${address}`);
      }

      // Debug: Log the raw response
      console.log(`🔍 Raw orderbook response:`, JSON.stringify(rawBook, null, 2));

      // Create asset objects
      const baseAsset: Asset = {
        ...ASSET_INFO[config.denoms[0]],
        address: config.denoms[0]
      };
      
      const quoteAsset: Asset = {
        ...ASSET_INFO[config.denoms[1]],
        address: config.denoms[1]
      };

      // Create trading pair
      const pair: FinPair = {
        address,
        assetBase: baseAsset,
        assetQuote: quoteAsset,
        tick: new Decimal(config.tick),
        feeTaker: config.feeTaker,
        feeMaker: config.feeMaker,
        feeAddress: config.feeAddress,
        deploymentStatus: 'active'
      };

      // Convert raw orderbook entries to typed format
      // Note: 'base' array contains ASKS (sell orders), 'quote' array contains BIDS (buy orders)
      const asks: FinBookEntry[] = (rawBook.base || []).map((ask: RawBookItem) => ({
        price: new Decimal(ask.price),
        total: new Decimal(ask.total),
        side: 'sell',
        value: new Decimal(ask.price).mul(new Decimal(ask.total)),
        virtualTotal: new Decimal(ask.total), // Assuming no virtual values for now
        virtualValue: new Decimal(ask.price).mul(new Decimal(ask.total))
      }));

      const bids: FinBookEntry[] = (rawBook.quote || []).map((bid: RawBookItem) => ({
        price: new Decimal(bid.price),
        total: new Decimal(bid.total),
        side: 'buy',
        value: new Decimal(bid.price).mul(new Decimal(bid.total)),
        virtualTotal: new Decimal(bid.total), // Assuming no virtual values for now
        virtualValue: new Decimal(bid.price).mul(new Decimal(bid.total))
      }));

      // Calculate center and spread
      let center: Decimal | undefined;
      let spread: Decimal | undefined;

      if (bids.length > 0 && asks.length > 0) {
        const bestBid = bids[0].price;
        const bestAsk = asks[0].price;
        center = bestBid.plus(bestAsk).div(2);
        spread = bestAsk.minus(bestBid);
      }

      // Create orderbook
      const orderbook: FinBook = {
        asks,
        bids,
        center,
        spread,
        pair
      };

      console.log('✅ Orderbook retrieved successfully');
      console.log(`📊 Orderbook: ${bids.length} bids, ${asks.length} asks`);
      if (center && spread) {
        console.log(`📊 Center: ${center}, Spread: ${spread}`);
      }
      
      return { orderbook };
    } catch (error) {
      console.error(`❌ Failed to get orderbook:`, error);
      throw error;
    }
  }

  /**
   * Get ticker information (market summary)
   */
  async getTicker(address: string): Promise<{
    symbol: string;
    last: Decimal;
    bid: Decimal;
    ask: Decimal;
    high: Decimal;
    low: Decimal;
    volume: Decimal;
    change: Decimal;
    spread: Decimal;
    center: Decimal;
  }> {
    try {
      console.log(`📈 Getting ticker for: ${address}`);
      
      // Get orderbook data
      const { orderbook } = await this.getOrderbook({ address, limit: 1 });
      
      // Calculate ticker values
      const bestBid = orderbook.bids.length > 0 ? orderbook.bids[0].price : new Decimal(0);
      const bestAsk = orderbook.asks.length > 0 ? orderbook.asks[0].price : new Decimal(0);
      const center = orderbook.center || bestBid.plus(bestAsk).div(2);
      const spread = orderbook.spread || bestAsk.minus(bestBid);
      
      // For now, we'll use center as last price (in a real implementation, you'd get this from recent trades)
      const last = center;
      
      // Calculate volume from orderbook (this is a simplified approach)
      const bidVolume = orderbook.bids.reduce((sum, bid) => sum.plus(bid.total), new Decimal(0));
      const askVolume = orderbook.asks.reduce((sum, ask) => sum.plus(ask.total), new Decimal(0));
      const volume = bidVolume.plus(askVolume);
      
      // For high/low, we'd need historical data, so we'll use current spread for now
      const high = bestAsk;
      const low = bestBid;
      
      // Change would need historical data, so we'll set to 0 for now
      const change = new Decimal(0);
      
      const symbol = `${orderbook.pair.assetBase.symbol}/${orderbook.pair.assetQuote.symbol}`;
      
      const ticker = {
        symbol,
        last,
        bid: bestBid,
        ask: bestAsk,
        high,
        low,
        volume,
        change,
        spread,
        center
      };

      console.log('✅ Ticker retrieved successfully');
      console.log(`📈 ${symbol}: Last ${last}, Bid ${bestBid}, Ask ${bestAsk}, Spread ${spread}`);
      
      return ticker;
    } catch (error) {
      console.error(`❌ Failed to get ticker:`, error);
      throw error;
    }
  }

  /**
   * Get all available tickers
   */
  async getAllTickers(): Promise<Record<string, any>> {
    const tickers: Record<string, any> = {};
    
    for (const [pairName, contractInfo] of Object.entries(WORKING_FIN_CONTRACTS)) {
      try {
        const ticker = await this.getTicker(contractInfo.address);
        tickers[pairName] = ticker;
      } catch (error) {
        console.error(`❌ Failed to get ticker for ${pairName}:`, error);
        tickers[pairName] = { error: 'Failed to fetch' };
      }
    }
    
    return tickers;
  }

  // --- Required interface methods (stubs for now) ---
  async getUserOrders(request: any): Promise<any> {
    throw new Error('getUserOrders not implemented yet');
  }

  async simulateTrade(request: any): Promise<any> {
    throw new Error('simulateTrade not implemented yet');
  }

  async getMarketSummary(request: any): Promise<any> {
    throw new Error('getMarketSummary not implemented yet');
  }

  async getCandles(request: any): Promise<any> {
    throw new Error('getCandles not implemented yet');
  }
}

// --- Utility Functions ---

/**
 * Create and initialize a FIN protocol client
 */
export async function createFinProtocolClient(network: Network = Network.MAINNET): Promise<FinProtocolClient> {
  const client = new FinProtocolClient(network);
  await client.initialize();
  return client;
}

/**
 * Get all working contract addresses
 */
export function getWorkingContractAddresses(): string[] {
  return Object.values(WORKING_FIN_CONTRACTS).map(contract => contract.address);
}

/**
 * Get contract info by address
 */
export function getContractInfoByAddress(address: string): any {
  return Object.values(WORKING_FIN_CONTRACTS).find(contract => contract.address === address);
}

/**
 * Get contract info by symbol
 */
export function getContractInfoBySymbol(symbol: string): any {
  return WORKING_FIN_CONTRACTS[symbol.toUpperCase() as keyof typeof WORKING_FIN_CONTRACTS];
}

/**
 * Get all available symbols
 */
export function getAvailableSymbols(): string[] {
  return Object.keys(WORKING_FIN_CONTRACTS);
}

/**
 * Get all available tokens
 */
export function getAvailableTokens(): Asset[] {
  return Object.values(ASSET_INFO);
}

// --- Example Usage ---
async function example() {
  try {
    console.log('🚀 Starting FIN Protocol Client Example...\n');
    
    const client = await createFinProtocolClient();
    
    // 1. Get token information
    console.log('\n1️⃣ Getting token info...');
    const lqdyToken = await client.getToken('LQDY');
    console.log('LQDY Token:', lqdyToken);
    
    const btcToken = await client.getToken('btc-btc');
    console.log('BTC Token:', btcToken);
    
    // 2. Get market information
    console.log('\n2️⃣ Getting market info...');
    const lqdyBtcMarket = await client.getMarket('LQDY/BTC');
    console.log('LQDY/BTC Market:', lqdyBtcMarket);
    
    const marketByAddress = await client.getMarket('thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf');
    console.log('Market by address:', marketByAddress);
    
    // 3. Get multiple markets
    console.log('\n3️⃣ Getting multiple markets...');
    const specificMarkets = await client.getMarkets(['LQDY/BTC', 'LQDY/USDC']);
    console.log('Specific markets:', Object.keys(specificMarkets));
    
    const allMarkets = await client.getMarkets();
    console.log('All markets:', Object.keys(allMarkets));
    
    // 4. Get ticker for LQDY/BTC
    const lqdyBtcAddress = WORKING_FIN_CONTRACTS["LQDY/BTC"].address;
    console.log('\n4️⃣ Getting LQDY/BTC ticker...');
    const ticker = await client.getTicker(lqdyBtcAddress);
    console.log('Ticker:', ticker);
    
    // 5. Get orderbook for LQDY/USDC
    const lqdyUsdcAddress = WORKING_FIN_CONTRACTS["LQDY/USDC"].address;
    console.log('\n5️⃣ Getting LQDY/USDC orderbook...');
    const orderbook = await client.getOrderbook({ address: lqdyUsdcAddress, limit: 5 });
    console.log('Orderbook:', {
      symbol: `${orderbook.orderbook.pair.assetBase.symbol}/${orderbook.orderbook.pair.assetQuote.symbol}`,
      bids: orderbook.orderbook.bids.length,
      asks: orderbook.orderbook.asks.length,
      spread: orderbook.orderbook.spread?.toString(),
      center: orderbook.orderbook.center?.toString()
    });
    
    // 6. Get all tickers
    console.log('\n6️⃣ Getting all tickers...');
    const allTickers = await client.getAllTickers();
    console.log('All tickers:', allTickers);
    
    console.log('\n✅ Example completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in example:', error);
  }
}

// Export everything
export {
  WORKING_FIN_CONTRACTS,
  ASSET_INFO,
  NETWORKS,
  example
};

// Run example if executed directly
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  example();
} 