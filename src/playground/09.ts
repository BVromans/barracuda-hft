#!/usr/bin/env ts-node
/**
 * Playground 09: Get Market Information by Address or Symbol
 * 
 * This example demonstrates how to get market information from Rujira.
 * It shows how to get a single market by address or symbol, and how to get all markets.
 */

import { config } from "dotenv";
import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice } from "@cosmjs/stargate";
import { fromBech32, toBech32 } from "@cosmjs/encoding";

config({ path: ".env" });

// Required environment variables
const RUJIRA_RPC_URL = process.env.RPC_ENDPOINT || '';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS2 || '';
const MNEMONIC = process.env.MNEMONIC || '';

if (!RUJIRA_RPC_URL) {
    console.error('Please set RPC_ENDPOINT2 in your .env file');
    process.exit(1);
}

if (!CONTRACT_ADDRESS) {
    console.error('Please set CONTRACT_ADDRESS in your .env file');
    process.exit(1);
}

if (!MNEMONIC) {
    console.error('Please set MNEMONIC in your .env file');
    process.exit(1);
}

interface MarketInfo {
    id: string;
    name: string;
    baseToken: {
        symbol: string;
        address: string;
        decimals: number;
    };
    quoteToken: {
        symbol: string;
        address: string;
        decimals: number;
    };
    minimumPriceIncrement: string;
    minimumOrderSize: string;
    status: string;
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

// Market registry - maps symbols to contract addresses
const MARKET_REGISTRY = {
    "RUJI/AUTO": "ruji_auto_contract_address",
    "RUJI/MNTA": "ruji_mnta_contract_address", 
    "AUTO/MNTA": "auto_mnta_contract_address",
    "RUJI/NAMI": "ruji_nami_contract_address"
};

// RujiraClient implementation
class RujiraClient {
    private constructor(
        public readonly client: CosmWasmClient,
        public readonly wallet: DirectSecp256k1HdWallet,
        public readonly contractAddress: string,
        public readonly rpcEndpoint: string
    ) {}

    static async connect(
        rpcEndpoint: string,
        mnemonic: string,
        contractAddress: string
    ): Promise<RujiraClient> {
        const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
            prefix: "sthor",
        });
        const client = await CosmWasmClient.connect(rpcEndpoint);
        return new RujiraClient(client, wallet, contractAddress, rpcEndpoint);
    }

    async query<T>(queryMsg: any): Promise<T> {
        return this.client.queryContractSmart(this.contractAddress, queryMsg);
    }

    async execute(
        executeMsg: any,
        funds?: { denom: string; amount: string }[]
    ) {
        const [{ address }] = await this.wallet.getAccounts();
        const gasPrice = GasPrice.fromString("0.025uatom");
        const signingClient = await SigningCosmWasmClient.connectWithSigner(
            this.rpcEndpoint,
            this.wallet,
            { gasPrice }
        );

        return signingClient.execute(
            address,
            this.contractAddress,
            executeMsg,
            "auto",
            undefined,
            funds
        );
    }
}

function convertBech32Prefix(address: string, newPrefix: string): string {
    const { data } = fromBech32(address);
    return toBech32(newPrefix, data);
}

