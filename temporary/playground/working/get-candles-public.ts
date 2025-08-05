// Playground público para testar getCandles sem wallet
// Usage: bun run temporary/playground/working/get-candles-public.ts

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
  { name: "1 minute", interval: '1', maxCandles: 100 },
  { name: "5 minutes", interval: '5', maxCandles: 100 },
  { name: "15 minutes", interval: '15', maxCandles: 100 },
  { name: "1 hour", interval: '60', maxCandles: 100 },
  { name: "4 hours", interval: '240', maxCandles: 50 },
  { name: "1 day", interval: '1440', maxCandles: 30 }
];

// Function to convert to base64
function toBase64(str: string) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

// Function to get ISO time minus hours
function isoNowMinus(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// Function to fetch candles from GraphQL API
async function fetchCandles(pairId: string, after: string, before: string, resolution: string, count: number) {
  const CANDLES_GRAPHQL_ENDPOINT = 'https://api.rujira.network/api/graphiql';

  const CANDLES_QUERY = `
    query GetCandles($pair: ID!, $after: String!, $before: String!, $resolution: String!, $last: Int) {
      node(id: $pair) {
        ... on FinPair {
          address
          candles(after: $after, before: $before, resolution: $resolution, last: $last) {
            edges {
              node {
                open
                close
                high
                low
                volume
                bin
              }
            }
          }
        }
      }
    }
  `;

  const response = await fetch(CANDLES_GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: CANDLES_QUERY,
      variables: { pair: pairId, after, before, resolution, last: count }
    })
  });

  if (!response.ok) throw new Error(`Candles query failed: ${response.status}`);
  const json: any = await response.json();
  return json?.data?.node?.candles?.edges?.map((e: any) => e.node) || [];
}

