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
		marketSymbol: 'RUJI/USDC',
	})

	console.log(candles.toJS());

	// const candlesTransform = (candles: List<Candle>) => {
	// 	return [candles.map((candle: Candle) => candle.close.toNumber()).toArray()]
	// };

	const candlesTransform = (candles: List<Candle>) => {
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
	};

	const data = candlesTransform(candles);

	console.log(data);

	const indicators = await rujira.fin.getIndicators({
		marketSymbol: 'RUJI/USDC',
		candles,
	})

	console.log(indicators.toJS());
})();
