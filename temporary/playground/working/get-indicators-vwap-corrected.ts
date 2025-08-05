// Playground corrigido com VWAP funcionando
// Usage: bun run temporary/playground/working/get-indicators-vwap-corrected.ts

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
    oversold: 30,
    needsOHLCV: false
  },
  {
    indicator: Indicator.moving_average_convergence_divergence,
    name: "MACD",
    description: "Trend following indicator",
    bullish: 0,
    needsOHLCV: false
  },
  {
    indicator: Indicator.bollinger_bands,
    name: "Bollinger Bands",
    description: "Volatility bands",
    upperBand: 0.8,
    lowerBand: 0.2,
    needsOHLCV: false
  },
  {
    indicator: Indicator.simple_moving_average,
    name: "SMA",
    description: "Simple moving average",
    period: 20,
    needsOHLCV: false
  },
  {
    indicator: Indicator.exponential_moving_average,
    name: "EMA",
    description: "Exponential moving average",
    period: 20,
    needsOHLCV: false
  },
  {
    indicator: Indicator.average_true_range,
    name: "ATR",
    description: "Volatility indicator",
    needsOHLCV: true
  },
  {
    indicator: Indicator.stochastic_oscillator,
    name: "Stochastic",
    description: "Momentum oscillator",
    needsOHLCV: true
  },
  {
    indicator: Indicator.money_flow_index,
    name: "MFI",
    description: "Volume + Price momentum",
    needsOHLCV: true
  },
  {
    indicator: Indicator.on_balance_volume,
    name: "OBV",
    description: "Volume indicator",
    needsOHLCV: true
  },
  {
    indicator: Indicator.volume_weighted_average_price,
    name: "VWAP",
    description: "Volume weighted average price",
    needsOHLCV: true,
    specialParams: [14] // Use period 14 for VWAP
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

// Function to calculate indicators using the indicators-js library
function calculateIndicators(candles: any[]) {
  const indicators = new Map();

  // Import the indicators library dynamically
  const Indicators = require('@ixjb94/indicators-js');

  for (const tradingIndicator of TRADING_INDICATORS) {
    try {
      const indicatorFunction = (Indicators as any)[tradingIndicator.indicator.id];
      if (indicatorFunction) {
        let value;

        if (tradingIndicator.needsOHLCV) {
          // Extract OHLCV data for indicators that need it
          const highs = candles.map((c: any) => parseFloat(c.high));
          const lows = candles.map((c: any) => parseFloat(c.low));
          const closes = candles.map((c: any) => parseFloat(c.close));
          const volumes = candles.map((c: any) => parseFloat(c.volume));

          // Special handling for VWAP
          if (tradingIndicator.name === 'VWAP' && tradingIndicator.specialParams) {
            // Use special parameters for VWAP
            value = indicatorFunction(highs, lows, closes, volumes, ...tradingIndicator.specialParams);
          } else {
            // Call indicator with OHLCV data
            value = indicatorFunction(highs, lows, closes, volumes, ...tradingIndicator.indicator.parameters);
          }
        } else {
          // Extract only close prices for simple indicators
          const prices = candles.map((c: any) => parseFloat(c.close));
          value = indicatorFunction(prices, ...tradingIndicator.indicator.parameters);
        }

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

async function testIndicatorsVWAPCorrected() {
  console.log('📊 Testing Indicators with Corrected VWAP');
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

    // Calculate indicators with proper data
    console.log('🔮 Calculating indicators with corrected VWAP...');
    const indicators = calculateIndicators(candles);
    console.log(`✅ Calculated ${indicators.size} indicators\n`);

    // Also calculate manual VWAP for comparison
    const manualVWAP = calculateVWAPManual(candles);

    // Display results for each indicator
    console.log('📈 Indicator Results:');
    console.log('='.repeat(80));

    for (const tradingIndicator of TRADING_INDICATORS) {
      const indicatorData = indicators.get(tradingIndicator.indicator);

      if (indicatorData) {
        console.log(`\n🎯 ${tradingIndicator.name} (${tradingIndicator.description})`);
        console.log(`   Data Type: ${tradingIndicator.needsOHLCV ? 'OHLCV' : 'Close Only'}`);
        console.log(`   Parameters: [${tradingIndicator.specialParams ? tradingIndicator.specialParams.join(', ') : tradingIndicator.indicator.parameters.join(', ')}]`);

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

        // Special handling for VWAP comparison
        if (tradingIndicator.name === 'VWAP') {
          console.log(`   Manual VWAP: ${manualVWAP[manualVWAP.length - 1].toFixed(6)}`);
          if (Array.isArray(value) && value.length > 0) {
            const libraryVWAP = value[value.length - 1];
            const manualVWAPValue = manualVWAP[manualVWAP.length - 1];
            const difference = Math.abs(libraryVWAP - manualVWAPValue);
            const percentage = (difference / manualVWAPValue) * 100;
            console.log(`   Difference: ${difference.toFixed(6)} (${percentage.toFixed(2)}%)`);
          }
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
                const price = parseFloat(candles[candles.length - 1].close);
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
              const price = parseFloat(candles[candles.length - 1].close);
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

            case 'Stochastic':
              if (currentValue > 80) {
                signal = 'SELL';
                signalStrength = 'Overbought';
              } else if (currentValue < 20) {
                signal = 'BUY';
                signalStrength = 'Oversold';
              } else {
                signal = 'HOLD';
                signalStrength = 'Neutral';
              }
              break;

            case 'MFI':
              if (currentValue > 80) {
                signal = 'SELL';
                signalStrength = 'Overbought';
              } else if (currentValue < 20) {
                signal = 'BUY';
                signalStrength = 'Oversold';
              } else {
                signal = 'HOLD';
                signalStrength = 'Neutral';
              }
              break;

            case 'OBV':
              signal = 'INFO';
              signalStrength = `Volume Trend: ${currentValue > 0 ? 'Positive' : 'Negative'}`;
              break;

            case 'VWAP':
              const currentPrice = parseFloat(candles[candles.length - 1].close);
              if (currentPrice > currentValue) {
                signal = 'BUY';
                signalStrength = 'Above VWAP (Bullish)';
              } else {
                signal = 'SELL';
                signalStrength = 'Below VWAP (Bearish)';
              }
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

    // Show VWAP analysis
    console.log('\n🎯 VWAP Analysis:');
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

    // Show current market conditions
    console.log('\n📊 Current Market Conditions:');
    console.log('='.repeat(60));

    const firstPrice = parseFloat(candles[0].close);
    const priceChange = ((currentPrice - firstPrice) / firstPrice) * 100;

    console.log(`Current Price: ${currentPrice.toFixed(6)}`);
    console.log(`Price Change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
    console.log(`Period: ${candles.length} candles (${CANDLE_INTERVAL} each)`);

  } catch (error: any) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testIndicatorsVWAPCorrected().catch(console.error);
