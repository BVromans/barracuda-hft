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

  console.log('📋 Querying contract config...');
  const config = await client.query<any>({ config: {} });
  console.log("✅ Contract configuration:", config);

  console.log('📝 Preparing order message...');
  const executeMsg: ExecuteMsg = {
    order: [
      [
        [
          "base", // side
          { fixed: "100000" }, // price
          "1000000", // amount
        ],
      ],
      null, // callback
    ],
  };

  console.log('💸 Executing order transaction...');
  const result = await client.execute(executeMsg, [
    { denom: "btc-btc", amount: "1000000" },
  ]);
  console.log("✅ Transaction result:", result);

  console.log('📚 Querying order book...');
  const book = await client.query<Response>({
    book: { limit: 10, offset: 0 },
  });
  console.log("✅ Order book:", book);

  console.log('🧮 Simulating swap...');
  const simulate = await client.query({
    simulate: { denom: "btc-btc", amount: "1000000" },
  });
  console.log("✅ Simulation:", simulate);
  
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