import { properties } from "../../../src/properties";
import { Rujira } from "../../../src/rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions, WalletMnemonic, WalletPrivateKey } from "../../../src/types";

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

	const indicators = await rujira.fin.getIndicators({
		marketSymbol: 'RUJI/USDC',
		candles,
	})

	console.log(indicators.toJS());
})();
