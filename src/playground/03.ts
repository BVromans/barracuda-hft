import { Logger } from '../utils/logger';

class TransactionAnalyzer {
  private logger: Logger;
  private thorchainEndpoints: string[];
  private fallbackEndpoints: string[];

  constructor() {
    this.logger = new Logger('playground03');
    this.thorchainEndpoints = [
      'https://thornode.ninerealms.com',
      'https://rpc.thorchain.info',
      'https://rpc-testnet.thorchain.info'
    ];
    this.fallbackEndpoints = [
      'https://thornode.thorswap.net',
      'https://thornode.thorchain.info',
      'https://rpc.thorchain.org'
    ];
  }

  async analyzeTransaction(hash: string): Promise<void> {
    this.logger.log('analysis_started', { hash });
    console.log(`🚀 Analyzing Transaction Hash: ${hash}`);
    console.log('=' .repeat(80));
    
    // Try multiple endpoints to get transaction data
    const transactionData = await this.getTransactionFromAllEndpoints(hash);
    
    let addresses: Set<string> = new Set();
    if (transactionData) {
      this.logger.log('transaction_found', { hash, transactionData });
      this.displayDetailedTransactionInfo(transactionData);
      // Coletar endereços das mensagens e eventos
      addresses = this.collectAddresses(transactionData);
      this.logger.log('addresses_found', { hash, addresses: Array.from(addresses) });
    } else {
      this.logger.log('transaction_not_found', { hash });
      console.log('❌ Transaction not found on any endpoint');
      console.log('💡 Trying alternative methods...');
      await this.tryAlternativeMethods(hash);
    }
    // Consultar e exibir balanças para cada endereço
    if (addresses.size > 0) {
      console.log('\n================ BALANCES FOR INVOLVED ADDRESSES ================');
      for (const address of addresses) {
        await this.showAllBalances(address);
      }
    }
  }

