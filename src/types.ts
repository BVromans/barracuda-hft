// ===== CONTRACT TYPES =====
// Core types from Rujira contracts
export type Side = "base" | "quote";
export type Chain = "avax" | "bch" | "bsc" | "btc" | "doge" | "eth" | "gaia" | "ltc" | "thor";

export interface Uint128 {
  // String representation for large numbers
  // e.g., "1000000"
}

export interface Uint64 {
  // String representation for 64-bit numbers
}

export interface Layer1Asset {
  chain: Chain;
  symbol: string;
}

export interface Price {
  fixed?: string; // Decimal string
  oracle?: number; // Integer index
}

export interface Coin {
  amount: string; // Uint128
  denom: string;
}

export interface SwapRequest {
  min_return?: string; // Uint128
  to?: string; // Address
  callback?: any; // Binary data
}

export interface CallbackData {
  // Binary data for callbacks
}

// ===== RUJIRA BOW CONTRACT (Current) =====
export interface BowInstantiateMsg {
  denoms: {
    bid: string;
    ask: string;
  };
  market_maker?: string;
  oracles?: string[];
  tick: { exponent: number };
  fee_taker: string;
  fee_maker: string;
  fee_address: string;
}

export interface BowExecuteMsg {
  swap?: {
    min_return?: string;
    to?: string;
    callback?: any;
  };
  order?: [Array<[string, any, string]>, any];
  arb?: {
    then?: any;
  };
  do_swap?: [string, any];
}

export interface BowQueryMsg {
  strategy?: {
    denom: string;
    amount: string;
  };
  quote?: {
    denom: string;
    amount: string;
    offer_denom: string;
    offer_amount: string;
    ask_denom: string;
    ask_amount: string;
  };
}

// Bow Response types
export interface BowStrategyResponse {
  xyk: [
    {
      x: string;
      y: string;
      step: string;
      min_quote: string;
      fee: string;
    },
    {
      x: string;
      y: string;
      k: string;
      shares: string;
    }
  ];
}

export interface BowQuoteResponse {
  price: string;
  size: string;
  data: string; // Base64 encoded data
}

// ===== RUJIRA FIN CONTRACT (Future) =====
export interface FinInstantiateMsg {
  denoms: string[]; // Array of 2 strings [base, quote]
  fee_address: string;
  fee_maker: string; // Decimal
  fee_taker: string; // Decimal
  tick: number; // uint8
  market_maker?: string;
  oracles?: Layer1Asset[]; // Array of 2 Layer1Asset
}

export interface FinExecuteMsg {
  swap?: SwapRequest;
  order?: [
    Array<[Side, Price, string | null]>, // [side, price, amount]
    CallbackData | null
  ];
  arb?: {
    then?: any; // Binary data
  };
  do_swap?: [string, SwapRequest]; // [address, swap_request]
}

export interface FinQueryMsg {
  config?: {};
  simulate?: Coin;
  order?: [string, Side, Price]; // [owner, side, price]
  orders?: {
    owner: string;
    side?: Side;
    offset?: number; // uint8
    limit?: number; // uint8 (max 30)
  };
  book?: {
    limit?: number; // uint8
    offset?: number; // uint8
  };
}

// Fin Response types
export interface FinConfigResponse {
  denoms: string[];
  fee_address: string;
  fee_maker: string; // Decimal
  fee_taker: string; // Decimal
  tick: number;
  market_maker?: string;
  oracles?: Layer1Asset[];
}

export interface FinSimulationResponse {
  fee: string; // Uint128
  returned: string; // Uint128
}

export interface FinBookItemResponse {
  price: string; // Decimal
  total: string; // Uint128
}

export interface FinBookResponse {
  base: FinBookItemResponse[];
  quote: FinBookItemResponse[];
}

export interface FinOrderResponse {
  filled: string; // Uint128
  offer: string; // Uint128
  owner: string;
  price: Price;
  rate: string; // Decimal
  remaining: string; // Uint128
  side: Side;
  updated_at: string; // Timestamp
}

export interface FinOrdersResponse {
  orders: FinOrderResponse[];
}

// ===== LEGACY TYPES (Backward Compatibility) =====
export interface InstantiateMsg extends BowInstantiateMsg {}
export interface ExecuteMsg extends BowExecuteMsg {}
export interface QueryMsg extends BowQueryMsg {}

// Legacy response types
export interface ConfigResponse extends FinConfigResponse {}
export interface SimulationResponse extends FinSimulationResponse {}
export interface BookResponse extends FinBookResponse {}
export interface OrdersResponse extends FinOrdersResponse {}

