import { ExecuteResult, JsonObject, SigningCosmWasmClient, SigningCosmWasmClientOptions } from "@cosmjs/cosmwasm-stargate";
import { Bip39, EnglishMnemonic, Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { fromBase64 } from "@cosmjs/encoding";
import { AccountData, Coin, DirectSecp256k1Wallet, OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice, HttpEndpoint, StdFee } from "@cosmjs/stargate";
import * as Indicators from "@ixjb94/indicators-js";
import cacheManager, { Cacheable, CacheManagerOptions } from "@type-cacheable/core";
import { useAdapter } from "@type-cacheable/lru-cache-adapter";
import Decimal from 'decimal.js';
import { LRUCache } from 'lru-cache';
import { properties } from "./properties";
import { logger } from "./logger";
import {
	Amount,
	Balances,
	BaseBalance,
	BaseBalanceWithQuotation,
	BaseTokenBalance,
	Candle,
	CandleInterval,
	DECIMAL_0,
	DECIMAL_1,
	DECIMAL_10,
	DECIMAL_100,
	DECIMAL_INFINITY,
	FinCancelAllOrdersRequest,
	FinCancelAllOrdersResponse,
	FinCancelOrderRequest,
	FinCancelOrderResponse,
	FinCancelOrdersRequest,
	FinCancelOrdersResponse,
	FinConstructorOptions,
	FinPersistOrdersRequest,
	FinPersistOrdersResponse,
	FinGetAllMarketsRequest,
	FinGetAllMarketsResponse,
	FinGetAllTokensRequest,
	FinGetAllTokensResponse,
	FinGetBalancesRequest,
	FinGetBalancesResponse,
	FinGetCandlesRequest,
	FinGetCandlesResponse,
	FinGetIndicatorsRequest,
	FinGetIndicatorsResponse,
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
	FinGetStatusRequest,
	FinGetStatusResponse,
	FinGetTickerRequest,
	FinGetTickerResponse,
	FinGetTokenRequest,
	FinGetTokenResponse,
	FinGetTokensRequest,
	FinGetTokensResponse,
	FinGetTransactionRequest,
	FinGetTransactionResponse,
	FinInitializeOptions,
	FinPlaceOrderRequest,
	FinPlaceOrderResponse,
	FinPlaceOrdersRequest,
	FinPlaceOrdersResponse,
	FinReplaceOrderRequest,
	FinReplaceOrderResponse,
	FinReplaceOrdersRequest,
	FinReplaceOrdersResponse,
	FinWithdrawFilledOrdersRequest,
	FinWithdrawFilledOrdersResponse,
	Indicator,
	IndicatorData,
	IndicatorId,
	Integer,
	List,
	Map,
	Market,
	MarketAddress,
	MarketStatus,
	MarketSymbol,
	MList,
	MMap,
	Order,
	OrderBook,
	OrderBookOrder,
	OrderBookPrice,
	OrderId,
	OrderPrice,
	OrderSide,
	OrderStatus,
	OrderType,
	RujiraConstructorOptions,
	RujiraInitializeOptions,
	SystemStatus,
	Ticker,
	TickerPrice,
	Token,
	TokenAddress,
	TokenBalance,
	TokenSymbol,
	Transaction,
	TransactionHash,
	TransactionStatus,
	URL,
	Wallet,
	WalletAddress,
	WalletMnemonic,
	WalletPrivateKey
} from './types';
import { get, runWithRetryAndTimeout } from "./utils";

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
			try {
				this.wallet = await this.createWalletFromMnemonic(this.walletMnemonic);
			} catch (error) {
				throw new Error(`Invalid Rujira wallet mnemonic. Please provide a valid mnemonic. ${error}`);
			}
		} else if (this.walletPrivateKey) {
			try {
				this.wallet = await this.createWalletFromPrivateKey(this.walletPrivateKey);
			} catch (error) {
				throw new Error(`Invalid Rujira wallet private key. Please provide a valid private key. ${error}`);
			}
		} else {
			throw new Error('No wallet credentials provided. Please provide either a mnemonic or a private key');
		}

		this.walletAddress = this.wallet.firstAccount.address;

		const gasPrice = await this.getGasPrice();
		properties.set('rujira.gasPrice', gasPrice); // Use automatically calculated gas price

		this.cosmClient = await this.signingCosmWasmClientConnectWithSigner(
			properties.getAs<URL>('rujira.endpoints.rpc'),
			this.wallet.cosmWallet,
			{
				gasPrice
			}
		);

		await this.fin.initialize(
			{
				parent: this,
				wallet: this.wallet,
				cosmClient: this.cosmClient
			} as FinInitializeOptions
		);
	}

	/**
	 * Get the gas price
	 * @returns The gas price
	 */
	public async getGasPrice(): Promise<GasPrice> {
		const thorChainConfiguration = await this.getThorChainConfiguration();

		const thorChainConfigurationKey = properties.getAs<string>('rujira.constants.tokens.feePayment.thorChainConfigurationKey');

		let gasPriceString = thorChainConfiguration[thorChainConfigurationKey];

		if (!gasPriceString) {
			gasPriceString = properties.getAs<string>('rujira.default.network.gasPrice');
		}

		if (!gasPriceString) {
			// Fallback to working gas price value if configuration is not found
			gasPriceString = '0';
		}

		const denom = properties.getAs<string>('rujira.constants.tokens.feePayment.symbol').toLowerCase().replace(/thor[.-]/, '');

		const gasPrice = GasPrice.fromString(`${gasPriceString}${denom}`);

		return gasPrice;
	}

	/**
	 * Derive wallet private key from mnemonic
	 * @param mnemonic - The mnemonic to derive the private key from
	 * @returns The private key
	 */
	private async deriveWalletPrivateKeyFromMnemonic(mnemonic: string): Promise<string> {
		const englishMnemonic = new EnglishMnemonic(mnemonic);
		const seed = await this.bip39MnemonicToSeed(englishMnemonic);

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
		const cosmWallet = await this.directSecp256k1WalletFromKeyfromKey(
			fromBase64(privateKey),
			properties.getAs<string>('wallet.prefix')
		);

		const firstAccount = get<Array<AccountData>>(await this.directSecp256k1WalletGetAccounts(cosmWallet))[0];

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

	/**
	 * Get the ThorChain configuration
	 * @returns The ThorChain configuration
	 */
	@runWithRetryAndTimeout()
	@Cacheable({
		cacheKey: () => `getThorChainConfiguration()`,
		ttlSeconds: properties.getAs<number>('rujira.cache.rujira.getThorChainConfiguration'),
	})
	private async getThorChainConfiguration(): Promise<any> {
		const response = await this.fetch(`${properties.getAs<URL>('rujira.endpoints.rest')}/thorchain/mimir`);

		/*
			Example response:
				{
					"ADD-CHAIN-BASE": 1,
					"ADD-CHAIN-XRP": 1,
					"ADR012": 1,
					"ADR18": 1,
					"ASGARDSIZE": 20,
					"ATTESTATIONMAXBATCHSIZE": 200,
					"ATTESTATIONPEERCONCURRENTRECEIVES": 9,
					"ATTESTATIONPEERCONCURRENTSENDS": 8,
					"BADVALIDATORREDLINE": 20,
					"BANKSENDENABLED": 1,
					"BURNSYNTHS": 1,
					"CHURNINTERVAL": 43200,
					"CHURNMIGRATEROUNDS": 2,
					"CLOUTLIMIT": 5000000000000,
					"DEPRECATEILP": 1,
					"DERIVEDDEPTHBASISPTS": 10000,
					"DERIVEDMINDEPTH": 1000,
					"DERIVEDSLIPMINBPS": 15,
					"DESIREDVALIDATORSET": 120,
					"DYNAMICMAXANCHORTARGET": 9500,
					"EMISSIONCURVE": 100000,
					"ENABLEAVAXCHAIN": 1,
					"ENABLEBSC": 1,
					"ENABLESAVINGSVAULTS": 1,
					"ENABLESWITCH-GAIA-AUTO": 1,
					"ENABLESWITCH-GAIA-FUZN": 1,
					"ENABLESWITCH-GAIA-KUJI": 1,
					"ENABLESWITCH-GAIA-LQDY": 1,
					"ENABLESWITCH-GAIA-LVN": 1,
					"ENABLESWITCH-GAIA-NAMI": 1,
					"ENABLESWITCH-GAIA-NSTK": 1,
					"ENABLESWITCH-GAIA-RKUJI": 1,
					"ENABLESWITCH-GAIA-WINK": 1,
					"EVMDISABLECONTRACTWHITELIST": 1,
					"FULLIMPLOSSPROTECTIONBLOCKS": 0,
					"FUNDMIGRATIONINTERVAL": 720,
					"HALTAVAXCHAIN": 0,
					"HALTAVAXTRADING": 0,
					"HALTBASETRADING": 0,
					"HALTBCHCHAIN": 0,
					"HALTBCHTRADING": 0,
					"HALTBSCCHAIN": 0,
					"HALTBSCTRADING": 0,
					"HALTBTCCHAIN": 0,
					"HALTBTCTRADING": 0,
					"HALTCHAINGLOBAL": 0,
					"HALTCHURNING": 0,
					"HALTDOGECHAIN": 0,
					"HALTDOGETRADING": 0,
					"HALTETHCHAIN": 0,
					"HALTETHSIGNING": 1,
					"HALTETHTRADING": 0,
					"HALTGAIACHAIN": 0,
					"HALTGAIATRADING": 0,
					"HALTLTCCHAIN": 0,
					"HALTLTCTRADING": 0,
					"HALTRADING": 1,
					"HALTSIGNING": 0,
					"HALTSIGNINGAVAX": 0,
					"HALTSIGNINGBCH": 0,
					"HALTSIGNINGBSC": 0,
					"HALTSIGNINGBTC": 0,
					"HALTSIGNINGDOGE": 0,
					"HALTSIGNINGETH": 0,
					"HALTSIGNINGGAIA": 0,
					"HALTSIGNINGLTC": 0,
					"HALTSIGNINGXRP": 0,
					"HALTTCYTRADING": 0,
					"HALTTHORCHAIN": 0,
					"HALTTRADING": 0,
					"HALTXRPCHAIN": 0,
					"HALTXRPTRADING": 0,
					"ILPCUTOFF": 9450000,
					"KEYGENRETRYINTERVAL": 100,
					"KILLSWITCHSTART": 6500000,
					"L1SLIPMINBPS": 5,
					"LENDING-THOR-BTC": 0,
					"LENDING-THOR-ETH": 0,
					"LENDINGLEVER": 3333,
					"LIQUIDITYLOCKUPBLOCKS": 600,
					"LOANREPAYMENTMATURITY": 432000,
					"LOANSTREAMINGSWAPSINTERVAL": 1,
					"MANUALSWAPSTOSYNTHDISABLED": 1,
					"MAXANCHORBLOCKS": 300,
					"MAXANCHORSLIP": 72000,
					"MAXBONDPROVIDERS": 100,
					"MAXCONFIRMATIONS-BCH": 3,
					"MAXCONFIRMATIONS-BTC": 2,
					"MAXCONFIRMATIONS-DOGE": 15,
					"MAXCONFIRMATIONS-ETH": 14,
					"MAXCONFIRMATIONS-LTC": 6,
					"MAXCR": 20000,
					"MAXIMUMLIQUIDITYRUNE": 50000000000000000,
					"MAXNODETOCHURNOUTFORLOWVERSION": 3,
					"MAXOUTBOUNDATTEMPTS": 10000,
					"MAXOUTBOUNDFEEMULTIPLIERBASISPOINTS": 30000,
					"MAXRUNESUPPLY": 49915291999331106,
					"MAXSYNTHPERPOOLDEPTH": 6000,
					"MAXSYNTHSFORSAVERSYIELD": 0,
					"MAXTXOUTOFFSET": 450,
					"MAXUTXOSTOSPEND": 10,
					"MINCR": 20000,
					"MINIMUMBONDINRUNE": 30000000000000,
					"MINIMUML1OUTBOUNDFEEUSD": 100000000,
					"MINOUTBOUNDFEEMULTIPLIERBASISPOINTS": 1000,
					"MINRUNEPOOLDEPTH": 1000000000000,
					"MINTSYNTHS": 1,
					"MINTXOUTVOLUMETHRESHOLD": 1000000000000,
					"NODEOPERATORFEE": 0,
					"NODEPAUSECHAINGLOBAL": 22142824,
					"NUMBEROFNEWNODESPERCHURN": 4,
					"OBSERVATIONDELAYFLEXIBILITY": 20,
					"PAUSELOANS": 1,
					"PAUSELP": 0,
					"PAUSELPAVAX": 0,
					"PAUSELPBCH": 0,
					"PAUSELPBSC": 0,
					"PAUSELPBTC": 0,
					"PAUSELPDEPOSIT-AVAX-AVAX": 1,
					"PAUSELPDEPOSIT-BCH-BCH": 1,
					"PAUSELPDEPOSIT-BSC-BNB": 1,
					"PAUSELPDEPOSIT-BTC-BTC": 1,
					"PAUSELPDEPOSIT-DOGE-DOGE": 1,
					"PAUSELPDEPOSIT-ETH-ETH": 1,
					"PAUSELPDEPOSIT-ETH-FLIP-0X826180541412D574CF1336D22C0C0A287822678A": 1,
					"PAUSELPDEPOSIT-ETH-TGT-0X108A850856DB3F85D0269A2693D896B394C80325": 1,
					"PAUSELPDEPOSIT-ETH-USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48": 1,
					"PAUSELPDEPOSIT-ETH-USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7": 1,
					"PAUSELPDEPOSIT-GAIA-ATOM": 1,
					"PAUSELPDEPOSIT-LTC-LTC": 1,
					"PAUSELPDOGE": 0,
					"PAUSELPETH": 0,
					"PAUSELPGAIA": 0,
					"PAUSELPLTC": 0,
					"PAUSEUNBOND": 0,
					"PENDINGLIQUIDITYAGELIMIT": 100800,
					"PENDULUMUSEEFFECTIVESECURITY": 1,
					"POL-AVAX-AVAX": 1,
					"POL-AVAX-USDC-0XB97EF9EF8734C71904D8002F8B6BC66DD9C48A6E": 1,
					"POL-BCH-BCH": 1,
					"POL-BSC-BNB": 1,
					"POL-BSC-USDC-0X8AC76A51CC950D9822D68B83FE1AD97B32CD580D": 1,
					"POL-BTC-BTC": 1,
					"POL-DOGE-DOGE": 1,
					"POL-ETH-DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F": 1,
					"POL-ETH-ETH": 1,
					"POL-ETH-USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48": 1,
					"POL-ETH-USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7": 1,
					"POL-GAIA-ATOM": 1,
					"POL-LTC-LTC": 1,
					"POLBUFFER": 2000,
					"POLMAXNETWORKDEPOSIT": 600000000000000,
					"POLMAXPOOLMOVEMENT": 10,
					"POLTARGETSYNTHPERPOOLDEPTH": 3000,
					"POOLCYCLE": 43200,
					"PREFERREDASSETOUTBOUNDFEEMULTIPLIER": 200,
					"PROPOSAL6": 1,
					"PROTOCOLAFFILIATEFEEBASISPOINTS": 1200,
					"RESCHEDULECOALESCEBLOCKS": 20,
					"RUNEPOOLDEPOSITMATURITYBLOCKS": 432000,
					"RUNEPOOLENABLED": 1,
					"SAVERSSTREAMINGSWAPSINTERVAL": 1,
					"SIGNERCONCURRENCY": 20,
					"SLASHPENALTY": 20000,
					"SOLVENCYHALTAVAXCHAIN": 0,
					"SOLVENCYHALTBCHCHAIN": 0,
					"SOLVENCYHALTBSCCHAIN": 0,
					"SOLVENCYHALTBTCCHAIN": 0,
					"SOLVENCYHALTDOGECHAIN": 0,
					"SOLVENCYHALTETHCHAIN": 0,
					"SOLVENCYHALTGAIACHAIN": 0,
					"SOLVENCYHALTXRPCHAIN": 0,
					"STOPSOLVENCYCHECK": 0,
					"STOPSOLVENCYCHECKAVAX": 0,
					"STOPSOLVENCYCHECKBSC": 0,
					"STOPSOLVENCYCHECKBTC": 0,
					"STOPSOLVENCYCHECKDOGE": 0,
					"STOPSOLVENCYCHECKETH": 0,
					"STOPSOLVENCYCHECKGAIA": 0,
					"STREAMINGSWAPMAXLENGTH": 14400,
					"STREAMINGSWAPMAXLENGTHNATIVE": 14400,
					"STREAMINGSWAPMINBPFEE": 5,
					"SYNTHSLIPMINBPS": 15,
					"SYNTHYIELDBASISPOINTS": 0,
					"SYSTEMINCOMEBURNRATEBPS": 500,
					"TARGETOUTBOUNDFEESURPLUSRUNE": 5000000000000,
					"TCYCLAIMINGHALT": 0,
					"TCYCLAIMINGSWAPHALT": 0,
					"TCYSTAKEDISTRIBUTIONHALT": 0,
					"TCYSTAKINGHALT": 0,
					"TCYUNSTAKINGHALT": 0,
					"THORNAMES": 1,
					"TORANCHOR-AVAX-USDC-0XB97EF9EF8734C71904D8002F8B6BC66DD9C48A6E": 1,
					"TORANCHOR-AVAX-USDT-0X9702230A8EA53601F5CD2DC00FDBC13D4DF4A8C7": 1,
					"TORANCHOR-BSC-USDC-0X8AC76A51CC950D9822D68B83FE1AD97B32CD580D": 1,
					"TORANCHOR-ETH-DAI-0X6B175474E89094C44DA98B954EEDEAC495271D0F": 1,
					"TORANCHOR-ETH-USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48": 1,
					"TORANCHOR-ETH-USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7": 1,
					"TRADEACCOUNTSENABLED": 1,
					"TRADEACCOUNTSSLIPMINBPS": 5,
					"TVLCAPBASISPOINTS": 10000,
					"TXOUTDELAYRATE": 50000000000,
					"VIRTUALMULTSYNTHS": 1,
					"VOTEDOFM": 1,
					"VOTELENDING": 1,
					"VOTEMAXSYNTHSFORSAVERSYIELD": 1
				}
		*/
		const data = await response.json();

		return data;
	}

	/**
	 * Get the accounts from a direct secp256k1 wallet
	 * @param wallet - The wallet to get the accounts from
	 * @returns The accounts
	 */
	@runWithRetryAndTimeout()
	private async directSecp256k1WalletGetAccounts(wallet: DirectSecp256k1Wallet): Promise<readonly AccountData[]> {
		return wallet.getAccounts();
	}

	/**
	 * Connect to the cosm client
	 * @param endpoint - The endpoint to connect to
	 * @param signer - The signer to use
	 * @param options - The options to use
	 * @returns The cosm client
	 */
	@runWithRetryAndTimeout()
	private async signingCosmWasmClientConnectWithSigner(endpoint: string | HttpEndpoint, signer: OfflineSigner, options?: SigningCosmWasmClientOptions): Promise<SigningCosmWasmClient> {
		return SigningCosmWasmClient.connectWithSigner(endpoint, signer, options);
	}

	/**
	 * Convert a mnemonic to a seed
	 * @param mnemonic - The mnemonic to convert
	 * @param password - The password to use
	 * @returns The seed
	 */
	@runWithRetryAndTimeout()
	private async bip39MnemonicToSeed(mnemonic: EnglishMnemonic, password?: string): Promise<Uint8Array> {
		return Bip39.mnemonicToSeed(mnemonic, password);
	}

	/**
	 * Create a direct secp256k1 wallet from a key
	 * @param key - The key to create the wallet from
	 * @param prefix - The prefix to use
	 * @returns The wallet
	 */
	@runWithRetryAndTimeout()
	private async directSecp256k1WalletFromKeyfromKey(privkey: Uint8Array, prefix?: string): Promise<DirectSecp256k1Wallet> {
		return DirectSecp256k1Wallet.fromKey(privkey, prefix);
	}

	/**
	 * Fetch a resource
	 * @param input - The input to fetch
	 * @param init - The init to fetch
	 * @returns The response
	 */
	@runWithRetryAndTimeout()
	public async fetch(
		input: string | URL | globalThis.Request,
		init?: RequestInit,
	): Promise<Response> {
		return fetch(input, init);
	}

	/**
	 * Execute a message on the cosm client
	 * @param senderAddress - The address of the sender
	 * @param contractAddress - The address of the contract
	 * @param msg - The message to execute
	 * @param fee - The fee to pay
	 * @param memo - The memo to add to the transaction
	 * @param funds - The funds to transfer
	 * @returns The result of the execution
	 */
	@runWithRetryAndTimeout()
	public async cosmClientExecute(senderAddress: string, contractAddress: string, msg: JsonObject, fee: StdFee | "auto" | number, memo?: string, funds?: readonly Coin[]): Promise<ExecuteResult> {
		return this.cosmClient.execute(senderAddress, contractAddress, msg, fee, memo, funds);
	}

	/**
	 * Query a contract on the cosm client
	 * @param contractAddress - The address of the contract
	 * @param queryMsg - The query message
	 * @returns The result of the query
	 */
	@runWithRetryAndTimeout()
	public async cosmClientQueryContractSmart(contractAddress: string, queryMsg: JsonObject): Promise<JsonObject> {
		return this.cosmClient.queryContractSmart(contractAddress, queryMsg);
	}

	/**
	 * Get the height of the cosm client
	 * @returns The height
	 */
	@runWithRetryAndTimeout()
	public async cosmClientGetHeight(): Promise<number> {
		return this.cosmClient.getHeight();
	}
}

