// Rujira HFT Bot - Interface Definitions Playground
// Comprehensive TypeScript interfaces for the trading bot system
// Based on fun-api patterns and rujira references

// ============================================================================
// CORE SYSTEM INTERFACES
// ============================================================================

/**
 * System status enumeration following fun-api patterns
 */
export enum SystemStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  IDLE = 'idle',
  RUNNING = 'running',
  STOPPING = 'stopping',
  UNKNOWN = 'unknown'
}

/**
 * HTTP method enumeration
 */
export enum HttpMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch',
  HEAD = 'head',
  OPTIONS = 'options'
}

/**
 * Trading strategy types
 */
export enum StrategyType {
  MARKET_MAKING = 'market_making',
  ARBITRAGE = 'arbitrage',
  MOMENTUM = 'momentum',
  MEAN_REVERSION = 'mean_reversion',
  GRID_TRADING = 'grid_trading',
  CUSTOM = 'custom'
}

/**
 * Order side enumeration
 */
export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
  BASE = 'base',
  QUOTE = 'quote'
}

/**
 * Order type enumeration
 */
export enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
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

// ============================================================================
// NETWORK & CONNECTION INTERFACES
// ============================================================================

/**
 * Network configuration interface
 */
export interface NetworkConfig {
  rpc: string;
  rest: string;
  chainId: string;
  gasPrice: string;
  explorer?: string;
  name: string;
}

/**
 * Connection status interface
 */
export interface ConnectionStatus {
  isConnected: boolean;
  lastPing?: number;
  latency?: number;
  error?: string;
  reconnectAttempts: number;
}

/**
 * WebSocket connection interface
 */
export interface WebSocketConnection {
  url: string;
  status: ConnectionStatus;
  subscriptions: string[];
  messageHandlers: Map<string, Function>;
}

// ============================================================================
// FIN PROTOCOL INTERFACES
// ============================================================================

/**
 * FIN contract configuration interface
 */
export interface FinContractConfig {
  address: string;
  denoms: string[];
  oracles: string[] | null;
  marketMaker: string | null;
  tick: number;
  feeTaker: string;
  feeMaker: string;
  feeAddress: string;
  description?: string;
  hasOracles?: boolean;
}

/**
 * FIN pair information interface
 */
export interface FinPair {
  address: string;
  assetBase: Asset;
  assetQuote: Asset;
  oracleBase?: ThorchainOracle;
  oracleQuote?: ThorchainOracle;
  tick: string;
  feeTaker: string;
  feeMaker: string;
  feeAddress: string;
  deploymentStatus: DeploymentTargetStatus;
}

/**
 * FIN orderbook entry interface
 */
export interface FinBookEntry {
  price: string;
  total: string;
  side: string;
  value: string;
  virtualTotal: string;
  virtualValue: string;
}

/**
 * FIN orderbook interface
 */
export interface FinBook {
  asks: FinBookEntry[];
  bids: FinBookEntry[];
  center?: string;
  spread?: string;
  pair: FinPair;
}

/**
 * FIN order interface
 */
export interface FinOrder {
  id: string;
  pair: FinPair;
  owner: string;
  side: OrderSide;
  rate: string;
  updatedAt: string;
  offer: string;
  offerValue: string;
  remaining: string;
  remainingValue: string;
  filled: string;
  filledValue: string;
  filledFee: string;
  type: string;
  deviation?: string;
  valueUsd: string;
}

/**
 * FIN trade interface
 */
export interface FinTrade {
  id: string;
  height: string;
  txIdx: string;
  idx: string;
  contract: string;
  txhash: string;
  quoteAmount: string;
  baseAmount: string;
  price: string;
  type: string;
  protocol: string;
  timestamp: string;
  assetBase: Asset;
  assetQuote: Asset;
}

/**
 * FIN account action interface
 */
export interface FinAccountAction {
  type?: string;
  height?: string;
  txIdx?: string;
  idx?: string;
  contract?: string;
  txhash?: string;
  quoteAmount?: string;
  baseAmount?: string;
  price?: string;
  protocol?: string;
  timestamp?: string;
  assetBase?: Asset;
  assetQuote?: Asset;
}

/**
 * FIN summary interface
 */
export interface FinSummary {
  last: string;
  lastUsd: string;
  high: string;
  low: string;
  change: string;
  volume: Layer1Balance;
}

/**
 * FIN candle interface
 */
