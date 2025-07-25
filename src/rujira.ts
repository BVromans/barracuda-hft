import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { stringToPath, Bip39, EnglishMnemonic, Slip10, Slip10Curve } from "@cosmjs/crypto";
import { fromBase64 } from "@cosmjs/encoding";
import cacheManager, { Cacheable, CacheManagerOptions } from "@type-cacheable/core";
import { useAdapter } from "@type-cacheable/lru-cache-adapter";
import { LRUCache } from 'lru-cache';
import {
	Market,
	MarketAddress,
	MarketSymbol,
	MarketStatus,
	OrderBook,
	OrderBookMiddlePrice,
	OrderBookOrder,
	SystemStatus,
	Token,
	TokenAddress,
	TokenSymbol,
	Transaction,
	TransactionStatus,
	FinCancelOrderRequest,
	FinCancelOrderResponse,
	FinCancelOrdersRequest,
	FinCancelOrdersResponse,
	FinPlaceOrderRequest,
	FinPlaceOrderResponse,
	FinPlaceOrdersRequest,
	FinPlaceOrdersResponse,
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
	URL,
	FinConstructorOptions,
	FinInitializeOptions,
	FinGetAllTokensRequest,
	FinGetAllTokensResponse,
	FinGetAllMarketsRequest,
	FinGetAllMarketsResponse,
	WalletMnemonic,
	WalletPrivateKey,
	FinGetStatusRequest,
	OrderStatus,
	TokenBalance,
	BaseBalance,
	BaseBalanceWithQuotation,
	BaseTokenBalance,
	Balances,
	Wallet,
	Order,
	OrderType,
	Map,
	List,
	Ticker,
	FinReplaceOrderRequest,
	FinReplaceOrderResponse,
	FinReplaceOrdersRequest,
	FinReplaceOrdersResponse,
	FinGetCandlesRequest,
	FinGetCandlesResponse,
	CandleInterval,
	Candle,
	Amount,
	Integer,
	DECIMAL_0,
	DECIMAL_INFINITY,
} from "./types";
import Decimal from 'decimal.js';
import { properties } from "./properties";
import { GasPrice } from "@cosmjs/stargate";
import { getNotNullOrThrowError, runWithRetryAndTimeout } from "./utils";

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
 * Rujira client
 */
export class Rujira {
	/**
	 * Fin client
	 */
	public readonly fin: Fin;

	/**
	 * Wallet
	 */
	public wallet: Wallet;

	/**
	 * Wallet private key
	 */
	private readonly walletPrivateKey?: WalletPrivateKey;

	/**
	 * Wallet mnemonic
	 */
	private readonly walletMnemonic?: WalletMnemonic;

	/**
	 * Cosm client
	 */
	private cosmClient: SigningCosmWasmClient;

	/**
	 * Constructor
	 */
	constructor(options: RujiraConstructorOptions) {
		this.walletMnemonic = options.walletMnemonic;
		this.walletPrivateKey = options.walletPrivateKey;

		if (!this.walletMnemonic && !this.walletPrivateKey) {
			throw new Error('No wallet credentials provided. Please provide either a mnemonic or a private key');
		}

		this.wallet = undefined as unknown as Wallet;

		this.cosmClient = undefined as unknown as SigningCosmWasmClient;

		this.fin = new Fin({
		} as FinConstructorOptions);
	}

	/**
	 * Initialize the client
	 */
	public async initialize(_options: RujiraInitializeOptions) {
		if (this.walletMnemonic) {
			this.wallet = await this.createWalletFromMnemonic(this.walletMnemonic);
		} else if (this.walletPrivateKey) {
			this.wallet = await this.createWalletFromPrivateKey(this.walletPrivateKey);
		} else {
			throw new Error('No wallet credentials provided. Please provide either a mnemonic or a private key');
		}

		this.cosmClient = await SigningCosmWasmClient.connectWithSigner(
			properties.getAs<URL>('rujira.endpoints.rpc'),
			this.wallet,
			{
				gasPrice: properties.getAs<GasPrice>('rujira.gasPrice')
			}
		);

		await this.fin.initialize(
			{
				wallet: this.wallet,
				cosmClient: this.cosmClient
			} as FinInitializeOptions
		);
	}

	/**
	 * Derive wallet private key from mnemonic
	 * @param mnemonic - The mnemonic to derive the private key from
	 * @returns The private key
	 */
	private async deriveWalletPrivateKeyFromMnemonic(mnemonic: string): Promise<string> {
		const englishMnemonic = new EnglishMnemonic(mnemonic);
		const seed = await Bip39.mnemonicToSeed(englishMnemonic);

		// Derive the private key using the THORChain HD path
		const hdPath = stringToPath("m/44'/931'/0'/0/0");
		const { privkey } = Slip10.derivePath(Slip10Curve.Secp256k1, seed, hdPath);

		// Convert to base64
		const base64PrivateKey = Buffer.from(privkey).toString('base64');

		return base64PrivateKey;
	}

	/**
	 * Create wallet from private key
	 * @param privateKey - The private key to create the wallet from
	 * @returns The wallet
	 */
	private async createWalletFromPrivateKey(privateKey: string): Promise<Wallet> {
		return await DirectSecp256k1Wallet.fromKey(
			fromBase64(privateKey),
			properties.getAs<string>('wallet.prefix')
		);
	}

	/**
	 * Create wallet from mnemonic
	 * @param mnemonic - The mnemonic to create the wallet from
	 * @returns The wallet
	 */
	private async createWalletFromMnemonic(mnemonic: string): Promise<Wallet> {
		const privateKey = await this.deriveWalletPrivateKeyFromMnemonic(mnemonic);

		return await this.createWalletFromPrivateKey(privateKey);
	}
}

