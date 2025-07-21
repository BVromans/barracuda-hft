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
	FinCreateOrderRequest as FinPlaceOrderRequest,
	FinCreateOrderResponse as FinPlaceOrderResponse,
	FinCreateOrdersRequest as FinPlaceOrdersRequest,
	FinCreateOrdersResponse as FinPlaceOrdersResponse,
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
	WalletMnemonic,
	WalletPrivateKey,
	FinGetStatusRequest,
	OrderStatus,
	TokenBalance,
	BaseBalance,
	BaseBalanceWithQuotation,
	BaseTokenBalance,
	Balances,
	DEFAULT_GAS_PRICE,
	DEFAULT_WALLET_PREFIX
} from "./types";
import Decimal from 'decimal.js';

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
	readonly fin: Fin;

	/**
	 * RPC endpoint
	 */
	private readonly rpcEndpoint: RPCEndpoint;

	/**
	 * Wallet private key
	 */
	private readonly walletPrivateKey: WalletPrivateKey;

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
		this.walletPrivateKey = options.walletPrivateKey;

		this.cosmClient = undefined as unknown as SigningCosmWasmClient;
		this.wallet = undefined as unknown as DirectSecp256k1Wallet;

		this.fin = new Fin(options as FinConstructorOptions);
	}

	/**
	 * Initialize the client
	 */
	public async initialize(_options: RujiraInitializeOptions) {
		this.wallet = await this.createWalletFromMnemonic(this.walletMnemonic);
		
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
	private async createWalletFromPrivateKey(privateKey: string): Promise<DirectSecp256k1Wallet> {
		return await DirectSecp256k1Wallet.fromKey(
			fromBase64(privateKey),
			DEFAULT_WALLET_PREFIX
		);
	}

	/**
	 * Create wallet from mnemonic
	 * @param mnemonic - The mnemonic to create the wallet from
	 * @returns The wallet
	 */
	private async createWalletFromMnemonic(mnemonic: string): Promise<DirectSecp256k1Wallet> {
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
	 * REST endpoint for bank queries
	 */
	private restEndpoint: string;

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
		this.restEndpoint = options.restEndpoint;
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
	 */
	async getTransaction(request: FinGetTransactionRequest): Promise<FinGetTransactionResponse> {
		if (!request.hash?.trim()) {
			throw new Error("Transaction hash is required and cannot be empty");
		}

		const transactionHash = request.hash.trim();
		let transaction = await this.cosmClient.getTx(transactionHash);

		if (!transaction) {
			throw new Error(`Transaction not found: ${transactionHash}`);
		}

		// Wait for confirmation if requested
		if (request.waitForConfirmation) {
			console.log(`⏳ Waiting for transaction ${transactionHash} to be confirmed...`);
			
			const maxWaitTime = 30000; // 30 seconds timeout
			const startTime = Date.now();
			
			while (!transaction?.height) {
				// Check timeout
				if (Date.now() - startTime > maxWaitTime) {
					throw new Error(`Transaction confirmation timeout after ${maxWaitTime / 1000}s: ${transactionHash}`);
				}
				
				await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
				transaction = await this.cosmClient.getTx(transactionHash);
				
				if (!transaction) {
					throw new Error(`Transaction not found while waiting for confirmation: ${transactionHash}`);
				}
			}
			
			console.log(`✅ Transaction ${transactionHash} confirmed at block height ${transaction.height}`);
		}

		// Build response
		const defaultFeeToken: Token = {
			address: "native",
			symbol: "RUJI",
			name: "Rujira",
			decimals: 6,
			raw: {}
		};

		return {
			hash: transaction.hash,
			status: transaction.code === 0 ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
			fee: {
				amount: transaction.gasUsed ? Decimal(transaction.gasUsed.toString()) : Decimal(0),
				token: defaultFeeToken,
			},
			raw: transaction
		};
	}

	/**
	 * Get token by address or symbol
	 */
	async getToken(request: FinGetTokenRequest): Promise<FinGetTokenResponse> {
		await this.getAllTokens({} as FinGetAllTokensRequest);

		const address = request.address?.toLowerCase().trim();
		const symbol = request.symbol?.toLowerCase().trim();

		if ((!address || address.length === 0) && (!symbol || symbol.length === 0)) {
			throw new Error("You must provide a non-empty address or symbol to getToken");
		}

		let token: Token | undefined;
		if (address) {
			token = this.tokensByAddress.get(address);
		}
		if (!token && symbol) {
			token = this.tokensBySymbol.get(symbol);
		}
		if (!token) {
			throw new Error(`Token not found: ${address || symbol}`);
		}
		return token;
	}

	/**
	 * Get multiple tokens by addresses and/or symbols
	 */
	async getTokens(request: FinGetTokensRequest): Promise<FinGetTokensResponse> {
		await this.getAllTokens({} as FinGetAllTokensRequest);
		const addresses = (request.addresses || []).map(a => a?.toLowerCase().trim()).filter(Boolean);
		const symbols = (request.symbols || []).map(s => s?.toLowerCase().trim()).filter(Boolean);

		if (addresses.length === 0 && symbols.length === 0) {
			throw new Error("You must provide at least one non-empty address or symbol to getTokens");
		}

		const tokens = new Map<TokenAddress, Token>();
		for (const address of addresses) {
			if (!address || address.length === 0) continue;
			const token = this.tokensByAddress.get(address);
			if (!token) throw new Error(`Token not found: ${address}`);
			tokens.set(token.address, token);
		}
		for (const symbol of symbols) {
			if (!symbol || symbol.length === 0) continue;
			const token = this.tokensBySymbol.get(symbol);
			if (!token) throw new Error(`Token not found: ${symbol}`);
			tokens.set(token.address, token);
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
		try {
			// Get all markets first (this already contains all token data)
			const markets = await this.getAllMarkets({} as FinGetAllMarketsRequest);
			const tokenMap = new Map<TokenAddress, Token>();

			// Extract all unique tokens from the markets
			for (const market of markets.values()) {
				// Add base token if not already added
				if (!tokenMap.has(market.tokens.base.address)) {
					tokenMap.set(market.tokens.base.address, market.tokens.base);
				}

				// Add quote token if not already added
				if (!tokenMap.has(market.tokens.quote.address)) {
					tokenMap.set(market.tokens.quote.address, market.tokens.quote);
				}
			}

			// Update internal maps
			for (const token of tokenMap.values()) {
				this.tokensByAddress.set(token.address, token);
				this.tokensBySymbol.set(token.symbol, token);
			}

			return tokenMap;
		} catch (error) {
			throw new Error(`Failed to fetch tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get market by address or symbol
	 */
	async getMarket(request: FinGetMarketRequest): Promise<FinGetMarketResponse> {
		await this.getAllMarkets({} as FinGetAllMarketsRequest);
		const address = request.address?.trim();
		const symbol = request.symbol?.trim();

		if ((!address || address.length === 0) && (!symbol || symbol.length === 0)) {
			throw new Error("You must provide a non-empty address or symbol to getMarket");
		}

		let market: Market | undefined;
		if (address) {
			market = this.marketsByAddress.get(address);
		}
		if (!market && symbol) {
			market = this.marketsBySymbol.get(symbol);
		}
		if (!market) {
			throw new Error(`Market not found: ${address || symbol}`);
		}
		return market;
	}

	/**
	 * Get multiple markets by addresses and/or symbols
	 */
	async getMarkets(request: FinGetMarketsRequest): Promise<FinGetMarketsResponse> {
		await this.getAllMarkets({} as FinGetAllMarketsRequest);
		const addresses = (request.addresses || []).map(a => a?.trim()).filter(Boolean);
		const symbols = (request.symbols || []).map(s => s?.trim()).filter(Boolean);

		if (addresses.length === 0 && symbols.length === 0) {
			throw new Error("You must provide at least one non-empty address or symbol to getMarkets");
		}

		const markets = new Map<MarketAddress, Market>();
		for (const address of addresses) {
			if (!address || address.length === 0) continue;
			const market = this.marketsByAddress.get(address);
			if (!market) throw new Error(`Market not found: ${address}`);
			markets.set(market.address, market);
		}
		for (const symbol of symbols) {
			if (!symbol || symbol.length === 0) continue;
			const market = this.marketsBySymbol.get(symbol);
			if (!market) throw new Error(`Market not found: ${symbol}`);
			markets.set(market.address, market);
		}
		return markets;
	}

	/**
	 * Get all markets
	 */
	@Cacheable({
		cacheKey: (request: FinGetAllMarketsRequest) => request.toString(),
		ttlSeconds: 60 * 60 * 6,
	})
	async getAllMarkets(request: FinGetAllMarketsRequest): Promise<FinGetAllMarketsResponse> {
		const GRAPHQL_ENDPOINT = 'https://api.rujira.network/api/graphiql';
		
		const MARKETS_QUERY = `
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

		try {
			const response = await fetch(GRAPHQL_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query: MARKETS_QUERY })
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
			const markets = new Map<MarketAddress, Market>();

			for (const pair of rawPairs) {
				// Only include LIVE markets
				if (pair.deploymentStatus !== 'LIVE') {
					continue;
				}

				// Create base token
				const baseToken: Token = {
					address: pair.assetBase.asset,
					symbol: pair.assetBase.metadata?.symbol || pair.assetBase.asset,
					name: pair.assetBase.metadata?.name || pair.assetBase.metadata?.symbol || pair.assetBase.asset,
					decimals: pair.assetBase.metadata?.decimals ?? 8,
					raw: pair.assetBase
				};

				// Create quote token
				const quoteToken: Token = {
					address: pair.assetQuote.asset,
					symbol: pair.assetQuote.metadata?.symbol || pair.assetQuote.asset,
					name: pair.assetQuote.metadata?.name || pair.assetQuote.metadata?.symbol || pair.assetQuote.asset,
					decimals: pair.assetQuote.metadata?.decimals ?? 8,
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
					decimals: pair.tick || 6, // Use tick as decimals
					status: MarketStatus.ACTIVE, // LIVE markets are active
					raw: {
						id: pair.id,
						tick: pair.tick,
						feeTaker: pair.feeTaker,
						feeMaker: pair.feeMaker,
						feeAddress: pair.feeAddress,
						deploymentStatus: pair.deploymentStatus,
						oracleBase: pair.oracleBase,
						oracleQuote: pair.oracleQuote,
						assetBase: pair.assetBase,
						assetQuote: pair.assetQuote,
						book: pair.book
					}
				};

				// Add price data if available
				if (pair.assetBase.price?.current && pair.assetQuote.price?.current) {
					const basePrice = new Decimal(pair.assetBase.price.current);
					const quotePrice = new Decimal(pair.assetQuote.price.current);
					
					if (quotePrice.gt(0)) {
						const baseQuotePrice = basePrice.div(quotePrice);
						const quoteBasePrice = quotePrice.div(basePrice);
						
						market.price = {
							baseQuote: baseQuotePrice,
							quoteBase: quoteBasePrice
						};
					}
				}

				markets.set(pair.address, market);
			}

			// Update internal maps
			for (const market of markets.values()) {
				this.marketsByAddress.set(market.address, market);
				this.marketsBySymbol.set(market.symbol, market);
			}

			return markets;
		} catch (error) {
			throw new Error(`Failed to fetch markets: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Get order book (always fetches latest from CosmWasm contract, not cache)
	 */
	async getOrderBook(request: FinGetOrderBookRequest): Promise<FinGetOrderBookResponse> {
		if (!request.marketAddress && !request.marketSymbol) {
			throw new Error("Either market address or market name must be provided");
		}

		let market: Market;
		if (request.marketAddress) {
			market = await this.getMarket({ address: request.marketAddress });
		} else {
			market = await this.getMarket({ symbol: request.marketSymbol });
		}

		// Always fetch the latest orderbook from the contract
		const rawOrderBook = await this.cosmClient.queryContractSmart(market.address, {
			order_book: {
				limit: request.limit
			}
		});

		const parseOrder = (entry: any): OrderBookOrder => ({
			price: new Decimal(entry.price),
			amount: new Decimal(entry.total),
			raw: entry
		});

		const asks: OrderBookOrder[] = (rawOrderBook.asks || []).map(parseOrder);
		const bids: OrderBookOrder[] = (rawOrderBook.bids || []).map(parseOrder);

		const limitedAsks = typeof request.limit === 'number' ? asks.slice(0, request.limit) : asks;
		const limitedBids = typeof request.limit === 'number' ? bids.slice(0, request.limit) : bids;

		const bestAsk: OrderBookOrder = limitedAsks.length > 0 ? limitedAsks[0] : {
			price: new Decimal(0),
			amount: new Decimal(0),
			raw: null
		};
		const bestBid: OrderBookOrder = limitedBids.length > 0 ? limitedBids[0] : {
			price: new Decimal(0),
			amount: new Decimal(0),
			raw: null
		};
		const middlePrice: OrderBookMiddlePrice = (limitedAsks.length > 0 && limitedBids.length > 0)
			? bestAsk.price.plus(bestBid.price).div(2)
			: new Decimal(0);

		const orderBook: OrderBook = {
			market,
			book: {
				asks: limitedAsks,
				bids: limitedBids,
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
	 */
	async getTicker(request: FinGetTickerRequest): Promise<FinGetTickerResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Get balances for a wallet (free, locked in orders, withdrawable, totals)
	 */
	async getBalances(request: FinGetBalancesRequest): Promise<FinGetBalancesResponse> {
		const walletAddress = request.walletAddress;
		if (!walletAddress) throw new Error('walletAddress is required');

		// 1. Get all tokens and markets
		const tokensMap = await this.getAllTokens({} as FinGetAllTokensRequest);
		const marketsMap = await this.getAllMarkets({} as FinGetAllMarketsRequest);

		// 2. Filter tokens if requested
		let tokens: Token[] = Array.from(tokensMap.values());
		if (request.tokenAddresses && request.tokenAddresses.length > 0) {
			tokens = tokens.filter(t => request.tokenAddresses!.includes(t.address));
		}
		if (request.tokenSymbols && request.tokenSymbols.length > 0) {
			tokens = tokens.filter(t => request.tokenSymbols!.includes(t.symbol));
		}

		// 3. Query free balances (bank module)
		const freeBalances: Record<string, Decimal> = {};
		try {
			const url = this.restEndpoint.replace(/\/$/, '');
			const bankRes = await fetch(`${url}/cosmos/bank/v1beta1/balances/${walletAddress}`);
			if (bankRes.ok) {
				const data = await bankRes.json();
				if (data && typeof data === 'object' && Array.isArray((data as any).balances)) {
					for (const bal of (data as any).balances) {
						if (typeof bal.denom === 'string' && typeof bal.amount === 'string') {
							freeBalances[bal.denom] = new Decimal(bal.amount);
						}
					}
				}
			}
		} catch (e) {
			
		}

		// 4. For each market, get locked in orders and withdrawable
		const lockedInOrders: Record<string, Decimal> = {};
		const withdrawable: Record<string, Decimal> = {};
		for (const market of marketsMap.values()) {
			const contractAddress = market.address;
			try {
				const ordersRes = await this.cosmClient.queryContractSmart(contractAddress, {
					orders: { owner: walletAddress, limit: 100 }
				});
				const orders = ordersRes.orders || [];
				for (const order of orders) {
					const side = order.side;
					const baseAddr = market.tokens.base.address;
					const quoteAddr = market.tokens.quote.address;
					if (order.remaining && order.remaining !== '0') {
						const addr = side === 'base' ? baseAddr : quoteAddr;
						lockedInOrders[addr] = (lockedInOrders[addr] || new Decimal(0)).plus(new Decimal(order.remaining));
					}
					if (order.filled && order.filled !== '0') {
						const addr = side === 'base' ? quoteAddr : baseAddr; // opposite asset
						withdrawable[addr] = (withdrawable[addr] || new Decimal(0)).plus(new Decimal(order.filled));
					}
				}
			} catch (e) {
				// ignore errors for missing contracts
			}
		}

		// 5. Build TokenBalance for each token
		const tokensMapOut = new Map<TokenAddress, TokenBalance>();
		for (const token of tokens) {
			const free = freeBalances[token.address] || new Decimal(0);
			const locked = lockedInOrders[token.address] || new Decimal(0);
			const withdraw = withdrawable[token.address] || new Decimal(0);
			const lockedInPools = new Decimal(0); // Not implemented
			const total = free.plus(locked).plus(lockedInPools).plus(withdraw);

			const baseBalance: BaseBalance = {
				free,
				lockedInOrders: locked,
				lockedInPools,
				total
			};

			// Find native and beacon tokens
			const nativeTokenObj = tokens.find(t => t.symbol.toUpperCase() === 'RUNE');
			const beaconTokenObj = tokens.find(t => t.symbol.toUpperCase() === 'USDC');

			// Find market price for native (RUNE)
			let conversionRateNative = new Decimal(0);
			if (nativeTokenObj && token.address !== nativeTokenObj.address) {
				const market = Array.from(marketsMap.values()).find(m =>
					(m.tokens.base.address === token.address && m.tokens.quote.address === nativeTokenObj.address) ||
					(m.tokens.quote.address === token.address && m.tokens.base.address === nativeTokenObj.address)
				);
				if (market && market.price) {
					if (market.tokens.base.address === token.address) {
						conversionRateNative = market.price.baseQuote;
					} else {
						conversionRateNative = market.price.quoteBase;
					}
				}
			} else if (nativeTokenObj && token.address === nativeTokenObj.address) {
				conversionRateNative = new Decimal(1);
			}

			// Find market price for beacon (USDC)
			let conversionRateBeacon = new Decimal(0);
			if (beaconTokenObj && token.address !== beaconTokenObj.address) {
				const market = Array.from(marketsMap.values()).find(m =>
					(m.tokens.base.address === token.address && m.tokens.quote.address === beaconTokenObj.address) ||
					(m.tokens.quote.address === token.address && m.tokens.base.address === beaconTokenObj.address)
				);
				if (market && market.price) {
					if (market.tokens.base.address === token.address) {
						conversionRateBeacon = market.price.baseQuote;
					} else {
						conversionRateBeacon = market.price.quoteBase;
					}
				}
			} else if (beaconTokenObj && token.address === beaconTokenObj.address) {
				conversionRateBeacon = new Decimal(1);
			}

			const baseBalanceWithNativeQuotation: BaseBalanceWithQuotation = {
				...baseBalance,
				quotation: {
					token: nativeTokenObj || token,
					conversionRate: conversionRateNative
				}
			};
			const baseBalanceWithBeaconQuotation: BaseBalanceWithQuotation = {
				...baseBalance,
				quotation: {
					token: beaconTokenObj || token,
					conversionRate: conversionRateBeacon
				}
			};

			const baseTokenBalance: BaseTokenBalance = {
				token: baseBalance,
				nativeToken: baseBalanceWithNativeQuotation,
				beaconToken: baseBalanceWithBeaconQuotation
			};

			tokensMapOut.set(token.address, {
				token,
				balances: baseTokenBalance
			});
		}

		// 6. Build total balances (nativeToken, beaconToken) dynamically
		const nativeToken = tokens.find(t => t.symbol.toUpperCase() === 'RUNE');
		const beaconToken = tokens.find(t => t.symbol.toUpperCase() === 'USDC');

		const totalNative: BaseBalance = nativeToken ? {
			free: freeBalances[nativeToken.address] || new Decimal(0),
			lockedInOrders: lockedInOrders[nativeToken.address] || new Decimal(0),
			lockedInPools: new Decimal(0),
			total: (freeBalances[nativeToken.address] || new Decimal(0)).plus(lockedInOrders[nativeToken.address] || new Decimal(0))
		} : {
			free: new Decimal(0),
			lockedInOrders: new Decimal(0),
			lockedInPools: new Decimal(0),
			total: new Decimal(0)
		};

		const totalBeacon: BaseBalance = beaconToken ? {
			free: freeBalances[beaconToken.address] || new Decimal(0),
			lockedInOrders: lockedInOrders[beaconToken.address] || new Decimal(0),
			lockedInPools: new Decimal(0),
			total: (freeBalances[beaconToken.address] || new Decimal(0)).plus(lockedInOrders[beaconToken.address] || new Decimal(0))
		} : {
			free: new Decimal(0),
			lockedInOrders: new Decimal(0),
			lockedInPools: new Decimal(0),
			total: new Decimal(0)
		};

		const balances: Balances = {
			tokens: tokensMapOut,
			total: {
				nativeToken: totalNative,
				beaconToken: totalBeacon
			}
		};

		return balances;
	}

	/**
	 * Get order
	 */
	async getOrder(request: FinGetOrderRequest): Promise<FinGetOrderResponse> {
		// Validate request
		if (!request.ownerAddress) {
			throw new Error("Owner address is required");
		}
		if (!request.side) {
			throw new Error("Order side is required");
		}
		if (!request.price) {
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
				request.side,
				request.price
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
				limit: request.limit || 30,
				offset: request.offset || 0
			}
		};

		// Add side filter if provided
		if (request.side) {
			queryMsg.orders.side = request.side;
		}

		try {
			const result = await this.cosmClient.queryContractSmart(contractAddress, queryMsg);
			return result as FinGetOrdersResponse;
		} catch (error) {
			throw new Error(`Failed to get orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	/**
	 * Place order (MARKET or LIMIT), supports both BUY and SELL sides
	 */
	async placeOrder(request: FinPlaceOrderRequest): Promise<FinPlaceOrderResponse> {
		const market = await this.getMarket({
			address: request.marketAddress,
			symbol: request.marketSymbol
		});

		const isBuy = request.side === 'buy';
		const isMarket = request.type === 'market';
		const sender = request.ownerAddress;
		const contractAddress = market.address;

		let msg: any;
		let funds: any[] = [];

		if (isMarket) {
			// MARKET order
			const sendToken = isBuy ? market.tokens.quote : market.tokens.base;
			const sendAmount = request.amount.toString();
			// min_return is not provided in the interface, so use amount as min_return for now
			msg = {
				swap: {
					min_return: sendAmount,
					to: sender
				}
			};
			funds = [{ denom: sendToken.address, amount: sendAmount }];
		} else {
			// LIMIT order
			if (!request.price) throw new Error('Limit orders require a price');
			const price = request.price.toString();
			const orderSide = isBuy ? 'quote' : 'base';
			const sendToken = isBuy ? market.tokens.quote : market.tokens.base;
			const sendAmount = request.amount.toString();
			msg = {
				order: [
					[[orderSide, { fixed: price }, sendAmount]],
					null
				]
			};
			funds = [{ denom: sendToken.address, amount: sendAmount }];
		}

		const result = await this.cosmClient.execute(
			sender,
			contractAddress,
			msg,
			'auto',
			undefined,
			funds
		);

		const response: FinPlaceOrderResponse = {
			transactionHash: result.transactionHash,
			raw: result
		};
		return response;
	}

	/**
	 * Place orders
	 */
	async placeOrders(request: FinPlaceOrdersRequest): Promise<FinPlaceOrdersResponse> {
		throw new Error("Not implemented");
	}

	/**
	 * Cancel order (calls cancelOrders with a single orderId)
	 */
	async cancelOrder(request: FinCancelOrderRequest): Promise<FinCancelOrderResponse> {
		const resp = await this.cancelOrders({
			ownerAddress: request.ownerAddress,
			marketAddress: request.marketAddress,
			marketSymbol: request.marketSymbol,
			orderIds: [request.orderId],
			cancelAll: false
		});
		return {
			orderId: request.orderId,
			status: resp.status,
			transaction: resp.transaction
		};
	}

	/**
	 * Cancel orders (supports cancelAll and multiple orderIds)
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
			orders: { owner: request.ownerAddress, limit: 100 }
		});
		const orders = ordersResult.orders || [];

		// 3. Determine which orders to cancel
		let ordersToCancel: any[] = [];
		if (request.cancelAll) {
			ordersToCancel = orders;
		} else {
			ordersToCancel = orders.filter((o: any) => {
				if (o.id && request.orderIds.includes(o.id)) return true;
				if (o.price && o.price.fixed && o.side) {
					const syntheticId = `${o.side}:${o.price.fixed}`;
					return request.orderIds.includes(syntheticId);
				}
				return false;
			});
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
		return {
			orderIds: ordersToCancel.map((o: any) => o.id || `${o.side}:${o.price.fixed}`),
			status: OrderStatus.CANCELLED,
			transaction: {
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
		};
	}

	/**
	 * Withdraw from market
	 */
	async withdrawFromMarket(request: FinWithdrawRequest): Promise<FinWithdrawResponse> {
		// 1. Resolve the market
		const market = await this.getMarket({
			address: request.marketAddress,
			symbol: request.marketSymbol
		});

		const sender = request.ownerAddress;
		const contractAddress = market.address;

		// 2. Get user's orders to build withdraw targets
		const userOrders = await this.getOrders({
			ownerAddress: sender,
			marketAddress: contractAddress,
			limit: 50 // Get more orders to ensure we don't miss any
		});

		// 3. Filter for filled orders (orders with filled > 0)
		const filledOrders = userOrders.orders.filter(order => 
			parseInt(order.filled) > 0
		);

		if (filledOrders.length === 0) {
			throw new Error("No filled orders found to withdraw");
		}

		// 4. Build order targets for withdrawal
		// For withdrawal, we use amount "0" to withdraw all filled amounts
		const orderTargets = filledOrders.map(order => [
			order.side,
			order.price,
			"0" // Withdraw all filled amount
		]);

		console.log(`📋 Withdrawing ${filledOrders.length} filled orders:`);
		filledOrders.forEach((order, index) => {
			const filledPercent = ((parseInt(order.filled) / parseInt(order.offer)) * 100).toFixed(1);
			console.log(`   ${index + 1}. ${order.side.toUpperCase()} @ ${order.price.fixed || `Oracle ${order.price.oracle}`} - ${order.filled} filled (${filledPercent}%)`);
		});

		const msg = {
			order: [orderTargets, null]
		};

		// 5. Execute the transaction
		const result = await this.cosmClient.execute(
			sender,
			contractAddress,
			msg,
			'auto',
			undefined,
			[] // No funds needed for withdrawal
		);

		// 6. Create transaction object for response
		const transaction: Transaction = {
			hash: result.transactionHash,
			status: TransactionStatus.SUCCESS, // Assuming success if no error thrown
			fee: {
				amount: new Decimal((result.gasUsed || 0).toString()),
				token: {
					address: '',
					symbol: 'RUNE',
					name: 'RUNE',
					decimals: 8,
					raw: {}
				}
			},
			raw: result
		};

		// 7. Return response
		const response: FinWithdrawResponse = {
			success: true,
			transaction: transaction
		};

		return response;
	}
}
