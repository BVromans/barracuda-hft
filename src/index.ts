import { properties } from "./properties";
import { Rujira } from "./rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions, WalletMnemonic, WalletPrivateKey } from "./types";

(async function run() {
	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);
})();