/**
 * Fin client
 */
export class Fin {
	/**
	 * Wallet
	 */
	private wallet: Wallet;

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
	 * @param options - The constructor options
	 */
	constructor(options: FinConstructorOptions) {
		this.wallet = undefined as unknown as Wallet;
		this.cosmClient = undefined as unknown as SigningCosmWasmClient;

		this.tokensByAddress = Map<TokenAddress, Token>();
		this.tokensBySymbol = Map<TokenSymbol, Token>();
		this.marketsByAddress = Map<MarketAddress, Market>();
		this.marketsBySymbol = Map<MarketSymbol, Market>();
	}

	/**
	 * Initialize the client
	 * @param options - The initialize options
	 */
	async initialize(options: FinInitializeOptions): Promise<void> {
		this.wallet = options.wallet;
		this.cosmClient = options.cosmClient;

		await this.getAllTokens({} as FinGetAllTokensRequest);
		await this.getAllMarkets({} as FinGetAllMarketsRequest);
	}

	/**
	 * Get status
	 * @param request - The request object
	 * @returns The status response
	 */
	async getStatus(_request: FinGetStatusRequest): Promise<FinGetStatusResponse> {
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
	 * Get transaction details by hash
	 * @param request - The request object
	 * @returns The transaction response
	 */
	@runWithRetryAndTimeout({})
	async getTransaction(request: FinGetTransactionRequest): Promise<FinGetTransactionResponse> {
		let { hash, waitForConfirmation } = request;

		if (!hash?.trim()) {
			throw new Error("Transaction hash is required and cannot be empty");
		}

		hash = hash.trim();

		let transaction = await this.cosmClient.getTx(hash);

		if (!transaction) {
			throw new Error(`Transaction not found: ${hash}`);
		}

		let status;
		if (transaction.code === 0) {
			status = TransactionStatus.SUCCESS;
		} else if (transaction.code === 1) {
			status = TransactionStatus.FAILED;
		} else {
			status = TransactionStatus.PENDING;
		}

		if (waitForConfirmation && status === TransactionStatus.PENDING) {
			throw new Error(`Transaction is still pending: ${hash}`);
		}

		return {
			hash: transaction.hash,
			status: status,
			fee: {
				amount: transaction.gasUsed ? Decimal(transaction.gasUsed.toString()) : Decimal(0),
				token: properties.getAs<Token>('rujira.tokens.feePayment'),
			},
			raw: transaction
		};
	}

	/**
	 * Get token by address or symbol
	 * @param request - The request object
	 * @returns The token response
	 */
	async getToken(request: FinGetTokenRequest): Promise<FinGetTokenResponse> {
		await this.getAllTokens({} as FinGetAllTokensRequest);

		let { address, symbol } = request;

		address = address?.toLowerCase().trim();
		symbol = symbol?.toLowerCase().trim();

		if (!address && !symbol) {
			throw new Error("You must provide a non-empty address or symbol");
		}

		if (address) {
			return this.tokensByAddress.getOrThrow(address);
		} else if (symbol) {
			return this.tokensBySymbol.getOrThrow(symbol);
		}

		throw new Error(`Token not found: ${address || symbol}`);
	}

	/**
	 * Get multiple tokens by addresses and/or symbols
	 * @param request - The request object
	 * @returns The tokens response
	 */
	async getTokens(request: FinGetTokensRequest): Promise<FinGetTokensResponse> {
		await this.getAllTokens({} as FinGetAllTokensRequest);

		let { addresses, symbols } = request;

		if (addresses) {
			if (Array.isArray(addresses)) {
				addresses = List<TokenAddress>(addresses);
			}

			addresses = addresses
				.map((address: TokenAddress) => address?.toLowerCase().trim())
				.filter((address: TokenAddress) => address);
		}

		if (symbols) {
			if (Array.isArray(symbols)) {
				symbols = List<TokenSymbol>(symbols);
			}

			symbols = symbols
				.map((symbol: TokenSymbol) => symbol?.toLowerCase().trim())
				.filter((symbol: TokenSymbol) => symbol);
		}

		if (!addresses?.size && !symbols?.size) {
			throw new Error("You must provide at least one non-empty address or symbol");
		}

		addresses = getNotNullOrThrowError<List<TokenAddress>>(addresses);
		symbols = getNotNullOrThrowError<List<TokenSymbol>>(symbols);

		const tokens = Map<TokenAddress, Token>();

		addresses.forEach((address: TokenAddress) => {
			const token = this.tokensByAddress.getOrThrow(address);
			if (!token) throw new Error(`Token not found: ${address}`);
			tokens.set(token.address, token);
		});

		symbols.forEach((symbol: TokenSymbol) => {
			const token = this.tokensBySymbol.getOrThrow(symbol);
			if (!token) throw new Error(`Token not found: ${symbol}`);
			tokens.set(token.address, token);
		});

		return tokens;
	}

	/**
	 * Get all tokens
	 * @param request - The request object
	 * @returns The tokens response
	 */
	@Cacheable({
		cacheKey: (request: FinGetAllTokensRequest) => request.toString(),
		ttlSeconds: properties.getAs<number>('cache.rujira.fin.getAllTokens'),
	})
	async getAllTokens(_request: FinGetAllTokensRequest): Promise<FinGetAllTokensResponse> {
		// Get all markets first (this already contains all token data)
		const markets = await this.getAllMarkets({} as FinGetAllMarketsRequest);

		const tokens = Map<TokenAddress, Token>();

		// Extract all unique tokens from the markets
		for (const market of markets.values()) {
			// Add base token if not already added
			if (!tokens.has(market.tokens.base.address)) {
				tokens.set(market.tokens.base.address, market.tokens.base);
			}

			// Add quote token if not already added
			if (!tokens.has(market.tokens.quote.address)) {
				tokens.set(market.tokens.quote.address, market.tokens.quote);
			}
		}

		// Update internal maps
		for (const token of tokens.values()) {
			this.tokensByAddress.set(token.address.toLowerCase(), token);
			this.tokensBySymbol.set(token.symbol.toLowerCase(), token);
		}

		return tokens;
	}

	/**
	 * Get market by address or symbol
	 * @param request - The request object
	 * @returns The market response
	 */
	async getMarket(request: FinGetMarketRequest): Promise<FinGetMarketResponse> {
		await this.getAllMarkets({} as FinGetAllMarketsRequest);

		let { address, symbol } = request;

		address = address?.trim();
		symbol = symbol?.trim();

		if (!address && !symbol) {
			throw new Error("You must provide a non-empty address or symbol");
		}

		if (address) {
			return this.marketsByAddress.getOrThrow(address);
		} else if (symbol) {
			return this.marketsBySymbol.getOrThrow(symbol);
		}

		throw new Error(`Market not found: ${address || symbol}`);
	}

	/**
	 * Get multiple markets by addresses and/or symbols
	 * @param request - The request object
	 * @returns The markets response
	 */
	async getMarkets(request: FinGetMarketsRequest): Promise<FinGetMarketsResponse> {
		await this.getAllMarkets({} as FinGetAllMarketsRequest);

		let { addresses, symbols } = request;

		if (addresses) {
			if (Array.isArray(addresses)) {
				addresses = List<MarketAddress>(addresses);
			}

			addresses = addresses
				.map((address: MarketAddress) => address?.toLowerCase().trim())
				.filter((address: MarketAddress) => address);
		}

		if (symbols) {
			if (Array.isArray(symbols)) {
				symbols = List<MarketSymbol>(symbols);
			}

			symbols = symbols
				.map((symbol: MarketSymbol) => symbol?.toLowerCase().trim())
				.filter((symbol: MarketSymbol) => symbol);
		}

		if (!addresses?.size && !symbols?.size) {
			throw new Error("You must provide at least one non-empty address or symbol");
		}

		addresses = getNotNullOrThrowError<List<MarketAddress>>(addresses);
		symbols = getNotNullOrThrowError<List<MarketSymbol>>(symbols);

		const markets = Map<MarketAddress, Market>();

		addresses.forEach((address: MarketAddress) => {
			const market = this.marketsByAddress.getOrThrow(address);
			if (!market) throw new Error(`Market not found: ${address}`);
			markets.set(address, market);
		});

		symbols.forEach((symbol: MarketSymbol) => {
			const market = this.marketsBySymbol.getOrThrow(symbol);
			if (!market) throw new Error(`Market not found: ${symbol}`);
			markets.set(market.address, market);
		});

		return markets;
	}

	/**
	 * Get all markets
	 * @param request - The request object
	 * @returns The markets response
	 */
	@Cacheable({
		cacheKey: (request: FinGetAllMarketsRequest) => request.toString(),
		ttlSeconds: properties.getAs<number>('cache.rujira.fin.getAllMarkets'),
	})
	async getAllMarkets(_request: FinGetAllMarketsRequest): Promise<FinGetAllMarketsResponse> {
		const graphQLEndPoint = properties.getAs<URL>('rujira.endpoints.graphql');

		const marketsQuery = `
			query {
				rujira {
					fin {
						id
						address
						tick
						feeTaker
						feeMaker
						feeAddress
						deploymentStatus

						# Asset Base
						assetBase {
							id
							asset
							type
							chain
							metadata {
								symbol
								name
								decimals
								description
								display
							}
							price {
								current
								changeDay
								mcap
								timestamp
							}
							variants {
								layer1 { asset }
								secured { asset }
								native { denom }
							}
						}

						# Asset Quote
						assetQuote {
							id
							asset
							type
							chain
							metadata {
								symbol
								name
								decimals
								description
								display
							}
							price {
								current
								changeDay
								mcap
								timestamp
							}
							variants {
								layer1 { asset }
								secured { asset }
								native { denom }
							}
						}

						# Oracles
						oracleBase {
							id
							asset {
								asset
								metadata { symbol name decimals }
							}
							price
						}
						oracleQuote {
							id
							asset {
								asset
								metadata { symbol name decimals }
							}
							price
						}
					}
				}
			}`;

		const response = await fetch(graphQLEndPoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: marketsQuery })
		});

		if (!response.ok) {
			throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
		}

		const json: any = await response.json();
		const { data, errors } = json;

		if (errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
		}

		const rawPairs = data?.rujira?.fin || [];
		const markets = Map<MarketAddress, Market>();

		for (const pair of rawPairs) {
			// Only include LIVE markets
			if (pair.deploymentStatus !== properties.getAs<string>('constant.rujira.enum.markets.active')) {
				continue;
			}

			// Create base token
			const baseToken: Token = {
				address: pair.assetBase.asset,
				symbol: pair.assetBase.metadata?.symbol || pair.assetBase.asset,
				name: pair.assetBase.metadata?.name || pair.assetBase.metadata?.symbol || pair.assetBase.asset,
				decimals: pair.assetBase.metadata?.decimals,
				raw: pair.assetBase
			};

			// Create quote token
			const quoteToken: Token = {
				address: pair.assetQuote.asset,
				symbol: pair.assetQuote.metadata?.symbol || pair.assetQuote.asset,
				name: pair.assetQuote.metadata?.name || pair.assetQuote.metadata?.symbol || pair.assetQuote.asset,
				decimals: pair.assetQuote.metadata?.decimals,
				raw: pair.assetQuote
			};

			// Create market symbol
			const marketSymbol = `${baseToken.symbol}/${quoteToken.symbol}`;

			// Create market object
			const market: Market = {
				address: pair.address,
				symbol: marketSymbol,
				tokens: {
					base: baseToken,
					quote: quoteToken
				},
				decimals: pair.tick, // Use tick as decimals
				status: MarketStatus.ACTIVE, // LIVE markets are active
				raw: pair
			};

			markets.set(pair.address, market);
		}

		// Update internal maps
		for (const market of markets.values()) {
			this.marketsByAddress.set(market.address.toLowerCase(), market);
			this.marketsBySymbol.set(market.symbol.toLowerCase(), market);
		}

		return markets;
	}

	/**
	 * Get order book (always fetches latest from CosmWasm contract)
	 * @param request - The request object
	 * @returns The order book response
	 */
	async getOrderBook(request: FinGetOrderBookRequest): Promise<FinGetOrderBookResponse> {
		let { marketAddress, marketSymbol, maximumNumberOfOrders } = request;

		marketAddress = marketAddress?.toLowerCase().trim();
		marketSymbol = marketSymbol?.toLowerCase().trim();
		maximumNumberOfOrders = maximumNumberOfOrders || properties.getAs<number>('rujira.default.orderBook.maximumNumberOfOrders') || DECIMAL_INFINITY.toNumber();

		if (!marketAddress && !marketSymbol) {
			throw new Error("Either market address or market name must be provided");
		}

		const market: Market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });

		// Always fetch the latest orderbook from the contract
		const rawOrderBook = await this.cosmClient.queryContractSmart(
			market.address,
			{
				order_book: {
					limit: maximumNumberOfOrders
				}
			}
		);

		const parseOrder = (entry: any): OrderBookOrder => ({
			orderId: entry.id,
			price: new Decimal(entry.price),
			amount: new Decimal(entry.total),
			raw: entry
		});

		let asks: List<OrderBookOrder> = List<OrderBookOrder>(rawOrderBook.asks || []).map(parseOrder);
		let bids: List<OrderBookOrder> = List<OrderBookOrder>(rawOrderBook.bids || []).map(parseOrder);

		asks = maximumNumberOfOrders ? asks.slice(0, maximumNumberOfOrders) : asks;
		bids = maximumNumberOfOrders ? bids.slice(0, maximumNumberOfOrders) : bids;

		const bestAsk: OrderBookOrder = asks.size > 0 ? asks.getOrThrow(0) : undefined as unknown as OrderBookOrder;
		const bestBid: OrderBookOrder = bids.size > 0 ? bids.getOrThrow(0) : undefined as unknown as OrderBookOrder;

		let middlePrice: OrderBookMiddlePrice | undefined;
		if (asks.size > 0 && bids.size > 0) {
			middlePrice = bestAsk.price.plus(bestBid.price).div(2);
		} else if (asks.size > 0 && !bids.size) {
			middlePrice = bestAsk.price;
		} else if (!asks.size && bids.size) {
			middlePrice = bestBid.price;
		}

		const orderBook: OrderBook = {
			market,
			book: {
				asks,
				bids,
				bestAsk,
				bestBid,
				middlePrice
			},
			raw: rawOrderBook
		};

		return orderBook;
	}

	/**
	 * Get ticker
	 * @param request - The request object
	 * @returns The ticker response
	 */
	async getTicker(request: FinGetTickerRequest): Promise<FinGetTickerResponse> {
		let { marketAddress, marketSymbol } = request;

		marketAddress = marketAddress?.toLowerCase().trim();
		marketSymbol = marketSymbol?.toLowerCase().trim();

		if (!marketAddress && !marketSymbol) {
			throw new Error("Either market address or market name must be provided");
		}

		const market: Market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });

		// TODO: Check this query!!!
		const rawTicker = await this.cosmClient.queryContractSmart(
			market.address,
			{
				ticker: {}
			}
		);

		const ticker: Ticker = {
			market,
			price: rawTicker.price,
			timestamp: rawTicker.timestamp,
			raw: rawTicker
		};

		return ticker;
	}

	/**
	 * Get candles
	 * @param request - The request object
	 * @returns The candles response
	 */
	async getCandles(request: FinGetCandlesRequest): Promise<FinGetCandlesResponse> {
		let { marketAddress, marketSymbol, maximumNumberOfCandles, interval } = request;

		marketAddress = marketAddress?.toLowerCase().trim();
		marketSymbol = marketSymbol?.toLowerCase().trim();
		maximumNumberOfCandles = maximumNumberOfCandles || properties.getAs<number>('rujira.default.candles.maximumNumberOfCandles') || DECIMAL_INFINITY.toNumber();
		interval = interval || properties.getAs<CandleInterval>('rujira.default.candles.interval') || '1m';

		if (!marketAddress && !marketSymbol) {
			throw new Error("Either market address or market name must be provided");
		}

		const market: Market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });

		// TODO: Check this query!!!
		const rawCandles = await this.cosmClient.queryContractSmart(
			market.address,
			{
				candles: { interval, limit: maximumNumberOfCandles }
			}
		);

		const parseCandle = (entry: any): Candle => ({
			timestamp: entry.timestamp,
			open: entry.open,
			high: entry.high,
			low: entry.low,
			close: entry.close,
			volume: entry.volume,
			raw: entry
		});

		// noinspection UnnecessaryLocalVariableJS
		const candles: List<Candle> = List<Candle>(rawCandles.candles || []).map(parseCandle);

		return candles;
	}

	/**
	 * Get balances for a wallet (free, locked in orders, withdrawable, totals)
	 * @param request - The request object
	 * @returns The balances response
	 */
	async getBalances(request: FinGetBalancesRequest): Promise<FinGetBalancesResponse> {
		let { walletAddress, tokenAddresses, tokenSymbols } = request;

		walletAddress = walletAddress?.toLowerCase().trim();
		tokenAddresses = tokenAddresses?.map((address: TokenAddress) => address.toLowerCase().trim());
		tokenSymbols = tokenSymbols?.map((symbol: TokenSymbol) => symbol.toLowerCase().trim());

		if (!walletAddress) throw new Error('walletAddress is required');

		if (Array.isArray(tokenAddresses)) {
			tokenAddresses = List<TokenAddress>(tokenAddresses);
		}
		if (Array.isArray(tokenSymbols)) {
			tokenSymbols = List<TokenSymbol>(tokenSymbols);
		}

		let tokens = await this.getAllTokens({} as FinGetAllTokensRequest);
		let markets = await this.getAllMarkets({} as FinGetAllMarketsRequest);

		if (tokenAddresses || tokenSymbols) {
			tokens = tokens.filter((token: Token) => tokenAddresses?.includes(token.address) || tokenSymbols?.includes(token.symbol));
		}

		const freeBalances = Map<TokenAddress, Amount>();
		const freeBalanceResponse = await fetch(`${properties.getAs<string>('rujira.endpoints.rest')}/cosmos/bank/v1beta1/balances/${walletAddress}`);
		if (freeBalanceResponse.ok) {
			/*
			Example response:
				{
					"balances": [
						{
							"denom": "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
							"amount": "90505921"
						}
					],
					"pagination": {
						"next_key": null,
						"total": "6"
					}
				}
			*/
			const freeBalanceResponseData = (await freeBalanceResponse.json()) as {
				balances: Array<{
					denom: string;
					amount: string;
				}>;
				pagination: {
					next_key: string | null;
					total: string;
				};
			};

			for (const rawBalance of freeBalanceResponseData.balances) {
				freeBalances.set(rawBalance.denom.toLowerCase().trim(), new Decimal(rawBalance.amount));
			}
		}

		const lockedInOrdersMap = Map<TokenAddress, Amount>();
		const withdrawableMap = Map<TokenAddress, Amount>();

		for (const market of markets.values()) {
			/*
			Example response:
				{
					"orders": [
						{
							"owner": "thor1gsgx5xtw82r8qw06mrcxjzypuynqwjxcugk5fy",
							"side": "base",
							"price": {
								"fixed": "0.219169"
							},
							"rate": "0.219169",
							"updated_at": "1752680298782095574",
							"offer": "10000000",
							"remaining": "10000000",
							"filled": "0"
						}
					]
				}
			*/
			const ordersResponse = await this.cosmClient.queryContractSmart(
				market.address, {
					orders: {
						owner: walletAddress,
						limit: properties.getOrDefault<Integer>('rujira.default.orders.maximumNumberOfOrders', DECIMAL_INFINITY.toNumber())
					}
				}
			) as {
				orders: Array<{
					owner: string,
					"side": string,
					"price": {
						"fixed": string
					},
					"rate": string,
					"updated_at": string,
					"offer": string,
					"remaining": string,
					"filled": string
				}>;
			};

			for (const rawOrder of ordersResponse.orders) {
				const baseTokenAddress = market.tokens.base.address;
				const quoteTokenAddress = market.tokens.quote.address;

				if (rawOrder.filled && Number(rawOrder.filled) > 0) {
					const lockedTokenAddress = rawOrder.side === 'base' ? baseTokenAddress : quoteTokenAddress;
					lockedInOrdersMap.get(lockedTokenAddress, (lockedInOrdersMap.get(lockedTokenAddress) || DECIMAL_0).plus(new Decimal(rawOrder.filled)));
				}
				if (rawOrder.filled && Number(rawOrder.filled) === Number(rawOrder.offer)) {
					const withdrawTokenAddress = rawOrder.side === 'base' ? quoteTokenAddress : baseTokenAddress; // opposite asset
					withdrawableMap.set(withdrawTokenAddress, (withdrawableMap.get(withdrawTokenAddress) || DECIMAL_0).plus(new Decimal(rawOrder.filled)));
				}
			}
		}

		const tokensBalancesMap = Map<TokenAddress, TokenBalance>();
		for (const token of tokens.values()) {
			const free = freeBalances.get(token.address, DECIMAL_0);
			const locked = lockedInOrdersMap.get(token.address, DECIMAL_0);
			const withdraw = withdrawableMap.get(token.address, DECIMAL_0);
			const lockedInPools = new Decimal(0); // Not implemented
			const total = free.plus(locked).plus(lockedInPools).plus(withdraw);

			const baseBalance: BaseBalance = {
				free,
				lockedInOrders: locked,
				lockedInPools,
				withdrawable: withdraw,
				total
			};

			// Find native and beacon tokens
			const nativeTokenObject = tokens.find((tokenObj: Token) => tokenObj.symbol.toUpperCase() === 'RUNE');
			const beaconTokenObject = tokens.find((tokenObj: Token) => tokenObj.symbol.toUpperCase() === 'USDC');

			// Find market price for native (RUNE)
			let conversionRateNative = new Decimal(0);
			if (nativeTokenObject && token.address !== nativeTokenObject.address) {
				const market = Array.from(markets.values() as Iterable<Market>).find((market: Market) =>
					(market.tokens.base.address === token.address && market.tokens.quote.address === nativeTokenObject.address) ||
					(market.tokens.quote.address === token.address && market.tokens.base.address === nativeTokenObject.address)
				);
				if (market && market.price) {
					if (market.tokens.base.address === token.address) {
						conversionRateNative = market.price.baseQuote;
					} else {
						conversionRateNative = market.price.quoteBase;
					}
				}
			} else if (nativeTokenObject && token.address === nativeTokenObject.address) {
				conversionRateNative = new Decimal(1);
			}

			// Find market price for beacon (USDC)
			let conversionRateBeacon = new Decimal(0);
			if (beaconTokenObject && token.address !== beaconTokenObject.address) {
				const market = Array.from(markets.values() as Iterable<Market>).find((marketObj: Market) =>
					(marketObj.tokens.base.address === token.address && marketObj.tokens.quote.address === beaconTokenObject.address) ||
					(marketObj.tokens.quote.address === token.address && marketObj.tokens.base.address === beaconTokenObject.address)
				);
				if (market && market.price) {
					if (market.tokens.base.address === token.address) {
						conversionRateBeacon = market.price.baseQuote;
					} else {
						conversionRateBeacon = market.price.quoteBase;
					}
				}
			} else if (beaconTokenObject && token.address === beaconTokenObject.address) {
				conversionRateBeacon = new Decimal(1);
			}

			const baseBalanceWithNativeQuotation: BaseBalanceWithQuotation = {
				...baseBalance,
				quotation: {
					token: nativeTokenObject || token,
					tokenToQuote: conversionRateNative,
					quoteToToken: conversionRateNative ? new Decimal(1).div(conversionRateNative) : new Decimal(0)
				}
			};
			const baseBalanceWithBeaconQuotation: BaseBalanceWithQuotation = {
				...baseBalance,
				quotation: {
					token: beaconTokenObject || token,
					tokenToQuote: conversionRateBeacon,
					quoteToToken: conversionRateBeacon ? new Decimal(1).div(conversionRateBeacon) : new Decimal(0)
				}
			};

			const baseTokenBalance: BaseTokenBalance = {
				token: baseBalance,
				nativeToken: baseBalanceWithNativeQuotation,
				beaconToken: baseBalanceWithBeaconQuotation
			};

			tokensBalancesMap.set(token.address, {
				token,
				balances: baseTokenBalance
			});
		}

		// 6. Build total balances (nativeToken, beaconToken) dynamically
		const nativeToken = tokens.find((tokenObj: Token) => tokenObj.symbol.toUpperCase() === 'RUNE');
		const beaconToken = tokens.find((tokenObj: Token) => tokenObj.symbol.toUpperCase() === 'USDC');

		const totalNative: BaseBalance = nativeToken ? {
			free: freeBalances[nativeToken.address] || new Decimal(0),
			lockedInOrders: lockedInOrdersMap[nativeToken.address] || new Decimal(0),
			lockedInPools: new Decimal(0),
			withdrawable: new Decimal(0),
			total: (freeBalances[nativeToken.address] || new Decimal(0)).plus(lockedInOrdersMap[nativeToken.address] || new Decimal(0))
		} : {
			free: new Decimal(0),
			lockedInOrders: new Decimal(0),
			lockedInPools: new Decimal(0),
			withdrawable: new Decimal(0),
			total: new Decimal(0)
		};

		const totalBeacon: BaseBalance = beaconToken ? {
			free: freeBalances[beaconToken.address] || new Decimal(0),
			lockedInOrders: lockedInOrdersMap[beaconToken.address] || new Decimal(0),
			lockedInPools: new Decimal(0),
			withdrawable: new Decimal(0),
			total: (freeBalances[beaconToken.address] || new Decimal(0)).plus(lockedInOrdersMap[beaconToken.address] || new Decimal(0))
		} : {
			free: new Decimal(0),
			lockedInOrders: new Decimal(0),
			lockedInPools: new Decimal(0),
			withdrawable: new Decimal(0),
			total: new Decimal(0)
		};

		const balances: Balances = {
			tokens: tokensBalancesMap,
			total: {
				nativeToken: totalNative,
				beaconToken: totalBeacon
			}
		};

		return balances;
	}

	/**
	 * Get order
	 * @param request - The request object
	 * @returns The order response
	 */
	async getOrder(request: FinGetOrderRequest): Promise<FinGetOrderResponse> {
		// Validate request
		if (!request.ownerAddress) {
			throw new Error("Owner address is required");
		}
		if (!request.orderSide) {
			throw new Error("Order side is required");
		}
		if (!request.orderPrice) {
			throw new Error("Order price is required");
		}

		// Resolve market
		const market = await this.getMarket({
			address: request.marketAddress,
			symbol: request.marketSymbol
		});

		// Build query message for specific order
		const queryMsg = {
			order: [
				request.ownerAddress,
				request.orderSide,
				request.orderPrice
			]
		};

		try {
			const result = await this.cosmClient.queryContractSmart(market.address, queryMsg);
			return result as FinGetOrderResponse;
		} catch (error) {
			throw new Error(`Failed to get order: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get orders
	 * @param request - The request object
	 * @returns The orders response
	 */
	async getOrders(request: FinGetOrdersRequest): Promise<FinGetOrdersResponse> {
		// Validate request
		if (!request.ownerAddress) {
			throw new Error("Owner address is required");
		}

		// Resolve market if provided
		let contractAddress: string;
		if (request.marketAddress) {
			contractAddress = request.marketAddress;
		} else if (request.marketSymbol) {
			const market = await this.getMarket({ symbol: request.marketSymbol });
			contractAddress = market.address;
		} else {
			throw new Error("Either market address or market symbol must be provided");
		}

		// Build query message
		const queryMsg: any = {
			orders: {
				owner: request.ownerAddress,
				limit: request.maximumNumberOfOrders || 30
			}
		};

		// Add side filter if provided
		if (request.orderSide) {
			queryMsg.orders.side = request.orderSide;
		}

		try {
			const result = await this.cosmClient.queryContractSmart(contractAddress, queryMsg);
			return result as FinGetOrdersResponse;
		} catch (error) {
			throw new Error(`Failed to get orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}


	/**
	 * Place a single order (wrapper for createOrders)
	 * @param request - The request object
	 * @returns The response for the created order
	 */
async placeOrder(request: FinPlaceOrderRequest): Promise<FinPlaceOrderResponse> {
    // Basic validation
    if (!request.ownerAddress || (!request.marketAddress && !request.marketSymbol) || !request.side || !request.type || !request.amount) {
        console.error('[placeOrder] Missing required fields');
        throw new Error('Missing required fields');
    }

    const batchRequest: FinPlaceOrdersRequest = {
        ownerAddress: request.ownerAddress,
        orders: [request]
    };
    const response = await this.placeOrders(batchRequest);
    if (!response?.orders || response.orders.size === 0) {
        console.error('[placeOrder] No order was created');
        throw new Error('No order was created');
    }
    return (Array.from(response.orders.values()) as FinPlaceOrderResponse[])[0];
}


/**
 * Place multiple orders
 * @param request - The request object
 * @returns The response for the created orders or null if failed
 */
async placeOrders(request: FinPlaceOrdersRequest): Promise<FinPlaceOrdersResponse> {
    if (!request.orders?.length) {
        console.error('[placeOrders] No orders provided');
        throw new Error('No orders provided');
    }

    const placedOrders: FinPlaceOrderRequest[] = [];
    const ordersArray = Array.isArray(request.orders)
  ? request.orders
  : (request.orders as any).toArray();

for (const order of ordersArray) {
        try {
            const result = await this.placeOrder(order);
            if (result) placedOrders.push(order);
            else console.error(`[placeOrders] Failed to place order for ${order.ownerAddress}`);
        } catch (err) {
            console.error(`[placeOrders] Error placing order for ${order.ownerAddress}:`, err);
        }
    }
    if (!placedOrders.length) {
        console.error('[placeOrders] No orders were successfully placed');
        throw new Error('No orders were successfully placed');
    }

    // Fetch the latest orders for the user to build the response
    const allOrders: Map<string, Order> = Map();
    for (const order of placedOrders) {
        try {
            const ordersResp = await this.getOrders({
                ownerAddress: order.ownerAddress || '',
                marketAddress: order.marketAddress,
                marketSymbol: order.marketSymbol,
                maximumNumberOfOrders: 50
            });
            const matched =  Array.from(ordersResp.values()).find((o: any) => {
                if (order.type === 'limit' && order.price)
                    return o.side === (order.side === 'buy' ? 'quote' : 'base') && o.price.fixed === order.price.toString();
                return o.side === (order.side === 'buy' ? 'quote' : 'base');
            }) as any;
            if (matched) {
                allOrders.set(
                    matched.owner + '-' + matched.side + '-' + matched.price || matched.price.toString(),
                    {
                        id: matched.owner + '-' + matched.side + '-' + matched.price.toString(),
                        market: {} as Market,
                        owner: matched.owner,
                        type: matched.type || OrderType.LIMIT,
                        side: matched.side,
                        price: matched.price ? new Decimal(matched.price) : new Decimal(0),
                        amount: new Decimal(matched.amount),
                        filledAmount: new Decimal(0),
                        filledPercentage: new Decimal(0),
                        status: OrderStatus.OPEN,
                        raw: matched,
                    }
                );
            }
        } catch (err) {
            console.error('[placeOrders] Error fetching created orders:', err);
        }
    }

    //Don't have a way to get transaction hash directly, so return a dummy Transaction object
    return {
        orders: allOrders ,
        transactions: Map<string, Transaction>([
					[
							'',
							{
								hash: '',
								status: TransactionStatus.FAILED,
								fee: {
										amount: new Decimal(0),
										token: {
												address: 'native',
												symbol: 'RUJI',
												name: 'Rujira',
												decimals: 6,
												raw: {}
										}
								},
								raw: {}
							}
					]
			])
    };
}

/**
 * Replace order
 * @param request - The request object
 * @returns The response for the replaced order
 */
async replaceOrder(request: FinReplaceOrderRequest): Promise<FinReplaceOrderResponse> {
	throw new Error("Not implemented");
}

/**
 * Replace multiple orders
 * @param request - The request object
 * @returns The response for the replaced orders
 */
async replaceOrders(request: FinReplaceOrdersRequest): Promise<FinReplaceOrdersResponse> {
	throw new Error("Not implemented");
}

	/**
	 * Cancel order (calls cancelOrders with a single orderId)
	 * @param request - The request object
	 * @returns The response for the canceled order
	 */
	async cancelOrder(request: FinCancelOrderRequest): Promise<FinCancelOrderResponse> {
		const resp = await this.cancelOrders({
			ownerAddress: request.ownerAddress,
			marketAddress: request.marketAddress,
			marketSymbol: request.marketSymbol,
			orderIds: [request.orderId || ''],
			cancelAll: false
		});
		return {
			order: resp.orders.get(request.orderId || '') || {} as Order,
			status: resp.status,
			transaction: (Array.from(resp.transactions.values()) as Transaction[])[0]
		};
	}

	/**
	 * Cancel orders (only cancels the specified orderIds or orders)
	 * @param request - The request object
	 * @returns The response for the canceled orders
	 */
	async cancelOrders(request: FinCancelOrdersRequest): Promise<FinCancelOrdersResponse> {
		// 1. Get the market address
		const market = await this.getMarket({
			address: request.marketAddress,
			symbol: request.marketSymbol
		});
		const contractAddress = market.address;

		// 2. Query user orders
		const ordersResult = await this.cosmClient.queryContractSmart(contractAddress, {
			orders: { owner: request.ownerAddress, limit: 1000 }
		});
		const orders = ordersResult.orders || [];

		// 3. Determine which orders to cancel
		let ordersToCancel: any[] = [];
		if (request.orderIds && request.orderIds.length > 0) {
			ordersToCancel = orders.filter((order: any) => {
				if (order.id && request.orderIds!.includes(order.id)) return true;
				if (order.price && order.price.fixed && order.side) {
					const syntheticId = `${order.side}:${order.price.fixed}`;
					return request.orderIds!.includes(syntheticId);
				}
				return false;
			});
		} else if (request.orders && request.orders.length > 0) {
			const ids = request.orders.map((order: any) => order.id).filter(Boolean);
			ordersToCancel = orders.filter((o: any) => ids.includes(o.id));
		} else {
			throw new Error('No orderIds or orders provided to cancelOrders');
		}
		if (ordersToCancel.length === 0) {
			throw new Error('No orders found to cancel');
		}

		// 4. Build the cancellation message for all orders
		const cancelMsgs = ordersToCancel.map((order: any) => [order.side, { fixed: order.price.fixed }, '0']);
		const executeMsg = {
			order: [cancelMsgs, null]
		};

		// 5. Execute the cancellation transaction
		const [{ address }] = await this.wallet.getAccounts();
		const result = await this.cosmClient.execute(
			address,
			contractAddress,
			executeMsg,
			'auto'
		);

		// 6. Return the response
		const cancelledOrdersMap = Map<string, Order>();
		for (const order of ordersToCancel) {
			const id = order.id || `${order.side}:${order.price.fixed}`;
			cancelledOrdersMap.set(id, {
				id,
				market: {} as Market,
				owner: order.owner,
				type: order.type || OrderType.LIMIT,
				side: order.side,
				price: order.price ? new Decimal(order.price) : new Decimal(0),
				amount: new Decimal(order.amount),
				filledAmount: new Decimal(order.filledAmount || 0),
				filledPercentage: new Decimal(0),
				status: OrderStatus.CANCELLED,
				raw: order,
			});
		}
		const transactionsMap = Map<string, Transaction>([
			[
				result.transactionHash,
				{
					hash: result.transactionHash,
					status: TransactionStatus.SUCCESS,
					fee: {
						amount: result.gasUsed ? new Decimal(result.gasUsed.toString()) : new Decimal(0),
						token: {
							address: 'native',
							symbol: 'RUJI',
							name: 'Rujira',
							decimals: 6,
							raw: {}
						}
					},
					raw: result
				}
			]
		]);
		return {
			orders: cancelledOrdersMap,
			status: OrderStatus.CANCELLED,
			transactions: transactionsMap
		};
	}

	/**
	 * Cancel all orders for an owner in a market
	 * @param request - The request object
	 * @returns The response for the canceled orders
	 */
	async cancelAllOrders(request: FinCancelOrdersRequest): Promise<FinCancelOrdersResponse> {
		// 1. Get the market address
		const market = await this.getMarket({
			address: request.marketAddress,
			symbol: request.marketSymbol
		});
		const contractAddress = market.address;

		// 2. Query all user orders
		const ordersMap = await this.getOrders({
			ownerAddress: request.ownerAddress!,
			marketAddress: contractAddress,
			maximumNumberOfOrders: 1000
		});
		const allOrderIds = Array.from(ordersMap.keys()).filter((id): id is string => id !== undefined);
		if (allOrderIds.length === 0) {
			throw new Error('No orders found to cancel');
		}

		// 3. Call cancelOrders with all order IDs
		return this.cancelOrders({
			ownerAddress: request.ownerAddress,
			marketAddress: contractAddress,
			orderIds: allOrderIds
		});
	}

	/**
	 * Withdraw from market (withdraw filled orders for a user in a market)
	 * @param request - The request object
	 * @returns The response for the withdrawn orders
	 */
	async withdrawFromMarket(request: FinWithdrawRequest): Promise<FinWithdrawResponse> {
		if (!request.ownerAddress) {
			throw new Error('ownerAddress is required');
		}
		if (!request.marketAddress && !request.marketSymbol) {
			throw new Error('marketAddress or marketSymbol is required');
		}

		// Resolve market address
		let contractAddress: string;
		if (request.marketAddress) {
			contractAddress = request.marketAddress;
		} else {
			const market = await this.getMarket({ symbol: request.marketSymbol });
			contractAddress = market.address;
		}

		// Query all orders for the user in this market
		const ordersResult = await this.cosmClient.queryContractSmart(contractAddress, {
			orders: { owner: request.ownerAddress, limit: 1000 }
		});
		const orders = ordersResult.orders || [];

		// Find filled orders (filled > 0)
		const filledOrders = orders.filter((order: any) => {
			return order.filled && order.filled !== '0';
		});

		if (filledOrders.length === 0) {
			throw new Error('No filled orders to withdraw');
		}

		// Withdraw from each filled order (batch not supported, so withdraw one by one)
		let lastTxResult: any = null;
		for (const order of filledOrders) {
			const withdrawMsg = {
				order: [
					[order.side, { fixed: order.price.fixed }, '0']
				],
			};
			lastTxResult = await this.cosmClient.execute(
				request.ownerAddress,
				contractAddress,
				withdrawMsg,
				'auto'
			);
			console.debug(`Withdrawn from order: ${order.side} @ ${order.price.fixed}`);
		}

		return {
			transaction: {
				hash: lastTxResult.transactionHash,
				status: lastTxResult.code === 0 ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
				fee: {
					amount: new Decimal(lastTxResult.gasUsed || 0), // This is not the real fee, but best available
					token: {
						address: '',
						symbol: '',
						name: '',
						decimals: 0,
						raw: {}
					}
				},
				raw: lastTxResult
			},
			raw: lastTxResult
		};
	}
}
