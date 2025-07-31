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
	MMap,
	MList,
	OrderSide,
	OrderId,
} from "./types";
import Decimal from 'decimal.js';
import { properties } from "./properties";
import { GasPrice } from "@cosmjs/stargate";
import { getOrThrow, runWithRetryAndTimeout } from "./utils";

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

		properties.set('rujira.gasPrice', GasPrice.fromString(`0.02${properties.getAs<string>('rujira.constants.tokens.feePayment.symbol').toLowerCase()}`));

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
	 * Native token
	 */
	public nativeToken: Token;

	/**
	 * Beacon token
	 */
	public beaconToken: Token;

	/**
	 * Fee payment token
	 */
	public feePaymentToken: Token;

	/**
	 * Constructor
	 * @param options - The constructor options
	 */
	constructor(options: FinConstructorOptions) {
		this.wallet = undefined as unknown as Wallet;
		this.cosmClient = undefined as unknown as SigningCosmWasmClient;

		this.tokensByAddress = MMap<TokenAddress, Token>();
		this.tokensBySymbol = MMap<TokenSymbol, Token>();
		this.marketsByAddress = MMap<MarketAddress, Market>();
		this.marketsBySymbol = MMap<MarketSymbol, Market>();

		this.nativeToken = undefined as unknown as Token;
		this.beaconToken = undefined as unknown as Token;
		this.feePaymentToken = undefined as unknown as Token;
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

		this.nativeToken = this.tokensByAddress.getOrThrow(properties.getAs<TokenAddress>('rujira.constants.tokens.native.address'));
		this.beaconToken = this.tokensByAddress.getOrThrow(properties.getAs<TokenAddress>('rujira.constants.tokens.beacon.address'));
		this.feePaymentToken = this.tokensByAddress.getOrThrow(properties.getAs<TokenAddress>('rujira.constants.tokens.feePayment.address'));

		properties.set('rujira.tokens.native', this.nativeToken);
		properties.set('rujira.tokens.beacon', this.beaconToken);
		properties.set('rujira.tokens.feePayment', this.feePaymentToken);
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

		let rawTransaction: any;

		// const url = `${properties.getAs<URL>('rujira.endpoints.rest')}/cosmos/tx/v1beta1/txs/${hash}`;
		// const response = await fetch(url, {
		// 	method: 'GET',
		// 	headers: { 'Content-Type': 'application/json' }
		// });

		// if (!response.ok) {
		// 	throw new Error(`REST request failed: ${response.status} ${response.statusText}`);
		// }

		// rawTransaction = await response.json() as {
		// 	tx: {
		// 		body: {
		// 			messages: Array<{
		// 				"@type": string;
		// 				sender: string;
		// 				contract: string;
		// 				msg: {
		// 					order: [
		// 						[
		// 							Array<["quote" | string, { fixed: string } | unknown, string]>,
		// 							null
		// 						]
		// 					];
		// 				};
		// 				funds: Array<{
		// 					denom: string;
		// 					amount: string;
		// 				}>;
		// 			}>;
		// 			memo: string;
		// 			timeout_height: string;
		// 			extension_options: unknown[];
		// 			non_critical_extension_options: unknown[];
		// 		};
		// 		auth_info: {
		// 			signer_infos: Array<{
		// 				public_key: {
		// 					"@type": string;
		// 					key: string;
		// 				};
		// 				mode_info: {
		// 					single: {
		// 						mode: string;
		// 					};
		// 				};
		// 				sequence: string;
		// 			}>;
		// 			fee: {
		// 				amount: Array<{
		// 					denom: string;
		// 					amount: string;
		// 				}>;
		// 				gas_limit: string;
		// 				payer: string;
		// 				granter: string;
		// 			};
		// 			tip: null;
		// 		};
		// 		signatures: string[];
		// 	};
		// 	tx_response: {
		// 		height: string;
		// 		txhash: string;
		// 		codespace: string;
		// 		code: number;
		// 		data: string;
		// 		raw_log: string;
		// 		logs: unknown[];
		// 		info: string;
		// 		gas_wanted: string;
		// 		gas_used: string;
		// 		tx: {
		// 			"@type": string;
		// 			body: {
		// 				messages: Array<{
		// 					"@type": string;
		// 					sender: string;
		// 					contract: string;
		// 					msg: {
		// 						order: [
		// 							[
		// 								Array<["quote" | string, { fixed: string } | unknown, string]>,
		// 								null
		// 							]
		// 						];
		// 					};
		// 					funds: Array<{
		// 						denom: string;
		// 						amount: string;
		// 					}>;
		// 				}>;
		// 				memo: string;
		// 				timeout_height: string;
		// 				extension_options: unknown[];
		// 				non_critical_extension_options: unknown[];
		// 			};
		// 			auth_info: {
		// 				signer_infos: Array<{
		// 					public_key: {
		// 						"@type": string;
		// 						key: string;
		// 					};
		// 					mode_info: {
		// 						single: {
		// 							mode: string;
		// 						};
		// 					};
		// 					sequence: string;
		// 				}>;
		// 				fee: {
		// 					amount: Array<{
		// 						denom: string;
		// 						amount: string;
		// 					}>;
		// 					gas_limit: string;
		// 					payer: string;
		// 					granter: string;
		// 				};
		// 				tip: null;
		// 			};
		// 			signatures: string[];
		// 		};
		// 		timestamp: string;
		// 		events: Array<{
		// 			type: string;
		// 			attributes: Array<{
		// 				key: string;
		// 				value: string;
		// 				index: boolean;
		// 				msg_index?: string;
		// 			}>;
		// 		}>;
		// 	};
		// };

		if (!rawTransaction) {
			throw new Error(`Transaction not found: ${hash}`);
		}

		rawTransaction = await this.cosmClient.getTx(hash);

		let status;
		if (rawTransaction.code === 0) {
			status = TransactionStatus.SUCCESS;
		} else if (rawTransaction.code === 1) {
			status = TransactionStatus.FAILED;
		} else {
			status = TransactionStatus.PENDING;
		}

		if (waitForConfirmation && status === TransactionStatus.PENDING) {
			throw new Error(`Transaction is still pending: ${hash}`);
		}

		return {
			hash: rawTransaction.hash,
			status: status,
			fee: {
				amount: rawTransaction.gasUsed ? Decimal(rawTransaction.gasUsed.toString()) : Decimal(0),
				token: properties.getAs<Token>('rujira.tokens.feePayment'),
			},
			raw: rawTransaction
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

		address = address?.trim();
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
				addresses = MList<TokenAddress>(addresses);
			}

			addresses = addresses
				.map((address: TokenAddress) => address?.trim())
				.filter((address: TokenAddress) => address);
		}

		if (symbols) {
			if (Array.isArray(symbols)) {
				symbols = MList<TokenSymbol>(symbols);
			}

			symbols = symbols
				.map((symbol: TokenSymbol) => symbol?.toLowerCase().trim())
				.filter((symbol: TokenSymbol) => symbol);
		}

		if (!addresses?.size && !symbols?.size) {
			throw new Error("You must provide at least one non-empty address or symbol");
		}

		if (addresses?.size) {
			addresses = getOrThrow<List<TokenAddress>>(addresses);
		}
		if (symbols?.size) {
			symbols = getOrThrow<List<TokenSymbol>>(symbols);
		}

		const tokens = MMap<TokenAddress, Token>();

		if (addresses?.size) {
			addresses.forEach((address: TokenAddress) => {
				const token = this.tokensByAddress.getOrThrow(address);
				if (!token) throw new Error(`Token not found: ${address}`);
				tokens.set(token.address, token);
			});
		}

		if (symbols?.size) {
			symbols.forEach((symbol: TokenSymbol, index: number) => {
				const token = this.tokensBySymbol.getOrThrow(symbol);
				if (!token) throw new Error(`Token not found: ${symbol}`);
				tokens.set(index.toString(), token);
			});
		}

		return tokens;
	}

	/**
	 * Get all tokens
	 * @param request - The request object
	 * @returns The tokens response
	 */
	@Cacheable({
		cacheKey: (_request: FinGetAllTokensRequest) => _request.toString(),
		ttlSeconds: properties.getAs<number>('rujira.cache.fin.getAllTokens'),
	})
	async getAllTokens(_request: FinGetAllTokensRequest): Promise<FinGetAllTokensResponse> {
		// Get all markets first (this already contains all token data)
		const markets = await this.getAllMarkets({} as FinGetAllMarketsRequest);

		const tokens = MMap<TokenAddress, Token>();

		// Extract all unique tokens from the markets
		for (const market of markets.values()) {
			// Add base token if not already added
			if (!tokens.has(market.tokens.base.address)) {
				// @ts-ignore
				tokens.set(market.tokens.base.address, market.tokens.base, true);
			}

			// Add quote token if not already added
			if (!tokens.has(market.tokens.quote.address)) {
				// @ts-ignore
				tokens.set(market.tokens.quote.address, market.tokens.quote, true);
			}
		}

		// Update internal maps
		for (const token of tokens.values()) {
			this.tokensByAddress.set(token.address, token);
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
				addresses = MList<MarketAddress>(addresses);
			}

			addresses = addresses
				.map((address: MarketAddress) => address?.toLowerCase().trim())
				.filter((address: MarketAddress) => address);
		}

		if (symbols) {
			if (Array.isArray(symbols)) {
				symbols = MList<MarketSymbol>(symbols);
			}

			symbols = symbols
				.map((symbol: MarketSymbol) => symbol?.toLowerCase().trim())
				.filter((symbol: MarketSymbol) => symbol);
		}

		if (!addresses?.size && !symbols?.size) {
			throw new Error("You must provide at least one non-empty address or symbol");
		}

		addresses = getOrThrow<List<MarketAddress>>(addresses);
		symbols = getOrThrow<List<MarketSymbol>>(symbols);

		const markets = MMap<MarketAddress, Market>();

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
		ttlSeconds: properties.getAs<number>('rujira.cache.fin.getAllMarkets'),
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
		const markets = MMap<MarketAddress, Market>();

		for (const pair of rawPairs) {
			// Only include LIVE markets
			if (pair.deploymentStatus !== properties.getAs<string>('rujira.constants.enum.markets.active')) {
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
				decimals: Number(pair.tick) || 0, // Use tick as decimals, ensure it's a number
				status: MarketStatus.ACTIVE, // LIVE markets are active
				raw: pair
			};

			markets.set(pair.address, market);
		}

		// Update internal maps
		for (const market of markets.values()) {
			this.marketsByAddress.set(market.address, market);
			this.marketsBySymbol.set(market.symbol, market);
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

		// Get the market using the existing getMarket method
		const market: Market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });

		// Use tick from market data
		const price = new Decimal(market.raw.tick || 0);
		const timestamp = Date.now();

		const ticker: Ticker = {
			market,
			price,
			timestamp,
			raw: {
				tick: market.raw.tick,
				marketData: market.raw
			}
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
		marketSymbol = marketSymbol?.trim();
		maximumNumberOfCandles = maximumNumberOfCandles || properties.getAs<number>('rujira.default.candles.maximumNumberOfCandles') || DECIMAL_INFINITY.toNumber();
		interval = interval || properties.getAs<CandleInterval>('rujira.default.candles.interval') || '1m';

		if (!marketAddress && !marketSymbol) {
			throw new Error("Either market address or market name must be provided");
		}

		const market: Market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });

		// Use interval directly as resolution (already in seconds format)
		const resolution = interval.replace('m', '');

		// Time range (last 7 days)
		const before = new Date().toISOString();
		const after = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

		const response = await fetch(properties.getAs<string>('rujira.endpoints.graphql'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query($marketAddress: ID!, $after: String!, $before: String!, $resolution: String!, $last: Int) {
						node(id: $marketAddress) {
							... on FinPair {
								address
								candles(after: $after, before: $before, resolution: $resolution, last: $last) {
									edges {
										node {
											open
											close
											high
											low
											volume
											bin
										}
									}
								}
							}
						}
					}
				`,
				variables: {
					marketAddress: Buffer.from(`FinPair:${market.address}`).toString('base64'),
					after,
					before,
					resolution,
					last: maximumNumberOfCandles
				}
			})
		});

		if (!response.ok) {
			throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
		}

		const json: any = await response.json();
		const { data, errors } = json;

		if (errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
		}

		const rawCandles = data?.node?.candles?.edges?.map((edge: any) => edge.node) || [];

		return List<Candle>(rawCandles).map((entry: any): Candle => ({
			timestamp: typeof entry.bin === 'string' ? new Date(entry.bin).getTime() :
					   typeof entry.bin === 'number' ? entry.bin : Date.now(),
			open: new Decimal(entry.open || 0),
			high: new Decimal(entry.high || 0),
			low: new Decimal(entry.low || 0),
			close: new Decimal(entry.close || 0),
			volume: new Decimal(entry.volume || 0),
			raw: entry
		}));
	}

	/**
	 * Get balances for a wallet (free, locked in orders, withdrawable, totals)
	 * @param request - The request object
	 * @returns The balances response
	 */
	async getBalances(request: FinGetBalancesRequest): Promise<FinGetBalancesResponse> {
		throw new Error('Not implemented');

		// let { walletAddress, tokenAddresses, tokenSymbols } = request;

		// walletAddress = walletAddress?.toLowerCase().trim();
		// tokenAddresses = tokenAddresses?.map((address: TokenAddress) => address.toLowerCase().trim()) || MList<TokenAddress>();
		// tokenSymbols = tokenSymbols?.map((symbol: TokenSymbol) => symbol.toLowerCase().trim()) || MList<TokenSymbol>();

		// if (!walletAddress) throw new Error('The wallet address is required');

		// if (Array.isArray(tokenAddresses)) {
		// 	tokenAddresses = List<TokenAddress>(tokenAddresses);
		// }
		// if (Array.isArray(tokenSymbols)) {
		// 	tokenSymbols = List<TokenSymbol>(tokenSymbols);
		// }

		// let markets = await this.getAllMarkets({} as FinGetAllMarketsRequest);
		// let tokens = await this.getAllTokens({} as FinGetAllTokensRequest);

		// if (tokenAddresses.size > 0 || tokenSymbols.size > 0) {
		// 	tokens = tokens.filter((token: Token) => tokenAddresses.includes(token.address) || tokenSymbols.includes(token.symbol));
		// }

		// const freeBalances = MMap<TokenAddress, Amount>();
		// const freeBalanceResponse = await fetch(`${properties.getAs<string>('rujira.endpoints.rest')}/cosmos/bank/v1beta1/balances/${walletAddress}`);
		// if (freeBalanceResponse.ok) {
		// 	/*
		// 	Example response:
		// 		{
		// 			"balances": [
		// 				{
		// 					"denom": "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
		// 					"amount": "90505921"
		// 				}
		// 			],
		// 			"pagination": {
		// 				"next_key": null,
		// 				"total": "6"
		// 			}
		// 		}
		// 	*/
		// 	const freeBalanceResponseData = (await freeBalanceResponse.json()) as {
		// 		balances: Array<{
		// 			denom: string;
		// 			amount: string;
		// 		}>;
		// 		pagination: {
		// 			next_key: string | null;
		// 			total: string;
		// 		};
		// 	};

		// 	for (const rawBalance of freeBalanceResponseData.balances) {
		// 		freeBalances.set(rawBalance.denom.toLowerCase().trim(), new Decimal(rawBalance.amount));
		// 	}
		// }

		// const lockedInOrdersMap = MMap<TokenAddress, Amount>();
		// const withdrawableMap = MMap<TokenAddress, Amount>();

		// for (const market of markets.values()) {
		// 	/*
		// 	Example response:
		// 		{
		// 			"orders": [
		// 				{
		// 					"owner": "thor1gsgx5xtw82r8qw06mrcxjzypuynqwjxcugk5fy",
		// 					"side": "base",
		// 					"price": {
		// 						"fixed": "0.219169"
		// 					},
		// 					"rate": "0.219169",
		// 					"updated_at": "1752680298782095574",
		// 					"offer": "10000000",
		// 					"remaining": "10000000",
		// 					"filled": "0"
		// 				}
		// 			]
		// 		}
		// 	*/
		// 	const ordersResponse = await this.cosmClient.queryContractSmart(
		// 		market.address,
		// 		{
		// 			orders: {
		// 				owner: walletAddress,
		// 				limit: properties.getOrDefault<Integer>('rujira.default.orders.maximumNumberOfOrders', DECIMAL_INFINITY.toNumber())
		// 			}
		// 		}
		// 	) as {
		// 		orders: Array<{
		// 			owner: string,
		// 			"side": string,
		// 			"price": {
		// 				"fixed": string
		// 			},
		// 			"rate": string,
		// 			"updated_at": string,
		// 			"offer": string,
		// 			"remaining": string,
		// 			"filled": string
		// 		}>;
		// 	};

		// 	for (const rawOrder of ordersResponse.orders) {
		// 		const baseTokenAddress = market.tokens.base.address;
		// 		const quoteTokenAddress = market.tokens.quote.address;

		// 		if (rawOrder.filled && Number(rawOrder.filled) > 0) {
		// 			const lockedTokenAddress = rawOrder.side === 'base' ? baseTokenAddress : quoteTokenAddress;
		// 			lockedInOrdersMap.get(lockedTokenAddress, (lockedInOrdersMap.get(lockedTokenAddress, DECIMAL_0)).plus(new Decimal(rawOrder.filled)));
		// 		}
		// 		if (rawOrder.filled && Number(rawOrder.filled) === Number(rawOrder.offer)) {
		// 			const withdrawTokenAddress = rawOrder.side === 'base' ? quoteTokenAddress : baseTokenAddress; // note that it's the opposite asset
		// 			withdrawableMap.set(withdrawTokenAddress, (withdrawableMap.get(withdrawTokenAddress, DECIMAL_0)).plus(new Decimal(rawOrder.filled)));
		// 		}
		// 	}
		// }

		// const tokensBalancesMap = MMap<TokenAddress, TokenBalance>();
		// for (const token of tokens.values()) {
		// 	const free = freeBalances.get(token.address, DECIMAL_0);
		// 	const lockedInOrders = lockedInOrdersMap.get(token.address, DECIMAL_0);
		// 	const withdrawable = withdrawableMap.get(token.address, DECIMAL_0);
		// 	const lockedInPools = DECIMAL_0; // Not implemented
		// 	const total = free.plus(lockedInOrders).plus(lockedInPools).plus(withdrawable).plus(lockedInPools);

		// 	const tokenBalance: BaseBalance = {
		// 		free,
		// 		lockedInOrders,
		// 		lockedInPools,
		// 		withdrawable,
		// 		total
		// 	};

		// 	let conversionRateNativeToken = DECIMAL_0;
		// 	if (token.address !== this.nativeToken.address) {
		// 		const market = Array.from(markets.values() as Iterable<Market>).find((market: Market) =>
		// 			(market.tokens.base.address === token.address && market.tokens.quote.address === nativeTokenObject.address) ||
		// 			(market.tokens.quote.address === token.address && market.tokens.base.address === nativeTokenObject.address)
		// 		);
		// 		if (market && market.price) {
		// 			if (market.tokens.base.address === token.address) {
		// 				conversionRateNativeToken = market.price.baseQuote;
		// 			} else {
		// 				conversionRateNativeToken = market.price.quoteBase;
		// 			}
		// 		}
		// 	} else if (nativeTokenObject && token.address === nativeTokenObject.address) {
		// 		conversionRateNativeToken = new Decimal(1);
		// 	}

		// 	// Find market price for beacon (USDC)
		// 	let conversionRateBeacon = new Decimal(0);
		// 	if (beaconTokenObject && token.address !== beaconTokenObject.address) {
		// 		const market = Array.from(markets.values() as Iterable<Market>).find((marketObj: Market) =>
		// 			(marketObj.tokens.base.address === token.address && marketObj.tokens.quote.address === beaconTokenObject.address) ||
		// 			(marketObj.tokens.quote.address === token.address && marketObj.tokens.base.address === beaconTokenObject.address)
		// 		);
		// 		if (market && market.price) {
		// 			if (market.tokens.base.address === token.address) {
		// 				conversionRateBeacon = market.price.baseQuote;
		// 			} else {
		// 				conversionRateBeacon = market.price.quoteBase;
		// 			}
		// 		}
		// 	} else if (beaconTokenObject && token.address === beaconTokenObject.address) {
		// 		conversionRateBeacon = new Decimal(1);
		// 	}

		// 	const baseBalanceWithNativeQuotation: BaseBalanceWithQuotation = {
		// 		...tokenBalance,
		// 		quotation: {
		// 			token: nativeTokenObject || token,
		// 			tokenToQuote: conversionRateNativeToken,
		// 			quoteToToken: conversionRateNativeToken ? new Decimal(1).div(conversionRateNativeToken) : new Decimal(0)
		// 		}
		// 	};
		// 	const baseBalanceWithBeaconQuotation: BaseBalanceWithQuotation = {
		// 		...tokenBalance,
		// 		quotation: {
		// 			token: beaconTokenObject || token,
		// 			tokenToQuote: conversionRateBeacon,
		// 			quoteToToken: conversionRateBeacon ? new Decimal(1).div(conversionRateBeacon) : new Decimal(0)
		// 		}
		// 	};

		// 	const baseTokenBalance: BaseTokenBalance = {
		// 		token: tokenBalance,
		// 		nativeToken: baseBalanceWithNativeQuotation,
		// 		beaconToken: baseBalanceWithBeaconQuotation
		// 	};

		// 	tokensBalancesMap.set(token.address, {
		// 		token,
		// 		balances: baseTokenBalance
		// 	});
		// }

		// const totalNative: BaseBalance = nativeToken ? {
		// 	free: freeBalances[nativeToken.address] || new Decimal(0),
		// 	lockedInOrders: lockedInOrdersMap[nativeToken.address] || new Decimal(0),
		// 	lockedInPools: new Decimal(0),
		// 	withdrawable: new Decimal(0),
		// 	total: (freeBalances[nativeToken.address] || new Decimal(0)).plus(lockedInOrdersMap[nativeToken.address] || new Decimal(0))
		// } : {
		// 	free: new Decimal(0),
		// 	lockedInOrders: new Decimal(0),
		// 	lockedInPools: new Decimal(0),
		// 	withdrawable: new Decimal(0),
		// 	total: new Decimal(0)
		// };

		// const totalBeacon: BaseBalance = beaconToken ? {
		// 	free: freeBalances[beaconToken.address] || new Decimal(0),
		// 	lockedInOrders: lockedInOrdersMap[beaconToken.address] || new Decimal(0),
		// 	lockedInPools: new Decimal(0),
		// 	withdrawable: new Decimal(0),
		// 	total: (freeBalances[beaconToken.address] || new Decimal(0)).plus(lockedInOrdersMap[beaconToken.address] || new Decimal(0))
		// } : {
		// 	free: new Decimal(0),
		// 	lockedInOrders: new Decimal(0),
		// 	lockedInPools: new Decimal(0),
		// 	withdrawable: new Decimal(0),
		// 	total: new Decimal(0)
		// };

		// const balances: Balances = {
		// 	tokens: tokensBalancesMap,
		// 	total: {
		// 		nativeToken: totalNative,
		// 		beaconToken: totalBeacon
		// 	}
		// };

		// return balances;
	}

	/**
	 * Get order
	 * @param request - The request object
	 * @returns The order response
	 */
	async getOrder(request: FinGetOrderRequest): Promise<FinGetOrderResponse> {
		let { ownerAddress, marketAddress, marketSymbol, orderType, orderSide, orderStatus, orderPrice } = request;

		ownerAddress = ownerAddress.trim().toLowerCase();
		marketAddress = marketAddress?.trim().toLowerCase() || undefined;
		marketSymbol = marketSymbol?.trim().toUpperCase() || undefined;
		orderType = OrderType[orderType?.trim().toUpperCase() as keyof typeof OrderType] || undefined;
		orderSide = OrderSide[orderSide?.trim().toUpperCase() as keyof typeof OrderSide] || undefined;
		orderStatus = OrderStatus[orderStatus?.trim().toUpperCase() as keyof typeof OrderStatus] || undefined;
		orderPrice = orderPrice || undefined;

		if (!ownerAddress) {
			throw new Error("Owner address is required, since it's used to compose the order ID.");
		}
		if (!marketAddress && !marketSymbol) {
			throw new Error("Market address or market symbol is required");
		}

		if (!orderPrice) {
			throw new Error("Order price is required, since it's used to compose the order ID.");
		}

		if (!orderSide) {
			throw new Error("Order side is required, since it's used to compose the order ID.");
		}

		const orderId = `${ownerAddress}-${orderSide.toString().toLowerCase()}-${orderPrice.toString()}`;
		const orders = await this.getOrders({ ownerAddress, marketAddress, marketSymbol, orderType, orderSide, orderStatus, orderPrice, maximumNumberOfOrders: 1 });
		const order = orders.get(orderId);

		if (!order) {
			throw new Error(`Order not found: ${orderId}`);
		}

		return order as FinGetOrderResponse;
	}

	/**
	 * Get orders
	 * @param request - The request object
	 * @returns The orders response
	 */
	async getOrders(request: FinGetOrdersRequest): Promise<FinGetOrdersResponse> {
		let { ownerAddress, marketAddress, marketSymbol, orderType, orderSide, orderStatus, orderPrice, maximumNumberOfOrders } = request;

		ownerAddress = ownerAddress.trim().toLowerCase();
		marketAddress = marketAddress?.trim().toLowerCase() || undefined;
		marketSymbol = marketSymbol?.trim().toUpperCase() || undefined;
		orderType = OrderType[orderType?.trim().toUpperCase() as keyof typeof OrderType] || undefined;
		orderSide = OrderSide[orderSide?.trim().toUpperCase() as keyof typeof OrderSide] || undefined;
		orderStatus = OrderStatus[orderStatus?.trim().toUpperCase() as keyof typeof OrderStatus] || undefined;
		orderPrice = orderPrice;
		maximumNumberOfOrders = maximumNumberOfOrders || Number(properties.getAs<string>('rujira.orders.maximumNumberOfOrders'));

		if (!ownerAddress) {
			throw new Error("Owner address is required");
		}
		if (!marketAddress && !marketSymbol) {
			throw new Error("Market address or market symbol is required");
		}

		const market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });

		const query = {
			orders: {
				owner: ownerAddress,
				limit: maximumNumberOfOrders,
				offset: 0
			}
		} as {
			orders: {
				owner: string,
				limit: number,
				offset: number
			}
		};

		const result = await this.cosmClient.queryContractSmart(market.address, query);
		// Example response:
		// 	{
		// 		"owner": "thor1gsgx5xtw82r8qw06mrcxjzypuynqwjxcugk5fy",
		// 		"side": "quote",
		// 		"price": {
		// 			"fixed": "0.04"
		// 		},
		// 		"rate": "0.04",
		// 		"updated_at": "1753359648989354207",
		// 		"offer": "5400000",
		// 		"remaining": "5400000",
		// 		"filled": "0"
		// 	}
		const rawOrders = result.orders as [{
      owner: string,
      side: string,
      price: {
        fixed: string
      },
      rate: string,
      updated_at: string,
      offer: string,
      remaining: string,
      filled: string
    }] || [];

		let orders = MMap<OrderId, Order>();

		for (const rawOrder of rawOrders) {
			const type = OrderType.LIMIT;
			const side = rawOrder.side === 'quote' ? OrderSide.SELL : OrderSide.BUY;
			const price = new Decimal(rawOrder.price.fixed);
			const amount = new Decimal(rawOrder.offer);
			const filledAmount = new Decimal(rawOrder.filled);
			const filledPercentage = filledAmount.div(amount);
			const status = filledAmount.eq(DECIMAL_0) ? OrderStatus.OPEN : filledAmount.eq(amount) ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;

			const order = {
				id: `${ownerAddress}-${side.toString().toLowerCase()}-${price.toString()}`,
				market: market,
				owner: ownerAddress,
				type: type,
				side: side,
				price: price,
				amount: amount,
				filledAmount: filledAmount,
				filledPercentage: filledPercentage,
				status: status,
				raw: rawOrder
			} as Order;

			orders.set(getOrThrow<OrderId>(order.id), order);
		}

		orders = orders.filter((order: Order) => {
			if (ownerAddress && order.owner !== ownerAddress) {
				return false;
			}
			if (marketAddress && order.market.address !== marketAddress) {
				return false;
			}
			if (marketSymbol && order.market.symbol !== marketSymbol) {
				return false;
			}
			if (orderType && order.type !== orderType) {
				return false;
			}
			if (orderSide && order.side !== orderSide) {
				return false;
			}
			if (orderStatus && order.status !== orderStatus) {
				return false;
			}
			if (orderPrice && order.price !== orderPrice) {
				return false;
			}

			return true;
		});

		if (maximumNumberOfOrders > 0) {
			orders = orders.slice(0, maximumNumberOfOrders);
		}

		return orders as FinGetOrdersResponse;
	}


	/**
	 * Place a single order (wrapper for createOrders)
	 * @param request - The request object
	 * @returns The response for the created order
	 */
	async placeOrder(request: FinPlaceOrderRequest): Promise<FinPlaceOrderResponse> {
		throw new Error('Not implemented');

			// // Basic validation
			// if (!request.ownerAddress || (!request.marketAddress && !request.marketSymbol) || !request.side || !request.type || !request.amount) {
			//     console.error('[placeOrder] Missing required fields');
			//     throw new Error('Missing required fields');
			// }

			// const batchRequest: FinPlaceOrdersRequest = {
			//     ownerAddress: request.ownerAddress,
			//     orders: [request]
			// };
			// const response = await this.placeOrders(batchRequest);
			// if (!response?.orders || response.orders.size === 0) {
			//     console.error('[placeOrder] No order was created');
			//     throw new Error('No order was created');
			// }
			// return (Array.from(response.orders.values()) as FinPlaceOrderResponse[])[0];
	}


	/**
	 * Place multiple orders
	 * @param request - The request object
	 * @returns The response for the created orders or null if failed
	 */
	async placeOrders(request: FinPlaceOrdersRequest): Promise<FinPlaceOrdersResponse> {
		throw new Error('Not implemented');

	// 		if (!request.orders?.length) {
	// 				console.error('[placeOrders] No orders provided');
	// 				throw new Error('No orders provided');
	// 		}

	// 		const placedOrders: FinPlaceOrderRequest[] = [];
	// 		const ordersArray = Array.isArray(request.orders)
	// 	? request.orders
	// 	: (request.orders as any).toArray();

	// for (const order of ordersArray) {
	// 				try {
	// 						const result = await this.placeOrder(order);
	// 						if (result) placedOrders.push(order);
	// 						else console.error(`[placeOrders] Failed to place order for ${order.ownerAddress}`);
	// 				} catch (err) {
	// 						console.error(`[placeOrders] Error placing order for ${order.ownerAddress}:`, err);
	// 				}
	// 		}
	// 		if (!placedOrders.length) {
	// 				console.error('[placeOrders] No orders were successfully placed');
	// 				throw new Error('No orders were successfully placed');
	// 		}

	// 		// Fetch the latest orders for the user to build the response
	// 		const allOrders: Map<string, Order> = Map();
	// 		for (const order of placedOrders) {
	// 				try {
	// 						const ordersResp = await this.getOrders({
	// 								ownerAddress: order.ownerAddress || '',
	// 								marketAddress: order.marketAddress,
	// 								marketSymbol: order.marketSymbol,
	// 								maximumNumberOfOrders: 50
	// 						});
	// 						const matched =  Array.from(ordersResp.values()).find((o: any) => {
	// 								if (order.type === 'limit' && order.price)
	// 										return o.side === (order.side === 'buy' ? 'quote' : 'base') && o.price.fixed === order.price.toString();
	// 								return o.side === (order.side === 'buy' ? 'quote' : 'base');
	// 						}) as any;
	// 						if (matched) {
	// 								allOrders.set(
	// 										matched.owner + '-' + matched.side + '-' + matched.price || matched.price.toString(),
	// 										{
	// 												id: matched.owner + '-' + matched.side + '-' + matched.price.toString(),
	// 												market: {} as Market,
	// 												owner: matched.owner,
	// 												type: matched.type || OrderType.LIMIT,
	// 												side: matched.side,
	// 												price: matched.price ? new Decimal(matched.price) : new Decimal(0),
	// 												amount: new Decimal(matched.amount),
	// 												filledAmount: new Decimal(0),
	// 												filledPercentage: new Decimal(0),
	// 												status: OrderStatus.OPEN,
	// 												raw: matched,
	// 										}
	// 								);
	// 						}
	// 				} catch (err) {
	// 						console.error('[placeOrders] Error fetching created orders:', err);
	// 				}
	// 		}

	// 		//Don't have a way to get transaction hash directly, so return a dummy Transaction object
	// 		return {
	// 				orders: allOrders ,
	// 				transactions: Map<string, Transaction>([
	// 					[
	// 							'',
	// 							{
	// 								hash: '',
	// 								status: TransactionStatus.FAILED,
	// 								fee: {
	// 										amount: new Decimal(0),
	// 										token: {
	// 												address: 'native',
	// 												symbol: 'RUJI',
	// 												name: 'Rujira',
	// 												decimals: 6,
	// 												raw: {}
	// 										}
	// 								},
	// 								raw: {}
	// 							}
	// 					]
	// 			])
	// 		};
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
		throw new Error("Not implemented");

		// const resp = await this.cancelOrders({
		// 	ownerAddress: request.ownerAddress,
		// 	marketAddress: request.marketAddress,
		// 	marketSymbol: request.marketSymbol,
		// 	orderIds: [request.orderId || ''],
		// 	cancelAll: false
		// });
		// return {
		// 	order: resp.orders.get(request.orderId || '') || {} as Order,
		// 	status: resp.status,
		// 	transaction: (Array.from(resp.transactions.values()) as Transaction[])[0]
		// };
	}

	/**
	 * Cancel orders (only cancels the specified orderIds or orders)
	 * @param request - The request object
	 * @returns The response for the canceled orders
	 */
	async cancelOrders(request: FinCancelOrdersRequest): Promise<FinCancelOrdersResponse> {
		throw new Error("Not implemented");

		// // 1. Get the market address
		// const market = await this.getMarket({
		// 	address: request.marketAddress,
		// 	symbol: request.marketSymbol
		// });
		// const contractAddress = market.address;

		// // 2. Query user orders
		// const ordersResult = await this.cosmClient.queryContractSmart(contractAddress, {
		// 	orders: { owner: request.ownerAddress, limit: 1000 }
		// });
		// const orders = ordersResult.orders || [];

		// // 3. Determine which orders to cancel
		// let ordersToCancel: any[] = [];
		// if (request.orderIds && request.orderIds.length > 0) {
		// 	ordersToCancel = orders.filter((order: any) => {
		// 		if (order.id && request.orderIds!.includes(order.id)) return true;
		// 		if (order.price && order.price.fixed && order.side) {
		// 			const syntheticId = `${order.side}:${order.price.fixed}`;
		// 			return request.orderIds!.includes(syntheticId);
		// 		}
		// 		return false;
		// 	});
		// } else if (request.orders && request.orders.length > 0) {
		// 	const ids = request.orders.map((order: any) => order.id).filter(Boolean);
		// 	ordersToCancel = orders.filter((o: any) => ids.includes(o.id));
		// } else {
		// 	throw new Error('No orderIds or orders provided to cancelOrders');
		// }
		// if (ordersToCancel.length === 0) {
		// 	throw new Error('No orders found to cancel');
		// }

		// // 4. Build the cancellation message for all orders
		// const cancelMsgs = ordersToCancel.map((order: any) => [order.side, { fixed: order.price.fixed }, '0']);
		// const executeMsg = {
		// 	order: [cancelMsgs, null]
		// };

		// // 5. Execute the cancellation transaction
		// const [{ address }] = await this.wallet.getAccounts();
		// const result = await this.cosmClient.execute(
		// 	address,
		// 	contractAddress,
		// 	executeMsg,
		// 	'auto'
		// );

		// // 6. Return the response
		// const cancelledOrdersMap = MMap<string, Order>();
		// for (const order of ordersToCancel) {
		// 	const id = order.id || `${order.side}:${order.price.fixed}`;
		// 	cancelledOrdersMap.set(id, {
		// 		id,
		// 		market: {} as Market,
		// 		owner: order.owner,
		// 		type: order.type || OrderType.LIMIT,
		// 		side: order.side,
		// 		price: order.price ? new Decimal(order.price) : new Decimal(0),
		// 		amount: new Decimal(order.amount),
		// 		filledAmount: new Decimal(order.filledAmount || 0),
		// 		filledPercentage: new Decimal(0),
		// 		status: OrderStatus.CANCELLED,
		// 		raw: order,
		// 	});
		// }
		// const transactionsMap = Map<string, Transaction>([
		// 	[
		// 		result.transactionHash,
		// 		{
		// 			hash: result.transactionHash,
		// 			status: TransactionStatus.SUCCESS,
		// 			fee: {
		// 				amount: result.gasUsed ? new Decimal(result.gasUsed.toString()) : new Decimal(0),
		// 				token: {
		// 					address: 'native',
		// 					symbol: 'RUJI',
		// 					name: 'Rujira',
		// 					decimals: 6,
		// 					raw: {}
		// 				}
		// 			},
		// 			raw: result
		// 		}
		// 	]
		// ]);
		// return {
		// 	orders: cancelledOrdersMap,
		// 	status: OrderStatus.CANCELLED,
		// 	transactions: transactionsMap
		// };
	}

	/**
	 * Cancel all orders for an owner in a market
	 * @param request - The request object
	 * @returns The response for the canceled orders
	 */
	async cancelAllOrders(request: FinCancelOrdersRequest): Promise<FinCancelOrdersResponse> {
		throw new Error("Not implemented");

	// 	// 1. Get the market address
	// 	const market = await this.getMarket({
	// 		address: request.marketAddress,
	// 		symbol: request.marketSymbol
	// 	});
	// 	const contractAddress = market.address;

	// 	// 2. Query all user orders
	// 	const ordersMap = await this.getOrders({
	// 		ownerAddress: request.ownerAddress!,
	// 		marketAddress: contractAddress,
	// 		maximumNumberOfOrders: 1000
	// 	});
	// 	const allOrderIds = Array.from(ordersMap.keys()).filter((id): id is string => id !== undefined);
	// 	if (allOrderIds.length === 0) {
	// 		throw new Error('No orders found to cancel');
	// 	}

	// 	// 3. Call cancelOrders with all order IDs
	// 	return this.cancelOrders({
	// 		ownerAddress: request.ownerAddress,
	// 		marketAddress: contractAddress,
	// 		orderIds: allOrderIds
	// 	});
	}

	/**
	 * Withdraw from market (withdraw filled orders for a user in a market)
	 * @param request - The request object
	 * @returns The response for the withdrawn orders
	 */
	async withdrawFromMarket(request: FinWithdrawRequest): Promise<FinWithdrawResponse> {
		throw new Error("Not implemented");

		// if (!request.ownerAddress) {
		// 	throw new Error('ownerAddress is required');
		// }
		// if (!request.marketAddress && !request.marketSymbol) {
		// 	throw new Error('marketAddress or marketSymbol is required');
		// }

		// // Resolve market address
		// let contractAddress: string;
		// if (request.marketAddress) {
		// 	contractAddress = request.marketAddress;
		// } else {
		// 	const market = await this.getMarket({ symbol: request.marketSymbol });
		// 	contractAddress = market.address;
		// }

		// // Query all orders for the user in this market
		// const ordersResult = await this.cosmClient.queryContractSmart(contractAddress, {
		// 	orders: { owner: request.ownerAddress, limit: 1000 }
		// });
		// const orders = ordersResult.orders || [];

		// // Find filled orders (filled > 0)
		// const filledOrders = orders.filter((order: any) => {
		// 	return order.filled && order.filled !== '0';
		// });

		// if (filledOrders.length === 0) {
		// 	throw new Error('No filled orders to withdraw');
		// }

		// // Withdraw from each filled order (batch not supported, so withdraw one by one)
		// let lastTxResult: any = null;
		// for (const order of filledOrders) {
		// 	const withdrawMsg = {
		// 		order: [
		// 			[order.side, { fixed: order.price.fixed }, '0']
		// 		],
		// 	};
		// 	lastTxResult = await this.cosmClient.execute(
		// 		request.ownerAddress,
		// 		contractAddress,
		// 		withdrawMsg,
		// 		'auto'
		// 	);
		// 	console.debug(`Withdrawn from order: ${order.side} @ ${order.price.fixed}`);
		// }

		// return {
		// 	transaction: {
		// 		hash: lastTxResult.transactionHash,
		// 		status: lastTxResult.code === 0 ? TransactionStatus.SUCCESS : TransactionStatus.FAILED,
		// 		fee: {
		// 			amount: new Decimal(lastTxResult.gasUsed || 0), // This is not the real fee, but best available
		// 			token: {
		// 				address: '',
		// 				symbol: '',
		// 				name: '',
		// 				decimals: 0,
		// 				raw: {}
		// 			}
		// 		},
		// 		raw: lastTxResult
		// 	},
		// 	raw: lastTxResult
		// };
	}
}
