// Rujira HFT Bot - Essential TypeScript Interfaces
// Focused on FIN Protocol interfaces following clean architecture patterns

import Decimal from 'decimal.js';

// ============================================================================
// CORE ENUMS
// ============================================================================

/**
 * Order side enumeration
 */
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

/**
 * Order type enumeration
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit'
}

/**
 * Order status enumeration
 */
export enum OrderStatus {
  PENDING = 'pending',
  OPEN = 'open',
  PARTIALLY_FILLED = 'partially_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}

/**
 * Network types
 */
export enum Network {
  MAINNET = 'mainnet',
  TESTNET = 'testnet'
}

// ============================================================================
// CORE INTERFACES
// ============================================================================

/**
 * Transaction interface
 */
export interface Transaction {
  /**
   * Blockchain transaction hash
   */
  hash: string;

  /**
   * Status of the transaction
   */
  status: string;

  /**
   * Raw data of the transaction
   */
  raw: any;
}

/**
 * Asset interface
 */
export interface Asset {
  /**
   * Symbol of the asset
   */
  symbol: string;

  /**
   * Name of the asset
   */
  name: string;

  /**
   * Denomination string
   */
  denom: string;

  /**
   * Number of decimal places
   */
  decimals: number;

  /**
   * Chain identifier
   */
  chain: string;

  /**
   * Contract address (optional)
   */
  address?: string;

  /**
   * Icon URL (optional)
   */
  icon?: string;
}

/**
 * THORChain oracle interface
 */
export interface ThorchainOracle {
  /**
   * Asset identifier
   */
  asset: string;

  /**
   * Current price
   */
  price: Decimal;

  /**
   * Timestamp of the price
   */
  timestamp: string;

  /**
   * Block height
   */
  blockHeight: string;
}

// ============================================================================
// FIN PROTOCOL INTERFACES
// ============================================================================

/**
 * FIN contract configuration interface
 */
export interface FinContractConfig {
  /**
   * Contract address
   */
  address: string;

  /**
   * Supported denominations
   */
  denoms: string[];

  /**
   * Oracle addresses
   */
  oracles: string[] | null;

  /**
   * Market maker address
   */
  marketMaker: string | null;

  /**
   * Tick size
   */
  tick: number;

  /**
   * Taker fee
   */
  feeTaker: Decimal;

  /**
   * Maker fee
   */
  feeMaker: Decimal;

  /**
   * Fee collection address
   */
  feeAddress: string;

  /**
   * Contract description
   */
  description?: string;

  /**
   * Whether contract has oracles
   */
  hasOracles?: boolean;
}

/**
 * FIN pair information interface
 */
export interface FinPair {
  /**
   * Contract address
   */
  address: string;

  /**
   * Base asset
   */
  assetBase: Asset;

  /**
   * Quote asset
   */
  assetQuote: Asset;

  /**
   * Base asset oracle
   */
  oracleBase?: ThorchainOracle;

  /**
   * Quote asset oracle
   */
  oracleQuote?: ThorchainOracle;

  /**
   * Tick size
   */
  tick: Decimal;

  /**
   * Taker fee
   */
  feeTaker: Decimal;

  /**
   * Maker fee
   */
  feeMaker: Decimal;

  /**
   * Fee collection address
   */
  feeAddress: string;

  /**
   * Deployment status
   */
  deploymentStatus: string;
}

/**
 * FIN orderbook entry interface
 */
export interface FinBookEntry {
  /**
   * Price level
   */
  price: Decimal;

  /**
   * Total amount at this price
   */
  total: Decimal;

  /**
   * Side (buy/sell)
   */
  side: string;

  /**
   * Value in quote currency
   */
  value: Decimal;

  /**
   * Virtual total (for AMM)
   */
  virtualTotal: Decimal;

  /**
   * Virtual value (for AMM)
   */
  virtualValue: Decimal;
}

/**
 * FIN orderbook interface
 */
export interface FinBook {
  /**
   * Ask orders (sell side)
   */
  asks: FinBookEntry[];

  /**
   * Bid orders (buy side)
   */
  bids: FinBookEntry[];

  /**
   * Center price
   */
  center?: Decimal;

  /**
   * Bid-ask spread
   */
  spread?: Decimal;

  /**
   * Trading pair
   */
  pair: FinPair;
}

/**
 * FIN order interface
 */
export interface FinOrder {
  /**
   * Order ID
   */
  id: string;

  /**
   * Trading pair
   */
  pair: FinPair;

  /**
   * Order owner address
   */
  owner: string;

  /**
   * Order side
   */
  side: OrderSide;

  /**
   * Order price
   */
  rate: Decimal;

  /**
   * Last update timestamp
   */
  updatedAt: string;

  /**
   * Original offer amount
   */
  offer: Decimal;

  /**
   * Original offer value
   */
  offerValue: Decimal;

  /**
   * Remaining amount
   */
  remaining: Decimal;

  /**
   * Remaining value
   */
  remainingValue: Decimal;

  /**
   * Filled amount
   */
  filled: Decimal;

  /**
   * Filled value
   */
  filledValue: Decimal;

  /**
   * Filled fee amount
   */
  filledFee: Decimal;

  /**
   * Order type
   */
  type: string;

