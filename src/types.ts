import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
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

export enum Chain {
	ETHEREUM = 'ethereum',
	RUJIRA = 'rujira',
	THORCHAIN = 'thorchain',
}

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

export type Boolean = boolean;
export type Raw = any;
export type Address = string;
export type Mnemonic = string;
export type PrivateKey = string;
export type Integer = number;
export type Amount = Decimal;
export type Hash = string;
export type Timestamp = number;
export type URL = string;
export type ErrorMessage = string;

export type RPCEndpoint = URL;

export type WalletAddress = Address;
export type WalletMnemonic = Mnemonic;
export type WalletPrivateKey = PrivateKey;

export type TokenAddress = Address;
export type TokenSymbol = string;
export type TokenName = string;
export type TokenDecimals = number;

export type FeeAmount = Amount;
export type FeeToken = Token;

export type TransactionHash = Hash;
export type TransactionConfirmation = Boolean;

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

///////////////////////////////////////////////////

/**
 * Rujira constructor options
 */
export interface RujiraConstructorOptions {
  /**
   * RPC endpoint
   */
  rpcEndpoint: RPCEndpoint;

  /**
   * Wallet mnemonic
   */
  walletMnemonic: WalletMnemonic;

  /**
   * Wallet private key
   */
  walletPrivateKey: WalletPrivateKey;
}

/**
 * Rujira initialize options
 */
export interface RujiraInitializeOptions {
}

/**
 * Fin constructor options
 */
export interface FinConstructorOptions {
  /**
   * RPC endpoint
   */
  rpcEndpoint: RPCEndpoint;

  /**
   * Wallet mnemonic
   */
  walletMnemonic: WalletMnemonic;
}

/**
 * Fin initialize options
 */
export interface FinInitializeOptions {

  /**
	 * Wallet
	 */
	wallet: DirectSecp256k1Wallet;

	/**
	 * Cosm client
	 */
	cosmClient: SigningCosmWasmClient;
}

/**
 * Get status request
 */
export interface FinGetStatusRequest {
}

/**
 * Get status response
 */
export interface FinGetStatusResponse {
	/**
	 * System status
	 */
	status: SystemStatus;

	/**
	 * Error message (only present when status is DOWN)
	 */
	error?: ErrorMessage;
}

/**
 * Get token request
 */
export interface FinGetTokenRequest {
	/**
	 * Token address
	 */
	address?: TokenAddress;

	/**
	 * Token symbol
	 */
	symbol?: TokenSymbol;
}

/**
 * Get token response
 */
export interface FinGetTokenResponse {
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

}

/**
 * Get tokens request (if no addresses or symbols are provided, all tokens will be returned)
 */
export interface FinGetTokensRequest {
	/**
	 * Token addresses
	 */
	addresses?: TokenAddress[];

	/**
	 * Token symbols
	 */
	symbols?: TokenSymbol[];
}

/**
 * Get tokens response
 */
export type FinGetTokensResponse = Map<TokenAddress, Token>;

/**
 * Get all tokens request
 */
export interface FinGetAllTokensRequest {}

/**
 * Get all tokens response
 */
export interface FinGetAllTokensResponse extends Map<TokenAddress, Token> {}

/**
 * Get market request
 */
export interface FinGetMarketRequest {
	/**
	 * Market address
	 */
	address?: MarketAddress;

	/**
	 * Market name
	 */
	symbol?: MarketSymbol;
}

/**
 * Get market response
 */
export interface FinGetMarketResponse extends Market {}

/**
 * Get markets request
 */
export interface FinGetMarketsRequest {
	/**
	 * Market address
	 */
	addresses?: MarketAddress[];

	/**
	 * Market name
	 */
	symbols?: MarketSymbol[];
}

/**
 * Get markets response
 */
export interface FinGetMarketsResponse extends Map<MarketAddress, Market> {}

/**
 * Get all markets request
 */
export interface FinGetAllMarketsRequest {}

/**
 * Get all markets response
 */
export interface FinGetAllMarketsResponse extends Map<MarketAddress, Market> {}

/**
 * Get order book request
 */
export interface FinGetOrderBookRequest {
	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Limit
	 */
	limit?: Integer;
}

/**
 * Get order book response
 */
export interface FinGetOrderBookResponse extends OrderBook {}

/**
 * Get ticker request
 */
export interface FinGetTickerRequest {
	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;
}

/**
 * Get ticker response
 */
export interface FinGetTickerResponse extends Ticker {}

/**
 * Get balances request
 */
export interface FinGetBalancesRequest {
	/**
	 * Address
	 */
	walletAddress: WalletAddress;

