import { properties, Properties } from "../../../src/properties";
import { Rujira } from "../../../src/rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions,  WalletMnemonic, WalletPrivateKey, WalletAddress, List, Candle} from "../../../src/types";

(async function run()  {
 const rujira = new Rujira({
  walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
	walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey')
 } as RujiraConstructorOptions)

 await rujira.initialize({} as RujiraInitializeOptions)
 const candles = await rujira.fin.getCandles({
  marketSymbol: 'RUJI/USDC',
 })


const candleTransform = (candles: List<Candle>) => candles.reduce((acc, candle) => {
	return candles.map((candle) => {
		return {
			open: candle.open.toNumber(),
			high: candle.high.toNumber(),
			low: candle.low.toNumber(),
			close: candle.close.toNumber(),
		}
	}).toArray()

	console.log(candles.toJS());









})