  /**
   * Price deviation (optional)
   */
  deviation?: Decimal;

  /**
   * Value in USD
   */
  valueUsd: Decimal;
}

/**
 * FIN trade interface
 */
export interface FinTrade {
  /**
   * Trade ID
   */
  id: string;

  /**
   * Block height
   */
  height: string;

  /**
   * Transaction index
   */
  txIdx: string;

  /**
   * Trade index
   */
  idx: string;

  /**
   * Contract address
   */
  contract: string;

  /**
   * Transaction hash
   */
  txhash: string;

  /**
   * Quote amount
   */
  quoteAmount: Decimal;

  /**
   * Base amount
   */
  baseAmount: Decimal;

  /**
   * Trade price
   */
  price: Decimal;

  /**
   * Trade type
   */
  type: string;

  /**
   * Protocol identifier
   */
  protocol: string;

  /**
   * Timestamp
   */
  timestamp: string;

  /**
   * Base asset
   */
  assetBase: Asset;

  /**
   * Quote asset
   */
  assetQuote: Asset;
}

/**
 * FIN summary interface
 */
export interface FinSummary {
  /**
   * Last price
   */
  last: Decimal;

  /**
   * Last price in USD
   */
  lastUsd: Decimal;

  /**
   * 24h high
   */
  high: Decimal;

  /**
   * 24h low
   */
  low: Decimal;

  /**
   * 24h change
   */
  change: Decimal;

  /**
   * 24h volume
   */
  volume: {
    amount: Decimal;
    denom: string;
    usdValue?: Decimal;
  };
}

/**
 * FIN candle interface
 */
export interface FinCandle {
  /**
   * Candle ID
   */
  id: string;

  /**
   * Time resolution
   */
  resolution: string;

  /**
   * High price
   */
  high: Decimal;

  /**
   * Low price
   */
  low: Decimal;

  /**
   * Open price
   */
  open: Decimal;

  /**
   * Close price
   */
  close: Decimal;

  /**
   * Volume
   */
  volume: Decimal;

  /**
   * Time bin
   */
  bin: string;
}

// ============================================================================
// REQUEST/RESPONSE INTERFACES
// ============================================================================

/**
 * Request to get contract configuration
 */
export interface GetContractConfigRequest {
  /**
   * Contract address
   */
  address: string;
}

/**
 * Response with contract configuration
 */
export interface GetContractConfigResponse {
  /**
   * Contract configuration
   */
  config: FinContractConfig;
}

/**
 * Request to get orderbook
 */
export interface GetOrderbookRequest {
  /**
   * Contract address
   */
  address: string;

  /**
   * Number of levels to return
   */
  limit?: number;
}

/**
 * Response with orderbook
 */
export interface GetOrderbookResponse {
  /**
   * Orderbook data
   */
  orderbook: FinBook;
}

/**
 * Request to get user orders
 */
export interface GetUserOrdersRequest {
  /**
   * Contract address
   */
  address: string;

  /**
   * User address
   */
  owner: string;

  /**
   * Order side filter
   */
  side?: OrderSide;

  /**
   * Order status filter
   */
  status?: OrderStatus;
}

/**
 * Response with user orders
 */
export interface GetUserOrdersResponse {
  /**
   * Array of user orders
   */
  orders: FinOrder[];
}

/**
 * Request to simulate trade
 */
export interface SimulateTradeRequest {
  /**
   * Contract address
   */
  address: string;

  /**
   * Trade side
   */
  side: OrderSide;

  /**
   * Amount to trade
   */
  amount: Decimal;

  /**
   * Price (for limit orders)
   */
  price?: Decimal;
}

/**
 * Response with trade simulation
 */
export interface SimulateTradeResponse {
  /**
   * Simulated trade details
   */
  trade: FinTrade;
}

/**
 * Request to get market summary
 */
export interface GetMarketSummaryRequest {
  /**
   * Contract address
   */
  address: string;
}

/**
 * Response with market summary
 */
export interface GetMarketSummaryResponse {
  /**
   * Market summary
   */
  summary: FinSummary;
}

/**
 * Request to get candles
 */
export interface GetCandlesRequest {
  /**
   * Contract address
   */
  address: string;

  /**
   * Resolution (1m, 5m, 15m, 1h, 4h, 1d)
   */
  resolution: string;

  /**
   * Start time
   */
  from: number;

  /**
   * End time
   */
  to: number;
}

/**
 * Response with candles
 */
export interface GetCandlesResponse {
  /**
   * Array of candles
   */
  candles: FinCandle[];
}

// ============================================================================
// MAIN INTERFACE
// ============================================================================

/**
 * Main interface for FIN Protocol operations
 */
export interface FinProtocolInterface {
  getContractConfig(request: GetContractConfigRequest): Promise<GetContractConfigResponse>;
  getOrderbook(request: GetOrderbookRequest): Promise<GetOrderbookResponse>;
  getUserOrders(request: GetUserOrdersRequest): Promise<GetUserOrdersResponse>;
  simulateTrade(request: SimulateTradeRequest): Promise<SimulateTradeResponse>;
  getMarketSummary(request: GetMarketSummaryRequest): Promise<GetMarketSummaryResponse>;
  getCandles(request: GetCandlesRequest): Promise<GetCandlesResponse>;
} 