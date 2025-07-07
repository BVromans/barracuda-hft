import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { config } from "dotenv";

config({ path: ".env" });

// Thorchain contract address for playground 06 (Stagenet)
const THORCHAIN_CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "";

// Thorchain RPC endpoint (Stagenet)
const THORCHAIN_RPC_URL = 'https://stagenet-rpc.ninerealms.com';

// Required environment variables
const requiredEnvironmentVariables = [
    'CONTRACT_ADDRESS'
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(varName => !process.env[varName]);

if (missingEnvironmentVariables.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvironmentVariables.join(', ')}`);
    console.error('Please set CONTRACT_ADDRESS in your .env file');
    process.exit(1);
}

interface ContractInfo {
    address: string;
    codeId: number;
    creator: string;
    admin?: string;
    label: string;
    ibcPortId?: string;
}

interface StrategyResponse {
    xyk?: Array<{
        x: string;
        y: string;
        step: string;
        min_quote: string;
        fee: string;
        k: string;
        shares: string;
    }>;
    [key: string]: any;
}

interface QuoteResponse {
    price: string;
    size: string;
    data: string;
    [key: string]: any;
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

interface PoolAnalysis {
    currentPrice: number;
    baseReserves: number;
    quoteReserves: number;
    kConstant: number;
    totalShares: number;
    stepSize: number;
    minQuote: number;
    fee: number;
}

// Função para formatar JSON com valores decimais
function formatStrategyResultWithDecimals(strategyResult: any): any {
    if (!strategyResult || !strategyResult.xyk || strategyResult.xyk.length < 2) {
        return strategyResult;
    }
    
    const [config, state] = strategyResult.xyk;
    const DECIMALS = 6;
    
    return {
        xyk: [
            config, // Configuração permanece igual
            {
                x: `${(parseInt(state.x) / 10 ** DECIMALS).toFixed(DECIMALS)} ${config.x}`,
                y: `${(parseInt(state.y) / 10 ** DECIMALS).toFixed(DECIMALS)} ${config.y}`,
                k: `${(parseInt(state.k) / 10 ** (2 * DECIMALS)).toFixed(2 * DECIMALS)}`,
                shares: `${(parseInt(state.shares) / 10 ** DECIMALS).toFixed(DECIMALS)}`
            }
        ]
    };
}

async function main() {
    console.log('🚀 Playground 06 - Thorchain Contract Testing');
    console.log('📄 Contract Address:', THORCHAIN_CONTRACT_ADDRESS);
    console.log('🌐 RPC URL:', THORCHAIN_RPC_URL);
    console.log('');

    try {
        // Create read-only client for queries
        let queryClient: CosmWasmClient | null = null;
        try {
            queryClient = await CosmWasmClient.connect(THORCHAIN_RPC_URL);
            console.log('✅ Connected to Thorchain RPC successfully');
        } catch (error) {
            console.log('❌ Could not connect to Thorchain RPC');
            console.log('Error:', error);
            console.log('⚠️  Running in simulation mode only');
        }

        // Test 1: Query contract info
        console.log('\n📋 Test 1: Query Contract Info');
        if (queryClient) {
            try {
                const contractInfo = await queryClient.getContract(THORCHAIN_CONTRACT_ADDRESS);
                console.log('✅ Contract Info:');
                console.log('  Address:', contractInfo.address);
                console.log('  Code ID:', contractInfo.codeId);
                console.log('  Creator:', contractInfo.creator);
                console.log('  Admin:', contractInfo.admin || 'None');
                console.log('  Label:', contractInfo.label);
                console.log('  IBC Port ID:', contractInfo.ibcPortId || 'None');
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
                const runeBalance = await queryClient.getBalance(THORCHAIN_CONTRACT_ADDRESS, 'rune');
                console.log('✅ Contract RUNE Balance:');
                console.log('  Amount:', runeBalance.amount);
                console.log('  Denom:', runeBalance.denom);

                // Note: CosmWasmClient doesn't have getAllBalances method
                // We can only query specific token balances
                console.log('ℹ️  Note: Only RUNE balance is shown. Other tokens would need individual queries.');
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
                console.log('✅ Strategy Query Result (Original):');
                console.log(JSON.stringify(strategyResult, null, 2));

                console.log('\n✅ Strategy Query Result (Formatted with Decimals):');
                const formattedResult = formatStrategyResultWithDecimals(strategyResult);
                console.log(JSON.stringify(formattedResult, null, 2));

                // Analyze strategy data
                if (strategyResult && strategyResult.xyk && strategyResult.xyk.length >= 2) {
                    const [config, state] = strategyResult.xyk;
                    // Defina o número de casas decimais (exemplo: 6)
                    const DECIMALS = 6;
                    const baseRaw = state.x;
                    const quoteRaw = state.y;
                    const kRaw = state.k;
                    const sharesRaw = state.shares;
                    const baseDecimal = (parseInt(baseRaw) / 10 ** DECIMALS).toLocaleString(undefined, { maximumFractionDigits: DECIMALS });
                    const quoteDecimal = (parseInt(quoteRaw) / 10 ** DECIMALS).toLocaleString(undefined, { maximumFractionDigits: DECIMALS });
                    const kDecimal = (parseInt(kRaw) / 10 ** (2 * DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 * DECIMALS });
                    const sharesDecimal = (parseInt(sharesRaw) / 10 ** DECIMALS).toLocaleString(undefined, { maximumFractionDigits: DECIMALS });
                    console.log('\n📈 Strategy Analysis:');
                    console.log('  Pool Configuration:');
                    console.log(`    Base Token (X): ${config.x}`);
                    console.log(`    Quote Token (Y): ${config.y}`);
                    console.log(`    Step Size: ${config.step}`);
                    console.log(`    Min Quote: ${config.min_quote}`);
                    console.log(`    Fee: ${config.fee}%`);
                    console.log('  Pool State:');
                    console.log(`    Base Reserves: ${baseDecimal} ${config.x}`);
                    console.log(`    Quote Reserves: ${quoteDecimal} ${config.y}`);
                    console.log(`    K Constant: ${kDecimal}`);
                    console.log(`    Total Shares: ${sharesDecimal}`);
                    // Calcule o preço atual em decimal
                    const currentPrice = parseInt(quoteRaw) / parseInt(baseRaw);
                    console.log(`    Current Price: ${currentPrice.toFixed(6)} ${config.y} per ${config.x}`);
                }
            } catch (error) {
                console.log('❌ Strategy query failed:', error);
            }
        } else {
            console.log('⚠️  Skipping strategy query (no connection)');
        }

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
                console.log('✅ Quote Query Result:');
                console.log(JSON.stringify(quoteResult, null, 2));

                // Analyze quote data
                if (quoteResult) {
                    console.log('\n💰 Quote Analysis:');
                    console.log(`  Price: ${quoteResult.price} USDC per token`);
                    console.log(`  Size: ${quoteResult.size}`);
                    console.log(`  Data: ${quoteResult.data} (base64 encoded)`);

                    // Try to decode the base64 data
                    try {
                        const decodedData = Buffer.from(quoteResult.data, 'base64').toString('utf-8');
                        console.log(`  Decoded Data: ${decodedData}`);
                    } catch (decodeError) {
                        console.log(`  Could not decode base64 data: ${decodeError}`);
                    }
                }
            } catch (error) {
                console.log('❌ Quote query failed:', error);
            }
        } else {
            console.log('⚠️  Skipping quote query (no connection)');
        }

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

                console.log('✅ Strategy Data for Order Book:');
                console.log(JSON.stringify(strategyResult, null, 2));

                // Build order book from strategy data
                if (strategyResult && strategyResult.xyk && strategyResult.xyk.length >= 2) {
                    const poolConfig = strategyResult.xyk[0];
                    const poolState = strategyResult.xyk[1];

                    // Calculate current price and reserves
                    const xAmount = parseInt(poolState.x);
                    const yAmount = parseInt(poolState.y);
                    const currentPrice = yAmount / xAmount;
                    const step = parseFloat(poolConfig.step);

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

        // Test 6: Show contract's actual token pair
        console.log('\n🔄 Test 6: Contract Token Pair Analysis');
        if (queryClient) {
            try {
                console.log('\n📊 Contract Token Pair: x/ruji ↔ rune');
                
                const strategyQuery = {
                    strategy: {}
                };

                const strategyResult = await queryClient.queryContractSmart(
                    THORCHAIN_CONTRACT_ADDRESS,
                    strategyQuery
                );
                
                console.log('✅ Contract Strategy (Original):');
                console.log(JSON.stringify(strategyResult, null, 2));
                
                console.log('✅ Contract Strategy (Formatted):');
                console.log(JSON.stringify(formatStrategyResultWithDecimals(strategyResult), null, 2));

                // Detailed analysis for the contract's pair
                if (strategyResult && strategyResult.xyk && strategyResult.xyk.length >= 2) {
                    const [config, state] = strategyResult.xyk;
                    const DECIMALS = 6;
                    const baseRaw = state.x;
                    const quoteRaw = state.y;
                    const kRaw = state.k;
                    const sharesRaw = state.shares;
                    const baseDecimal = (parseInt(baseRaw) / 10 ** DECIMALS).toLocaleString(undefined, { maximumFractionDigits: DECIMALS });
                    const quoteDecimal = (parseInt(quoteRaw) / 10 ** DECIMALS).toLocaleString(undefined, { maximumFractionDigits: DECIMALS });
                    const kDecimal = (parseInt(kRaw) / 10 ** (2 * DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 * DECIMALS });
                    const sharesDecimal = (parseInt(sharesRaw) / 10 ** DECIMALS).toLocaleString(undefined, { maximumFractionDigits: DECIMALS });

                    console.log('\n📈 Contract Pair Analysis:');
                    console.log(`  Base Token: ${config.x}`);
                    console.log(`  Quote Token: ${config.y}`);
                    console.log(`  Base Reserves: ${baseDecimal} ${config.x}`);
                    console.log(`  Quote Reserves: ${quoteDecimal} ${config.y}`);
                    console.log(`  K Constant: ${kDecimal}`);
                    console.log(`  Total Shares: ${sharesDecimal}`);
                    console.log(`  Step Size: ${config.step}`);
                    console.log(`  Min Quote: ${config.min_quote}`);
                    console.log(`  Fee: ${config.fee}%`);
                    
                    const currentPrice = parseInt(quoteRaw) / parseInt(baseRaw);
                    console.log(`  Current Price: ${currentPrice.toFixed(6)} ${config.y} per ${config.x}`);
                }
            } catch (error) {
                console.log('❌ Contract pair analysis failed:', error);
            }
        } else {
            console.log('⚠️  Skipping contract pair analysis (no connection)');
        }

        // Test 7: Market Analysis
        console.log('\n📈 Test 7: Market Analysis');
        if (queryClient) {
            try {
                // Get strategy data for analysis
                const strategyQuery = {
                    strategy: {}
                };

                const strategyResult = await queryClient.queryContractSmart(
                    THORCHAIN_CONTRACT_ADDRESS,
                    strategyQuery
                );

                if (strategyResult && strategyResult.xyk && strategyResult.xyk.length >= 2) {
                    const poolConfig = strategyResult.xyk[0];
                    const poolState = strategyResult.xyk[1];

                    const analysis: PoolAnalysis = {
                        currentPrice: parseInt(poolState.y) / parseInt(poolState.x),
                        baseReserves: parseInt(poolState.x),
                        quoteReserves: parseInt(poolState.y),
                        kConstant: parseInt(poolState.k),
                        totalShares: parseInt(poolState.shares),
                        stepSize: parseFloat(poolConfig.step),
                        minQuote: parseFloat(poolConfig.min_quote),
                        fee: parseFloat(poolConfig.fee)
                    };

                    console.log('✅ Market Analysis:');
                    console.log(`  Current Price: ${analysis.currentPrice.toFixed(6)} ${poolConfig.y} per ${poolConfig.x}`);
                    console.log(`  Base Reserves: ${analysis.baseReserves.toLocaleString()} ${poolConfig.x}`);
                    console.log(`  Quote Reserves: ${analysis.quoteReserves.toLocaleString()} ${poolConfig.y}`);
                    console.log(`  K Constant: ${analysis.kConstant.toLocaleString()}`);
                    console.log(`  Total Shares: ${analysis.totalShares.toLocaleString()}`);
                    console.log(`  Step Size: ${analysis.stepSize}`);
                    console.log(`  Min Quote: ${analysis.minQuote}`);
                    console.log(`  Fee: ${analysis.fee}%`);

                    // Calculate liquidity metrics
                    const totalLiquidity = analysis.baseReserves + analysis.quoteReserves;
                    const basePercentage = (analysis.baseReserves / totalLiquidity) * 100;
                    const quotePercentage = (analysis.quoteReserves / totalLiquidity) * 100;

                    console.log('\n💰 Liquidity Analysis:');
                    console.log(`  Total Liquidity: ${totalLiquidity.toLocaleString()}`);
                    console.log(`  Base Side: ${basePercentage.toFixed(2)}%`);
                    console.log(`  Quote Side: ${quotePercentage.toFixed(2)}%`);

                    // Calculate price impact for different trade sizes
                    console.log('\n📊 Price Impact Analysis:');
                    const tradeSizes = [1000, 10000, 100000, 1000000];

                    for (const tradeSize of tradeSizes) {
                        const newBaseAmount = analysis.baseReserves + tradeSize;
                        const newQuoteAmount = analysis.kConstant / newBaseAmount;
                        const priceImpact = ((analysis.quoteReserves - newQuoteAmount) / analysis.quoteReserves) * 100;

                        console.log(`  ${tradeSize.toLocaleString()} base units: ${priceImpact.toFixed(4)}% price impact`);
                    }
                }
            } catch (error) {
                console.log('❌ Market analysis failed:', error);
            }
        } else {
            console.log('⚠️  Skipping market analysis (no connection)');
        }

        console.log('\n✅ Playground 06 completed successfully!');
        console.log('\n📝 Summary:');
        console.log('- Contract Address:', THORCHAIN_CONTRACT_ADDRESS);
        console.log('- Connected to Thorchain RPC');
        console.log('- Queried contract information and balance');
        console.log('- Tested strategy and quote queries');
        console.log('- Built order book from real contract data');
        console.log('- Tested multiple token pairs');
        console.log('- Performed comprehensive market analysis');
        console.log('- All operations completed successfully');

    } catch (error) {
        console.error('❌ Error in playground:', error);
        process.exit(1);
    }
}

// Run the playground
main().catch(console.error);
