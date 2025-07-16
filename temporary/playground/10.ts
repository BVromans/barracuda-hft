import { RujiraClient } from "../client";
import { BowQueryMsg, BowStrategyResponse, BowQuoteResponse } from "../../src/types";
import "dotenv/config";
import { config } from "dotenv";

config({ path: ".env" });

async function main() {
  console.log('🚀 Starting Rujira Bow playground...');
  
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || "";
  const MNEMONIC = process.env.MNEMONIC || "";
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

  console.log('📡 Connecting to RPC endpoint:', RPC_ENDPOINT);
  console.log('🔑 Using mnemonic (first 3 words):', MNEMONIC.split(' ').slice(0, 3).join(' ') + '...');
  console.log('📄 Contract address:', CONTRACT_ADDRESS);

  console.log('🔌 Connecting to Rujira client...');
  const client = await RujiraClient.connect(
    RPC_ENDPOINT,
    MNEMONIC,
    CONTRACT_ADDRESS
  );
  console.log('✅ Connected successfully!');

  // Test Rujira Bow contract queries (these are the ones that actually work)

  console.log('\n🎯 Querying strategy (XYK AMM)...');
  try {
    const strategy = await client.query<BowStrategyResponse>({
      strategy: { denom: "btc-btc", amount: "1000000" },
    });
    console.log("✅ Strategy query result:", JSON.stringify(strategy, null, 2));
    
    // Parse the strategy data
    if (strategy.xyk && strategy.xyk.length >= 2) {
      const [config, state] = strategy.xyk;
      console.log('\n📊 Strategy Analysis:');
      console.log(`- Pool: ${config.x} / ${config.y}`);
      console.log(`- Step size: ${config.step}`);
      console.log(`- Min quote: ${config.min_quote}`);
      console.log(`- Fee: ${config.fee}`);
      console.log(`- Current X: ${state.x}`);
      console.log(`- Current Y: ${state.y}`);
      console.log(`- K constant: ${state.k}`);
      console.log(`- Total shares: ${state.shares}`);
    }
  } catch (error: unknown) {
    console.log("⚠️ Strategy query failed:", error instanceof Error ? error.message : String(error));
  }

  console.log('\n🔍 Base Analysis for BTC...');
  try {
    const strategy = await client.query<BowStrategyResponse>({
      strategy: { denom: "btc-btc", amount: "1000000" },
    });
    
    if (strategy.xyk && strategy.xyk.length >= 2) {
      const [config, state] = strategy.xyk;
      
      // Parse the base (X) and quote (Y) amounts
      const baseAmount = parseInt(state.x);
      const quoteAmount = parseInt(state.y);
      const kConstant = parseInt(state.k);
      const totalShares = parseInt(state.shares);
      
      console.log('\n📈 Base Side Analysis:');
      console.log(`- Base Token: ${config.x} (RUJI)`);
      console.log(`- Quote Token: ${config.y} (USDC)`);
      console.log(`- Base Liquidity: ${baseAmount.toLocaleString()} units`);
      console.log(`- Quote Liquidity: ${quoteAmount.toLocaleString()} units`);
      console.log(`- Base/Quote Ratio: ${(baseAmount / quoteAmount).toFixed(6)}`);
      console.log(`- Quote/Base Ratio: ${(quoteAmount / baseAmount).toFixed(6)}`);
      
      // Calculate market cap and value metrics
      const basePercentage = ((baseAmount / (baseAmount + quoteAmount)) * 100).toFixed(2);
      const quotePercentage = ((quoteAmount / (baseAmount + quoteAmount)) * 100).toFixed(2);
      
      console.log('\n💰 Liquidity Distribution:');
      console.log(`- Base Side: ${basePercentage}% of total liquidity`);
      console.log(`- Quote Side: ${quotePercentage}% of total liquidity`);
      
      // Calculate price impact for different trade sizes
      console.log('\n📊 Price Impact Analysis:');
      const tradeSizes = [1000, 10000, 100000, 1000000];
      
      for (const tradeSize of tradeSizes) {
        // Simple price impact calculation for XYK
        const newBaseAmount = baseAmount + tradeSize;
        const newQuoteAmount = kConstant / newBaseAmount;
        const priceImpact = ((quoteAmount - newQuoteAmount) / quoteAmount) * 100;
        
        console.log(`- ${tradeSize.toLocaleString()} base units: ${priceImpact.toFixed(4)}% price impact`);
      }
      
      // Calculate impermanent loss scenarios
      console.log('\n⚠️ Impermanent Loss Scenarios:');
      const priceChanges = [0.5, 1.0, 1.5, 2.0, 3.0];
      
      for (const priceChange of priceChanges) {
        const newQuoteAmount = quoteAmount * priceChange;
        const newK = baseAmount * newQuoteAmount;
        const newBaseAmount = Math.sqrt(newK);
        const impermanentLoss = ((baseAmount + newQuoteAmount) / (baseAmount + quoteAmount) - 1) * 100;
        
        console.log(`- ${priceChange}x price change: ${impermanentLoss.toFixed(4)}% IL`);
      }
      
      console.log('\n🔧 Pool Health Metrics:');
      console.log(`- K Constant: ${kConstant.toLocaleString()}`);
      console.log(`- Total Shares: ${totalShares.toLocaleString()}`);
      console.log(`- Average Share Value: ${(kConstant / totalShares).toFixed(2)}`);
      console.log(`- Pool Depth: ${Math.min(baseAmount, quoteAmount).toLocaleString()} units`);
    }
  } catch (error: unknown) {
    console.log("⚠️ Base Analysis failed:", error instanceof Error ? error.message : String(error));
  }

  console.log('\n💱 Querying quote for RUJI...');
  try {
    const quote = await client.query<BowQuoteResponse>({
      quote: { 
        denom: "ruji", 
        amount: "1000000", 
        offer_denom: "usdc", 
        offer_amount: "1000000", 
        ask_denom: "usdc", 
        ask_amount: "1000000" 
      },
    });
    console.log("✅ Quote query result:", JSON.stringify(quote, null, 2));
    
    // Parse the quote data
    console.log('\n💰 Quote Analysis:');
    console.log(`- Price: ${quote.price} USDC per RUJI`);
    console.log(`- Size: ${quote.size}`);
    console.log(`- Data: ${quote.data} (base64 encoded pool state)`);
    
    // Decode the base64 data if needed
    try {
      const decodedData = Buffer.from(quote.data, 'base64').toString('utf-8');
      console.log(`- Decoded data: ${decodedData}`);
    } catch (decodeError) {
      console.log(`- Could not decode base64 data: ${decodeError}`);
    }
  } catch (error: unknown) {
    console.log("⚠️ Quote query failed:", error instanceof Error ? error.message : String(error));
  }

  console.log('\n🔄 Testing BASE token (alias for RUJI)...');
  try {
    const baseTokenQuote = await client.query<BowQuoteResponse>({
      quote: { 
        denom: "base", 
        amount: "1000000", 
        offer_denom: "usdc", 
        offer_amount: "1000000", 
        ask_denom: "usdc", 
        ask_amount: "1000000" 
      },
    });
    console.log("✅ BASE token quote result:", JSON.stringify(baseTokenQuote, null, 2));
    
    console.log('\n💰 BASE Token Analysis:');
    console.log(`- Price: ${baseTokenQuote.price} USDC per BASE token`);
    console.log(`- Size: ${baseTokenQuote.size}`);
    console.log(`- Note: BASE token returns same result as RUJI - they are aliases`);
  } catch (error: unknown) {
    console.log("⚠️ BASE token quote failed:", error instanceof Error ? error.message : String(error));
  }

  console.log('\n🎉 Playground completed successfully!');
  console.log('\n📝 Summary:');
  console.log('- Rujira Bow contract supports: strategy, quote queries');
  console.log('- Strategy shows XYK AMM configuration and current state');
  console.log('- Quote provides price and size for swaps');
  console.log('- All amounts are strings representing large numbers');
  console.log('- This is an AMM (Automated Market Maker) contract, not an order book');
  console.log('- The contract uses XYK (x*y=k) formula for pricing');
}

