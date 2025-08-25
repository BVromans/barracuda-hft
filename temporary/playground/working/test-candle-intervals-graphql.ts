// Test all candle intervals from CandleInterval enum using GraphQL
// Usage: bun run temporary/playground/working/test-candle-intervals-graphql.ts

// Market configuration
const MARKET_CONFIG = {
  name: "RUJI/USDC",
  address: "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
  symbol: "RUJI/USDC"
};

// All candle intervals to test (from CandleInterval enum)
const CANDLE_INTERVALS = [
  { name: "1 Second", value: '1s', resolution: '1' },
  { name: "1 Minute", value: '1m', resolution: '1' },
  { name: "5 Minutes", value: '5m', resolution: '5' },
  { name: "15 Minutes", value: '15m', resolution: '15' },
  { name: "1 Hour", value: '1h', resolution: '60' },
  { name: "4 Hours", value: '4h', resolution: '240' },
  { name: "1 Day", value: '1d', resolution: '1440' },
  { name: "1 Week", value: '1w', resolution: '10080' },
  { name: "1 Month", value: '1M', resolution: '43200' },
  { name: "1 Year", value: '1y', resolution: '525600' }
];

const GRAPHQL_ENDPOINT = 'https://api.rujira.network/api/graphiql';

// Utility functions
function toBase64(str: string) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

function isoNowMinus(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}d`;
  if (minutes < 43200) return `${Math.floor(minutes / 10080)}w`;
  if (minutes < 525600) return `${Math.floor(minutes / 43200)}M`;
  return `${Math.floor(minutes / 525600)}y`;
}

// GraphQL query for candles
async function fetchCandles(pairId: string, after: string, before: string, resolution: string, count: number) {
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

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: CANDLES_QUERY,
        variables: { pair: pairId, after, before, resolution, last: count }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const json: any = await response.json();

    if (json.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
    }

    return json?.data?.node?.candles?.edges?.map((e: any) => e.node) || [];
  } catch (error: any) {
    throw new Error(`Fetch failed: ${error.message}`);
  }
}

// Test function for each interval
async function testInterval(interval: any, pairId: string, timeRange: number) {
  console.log(`⏰ Testing ${interval.name} (${interval.value})...`);

  try {
    const startTime = Date.now();
    const before = new Date().toISOString();
    const after = isoNowMinus(timeRange);

    const candles = await fetchCandles(
      pairId,
      after,
      before,
      interval.resolution,
      50 // Request 50 candles
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    if (candles.length > 0) {
      // Calculate statistics
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];

      const priceChange = ((parseFloat(lastCandle.close) - parseFloat(firstCandle.close)) / parseFloat(firstCandle.close)) * 100;

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

      console.log(`  ✅ Success! Got ${candles.length} candles in ${responseTime}ms`);
      console.log(`  📊 First: ${new Date(firstCandle.bin).toISOString().slice(0, 19)} | Close: ${firstCandle.close}`);
      console.log(`  📊 Last:  ${new Date(lastCandle.bin).toISOString().slice(0, 19)} | Close: ${lastCandle.close}`);
      console.log(`  📈 Price change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
      console.log(`  📊 Volume: Avg ${avgVolume.toFixed(2)}, Max ${maxVolume.toFixed(2)}, Zero: ${zeroVolumeCount}`);

      return { success: true, candles: candles.length, responseTime };
    } else {
      console.log(`  ⚠️  No candles returned`);
      return { success: false, candles: 0, responseTime };
    }

  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test function
async function testAllIntervals() {
  console.log('🚀 Testing All Candle Intervals via GraphQL');
  console.log('='.repeat(70));
  console.log(`📈 Market: ${MARKET_CONFIG.name}`);
  console.log(`📍 Address: ${MARKET_CONFIG.address}`);
  console.log(`🔗 Endpoint: ${GRAPHQL_ENDPOINT}`);
  console.log('='.repeat(70));

  const pairId = toBase64(`FinPair:${MARKET_CONFIG.address}`);
  console.log(`🔍 Pair ID: ${pairId}\n`);

  const results: any[] = [];

  // Test each interval
  for (const interval of CANDLE_INTERVALS) {
    // Adjust time range based on interval
    let timeRange = 24; // Default: 24 hours

    if (interval.value === '1w') timeRange = 168; // 7 days
    if (interval.value === '1M') timeRange = 720; // 30 days
    if (interval.value === '1y') timeRange = 8760; // 365 days

    const result = await testInterval(interval, pairId, timeRange);
    results.push({
      interval: interval.name,
      value: interval.value,
      resolution: interval.resolution,
      ...result
    });

    console.log(''); // Empty line for readability
  }

  // Summary report
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(50));

  const workingIntervals = results.filter(r => r.success);
  const failedIntervals = results.filter(r => !r.success);

  console.log(`✅ Working intervals: ${workingIntervals.length}/${CANDLE_INTERVALS.length}`);
  console.log(`❌ Failed intervals: ${failedIntervals.length}/${CANDLE_INTERVALS.length}`);

  if (workingIntervals.length > 0) {
    console.log('\n✅ WORKING INTERVALS:');
    workingIntervals.forEach(r => {
      console.log(`  ${r.interval} (${r.value}) - ${r.candles} candles, ${r.responseTime}ms`);
    });
  }

  if (failedIntervals.length > 0) {
    console.log('\n❌ FAILED INTERVALS:');
    failedIntervals.forEach(r => {
      console.log(`  ${r.interval} (${r.value}) - ${r.error}`);
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (workingIntervals.length > 0) {
    const fastest = workingIntervals.reduce((a, b) => a.responseTime < b.responseTime ? a : b);
    console.log(`  🚀 Fastest: ${fastest.interval} (${fastest.responseTime}ms)`);

    const mostData = workingIntervals.reduce((a, b) => a.candles > b.candles ? a : b);
    console.log(`  📊 Most data: ${mostData.interval} (${mostData.candles} candles)`);
  }

  if (failedIntervals.length > 0) {
    console.log(`  ⚠️  ${failedIntervals.length} intervals failed - check API documentation`);
  }
}

// Run the test
testAllIntervals().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
