import { Database } from "../../src/database";

(async () => {
	const database = Database.getInstance();

	const result = database.mutate("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, market_symbol TEXT, side TEXT, type TEXT, price TEXT, amount TEXT, filled_percentage TEXT, status TEXT, created_at TEXT, updated_at TEXT)");

	console.log(result);
})();
