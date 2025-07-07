import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { config } from "dotenv";

config({ path: ".env" });

// Thorchain contract address
const THORCHAIN_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';

// Thorchain RPC endpoint (mainnet)
const THORCHAIN_RPC_URL = process.env.RPC_ENDPOINT || '';

// Required environment variables
const requiredEnvironmentVariables = [
    THORCHAIN_CONTRACT_ADDRESS,
    THORCHAIN_RPC_URL
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(varName => !process.env[varName]);

if (missingEnvironmentVariables.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`);
    process.exit(1);
}

interface OrderBookEntry {
    price: string;
    amount: string;
    total: string;
}

interface OrderBook {
    asks: OrderBookEntry[];
    bids: OrderBookEntry[];
    lastUpdateId: string;
}

interface PoolInfo {
    asset: string;
    runeDepth: string;
    assetDepth: string;
    assetPrice: string;
    assetPriceUSD: string;
    runePriceUSD: string;
    poolAPY: string;
    status: string;
}

interface SwapQuote {
    inputAmount: string;
    outputAmount: string;
    fee: string;
    slip: string;
    priceImpact: string;
}

async function main() {
    console.log('Playground 05 - Thorchain Contract Testing (Rujira Project)\n');
    console.log('Contract Address:', THORCHAIN_CONTRACT_ADDRESS);
    console.log('RPC URL:', THORCHAIN_RPC_URL);
    console.log('');

    try {
        // Simulate wallet for testing purposes
        const testWalletAddress = 'thor1testwalletaddressforplayground';
        console.log('Test Wallet Address:', testWalletAddress);
        console.log('');

        // Create read-only client for queries
        let queryClient: CosmWasmClient | null = null;
        try {
            queryClient = await CosmWasmClient.connect(THORCHAIN_RPC_URL);
            console.log('✅ Connected to Thorchain RPC');
        } catch (error) {
            console.log('⚠️  Could not connect to Thorchain RPC, running in simulation mode only');
            console.log('Error:', error);
        }

        // Test 1: Query contract info
        console.log('\n📋 Test 1: Query Contract Info');
        if (queryClient) {
            try {
                const contractInfo = await queryClient.getContract(THORCHAIN_CONTRACT_ADDRESS);
                console.log('Contract Info:', {
                    address: contractInfo.address,
                    codeId: contractInfo.codeId,
                    creator: contractInfo.creator,
                    admin: contractInfo.admin,
                    label: contractInfo.label,
                    ibcPortId: contractInfo.ibcPortId
                });
            } catch (error) {
                console.log('❌ Could not fetch contract info:', error);
            }
        } else {
            console.log('⚠️  Skipping contract info query (no connection)');
        }

        // Test 2: Query contract balance
        console.log('\n💰 Test 2: Query Contract Balance');
        if (queryClient) {
            try {
                const balance = await queryClient.getBalance(THORCHAIN_CONTRACT_ADDRESS, 'rune');
                console.log('Contract RUNE Balance:', {
                    amount: balance.amount,
                    denom: balance.denom
                });
            } catch (error) {
                console.log('❌ Could not fetch contract balance:', error);
            }
        } else {
            console.log('⚠️  Skipping contract balance query (no connection)');
        }

        // Test 3: Query strategy (real contract interaction)
        console.log('\n📊 Test 3: Query Strategy (Real Contract Interaction)');
        if (queryClient) {
            try {
                const strategyQuery = {
                    strategy: {}
                };

                const strategyResult = await queryClient.queryContractSmart(
                    THORCHAIN_CONTRACT_ADDRESS,
                    strategyQuery
                );
                console.log('✅ Strategy Query Result:', JSON.stringify(strategyResult, null, 2));
            } catch (error) {
                console.log('❌ Strategy query failed:', error);
            }
        } else {
            console.log('⚠️  Skipping strategy query (no connection)');
        }
        
        // Simulate order book data for demonstration
        const simulatedOrderBook: OrderBook = {
            asks: [
                { price: '0.00012345', amount: '1000.0', total: '0.12345' },
                { price: '0.00012350', amount: '500.0', total: '0.06175' },
                { price: '0.00012355', amount: '750.0', total: '0.09266' }
            ],
            bids: [
                { price: '0.00012340', amount: '1200.0', total: '0.14808' },
                { price: '0.00012335', amount: '800.0', total: '0.09868' },
                { price: '0.00012330', amount: '600.0', total: '0.07398' }
            ],
            lastUpdateId: '123456789'
        };
        
        console.log('📊 Simulated Order Book:');
        console.log('Asks (Sell Orders):');
        simulatedOrderBook.asks.forEach((ask, index) => {
            console.log(`  ${index + 1}. Price: ${ask.price} | Amount: ${ask.amount} | Total: ${ask.total}`);
        });
        
        console.log('Bids (Buy Orders):');
        simulatedOrderBook.bids.forEach((bid, index) => {
            console.log(`  ${index + 1}. Price: ${bid.price} | Amount: ${bid.amount} | Total: ${bid.total}`);
        });

        // Test 4: Query quote (real contract interaction)
        console.log('\n💱 Test 4: Query Quote (Real Contract Interaction)');
        if (queryClient) {
            try {
                const quoteQuery = {
                    quote: {
                        offer_denom: "rune",
                        ask_denom: "x/ruji",
                        amount: "1000000"
                    }
                };

                const quoteResult = await queryClient.queryContractSmart(
                    THORCHAIN_CONTRACT_ADDRESS,
                    quoteQuery
                );
                console.log('✅ Quote Query Result:', JSON.stringify(quoteResult, null, 2));
            } catch (error) {
                console.log('❌ Quote query failed:', error);
            }
        } else {
            console.log('⚠️  Skipping quote query (no connection)');
        }
        
        // Simulate pool data for demonstration
        const simulatedPoolInfo: PoolInfo = {
            asset: 'BTC.BTC',
            runeDepth: '1000000.0',
            assetDepth: '50.0',
            assetPrice: '20000.0',
            assetPriceUSD: '20000.0',
            runePriceUSD: '1.0',
            poolAPY: '12.5',
            status: 'Available'
        };
        
        console.log('🏊 Simulated Pool Info:');
        console.log('Asset:', simulatedPoolInfo.asset);
        console.log('RUNE Depth:', simulatedPoolInfo.runeDepth);
        console.log('Asset Depth:', simulatedPoolInfo.assetDepth);
        console.log('Asset Price (RUNE):', simulatedPoolInfo.assetPrice);
        console.log('Asset Price (USD):', simulatedPoolInfo.assetPriceUSD);
        console.log('Pool APY:', simulatedPoolInfo.poolAPY + '%');
        console.log('Status:', simulatedPoolInfo.status);

        // Test 5: Build Order Book from Contract Data
        console.log('\n📊 Test 5: Build Order Book from Contract Data');
        if (queryClient) {
            try {
                // Get strategy data to build order book
                const strategyQuery = {
                    strategy: {}
                };

                const strategyResult = await queryClient.queryContractSmart(
                    THORCHAIN_CONTRACT_ADDRESS,
                    strategyQuery
                );

                console.log('✅ Strategy Data for Order Book:', JSON.stringify(strategyResult, null, 2));

                // Build order book from strategy data
                if (strategyResult && strategyResult.xyk && strategyResult.xyk.length >= 2) {
                    const poolConfig = strategyResult.xyk[0];
                    const poolState = strategyResult.xyk[1];
                    
                    // Calculate current price
                    const xAmount = parseInt(poolState.x);
                    const yAmount = parseInt(poolState.y);
                    const currentPrice = yAmount / xAmount;
                    
                    console.log('\n📊 Real Order Book from Contract Data:');
                    console.log('Current Price (RUNE per x/ruji):', currentPrice.toFixed(6));
                    console.log('Pool Reserves:');
                    console.log(`  x/ruji: ${xAmount.toLocaleString()}`);
                    console.log(`  RUNE: ${yAmount.toLocaleString()}`);
                    console.log('Pool Config:');
                    console.log(`  Step: ${poolConfig.step}`);
                    console.log(`  Min Quote: ${poolConfig.min_quote}`);
                    console.log(`  Fee: ${poolConfig.fee}%`);
                    
                    // Generate order book levels around current price
                    const orderBookLevels = [];
                    const step = parseFloat(poolConfig.step);
                    
                    // Generate 5 levels above current price (asks)
                    for (let i = 1; i <= 5; i++) {
                        const askPrice = currentPrice * (1 + i * step);
                        const askAmount = Math.floor(xAmount * 0.1 * i); // 10% of reserves per level
                        orderBookLevels.push({
                            type: 'ask',
                            price: askPrice.toFixed(6),
                            amount: askAmount.toLocaleString(),
                            total: (askPrice * askAmount).toFixed(2)
                        });
                    }
                    
                    // Generate 5 levels below current price (bids)
                    for (let i = 1; i <= 5; i++) {
                        const bidPrice = currentPrice * (1 - i * step);
                        const bidAmount = Math.floor(yAmount * 0.1 * i); // 10% of reserves per level
                        orderBookLevels.push({
                            type: 'bid',
                            price: bidPrice.toFixed(6),
                            amount: bidAmount.toLocaleString(),
                            total: (bidPrice * bidAmount).toFixed(2)
                        });
                    }
                    
                    // Display order book
                    console.log('\n📈 Order Book Levels:');
                    console.log('Asks (Sell Orders):');
                    orderBookLevels.filter(level => level.type === 'ask')
                        .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
                        .forEach((level, index) => {
                            console.log(`  ${index + 1}. Price: ${level.price} | Amount: ${level.amount} | Total: ${level.total}`);
                        });
                    
                    console.log('Bids (Buy Orders):');
                    orderBookLevels.filter(level => level.type === 'bid')
                        .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
                        .forEach((level, index) => {
                            console.log(`  ${index + 1}. Price: ${level.price} | Amount: ${level.amount} | Total: ${level.total}`);
                        });
                }
            } catch (error) {
                console.log('❌ Failed to build order book from contract data:', (error as Error).message);
            }
        } else {
            console.log('⚠️  Skipping order book build (no connection)');
        }
        
        // Simulate swap quote for demonstration
        const simulatedSwapQuote: SwapQuote = {
            inputAmount: '0.1',
            outputAmount: '2.5',
            fee: '0.0001',
            slip: '0.5',
            priceImpact: '0.1'
        };
        
        console.log('💱 Simulated Swap Quote:');
        console.log('Input Amount (BTC):', simulatedSwapQuote.inputAmount);
        console.log('Output Amount (ETH):', simulatedSwapQuote.outputAmount);
        console.log('Fee (RUNE):', simulatedSwapQuote.fee);
        console.log('Slippage:', simulatedSwapQuote.slip + '%');
        console.log('Price Impact:', simulatedSwapQuote.priceImpact + '%');

        // Test 6: Simulate transaction (read-only)
        console.log('\n🔧 Test 6: Simulate Transaction (Read-only)');
        try {
            // This would be a simulation of a swap transaction
            const swapMsg = {
                swap: {
                    input_asset: 'BTC.BTC',
                    output_asset: 'ETH.ETH',
                    input_amount: '0.01',
                    recipient: testWalletAddress,
                    memo: 'Test swap from Rujira playground'
                }
            };

            // Simulate the transaction (this won't actually execute)
            console.log('📝 Simulated Swap Transaction:');
            console.log('Input Asset:', swapMsg.swap.input_asset);
            console.log('Output Asset:', swapMsg.swap.output_asset);
            console.log('Input Amount:', swapMsg.swap.input_amount);
            console.log('Recipient:', swapMsg.swap.recipient);
            console.log('Memo:', swapMsg.swap.memo);
            
            console.log('⚠️  This is a simulation - no actual transaction will be executed');
        } catch (error) {
            console.log('❌ Transaction simulation failed:', error);
        }

        console.log('\n✅ Playground 05 completed successfully!');
        console.log('\n📝 Summary:');
        console.log('- Connected to Thorchain RPC');
        console.log('- Queried contract information');
        console.log('- Simulated order book data');
        console.log('- Simulated pool information');
        console.log('- Simulated swap quotes');
        console.log('- All operations completed in simulation mode');
        console.log('- Project: Rujira HFT Bot');

    } catch (error) {
        console.error('❌ Error in playground:', error);
        process.exit(1);
    }
}

// Run the playground
main().catch(console.error); 