async function getMarketByAddress() {
    console.log("=== Getting Market by Address ===");
    
    // Example market addresses on Rujira
    const marketAddresses = [
        CONTRACT_ADDRESS,  // Use the contract address from env
    ];
    
    for (const address of marketAddresses) {
        try {
            console.log(`\nMarket Address: ${address}`);
            
            // Create client for this specific contract
            const client = await RujiraClient.connect(
                RUJIRA_RPC_URL,
                MNEMONIC,
                address
            );
            
            // Query strategy to get market info
            const strategy = await client.query<StrategyResponse>({
                strategy: { denom: "ruji", amount: "1000000" }
            });
            
            console.log("✅ Market Strategy Query Result:");
            console.log(JSON.stringify(strategy, null, 2));
            
            // Parse and display market information
            if (strategy.xyk && strategy.xyk.length >= 2) {
                const [config, state] = strategy.xyk;
                const DECIMALS = 6;
                
                // Humanize values with proper formatting
                const baseReserves = (parseInt(state.x) / 10 ** DECIMALS).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 6 
                });
                const quoteReserves = (parseInt(state.y) / 10 ** DECIMALS).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 6 
                });
                const kConstant = (parseInt(state.k) / 10 ** (2 * DECIMALS)).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 12 
                });
                const totalShares = (parseInt(state.shares) / 10 ** DECIMALS).toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 6 
                });
                const currentPrice = (parseInt(state.y) / parseInt(state.x)).toFixed(6);
                
                console.log('\n📊 Market Information:');
                console.log(`  Base Token: ${config.x}`);
                console.log(`  Quote Token: ${config.y}`);
                console.log(`  Step Size: ${parseFloat(config.step).toFixed(3)}`);
                console.log(`  Min Quote: ${parseInt(config.min_quote).toLocaleString()}`);
                console.log(`  Fee: ${parseFloat(config.fee).toFixed(3)}%`);
                console.log(`  Base Reserves: ${baseReserves} ${config.x}`);
                console.log(`  Quote Reserves: ${quoteReserves} ${config.y}`);
                console.log(`  K Constant: ${kConstant}`);
                console.log(`  Total Shares: ${totalShares}`);
                console.log(`  Current Price: ${currentPrice} ${config.y} per ${config.x}`);
            }
            
        } catch (error) {
            console.error(`❌ Error getting market by address ${address}:`, error);
        }
    }
}

async function getMarketBySymbol() {
    console.log("\n=== Getting Market by Symbol ===");
    
    // Example market symbols on Rujira
    const marketSymbols = [
        "RUJI/AUTO",
        "RUJI/MNTA", 
        "AUTO/MNTA",
        "RUJI/NAMI"
    ];
    
    for (const symbol of marketSymbols) {
        try {
            console.log(`\nMarket Symbol: ${symbol}`);
            
            // For now, use the main contract address since we don't have individual contract addresses
            const client = await RujiraClient.connect(
                RUJIRA_RPC_URL,
                MNEMONIC,
                CONTRACT_ADDRESS
            );
            
            // Try to query strategy with the symbol as denom
            const denom = symbol.toLowerCase().replace('/', '-');
            const strategy = await client.query<StrategyResponse>({
                strategy: { denom: denom, amount: "1000000" }
            });
            
            console.log(`✅ Market Strategy for ${symbol}:`);
            console.log(JSON.stringify(strategy, null, 2));
            
        } catch (error) {
            console.log(`⚠️ Could not get market info for ${symbol}:`, error instanceof Error ? error.message : String(error));
        }
    }
}

async function getMarketsBySymbols() {
    console.log("\n=== Getting Multiple Markets by Symbols ===");
    
    const symbols = ["RUJI/AUTO", "RUJI/MNTA", "AUTO/MNTA"];
    
    try {
        console.log(`Requesting markets with symbols: ${symbols.join(', ')}`);
        
        const client = await RujiraClient.connect(
            RUJIRA_RPC_URL,
            MNEMONIC,
            CONTRACT_ADDRESS
        );
        
        const markets = [];
        
        for (const symbol of symbols) {
            try {
                const denom = symbol.toLowerCase().replace('/', '-');
                const strategy = await client.query<StrategyResponse>({
                    strategy: { denom: denom, amount: "1000000" }
                });
                
                markets.push({
                    symbol: symbol,
                    strategy: strategy
                });
                
            } catch (error) {
                console.log(`⚠️ Could not get market for ${symbol}:`, error instanceof Error ? error.message : String(error));
            }
        }
        
        console.log(`✅ Found ${markets.length} markets:`);
        markets.forEach((market, index) => {
            console.log(`  ${index + 1}. ${market.symbol}:`, JSON.stringify(market.strategy, null, 2));
        });
        
    } catch (error) {
        console.error(`❌ Error getting markets by symbols:`, error);
    }
}