/**
 * Fin client
 */
export class Fin {
	/**
	 * Parent
	 */
	private parent: Rujira;

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
	 * USD token
	 */
	public usdToken: Token;

	/**
	 * Fee payment token
	 */
	public feePaymentToken: Token;

	/**
	 * Constructor
	 * @param options - The constructor options
	 */
	constructor(options: FinConstructorOptions) {
		this.parent = undefined as unknown as Rujira;

		this.wallet = undefined as unknown as Wallet;
		this.cosmClient = undefined as unknown as SigningCosmWasmClient;

		this.tokensByAddress = MMap<TokenAddress, Token>();
		this.tokensBySymbol = MMap<TokenSymbol, Token>();
		this.marketsByAddress = MMap<MarketAddress, Market>();
		this.marketsBySymbol = MMap<MarketSymbol, Market>();

		this.nativeToken = undefined as unknown as Token;
		this.usdToken = undefined as unknown as Token;
		this.feePaymentToken = undefined as unknown as Token;
	}

	/**
	 * Initialize the client
	 * @param options - The initialize options
	 */
	async initialize(options: FinInitializeOptions): Promise<void> {
		this.parent = options.parent;
		this.wallet = options.wallet;
		this.cosmClient = options.cosmClient;

		await this.getAllTokens({} as FinGetAllTokensRequest);
		await this.getAllMarkets({} as FinGetAllMarketsRequest);

		this.nativeToken = await this.getToken({ symbol: properties.getAs<TokenSymbol>('rujira.constants.tokens.native.symbol') });
		this.usdToken = await this.getToken({ symbol: properties.getAs<TokenSymbol>('rujira.constants.tokens.usd.symbol') });
		this.feePaymentToken = await this.getToken({ symbol: properties.getAs<TokenSymbol>('rujira.constants.tokens.feePayment.symbol') });

		properties.set('rujira.tokens.native', this.nativeToken);
		properties.set('rujira.tokens.usd', this.usdToken);
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
			await this.parent.cosmClientGetHeight();

			return {
				status: SystemStatus.UP
			} as FinGetStatusResponse;
		} catch (error) {
			const errorMessage = error instanceof Error
				? `Connection failed: ${error.message}`
				: `Connection failed: Unknown error: ${error}`;

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
		// rawTransaction = await this.cosmClientGetTx(hash);

		const url = `${properties.getAs<URL>('rujira.endpoints.rest')}/cosmos/tx/v1beta1/txs/${hash}`;
		const response = await this.parent.fetch(url, {
			method: 'GET',
			headers: { 'Content-Type': 'application/json' }
		});

		if (!response.ok) {
			throw new Error(`REST request failed: ${response.status} ${response.statusText}`);
		}

		/*
		 Example response:
			{
				"tx": {
					"body": {
						"messages": [
							{
								"@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
								"sender": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
								"contract": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
								"msg": {
									"order": [
										[
											[
												"quote",
												{
													"oracle": -10
												},
												null
											]
										],
										null
									]
								},
								"funds": []
							}
						],
						"memo": "",
						"timeout_height": "0",
						"unordered": false,
						"timeout_timestamp": null,
						"extension_options": [],
						"non_critical_extension_options": []
					},
					"auth_info": {
						"signer_infos": [
							{
								"public_key": {
									"@type": "/cosmos.crypto.secp256k1.PubKey",
									"key": "A+hW5IxjCgxmWrzXevSgNh09inMoYCZa3Kv7yj3NgIpD"
								},
								"mode_info": {
									"single": {
										"mode": "SIGN_MODE_LEGACY_AMINO_JSON"
									}
								},
								"sequence": "225"
							}
						],
						"fee": {
							"amount": [
								{
									"denom": "rune",
									"amount": "55763"
								}
							],
							"gas_limit": "2788128",
							"payer": "",
							"granter": ""
						},
						"tip": null
					},
					"signatures": [
						"MN0FaJMZLh+ki86W51OYcv7gzloU0rMhuSm+9Z1ilW1X/+5KKLwWh7dlrrYZUmM6FMn/nIA/wKdcKnpNG3rOHw=="
					]
				},
				"tx_response": {
					"height": "22385725",
					"txhash": "0BD692147F4D28106113FA28963E2D47FB861FFE13D33ECDD1AAF33845B090E2",
					"codespace": "",
					"code": 0,
					"data": "122E0A2C2F636F736D7761736D2E7761736D2E76312E4D736745786563757465436F6E7472616374526573706F6E7365",
					"raw_log": "",
					"logs": [],
					"info": "",
					"gas_wanted": "-1",
					"gas_used": "2164253",
					"tx": {
						"@type": "/cosmos.tx.v1beta1.Tx",
						"body": {
							"messages": [
								{
									"@type": "/cosmwasm.wasm.v1.MsgExecuteContract",
									"sender": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"contract": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"msg": {
										"order": [
											[
												[
													"quote",
													{
														"oracle": -10
													},
													null
												]
											],
											null
										]
									},
									"funds": []
								}
							],
							"memo": "",
							"timeout_height": "0",
							"unordered": false,
							"timeout_timestamp": null,
							"extension_options": [],
							"non_critical_extension_options": []
						},
						"auth_info": {
							"signer_infos": [
								{
									"public_key": {
										"@type": "/cosmos.crypto.secp256k1.PubKey",
										"key": "A+hW5IxjCgxmWrzXevSgNh09inMoYCZa3Kv7yj3NgIpD"
									},
									"mode_info": {
										"single": {
											"mode": "SIGN_MODE_LEGACY_AMINO_JSON"
										}
									},
									"sequence": "225"
								}
							],
							"fee": {
								"amount": [
									{
										"denom": "rune",
										"amount": "55763"
									}
								],
								"gas_limit": "2788128",
								"payer": "",
								"granter": ""
							},
							"tip": null
						},
						"signatures": [
							"MN0FaJMZLh+ki86W51OYcv7gzloU0rMhuSm+9Z1ilW1X/+5KKLwWh7dlrrYZUmM6FMn/nIA/wKdcKnpNG3rOHw=="
						]
					},
					"timestamp": "2025-08-13T20:47:40Z",
					"events": [
						{
							"type": "coin_spent",
							"attributes": [
								{
									"key": "spender",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								},
								{
									"key": "amount",
									"value": "55763rune",
									"index": true
								}
							]
						},
						{
							"type": "coin_received",
							"attributes": [
								{
									"key": "receiver",
									"value": "thor17xpfvakm2amg962yls6f84z3kell8c5lk76m7z",
									"index": true
								},
								{
									"key": "amount",
									"value": "55763rune",
									"index": true
								}
							]
						},
						{
							"type": "transfer",
							"attributes": [
								{
									"key": "recipient",
									"value": "thor17xpfvakm2amg962yls6f84z3kell8c5lk76m7z",
									"index": true
								},
								{
									"key": "sender",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								},
								{
									"key": "amount",
									"value": "55763rune",
									"index": true
								}
							]
						},
						{
							"type": "message",
							"attributes": [
								{
									"key": "sender",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								}
							]
						},
						{
							"type": "tx",
							"attributes": [
								{
									"key": "fee",
									"value": "55763rune",
									"index": true
								},
								{
									"key": "fee_payer",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								}
							]
						},
						{
							"type": "tx",
							"attributes": [
								{
									"key": "acc_seq",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6/225",
									"index": true
								}
							]
						},
						{
							"type": "tx",
							"attributes": [
								{
									"key": "signature",
									"value": "MN0FaJMZLh+ki86W51OYcv7gzloU0rMhuSm+9Z1ilW1X/+5KKLwWh7dlrrYZUmM6FMn/nIA/wKdcKnpNG3rOHw==",
									"index": true
								}
							]
						},
						{
							"type": "message",
							"attributes": [
								{
									"key": "action",
									"value": "/cosmwasm.wasm.v1.MsgExecuteContract",
									"index": true
								},
								{
									"key": "sender",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								},
								{
									"key": "module",
									"value": "wasm",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "execute",
							"attributes": [
								{
									"key": "_contract_address",
									"value": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "wasm-rujira-fin/order.withdraw",
							"attributes": [
								{
									"key": "_contract_address",
									"value": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"index": true
								},
								{
									"key": "owner",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								},
								{
									"key": "side",
									"value": "quote",
									"index": true
								},
								{
									"key": "price",
									"value": "oracle:-10",
									"index": true
								},
								{
									"key": "amount",
									"value": "1703",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "coin_spent",
							"attributes": [
								{
									"key": "spender",
									"value": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"index": true
								},
								{
									"key": "amount",
									"value": "1701btc-btc",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "coin_received",
							"attributes": [
								{
									"key": "receiver",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								},
								{
									"key": "amount",
									"value": "1701btc-btc",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "transfer",
							"attributes": [
								{
									"key": "recipient",
									"value": "thor1cyglcvuqt5nzvlst6ehhgquhz0c7nzcsy00ms6",
									"index": true
								},
								{
									"key": "sender",
									"value": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"index": true
								},
								{
									"key": "amount",
									"value": "1701btc-btc",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "coin_spent",
							"attributes": [
								{
									"key": "spender",
									"value": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"index": true
								},
								{
									"key": "amount",
									"value": "2btc-btc",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "coin_received",
							"attributes": [
								{
									"key": "receiver",
									"value": "thor1jduxxzpyyvrgzx7zcnl7e5cdj34tnq5jxy00a4wp86szye25dndq575c0y",
									"index": true
								},
								{
									"key": "amount",
									"value": "2btc-btc",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "transfer",
							"attributes": [
								{
									"key": "recipient",
									"value": "thor1jduxxzpyyvrgzx7zcnl7e5cdj34tnq5jxy00a4wp86szye25dndq575c0y",
									"index": true
								},
								{
									"key": "sender",
									"value": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"index": true
								},
								{
									"key": "amount",
									"value": "2btc-btc",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						},
						{
							"type": "execute",
							"attributes": [
								{
									"key": "_contract_address",
									"value": "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
									"index": true
								},
								{
									"key": "msg_index",
									"value": "0",
									"index": true
								}
							]
						}
					]
				}
			}
		*/
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

		let feeAmount;
		let feeToken;
		if (rawTransaction?.tx?.auth_info?.fee?.amount?.[0]?.amount) {
			feeToken = await this.getToken({ address: rawTransaction?.tx?.auth_info?.fee?.amount?.[0]?.denom });
			feeAmount = Decimal(rawTransaction?.tx?.auth_info?.fee?.amount?.[0]?.amount).div(DECIMAL_10.pow(feeToken.decimals))
		} else if (rawTransaction?.tx?.auth_info?.fee?.gas_limit) {
			const gasLimit = Decimal(rawTransaction.tx.auth_info.fee.gas_limit.toString());
			const gasPrice = Decimal((await this.parent.getGasPrice()).amount.toString());
			feeToken = this.feePaymentToken;
			feeAmount = gasPrice.mul(gasLimit).div(DECIMAL_10.pow(feeToken.decimals));
		} else {
			feeToken = this.feePaymentToken;
			feeAmount = DECIMAL_0;
		}

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
			return this.tokensByAddress.getOrThrow(address, undefined, true);
		} else if (symbol) {
			return this.tokensBySymbol.getOrThrow(symbol, undefined, true);
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
			addresses = get<List<TokenAddress>>(addresses);
		}
		if (symbols?.size) {
			symbols = get<List<TokenSymbol>>(symbols);
		}

