// noinspection JSUnusedGlobalSymbols

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import Decimal from 'decimal.js';
import BN from "bn.js";
import { GasPrice } from '@cosmjs/stargate';
import { properties } from './properties';
import { List, Map } from 'immutable';
import { MList, MMap } from './extensions/immutablejs/types';

export { List, Map, MList, MMap };

export const DECIMAL_0 = new Decimal(0);
export const DECIMAL_100 = new Decimal(100);
export const DECIMAL_INFINITY = new Decimal(Number.POSITIVE_INFINITY);
export const DECIMAL_NEGATIVE_INFINITY = new Decimal(Number.NEGATIVE_INFINITY);
export const DECIMAL_NaN = new Decimal(NaN);
export const BIG_NUMBER_0 = new BN(0);
export const BIG_NUMBER_1 = new BN(1);
export const BIG_NUMBER_100 = new BN(100);
export const BIG_NUMBER_NaN = new BN(NaN);

properties.set('wallet.prefix', 'thor');

export enum Chain {
	ETHEREUM = 'ethereum',
	RUJIRA = 'rujira',
	THORCHAIN = 'thorchain',
}

export enum SystemStatus {
	UP = 'up',
	DOWN = 'down',
}

export enum Network {
	MAINNET = 'mainnet',
	TESTNET = 'testnet'
}

export enum TransactionStatus {
	PENDING = 'pending',
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
export type Id = string;
export type Address = string;
export type Symbol = string;
export type Name = string;
export type Mnemonic = string;
export type PrivateKey = string;
export type Integer = number;
export type Amount = Decimal;
export type Percentage = Decimal;
export type Hash = string;
export type Timestamp = number;
export type URL = string;
export type ErrorMessage = string;

export type WalletAddress = Address;
export type WalletMnemonic = Mnemonic;
export type WalletPrivateKey = PrivateKey;

export type TokenAddress = Address;
export type TokenSymbol = Symbol;
export type TokenName = Name;
export type TokenDecimals = Integer;

export type FeeAmount = Amount;
export type FeeToken = Token;

export type TransactionHash = Hash;

export type MarketAddress = Address;
export type MarketSymbol = Symbol;
export type MarketDecimals = Integer;
export type MarketPrice = Amount;

export type OrderBookOrderPrice = Amount;
export type OrderBookOrderAmount = Amount;
export type OrderBookMiddlePrice = Amount;

export type TickerPrice = Amount;
export type TickerTimestamp = Timestamp;

export type CandleTimestamp = Timestamp;
export type CandlePrice = Amount;
export type CandleVolume = Amount;
export type CandleInterval = '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M' | '1y';

export type OrderId = Id;
export type OrderPrice = Amount;
export type OrderAmount = Amount;
export type OrderFilledAmount = Amount;
export type OrderFilledPercentage = Percentage;
export type OrderCreationTimestamp = Timestamp;
export type OrderUpdateTimestamp = Timestamp;

export type Wallet = DirectSecp256k1Wallet;

/**
 * Represents a token
 */
export interface Token {
	/**
	 * Address of the token
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
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a transaction
 */
export interface Transaction {
	/**
	 * Hash of the transaction
	 */
	hash: TransactionHash;

	/**
	 * Status of the transaction
	 */
	status: TransactionStatus;

	/**
	 * Fee of the transaction
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
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a market
 */
export interface Market {
	/**
	 * Address of the market
	 */
	address: MarketAddress;

	/**
	 * Symbol of the market
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
	 * Status of the market
	 */
	status: MarketStatus;

	/**
	 * Raw data
	 */
	raw: Raw;

	/**
	 * Price of the market
	 */
	price?: {
    baseQuote: Decimal;
    quoteBase: Decimal;
};
}

/**
 * Represents an order book order
 */
export interface OrderBookOrder {
	/**
	 * Price of the order
	 */
	orderId?: OrderId;

	/**
	 * Price of the order
	 */
	price: OrderBookOrderPrice;

	/**
	 * Amount of the order
	 */
	amount: OrderBookOrderAmount;

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents an order book
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
		bids: List<OrderBookOrder>;

		/**
		 * Asks of the order book
		 */
		asks: List<OrderBookOrder>;

		/**
		 * Best bid of the order book
		 */
		bestBid?: OrderBookOrder;

		/**
		 * Best ask of the order book
		 */
		bestAsk?: OrderBookOrder;

		/**
		 * Middle price of the order book
		 */
		middlePrice?: OrderBookMiddlePrice;
	}

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a ticker
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
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a candle
 */
export interface Candle {
	/**
	 * Timestamp of the candle
	 */
	timestamp: CandleTimestamp;

	/**
	 * Open price of the candle
	 */
	open: CandlePrice;

	/**
	 * High price of the candle
	 */
	high: CandlePrice;

	/**
	 * Low price of the candle
	 */
	low: CandlePrice;

	/**
	 * Close price of the candle
	 */
	close: CandlePrice;

	/**
	 * Volume of the candle
	 */
	volume: CandleVolume;

