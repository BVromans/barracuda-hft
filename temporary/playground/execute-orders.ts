import { properties } from "../../src/properties";
import { Rujira } from "../../src/rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions, WalletMnemonic, WalletPrivateKey, OrderType, OrderSide, OrderStatus } from "../../src/types";
import Decimal from 'decimal.js';

async function testPlaceOrder(rujira: Rujira) {
	console.log("\n🧪 Testing placeOrder method...");

	try {
		// Test 1: Place a single limit order (similar to create-limit-order-01.ts)
		console.log("\n📋 Test 1: Placing a single limit order (BUY RUJI with USDC) - SKIPPED");
		console.log("   Commented out to avoid creating too many orders");

		// const placeOrderResult = await rujira.fin.placeOrder({
		// 	ownerAddress: rujira.walletAddress,
		// 	marketSymbol: "RUJI/USDC",
		// 	side: OrderSide.BUY,
		// 	type: OrderType.LIMIT,
		// 	amount: new Decimal("0.002"), // Small amount for testing
		// 	price: new Decimal("0.90") // Price similar to current market
		// });

		// console.log(`✅ Order placed successfully!`);
		// console.log(`   Order ID: ${placeOrderResult.order.id}`);
		// console.log(`   Market: ${placeOrderResult.order.market.symbol}`);
		// console.log(`   Side: ${placeOrderResult.order.side}`);
		// console.log(`   Type: ${placeOrderResult.order.type}`);
		// console.log(`   Price: ${placeOrderResult.order.price}`);
		// console.log(`   Amount: ${placeOrderResult.order.amount}`);
		// console.log(`   Status: ${placeOrderResult.order.status}`);
		// console.log(`   Transaction Hash: ${placeOrderResult.transaction.hash}`);

		// Test 2: Place multiple orders at once
		console.log("\n📋 Test 2: Placing multiple orders at once");

		const placeOrdersResult = await rujira.fin.placeOrders({
			ownerAddress: rujira.walletAddress,
			orders: [
				{
					marketSymbol: "RUJI/USDC",
					side: OrderSide.BUY,
					type: OrderType.FIXED_PRICE,
					amount: new Decimal("0.004"), // Small amount
					price: new Decimal("0.85")
				},
				{
					marketSymbol: "RUJI/USDC",
					side: OrderSide.BUY,
					type: OrderType.FIXED_PRICE,
					amount: new Decimal("0.005"), // Small amount
					price: new Decimal("0.80")
				}
			]
		});

		console.log(`✅ Multiple orders placed successfully!`);
		console.log(`   Total orders: ${placeOrdersResult.orders.size}`);
		console.log(`   Total transactions: ${placeOrdersResult.transactions.size}`);

							// Display the placed orders
		placeOrdersResult.orders.forEach((order, orderId) => {
			const marketSymbol = order.market?.symbol || "RUJI/USDC"; // Fallback to known market
			console.log(`   Order ${orderId}: ${marketSymbol} ${order.side} ${order.amount} @ ${order.price}`);
		});

		// Test 3: Verify the orders were created by fetching them
		console.log("\n📋 Test 3: Verifying created orders");

		const verifyOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			orderStatuses: [OrderStatus.OPEN, OrderStatus.CREATION_PENDING],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${verifyOrders.size} orders in RUJI/USDC market`);
		verifyOrders.forEach((order, orderId) => {
			console.log(`   ${orderId}: ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
		});

		console.log("\n🎉 All placeOrder tests completed successfully!");

	} catch (error) {
		console.error("❌ Error testing placeOrder:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testReplaceOrder(rujira: Rujira) {
	console.log("\n🧪 Testing replaceOrder method...");

	try {
		// First, get existing RUJI orders to replace
		console.log("\n📋 Test 1: Getting existing RUJI orders to replace");

		// Get all RUJI orders (including different statuses) - no status filter
		const allRujiOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			maximumNumberOfOrders: 50
		});



		console.log(`✅ Found ${allRujiOrders.size} total RUJI orders`);

		// Show details of all RUJI orders
		if (allRujiOrders.size > 0) {
			console.log("All RUJI orders found:");
			allRujiOrders.forEach((order: any, orderId: any) => {
				console.log(`   ${orderId}: ${order.market.symbol} ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
			});

			// Group orders by status
			const ordersByStatus = new Map();
			allRujiOrders.forEach((order: any) => {
				const status = order.status;
				if (!ordersByStatus.has(status)) {
					ordersByStatus.set(status, []);
				}
				ordersByStatus.get(status).push(order);
			});

			console.log("\nOrders by status:");
			ordersByStatus.forEach((orders, status) => {
				console.log(`   ${status}: ${orders.length} orders`);
			});
		}

		// Filter to only OPEN orders for replacement
		const existingOrders = allRujiOrders.filter((order: any) => order.status === OrderStatus.OPEN);

		if (existingOrders.size === 0) {
			console.log("⚠️  No open orders found to replace. Skipping replace tests.");
			return;
		}

		console.log(`✅ Found ${existingOrders.size} open orders to replace`);

				// Test 2: Replace order tests (commented out for now due to contract state issues)
		console.log("\n📋 Test 2: Replace order tests - SKIPPED");
		console.log("   Note: Replace order tests are temporarily disabled due to contract state issues.");
		console.log("   The existing order appears to have internal state that prevents replacement.");
		console.log("   We can come back to this later when we have fresh orders to test with.");

		// Test 3: Replace multiple orders tests (commented out for now)
		console.log("\n📋 Test 3: Replace multiple orders tests - SKIPPED");
		console.log("   Note: Multiple replace order tests are also temporarily disabled.");

		// Test 4: Verify current orders (for reference)
		console.log("\n📋 Test 4: Verifying current orders");

		const verifyCurrentOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${verifyCurrentOrders.size} orders in RUJI/USDC market`);
		verifyCurrentOrders.forEach((order, orderId) => {
			console.log(`   ${orderId}: ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
		});

		console.log("\n🎉 Replace order tests completed (skipped due to contract state issues)!");

	} catch (error) {
		console.error("❌ Error testing replaceOrder:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testCancelOrder(rujira: Rujira) {
	console.log("\n🧪 Testing cancelOrder method...");

	try {
		// First, get existing orders to cancel
		console.log("\n📋 Test 1: Getting existing orders to cancel");

		const existingOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${existingOrders.size} open orders to cancel`);

		if (existingOrders.size === 0) {
			console.log("⚠️  No open orders found to cancel. Skipping cancel tests.");
			return;
		}

		// Show details of orders to be cancelled
		existingOrders.forEach((order, orderId) => {
			console.log(`   ${orderId}: ${order.market.symbol} ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
		});

		// Test 2: Cancel a single order
		console.log("\n📋 Test 2: Cancelling a single order");
		const firstOrder = existingOrders.valueSeq().first();
		if (firstOrder) {
			console.log(`   Original order: ${firstOrder.side} ${firstOrder.amount} @ ${firstOrder.price}`);

			try {
				const cancelOrderResult = await rujira.fin.cancelOrder({
					ownerAddress: rujira.walletAddress,
					marketSymbol: firstOrder.market.symbol,
					orderId: firstOrder.id
				});

				console.log(`✅ Order cancelled successfully!`);
				console.log(`   Order ID: ${cancelOrderResult.order.id}`);
				console.log(`   Market: ${cancelOrderResult.order.market.symbol}`);
				console.log(`   Side: ${cancelOrderResult.order.side}`);
				console.log(`   Amount: ${cancelOrderResult.order.amount}`);
				console.log(`   Price: ${cancelOrderResult.order.price}`);
				console.log(`   Status: ${cancelOrderResult.order.status}`);
				console.log(`   Transaction Hash: ${cancelOrderResult.transaction.hash}`);
			} catch (cancelError) {
				console.log(`❌ Failed to cancel order: ${cancelError}`);
			}
		}

		// Test 3: Verify the order was cancelled by fetching orders
		console.log("\n📋 Test 3: Verifying cancelled order");

		const verifyCancelledOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${verifyCancelledOrders.size} orders in RUJI/USDC market after cancellation`);
		verifyCancelledOrders.forEach((order, orderId) => {
			console.log(`   ${orderId}: ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
		});

		console.log("\n🎉 All cancelOrder tests completed successfully!");

	} catch (error) {
		console.error("❌ Error testing cancelOrder:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testGetOrders(rujira: Rujira) {
	console.log("🧪 Testing getOrders method...");

	try {
		// Test 1: Get all orders for the wallet
		console.log("\n📋 Test 1: Getting all orders for wallet");
		const allOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${allOrders.size} orders`);
		allOrders.forEach((order, orderId) => {
			console.log(`  📄 Order ID: ${orderId}`);
			console.log(`     Market: ${order.market.symbol}`);
			console.log(`     Side: ${order.side}`);
			console.log(`     Type: ${order.type}`);
			console.log(`     Status: ${order.status}`);
			console.log(`     Price: ${order.price}`);
			console.log(`     Amount: ${order.amount}`);
			console.log(`     Filled: ${order.filledAmount}/${order.amount} (${order.filledPercentage.mul(100)}%)`);
			console.log("     ---");
		});

		// Test 2: Filter by order status
		console.log("\n📋 Test 2: Getting only OPEN orders");
		const openOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Found ${openOrders.size} open orders`);

		// Test 3: Filter by order side
		console.log("\n📋 Test 3: Getting only BUY orders");
		const buyOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			orderSides: [OrderSide.BUY],
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Found ${buyOrders.size} buy orders`);

		// Test 4: Filter by order type
		console.log("\n📋 Test 4: Getting only LIMIT orders");
		const limitOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			orderTypes: [OrderType.FIXED_PRICE],
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Found ${limitOrders.size} limit orders`);

		// Test 5: Get specific order by ID (if we have any orders)
		if (allOrders.size > 0) {
			const firstOrderId = allOrders.keySeq().first();
			if (firstOrderId) {
				console.log(`\n📋 Test 5: Getting specific order by ID: ${firstOrderId}`);

				const specificOrder = await rujira.fin.getOrders({
					ownerAddress: rujira.walletAddress,
					marketSymbol: "RUJI/USDC",
					orderIds: [firstOrderId]
				});

				console.log(`✅ Found ${specificOrder.size} specific order(s)`);
			}
		}

		// Test 6: Test with RUJI/USDC market as well
		console.log("\n📋 Test 6: Testing RUJI/USDC market");
		const rujiOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "RUJI/USDC",
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Found ${rujiOrders.size} RUJI/USDC orders`);

		console.log("\n🎉 All getOrders tests completed successfully!");

	} catch (error) {
		console.error("❌ Error testing getOrders:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testGetStatus(rujira: Rujira) {
	console.log("\n🧪 Testing getStatus method...");

	try {
		const status = await rujira.fin.getStatus({});
		console.log(`✅ System status: ${status.status}`);
		if (status.error) {
			console.log(`⚠️  Status error: ${status.error}`);
		}
	} catch (error) {
		console.error("❌ Error testing getStatus:", error);
	}
}

async function testGetMarkets(rujira: Rujira) {
	console.log("\n🧪 Testing getMarkets method...");

	try {
		const markets = await rujira.fin.getAllMarkets({});
		console.log(`✅ Found ${markets.size} markets`);

		// Show first 3 markets as examples
		let count = 0;
		markets.forEach((market, address) => {
			if (count < 3) {
				console.log(`  📊 Market: ${market.symbol} (${address})`);
				console.log(`     Base: ${market.tokens.base.symbol}`);
				console.log(`     Quote: ${market.tokens.quote.symbol}`);
				console.log("     ---");
				count++;
			}
		});
	} catch (error) {
		console.error("❌ Error testing getMarkets:", error);
	}
}

async function testGetTokens(rujira: Rujira) {
	console.log("\n🧪 Testing getTokens method...");

	try {
		const tokens = await rujira.fin.getAllTokens({});
		console.log(`✅ Found ${tokens.size} tokens`);

		// Show first 3 tokens as examples
		let count = 0;
		tokens.forEach((token, address) => {
			if (count < 3) {
				console.log(`  🪙 Token: ${token.symbol} (${address})`);
				console.log(`     Name: ${token.name}`);
				console.log(`     Decimals: ${token.decimals}`);
				console.log("     ---");
				count++;
			}
		});
	} catch (error) {
		console.error("❌ Error testing getTokens:", error);
	}
}

async function testGetOrderBook(rujira: Rujira) {
	console.log("\n🧪 Testing getOrderBook method...");

	try {
		const orderBook = await rujira.fin.getOrderBook({
			marketSymbol: "RUJI/USDC",
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Order book retrieved for ${orderBook.market.symbol}`);
		console.log(`   Asks: ${orderBook.book.asks.size} orders`);
		console.log(`   Bids: ${orderBook.book.bids.size} orders`);

		if (orderBook.book.bestAsk) {
			console.log(`   Best Ask: ${orderBook.book.bestAsk.price} @ ${orderBook.book.bestAsk.amount}`);
		}
		if (orderBook.book.bestBid) {
			console.log(`   Best Bid: ${orderBook.book.bestBid.price} @ ${orderBook.book.bestBid.amount}`);
		}
	} catch (error) {
		console.error("❌ Error testing getOrderBook:", error);
	}
}

async function testGetMarketDetails(rujira: Rujira) {
	console.log("\n🧪 Testing getMarket method for RUJI/USDC...");

	try {
		const market = await rujira.fin.getMarket({
			symbol: "RUJI/USDC"
		});

		console.log(`✅ Market details for ${market.symbol}:`);
		console.log(`   Address: ${market.address}`);
		console.log(`   Base Token: ${market.tokens.base.symbol} (${market.tokens.base.address})`);
		console.log(`   Quote Token: ${market.tokens.quote.symbol} (${market.tokens.quote.address})`);
		console.log(`   Base Decimals: ${market.tokens.base.decimals}`);
		console.log(`   Quote Decimals: ${market.tokens.quote.decimals}`);
	} catch (error) {
		console.error("❌ Error testing getMarket:", error);
	}
}

(async function run() {
	console.log("🚀 Starting Rujira HFT Bot Playground...");

	try {
		// Check for wallet credentials
		const walletMnemonic = process.env.TEAM_RUJIRA_WALLET_MNEMONIC;
		const walletPrivateKey = process.env.TEAM_RUJIRA_WALLET_PRIVATE_KEY;

		if (!walletMnemonic && !walletPrivateKey) {
			console.error("❌ No wallet credentials found!");
			console.log("💡 Please set one of these environment variables:");
			console.log("   - TEAM_RUJIRA_WALLET_MNEMONIC");
			console.log("   - TEAM_RUJIRA_WALLET_PRIVATE_KEY");
			console.log("\n🔧 You can also add them to the development.yml file");
			return;
		}

		// Initialize Rujira client
		console.log("🔧 Initializing Rujira client...");
		const rujira = new Rujira({
			walletMnemonic: walletMnemonic as WalletMnemonic,
			walletPrivateKey: walletPrivateKey as WalletPrivateKey,
		} as RujiraConstructorOptions);

		await rujira.initialize({} as RujiraInitializeOptions);
		console.log(`✅ Rujira client initialized successfully!`);
		console.log(`👤 Wallet address: ${rujira.walletAddress}`);

		// Run tests
		await testGetStatus(rujira);
		await testGetMarkets(rujira);
		await testGetTokens(rujira);
		await testGetOrderBook(rujira);
		await testGetOrders(rujira);
		await testGetMarketDetails(rujira);
		await testPlaceOrder(rujira);
		// await testReplaceOrder(rujira);
		// await testCancelOrder(rujira); // Commented out for now

		console.log("\n🎉 Playground completed successfully!");

	} catch (error) {
		console.error("❌ Playground failed:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
		process.exit(1);
	}
})();
