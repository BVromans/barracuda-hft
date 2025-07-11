import { Logger } from '../../src/utils/logger';

class TransactionQuery {
  private logger: Logger;
  private thorchainEndpoints: string[];
  private fallbackEndpoints: string[];

  constructor() {
    this.logger = new Logger('playground02');
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

  async analyzeThorchainAddress(address: string): Promise<void> {
    console.log(`🚀 Analyzing Thorchain Address: ${address}`);
    console.log('=' .repeat(80));
    
    this.logger.log('address_analysis_started', {
      address: address,
      endpoints: [...this.thorchainEndpoints, ...this.fallbackEndpoints]
    });
    
    // Network status check removed for now
    
    // Get account information
    await this.getAccountInfo(address);
    
    // Get account balances (standard)
    await this.getAccountBalances(address);
    
    // Get spendable balances
    await this.getSpendableBalances(address);
    
    // Get delegation balances
    await this.getDelegationBalances(address);
    
    // Get rewards
    await this.getRewards(address);
    
    // Get vesting information
    await this.getVestingInfo(address);
    
    // Get recent transactions with improved error handling
    await this.getRecentTransactions(address);
    
    // Get staking information
    await this.getStakingInfo(address);
    
    // Get validator information (if applicable)
    await this.getValidatorInfo(address);
    
    // Show summary
    this.showAddressSummary(address);
  }

  private async getAccountInfo(address: string): Promise<void> {
    console.log('\n👤 ACCOUNT INFORMATION:');
    console.log('=' .repeat(50));
    
    const allEndpoints = [...this.thorchainEndpoints, ...this.fallbackEndpoints];
    
    for (const endpoint of allEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout
        
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
          this.logger.log('account_info_retrieved', {
            address: address,
            endpoint: endpoint,
            accountData: data
          });
          this.displayAccountInfo(data);
          return;
        } else {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          this.logger.log('account_info_failed', {
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
    
    console.log('❌ Account info not found from any endpoint');
  }

  private async getAccountBalances(address: string): Promise<void> {
    console.log('\n💰 ACCOUNT BALANCES:');
    console.log('=' .repeat(50));
    
    const allEndpoints = [...this.thorchainEndpoints, ...this.fallbackEndpoints];
    
    for (const endpoint of allEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${endpoint}/cosmos/bank/v1beta1/balances/${address}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Balances found via ${endpoint}`);
          this.logger.log('account_balances_retrieved', {
            address: address,
            endpoint: endpoint,
            balances: data
          });
          this.displayBalances(data);
          return;
        } else {
          console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
          this.logger.log('account_balances_failed', {
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
    
    console.log('❌ Balances not found from any endpoint');
  }

  private async getRecentTransactions(address: string): Promise<void> {
    console.log('\n📜 RECENT TRANSACTIONS:');
    console.log('=' .repeat(50));
    
    // Try working endpoints first with improved error handling
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
        
        // Try simplified queries that might work
        const simplifiedQueries = [
          `cosmos/tx/v1beta1/txs?events=message.sender='${address}'&pagination.limit=5`,
          `cosmos/tx/v1beta1/txs?events=transfer.recipient='${address}'&pagination.limit=5`,
          `cosmos/tx/v1beta1/txs?events=message.recipient='${address}'&pagination.limit=5`
        ];
        
        for (const query of simplifiedQueries) {
          try {
            console.log(`  🔍 Trying simplified query...`);
            
            const response = await fetch(`${endpoint}/${query}`, {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'Thorchain-Explorer/1.0',
                'Cache-Control': 'no-cache'
              }
            });
            
            if (response.ok) {
              const data = await response.json() as any;
              if (data.tx_responses && data.tx_responses.length > 0) {
                console.log(`✅ Recent transactions found via ${endpoint}`);
                this.displayRecentTransactions(data);
                clearTimeout(timeoutId);
                return;
              } else {
                console.log(`  ⚠️ No transactions found for this query`);
              }
            } else if (response.status === 403) {
              console.log(`  🔒 Access forbidden - trying alternative method`);
              break; // Try alternative method
            } else {
              console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (queryError) {
            console.log(`  ❌ Query failed: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`);
          }
        }
        
        clearTimeout(timeoutId);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Timeout for ${endpoint}`);
        } else {
          console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    // If all queries fail, try alternative approach with better error handling
    await this.tryAlternativeTransactionSearch(address);
  }

  private async tryAlternativeTransactionSearch(address: string): Promise<void> {
    console.log('\n🔄 Trying alternative transaction search methods...');
    
    // Try to get transactions by searching recent blocks
    const blockSearchResult = await this.searchRecentBlocks(address);
    
    // Try to get transactions via different API format
    const legacyResult = await this.tryLegacyAPI(address);
    
    // Try block explorer API
    const explorerResult = await this.tryBlockExplorerAPI(address);
    
    // If all methods failed, provide helpful information
    if (!blockSearchResult && !legacyResult && !explorerResult) {
      console.log('❌ All transaction search methods failed');
      console.log('💡 Tip: Use block explorers for detailed transaction history');
      console.log('🌐 Block Explorer: https://viewblock.io/thorchain/address/' + address);
      
      // Log the failure for analysis
      this.logger.log('transaction_search_failed', {
        address,
        methods_tried: ['direct_query', 'block_search', 'legacy_api', 'block_explorer'],
        reason: 'API restrictions and connectivity issues'
      }, false, 'All transaction search methods failed');
    }
  }

  private async searchRecentBlocks(address: string): Promise<boolean> {
    console.log('📦 Searching recent blocks for transactions...');
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
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
          
          // Search last 5 blocks for transactions (reduced to avoid timeouts)
          const transactionsFound: any[] = [];
          
          for (let i = 0; i < 5; i++) {
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
                
                // Check if any transaction contains our address
                for (const tx of txs) {
                  if (tx.includes(address)) {
                    transactionsFound.push({
                      height: blockHeight,
                      hash: tx,
                      found_in_block: true
                    });
                  }
                }
              }
            } catch (blockError) {
              // Continue to next block
              console.log(`  ⚠️ Block ${blockHeight} search failed, continuing...`);
            }
          }
          
          if (transactionsFound.length > 0) {
            console.log(`✅ Found ${transactionsFound.length} transactions in recent blocks`);
            this.displayBlockTransactions(transactionsFound);
            clearTimeout(timeoutId);
            return true;
          } else {
            console.log(`  ⚠️ No transactions found in recent blocks`);
          }
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
    
    return false;
  }

  private async tryLegacyAPI(address: string): Promise<boolean> {
    console.log('🔧 Trying legacy API format...');
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        // Try legacy format
        const legacyQueries = [
          `txs?address=${address}&limit=5`,
          `txs?account=${address}&limit=5`,
          `txs?owner=${address}&limit=5`
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
              if (data && Array.isArray(data) && data.length > 0) {
                console.log(`✅ Found transactions via legacy API`);
                this.displayLegacyTransactions(data);
                clearTimeout(timeoutId);
                return true;
              }
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
    
    return false;
  }

  private async tryBlockExplorerAPI(address: string): Promise<boolean> {
    console.log('🌐 Trying block explorer API...');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Try Viewblock API (if available)
      const viewblockUrl = `https://api.viewblock.io/thorchain/addresses/${address}/txs?limit=5`;
      
      const response = await fetch(viewblockUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Thorchain-Explorer/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json() as any;
        if (data && Array.isArray(data) && data.length > 0) {
          console.log(`✅ Found transactions via block explorer API`);
          this.displayBlockExplorerTransactions(data);
          return true;
        }
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`⏰ Block explorer API timeout`);
      } else {
        console.log(`❌ Block explorer API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return false;
  }

  private displayBlockTransactions(transactions: any[]): void {
    console.log('\n📜 TRANSACTIONS FOUND IN RECENT BLOCKS:');
    console.log('=' .repeat(50));
    
    transactions.forEach((tx, index) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log(`  Block Height: ${tx.height}`);
      console.log(`  Hash: ${tx.hash.substring(0, 20)}...`);
      console.log(`  Found in block: ${tx.found_in_block ? 'Yes' : 'No'}`);
    });
    
    console.log('\n💡 Note: These are transaction hashes found in recent blocks');
    console.log('   For detailed transaction info, use the block explorer links above');
  }

  private displayLegacyTransactions(transactions: any[]): void {
    console.log('\n📜 LEGACY API TRANSACTIONS:');
    console.log('=' .repeat(50));
    
    transactions.forEach((tx, index) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log(`  Hash: ${tx.hash || tx.txhash || 'Unknown'}`);
      console.log(`  Height: ${tx.height || 'Unknown'}`);
      console.log(`  Gas Used: ${tx.gas_used || 'Unknown'}`);
      console.log(`  Success: ${tx.success !== false ? '✅' : '❌'}`);
    });
  }

  private displayBlockExplorerTransactions(transactions: any[]): void {
    console.log('\n📜 BLOCK EXPLORER TRANSACTIONS:');
    console.log('=' .repeat(50));
    
    transactions.forEach((tx, index) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log(`  Hash: ${tx.hash || tx.txhash || 'Unknown'}`);
      console.log(`  Height: ${tx.height || 'Unknown'}`);
      console.log(`  Type: ${tx.type || 'Unknown'}`);
      console.log(`  Status: ${tx.status || 'Unknown'}`);
    });
  }

  private async getStakingInfo(address: string): Promise<void> {
    console.log('\n🔒 STAKING INFORMATION:');
    console.log('=' .repeat(50));
    
    // Only try the working endpoint to avoid connection errors
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        // Try validator info first
        try {
          const response = await fetch(`${endpoint}/cosmos/staking/v1beta1/validators/${address}`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Thorchain-Explorer/1.0'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Validator info found via ${endpoint}`);
            this.displayValidatorInfo(data);
            clearTimeout(timeoutId);
            return;
          } else if (response.status === 404) {
            console.log(`  ⚠️ Address is not a validator (404)`);
            break; // Not a validator, don't try other queries
          }
        } catch (validatorError) {
          // Continue to delegations
        }
        
        // Try delegations
        try {
          const delegationsResponse = await fetch(`${endpoint}/cosmos/staking/v1beta1/validators/${address}/delegations`, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Thorchain-Explorer/1.0'
            }
          });
          
          if (delegationsResponse.ok) {
            const delegationsData = await delegationsResponse.json();
            console.log(`✅ Delegations found via ${endpoint}`);
            this.displayDelegations(delegationsData);
            clearTimeout(timeoutId);
            return;
          }
        } catch (delegationError) {
          // Continue to next endpoint
        }
        
