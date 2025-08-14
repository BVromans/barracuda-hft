import { properties } from "../../src/properties";
import { Rujira } from "../../src/rujira";
import {
  RujiraConstructorOptions,
  RujiraInitializeOptions,
  WalletAddress,
  WalletMnemonic,
  WalletPrivateKey
} from "../../src/types";

(async function run() {
	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

	await rujira.fin.getToken({ symbol: 'CHAIN1-SYMBOL1/CHAIN2-SYMBOL2' });
})();
