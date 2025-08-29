import "./bootstrap";
import { properties } from "./properties";
import { SimplePureMarketMarkingStrategy } from "./strategies/simple_pure_market_making_strategy";
import { EnhancedPureMarketMarkingStrategy } from "./strategies/enhanced_pure_market_making_strategy";
import { WalletMnemonic, WalletPrivateKey } from "./types";

(async function run() {
	// Configure the project and the strategy from the configuration files on resources/configuration folder.

	// You need to provide either the wallet mnemonic or the wallet private key
	const walletMnemonic = properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic');
	// const walletPrivateKey = properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey');

	const simplePureMarketMarkingStrategy = new SimplePureMarketMarkingStrategy({
		walletMnemonic: walletMnemonic,
		// walletPrivateKey: walletPrivateKey,
	});

	const enhancedPureMarketMarkingStrategy = new EnhancedPureMarketMarkingStrategy({
		walletMnemonic: walletMnemonic,
		// walletPrivateKey: walletPrivateKey,
	});

	// const strategy = simplePureMarketMarkingStrategy;
	const strategy = enhancedPureMarketMarkingStrategy;

	await strategy.initialize({});

	await strategy.run({});
})();
