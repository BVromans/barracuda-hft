import "./bootstrap";
import { properties } from "./properties";
import { SimplePureMarketMakingStrategy } from "./strategies/simple_pure_market_making_strategy";
import { EnhancedPureMarketMakingStrategy } from "./strategies/enhanced_pure_market_making_strategy";
import { WalletMnemonic, WalletPrivateKey } from "./types";

(async function run() {
	// Configure the project and the strategy from the configuration files on resources/configuration folder.

	// You need to provide either the wallet mnemonic or the wallet private key
	const walletMnemonic = properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic');
	const walletPrivateKey = properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey');

	if (!walletMnemonic && !walletPrivateKey) {
		throw new Error('Missing wallet mnemonic/privateKey. Configure resources/configuration/<env>.yml or environment variables.');
	}

	const simplePureMarketMakingStrategy = new SimplePureMarketMakingStrategy({
		walletMnemonic: walletMnemonic,
		walletPrivateKey: walletPrivateKey,
	});

	const enhancedPureMarketMakingStrategy = new EnhancedPureMarketMakingStrategy({
		walletMnemonic: walletMnemonic,
		walletPrivateKey: walletPrivateKey,
	});

	const strategy = simplePureMarketMakingStrategy;
	// const strategy = enhancedPureMarketMakingStrategy;

	await strategy.initialize({});

	await strategy.run({});
})();
