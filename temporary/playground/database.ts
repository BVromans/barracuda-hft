import { Database } from "../../src/database";

(async () => {
	const database = Database.getInstance();

	const result = database.insert(`
		INSERT INTO orders (owner_address, market_address, side, type, amount, price, deviation_in_percentage, filled_percentage, status, creation_timestamp, update_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, [
		"0x1234567890123456789012345678901234567890",
		"0x1234567890123456789012345678901234567890",
		"buy",
		"market",
		"100",
	]);

	console.log(result);
})();
