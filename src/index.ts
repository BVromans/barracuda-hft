import { Rujira } from "./rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions } from "./types";

(async function run() {
	const rujira = new Rujira({
		rpcEndpoint: process.env.RPC_ENDPOINT!,
		walletMnemonic: process.env.WALLET_MNEMONIC!,
		walletPrivateKey: process.env.WALLET_PRIVATE_KEY!,
		restEndpoint: process.env.REST_ENDPOINT!,
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);
})();