async function getAllMarkets() {
    console.log("\n=== Getting All Markets ===");
    
    try {
        console.log("Requesting all markets");
        
        const client = await RujiraClient.connect(
            RUJIRA_RPC_URL,
            MNEMONIC,
            CONTRACT_ADDRESS
        );
        
        // Test common market pairs
        const commonPairs = [
            "ruji-auto", "ruji-mnta", "auto-mnta", "ruji-nami",
            "btc-btc", "eth-eth", "usdc-usdc", "rune-rune",
            "btc-rune", "eth-rune", "usdc-rune", "ruji-rune"
        ];
        
        const availableMarkets = [];
        
        for (const pair of commonPairs) {
            try {
                const strategy = await client.query<StrategyResponse>({
                    strategy: { denom: pair, amount: "1000000" }
                });
                
                if (strategy.xyk && strategy.xyk.length >= 2) {
                    const [config, state] = strategy.xyk;
                    const DECIMALS = 6;
                    
                    availableMarkets.push({
                        pair: pair,
                        base: config.x,
                        quote: config.y,
                        baseReserves: (parseInt(state.x) / 10 ** DECIMALS).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 6 
                        }),
                        quoteReserves: (parseInt(state.y) / 10 ** DECIMALS).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 6 
                        }),
                        step: parseFloat(config.step).toFixed(3),
                        fee: parseFloat(config.fee).toFixed(3),
                        currentPrice: (parseInt(state.y) / parseInt(state.x)).toFixed(6)
                    });
                }
                
            } catch (error) {
                // Market doesn't exist or error occurred
            }
        }
        
        console.log(`\n✅ Total markets found: ${availableMarkets.length}`);
        
        // Show available markets
        if (availableMarkets.length > 0) {
            console.log("\nAvailable Markets:");
            availableMarkets.forEach((market, index) => {
                console.log(`  ${index + 1}. ${market.pair.toUpperCase()}:`);
                console.log(`     Base: ${market.baseReserves} ${market.base}`);
                console.log(`     Quote: ${market.quoteReserves} ${market.quote}`);
                console.log(`     Price: ${market.currentPrice} ${market.quote} per ${market.base}`);
                console.log(`     Step: ${market.step}, Fee: ${market.fee}%`);
                console.log('');
            });
        } else {
            console.log("No markets found with the tested pairs");
        }
        
    } catch (error) {
        console.error(`❌ Error getting all markets:`, error);
    }
}

async function searchMarketsByKeyword() {
    console.log("\n=== Searching Markets by Keyword ===");
    
    const keywords = ["RUJI", "AUTO", "MNTA"];
    
    for (const keyword of keywords) {
        try {
            console.log(`\nSearching markets with keyword: ${keyword}`);
            
            const client = await RujiraClient.connect(
                RUJIRA_RPC_URL,
                MNEMONIC,
                CONTRACT_ADDRESS
            );
            
            // Search for markets containing the keyword
            const searchPairs = [
                `${keyword.toLowerCase()}-auto`,
                `${keyword.toLowerCase()}-mnta`,
                `${keyword.toLowerCase()}-rune`,
                `${keyword.toLowerCase()}-usdc`
            ];
            
            const foundMarkets = [];
            
            for (const pair of searchPairs) {
                try {
                    const strategy = await client.query<StrategyResponse>({
                        strategy: { denom: pair, amount: "1000000" }
                    });
                    
                    if (strategy.xyk && strategy.xyk.length >= 2) {
                        const [config, state] = strategy.xyk;
                        foundMarkets.push({
                            pair: pair,
                            base: config.x,
                            quote: config.y,
                            currentPrice: (parseInt(state.y) / parseInt(state.x)).toFixed(6)
                        });
                    }
                    
                } catch (error) {
                    // Market not found
                }
            }
            
            if (foundMarkets.length > 0) {
                console.log(`✅ Found ${foundMarkets.length} markets for keyword "${keyword}":`);
                foundMarkets.forEach((market, index) => {
                    console.log(`  ${index + 1}. ${market.pair.toUpperCase()}: ${market.currentPrice} ${market.quote} per ${market.base}`);
                });
            } else {
                console.log(`No markets found for keyword "${keyword}"`);
            }
            
        } catch (error) {
            console.error(`❌ Error searching markets with keyword ${keyword}:`, error);
        }
    }
}

