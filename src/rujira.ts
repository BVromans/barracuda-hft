import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import {
	Ticker,
	Amount,
	Balances,
	Chain,
	Integer,
	Market,
	MarketAddress,
	MarketSymbol,
	Network,
	OrderBook,
	OrderBookMiddlePrice,
	OrderBookOrder,
	OrderSide,
	OrderStatus,
	OrderType,
	SystemStatus,
	Token,
	TokenAddress,
	TokenDecimals,
	TokenName,
	TokenSymbol,
	Transaction,
	TransactionHash,
	TransactionStatus, WalletAddress
} from "./types";

/**
 * Get status request
 */
export interface FinGetStatusRequest {
	/**
	 * Chain
	 */
	chain: Chain;

	/**
	 * Network
	 */
	network: Network;

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
	error?: string;
}

/**
 * Get token request
 */
export interface FinGetTokenRequest {
	/**
	 * Token address
	 */
	address: TokenAddress;

	/**
	 * Token symbol
	 */
	symbol: TokenSymbol;
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
	hash: TransactionHash;
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

export class Rujira {
	private readonly fin: Fin;

	constructor() {
		this.fin = undefined as unknown as Fin;
	}
}

export class Fin {
	private client: CosmWasmClient;
	private tokensByAddress: Map<TokenAddress, Token>;
	private tokensBySymbol: Map<TokenSymbol, Token>;
	private marketsByAddress: Map<MarketAddress, Market>;
	private marketsByName: Map<MarketSymbol, Market>;

	/**
	 * Constructor
	 */
	constructor(rpcEndpoint: string) {
		this.client = undefined as unknown as CosmWasmClient;
		this.tokensByAddress = new Map();
		this.tokensBySymbol = new Map();
		this.marketsByAddress = new Map();
		this.marketsByName = new Map();
	}

	/**
	 * Initialize the client
	 */
	async initialize(): Promise<void> {
		throw new Error("Not implemented");
	}

	/**
	 * Get status
	 */
	async getStatus(): Promise<FinGetStatusResponse> {
		try {
			// Check if client is initialized and can connect
			if (!this.client) {
				return {
					error: 'Client not initialized. Please call initialize() first.',
					status: SystemStatus.DOWN
				} as FinGetStatusResponse;
			}

			// Try to get chain height to verify connection
			await this.client.getHeight();

			return {
				status: SystemStatus.UP
			} as FinGetStatusResponse;
		} catch (error) {
			const errorMessage = error instanceof Error
				? `Connection failed: ${error.message}`
				: 'Connection failed: Unknown error';

			return {
				error: errorMessage,
				status: SystemStatus.DOWN
			} as FinGetStatusResponse;
		}
	}

	/**
	 * Get transaction
	 */
	async getTransaction(request: FinGetTransactionRequest): Promise<FinGetTransactionResponse> {
		if (!this.client) {
			throw new Error("Client not initialized. Please call initialize() first.");
		}

		if (!request.hash) {
			throw new Error("Transaction hash is required");
		}

		try {
			// Get transaction details from the blockchain
			const transaction = await this.client.getTx(request.hash);

			if (!transaction) {
				throw new Error("Transaction not found");
			}

			// Transform the raw transaction data to match our interface
			const transactionResponse: FinGetTransactionResponse = {
				hash: request.hash,
				status: transaction.code === 0 ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
				fee: {
					amount: (transaction.gasUsed || 0) as any,
					token: {
						address: '',
						symbol: '',
						name: '',
						decimals: 0 as TokenDecimals,
						raw: {}
					}
				},
				raw: transaction
			};

			return transactionResponse;
		} catch (error) {
			if (error instanceof Error && error.message === "Transaction not found") {
				throw error;
			}
			throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get token
	 */
	async getToken(request: FinGetTokenRequest): Promise<FinGetTokenResponse> {
		if (!request.address && !request.symbol) {
			throw new Error("Either address or symbol must be provided");
		}

		throw new Error("Not implemented");
	}

	/**
	 * Get tokens
	 */
	async getTokens(request: FinGetTokensRequest): Promise<FinGetTokensResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Get market
	 */
	async getMarket(request: FinGetMarketRequest): Promise<FinGetMarketResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Get markets
	 */
	async getMarkets(request: FinGetMarketsRequest): Promise<FinGetMarketsResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Get order book
	 */
	async getOrderBook(request: FinGetOrderBookRequest): Promise<FinGetOrderBookResponse> {
		if (!request.marketAddress && !request.marketSymbol) {
			throw new Error("Either market address or market name must be provided");
		}

		if (request.marketSymbol && !request.marketAddress) {
			request.marketAddress = this.marketsByName.get(request.marketSymbol)?.address;
		}

		if (!request.marketAddress) {
			throw new Error("Market address must be provided");
		}

		const market = this.marketsByAddress.get(request.marketAddress);

		const rawOrderBook = await this.client.queryContractSmart(request.marketAddress, {
			order_book: {
				limit: request.limit
			} as any
		});

		const orderBook: OrderBook = {
			market: market!,
			book: {
				asks: undefined as unknown as OrderBookOrder[],
				bids: undefined as unknown as OrderBookOrder[],
				bestBid: undefined as unknown as OrderBookOrder,
				bestAsk: undefined as unknown as OrderBookOrder,
				middlePrice: undefined as unknown as OrderBookMiddlePrice,
			},
			raw: rawOrderBook
		} as OrderBook;

		return orderBook;
	}

	/**
	 * Get ticker
	 */
	async getTicker(request: FinGetTickerRequest): Promise<FinGetTickerResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Get balances
	 */
	async getBalances(request: FinGetBalancesRequest): Promise<FinGetBalancesResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Get order
	 */
	async getOrder(request: FinGetOrderRequest): Promise<FinGetOrderResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Get orders
	 */
	async getOrders(request: FinGetOrdersRequest): Promise<FinGetOrdersResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Create order
	 */
	async createOrder(request: FinCreateOrderRequest): Promise<FinCreateOrderResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Create orders
	 */
	async createOrders(request: FinCreateOrdersRequest): Promise<FinCreateOrdersResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Cancel order
	 */
	async cancelOrder(request: FinCancelOrderRequest): Promise<FinCancelOrderResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Cancel orders
	 */
	async cancelOrders(request: FinCancelOrdersRequest): Promise<FinCancelOrdersResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Withdraw from market
	 */
	async withdrawFromMarket(request: FinWithdrawRequest): Promise<FinWithdrawResponse> {
		throw new Error("Not implemented");
	}
}
