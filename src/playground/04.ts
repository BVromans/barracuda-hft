import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import "dotenv/config";
import { config } from "dotenv";

config({ path: ".env" });

// Rujira Contract Interface
interface RujiraExecuteMsg {
  // Placeholder for future execute operations
}

interface RujiraQueryMsg {
  // Rujira Bow/Fin queries
  strategy?: {
    denom: string;
    amount: string;
  };
  quote?: {
    denom: string;
    amount: string;
    offer_denom: string;
    offer_amount: string;
    ask_denom: string;
    ask_amount: string;
  };
  // BASE queries for Rujira Fin contract
  base?: {
    denom: string;
  };
  base_price?: {
    base_denom: string;
    quote_denom: string;
  };
  base_liquidity?: {
    denom: string;
  };
}

class RujiraClient {
  private constructor(
    public readonly client: CosmWasmClient,
    public readonly wallet: DirectSecp256k1HdWallet,
    public readonly contractAddress: string,
    public readonly rpcEndpoint: string
  ) {}

  static async connect(
    rpcEndpoint: string,
    mnemonic: string,
    contractAddress: string
  ): Promise<RujiraClient> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "sthor",
    });
    const client = await CosmWasmClient.connect(rpcEndpoint);
    return new RujiraClient(client, wallet, contractAddress, rpcEndpoint);
  }

  async query<T>(queryMsg: RujiraQueryMsg): Promise<T> {
    return this.client.queryContractSmart(this.contractAddress, queryMsg);
  }

  async simulate(
    executeMsg: RujiraExecuteMsg,
    funds?: { denom: string; amount: string }[]
  ) {
    const [{ address }] = await this.wallet.getAccounts();
    const signingClient = await SigningCosmWasmClient.connectWithSigner(
      this.rpcEndpoint,
      this.wallet,
      { gasPrice: GasPrice.fromString("0.025uatom") }
    );

    return signingClient.simulate(
      address,
      [{
        typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
        value: {
          sender: address,
          contract: this.contractAddress,
          msg: Buffer.from(JSON.stringify(executeMsg)).toString("base64"),
          funds: funds || []
        }
      }],
      ""
    );
  }

  async execute(
    executeMsg: RujiraExecuteMsg,
    funds?: { denom: string; amount: string }[]
  ) {
    const [{ address }] = await this.wallet.getAccounts();
    const gasPrice = GasPrice.fromString("0.025uatom");
    const signingClient = await SigningCosmWasmClient.connectWithSigner(
      this.rpcEndpoint,
      this.wallet,
      { gasPrice }
    );

    return signingClient.execute(
      address,
      this.contractAddress,
      executeMsg,
      "auto",
      undefined,
      funds
    );
  }
}

// === Rujira Fin Market Analysis (2 tokens only) ===
const finDecimals = 6; // Altere para 18 se necessário
const sampleFinData = [
  { book: { id: "RmluQm9vazp0aG9yMXM4cnhjdmc4M2N3YXI4N2VodjRjODY2YXV4dWprZmozazR3amt4a2FyZW43dm12bjluYXNzODBla3A=", pair: { assetBase: { price: { current: "4060000000000" } }, assetQuote: { price: { current: "999907000000" } } } } },
  { book: { id: "RmluQm9vazp0aG9yMTV0NGN5a2YzbWo4ZnN2ZDZoYThqMGxuYXZjeWV4Mmg0YTRsMnB2OHprY3RhbmR3Y2szenNoczkyank=", pair: { assetBase: { price: { current: "16645600000" } }, assetQuote: { price: { current: "999907000000" } } } } }
];

