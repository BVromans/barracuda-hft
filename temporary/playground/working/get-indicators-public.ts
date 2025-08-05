// Playground for testing getIndicators using only public APIs (no wallet required)
// Usage: bun run temporary/playground/working/get-indicators-public.ts

import { Indicator } from '../../../src/types';

// Market configuration
const MARKET_ADDRESS = "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a"; // RUJI/USDC
const CANDLE_INTERVAL = '60'; // 60 minutes (1 hour)
const MAX_CANDLES = 50; // Reduced number of candles

// Focus on key indicators for analysis
const TRADING_INDICATORS = [
  {
    indicator: Indicator.relative_strength_index,
    name: "RSI",
    description: "Momentum oscillator (0-100)",
    overbought: 70,
    oversold: 30
  },
  {
    indicator: Indicator.moving_average_convergence_divergence,
    name: "MACD",
    description: "Trend following indicator",
    bullish: 0
  },
  {
    indicator: Indicator.bollinger_bands,
    name: "Bollinger Bands",
    description: "Volatility bands",
    upperBand: 0.8,
    lowerBand: 0.2
  },
  {
    indicator: Indicator.simple_moving_average,
    name: "SMA",
    description: "Simple moving average",
    period: 20
  },
  {
    indicator: Indicator.exponential_moving_average,
    name: "EMA",
    description: "Exponential moving average",
    period: 20
  },
  {
    indicator: Indicator.average_true_range,
    name: "ATR",
    description: "Volatility indicator"
  },
  {
    indicator: Indicator.stochastic_oscillator,
    name: "Stochastic",
    description: "Momentum oscillator"
  },
  {
    indicator: Indicator.money_flow_index,
    name: "MFI",
    description: "Volume + Price momentum"
  },
  {
    indicator: Indicator.on_balance_volume,
    name: "OBV",
    description: "Volume indicator"
  },
  {
    indicator: Indicator.volume_weighted_average_price,
    name: "VWAP",
    description: "Volume weighted average price"
  }
];

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

// Function to calculate indicators using the indicators-js library
function calculateIndicators(prices: number[]) {
  const indicators = new Map();

  // Import the indicators library dynamically
  const Indicators = require('@ixjb94/indicators-js');

  for (const tradingIndicator of TRADING_INDICATORS) {
    try {
      const indicatorFunction = (Indicators as any)[tradingIndicator.indicator.id];
      if (indicatorFunction) {
        const value = indicatorFunction(prices, ...tradingIndicator.indicator.defaultParameters);
        indicators.set(tradingIndicator.indicator, {
          indicator: tradingIndicator.indicator,
          value: value
        });
      }
    } catch (error) {
      console.log(`Error calculating ${tradingIndicator.name}: ${error}`);
    }
  }

  return indicators;
}

