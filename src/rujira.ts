import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import {
	Market,
	MarketAddress,
	MarketSymbol,
	OrderBook,
	OrderBookMiddlePrice,
	OrderBookOrder,
	SystemStatus,
	Token,
	TokenAddress,
	TokenDecimals,
	TokenSymbol,
	TransactionStatus,
	FinCancelOrderRequest,
	FinCancelOrderResponse,
	FinCancelOrdersRequest,
	FinCancelOrdersResponse,
	FinCreateOrderRequest,
	FinCreateOrderResponse,
	FinCreateOrdersRequest,
	FinCreateOrdersResponse,
	FinGetBalancesRequest,
	FinGetBalancesResponse,
	FinGetMarketRequest,
	FinGetMarketResponse,
	FinGetMarketsRequest,
	FinGetMarketsResponse,
	FinGetOrderBookRequest,
	FinGetOrderBookResponse,
	FinGetOrderRequest,
	FinGetOrderResponse,
	FinGetOrdersRequest,
	FinGetOrdersResponse,
	FinGetStatusResponse,
	FinGetTickerRequest,
	FinGetTickerResponse,
	FinGetTokenRequest,
	FinGetTokenResponse,
	FinGetTokensRequest,
	FinGetTokensResponse,
	FinGetTransactionRequest,
	FinGetTransactionResponse,
	FinWithdrawRequest,
	FinWithdrawResponse
} from "./types";

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
	async getStatus(request: FinGetBalancesRequest): Promise<FinGetStatusResponse> {
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
		if (request.address) {
			request.address = request.address.toLowerCase().trim();
		}

		if (request.symbol) {
			request.symbol = request.symbol.toLowerCase().trim();
		}

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

		const market = await this.getMarket({
			address: request.marketAddress
		});

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
