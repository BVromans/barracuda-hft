import { Logger } from '../utils/logger';

class ThorchainWalletAnalyzer {
  private logger: Logger;
  private thorchainEndpoints: string[];

  constructor() {
    this.logger = new Logger('playground06');
    this.thorchainEndpoints = [
      'https://thornode.ninerealms.com',
      'https://rpc.thorchain.info',
      'https://rpc-testnet.thorchain.info'
    ];
  }

  async getWalletBalance(walletAddress: string): Promise<any> {
    console.log(`💰 Fetching balance for wallet: ${walletAddress}`);
    console.log('='.repeat(80));
    
    this.logger.log('wallet_balance_requested', {
      walletAddress: walletAddress,
      endpoints: this.thorchainEndpoints
    });

    const balanceData = await this.getBalanceFromEndpoints(walletAddress);
    
    if (balanceData) {
      this.displayBalanceInfo(balanceData, walletAddress);
      return balanceData;
    } else {
      console.log('❌ Failed to fetch balance from all endpoints');
      this.logger.log('wallet_balance_failed', {
        walletAddress: walletAddress
      });
      return null;
    }
  }

  async checkContractStatus(contractAddress: string): Promise<boolean> {
    console.log(`🔍 Checking contract status: ${contractAddress}`);
    
    for (const endpoint of this.thorchainEndpoints) {
      try {
        const response = await fetch(`${endpoint}/cosmos/bank/v1beta1/balances/${contractAddress}`, {
          signal: AbortSignal.timeout(10000),
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json() as any;
          const isContract = this.validateContractCharacteristics(data);
          
          if (isContract) {
            console.log(`✅ Contract active via ${endpoint}`);
            this.logger.log('contract_status_success', { contractAddress, endpoint, isActive: true });
            return true;
          }
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error instanceof Error ? error.message : 'Failed'}`);
      }
    }
    
    console.log('❌ Contract not found or invalid');
    this.logger.log('contract_status_failed', { contractAddress, isActive: false });
    return false;
  }

  private validateContractCharacteristics(balanceData: any): boolean {
    if (!balanceData.balances) return false;
    
    // Multiple tokens or LP tokens = likely contract
    return balanceData.balances.length > 1 || 
           balanceData.balances.some((b: any) => 
             b.denom.includes('x/bow-xyk') || 
             b.denom.includes('thor.') ||
             b.denom.includes('x/ruji')
           );
  }

  async interactWithContract(contractAddress: string): Promise<boolean> {
    console.log(`🤖 Interacting with contract: ${contractAddress}`);
    console.log('='.repeat(80));
    
    this.logger.log('contract_interaction_requested', {
      contractAddress: contractAddress,
      endpoints: this.thorchainEndpoints
    });

    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`📡 Interacting via ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        // Try to query contract state (real interaction)
        const response = await fetch(`${endpoint}/cosmos/wasm/v1beta1/contract/${contractAddress}/smart`, {
          signal: controller.signal,
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Thorchain-Contract-Interactor/1.0'
          },
          body: JSON.stringify({
            query: {
              get_info: {}
            }
          })
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json() as any;
          console.log(`✅ Contract interaction successful via ${endpoint}`);
          console.log(`📊 Contract response: ${JSON.stringify(data, null, 2)}`);
          
          this.logger.log('contract_interaction_success', {
            contractAddress: contractAddress,
            endpoint: endpoint,
            response: data
          });
          
          return true;
        } else if (response.status === 404) {
          console.log(`⚠️ Contract not found or not a WASM contract`);
          
          // Try alternative interaction - get account info
          const accountResponse = await fetch(`${endpoint}/cosmos/auth/v1beta1/accounts/${contractAddress}`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Thorchain-Contract-Interactor/1.0'
            }
          });
          
          if (accountResponse.ok) {
            const accountData = await accountResponse.json() as any;
            console.log(`✅ Account info retrieved via ${endpoint}`);
            console.log(`📊 Account type: ${accountData.account?.['@type'] || 'Unknown'}`);
            
            this.logger.log('contract_interaction_alternative', {
              contractAddress: contractAddress,
              endpoint: endpoint,
              accountType: accountData.account?.['@type'],
              accountData: accountData
            });
            
            return true;
          }
        } else {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Timeout for ${endpoint}`);
        } else {
          console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    console.log('❌ Contract interaction failed');
    this.logger.log('contract_interaction_failed', {
      contractAddress: contractAddress
    });
    
    return false;
  }

  async getTransactionInfo(hash: string): Promise<any> {
    console.log(`🔍 Getting essential transaction info for hash: ${hash}`);
    console.log('='.repeat(80));
    
    this.logger.log('transaction_info_requested', {
      transactionHash: hash,
      endpoints: this.thorchainEndpoints
    });

    const transactionData = await this.getTransactionFromEndpoints(hash);
    
    if (transactionData) {
      this.displayEssentialTransactionInfo(transactionData);
      return transactionData;
    } else {
      console.log('❌ Transaction not found');
      this.logger.log('transaction_info_failed', {
        transactionHash: hash
      });
      return null;
    }
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

  private parseAmount(denom: string, amountStr: string): { value: number; asset: string; decimals: number } {
    const amount = parseInt(amountStr) || 0;
    
    if (denom === 'rune') {
      return { value: amount / 100000000, asset: 'RUNE', decimals: 8 };
    } else if (denom === 'x/ruji') {
      return { value: amount, asset: 'RUJI', decimals: 0 };
    } else if (denom === 'eth-eth') {
      return { value: amount / 1000000000000000000, asset: 'ETH', decimals: 18 };
    } else if (denom === 'btc-btc') {
      return { value: amount / 100000000, asset: 'BTC', decimals: 8 };
    } else if (denom === 'tcy') {
      return { value: amount / 100000000, asset: 'TCY', decimals: 8 };
    } else if (denom === 'thor.auto') {
      return { value: amount / 100000000, asset: 'THOR.AUTO', decimals: 8 };
    } else if (denom === 'thor.fuzn') {
      return { value: amount / 100000000, asset: 'THOR.FUZN', decimals: 8 };
    } else if (denom === 'thor.lqdy') {
      return { value: amount / 100000000, asset: 'THOR.LQDY', decimals: 8 };
    } else if (denom === 'thor.nstk') {
      return { value: amount / 100000000, asset: 'THOR.NSTK', decimals: 8 };
    } else if (denom.includes('eth-usdc')) {
      return { value: amount / 1000000, asset: 'USDC', decimals: 6 };
    } else if (denom.includes('x/bow-xyk')) {
      return { value: amount / 100000000, asset: 'LP Token', decimals: 8 };
    } else {
      return { value: amount, asset: denom, decimals: 0 };
    }
  }

  private displayBalanceInfo(balanceData: any, address: string): void {
    console.log('\n💰 WALLET BALANCE INFORMATION');
    console.log('='.repeat(60));
    console.log(`📍 Address: ${address}`);
    console.log(`📅 Fetched at: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    
    if (balanceData.balances && balanceData.balances.length > 0) {
      console.log('\n💎 Current Balances:');
      balanceData.balances.forEach((balance: any) => {
        const parsed = this.parseAmount(balance.denom, balance.amount);
        console.log(`   ${parsed.asset}: ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`);
      });
    } else {
      console.log('\n💎 No balances found (empty wallet)');
    }
    
    console.log('\n📊 Raw Balance Data:');
    console.log(JSON.stringify(balanceData, null, 2));
  }

  private displayEssentialTransactionInfo(data: any): void {
    const tx = data.tx_response;
    if (!tx) {
      console.log('❌ No transaction data in response');
      return;
    }

    console.log('\n📊 ESSENTIAL TRANSACTION INFORMATION');
    console.log('='.repeat(60));
    
    // Basic Info
    console.log(`🔗 Hash: ${tx.txhash}`);
    console.log(`📅 Timestamp: ${new Date(tx.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
    console.log(`📊 Height: ${tx.height}`);
    console.log(`✅ Success: ${tx.tx_result?.code === 0 ? 'Yes' : 'No'}`);
    
    // Fee Info
    if (tx.tx?.auth_info?.fee?.amount) {
      console.log('\n💰 Fees:');
              tx.tx.auth_info.fee.amount.forEach((fee: any) => {
          const parsed = this.parseAmount(fee.denom, fee.amount);
          console.log(`   ${parsed.asset}: ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`);
        });
    }
    
    // Messages Summary
    if (tx.tx?.body?.messages) {
      console.log('\n📨 Messages:');
      tx.tx.body.messages.forEach((msg: any, index: number) => {
        console.log(`   ${index + 1}. ${msg['@type'] || 'Unknown type'}`);
        if (msg.from_address) console.log(`      From: ${msg.from_address}`);
        if (msg.to_address) console.log(`      To: ${msg.to_address}`);
      });
    }
    
    // Gas Info
    if (tx.gas_used && tx.gas_wanted) {
      console.log(`\n⛽ Gas Used: ${tx.gas_used} / ${tx.gas_wanted}`);
    }
    
    console.log('\n📋 Raw Transaction Data:');
    console.log(JSON.stringify(tx, null, 2));
  }
}

async function main() {
  const analyzer = new ThorchainWalletAnalyzer();
  
  // Target address from user request
  const targetAddress = 'thor1a3xfqx4yt4yhymhm22m36huuh3eklf49gztyvj';
  
  console.log('🚀 ThorChain Wallet Analyzer - Playground 06');
  console.log('='.repeat(80));
  
  try {
    // 1. Get wallet balance
    console.log('\n1️⃣ Getting wallet balance...');
    await analyzer.getWalletBalance(targetAddress);
    
    // 2. Check contract status
    console.log('\n2️⃣ Checking contract status...');
    const isActive = await analyzer.checkContractStatus(targetAddress);
    console.log(`\n📊 Contract Status Result: ${isActive ? '✅ TRUE' : '❌ FALSE'}`);
    
    // 3. Real contract interaction
    console.log('\n3️⃣ Interacting with contract...');
    const interactionSuccess = await analyzer.interactWithContract(targetAddress);
    console.log(`\n🤖 Contract Interaction Result: ${interactionSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // 4. Example transaction hash (you can replace with actual hash)
    console.log('\n4️⃣ Getting transaction info (example)...');
    const exampleHash = 'A7B3A83EAAD0C6AB07A41B499239B3F6C19AEE4EEDF550CAFD659EAFED0BE5F1';
    await analyzer.getTransactionInfo(exampleHash);
    
  } catch (error) {
    console.error('❌ Error in main execution:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ThorchainWalletAnalyzer }; 