export interface FinCandle {
  id: string;
  resolution: string;
  high: string;
  low: string;
  open: string;
  close: string;
  volume: string;
  bin: string;
}

// ============================================================================
// ASSET & BALANCE INTERFACES
// ============================================================================

/**
 * Asset interface
 */
export interface Asset {
  symbol: string;
  name: string;
  denom: string;
  decimals: number;
  chain: string;
  address?: string;
  icon?: string;
}

/**
 * Layer 1 balance interface
 */
export interface Layer1Balance {
  amount: string;
  denom: string;
  usdValue?: string;
}

/**
 * Account balance interface
 */
export interface AccountBalance {
  address: string;
  balances: Layer1Balance[];
  totalUsdValue?: string;
  lastUpdated: string;
}

// ============================================================================
// THORCHAIN INTERFACES
// ============================================================================

/**
 * THORChain oracle interface
 */
export interface ThorchainOracle {
  asset: string;
  price: string;
  timestamp: string;
  blockHeight: string;
}

/**
 * THORChain pool interface
 */
export interface ThorchainPool {
  asset: string;
  runeBalance: string;
  assetBalance: string;
  poolUnits: string;
  status: string;
  price: string;
}

// ============================================================================
// STRATEGY INTERFACES
// ============================================================================

/**
 * Base strategy interface
 */
export interface Strategy {
  id: string;
  type: StrategyType;
  version: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Strategy configuration interface
 */
export interface StrategyConfig {
  strategy: Strategy;
  parameters: Record<string, any>;
  riskLimits: RiskLimits;
  tradingPairs: string[];
  enabled: boolean;
}

/**
 * Strategy execution interface
 */
export interface StrategyExecution {
  id: string;
  strategyId: string;
  status: SystemStatus;
  startTime: string;
  endTime?: string;
  ordersPlaced: number;
  tradesExecuted: number;
  profitLoss: string;
  error?: string;
}

/**
 * Risk limits interface
 */
export interface RiskLimits {
  maxPositionSize: string;
  maxDailyLoss: string;
  maxDrawdown: string;
  maxOrdersPerMinute: number;
  maxSlippage: string;
}

// ============================================================================
// TRADING INTERFACES
// ============================================================================

/**
 * Order interface
 */
export interface Order {
  id: string;
  pairAddress: string;
  owner: string;
  side: OrderSide;
  type: OrderType;
  price: string;
  amount: string;
  filled: string;
  remaining: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  txhash?: string;
}

/**
 * Trade interface
 */
export interface Trade {
  id: string;
  orderId: string;
  pairAddress: string;
  side: OrderSide;
  price: string;
  amount: string;
  fee: string;
  timestamp: string;
  txhash: string;
  blockHeight: string;
}

/**
 * Position interface
 */
export interface Position {
  id: string;
  pairAddress: string;
  owner: string;
  baseAmount: string;
  quoteAmount: string;
  averagePrice: string;
  unrealizedPnL: string;
  realizedPnL: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MARKET DATA INTERFACES
// ============================================================================

/**
 * Market data interface
 */
export interface MarketData {
  pairAddress: string;
  lastPrice: string;
  bid: string;
  ask: string;
  volume24h: string;
  change24h: string;
  high24h: string;
  low24h: string;
  timestamp: string;
}

/**
 * Price feed interface
 */
export interface PriceFeed {
  asset: string;
  price: string;
  source: string;
  timestamp: string;
  confidence?: string;
}

// ============================================================================
// DEPLOYMENT INTERFACES
// ============================================================================

/**
 * Deployment target status enumeration
 */
export enum DeploymentTargetStatus {
  PENDING = 'pending',
  DEPLOYING = 'deploying',
  ACTIVE = 'active',
  FAILED = 'failed',
  DEPRECATED = 'deprecated'
}

/**
 * Contract info interface
 */
export interface ContractInfo {
  address: string;
  codeId: string;
  creator: string;
  admin?: string;
  label?: string;
  createdAt: string;
  status: DeploymentTargetStatus;
}

// ============================================================================
// API & GRAPHQL INTERFACES
// ============================================================================

/**
 * GraphQL query interface
 */
export interface GraphQLQuery {
  query: string;
  variables?: Record<string, any>;
  operationName?: string;
}

/**
 * GraphQL response interface
 */
export interface GraphQLResponse<T = any> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: Record<string, any>;
}

/**
 * GraphQL error interface
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: string[];
  extensions?: Record<string, any>;
}

/**
 * API request interface
 */
export interface ApiRequest {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

/**
 * API response interface
 */
export interface ApiResponse<T = any> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
}

// ============================================================================
// DATABASE & STORAGE INTERFACES
// ============================================================================

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

/**
 * Database query interface
 */
export interface DatabaseQuery {
  sql: string;
  params?: any[];
  timeout?: number;
}

/**
 * Database result interface
 */
export interface DatabaseResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: any[];
}