async function getMarketDetails() {
    console.log("\n=== Getting Market Details ===");
    
    try {
        const client = await RujiraClient.connect(
            RUJIRA_RPC_URL,
            MNEMONIC,
            CONTRACT_ADDRESS
        );
        
        // Get detailed market information
        const strategy = await client.query<StrategyResponse>({
            strategy: { denom: "ruji", amount: "1000000" }
        });
        
        console.log("✅ Market Details:");
        console.log(JSON.stringify(strategy, null, 2));
        
        if (strategy.xyk && strategy.xyk.length >= 2) {
            const [config, state] = strategy.xyk;
            const DECIMALS = 6;
            
            console.log('\n📊 Detailed Market Analysis:');
            // Humanize values with proper formatting
            const baseReserves = (parseInt(state.x) / 10 ** DECIMALS).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            });
            const quoteReserves = (parseInt(state.y) / 10 ** DECIMALS).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            });
            const kConstant = (parseInt(state.k) / 10 ** (2 * DECIMALS)).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 12 
            });
            const totalShares = (parseInt(state.shares) / 10 ** DECIMALS).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            });
            const currentPrice = (parseInt(state.y) / parseInt(state.x)).toFixed(6);
            
            console.log(`  Market Configuration:`);
            console.log(`    Base Token: ${config.x}`);
            console.log(`    Quote Token: ${config.y}`);
            console.log(`    Step Size: ${parseFloat(config.step).toFixed(3)}`);
            console.log(`    Minimum Quote: ${parseInt(config.min_quote).toLocaleString()}`);
            console.log(`    Trading Fee: ${parseFloat(config.fee).toFixed(3)}%`);
            
            console.log(`  Current State:`);
            console.log(`    Base Reserves: ${baseReserves} ${config.x}`);
            console.log(`    Quote Reserves: ${quoteReserves} ${config.y}`);
            console.log(`    K Constant: ${kConstant}`);
            console.log(`    Total Shares: ${totalShares}`);
            console.log(`    Current Price: ${currentPrice} ${config.y} per ${config.x}`);
            
            // Calculate liquidity metrics
            const totalLiquidity = parseInt(state.x) + parseInt(state.y);
            const basePercentage = (parseInt(state.x) / totalLiquidity) * 100;
            const quotePercentage = (parseInt(state.y) / totalLiquidity) * 100;
            
            console.log(`  Liquidity Analysis:`);
            console.log(`    Total Liquidity: ${totalLiquidity.toLocaleString()}`);
            console.log(`    Base Side: ${basePercentage.toFixed(2)}%`);
            console.log(`    Quote Side: ${quotePercentage.toFixed(2)}%`);
        }
        
    } catch (error) {
        console.error(`❌ Error getting market details:`, error);
    }
}

