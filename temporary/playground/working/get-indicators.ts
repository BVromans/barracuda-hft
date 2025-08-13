import { properties } from "../../../src/properties";
import { Rujira } from "../../../src/rujira";
import { Candle, List, RujiraConstructorOptions, RujiraInitializeOptions, WalletMnemonic, WalletPrivateKey } from "../../../src/types";

(async function run() {
	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

	const candles = await rujira.fin.getCandles({
		marketSymbol: 'THOR-NAMI/ETH-USDC',
		maximumNumberOfCandles: 1000,
		interval: '1d',
	})

	console.log('Candles count:', candles.size);

	// Verificar candles com dados válidos
	let validCandles = 0;
	let candlesWithVolume = 0;
	let candlesWithRange = 0;

	for (let i = 0; i < Math.min(100, candles.size); i++) {
		const candle = candles.get(i);
		if (candle) {
			const high = candle.high.toNumber();
			const low = candle.low.toNumber();
			const volume = candle.volume.toNumber();

			if (volume > 0) candlesWithVolume++;
			if (high !== low) candlesWithRange++;
			validCandles++;
		}
	}

	console.log('Sample analysis:', {
		validCandles,
		candlesWithVolume,
		candlesWithRange,
		percentageWithVolume: (candlesWithVolume / validCandles * 100).toFixed(2) + '%',
		percentageWithRange: (candlesWithRange / validCandles * 100).toFixed(2) + '%'
	});

	// const candlesTransform = (candles: List<Candle>) => {
	// 	return [candles.map((candle: Candle) => candle.close.toNumber()).toArray()]
	// };

	// const candlesTransform = (candles: List<Candle>) => {
	// 	const result = candles.reduce(
	// 		(data, candle) => {
	// 			data[0].push(candle.high.toNumber());
	// 			data[1].push(candle.low.toNumber());
	// 			data[2].push(candle.volume.toNumber());
	// 			return data;
	// 		},
	// 		[[], [], []] as [number[], number[], number[]]
	// 	);
	// 	return result;
	// };

	// const data = candlesTransform(candles);

	// console.log(data);

	const indicators = await rujira.fin.getIndicators({
		marketSymbol: 'THOR-NAMI/ETH-USDC',
		candles,
	})

	console.log(indicators.toJS());
})();

// Indicator.abands, ok no doc
			// Indicator.absolute_price_oscillator, ok no doc
			// Indicator.accumulation_distribution_line, ok
			// Indicator.annualized_historical_volatility, ok (Historical Volatility)
			// Indicator.aroon, ok
			// Indicator.aroon_oscillator, ok no doc
			// Indicator.arnaud_legoux_moving_average, ok
			// Indicator.average_directional_movement_index, //ok (Average Directional Index)
			// Indicator.average_directional_movement_rating, ok no doc
			// Indicator.average_price, ok no doc
			// Indicator.average_true_range, ok
			// Indicator.awesome_oscillator, ok
			// Indicator.balance_of_power, ok
			// Indicator.bollinger_bands, ok
			// Indicator.chandelier_exit, ok no doc
			// Indicator.chaikin_money_flow, ok
			// Indicator.chaikins_volatility, //ok no doc
			// Indicator.chande_momentum_oscillator, ok
			// Indicator.commodity_channel_index, ok
			// Indicator.crossover, //ok no doc
			// Indicator.cross_over_number, //ok no doc
			// Indicator.cross_under_number, //ok no doc
			// Indicator.detrended_price_oscillator, //ok
			// Indicator.directional_indicator, ok no doc
			// Indicator.directional_movement, ok
			// Indicator.directional_movement_index, ok
			// Indicator.donchian_channels, ok
			// Indicator.double_exponential_moving_average, ok
			// Indicator.ease_of_movement, ok
			// Indicator.exponential_decay, //ok no doc
			// Indicator.exponential_moving_average, ok
			// Indicator.fisher_transform, ok
			// Indicator.force_index, //ok (Elder's Force Index (EFI))
			// Indicator.forecast_oscillator, //ok no doc
			// Indicator.hull_moving_average, //ok
			// Indicator.kaufman_adaptive_moving_average, //ok no doc
			// Indicator.keltner_channels, //ok no doc
			// Indicator.klinger_volume_oscillator, ok
			// Indicator.know_sure_thing, //ok
			// Indicator.lag, ok no doc
			// Indicator.linear_decay, //ok no doc
			// Indicator.linear_regression, //ok
			// Indicator.linear_regression_intercept, //ok no doc
			// Indicator.linear_regression_slope, //ok no doc
			// Indicator.mass_index, //ok
			// Indicator.market_facilitation_index, //ok no doc
			// Indicator.maximum_in_period, //ok no doc
			// Indicator.mean_deviation_over_period, //ok no doc
			// Indicator.median_price, //ok no doc
			// Indicator.minimum_in_period, //ok no doc
			// Indicator.momentum, //ok no doc
			// Indicator.money_flow_index, //ok
			// Indicator.moving_average_convergence_divergence, //ok
			// Indicator.negative_volume_index, //ok no doc
			// Indicator.normalized_average_true_range, //ok no doc
			// Indicator.on_balance_volume, //ok
			// Indicator.pbands, //ok no doc
			// Indicator.parabolic_sar, //ok no doc
			// Indicator.percentage_price_oscillator, //ok no doc
			// Indicator.polarized_fractal_efficiency, //ok no doc
			// Indicator.poscillator, //ok no doc
			// Indicator.positive_volume_index, //ok no doc
			// Indicator.qstick, //ok no doc
			// Indicator.rate_of_change, //ok no doc
			// Indicator.rate_of_change_ratio, //ok no doc
			// Indicator.recursive_moving_trend_average, //ok no doc
			// Indicator.relative_momentum_index,  //ok no doc
			// Indicator.relative_strength_index, //ok
			// Indicator.relative_vigor_index, //ok
			// Indicator.simple_moving_average, //ok no doc
			// Indicator.standard_deviation_over_period, //ok no doc
			// Indicator.standard_error_over_period, //ok no doc
			// Indicator.stochastic_momentum_index, //ok
			// Indicator.stochastic_oscillator, //ok
			// Indicator.stochastic_rsi, //ok
			// Indicator.sum_over_period, //ok no doc
			// Indicator.time_series_forecast, //ok no doc
			// Indicator.triangular_moving_average, //ok no doc
			// Indicator.trix,  //ok
			// Indicator.true_range, //ok no doc
			// Indicator.true_strength_index, //ok
			// Indicator.triple_exponential_moving_average, //ok
			// Indicator.typical_price, //ok no doc
			// Indicator.ultimate_oscillator, //ok
			// Indicator.variable_index_dynamic_average, //ok no doc
			// Indicator.vertical_horizontal_filter, //ok no doc
			// Indicator.volume_oscillator, //ok
			// Indicator.volume_weighted_average_price, //ok
			// Indicator.volume_weighted_moving_average, //ok
			// Indicator.weighted_close_price, //ok no doc
			// Indicator.weighted_moving_average, //ok
			// Indicator.williams_accumulation_distribution, //ok no doc
			// Indicator.williams_r, //ok
			// Indicator.wilders_smoothing, //ok no doc
			// Indicator.zero_lag_exponential_moving_average, //ok no doc