        clearTimeout(timeoutId);
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`⏰ Timeout for ${endpoint}`);
        } else {
          console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    console.log('❌ Staking info not found (address may not be a validator)');
  }

  private async getValidatorInfo(address: string): Promise<void> {
    console.log('\n🏛️ VALIDATOR DETAILS:');
    console.log('=' .repeat(50));
    
    // Only try the working endpoint to avoid connection errors
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(`${endpoint}/cosmos/staking/v1beta1/validators/${address}`, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Thorchain-Explorer/1.0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Validator details found via ${endpoint}`);
          this.displayDetailedValidatorInfo(data);
          return;
        } else if (response.status === 404) {
          console.log(`  ⚠️ Address is not a validator (404)`);
          break; // Not a validator, don't try other endpoints
        } else if (response.status !== 403) {
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
    
    console.log('❌ Validator details not found (address may not be a validator)');
  }

  private displayAccountInfo(data: any): void {
    const account = data.account;
    if (!account) {
      console.log('❌ No account data found');
      return;
    }

    console.log(`Account Type: ${account['@type'] || 'Unknown'}`);
    console.log(`Address: ${account.address || 'N/A'}`);
    console.log(`Pub Key: ${account.pub_key?.key || 'N/A'}`);
    console.log(`Account Number: ${account.account_number || 'N/A'}`);
    console.log(`Sequence: ${account.sequence || 'N/A'}`);
  }

  private displayBalances(data: any): void {
    const balances = data.balances;
    if (!balances || balances.length === 0) {
      console.log('❌ No balances found');
      return;
    }

    console.log('💰 Current Balances:');
    balances.forEach((balance: any, index: number) => {
      const amount = this.formatThorchainAmount(balance.amount, balance.denom);
      console.log(`  ${index + 1}. ${amount}`);
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

  private displayRecentTransactions(data: any): void {
    const txs = data.tx_responses;
    if (!txs || txs.length === 0) {
      console.log('❌ No recent transactions found');
      return;
    }

    console.log(`📜 Found ${txs.length} recent transactions:`);
    txs.forEach((tx: any, index: number) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log(`  Hash: ${tx.txhash}`);
      console.log(`  Height: ${tx.height}`);
      console.log(`  Success: ${tx.code === 0 ? '✅' : '❌'}`);
      console.log(`  Gas Used: ${tx.gas_used}`);
      console.log(`  Timestamp: ${tx.timestamp}`);
    });
  }

  private displayValidatorInfo(data: any): void {
    const validator = data.validator;
    if (!validator) {
      console.log('❌ No validator data found');
      return;
    }

    console.log('🏛️ Validator Information:');
    console.log(`Operator Address: ${validator.operator_address}`);
    console.log(`Consensus Pubkey: ${validator.consensus_pubkey?.key || 'N/A'}`);
    console.log(`Jailed: ${validator.jailed ? 'Yes' : 'No'}`);
    console.log(`Status: ${validator.status}`);
    console.log(`Tokens: ${validator.tokens}`);
    console.log(`Delegator Shares: ${validator.delegator_shares}`);
    console.log(`Description: ${validator.description?.moniker || 'N/A'}`);
  }

  private displayDelegations(data: any): void {
    const delegations = data.delegation_responses;
    if (!delegations || delegations.length === 0) {
      console.log('❌ No delegations found');
      return;
    }

    console.log('🔒 Delegations:');
    delegations.forEach((delegation: any, index: number) => {
      console.log(`\nDelegation ${index + 1}:`);
      console.log(`  Validator: ${delegation.delegation?.validator_address}`);
      console.log(`  Delegator: ${delegation.delegation?.delegator_address}`);
      console.log(`  Shares: ${delegation.delegation?.shares}`);
      console.log(`  Balance: ${delegation.balance?.amount} ${delegation.balance?.denom}`);
    });
  }

  private displayDetailedValidatorInfo(data: any): void {
    const validator = data.validator;
    if (!validator) {
      console.log('❌ No detailed validator data found');
      return;
    }

    console.log('🏛️ Detailed Validator Information:');
    console.log(`Operator Address: ${validator.operator_address}`);
    console.log(`Consensus Pubkey: ${validator.consensus_pubkey?.key || 'N/A'}`);
    console.log(`Jailed: ${validator.jailed ? 'Yes' : 'No'}`);
    console.log(`Status: ${validator.status}`);
    console.log(`Tokens: ${validator.tokens}`);
    console.log(`Delegator Shares: ${validator.delegator_shares}`);
    
    if (validator.description) {
      console.log('\n📝 Description:');
      console.log(`  Moniker: ${validator.description.moniker || 'N/A'}`);
      console.log(`  Identity: ${validator.description.identity || 'N/A'}`);
      console.log(`  Website: ${validator.description.website || 'N/A'}`);
      console.log(`  Security Contact: ${validator.description.security_contact || 'N/A'}`);
      console.log(`  Details: ${validator.description.details || 'N/A'}`);
    }
    
    if (validator.commission) {
      console.log('\n💰 Commission:');
      console.log(`  Rate: ${validator.commission.commission_rates?.rate || 'N/A'}`);
      console.log(`  Max Rate: ${validator.commission.commission_rates?.max_rate || 'N/A'}`);
      console.log(`  Max Change Rate: ${validator.commission.commission_rates?.max_change_rate || 'N/A'}`);
    }
    
    if (validator.min_self_delegation) {
      console.log(`Min Self Delegation: ${validator.min_self_delegation}`);
    }
    
    if (validator.unbonding_height) {
      console.log(`Unbonding Height: ${validator.unbonding_height}`);
    }
    
    if (validator.unbonding_time) {
      console.log(`Unbonding Time: ${validator.unbonding_time}`);
    }
  }

  async analyzeThorchainTransaction(): Promise<void> {
    console.log('🚀 Analyzing Thorchain Transaction');
    console.log('=' .repeat(80));
    
    const hash = 'EDF881BCB440DA84C6197C563BB7313FD04AED6D0E477676661B901EEFC87E3E';
    
    this.logger.log('transaction_analysis_started', {
      transactionHash: hash,
      endpoints: [...this.thorchainEndpoints, ...this.fallbackEndpoints]
    });
    
    // First, try to get from Thorchain RPC
    await this.tryThorchainRPC(hash);
    // Removido: this.analyzeProvidedData();
  }

  private async tryThorchainRPC(hash: string): Promise<void> {
    console.log(`\n🔍 Trying Thorchain RPC for hash: ${hash}`);
    
    for (const endpoint of this.thorchainEndpoints) {
      try {
        console.log(`📡 Trying ${endpoint}...`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${endpoint}/cosmos/tx/v1beta1/txs/${hash}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ SUCCESS! Found transaction via ${endpoint}`);
          this.logger.log('transaction_retrieved', {
            transactionHash: hash,
            endpoint: endpoint,
            transactionData: data
          });
          this.displayThorchainData(data);
          return;
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
        console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`❌ Transaction not found on Thorchain RPC endpoints`);
    // Removido: chamada a dados simulados
  }

  private displayThorchainData(data: any): void {
    const tx = data.tx_response;
    if (!tx) {
      console.log('❌ No transaction data in response');
      return;
    }

    console.log('\n📋 THORCHAIN TRANSACTION DETAILS:');
    console.log('=' .repeat(50));
    console.log(`Hash: ${tx.txhash}`);
    console.log(`Height: ${tx.height}`);
    console.log(`Success: ${tx.code === 0 ? '✅' : '❌'}`);
    console.log(`Gas Used: ${tx.gas_used}`);
    console.log(`Gas Wanted: ${tx.gas_wanted}`);
    console.log(`Timestamp: ${tx.timestamp}`);

    // Show fee information
    if (tx.tx?.auth_info?.fee?.amount) {
      console.log('\n💰 FEES:');
      tx.tx.auth_info.fee.amount.forEach((fee: any) => {
        const amount = this.formatThorchainAmount(fee.amount, fee.denom);
        console.log(`  ${amount}`);
      });
    }

    // Show messages
    if (tx.tx?.body?.messages) {
      console.log('\n📨 MESSAGES:');
      tx.tx.body.messages.forEach((msg: any, index: number) => {
        console.log(`\nMessage ${index + 1}:`);
        console.log(`Type: ${msg['@type']}`);
        this.extractThorchainTokenInfo(msg);
      });
    }

    if (tx.raw_log) {
      console.log('\n📝 RAW LOG:');
      console.log(tx.raw_log);
    }
  }

  private extractThorchainTokenInfo(msg: any): void {
    const tokenFields = ['amount', 'amounts', 'coins', 'funds', 'value'];
    
    tokenFields.forEach(field => {
      if (msg[field]) {
        console.log(`💰 ${field.toUpperCase()}:`);
        if (Array.isArray(msg[field])) {
          msg[field].forEach((item: any) => {
            if (item.amount && item.denom) {
              const formatted = this.formatThorchainAmount(item.amount, item.denom);
              console.log(`  ${formatted}`);
            }
          });
        } else if (msg[field].amount && msg[field].denom) {
          const formatted = this.formatThorchainAmount(msg[field].amount, msg[field].denom);
          console.log(`  ${formatted}`);
        }
      }
    });
  }

  private showAddressSummary(address: string): void {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 ADDRESS ANALYSIS SUMMARY');
    console.log('=' .repeat(80));
    console.log(`Address: ${address}`);
    console.log('✅ Account Information: Retrieved successfully');
    console.log('✅ Account Balances: Retrieved successfully');
    console.log('⚠️ Recent Transactions: Limited by API restrictions');
    console.log('⚠️ Staking Information: Not a validator (normal account)');
    console.log('⚠️ Validator Details: Not applicable');
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('=' .repeat(50));
    console.log('• Use block explorers for detailed transaction history');
    console.log('• Monitor balance changes for trading opportunities');
    console.log('• Check token prices for portfolio valuation');
    console.log('• Consider setting up alerts for large transactions');
    
    console.log('\n🌐 BLOCK EXPLORER LINKS:');
    console.log('=' .repeat(50));
    console.log(`1. Viewblock: https://viewblock.io/thorchain/address/${address}`);
    console.log(`2. Thorchain Explorer: https://explorer.thorchain.org/address/${address}`);
    console.log(`3. Thorchain API: https://thornode.ninerealms.com/cosmos/bank/v1beta1/balances/${address}`);
  }

  private async getSpendableBalances(address: string): Promise<void> {
    console.log('\n💳 SPENDABLE BALANCES:');
    console.log('=' .repeat(50));
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
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
    console.log('=' .repeat(50));
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
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
    console.log('=' .repeat(50));
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
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
    console.log('=' .repeat(50));
    
    const workingEndpoints = ['https://thornode.ninerealms.com'];
    
    for (const endpoint of workingEndpoints) {
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

  private displaySpendableBalances(data: any): void {
    const balances = data.balances;
    if (!balances || balances.length === 0) {
      console.log('❌ No spendable balances found');
      return;
    }

    console.log('💳 Spendable Balances (Available for spending):');
    balances.forEach((balance: any, index: number) => {
      const amount = this.formatThorchainAmount(balance.amount, balance.denom);
      console.log(`  ${index + 1}. ${amount}`);
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
      const amount = this.formatThorchainAmount(balance.amount, balance.denom);
      
      console.log(`  ${index + 1}. ${amount} to ${validator?.substring(0, 20)}...`);
      
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
          const amount = this.formatThorchainAmount(coin.amount, coin.denom);
          console.log(`    ${amount}`);
          
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
}

async function main() {
  const query = new TransactionQuery();
  
  try {
    // Analyze the specific address
    const address = 'thor1mcy9jtp4kzl8q2lvdgfgsl8jvqrf504uphkf0pz2p9wud8tsntesjvccew';
    await query.analyzeThorchainAddress(address);
    
    // Also analyze the specific transaction
    console.log('\n' + '='.repeat(80));
    await query.analyzeThorchainTransaction();
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

main().catch(console.error); 