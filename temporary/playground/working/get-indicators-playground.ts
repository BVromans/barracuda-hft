// Playground for testing getIndicators method with various technical indicators
// Usage: bun run temporary/playground/working/get-indicators-playground.ts

import "dotenv/config";
import { Rujira } from '../../../src/rujira';
import { Indicator, List } from '../../../src/types';

// --- Use a contract from working-fin-contracts.ts ---
const WORKING_FIN_CONTRACTS = {
  "LQDY/BTC": {
    address: "thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf",
    pairName: "LQDY/BTC"
  },
  "LQDY/USDC": {
    address: "thor1ax94w4rldvdgc4xgsfwgve7g7xfyxhvuvquvx57vtmr6y4alev0qw3mlvr",
    pairName: "LQDY/USDC"
  },
  "NAMI/USDC": {
    address: "thor1txmrchsrzycmzvlwsjl20q9zkdsp0nywctefuceepf02phpudvxsxtzmty",
    pairName: "NAMI/USDC"
  },
  "RUJI/USDC": {
    address: "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
    pairName: "RUJI/USDC"
  },
  "TCY/RUNE": {
    address: "thor12ds7fxj5g47jwzfzvzzhzxxd3cp6v55flgwxva0803r8k5mzm44skth6wa",
    pairName: "TCY/RUNE"
  }
};

// --- Select which contract to use here ---
const SELECTED_CONTRACT_KEY = "RUJI/USDC"; // Change to any key above
const SELECTED_CONTRACT = WORKING_FIN_CONTRACTS[SELECTED_CONTRACT_KEY];

// --- Select which indicators to test ---
const SELECTED_INDICATORS = [
  Indicator.relative_strength_index,           // RSI - Momentum oscillator
  Indicator.moving_average_convergence_divergence, // MACD - Trend following
  Indicator.bollinger_bands,                   // Bollinger Bands - Volatility
  Indicator.simple_moving_average,             // SMA - Trend
  Indicator.exponential_moving_average,        // EMA - Trend
  Indicator.average_true_range,                // ATR - Volatility
  Indicator.stochastic_oscillator,             // Stochastic - Momentum
  Indicator.money_flow_index,                  // MFI - Volume + Price
  Indicator.on_balance_volume,                 // OBV - Volume
  Indicator.volume_weighted_average_price,     // VWAP - Volume weighted price
  Indicator.parabolic_sar,                     // Parabolic SAR - Trend reversal
  Indicator.williams_r,                        // Williams %R - Momentum
  Indicator.commodity_channel_index,           // CCI - Momentum
  Indicator.rate_of_change,                    // ROC - Momentum
  Indicator.momentum,                          // Momentum - Price change
  Indicator.standard_deviation_over_period,    // Standard Deviation - Volatility
  Indicator.maximum_in_period,                 // Max in period - Price extremes
  Indicator.minimum_in_period,                 // Min in period - Price extremes
  Indicator.true_range,                        // True Range - Volatility
  Indicator.typical_price,                     // Typical Price - Price average
];

// --- Configuration ---
const CANDLE_INTERVAL = '1h'; // 1 hour candles
const MAX_CANDLES = 100; // Number of candles to fetch