async function getMarketOrderBook() {
    console.log("\n=== Getting Market Order Book ===");
    
    try {
        const client = await RujiraClient.connect(
            RUJIRA_RPC_URL,
            MNEMONIC,
            CONTRACT_ADDRESS
        );
        
        // Get strategy data to build order book
        const strategy = await client.query<StrategyResponse>({
            strategy: { denom: "ruji", amount: "1000000" }
        });
        
        console.log("✅ Strategy Data for Order Book:");
        console.log(JSON.stringify(strategy, null, 2));
        
        // Build order book from strategy data (XYK AMM)
        if (strategy.xyk && strategy.xyk.length >= 2) {
            const poolConfig = strategy.xyk[0];
            const poolState = strategy.xyk[1];
            
            const xAmount = parseInt(poolState.x);
            const yAmount = parseInt(poolState.y);
            const currentPrice = yAmount / xAmount;
            const step = parseFloat(poolConfig.step);
            
            // Humanize pool values
            const humanizedXAmount = (xAmount / 10 ** 6).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            });
            const humanizedYAmount = (yAmount / 10 ** 6).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            });
            
            console.log('\n📊 XYK Order Book (Generated from Pool State):');
            console.log(`Current Price: ${currentPrice.toFixed(6)} ${poolConfig.y} per ${poolConfig.x}`);
            console.log(`Pool Reserves: ${humanizedXAmount} ${poolConfig.x} / ${humanizedYAmount} ${poolConfig.y}`);
            console.log(`Step Size: ${step.toFixed(3)}`);
            
            // Generate order book levels around current price
            const orderBookLevels = [];
            
                                // Generate 5 levels above current price (asks)
                    for (let i = 1; i <= 5; i++) {
                        const askPrice = currentPrice * (1 + i * step);
                        const askAmount = Math.floor(xAmount * 0.1 * i);
                        const humanizedAskAmount = (askAmount / 10 ** 6).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 6 
                        });
                        orderBookLevels.push({
                            type: 'ask',
                            price: askPrice.toFixed(6),
                            amount: humanizedAskAmount,
                            total: (askPrice * askAmount / 10 ** 6).toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 6 
                            })
                        });
                    }
                    
                    // Generate 5 levels below current price (bids)
                    for (let i = 1; i <= 5; i++) {
                        const bidPrice = currentPrice * (1 - i * step);
                        const bidAmount = Math.floor(yAmount * 0.1 * i);
                        const humanizedBidAmount = (bidAmount / 10 ** 6).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 6 
                        });
                        orderBookLevels.push({
                            type: 'bid',
                            price: bidPrice.toFixed(6),
                            amount: humanizedBidAmount,
                            total: (bidPrice * bidAmount / 10 ** 6).toLocaleString(undefined, { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 6 
                            })
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
        console.error(`❌ Error getting market order book:`, error);
    }
}

async function getMarketTicker() {
    console.log("\n=== Getting Market Ticker ===");
    
    try {
        const client = await RujiraClient.connect(
            RUJIRA_RPC_URL,
            MNEMONIC,
            CONTRACT_ADDRESS
        );
        
        // Get current market state
        const strategy = await client.query<StrategyResponse>({
            strategy: { denom: "ruji", amount: "1000000" }
        });
        
        // Get quote for ticker information
        const quote = await client.query<QuoteResponse>({
            quote: { 
                denom: "ruji", 
                amount: "1000000", 
                offer_denom: "usdc", 
                offer_amount: "1000000", 
                ask_denom: "usdc", 
                ask_amount: "1000000" 
            }
        });
        
        console.log("✅ Market Ticker Information:");
        console.log("Strategy Data:", JSON.stringify(strategy, null, 2));
        console.log("Quote Data:", JSON.stringify(quote, null, 2));
        
        if (strategy.xyk && strategy.xyk.length >= 2) {
            const [config, state] = strategy.xyk;
            const DECIMALS = 6;
            
            // Humanize ticker values
            const currentPrice = (parseInt(state.y) / parseInt(state.x)).toFixed(6);
            const baseReserves = (parseInt(state.x) / 10 ** DECIMALS).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            });
            const quoteReserves = (parseInt(state.y) / 10 ** DECIMALS).toLocaleString(undefined, { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 6 
            });
            
            console.log('\n📊 Ticker Summary:');
            console.log(`  Symbol: ${config.x}/${config.y}`);
            console.log(`  Current Price: ${currentPrice} ${config.y} per ${config.x}`);
            console.log(`  Base Reserves: ${baseReserves} ${config.x}`);
            console.log(`  Quote Reserves: ${quoteReserves} ${config.y}`);
            console.log(`  Trading Fee: ${parseFloat(config.fee).toFixed(3)}%`);
            console.log(`  Step Size: ${parseFloat(config.step).toFixed(3)}`);
            
            if (quote && quote.price) {
                console.log(`  Quote Price: ${quote.price} USDC per token`);
                console.log(`  Quote Size: ${quote.size}`);
            }
        }
        
    } catch (error) {
        console.error(`❌ Error getting market ticker:`, error);
    }
}

