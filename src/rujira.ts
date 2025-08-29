import { ExecuteResult, JsonObject, SigningCosmWasmClient, SigningCosmWasmClientOptions } from "@cosmjs/cosmwasm-stargate";
import { Bip39, EnglishMnemonic, Slip10, Slip10Curve, stringToPath } from "@cosmjs/crypto";
import { fromBase64 } from "@cosmjs/encoding";
import { AccountData, Coin, DirectSecp256k1Wallet, OfflineSigner } from "@cosmjs/proto-signing";
import { GasPrice, HttpEndpoint, StdFee } from "@cosmjs/stargate";
import * as Indicators from "@ixjb94/indicators-js";
import cacheManager, { Cacheable, CacheManagerOptions } from "@type-cacheable/core";
import { useAdapter } from "@type-cacheable/lru-cache-adapter";
import Decimal from 'decimal.js';
import * as fs from 'fs';
import { LRUCache } from 'lru-cache';
import { loggedClass } from "./annotations";
import { logger } from "./logger";
import { properties } from "./properties";
import {
	Amount,
	Balances,
	BaseBalance,
	BaseBalanceWithQuotation,
	BaseTokenBalance,
	Candle,
	CandleInterval,
	CandleTimestamp,
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
	FinGetTickersRequest,
	FinGetTickersResponse,
	FinGetTokenRequest,
	FinGetTokenResponse,
	FinGetTokensRequest,
	FinGetTokensResponse,
	FinGetTransactionRequest,
	FinGetTransactionResponse,
	FinInitializeOptions,
	FinPersistOrdersRequest,
	FinPersistOrdersResponse,
	FinPlaceOrderRequest,
	FinPlaceOrderResponse,
	FinPlaceOrdersRequest,
	FinPlaceOrdersResponse,
	FinReplaceOrderRequest,
	FinReplaceOrderResponse,
	FinReplaceOrdersRequest,
	FinReplaceOrdersResponse,
	FinWithdrawAllFilledOrdersRequest,
	FinWithdrawAllFilledOrdersResponse,
	Indicator,
	IndicatorData,
	IndicatorId,
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
	OrderDeviationInBasisPoints,
	OrderDeviationInPercentage,
	OrderId,
	OrderMaximumSlippagePercentage,
	OrderPrice,
	OrderSide,
	OrderStatus,
	OrderType,
	Price,
	RujiraConstructorOptions,
	RujiraInitializeOptions,
	SystemStatus,
	Ticker,
	TickerPrice,
	TickerQuotationToken,
	TickerType,
	Token,
	TokenAddress,
	TokenBalance,
	TokenPrice,
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
import { cast, runWithRetryAndTimeout, sanitizeOrderPrice, sleep, validateOrderPrice } from "./utils";

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
@loggedClass({
	enabled: false,
	logger: logger,
	allowedMethods: [],
	disallowedMethods: [],
	includeStaticMethods: true,
	logStart: true,
	logEnd: true,
	logInput: false,
	logOutput: false,
	logExecutionTime: true,
})
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

		const firstAccount = cast<Array<AccountData>>(await this.directSecp256k1WalletGetAccounts(cosmWallet))[0];

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
@loggedClass({
	enabled: false,
	logger: logger,
	allowedMethods: [],
	disallowedMethods: [],
	includeStaticMethods: true,
	logStart: true,
	logEnd: true,
	logInput: false,
	logOutput: false,
	logExecutionTime: true,
})
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
	 * Get transaction details by hash. This method will fail if the transaction is too old.
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
			return this.tokensByAddress.getOrThrow(address, undefined);
		} else if (symbol) {
			return this.tokensBySymbol.getOrThrow(symbol, undefined);
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
			addresses = cast<List<TokenAddress>>(addresses);
		}
		if (symbols?.size) {
			symbols = cast<List<TokenSymbol>>(symbols);
		}

		const tokens = MMap<TokenSymbol, Token>();

		if (addresses?.size) {
			addresses.forEach((address: TokenAddress) => {
				const token = this.tokensByAddress.getOrThrow(address, undefined);
				if (!token) throw new Error(`Token not found: ${address}`);
				tokens.set(token.symbol, token);
			});
		}

		if (symbols?.size) {
			symbols.forEach((symbol: TokenSymbol, index: number) => {
				const token = this.tokensBySymbol.getOrThrow(symbol, undefined);
				if (!token) throw new Error(`Token not found: ${symbol}`);
				tokens.set(token.symbol, token);
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
			if (!tokens.has(market.tokens.base.symbol)) {
				tokens.set(market.tokens.base.symbol, market.tokens.base);
			}

			// Add quote token if not already added
			if (!tokens.has(market.tokens.quote.symbol)) {
				tokens.set(market.tokens.quote.symbol, market.tokens.quote);
			}
		}

		// Update internal maps
		for (const token of tokens.values()) {
			this.tokensByAddress.set(token.address.toLowerCase(), token);
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

		address = address?.trim()?.toLowerCase();
		symbol = symbol?.trim()?.toUpperCase();

		if (!address && !symbol) {
			throw new Error("You must provide a non-empty address or symbol");
		}

		if (address) {
			return this.marketsByAddress.getOrThrow(address, undefined);
		} else if (symbol) {
			return this.marketsBySymbol.getOrThrow(symbol, undefined);
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

		addresses = cast<List<MarketAddress>>(addresses);
		symbols = cast<List<MarketSymbol>>(symbols);

		const markets = MMap<MarketAddress, Market>();

		addresses.forEach((address: MarketAddress) => {
			const market = this.marketsByAddress.getOrThrow(address, undefined);
			if (!market) throw new Error(`Market not found: ${address}`);
			markets.set(market.symbol, market);
		});

		symbols.forEach((symbol: MarketSymbol) => {
			const market = this.marketsBySymbol.getOrThrow(symbol, undefined);
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
		let json: any;

		const shouldLoadFromFile = properties.getAs<boolean>('rujira.default.markets.loadFromFile');
		if (shouldLoadFromFile) {
			const filePath = properties.getAs<string>('rujira.default.markets.filePath');
			const fileContent = fs.readFileSync(filePath, 'utf8');
			json = JSON.parse(fileContent);
		} else {
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
								variants {
									layer1 { asset }
									secured { asset }
									native { denom }
								}
							}

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
								variants {
									layer1 { asset }
									secured { asset }
									native { denom }
								}
							}
						}
					}
				}
			`;

			const headers = {
				'Content-Type': 'application/json',
				'Authorization': `Bearer: ${properties.getAs<string>('rujira.tokens.graphql')}`,
			};

			const response = await this.parent.fetch(graphQLEndPoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({ query })
			});

			if (!response.ok) {
				throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
			}

			json = await response.json();
		}

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
				decimals: 8, // It seems Rujira fixed the decimals to 8 places for all markets
				tick: Number(pair.tick),
				makerFee: Decimal(pair.feeMaker).div(DECIMAL_100.pow(12)).mul(DECIMAL_100), // 12 decimals for the fee, 2 decimals for the percentage
				takerFee: Decimal(pair.feeTaker).div(DECIMAL_100.pow(12)).mul(DECIMAL_100), // 12 decimals for the fee, 2 decimals for the percentage
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

		// Example response:
		// 	{
		// 		"base": [
		// 			{
		// 				"price": "1.59",
		// 				"total": "15399999876"
		// 			}
		// 		],
		// 		"quote": [
		// 			{
		// 				"price": "1.577",
		// 				"total": "43386912812"
		// 			}
		// 		]
		// 	}
		const rawOrderBook = await this.parent.cosmClientQueryContractSmart(
			market.address,
			{
				book: {
					limit: maximumNumberOfOrders
				}
			}
		) as {
			base: Array<{
				price: string,
				total: string;
			}>,
			quote: Array<{
				price: string;
				total: string;
			}>;
		};

		const parseOrder = (entry: any): OrderBookOrder => ({
			price: Decimal(entry.price),
			amount: Decimal(entry.total).div(DECIMAL_10.pow(market.decimals)),
			raw: entry
		} as OrderBookOrder);

		let asks: List<OrderBookOrder> = MList<{ price: string, total: string }>(rawOrderBook.base || []).map(parseOrder);
		let bids: List<OrderBookOrder> = MList<{ price: string, total: string }>(rawOrderBook.quote || []).map(parseOrder);

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
	 * Get tickers
	 * @param request - The request object
	 * @returns The tickers response
	 */
	async getTickers(request: FinGetTickersRequest): Promise<FinGetTickersResponse> {
		let { tokenAddresses, tokenSymbols, tokens } = request;

		tokenAddresses = MList<TokenAddress>(tokenAddresses?.map((address: TokenAddress) => address.toLowerCase().trim()) || []);
		tokenSymbols = MList<TokenSymbol>(tokenSymbols?.map((symbol: TokenSymbol) => symbol.toUpperCase().trim()) || []);
		tokens = MList<Token>(tokens || []);

		if (tokens.isEmpty()) {
			tokens = (await this.getAllTokens({} as FinGetAllTokensRequest)).valueSeq().toList();
		}

		if (!tokenAddresses.isEmpty() || !tokenSymbols.isEmpty()) {
			tokens = tokens.filter((token: Token) => {
				return tokenAddresses?.includes(token.address)
					|| tokenSymbols?.includes(token.symbol)
			});
		}

		tokenSymbols = tokens.asImmutable().map((token: Token) => token.symbol);
		tokenAddresses = tokens.asImmutable().map((token: Token) => token.address);
		tokens = tokens.asMutable();

		const tickers = MMap<TickerType, Map<TickerQuotationToken, Map<TokenSymbol, TokenPrice>>>();

		tickers.set(TickerType.UNIFIED, MMap<TickerQuotationToken, Map<TokenSymbol, TokenPrice>>());
		tickers.getOrThrow(TickerType.UNIFIED).set(TickerQuotationToken.NATIVE, MMap<TokenSymbol, TokenPrice>());
		tickers.getOrThrow(TickerType.UNIFIED).set(TickerQuotationToken.USD, MMap<TokenSymbol, TokenPrice>());

		tickers.set(TickerType.ORDER_BOOK, MMap<TickerQuotationToken, Map<TokenSymbol, TokenPrice>>());
		tickers.getOrThrow(TickerType.ORDER_BOOK).set(TickerQuotationToken.NATIVE, MMap<TokenSymbol, TokenPrice>());
		tickers.getOrThrow(TickerType.ORDER_BOOK).set(TickerQuotationToken.USD, MMap<TokenSymbol, TokenPrice>());

		tickers.set(TickerType.ORACLE, MMap<TickerQuotationToken, Map<TokenSymbol, TokenPrice>>());
		tickers.getOrThrow(TickerType.ORACLE).set(TickerQuotationToken.NATIVE, MMap<TokenSymbol, TokenPrice>());
		tickers.getOrThrow(TickerType.ORACLE).set(TickerQuotationToken.USD, MMap<TokenSymbol, TokenPrice>());

		tickers.set(TickerType.LAYER_POOL, MMap<TickerQuotationToken, Map<TokenSymbol, TokenPrice>>());
		tickers.getOrThrow(TickerType.LAYER_POOL).set(TickerQuotationToken.NATIVE, MMap<TokenSymbol, TokenPrice>());
		tickers.getOrThrow(TickerType.LAYER_POOL).set(TickerQuotationToken.USD, MMap<TokenSymbol, TokenPrice>());

		const nativeToUSDTicker = (await this.getTicker({ marketSymbol: `${this.nativeToken.symbol}/${this.usdToken.symbol}` }));
		const nativeToUSDPrice = cast<TickerPrice>(nativeToUSDTicker.middlePrice.baseToQuote);
		const USDToNativePrice = cast<TickerPrice>(nativeToUSDTicker.middlePrice.quoteToBase);

		// Fetch THORChain oracle prices as fallback
		let oracleRawBalances: { prices: Array<{ symbol: string; price: string }> } | undefined;
		const oracleResponse = await this.parent.fetch('https://stagenet-thornode.ninerealms.com/thorchain/oracle/prices')
			.catch((exception) => logger.ignoreException(exception, 'Failed to fetch THORChain oracle prices.'));
		if (oracleResponse?.ok) {
			/*
			Example response:
				{
					"prices": [
						{
							"symbol": "ATOM",
							"price": "4.329"
						}
					]
				}
			*/
			oracleRawBalances = await oracleResponse.json() as any;
		}

		// Fetch base layer pool prices as fallback
		let poolRawBalances: Array<{
			asset: string;
			short_code: string;
			status: string;
			pending_inbound_asset: string;
			pending_inbound_rune: string;
			balance_asset: string;
			balance_rune: string;
			asset_tor_price: string;
			pool_units: string;
			LP_units: string;
			synth_units: string;
			synth_supply: string;
			savers_depth: string;
			savers_units: string;
			savers_fill_bps: string;
			savers_capacity_remaining: string;
			synth_mint_paused: boolean;
			synth_supply_remaining: string;
			loan_collateral: string;
			loan_collateral_remaining: string;
			loan_cr: string;
			derived_depth_bps: string;
			trading_halted: boolean;
		}> | undefined;
		const poolResponse = await this.parent.fetch('https://thornode.ninerealms.com/thorchain/pools')
			.catch((exception) => logger.ignoreException(exception, 'Failed to fetch THORChain pool prices.'));
		if (poolResponse?.ok) {
			/*
			Example response:
				[
					{
						"asset": "AVAX.AVAX",
						"short_code": "a",
						"status": "Available",
						"pending_inbound_asset": "0",
						"pending_inbound_rune": "0",
						"balance_asset": "7882937787649",
						"balance_rune": "138875179713185",
						"asset_tor_price": "2282237044",
						"pool_units": "86137445582153",
						"LP_units": "63855886936577",
						"synth_units": "22281558645576",
						"synth_supply": "4078229611474",
						"savers_depth": "3960836133855",
						"savers_units": "3450281845752",
						"savers_fill_bps": "0",
						"savers_capacity_remaining": "0",
						"synth_mint_paused": true,
						"synth_supply_remaining": "5381295733704",
						"loan_collateral": "0",
						"loan_collateral_remaining": "0",
						"loan_cr": "0",
						"derived_depth_bps": "8790",
						"trading_halted": false
					}
				]
			*/
			poolRawBalances = await poolResponse.json() as any;
		}

		for (const token of tokens) {
			const rawOracleBalance = oracleRawBalances?.prices.find((oracleRawBalance: { symbol: string; price: string }) => {
				return token.symbol.toLowerCase().endsWith(oracleRawBalance.symbol.toString().trim().toLowerCase());
			});

			if (rawOracleBalance) {
				const price = new Decimal(rawOracleBalance.price.toString().trim());
				tickers.getOrThrow(TickerType.ORACLE).getOrThrow(TickerQuotationToken.USD).set(token.symbol, price);
				tickers.getOrThrow(TickerType.ORACLE).getOrThrow(TickerQuotationToken.NATIVE).set(token.symbol, price.mul(USDToNativePrice));
			} else {
				// logger.ignoreException(new Error(`Token not found`), `Oracle price token ${token.symbol} not found, ignoring this price.`);
			}

			const rawPoolBalance = poolRawBalances?.find((poolRawBalance: { asset: string; asset_tor_price: string }) => {
				return token.address.toLowerCase() == poolRawBalance.asset.toString().trim().toLowerCase();
			});

			if (rawPoolBalance) {
				const price = new Decimal(rawPoolBalance.asset_tor_price.toString().trim()).div(DECIMAL_10.pow(8));

				tickers.getOrThrow(TickerType.LAYER_POOL).getOrThrow(TickerQuotationToken.USD).set(token.symbol, price);
				tickers.getOrThrow(TickerType.LAYER_POOL).getOrThrow(TickerQuotationToken.NATIVE).set(token.symbol, price.mul(USDToNativePrice));
			} else {
				// logger.ignoreException(new Error(`Token not found`), `Pool price token ${token.symbol} not found, ignoring this price.`);
			}

			try {
				const tokenToUsdMarket = await this.getMarket({ symbol: `${token.symbol}/${this.usdToken.symbol}` });
				const ticker = await this.getTicker({ marketAddress: tokenToUsdMarket.address });
				const price = cast<TickerPrice>(ticker.middlePrice.baseToQuote);

				tickers.getOrThrow(TickerType.ORDER_BOOK).getOrThrow(TickerQuotationToken.USD).set(token.symbol, price);
				tickers.getOrThrow(TickerType.ORDER_BOOK).getOrThrow(TickerQuotationToken.NATIVE).set(token.symbol, price.mul(USDToNativePrice));
			} catch (exception) {
				try {
					const tokenToNativeMarket = await this.getMarket({ symbol: `${token.symbol}/${this.nativeToken.symbol}` });
					const ticker = await this.getTicker({ marketAddress: tokenToNativeMarket.address });
					const price = cast<TickerPrice>(ticker.middlePrice.baseToQuote);
					tickers.getOrThrow(TickerType.ORDER_BOOK).getOrThrow(TickerQuotationToken.NATIVE).set(token.symbol, price);
					tickers.getOrThrow(TickerType.ORDER_BOOK).getOrThrow(TickerQuotationToken.USD).set(token.symbol, price.mul(nativeToUSDPrice));
				} catch (exception) {
					// logger.ignoreException(exception, `Failed to get price for token ${token.symbol} using ${token.symbol}/${this.usdToken.symbol} or ${token.symbol}/${this.nativeToken.symbol} markets.`);
				}
			}

			tickers.getOrThrow(TickerType.UNIFIED).getOrThrow(TickerQuotationToken.USD).set(
				token.symbol,
				tickers.getOrThrow(TickerType.ORDER_BOOK).getOrThrow(TickerQuotationToken.USD).get(token.symbol, undefined)
				|| tickers.getOrThrow(TickerType.ORACLE).getOrThrow(TickerQuotationToken.USD).get(token.symbol, undefined)
				|| tickers.getOrThrow(TickerType.LAYER_POOL).getOrThrow(TickerQuotationToken.USD).getOrThrow(token.symbol, DECIMAL_0),
				true
			);
			tickers.getOrThrow(TickerType.UNIFIED).getOrThrow(TickerQuotationToken.NATIVE).set(
				token.symbol,
				tickers.getOrThrow(TickerType.ORDER_BOOK).getOrThrow(TickerQuotationToken.NATIVE).get(token.symbol, undefined)
				|| tickers.getOrThrow(TickerType.ORACLE).getOrThrow(TickerQuotationToken.NATIVE).get(token.symbol, undefined)
				|| tickers.getOrThrow(TickerType.LAYER_POOL).getOrThrow(TickerQuotationToken.NATIVE).getOrThrow(token.symbol, DECIMAL_0),
				true
			);
		}

		return tickers;
	}

	/**
	 * Get candles
	 * @param request - The request object
	 * @returns The candles response
	 */
	async getCandles(request: FinGetCandlesRequest): Promise<FinGetCandlesResponse> {
		let { marketAddress, marketSymbol, market, after, before, interval, maximumNumberOfCandles } = request;

		marketAddress = marketAddress?.toLowerCase().trim();
		marketSymbol = marketSymbol?.trim();
		after = after || new Date(Date.now() - Number(properties.getAs<number>('rujira.default.candles.lookbackInterval')));
		before = before || new Date(); // It not informed, so we use the current date
		maximumNumberOfCandles = maximumNumberOfCandles || DECIMAL_INFINITY.toNumber();
		interval = interval || properties.getAs<CandleInterval>('rujira.default.candles.interval') || CandleInterval.ONE_MINUTE;

		if (!marketAddress && !marketSymbol && !market) {
			throw new Error("Either market address or market name or market must be provided");
		}

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		// Use interval directly as resolution (already in seconds format)
		const resolution = interval.replace('m', '');

		const response = await this.parent.fetch(properties.getAs<string>('rujira.endpoints.graphql'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer: ${properties.getAs<string>('rujira.tokens.graphql')}`,
			},
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
					after: after.toISOString(),
					before: before.toISOString(),
					resolution,
					last: maximumNumberOfCandles // This field is not respected by the API, but we handle it client-side
				}
			})
		});

		if (!response.ok) {
			throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
		}

		// Example response:
		// 	{
		// 		"data": {
		// 			"node": {
		// 				"address": "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
		// 				"candles": {
		// 					"edges": [
		// 						{
		// 							"node": {
		// 								"bin": "2025-08-19T14:55:00Z",
		// 								"close": "1470000000000",
		// 								"high": "1470000000000",
		// 								"low": "1470000000000",
		// 								"open": "1470000000000",
		// 								"volume": "1470000000000"
		// 							}
		// 						}
		// 					]
		// 				}
		// 			}
		// 		}
		// 	}
		const json: any = (await response.json()) as {
			data: {
				node: {
					candles: {
						edges: Array<{
							node: {
								bin: string,
								close: string,
								high: string,
								low: string,
								open: string,
								volume: string;
							};
						}>;
					};
				};
			};
			errors: Array<{ message: string }>;
		};
		const { data, errors } = json;

		if (errors) {
			throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
		}

		const rawCandles = data?.node?.candles?.edges?.map((edge: any) => edge.node) || [];

		// Apply client-side limiting since GraphQL API ignores 'last' parameter
		let limitedCandles = rawCandles;
		if (maximumNumberOfCandles && maximumNumberOfCandles > 0 && maximumNumberOfCandles < DECIMAL_INFINITY.toNumber()) {
			limitedCandles = rawCandles
				.slice(0, maximumNumberOfCandles);
		}

		const candles = MMap<CandleTimestamp, Candle>();

		MList<Candle>(limitedCandles).map((entry: any) => {
			const candle = {
				timestamp: new Date(entry.bin).getTime(),
				// Rujira is using 12 decimals for the price in the candles, which might differ from the market
				open: Decimal(entry.open || 0).div(DECIMAL_10.pow(12)),
				high: Decimal(entry.high || 0).div(DECIMAL_10.pow(12)),
				low: Decimal(entry.low || 0).div(DECIMAL_10.pow(12)),
				close: Decimal(entry.close || 0).div(DECIMAL_10.pow(12)),
				volume: Decimal(entry.volume || 0),
				raw: entry
			}

			candles.set(candle.timestamp, candle);
		});

		return candles;
	}

	/**
	 * Get indicators
	 * @param request - The request object
	 * @returns The indicators response
	 */
	async getIndicators(request: FinGetIndicatorsRequest): Promise<FinGetIndicatorsResponse> {
		let { marketAddress, marketSymbol, market, after, before, interval, maximumNumberOfCandles, candles, indicatorsIds } = request;

		if (!candles || candles.size === 0) {
			candles = await this.getCandles({ marketAddress, marketSymbol, market, after, before, interval, maximumNumberOfCandles });
		}

		candles = candles.asImmutable();
		const candlesList = candles.valueSeq().toList();

		if (!indicatorsIds) {
			indicatorsIds = Indicator.all.keySeq().toList();
		} else {
			indicatorsIds = MList<IndicatorId>(indicatorsIds);
		}

		const output = MMap<IndicatorId, IndicatorData>();

		for (const indicatorId of indicatorsIds) {
			const indicator = Indicator.all.getOrThrow(indicatorId);

			const value = (Indicators as any)[indicator.id](...indicator.candlesTransform(candlesList), ...indicator.parameters);

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
		tokenSymbols = tokenSymbols?.map((symbol: TokenSymbol) => symbol.toUpperCase().trim()) || MList<TokenSymbol>();

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
			tokens = tokens.filter((token: Token) => {
				return tokenAddresses?.includes(token.address)
					|| tokenSymbols?.includes(token.symbol)
					|| token.address === this.nativeToken.address
					|| token.address === this.usdToken.address;
			});
		}

		tokenSymbols = tokens.keySeq().toList();
		tokenAddresses = tokens.valueSeq().map((token: Token) => token.address).toList();

		const tickers = await this.getTickers({ tokens: tokens.valueSeq().toList() })

		const freeBalances = MMap<TokenSymbol, Amount>();
		const freeBalanceResponse = await this.parent.fetch(`${properties.getAs<string>('rujira.endpoints.rest')}/cosmos/bank/v1beta1/balances/${walletAddress}`);

		if (freeBalanceResponse?.ok) {
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
			const freeBalanceResponseData = await freeBalanceResponse.json() as {
				balances: Array<{
					denom: string;
					amount: string;
				}>;
				pagination: {
					next_key: string | null;
					total: string;
				};
			};

			for (const token of tokens.values()) {
				const rawBalance = freeBalanceResponseData.balances.find((rawBalance: { denom: string }) => {
					return rawBalance.denom.toLowerCase() == token.address.toLowerCase();
				});

				if (rawBalance) {
					const amount = Decimal(rawBalance.amount.toString().trim()).div(DECIMAL_10.pow(token.decimals));
					freeBalances.set(token.symbol, amount);
				} else {
					// logger.ignoreException(new Error(`Balance for token ${token.symbol} not found, ignoring this token balance.`));
				}
			}
		}

		const lockedInOrdersMap = MMap<TokenSymbol, Amount>();
		const withdrawableMap = MMap<TokenSymbol, Amount>();

		// Use getOrders to get all orders across all markets for the wallet
		for (const market of markets.values()) {
			if (!tokenSymbols.includes(market.tokens.base.symbol) && !tokenSymbols.includes(market.tokens.quote.symbol)) {
				continue;
			}

			const orders = await this.getOrders({
				ownerAddress: walletAddress,
				market
			});

			for (const order of orders.values()) {
				const baseTokenSymbol = market.tokens.base.symbol;
				const quoteTokenSymbol = market.tokens.quote.symbol;

				// Calculate locked amounts for all non filled orders
				if ([ OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED].includes(order.status)) {
					let lockedAmount: Amount;
					let lockedTokenSymbol: TokenSymbol;

					if (order.side === OrderSide.BUY) {
						// For BUY orders, calculate locked amount based on order type
						lockedTokenSymbol = quoteTokenSymbol;
						if (order.type === OrderType.FIXED_PRICE) {
							// For fixed price orders, use order price directly
							lockedAmount = order.amount.mul(cast<OrderPrice>(order.price));
						} else if (order.type === OrderType.TRACKING_ORDER) {
							// For tracking orders, use current market price + deviation
							const deviationMultiplier = DECIMAL_100.minus(cast<OrderDeviationInPercentage>(order.deviationInBasisPoints?.div(DECIMAL_100) ?? order.deviationInPercentage)).div(DECIMAL_100);
							const currentPrice = tickers.getOrThrow(TickerType.UNIFIED).getOrThrow(TickerQuotationToken.USD).getOrThrow(lockedTokenSymbol);
							const adjustedPrice = currentPrice.mul(deviationMultiplier);
							lockedAmount = order.amount.mul(adjustedPrice);
						} else {
							throw new Error(`Unsupported order type: ${order.type}`);
						}
					} else if (order.side === OrderSide.SELL) {
						// For SELL orders, lock the base token amount
						lockedTokenSymbol = baseTokenSymbol;
						lockedAmount = order.amount;
					} else {
						throw new Error(`Unsupported order side: ${order.side}`);
					}

					if (lockedAmount.gt(0)) {
						const currentLocked = lockedInOrdersMap.getOrThrow(lockedTokenSymbol, DECIMAL_0);
						lockedInOrdersMap.set(lockedTokenSymbol, currentLocked.plus(lockedAmount));
					}
				}

				// Calculate withdrawable amounts for filled orders
				if (order.status === OrderStatus.FILLED) {
					let withdrawAmount: Amount;
					let withdrawTokenSymbol: TokenSymbol;

					if (order.side === OrderSide.BUY) {
						// For filled BUY orders, withdrawable is the base token amount received
						withdrawTokenSymbol = baseTokenSymbol;
						withdrawAmount = order.amount;
					} else if (order.side === OrderSide.SELL) {
						// For filled SELL orders, withdrawable is the quote token amount received
						withdrawTokenSymbol = quoteTokenSymbol;
						if (order.type === OrderType.FIXED_PRICE) {
							// For fixed price orders, use order price directly
							withdrawAmount = order.amount.mul(cast<OrderPrice>(order.price));
						} else if (order.type === OrderType.TRACKING_ORDER) {
							// For tracking orders, we need to estimate the quote amount received
							const deviationMultiplier = DECIMAL_100.plus(cast<OrderDeviationInPercentage>(order.deviationInBasisPoints?.div(DECIMAL_100) ?? order.deviationInPercentage)).div(DECIMAL_100);
							const currentPrice = tickers.getOrThrow(TickerType.UNIFIED).getOrThrow(TickerQuotationToken.USD).getOrThrow(withdrawTokenSymbol);
							const adjustedPrice = currentPrice.mul(deviationMultiplier);
							withdrawAmount = order.amount.mul(adjustedPrice);
						} else {
							throw new Error(`Unsupported order type: ${order.type}`);
						}
					} else {
						throw new Error(`Unsupported order side: ${order.side}`);
					}

					if (withdrawAmount.gt(0)) {
						const currentWithdrawable = withdrawableMap.getOrThrow(withdrawTokenSymbol, DECIMAL_0);
						withdrawableMap.set(withdrawTokenSymbol, currentWithdrawable.plus(withdrawAmount));
					}
				}
			}
		}

		const tokensBalancesMap = MMap<TokenSymbol, TokenBalance>();
		const totalNative: BaseBalance = {
			free: DECIMAL_0,
			lockedInOrders: DECIMAL_0,
			lockedInPools: DECIMAL_0,
			withdrawable: DECIMAL_0,
			total: DECIMAL_0
		};
		const totalUSD: BaseBalance = {
			free: DECIMAL_0,
			lockedInOrders: DECIMAL_0,
			lockedInPools: DECIMAL_0,
			withdrawable: DECIMAL_0,
			total: DECIMAL_0
		};

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

			const conversionRateUSD: TickerPrice = token.address == this.usdToken.address ? DECIMAL_1 : tickers.getOrThrow(TickerType.UNIFIED).getOrThrow(TickerQuotationToken.USD).getOrThrow(token.symbol, DECIMAL_0);
			const conversionRateNative: TickerPrice = token.address == this.nativeToken.address ? DECIMAL_1 : tickers.getOrThrow(TickerType.UNIFIED).getOrThrow(TickerQuotationToken.NATIVE).getOrThrow(token.symbol, DECIMAL_0);

			// Convert balances to native token (RUJI) amounts
			const nativeTokenBalance: BaseBalance = {
				free: free.mul(conversionRateNative),
				lockedInOrders: lockedInOrders.mul(conversionRateNative),
				lockedInPools: lockedInPools.mul(conversionRateNative),
				withdrawable: withdrawable.mul(conversionRateNative),
				total: total.mul(conversionRateNative)
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
					tokenToQuote: conversionRateNative,
					quoteToToken: conversionRateNative.gt(DECIMAL_0) ? DECIMAL_1.div(conversionRateNative) : DECIMAL_0
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

			totalNative.free = totalNative.free.plus(nativeTokenBalance.free);
			totalNative.lockedInOrders = totalNative.lockedInOrders.plus(nativeTokenBalance.lockedInOrders);
			totalNative.lockedInPools = totalNative.lockedInPools.plus(nativeTokenBalance.lockedInPools);
			totalNative.withdrawable = totalNative.withdrawable.plus(nativeTokenBalance.withdrawable);
			totalNative.total = totalNative.total.plus(nativeTokenBalance.total);

			totalUSD.free = totalUSD.free.plus(usdTokenBalance.free);
			totalUSD.lockedInOrders = totalUSD.lockedInOrders.plus(usdTokenBalance.lockedInOrders);
			totalUSD.lockedInPools = totalUSD.lockedInPools.plus(usdTokenBalance.lockedInPools);
			totalUSD.withdrawable = totalUSD.withdrawable.plus(usdTokenBalance.withdrawable);
			totalUSD.total = totalUSD.total.plus(usdTokenBalance.total);
		}

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
        fixed?: string,
        oracle?: string
      },
      rate: string,
      updated_at: string,
      offer: string,
      remaining: string,
      filled: string
    }] || [];

		let filteredOrders = MMap<OrderId, Order>();

		for (const rawOrder of rawOrders) {
			let type: OrderType;
			let price: OrderPrice;
			let deviationInPercentage: OrderDeviationInPercentage;
			let deviationInBasisPoints: OrderDeviationInBasisPoints;
			const side = rawOrder.side === 'quote' ? OrderSide.BUY : OrderSide.SELL;

			if (rawOrder.price.fixed) {
				type = OrderType.FIXED_PRICE;
				price = Decimal(rawOrder.price.fixed);
				deviationInPercentage = DECIMAL_0;
				deviationInBasisPoints = DECIMAL_0;
			} else if (rawOrder.price.oracle) {
				type = OrderType.TRACKING_ORDER;
				deviationInPercentage = Decimal(rawOrder.price.oracle).div(DECIMAL_100); // Convert from bps (basis points) to percentage
				deviationInBasisPoints = Decimal(rawOrder.price.oracle);
				price = Decimal(rawOrder.rate || '0');
			} else {
				throw new Error(`Unknown order price type: ${JSON.stringify(rawOrder)}`);
			}
			const amount = (
				side == OrderSide.BUY
					? Decimal(rawOrder.offer).div(price).div(DECIMAL_10.pow(market.tokens.base.decimals))
					: Decimal(rawOrder.offer).div(DECIMAL_10.pow(market.tokens.base.decimals))
			);
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
				deviationInPercentage,
				deviationInBasisPoints,
				amount,
				filledPercentage,
				status,
				raw: rawOrder
			} as Order;

			filteredOrders.set(cast<OrderId>(order.id), order);
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
			if (orderPrices && (!order.price || !orderPrices.includes(cast<OrderPrice>(order.price)))) {
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
		let { ownerAddress, owner, marketAddress, marketSymbol, market, side, type, amount, price, deviationInPercentage, deviationInBasisPoints } = request;

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
							side,
							type,
							amount,
							price,
							deviationInPercentage,
							deviationInBasisPoints
						}
					]
				)
			}
		});

		const placedOrder = cast<Order>(persistedOrders.placedOrders?.first() || persistedOrders.replacedOrders?.first());

		const result = {
			order: placedOrder,
			transaction: cast<Transaction>(persistedOrders.transactions.first())
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

		if (orders) {
			orders = MList<FinPlaceOrderRequest>(orders);
		}

		const marketAddress = orders.first()?.marketAddress;
		const marketSymbol = orders.first()?.marketSymbol;
		const market = orders.first()?.market;

		const ordersWithDeviation = orders.map(order => ({
			...order,
			deviationInPercentage: order.deviationInPercentage,
			deviationInBasisPoints: order.deviationInBasisPoints
		}));

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				place: MList<FinPlaceOrderRequest>(ordersWithDeviation)
			}
		});

		const placedOrders = cast<Map<OrderId, Order>>((persistedOrders.placedOrders || MMap<OrderId, Order>()).merge(persistedOrders.replacedOrders || MMap<OrderId, Order>()));

		const result = {
			orders: placedOrders,
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
		let { ownerAddress, owner, marketAddress, marketSymbol, market, side, type, amount, price, deviationInPercentage, deviationInBasisPoints } = request;

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
					price,
					deviationInPercentage,
					deviationInBasisPoints
				}])
			}
		});

		const replacedOrder = cast<Order>(persistedOrders.replacedOrders?.first() || persistedOrders.placedOrders?.first());

		const result = {
			order: replacedOrder,
			transaction: cast<Transaction>(persistedOrders.transactions.first())
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

		if (orders) {
			orders = MList<FinPlaceOrderRequest>(orders);
		}

		const marketAddress = orders.first()?.marketAddress;
		const marketSymbol = orders.first()?.marketSymbol;
		const market = orders.first()?.market;

		const persistedOrders = await this.persistOrders({
			ownerAddress,
			owner,
			marketAddress,
			marketSymbol,
			market,
			orders: {
				replace: MList<FinPlaceOrderRequest>(orders)
			}
		});

		const replacedOrders = cast<Map<OrderId, Order>>((persistedOrders.replacedOrders || MMap<OrderId, Order>()).merge(persistedOrders.placedOrders || MMap<OrderId, Order>()));

		const result = {
			orders: replacedOrders,
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
				cancel: orderId ? MList<OrderId>([orderId]) : MList<Order>([cast<Order>(order)])
			}
		});

		const result = {
			order: cast<Order>(persistedOrders.cancelledOrders?.first()),
			transaction: cast<Transaction>(persistedOrders.transactions.first())
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
			orders: cast<Map<OrderId, Order>>(persistedOrders.cancelledOrders),
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
			orders: cast<Map<OrderId, Order>>(persistedOrders.cancelledOrders),
			transactions: persistedOrders.transactions
		};

		return result;
	}

	/**
	 * Withdraw from market (withdraw filled orders for a user in a market)
	 * @param request - The request object
	 * @returns The response for the withdrawn orders
	 */
	async withdrawAllFilledOrders(request: FinWithdrawAllFilledOrdersRequest): Promise<FinWithdrawAllFilledOrdersResponse> {
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
			orders: cast<Map<OrderId, Order>>(persistedOrders.withdrawnOrders),
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

		if (!market) {
			market = await this.getMarket({ address: marketAddress, symbol: marketSymbol });
		}

		marketAddress = market.address;
		marketSymbol = market.symbol;

		let placeAndReplaceOrders = MList<FinPlaceOrderRequest>(orders.place || []).merge(MList<FinReplaceOrderRequest>(orders.replace || []));

		// Sanitize place and replace orders
		if (placeAndReplaceOrders) {
			placeAndReplaceOrders = MList<FinPlaceOrderRequest>(placeAndReplaceOrders.map((order: FinPlaceOrderRequest) => ({
				...order,
				ownerAddress: this.getWalletAddress(order.ownerAddress, order.owner),
				marketAddress: order.marketAddress?.trim().toLowerCase() || marketAddress,
				marketSymbol: order.marketSymbol?.trim().toUpperCase() || marketSymbol,
				side: OrderSide[order.side?.trim().toUpperCase() as keyof typeof OrderSide] || undefined,
				type: OrderType[order.type?.trim().toUpperCase() as keyof typeof OrderType] || undefined,
				amount: Decimal(order.amount),
				price: order.price ? sanitizeOrderPrice(Decimal(order.price), market.raw.tick) : undefined,
				maximumSlippagePercentage: order.maximumSlippagePercentage ? Decimal(order.maximumSlippagePercentage) : Decimal(properties.get('rujira.default.orders.maximumSlippagePercentage'))
			})));
		}

		// Sanitize cancel orders
		if (orders.cancel) {
			const cancelOrderIds = MList<OrderId>();
			orders.cancel.forEach((item: OrderId | Order) => {
				if (typeof item === 'string') {
					cancelOrderIds.push(item.trim());
				} else if (item.id) {
					cancelOrderIds.push(item.id.trim());
				}
			});
			orders.cancel = cancelOrderIds;
		}

		// Sanitize withdraw filled orders
		if (orders.withdraw) {
			const withdrawOrderIds = MList<OrderId>();
			orders.withdraw.forEach((item: OrderId | Order) => {
				if (typeof item === 'string') {
					withdrawOrderIds.push(item.trim());
				} else if (item.id) {
					withdrawOrderIds.push(item.id.trim());
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

		// Validate place and replace orders
		let hasMarketOrder = false;
		let hasNonMarketOrder = false;
				if (placeAndReplaceOrders) {
			placeAndReplaceOrders.forEach((order: FinPlaceOrderRequest | FinReplaceOrderRequest) => {
				if (order.marketAddress !== market.address) {
					throw new Error(`All orders must use the same market. Expected: ${market.address}, Got: ${order.marketAddress}`);
				}

				if (!order.side || !order.type || !order.amount) {
					throw new Error("Order side, type, and amount are required for placing orders");
				}
				if ([OrderType.FIXED_PRICE].includes(order.type) && (!order.price || !order.price.gt(DECIMAL_0))) {
					throw new Error("A valid order price is required for placing fixed price orders");
				}

				if ([OrderType.TRACKING_ORDER].includes(order.type) && (order.deviationInPercentage === undefined && order.deviationInBasisPoints === undefined)) {
					throw new Error("Deviation is required for placing tracking orders");
				}

				if (!order.amount.gt(DECIMAL_0)) {
					throw new Error("Order amount must be greater than zero");
				}

				if (order.price) {
					validateOrderPrice(order.price, market.raw.tick);
				}

				if ([OrderType.MARKET].includes(order.type)) {
					if (hasMarketOrder) {
						throw new Error("Only one market order is allowed per operation");
					}
					if (hasNonMarketOrder) {
						throw new Error("Market order is not allowed when a non-market order is present");
					}
					hasMarketOrder = true;
				} else {
					if (hasMarketOrder) {
						throw new Error("Non-market order is not allowed when a market order is present");
					}
					hasNonMarketOrder = true;
				}
			});
		}

		// Validate cancel orders
		// if (orders.cancel) {
		// }

		// Validate withdraw filled orders
		// if (orders.withdraw) {
		// }

		// ===== INITIALIZATION =====
		const contractAddress = market.address;
		const transactions = MMap<TransactionHash, Transaction>();
		const ordersMap = MMap<string, Map<OrderId, Order>>();

		// Get existing orders to check their status (open, partially filled, filled orders)
		const existingOrders = await this.getOrders({
			ownerAddress,
			market,
			orderTypes: [OrderType.FIXED_PRICE, OrderType.TRACKING_ORDER],
			orderStatuses: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED, OrderStatus.FILLED]
		});

		const marketTicker = await this.getTicker({ market });

		// Build the complete order message structure
		const ordersMessages: any[] = [];
		const swapMessages: any[] = [];

		// IMPORTANT: Only place and replace orders need funds. Cancel and withdraw operations send NO funds.
		const fundsMap: Map<TokenAddress, Amount> = MMap<TokenAddress, Amount>();
		fundsMap.set(market.tokens.quote.address, DECIMAL_0);
		fundsMap.set(market.tokens.base.address, DECIMAL_0);
		fundsMap.set(this.nativeToken.address, DECIMAL_0);
		fundsMap.set(this.usdToken.address, DECIMAL_0);
		fundsMap.set(this.feePaymentToken.address, DECIMAL_0);

		// Process place and replace orders
		if (placeAndReplaceOrders && !placeAndReplaceOrders.isEmpty()) {
			const placeAndReplaceOrdersMap = MMap<OrderId, Order>();
			const placeOrdersMap = MMap<OrderId, Order>();
			const replaceOrdersMap = MMap<OrderId, Order>();

			placeAndReplaceOrders.forEach((requestOrder: FinPlaceOrderRequest | FinReplaceOrderRequest) => {
				const orderId = this.getOrderId({
					ownerAddress,
					market,
					order: requestOrder
				});

				const existingOrder = existingOrders.get(orderId);

				const type = existingOrder?.type || requestOrder.type;

				const side = (existingOrder?.side || requestOrder.side) === OrderSide.BUY ? 'quote' : 'base';

				const price = existingOrder?.price?.toFixed(18) || requestOrder.price?.toFixed(18) || '0.000000000000000000';

				if ([OrderType.MARKET].includes(type)) {
					let inputToken: Token;
					let outputToken: Token;
					let outputToInputPrice: Price;
					let inputTokenAmount: Amount;
					let outputTokenAmount: Amount;
					let inputTokenAmountWithoutDecimals: Amount;
					let outputTokenAmountWithoutDecimals: Amount;
					let slippagePercentage: OrderMaximumSlippagePercentage = cast<OrderMaximumSlippagePercentage>(requestOrder.maximumSlippagePercentage);

					if (requestOrder.side === OrderSide.BUY) {
						inputToken = market.tokens.quote;
						outputToken = market.tokens.base;

						outputToInputPrice = cast<Price>(marketTicker.middlePrice.baseToQuote);

						outputTokenAmount = requestOrder.amount;
						inputTokenAmount = outputTokenAmount.mul(outputToInputPrice).mul(DECIMAL_100.plus(slippagePercentage).div(DECIMAL_100));
						inputTokenAmountWithoutDecimals = inputTokenAmount.mul(10 ** inputToken.decimals).toDecimalPlaces(0);
						outputTokenAmountWithoutDecimals = outputTokenAmount.mul(10 ** outputToken.decimals).toDecimalPlaces(0);

						swapMessages.push({
							min_return: outputTokenAmountWithoutDecimals.toFixed(),
							to: ownerAddress
						});

						fundsMap.set(inputToken.address, cast<Amount>(fundsMap.get(inputToken.address, undefined)).plus(inputTokenAmountWithoutDecimals));
					} else if (requestOrder.side === OrderSide.SELL) {
						inputToken = market.tokens.base;
						outputToken = market.tokens.quote;

						outputToInputPrice = cast<Price>(marketTicker.middlePrice.baseToQuote);

						inputTokenAmount = requestOrder.amount;
						outputTokenAmount = inputTokenAmount.mul(outputToInputPrice).mul(DECIMAL_100.minus(slippagePercentage).div(DECIMAL_100));
						inputTokenAmountWithoutDecimals = inputTokenAmount.mul(10 ** inputToken.decimals).toDecimalPlaces(0);
						outputTokenAmountWithoutDecimals = outputTokenAmount.mul(10 ** outputToken.decimals).toDecimalPlaces(0);

						swapMessages.push({
							min_return: outputTokenAmountWithoutDecimals.toFixed(),
							to: ownerAddress
						});

						fundsMap.set(inputToken.address, cast<Amount>(fundsMap.get(inputToken.address, undefined)).plus(inputTokenAmountWithoutDecimals));
					} else {
						throw new Error(`Order side ${requestOrder.side} not supported`);
					}
				} else if ([OrderType.FIXED_PRICE].includes(type)) {
					let price: OrderPrice;
					let payingToken: Token;
					let receivingToken: Token;
					let payingTokenAmount: Amount;
					let payingTokenAmountWithoutDecimals: Amount;
					if (requestOrder.side === OrderSide.BUY) {
						payingToken = market.tokens.quote;
						receivingToken = market.tokens.base;
						price = cast<OrderPrice>(requestOrder.price);
						payingTokenAmount = requestOrder.amount.mul(price);
						payingTokenAmountWithoutDecimals = payingTokenAmount.mul(10 ** payingToken.decimals).toDecimalPlaces(0);

						ordersMessages.push([
							side,
							{
								fixed: price.toFixed()
							},
							payingTokenAmountWithoutDecimals.toFixed()
						]);

						fundsMap.set(payingToken.address, cast<Amount>(fundsMap.get(payingToken.address, undefined)).plus(payingTokenAmountWithoutDecimals));
					} else if (requestOrder.side === OrderSide.SELL) {
						payingToken = market.tokens.base;
						receivingToken = market.tokens.quote;
						price = cast<OrderPrice>(requestOrder.price);
						payingTokenAmount = requestOrder.amount;
						payingTokenAmountWithoutDecimals = payingTokenAmount.mul(10 ** payingToken.decimals).toDecimalPlaces(0);

						ordersMessages.push([
							side,
							{
								fixed: price.toFixed()
							},
							payingTokenAmountWithoutDecimals.toFixed()
						]);

						fundsMap.set(payingToken.address, cast<Amount>(fundsMap.get(payingToken.address, undefined)).plus(payingTokenAmountWithoutDecimals));
					} else {
						throw new Error(`Order side ${requestOrder.side} not supported`);
					}
				} else if ([OrderType.TRACKING_ORDER].includes(type)) {
					let payingToken: Token;
					let receivingToken: Token;
					let payingTokenAmount: Amount;
					let payingTokenAmountWithoutDecimals: Amount;
					let deviationInBasisPoints: OrderDeviationInBasisPoints;

					// Validate deviation parameter
					if (requestOrder.deviationInPercentage === undefined && requestOrder.deviationInBasisPoints === undefined) {
						throw new Error("Deviation is required for placing tracking orders");
					}
					deviationInBasisPoints = cast<OrderDeviationInBasisPoints>(
						requestOrder.deviationInBasisPoints
						// Convert from percentage to 100 basis points (bps)
						?? requestOrder.deviationInPercentage?.mul(DECIMAL_100)
					);

					if (requestOrder.side === OrderSide.BUY) {
						payingToken = market.tokens.quote;
						receivingToken = market.tokens.base;
						// For BUY orders, amount is in base token (BTC), but we pay with quote token (USDC)
						// We need to calculate the USDC amount based on the BTC amount and current price
						const baseTokenAmount = requestOrder.amount;
						const currentPrice = cast<Price>(marketTicker.middlePrice.baseToQuote);
						payingTokenAmount = baseTokenAmount.mul(currentPrice);

						// Use standard USDC decimals (6) instead of market data decimals (8)
						// This ensures proper amount calculation for USDC payments
						const correctUsdcDecimals = 6;
						payingTokenAmountWithoutDecimals = payingTokenAmount.mul(10 ** correctUsdcDecimals).toDecimalPlaces(0);

						ordersMessages.push([
							side,
							{
								oracle: deviationInBasisPoints.toNumber()
							},
							payingTokenAmountWithoutDecimals.toFixed()
						]);

						fundsMap.set(payingToken.address, cast<Amount>(fundsMap.get(payingToken.address, undefined)).plus(payingTokenAmountWithoutDecimals));
					} else if (requestOrder.side === OrderSide.SELL) {
						payingToken = market.tokens.base;
						receivingToken = market.tokens.quote;
						payingTokenAmount = requestOrder.amount;
						payingTokenAmountWithoutDecimals = payingTokenAmount.mul(10 ** payingToken.decimals).toDecimalPlaces(0);

						ordersMessages.push([
							side,
							{
								oracle: deviationInBasisPoints.toNumber()
							},
							payingTokenAmountWithoutDecimals.toFixed()
						]);

						fundsMap.set(payingToken.address, cast<Amount>(fundsMap.get(payingToken.address, undefined)).plus(payingTokenAmountWithoutDecimals));
					} else {
						throw new Error(`Order side ${requestOrder.side} not supported`);
					}
				} else {
					throw new Error(`Order type ${type} not supported`);
				}

				// Create a proper Order object at this moment
				const order: Order = {
					id: orderId,
					market: market,
					ownerAddress: ownerAddress,
					type: existingOrder?.type || requestOrder.type,
					side: existingOrder?.side || requestOrder.side,
					price: existingOrder?.price || requestOrder.price,
					deviationInPercentage: existingOrder?.deviationInBasisPoints?.div(DECIMAL_100) || existingOrder?.deviationInPercentage || requestOrder?.deviationInBasisPoints?.div(DECIMAL_100) || requestOrder?.deviationInPercentage,
					deviationInBasisPoints: existingOrder?.deviationInBasisPoints || existingOrder?.deviationInPercentage?.mul(DECIMAL_100) || requestOrder?.deviationInBasisPoints || requestOrder?.deviationInPercentage?.mul(DECIMAL_100),
					amount: existingOrder?.amount || requestOrder.amount,
					filledPercentage: [OrderType.MARKET].includes(type) ? DECIMAL_100 : DECIMAL_0,
					status: [OrderType.MARKET].includes(type) ? OrderStatus.FILLED : OrderStatus.OPEN,
					creationTimestamp: Date.now(),
					updateTimestamp: Date.now(),
					raw: requestOrder
				};
				placeAndReplaceOrdersMap.set(orderId, order);
				if (existingOrder) {
					replaceOrdersMap.set(orderId, order);
				} else {
					placeOrdersMap.set(orderId, order);
				}
			});
			ordersMap.set('placeAndReplace', placeAndReplaceOrdersMap);
			ordersMap.set('place', placeOrdersMap);
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

				// Create cancel message: [side, { fixed: price }, '0']
				const side = existingOrder.side === OrderSide.BUY ? 'quote' : 'base';

				if (existingOrder.type === OrderType.TRACKING_ORDER) {
					// For tracking orders, use the stored deviation (already in 100 basis points (bps))
					const deviationInBasisPoints = cast<OrderDeviationInBasisPoints>(existingOrder.deviationInBasisPoints || existingOrder.deviationInPercentage?.mul(DECIMAL_100));
					ordersMessages.push([side, { oracle: deviationInBasisPoints.toNumber() }, "0"]);
				} else {
					// For fixed price orders
					const price = existingOrder.price ? existingOrder.price.toFixed(18) : '0.000000000000000000';
					ordersMessages.push([side, { fixed: price }, "0"]);
				}

				// Update order status to CANCELLED and update timestamp
				const cancelledOrder: Order = {
					...existingOrder,
					status: OrderStatus.CANCELLED,
					updateTimestamp: Date.now()
				};
				cancelOrdersMap.set(orderId, cancelledOrder);
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

				// Create withdraw message: [side, { fixed: price }, null]
				const side = existingOrder.side === OrderSide.BUY ? 'quote' : 'base';

				if (existingOrder.type === OrderType.TRACKING_ORDER) {
					// For tracking orders, use the stored deviation (already in 100 basis points (bps))
					const deviationInBasisPoints = cast<OrderDeviationInBasisPoints>(existingOrder.deviationInBasisPoints || existingOrder.deviationInPercentage?.mul(DECIMAL_100));
					ordersMessages.push([side, { oracle: deviationInBasisPoints.toNumber() }, null]);
				} else {
					// For fixed price orders
					const price = existingOrder.price ? existingOrder.price.toFixed(18) : '0.000000000000000000';
					ordersMessages.push([side, { fixed: price }, null]);
				}

				// Update timestamp for withdrawn order
				const withdrawnOrder: Order = {
					...existingOrder,
					updateTimestamp: Date.now()
				};
				withdrawOrdersMap.set(orderId, withdrawnOrder);
			});
			ordersMap.set('withdraw', withdrawOrdersMap);
		}

		if (ordersMessages.length === 0 && swapMessages.length === 0) {
			throw new Error("No valid orders to persist");
		} else if (ordersMessages.length > 0 && swapMessages.length > 0) {
			throw new Error("Due the Rujira limitations, it is not possible to persist both limit and market orders");
		} else if (swapMessages.length > 1) {
			throw new Error("Due the Rujira limitations, it is not possible to persist more than one market order");
		}

		const message: any = {};

		if (ordersMessages.length > 0) {
			message.order = [ordersMessages, null];
		}

		if (swapMessages.length > 0) {
			// Only one market order is allowed per operation
			message.swap = swapMessages[0];
		}

		let funds: Coin[] | undefined = undefined;

		if (fundsMap && !fundsMap.isEmpty()) {
			const rawFunds: Coin[] = [];
			fundsMap.forEach((amount, denom) => {
				if (amount.gt(DECIMAL_0)) {
				rawFunds.push({
						denom,
						amount: amount.toFixed()
					});
				}
			});
			// Sort funds by denomination (required by Cosmos)
			funds = rawFunds.sort((a, b) => a.denom.localeCompare(b.denom));
		}

		// Execute the transaction
		const response = await this.cosmClient.execute(
			ownerAddress,
			contractAddress,
			message,
			'auto',
			undefined,
			funds
		);

		// Wait for a delay so we guarantee the transaction is already available in NineRealms
		sleep(properties.getAs<number>("rujira.default.orders.delayBetweenTransactions"));

		// Get the transaction details
		const transaction = await this.getTransaction({ hash: response.transactionHash });
		transactions.set(transaction.hash, transaction);

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
		marketSymbol?: MarketSymbol;
		market?: Market;
		order?: Order | FinPlaceOrderRequest | FinReplaceOrderRequest;
		orderType?: OrderType;
		orderSide?: OrderSide;
		orderPrice?: OrderPrice;
		orderDeviationInPercentage?: OrderDeviationInPercentage;
		orderDeviationInBasisPoints?: OrderDeviationInBasisPoints;
	}): OrderId {
		let { ownerAddress, marketSymbol, market, order, orderType, orderSide, orderPrice, orderDeviationInPercentage, orderDeviationInBasisPoints } = options;

		ownerAddress = ownerAddress || cast<Order>(order).ownerAddress;

		marketSymbol = marketSymbol || order?.market?.symbol || cast<Market>(market).symbol;

		orderType = orderType || cast<Order>(order).type;

		orderSide = orderSide || cast<Order>(order).side;

		orderPrice = orderPrice || order?.price;

		orderDeviationInBasisPoints = orderDeviationInBasisPoints || orderDeviationInPercentage?.mul(DECIMAL_100) || order?.deviationInBasisPoints || order?.deviationInPercentage?.mul(DECIMAL_100) || undefined;

		return `owner:${ownerAddress}|market:${marketSymbol}|type:${orderType}|side:${orderSide}|price:${orderPrice?.toFixed()}|deviation:${orderDeviationInBasisPoints?.toNumber()}`;
	}
}
