// Rujira FIN Protocol Client - Private Methods
// Implementation of private endpoints like balance retrieval

import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import Decimal from 'decimal.js';

// --- Type Definitions ---
interface Balance {
  asset: string;
  amount: string;
  chain?: string;
  decimals?: number;
}

interface OrderBalance {
  asset: string;
  amount: string;
  side: 'base' | 'quote';
  price: string;
  filled: string;
  remaining: string;
  contractAddress: string;
  pairName: string;
}

interface ComprehensiveBalance {
  address: string;
  freeBalances: Balance[];
  lockedInOrders: OrderBalance[];
  waitingForWithdrawal: OrderBalance[];
  totalUsdValue?: number;
  summary: {
    totalFree: Record<string, string>;
    totalLocked: Record<string, string>;
    totalWithdrawable: Record<string, string>;
  };
}

interface FinOrder {
  owner: string;
  side: 'base' | 'quote';
  price: { fixed?: string; oracle?: number };
  amount: string;
  filled: string;
  remaining: string;
  offer: string;
  updated_at: string;
}

interface FinOrdersResponse {
  orders: FinOrder[];
  total: number;
}

// --- Network Configuration ---
const NETWORK_CONFIG = {
  rpc: 'https://thornode-mainnet-rpc.bryanlabs.net',
  rest: 'https://thornode.ninerealms.com',
  chainId: 'thorchain-mainnet-v1',
  gasPrice: GasPrice.fromString('0.025urune')
};

