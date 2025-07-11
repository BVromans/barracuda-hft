import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Integer, Market, MarketAddress, MarketName, OrderBook, OrderBookMiddlePrice, OrderBookOrder, SystemStatus, Token, TokenAddress, TokenSymbol, Transaction, TransactionHash } from "./types";

/**
 * Get status request
 */
export interface FinGetStatusRequest {}

/**
 * Get status response
 */
export interface FinGetStatusResponse {
	/**
	 * System status
	 */
	status: SystemStatus;
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
export interface FinGetTokenResponse extends Token {}

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
export interface FinGetMarketRequest {}

/**
 * Get market response
 */
export interface FinGetMarketResponse {}

/**
 * Get markets request
 */
export interface FinGetMarketsRequest {}

/**
 * Get markets response
 */
export interface FinGetMarketsResponse {}

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
	marketName?: MarketName;

	/**
	 * Limit
	 */
	limit?: Integer;
}

/**
 * Get order book response
 */
export interface FinGetOrderBookResponse extends OrderBook {}

export interface FinGetTickerRequest {}

export interface FinGetTickerResponse {}

export interface FinGetBalancesRequest {}

export interface FinGetBalancesResponse {}

export interface FinGetTransactionRequest {
	hash: TransactionHash;
}

export interface FinGetTransactionResponse extends Transaction {}

export interface FinGetOrderRequest {}

export interface FinGetOrderResponse {}

export interface FinGetOrdersRequest {}

export interface FinGetOrdersResponse {}

export interface FinCreateOrderRequest {}

export interface FinCreateOrderResponse {}

export interface FinCreateOrdersRequest {}

export interface FinCreateOrdersResponse {}

export interface FinCancelOrderRequest {}

export interface FinCancelOrderResponse {}

export interface FinCancelOrdersRequest {}

export interface FinCancelOrdersResponse {}

export interface FinWithdrawRequest {}

export interface FinWithdrawResponse {}

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
	private marketsByName: Map<MarketName, Market>;

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
		throw new Error("Not implemented");
	}

	/**
	 * Get transaction
	 */
	async getTransaction(request: FinGetTransactionRequest): Promise<FinGetTransactionResponse> {
		throw new Error("Not implemented");
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
		if (!request.marketAddress && !request.marketName) {
			throw new Error("Either market address or market name must be provided");
		}

		if (request.marketName && !request.marketAddress) {
			request.marketAddress = this.marketsByName.get(request.marketName)?.address;
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