  private async getTransactionFromAllEndpoints(hash: string): Promise<any> {
    const allEndpoints = [...this.thorchainEndpoints, ...this.fallbackEndpoints];
    
    for (const endpoint of allEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${endpoint}/cosmos/tx/v1beta1/txs/${hash}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          this.logger.log('transaction_retrieved', { hash, endpoint, data });
          console.log(`✅ Transaction found via ${endpoint}`);
          return data;
        } else {
          this.logger.log('transaction_failed', { hash, endpoint, status: response.status, statusText: response.statusText });
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        this.logger.log('transaction_failed', { hash, endpoint, error: error instanceof Error ? error.message : String(error) });
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Timeout for ${endpoint}`);
        } else {
          console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return null;
  }

  private async tryAlternativeMethods(hash: string): Promise<void> {
    // Try block explorer APIs
    await this.tryBlockExplorerAPI(hash);
    
    // Try searching recent blocks
    await this.searchRecentBlocks(hash);
    
    // Try legacy API format
    await this.tryLegacyAPI(hash);
  }

  private async tryBlockExplorerAPI(hash: string): Promise<void> {
    console.log('\n🌐 Trying block explorer API...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const viewblockUrl = `https://api.viewblock.io/thorchain/tx/${hash}`;
      
      const response = await fetch(viewblockUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Thorchain-Explorer/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found transaction via block explorer API`);
        this.displayBlockExplorerData(data);
        return;
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`⏰ Block explorer API timeout`);
      } else {
        console.log(`❌ Block explorer API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async searchRecentBlocks(hash: string): Promise<void> {
    console.log('\n📦 Searching recent blocks for transaction...');
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // Get latest block height first
        const heightResponse = await fetch(`${endpoint}/cosmos/base/tendermint/v1beta1/blocks/latest`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        if (heightResponse.ok) {
          const heightData = await heightResponse.json() as any;
          const latestHeight = parseInt(heightData.block.header.height);
          
          console.log(`  📊 Latest block height: ${latestHeight}`);
          
          // Search last 10 blocks for the transaction
          for (let i = 0; i < 10; i++) {
            const blockHeight = latestHeight - i;
            try {
              const blockResponse = await fetch(`${endpoint}/cosmos/base/tendermint/v1beta1/blocks/${blockHeight}`, {
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json',
                  'User-Agent': 'Thorchain-Explorer/1.0'
                }
              });
              
              if (blockResponse.ok) {
                const blockData = await blockResponse.json() as any;
                const txs = blockData.block.data.txs || [];
                
                // Check if our transaction is in this block
                for (const tx of txs) {
                  if (tx.includes(hash)) {
                    console.log(`✅ Found transaction in block ${blockHeight}`);
                    this.displayBlockTransactionInfo(blockData, hash);
                    clearTimeout(timeoutId);
                    return;
                  }
                }
              }
            } catch (blockError) {
              console.log(`  ⚠️ Block ${blockHeight} search failed, continuing...`);
            }
          }
          
          console.log(`  ⚠️ Transaction not found in recent blocks`);
        }
        
        clearTimeout(timeoutId);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Block search timeout for ${endpoint}`);
        } else {
          console.log(`❌ Block search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  private async tryLegacyAPI(hash: string): Promise<void> {
    console.log('\n🔧 Trying legacy API format...');
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const legacyQueries = [
          `txs/${hash}`,
          `tx/${hash}`,
          `transaction/${hash}`
        ];
        
        for (const query of legacyQueries) {
          try {
            const response = await fetch(`${endpoint}/${query}`, {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Thorchain-Explorer/1.0'
              }
            });
            
            if (response.ok) {
              const data = await response.json() as any;
              console.log(`✅ Found transaction via legacy API`);
              this.displayLegacyData(data);
              clearTimeout(timeoutId);
              return;
            }
          } catch (legacyError) {
            // Continue to next legacy query
          }
        }
        
        clearTimeout(timeoutId);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Legacy API timeout for ${endpoint}`);
        } else {
          console.log(`❌ Legacy API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  private displayDetailedTransactionInfo(data: any): void {
    const tx = data.tx_response;
    if (!tx) {
      console.log('❌ No transaction data in response');
      return;
    }

    console.log('\n📋 DETAILED TRANSACTION INFORMATION:');
    console.log('=' .repeat(60));
    
    // Basic transaction info
    console.log(`🔗 Transaction Hash: ${tx.txhash}`);
    console.log(`📊 Block Height: ${tx.height}`);
    console.log(`✅ Success: ${tx.code === 0 ? 'Yes' : 'No'}`);
    console.log(`⛽ Gas Used: ${tx.gas_used}`);
    console.log(`⛽ Gas Wanted: ${tx.gas_wanted}`);
    console.log(`📅 Timestamp: ${tx.timestamp}`);
    
    if (tx.raw_log) {
      console.log(`📝 Raw Log: ${tx.raw_log}`);
    }

    // Fee information
    console.log('\n💰 TRANSACTION FEES:');
    console.log('=' .repeat(30));
    
    let feesFound = false;
    
    // Calculate estimated fee based on gas used (always show this)
    if (tx.gas_used && tx.gas_used > 0) {
      // Thorchain typically has a gas rate of 2 RUNE per gas unit
      const estimatedFee = (tx.gas_used * 2) / 100000000; // Convert to RUNE
      console.log(`  Estimated Gas Fee: ${estimatedFee.toFixed(8)} RUNE (based on ${tx.gas_used} gas used)`);
      feesFound = true;
    }
    
    // Try to find explicit fees in auth_info
    if (tx.tx?.auth_info?.fee?.amount) {
      tx.tx.auth_info.fee.amount.forEach((fee: any) => {
        const amount = this.formatThorchainAmount(fee.amount, fee.denom);
        console.log(`  Explicit Fee: ${amount}`);
        feesFound = true;
      });
    }
    
    // Try to find fees in events
    if (tx.events) {
      tx.events.forEach((event: any) => {
        if (event.type === 'tx' && event.attributes) {
          event.attributes.forEach((attr: any) => {
            if (attr.key === 'fee' && attr.value) {
              console.log(`  Fee: ${attr.value}`);
              feesFound = true;
            }
          });
        }
      });
    }
    
    // Try to find fees in raw_log
    if (!feesFound && tx.raw_log) {
      const feeMatch = tx.raw_log.match(/"fee":\s*"([^"]+)"/);
      if (feeMatch) {
        console.log(`  Fee: ${feeMatch[1]}`);
        feesFound = true;
      }
    }
    
    // Look for specific fee events
    if (tx.events) {
      // Look for small coin_spent events that might be fees
      tx.events.forEach((event: any) => {
        if (event.type === 'coin_spent' && event.attributes) {
          let spender = '';
          let amount = '';
          
          event.attributes.forEach((attr: any) => {
            if (attr.key === 'spender') spender = attr.value;
            if (attr.key === 'amount') amount = attr.value;
          });
          
          // Check if this is a fee payment (small amounts to specific addresses)
          if (spender && amount && amount.includes('rune')) {
            const runeAmount = parseInt(amount.replace('rune', ''));
            // If it's a small amount (likely a fee) and not a large transfer
            if (runeAmount < 10000000) { // Less than 0.1 RUNE
              const formattedAmount = this.formatThorchainAmount(runeAmount.toString(), 'rune');
              console.log(`  Fee Payment: ${formattedAmount} from ${spender}`);
              feesFound = true;
            }
          }
        }
      });
    }
    
    if (!feesFound) {
      console.log('  (no explicit fees found in transaction data)');
      // Show gas information as fallback
      if (tx.gas_used && tx.gas_used > 0) {
        console.log(`  Gas Used: ${tx.gas_used} (fee calculation not available)`);
      }
    }

    // Messages analysis
    if (tx.tx?.body?.messages) {
      console.log('\n📨 TRANSACTION MESSAGES:');
      console.log('=' .repeat(30));
      tx.tx.body.messages.forEach((msg: any, index: number) => {
        console.log(`\nMessage ${index + 1}:`);
        console.log(`  Type: ${msg['@type']}`);
        this.extractMessageDetails(msg);
      });
    }

    // Events analysis
    if (tx.events) {
      console.log('\n⚡ TRANSACTION EVENTS:');
      console.log('=' .repeat(30));
      tx.events.forEach((event: any, index: number) => {
        console.log(`\nEvent ${index + 1}: ${event.type}`);
        if (event.attributes) {
          event.attributes.forEach((attr: any) => {
            console.log(`  ${attr.key}: ${attr.value}`);
          });
        }
      });
    }

    // Summary
    this.generateTransactionSummary(tx);
  }

  private extractMessageDetails(msg: any): void {
    // Extract addresses
    const addressFields = ['from_address', 'to_address', 'sender', 'recipient', 'delegator_address', 'validator_address'];
    addressFields.forEach(field => {
      if (msg[field]) {
        console.log(`  ${field}: ${msg[field]}`);
      }
    });

    // Extract amounts and coins
    const amountFields = ['amount', 'amounts', 'coins', 'funds', 'value'];
    amountFields.forEach(field => {
      if (msg[field]) {
        console.log(`  💰 ${field}:`);
        if (Array.isArray(msg[field])) {
          msg[field].forEach((item: any) => {
            if (item.amount && item.denom) {
              const formatted = this.formatThorchainAmount(item.amount, item.denom);
              console.log(`    ${formatted}`);
            }
          });
        } else if (msg[field].amount && msg[field].denom) {
          const formatted = this.formatThorchainAmount(msg[field].amount, msg[field].denom);
          console.log(`    ${formatted}`);
        }
      }
    });

    // Extract other important fields
    const otherFields = ['memo', 'proposal_id', 'voter', 'depositor'];
    otherFields.forEach(field => {
      if (msg[field]) {
        console.log(`  ${field}: ${msg[field]}`);
      }
    });
  }

  private formatThorchainAmount(amount: string, denom: string): string {
    let displayAmount = amount;
    let tokenName = denom;
    
    // Handle different token formats
    if (denom === 'rune') {
      displayAmount = (parseInt(amount) / 100000000).toFixed(8);
      tokenName = 'RUNE';
    } else if (denom === 'cacao') {
      displayAmount = (parseInt(amount) / 100000000).toFixed(8);
      tokenName = 'CACAO';
    } else if (denom.includes('eth-usdc')) {
      displayAmount = (parseInt(amount) / 1000000).toFixed(6);
      tokenName = 'USDC (ETH)';
    } else if (denom === 'tcy') {
      displayAmount = parseInt(amount).toLocaleString();
      tokenName = 'TCy';
    } else if (denom === 'x/ruji') {
      displayAmount = parseInt(amount).toLocaleString();
      tokenName = 'RUJI';
    } else if (denom.includes('usdc')) {
      displayAmount = (parseInt(amount) / 1000000).toFixed(6);
      tokenName = 'USDC';
    } else if (denom.includes('eth')) {
      displayAmount = (parseInt(amount) / 1000000000000000000).toFixed(18);
      tokenName = 'ETH';
    } else if (denom.includes('btc')) {
      displayAmount = (parseInt(amount) / 100000000).toFixed(8);
      tokenName = 'BTC';
    } else if (denom.includes('atom')) {
      displayAmount = (parseInt(amount) / 1000000).toFixed(6);
      tokenName = 'ATOM';
    } else if (denom.includes('osmo')) {
      displayAmount = (parseInt(amount) / 1000000).toFixed(6);
      tokenName = 'OSMO';
    } else if (denom.includes('axl')) {
      displayAmount = (parseInt(amount) / 1000000).toFixed(6);
      tokenName = 'AXL';
    } else {
      // For unknown tokens, show raw amount
      displayAmount = parseInt(amount).toLocaleString();
      tokenName = denom;
    }
    
    return `${displayAmount} ${tokenName}`;
  }

  private generateTransactionSummary(tx: any): void {
    console.log('\n💡 TRANSACTION SUMMARY:');
    console.log('=' .repeat(30));
    
    const isSuccess = tx.code === 0;
    console.log(`Status: ${isSuccess ? '✅ Success' : '❌ Failed'}`);
    console.log(`Block: ${tx.height}`);
    console.log(`Gas Used: ${tx.gas_used} / ${tx.gas_wanted}`);
    
    // Try to determine transaction type
    let txType = 'Unknown';
    if (tx.tx?.body?.messages) {
      const msgTypes = tx.tx.body.messages.map((msg: any) => msg['@type']);
      if (msgTypes.some((type: string) => type.includes('bank'))) {
        txType = 'Transfer';
      } else if (msgTypes.some((type: string) => type.includes('staking'))) {
        txType = 'Staking';
      } else if (msgTypes.some((type: string) => type.includes('governance'))) {
        txType = 'Governance';
      } else if (msgTypes.some((type: string) => type.includes('swap'))) {
        txType = 'Swap';
      }
    }
    
    console.log(`Type: ${txType}`);
    
    // Calculate total value if possible
    let totalValue = 0;
    if (tx.tx?.auth_info?.fee?.amount) {
      tx.tx.auth_info.fee.amount.forEach((fee: any) => {
        if (fee.denom === 'rune') {
          totalValue += parseInt(fee.amount) / 100000000;
        }
      });
    }
    
    if (totalValue > 0) {
      console.log(`Total Fee Value: ${totalValue.toFixed(8)} RUNE`);
    }
  }

  private displayBlockExplorerData(data: any): void {
    console.log('\n🌐 BLOCK EXPLORER DATA:');
    console.log('=' .repeat(30));
    console.log(JSON.stringify(data, null, 2));
  }

  private displayBlockTransactionInfo(blockData: any, hash: string): void {
    console.log('\n📦 BLOCK TRANSACTION INFO:');
    console.log('=' .repeat(30));
    console.log(`Block Height: ${blockData.block.header.height}`);
    console.log(`Block Hash: ${blockData.block.header.hash}`);
    console.log(`Transaction Hash: ${hash}`);
    console.log(`Found in block: Yes`);
  }

  private displayLegacyData(data: any): void {
    console.log('\n🔧 LEGACY API DATA:');
    console.log('=' .repeat(30));
    console.log(JSON.stringify(data, null, 2));
  }

  private collectAddresses(data: any): Set<string> {
    const addresses = new Set<string>();
    const tx = data.tx_response;
    if (!tx) return addresses;
    // Mensagens
    if (tx.tx?.body?.messages) {
      tx.tx.body.messages.forEach((msg: any) => {
        [
          'from_address', 'to_address', 'sender', 'recipient',
          'delegator_address', 'validator_address', 'receiver', 'spender'
        ].forEach(field => {
          if (msg[field]) addresses.add(msg[field]);
        });
      });
    }
    // Eventos
    if (tx.events) {
      tx.events.forEach((event: any) => {
        if (event.attributes) {
          event.attributes.forEach((attr: any) => {
            if (attr.key && typeof attr.value === 'string') {
              if ([
                'sender', 'recipient', 'receiver', 'spender',
                'delegator', 'validator', 'acc_seq', 'signer'
              ].some(k => attr.key.includes(k))) {
                // Pode conter endereço
                if (attr.value.startsWith('thor1')) addresses.add(attr.value);
                // acc_seq pode ser "address/seq"
                if (attr.value.includes('/') && attr.value.startsWith('thor1')) {
                  addresses.add(attr.value.split('/')[0]);
                }
              }
            }
          });
        }
      });
    }
    return addresses;
  }

  private async showAllBalances(address: string): Promise<void> {
    this.logger.log('balance_check_started', { address });
    console.log(`\n🔎 Address: ${address}`);
    await this.showBalance(address);
    await this.showSpendableBalance(address);
    await this.showDelegationBalance(address);
    await this.showVestingInfo(address);
    this.logger.log('balance_check_completed', { address });
  }

  private async showBalance(address: string): Promise<void> {
    const endpoint = this.thorchainEndpoints[0];
    try {
      const response = await fetch(`${endpoint}/cosmos/bank/v1beta1/balances/${address}`);
      if (response.ok) {
        const data = await response.json() as any;
        this.logger.log('balance_retrieved', { address, endpoint, balances: data });
        console.log('💰 Total Balance:');
        if (data.balances && data.balances.length > 0) {
          data.balances.forEach((bal: any) => {
            console.log(`  - ${this.formatThorchainAmount(bal.amount, bal.denom)}`);
          });
        } else {
          console.log('  (none)');
        }
      } else {
        this.logger.log('balance_failed', { address, endpoint, status: response.status, statusText: response.statusText });
        console.log('  (could not fetch total balance)');
      }
    } catch (err) {
      this.logger.log('balance_failed', { address, endpoint, error: err instanceof Error ? err.message : String(err) });
      console.log('  (error fetching total balance)');
    }
  }

  private async showSpendableBalance(address: string): Promise<void> {
    const endpoint = this.thorchainEndpoints[0];
    try {
      const response = await fetch(`${endpoint}/cosmos/bank/v1beta1/spendable_balances/${address}`);
      if (response.ok) {
        const data = await response.json() as any;
        console.log('💳 Spendable Balance:');
        if (data.balances && data.balances.length > 0) {
          data.balances.forEach((bal: any) => {
            console.log(`  - ${this.formatThorchainAmount(bal.amount, bal.denom)}`);
          });
        } else {
          console.log('  (none)');
        }
      } else {
        console.log('  (could not fetch spendable balance)');
      }
    } catch {
      console.log('  (error fetching spendable balance)');
    }
  }

  private async showDelegationBalance(address: string): Promise<void> {
    const endpoint = this.thorchainEndpoints[0];
    try {
      const response = await fetch(`${endpoint}/cosmos/staking/v1beta1/delegations/${address}`);
      if (response.ok) {
        const data = await response.json() as any;
        console.log('🔒 Delegated (Staked):');
        if (data.delegation_responses && data.delegation_responses.length > 0) {
          data.delegation_responses.forEach((del: any) => {
            const bal = del.balance;
            const validator = del.delegation?.validator_address;
            console.log(`  - ${this.formatThorchainAmount(bal.amount, bal.denom)} to ${validator}`);
          });
        } else {
          console.log('  (none)');
        }
      } else {
        console.log('  (could not fetch delegation balance)');
      }
    } catch {
      console.log('  (error fetching delegation balance)');
    }
  }

  private async showVestingInfo(address: string): Promise<void> {
    const endpoint = this.thorchainEndpoints[0];
    try {
      const response = await fetch(`${endpoint}/cosmos/auth/v1beta1/accounts/${address}`);
      if (response.ok) {
        const data = await response.json() as any;
        const account = data.account;
        if (account && account['@type']?.includes('vesting')) {
          console.log('🔐 Vesting Account:');
          if (account.base_vesting_account) {
            const vesting = account.base_vesting_account;
            if (vesting.original_vesting && vesting.original_vesting.length > 0) {
              vesting.original_vesting.forEach((v: any) => {
                console.log(`  - Original: ${this.formatThorchainAmount(v.amount, v.denom)}`);
              });
            }
            if (vesting.delegated_free && vesting.delegated_free.length > 0) {
              vesting.delegated_free.forEach((v: any) => {
                console.log(`  - Delegated Free: ${this.formatThorchainAmount(v.amount, v.denom)}`);
              });
            }
            if (vesting.delegated_vesting && vesting.delegated_vesting.length > 0) {
              vesting.delegated_vesting.forEach((v: any) => {
                console.log(`  - Delegated Vesting: ${this.formatThorchainAmount(v.amount, v.denom)}`);
              });
            }
            if (vesting.end_time) {
              const endTime = new Date(parseInt(vesting.end_time) * 1000);
              console.log(`  - Vesting End Time: ${endTime.toISOString()}`);
            }
          }
        } else {
          console.log('🔐 Vesting: (none)');
        }
      } else {
        console.log('  (could not fetch vesting info)');
      }
    } catch {
      console.log('  (error fetching vesting info)');
    }
  }
}

async function main() {
  const analyzer = new TransactionAnalyzer();
  
  try {
    const hash = '44378ADDEB391274840A9EC51BC7EB8DEA62C8C8E7AE547261747CCBC8FA29C6';
    await analyzer.analyzeTransaction(hash);
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main().catch(console.error); 