		const tokens = MMap<TokenSymbol, Token>();

		if (addresses?.size) {
			addresses.forEach((address: TokenAddress) => {
				const token = this.tokensByAddress.getOrThrow(address, undefined, true);
				if (!token) throw new Error(`Token not found: ${address}`);
				tokens.set(token.symbol, token, true);
			});
		}

		if (symbols?.size) {
			symbols.forEach((symbol: TokenSymbol, index: number) => {
				const token = this.tokensBySymbol.getOrThrow(symbol, undefined, true);
				if (!token) throw new Error(`Token not found: ${symbol}`);
				tokens.set(token.symbol, token, true);
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
		cacheKey: (_request: FinGetAllTokensRequest) => `getAllTokens(${_request.toString()})`,
		ttlSeconds: properties.getAs<number>('rujira.cache.fin.getAllTokens'),
	})
	async getAllTokens(_request: FinGetAllTokensRequest): Promise<FinGetAllTokensResponse> {
		// Get all markets first (this already contains all token data)
		const markets = await this.getAllMarkets({} as FinGetAllMarketsRequest);

		const tokens = MMap<TokenSymbol, Token>();

		// Extract all unique tokens from the markets
		for (const market of markets.values()) {
			// Add base token if not already added
			if (!tokens.has(market.tokens.base.symbol, true)) {
				tokens.set(market.tokens.base.symbol, market.tokens.base, true);
			}

			// Add quote token if not already added
			if (!tokens.has(market.tokens.quote.symbol, true)) {
				tokens.set(market.tokens.quote.symbol, market.tokens.quote, true);
			}
		}

		// Update internal maps
		for (const token of tokens.values()) {
			this.tokensByAddress.set(token.address.toLowerCase(), token, true);
			this.tokensBySymbol.set(token.symbol.toUpperCase(), token, true);
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

		address = address?.trim()?.toLowerCase();
		symbol = symbol?.trim()?.toUpperCase();

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
		} else {
			addresses = MList<MarketAddress>();
		}

		if (symbols) {
			if (Array.isArray(symbols)) {
				symbols = MList<MarketSymbol>(symbols);
			}

			symbols = symbols
				.map((symbol: MarketSymbol) => symbol?.toUpperCase().trim())
				.filter((symbol: MarketSymbol) => symbol);
		} else {
			symbols = MList<MarketSymbol>();
		}

		if (!addresses?.size && !symbols?.size) {
			throw new Error("You must provide at least one non-empty address or symbol");
		}

		addresses = get<List<MarketAddress>>(addresses);
		symbols = get<List<MarketSymbol>>(symbols);

		const markets = MMap<MarketAddress, Market>();

		addresses.forEach((address: MarketAddress) => {
			const market = this.marketsByAddress.getOrThrow(address);
			if (!market) throw new Error(`Market not found: ${address}`);
			markets.set(market.symbol, market);
		});

		symbols.forEach((symbol: MarketSymbol) => {
			const market = this.marketsBySymbol.getOrThrow(symbol);
			if (!market) throw new Error(`Market not found: ${symbol}`);
			markets.set(market.symbol, market);
		});

		return markets;
	}

	/**
	 * Get all markets
	 * @param request - The request object
	 * @returns The markets response
	 */
	@Cacheable({
		cacheKey: (request: FinGetAllMarketsRequest) => `getAllMarkets(${request.toString()})`,
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

		const response = await this.parent.fetch(graphQLEndPoint, {
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
				address: pair.assetBase.variants.native.denom.toLowerCase(),
				symbol: `${pair.assetBase.chain?.toUpperCase()}-${pair.assetBase.metadata?.symbol?.toUpperCase() || pair.assetBase.asset?.toUpperCase()}`,
				name: `${pair.assetBase.chain?.toUpperCase()} ${pair.assetBase.metadata?.name || pair.assetBase.metadata?.symbol?.toUpperCase() || pair.assetBase.asset?.toUpperCase()}`,
				decimals: pair.assetBase.metadata?.decimals,
				raw: pair.assetBase
			};

			// Create quote token
			const quoteToken: Token = {
				address: pair.assetQuote.variants.native.denom.toLowerCase(),
				symbol: `${pair.assetQuote.chain?.toUpperCase()}-${pair.assetQuote.metadata?.symbol?.toUpperCase() || pair.assetQuote.asset?.toUpperCase()}`,
				name: `${pair.assetQuote.chain?.toUpperCase()} ${pair.assetQuote.metadata?.name || pair.assetQuote.metadata?.symbol?.toUpperCase() || pair.assetQuote.asset?.toUpperCase()}`,
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
				decimals: 8, // Number(pair.tick), // TODO: verify a better way to get the market decimals!!!
				status: MarketStatus.ACTIVE, // LIVE markets are active
				raw: pair
			};

			markets.set(marketSymbol, market);
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
		let { marketAddress, marketSymbol, market, maximumNumberOfOrders } = request;

		marketAddress = marketAddress?.toLowerCase().trim();
		marketSymbol = marketSymbol?.toLowerCase().trim();
		maximumNumberOfOrders = maximumNumberOfOrders || properties.getAs<number>('rujira.default.orderBook.maximumNumberOfOrders') || DECIMAL_INFINITY.toNumber();

		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Either market address or market name or market must be provided");
		}

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		// TODO: add an example response!!!
		// TODO: add an interface for the response!!!
		const rawOrderBook = await this.parent.cosmClientQueryContractSmart(
			market.address,
			{
				book: {
					limit: maximumNumberOfOrders
				}
			}
		);

		const parseOrder = (entry: any): OrderBookOrder => ({
			price: Decimal(entry.price),
			amount: Decimal(entry.total).div(DECIMAL_10.pow(market.decimals)),
			raw: entry
		});

		let asks: List<OrderBookOrder> = MList<OrderBookOrder>(rawOrderBook.base || []).map(parseOrder);
		let bids: List<OrderBookOrder> = MList<OrderBookOrder>(rawOrderBook.quote || []).map(parseOrder);

		asks = maximumNumberOfOrders ? asks.slice(0, maximumNumberOfOrders) : asks;
		bids = maximumNumberOfOrders ? bids.slice(0, maximumNumberOfOrders) : bids;

		const bestAsk: OrderBookOrder = asks.size > 0 ? asks.getOrThrow(0) : undefined as unknown as OrderBookOrder;
		const bestBid: OrderBookOrder = bids.size > 0 ? bids.getOrThrow(0) : undefined as unknown as OrderBookOrder;

		let baseToQuoteMiddlePrice: OrderBookPrice | undefined;
		if (!asks.isEmpty() && !bids.isEmpty()) {
			baseToQuoteMiddlePrice = bestAsk.price.plus(bestBid.price).div(2);
		} else if (!asks.isEmpty() && bids.isEmpty()) {
			baseToQuoteMiddlePrice = bestAsk.price;
		} else if (asks.isEmpty() && !bids.isEmpty()) {
			baseToQuoteMiddlePrice = bestBid.price;
		}

		// (p_a1*v_a1 + p_a2*v_a2 + p_b1*v_b1 + p_b2*v_b2) / (v_a1 + v_a2 + v_b1 + v_b2)
		let baseToQuoteVolumeWeightedAveragePrice: OrderBookPrice | undefined;

		const askWeightedSum = asks.reduce((sum, order) => sum.plus(order.price.mul(order.amount)), DECIMAL_0);
		const bidWeightedSum = bids.reduce((sum, order) => sum.plus(order.price.mul(order.amount)), DECIMAL_0);
		const askTotalVolume = asks.reduce((sum, order) => sum.plus(order.amount), DECIMAL_0);
		const bidTotalVolume = bids.reduce((sum, order) => sum.plus(order.amount), DECIMAL_0);

		const totalWeightedSum = askWeightedSum.plus(bidWeightedSum);
		const totalVolume = askTotalVolume.plus(bidTotalVolume);

		if (totalVolume.gt(DECIMAL_0)) {
			baseToQuoteVolumeWeightedAveragePrice = totalWeightedSum.div(totalVolume);
		}

		const orderBook: OrderBook = {
			market,
			book: {
				asks,
				bids,
				bestAsk,
				bestBid,
			},
			statistics: {
				middlePrice: {
					baseToQuote: baseToQuoteMiddlePrice,
					quoteToBase: baseToQuoteMiddlePrice ? DECIMAL_1.div(baseToQuoteMiddlePrice) : undefined
				},
				volumeWeightedAveragePrice: {
					baseToQuote: baseToQuoteVolumeWeightedAveragePrice,
					quoteToBase: baseToQuoteVolumeWeightedAveragePrice ? DECIMAL_1.div(baseToQuoteVolumeWeightedAveragePrice) : undefined
				}
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
		let { marketAddress, marketSymbol, market } = request;

		marketAddress = marketAddress?.toLowerCase().trim();
		marketSymbol = marketSymbol?.toLowerCase().trim();

		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Either market address or market name or market must be provided");
		}

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		const orderBook = await this.getOrderBook({ marketAddress: market.address, marketSymbol: market.symbol, market: market });
		const timestamp = Date.now();

		const ticker: Ticker = {
			market,
			middlePrice: {
				baseToQuote: orderBook.statistics.middlePrice.baseToQuote,
				quoteToBase: orderBook.statistics.middlePrice.quoteToBase
			},
			volumeWeightedAveragePrice: {
				baseToQuote: orderBook.statistics.volumeWeightedAveragePrice.baseToQuote,
				quoteToBase: orderBook.statistics.volumeWeightedAveragePrice.quoteToBase
			},
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
		let { marketAddress, marketSymbol, market, interval, maximumNumberOfCandles } = request;

		marketAddress = marketAddress?.toLowerCase().trim();
		marketSymbol = marketSymbol?.trim();
		maximumNumberOfCandles = maximumNumberOfCandles || properties.getAs<number>('rujira.default.candles.maximumNumberOfCandles') || DECIMAL_INFINITY.toNumber();
		interval = interval || properties.getAs<CandleInterval>('rujira.default.candles.interval') || '1m';

		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Either market address or market name or market must be provided");
		}

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		// Use interval directly as resolution (already in seconds format)
		const resolution = interval.replace('m', '');

		// Time range (last 7 days)
		const before = new Date().toISOString();
		const after = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

		// TODO: add a example response!!!
		const response = await this.parent.fetch(properties.getAs<string>('rujira.endpoints.graphql'), {
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
					last: maximumNumberOfCandles // TODO: it seems this field is not being respected!!!
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

		const candles = MList<Candle>(rawCandles).map((entry: any): Candle => ({
			timestamp: new Date(entry.bin).getTime(),
			open: Decimal(entry.open || 0).div(DECIMAL_10.pow(12)), // TODO: check if 12 is correct!!!
			high: Decimal(entry.high || 0).div(DECIMAL_10.pow(12)), // TODO: check if 12 is correct!!!
			low: Decimal(entry.low || 0).div(DECIMAL_10.pow(12)), // TODO: check if 12 is correct!!!
			close: Decimal(entry.close || 0).div(DECIMAL_10.pow(12)), // TODO: check if 12 is correct!!!
			volume: Decimal(entry.volume || 0),
			raw: entry
		}));

		return candles;
	}

	/**
	 * Get indicators
	 * @param request - The request object
	 * @returns The indicators response
	 */
	async getIndicators(request: FinGetIndicatorsRequest): Promise<FinGetIndicatorsResponse> {
		let { marketAddress, marketSymbol, market, interval, maximumNumberOfCandles, candles, indicatorsIds } = request;

		if (!candles || candles.size === 0) {
			candles = await this.getCandles({ marketAddress, marketSymbol, market, maximumNumberOfCandles, interval });
		}

		candles = candles.asImmutable();

		if (!indicatorsIds) {
			indicatorsIds = Indicator.all.keySeq().toList();
		} else {
			indicatorsIds = MList<IndicatorId>(indicatorsIds);
		}

		const output = MMap<IndicatorId, IndicatorData>();

		for (const indicatorId of indicatorsIds) {
			const indicator = Indicator.all.getOrThrow(indicatorId);

			const value = (Indicators as any)[indicator.id](...indicator.candlesTransform(candles), ...indicator.parameters);

			output.set(indicator.id, {
				indicator,
				value
			});
		}

		return output;
	}

	/**
	 * Get balances for a wallet (free, locked in orders, withdrawable, totals)
	 * @param request - The request object
	 * @returns The balances response
	 */
	async getBalances(request: FinGetBalancesRequest): Promise<FinGetBalancesResponse> {
		let { walletAddress, wallet, tokenAddresses, tokenSymbols } = request;

		walletAddress = this.getWalletAddress(walletAddress, wallet);
		tokenAddresses = tokenAddresses?.map((address: TokenAddress) => address.toLowerCase().trim()) || MList<TokenAddress>();
		tokenSymbols = tokenSymbols?.map((symbol: TokenSymbol) => symbol.toLowerCase().trim()) || MList<TokenSymbol>();

		if (!walletAddress && !wallet) {
			throw new Error('The wallet address or wallet is required');
		}

		if (Array.isArray(tokenAddresses)) {
			tokenAddresses = MList<TokenAddress>(tokenAddresses);
		}
		if (Array.isArray(tokenSymbols)) {
			tokenSymbols = MList<TokenSymbol>(tokenSymbols);
		}

		let markets = await this.getAllMarkets({} as FinGetAllMarketsRequest);
		let tokens = await this.getAllTokens({} as FinGetAllTokensRequest);

		if (tokenAddresses.size > 0 || tokenSymbols.size > 0) {
			tokens = tokens.filter((token: Token) => tokenAddresses.includes(token.address) || tokenSymbols.includes(token.symbol));
		}

		// Fetch THORChain oracle prices for USD conversion rates
		let oraclePrices = MMap<string, Decimal>();
		const oracleResponse = await this.parent.fetch('https://stagenet-thornode.ninerealms.com/thorchain/oracle/prices');

		if (oracleResponse.ok) {
			const data = await oracleResponse.json() as { prices: Array<{ symbol: string; price: string }> };
			for (const priceData of data.prices) {
				if (priceData.symbol && priceData.price) {
					const oracleSymbol = priceData.symbol.toUpperCase();
					oraclePrices = oraclePrices.set(oracleSymbol, new Decimal(priceData.price));
				}
			}
		}

		// 2. Fetch base layer pool prices as fallback
		let poolPrices = MMap<string, Decimal>();
		const poolResponse = await this.parent.fetch('https://thornode.ninerealms.com/thorchain/pools').catch(() => null);
		if (poolResponse?.ok) {
			const data = await poolResponse.json().catch(() => null);
			if (Array.isArray(data)) {
				for (const poolData of data) {
					if (poolData.asset && poolData.asset_tor_price) {
						// Convert asset format (e.g., "THOR.RUJI" -> "THOR-RUJI")
						const poolSymbol = poolData.asset.replace('.', '-');
						// asset_tor_price is in 8 decimal places, convert to standard price
						const poolPrice = new Decimal(poolData.asset_tor_price).div(100000000);
						poolPrices = poolPrices.set(poolSymbol, poolPrice);
					}
				}
			}
		}

		const freeBalances = MMap<TokenSymbol, Amount>();
		const freeBalanceResponse = await this.parent.fetch(`${properties.getAs<string>('rujira.endpoints.rest')}/cosmos/bank/v1beta1/balances/${walletAddress}`);

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
				// Try to get token by address first
				const token = await this.getToken({ address: rawBalance.denom }).catch(() => null);

				if (token) {
					// Convert raw amount to proper decimal format
					const rawAmount = Decimal(rawBalance.amount);
					const convertedAmount = rawAmount.div(DECIMAL_10.pow(token.decimals));
					freeBalances.set(token.symbol, convertedAmount, true);
				} else {
					logger.ignoreException(new Error(`Token not found`), `Balance token ${rawBalance.denom} not found, ignoring this balance.`);
				}
			}
		}

		const lockedInOrdersMap = MMap<TokenSymbol, Amount>();
		const withdrawableMap = MMap<TokenSymbol, Amount>();

		// Use getOrders to get all orders across all markets for the wallet
		for (const market of markets.values()) {
			const marketOrders = await this.getOrders({
				ownerAddress: walletAddress,
				marketSymbol: market.symbol
			}).catch((error) => {
				logger.ignoreException(error, `Failed to get orders for market ${market.symbol}`);
				return MMap<OrderId, Order>();
			});

			for (const order of marketOrders.values()) {
				const baseTokenSymbol = market.tokens.base.symbol;
				const quoteTokenSymbol = market.tokens.quote.symbol;

				// Calculate locked amounts for ALL orders (not just partially filled ones)
				if (order.status === OrderStatus.OPEN || order.status === OrderStatus.PARTIALLY_FILLED) {
					let lockedAmount: Decimal;

					if (order.side === OrderSide.SELL) {
						// For SELL orders, lock the base token amount
						lockedAmount = order.amount;
					} else {
						// For BUY orders, lock the quote token amount (price * amount)
						lockedAmount = order.price ? order.amount.mul(order.price) : order.amount;
					}

					if (lockedAmount.gt(0)) {
						const lockedTokenSymbol = order.side === OrderSide.SELL ? baseTokenSymbol : quoteTokenSymbol;
						const currentLocked = lockedInOrdersMap.getOrThrow(lockedTokenSymbol, DECIMAL_0);
						lockedInOrdersMap.set(lockedTokenSymbol, currentLocked.plus(lockedAmount), true);
					}
				}

				// Calculate withdrawable amounts for filled orders
				if (order.status === OrderStatus.FILLED && order.price) {
					let withdrawAmount: Decimal;

					if (order.side === OrderSide.SELL) {
						// For filled SELL orders, withdrawable is the quote token amount received
						withdrawAmount = order.amount.mul(order.price);
					} else {
						// For filled BUY orders, withdrawable is the base token amount received
						withdrawAmount = order.amount;
					}

					if (withdrawAmount.gt(0)) {
						const withdrawTokenSymbol = order.side === OrderSide.SELL ? quoteTokenSymbol : baseTokenSymbol;
						const currentWithdrawable = withdrawableMap.getOrThrow(withdrawTokenSymbol, DECIMAL_0);
						withdrawableMap.set(withdrawTokenSymbol, currentWithdrawable.plus(withdrawAmount), true);
					}
				}
			}
		}

		const tokensBalancesMap = MMap<TokenSymbol, TokenBalance>();
		for (const token of tokens.values()) {
			const free = freeBalances.getOrThrow(token.symbol, DECIMAL_0);
			const lockedInOrders = lockedInOrdersMap.getOrThrow(token.symbol, DECIMAL_0);
			const withdrawable = withdrawableMap.getOrThrow(token.symbol, DECIMAL_0);
			const lockedInPools = DECIMAL_0; // Not implemented
			const total = free.plus(lockedInOrders).plus(lockedInPools).plus(withdrawable);

			const tokenBalance: BaseBalance = {
				free,
				lockedInOrders,
				lockedInPools,
				withdrawable,
				total
			};

			// Get conversion rates using THORChain oracle prices (fallback to ticker if not available)
			let conversionRateNativeToken: TickerPrice = DECIMAL_0;
			if (token.symbol !== this.nativeToken.symbol) {
				// Try oracle price first, then fallback to ticker
				const tokenOraclePrice = oraclePrices.get(token.symbol);
				const nativeOraclePrice = oraclePrices.get(this.nativeToken.symbol);

				if (tokenOraclePrice && nativeOraclePrice && nativeOraclePrice.gt(DECIMAL_0)) {
					conversionRateNativeToken = tokenOraclePrice.div(nativeOraclePrice);
				} else {
					// 2. Try base layer pool price as fallback
					const tokenPoolPrice = poolPrices.get(token.symbol);
					const nativePoolPrice = poolPrices.get(this.nativeToken.symbol);

					if (tokenPoolPrice && nativePoolPrice && nativePoolPrice.gt(DECIMAL_0)) {
						conversionRateNativeToken = tokenPoolPrice.div(nativePoolPrice);
					} else {
						// 3. Fallback to ticker prices (most reliable)
						const quotingMarketTicker = await this.getTicker({ marketSymbol: `${token.symbol}/${this.nativeToken.symbol}` }).catch(() => null);
						if (quotingMarketTicker?.middlePrice.baseToQuote) {
							conversionRateNativeToken = quotingMarketTicker.middlePrice.baseToQuote;
						} else {
							// If direct market doesn't exist, try to calculate via RUJI-USDC market
							const rujiUSDCTicker = await this.getTicker({ marketSymbol: `${this.nativeToken.symbol}/${this.usdToken.symbol}` }).catch(() => null);
							const tokenUSDTicker = await this.getTicker({ marketSymbol: `${token.symbol}/${this.usdToken.symbol}` }).catch(() => null);

							if (rujiUSDCTicker?.middlePrice.baseToQuote && tokenUSDTicker?.middlePrice.baseToQuote) {
								// Calculate: (token/USDC) / (RUJI/USDC) = token/RUJI
								conversionRateNativeToken = tokenUSDTicker.middlePrice.baseToQuote.div(rujiUSDCTicker.middlePrice.baseToQuote);
							}
						}
					}
				}
			} else {
				conversionRateNativeToken = DECIMAL_1;
			}

			let conversionRateUSD: TickerPrice = DECIMAL_0;
			if (token.symbol !== this.usdToken.symbol) {
				// 1. Try enshrined oracle price first (direct USD price)
				const tokenOraclePrice = oraclePrices.get(token.symbol);

				if (tokenOraclePrice) {
					conversionRateUSD = tokenOraclePrice;
				} else {
					// 2. Try base layer pool price as fallback (convert via RUNE)
					const tokenPoolPrice = poolPrices.get(token.symbol);
					if (tokenPoolPrice) {
						// Get RUNE USD price directly (not via nativeToken.symbol)
						const runeUSDPrice = oraclePrices.get('RUNE');
						if (runeUSDPrice && runeUSDPrice.gt(DECIMAL_0)) {
							conversionRateUSD = tokenPoolPrice.mul(runeUSDPrice);
						}
					}

					// 3. If still no price, fallback to ticker
					if (conversionRateUSD.eq(DECIMAL_0)) {
						const quotingMarketTicker = await this.getTicker({ marketSymbol: `${token.symbol}/${this.usdToken.symbol}` }).catch(() => null);
						if (quotingMarketTicker?.middlePrice.baseToQuote) {
							conversionRateUSD = quotingMarketTicker.middlePrice.baseToQuote;
						} else {
							// If direct market doesn't exist, try to calculate via RUJI-USDC market
							const rujiUSDCTicker = await this.getTicker({ marketSymbol: `${this.nativeToken.symbol}/${this.usdToken.symbol}` }).catch(() => null);
							const tokenRujiTicker = await this.getTicker({ marketSymbol: `${token.symbol}/${this.nativeToken.symbol}` }).catch(() => null);

							if (rujiUSDCTicker?.middlePrice.baseToQuote && tokenRujiTicker?.middlePrice.baseToQuote) {
								// Calculate: (token/RUJI) * (RUJI/USDC) = token/USDC
								conversionRateUSD = tokenRujiTicker.middlePrice.baseToQuote.mul(rujiUSDCTicker.middlePrice.baseToQuote);
							}
						}
					}
				}
			} else {
				conversionRateUSD = DECIMAL_1;
			}

			// Convert balances to native token (RUJI) amounts
			const nativeTokenBalance: BaseBalance = {
				free: free.mul(conversionRateNativeToken),
				lockedInOrders: lockedInOrders.mul(conversionRateNativeToken),
				lockedInPools: lockedInPools.mul(conversionRateNativeToken),
				withdrawable: withdrawable.mul(conversionRateNativeToken),
				total: total.mul(conversionRateNativeToken)
			};

			// Convert balances to USD token (USDC) amounts
			const usdTokenBalance: BaseBalance = {
				free: free.mul(conversionRateUSD),
				lockedInOrders: lockedInOrders.mul(conversionRateUSD),
				lockedInPools: lockedInPools.mul(conversionRateUSD),
				withdrawable: withdrawable.mul(conversionRateUSD),
				total: total.mul(conversionRateUSD)
			};

			const baseBalanceWithNativeQuotation: BaseBalanceWithQuotation = {
				...nativeTokenBalance,
				quotation: {
					token: this.nativeToken || token,
					tokenToQuote: conversionRateNativeToken,
					quoteToToken: conversionRateNativeToken.gt(DECIMAL_0) ? DECIMAL_1.div(conversionRateNativeToken) : DECIMAL_0
				}
			};
			const baseBalanceWithUSDQuotation: BaseBalanceWithQuotation = {
				...usdTokenBalance,
				quotation: {
					token: this.usdToken || token,
					tokenToQuote: conversionRateUSD,
					quoteToToken: conversionRateUSD.gt(DECIMAL_0) ? DECIMAL_1.div(conversionRateUSD) : DECIMAL_0
				}
			};

			const baseTokenBalance: BaseTokenBalance = {
				token: tokenBalance,
				nativeToken: baseBalanceWithNativeQuotation,
				usdToken: baseBalanceWithUSDQuotation
			};

			tokensBalancesMap.set(
				token.symbol,
				{
					token,
					balances: baseTokenBalance
				},
				true
			);
		}

		const totalNative: BaseBalance = {
			free: freeBalances.getOrThrow(this.nativeToken.symbol, DECIMAL_0),
			lockedInOrders: lockedInOrdersMap.getOrThrow(this.nativeToken.symbol, DECIMAL_0),
			lockedInPools: DECIMAL_0,
			withdrawable: withdrawableMap.getOrThrow(this.nativeToken.symbol, DECIMAL_0),
			total: freeBalances.getOrThrow(this.nativeToken.symbol, DECIMAL_0).plus(lockedInOrdersMap.getOrThrow(this.nativeToken.symbol, DECIMAL_0)).plus(DECIMAL_0).plus(withdrawableMap.getOrThrow(this.nativeToken.symbol, DECIMAL_0))
		};

		const totalUSD: BaseBalance = {
			free: freeBalances.getOrThrow(this.usdToken.symbol, DECIMAL_0),
			lockedInOrders: lockedInOrdersMap.getOrThrow(this.usdToken.symbol, DECIMAL_0),
			lockedInPools: DECIMAL_0,
			withdrawable: withdrawableMap.getOrThrow(this.usdToken.symbol, DECIMAL_0),
			total: freeBalances.getOrThrow(this.usdToken.symbol, DECIMAL_0).plus(lockedInOrdersMap.getOrThrow(this.usdToken.symbol, DECIMAL_0)).plus(DECIMAL_0).plus(withdrawableMap.getOrThrow(this.usdToken.symbol, DECIMAL_0))
		};

		const balances: Balances = {
			tokens: tokensBalancesMap,
			total: {
				nativeToken: totalNative,
				usdToken: totalUSD
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

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		const orders = await this.getOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orderTypes: orderType ? [orderType] : undefined,
			orderSides: orderSide ? [orderSide] : undefined,
			orderStatuses: orderStatus ? [orderStatus] : undefined,
			orderPrices: orderPrice ? [orderPrice] : undefined,
			maximumNumberOfOrders: 1
		});
		const order = orders.first();

		if (!order) {
			throw new Error(`Order not found: ${request.toString()}`);
		}

		return order as FinGetOrderResponse;
	}

	/**
	 * Get orders
	 * @param request - The request object
	 * @returns The orders response
	 */
	async getOrders(request: FinGetOrdersRequest): Promise<FinGetOrdersResponse> {
		let { ownerAddress, owner, marketAddress, marketSymbol, market, orderTypes, orderSides, orderStatuses, orderPrices, orderIds, orders, maximumNumberOfOrders } = request;

		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase() || undefined;
		marketSymbol = marketSymbol?.trim().toUpperCase() || undefined;
		orderTypes = orderTypes ? MList(orderTypes?.map((orderType: OrderType) => OrderType[orderType?.trim().toUpperCase() as keyof typeof OrderType])) : undefined;
		orderSides = orderSides ? MList(orderSides?.map((orderSide: OrderSide) => OrderSide[orderSide?.trim().toUpperCase() as keyof typeof OrderSide])) : undefined;
		orderStatuses = orderStatuses ? MList(orderStatuses?.map((orderStatus: OrderStatus) => OrderStatus[orderStatus?.trim().toUpperCase() as keyof typeof OrderStatus])) : undefined;
		orderPrices = orderPrices ? MList(orderPrices?.map((orderPrice: OrderPrice) => Decimal(orderPrice))) : undefined;
		maximumNumberOfOrders = maximumNumberOfOrders ? Number(maximumNumberOfOrders) : undefined;

		if (!ownerAddress && !owner) {
			throw new Error("Owner address is required");
		}
		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address or market symbol is required");
		}

		// Validate that at least one filtering criteria is provided when using orderIds or orders
		if ((orderIds && !List.isList(orderIds) ? orderIds.length > 0 : !orderIds?.isEmpty()) ||
			(orders && !List.isList(orders) ? orders.length > 0 : !orders?.isEmpty())) {
			if (!ownerAddress && !marketAddress && !marketSymbol && !market) {
				throw new Error("When filtering by orderIds or orders, at least one of ownerAddress, marketAddress, marketSymbol, or market must be provided");
			}
		}

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		// Sanitize orderIds and extract order IDs from orders objects
		const sanitizedOrderIds = MList<OrderId>();

		// Sanitize orderIds if provided
		if (orderIds && !List.isList(orderIds) ? orderIds.length > 0 : !orderIds?.isEmpty()) {
			const orderIdsList = List.isList(orderIds) ? orderIds : MList<OrderId>(orderIds);
			orderIdsList.forEach((orderId: OrderId) => {
				if (orderId && typeof orderId === 'string') {
					const sanitizedId = orderId.trim().toLowerCase();
					if (sanitizedId && !sanitizedOrderIds.includes(sanitizedId)) {
						sanitizedOrderIds.push(sanitizedId);
					}
				}
			});
		}

		// Sanitize orders by transforming into a list and extracting/sanitizing order IDs
		if (orders && !List.isList(orders) ? orders.length > 0 : !orders?.isEmpty()) {
			// Ensure orders is a List
			const ordersList = List.isList(orders) ? orders : MList<Order>(orders);

			// Extract and sanitize order IDs from order objects
			ordersList.forEach((orderObj: Order) => {
				if (orderObj && orderObj.id && typeof orderObj.id === 'string') {
					const sanitizedId = orderObj.id.trim().toLowerCase();
					if (sanitizedId && !sanitizedOrderIds.includes(sanitizedId)) {
						sanitizedOrderIds.push(sanitizedId);
					}
				}
			});
		}

		const query = {
			orders: {
				owner: ownerAddress,
				limit: Number(properties.getAs<string>('rujira.orders.maximumNumberOfOrders')),
				offset: 0
			}
		} as {
			orders: {
				owner: string,
				limit: number,
				offset: number
			}
		};

		const result = await this.parent.cosmClientQueryContractSmart(market.address, query);
		// Example response:
		// 	{
		// 		"owner": "thor1gsgx5xtw82r8qw06mrcxjzypuynqwjxcugk5fy",
		// 		"side": "quote",
		// 		"price": {
		// 			"fixed": "0.04"
		// 		},
		// 		"rate": "0.04",
		// 		"updated_at": "1753359648989354207",
		// 		"offer": "5400000", // The amount of the order (it's the direct asset)
		// 		"remaining": "5400000", // The remaining amount of the order (it's the direct asset)
		// 		"filled": "0" // The amount of the order that has been filled (it's the opposite asset)
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

		let filteredOrders = MMap<OrderId, Order>();

		for (const rawOrder of rawOrders) {
			const type = OrderType.FIXED_PRICE;
			const side = rawOrder.side === 'quote' ? OrderSide.BUY : OrderSide.SELL;
			const price = Decimal(rawOrder.price.fixed);
			const amount = Decimal(rawOrder.offer).div(DECIMAL_10.pow(market.decimals));
			const filledPercentage = DECIMAL_100.minus(DECIMAL_100.mul(Decimal(rawOrder.remaining).div(Decimal(rawOrder.offer))));
			const status = filledPercentage.eq(DECIMAL_0) ? OrderStatus.OPEN : filledPercentage.eq(DECIMAL_100) ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED;
			const id = this.getOrderId({
				ownerAddress,
				market,
				orderType: type,
				orderSide: side,
				orderPrice: price
			});

			const order = {
				id,
				market,
				ownerAddress,
				type,
				side,
				price,
				amount,
				filledPercentage,
				status,
				raw: rawOrder
			} as Order;

			filteredOrders.set(get<OrderId>(order.id), order, true);
		}

		filteredOrders = filteredOrders.filter((order: Order) => {
			// Filter by sanitized order IDs (merged from orderIds and orders)
			if (sanitizedOrderIds && !sanitizedOrderIds.isEmpty()) {
				if (!order.id || !sanitizedOrderIds.includes(order.id)) {
				return false;
			}
			}

			// Filter by owner address
			if (ownerAddress && order.ownerAddress !== ownerAddress) {
				return false;
			}

			// Filter by market address
			if (marketAddress && order.market.address !== marketAddress) {
				return false;
			}

			// Filter by market symbol
			if (marketSymbol && order.market.symbol !== marketSymbol) {
				return false;
			}

			// Filter by order types
			if (orderTypes && !orderTypes.includes(order.type)) {
				return false;
			}

			// Filter by order sides
			if (orderSides && !orderSides.includes(order.side)) {
				return false;
			}

			// Filter by order statuses
			if (orderStatuses && !orderStatuses.includes(order.status)) {
				return false;
			}

			// Filter by order prices
			if (orderPrices && (!order.price || !orderPrices.includes(get<OrderPrice>(order.price)))) {
				return false;
			}

			return true;
		});

		if (maximumNumberOfOrders && maximumNumberOfOrders > 0) {
			filteredOrders = filteredOrders.slice(0, maximumNumberOfOrders);
		}

		return filteredOrders as FinGetOrdersResponse;
	}


	/**
	 * Place a single order (wrapper for createOrders)
	 * @param request - The request object
	 * @returns The response for the created order
	 */
	async placeOrder(request: FinPlaceOrderRequest): Promise<FinPlaceOrderResponse> {
		let { ownerAddress, owner, marketAddress, marketSymbol, market, side, type, amount, price } = request;

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				place: MList<FinPlaceOrderRequest>(
					[
						{
							ownerAddress,
							owner,
							marketAddress,
							marketSymbol,
							market,
							side, type, amount, price
						}
					]
				)
			}
		});