// === Rujira Fin Order Book Analysis ===

/**
 * Processes and displays Rujira Fin order book data.
 * @param finData The data.fin array from the Fin contract query
 */
function analyzeFinOrderBooks(finData: any[]) {
  if (!Array.isArray(finData)) {
    console.log('No order book data found.');
    return;
  }
  console.log('\n📚 Rujira Fin Order Book Analysis:');
  for (const entry of finData) {
    const book = entry.book;
    if (!book || !book.pair) continue;
    const id = book.id;
    const basePrice = Number(book.pair.assetBase.price.current);
    const quotePrice = Number(book.pair.assetQuote.price.current);
    const price = quotePrice !== 0 ? basePrice / quotePrice : 0;
    // Try to decode the id (base64)
    let decodedId = id;
    try {
      decodedId = Buffer.from(id, 'base64').toString('utf-8');
    } catch {}
    console.log('------------------------------');
    console.log(`Book ID: ${decodedId}`);
    console.log(`- Base Price: ${basePrice}`);
    console.log(`- Quote Price: ${quotePrice}`);
    console.log(`- Base/Quote Price: ${price}`);
  }
  console.log('------------------------------');
}

// === Example usage ===
// To use this, paste your Fin query result as below:
// const finResult = { ... };
// analyzeFinOrderBooks(finResult.data.fin);

// === Dados reais do usuário (Fin query) - 2 tokens apenas ===
const finDecimals = 6; // Altere para 18 se necessário
const realFinResult = {
  data: {
    fin: [
      { book: { id: "RmluQm9vazp0aG9yMXM4cnhjdmc4M2N3YXI4N2VodjRjODY2YXV4dWprZmozazR3amt4a2FyZW43dm12bjluYXNzODBla3A=", pair: { assetBase: { price: { current: "4060000000000" } }, assetQuote: { price: { current: "999907000000" } } } } },
      { book: { id: "RmluQm9vazp0aG9yMTV0NGN5a2YzbWo4ZnN2ZDZoYThqMGxuYXZjeWV4Mmg0YTRsMnB2OHprY3RhbmR3Y2szenNoczkyank=", pair: { assetBase: { price: { current: "16645600000" } }, assetQuote: { price: { current: "999907000000" } } } } }
    ]
  }
};

