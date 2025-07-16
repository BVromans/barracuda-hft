import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import cacheManager, { Cacheable, CacheManagerOptions } from "@type-cacheable/core";
import { useAdapter } from "@type-cacheable/lru-cache-adapter";
import { LRUCache } from 'lru-cache';
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
	FinWithdrawResponse,
	RujiraConstructorOptions,
	RujiraInitializeOptions,
	FinConstructorOptions,
	FinInitializeOptions,
	FinGetAllTokensRequest,
	FinGetAllTokensResponse,
	FinGetAllMarketsRequest,
	FinGetAllMarketsResponse,
	RPCEndpoint,
	WalletMnemonic
} from "./types";
import { GasPrice } from "@cosmjs/stargate";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";

/**
 * LRU cache
 */
const lruCache = new LRUCache<string, any>({
	max: 999999,
	ttl: 1000* 60 * 60 * 24 * 365,
});

/**
 * Cache adapter
 */
const cacheAdapter = useAdapter(lruCache);

// Set cache manager options globally
cacheManager.setOptions(<CacheManagerOptions>{
	adapter: cacheAdapter,
});

/**
 * Default wallet prefix
 */
const DEFAULT_WALLET_PREFIX = 'thor';

/**
 * Default gas price
 */
const DEFAULT_GAS_PRICE = GasPrice.fromString('0.02rune');

/**
 * Rujira client
 */
export class Rujira {
	/**
	 * Fin client
	 */
	private readonly fin: Fin;

	/**
	 * RPC endpoint
	 */
	private readonly rpcEndpoint: RPCEndpoint;

	/**
	 * Wallet mnemonic
	 */
	private readonly walletMnemonic: WalletMnemonic;

	/**
	 * Wallet
	 */
	private wallet: DirectSecp256k1Wallet;

	/**
	 * Cosm client
	 */
	private cosmClient: SigningCosmWasmClient;


	/**
	 * Constructor
	 */
	constructor(options: RujiraConstructorOptions) {
		this.rpcEndpoint = options.rpcEndpoint;
		this.walletMnemonic = options.walletMnemonic;

		this.cosmClient = undefined as unknown as SigningCosmWasmClient;
		this.wallet = undefined as unknown as DirectSecp256k1Wallet;

		this.fin = new Fin(options as FinConstructorOptions);
	}

	/**
	 * Initialize the client
	 */
	public async initialize(options: RujiraInitializeOptions) {
		this.wallet = await DirectSecp256k1Wallet.fromKey(
			fromBase64(this.walletMnemonic),
			DEFAULT_WALLET_PREFIX
		);
		
		this.cosmClient = await SigningCosmWasmClient.connectWithSigner(
			this.rpcEndpoint,
			this.wallet,
			{
				gasPrice: DEFAULT_GAS_PRICE
			}
		);
		
		await this.fin.initialize(
			{
				wallet: this.wallet,
				cosmClient: this.cosmClient
			} as FinInitializeOptions
		);
	}
}

/**
 * Fin client
 */
export class Fin {
	/**
	 * Wallet
	 */
	private wallet: DirectSecp256k1Wallet;

	/**
	 * Cosm client
	 */
	private cosmClient: SigningCosmWasmClient;

	/**
	 * Tokens by address
	 */
	private tokensByAddress: Map<TokenAddress, Token>;

	/**
	 * Tokens by symbol
	 */
	private tokensBySymbol: Map<TokenSymbol, Token>;

	/**
	 * Markets by address
	 */
	private marketsByAddress: Map<MarketAddress, Market>;

	/**
	 * Markets by name
	 */
	private marketsBySymbol: Map<MarketSymbol, Market>;

	/**
	 * Constructor
	 */
	constructor(options: FinConstructorOptions) {
		this.wallet = undefined as unknown as DirectSecp256k1Wallet;
		this.cosmClient = undefined as unknown as SigningCosmWasmClient;
		
		this.tokensByAddress = new Map();
		this.tokensBySymbol = new Map();
		this.marketsByAddress = new Map();
		this.marketsBySymbol = new Map();
	}

