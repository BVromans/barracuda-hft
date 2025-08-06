// noinspection JSUnusedGlobalSymbols

import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { AccountData, DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import Decimal from 'decimal.js';
import BN from "bn.js";
import { GasPrice } from '@cosmjs/stargate';
import { properties } from './properties';
import { List, Map } from 'immutable';
import { MList, MMap } from './extensions/immutablejs/types';

export { List, Map, MList, MMap };

export const DECIMAL_0 = new Decimal(0);
export const DECIMAL_1 = new Decimal(1);
export const DECIMAL_10 = new Decimal(10);
export const DECIMAL_100 = new Decimal(100);
export const DECIMAL_INFINITY = new Decimal(Number.POSITIVE_INFINITY);
export const DECIMAL_NEGATIVE_INFINITY = new Decimal(Number.NEGATIVE_INFINITY);
export const DECIMAL_NaN = new Decimal(NaN);
export const BIG_NUMBER_0 = new BN(0);
export const BIG_NUMBER_1 = new BN(1);
export const BIG_NUMBER_10 = new BN(10);
export const BIG_NUMBER_100 = new BN(100);
export const BIG_NUMBER_NaN = new BN(NaN);

properties.set('wallet.prefix', 'thor');

/**
 * Chain
 */
export enum Chain {
	ETHEREUM = 'ethereum',
	RUJIRA = 'rujira',
	THORCHAIN = 'thorchain',
}

/**
 * System status
 */
export enum SystemStatus {
	UP = 'up',
	DOWN = 'down',
}

/**
 * Network
 */
export enum Network {
	MAINNET = 'mainnet',
	TESTNET = 'testnet'
}

/**
 * Transaction status
 */
export enum TransactionStatus {
	PENDING = 'pending',
	SUCCESS = 'success',
	FAILED = 'failed'
}

/**
 * Market status
 */
export enum MarketStatus {
	ACTIVE = 'active',
	INACTIVE = 'inactive'
}

/**
 * Order side
 */
export enum OrderSide {
	BUY = 'buy',
	SELL = 'sell'
}

/**
 * Order type
 */
export enum OrderType {
	MARKET = 'market',
	LIMIT = 'limit'
}

/**
 * Order status
 */
export enum OrderStatus {
	OPEN = 'open',
	CANCELLED = 'cancelled',
	PARTIALLY_FILLED = 'partially_filled',
	FILLED = 'filled',
	CREATION_PENDING = 'creation_pending',
	CANCELLATION_PENDING = 'cancellation_pending',
	UNKNOWN = 'unknown'
}

/**
 * Strategy status
 */
export enum StrategyStatus {
	CREATED = 'created',
	INITIALIZING = 'initializing',
	IDLE = 'idle',
	RUNNING = 'running',
	STOP_REQUESTED = 'stop_requested',
	STOPPING = 'stopping',
	STOPPED = 'stopped'
}

/**
 * Represents an indicator
 */
export class Indicator {

	static accumulation_distribution_line = new Indicator(
		"ad",
		"Accumulation/Distribution Line",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static accumulation_distribution_oscillator = new Indicator(
		"adosc",
		"Accumulation/Distribution Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static average_directional_movement_index = new Indicator(
		"adx",
		"Average Directional Movement Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static average_directional_movement_rating = new Indicator(
		"adxr",
		"Average Directional Movement Rating",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static awesome_oscillator = new Indicator(
		"ao",
		"Awesome Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static absolute_price_oscillator = new Indicator(
		"apo",
		"Absolute Price Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static aroon = new Indicator(
		"aroon",
		"Aroon",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static aroon_oscillator = new Indicator(
		"aroonosc",
		"Aroon Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static average_true_range = new Indicator(
		"atr",
		"Average True Range",
		(candles: List<Candle>) => {
			const result = candles.reduce(
				(data, candle) => {
					data[0].push(candle.high.toNumber());
					data[1].push(candle.low.toNumber());
					data[2].push(candle.close.toNumber());
					return data;
				},
					[[], [], []] as [number[], number[], number[]]
				);
			return result;
		},
		[14	]
	);

	static average_price = new Indicator(
		"avgprice",
		"Average Price",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static bollinger_bands = new Indicator(
		"bbands",
		"Bollinger Bands",
		(candles: List<Candle>) => {
			return [candles.map((candle: Candle) => candle.close.toNumber()).toArray()]
		},
		[20, 2]
	);


	static balance_of_power = new Indicator(
		"bop",
		"Balance of Power",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static commodity_channel_index = new Indicator(
		"cci",
		"Commodity Channel Index",
		(candles: List<Candle>) => {
			const result = candles.reduce(
				(data, candle) => {
					data[0].push(candle.high.toNumber());
					data[1].push(candle.low.toNumber());
					data[2].push(candle.close.toNumber());
					return data;
				},
				[[], [], []] as [number[], number[], number[]]
			);
			return result;
		},
		[20]
	);

	static chande_momentum_oscillator = new Indicator(
		"cmo",
		"Chande Momentum Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static crossany = new Indicator(
		"crossany",
		"Crossany",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static crossover = new Indicator(
		"crossover",
		"Crossover",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static crossunder = new Indicator(
		"crossunder",
		"Crossunder",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static cross_over_number = new Indicator(
		"crossOverNumber",
		"Crossover a number",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static cross_under_number = new Indicator(
		"crossUnderNumber",
		"Crossunder a number",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static chaikins_volatility = new Indicator(
		"cvi",
		"Chaikins Volatility",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static linear_decay = new Indicator(
		"decay",
		"Linear Decay",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static double_exponential_moving_average = new Indicator(
		"dema",
		"Double Exponential Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static directional_indicator = new Indicator(
		"di",
		"Directional Indicator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static directional_movement = new Indicator(
		"dm",
		"Directional Movement",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static detrended_price_oscillator = new Indicator(
		"dpo",
		"Detrended Price Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static directional_movement_index = new Indicator(
		"dx",
		"Directional Movement Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static exponential_decay = new Indicator(
		"edecay",
		"Exponential Decay",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static exponential_moving_average = new Indicator(
		"ema",
		"Exponential Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static ease_of_movement = new Indicator(
		"emv",
		"Ease of Movement",
		(candles: List<Candle>) => {
			const result = candles.reduce(
				(data, candle) => {
					data[0].push(candle.high.toNumber());
					data[1].push(candle.low.toNumber());
					data[2].push(candle.volume.toNumber());
					return data;
				},
				[[], [], []] as [number[], number[], number[]]
			);
			return result;
		},
		[]
	);

	static fisher_transform = new Indicator(
		"fisher",
		"Fisher Transform",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static forecast_oscillator = new Indicator(
		"fosc",
		"Forecast Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static hull_moving_average = new Indicator(
		"hma",
		"Hull Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static kaufman_adaptive_moving_average = new Indicator(
		"kama",
		"Kaufman Adaptive Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static klinger_volume_oscillator = new Indicator(
		"kvo",
		"Klinger Volume Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static lag = new Indicator(
		"lag",
		"Lag",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static linear_regression = new Indicator(
		"linreg",
		"Linear Regression",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static linear_regression_intercept = new Indicator(
		"linregintercept",
		"Linear Regression Intercept",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static linear_regression_slope = new Indicator(
		"linregslope",
		"Linear Regression Slope",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static moving_average_convergence_divergence = new Indicator(
		"macd",
		"Moving Average Convergence/Divergence",
		(candles: List<Candle>) => {
			return [candles.map((candle: Candle) => candle.close.toNumber()).toArray()]
		},
		[12, 26, 9]
	);

	static market_facilitation_index = new Indicator(
		"marketfi",
		"Market Facilitation Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static mass_index = new Indicator(
		"mass",
		"Mass Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static maximum_in_period = new Indicator(
		"max",
		"Maximum In Period",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static mean_deviation_over_period = new Indicator(
		"md",
		"Mean Deviation Over Period",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static median_price = new Indicator(
		"medprice",
		"Median Price",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static money_flow_index = new Indicator(
		"mfi",
		"Money Flow Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static minimum_in_period = new Indicator(
		"min",
		"Minimum In Period",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static momentum = new Indicator(
		"mom",
		"Momentum",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static normalized_average_true_range = new Indicator(
		"natr",
		"Normalized Average True Range",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static negative_volume_index = new Indicator(
		"nvi",
		"Negative Volume Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static on_balance_volume = new Indicator(
		"obv",
		"On Balance Volume",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static percentage_price_oscillator = new Indicator(
		"ppo",
		"Percentage Price Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static parabolic_sar = new Indicator(
		"psar",
		"Parabolic SAR",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static positive_volume_index = new Indicator(
		"pvi",
		"Positive Volume Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static qstick = new Indicator(
		"qstick",
		"Qstick",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static rate_of_change = new Indicator(
		"roc",
		"Rate of Change",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static rate_of_change_ratio = new Indicator(
		"rocr",
		"Rate of Change Ratio",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static relative_strength_index = new Indicator(
		"rsi",
		"Relative Strength Index",
		(candles: List<Candle>) => {
			const result = candles.reduce(
				(data, candle) => {
					return data;
				},
				[[], [], []] as [number[], string[], number[]]
			);
			return result;
		},
		[14]
	);

	static simple_moving_average = new Indicator(
		"sma",
		"Simple Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static standard_deviation_over_period = new Indicator(
		"stddev",
		"Standard Deviation Over Period",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static standard_error_over_period = new Indicator(
		"stderr",
		"Standard Error Over Period",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static stochastic_oscillator = new Indicator(
		"stoch",
		"Stochastic Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static stochastic_rsi = new Indicator(
		"stochrsi",
		"Stochastic RSI",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static sum_over_period = new Indicator(
		"sum",
		"Sum Over Period",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static triple_exponential_moving_average = new Indicator(
		"tema",
		"Triple Exponential Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static true_range = new Indicator(
		"tr",
		"True Range",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static triangular_moving_average = new Indicator(
		"trima",
		"Triangular Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static trix = new Indicator(
		"trix",
		"Trix",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static time_series_forecast = new Indicator(
		"tsf",
		"Time Series Forecast",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static typical_price = new Indicator(
		"typprice",
		"Typical Price",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static ultimate_oscillator = new Indicator(
		"ultosc",
		"Ultimate Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static variance_over_period = new Indicator(
		"var",
		"Variance Over Period",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static vertical_horizontal_filter = new Indicator(
		"vhf",
		"Vertical Horizontal Filter",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static variable_index_dynamic_average = new Indicator(
		"vidya",
		"Variable Index Dynamic Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static annualized_historical_volatility = new Indicator(
		"volatility",
		"Annualized Historical Volatility",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static volume_oscillator = new Indicator(
		"vosc",
		"Volume Oscillator",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static volume_weighted_moving_average = new Indicator(
		"vwma",
		"Volume Weighted Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static williams_accumulation_distribution = new Indicator(
		"wad",
		"Williams Accumulation/Distribution",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static weighted_close_price = new Indicator(
		"wcprice",
		"Weighted Close Price",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static wilders_smoothing = new Indicator(
		"wilders",
		"Wilders Smoothing",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static williams_r = new Indicator(
		"willr",
		"Williams %R",
		(candles: List<Candle>) => {
			const result = candles.reduce(
				(data, candle) => {
					data[0].push(candle.high.toNumber() || 0);
					data[1].push(candle.low.toNumber() || 0);
					data[2].push(candle.close.toNumber() || 0);
					return data;
				},
				[[], [], [], []] as [number[], number[], number[], string[]]
			);
			return result;
		},
		[14]
	);

	static weighted_moving_average = new Indicator(
		"wma",
		"Weighted Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static zero_lag_exponential_moving_average = new Indicator(
		"zlema",
		"Zero-Lag Exponential Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static abands = new Indicator(
		"abands",
		"?",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static arnaud_legoux_moving_average = new Indicator(
		"alma",
		"Arnaud Legoux Moving Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static chandelier_exit = new Indicator(
		"ce",
		"Chandelier Exit",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static chaikin_money_flow = new Indicator(
		"cmf",
		"Chaikin money flow",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static donchian_channels = new Indicator(
		"dc",
		"Donchian Channels",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static force_index = new Indicator(
		"fi",
		"Force index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static keltner_channels = new Indicator(
		"kc",
		"Keltner Channels",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static know_sure_thing = new Indicator(
		"kst",
		"Know Sure Thing",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static pbands = new Indicator(
		"pbands",
		"?",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static polarized_fractal_efficiency = new Indicator(
		"pfe",
		"Polarized Fractal Efficiency",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static poscillator = new Indicator(
		"posc",
		"?",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static relative_momentum_index = new Indicator(
		"rmi",
		"Relative Momentum Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static recursive_moving_trend_average = new Indicator(
		"rmta",
		"Recursive Moving Trend Average",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static relative_vigor_index = new Indicator(
		"rvi",
		"Relative Vigor Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static stochastic_momentum_index = new Indicator(
		"smi",
		"Stochastic Momentum Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static true_strength_index = new Indicator(
		"tsi",
		"True Strength Index",
		(candles: List<Candle>) => {
			return [];
		},
		[]
	);

	static volume_weighted_average_price = new Indicator(
		"vwap",
		"Volume-Weighted Average Price",
		(candles: List<Candle>) => {
			const result = candles.reduce(
				(data, candle) => {
					data[0].push(candle.high.toNumber());
					data[1].push(candle.low.toNumber());
					data[2].push(candle.close.toNumber());
					data[3].push(candle.volume.toNumber());
					return data;
				},
				[[], [], [], [], []] as [number[], number[], number[], number[], string[]]
			);
			return result;
		},
		[]
	);


	/**
	 * ID of the indicator
	 */
	id: IndicatorId;

	/**
	 * Name of the indicator
	 */
	name: IndicatorName;

	/**
	 * Transform the candles to the indicator
	 */
	candlesTransform: (candles: List<Candle>) => any[];

	/**
	 * Default parameters of the indicator
	 */
	parameters: IndicatorParameters;

	/**
	 *
	 * @param id
	 * @param name
	 * @param parameters
	 */
	constructor(id: string, name: string, candlesTransform: (candles: List<Candle>) => any[], parameters: IndicatorParameters) {
		this.id = id;
		this.name = name;
		this.candlesTransform = candlesTransform;
		this.parameters = parameters;
	}

	/**
	 * Get all indicators
	 * @returns All indicators
	 */
	static getAll(): Indicator[] {
		return [
			// Indicator.ease_of_movement,
			// Indicator.accumulation_distribution_line,
			// Indicator.accumulation_distribution_oscillator,
			// Indicator.average_directional_movement_index,
			// Indicator.average_directional_movement_rating,
			// Indicator.awesome_oscillator,
			// Indicator.absolute_price_oscillator,
			// Indicator.aroon,
			// Indicator.aroon_oscillator,
			// Indicator.average_true_range,
			// Indicator.average_price,
			// Indicator.bollinger_bands,
			// Indicator.balance_of_power,
			// Indicator.commodity_channel_index,
			// Indicator.chande_momentum_oscillator,
			// Indicator.crossany,
			// Indicator.crossover,
			// Indicator.crossunder,
			// Indicator.cross_over_number,
			// Indicator.cross_under_number,
			// Indicator.chaikins_volatility,
			// Indicator.linear_decay,
			// Indicator.double_exponential_moving_average,
			// Indicator.directional_indicator,
			// Indicator.directional_movement,
			// Indicator.detrended_price_oscillator,
			// Indicator.directional_movement_index,
			// Indicator.exponential_decay,
			// Indicator.exponential_moving_average,
			// Indicator.forecast_oscillator,
			// Indicator.fisher_transform,
			// Indicator.klinger_volume_oscillator,
			// Indicator.kaufman_adaptive_moving_average,
			// Indicator.klinger_volume_oscillator,
			// Indicator.lag,
			// Indicator.linear_regression,
			// Indicator.linear_regression_intercept,
			// Indicator.linear_regression_slope,
			// Indicator.moving_average_convergence_divergence,
			// Indicator.market_facilitation_index,
			// Indicator.mass_index,
			// Indicator.maximum_in_period,
			// Indicator.mean_deviation_over_period,
			// Indicator.median_price,
			// Indicator.money_flow_index,
			// Indicator.minimum_in_period,
			// Indicator.momentum,
			// Indicator.normalized_average_true_range,
			// Indicator.negative_volume_index,
			// Indicator.on_balance_volume,
			// Indicator.percentage_price_oscillator,
			// Indicator.parabolic_sar,
			// Indicator.positive_volume_index,
			// Indicator.qstick,
			// Indicator.rate_of_change,
			// Indicator.rate_of_change_ratio,
			// Indicator.relative_strength_index,
			// Indicator.simple_moving_average,
			// Indicator.standard_deviation_over_period,
			// Indicator.standard_error_over_period,
			// Indicator.stochastic_oscillator,
			// Indicator.stochastic_rsi,
			// Indicator.sum_over_period,
			// Indicator.triple_exponential_moving_average,
			// Indicator.true_range,
			// Indicator.triangular_moving_average,
			// Indicator.trix,
			// Indicator.time_series_forecast,
			// Indicator.typical_price,
			// Indicator.ultimate_oscillator,
			// Indicator.variance_over_period,
			// Indicator.vertical_horizontal_filter,
			// Indicator.variable_index_dynamic_average,
			// Indicator.annualized_historical_volatility,
			// Indicator.volume_oscillator,
			// Indicator.volume_weighted_moving_average,
			// Indicator.williams_accumulation_distribution,
			// Indicator.weighted_close_price,
			// Indicator.wilders_smoothing,
			// Indicator.williams_r,
			// Indicator.weighted_moving_average,
			// Indicator.zero_lag_exponential_moving_average,
			// Indicator.arnaud_legoux_moving_average,
			// Indicator.chandelier_exit,
			// Indicator.chaikin_money_flow,
			// Indicator.donchian_channels,
			// Indicator.force_index,
			// Indicator.keltner_channels,
			// Indicator.know_sure_thing,
			// Indicator.pbands,
			// Indicator.polarized_fractal_efficiency,
			// Indicator.positive_volume_index,
			// Indicator.relative_momentum_index,
			// Indicator.recursive_moving_trend_average,
			// Indicator.relative_vigor_index,
			// Indicator.stochastic_momentum_index,
			// Indicator.true_strength_index,
			// Indicator.volume_weighted_average_price,
			// Indicator.williams_alligator,
			// Indicator.williams_fractal,
			// Indicator.commodity_channel_index,
			// Indicator.zig_zag,
			// Indicator.woodies_CCI
		];
	}
}

export type Boolean = boolean;
export type Raw = any;
export type Id = string;
export type Address = string;
export type Symbol = string;
export type Name = string;
export type Mnemonic = string;
export type PrivateKey = string;
export type Integer = number;
export type Amount = Decimal;
export type Percentage = Decimal;
export type Hash = string;
export type Timestamp = number;
export type URL = string;
export type ErrorMessage = string;

export type WalletAddress = Address;
export type WalletMnemonic = Mnemonic;
export type WalletPrivateKey = PrivateKey;

export type TokenAddress = Address;
export type TokenSymbol = Symbol;
export type TokenName = Name;
export type TokenDecimals = Integer;

export type FeeAmount = Amount;
export type FeeToken = Token;

export type TransactionHash = Hash;

export type MarketAddress = Address;
export type MarketSymbol = Symbol;
export type MarketDecimals = Integer;
export type MarketPrice = Amount;

export type OrderBookOrderPrice = Amount;
export type OrderBookOrderAmount = Amount;
export type OrderBookPrice = Amount;

export type TickerPrice = Amount;
export type TickerTimestamp = Timestamp;

export type CandleTimestamp = Timestamp;
export type CandlePrice = Amount;
export type CandleVolume = Amount;
export type CandleInterval = '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M' | '1y';

export type IndicatorId = Id;
export type IndicatorName = Name;
export type IndicatorParameters = any[];
export type IndicatorValue = any;

export type OrderId = Id;
export type OrderPrice = Amount;
export type OrderAmount = Amount;
export type OrderFilledAmount = Amount;
export type OrderFilledPercentage = Percentage;
export type OrderCreationTimestamp = Timestamp;
export type OrderUpdateTimestamp = Timestamp;

export type Wallet = {
	cosmWallet: DirectSecp256k1Wallet;
	firstAccount: AccountData;
};

/**
 * Represents a token
 */
export interface Token {
	/**
	 * Address of the token
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

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a transaction
 */
export interface Transaction {
	/**
	 * Hash of the transaction
	 */
	hash: TransactionHash;

	/**
	 * Status of the transaction
	 */
	status: TransactionStatus;

	/**
	 * Fee of the transaction
	 */
	fee: {
		/**
		 * Amount of the fee
		 */
		amount: FeeAmount;

		/**
		 * Token of the fee
		 */
		token: FeeToken;
	};

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a market
 */
export interface Market {
	/**
	 * Address of the market
	 */
	address: MarketAddress;

	/**
	 * Symbol of the market
	 */
	symbol: MarketSymbol;

	/**
	 * Tokens of the market
	 */
	tokens: {
		/**
		 * Base token of the market
		 */
		base: Token;

		/**
		 * Quote token of the market
		 */
		quote: Token;
	};

	/**
	 * Number of decimal places
	 */
	decimals: MarketDecimals;

	/**
	 * Status of the market
	 */
	status: MarketStatus;

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents an order book order
 */
export interface OrderBookOrder {
	/**
	 * Price of the order
	 */
	price: OrderBookOrderPrice;

	/**
	 * Amount of the order
	 */
	amount: OrderBookOrderAmount;

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents an order book
 */
export interface OrderBook {
	/**
	 * Market of the order book
	 */
	market: Market;

	/**
	 * Book of the order book
	 */
	book: {
		/**
		 * Bids of the order book
		 */
		bids: List<OrderBookOrder>;

		/**
		 * Asks of the order book
		 */
		asks: List<OrderBookOrder>;

		/**
		 * Best bid of the order book
		 */
		bestBid?: OrderBookOrder;

		/**
		 * Best ask of the order book
		 */
		bestAsk?: OrderBookOrder;
	}

	/**
	 * Prices of the order book
	 */
	statistics: {
		/**
		 * Middle price of the order book
		 */
		middlePrice: {
			/**
			 * Price of the base token to the quote token
			 */
			baseToQuote?: OrderBookPrice;

			/**
			 * Price of the quote token to the base token
			 */
			quoteToBase?: OrderBookPrice;
		},

		/**
		 * Volume weighted average price (VWAP) of the order book
		 */
		volumeWeightedAveragePrice: {
			/**
			 * Price of the base token to the quote token
			 */
			baseToQuote?: OrderBookPrice;

			/**
			 * Price of the quote token to the base token
			 */
			quoteToBase?: OrderBookPrice;
		}
	}

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a ticker
 */
export interface Ticker {
	/**
	 * Market of the ticker
	 */
	market: Market;

	/**
	 * Price of the ticker
	 */
	middlePrice?: TickerPrice;

	/**
	 * Volume weighted average price (VWAP) of the ticker
	 */
	volumeWeightedAveragePrice?: TickerPrice;

	/**
	 * Timestamp of the ticker
	 */
	timestamp: TickerTimestamp;

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents a candle
 */
export interface Candle {
	/**
	 * Timestamp of the candle
	 */
	timestamp: CandleTimestamp;

	/**
	 * Open price of the candle
	 */
	open: CandlePrice;

	/**
	 * High price of the candle
	 */
	high: CandlePrice;

	/**
	 * Low price of the candle
	 */
	low: CandlePrice;

	/**
	 * Close price of the candle
	 */
	close: CandlePrice;

	/**
	 * Volume of the candle
	 */
	volume: CandleVolume;

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Represents an indicator
 */
export interface IndicatorData {
	/**
	 * ID of the indicator
	 */
	indicator: Indicator;

	/**
	 * Value of the indicator
	 */
	value: IndicatorValue;
}


/**
 * Represents a balance of a token
 */
export interface BaseBalance {
	/**
	 * Free balance of the token
	 */
	free: Amount;

	/**
	 * Locked in orders balance of the token
	 */
	lockedInOrders: Amount;

	/**
	 * Locked in pools balance of the token
	 */
	lockedInPools: Amount;

	/**
	 * Withdrawable balance of the token
	 */
	withdrawable: Amount;

	/**
	 * Total balance of the token
	 */
	total: Amount;
}

/**
 * Represents a balance of a token with a quotation
 */
export interface BaseBalanceWithQuotation extends BaseBalance {
	/**
	 * Quotation of the token
	 */
	quotation: {
		/**
		 * Token of the quotation
		 */
		token: Token;

		/**
		 * Conversion rate of the token
		 */
		tokenToQuote: Amount;

		/**
		 * Conversion rate of the quote
		 */
		quoteToToken: Amount;
	};
}

/**
 * Represents a balance of a token
 */
export interface BaseTokenBalance {
	/**
	 * Balance of the token
	 */
	token: BaseBalance;

	/**
	 * Balance of the native token
	 */
	nativeToken: BaseBalanceWithQuotation;

	/**
	 * Balance of the beacon token
	 */
	beaconToken: BaseBalanceWithQuotation;
}

/**
 * Represents a balance of a token
 */
export interface TokenBalance {
	/**
	 * Token of the balance
	 */
	token: Token;

	/**
	 * Balances of the token
	 */
	balances: BaseTokenBalance;
}

/**
 * Represents a total balance of a token
 */
export interface TotalBalances {
	/**
	 * Balance of the native token
	 */
	nativeToken: BaseBalance;

	/**
	 * Balance of the beacon token
	 */
	beaconToken: BaseBalance;
}

/**
 * Represents a balance of a token
 */
export interface Balances {
	/**
	 * Balances of the tokens
	 */
	tokens: Map<TokenAddress, TokenBalance>;

	/**
	 * Total balances of the wallet
	 */
	total: TotalBalances;
}

/**
 * Represents an order
 */
export interface Order {
	/**
	 * ID of the order
	 */
	id?: OrderId;

	/**
	 * Market of the order
	 */
	market: Market;

	/**
	 * The account which placed the order
	 */
	ownerAddress: WalletAddress;

	/**
	 * Type of the order
	 */
	type: OrderType;

	/**
	 * The side of the order
	 */
	side: OrderSide;

	/**
	 * Price of the order
	 */
	price?: OrderPrice;

	/**
	 * Amount of the order
	 */
	amount: OrderAmount;

	/**
	 * Amount of filled order awaiting withdrawal
	 */
	filledAmount: OrderFilledAmount;

	/**
	 * Filled percentage of the order
	 */
	filledPercentage: OrderFilledPercentage;

	/**
	 * Status of the order
	 */
	status: OrderStatus;

	/**
	 * Timestamp of the order
	 */
	creationTimestamp?: OrderCreationTimestamp;

	/**
	 * Update timestamp of the order
	 */
	updateTimestamp?: OrderUpdateTimestamp;

	/**
	 * Raw data
	 */
	raw: Raw;
}

/**
 * Rujira constructor options
 */
export interface RujiraConstructorOptions {
	/**
	 * Wallet mnemonic
	 */
	walletMnemonic?: WalletMnemonic;

	/**
	 * Wallet private key
	 */
	walletPrivateKey?: WalletPrivateKey;
}

/**
 * Rujira initialize options
 */
export interface RujiraInitializeOptions {
}

/**
 * Fin constructor options
 */
export interface FinConstructorOptions {
}

/**
 * Fin initialize options
 */
export interface FinInitializeOptions {
	/**
	 * Wallet
	 */
	wallet: Wallet;

	/**
	 * Wallet address
	 */
	walletAddress: WalletAddress;

	/**
	 * Cosm client
	 */
	cosmClient: SigningCosmWasmClient;
}

/**
 * Get status request
 */
export interface FinGetStatusRequest {
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
	error?: ErrorMessage;
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
export interface FinGetTokenResponse extends Token {
}

/**
 * Get tokens request (if no addresses or symbols are provided, all tokens will be returned)
 */
export interface FinGetTokensRequest {
	/**
	 * Token addresses
	 */
	addresses?: List<TokenAddress> | TokenAddress[];

	/**
	 * Token symbols
	 */
	symbols?: List<TokenSymbol> | TokenSymbol[];
}

/**
 * Get tokens response
 */
export interface FinGetTokensResponse extends Map<TokenAddress, Token> {
}

/**
 * Get all tokens request
 */
export interface FinGetAllTokensRequest {
}

/**
 * Get all tokens response
 */
export interface FinGetAllTokensResponse extends Map<TokenAddress, Token> {
}

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
export interface FinGetMarketResponse extends Market {
}

/**
 * Get markets request
 */
export interface FinGetMarketsRequest {
	/**
	 * Market address
	 */
	addresses?: List<MarketAddress> | MarketAddress[];

	/**
	 * Market name
	 */
	symbols?: List<MarketSymbol> | MarketSymbol[];
}

/**
 * Get markets response
 */
export interface FinGetMarketsResponse extends Map<MarketAddress, Market> {
}

/**
 * Get all markets request
 */
export interface FinGetAllMarketsRequest {
}

/**
 * Get all markets response
 */
export interface FinGetAllMarketsResponse extends Map<MarketAddress, Market> {
}

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
	 * Market
	 */
	market?: Market;

	/**
	 * Maximum number of orders to return
	 */
	maximumNumberOfOrders?: Integer;
}

/**
 * Get order book response
 */
export interface FinGetOrderBookResponse extends OrderBook {
}

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

	/**
	 * Market
	 */
	market?: Market;
}

/**
 * Get ticker response
 */
export interface FinGetTickerResponse extends Ticker {
}

/**
 * Get candles request
 */
export interface FinGetCandlesRequest {
	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

		/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Maximum number of candles to return
	 */
	maximumNumberOfCandles?: Integer;

	/**
	 * Candle interval
	 */
	interval?: CandleInterval;
}

/**
 * Get candles response
 */
export interface FinGetCandlesResponse extends List<Candle> {
}

/**
 * Get indicators request
 */
export interface FinGetIndicatorsRequest {
	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

		/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Maximum number of candles to return
	 */
	maximumNumberOfCandles?: Integer;

	/**
	 * Candle interval
	 */
	interval?: CandleInterval;

	/**
	 * Candles
	 */
	candles?: List<Candle>;
}

/**
 * Get indicators response
 */
export interface FinGetIndicatorsResponse extends Map<Indicator, IndicatorData> {
}

/**
 * Get balances request
 */
export interface FinGetBalancesRequest {
	/**
	 * Address
	 */
	walletAddress?: WalletAddress;

	/**
	 * Wallet
	 */
	wallet?: Wallet;

	/**
	 * Token addresses to filter balances (optional)
	 */
	tokenAddresses?: List<TokenAddress> | TokenAddress[];

	/**
	 * Token symbols to filter balances
	 */
	tokenSymbols?: List<TokenSymbol> | TokenSymbol[];
}

/**
 * Get balances response
 */
export interface FinGetBalancesResponse extends Balances {
}

/**
 * Get transaction request
 */
export interface FinGetTransactionRequest {
	/**
	 * Transaction hash
	 */
	hash: TransactionHash;

	/**
	 * Wait for confirmation
	 */
	waitForConfirmation?: Boolean;
}

/**
 * Get transaction response
 */
export interface FinGetTransactionResponse extends Transaction {
}

/**
 * Get order request
 */
export interface FinGetOrderRequest {
	/**
	 * Owner address (wallet that owns the order)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Order price
	 */
	orderPrice: OrderPrice;

	/**
	 * Order type
	 */
	orderType?: OrderType;

	/**
	 * Order side
	 */
	orderSide?: OrderSide;

	/**
	 * Order status
	 */
	orderStatus?: OrderStatus;
}

export interface FinGetOrderResponse extends Order {
}

/**
 * Get orders request
 */
export interface FinGetOrdersRequest {
	/**
	 * Owner address (wallet that owns the order)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Order IDs
	 */
	orderIds?: List<OrderId> | OrderId[];

	/**
	 * Orders
	 */
	orders?: List<Order> | Order[];

	/**
	 * Order price
	 */
	orderPrices?: List<OrderPrice> | OrderPrice[];

	/**
	 * Order type
	 */
	orderTypes?: List<OrderType> | OrderType[];

	/**
	 * Order side
	 */
	orderSides?: List<OrderSide> | OrderSide[];

	/**
	 * Order status
	 */
	orderStatuses?: List<OrderStatus> | OrderStatus[];

	/**
	 * Maximum number of orders to return
	 */
	maximumNumberOfOrders?: Integer;
}

/**
 * Get orders response
 */
export interface FinGetOrdersResponse extends Map<OrderId, Order> {
}

/**
 * Create order request
 */
export interface FinPlaceOrderRequest {
	/**
	 * Owner address (wallet that will create the order)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;

	/**
	 * Order side (buy/sell)
	 */
	side: OrderSide;

	/**
	 * Order type (market/limit)
	 */
	type: OrderType;

	/**
	 * Order amount
	 */
	amount: OrderAmount;

	/**
	 * Order price (required for limit orders)
	 */
	price?: OrderPrice;
}

/**
 * Create order response
 */
export interface FinPlaceOrderResponse {
	/**
	 * Order that was created
	 */
	order: Order;

	/**
	 * Transaction details
	 */
	transaction: Transaction;
}

/**
 * Create orders request
 */
export interface FinPlaceOrdersRequest {
	/**
	 * Owner address (wallet that will create the orders)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * List of orders to create
	 */
	orders: List<FinPlaceOrderRequest> | FinPlaceOrderRequest[];
}

/**
 * Create orders response
 */
export interface FinPlaceOrdersResponse {
	/**
	 * List of created orders
	 */
	orders: Map<OrderId, Order>;

	/**
	 * Transaction details
	 */
	transactions: Map<TransactionHash, Transaction>;
}

/**
 * Replace order request
 */
export interface FinReplaceOrderRequest extends FinPlaceOrderRequest {
}

/**
 * Replace order response
 */
export interface FinReplaceOrderResponse extends FinPlaceOrderResponse {
}

/**
 * Replace orders request
 */
export interface FinReplaceOrdersRequest extends FinPlaceOrdersRequest {
}

/**
 * Replace orders response
 */
export interface FinReplaceOrdersResponse extends FinPlaceOrdersResponse {
}

/**
 * Cancel order request
 */
export interface FinCancelOrderRequest {
	/**
	 * Order ID
	 */
	orderId?: OrderId;

	/**
	 * Order
	 */
	order?: Order;

	/**
	 * Owner address (wallet that will cancel the order)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;
}

/**
 * Cancel order response
 */
export interface FinCancelOrderResponse {
	/**
	 * Order that was cancelled
	 */
	order: Order;

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
	 * Order IDs
	 */
	orderIds?: List<OrderId> | OrderId[];

	/**
	 * Orders
	 */
	orders?: List<Order> | Order[];

	/**
	 * Owner address (wallet that will cancel the orders)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;
}

/**
 * Cancel orders response
 */
export interface FinCancelOrdersResponse {
	/**
	 * List of cancelled orders
	 */
	orders: Map<OrderId, Order>;

	/**
	 * Transaction details
	 */
	transactions: Map<TransactionHash, Transaction>;
}

/**
 * Cancel all orders request
 */
export interface FinCancelAllOrdersRequest extends FinCancelOrdersRequest {
}

/**
 * Cancel all orders response
 */
export interface FinCancelAllOrdersResponse extends FinCancelOrdersResponse {
}

/**
 * Withdraw from market request
 */
export interface FinWithdrawRequest {
	/**
	 * Owner address (wallet that will withdraw)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market name
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market
	 */
	market?: Market;
}

/**
 * Withdraw from market response
 */
export interface FinWithdrawResponse {
	/**
	 * List of withdrawn orders
	 */
	orders: Map<OrderId, Order>;

	/**
	 * Transaction details
	 */
	transactions: Map<TransactionHash, Transaction>;
}

/**
 * Unified order execution request that can handle place, replace, cancel, and withdraw operations
 */
export interface FinExecuteOrdersRequest {
	/**
	 * Owner address (wallet that will execute the orders)
	 */
	ownerAddress?: WalletAddress;

	/**
	 * Owner wallet
	 */
	owner?: Wallet;

	/**
	 * Market address
	 */
	marketAddress?: MarketAddress;

	/**
	 * Market symbol
	 */
	marketSymbol?: MarketSymbol;

	/**
	 * Market object
	 */
	market?: Market;

	/**
	 * Order operations to execute
	 */
	orders: {
		/**
		 * Place new orders
		 */
		place?: List<FinPlaceOrderRequest>;

		/**
		 * Replace existing orders
		 */
		replace?: List<FinReplaceOrderRequest>;

		/**
		 * Cancel orders by IDs or order objects
		 */
		cancel?: List<OrderId> | List<Order> | OrderId[] | Order[];

		/**
		 * Withdraw filled orders by IDs or order objects
		 */
		withdraw?: List<OrderId> | List<Order> | OrderId[] | Order[];
	};
}

/**
 * Unified order execution response
 */
export interface FinExecuteOrdersResponse {
	/**
	 * Placed orders (if any)
	 */
	placedOrders?: Map<OrderId, Order>;

	/**
	 * Replaced orders (if any)
	 */
	replacedOrders?: Map<OrderId, Order>;

	/**
	 * Cancelled orders (if any)
	 */
	cancelledOrders?: Map<OrderId, Order>;

	/**
	 * Withdrawn orders (if any)
	 */
	withdrawnOrders?: Map<OrderId, Order>;

	/**
	 * All transactions from the execution
	 */
	transactions: Map<TransactionHash, Transaction>;
}
