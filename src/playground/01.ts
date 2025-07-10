import "dotenv/config";
import { config } from "dotenv";
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import {CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { Logger } from '../utils/logger';

config({ path: ".env" });

export interface BowStrategyResponse {
  xyk: [
    {
      x: string;
      y: string;
      step: string;
      min_quote: string;
      fee: string;
    },
    {
      x: string;
      y: string;
      k: string;
      shares: string;
    }
  ];
}

export interface BowQuoteResponse {
  price: string;
  size: string;
  data: string; // Base64 encoded data
}

export interface FinConfigResponse {
  admin?: string;
  fee_recipient?: string;
  fee_rate?: string;
  max_fee_rate?: string;
  min_order_size?: string;
  max_order_size?: string;
  order_book_depth?: number;
  settlement_period?: number;
  liquidation_threshold?: string;
  margin_requirement?: string;
  max_leverage?: number;
  price_precision?: number;
  quantity_precision?: number;
}

export interface FinOrderBookResponse {
  book: {
    id: string;
    pair: {
      assetBase: {
        price: { current: string };
        denom: string;
      };
      assetQuote: {
        price: { current: string };
        denom: string;
      };
    };
    bids: Array<{
      price: string;
      quantity: string;
      owner: string;
    }>;
    asks: Array<{
      price: string;
      quantity: string;
      owner: string;
    }>;
  };
}

export interface FinOrdersResponse {
  orders: Array<{
    id: string;
    owner: string;
    side: string;
    price: string;
    quantity: string;
    filled: string;
    status: string;
    created_at: number;
  }>;
}

export interface Coin {
  amount: string; // Uint128
  denom: string;
}

export interface Side {
  base: string;
  quote: string;
}

export interface Price {
  fixed?: string; // Decimal string
  oracle?: number; // Integer index
}

export interface FinQueryMsg {
  config?: {};
  simulate?: Coin;
  order?: [string, Side, Price]; // [owner, side, price]
  orders?: {
    owner: string;
    side?: Side;
    offset?: number; // uint8
    limit?: number; // uint8 (max 30)
  };
  book?: {
    limit?: number; // uint8
    offset?: number; // uint8
  };
}

export interface BowQueryMsg {
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
}

export interface SwapRequest {
  min_return?: string; // Uint128
  to?: string; // Address
  callback?: any; // Binary data
}

export interface CallbackData {
  // Binary data for callbacks
}

export interface FinExecuteMsg {
  swap?: SwapRequest;
  order?: [
    Array<[Side, Price, string | null]>, // [side, price, amount]
    CallbackData | null
  ];
  arb?: {
    then?: any; // Binary data
  };
  do_swap?: [string, SwapRequest]; // [address, swap_request]
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
      prefix: "thor",
    });
    const client = await CosmWasmClient.connect(rpcEndpoint);
    return new RujiraClient(client, wallet, contractAddress, rpcEndpoint);
  }

  async query<T>(queryMsg: any): Promise<T> {
    return this.client.queryContractSmart(this.contractAddress, queryMsg);
  }

  async execute(
    executeMsg: FinExecuteMsg,
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

async function main() {
  const logger = new Logger('playground01');
  
  console.log('🚀 Starting Rujira Contract Analysis...');
  
  const RPC_ENDPOINT = process.env.RPC_ENDPOINT || "https://rpc.ninerealms.com";
  const MNEMONIC = process.env.MNEMONIC || "";
  const CONTRACT_ADDRESS = "thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf";

  console.log('📡 Connecting to RPC endpoint:', RPC_ENDPOINT);
  console.log('🔑 Using mnemonic (first 3 words):', MNEMONIC.split(' ').slice(0, 3).join(' ') + '...');
  console.log('📄 Contract address:', CONTRACT_ADDRESS);

  logger.log('analysis_started', {
    rpcEndpoint: RPC_ENDPOINT,
    contractAddress: CONTRACT_ADDRESS,
    mnemonicLength: MNEMONIC.split(' ').length
  });

  console.log('🔌 Connecting to Rujira client...');
  const client = await RujiraClient.connect(
    RPC_ENDPOINT,
    MNEMONIC,
    CONTRACT_ADDRESS
  );
  console.log('✅ Connected successfully!');
  
  logger.log('client_connected', {
    rpcEndpoint: RPC_ENDPOINT,
    contractAddress: CONTRACT_ADDRESS
  });

  // First, let's identify what type of contract this is
  console.log('\n🔍 Contract Type Identification...');
  
  // Try Fin config query
  console.log('\n📋 Testing Fin Config Query...');
  try {
    const finConfig = await client.query<FinConfigResponse>({ config: {} });
    console.log("✅ CONFIRMED: This is a Fin contract!");
    console.log("📊 Fin Config:", JSON.stringify(finConfig, null, 2));
    
    logger.log('contract_type_identified', {
      contractType: 'Fin',
      contractAddress: CONTRACT_ADDRESS,
      config: finConfig
    });
    
    // Display key Fin configuration
    console.log('\n🏛️ Fin Contract Configuration:');
    console.log(`- Admin: ${finConfig.admin || 'Not set'}`);
    console.log(`- Fee Recipient: ${finConfig.fee_recipient || 'Not set'}`);
    console.log(`- Fee Rate: ${finConfig.fee_rate || 'Not set'}`);
    console.log(`- Max Fee Rate: ${finConfig.max_fee_rate || 'Not set'}`);
    console.log(`- Min Order Size: ${finConfig.min_order_size || 'Not set'}`);
    console.log(`- Max Order Size: ${finConfig.max_order_size || 'Not set'}`);
    console.log(`- Order Book Depth: ${finConfig.order_book_depth || 'Not set'}`);
    console.log(`- Settlement Period: ${finConfig.settlement_period || 'Not set'}`);
    console.log(`- Liquidation Threshold: ${finConfig.liquidation_threshold || 'Not set'}`);
    console.log(`- Margin Requirement: ${finConfig.margin_requirement || 'Not set'}`);
    console.log(`- Max Leverage: ${finConfig.max_leverage || 'Not set'}`);
    console.log(`- Price Precision: ${finConfig.price_precision || 'Not set'}`);
    console.log(`- Quantity Precision: ${finConfig.quantity_precision || 'Not set'}`);
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Not a Fin contract (config query failed):", errorMessage);
    logger.log('contract_type_check', {
      contractType: 'Fin',
      contractAddress: CONTRACT_ADDRESS,
      success: false,
      error: errorMessage
    });
  }

  // Try Bow strategy query
  console.log('\n🎯 Testing Bow Strategy Query...');
  try {
    const bowStrategy = await client.query<BowStrategyResponse>({
      strategy: { denom: "btc-btc", amount: "1000000" },
    });
    console.log("✅ CONFIRMED: This is a Bow contract!");
    console.log("📊 Bow Strategy:", JSON.stringify(bowStrategy, null, 2));
    
    logger.log('contract_type_identified', {
      contractType: 'Bow',
      contractAddress: CONTRACT_ADDRESS,
      strategy: bowStrategy
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Not a Bow contract (strategy query failed):", errorMessage);
    logger.log('contract_type_check', {
      contractType: 'Bow',
      contractAddress: CONTRACT_ADDRESS,
      success: false,
      error: errorMessage
    });
  }

  // Try to get order book data
  console.log('\n📚 Testing Order Book Query...');
  try {
    const orderBook = await client.query<FinOrderBookResponse>({
      book: { limit: 10, offset: 0 }
    });
    console.log("✅ Order Book Query Success!");
    console.log("📊 Order Book:", JSON.stringify(orderBook, null, 2));
    
    logger.log('order_book_query', {
      contractAddress: CONTRACT_ADDRESS,
      orderBook: orderBook,
      limit: 10,
      offset: 0
    });
    
    if (orderBook.book) {
      console.log('\n📖 Order Book Analysis:');
      console.log(`- Book ID: ${orderBook.book.id}`);
      console.log(`- Base Asset: ${orderBook.book.pair.assetBase.denom}`);
      console.log(`- Quote Asset: ${orderBook.book.pair.assetQuote.denom}`);
      console.log(`- Base Price: ${orderBook.book.pair.assetBase.price.current}`);
      console.log(`- Quote Price: ${orderBook.book.pair.assetQuote.price.current}`);
      console.log(`- Bids Count: ${orderBook.book.bids?.length || 0}`);
      console.log(`- Asks Count: ${orderBook.book.asks?.length || 0}`);
      
      // Show top bids and asks
      if (orderBook.book.bids && orderBook.book.bids.length > 0) {
        console.log('\n📈 Top Bids:');
        orderBook.book.bids.slice(0, 5).forEach((bid, index) => {
          console.log(`  ${index + 1}. Price: ${bid.price}, Quantity: ${bid.quantity}, Owner: ${bid.owner.substring(0, 20)}...`);
        });
      }
      
      if (orderBook.book.asks && orderBook.book.asks.length > 0) {
        console.log('\n📉 Top Asks:');
        orderBook.book.asks.slice(0, 5).forEach((ask, index) => {
          console.log(`  ${index + 1}. Price: ${ask.price}, Quantity: ${ask.quantity}, Owner: ${ask.owner.substring(0, 20)}...`);
        });
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Order book query failed:", errorMessage);
    logger.log('order_book_query', {
      contractAddress: CONTRACT_ADDRESS,
      success: false,
      error: errorMessage
    });
  }

  // Try to get orders
  console.log('\n📋 Testing Orders Query...');
  try {
    const orders = await client.query<FinOrdersResponse>({
      orders: { owner: "thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf", limit: 10 }
    });
    console.log("✅ Orders Query Success!");
    console.log("📊 Orders:", JSON.stringify(orders, null, 2));
    
    logger.log('orders_query', {
      contractAddress: CONTRACT_ADDRESS,
      owner: "thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf",
      orders: orders,
      limit: 10
    });
    
    if (orders.orders && orders.orders.length > 0) {
      console.log('\n📋 Orders Analysis:');
      console.log(`- Total Orders: ${orders.orders.length}`);
      
      orders.orders.forEach((order, index) => {
        console.log(`\nOrder ${index + 1}:`);
        console.log(`  - ID: ${order.id}`);
        console.log(`  - Owner: ${order.owner}`);
        console.log(`  - Side: ${order.side}`);
        console.log(`  - Price: ${order.price}`);
        console.log(`  - Quantity: ${order.quantity}`);
        console.log(`  - Filled: ${order.filled}`);
        console.log(`  - Status: ${order.status}`);
        console.log(`  - Created: ${new Date(order.created_at * 1000).toISOString()}`);
      });
    } else {
      console.log('No orders found for this address');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Orders query failed:", errorMessage);
    logger.log('orders_query', {
      contractAddress: CONTRACT_ADDRESS,
      owner: "thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf",
      success: false,
      error: errorMessage
    });
  }

  // Try simulation
  console.log('\n🧪 Testing Simulation Query...');
  try {
    const simulation = await client.query({
      simulate: { amount: "1000000", denom: "rune" }
    });
    console.log("✅ Simulation Query Success!");
    console.log("📊 Simulation:", JSON.stringify(simulation, null, 2));
    
    logger.log('simulation_query', {
      contractAddress: CONTRACT_ADDRESS,
      simulation: simulation,
      amount: "1000000",
      denom: "rune"
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Simulation query failed:", errorMessage);
    logger.log('simulation_query', {
      contractAddress: CONTRACT_ADDRESS,
      amount: "1000000",
      denom: "rune",
      success: false,
      error: errorMessage
    });
  }

  console.log('\n🎉 Contract Analysis completed!');
  console.log('\n📝 Summary:');
  console.log('- Contract address: thor1t76lvqjq7avt6kxnul4pt0zaq6y06fhkw29wxs5rm4kt873s6y9sdp8rxf');
  console.log('- This appears to be a Fin contract (order book DEX)');
  console.log('- Supports: config, book, orders, simulation queries');
  console.log('- This is an order book contract, not an AMM like Bow');
  
  logger.log('analysis_completed', {
    contractAddress: CONTRACT_ADDRESS,
    contractType: 'Fin',
    supportedQueries: ['config', 'book', 'orders', 'simulation']
  });
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