		const result = {
			order: get<Order>(persistedOrders.placedOrders?.first()),
			transaction: get<Transaction>(persistedOrders.transactions.first())
		}

		return result;
	}


	/**
	 * Place multiple orders
	 * @param request - The request object
	 * @returns The response for the created orders or null if failed
	 */
	async placeOrders(request: FinPlaceOrdersRequest): Promise<FinPlaceOrdersResponse> {
		let { ownerAddress, owner, orders } = request;

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			orders: {
				place: MList<FinPlaceOrderRequest>(orders)
			}
		});

		const result = {
			orders: get<Map<OrderId, Order>>(persistedOrders.placedOrders),
			transactions: persistedOrders.transactions
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

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				replace: MList<FinPlaceOrderRequest>([{
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
			}
		});

		const result = {
			order: get<Order>(persistedOrders.replacedOrders?.first()),
			transaction: get<Transaction>(persistedOrders.transactions.first())
		}

		return result;
	}

	/**
	 * Replace multiple orders
	 * @param request - The request object
	 * @returns The response for the replaced orders
	 */
	async replaceOrders(request: FinReplaceOrdersRequest): Promise<FinReplaceOrdersResponse> {
		let { ownerAddress, owner, orders } = request;

		// Extract market information from the first order since all orders should be in the same market
		const firstOrder = Array.isArray(orders) ? orders[0] : orders.first();
		if (!firstOrder) {
			throw new Error("At least one order is required for replacement");
		}

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketSymbol: firstOrder.marketSymbol,
			marketAddress: firstOrder.marketAddress,
			market: firstOrder.market,
			orders: {
				replace: MList<FinPlaceOrderRequest>(orders)
			}
		});

		const result = {
			orders: get<Map<OrderId, Order>>(persistedOrders.replacedOrders),
			transactions: persistedOrders.transactions
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

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				cancel: orderId ? MList<OrderId>([orderId]) : MList<Order>([get<Order>(order)])
			}
		});

		const result = {
			order: get<Order>(persistedOrders.cancelledOrders?.first()),
			transaction: get<Transaction>(persistedOrders.transactions.first())
		}

		return result;
	}

	/**
	 * Cancel orders (only cancels the specified orderIds or orders)
	 * @param request - The request object
	 * @returns The response for the canceled orders
	 */
	async cancelOrders(request: FinCancelOrdersRequest): Promise<FinCancelOrdersResponse> {
		let { orderIds, orders, ownerAddress, owner, marketAddress, marketSymbol, market } = request;

		// Handle both orderIds and orders parameters correctly
		let cancelList: List<OrderId> | List<Order>;
		if (orderIds && (Array.isArray(orderIds) ? orderIds.length > 0 : orderIds.size > 0)) {
			cancelList = MList<OrderId>(orderIds);
		} else if (orders && (Array.isArray(orders) ? orders.length > 0 : orders.size > 0)) {
			cancelList = MList<Order>(orders);
		} else {
			throw new Error("Either orderIds or orders must be provided for cancellation");
		}

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				cancel: cancelList
			}
		})

		const result = {
			orders: get<Map<OrderId, Order>>(persistedOrders.cancelledOrders),
			transactions: persistedOrders.transactions
		};

		return result;
	}

	/**
	 * Cancel all orders for an owner in a market
	 * @param request - The request object
	 * @returns The response for the canceled orders
	 */
	async cancelAllOrders(request: FinCancelAllOrdersRequest): Promise<FinCancelAllOrdersResponse> {
		let { ownerAddress, owner, marketAddress, marketSymbol, market } = request;

		const allOpenOrders = await this.getOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED]
		});

		if (allOpenOrders.isEmpty()) {
			return {
				orders: MMap<OrderId, Order>(),
				transactions: MMap<TransactionHash, Transaction>()
			};
		}

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				cancel: allOpenOrders.valueSeq().toList()
			}
		})

		const result = {
			orders: get<Map<OrderId, Order>>(persistedOrders.cancelledOrders),
			transactions: persistedOrders.transactions
		};

		return result;
	}

	/**
	 * Withdraw from market (withdraw filled orders for a user in a market)
	 * @param request - The request object
	 * @returns The response for the withdrawn orders
	 */
	async withdrawFilledOrders(request: FinWithdrawFilledOrdersRequest): Promise<FinWithdrawFilledOrdersResponse> {
		let { ownerAddress, owner, marketAddress, marketSymbol, market } = request;

		const allFilledOrders = await this.getOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orderStatuses: [OrderStatus.FILLED]
		});

		if (allFilledOrders.isEmpty()) {
			return {
				orders: MMap<OrderId, Order>(),
				transactions: MMap<TransactionHash, Transaction>()
			};
		}

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				withdraw: allFilledOrders.valueSeq().toList()
			}
		});

		const result = {
			orders: get<Map<OrderId, Order>>(persistedOrders.withdrawnOrders),
			transactions: persistedOrders.transactions
		};

		return result;
	}

	/**
	 * Unified method to persist orders (place, replace, cancel, withdraw)
	 * @param request - The unified request object
	 * @returns The unified response object
	 */
	public async persistOrders(request: FinPersistOrdersRequest): Promise<FinPersistOrdersResponse> {
		let { ownerAddress, owner, marketAddress, marketSymbol, market, orders } = request;

		// ===== SANITIZATION =====
		ownerAddress = this.getWalletAddress(ownerAddress, owner);
		marketAddress = marketAddress?.trim().toLowerCase();
		marketSymbol = marketSymbol?.trim().toUpperCase();

		// Sanitize place orders
		if (orders.place) {
			orders.place = MList<FinPlaceOrderRequest>(orders.place.map((order: FinPlaceOrderRequest) => ({
				...order,
				ownerAddress: this.getWalletAddress(order.ownerAddress, order.owner),
				marketAddress: order.marketAddress?.trim().toLowerCase(),
				marketSymbol: order.marketSymbol?.trim().toUpperCase(),
				side: OrderSide[order.side?.trim().toUpperCase() as keyof typeof OrderSide] || undefined,
				type: OrderType[order.type?.trim().toUpperCase() as keyof typeof OrderType] || undefined,
				amount: Decimal(order.amount),
				price: order.price ? Decimal(order.price) : undefined,
			})));
		}

		// Sanitize replace orders
		if (orders.replace) {
			orders.replace = MList<FinReplaceOrderRequest>(orders.replace.map((order: FinReplaceOrderRequest) => ({
				...order,
				ownerAddress: this.getWalletAddress(order.ownerAddress, order.owner),
				marketAddress: order.marketAddress?.trim().toLowerCase(),
				marketSymbol: order.marketSymbol?.trim().toUpperCase(),
				side: OrderSide[order.side?.trim().toUpperCase() as keyof typeof OrderSide] || undefined,
				type: OrderType[order.type?.trim().toUpperCase() as keyof typeof OrderType] || undefined,
				amount: Decimal(order.amount),
				price: order.price ? Decimal(order.price) : undefined,
			})));
		}

		// Sanitize cancel orders
		if (orders.cancel) {
			const cancelOrderIds = MList<OrderId>();
			orders.cancel.forEach((item: OrderId | Order) => {
				if (typeof item === 'string') {
					cancelOrderIds.push(item.trim()); // Keep original case for order IDs
				} else if (item.id) {
					cancelOrderIds.push(item.id.trim()); // Keep original case for order IDs
				}
			});
			orders.cancel = cancelOrderIds;
		}

		// Sanitize withdraw filled orders
		if (orders.withdraw) {
			const withdrawOrderIds = MList<OrderId>();
			orders.withdraw.forEach((item: OrderId | Order) => {
				if (typeof item === 'string') {
					withdrawOrderIds.push(item.trim()); // Keep original case for order IDs
				} else if (item.id) {
					withdrawOrderIds.push(item.id.trim()); // Keep original case for order IDs
				}
			});
			orders.withdraw = withdrawOrderIds;
		}

		// ===== VALIDATION =====
		if (!ownerAddress) {
			throw new Error("Owner address or owner wallet is required");
		}

		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Market address, market symbol, or market object is required");
		}

		// Validate that all orders use the same market
		const validateMarket = (orders: any[], operation: string) => {
			if (orders && orders.length > 0) {
				orders.forEach((order: any) => {
					if (order.marketAddress && order.marketAddress !== marketAddress) {
						throw new Error(`${operation} orders must use the same market. Expected: ${marketAddress}, Got: ${order.marketAddress}`);
					}
					if (order.marketSymbol && order.marketSymbol !== marketSymbol) {
						throw new Error(`${operation} orders must use the same market. Expected: ${marketSymbol}, Got: ${order.marketSymbol}`);
					}
				});
			}
		};

		validateMarket(orders.place?.toArray() || [], 'Place');
		validateMarket(orders.replace?.toArray() || [], 'Replace');

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		// Validate place orders
		if (orders.place) {
			orders.place.forEach((order: FinPlaceOrderRequest) => {
				if (!order.side || !order.type || !order.amount) {
					throw new Error("Order side, type, and amount are required for place orders");
				}
				if (order.type === OrderType.FIXED_PRICE && !order.price) {
					throw new Error("Order price is required for limit place orders");
				}
			});
		}

		// Validate replace orders
		if (orders.replace) {
			orders.replace.forEach((order: FinReplaceOrderRequest) => {
				if (!order.side || !order.type || !order.amount) {
					throw new Error("Order side, type, and amount are required for replace orders");
				}
				if (order.type === OrderType.FIXED_PRICE && !order.price) {
					throw new Error("Order price is required for limit replace orders");
				}
			});
		}

		// Validate cancel orders
		if (orders.cancel) {
			if (orders.cancel.isEmpty()) {
				throw new Error("Valid order IDs are required for cancellation");
			}
		}

		// Validate withdraw filled orders
		if (orders.withdraw) {
			if (orders.withdraw.isEmpty()) {
				throw new Error("Valid order IDs are required for withdrawal");
			}
		}

		// ===== INITIALIZATION =====
		const contractAddress = market.address;
		const transactions = MMap<TransactionHash, Transaction>();
		const ordersMap = MMap<string, Map<OrderId, Order>>();

		// Get existing orders to check their status (open, partially filled, filled orders)
		const existingOrders = await this.getOrders({
			ownerAddress,
			market,
			orderTypes: [OrderType.FIXED_PRICE],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED]
		});

		// Build the complete order message structure
		const persistMessages: any[] = [];

		// Process place orders
		if (orders.place && !orders.place.isEmpty()) {
			const placeOrdersMap = MMap<OrderId, Order>();

			orders.place.forEach((order: FinPlaceOrderRequest) => {
				const orderId = this.getOrderId({
					ownerAddress,
					market,
					order
				});

				// Create message with exact format from playground
				const side = order.side === OrderSide.BUY ? 'quote' : 'base';
				// Use precise price formatting like playgrounds
				const price = order.price ? order.price.toFixed(18) : '0.000000000000000000';
				// For BUY orders, amount should be in quote token decimals (Ex.: USDC = 6)
				// For SELL orders, amount should be in base token decimals (Ex.: RUJI = 6)
				const amount = order.amount.mul(10 ** (order.side === OrderSide.BUY ? market.tokens.quote.decimals : market.tokens.base.decimals)).toFixed(0);

				persistMessages.push([side, { fixed: price }, amount]);

				// Create a proper Order object at this moment
				const orderObject: Order = {
					id: orderId,
					market: market,
					ownerAddress: ownerAddress,
					type: order.type,
					side: order.side,
					price: order.price,
					amount: order.amount,
					filledPercentage: DECIMAL_0,
					status: OrderStatus.OPEN,
					creationTimestamp: Date.now(),
					updateTimestamp: Date.now(),
					raw: order
				};
				placeOrdersMap.set(orderId, orderObject, true);
			});
			ordersMap.set('place', placeOrdersMap);
		}

		// Process replace orders
		if (orders.replace && !orders.replace.isEmpty()) {
			const replaceOrdersMap = MMap<OrderId, Order>();

			orders.replace.forEach((order: FinReplaceOrderRequest) => {
				const orderId = this.getOrderId({
					ownerAddress,
					market: market,
					orderType: order.type,
					orderSide: order.side,
					orderPrice: order.price
				});

				// Check if order exists in existing orders (same validation as cancel orders)
				const existingOrder = existingOrders.get(orderId);
				if (!existingOrder) {
					throw new Error(`Order not found for replacement: ${orderId}`);
				}

				// Validate order status for replacement (same validation as cancel orders)
				if (existingOrder.status !== OrderStatus.OPEN) {
					throw new Error(`Cannot replace order ${orderId}: status is ${existingOrder.status}, must be ${OrderStatus.OPEN}`);
				}

				// Create message with exact format from playground
				const side = order.side === OrderSide.BUY ? 'quote' : 'base';
				// Use precise price formatting like playgrounds
				const price = order.price ? order.price.toFixed(18) : '0.000000000000000000';
				// For BUY orders, amount should be in quote token decimals (Ex.: USDC = 6)
				// For SELL orders, amount should be in base token decimals (Ex.: RUJI = 6)
				const amount = order.amount.mul(10 ** (order.side === OrderSide.BUY ? market.tokens.quote.decimals : market.tokens.base.decimals)).toFixed(0);

				persistMessages.push([side, { fixed: price }, amount]);

				// Create a proper Order object using existing order and new amount
				const orderObject: Order = {
					id: orderId,
					market: market,
					ownerAddress: ownerAddress,
					type: order.type,
					side: order.side,
					price: order.price,
					amount: order.amount,
					filledPercentage: DECIMAL_0,
					status: OrderStatus.OPEN,
					creationTimestamp: existingOrder.creationTimestamp, // Keep original creation time
					updateTimestamp: Date.now(), // Update the timestamp
					raw: order
				};
				replaceOrdersMap.set(orderId, orderObject, true);
			});
			ordersMap.set('replace', replaceOrdersMap);
		}

		// Process cancel orders
		if (orders.cancel && !orders.cancel.isEmpty()) {
			const cancelOrdersMap = MMap<OrderId, Order>();

			orders.cancel.forEach((orderId: OrderId) => {
				// Check if order exists in existing orders
				const existingOrder = existingOrders.get(orderId);
				if (!existingOrder) {
					throw new Error(`Order not found: ${orderId}`);
				}

				// Validate order status for cancellation
				if (existingOrder.status !== OrderStatus.OPEN) {
					throw new Error(`Cannot cancel order ${orderId}: status is ${existingOrder.status}, must be ${OrderStatus.OPEN}`);
				}

				// Create cancel message with exact format from playground: [side, { fixed: price }, '0']
				const side = existingOrder.side === OrderSide.BUY ? 'quote' : 'base';
				// Use precise price formatting like playgrounds
				const price = existingOrder.price ? existingOrder.price.toFixed(18) : '0.000000000000000000';

				persistMessages.push([side, { fixed: price }, '0']);

				// Update order status to CANCELLED and update timestamp
				const cancelledOrder: Order = {
					...existingOrder,
					status: OrderStatus.CANCELLED,
					updateTimestamp: Date.now()
				};
				cancelOrdersMap.set(orderId, cancelledOrder, true);
			});
			ordersMap.set('cancel', cancelOrdersMap);
		}

		// Process withdraw orders
		if (orders.withdraw && !orders.withdraw.isEmpty()) {
			const withdrawOrdersMap = MMap<OrderId, Order>();

			orders.withdraw.forEach((orderId: OrderId) => {
				// Check if order exists in existing orders
				const existingOrder = existingOrders.get(orderId);
				if (!existingOrder) {
					throw new Error(`Order not found: ${orderId}`);
				}

				// Validate order status for withdrawal
				if (existingOrder.status !== OrderStatus.FILLED) {
					throw new Error(`Cannot withdraw order ${orderId}: status is ${existingOrder.status}, must be ${OrderStatus.FILLED}`);
				}

				// Create withdraw message with exact format from playground: [side, { fixed: price }, null]
				const side = existingOrder.side === OrderSide.BUY ? 'quote' : 'base';
				// Use precise price formatting like playgrounds
				const price = existingOrder.price ? existingOrder.price.toFixed(18) : '0.000000000000000000';

				persistMessages.push([side, { fixed: price }, null]);

				// Update timestamp for withdrawn order
				const withdrawnOrder: Order = {
					...existingOrder,
					updateTimestamp: Date.now()
				};
				withdrawOrdersMap.set(orderId, withdrawnOrder, true);
			});
			ordersMap.set('withdraw', withdrawOrdersMap);
		}

		if (persistMessages.length === 0) {
			throw new Error("No valid orders to persist");
		}

		// Calculate funds for orders
		// IMPORTANT: Only PLACE orders need funds. Replace, cancel and withdraw operations send NO funds.
		let funds: readonly Coin[] | undefined;

		// Only calculate funds if we have place orders (NOT replace orders)
		const hasPlaceOrders = (orders.place && !orders.place.isEmpty());

		if (hasPlaceOrders) {
			const buyOrders = orders.place?.filter((order: FinPlaceOrderRequest) => order.side === OrderSide.BUY) || MList<FinPlaceOrderRequest>();
			const sellOrders = orders.place?.filter((order: FinPlaceOrderRequest) => order.side === OrderSide.SELL) || MList<FinPlaceOrderRequest>();

		// For BUY orders (place only), we need quote tokens (USDC)
		if (buyOrders && buyOrders.size > 0) {
			let totalQuoteAmount = DECIMAL_0;

			// For place orders, use the full amount
			buyOrders.forEach((order: FinPlaceOrderRequest) => {
				totalQuoteAmount = totalQuoteAmount.plus(order.amount);
			});

			// Convert to raw amount (no buffer needed - contract handles fees)
			const rawQuoteAmount = totalQuoteAmount.mul(10 ** market.tokens.quote.decimals).toFixed(0);

			funds = [{
				denom: market.tokens.quote.address,
				amount: rawQuoteAmount
			}];
		}

		// For SELL orders (place only), we need base tokens (RUJI)
		if (sellOrders && sellOrders.size > 0) {
			let totalBaseAmount = DECIMAL_0;

			// For place orders, use the full amount
			sellOrders.forEach((order: FinPlaceOrderRequest) => {
				totalBaseAmount = totalBaseAmount.plus(order.amount);
			});

			// Convert to raw amount (no buffer needed - contract handles fees)
			const rawBaseAmount = totalBaseAmount.mul(10 ** market.tokens.base.decimals).toFixed(0);

			// If we already have funds for BUY orders, add to it, otherwise create new
			if (funds) {
				funds = [
					...funds,
					{
						denom: market.tokens.base.address,
						amount: rawBaseAmount
					}
				];
			} else {
				funds = [{
					denom: market.tokens.base.address,
					amount: rawBaseAmount
				}];
			}
		}
		} // End of hasPlaceOrders conditional

		// Execute the transaction
		const response = await this.cosmClient.execute(
			ownerAddress,
			contractAddress,
			{
				order: [persistMessages, null]
			},
			'auto',
			undefined,
			funds
		);

		// Get the transaction details
		const transaction = await this.getTransaction({ hash: response.transactionHash });
		transactions.set(transaction.hash, transaction, true);

		// Build the response
		const result: FinPersistOrdersResponse = {
			placedOrders: ordersMap.get('place'),
			replacedOrders: ordersMap.get('replace'),
			cancelledOrders: ordersMap.get('cancel'),
			withdrawnOrders: ordersMap.get('withdraw'),
			transactions: transactions
		};

		return result;
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
	 * Get the order id
	 * @param options - The options
	 * @returns The order id
	 */
	public getOrderId(options: {
		ownerAddress?: WalletAddress;
		market?: Market;
		order?: Order | FinPlaceOrderRequest | FinReplaceOrderRequest;
		orderType?: OrderType;
		orderSide?: OrderSide;
		orderPrice?: Decimal;
	}): OrderId {
		let { ownerAddress, market, order, orderType, orderSide, orderPrice } = options;

		if (!ownerAddress) {
			ownerAddress = get<Order>(order).ownerAddress;
		}

		const marketSymbol: MarketSymbol = order?.market?.symbol || get<Market>(market).symbol;

		if (!orderType) {
			orderType = get<Order>(order).type;
		}

		if (!orderSide) {
			orderSide = get<Order>(order).side;
		}

		if (!orderPrice) {
			orderPrice = get<Order>(order).price;
		}

		return `owner:${ownerAddress}|market:${marketSymbol}|type:${orderType}|side:${orderSide}|price:${orderPrice}`;
	}
}