	/**
	 * Token addresses to filter balances (optional)
	 */
	tokenAddresses?: TokenAddress[];

	/**
	 * Token symbols to filter balances
	 */
	tokenSymbols: TokenSymbol[];
}

/**
 * Get balances response
 */
export interface FinGetBalancesResponse extends Balances {}

/**
 * Get transaction request
 */
export interface FinGetTransactionRequest {
	/**
	 * Transaction hash
	 */
	hash: TransactionHash;

	/**
	 * Wait for confirmation
	 */
	waitForConfirmation?: boolean;
}

/**
 * Get transaction response
 */
export interface FinGetTransactionResponse extends Transaction {}

/**
 * Get order request
 */
export interface FinGetOrderRequest {
	/**
	 * Order ID
	 */
	id: string;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Owner address (wallet that owns the order)
	 */
	ownerAddress: string;
}

/**
 * Get order response
 */
export interface FinGetOrderResponse extends OrderBookOrder {}

/**
 * Get orders request
 */
export interface FinGetOrdersRequest {
	/**
	 * Owner address (wallet that owns the orders)
	 */
	ownerAddress: string;

	/**
	 * Market address (optional filter)
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name (optional filter)
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Order status filter (optional)
	 */
	status?: OrderStatus;

	/**
	 * Order IDs filter (optional)
	 */
	ids?: string[];

	/**
	 * Limit number of orders to return (optional)
	 */
	limit?: Integer;
}

/**
 * Get orders response
 */
export interface FinGetOrdersResponse {
	/**
	 * List of orders
	 */
	orders: OrderBookOrder[];
}

/**
 * Create order request
 */
export interface FinCreateOrderRequest {
	/**
	 * Owner address (wallet that will create the order)
	 */
	ownerAddress: string;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Order side (buy/sell)
	 */
	side: OrderSide;

	/**
	 * Order type (market/limit)
	 */
	type: OrderType;

	/**
	 * Order price (required for limit orders)
	 */
	price?: Amount;

	/**
	 * Order amount
	 */
	amount: Amount;
}

/**
 * Create order response
 */
export interface FinCreateOrderResponse {
  /**
   * The transaction hash of the order creation
   */
  transactionHash: string;
  /**
   * The full raw transaction result returned by the blockchain client
   */
  raw: any;
}

/**
 * Create orders request
 */
export interface FinCreateOrdersRequest {
	/**
	 * Owner address (wallet that will create the orders)
	 */
	ownerAddress: string;

	/**
	 * List of orders to create
	 */
	orders: FinCreateOrderRequest[];

	/**
	 * Gas limit for the transaction (optional)
	 */
	gasLimit?: Integer;

	/**
	 * Gas price for the transaction (optional)
	 */
	gasPrice?: Amount;
}

/**
 * Create orders response
 */
export interface FinCreateOrdersResponse {
	/**
	 * List of created orders
	 */
	orders: OrderBookOrder[];
	
	/**
	 * Transaction details
	 */
	transaction: Transaction;
}

/**
 * Cancel order request
 */
export interface FinCancelOrderRequest {
	/**
	 * Owner address (wallet that will cancel the order)
	 */
	ownerAddress: string;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Order ID
	 */
	orderId: string;
}

/**
 * Cancel order response
 */
export interface FinCancelOrderResponse {
	/**
	 * Order ID that was cancelled
	 */
	orderId: string;
	
	/**
	 * Status of the cancelled order
	 */
	status: OrderStatus;
	
	/**
	 * Transaction details
	 */
	transaction: Transaction;
}

/**
 * Cancel orders request
 */
export interface FinCancelOrdersRequest {
	/**
	 * Owner address (wallet that will cancel the orders)
	 */
	ownerAddress: string;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Order IDs
	 */
	orderIds: string[];
}

/**
 * Cancel orders response
 */
export interface FinCancelOrdersResponse {
	/**
	 * Order IDs that were cancelled
	 */
	orderIds: string[];
	
	/**
	 * Status of the cancelled orders
	 */
	status: OrderStatus;
	
	/**
	 * Transaction details
	 */
	transaction: Transaction;
}

/**
 * Withdraw from market request
 */
export interface FinWithdrawRequest {
	/**
	 * Owner address (wallet that will withdraw)
	 */
	ownerAddress: string;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Order IDs to withdraw (optional - if not provided, withdraws all filled orders)
	 */
	orderIds?: string[];
}

/**
 * Withdraw from market response
 */
export interface FinWithdrawResponse {
	/**
	 * Whether the withdrawal was successful
	 */
	success: boolean;
	
	/**
	 * Transaction details
	 */
	transaction: Transaction;
}