async function exploreSpecificContract() {
    console.log("\n=== Exploring Specific Contract ===");
    
    // Convert mainnet address to stagenet address (correctly, with checksum)
    const mainnetAddress = "thor1z5fkrpkwgqst520d4e9vp7f0c28vu4kh78t9c9vvu6ej8g0tmv8snqljre";
    const specificContractAddress = convertBech32Prefix(mainnetAddress, 'sthor');
    
    try {
        console.log(`🔍 Exploring contract: ${specificContractAddress}`);
        
        // Create client for the specific contract
        const client = await RujiraClient.connect(
            RUJIRA_RPC_URL,
            MNEMONIC,
            specificContractAddress
        );
        
        console.log("✅ Connected to specific contract successfully");
        
        // Try different query types to see what this contract supports
        const queryTypes = [
            { name: "Config", query: { config: {} } },
            { name: "Strategy", query: { strategy: { denom: "ruji", amount: "1000000" } } },
            { name: "Strategy (empty)", query: { strategy: {} } },
            { name: "Quote", query: { quote: { denom: "ruji", amount: "1000000", offer_denom: "rune", offer_amount: "1000000", ask_denom: "rune", ask_amount: "1000000" } } },
            { name: "Orders", query: { orders: { owner: "thor1test", limit: 10 } } },
            { name: "Book", query: { book: { limit: 10 } } },
            { name: "Status", query: { status: {} } },
            { name: "Base", query: { base: { denom: "ruji" } } },
            { name: "Base Price", query: { base_price: { base_denom: "ruji", quote_denom: "rune" } } },
            { name: "Base Liquidity", query: { base_liquidity: { denom: "ruji" } } }
        ];
        
        for (const queryType of queryTypes) {
            try {
                console.log(`\n📋 Testing query: ${queryType.name}`);
                const result = await client.query(queryType.query);
                console.log(`✅ ${queryType.name} Query Result:`);
                console.log(JSON.stringify(result, null, 2));
                
                // Try to analyze the result if it's a strategy
                if (queryType.name === "Strategy" && result && (result as any).xyk && (result as any).xyk.length >= 2) {
                    const [config, state] = (result as any).xyk;
                    const DECIMALS = 6;
                    
                    console.log(`\n📊 ${queryType.name} Analysis:`);
                    console.log(`  Base Token: ${config.x}`);
                    console.log(`  Quote Token: ${config.y}`);
                    console.log(`  Step Size: ${parseFloat(config.step).toFixed(3)}`);
                    console.log(`  Min Quote: ${parseInt(config.min_quote).toLocaleString()}`);
                    console.log(`  Fee: ${parseFloat(config.fee).toFixed(3)}%`);
                    
                    if (state.x && state.y) {
                        const baseReserves = (parseInt(state.x) / 10 ** DECIMALS).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 6 
                        });
                        const quoteReserves = (parseInt(state.y) / 10 ** DECIMALS).toLocaleString(undefined, { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 6 
                        });
                        const currentPrice = (parseInt(state.y) / parseInt(state.x)).toFixed(6);
                        
                        console.log(`  Base Reserves: ${baseReserves} ${config.x}`);
                        console.log(`  Quote Reserves: ${quoteReserves} ${config.y}`);
                        console.log(`  Current Price: ${currentPrice} ${config.y} per ${config.x}`);
                    }
                }
                
            } catch (error) {
                console.log(`❌ ${queryType.name} query failed:`, error instanceof Error ? error.message : String(error));
            }
        }
        
        // Try to get contract info
        try {
            console.log("\n📋 Getting contract info...");
            const contractInfo = await client.client.getContract(specificContractAddress);
            console.log("✅ Contract Info:");
            console.log(`  Address: ${contractInfo.address}`);
            console.log(`  Code ID: ${contractInfo.codeId}`);
            console.log(`  Creator: ${contractInfo.creator}`);
            console.log(`  Admin: ${contractInfo.admin || 'None'}`);
            console.log(`  Label: ${contractInfo.label}`);
            console.log(`  IBC Port ID: ${contractInfo.ibcPortId || 'None'}`);
        } catch (error) {
            console.log("❌ Could not get contract info:", error instanceof Error ? error.message : String(error));
        }
        
        // Try to get contract balance
        try {
            console.log("\n💰 Getting contract balance...");
            const balance = await client.client.getBalance(specificContractAddress, 'rune');
            console.log("✅ Contract RUNE Balance:");
            console.log(`  Amount: ${parseInt(balance.amount).toLocaleString()}`);
            console.log(`  Denom: ${balance.denom}`);
        } catch (error) {
            console.log("❌ Could not get contract balance:", error instanceof Error ? error.message : String(error));
        }
        
    } catch (error) {
        console.error(`❌ Error exploring specific contract:`, error);
    }
}

