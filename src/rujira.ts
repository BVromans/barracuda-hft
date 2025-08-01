import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { AccountData, DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
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
	WalletAddress,
	TransactionHash,
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
	 * Wallet address
	 */
	public walletAddress: WalletAddress;

	/**
	 * Wallet
	 */
	private wallet: Wallet;

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

		this.walletAddress = undefined as unknown as WalletAddress;

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

		this.walletAddress = this.wallet.firstAccount.address;

		properties.set('rujira.gasPrice', GasPrice.fromString(`0.02${properties.getAs<string>('rujira.constants.tokens.feePayment.symbol').toLowerCase()}`));

		this.cosmClient = await SigningCosmWasmClient.connectWithSigner(
			properties.getAs<URL>('rujira.endpoints.rpc'),
			this.wallet.cosmWallet,
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
	private async createWalletFromPrivateKey(privateKey: WalletPrivateKey): Promise<Wallet> {
		const cosmWallet = await DirectSecp256k1Wallet.fromKey(
			fromBase64(privateKey),
			properties.getAs<string>('wallet.prefix')
		);

		const firstAccount = getOrThrow<Array<AccountData>>(await cosmWallet.getAccounts())[0];

		const wallet = {
			cosmWallet: cosmWallet,
			firstAccount: firstAccount
		};

		return wallet;
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
	 * Wallet address
	 */
	private walletAddress: WalletAddress;

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
		this.walletAddress = undefined as unknown as WalletAddress;
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
	 * Get wallet address
	 * @param walletAddress - The wallet address
	 * @param wallet - The wallet
	 * @returns The wallet address
	 */
	private getWalletAddress(walletAddress?: WalletAddress, wallet?: Wallet): WalletAddress {
		if (walletAddress) {
			return walletAddress.trim().toLowerCase();
		}

		if (wallet) {
			return wallet.firstAccount.address.trim().toLowerCase();
		}

		if (this.wallet.firstAccount) {
			return this.wallet.firstAccount.address.trim().toLowerCase();
		}

		throw new Error('No wallet address provided');
	}

	/**
	 * Initialize the client
	 * @param options - The initialize options
	 */
	async initialize(options: FinInitializeOptions): Promise<void> {
		this.walletAddress = options.walletAddress;
		this.wallet = options.wallet;
		this.cosmClient = options.cosmClient;

		await this.getAllTokens({} as FinGetAllTokensRequest);
		await this.getAllMarkets({} as FinGetAllMarketsRequest);

		this.nativeToken = await this.getToken({ address: properties.getAs<TokenAddress>('rujira.constants.tokens.native.address') });
		this.beaconToken = await this.getToken({ address: properties.getAs<TokenAddress>('rujira.constants.tokens.beacon.address') });
		this.feePaymentToken = await this.getToken({ address: properties.getAs<TokenAddress>('rujira.constants.tokens.feePayment.address') });

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

		hash = hash?.trim();

		if (!hash) {
			throw new Error("Transaction hash is required and cannot be empty");
		}

		let rawTransaction: any;

		// TOOD: verify how to retrieve the transaction directly calling the RPC endpoint!!!
		// rawTransaction = await this.cosmClient.getTx(hash);

		const url = `${properties.getAs<URL>('rujira.endpoints.rest')}/cosmos/tx/v1beta1/txs/${hash}`;
		// TODO: add a example response!!!
		const response = await fetch(url, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			throw new Error(`REST request failed: ${response.status} ${response.statusText}`);
		}

		rawTransaction = await response.json() as {
			tx: {
				body: {
					messages: Array<{
						"@type": string;
						sender: string;
						contract: string;
						msg: {
							order: [
								[
									Array<["quote" | string, { fixed: string } | unknown, string]>,
									null
								]
							];
						};
						funds: Array<{
							denom: string;
							amount: string;
						}>;
					}>;
					memo: string;
					timeout_height: string;
					extension_options: unknown[];
					non_critical_extension_options: unknown[];
				};
				auth_info: {
					signer_infos: Array<{
						public_key: {
							"@type": string;
							key: string;
						};
						mode_info: {
							single: {
								mode: string;
							};
						};
						sequence: string;
					}>;
					fee: {
						amount: Array<{
							denom: string;
							amount: string;
						}>;
						gas_limit: string;
						payer: string;
						granter: string;
					};
					tip: null;
				};
				signatures: string[];
			};
			tx_response: {
				height: string;
				txhash: string;
				codespace: string;
				code: number;
				data: string;
				raw_log: string;
				logs: unknown[];
				info: string;
				gas_wanted: string;
				gas_used: string;
				tx: {
					"@type": string;
					body: {
						messages: Array<{
							"@type": string;
							sender: string;
							contract: string;
							msg: {
								order: [
									[
										Array<["quote" | string, { fixed: string } | unknown, string]>,
										null
									]
								];
							};
							funds: Array<{
								denom: string;
								amount: string;
							}>;
						}>;
						memo: string;
						timeout_height: string;
						extension_options: unknown[];
						non_critical_extension_options: unknown[];
					};
					auth_info: {
						signer_infos: Array<{
							public_key: {
								"@type": string;
								key: string;
							};
							mode_info: {
								single: {
									mode: string;
								};
							};
							sequence: string;
						}>;
						fee: {
							amount: Array<{
								denom: string;
								amount: string;
							}>;
							gas_limit: string;
							payer: string;
							granter: string;
						};
						tip: null;
					};
					signatures: string[];
				};
				timestamp: string;
				events: Array<{
					type: string;
					attributes: Array<{
						key: string;
						value: string;
						index: boolean;
						msg_index?: string;
					}>;
				}>;
			};
		};

		if (!rawTransaction) {
			throw new Error(`Transaction not found: ${hash}`);
		}

		let status;
		if (rawTransaction.tx_response.code === 0) {
			status = TransactionStatus.SUCCESS;
		} else if (rawTransaction.tx_response.code === 1) {
			status = TransactionStatus.FAILED;
		} else {
			status = TransactionStatus.PENDING;
		}

		if (waitForConfirmation && status === TransactionStatus.PENDING) {
			throw new Error(`Transaction is still pending: ${hash}`);
		}

		const feeToken = await this.getToken({ symbol: rawTransaction.tx.auth_info.fee.amount[0].denom.toUpperCase() });
		const feeAmount = rawTransaction.tx.auth_info.fee.amount[0].amount ? Decimal(rawTransaction.tx.auth_info.fee.amount[0].amount).div(Decimal(10).pow(feeToken.decimals)) : DECIMAL_0;

		const result = {
			hash: rawTransaction.tx_response.txhash,
			status: status,
			fee: {
				amount: feeAmount,
				token: feeToken,
			},
			raw: rawTransaction
		};

		return result;
	}

	/**
	 * Get token by address or symbol
	 * @param request - The request object
	 * @returns The token response
	 */
	async getToken(request: FinGetTokenRequest): Promise<FinGetTokenResponse> {
		await this.getAllTokens({} as FinGetAllTokensRequest);

		let { address, symbol } = request;

		address = address?.trim()?.toLowerCase();
		symbol = symbol?.trim()?.toUpperCase();

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
				.map((address: TokenAddress) => address?.trim()?.toLowerCase())
				.filter((address: TokenAddress) => address);
		}

		if (symbols) {
			if (Array.isArray(symbols)) {
				symbols = MList<TokenSymbol>(symbols);
			}

			symbols = symbols
				.map((symbol: TokenSymbol) => symbol?.trim()?.toUpperCase())
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
			this.tokensBySymbol.set(token.symbol.toUpperCase(), token);
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

		const query = `
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
			body: JSON.stringify({ query })
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
				address: pair.assetBase.asset.toLowerCase(),
				symbol: pair.assetBase.metadata?.symbol?.toUpperCase() || pair.assetBase.asset?.toUpperCase(),
				name: pair.assetBase.metadata?.name || pair.assetBase.metadata?.symbol || pair.assetBase.asset,
				decimals: pair.assetBase.metadata?.decimals,
				raw: pair.assetBase
			};

			// Create quote token
			const quoteToken: Token = {
				address: pair.assetQuote.asset.toLowerCase(),
				symbol: pair.assetQuote.metadata?.symbol?.toUpperCase() || pair.assetQuote.asset?.toUpperCase(),
				name: pair.assetQuote.metadata?.name || pair.assetQuote.metadata?.symbol || pair.assetQuote.asset,
				decimals: pair.assetQuote.metadata?.decimals,
				raw: pair.assetQuote
			};

			// Create market symbol
			const marketSymbol = `${baseToken.symbol}/${quoteToken.symbol}`.toUpperCase();

			// Create market object
			const market: Market = {
				address: pair.address.toLowerCase(),
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
		// TODO: add an example response!!!
		// TODO: add an interface for the response!!!
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

		const orderBook = await this.getOrderBook({ marketAddress: market.address, marketSymbol: market.symbol, maximumNumberOfOrders: 1 });
		const bestAsk = orderBook.book.bestAsk;
		const bestBid = orderBook.book.bestBid;
		const price = bestAsk && bestBid ? bestAsk.price.plus(bestBid.price).div(2) : DECIMAL_0;

		const timestamp = Date.now();

		const ticker: Ticker = {
			market,
			price,
			timestamp,
			raw: orderBook.raw
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

		// TODO: add a example response!!!
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

		// TODO: add a interface for the response!!!
		const json: any = (await response.json());
		const { data, errors } = json;

		if (errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
		}

		const rawCandles = data?.node?.candles?.edges?.map((edge: any) => edge.node) || [];

		const candles = List<Candle>(rawCandles).map((entry: any): Candle => ({
			timestamp: typeof entry.bin === 'string'
				? new Date(entry.bin).getTime()
				:typeof entry.bin === 'number' ? entry.bin : Date.now(),
			open: Decimal(entry.open || 0),
			high: Decimal(entry.high || 0),
			low: Decimal(entry.low || 0),
			close: Decimal(entry.close || 0),
			volume: Decimal(entry.volume || 0),
			raw: entry
		}));

		return candles;
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
		let { ownerAddress, owner, marketAddress, marketSymbol, market, orderType, orderSide, orderStatus, orderPrice } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase() || undefined;
		marketSymbol = marketSymbol?.trim().toUpperCase() || undefined;
		orderType = OrderType[orderType?.trim().toUpperCase() as keyof typeof OrderType] || undefined;
		orderSide = OrderSide[orderSide?.trim().toUpperCase() as keyof typeof OrderSide] || undefined;
		orderStatus = OrderStatus[orderStatus?.trim().toUpperCase() as keyof typeof OrderStatus] || undefined;
		orderPrice = orderPrice || undefined;

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required, since it's used to compose the order ID.");
		}
		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address, market symbol, or market object is required");
		}

		if (!orderPrice) {
			throw new Error("Order price is required, since it's used to compose the order ID.");
		}

		if (!orderSide) {
			throw new Error("Order side is required, since it's used to compose the order ID.");
		}

		const orderId = `${ownerAddress}-${orderSide.toString().toLowerCase()}-${orderPrice.toString()}`;
		const orders = await this.getOrders({ ownerAddress, owner, marketAddress, marketSymbol, market, orderType, orderSide, orderStatus, orderPrice, maximumNumberOfOrders: 1 });
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
		// TODO: add support for orderIds!!!
		let { ownerAddress, owner, marketAddress, marketSymbol, market, orderType, orderSide, orderStatus, orderPrice, orderIds, maximumNumberOfOrders } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase() || undefined;
		marketSymbol = marketSymbol?.trim().toUpperCase() || undefined;
		orderType = OrderType[orderType?.trim().toUpperCase() as keyof typeof OrderType] || undefined;
		orderSide = OrderSide[orderSide?.trim().toUpperCase() as keyof typeof OrderSide] || undefined;
		orderStatus = OrderStatus[orderStatus?.trim().toUpperCase() as keyof typeof OrderStatus] || undefined;
		orderPrice = orderPrice;
		maximumNumberOfOrders = maximumNumberOfOrders || Number(properties.getAs<string>('rujira.orders.maximumNumberOfOrders'));

		if (!ownerAddress && !owner) {
			throw new Error("Owner address is required");
		}
		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address or market symbol is required");
		}

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

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
		let { ownerAddress, owner, marketAddress, marketSymbol, market, side, type, amount, price } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase();
		marketSymbol = marketSymbol?.trim().toUpperCase();
		side = OrderSide[side?.trim().toUpperCase() as keyof typeof OrderSide] || undefined;
		type = OrderType[type?.trim().toUpperCase() as keyof typeof OrderType] || undefined;
		amount = Decimal(amount);
		price = price ? Decimal(price) : undefined;

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required");
		}
		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address, market symbol, or market object is required");
		}
		if (!side) {
			throw new Error("Order side is required");
		}
		if (!type) {
			throw new Error("Order type is required");
		}
		if (!amount) {
			throw new Error("Order amount is required");
		}
		if (type === OrderType.LIMIT && !price) {
			throw new Error("Order price is required for limit orders");
		}

		const batchRequest: FinPlaceOrdersRequest = {
			ownerAddress,
			owner,
			orders: MList<FinPlaceOrderRequest>([{
				ownerAddress,
				owner,
				marketAddress,
				marketSymbol,
				market,
				side,
				type,
				amount,
				price
			}])
		};

		const response = await this.placeOrders(batchRequest);

		if (!response?.orders || response.orders.size === 0) {
			throw new Error("No order was created");
		}

		const order = response.orders.first();
		if (!order) {
			throw new Error("Failed to retrieve created order");
		}

		const transaction = response.transactions.first();
		if (!transaction) {
			throw new Error("Failed to retrieve transaction details");
		}

		const result = {
			order,
			transaction
		};

		return result;
	}


	/**
	 * Place multiple orders
	 * @param request - The request object
	 * @returns The response for the created orders or null if failed
	 */
	async placeOrders(request: FinPlaceOrdersRequest): Promise<FinPlaceOrdersResponse> {
		let { ownerAddress, owner, orders } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		orders = MList<FinPlaceOrderRequest>(orders?.map((order: FinPlaceOrderRequest) => ({
			...order,
			ownerAddress: this.getWalletAddress(order.ownerAddress, order.owner),
			marketAddress: order.marketAddress?.trim().toLowerCase(),
			marketSymbol: order.marketSymbol?.trim().toUpperCase(),
			side: OrderSide[order.side?.trim().toUpperCase() as keyof typeof OrderSide] || undefined,
			type: OrderType[order.type?.trim().toUpperCase() as keyof typeof OrderType] || undefined,
			amount: Decimal(order.amount),
			price: order.price ? Decimal(order.price) : undefined,
		})));

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required");
		}

		if (orders.isEmpty()) {
			throw new Error("Orders are required");
		}

		const market = await this.getMarket({ address: orders?.first()?.marketAddress, symbol: orders?.first()?.marketSymbol });

		const response = await this.cosmClient.execute(
			ownerAddress,
			market.address,
			{
				order: orders.map((order: FinPlaceOrderRequest) => [
					order.side === OrderSide.BUY ? 'quote' : 'base',
					{
						fixed: order.price?.toString() // order price
					},
					order.amount.mul(10 ** (order.side === OrderSide.BUY ? market.tokens.quote.decimals : market.tokens.base.decimals)).toString(), // order amount
					null // order owner (optional)
				]).toArray()
			},
			'auto',
			undefined,
			[{ denom: '', amount: '' }]
		);

		// TODO: check it it is possible to create the orders from the response!!!
		let orderIds = MList<OrderId>();
		orders.forEach((order: FinPlaceOrderRequest) => {
			orderIds.push(`${ownerAddress}-${order.side.toString().toLowerCase()}-${order.price?.toString()}`);
		});
		const placedOrders = await this.getOrders({ ownerAddress, market, orderIds });

		// TODO: check it it is possible to create the transaction from the response!!!
		const transaction = await this.getTransaction({ hash: response.transactionHash });
		const transactions = MMap<TransactionHash, Transaction>();
		transactions.set(transaction.hash, transaction);

		const result = {
			orders: placedOrders,
			transactions: transactions
		};

		return result;
	}

	/**
	 * Replace order
	 * @param request - The request object
	 * @returns The response for the replaced order
	 */
	async replaceOrder(request: FinReplaceOrderRequest): Promise<FinReplaceOrderResponse> {
		let { ownerAddress, owner, marketAddress, marketSymbol, market, side, type, amount, price } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase();
		marketSymbol = marketSymbol?.trim().toUpperCase();
		side = OrderSide[side?.trim().toUpperCase() as keyof typeof OrderSide] || undefined;
		type = OrderType[type?.trim().toUpperCase() as keyof typeof OrderType] || undefined;
		amount = Decimal(amount);
		price = price ? Decimal(price) : undefined;

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required");
		}
		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address, market symbol, or market object is required");
		}
		if (!side) {
			throw new Error("Order side is required");
		}
		if (!type) {
			throw new Error("Order type is required");
		}
		if (!amount) {
			throw new Error("Order amount is required");
		}
		if (type === OrderType.LIMIT && !price) {
			throw new Error("Order price is required for limit orders");
		}

		const batchRequest: FinReplaceOrdersRequest = {
			ownerAddress,
			owner,
			orders: MList<FinReplaceOrderRequest>([{
				ownerAddress,
				owner,
				marketAddress,
				marketSymbol,
				market,
				side,
				type,
				amount,
				price
			}])
		};

		const response = await this.replaceOrders(batchRequest);

		if (!response?.orders || response.orders.size === 0) {
			throw new Error("No order was created");
		}

		const order = response.orders.first();
		if (!order) {
			throw new Error("Failed to retrieve created order");
		}

		const transaction = response.transactions.first();
		if (!transaction) {
			throw new Error("Failed to retrieve transaction details");
		}

		const result = {
			order,
			transaction
		};

		return result;
	}

	/**
	 * Replace multiple orders
	 * @param request - The request object
	 * @returns The response for the replaced orders
	 */
	async replaceOrders(request: FinReplaceOrdersRequest): Promise<FinReplaceOrdersResponse> {
		let { ownerAddress, owner, orders } = request;

		ownerAddress = ownerAddress?.trim().toLowerCase();
		orders = MList<FinPlaceOrderRequest>(orders?.map((order: FinPlaceOrderRequest) => ({
			...order,
			ownerAddress: order.ownerAddress?.trim().toLowerCase(),
			marketAddress: order.marketAddress?.trim().toLowerCase(),
			marketSymbol: order.marketSymbol?.trim().toUpperCase(),
			side: OrderSide[order.side?.trim().toUpperCase() as keyof typeof OrderSide] || undefined,
			type: OrderType[order.type?.trim().toUpperCase() as keyof typeof OrderType] || undefined,
			amount: Decimal(order.amount),
			price: order.price ? Decimal(order.price) : undefined,
		})));

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required");
		}

		if (orders.isEmpty()) {
			throw new Error("Orders are required");
		}

		ownerAddress = getOrThrow<WalletAddress>(ownerAddress);

		const market = await this.getMarket({ address: orders?.first()?.marketAddress, symbol: orders?.first()?.marketSymbol });

		const response = await this.cosmClient.execute(
		ownerAddress,
		market.address,
		{
			order: orders.map((order: FinPlaceOrderRequest) => [
				order.side === OrderSide.BUY ? 'quote' : 'base',
				{
					fixed: order.price?.toString()
				},
				order.amount.mul(10 ** (order.side === OrderSide.BUY ? market.tokens.quote.decimals : market.tokens.base.decimals)).toString(),
				null
			]).toArray()
		},
		'auto',
		undefined,
		[{ denom: '', amount: '' }]
		);

		let orderIds = MList<OrderId>();
		orders.forEach((order: FinPlaceOrderRequest) => {
			orderIds.push(`${ownerAddress}-${order.side.toString().toLowerCase()}-${order.price?.toString()}`);
		});
		const replacedOrders = await this.getOrders({ ownerAddress, market, orderIds });

		const transaction = await this.getTransaction({ hash: response.transactionHash });
		const transactions = MMap<TransactionHash, Transaction>();
		transactions.set(transaction.hash, transaction);

		const result = {
			orders: replacedOrders,
			transactions: transactions
		};

		return result;
	}

	/**
	 * Cancel order (calls cancelOrders with a single orderId)
	 * @param request - The request object
	 * @returns The response for the canceled order
	 */
	async cancelOrder(request: FinCancelOrderRequest): Promise<FinCancelOrderResponse> {
		let { orderId, order, ownerAddress, owner, marketAddress, marketSymbol, market } = request;

		orderId = orderId?.trim().toLowerCase();
		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase();
		marketSymbol = marketSymbol?.trim().toUpperCase();

		if (!orderId && !order) {
			throw new Error("Order ID or order is required");
		}

		if (orderId && order) {
			throw new Error("Order ID and order cannot be provided together");
		}

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required");
		}

		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address, market symbol, or market object is required");
		}

		const response = await this.cancelOrders({
			orderIds: orderId ? MList<OrderId>([orderId]) : undefined,
			orders: order ? MList<Order>([order]) : undefined,
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market
		});

		const cancelledOrder = response.orders.getOrThrow(orderId || getOrThrow<OrderId>(order?.id));
		const transaction = getOrThrow<Transaction>(response.transactions.first());

		const result = {
			order: cancelledOrder,
			transaction
		};

		return result;
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
		let { ownerAddress, owner, marketAddress, marketSymbol, market } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase();
		marketSymbol = marketSymbol?.trim().toUpperCase();

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required");
		}
		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address, market symbol, or market object is required");
		}

		if (!market) {
			market = await this.getMarket({
				address: marketAddress,
				symbol: marketSymbol
			});
		}

		// TODO: use the getOrders method instead!!!
		const cancelOrdersResponse = await this.cosmClient.queryContractSmart(
			market.address, {
				orders: {
					owner: ownerAddress,
					limit: properties.getAs<number>('rujira.default.orders.maximumNumberOfOrders') || DECIMAL_INFINITY.toNumber()
				}
			}
		);
		const rawOrders = cancelOrdersResponse.orders || [];

		if (rawOrders.length === 0) {
			throw new Error("No orders found to cancel");
		}

		const cancelMessages = rawOrders.map((rawOrder: any) => [
			rawOrder.side,
			{ fixed: rawOrder.price.fixed },
			'0' // Define the amount to 0 to cancel the order
		]);

		const executeMessage = {
			order: [cancelMessages, null]
		};

		const executeResult = await this.cosmClient.execute(
			ownerAddress,
			market.address,
			executeMessage,
			'auto'
		);

		const cancelledOrders = MMap<OrderId, Order>();
		for (const rawOrder of rawOrders) {
			const orderId = `${ownerAddress}-${rawOrder.side}-${rawOrder.price.fixed}`;
			const order: Order = {
				id: orderId,
				market: market,
				owner: ownerAddress,
				type: OrderType.LIMIT,
				side: rawOrder.side === 'quote' ? OrderSide.SELL : OrderSide.BUY,
				price: new Decimal(rawOrder.price.fixed),
				amount: new Decimal(rawOrder.offer),
				filledAmount: new Decimal(rawOrder.filled),
				filledPercentage: new Decimal(rawOrder.filled).div(new Decimal(rawOrder.offer)),
				status: OrderStatus.CANCELLED,
				raw: rawOrder
			};
			cancelledOrders.set(orderId, order);
		}

		const transaction: Transaction = {
			hash: executeResult.transactionHash,
			status: TransactionStatus.SUCCESS,
			fee: {
				amount: executeResult.gasUsed ? new Decimal(executeResult.gasUsed.toString()) : DECIMAL_0,
				token: this.feePaymentToken
			},
			raw: executeResult
		};

		const transactions = MMap<TransactionHash, Transaction>();
		transactions.set(transaction.hash, transaction);

		const response = {
			orders: cancelledOrders,
			transactions: transactions
		};

		return response;
	}

	/**
	 * Withdraw from market (withdraw filled orders for a user in a market)
	 * @param request - The request object
	 * @returns The response for the withdrawn orders
	 */
	async withdrawFromMarket(request: FinWithdrawRequest): Promise<FinWithdrawResponse> {
		let { ownerAddress, owner, marketAddress, marketSymbol, market } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase();
		marketSymbol = marketSymbol?.trim().toUpperCase();

		if (!ownerAddress && !owner) {
			throw new Error("Owner address or owner wallet is required");
		}
		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address, market symbol, or market object is required");
		}

		if (!market) {
			market = await this.getMarket({
				address: marketAddress,
				symbol: marketSymbol
			});
		}

		// TODO: use the getOrders method instead!!!
		const ordersResponse = await this.cosmClient.queryContractSmart(
			market.address,
			{
				orders: {
					owner: ownerAddress,
					limit: properties.getAs<number>('rujira.default.orders.maximumNumberOfOrders') || DECIMAL_INFINITY.toNumber()
				}
			}
		);

		const rawOrders = ordersResponse.orders || [];

		const filledOrders = MList<any>(rawOrders.filter((order: any) => {
			return order.filled && Number(order.filled) > 0;
		}));

		if (filledOrders.isEmpty()) {
			throw new Error("No filled orders found to withdraw");
		}

		const withdrawnOrders = MMap<OrderId, Order>();
		const transactions = MMap<TransactionHash, Transaction>();

		for (const rawOrder of filledOrders) {
			const withdrawMessage = {
				order: [
					[
						[
							rawOrder.side,
							{
								fixed: rawOrder.price.fixed
							},
							null
						]
					],
					null
				]
			};

			const result = await this.cosmClient.execute(
				ownerAddress,
				market.address,
				withdrawMessage,
				'auto'
			);

			const order: Order = {
				id: `${ownerAddress}-${rawOrder.side}-${rawOrder.price.fixed}`,
				market: market,
				owner: ownerAddress,
				type: OrderType.LIMIT,
				side: rawOrder.side === 'quote' ? OrderSide.SELL : OrderSide.BUY,
				price: new Decimal(rawOrder.price.fixed),
				amount: new Decimal(rawOrder.offer),
				filledAmount: new Decimal(rawOrder.filled),
				filledPercentage: new Decimal(rawOrder.filled).div(new Decimal(rawOrder.offer)),
				status: OrderStatus.FILLED,
				raw: rawOrder
			};

			const transaction: Transaction = {
				hash: result.transactionHash,
				status: TransactionStatus.SUCCESS,
				fee: {
					amount: result.gasUsed ? new Decimal(result.gasUsed.toString()) : DECIMAL_0,
					token: this.feePaymentToken
				},
				raw: result
			};

			withdrawnOrders.set(getOrThrow<OrderId>(order.id), order);
			transactions.set(transaction.hash, transaction);
		}

		const lastTransaction = transactions.last();

		const result = {
			orders: withdrawnOrders,
			transactions: transactions,
			raw: lastTransaction?.raw
		};

		return result;
	}
}