// ===== APPLICATION TYPES =====
import Decimal from 'decimal.js';

export const NATIVE_TOKEN = {
	address: undefined as unknown as string,
	symbol: 'RUJI',
	name: 'RUJIRA',
	decimals: undefined as unknown as number,
	raw: undefined as unknown as Raw
} as Token;

export const FEE_PAYMENT_TOKEN = {
	address: undefined as unknown as string,
	symbol: 'RUNE',
	name: 'RUNE',
	decimals: undefined as unknown as number,
	raw: undefined as unknown as Raw
} as Token;

export const BEACON_TOKEN = {
	address: undefined as unknown as string,
	symbol: 'USDC',
	name: 'USDC',
	decimals: undefined as unknown as number,
	raw: undefined as unknown as Raw
} as Token;

export enum SystemStatus {
	UP = 'up',
	DOWN = 'down',
}

export enum AppChain {
	ETHEREUM = 'ethereum',
	RUJIRA = 'rujira',
	THORCHAIN = 'thorchain',
}

export enum Network {
	MAINNET = 'mainnet',
	TESTNET = 'testnet'
}

export enum TransactionStatus {
	SUCCESS = 'success',
	FAILED = 'failed'
}

export enum MarketStatus {
	ACTIVE = 'active',
	INACTIVE = 'inactive'
}

export enum OrderSide {
	BUY = 'buy',
	SELL = 'sell'
}

export enum OrderType {
	MARKET = 'market',
	LIMIT = 'limit'
}

export enum OrderStatus {
	OPEN = 'open',
	CANCELLED = 'cancelled',
	PARTIALLY_FILLED = 'partially_filled',
	FILLED = 'filled',
	CREATION_PENDING = 'creation_pending',
	CANCELLATION_PENDING = 'cancellation_pending',
	UNKNOWN = 'unknown'
}

export type Raw = any;
export type Address = string;
export type Integer = number;
export type Amount = Decimal;
export type Hash = string;
export type Timestamp = number;

export type WalletAddress = Address;
export type TokenAddress = Address;
export type TokenSymbol = string;
export type TokenName = string;
export type TokenDecimals = number;
export type FeeAmount = Amount;
export type FeeToken = Token;
export type TransactionHash = Hash;
export type MarketAddress = Address;
export type MarketSymbol = string;
export type MarketDecimals = Integer;
export type MarketPrice = Amount;
export type OrderBookOrderPrice = Amount;
export type OrderBookOrderAmount = Amount;
export type OrderBookMiddlePrice = Amount;
export type TickerPrice = Amount;
export type TickerTimestamp = Timestamp;

export interface Token {
	address: TokenAddress;
	symbol: TokenSymbol;
	name: TokenName;
	decimals: TokenDecimals;
	raw: Raw;
}

export interface Transaction {
	hash: TransactionHash;
	status: TransactionStatus;
	fee: {
		amount: FeeAmount;
		token: FeeToken;
	};
	raw: Raw;
}

export interface Market {
	address: MarketAddress;
	symbol: MarketSymbol;
	tokens: {
		base: Token;
		quote: Token;
	};
	decimals: MarketDecimals;
	price?: {
		baseQuote: MarketPrice;
		quoteBase: MarketPrice;
	}
	status: MarketStatus;
	raw: Raw;
}

export interface OrderBookOrder {
	price: OrderBookOrderPrice;
	amount: OrderBookOrderAmount;
	raw: Raw;
}

export interface OrderBook {
	market: Market;
	book: {
		bids: OrderBookOrder[];
		asks: OrderBookOrder[];
		bestBid: OrderBookOrder;
		bestAsk: OrderBookOrder;
		middlePrice: OrderBookMiddlePrice;
	}
	raw: Raw;
}

export interface Ticker {
	market: Market;
	price: TickerPrice;
	timestamp: TickerTimestamp;
	raw: Raw;
}

export interface BaseBalance {
	free: Amount;
	lockedInOrders: Amount;
	unsettled: Amount;
	total: Amount;
	quotation?: {
		token: Token;
		conversionRate: Amount;
	}
}

export interface BaseTokenBalance {
	token?: BaseBalance;
	nativeToken?: BaseBalance;
	beaconToken?: BaseBalance;
}

export interface TokenBalance {
	token: Token;
	balances: BaseTokenBalance;
}

export interface Balances {
	tokens: Map<TokenAddress, TokenBalance>;
	total: BaseTokenBalance;
}
