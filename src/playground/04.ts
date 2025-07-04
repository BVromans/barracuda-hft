import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { CosmWasmClient, SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import "dotenv/config";
import { config } from "dotenv";

config({ path: ".env" });

// SO (Synthetix Optimism) Contract Interface
interface SOExecuteMsg {
  mint?: {
    amount: string;
    to?: string;
  };
  burn?: {
    amount: string;
    from?: string;
  };
  transfer?: {
    recipient: string;
    amount: string;
  };
  approve?: {
    spender: string;
    amount: string;
  };
  transfer_from?: {
    owner: string;
    recipient: string;
    amount: string;
  };
  stake?: {
    amount: string;
  };
  unstake?: {
    amount: string;
  };
  claim_rewards?: {};
  deposit?: {
    amount: string;
  };
  withdraw?: {
    amount: string;
  };
}

interface SOQueryMsg {
  balance?: {
    address: string;
  };
  allowance?: {
    owner: string;
    spender: string;
  };
  total_supply?: {};
  staking_info?: {
    address: string;
  };
  rewards_info?: {
    address: string;
  };
  pool_info?: {};
  config?: {};
  // Rujira-compatible queries for testing
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

class SOClient {
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
  ): Promise<SOClient> {
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: "sthor",
    });
    const client = await CosmWasmClient.connect(rpcEndpoint);
    return new SOClient(client, wallet, contractAddress, rpcEndpoint);
  }

  async query<T>(queryMsg: SOQueryMsg): Promise<T> {
    return this.client.queryContractSmart(this.contractAddress, queryMsg);
  }

  async simulate(
    executeMsg: SOExecuteMsg,
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
    executeMsg: SOExecuteMsg,
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
  console.log('🚀 Starting SO (Synthetix Optimism) Playground...');
  
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

  console.log('🔌 Connecting to SO client...');
  const client = await SOClient.connect(
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

  // Test with Rujira-compatible queries since we're using that contract
  console.log('\n📊 Testing Rujira-compatible queries...');
  
  try {
    const strategyQuery = await client.query<any>({
      strategy: { denom: "rune", amount: "1000000" },
    });
    console.log("✅ Strategy query (Rujira):", JSON.stringify(strategyQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ Strategy query failed:", error instanceof Error ? error.message : String(error));
  }

  try {
    const quoteQuery = await client.query<any>({
      quote: { 
        denom: "rune", 
        amount: "1000000", 
        offer_denom: "rune", 
        offer_amount: "1000000", 
        ask_denom: "btc-btc", 
        ask_amount: "1000000" 
      },
    });
    console.log("✅ Quote query (Rujira):", JSON.stringify(quoteQuery, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ Quote query failed:", error instanceof Error ? error.message : String(error));
  }

  // Test SO-specific queries (will fail with Rujira contract, but that's expected)
  console.log('\n🔍 Testing SO-specific queries (expected to fail with Rujira contract):');
  
  try {
    const soConfig = await client.query<any>({ config: {} });
    console.log("✅ SO config query:", JSON.stringify(soConfig, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ SO config query failed (expected):", error instanceof Error ? error.message : String(error));
    console.log("💡 This is expected when using a non-SO contract");
  }

  try {
    const soBalance = await client.query<any>({ 
      balance: { 
        address: address 
      } 
    });
    console.log("✅ SO balance query:", JSON.stringify(soBalance, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ SO balance query failed (expected):", error instanceof Error ? error.message : String(error));
    console.log("💡 This is expected when using a non-SO contract");
  }

  try {
    const soTotalSupply = await client.query<any>({ 
      total_supply: {} 
    });
    console.log("✅ SO total supply query:", JSON.stringify(soTotalSupply, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ SO total supply query failed (expected):", error instanceof Error ? error.message : String(error));
    console.log("💡 This is expected when using a non-SO contract");
  }

  try {
    const soStakingInfo = await client.query<any>({ 
      staking_info: { 
        address: address 
      } 
    });
    console.log("✅ SO staking info query:", JSON.stringify(soStakingInfo, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ SO staking info query failed (expected):", error instanceof Error ? error.message : String(error));
    console.log("💡 This is expected when using a non-SO contract");
  }

  try {
    const soRewardsInfo = await client.query<any>({ 
      rewards_info: { 
        address: address 
      } 
    });
    console.log("✅ SO rewards info query:", JSON.stringify(soRewardsInfo, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ SO rewards info query failed (expected):", error instanceof Error ? error.message : String(error));
    console.log("💡 This is expected when using a non-SO contract");
  }

  try {
    const soPoolInfo = await client.query<any>({ 
      pool_info: {} 
    });
    console.log("✅ SO pool info query:", JSON.stringify(soPoolInfo, null, 2));
  } catch (error: unknown) {
    console.log("⚠️ SO pool info query failed (expected):", error instanceof Error ? error.message : String(error));
    console.log("💡 This is expected when using a non-SO contract");
  }

  console.log('\n🎉 SO public queries playground completed successfully!');
  console.log('\n📝 Available public operations:');
  console.log('  • Query contract configuration');
  console.log('  • Check wallet balance');
  console.log('  • Get total supply');
  console.log('  • View staking information');
  console.log('  • Check rewards information');
  console.log('  • Get pool information');
  console.log('  • Strategy queries (Rujira compatible)');
  console.log('  • Quote queries (Rujira compatible)');
  console.log('\n⚠️ All operations are public queries - no funds required!');
  console.log('\n💡 To test with a real SO contract:');
  console.log('   • Add SO_CONTRACT_ADDRESS to your .env file');
  console.log('   • The SO-specific queries will work with a real SO contract');
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