function analyzeFinMarket(finData: any[], decimals: number) {
  if (!Array.isArray(finData)) {
    console.log('No order book data found.');
    return;
  }
  console.log(`\n🔬 Rujira Fin Market Analysis (2 tokens, divisor: 1e${decimals}):`);
  
  for (const [i, entry] of finData.entries()) {
    const book = entry.book;
    if (!book || !book.pair) continue;
    
    const baseRaw = book.pair.assetBase.price.current;
    const quoteRaw = book.pair.assetQuote.price.current;
    const base = Number(baseRaw) / 10 ** decimals;
    const quote = Number(quoteRaw) / 10 ** decimals;
    const price = quote !== 0 ? base / quote : 0;
    
    // Market analysis
    const isStable = Math.abs(price - 1) < 0.01;
    const isVolatile = price > 10 || price < 0.1;
    const isHighValue = base > 1000000 || quote > 1000000;
    
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
    
    console.log(`\n📊 Token #${i + 1} - ${marketCategory} Market:`);
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
  
  console.log(`\n📈 Quick Market Summary:`);
  console.log(`- Total Tokens Analyzed: ${finData.length}`);
  console.log(`- Analysis shows base/quote price relationships`);
  console.log(`- Useful for understanding token valuations`);
}

async function main() {
  // Run Fin market analysis first
  analyzeFinMarket(sampleFinData, finDecimals);
  
  console.log('🚀 Starting Rujira Playground...');
  
  // Run Fin market analysis first
  analyzeFinMarket(sampleFinData, finDecimals);
  
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || "";
  const MNEMONIC = process.env.MNEMONIC || "";
  const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

  console.log('📡 Connecting to RPC endpoint:', RPC_ENDPOINT);
  console.log('🔑 Using mnemonic (first 3 words):', MNEMONIC.split(' ').slice(0, 3).join(' ') + '...');
  console.log('📄 SO Contract address:', CONTRACT_ADDRESS);

  if (!CONTRACT_ADDRESS) {
    console.log('⚠️ No SO contract address provided. Using Rujira contract for testing...');
    console.log('💡 Add CONTRACT_ADDRESS to your .env file for SO-specific testing');
  }

  console.log('🔌 Connecting to Rujira client...');
  const client = await RujiraClient.connect(
    RPC_ENDPOINT,
    MNEMONIC,
    CONTRACT_ADDRESS
  );
  console.log('✅ Connected successfully!');

  // Get wallet address for operations
  const [{ address }] = await client.wallet.getAccounts();
  console.log('👤 Wallet address:', address);

  // ===== PUBLIC QUERIES (NO FUNDS REQUIRED) =====
  console.log('\n🌐 Public queries (no funds required):');
  console.log('These operations only query public contract data:');

  // Test Rujira queries
  console.log('\n📊 Testing Rujira queries...');
  
  try {
    const strategyQuery = await client.query<any>({
      strategy: { denom: "ruji", amount: "1000000" },
    });
    console.log("✅ Strategy query:", JSON.stringify(strategyQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ Strategy query failed:", error instanceof Error ? error.message : String(error));
  }

  try {
    const quoteQuery = await client.query<any>({
      quote: { 
        denom: "ruji", 
        amount: "1000000", 
        offer_denom: "usdc", 
        offer_amount: "1000000", 
        ask_denom: "usdc", 
        ask_amount: "1000000" 
      },
    });
    console.log("✅ Quote query:", JSON.stringify(quoteQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ Quote query failed:", error instanceof Error ? error.message : String(error));
  }

  // Test with USDC token
  console.log('\n📊 Testing with USDC token...');
  
  try {
    const strategyQuery = await client.query<any>({
      strategy: { denom: "usdc", amount: "1000000" },
    });
    console.log("✅ USDC Strategy:", JSON.stringify(strategyQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ USDC strategy failed:", error instanceof Error ? error.message : String(error));
  }

  try {
    const quoteQuery = await client.query<any>({
      quote: { 
        denom: "usdc", 
        amount: "1000000", 
        offer_denom: "ruji", 
        offer_amount: "1000000", 
        ask_denom: "ruji", 
        ask_amount: "1000000" 
      },
    });
    console.log("✅ USDC Quote:", JSON.stringify(quoteQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ USDC quote failed:", error instanceof Error ? error.message : String(error));
  }

  // === BASE Analysis for ruji ↔ usdc ===
  console.log('\n🔍 BASE Analysis for ruji ↔ usdc pair...');
  
  try {
    // Test BASE query for RUJI
    const baseQuery = await client.query<any>({
      base: { denom: "ruji" },
    });
    console.log("✅ BASE query for RUJI:", JSON.stringify(baseQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ BASE query for RUJI failed:", error instanceof Error ? error.message : String(error));
  }

  try {
    // Test BASE query for USDC
    const baseUsdcQuery = await client.query<any>({
      base: { denom: "usdc" },
    });
    console.log("✅ BASE query for USDC:", JSON.stringify(baseUsdcQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ BASE query for USDC failed:", error instanceof Error ? error.message : String(error));
  }

  // Test BASE price analysis
  console.log('\n📊 BASE Price Analysis for ruji ↔ usdc:');
  try {
    const basePriceQuery = await client.query<any>({
      base_price: { 
        base_denom: "ruji",
        quote_denom: "usdc"
      },
    });
    console.log("✅ BASE price query:", JSON.stringify(basePriceQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ BASE price query failed:", error instanceof Error ? error.message : String(error));
  }

  // Test BASE liquidity analysis
  console.log('\n💧 BASE Liquidity Analysis:');
  try {
    const baseLiquidityQuery = await client.query<any>({
      base_liquidity: { 
        denom: "ruji"
      },
    });
    console.log("✅ BASE liquidity query:", JSON.stringify(baseLiquidityQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ BASE liquidity query failed:", error instanceof Error ? error.message : String(error));
  }

  // Summary of available operations
  console.log('\n📝 Summary of available operations:');
  console.log('✅ Rujira Contract - available operations:');
  console.log('  • Strategy queries');
  console.log('  • Quote queries');
  console.log('  • BASE queries (Fin contract)');
  console.log('  • Market analysis (Fin)');

  console.log('\n🎉 Rujira playground completed successfully!');
  console.log('\n📝 Available public operations:');
  console.log('  • Strategy queries (Rujira Bow/Fin)');
  console.log('  • Quote queries (Rujira Bow/Fin)');
  console.log('  • BASE queries (Rujira Fin only)');
  console.log('  • Market analysis (2 tokens)');
  console.log('\n⚠️ All operations are public queries - no funds required!');
  console.log('\n💡 Note: BASE queries only work with Rujira Fin contract');
}

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
    console.error('   - Try a different RPC endpoint');
    console.error('   - The endpoint might be down or blocked');
  }
  
  process.exit(1);
}); 