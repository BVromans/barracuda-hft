// Simple playground for testing specific indicators and trading signals
// Usage: bun run temporary/playground/working/get-indicators-simple.ts

import "dotenv/config";
import { Rujira } from '../../../src/rujira';
import { Indicator } from '../../../src/types';

// Market configuration
const MARKET_ADDRESS = "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a"; // RUJI/USDC
const CANDLE_INTERVAL = '1h';
const MAX_CANDLES = 50;

// Focus on key indicators for trading
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
  }
];

async function analyzeTradingSignals() {
  console.log('🚀 Trading Indicator Analysis');
  console.log('='.repeat(50));

  try {
    // Initialize Rujira with wallet credentials from environment
    const walletPrivateKey = process.env.WALLET_PRIVATE_KEY;
    if (!walletPrivateKey) {
      throw new Error('WALLET_PRIVATE_KEY environment variable is required');
    }

    const rujira = new Rujira({
      walletPrivateKey: walletPrivateKey
    });
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

    // Get indicators
    const indicators = await rujira.fin.getIndicators({
      marketAddress: MARKET_ADDRESS,
      maximumNumberOfCandles: MAX_CANDLES,
      interval: CANDLE_INTERVAL,
      candles: candles
    });

    // Analyze each indicator
    console.log('🔍 Trading Signal Analysis:');
    console.log('='.repeat(50));

    for (const tradingIndicator of TRADING_INDICATORS) {
      const indicatorData = indicators.get(tradingIndicator.indicator);

      if (!indicatorData) {
        console.log(`❌ ${tradingIndicator.name}: Not available`);
        continue;
      }

      console.log(`\n📊 ${tradingIndicator.name} (${tradingIndicator.description})`);

      const values = indicatorData.value;
      if (!Array.isArray(values) || values.length === 0) {
        console.log(`   No data available`);
        continue;
      }

      const currentValue = values[values.length - 1];
      const previousValue = values.length > 1 ? values[values.length - 2] : null;

      console.log(`   Current: ${currentValue}`);
      if (previousValue !== null) {
        console.log(`   Previous: ${previousValue}`);
        const change = currentValue - previousValue;
        console.log(`   Change: ${change > 0 ? '+' : ''}${change.toFixed(4)}`);
      }

      // Generate trading signals based on indicator type
      let signal = '';
      let signalStrength = '';

      switch (tradingIndicator.name) {
        case 'RSI':
          if (currentValue > (tradingIndicator.overbought || 70)) {
            signal = 'SELL';
            signalStrength = 'Strong';
          } else if (currentValue < (tradingIndicator.oversold || 30)) {
            signal = 'BUY';
            signalStrength = 'Strong';
          } else if (currentValue > 60) {
            signal = 'SELL';
            signalStrength = 'Weak';
          } else if (currentValue < 40) {
            signal = 'BUY';
            signalStrength = 'Weak';
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
          // Bollinger Bands return an object with upper, middle, lower bands
          if (typeof currentValue === 'object' && currentValue !== null) {
            const price = candles.get(candles.size - 1)?.close.toNumber();
            const upper = currentValue.upper;
            const lower = currentValue.lower;

            if (price && price >= upper) {
              signal = 'SELL';
              signalStrength = 'Strong';
            } else if (price && price <= lower) {
              signal = 'BUY';
              signalStrength = 'Strong';
            } else {
              signal = 'HOLD';
              signalStrength = 'Neutral';
            }
          }
          break;

        case 'SMA':
        case 'EMA':
          const price = candles.get(candles.size - 1)?.close.toNumber();
          if (price && price > currentValue) {
            signal = 'BUY';
            signalStrength = 'Above MA';
          } else {
            signal = 'SELL';
            signalStrength = 'Below MA';
          }
          break;

        case 'ATR':
          // ATR is volatility, not a direct signal
          signal = 'INFO';
          signalStrength = `Volatility: ${currentValue.toFixed(4)}`;
          break;

        default:
          signal = 'UNKNOWN';
          signalStrength = 'No signal logic';
      }

      console.log(`   Signal: ${signal} (${signalStrength})`);
    }

    // Generate combined signal
    console.log('\n🎯 Combined Trading Signal:');
    console.log('='.repeat(50));

    const signals = {
      BUY: 0,
      SELL: 0,
      HOLD: 0,
      INFO: 0
    };

    for (const tradingIndicator of TRADING_INDICATORS) {
      const indicatorData = indicators.get(tradingIndicator.indicator);
      if (indicatorData && Array.isArray(indicatorData.value) && indicatorData.value.length > 0) {
        const currentValue = indicatorData.value[indicatorData.value.length - 1];

        // Simple signal logic
        if (tradingIndicator.name === 'RSI') {
          if (currentValue > 70) signals.SELL++;
          else if (currentValue < 30) signals.BUY++;
          else signals.HOLD++;
        } else if (tradingIndicator.name === 'MACD') {
          if (currentValue > 0) signals.BUY++;
          else signals.SELL++;
        } else if (tradingIndicator.name === 'SMA' || tradingIndicator.name === 'EMA') {
          const price = candles.get(candles.size - 1)?.close.toNumber();
          if (price && price > currentValue) signals.BUY++;
          else signals.SELL++;
        }
      }
    }

    console.log(`Buy signals: ${signals.BUY}`);
    console.log(`Sell signals: ${signals.SELL}`);
    console.log(`Hold signals: ${signals.HOLD}`);
    console.log(`Info signals: ${signals.INFO}`);

    // Determine overall signal
    let overallSignal = 'HOLD';
    if (signals.BUY > signals.SELL && signals.BUY > signals.HOLD) {
      overallSignal = 'BUY';
    } else if (signals.SELL > signals.BUY && signals.SELL > signals.HOLD) {
      overallSignal = 'SELL';
    }

    console.log(`\n🎯 Overall Signal: ${overallSignal}`);

    // Show current price
    const currentPrice = candles.get(candles.size - 1)?.close;
    console.log(`💰 Current Price: ${currentPrice?.toString()} ${market.tokens.quote.symbol}`);

  } catch (error: any) {
    console.error('❌ Error:', error);
  }
}

// Run the analysis
analyzeTradingSignals().catch(console.error);