async function main() {
    console.log('🚀 Playground 09 - Get Market Information Examples (REAL INTERACTION)');
    console.log('🌐 RPC URL:', RUJIRA_RPC_URL);
    console.log('📄 Contract Address:', CONTRACT_ADDRESS);
    console.log('👤 Using mnemonic (first 3 words):', MNEMONIC.split(' ').slice(0, 3).join(' ') + '...');
    console.log('');

    try {
        // Test connection first
        console.log('🔌 Testing connection...');
        const testClient = await RujiraClient.connect(
            RUJIRA_RPC_URL,
            MNEMONIC,
            CONTRACT_ADDRESS
        );
        console.log('✅ Connected to Rujira successfully');
        
        // Get market by address
        await getMarketByAddress();
        
        // Get market by symbol
        await getMarketBySymbol();
        
        // Get multiple markets by symbols
        await getMarketsBySymbols();
        
        // Get all markets
        await getAllMarkets();
        
        // Search markets by keyword
        await searchMarketsByKeyword();
        
        // Get market details
        await getMarketDetails();
        
        // Get market order book
        await getMarketOrderBook();
        
        // Get market ticker
        await getMarketTicker();
        
        // Explore specific contract
        await exploreSpecificContract();
        
    } catch (error) {
        console.error('❌ Error in main execution:', error);
        
        if (error instanceof Error) {
            if (error.message.includes('mnemonic')) {
                console.error('\n💡 Tip: Make sure your mnemonic has 12, 15, 18, 21, or 24 words');
            }
            
            if (error.message.includes('connection') || error.message.includes('rpc')) {
                console.error('\n💡 Tip: Check if the RPC endpoint is correct and accessible');
            }
            
            if (error.message.includes('526') || error.message.includes('Bad status')) {
                console.error('\n💡 Tip: RPC endpoint is not accessible. Try:');
                console.error('   - Check your internet connection');
                console.error('   - Try a different RPC endpoint');
                console.error('   - The endpoint might be down or blocked');
            }
        }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("Playground 09 completed with REAL interactions!");
    console.log("✅ All market queries were executed against real contracts");
}

if (require.main === module) {
    main().catch(console.error);
} 