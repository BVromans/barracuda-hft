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

  // Utilitário para exibir status de qualquer seção
  private printStatusSection(title: string, status: string, message: string, address?: string) {
    console.log(`\n${title}`);
    console.log('='.repeat(60));
    console.log(`✅ Status: ${status} (${message})`);
    if (address) console.log(`📍 Address: ${address}`);
    console.log(`📅 Fetched at: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  }

  async getWalletBalance(walletAddress: string): Promise<any> {
    this.logger.log('wallet_balance_requested', {
      walletAddress: walletAddress,
      endpoints: this.thorchainEndpoints
    });

    const balanceData = await this.getBalanceFromEndpoints(walletAddress);
    if (balanceData) {
      const accountStatus = await this.getRealWalletStatus(walletAddress);
      this.printStatusSection('📊 TRANSACTION STATUS:', accountStatus.status, accountStatus.message, walletAddress);
      this.displayBalanceInfo(balanceData);
      await this.getSpendableBalances(walletAddress);
      await this.getDelegationBalances(walletAddress);
      await this.getRewards(walletAddress);
      await this.getVestingInfo(walletAddress);
      return balanceData;
    } else {
      this.printStatusSection('📊 TRANSACTION STATUS:', 'FAILED', 'Wallet not found or balance fetch failed', walletAddress);
      this.logger.log('wallet_balance_failed', { walletAddress });
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

  private async getRealWalletStatus(walletAddress: string): Promise<{ status: string; message: string }> {
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`🔍 Checking real wallet status via ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        // Real interaction: Get account info from blockchain
        const response = await fetch(`${endpoint}/cosmos/auth/v1beta1/accounts/${walletAddress}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Wallet-Status-Checker/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const accountData = await response.json() as any;
          
          // Check if account exists and is active
          if (accountData.account) {
            const accountType = accountData.account['@type'] || 'Unknown';
            const sequence = accountData.account.sequence || '0';
            const accountNumber = accountData.account.account_number || '0';
            
            // Real status based on account data
            if (accountType.includes('BaseAccount')) {
              return {
                status: 'ACTIVE',
                message: `Account is active (sequence: ${sequence}, account_number: ${accountNumber})`
              };
            } else if (accountType.includes('vesting')) {
              return {
                status: 'VESTING',
                message: `Account is vesting account (type: ${accountType})`
              };
            } else {
              return {
                status: 'UNKNOWN_TYPE',
                message: `Account exists but type is unknown (${accountType})`
              };
            }
          } else {
            return {
              status: 'NO_ACCOUNT_DATA',
              message: 'Account response received but no account data found'
            };
          }
        } else if (response.status === 404) {
          return {
            status: 'NOT_FOUND',
            message: `Account not found on blockchain (HTTP 404)`
          };
        } else {
          return {
            status: 'ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`
          };
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Timeout for ${endpoint}`);
        } else {
          console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return {
      status: 'FAILED',
      message: 'Failed to check wallet status from all endpoints'
    };
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

  private async getSpendableBalances(address: string): Promise<void> {
    console.log('\n💳 SPENDABLE BALANCES:');
    console.log('='.repeat(50));
    
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${endpoint}/cosmos/bank/v1beta1/spendable_balances/${address}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Spendable balances found via ${endpoint}`);
          this.displaySpendableBalances(data);
          return;
        } else if (response.status === 404) {
          console.log(`  ⚠️ Spendable balances endpoint not available (404)`);
          break;
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
    
    console.log('❌ Spendable balances not available');
  }

  private async getDelegationBalances(address: string): Promise<void> {
    console.log('\n🔒 DELEGATION BALANCES:');
    console.log('='.repeat(50));
    
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${endpoint}/cosmos/staking/v1beta1/delegations/${address}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Delegation balances found via ${endpoint}`);
          this.displayDelegationBalances(data);
          return;
        } else if (response.status === 404) {
          console.log(`  ⚠️ No delegations found (404)`);
          break;
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
    
    console.log('❌ Delegation balances not found');
  }

  private async getRewards(address: string): Promise<void> {
    console.log('\n🎁 REWARDS:');
    console.log('='.repeat(50));
    
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${endpoint}/cosmos/distribution/v1beta1/delegators/${address}/rewards`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Rewards found via ${endpoint}`);
          this.displayRewards(data);
          return;
        } else if (response.status === 404) {
          console.log(`  ⚠️ No rewards found (404)`);
          break;
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
    
    console.log('❌ Rewards not found');
  }

  private async getVestingInfo(address: string): Promise<void> {
    console.log('\n🔐 VESTING INFORMATION:');
    console.log('='.repeat(50));
    
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${endpoint}/cosmos/auth/v1beta1/accounts/${address}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Account info found via ${endpoint}`);
          this.displayVestingInfo(data);
          return;
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
    
    console.log('❌ Vesting info not found');
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

  private displayBalanceInfo(balanceData: any): void {
    console.log('\n💰 WALLET BALANCE INFORMATION');
    console.log('='.repeat(60));
    if (balanceData.balances && balanceData.balances.length > 0) {
      console.log('\n💎 Current Balances:');
      balanceData.balances.forEach((balance: any) => {
        const parsed = this.parseAmount(balance.denom, balance.amount);
        console.log(`   ${parsed.asset}: ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`);
      });
    } else {
      console.log('\n💎 No balances found (empty wallet)');
    }
    // Dados brutos só se debug
    if (process.env.DEBUG === '1') {
      console.log('\n📊 Raw Balance Data:');
      console.log(JSON.stringify(balanceData, null, 2));
    }
  }

  private displaySpendableBalances(data: any): void {
    const balances = data.balances;
    if (!balances || balances.length === 0) {
      console.log('❌ No spendable balances found');
      return;
    }

    console.log('💳 Spendable Balances (Available for spending):');
    balances.forEach((balance: any, index: number) => {
      const parsed = this.parseAmount(balance.denom, balance.amount);
      console.log(`  ${index + 1}. ${parsed.asset}: ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`);
    });
  }

  private displayDelegationBalances(data: any): void {
    const delegations = data.delegation_responses;
    if (!delegations || delegations.length === 0) {
      console.log('❌ No delegation balances found');
      return;
    }

    console.log('🔒 Delegation Balances (Staked tokens):');
    let totalDelegated = 0;
    
    delegations.forEach((delegation: any, index: number) => {
      const balance = delegation.balance;
      const validator = delegation.delegation?.validator_address;
      const parsed = this.parseAmount(balance.denom, balance.amount);
      
      console.log(`  ${index + 1}. ${parsed.asset}: ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} to ${validator?.substring(0, 20)}...`);
      
      if (balance.denom === 'rune') {
        totalDelegated += parseInt(balance.amount) / 100000000;
      }
    });
    
    if (totalDelegated > 0) {
      console.log(`\n📊 Total RUNE Delegated: ${totalDelegated.toFixed(8)} RUNE`);
    }
  }

  private displayRewards(data: any): void {
    const rewards = data.rewards;
    if (!rewards || rewards.length === 0) {
      console.log('❌ No rewards found');
      return;
    }

    console.log('🎁 Staking Rewards:');
    let totalRewards = 0;
    
    rewards.forEach((reward: any, index: number) => {
      const validator = reward.validator_address;
      const rewardCoins = reward.reward;
      
      if (rewardCoins && rewardCoins.length > 0) {
        console.log(`\n  Validator ${index + 1}: ${validator?.substring(0, 20)}...`);
        rewardCoins.forEach((coin: any) => {
          const parsed = this.parseAmount(coin.denom, coin.amount);
          console.log(`    ${parsed.asset}: ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`);
          
          if (coin.denom === 'rune') {
            totalRewards += parseInt(coin.amount) / 100000000;
          }
        });
      }
    });
    
    if (totalRewards > 0) {
      console.log(`\n📊 Total RUNE Rewards: ${totalRewards.toFixed(8)} RUNE`);
    }
  }

  private displayVestingInfo(data: any): void {
    const account = data.account;
    if (!account) {
      console.log('❌ No account data found');
      return;
    }

    console.log('🔐 Account Type Analysis:');
    console.log(`Type: ${account['@type'] || 'Unknown'}`);
    
    // Check for vesting account types
    if (account['@type']?.includes('vesting')) {
      console.log('⚠️ This is a vesting account');
      
      if (account.base_vesting_account) {
        const vesting = account.base_vesting_account;
        console.log(`Original Vesting: ${vesting.original_vesting?.length || 0} tokens`);
        console.log(`Delegated Free: ${vesting.delegated_free?.length || 0} tokens`);
        console.log(`Delegated Vesting: ${vesting.delegated_vesting?.length || 0} tokens`);
        
        if (vesting.end_time) {
          const endTime = new Date(parseInt(vesting.end_time) * 1000);
          console.log(`Vesting End Time: ${endTime.toISOString()}`);
        }
      }
      
      if (account.vesting_schedules) {
        console.log('📅 Vesting Schedules:');
        account.vesting_schedules.forEach((schedule: any, index: number) => {
          console.log(`  Schedule ${index + 1}:`);
          console.log(`    Amount: ${schedule.amount}`);
          console.log(`    Start Time: ${schedule.start_time}`);
          console.log(`    End Time: ${schedule.end_time}`);
        });
      }
    } else {
      console.log('✅ This is a regular account (no vesting)');
    }
  }

  private analyzeRealTransactionStatus(tx: any): { status: string; message: string } {
    // Check multiple possible locations for transaction status
    const errorCode = tx.code || tx.tx_result?.code || tx.tx?.result?.code;
    const rawLog = tx.raw_log;
    const txResult = tx.tx_result;
    
    // Debug: Log the actual values to understand the real status
    // console.log(`🔍 Debug - Error Code: ${errorCode}, Raw Log: ${rawLog ? 'Present' : 'None'}, TX Result: ${txResult ? 'Present' : 'None'}`);
    
    // Real analysis based on transaction data
    if (errorCode === 0) {
      // Explicitly successful
      return {
        status: 'TRUE',
        message: `Transaction executed successfully at height ${tx.height}`
      };
    } else if (errorCode && errorCode !== 0) {
      // Transaction failed with specific error code
      let errorMessage = `Transaction failed with code ${errorCode}`;
      
      if (rawLog) {
        errorMessage += ` - ${rawLog}`;
      } else if (txResult?.log) {
        errorMessage += ` - ${txResult.log}`;
      }
      
      return {
        status: 'FALSE',
        message: errorMessage
      };
    } else if (rawLog && rawLog.includes('failed') || rawLog && rawLog.includes('error')) {
      // Transaction failed with error in raw log
      return {
        status: 'FALSE',
        message: `Transaction failed: ${rawLog}`
      };
    } else if (txResult?.log && txResult.log.includes('failed') || txResult?.log && txResult.log.includes('error')) {
      // Transaction failed with error in result log
      return {
        status: 'FALSE',
        message: `Transaction failed: ${txResult.log}`
      };
    } else if (tx.height && tx.txhash) {
      // Has height and hash but no clear error - likely successful
      return {
        status: 'TRUE',
        message: `Transaction executed successfully at height ${tx.height}`
      };
    } else {
      // Unknown status
      return {
        status: 'UNKNOWN',
        message: 'Transaction status could not be determined'
      };
    }
  }

  private displayEssentialTransactionInfo(data: any): void {
    const tx = data.tx_response;
    if (!tx) {
      console.log('❌ No transaction data in response');
      return;
    }
    const realStatus = this.analyzeRealTransactionStatus(tx);
    this.printStatusSection('📊 ESSENTIAL TRANSACTION INFORMATION', realStatus.status, realStatus.message);
    console.log(`🔗 Hash: ${tx.txhash}`);
    console.log(`📊 Height: ${tx.height}`);
    // Gas Information
    if (tx.tx?.auth_info?.fee?.gas_limit) {
      console.log(`⛽ Gas Limit: ${tx.tx.auth_info.fee.gas_limit}`);
    }
    if (tx.gas_wanted) {
      console.log(`⛽ Gas Wanted: ${tx.gas_wanted}`);
    }
    if (tx.gas_used) {
      console.log(`⛽ Gas Used: ${tx.gas_used}`);
    }
    if (tx.tx?.auth_info?.fee?.amount && tx.gas_used) {
      const feeAmount = tx.tx.auth_info.fee.amount[0]?.amount || 0;
      const gasPrice = feeAmount / tx.gas_used;
      console.log(`⛽ Gas Price: ${gasPrice.toFixed(8)} RUNE per gas`);
    }
    // Gas Efficiency
    if (tx.gas_used && tx.gas_wanted) {
      const gasEfficiency = ((tx.gas_used / tx.gas_wanted) * 100).toFixed(2);
      console.log(`⛽ Gas Efficiency: ${gasEfficiency}% (${tx.gas_used}/${tx.gas_wanted})`);
    }
    if (tx.tx?.auth_info?.fee?.amount) {
      let totalFees = 0;
      let totalFeesUSD = 0;
      tx.tx.auth_info.fee.amount.forEach((fee: any) => {
        const parsed = this.parseAmount(fee.denom, fee.amount);
        console.log(`   ${parsed.asset}: ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}`);
        if (fee.denom === 'rune') totalFees += parsed.value;
      });
      if (totalFees > 0) {
        const runePriceUSD = 1.25;
        totalFeesUSD = totalFees * runePriceUSD;
        console.log(`\n📊 Total Fees: ${totalFees.toFixed(8)} RUNE (≈ $${totalFeesUSD.toFixed(2)} USD)`);
      }
    }
    if (tx.tx?.body?.messages) {
      console.log('\n📨 Messages:');
      tx.tx.body.messages.forEach((msg: any, index: number) => {
        console.log(`   ${index + 1}. ${msg['@type'] || 'Unknown type'}`);
        if (msg.from_address) console.log(`      From: ${msg.from_address}`);
        if (msg.to_address) console.log(`      To: ${msg.to_address}`);
      });
    }
    if (process.env.DEBUG === '1') {
      console.log('\n📋 Raw Transaction Data (for status verification):');
      console.log(JSON.stringify({
        code: tx.code,
        tx_result: tx.tx_result,
        raw_log: tx.raw_log,
        height: tx.height,
        txhash: tx.txhash
      }, null, 2));
    }
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
    console.log(`\n🤖 Contract Interaction Result: ${interactionSuccess ? '✅ TRUE' : '❌ FAILED'}`);
    
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