	/**
	 * Initialize the client
	 */
	async initialize(options: FinInitializeOptions): Promise<void> {
		this.wallet = options.wallet;
		this.cosmClient = options.cosmClient;

		await this.getAllTokens({} as FinGetAllTokensRequest);
		await this.getAllMarkets({} as FinGetAllMarketsRequest);
	}

	/**
	 * Get status
	 */
	async getStatus(request: FinGetBalancesRequest): Promise<FinGetStatusResponse> {
		try {
			// Check if client is initialized and can connect
			if (!this.cosmClient) {
				return {
					error: 'Client not initialized. Please call initialize() first.',
					status: SystemStatus.DOWN
				} as FinGetStatusResponse;
			}

			// Try to get chain height to verify connection
			await this.cosmClient.getHeight();

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
		if (!request.hash) {
			throw new Error("Transaction hash is required");
		}

		try {
			// Get transaction details from the blockchain
			const transaction = await this.cosmClient.getTx(request.hash);

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

		const tokens = await this.getTokens({
			addresses: request.address ? [request.address] : undefined,
			symbols: request.symbol ? [request.symbol] : undefined
		});

		if (tokens.size === 0) {
			throw new Error(`Token ${request.address || request.symbol} not found`);
		}

		return tokens.values().next().value as FinGetTokenResponse;
	}

	/**
	 * Get tokens
	 */
	async getTokens(request: FinGetTokensRequest): Promise<FinGetTokensResponse> {
		if (request.addresses) {
			request.addresses = request.addresses.map((address) => address.toLowerCase().trim());
		}

		if (request.symbols) {
			request.symbols = request.symbols.map((symbol) => symbol.toLowerCase().trim());
		}

		if (!request.addresses && !request.symbols) {
			return this.getAllTokens({} as FinGetAllTokensRequest);
		}

		await this.getAllTokens({} as FinGetAllTokensRequest);

		const tokens = new Map<TokenAddress, Token>();

		for (const address of request?.addresses || []) {
			const token = this.tokensByAddress.get(address);
			if (token) {
				tokens.set(address, token);
			} else {
				throw new Error(`Token ${address} not found`);
			}
		}

		for (const symbol of request?.symbols || []) {
			const token = this.tokensBySymbol.get(symbol);
			if (token) {
				tokens.set(token.address, token);
			} else {
				throw new Error(`Token ${symbol} not found`);
			}
		}

		return tokens;
	}

	/**
	 * Get all tokens
	 */
	@Cacheable({
		cacheKey: (request: FinGetAllTokensRequest) => request.toString(),
		ttlSeconds: 60 * 60 * 6,
	})
	async getAllTokens(request: FinGetAllTokensRequest): Promise<FinGetAllTokensResponse> {
		// for (const token of tokens.values()) {
		// 	this.tokensByAddress.set(token.address, token);
		// 	this.tokensBySymbol.set(token.symbol, token);
		// }

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
	 * Get all markets
	 */
	@Cacheable({
		cacheKey: (request: FinGetAllMarketsRequest) => request.toString(),
		ttlSeconds: 60 * 60 * 6,
	})
	async getAllMarkets(request: FinGetAllMarketsRequest): Promise<FinGetAllMarketsResponse> {
		// for (const market of markets.values()) {
		// 	this.marketsByAddress.set(market.address, market);
		// 	this.marketsBySymbol.set(market.symbol, market);
		// }

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
			request.marketAddress = this.marketsBySymbol.get(request.marketSymbol)?.address;
		}

		if (!request.marketAddress) {
			throw new Error("Market address must be provided");
		}

		const market = await this.getMarket({
			address: request.marketAddress
		});

		const rawOrderBook = await this.cosmClient.queryContractSmart(request.marketAddress, {
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
function fromBase64(arg0: string): Uint8Array<ArrayBufferLike> {
	throw new Error("Function not implemented.");
}