// --- Working FIN Contracts ---
const WORKING_FIN_CONTRACTS = {
  "RUJI/USDC": {
    address: "thor17cawwg2lsnvcne69fek6nsqkf8snma6gc5ccceshul86rl0u3q4s5l5d0a",
    denoms: ["x/ruji", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1z6drgxf8js4mycfqfgqr3v4paep4p5ur7ff0suehyg0a6alm8uks29zyv0",
    tick: 4,
    description: "Rujira token vs USDC"
  },
  "LQDY/USDC": {
    address: "thor1ax94w4rldvdgc4xgsfwgve7g7xfyxhvuvquvx57vtmr6y4alev0qw3mlvr",
    denoms: ["thor.lqdy", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1c020ygq35hu6fp2hpd3ws0fa9xmlqhpw9g4nz624wnwmvlq7l49s877kkx",
    tick: 6,
    description: "Liquid staking derivative vs USDC"
  },
  "NAMI/USDC": {
    address: "thor1txmrchsrzycmzvlwsjl20q9zkdsp0nywctefuceepf02phpudvxsxtzmty",
    denoms: ["thor.nami", "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
    market_maker: "thor1j45s6a4ym8ru2zd70acnrwk4fkmew2a43eq2wngu46ur7yg4d8eqnvvfxx",
    tick: 6,
    description: "NAMI token vs USDC"
  },
};

export class PrivateMethodsClient {
  private baseUrl: string;
  private client: CosmWasmClient | null = null;

  constructor(baseUrl: string = 'https://thornode.ninerealms.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize the CosmWasm client
   */
  private async initializeClient(): Promise<void> {
    if (!this.client) {
      console.log('🔗 Initializing CosmWasm client...');
      this.client = await CosmWasmClient.connect(NETWORK_CONFIG.rpc);
      console.log('✅ CosmWasm client ready');
    }
  }

  /**
   * Get comprehensive balance information including free balances, locked orders, and withdrawable amounts
   */
  async getComprehensiveBalances(thorchainAddress: string): Promise<ComprehensiveBalance> {
    console.log('💰 Getting comprehensive balances for:', thorchainAddress);
    
    await this.initializeClient();
    
    const result: ComprehensiveBalance = {
      address: thorchainAddress,
      freeBalances: [],
      lockedInOrders: [],
      waitingForWithdrawal: [],
      summary: {
        totalFree: {},
        totalLocked: {},
        totalWithdrawable: {}
      }
    };

    try {
      // 1. Get free balances (available for trading)
      console.log('📊 Getting free balances...');
      result.freeBalances = await this.getFreeBalances(thorchainAddress);
      
      // 2. Get balances locked in orders across all FIN contracts
      console.log('🔒 Getting balances locked in orders...');
      result.lockedInOrders = await this.getBalancesLockedInOrders(thorchainAddress);
      
      // 3. Get balances waiting for withdrawal
      console.log('⏳ Getting balances waiting for withdrawal...');
      result.waitingForWithdrawal = await this.getBalancesWaitingForWithdrawal(thorchainAddress);
      
      // 4. Calculate summary totals
      result.summary = this.calculateBalanceSummary(result);
      
      console.log('✅ Comprehensive balance retrieval completed');
      return result;
      
    } catch (error) {
      console.error('❌ Error getting comprehensive balances:', error);
      throw error;
    }
  }

  /**
   * Get free balances (available for trading)
   */
  private async getFreeBalances(address: string): Promise<Balance[]> {
    const balances: Balance[] = [];
    
    try {
      // Query bank module for all balances
      const response = await fetch(`${this.baseUrl}/cosmos/bank/v1beta1/balances/${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as any;
      
      if (data.balances && Array.isArray(data.balances)) {
        for (const balance of data.balances) {
          // Filter out zero balances and add metadata
          if (balance.amount !== '0') {
            const assetInfo = this.getAssetInfo(balance.denom);
            balances.push({
              asset: balance.denom,
              amount: balance.amount,
              chain: assetInfo.chain,
              decimals: assetInfo.decimals
            });
          }
        }
      }
      
      console.log(`📊 Found ${balances.length} free balances`);
      return balances;
      
    } catch (error) {
      console.error('❌ Error getting free balances:', error);
      return [];
    }
  }

  /**
   * Get balances locked in active orders across all FIN contracts
   */
  private async getBalancesLockedInOrders(address: string): Promise<OrderBalance[]> {
    const lockedBalances: OrderBalance[] = [];
    
    try {
      for (const [pairName, contractInfo] of Object.entries(WORKING_FIN_CONTRACTS)) {
        console.log(`🔍 Checking orders in ${pairName}...`);
        
        const orders = await this.getUserOrders(contractInfo.address, address);
        
        if (orders && orders.orders) {
          for (const order of orders.orders) {
            // Only include orders with remaining amounts (not fully filled)
            if (order.remaining !== '0') {
              const assetInfo = this.getAssetInfo(order.side === 'base' ? contractInfo.denoms[0] : contractInfo.denoms[1]);
              
              lockedBalances.push({
                asset: order.side === 'base' ? contractInfo.denoms[0] : contractInfo.denoms[1],
                amount: order.remaining,
                side: order.side,
                price: order.price.fixed || `Oracle ${order.price.oracle}`,
                filled: order.filled,
                remaining: order.remaining,
                contractAddress: contractInfo.address,
                pairName: pairName
              });
            }
          }
        }
      }
      
      console.log(`🔒 Found ${lockedBalances.length} locked balances in orders`);
      return lockedBalances;
      
    } catch (error) {
      console.error('❌ Error getting locked balances:', error);
      return [];
    }
  }

  /**
   * Get balances waiting for withdrawal (filled orders)
   */
  private async getBalancesWaitingForWithdrawal(address: string): Promise<OrderBalance[]> {
    const withdrawableBalances: OrderBalance[] = [];
    
    try {
      for (const [pairName, contractInfo] of Object.entries(WORKING_FIN_CONTRACTS)) {
        console.log(`🔍 Checking withdrawable amounts in ${pairName}...`);
        
        const orders = await this.getUserOrders(contractInfo.address, address);
        
        if (orders && orders.orders) {
          for (const order of orders.orders) {
            // Only include orders with filled amounts (ready for withdrawal)
            if (order.filled !== '0') {
              const assetInfo = this.getAssetInfo(order.side === 'base' ? contractInfo.denoms[1] : contractInfo.denoms[0]);
              
              withdrawableBalances.push({
                asset: order.side === 'base' ? contractInfo.denoms[1] : contractInfo.denoms[0], // Opposite asset
                amount: order.filled,
                side: order.side === 'base' ? 'quote' : 'base', // Opposite side
                price: order.price.fixed || `Oracle ${order.price.oracle}`,
                filled: order.filled,
                remaining: order.remaining,
                contractAddress: contractInfo.address,
                pairName: pairName
              });
            }
          }
        }
      }
      
      console.log(`⏳ Found ${withdrawableBalances.length} withdrawable balances`);
      return withdrawableBalances;
      
    } catch (error) {
      console.error('❌ Error getting withdrawable balances:', error);
      return [];
    }
  }

  /**
   * Query user orders from a FIN contract
   */
  private async getUserOrders(contractAddress: string, owner: string): Promise<FinOrdersResponse | null> {
    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      const queryMsg = {
        orders: {
          owner: owner,
          limit: 30
        }
      };

      const result = await this.client.queryContractSmart(contractAddress, queryMsg);
      return result as FinOrdersResponse;
      
    } catch (error) {
      console.log(`⚠️ Error querying orders for ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Calculate summary totals for all balance types
   */
  private calculateBalanceSummary(balances: ComprehensiveBalance): {
    totalFree: Record<string, string>;
    totalLocked: Record<string, string>;
    totalWithdrawable: Record<string, string>;
  } {
    const summary = {
      totalFree: {} as Record<string, string>,
      totalLocked: {} as Record<string, string>,
      totalWithdrawable: {} as Record<string, string>
    };

    // Sum free balances
    for (const balance of balances.freeBalances) {
      const current = summary.totalFree[balance.asset] || '0';
      summary.totalFree[balance.asset] = new Decimal(current).plus(balance.amount).toString();
    }

    // Sum locked balances
    for (const balance of balances.lockedInOrders) {
      const current = summary.totalLocked[balance.asset] || '0';
      summary.totalLocked[balance.asset] = new Decimal(current).plus(balance.amount).toString();
    }

    // Sum withdrawable balances
    for (const balance of balances.waitingForWithdrawal) {
      const current = summary.totalWithdrawable[balance.asset] || '0';
      summary.totalWithdrawable[balance.asset] = new Decimal(current).plus(balance.amount).toString();
    }

    return summary;
  }

  /**
   * Get asset information and metadata
   */
  private getAssetInfo(denom: string): { chain: string; decimals: number; symbol: string } {
    const assetMap: Record<string, { chain: string; decimals: number; symbol: string }> = {
      'x/ruji': { chain: 'THOR', decimals: 8, symbol: 'RUJI' },
      'thor.lqdy': { chain: 'THOR', decimals: 8, symbol: 'LQDY' },
      'eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { chain: 'ETH', decimals: 6, symbol: 'USDC' },
      'rune': { chain: 'THOR', decimals: 8, symbol: 'RUNE' },
      'urune': { chain: 'THOR', decimals: 8, symbol: 'RUNE' },
      'uruji': { chain: 'THOR', decimals: 8, symbol: 'RUJI' }
    };

    return assetMap[denom] || { chain: 'UNKNOWN', decimals: 8, symbol: denom };
  }

  /**
   * Format amount from base units to human readable
   */
  private formatAmount(amount: string, decimals: number = 8): string {
    const num = parseFloat(amount) / Math.pow(10, decimals);
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 8 
    });
  }

  /**
   * Display comprehensive balance information in a readable format
   */
  displayComprehensiveBalances(balances: ComprehensiveBalance): void {
    console.log('\n💰 COMPREHENSIVE BALANCE REPORT');
    console.log('================================');
    console.log(`Address: ${balances.address}`);
    
    // Free Balances
    console.log('\n📊 FREE BALANCES (Available for trading):');
    if (balances.freeBalances.length === 0) {
      console.log('   No free balances found');
    } else {
      for (const balance of balances.freeBalances) {
        const formatted = this.formatAmount(balance.amount, balance.decimals || 8);
        console.log(`   ${balance.asset}: ${formatted} (${balance.chain})`);
      }
    }

    // Locked in Orders
    console.log('\n🔒 LOCKED IN ORDERS:');
    if (balances.lockedInOrders.length === 0) {
      console.log('   No balances locked in orders');
    } else {
      for (const balance of balances.lockedInOrders) {
        const formatted = this.formatAmount(balance.amount, 8);
        const price = balance.price;
        console.log(`   ${balance.asset}: ${formatted} locked in ${balance.pairName} @ ${price}`);
      }
    }

    // Waiting for Withdrawal
    console.log('\n⏳ WAITING FOR WITHDRAWAL:');
    if (balances.waitingForWithdrawal.length === 0) {
      console.log('   No balances waiting for withdrawal');
    } else {
      for (const balance of balances.waitingForWithdrawal) {
        const formatted = this.formatAmount(balance.amount, 8);
        console.log(`   ${balance.asset}: ${formatted} from ${balance.pairName} @ ${balance.price}`);
      }
    }

    // Summary
    console.log('\n📈 SUMMARY TOTALS:');
    console.log('   Free Balances:');
    for (const [asset, amount] of Object.entries(balances.summary.totalFree)) {
      const formatted = this.formatAmount(amount, 8);
      console.log(`     ${asset}: ${formatted}`);
    }
    
    console.log('   Locked in Orders:');
    for (const [asset, amount] of Object.entries(balances.summary.totalLocked)) {
      const formatted = this.formatAmount(amount, 8);
      console.log(`     ${asset}: ${formatted}`);
    }
    
    console.log('   Withdrawable:');
    for (const [asset, amount] of Object.entries(balances.summary.totalWithdrawable)) {
      const formatted = this.formatAmount(amount, 8);
      console.log(`     ${asset}: ${formatted}`);
    }
  }

  // Legacy methods for backward compatibility
  async getAllBalances(thorchainAddress: string): Promise<any> {
    const comprehensive = await this.getComprehensiveBalances(thorchainAddress);
    return {
      address: comprehensive.address,
      balances: comprehensive.freeBalances,
      balanceCount: comprehensive.freeBalances.length,
      totalUsdValue: comprehensive.totalUsdValue
    };
  }

  async getBalance(thorchainAddress: string, asset: string): Promise<Balance | null> {
    const comprehensive = await this.getComprehensiveBalances(thorchainAddress);
    return comprehensive.freeBalances.find(b => b.asset === asset) || null;
  }
}

// Example usage
async function example() {
  const client = new PrivateMethodsClient();
  
  console.log('🚀 Testing comprehensive balance retrieval...');
  
  const address = 'thor1gsgx5xtw82r8qw06mrcxjzypuynqwjxcugk5fy';
  
  try {
    const comprehensiveBalances = await client.getComprehensiveBalances(address);
    
    // Display the results
    client.displayComprehensiveBalances(comprehensiveBalances);
    
    console.log('\n✅ Comprehensive balance retrieval completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in example:', error);
  }
}

// Run the example
example().catch(console.error);