function analyzeFinBasePrices(finData: any[], decimals: number) {
  if (!Array.isArray(finData)) {
    console.log('No order book data found.');
    return;
  }
  console.log(`\n🔬 Rujira Fin Market Analysis (2 tokens, divisor: 1e${decimals}):`);
  
  // Market statistics
  let totalPairs = 0;
  let stablePairs = 0;
  let volatilePairs = 0;
  let highValuePairs = 0;
  
  for (const [i, entry] of finData.entries()) {
    const book = entry.book;
    if (!book || !book.pair) continue;
    
    const baseRaw = book.pair.assetBase.price.current;
    const quoteRaw = book.pair.assetQuote.price.current;
    const base = Number(baseRaw) / 10 ** decimals;
    const quote = Number(quoteRaw) / 10 ** decimals;
    const price = quote !== 0 ? base / quote : 0;
    
    // Market analysis
    const isStable = Math.abs(price - 1) < 0.01; // Within 1% of 1.0
    const isVolatile = price > 10 || price < 0.1; // Very high or very low ratio
    const isHighValue = base > 1000000 || quote > 1000000; // High absolute values
    
    if (isStable) stablePairs++;
    if (isVolatile) volatilePairs++;
    if (isHighValue) highValuePairs++;
    totalPairs++;
    
    // Market category
    let marketCategory = "Normal";
    if (isStable) marketCategory = "Stable";
    else if (isVolatile) marketCategory = "Volatile";
    else if (isHighValue) marketCategory = "High-Value";
    
    // Price trend indicator
    let trendIndicator = "";
    if (price > 1.5) trendIndicator = "📈 Bullish (Base Strong)";
    else if (price < 0.5) trendIndicator = "📉 Bearish (Base Weak)";
    else if (Math.abs(price - 1) < 0.1) trendIndicator = "➡️ Sideways (Stable)";
    else trendIndicator = "🔄 Mixed";
    
    console.log(`\n📊 Pair #${i + 1} - ${marketCategory} Market:`);
    console.log(`- Base Asset Price: ${base.toLocaleString()} (raw: ${baseRaw})`);
    console.log(`- Quote Asset Price: ${quote.toLocaleString()} (raw: ${quoteRaw})`);
    console.log(`- Market Ratio: ${price.toFixed(6)} (1 Base = ${price.toFixed(6)} Quote)`);
    console.log(`- Trend: ${trendIndicator}`);
    
    // Market insights
    if (isStable) {
      console.log(`- 💰 Market Type: Stable Pair (likely stablecoins or pegged assets)`);
    } else if (price > 100) {
      console.log(`- 🚀 Market Type: High-Value Base (Base asset significantly more valuable)`);
    } else if (price < 0.01) {
      console.log(`- 📉 Market Type: Low-Value Base (Base asset significantly less valuable)`);
    } else {
      console.log(`- 📊 Market Type: Standard Trading Pair`);
    }
    
    // Trading insights
    if (price > 1) {
      console.log(`- 💡 Trading Insight: Base is ${price.toFixed(2)}x more valuable than Quote`);
    } else if (price < 1) {
      console.log(`- 💡 Trading Insight: Quote is ${(1/price).toFixed(2)}x more valuable than Base`);
    } else {
      console.log(`- 💡 Trading Insight: Assets are at parity`);
    }
    
    console.log('─'.repeat(50));
  }
  
  // Market summary
  console.log(`\n📈 Quick Market Summary:`);
  console.log(`- Total Tokens Analyzed: ${totalPairs}`);
  console.log(`- Analysis shows base/quote price relationships`);
  console.log(`- Useful for understanding token valuations`);
}

// Run the analysis on the real data
analyzeFinBasePrices(realFinResult.data.fin, finDecimals);

main().catch((error) => {
  console.error('❌ Error occurred:');
  console.error('Message:', error.message);
  console.error('Stack trace:');
  console.error(error.stack);

  if (error.message.includes('mnemonic')) {
    console.error('\n💡 Tip: Make sure your mnemonic has 12, 15, 18, 21, or 24 words');
  }
  
  if (error.message.includes('connection') || error.message.includes('rpc')) {
    console.error('\n💡 Tip: Check if the RPC endpoint is correct and accessible');
  }
  
  if (error.message.includes('526') || error.message.includes('Bad status')) {
    console.error('\n💡 Tip: RPC endpoint is not accessible. Try:');
    console.error('   - Check your internet connection');
    console.error('   - Try a different RPC endpoint (e.g., https://rpc-testnet.cosmos.network)');
    console.error('   - The endpoint might be down or blocked');
  }
  
  process.exit(1);
});