async function testGetIndicators() {
  console.log(`\n📊 Testing getIndicators for market: ${SELECTED_CONTRACT.pairName}`);
  console.log(`📍 Contract address: ${SELECTED_CONTRACT.address}`);
  console.log(`⏰ Candle interval: ${CANDLE_INTERVAL}`);
  console.log(`📈 Number of candles: ${MAX_CANDLES}`);
  console.log(`🎯 Testing ${SELECTED_INDICATORS.length} indicators\n`);

  try {
    // Initialize Rujira instance with wallet credentials from environment
    const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
    if (!walletPrivateKey) {
      throw new Error('WALLET_PRIVATE_KEY environment variable is required');
    }

    const rujira = new Rujira({
      walletPrivateKey: walletPrivateKey
    });
    await rujira.initialize({});

    // Get market information
    const market = await rujira.fin.getMarket({
      address: SELECTED_CONTRACT.address
    });

    console.log(`✅ Market found: ${market.symbol}`);
    console.log(`💰 Base token: ${market.tokens.base.symbol}`);
    console.log(`💱 Quote token: ${market.tokens.quote.symbol}\n`);

    // Get candles first
    console.log('🕯️ Fetching candles...');
    const candles = await rujira.fin.getCandles({
      marketAddress: SELECTED_CONTRACT.address,
      maximumNumberOfCandles: MAX_CANDLES,
      interval: CANDLE_INTERVAL
    });

    console.log(`✅ Fetched ${candles.size} candles\n`);

        // Display some candle data
    if (candles.size > 0) {
      const firstCandle = candles.get(0);
      const lastCandle = candles.get(candles.size - 1);

      if (firstCandle && lastCandle) {
        console.log('📊 Sample candle data:');
        console.log(`First candle (${new Date(firstCandle.timestamp).toISOString()}):`);
        console.log(`  Open: ${firstCandle.open.toString()}`);
        console.log(`  High: ${firstCandle.high.toString()}`);
        console.log(`  Low: ${firstCandle.low.toString()}`);
        console.log(`  Close: ${firstCandle.close.toString()}`);
        console.log(`  Volume: ${firstCandle.volume.toString()}`);

        console.log(`\nLast candle (${new Date(lastCandle.timestamp).toISOString()}):`);
        console.log(`  Open: ${lastCandle.open.toString()}`);
        console.log(`  High: ${lastCandle.high.toString()}`);
        console.log(`  Low: ${lastCandle.low.toString()}`);
        console.log(`  Close: ${lastCandle.close.toString()}`);
        console.log(`  Volume: ${lastCandle.volume.toString()}\n`);
      }
    }

    // Get indicators
    console.log('🔮 Calculating indicators...');
    const indicators = await rujira.fin.getIndicators({
      marketAddress: SELECTED_CONTRACT.address,
      maximumNumberOfCandles: MAX_CANDLES,
      interval: CANDLE_INTERVAL,
      candles: candles
    });

    console.log(`✅ Calculated ${indicators.size} indicators\n`);

    // Display results for selected indicators
    console.log('📈 Indicator Results:');
    console.log('='.repeat(80));

    for (const selectedIndicator of SELECTED_INDICATORS) {
      const indicatorData = indicators.get(selectedIndicator);

      if (indicatorData) {
        console.log(`\n🎯 ${selectedIndicator.name} (${selectedIndicator.id})`);
        console.log(`   Parameters: [${selectedIndicator.parameters.join(', ')}]`);

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
      } else {
        console.log(`\n❌ ${selectedIndicator.name} (${selectedIndicator.id}) - Not found`);
      }
    }

    // Show summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('📊 Summary:');
    console.log(`Total indicators available: ${indicators.size}`);
    console.log(`Selected indicators tested: ${SELECTED_INDICATORS.length}`);

    const foundIndicators = SELECTED_INDICATORS.filter(indicator =>
      indicators.has(indicator)
    );
    console.log(`Successfully calculated: ${foundIndicators.length}`);
    console.log(`Failed to calculate: ${SELECTED_INDICATORS.length - foundIndicators.length}`);

    // Show some interesting indicator combinations
    console.log('\n🔍 Interesting Indicator Combinations:');

    const rsi = indicators.get(Indicator.relative_strength_index);
    const macd = indicators.get(Indicator.moving_average_convergence_divergence);
    const bb = indicators.get(Indicator.bollinger_bands);
    const sma = indicators.get(Indicator.simple_moving_average);

    if (rsi && Array.isArray(rsi.value) && rsi.value.length > 0) {
      const rsiValue = rsi.value[rsi.value.length - 1];
      console.log(`RSI: ${rsiValue} ${rsiValue > 70 ? '(Overbought)' : rsiValue < 30 ? '(Oversold)' : '(Neutral)'}`);
    }

    if (macd && Array.isArray(macd.value) && macd.value.length > 0) {
      const macdValue = macd.value[macd.value.length - 1];
      console.log(`MACD: ${macdValue} ${macdValue > 0 ? '(Bullish)' : '(Bearish)'}`);
    }

    if (bb && Array.isArray(bb.value) && bb.value.length > 0) {
      const bbValue = bb.value[bb.value.length - 1];
      console.log(`Bollinger Bands: ${JSON.stringify(bbValue)}`);
    }

    if (sma && Array.isArray(sma.value) && sma.value.length > 0) {
      const smaValue = sma.value[sma.value.length - 1];
      console.log(`SMA: ${smaValue}`);
    }

  } catch (error) {
    console.error('❌ Error testing getIndicators:', error);
  }
}

// Run the test
testGetIndicators().catch(console.error);