async function testGetCandlesPublic() {
  console.log('📊 Testing getCandles Method (Public API)');
  console.log('='.repeat(60));

  try {
    // Test each market configuration
    for (const marketConfig of MARKET_CONFIGS) {
      console.log(`📈 Testing Market: ${marketConfig.name}`);
      console.log(`📍 Address: ${marketConfig.address}`);
      console.log('='.repeat(50));

      const pairId = toBase64(`FinPair:${marketConfig.address}`);
      console.log(`🔍 Pair ID: ${pairId}`);

      // Test each interval configuration
      for (const intervalConfig of INTERVAL_CONFIGS) {
        console.log(`⏰ Testing ${intervalConfig.name} candles...`);

        try {
          const startTime = Date.now();

          const before = new Date().toISOString();
          const after = isoNowMinus(24 * 7); // last 7 days

          const candles = await fetchCandles(
            pairId,
            after,
            before,
            intervalConfig.interval,
            intervalConfig.maxCandles
          );

          const endTime = Date.now();
          const responseTime = endTime - startTime;

          console.log(`✅ Success! Got ${candles.length} candles in ${responseTime}ms`);

          if (candles.length > 0) {
            // Get first and last candle
            const firstCandle = candles[0];
            const lastCandle = candles[candles.length - 1];

            console.log(`📊 First candle (${new Date(firstCandle.bin).toISOString()}):`);
            console.log(`   Open: ${firstCandle.open}`);
            console.log(`   High: ${firstCandle.high}`);
            console.log(`   Low: ${firstCandle.low}`);
            console.log(`   Close: ${firstCandle.close}`);
            console.log(`   Volume: ${firstCandle.volume}`);

            console.log(`📊 Last candle (${new Date(lastCandle.bin).toISOString()}):`);
            console.log(`   Open: ${lastCandle.open}`);
            console.log(`   High: ${lastCandle.high}`);
            console.log(`   Low: ${lastCandle.low}`);
            console.log(`   Close: ${lastCandle.close}`);
            console.log(`   Volume: ${lastCandle.volume}`);

            // Calculate price change
            const firstPrice = parseFloat(firstCandle.close);
            const lastPrice = parseFloat(lastCandle.close);
            const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;
            console.log(`📈 Price change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);

            // Calculate volume statistics
            let totalVolume = 0;
            let maxVolume = 0;
            let minVolume = Infinity;
            let zeroVolumeCount = 0;

            candles.forEach((candle: any) => {
              const volume = parseFloat(candle.volume);
              totalVolume += volume;
              if (volume > maxVolume) maxVolume = volume;
              if (volume < minVolume) minVolume = volume;
              if (volume === 0) zeroVolumeCount++;
            });

            const avgVolume = totalVolume / candles.length;
            console.log(`📊 Volume stats:`);
            console.log(`   Total: ${totalVolume.toFixed(2)}`);
            console.log(`   Average: ${avgVolume.toFixed(2)}`);
            console.log(`   Max: ${maxVolume.toFixed(2)}`);
            console.log(`   Min: ${minVolume.toFixed(2)}`);
            console.log(`   Zero volume candles: ${zeroVolumeCount} (${(zeroVolumeCount / candles.length * 100).toFixed(1)}%)`);

            // Check for data quality issues
            const issues = [];
            if (zeroVolumeCount > candles.length * 0.5) issues.push('High number of zero volume candles');
            if (priceChange === 0) issues.push('No price change detected');
            if (candles.length < 10) issues.push('Very few candles returned');

            if (issues.length > 0) {
              console.log(`⚠️  Data quality issues: ${issues.join(', ')}`);
            } else {
              console.log(`✅ Data quality looks good`);
            }

            // Show sample of middle candles
            if (candles.length > 10) {
              console.log(`📊 Sample middle candles:`);
              const middleIndex = Math.floor(candles.length / 2);
              const sampleCandle = candles[middleIndex];
              console.log(`   Middle candle (${new Date(sampleCandle.bin).toISOString()}):`);
              console.log(`   Close: ${sampleCandle.close}, Volume: ${sampleCandle.volume}`);
            }
          } else {
            console.log(`❌ No candles returned`);
          }

        } catch (error: any) {
          console.log(`❌ Error with ${intervalConfig.name}: ${error.message}`);
        }

        console.log(''); // Empty line for readability
      }

      console.log('\n' + '='.repeat(60) + '\n');
    }

    // Test different time ranges
    console.log('🔧 Testing Different Time Ranges');
    console.log('='.repeat(50));

    const testMarket = MARKET_CONFIGS[0];
    const pairId = toBase64(`FinPair:${testMarket.address}`);

    const timeRanges = [
      { name: "Last 24 hours", hours: 24 },
      { name: "Last 3 days", hours: 72 },
      { name: "Last 7 days", hours: 168 },
      { name: "Last 14 days", hours: 336 }
    ];

    for (const timeRange of timeRanges) {
      console.log(`📊 Testing ${timeRange.name}...`);
      try {
        const before = new Date().toISOString();
        const after = isoNowMinus(timeRange.hours);

        const candles = await fetchCandles(pairId, after, before, '60', 100);
        console.log(`✅ Got ${candles.length} candles for ${timeRange.name}`);
      } catch (error: any) {
        console.log(`❌ Error with ${timeRange.name}: ${error.message}`);
      }
    }

    // Test different candle counts
    console.log('\n🔧 Testing Different Candle Counts');
    console.log('='.repeat(50));

    const candleCounts = [10, 25, 50, 100, 200];
    for (const count of candleCounts) {
      console.log(`📊 Testing ${count} candles...`);
      try {
        const before = new Date().toISOString();
        const after = isoNowMinus(24 * 7);

        const candles = await fetchCandles(pairId, after, before, '60', count);
        console.log(`✅ Requested ${count}, got ${candles.length} candles`);
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
    console.log(`Time ranges tested: ${timeRanges.length}`);
    console.log(`Candle counts tested: ${candleCounts.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testGetCandlesPublic().catch(console.error);
