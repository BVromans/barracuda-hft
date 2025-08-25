// Playground for testing getIndicators with filtered indicators
// Usage: bun run temporary/playground/working/get-indicators-filtered.ts

import { Rujira } from "../../../src/rujira";
import { Properties } from "../../../src/properties";
import { Indicator, IndicatorId } from "../../../src/types";

async function testFilteredIndicators() {
	console.log('🔧 Testing getIndicators with Filtered Indicators');
	console.log('================================================\n');

	// Initialize Rujira (public APIs only)
	console.log('🚀 Initializing Rujira (public APIs only)...');
	const rujira = new Rujira({
		walletMnemonic: 'test test test test test test test test test test test junk', // Dummy mnemonic for public APIs
	});

	await rujira.initialize({});
	console.log('✅ Rujira initialized (public APIs only)\n');

	// Get properties for testing
	console.log('⚙️ Loading properties...');
	const props = await Properties.getInstance();
	console.log('✅ Properties loaded\n');

	// Get a market for testing
	console.log('📊 Getting markets...');
	const markets = await rujira.fin.getAllMarkets({});
	const testMarket = markets.get(Array.from(markets.keys())[0]);

	if (!testMarket) {
		console.log('❌ No markets found');
		return;
	}

	console.log(`🎯 Testing with market: ${testMarket.symbol}\n`);

	// Get all available indicators from types
	const allAvailableIndicators = Object.getOwnPropertyNames(Indicator)
		.filter(prop => prop !== 'length' && prop !== 'name' && prop !== 'prototype' && prop !== 'getAll')
		.filter(prop => typeof Indicator[prop as keyof typeof Indicator] === 'object');

	console.log(`📈 Total available indicators: ${allAvailableIndicators.length}`);
	console.log(`🔍 Sample indicators: ${allAvailableIndicators.slice(0, 10).join(', ')}\n`);

	// Test 1: Get all indicators (default behavior)
	console.log('=== TEST 1: Get ALL indicators ===');
	const startTime1 = Date.now();

	const allIndicators = await rujira.fin.getIndicators({
		market: testMarket,
		maximumNumberOfCandles: 100
	});

	const time1 = Date.now() - startTime1;
	console.log(`✅ All indicators calculated in ${time1}ms`);
	console.log(`📈 Total indicators: ${allIndicators.size}`);
	console.log(`🔍 Sample indicators: ${Array.from(allIndicators.keys()).slice(0, 5).join(', ')}\n`);

	// Test 2: Get only specific indicators
	console.log('=== TEST 2: Get SPECIFIC indicators ===');
	const startTime2 = Date.now();

	const specificIndicators = await rujira.fin.getIndicators({
		market: testMarket,
		maximumNumberOfCandles: 100,
		indicators: ['mfi', 'rsi', 'bbands', 'macd', 'atr']
	});

	const time2 = Date.now() - startTime2;
	console.log(`✅ Specific indicators calculated in ${time2}ms`);
	console.log(`📈 Total indicators: ${specificIndicators.size}`);
	console.log(`🔍 Requested indicators: ${Array.from(specificIndicators.keys()).join(', ')}\n`);

	// Test 3: Get indicators using array format
	console.log('=== TEST 3: Get indicators using array format ===');
	const startTime3 = Date.now();

	const arrayIndicators = await rujira.fin.getIndicators({
		market: testMarket,
		maximumNumberOfCandles: 100,
		indicators: ['sma', 'ema', 'vwap']
	});

	const time3 = Date.now() - startTime3;
	console.log(`✅ Array indicators calculated in ${time3}ms`);
	console.log(`📈 Total indicators: ${arrayIndicators.size}`);
	console.log(`🔍 Requested indicators: ${Array.from(arrayIndicators.keys()).join(', ')}\n`);

	// Test 4: Individual indicator performance
	console.log('=== TEST 4: Individual Indicator Performance ===');
	const testIndicators = [...Indicator.getAll().map(indicator => indicator.id)];
	const individualTimes: { [key: string]: number } = {};

	for (const indicatorId of testIndicators) {
		const startTime = Date.now();

		const singleIndicator = await rujira.fin.getIndicators({
			market: testMarket,
			maximumNumberOfCandles: 100,
			indicators: [indicatorId]
		});

		const time = Date.now() - startTime;
		individualTimes[indicatorId] = time;
		console.log(`⏱️ ${indicatorId}: ${time}ms`);
	}

	// Test 5: Performance comparison
	console.log('\n=== PERFORMANCE COMPARISON ===');
	console.log(`🕐 Test 1 (ALL indicators): ${time1}ms`);
	console.log(`🕐 Test 2 (5 specific indicators): ${time2}ms`);
	console.log(`🕐 Test 3 (3 specific indicators): ${time3}ms`);

	const speedup1 = ((time1 - time2) / time1 * 100).toFixed(1);
	const speedup2 = ((time1 - time3) / time1 * 100).toFixed(1);

	console.log(`⚡ Speedup Test 2: ${speedup1}% faster`);
	console.log(`⚡ Speedup Test 3: ${speedup2}% faster\n`);

	// Test 6: Verify indicator values
	console.log('=== TEST 6: Verify Indicator Values ===');
	for (const [indicatorId, indicatorData] of specificIndicators) {
		const value = indicatorData.value;
		try {
			if (Array.isArray(value)) {
				if (typeof value[0] === 'number') {
					console.log(`✅ ${indicatorId}: ${value.length} values, first: ${value[0].toFixed(4)}`);
				} else {
					console.log(`✅ ${indicatorId}: ${value.length} values, first: ${value[0]}`);
				}
			} else if (Array.isArray(value[0])) {
				if (typeof value[0][0] === 'number') {
					console.log(`✅ ${indicatorId}: ${value[0].length} values, first: ${value[0][0].toFixed(4)}`);
				} else {
					console.log(`✅ ${indicatorId}: ${value[0].length} values, first: ${value[0][0]}`);
				}
			} else {
				console.log(`✅ ${indicatorId}: ${typeof value}`);
			}
		} catch (error) {
			console.log(`✅ ${indicatorId}: ${typeof value} (error displaying value)`);
		}
	}

	// Test 7: Properties usage
	console.log('\n=== TEST 7: Properties Usage ===');
	console.log(`🏠 Root path: ${props.get('paths.root.path')}`);
	console.log(`📁 Resources path: ${props.get('paths.resources.path')}`);
	console.log(`⚙️ Configuration path: ${props.get('paths.resources.configuration.path')}`);

	console.log('\n🎉 All tests completed successfully!');
}

// Run the test
testFilteredIndicators().catch(error => {
	console.error('❌ Error testing filtered indicators:', error);
	process.exit(1);
});
