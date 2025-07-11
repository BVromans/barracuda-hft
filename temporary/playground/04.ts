import { Logger } from '../../src/utils/logger'

class SwapTransactionAnalyzer {
  private logger: Logger;
  private thorchainEndpoints: string[];

  constructor() {
    this.logger = new Logger('playground04');
    this.thorchainEndpoints = [
      'https://thornode.ninerealms.com',
      'https://rpc.thorchain.info',
      'https://rpc-testnet.thorchain.info'
    ];
  }

  async analyzeSwapTransaction(hash: string): Promise<void> {
    console.log(`🚀 Analyzing Swap Transaction Hash: ${hash}`);
    console.log('=' .repeat(80));
    
    this.logger.log('swap_analysis_started', {
      transactionHash: hash,
      endpoints: this.thorchainEndpoints
    });
    
    // Get transaction data
    const transactionData = await this.getTransactionFromEndpoints(hash);
    
    if (transactionData) {
      this.displaySwapAnalysis(transactionData);
    } else {
      console.log('❌ Transaction not found');
    }
  }

  private async getTransactionFromEndpoints(hash: string): Promise<any> {
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${endpoint}/cosmos/tx/v1beta1/txs/${hash}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Swap-Analyzer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Transaction found via ${endpoint}`);
          this.logger.log('swap_transaction_retrieved', {
            transactionHash: hash,
            endpoint: endpoint,
            transactionData: data
          });
          return data;
        } else {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          this.logger.log('swap_transaction_failed', {
            transactionHash: hash,
            endpoint: endpoint,
            status: response.status,
            statusText: response.statusText
          });
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Timeout for ${endpoint}`);
        } else {
          console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return null;
  }

  private displaySwapAnalysis(data: any): void {
    const tx = data.tx_response;
    if (!tx) {
      console.log('❌ No transaction data in response');
      return;
    }

    console.log('\n📊 SWAP TRANSACTION ANALYSIS');
    console.log('=' .repeat(60));
    
    // Basic transaction info
    console.log(`🔗 Transaction Hash: ${tx.txhash}`);
    console.log(`📊 Block Height: ${tx.height}`);
    console.log(`✅ Success: ${tx.code === 0 ? 'Yes' : 'No'}`);
    console.log(`📅 Timestamp: ${tx.timestamp}`);
    
    // Extract swap-specific information
    this.extractSwapDetails(tx);
    
    // Extract fees
    this.extractSwapFees(tx);
    
    // Extract amounts and rates
    this.extractSwapAmounts(tx);
    
    // Extract memo information
    this.extractMemoInfo(tx);
    
    // Show events summary
    this.showEventsSummary(tx);
  }

  private extractSwapDetails(tx: any): void {
    console.log('\n💱 SWAP DETAILS:');
    console.log('=' .repeat(30));
    
    // Try to identify swap type from memo
    if (tx.tx?.body?.messages) {
      tx.tx.body.messages.forEach((msg: any, index: number) => {
        if (msg.memo) {
          console.log(`📝 Memo: ${msg.memo}`);
          this.parseSwapMemo(msg.memo);
        }
      });
    }
    
    // Look for swap events
    if (tx.events) {
      tx.events.forEach((event: any) => {
        if (event.type === 'swap') {
          console.log('🔄 Swap Event Detected');
          event.attributes?.forEach((attr: any) => {
            console.log(`  ${attr.key}: ${attr.value}`);
          });
        }
      });
    }
  }

  private parseSwapMemo(memo: string): void {
    // Parse Thorchain swap memo format
    // Example: =:BASE~ETH:thor14mh37ua4vkyur0l5ra297a4la6tmf95mt96a55:2477927
    
    if (memo.startsWith('=:')) {
      const parts = memo.split(':');
      if (parts.length >= 4) {
        const assetPair = parts[1]; // BASE~ETH
        const address = parts[2]; // thor14mh37ua4vkyur0l5ra297a4la6tmf95mt96a55
        const limit = parts[3]; // 2477927
        
        console.log(`  📊 Asset Pair: ${assetPair}`);
        console.log(`  👤 Address: ${address}`);
        console.log(`  🎯 Limit: ${limit}`);
        
        // Parse asset pair
        const [fromAsset, toAsset] = assetPair.split('~');
        console.log(`  ➡️ From: ${fromAsset}`);
        console.log(`  ⬅️ To: ${toAsset}`);
      }
    }
  }

  private extractSwapFees(tx: any): void {
    console.log('\n💰 SWAP FEES:');
    console.log('=' .repeat(30));
    
    // Calculate gas fee
    if (tx.gas_used && tx.gas_used > 0) {
      const gasFee = (tx.gas_used * 2) / 100000000; // 2 RUNE per gas unit
      console.log(`⛽ Gas Fee: ${gasFee.toFixed(8)} RUNE`);
    }
    
    // Look for liquidity fees in events
    let liquidityFee = 0;
    if (tx.events) {
      tx.events.forEach((event: any) => {
        if (event.type === 'coin_spent') {
          event.attributes?.forEach((attr: any) => {
            if (attr.key === 'amount' && attr.value && attr.value.includes('rune')) {
              const runeAmount = parseInt(attr.value.replace('rune', ''));
              if (runeAmount < 10000000) { // Small amounts likely fees
                const fee = runeAmount / 100000000;
                if (fee > liquidityFee) {
                  liquidityFee = fee;
                }
              }
            }
          });
        }
      });
    }
    
    if (liquidityFee > 0) {
      console.log(`💧 Liquidity Fee: ${liquidityFee.toFixed(8)} RUNE`);
      
      // Estimate USD value (approximate RUNE price)
      const runePriceUSD = 1.25; // Approximate RUNE price
      const usdValue = liquidityFee * runePriceUSD;
      console.log(`💵 Liquidity Fee (USD): $${usdValue.toFixed(2)}`);
    }
    
    // Look for fee events specifically
    if (tx.events) {
      tx.events.forEach((event: any) => {
        if (event.type === 'fee') {
          console.log('💰 Fee Event Detected:');
          event.attributes?.forEach((attr: any) => {
            console.log(`  ${attr.key}: ${attr.value}`);
          });
        }
      });
    }
  }

  private extractSwapAmounts(tx: any): void {
    console.log('\n📈 SWAP AMOUNTS:');
    console.log('=' .repeat(30));
    
    let inputAmount = 0;
    let outputAmount = 0;
    let inputAsset = '';
    let outputAsset = '';
    let baseAmount = 0;
    let ethAmount = 0;
    
    // Parse memo for limit amount
    if (tx.tx?.body?.messages) {
      tx.tx.body.messages.forEach((msg: any) => {
        if (msg.memo && msg.memo.includes('BASE~ETH')) {
          const parts = msg.memo.split(':');
          if (parts.length >= 4) {
            const limit = parseInt(parts[3]);
            if (limit) {
              baseAmount = limit / 1000000; // BASE has 6 decimals
              console.log(`🎯 Limit Amount: ${baseAmount.toFixed(6)} BASE`);
            }
          }
        }
      });
    }
    
    if (tx.events) {
      tx.events.forEach((event: any) => {
        if (event.type === 'coin_spent') {
          event.attributes?.forEach((attr: any) => {
            if (attr.key === 'amount') {
              const amount = this.parseAmount(attr.value);
              if (amount.value > inputAmount) {
                inputAmount = amount.value;
                inputAsset = amount.asset;
              }
            }
          });
        }
        
        if (event.type === 'coin_received') {
          event.attributes?.forEach((attr: any) => {
            if (attr.key === 'amount') {
              const amount = this.parseAmount(attr.value);
              if (amount.value > outputAmount) {
                outputAmount = amount.value;
                outputAsset = amount.asset;
              }
            }
          });
        }
        
        // Look for specific asset transfers
        if (event.type === 'transfer') {
          event.attributes?.forEach((attr: any) => {
            if (attr.key === 'amount' && attr.value.includes('base')) {
              const amount = parseInt(attr.value.replace('base', '')) / 1000000;
              if (amount > 0) {
                console.log(`📤 BASE Amount: ${amount.toFixed(6)} BASE`);
              }
            }
            if (attr.key === 'amount' && attr.value.includes('eth')) {
              const amount = parseInt(attr.value.replace('eth', '')) / 1000000000000000000;
              if (amount > 0) {
                console.log(`📥 ETH Amount: ${amount.toFixed(18)} ETH`);
                ethAmount = amount;
              }
            }
          });
        }
      });
    }
    
    if (inputAmount > 0) {
      console.log(`📤 Input: ${inputAmount.toFixed(8)} ${inputAsset}`);
    }
    
    if (outputAmount > 0) {
      console.log(`📥 Output: ${outputAmount.toFixed(8)} ${outputAsset}`);
    }
    
    // Calculate rate if both amounts are available
    if (baseAmount > 0 && ethAmount > 0) {
      const rate = ethAmount / baseAmount;
      console.log(`📊 Rate: 1 BASE = ${rate.toFixed(12)} ETH`);
      
      // Calculate reverse rate for RUNE comparison
      const runeToEthRate = ethAmount / inputAmount;
      console.log(`📊 Rate: 1 RUNE = ${runeToEthRate.toFixed(12)} ETH`);
    }
    
    // Calculate swap slip if limit is available
    if (baseAmount > 0 && ethAmount > 0) {
      const actualRate = ethAmount / baseAmount;
      const expectedRate = 0.0005074730498967412; // From website
      const slip = Math.abs((actualRate - expectedRate) / expectedRate) * 100;
      console.log(`📉 Swap Slip: ${slip.toFixed(2)}%`);
    }
  }

  private parseAmount(amountStr: string): { value: number; asset: string } {
    if (amountStr.includes('rune')) {
      const value = parseInt(amountStr.replace('rune', '')) / 100000000;
      return { value, asset: 'RUNE' };
    } else if (amountStr.includes('eth')) {
      const value = parseInt(amountStr.replace('eth', '')) / 1000000000000000000;
      return { value, asset: 'ETH' };
    } else if (amountStr.includes('btc')) {
      const value = parseInt(amountStr.replace('btc', '')) / 100000000;
      return { value, asset: 'BTC' };
    } else if (amountStr.includes('usdc')) {
      const value = parseInt(amountStr.replace('usdc', '')) / 1000000;
      return { value, asset: 'USDC' };
    } else {
      return { value: parseInt(amountStr) || 0, asset: 'Unknown' };
    }
  }

  private extractMemoInfo(tx: any): void {
    console.log('\n📝 MEMO ANALYSIS:');
    console.log('=' .repeat(30));
    
    if (tx.tx?.body?.messages) {
      tx.tx.body.messages.forEach((msg: any, index: number) => {
        if (msg.memo) {
          console.log(`Memo ${index + 1}: ${msg.memo}`);
          
          // Check for swap indicators
          if (msg.memo.includes('~')) {
            console.log('  ✅ Swap transaction detected');
          }
          
          // Check for limit orders
          if (msg.memo.includes('=')) {
            console.log('  🎯 Limit order detected');
          }
          
          // Check for address
          if (msg.memo.includes('thor1')) {
            const address = msg.memo.match(/thor1[a-zA-Z0-9]{38}/);
            if (address) {
              console.log(`  👤 Address: ${address[0]}`);
            }
          }
        }
      });
    }
  }

  private showEventsSummary(tx: any): void {
    console.log('\n⚡ EVENTS SUMMARY:');
    console.log('=' .repeat(30));
    
    if (tx.events) {
      const eventTypes = new Set();
      tx.events.forEach((event: any) => {
        eventTypes.add(event.type);
      });
      
      console.log('Event Types Found:');
      eventTypes.forEach(type => {
        console.log(`  - ${type}`);
      });
      
      // Count specific events
      const coinSpentCount = tx.events.filter((e: any) => e.type === 'coin_spent').length;
      const coinReceivedCount = tx.events.filter((e: any) => e.type === 'coin_received').length;
      const transferCount = tx.events.filter((e: any) => e.type === 'transfer').length;
      
      console.log(`\nEvent Counts:`);
      console.log(`  💸 Coin Spent: ${coinSpentCount}`);
      console.log(`  💰 Coin Received: ${coinReceivedCount}`);
      console.log(`  🔄 Transfer: ${transferCount}`);
    }
  }
}

async function main() {
  const analyzer = new SwapTransactionAnalyzer();
  
  try {
    const hash = '44378ADDEB391274840A9EC51BC7EB8DEA62C8C8E7AE547261747CCBC8FA29C6';
    await analyzer.analyzeSwapTransaction(hash);
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main().catch(console.error); 