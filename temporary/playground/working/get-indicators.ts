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
