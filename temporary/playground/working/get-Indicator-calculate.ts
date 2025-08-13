import { properties } from "../../../src/properties";
import { Rujira } from "../../../src/rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions, WalletMnemonic, WalletPrivateKey } from "../../../src/types";
import { Indicator } from "../../../src/types";

(async function run() {
	console.log('Starting Rujira initialization...');
	const startInit = performance.now();

	const rujira = new Rujira({
		walletMnemonic: properties.getAs<WalletMnemonic | undefined>('rujira.wallet.mnemonic'),
		walletPrivateKey: properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey'),
	} as RujiraConstructorOptions);

	await rujira.initialize({} as RujiraInitializeOptions);

	const initTime = performance.now() - startInit;
	console.log(`Rujira initialized in ${initTime.toFixed(2)}ms`);

	// Test 1: WITH pre-fetched candles
	console.log('\n=== TEST 1: WITH pre-fetched candles ===');

	console.log('Fetching candles...');
	const startCandles = performance.now();

	const candles = await rujira.fin.getCandles({
		marketSymbol: 'THOR-RUJI/ETH-USDC',
		maximumNumberOfCandles: 100,
		interval: '1m',
	});

	const candlesTime = performance.now() - startCandles;
	console.log(`Candles fetched in ${candlesTime.toFixed(2)}ms (${candles.size} candles)`);

	if (candles.size === 0) {
		console.log('No candles available. Exiting.');
		return;
	}

	// Filter to only valid candles
	const validCandlesList = candles.filter(candle =>
		candle && candle.high && candle.low && candle.close && candle.volume
	);

	console.log(`Filtered to ${validCandlesList.size} valid candles`);

	// Test ALL indicators WITH candles
	console.log('\nTesting ALL indicators WITH candles...');
	const allIndicators = Indicator.getAll();
	console.log(`Total indicators to test: ${allIndicators.length}`);

	const indicatorsModule = await import('@ixjb94/indicators-js');
	const resultsWithCandles = {
		successful: [] as string[],
		failed: [] as string[],
		totalTime: 0,
		startTime: performance.now()
	};

	for (const indicator of allIndicators) {
		try {
			const startTime = performance.now();

			const transformedData = indicator.candlesTransform(validCandlesList);
			const value = (indicatorsModule as any)[indicator.id](...transformedData, ...indicator.parameters);

			const endTime = performance.now();
			const duration = endTime - startTime;
			resultsWithCandles.totalTime += duration;

			resultsWithCandles.successful.push(indicator.id);
			console.log(`✅ ${indicator.id}: ${duration.toFixed(2)}ms`);
		} catch (error) {
			resultsWithCandles.failed.push(indicator.id);
			console.log(`❌ ${indicator.id}: Failed`);
		}
	}

	const totalTestTimeWithCandles = performance.now() - resultsWithCandles.startTime;

	// Test 2: WITHOUT candles (Rujira fetches all)
	console.log('\n=== TEST 2: WITHOUT pre-fetched candles ===');
	console.log('Rujira will fetch all available candles automatically...');

	const startIndicatorsNoCandles = performance.now();

	try {
		const indicatorsNoCandles = await rujira.fin.getIndicators({
			marketSymbol: 'THOR-RUJI/ETH-USDC',
			// No candles parameter - Rujira will fetch all
			maximumNumberOfCandles: 1000,
			interval: '1m',
		});

		const indicatorsNoCandlesTime = performance.now() - startIndicatorsNoCandles;
		console.log(`Indicators calculated WITHOUT candles in ${indicatorsNoCandlesTime.toFixed(2)}ms`);
		console.log(`Indicators count: ${indicatorsNoCandles.size}`);

		// Show a few indicator examples
		console.log('\nSample indicators (without pre-fetched candles):');
		let count = 0;
		for (const [id, data] of indicatorsNoCandles.entries()) {
			if (count < 5) {
				console.log(`${id}: ${data.value?.length || 'N/A'} values`);
				count++;
			} else {
				break;
			}
		}

		console.log('\n=== PERFORMANCE COMPARISON ===');
		console.log(`- Initialization: ${initTime.toFixed(2)}ms`);
		console.log(`- Test 1 (WITH candles):`);
		console.log(`  - Candles fetch: ${candlesTime.toFixed(2)}ms`);
		console.log(`  - Indicators calculation: ${resultsWithCandles.totalTime.toFixed(2)}ms`);
		console.log(`  - Total Test 1 time: ${(candlesTime + resultsWithCandles.totalTime).toFixed(2)}ms`);
		console.log(`- Test 2 (WITHOUT candles):`);
		console.log(`  - Indicators calculation (includes fetch): ${indicatorsNoCandlesTime.toFixed(2)}ms`);
		console.log(`- Overall total time: ${(initTime + candlesTime + resultsWithCandles.totalTime + indicatorsNoCandlesTime).toFixed(2)}ms`);

		// Performance analysis
		const test1Total = candlesTime + resultsWithCandles.totalTime;
		const test2Total = indicatorsNoCandlesTime;

		console.log(`\nPerformance Analysis:`);
		console.log(`- Test 1 (WITH candles): ${test1Total.toFixed(2)}ms`);
		console.log(`- Test 2 (WITHOUT candles): ${test2Total.toFixed(2)}ms`);
		console.log(`- Difference: ${Math.abs(test1Total - test2Total).toFixed(2)}ms`);
		console.log(`- Test 1 is ${test1Total > test2Total ? 'slower' : 'faster'} than Test 2`);

	} catch (error) {
		const indicatorsNoCandlesTime = performance.now() - startIndicatorsNoCandles;
		console.log(`❌ Test 2 failed after ${indicatorsNoCandlesTime.toFixed(2)}ms`);
		console.log(`Error: ${(error as Error).message}`);

		console.log('\n=== PERFORMANCE COMPARISON (Test 2 failed) ===');
		console.log(`- Initialization: ${initTime.toFixed(2)}ms`);
		console.log(`- Test 1 (WITH candles):`);
		console.log(`  - Candles fetch: ${candlesTime.toFixed(2)}ms`);
		console.log(`  - Indicators calculation: ${resultsWithCandles.totalTime.toFixed(2)}ms`);
		console.log(`  - Total Test 1 time: ${(candlesTime + resultsWithCandles.totalTime).toFixed(2)}ms`);
		console.log(`- Test 2 (WITHOUT candles): FAILED after ${indicatorsNoCandlesTime.toFixed(2)}ms`);

		console.log(`\nConclusion: Test 1 (WITH candles) is more reliable and completed successfully.`);
		console.log(`Test 2 (WITHOUT candles) failed due to data validation issues.`);
	}

	// Final results for Test 1
	console.log('\n=== FINAL RESULTS FOR TEST 1 ===');
	console.log(`- Successful indicators: ${resultsWithCandles.successful.length}/${allIndicators.length}`);
	console.log(`- Failed indicators: ${resultsWithCandles.failed.length}/${allIndicators.length}`);
	console.log(`- Total calculation time: ${resultsWithCandles.totalTime.toFixed(2)}ms`);
	console.log(`- Total test time: ${totalTestTimeWithCandles.toFixed(2)}ms`);

	if (resultsWithCandles.failed.length > 0) {
		console.log('\nFailed indicators:');
		resultsWithCandles.failed.forEach(id => console.log(`  - ${id}`));
	}
})();