async function testIndicatorsPublic() {
  console.log('📊 Testing Indicators with Public APIs');
  console.log('='.repeat(50));

  try {
    const pairId = toBase64(`FinPair:${MARKET_ADDRESS}`);
    console.log(`📈 Fetching candles for market: ${MARKET_ADDRESS}`);
    console.log(`⏰ Candle interval: ${CANDLE_INTERVAL}`);
    console.log(`📊 Number of candles: ${MAX_CANDLES}\n`);

    const before = new Date().toISOString();
    const after = isoNowMinus(24 * 7); // last 7 days

        console.log(`🔍 Querying with pairId: ${pairId}`);
    console.log(`📅 Time range: ${after} to ${before}`);

    const candles = await fetchCandles(pairId, after, before, CANDLE_INTERVAL, MAX_CANDLES);

    console.log(`📊 Raw response: ${JSON.stringify(candles, null, 2)}`);

    if (!candles.length) {
      console.log('No candle data found.');
      console.log('Trying with different market address...');

      // Try with a different market address
      const alternativeMarket = "thor1txmrchsrzycmzvlwsjl20q9zkdsp0nywctefuceepf02phpudvxsxtzmty"; // NAMI/USDC
      const alternativePairId = toBase64(`FinPair:${alternativeMarket}`);
      console.log(`🔍 Trying alternative market: ${alternativePairId}`);

      const alternativeCandles = await fetchCandles(alternativePairId, after, before, CANDLE_INTERVAL, MAX_CANDLES);

      if (!alternativeCandles.length) {
        console.log('No candle data found for alternative market either.');
        return;
      }

      console.log(`✅ Found ${alternativeCandles.length} candles for alternative market`);
      return;
    }

    console.log(`✅ Fetched ${candles.length} candles\n`);

    // Display sample candle data
    if (candles.length > 0) {
      const firstCandle = candles[0];
      const lastCandle = candles[candles.length - 1];

      console.log('📊 Sample candle data:');
      console.log(`First candle (${new Date(firstCandle.bin).toISOString()}):`);
      console.log(`  Open: ${firstCandle.open}`);
      console.log(`  High: ${firstCandle.high}`);
      console.log(`  Low: ${firstCandle.low}`);
      console.log(`  Close: ${firstCandle.close}`);
      console.log(`  Volume: ${firstCandle.volume}`);

      console.log(`\nLast candle (${new Date(lastCandle.bin).toISOString()}):`);
      console.log(`  Open: ${lastCandle.open}`);
      console.log(`  High: ${lastCandle.high}`);
      console.log(`  Low: ${lastCandle.low}`);
      console.log(`  Close: ${lastCandle.close}`);
      console.log(`  Volume: ${lastCandle.volume}\n`);
    }

    // Extract close prices for indicator calculation
    const prices = candles.map((candle: any) => parseFloat(candle.close));
    console.log(`📈 Extracted ${prices.length} price points\n`);

    // Calculate indicators
    console.log('🔮 Calculating indicators...');
    const indicators = calculateIndicators(prices);
    console.log(`✅ Calculated ${indicators.size} indicators\n`);

    // Display results for each indicator
    console.log('📈 Indicator Results:');
    console.log('='.repeat(80));

    for (const tradingIndicator of TRADING_INDICATORS) {
      const indicatorData = indicators.get(tradingIndicator.indicator);

      if (indicatorData) {
        console.log(`\n🎯 ${tradingIndicator.name} (${tradingIndicator.description})`);
        console.log(`   Parameters: [${tradingIndicator.indicator.defaultParameters.join(', ')}]`);

        const value = indicatorData.value;

        if (Array.isArray(value)) {
          console.log(`   Value: [${value.length} elements]`);
          if (value.length > 0) {
            console.log(`   Last value: ${value[value.length - 1]}`);
            if (value.length > 1) {
              console.log(`   Previous value: ${value[value.length - 2]}`);
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          console.log(`   Value: ${JSON.stringify(value, null, 2)}`);
        } else {
          console.log(`   Value: ${value}`);
        }

        // Generate trading signals
        let signal = '';
        let signalStrength = '';

        if (Array.isArray(value) && value.length > 0) {
          const currentValue = value[value.length - 1];

                     switch (tradingIndicator.name) {
             case 'RSI':
               if (currentValue > (tradingIndicator.overbought || 70)) {
                 signal = 'SELL';
                 signalStrength = 'Strong (Overbought)';
               } else if (currentValue < (tradingIndicator.oversold || 30)) {
                 signal = 'BUY';
                 signalStrength = 'Strong (Oversold)';
               } else {
                 signal = 'HOLD';
                 signalStrength = 'Neutral';
               }
               break;

             case 'MACD':
               if (currentValue > (tradingIndicator.bullish || 0)) {
                 signal = 'BUY';
                 signalStrength = 'Bullish';
               } else {
                 signal = 'SELL';
                 signalStrength = 'Bearish';
               }
               break;

            case 'Bollinger Bands':
              if (typeof currentValue === 'object' && currentValue !== null) {
                const price = prices[prices.length - 1];
                if (price >= currentValue.upper) {
                  signal = 'SELL';
                  signalStrength = 'Strong (Above Upper Band)';
                } else if (price <= currentValue.lower) {
                  signal = 'BUY';
                  signalStrength = 'Strong (Below Lower Band)';
                } else {
                  signal = 'HOLD';
                  signalStrength = 'Neutral (Within Bands)';
                }
              }
              break;

            case 'SMA':
            case 'EMA':
              const price = prices[prices.length - 1];
              if (price > currentValue) {
                signal = 'BUY';
                signalStrength = 'Above MA';
              } else {
                signal = 'SELL';
                signalStrength = 'Below MA';
              }
              break;

            case 'ATR':
              signal = 'INFO';
              signalStrength = `Volatility: ${currentValue.toFixed(4)}`;
              break;

            default:
              signal = 'UNKNOWN';
              signalStrength = 'No signal logic';
          }

          console.log(`   Signal: ${signal} (${signalStrength})`);
        }
      } else {
        console.log(`\n❌ ${tradingIndicator.name} - Not available`);
      }
    }

    // Show summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`Total indicators tested: ${TRADING_INDICATORS.length}`);

    const foundIndicators = TRADING_INDICATORS.filter(indicator =>
      indicators.has(indicator.indicator)
    );
    console.log(`Successfully calculated: ${foundIndicators.length}`);
    console.log(`Failed to calculate: ${TRADING_INDICATORS.length - foundIndicators.length}`);

    // Show current market conditions
    console.log('\n📊 Current Market Conditions:');
    console.log('='.repeat(50));

    const currentPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const priceChange = ((currentPrice - firstPrice) / firstPrice) * 100;

    console.log(`Current Price: ${currentPrice.toFixed(6)}`);
    console.log(`Price Change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
    console.log(`Period: ${candles.length} candles (${CANDLE_INTERVAL} each)`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testIndicatorsPublic().catch(console.error);
