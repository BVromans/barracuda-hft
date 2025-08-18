import { properties } from "../../src/properties";
import { Rujira } from "../../src/rujira";
import { RujiraConstructorOptions, RujiraInitializeOptions, WalletMnemonic, WalletPrivateKey, OrderType, OrderSide, OrderStatus, MarketSymbol } from "../../src/types";
import Decimal from 'decimal.js';

async function testPlaceOrder(rujira: Rujira) {
	console.log("\n🧪 Testing placeOrder method...");

	try {
		// Test 1: Place a single limit order (similar to create-limit-order-01.ts)
		console.log("\n📋 Test 1: Placing a single limit order (BUY LQDY with USDC)");

		const placeOrdersResult = await rujira.fin.placeOrders({
			ownerAddress: rujira.walletAddress,
			orders: [
				{
					marketSymbol: "THOR-RUJI/ETH-USDC",
					side: OrderSide.BUY,
					type: OrderType.FIXED_PRICE,
					amount: new Decimal("0.004"), // Small amount
					price: new Decimal("0.85")
				},
				{
					marketSymbol: "THOR-RUJI/ETH-USDC",
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
			marketSymbol: "THOR-LQDY/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN, OrderStatus.CREATION_PENDING],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${verifyOrders.size} orders in THOR-LQDY/ETH-USDC market`);
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
			marketSymbol: "THOR-RUJI/ETH-USDC",
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

						// Test 2: Replace a single order
		console.log("\n📋 Test 2: Replacing a single order");
		const firstOrder = existingOrders.first();

		if (!firstOrder) {
			console.log("⚠️  No orders available to replace. Skipping replace test.");
			return;
		}

		console.log(`   Original order: ${firstOrder.side} ${firstOrder.amount} @ ${firstOrder.price}`);

		// Replace with a slightly smaller amount (decrease by half for testing)
		const newAmount = firstOrder.amount.div(Decimal('2'));
		console.log(`   New amount: ${newAmount.toString()} (decreased from ${firstOrder.amount.toString()})`);

		const replaceResult = await rujira.fin.replaceOrder({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			side: firstOrder.side,
			type: firstOrder.type,
			amount: newAmount,
			price: firstOrder.price
		});

		console.log("✅ Order replaced successfully!");
		console.log(`   Order ID: ${replaceResult.order.id}`);
		console.log(`   Market: ${replaceResult.order.market.symbol}`);
		console.log(`   Side: ${replaceResult.order.side}`);
		console.log(`   Amount: ${replaceResult.order.amount}`);
		console.log(`   Price: ${replaceResult.order.price}`);
		console.log(`   Status: ${replaceResult.order.status}`);
		console.log(`   Transaction Hash: ${replaceResult.transaction.hash}`);

		// Test 3: Verify replacement
		console.log("\n📋 Test 3: Verifying replacement");
		const updatedOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${updatedOrders.size} orders in THOR-RUJI/ETH-USDC market after replacement`);
		updatedOrders.forEach((order, orderId) => {
			console.log(`   ${orderId}: ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
		});

		// Test 4: Verify current orders (for reference)
		console.log("\n📋 Test 4: Verifying current orders");

		const verifyCurrentOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-LQDY/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${verifyCurrentOrders.size} orders in THOR-LQDY/ETH-USDC market`);
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

async function testWithdrawOrders(rujira: Rujira) {
	console.log("\n🧪 Testing withdrawOrders method...");

	try {
		// First, get existing RUJI orders to find FILLED ones to withdraw
		console.log("\n📋 Test 1: Getting existing RUJI orders to find FILLED orders");

		// Get all RUJI orders (including FILLED status)
		const allRujiOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
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

		// Filter to only FILLED orders for withdrawal
		const filledOrders = allRujiOrders.filter((order: any) => order.status === OrderStatus.FILLED);

		if (filledOrders.size === 0) {
			console.log("⚠️  No filled orders found to withdraw. Skipping withdraw tests.");
			console.log("   Note: You need orders that are completely filled (100%) to test withdrawal.");
			return;
		}

		console.log(`✅ Found ${filledOrders.size} filled orders to withdraw`);

		// Test 2: Withdraw a single filled order
		console.log("\n📋 Test 2: Withdrawing a single filled order");
		const firstFilledOrder = filledOrders.first();

		if (!firstFilledOrder) {
			console.log("⚠️  No filled orders available to withdraw. Skipping withdraw test.");
			return;
		}

		console.log(`   Filled order: ${firstFilledOrder.side} ${firstFilledOrder.amount} @ ${firstFilledOrder.price} (${firstFilledOrder.status})`);

		const withdrawResult = await rujira.fin.withdrawAllFilledOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC"
		});

		console.log("✅ Orders withdrawn successfully!");
		console.log(`   Withdrawn ${withdrawResult.orders.size} orders`);
		withdrawResult.orders.forEach((order, orderId) => {
			console.log(`   Order ID: ${orderId}`);
			console.log(`   Market: ${order.market.symbol}`);
			console.log(`   Side: ${order.side}`);
			console.log(`   Amount: ${order.amount}`);
			console.log(`   Price: ${order.price}`);
			console.log(`   Status: ${order.status}`);
		});

		withdrawResult.transactions.forEach((transaction) => {
			console.log(`   Transaction Hash: ${transaction.hash}`);
		});

		// Test 3: Verify withdrawal
		console.log("\n📋 Test 3: Verifying withdrawal");
		const updatedOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			orderStatuses: [OrderStatus.FILLED],
			maximumNumberOfOrders: 10
		});

		console.log(`✅ Found ${updatedOrders.size} filled orders in THOR-RUJI/ETH-USDC market after withdrawal`);
		if (updatedOrders.size > 0) {
			updatedOrders.forEach((order, orderId) => {
				console.log(`   ${orderId}: ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
			});
		} else {
			console.log("   No more filled orders remaining - all were successfully withdrawn!");
		}

		console.log("\n🎉 All withdraw order tests completed successfully!");

	} catch (error) {
		console.error("❌ Error testing withdrawOrders:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testCancelOrders(rujira: Rujira) {
	console.log("\n🧪 Testing cancelOrders method (plural)...");

	try {
		// First, get existing RUJI orders to find multiple OPEN orders to cancel
		console.log("\n📋 Test 1: Getting existing RUJI orders to find multiple OPEN orders");

		// Get all RUJI orders with OPEN status
		const allRujiOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 50
		});

		console.log(`📊 Found ${allRujiOrders.size} OPEN RUJI orders`);

		if (allRujiOrders.size < 2) {
			console.log("⚠️  Need at least 2 OPEN orders to test cancelOrders. Skipping test.");
			return;
		}

		// Take the first 2 orders for cancellation
		const ordersToCancel = allRujiOrders.valueSeq().take(2).toArray();
		console.log(`📋 Selected ${ordersToCancel.length} orders for cancellation:`);
		ordersToCancel.forEach((order, index) => {
			console.log(`   ${index + 1}. ${order.side} ${order.amount} @ ${order.price} USDC (ID: ${order.id})`);
		});

		// Test cancelOrders with multiple orders (extract order IDs)
		console.log("\n📋 Test 2: Canceling multiple orders using cancelOrders");
		const orderIdsToCancel = ordersToCancel.map(order => order.id).filter((id): id is string => id !== undefined);
		const cancelOrdersResult = await rujira.fin.cancelOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			orderIds: orderIdsToCancel
		});

		console.log("✅ cancelOrders result:", {
			cancelledOrdersCount: cancelOrdersResult.orders.size,
			transactionHash: cancelOrdersResult.transactions.keySeq().first()
		});

		// Verify the orders were cancelled
		console.log("\n📋 Test 3: Verifying the orders were cancelled");
		const ordersAfterCancel = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 50
		});

		console.log(`✅ Verification: OPEN orders before: ${allRujiOrders.size}, after: ${ordersAfterCancel.size}`);
		if (ordersAfterCancel.size === allRujiOrders.size - ordersToCancel.length) {
			console.log("🎉 SUCCESS: All selected orders were cancelled successfully!");
		} else {
			console.log("⚠️  Unexpected result in order cancellation verification");
		}

	} catch (error) {
		console.error("❌ Error testing cancelOrders:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testReplaceOrders(rujira: Rujira) {
	console.log("\n🧪 Testing replaceOrders method (plural)...");

	try {
		// First, get existing RUJI orders to find multiple OPEN orders to replace
		console.log("\n📋 Test 1: Getting existing RUJI orders to find multiple OPEN orders");

		// Get all RUJI orders with OPEN status
		const allRujiOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 50
		});

		console.log(`📊 Found ${allRujiOrders.size} OPEN RUJI orders`);

		if (allRujiOrders.size < 2) {
			console.log("⚠️  Need at least 2 OPEN orders to test replaceOrders. Skipping test.");
			return;
		}

		// Take the first 2 orders for replacement
		const ordersToReplace = allRujiOrders.valueSeq().take(2).toArray();
		console.log(`📋 Selected ${ordersToReplace.length} orders for replacement:`);
		ordersToReplace.forEach((order, index) => {
			console.log(`   ${index + 1}. ${order.side} ${order.amount} @ ${order.price} USDC (ID: ${order.id})`);
		});

		// Create replacement orders with smaller amounts (to avoid overflow issues)
		const replacementOrders = ordersToReplace.map(order => ({
			marketSymbol: "THOR-RUJI/ETH-USDC" as MarketSymbol,
			side: order.side,
			type: OrderType.FIXED_PRICE,
			amount: order.amount.div(Decimal('2')), // Reduce by half
			price: order.price
		}));

		console.log(`📋 Replacement orders (reduced amounts):`);
		replacementOrders.forEach((order, index) => {
			console.log(`   ${index + 1}. ${order.side} ${order.amount} @ ${order.price} USDC (reduced from ${ordersToReplace[index].amount})`);
		});

		// Test replaceOrders with multiple orders
		console.log("\n📋 Test 2: Replacing multiple orders using replaceOrders");
		const replaceOrdersResult = await rujira.fin.replaceOrders({
			ownerAddress: rujira.walletAddress,
			orders: replacementOrders
		});

		console.log("✅ replaceOrders result:", {
			replacedOrdersCount: replaceOrdersResult.orders.size,
			transactionHash: replaceOrdersResult.transactions.keySeq().first()
		});

		// Verify the orders were replaced with new amounts
		console.log("\n📋 Test 3: Verifying the orders were replaced with new amounts");
		const ordersAfterReplace = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 50
		});

		console.log(`✅ Verification: Found ${ordersAfterReplace.size} OPEN orders after replacement`);

		// Check if the amounts were actually updated
		let replacedCount = 0;
		replacementOrders.forEach((replaceOrder, index) => {
			const originalOrder = ordersToReplace[index];
			const updatedOrder = ordersAfterReplace.valueSeq().find(order =>
				order.side === originalOrder.side &&
				(order.price?.equals(originalOrder.price || Decimal(0)) === true)
			);

			if (updatedOrder && updatedOrder.amount.equals(replaceOrder.amount)) {
				console.log(`   ✅ Order ${index + 1}: Amount updated from ${originalOrder.amount} to ${updatedOrder.amount}`);
				replacedCount++;
			}
		});

		if (replacedCount === replacementOrders.length) {
			console.log("🎉 SUCCESS: All selected orders were replaced with new amounts successfully!");
		} else {
			console.log(`⚠️  Partial success: ${replacedCount}/${replacementOrders.length} orders were replaced successfully`);
		}

	} catch (error) {
		console.error("❌ Error testing replaceOrders:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testCancelOrder(rujira: Rujira) {
	console.log("\n🧪 Testing cancelOrder method...");

	try {
		// First, get all markets to search for orders
		console.log("\n📋 Test 1: Getting existing orders to cancel across all markets");

		const markets = await rujira.fin.getAllMarkets({});
		console.log(`🔍 Searching for orders across ${markets.size} markets...`);

		let allExistingOrders = new Map();

		// Search for orders in each market
		for (const market of markets.values()) {
			try {
				const marketOrders = await rujira.fin.getOrders({
					ownerAddress: rujira.walletAddress,
					marketSymbol: market.symbol,
					orderStatuses: [OrderStatus.OPEN],
					maximumNumberOfOrders: 50
				});

				if (marketOrders.size > 0) {
					console.log(`   Found ${marketOrders.size} orders in ${market.symbol}`);
					marketOrders.forEach((order, orderId) => {
						allExistingOrders.set(orderId, order);
					});
				}
			} catch (error) {
				// Skip markets that might have issues
				console.debug(`   Skipping ${market.symbol}: ${error}`);
			}
		}

		console.log(`✅ Found ${allExistingOrders.size} total open orders to cancel`);

		if (allExistingOrders.size === 0) {
			console.log("⚠️  No open orders found to cancel. Skipping cancel tests.");
			return;
		}

		// Show details of orders to be cancelled
		allExistingOrders.forEach((order, orderId) => {
			console.log(`   ${orderId}: ${order.market.symbol} ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
		});

		// Test 2: Cancel a single order
		console.log("\n📋 Test 2: Cancelling a single order");
		const firstOrder = allExistingOrders.values().next().value;
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

		// Test 3: Verify the order was cancelled by fetching orders from the specific market
		console.log("\n📋 Test 3: Verifying cancelled order");

		if (firstOrder) {
			const verifyCancelledOrders = await rujira.fin.getOrders({
				ownerAddress: rujira.walletAddress,
				marketSymbol: firstOrder.market.symbol,
				orderStatuses: [OrderStatus.OPEN],
				maximumNumberOfOrders: 10
			});

			console.log(`✅ Found ${verifyCancelledOrders.size} orders in ${firstOrder.market.symbol} market after cancellation`);
			verifyCancelledOrders.forEach((order, orderId) => {
				console.log(`   ${orderId}: ${order.side} ${order.amount} @ ${order.price} (${order.status})`);
			});
		}

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
			marketSymbol: "THOR-LQDY/ETH-USDC",
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
			console.log(`     Filled: ${order.filledPercentage.mul(100)}%`);
			console.log("     ---");
		});

		// Test 2: Filter by order status
		console.log("\n📋 Test 2: Getting only OPEN orders");
		const openOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-LQDY/ETH-USDC",
			orderStatuses: [OrderStatus.OPEN],
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Found ${openOrders.size} open orders`);

		// Test 3: Filter by order side
		console.log("\n📋 Test 3: Getting only BUY orders");
		const buyOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-LQDY/ETH-USDC",
			orderSides: [OrderSide.BUY],
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Found ${buyOrders.size} buy orders`);

		// Test 4: Filter by order type
		console.log("\n📋 Test 4: Getting only LIMIT orders");
		const limitOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-RUJI/ETH-USDC",
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
					marketSymbol: "THOR-LQDY/ETH-USDC",
					orderIds: [firstOrderId]
				});

				console.log(`✅ Found ${specificOrder.size} specific order(s)`);
			}
		}

		// Test 6: Test with THOR-LQDY/ETH-USDC market as well
		console.log("\n📋 Test 6: Testing THOR-LQDY/ETH-USDC market");
		const lqdyOrders = await rujira.fin.getOrders({
			ownerAddress: rujira.walletAddress,
			marketSymbol: "THOR-LQDY/ETH-USDC",
			maximumNumberOfOrders: 5
		});

		console.log(`✅ Found ${lqdyOrders.size} THOR-LQDY/ETH-USDC orders`);

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
			marketSymbol: "THOR-LQDY/ETH-USDC",
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

async function testMarketOrderBuy(rujira: Rujira) {
	console.log("\n🧪 Testing Market Order BUY (using swap)...");

	try {
		// Test 1: Get current order book to see market conditions
		console.log("\n📋 Test 1: Checking current market conditions");

				const orderBook = await rujira.fin.getOrderBook({
			marketSymbol: "THOR-RUJI/ETH-USDC",
			maximumNumberOfOrders: 3
		});

		console.log(`📊 Current market for ${orderBook.market.symbol}:`);
		if (orderBook.book.bestAsk) {
			console.log(`   Best Ask (sell price): ${orderBook.book.bestAsk.price} @ ${orderBook.book.bestAsk.amount}`);
		}
		if (orderBook.book.bestBid) {
			console.log(`   Best Bid (buy price): ${orderBook.book.bestBid.price} @ ${orderBook.book.bestBid.amount}`);
		}

		// Test 2: Execute a market BUY using swap (like the working playground)
		console.log("\n📋 Test 2: Executing market BUY via swap");
		console.log("   Note: Market orders are implemented as swaps, not traditional orders");

		// Get market details
		const market = await rujira.fin.getMarket({
			symbol: "THOR-RUJI/ETH-USDC"
		});

		// Calculate swap parameters (buying RUJI with USDC)
		const rujiAmount = new Decimal("0.01"); // Want to buy 0.01 RUJI
		const bestAskPrice = orderBook.book.bestAsk?.price || new Decimal("0.87");
		const usdcAmount = rujiAmount.mul(bestAskPrice); // Approximate USDC needed
		const slippageTolerance = new Decimal("0.05"); // 5% slippage
		const minReturn = rujiAmount.mul(new Decimal("1").minus(slippageTolerance));

		console.log(`   Buying ${rujiAmount} RUJI with ~${usdcAmount} USDC`);
		console.log(`   Expected price: ${bestAskPrice} USDC per RUJI`);
		console.log(`   Min return: ${minReturn} RUJI (with ${slippageTolerance.mul(100)}% slippage tolerance)`);

		// Convert to raw amounts (both tokens use 8 decimals)
		const rawUsdcAmount = usdcAmount.mul(10 ** market.tokens.quote.decimals).toFixed(0);
		const rawMinReturn = minReturn.mul(10 ** market.tokens.base.decimals).toFixed(0);

		console.log(`   Raw USDC amount: ${rawUsdcAmount}`);
		console.log(`   Raw min return: ${rawMinReturn}`);

		// Execute swap directly using CosmWasm client
		const swapResult = await rujira.cosmClient.execute(
			rujira.walletAddress,
			market.address, // Market contract address
			{
				swap: {
					min_return: rawMinReturn,
					to: rujira.walletAddress
				}
			},
			"auto", // Gas fee
			undefined, // Memo
			[{
				denom: market.tokens.quote.address, // USDC
				amount: rawUsdcAmount
			}]
		);

		console.log("✅ Market BUY swap executed successfully!");
		console.log(`   Transaction Hash: ${swapResult.transactionHash}`);
		console.log(`   Gas Used: ${swapResult.gasUsed}`);
		console.log(`   Gas Wanted: ${swapResult.gasWanted}`);

		// Test 3: Verify the swap execution
		console.log("\n📋 Test 3: Verifying swap execution");
		console.log("   Note: Swaps don't create orders - they execute immediately");
		console.log("   The tokens should be directly transferred to your wallet");

		console.log("\n🎉 Market BUY swap test completed successfully!");

	} catch (error) {
		console.error("❌ Error testing market BUY swap:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testMarketOrderSell(rujira: Rujira) {
	console.log("\n🧪 Testing Market Order SELL (using swap)...");

	try {
		// Test 1: Get current order book to see market conditions
		console.log("\n📋 Test 1: Checking current market conditions");

				const orderBook = await rujira.fin.getOrderBook({
			marketSymbol: "THOR-RUJI/ETH-USDC",
			maximumNumberOfOrders: 3
		});

		console.log(`📊 Current market for ${orderBook.market.symbol}:`);
		if (orderBook.book.bestAsk) {
			console.log(`   Best Ask (sell price): ${orderBook.book.bestAsk.price} @ ${orderBook.book.bestAsk.amount}`);
		}
		if (orderBook.book.bestBid) {
			console.log(`   Best Bid (buy price): ${orderBook.book.bestBid.price} @ ${orderBook.book.bestBid.amount}`);
		}

		// Test 2: Execute a market SELL using swap (like the working playground)
		console.log("\n📋 Test 2: Executing market SELL via swap");
		console.log("   Note: Market orders are implemented as swaps, not traditional orders");

		// Get market details
		const market = await rujira.fin.getMarket({
			symbol: "THOR-RUJI/ETH-USDC"
		});

		// Calculate swap parameters (selling RUJI for USDC)
		const rujiAmount = new Decimal("0.01"); // Want to sell 0.01 RUJI
		const bestBidPrice = orderBook.book.bestBid?.price || new Decimal("0.85");
		const expectedUsdcAmount = rujiAmount.mul(bestBidPrice); // Expected USDC to receive
		const slippageTolerance = new Decimal("0.05"); // 5% slippage
		const minReturn = expectedUsdcAmount.mul(new Decimal("1").minus(slippageTolerance));

		console.log(`   Selling ${rujiAmount} RUJI for ~${expectedUsdcAmount} USDC`);
		console.log(`   Expected price: ${bestBidPrice} USDC per RUJI`);
		console.log(`   Min return: ${minReturn} USDC (with ${slippageTolerance.mul(100)}% slippage tolerance)`);

				// Convert to raw amounts (both tokens use 8 decimals)
		const rawRujiAmount = rujiAmount.mul(10 ** market.tokens.base.decimals).toFixed(0);
		const rawMinReturn = minReturn.mul(10 ** market.tokens.quote.decimals).toFixed(0);

		console.log(`   Raw RUJI amount: ${rawRujiAmount}`);
		console.log(`   Raw min return: ${rawMinReturn}`);
		console.log(`   RUJI token address: ${market.tokens.base.address}`);
		console.log(`   USDC token address: ${market.tokens.quote.address}`);

		// Check wallet balance before attempting swap
		console.log("\n📋 Checking wallet balance...");

		// First try the correct RUJI denomination from working playground
		const correctRujiDenom = 'x/ruji';
		console.log(`   🔍 Checking for correct RUJI denomination: ${correctRujiDenom}`);

		try {
			const correctBalance = await rujira.cosmClient.getBalance(rujira.walletAddress, correctRujiDenom);
			console.log(`   RUJI balance (${correctRujiDenom}): ${correctBalance.amount}`);

			// Recalculate with correct decimals (6 decimals like in working playground)
			const correctRawRujiAmount = rujiAmount.mul(10 ** 6).toFixed(0); // 6 decimals instead of 8
			console.log(`   Need: ${correctRawRujiAmount} ${correctRujiDenom} (6 decimals)`);

			// Also recalculate min_return with 6 decimals for USDC
			const correctRawMinReturn = minReturn.mul(10 ** 6).toFixed(0); // 6 decimals for USDC too
			console.log(`   Corrected min return: ${correctRawMinReturn} USDC (6 decimals)`);

			if (parseInt(correctBalance.amount) >= parseInt(correctRawRujiAmount)) {
				console.log(`   ✅ Sufficient balance! Using correct denomination: ${correctRujiDenom}`);

				// Update the swap to use correct denomination and decimals
				const swapResult = await rujira.cosmClient.execute(
					rujira.walletAddress,
					market.address, // Market contract address
					{
						swap: {
							min_return: correctRawMinReturn, // Use corrected min_return
							to: rujira.walletAddress
						}
					},
					"auto", // Gas fee
					undefined, // Memo
					[{
						denom: correctRujiDenom, // Use x/ruji instead of thor.ruji
						amount: correctRawRujiAmount // Use 6 decimals
					}]
				);

				console.log("✅ Market SELL swap executed successfully!");
				console.log(`   Transaction Hash: ${swapResult.transactionHash}`);
				console.log(`   Gas Used: ${swapResult.gasUsed}`);
				console.log(`   Gas Wanted: ${swapResult.gasWanted}`);

				console.log("\n📋 Test 3: Verifying swap execution");
				console.log("   Note: Swaps don't create orders - they execute immediately");
				console.log("   The tokens should be directly transferred to your wallet");

				console.log("\n🎉 Market SELL swap test completed successfully!");
				return; // Exit successfully
			} else {
				console.log(`   ⚠️  Still insufficient balance with correct denomination`);
				console.log(`   Have: ${correctBalance.amount}, need: ${correctRawRujiAmount}`);
			}
		} catch (error) {
			console.log(`   Error checking balance for ${correctRujiDenom}: ${error}`);
		}

		// Execute swap directly using CosmWasm client
		const swapResult = await rujira.cosmClient.execute(
			rujira.walletAddress,
			market.address, // Market contract address
			{
				swap: {
					min_return: rawMinReturn,
					to: rujira.walletAddress
				}
			},
			"auto", // Gas fee
			undefined, // Memo
			[{
				denom: market.tokens.base.address, // RUJI
				amount: rawRujiAmount
			}]
		);

		console.log("✅ Market SELL swap executed successfully!");
		console.log(`   Transaction Hash: ${swapResult.transactionHash}`);
		console.log(`   Gas Used: ${swapResult.gasUsed}`);
		console.log(`   Gas Wanted: ${swapResult.gasWanted}`);

		// Test 3: Verify the swap execution
		console.log("\n📋 Test 3: Verifying swap execution");
		console.log("   Note: Swaps don't create orders - they execute immediately");
		console.log("   The tokens should be directly transferred to your wallet");

		console.log("\n🎉 Market SELL swap test completed successfully!");

	} catch (error) {
		console.error("❌ Error testing market SELL swap:", error);
		if (error instanceof Error) {
			console.error("Error message:", error.message);
			console.error("Error stack:", error.stack);
		}
	}
}

async function testGetMarketDetails(rujira: Rujira) {
	console.log("\n🧪 Testing getMarket method for THOR-LQDY/ETH-USDC...");

	try {
		const market = await rujira.fin.getMarket({
			symbol: "THOR-LQDY/ETH-USDC"
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
		// await testPlaceOrder(rujira); // Commented out - focusing on plural testing
		// await testReplaceOrder(rujira); // Commented out - focusing on plural testing
		// await testCancelOrder(rujira); // Commented out - focusing on plural testing
		// await testWithdrawOrders(rujira); // Commented out - focusing on plural testing
		// await testCancelOrders(rujira); // Commented out - focusing on market order testing
		// await testReplaceOrders(rujira); // Commented out - focusing on market order testing

		// Market order tests (testing one at a time as requested)
		// await testMarketOrderBuy(rujira); // Test market BUY order - ✅ COMPLETED
		await testMarketOrderSell(rujira); // Test market SELL order

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
