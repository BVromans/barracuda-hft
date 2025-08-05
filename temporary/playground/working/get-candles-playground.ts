// Playground para testar getCandles
// Usage: bun run temporary/playground/working/get-candles-playground.ts

import { Rujira } from '../../../src/rujira';

// Market configurations to test
const MARKET_CONFIGS = [
  {
    name: "RUJI/USDC",
    address: "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
    symbol: "RUJI/USDC"
  },
  {
    name: "NAMI/USDC",
    address: "thor1j6g0u377cjr8t8l8mmc6l8h2auqrx4mkzhmfvmqjclanvzy9k9ys5r6l2r",
    symbol: "NAMI/USDC"
  }
];

// Candle interval configurations to test
const INTERVAL_CONFIGS = [
  { name: "1 minute", interval: '1m', maxCandles: 100 },
  { name: "5 minutes", interval: '5m', maxCandles: 100 },
  { name: "15 minutes", interval: '15m', maxCandles: 100 },
  { name: "1 hour", interval: '1h', maxCandles: 100 },
  { name: "4 hours", interval: '4h', maxCandles: 50 },
  { name: "1 day", interval: '1d', maxCandles: 30 }
];

async function testGetCandles() {
  console.log('📊 Testing getCandles Method');
  console.log('='.repeat(60));

  try {
    // Initialize Rujira (without wallet for public data)
    console.log('🔧 Initializing Rujira...');
    const rujira = new Rujira({});
    await rujira.initialize({});
    console.log('✅ Rujira initialized\n');

    // Test each market configuration
    for (const marketConfig of MARKET_CONFIGS) {
      console.log(`📈 Testing Market: ${marketConfig.name}`);
      console.log(`📍 Address: ${marketConfig.address}`);
      console.log('='.repeat(50));

      try {
        // Get market info first
        console.log('🔍 Getting market information...');
        const market = await rujira.fin.getMarket({ address: marketConfig.address });
        console.log(`✅ Market found: ${market.symbol}`);
        console.log(`💰 Base: ${market.tokens.base.symbol}, Quote: ${market.tokens.quote.symbol}`);
        console.log(`📊 Decimals: ${market.decimals}`);
        console.log(`📈 Status: ${market.status}\n`);

        // Test each interval configuration
        for (const intervalConfig of INTERVAL_CONFIGS) {
          console.log(`⏰ Testing ${intervalConfig.name} candles...`);

          try {
            const startTime = Date.now();

            const candles = await rujira.fin.getCandles({
              marketAddress: marketConfig.address,
              maximumNumberOfCandles: intervalConfig.maxCandles,
              interval: intervalConfig.interval
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            console.log(`✅ Success! Got ${candles.size} candles in ${responseTime}ms`);

            if (candles.size > 0) {
              // Get first and last candle
              const firstCandle = candles.get(0);
              const lastCandle = candles.get(candles.size - 1);

              if (firstCandle && lastCandle) {
                console.log(`📊 First candle (${new Date(firstCandle.timestamp).toISOString()}):`);
                console.log(`   Open: ${firstCandle.open.toString()}`);
                console.log(`   High: ${firstCandle.high.toString()}`);
                console.log(`   Low: ${firstCandle.low.toString()}`);
                console.log(`   Close: ${firstCandle.close.toString()}`);
                console.log(`   Volume: ${firstCandle.volume.toString()}`);

                console.log(`📊 Last candle (${new Date(lastCandle.timestamp).toISOString()}):`);
                console.log(`   Open: ${lastCandle.open.toString()}`);
                console.log(`   High: ${lastCandle.high.toString()}`);
                console.log(`   Low: ${lastCandle.low.toString()}`);
                console.log(`   Close: ${lastCandle.close.toString()}`);
                console.log(`   Volume: ${lastCandle.volume.toString()}`);

                // Calculate price change
                const priceChange = ((lastCandle.close.toNumber() - firstCandle.close.toNumber()) / firstCandle.close.toNumber()) * 100;
                console.log(`📈 Price change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);

                // Calculate volume statistics
                let totalVolume = 0;
                let maxVolume = 0;
                let minVolume = Infinity;
                let zeroVolumeCount = 0;

                candles.forEach((candle) => {
                  const volume = candle.volume.toNumber();
                  totalVolume += volume;
                  if (volume > maxVolume) maxVolume = volume;
                  if (volume < minVolume) minVolume = volume;
                  if (volume === 0) zeroVolumeCount++;
                });

                const avgVolume = totalVolume / candles.size;
                console.log(`📊 Volume stats:`);
                console.log(`   Total: ${totalVolume.toFixed(2)}`);
                console.log(`   Average: ${avgVolume.toFixed(2)}`);
                console.log(`   Max: ${maxVolume.toFixed(2)}`);
                console.log(`   Min: ${minVolume.toFixed(2)}`);
                console.log(`   Zero volume candles: ${zeroVolumeCount} (${(zeroVolumeCount / candles.size * 100).toFixed(1)}%)`);

                // Check for data quality issues
                const issues = [];
                if (zeroVolumeCount > candles.size * 0.5) issues.push('High number of zero volume candles');
                if (priceChange === 0) issues.push('No price change detected');
                if (candles.size < 10) issues.push('Very few candles returned');

                if (issues.length > 0) {
                  console.log(`⚠️  Data quality issues: ${issues.join(', ')}`);
                } else {
                  console.log(`✅ Data quality looks good`);
                }
              }
            } else {
              console.log(`❌ No candles returned`);
            }

          } catch (error: any) {
            console.log(`❌ Error with ${intervalConfig.name}: ${error.message}`);
          }

          console.log(''); // Empty line for readability
        }

      } catch (error: any) {
        console.log(`❌ Error getting market info: ${error.message}`);
      }

      console.log('\n' + '='.repeat(60) + '\n');
    }

    // Test with different parameter combinations
    console.log('🔧 Testing Parameter Combinations');
    console.log('='.repeat(50));

    const testMarket = MARKET_CONFIGS[0]; // Use first market for parameter tests

    // Test 1: Using market symbol instead of address
    console.log('📊 Test 1: Using market symbol...');
    try {
      const candlesBySymbol = await rujira.fin.getCandles({
        marketSymbol: testMarket.symbol,
        maximumNumberOfCandles: 50,
        interval: '1h'
      });
      console.log(`✅ Got ${candlesBySymbol.size} candles using symbol`);
    } catch (error: any) {
      console.log(`❌ Error using symbol: ${error.message}`);
    }

    // Test 2: Using market object
    console.log('📊 Test 2: Using market object...');
    try {
      const market = await rujira.fin.getMarket({ address: testMarket.address });
      const candlesByMarket = await rujira.fin.getCandles({
        market: market,
        maximumNumberOfCandles: 50,
        interval: '1h'
      });
      console.log(`✅ Got ${candlesByMarket.size} candles using market object`);
    } catch (error: any) {
      console.log(`❌ Error using market object: ${error.message}`);
    }

    // Test 3: Different maximum candle counts
    console.log('📊 Test 3: Testing different candle counts...');
    const candleCounts = [10, 25, 50, 100];
    for (const count of candleCounts) {
      try {
        const candles = await rujira.fin.getCandles({
          marketAddress: testMarket.address,
          maximumNumberOfCandles: count,
          interval: '1h'
        });
        console.log(`✅ Requested ${count}, got ${candles.size} candles`);
      } catch (error: any) {
        console.log(`❌ Error with count ${count}: ${error.message}`);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log('='.repeat(30));
    console.log(`Markets tested: ${MARKET_CONFIGS.length}`);
    console.log(`Intervals tested: ${INTERVAL_CONFIGS.length}`);
    console.log(`Total combinations: ${MARKET_CONFIGS.length * INTERVAL_CONFIGS.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testGetCandles().catch(console.error);
