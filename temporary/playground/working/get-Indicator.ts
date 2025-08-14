import { properties, Properties } from "../../../src/properties";
import { Rujira } from "../../../src/rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions, WalletMnemonic, WalletPrivateKey, WalletAddress, List, Candle } from "../../../src/types";

(async function run() {
	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey')
	} as RujiraConstructorOptions)

	await rujira.initialize({} as RujiraInitializeOptions)

	const candles = await rujira.fin.getCandles({
		marketSymbol: 'THOR-RUJI/ETH-USDC',
	})

	// const candleTransform = (candles: List<Candle>) => candles.reduce((data, candle) => {
	// 	return candles.map((candle) => {
	// 		return {
	// 			open: candle.open.toNumber(),
	// 			high: candle.high.toNumber(),
	// 			low: candle.low.toNumber(),
	// 			close: candle.close.toNumber(),
	// 		}
	// 	}).toArray()
	// });

	console.log(candles.map((candle) => candle.high.toNumber()).toArray());

	// const candleTransform = (candles: List<Candle>) => {
	// 	const result = candles.reduce(
	// 		(data, candle) => {
	// 			data[0].push(candle.high.toNumber());
	// 			data[1].push(candle.low.toNumber());
	// 			data[2].push(candle.close.toNumber());
	// 			data[3].push(candle.volume.toNumber());
	// 			return data;
	// 		},
	// 		[[], [], [], []] as [number[], number[], number[], number[]]
	// 	);
	// 	return result;
	// }

	// console.log(candleTransform(candles));
})();
