import { RujiraClient } from "../client";
import { ExecuteMsg, QueryMsg } from "../types";
import "dotenv/config";
import { config } from "dotenv";


config({ path: ".env" });

async function main() {
  console.log('🚀 Starting Rujira playground...');
  
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

  // const simulate = await client.query<any>({ simulate: { denom: "btc-btc", amount: "1000000" } });
  // console.log("✅ Simulate:", simulate);

  console.log('📊 Querying strategy...');
  try {
    const strategy = await client.query({
      strategy: { denom: "btc-btc", amount: "1000000" },
    });
    console.log("✅ Strategy query result:", strategy);
  } catch (error: unknown) {
    console.log("⚠️ Strategy query failed:", error instanceof Error ? error.message : String(error));
  }

  console.log('💰 Querying quote...');
  try {
    const quote = await client.query({
      quote: { denom: "btc-btc", amount: "1000000", offer_denom: "rune", offer_amount: "1000000", ask_denom: "rune", ask_amount: "1000000" },
    });
    console.log("✅ Quote query result:", quote);
  } catch (error: unknown) {
    console.log("⚠️ Quote query failed:", error instanceof Error ? error.message : String(error));
  }

  console.log('🔍 Testing contract interaction...');
  try {
    // Teste simples de query para verificar se o contrato responde
    const testQuery = await client.query({
      strategy: { denom: "btc-btc", amount: "100000" },
    });
    console.log("✅ Contract is responding! Test query result:", testQuery);
  } catch (error: unknown) {
    console.log("❌ Contract interaction failed:", error instanceof Error ? error.message : String(error));
  }

  console.log('🎉 Playground completed successfully!');
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
    console.error('   - Try a different RPC endpoint (e.g., https://rpc-testnet.cosmos.network)');
    console.error('   - The endpoint might be down or blocked');
  }
  
  process.exit(1);
});