import { properties } from "./properties";
import { SimplePureMarketMarkingStrategy } from "./strategies/simple_pure_market_marking_strategy";
import { EnhancedPureMarketMarkingStrategy } from "./strategies/enhanced_pure_market_marking_strategy";
import { WalletMnemonic, WalletPrivateKey } from "./types";

(async function run() {
	// Configure the project and the strategy from the configuration files on resources/configuration folder.

	const simplePureMarketMarkingStrategy = new SimplePureMarketMarkingStrategy({
		// You need to provide either the wallet mnemonic or the wallet private key
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	});

	const enhancedPureMarketMarkingStrategy = new EnhancedPureMarketMarkingStrategy({
		// You need to provide either the wallet mnemonic or the wallet private key
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	});

	const strategy = simplePureMarketMarkingStrategy;

	await strategy.initialize({});

	await strategy.run({});
})();
