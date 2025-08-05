// Playground for testing indicators with custom parameters
// Usage: bun run temporary/playground/working/get-indicators-custom-params.ts

import { Rujira } from '../../../src/rujira';
import { Indicator } from '../../../src/types';

// Market configuration
const MARKET_ADDRESS = "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a"; // RUJI/USDC
const CANDLE_INTERVAL = '1h';
const MAX_CANDLES = 100;

// Custom indicator configurations
const CUSTOM_INDICATOR_CONFIGS = [
  {
    name: "RSI Short Term",
    indicator: Indicator.relative_strength_index,
    description: "RSI with 14-period default",
    parameters: [14]
  },
  {
    name: "RSI Long Term",
    indicator: Indicator.relative_strength_index,
    description: "RSI with 21-period for longer term",
    parameters: [21]
  },
  {
    name: "SMA Fast",
    indicator: Indicator.simple_moving_average,
    description: "10-period SMA",
    parameters: [10]
  },
  {
    name: "SMA Medium",
    indicator: Indicator.simple_moving_average,
    description: "20-period SMA (default)",
    parameters: [20]
  },
  {
    name: "SMA Slow",
    indicator: Indicator.simple_moving_average,
    description: "50-period SMA",
    parameters: [50]
  },
  {
    name: "EMA Fast",
    indicator: Indicator.exponential_moving_average,
    description: "12-period EMA",
    parameters: [12]
  },
  {
    name: "EMA Slow",
    indicator: Indicator.exponential_moving_average,
    description: "26-period EMA",
    parameters: [26]
  },
  {
    name: "Bollinger Bands Tight",
    indicator: Indicator.bollinger_bands,
    description: "20-period with 1.5 std dev",
    parameters: [20, 1.5]
  },
  {
    name: "Bollinger Bands Wide",
    indicator: Indicator.bollinger_bands,
    description: "20-period with 2.5 std dev",
    parameters: [20, 2.5]
  },
  {
    name: "ATR Short",
    indicator: Indicator.average_true_range,
    description: "10-period ATR",
    parameters: [10]
  },
  {
    name: "ATR Long",
    indicator: Indicator.average_true_range,
    description: "21-period ATR",
    parameters: [21]
  }
];