	/**
	 * Raw data
	 */
	raw: Raw;
}


/**
 * Represents a balance of a token
 */
export interface BaseBalance {
	/**
	 * Free balance of the token
	 */
	free: Amount;

	/**
	 * Locked in orders balance of the token
	 */
	lockedInOrders: Amount;

	/**
	 * Locked in pools balance of the token
	 */
	lockedInPools: Amount;

	/**
	 * Withdrawable balance of the token
	 */
	withdrawable: Amount;

	/**
	 * Total balance of the token
	 */
	total: Amount;
}

/**
 * Represents a balance of a token with a quotation
 */
export interface BaseBalanceWithQuotation extends BaseBalance {
	/**
	 * Quotation of the token
	 */
	quotation: {
		/**
		 * Token of the quotation
		 */
		token: Token;

		/**
		 * Conversion rate of the token
		 */
		tokenToQuote: Amount;

		/**
		 * Conversion rate of the quote
		 */
		quoteToToken: Amount;
	};
}

/**
 * Represents a balance of a token
 */
export interface BaseTokenBalance {
	/**
	 * Balance of the token
	 */
	token: BaseBalance;

	/**
	 * Balance of the native token
	 */
	nativeToken: BaseBalanceWithQuotation;

	/**
	 * Balance of the beacon token
	 */
	beaconToken: BaseBalanceWithQuotation;
}

/**
 * Represents a balance of a token
 */
export interface TokenBalance {
	/**
	 * Token of the balance
	 */
	token: Token;

	/**
	 * Balances of the token
	 */
	balances: BaseTokenBalance;
}

/**
 * Represents a total balance of a token
 */
export interface TotalBalances {
	/**
	 * Balance of the native token
	 */
	nativeToken: BaseBalance;

	/**
	 * Balance of the beacon token
	 */
	beaconToken: BaseBalance;
}

/**
 * Represents a balance of a token
 */
export interface Balances {
	/**
	 * Balances of the tokens
	 */
	tokens: Map<TokenAddress, TokenBalance>;

	/**
	 * Total balances of the wallet
	 */
	total: TotalBalances;
}

/**
 * Represents an order
 */
export interface Order {
	/**
	 * ID of the order
	 */
	id?: OrderId;

	/**
	 * Market of the order
	 */
	market: Market;

	/**
	 * The account which placed the order
	 */
	owner: WalletAddress;

	/**
	 * Type of the order
	 */
	type: OrderType;

	/**
	 * The side of the order
	 */
	side: OrderSide;

	/**
	 * Price of the order
	 */
	price: OrderPrice;

	/**
	 * Amount of the order
	 */
	amount: OrderAmount;

	/**
	 * Amount of filled order awaiting withdrawal
	 */
	filledAmount: OrderFilledAmount;

	/**
	 * Filled percentage of the order
	 */
	filledPercentage: OrderFilledPercentage;

	/**
	 * Status of the order
	 */
	status: OrderStatus;

	/**
	 * Timestamp of the order
	 */
	creationTimestamp?: OrderCreationTimestamp;

	/**
	 * Update timestamp of the order
	 */
	updateTimestamp?: OrderUpdateTimestamp;

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Rujira constructor options
 */
export interface RujiraConstructorOptions {
	/**
	 * Wallet mnemonic
	 */
	walletMnemonic?: WalletMnemonic;

	/**
	 * Wallet private key
	 */
	walletPrivateKey?: WalletPrivateKey;
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
export interface FinGetTokenResponse extends Token {
}

/**
 * Get tokens request (if no addresses or symbols are provided, all tokens will be returned)
 */
export interface FinGetTokensRequest {
	/**
	 * Token addresses
	 */
	addresses?: List<TokenAddress> | TokenAddress[];

	/**
	 * Token symbols
	 */
	symbols?: List<TokenSymbol> | TokenSymbol[];
}

/**
 * Get tokens response
 */
export interface FinGetTokensResponse extends Map<TokenAddress, Token> {
}

/**
 * Get all tokens request
 */
export interface FinGetAllTokensRequest {
}

/**
 * Get all tokens response
 */
export interface FinGetAllTokensResponse extends Map<TokenAddress, Token> {
}

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
export interface FinGetMarketResponse extends Market {
}

/**
 * Get markets request
 */
export interface FinGetMarketsRequest {
	/**
	 * Market address
	 */
	addresses?: List<MarketAddress> | MarketAddress[];

	/**
	 * Market name
	 */
	symbols?: List<MarketSymbol> | MarketSymbol[];
}

/**
 * Get markets response
 */
export interface FinGetMarketsResponse extends Map<MarketAddress, Market> {
}

/**
 * Get all markets request
 */
export interface FinGetAllMarketsRequest {
}

/**
 * Get all markets response
 */
export interface FinGetAllMarketsResponse extends Map<MarketAddress, Market> {
}

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
	 * Maximum number of orders to return
	 */
	maximumNumberOfOrders?: Integer;
}

/**
 * Get order book response
 */
export interface FinGetOrderBookResponse extends OrderBook {
}

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
export interface FinGetTickerResponse extends Ticker {
}

/**
 * Get candles request
 */
export interface FinGetCandlesRequest {
	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

