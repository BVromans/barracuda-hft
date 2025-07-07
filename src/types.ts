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