async function testCustomParameters() {
  console.log('🔧 Testing Indicators with Custom Parameters');
  console.log('='.repeat(60));

  try {
    // Initialize Rujira
    const rujira = new Rujira({});
    await rujira.initialize({});

    // Get market info
    const market = await rujira.fin.getMarket({ address: MARKET_ADDRESS });
    console.log(`📊 Market: ${market.symbol}`);
    console.log(`💰 Base: ${market.tokens.base.symbol}, Quote: ${market.tokens.quote.symbol}\n`);

    // Get candles
    console.log('📈 Fetching price data...');
    const candles = await rujira.fin.getCandles({
      marketAddress: MARKET_ADDRESS,
      maximumNumberOfCandles: MAX_CANDLES,
      interval: CANDLE_INTERVAL
    });

    console.log(`✅ Got ${candles.size} candles\n`);

    // Test each custom configuration
    console.log('🔧 Custom Parameter Testing:');
    console.log('='.repeat(60));

    for (const config of CUSTOM_INDICATOR_CONFIGS) {
      console.log(`\n📊 ${config.name}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Parameters: [${config.parameters.join(', ')}]`);

      try {
        // Create a custom indicator instance with custom parameters
        const customIndicator = new Indicator(
          config.indicator.id,
          config.name,
          config.parameters
        );

        // Get indicators with custom parameters
        const indicators = await rujira.fin.getIndicators({
          marketAddress: MARKET_ADDRESS,
          maximumNumberOfCandles: MAX_CANDLES,
          interval: CANDLE_INTERVAL,
          candles: candles
        });

        // Find the indicator data
        const indicatorData = indicators.get(customIndicator);

        if (indicatorData) {
          const values = indicatorData.value;

          if (Array.isArray(values) && values.length > 0) {
            const currentValue = values[values.length - 1];
            const previousValue = values.length > 1 ? values[values.length - 2] : null;

            console.log(`   Current Value: ${currentValue}`);

            if (previousValue !== null) {
              const change = currentValue - previousValue;
              const changePercent = (change / previousValue) * 100;
              console.log(`   Previous Value: ${previousValue}`);
              console.log(`   Change: ${change > 0 ? '+' : ''}${change.toFixed(4)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
            }

            // Generate signal based on indicator type
            let signal = '';
            if (config.name.includes('RSI')) {
              if (currentValue > 70) signal = 'SELL (Overbought)';
              else if (currentValue < 30) signal = 'BUY (Oversold)';
              else signal = 'HOLD (Neutral)';
            } else if (config.name.includes('SMA') || config.name.includes('EMA')) {
              const currentPrice = candles.get(candles.size - 1)?.close.toNumber();
              if (currentPrice && currentPrice > currentValue) signal = 'BUY (Above MA)';
              else signal = 'SELL (Below MA)';
            } else if (config.name.includes('Bollinger')) {
              if (typeof currentValue === 'object' && currentValue !== null) {
                const price = candles.get(candles.size - 1)?.close.toNumber();
                if (price && price >= currentValue.upper) signal = 'SELL (Above Upper Band)';
                else if (price && price <= currentValue.lower) signal = 'BUY (Below Lower Band)';
                else signal = 'HOLD (Within Bands)';
              }
            } else if (config.name.includes('ATR')) {
              signal = `INFO (Volatility: ${currentValue.toFixed(4)})`;
            }

            console.log(`   Signal: ${signal}`);
          } else {
            console.log(`   No data available`);
          }
        } else {
          console.log(`   Indicator not found`);
        }

      } catch (error: any) {
        console.log(`   Error: ${error.message}`);
      }
    }

    // Compare different parameter settings
    console.log('\n📊 Parameter Comparison:');
    console.log('='.repeat(60));

    // Compare RSI settings
    console.log('\n🔄 RSI Comparison:');
    const rsiConfigs = CUSTOM_INDICATOR_CONFIGS.filter(c => c.name.includes('RSI'));
    for (const rsiConfig of rsiConfigs) {
      const customIndicator = new Indicator(
        rsiConfig.indicator.id,
        rsiConfig.name,
        rsiConfig.parameters
      );

      const indicators = await rujira.fin.getIndicators({
        marketAddress: MARKET_ADDRESS,
        maximumNumberOfCandles: MAX_CANDLES,
        interval: CANDLE_INTERVAL,
        candles: candles
      });

      const indicatorData = indicators.get(customIndicator);
      if (indicatorData && Array.isArray(indicatorData.value) && indicatorData.value.length > 0) {
        const value = indicatorData.value[indicatorData.value.length - 1];
        console.log(`   ${rsiConfig.name}: ${value.toFixed(2)}`);
      }
    }

    // Compare SMA settings
    console.log('\n📈 SMA Comparison:');
    const smaConfigs = CUSTOM_INDICATOR_CONFIGS.filter(c => c.name.includes('SMA'));
    for (const smaConfig of smaConfigs) {
      const customIndicator = new Indicator(
        smaConfig.indicator.id,
        smaConfig.name,
        smaConfig.parameters
      );

      const indicators = await rujira.fin.getIndicators({
        marketAddress: MARKET_ADDRESS,
        maximumNumberOfCandles: MAX_CANDLES,
        interval: CANDLE_INTERVAL,
        candles: candles
      });

      const indicatorData = indicators.get(customIndicator);
      if (indicatorData && Array.isArray(indicatorData.value) && indicatorData.value.length > 0) {
        const value = indicatorData.value[indicatorData.value.length - 1];
        const currentPrice = candles.get(candles.size - 1)?.close.toNumber();
        if (currentPrice) {
          const difference = ((currentPrice - value) / value) * 100;
          console.log(`   ${smaConfig.name}: ${value.toFixed(4)} (Price ${difference > 0 ? '+' : ''}${difference.toFixed(2)}%)`);
        } else {
          console.log(`   ${smaConfig.name}: ${value.toFixed(4)} (Price data not available)`);
        }
      }
    }

    // Show current market conditions
    console.log('\n📊 Current Market Conditions:');
    console.log('='.repeat(60));

    const currentPrice = candles.get(candles.size - 1)?.close;
    const firstPrice = candles.get(0)?.close;

    if (currentPrice && firstPrice) {
      const priceChange = ((currentPrice.toNumber() - firstPrice.toNumber()) / firstPrice.toNumber()) * 100;
      console.log(`Current Price: ${currentPrice.toString()} ${market.tokens.quote.symbol}`);
      console.log(`Price Change: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%`);
    } else {
      console.log('Price data not available');
    }
    console.log(`Period: ${candles.size} candles (${CANDLE_INTERVAL} each)`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the test
testCustomParameters().catch(console.error);
