// Playground específico para testar e corrigir o VWAP
// Usage: bun run temporary/playground/working/get-vwap-fixed.ts

import { Indicator } from '../../../src/types';

// Market configuration
const MARKET_ADDRESS = "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a"; // RUJI/USDC
const CANDLE_INTERVAL = '60'; // 60 minutes (1 hour)
const MAX_CANDLES = 50; // Reduced number of candles

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

// Function to convert to base64
function toBase64(str: string) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

// Function to get ISO time minus hours
function isoNowMinus(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// Manual VWAP calculation
function calculateVWAPManual(candles: any[]) {
  let cumulativeTPV = 0; // Total Price × Volume
  let cumulativeVolume = 0;
  const vwapValues = [];

  for (const candle of candles) {
    const high = parseFloat(candle.high);
    const low = parseFloat(candle.low);
    const close = parseFloat(candle.close);
    const volume = parseFloat(candle.volume);

    // Typical Price = (High + Low + Close) / 3
    const typicalPrice = (high + low + close) / 3;

    // Cumulative calculations
    cumulativeTPV += typicalPrice * volume;
    cumulativeVolume += volume;

    // VWAP = Cumulative TPV / Cumulative Volume
    const vwap = cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : 0;
    vwapValues.push(vwap);
  }

  return vwapValues;
}

// Test different VWAP calculation methods
async function testVWAPMethods() {
  console.log('🎯 Testing VWAP Calculation Methods');
  console.log('='.repeat(60));

  try {
    const pairId = toBase64(`FinPair:${MARKET_ADDRESS}`);
    console.log(`📈 Fetching candles for market: ${MARKET_ADDRESS}`);
    console.log(`⏰ Candle interval: ${CANDLE_INTERVAL}`);
    console.log(`📊 Number of candles: ${MAX_CANDLES}\n`);

    const before = new Date().toISOString();
    const after = isoNowMinus(24 * 7); // last 7 days

    const candles = await fetchCandles(pairId, after, before, CANDLE_INTERVAL, MAX_CANDLES);

    if (!candles.length) {
      console.log('No candle data found.');
      return;
    }

    console.log(`✅ Fetched ${candles.length} candles\n`);

    // Display sample candle data with volume
    console.log('📊 Sample candles with volume data:');
    for (let i = 0; i < Math.min(5, candles.length); i++) {
      const candle = candles[i];
      console.log(`Candle ${i + 1} (${new Date(candle.bin).toISOString()}):`);
      console.log(`  Open: ${candle.open}, High: ${candle.high}, Low: ${candle.low}, Close: ${candle.close}`);
      console.log(`  Volume: ${candle.volume}`);

      // Calculate typical price
      const high = parseFloat(candle.high);
      const low = parseFloat(candle.low);
      const close = parseFloat(candle.close);
      const typicalPrice = (high + low + close) / 3;
      console.log(`  Typical Price: ${typicalPrice.toFixed(2)}`);
      console.log(`  Price × Volume: ${(typicalPrice * parseFloat(candle.volume)).toFixed(2)}\n`);
    }

    // Test 1: Manual VWAP calculation
    console.log('🔧 Method 1: Manual VWAP Calculation');
    console.log('='.repeat(40));
    const manualVWAP = calculateVWAPManual(candles);
    console.log(`Manual VWAP values: ${manualVWAP.length} elements`);
    if (manualVWAP.length > 0) {
      console.log(`Last VWAP: ${manualVWAP[manualVWAP.length - 1].toFixed(6)}`);
      console.log(`First VWAP: ${manualVWAP[0].toFixed(6)}`);
    }

    // Test 2: Library VWAP with different data formats
    console.log('\n🔧 Method 2: Library VWAP with OHLCV');
    console.log('='.repeat(40));

    const Indicators = require('@ixjb94/indicators-js');
    const vwapFunction = (Indicators as any)['vwap'];

    if (vwapFunction) {
      try {
        // Extract OHLCV data
        const highs = candles.map((c: any) => parseFloat(c.high));
        const lows = candles.map((c: any) => parseFloat(c.low));
        const closes = candles.map((c: any) => parseFloat(c.close));
        const volumes = candles.map((c: any) => parseFloat(c.volume));

        console.log(`Data arrays: Highs=${highs.length}, Lows=${lows.length}, Closes=${closes.length}, Volumes=${volumes.length}`);
        console.log(`Sample data: High=${highs[0]}, Low=${lows[0]}, Close=${closes[0]}, Volume=${volumes[0]}`);

        // Try different parameter combinations
        console.log('\nTrying different parameter combinations:');

        // Method 2a: With default parameters
        try {
          const vwap1 = vwapFunction(highs, lows, closes, volumes);
          console.log(`VWAP (default params): ${Array.isArray(vwap1) ? vwap1.length : 'not array'} elements`);
          if (Array.isArray(vwap1) && vwap1.length > 0) {
            console.log(`Last value: ${vwap1[vwap1.length - 1]}`);
          }
        } catch (error: any) {
          console.log(`VWAP (default params) error: ${error.message}`);
        }

        // Method 2b: With explicit parameters
        try {
          const vwap2 = vwapFunction(highs, lows, closes, volumes, 14); // period 14
          console.log(`VWAP (period 14): ${Array.isArray(vwap2) ? vwap2.length : 'not array'} elements`);
          if (Array.isArray(vwap2) && vwap2.length > 0) {
            console.log(`Last value: ${vwap2[vwap2.length - 1]}`);
          }
        } catch (error: any) {
          console.log(`VWAP (period 14) error: ${error.message}`);
        }

        // Method 2c: With only close prices
        try {
          const vwap3 = vwapFunction(closes, 14);
          console.log(`VWAP (close only): ${Array.isArray(vwap3) ? vwap3.length : 'not array'} elements`);
          if (Array.isArray(vwap3) && vwap3.length > 0) {
            console.log(`Last value: ${vwap3[vwap3.length - 1]}`);
          }
        } catch (error: any) {
          console.log(`VWAP (close only) error: ${error.message}`);
        }

      } catch (error: any) {
        console.log(`Library VWAP error: ${error.message}`);
      }
    } else {
      console.log('VWAP function not found in library');
    }

    // Test 3: Compare with current price
    console.log('\n🔧 Method 3: VWAP vs Current Price Analysis');
    console.log('='.repeat(40));

    const currentPrice = parseFloat(candles[candles.length - 1].close);
    const currentVWAP = manualVWAP[manualVWAP.length - 1];

    console.log(`Current Price: ${currentPrice.toFixed(6)}`);
    console.log(`Current VWAP: ${currentVWAP.toFixed(6)}`);
    console.log(`Difference: ${(currentPrice - currentVWAP).toFixed(6)}`);
    console.log(`Percentage: ${((currentPrice - currentVWAP) / currentVWAP * 100).toFixed(2)}%`);

    if (currentPrice > currentVWAP) {
      console.log('📈 Price is ABOVE VWAP (Bullish)');
    } else {
      console.log('📉 Price is BELOW VWAP (Bearish)');
    }

    // Test 4: Volume analysis for VWAP
    console.log('\n🔧 Method 4: Volume Analysis for VWAP');
    console.log('='.repeat(40));

    const totalVolume = candles.reduce((sum: any, c: any) => sum + parseFloat(c.volume), 0);
    const avgVolume = totalVolume / candles.length;
    const maxVolume = Math.max(...candles.map((c: any) => parseFloat(c.volume)));
    const minVolume = Math.min(...candles.map((c: any) => parseFloat(c.volume)));

    console.log(`Total Volume: ${totalVolume.toFixed(2)}`);
    console.log(`Average Volume: ${avgVolume.toFixed(2)}`);
    console.log(`Max Volume: ${maxVolume.toFixed(2)}`);
    console.log(`Min Volume: ${minVolume.toFixed(2)}`);

    // Check for zero volume candles
    const zeroVolumeCandles = candles.filter((c: any) => parseFloat(c.volume) === 0).length;
    console.log(`Zero Volume Candles: ${zeroVolumeCandles} (${(zeroVolumeCandles / candles.length * 100).toFixed(1)}%)`);

    // Test 5: VWAP with filtered data (remove zero volume)
    console.log('\n🔧 Method 5: VWAP with Non-Zero Volume Only');
    console.log('='.repeat(40));

    const nonZeroVolumeCandles = candles.filter((c: any) => parseFloat(c.volume) > 0);
    console.log(`Non-zero volume candles: ${nonZeroVolumeCandles.length}`);

    if (nonZeroVolumeCandles.length > 0) {
      const filteredVWAP = calculateVWAPManual(nonZeroVolumeCandles);
      console.log(`Filtered VWAP: ${filteredVWAP[filteredVWAP.length - 1].toFixed(6)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testVWAPMethods().catch(console.error);
