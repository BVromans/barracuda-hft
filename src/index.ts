import { properties } from "./properties";
import { SimplePureMarketMarking } from "./strategies/simple_pure_market_marking";
import { EnhancedPureMarketMarking } from "./strategies/enhanced_pure_market_marking";
import { WalletMnemonic, WalletPrivateKey } from "./types";

(async function run() {
	// Configure the project and the strategy from the configuration files on resources/configuration folder.

	const strategy = new SimplePureMarketMarking({
		// You need to provide either the wallet mnemonic or the wallet private key
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	});

	// const strategy = new EnhancedPureMarketMarking({
	// 	// You need to provide either the wallet mnemonic or the wallet private key
	// 	walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
	// 	walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	// });

	await strategy.initialize({});

	await strategy.run({});
})();