// ============================================================================
// LOGGING & MONITORING INTERFACES
// ============================================================================

/**
 * Log level enumeration
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Log entry interface
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

/**
 * Metrics interface
 */
export interface Metrics {
  ordersPerSecond: number;
  tradesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  profitLoss: string;
  timestamp: string;
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Application configuration interface
 */
export interface AppConfig {
  environment: string;
  debug: boolean;
  logLevel: LogLevel;
  database: DatabaseConnection;
  networks: Record<string, NetworkConfig>;
  strategies: StrategyConfig[];
  api: {
    port: number;
    host: string;
    cors: boolean;
  };
  websocket: {
    port: number;
    host: string;
  };
}

/**
 * Trading configuration interface
 */
export interface TradingConfig {
  defaultGasPrice: string;
  maxGasLimit: number;
  slippageTolerance: string;
  minOrderSize: string;
  maxOrderSize: string;
  orderTimeout: number;
  retryAttempts: number;
}

// ============================================================================
// EVENT & SUBSCRIPTION INTERFACES
// ============================================================================

/**
 * Event type enumeration
 */
export enum EventType {
  ORDER_CREATED = 'order_created',
  ORDER_UPDATED = 'order_updated',
  ORDER_FILLED = 'order_filled',
  ORDER_CANCELLED = 'order_cancelled',
  TRADE_EXECUTED = 'trade_executed',
  PRICE_UPDATED = 'price_updated',
  STRATEGY_STARTED = 'strategy_started',
  STRATEGY_STOPPED = 'strategy_stopped',
  ERROR_OCCURRED = 'error_occurred'
}

/**
 * Event interface
 */
export interface Event {
  type: EventType;
  data: any;
  timestamp: string;
  source: string;
  id: string;
}

/**
 * Event handler interface
 */
export interface EventHandler {
  eventType: EventType;
  handler: (event: Event) => void | Promise<void>;
  priority?: number;
}

/**
 * Subscription interface
 */
export interface Subscription {
  id: string;
  topic: string;
  handler: (data: any) => void;
  isActive: boolean;
  createdAt: string;
}

// ============================================================================
// UTILITY INTERFACES
// ============================================================================

/**
 * Pagination interface
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Error interface
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  stack?: string;
}

/**
 * Result interface for operations that can fail
 */
export interface Result<T, E = AppError> {
  success: boolean;
  data?: T;
  error?: E;
}

// ============================================================================
// EXPORT ALL INTERFACES
// ============================================================================

export {
  // Core system
  SystemStatus,
  HttpMethod,
  StrategyType,
  OrderSide,
  OrderType,
  OrderStatus,
  
  // Network & connection
  NetworkConfig,
  ConnectionStatus,
  WebSocketConnection,
  
  // FIN Protocol
  FinContractConfig,
  FinPair,
  FinBookEntry,
  FinBook,
  FinOrder,
  FinTrade,
  FinAccountAction,
  FinSummary,
  FinCandle,
  
  // Asset & balance
  Asset,
  Layer1Balance,
  AccountBalance,
  
  // THORChain
  ThorchainOracle,
  ThorchainPool,
  
  // Strategy
  Strategy,
  StrategyConfig,
  StrategyExecution,
  RiskLimits,
  
  // Trading
  Order,
  Trade,
  Position,
  
  // Market data
  MarketData,
  PriceFeed,
  
  // Deployment
  DeploymentTargetStatus,
  ContractInfo,
  
  // API & GraphQL
  GraphQLQuery,
  GraphQLResponse,
  GraphQLError,
  ApiRequest,
  ApiResponse,
  
  // Database
  DatabaseConnection,
  DatabaseQuery,
  DatabaseResult,
  
  // Logging & monitoring
  LogLevel,
  LogEntry,
  Metrics,
  
  // Configuration
  AppConfig,
  TradingConfig,
  
  // Events & subscriptions
  EventType,
  Event,
  EventHandler,
  Subscription,
  
  // Utilities
  Pagination,
  PaginatedResponse,
  AppError,
  Result
}; 