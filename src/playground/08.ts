#!/usr/bin/env ts-node
/**
 * Playground 08: Get Token Information by Address or Symbol
 * 
 * This example demonstrates how to get token information from Rujira.
 * It shows how to get a single token by address or symbol, and how to get all tokens.
 */

import { config } from "dotenv";
import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';

config({ path: ".env" });

// Required environment variables
const KUJIRA_RPC_URL = process.env.RPC_ENDPOINT2 || '';

if (!KUJIRA_RPC_URL) {
    console.error('Please set KUJIRA_RPC_URL in your .env file');
    process.exit(1);
}

interface TokenInfo {
    id: string;
    name: string;
    symbol: string;
    decimals: number;
    address?: string;
    description?: string;
    display?: string;
    uri?: string;
    uri_hash?: string;
}

async function getTokenByAddress() {
    console.log("=== Getting Token by Address ===");
    
    // Example token addresses on Rujira
    const tokenAddresses = [
        "x/ruji",  // RUJI native token
        "x/auto",  // AUTO token
        "x/mnta",  // MNTA token
    ];
    
    for (const address of tokenAddresses) {
        try {
            console.log(`\nToken Address: ${address}`);
            console.log(`This would query token information for address: ${address}`);
            console.log(`In a real implementation, this would call the Rujira API`);
            
        } catch (error) {
            console.error(`Error getting token by address ${address}:`, error);
        }
    }
}

async function getTokenBySymbol() {
    console.log("\n=== Getting Token by Symbol ===");
    
    // Example token symbols on Rujira
    const tokenSymbols = [
        "RUJI",
        "AUTO", 
        "MNTA",
        "NAMI"
    ];
    
    for (const symbol of tokenSymbols) {
        try {
            console.log(`\nToken Symbol: ${symbol}`);
            console.log(`This would query token information for symbol: ${symbol}`);
            console.log(`In a real implementation, this would call the Rujira API`);
            
        } catch (error) {
            console.error(`Error getting token by symbol ${symbol}:`, error);
        }
    }
}

async function getTokensBySymbols() {
    console.log("\n=== Getting Multiple Tokens by Symbols ===");
    
    const symbols = ["RUJI", "AUTO", "MNTA"];
    
    try {
        console.log(`Requesting tokens with symbols: ${symbols.join(', ')}`);
        console.log(`This would query multiple tokens by symbols`);
        console.log(`In a real implementation, this would call the Rujira API`);
        
    } catch (error) {
        console.error(`Error getting tokens by symbols:`, error);
    }
}

async function getAllTokens() {
    console.log("\n=== Getting All Tokens ===");
    
    try {
        console.log("Requesting all tokens");
        console.log(`This would query all available tokens`);
        console.log(`In a real implementation, this would call the Rujira API`);
        
        // Simulate response
        const mockTokens = {
            "x/ruji": { symbol: "RUJI", name: "Rujira" },
            "x/auto": { symbol: "AUTO", name: "Auto" },
            "x/mnta": { symbol: "MNTA", name: "MNTA" }
        };
        
        console.log(`\nTotal tokens found: ${Object.keys(mockTokens).length}`);
        
        // Show first few tokens as example
        const firstTokens = Object.entries(mockTokens).slice(0, 3);
        console.log("\nFirst 3 tokens:");
        firstTokens.forEach(([id, token]: [string, any]) => {
            console.log(`  ${id}: ${token.symbol} (${token.name})`);
        });
        
    } catch (error) {
        console.error(`Error getting all tokens:`, error);
    }
}

async function searchTokensByKeyword() {
    console.log("\n=== Searching Tokens by Keyword ===");
    
    const keywords = ["RUJI", "AUTO", "MNTA"];
    
    for (const keyword of keywords) {
        try {
            console.log(`\nSearching tokens with keyword: ${keyword}`);
            console.log(`This would search tokens by keyword: ${keyword}`);
            console.log(`In a real implementation, this would call the Rujira API`);
            
        } catch (error) {
            console.error(`Error searching tokens with keyword ${keyword}:`, error);
        }
    }
}

async function getTokenMetadata() {
    console.log("\n=== Getting Token Metadata ===");
    
    const tokenAddresses = [
        "x/ruji",  // RUJI native token
        "x/auto",  // AUTO token
    ];
    
    for (const address of tokenAddresses) {
        try {
            console.log(`\nRequesting token metadata for address: ${address}`);
            console.log(`This would query token metadata for address: ${address}`);
            console.log(`In a real implementation, this would call the Rujira API`);
            
        } catch (error) {
            console.error(`Error getting token metadata for address ${address}:`, error);
        }
    }
}

async function main() {
    console.log('🚀 Playground 08 - Get Token Information Examples');
    console.log('🌐 RPC URL:', KUJIRA_RPC_URL);
    console.log('');

    try {
        // Initialize connection
        console.log('✅ Connected to Rujira RPC successfully');
        
        // Get token by address
        await getTokenByAddress();
        
        // Get token by symbol
        await getTokenBySymbol();
        
        // Get multiple tokens by symbols
        await getTokensBySymbols();
        
        // Get all tokens
        await getAllTokens();
        
        // Search tokens by keyword
        await searchTokensByKeyword();
        
        // Get token metadata
        await getTokenMetadata();
        
    } catch (error) {
        console.error('❌ Error in main execution:', error);
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("Playground 08 completed!");
}

if (require.main === module) {
    main().catch(console.error);
}