		/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Maximum number of candles to return
	 */
	maximumNumberOfCandles?: Integer;

	/**
	 * Candle interval
	 */
	interval?: CandleInterval;
}

/**
 * Get candles response
 */
export interface FinGetCandlesResponse extends List<Candle> {
}

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
	tokenAddresses?: List<TokenAddress> | TokenAddress[];

	/**
	 * Token symbols to filter balances
	 */
	tokenSymbols?: List<TokenSymbol> | TokenSymbol[];
}

/**
 * Get balances response
 */
export interface FinGetBalancesResponse extends Balances {
}

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
	waitForConfirmation?: Boolean;
}

/**
 * Get transaction response
 */
export interface FinGetTransactionResponse extends Transaction {
}

/**
 * Get order request
 */
export interface FinGetOrderRequest {
	/**
	 * Owner address (wallet that owns the order)
	 */
	ownerAddress: WalletAddress;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Order price
	 */
	orderPrice: OrderPrice;

	/**
	 * Order type
	 */
	orderType?: OrderType;

	/**
	 * Order side
	 */
	orderSide?: OrderSide;

	/**
	 * Order status
	 */
	orderStatus?: OrderStatus;
}

export interface FinGetOrderResponse extends Order {
}

/**
 * Get orders request
 */
export interface FinGetOrdersRequest {
	/**
	 * Owner address (wallet that owns the order)
	 */
	ownerAddress: WalletAddress;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Order price
	 */
	orderPrice?: OrderPrice;

	/**
	 * Order type
	 */
	orderType?: OrderType;

	/**
	 * Order side
	 */
	orderSide?: OrderSide;

	/**
	 * Order status
	 */
	orderStatus?: OrderStatus;

	/**
	 * Maximum number of orders to return
	 */
	maximumNumberOfOrders?: Integer;
}

/**
 * Get orders response
 */
export interface FinGetOrdersResponse extends Map<OrderId, Order> {
}

/**
 * Create order request
 */
export interface FinPlaceOrderRequest {
	/**
	 * Owner address (wallet that will create the order)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Order side (buy/sell)
	 */
	side: OrderSide;

	/**
	 * Order type (market/limit)
	 */
	type: OrderType;

	/**
	 * Order amount
	 */
	amount: OrderAmount;

	/**
	 * Order price (required for limit orders)
	 */
	price: OrderPrice;
}

/**
 * Create order response
 */
export interface FinPlaceOrderResponse {
	/**
	 * Order that was created
	 */
	order: Order;

	/**
	 * Transaction details
	 */
	transaction: Transaction;
}

/**
 * Create orders request
 */
export interface FinPlaceOrdersRequest {
	/**
	 * Owner address (wallet that will create the orders)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * List of orders to create
	 */
	orders: List<FinPlaceOrderRequest> | FinPlaceOrderRequest[];
}

/**
 * Create orders response
 */
export interface FinPlaceOrdersResponse {
	/**
	 * List of created orders
	 */
	orders: Map<OrderId, Order>;

	/**
	 * Transaction details
	 */
	transactions: Map<TransactionHash, Transaction>;
}

/**
 * Replace order request
 */
export interface FinReplaceOrderRequest extends FinPlaceOrderRequest {
}

/**
 * Replace order response
 */
export interface FinReplaceOrderResponse extends FinPlaceOrderResponse {
}

/**
 * Replace orders request
 */
export interface FinReplaceOrdersRequest extends FinPlaceOrdersRequest {
}

/**
 * Replace orders response
 */
export interface FinReplaceOrdersResponse extends FinPlaceOrdersResponse {
}

/**
 * Cancel order request
 */
export interface FinCancelOrderRequest {
	/**
	 * Order ID
	 */
	orderId?: OrderId;

	/**
	 * Order
	 */
	order?: Order;

	/**
	 * Owner address (wallet that will cancel the order)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;
}

/**
 * Cancel order response
 */
export interface FinCancelOrderResponse {
	/**
	 * Order that was cancelled
	 */
	order: Order;

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
	 * Order IDs
	 */
	orderIds?: List<OrderId> | OrderId[];

	/**
	 * Orders
	 */
	orders?: List<Order> | Order[];

	/**
	 * Owner address (wallet that will cancel the orders)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Cancel all orders
	 */
	cancelAll?: boolean;
}

/**
 * Cancel orders response
 */
export interface FinCancelOrdersResponse {
	/**
	 * List of cancelled orders
	 */
	orders: Map<OrderId, Order>;

	/**
	 * Transaction details
	 */
	transactions: Map<TransactionHash, Transaction>;
}

/**
 * Withdraw from market request
 */
export interface FinWithdrawRequest {
	/**
	 * Owner address (wallet that will withdraw)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;
}

/**
 * Withdraw from market response
 */
export interface FinWithdrawResponse {
	/**
	 * Transaction details
	 */
	transaction: Transaction;

	/**
	 * Raw response
	 */
	raw: Raw;
}
