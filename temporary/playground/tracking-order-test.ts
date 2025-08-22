import { CosmWasmClient, SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { GasPrice } from '@cosmjs/stargate';
import { fromBase64 } from '@cosmjs/encoding';
import { Decimal } from 'decimal.js';
import { properties } from '../../src/properties';
import { WalletPrivateKey } from '../../src/types';

// --- Network Configuration ---
const NETWORK_CONFIG = {
  rpc: 'https://thornode-mainnet-rpc.bryanlabs.net',
  rest: 'https://api.rujira.network',
  chainId: 'thorchain-mainnet-v1',
  prefix: 'thor',
  gasPrice: GasPrice.fromString('0.025rune')
};

// --- BTC/USDC Market Configuration (working tracking orders) ---
const BTC_USDC_MARKET = {
  address: "thor1dwsnlqw3lfhamc5dz3r57hlsppx3a2n2d7kppccxfdhfazjh06rs5077sz",
  baseDenom: "btc-btc",
  quoteDenom: "eth-usdc-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  tick: 2
};

// --- Test Configuration ---
const LIVE_EXECUTION = true; // Set to false for simulation mode
const ORDER_AMOUNT = 0.01; // USDC amount
const DEVIATION_BPS = 10; // 10 basis points = 0.1% premium

async function main() {
  console.log('--------------------------------------------------------------------------------');
  console.log('🚀 Rujira Tracking Order - Live Execution Test');
  console.log('Market: BTC/USDC');
  console.log('--------------------------------------------------------------------------------\n');

  // --- Configuration Display ---
  console.log('⚙️  Configuration:');
  console.log(`Live execution: ${LIVE_EXECUTION ? '✅ ENABLED' : '❌ DISABLED (Simulation)'}`);
  console.log(`Order amount: ${ORDER_AMOUNT} USDC`);
  console.log(`Deviation: ${DEVIATION_BPS} basis points ( ${(DEVIATION_BPS / 100).toFixed(2)} %)`);
  console.log('Wallet configured: ✅ YES\n');

  try {
    // --- Initialize CosmWasm Client ---
    console.log('🔌 Initializing CosmWasm client...');
    const client = await CosmWasmClient.connect(NETWORK_CONFIG.rpc);
    console.log('✅ Client connected successfully\n');

    // --- Fetch Market Data ---
    console.log('📊 Fetching market data...');
    const orderBookQuery = { book: { limit: 10 } };
    console.log(`Querying with: ${JSON.stringify(orderBookQuery)}`);

    const orderBookResponse = await client.queryContractSmart(
      BTC_USDC_MARKET.address,
      orderBookQuery
    );

    console.log('✅ Order book retrieved');
    console.log(`Raw response structure: ${JSON.stringify(Object.keys(orderBookResponse))}`);

    const baseOrders = orderBookResponse.base || [];
    const quoteOrders = orderBookResponse.quote || [];

    console.log(`📊 Order book: ${baseOrders.length} base orders, ${quoteOrders.length} quote orders`);

    if (baseOrders.length > 0 && quoteOrders.length > 0) {
      const bestBid = baseOrders[0];
      const bestAsk = quoteOrders[0];

      console.log(`Best bid (base): ${bestBid.price} USDC per BTC`);
      console.log(`Best ask (quote): ${bestAsk.price} USDC per BTC`);

      // Calculate center price for reference
      const centerPrice = new Decimal(bestBid.price).plus(bestAsk.price).div(2);
      console.log(`Calculated center price: ${centerPrice.toFixed(6)} USDC per BTC\n`);

      // --- Oracle Data Note ---
      console.log('⚠️  Oracle Data Note:');
      console.log('Oracle price feeds are not available through direct client queries');
      console.log('We will use current market price as a reference for testing');
      console.log('In production, tracking orders use real-time oracle data\n');

      // --- Tracking Order Parameters ---
      console.log('📝 Tracking Order Parameters:');
      console.log('Order side: BUY (BTC)');
      console.log(`Amount: ${ORDER_AMOUNT} USDC`);
      console.log(`Deviation: ${DEVIATION_BPS} basis points ( ${(DEVIATION_BPS / 100).toFixed(2)} %)`);
      console.log('Price strategy: Premium above oracle\n');

      // --- Price Calculations (Reference) ---
      const referencePrice = new Decimal(bestAsk.price);
      const deviationMultiplier = new Decimal(1).plus(DEVIATION_BPS / 10000);
      const adjustedPrice = referencePrice.mul(deviationMultiplier);
      const priceDifference = adjustedPrice.minus(referencePrice);
      const expectedBTCAmount = new Decimal(ORDER_AMOUNT).div(adjustedPrice);

      console.log('💰 Price Calculations:');
      console.log(`Reference price: ${referencePrice.toFixed(6)} USDC per BTC`);
      console.log(`Adjusted price: ${adjustedPrice.toFixed(4)} USDC per BTC`);
      console.log(`Price difference: ${priceDifference.toFixed(4)} USDC per BTC`);
      console.log(`Expected BTC amount: ${expectedBTCAmount.toFixed(8)} BTC\n`);

      // --- Order Message Construction ---
      const orderMessage = {
        order: [
          [
            [
              "quote", // Buying BTC with USDC
              {
                "oracle": DEVIATION_BPS // 10 basis points deviation
              },
              (ORDER_AMOUNT * 1000000).toString() // Convert to micro-USDC
            ]
          ],
          null
        ]
      };

      console.log('📤 Order Details:');
      console.log(`Message: ${JSON.stringify(orderMessage, null, 2)}`);
      console.log(`Contract address: ${BTC_USDC_MARKET.address}\n`);

      if (LIVE_EXECUTION) {
        // --- Live Execution Mode ---
        console.log('🚀 LIVE EXECUTION MODE - Preparing wallet...');

        // Initialize wallet from properties
        const walletKey = properties.getAs<WalletPrivateKey | undefined>('rujira.wallet.privateKey');
        if (!walletKey) {
          throw new Error('❌ Wallet private key not found in configuration');
        }

        const wallet = await DirectSecp256k1Wallet.fromKey(
          fromBase64(walletKey),
          NETWORK_CONFIG.prefix
        );
        const accounts = await wallet.getAccounts();
        const walletAddress = accounts[0].address;
        console.log(`✅ Wallet created: ${walletAddress}`);

        // Create signing client
        const signingClient = await SigningCosmWasmClient.connectWithSigner(
          NETWORK_CONFIG.rpc,
          wallet,
          { gasPrice: NETWORK_CONFIG.gasPrice }
        );
        console.log('✅ Signing client connected\n');

        // --- Balance Check ---
        console.log('💰 Checking wallet balance...');
        const usdcDenom = BTC_USDC_MARKET.quoteDenom;
        console.log(`Looking for USDC denom: ${usdcDenom}`);

        // Use REST API for comprehensive balance check
        const balanceResponse = await fetch(
          `https://thornode.ninerealms.com/cosmos/bank/v1beta1/balances/${walletAddress}`
        );

        if (!balanceResponse.ok) {
          throw new Error(`❌ Failed to fetch balances: ${balanceResponse.statusText}`);
        }

        const balanceData = await balanceResponse.json() as { balances: Array<{ denom: string; amount: string }> };
        const balances = balanceData.balances || [];

        console.log('All wallet balances from REST API:');
        let usdcBalance = new Decimal(0);

        for (const balance of balances) {
          const amount = new Decimal(balance.amount).div(10 ** 6); // Convert from micro units
          if (balance.denom === usdcDenom) {
            usdcBalance = amount;
            console.log(`   💰 ${balance.denom}: ${amount.toFixed(6)} USDC`);
          } else {
            console.log(`   💰 ${balance.denom}: ${amount.toFixed(0)}`);
          }
        }

        if (usdcBalance.isZero()) {
          throw new Error('❌ No USDC balance found');
        }

        console.log(`✅ Found USDC balance: ${usdcBalance.toFixed(6)} USDC (${usdcDenom})`);

        if (usdcBalance.lt(ORDER_AMOUNT)) {
          throw new Error(`❌ Insufficient USDC balance for this order. Available: ${usdcBalance.toFixed(6)} USDC, Required: ${ORDER_AMOUNT} USDC`);
        }

        console.log(`✅ Sufficient USDC balance for order: ${usdcBalance.toFixed(6)} USDC`);

        // Prepare funds to send
        const funds = [
          {
            denom: usdcDenom,
            amount: (ORDER_AMOUNT * 1000000).toFixed(0) // Convert to micro-USDC
          }
        ];

        console.log(`Funds to send: ${JSON.stringify(funds, null, 2)}\n`);

        // --- Final Confirmation ---
        console.log('⚠️  FINAL CONFIRMATION');
        console.log('You are about to place a REAL tracking order:');
        console.log(`- Market: BTC/USDC`);
        console.log(`- Amount: ${ORDER_AMOUNT} USDC`);
        console.log(`- Expected return: ~${expectedBTCAmount.toFixed(8)} BTC`);
        console.log(`- Deviation: ${DEVIATION_BPS} bps (${(DEVIATION_BPS / 100).toFixed(2)}%)`);
        console.log('- Order will execute when market conditions match your deviation\n');

        // --- Execute Order ---
        console.log('🚀 Executing tracking order...\n');

        const result = await signingClient.execute(
          walletAddress,
          BTC_USDC_MARKET.address,
          orderMessage,
          'auto',
          undefined,
          funds
        );

        console.log('✅ TRACKING ORDER PLACED SUCCESSFULLY!');
        console.log(`Transaction hash: ${result.transactionHash}`);
        console.log(`Gas used: ${result.gasUsed}`);
        console.log(`Gas wanted: ${result.gasWanted}\n`);

        // --- Transaction Events ---
        console.log('Transaction events:');
        if (result.events) {
          result.events.forEach((event, index) => {
            console.log(`${index + 1}. ${event.type}:`);
            event.attributes.forEach(attr => {
              console.log(`   ${attr.key}: ${attr.value}`);
            });
          });
        }

        console.log('\n🎉 Order placed! Your tracking order is now active.');
        console.log('It will execute automatically when the market price reaches your target deviation.\n');

        console.log('To monitor your order:');
        console.log('1. Check the transaction on THORChain explorer');
        console.log('2. Monitor the BTC/USDC market for fills');
        console.log('3. Check your wallet balance for BTC tokens when filled');

      } else {
        // --- Simulation Mode ---
        console.log('🧪 SIMULATION MODE - No actual order will be placed');
        console.log('Order message would be:');
        console.log(JSON.stringify(orderMessage, null, 2));
        console.log('\nTo enable live execution, set LIVE_EXECUTION = true');
      }

    } else {
      console.log('❌ Insufficient order book data for calculations');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// --- Run ---
if (require.main === module) {
  main();
}
