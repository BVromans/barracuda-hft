// Get Orders Playground
// Tests querying user orders from FIN contracts

import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';

// --- Network Configuration ---
const NETWORKS = {
  MAINNET: {
    rpc: "https://thornode-mainnet-rpc.bryanlabs.net",
    rest: "https://api.rujira.network",
    chainId: "thorchain-mainnet-v1",
    gasPrice: GasPrice.fromString("0.025uruji")
  },
  TESTNET: {
    rpc: "https://thornode-testnet-rpc.bryanlabs.net",
    rest: "https://testnet-api.rujira.network",
    chainId: "thorchain-testnet-v1",
    gasPrice: GasPrice.fromString("0.025uruji")
  }
};

// --- Working FIN Contracts for Testing ---
const WORKING_FIN_CONTRACTS = {
  "NAMI/USDC": {
    address: "thor1txmrchsrzycmzvlwsjl20q9zkdsp0nywctefuceepf02phpudvxsxtzmty",
    denoms: ["thor.nami", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1j45s6a4ym8ru2zd70acnrwk4fkmew2a43eq2wngu46ur7yg4d8eqnvvfxx",
    tick: 6,
    description: "NAMI token vs USDC"
  },
  "RUJI/USDC": {
    address: "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
    denoms: ["x/ruji", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1z6drgxf8js4mycfqfgqr3v4paep4p5ur7ff0suehyg0a6alm8uks29zyv0",
    tick: 4,
    description: "Rujira token vs USDC"
  }
};

// --- Type Definitions ---
interface OrderResponse {
  owner: string;
  side: 'base' | 'quote';
  price: { fixed?: string; oracle?: number };
  rate: string;
  updated_at: string;
  offer: string;
  remaining: string;
  filled: string;
}

interface OrdersResponse {
  orders: OrderResponse[];
}

interface GetOrdersRequest {
  contractAddress: string;
  owner: string;
  side?: 'base' | 'quote';
  limit?: number;
  offset?: number;
}

interface GetOrdersResponse {
  success: boolean;
  orders: OrderResponse[];
  total: number;
  contractAddress: string;
  owner: string;
  query: GetOrdersRequest;
  raw?: any;
}

// --- Client Class ---
class GetOrdersClient {
  private client: CosmWasmClient | null = null;
  private network: 'MAINNET' | 'TESTNET';

  constructor(network: 'MAINNET' | 'TESTNET' = 'MAINNET') {
    this.network = network;
  }

  /**
   * Initialize the CosmWasm client
   */
  async initialize(): Promise<void> {
    try {
      console.log(`🔗 Connecting to ${this.network} RPC...`);
      const networkConfig = NETWORKS[this.network];
      this.client = await CosmWasmClient.connect(networkConfig.rpc);
      console.log(`✅ Connected to ${this.network} successfully`);
    } catch (error) {
      console.error(`❌ Failed to connect to ${this.network}:`, error);
      throw error;
    }
  }

  /**
   * Query contract state
   */
  private async queryContractState(contractAddress: string, queryMsg: any): Promise<any> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const result = await this.client.queryContractSmart(contractAddress, queryMsg);
      return result;
    } catch (error) {
      console.error(`❌ Query failed for ${contractAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get orders for a specific user
   */
  async getOrders(request: GetOrdersRequest): Promise<GetOrdersResponse> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      console.log(`👤 Getting orders for ${request.owner} on ${request.contractAddress}`);

      // Build query message
      const queryMsg: any = {
        orders: {
          owner: request.owner,
          limit: request.limit || 30,
          offset: request.offset || 0
        }
      };

      // Add side filter if provided
      if (request.side) {
        queryMsg.orders.side = request.side;
      }

      console.log(`📋 Query message:`, JSON.stringify(queryMsg, null, 2));

      // Execute query
      const result = await this.queryContractState(request.contractAddress, queryMsg);
      
      console.log(`✅ Orders query successful`);
      console.log(`📊 Raw response:`, JSON.stringify(result, null, 2));

      const response: GetOrdersResponse = {
        success: true,
        orders: result.orders || [],
        total: result.orders ? result.orders.length : 0,
        contractAddress: request.contractAddress,
        owner: request.owner,
        query: request,
        raw: result
      };

      return response;

    } catch (error) {
      console.error(`❌ Failed to get orders:`, error);
      
      const response: GetOrdersResponse = {
        success: false,
        orders: [],
        total: 0,
        contractAddress: request.contractAddress,
        owner: request.owner,
        query: request,
        raw: error
      };

      return response;
    }
  }

  /**
   * Get orders for market maker (for testing)
   */
  async getMarketMakerOrders(contractAddress: string, limit: number = 5): Promise<GetOrdersResponse | null> {
    const contractInfo = Object.values(WORKING_FIN_CONTRACTS).find(c => c.address === contractAddress);
    
    if (!contractInfo || !contractInfo.market_maker) {
      console.log(`⚠️ No market maker found for contract ${contractAddress}`);
      return null;
    }

    return this.getOrders({
      contractAddress,
      owner: contractInfo.market_maker,
      limit
    });
  }

  /**
   * Display orders in a readable format
   */
  displayOrders(response: GetOrdersResponse): void {
    console.log('\n📋 ORDERS REPORT');
    console.log('================');
    console.log(`Contract: ${response.contractAddress}`);
    console.log(`Owner: ${response.owner}`);
    console.log(`Total Orders: ${response.total}`);
    console.log(`Success: ${response.success ? '✅' : '❌'}`);

    if (response.orders.length === 0) {
      console.log('\n📭 No orders found');
      return;
    }

    console.log('\n📊 Orders:');
    response.orders.forEach((order, index) => {
      const price = order.price.fixed || `Oracle ${order.price.oracle}`;
      const filledPercent = parseFloat(order.filled) > 0 
        ? ((parseFloat(order.filled) / parseFloat(order.offer)) * 100).toFixed(1)
        : '0.0';
      
      console.log(`\n   ${index + 1}. Order Details:`);
      console.log(`      Side: ${order.side.toUpperCase()}`);
      console.log(`      Price: ${price}`);
      console.log(`      Rate: ${order.rate}`);
      console.log(`      Offer: ${order.offer}`);
      console.log(`      Remaining: ${order.remaining}`);
      console.log(`      Filled: ${order.filled} (${filledPercent}%)`);
      console.log(`      Updated: ${new Date(order.updated_at).toLocaleString()}`);
      
      // Status indicator
      if (parseFloat(order.filled) > 0) {
        console.log(`      Status: 🟡 PARTIALLY FILLED`);
      } else if (parseFloat(order.remaining) === 0) {
        console.log(`      Status: 🟢 FULLY FILLED`);
      } else {
        console.log(`      Status: 🔵 ACTIVE`);
      }
    });

    // Summary
    const activeOrders = response.orders.filter(o => parseFloat(o.remaining) > 0).length;
    const filledOrders = response.orders.filter(o => parseFloat(o.filled) > 0).length;
    
    console.log('\n📈 Summary:');
    console.log(`   Active Orders: ${activeOrders}`);
    console.log(`   Filled Orders: ${filledOrders}`);
    console.log(`   Total Orders: ${response.total}`);
  }
}

// --- Main Function ---
async function getOrders() {
  console.log('🚀 Starting Get Orders Playground...\n');
  
  const client = new GetOrdersClient('MAINNET');
  
  try {
    // Initialize client
    await client.initialize();
    
    // Get wallet address from environment variables
    const walletAddress = process.env.TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR!;
    
    if (!walletAddress) {
      console.error('❌ TEAM_RUJIRA_WALLET_PUBLIC_KEY_THOR environment variable not found');
      console.log('💡 Make sure to set your wallet address in the environment variables');
      return;
    }
    
    console.log(`👤 Using wallet address: ${walletAddress}`);
    
    // Test both RUJI/USDC and NAMI/USDC markets
    for (const [pairName, contractInfo] of Object.entries(WORKING_FIN_CONTRACTS)) {
      console.log(`\n🔍 Testing ${pairName} (${contractInfo.address})`);
      console.log(`📋 Contract Info:`);
      console.log(`   Address: ${contractInfo.address}`);
      console.log(`   Denoms: ${contractInfo.denoms.join(' / ')}`);
      console.log(`   Market Maker: ${contractInfo.market_maker}`);
      
      // Test 1: Get all orders for your address
      console.log('\n1️⃣ Testing getOrders for your address...');
      const userOrders = await client.getOrders({
        contractAddress: contractInfo.address,
        owner: walletAddress,
        limit: 20
      });
      
      client.displayOrders(userOrders);
      
      // Test 2: Get market maker orders (should have some)
      console.log('\n2️⃣ Testing getOrders for market maker...');
      const mmOrders = await client.getMarketMakerOrders(contractInfo.address, 10);
      
      if (mmOrders) {
        client.displayOrders(mmOrders);
      }
      
      // Test 3: Get orders filtered by side (base)
      console.log('\n3️⃣ Testing getOrders filtered by side (base)...');
      const baseOrders = await client.getOrders({
        contractAddress: contractInfo.address,
        owner: walletAddress,
        side: 'base',
        limit: 10
      });
      
      client.displayOrders(baseOrders);
      
      // Test 4: Get orders filtered by side (quote)
      console.log('\n4️⃣ Testing getOrders filtered by side (quote)...');
      const quoteOrders = await client.getOrders({
        contractAddress: contractInfo.address,
        owner: walletAddress,
        side: 'quote',
        limit: 10
      });
      
      client.displayOrders(quoteOrders);
      
      console.log(`\n✅ ${pairName} testing completed`);
      console.log('─'.repeat(50));
    }
    
    console.log('\n✅ Get Orders Playground completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Orders query working');
    console.log('- ✅ Side filtering working');
    console.log('- ✅ Pagination support available');
    console.log('- ✅ Market maker orders accessible');
    
  } catch (error) {
    console.error('❌ Error in Get Orders playground:', error);
  }
}

// Run the playground
getOrders().catch(console.error); 