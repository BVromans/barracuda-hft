<<<<<<< Updated upstream
import Decimal from 'decimal.js';

/**
 * Native token
 */
export const NATIVE_TOKEN = {
	address: undefined as unknown as string,
	symbol: 'RUJI',
	name: 'RUJIRA',
	decimals: undefined as unknown as number,
	raw: undefined as unknown as Raw
} as Token;

/**
 * Fee payment token
 */
export const FEE_PAYMENT_TOKEN = {
	address: undefined as unknown as string,
	symbol: 'RUNE',
	name: 'RUNE',
	decimals: undefined as unknown as number,
	raw: undefined as unknown as Raw
} as Token;

/**
 * Beacon token
 */
export const BEACON_TOKEN = {
	address: undefined as unknown as string,
	symbol: 'USDC',
	name: 'USDC',
	decimals: undefined as unknown as number,
	raw: undefined as unknown as Raw
} as Token;

/**
 * Token types
 */
export enum SystemStatus {
	UP = 'up',
	DOWN = 'down',
}

/**
 * Chain types
 */
export enum Chain {
	ETHEREUM = 'ethereum',
	RUJIRA = 'rujira',
	THORCHAIN = 'thorchain',
}

/**
 * Network types
 */
export enum Network {
	MAINNET = 'mainnet',
	TESTNET = 'testnet'
}

/**
 * Transaction status types
 */
export enum TransactionStatus {
	SUCCESS = 'success',
	FAILED = 'failed'
}

/**
 * Market status types
 */
export enum MarketStatus {
	ACTIVE = 'active',
	INACTIVE = 'inactive'
}

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

/**
 * Token interface
 */
export interface Token {
	/**
	 * Contract address of the token
	 */
	address: TokenAddress;

	/**
	 * Symbol of the token
	 */
	symbol: TokenSymbol;

	/**
	 * Name of the token
	 */
	name: TokenName;

	/**
	 * Number of decimal places
	 */
	decimals: TokenDecimals;

	/**
	 * Raw data of the token
	 */
	raw: Raw;
}

/**
 * Transaction interface
 */
export interface Transaction {
	/**
	 * Blockchain transaction hash
	 */
	hash: TransactionHash;

	/**
	 * Status of the transaction
	 */
	status: TransactionStatus;

	/**
	 * Fees paid for the transaction
	 */
	fee: {
		/**
		 * Amount of the fee
		 */
		amount: FeeAmount;

		/**
		 * Token of the fee
		 */
		token: FeeToken;
	};

	/**
	 * Raw data of the transaction
	 */
	raw: Raw;
}

/**
 * Market interface
 */
export interface Market {
	/**
	 * Address of the market
	 */
	address: MarketAddress;

	/**
	 * Name of the market
	 */
	symbol: MarketSymbol;

	/**
	 * Tokens of the market
	 */
	tokens: {
		/**
		 * Base token of the market
		 */
		base: Token;

		/**
		 * Quote token of the market
		 */
		quote: Token;
	};

	/**
	 * Number of decimal places
	 */
	decimals: MarketDecimals;

	/**
	 * Price of the market
	 */
	price?: {
		/**
		 * Price of the base token in the quote token
		 */
		baseQuote: MarketPrice;

		/**
		 * Price of the quote token in the base token
		 */
		quoteBase: MarketPrice;
	}

	/**
	 * Whether the market is active
	 */
	status: MarketStatus;

	/**
	 * Raw data of the market
	 */
	raw: Raw;
}

/**
 * Order book order interface
 */
export interface OrderBookOrder {
	/**
	 * Price of the order
	 */
	price: OrderBookOrderPrice;

	/**
	 * Amount of the order
	 */
	amount: OrderBookOrderAmount;

	/**
	 * Raw data of the order
	 */
	raw: Raw;
}

/**
 * Order book interface
 */
export interface OrderBook {
	/**
	 * Market of the order book
	 */
	market: Market;

	/**
	 * Book of the order book
	 */
	book: {
		/**
		 * Bids of the order book
		 */
		bids: OrderBookOrder[];

		/**
		 * Asks of the order book
		 */
		asks: OrderBookOrder[];

		/**
		 * Best bid of the order book
		 */
		bestBid: OrderBookOrder;

		/**
		 * Best ask of the order book
		 */
		bestAsk: OrderBookOrder;

		/**
		 * Middle price of the order book
		 */
		middlePrice: OrderBookMiddlePrice;
	}

	/**
	 * Raw data of the order book
	 */
	raw: Raw;
}

/**
 * Ticker interface
 */
export interface Ticker {
	/**
	 * Market of the ticker
	 */
	market: Market;

	/**
	 * Price of the ticker
	 */
	price: TickerPrice;

	/**
	 * Timestamp of the ticker
	 */
	timestamp: TickerTimestamp;

	/**
	 * Raw data of the ticker
	 */
	raw: Raw;
}

/**
 * Base balance interface
 */
export interface BaseBalance {
	/**
	 * Free balance
	 */
	free: Amount;

	/**
	 * Balance locked in orders
	 */
	lockedInOrders: Amount;

	/**
	 * Unsettled (or waiting to withdraw) balance, usually refers to filled but unclaimed orders
	 */
	unsettled: Amount;

	/**
	 * Total balance
	 */
	total: Amount;

	/**
	 * Quotation used to convert the balance
	 */
	quotation?: {
		/**
		 * Token used to convert the balance
		 */
		token: Token;

		/**
		 * Conversion rate of the balance
		 */
		conversionRate: Amount;
	}
}

/**
 * Base token balance interface
 */
export interface BaseTokenBalance {
	/**
	 * Token balance
	 */
	token?: BaseBalance;

	/**
	 * Native token balance
	 */
	nativeToken?: BaseBalance;

	/**
	 * Beacon token balance
	 */
	beaconToken?: BaseBalance;
}

/**
 * Token balance interface
 */
export interface TokenBalance {
	/**
	 * Token of the token balance
	 */
	token: Token;

	/**
	 * Balances of the token balance
	 */
	balances: BaseTokenBalance;
}

/**
 * Balances interface
 */
export interface Balances {
	/**
	 * Tokens of the balances
	 */
	tokens: Map<TokenAddress, TokenBalance>;

	/**
	 * Total balance
	 */
	total: BaseTokenBalance;
}
=======
// Core types from Rujira contracts
export type Side = "base" | "quote";
export type Chain = "avax" | "bch" | "bsc" | "btc" | "doge" | "eth" | "gaia" | "ltc" | "thor";

export interface Decimal {
  // String representation with 18 fractional digits
  // e.g., "1000000000000000000" = 1.0
}

export interface Uint128 {
  // String representation for large numbers
  // e.g., "1000000"
}

export interface Uint64 {
  // String representation for 64-bit numbers
}

export interface Timestamp {
  // Nanosecond precision timestamp
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
>>>>>>> Stashed changes
