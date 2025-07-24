import { Logger } from '../../src/utils/logger';

class ThorchainTransactionAnalyzer {
  private logger: Logger;
  private thorchainEndpoints: string[];

  constructor() {
    this.logger = new Logger('playground05');
    this.thorchainEndpoints = [
      'https://thornode.ninerealms.com',
      'https://rpc.thorchain.info',
      'https://rpc-testnet.thorchain.info'
    ];
  }

  async analyzeTransaction(hash: string, targetAddress?: string): Promise<void> {
    console.log(`🚀 Analyzing ThorChain Transaction Hash: ${hash}`);
    if (targetAddress) {
      console.log(`🎯 Target Address: ${targetAddress}`);
    }
    console.log('='.repeat(80));
    
    this.logger.log('transaction_analysis_started', {
      transactionHash: hash,
      targetAddress: targetAddress,
      endpoints: this.thorchainEndpoints
    });
    
    const transactionData = await this.getTransactionFromEndpoints(hash);
    
    if (transactionData) {
      this.displayDetailedAnalysis(transactionData, targetAddress);
      
      // Fetch current balance if target address is provided
      if (targetAddress) {
        console.log('\n' + '='.repeat(80));
        const balanceData = await this.getBalanceFromEndpoints(targetAddress);
        this.displayBalanceInfo(balanceData, targetAddress);
      }
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
            'User-Agent': 'Thorchain-Tx-Analyzer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Transaction found via ${endpoint}`);
          this.logger.log('transaction_retrieved', {
            transactionHash: hash,
            endpoint: endpoint,
            transactionData: data
          });
          return data;
        } else {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          this.logger.log('transaction_failed', {
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

  private async getBalanceFromEndpoints(address: string): Promise<any> {
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`💰 Fetching balance from ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${endpoint}/cosmos/bank/v1beta1/balances/${address}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Balance-Checker/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Balance found via ${endpoint}`);
          this.logger.log('balance_retrieved', {
            address: address,
            endpoint: endpoint,
            balanceData: data
          });
          return data;
        } else {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          this.logger.log('balance_failed', {
            address: address,
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

  private parseAmount(amountStr: string): { value: number; asset: string; decimals: number } {
    if (amountStr.includes('rune')) {
      const value = parseInt(amountStr.replace('rune', '')) / 100000000;
      return { value, asset: 'RUNE', decimals: 8 };
    } else if (amountStr.includes('x/ruji')) {
      const value = parseInt(amountStr.replace('x/ruji', ''));
      return { value, asset: 'RUJI', decimals: 0 };
    } else if (amountStr.includes('eth')) {
      const value = parseInt(amountStr.replace('eth', '')) / 1000000000000000000;
      return { value, asset: 'ETH', decimals: 18 };
    } else if (amountStr.includes('btc')) {
      const value = parseInt(amountStr.replace('btc', '')) / 100000000;
      return { value, asset: 'BTC', decimals: 8 };
    } else {
      return { value: parseInt(amountStr) || 0, asset: 'Unknown', decimals: 0 };
    }
  }

  private displayDetailedAnalysis(data: any, targetAddress?: string): void {
    const tx = data.tx_response;
    if (!tx) {
      console.log('❌ No transaction data in response');
      return;
    }

    console.log('\n📊 DETAILED TRANSACTION ANALYSIS');
    console.log('='.repeat(60));
    
    // Basic Information
    this.displayBasicInfo(tx);
    
    // Fee Analysis
    this.displayFeeAnalysis(tx);
    
    // Contract Analysis
    this.displayContractAnalysis(tx);
    
    // Message Analysis
    this.displayMessageAnalysis(tx);
    
    // Token Transfers
    this.displayTokenTransfers(tx);
    
    // Special Events
    this.displaySpecialEvents(tx);
    
    // Address Involvement
    this.displayAddressInvolvement(tx, targetAddress);
    
    // Account Information
    this.displayAccountInfo(tx);
    
    // Raw Data Summary
    this.displayRawDataSummary(tx);
  }

  private displayBasicInfo(tx: any): void {
    console.log('\n🔗 BASIC INFORMATION:');
    console.log('='.repeat(30));
    console.log(`Hash: ${tx.txhash}`);
    console.log(`Block Height: ${tx.height}`);
    console.log(`Status: ${tx.code === 0 ? '✅ Success' : '❌ Failed'}`);
    
    // Convert timestamp to Brasília time
    const utcDate = new Date(tx.timestamp);
    console.log(`Timestamp (UTC): ${tx.timestamp}`);
    console.log(`Timestamp (BR): ${utcDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`Gas Used: ${tx.gas_used}`);
    console.log(`Gas Wanted: ${tx.gas_wanted || 'N/A'}`);
  }

  private displayFeeAnalysis(tx: any): void {
    console.log('\n💰 FEE ANALYSIS:');
    console.log('='.repeat(30));
    
    const feeEvents = tx.events.filter((e: any) => e.type === 'tx' && e.attributes.some((a: any) => a.key === 'fee'));
    if (feeEvents.length > 0) {
      feeEvents.forEach((event: any) => {
        const feeAttr = event.attributes.find((a: any) => a.key === 'fee');
        if (feeAttr) {
          const fee = this.parseAmount(feeAttr.value);
          console.log(`Transaction Fee: ${fee.value.toFixed(8)} ${fee.asset}`);
          
          if (fee.asset === 'RUNE') {
            const runePriceUSD = 1.25; // Approximate
            console.log(`Fee (USD): $${(fee.value * runePriceUSD).toFixed(6)}`);
          }
        }
      });
    }
  }

  private displayContractAnalysis(tx: any): void {
    console.log('\n🏗️ CONTRACT ANALYSIS:');
    console.log('='.repeat(30));
    
    const contractEvents = tx.events.filter((e: any) => e.type === 'execute');
    if (contractEvents.length > 0) {
      contractEvents.forEach((event: any) => {
        const contractAddr = event.attributes.find((a: any) => a.key === '_contract_address');
        if (contractAddr) {
          console.log(`Contract: ${contractAddr.value}`);
          
          if (contractAddr.value.includes('rujira')) {
            console.log('Protocol: Rujira Finance');
          }
        }
      });
    }
  }

  private displayMessageAnalysis(tx: any): void {
    console.log('\n📝 MESSAGE ANALYSIS:');
    console.log('='.repeat(30));
    
    if (tx.tx?.body?.messages) {
      tx.tx.body.messages.forEach((msg: any, idx: number) => {
        console.log(`Message ${idx + 1}: ${msg['@type']}`);
        if (msg.sender) console.log(`Sender: ${msg.sender}`);
        if (msg.contract) console.log(`Contract: ${msg.contract}`);
        
        if (msg.funds && msg.funds.length > 0) {
          msg.funds.forEach((fund: any) => {
            const amount = this.parseAmount(`${fund.amount}${fund.denom}`);
            console.log(`Funds: ${amount.value.toLocaleString()} ${amount.asset}`);
          });
        }
        
        if (msg.msg) {
          console.log(`Action: ${JSON.stringify(msg.msg, null, 2).substring(0, 200)}...`);
        }
      });
    }
  }

  private displayTokenTransfers(tx: any): void {
    console.log('\n🔄 TOKEN TRANSFERS:');
    console.log('='.repeat(30));
    
    const transferEvents = tx.events.filter((e: any) => e.type === 'transfer');
    transferEvents.forEach((event: any) => {
      const sender = event.attributes.find((a: any) => a.key === 'sender')?.value;
      const recipient = event.attributes.find((a: any) => a.key === 'recipient')?.value;
      const amount = event.attributes.find((a: any) => a.key === 'amount')?.value;
      
      if (sender && recipient && amount) {
        const parsedAmount = this.parseAmount(amount);
        console.log(`${sender} → ${recipient}`);
        console.log(`Amount: ${parsedAmount.value.toLocaleString()} ${parsedAmount.asset}`);
      }
    });
  }

  private displaySpecialEvents(tx: any): void {
    console.log('\n🎯 SPECIAL EVENTS:');
    console.log('='.repeat(30));
    
    const specialEvents = tx.events.filter((e: any) => e.type.includes('rujira') || e.type.includes('order'));
    specialEvents.forEach((event: any) => {
      console.log(`Event: ${event.type}`);
      event.attributes.forEach((attr: any) => {
        console.log(`  ${attr.key}: ${attr.value}`);
      });
    });
  }

  private displayAddressInvolvement(tx: any, targetAddress?: string): void {
    console.log('\n👤 ADDRESS INVOLVEMENT:');
    console.log('='.repeat(30));
    
    const allAddresses = new Set<string>();
    tx.events.forEach((event: any) => {
      event.attributes.forEach((attr: any) => {
        if (attr.value && attr.value.startsWith('thor1')) {
          allAddresses.add(attr.value);
        }
      });
    });
    
    console.log(`Total addresses involved: ${allAddresses.size}`);
    allAddresses.forEach(addr => {
      const isTarget = targetAddress && addr === targetAddress;
      console.log(`${addr} ${isTarget ? '🎯 (TARGET)' : ''}`);
    });
  }

  private displayAccountInfo(tx: any): void {
    console.log('\n🔢 ACCOUNT INFO:');
    console.log('='.repeat(30));
    
    const accSeqEvent = tx.events.find((e: any) => e.type === 'tx' && e.attributes.some((a: any) => a.key === 'acc_seq'));
    if (accSeqEvent) {
      const accSeq = accSeqEvent.attributes.find((a: any) => a.key === 'acc_seq')?.value;
      if (accSeq) {
        const [address, sequence] = accSeq.split('/');
        console.log(`Account: ${address}`);
        console.log(`Sequence: ${sequence}`);
      }
    }
  }

  private displayBalanceInfo(balanceData: any, address: string): void {
    console.log('\n💰 CURRENT BALANCE:');
    console.log('='.repeat(30));
    console.log(`Address: ${address}`);
    
    if (!balanceData || !balanceData.balances) {
      console.log('❌ No balance data found');
      return;
    }
    
    if (balanceData.balances.length === 0) {
      console.log('💸 Balance: 0 (empty wallet)');
      return;
    }
    
    balanceData.balances.forEach((balance: any) => {
      const parsedAmount = this.parseAmount(`${balance.amount}${balance.denom}`);
      console.log(`${parsedAmount.asset}: ${parsedAmount.value.toLocaleString()}`);
      
      // Estimate USD value for RUNE
      if (parsedAmount.asset === 'RUNE') {
        const runePriceUSD = 1.25; // Approximate
        const usdValue = parsedAmount.value * runePriceUSD;
        console.log(`USD Value: $${usdValue.toLocaleString()}`);
      }
    });
  }

  private displayRawDataSummary(tx: any): void {
    console.log('\n📄 RAW DATA SUMMARY:');
    console.log('='.repeat(30));
    
    const summary = {
      height: tx.height,
      txhash: tx.txhash,
      code: tx.code,
      gas_used: tx.gas_used,
      timestamp: tx.timestamp,
      events_count: tx.events.length,
      event_types: [...new Set(tx.events.map((e: any) => e.type))]
    };
    
    console.log(JSON.stringify(summary, null, 2));
  }
}

async function main() {
  const analyzer = new ThorchainTransactionAnalyzer();
  
  try {
    const hash = 'D75B3563F046760A69460C26BE4C4AABE01268C659D3581BFAEDF7FC8EFC0839';
    const targetAddress = 'thor1gsgx5xtw82r8qw06mrcxjzypuynqwjxcugk5fy';
    await analyzer.analyzeTransaction(hash, targetAddress);
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main().catch(console.error); 