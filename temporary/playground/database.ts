import { Database, ConnectionType } from "../../src/database";
import { MList, MMap } from "../../src/extensions/immutablejs";

(async () => {
	const database = Database.getInstance();

	// Ensure test table exists (via create helper)
	database.create(`
		CREATE TABLE IF NOT EXISTS test_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			value INTEGER
		)
	`);

	// Clean slate
	database.mutate(`DELETE FROM test_items`);

	// Insert using positional array
	database.insert(`INSERT INTO test_items (name, value) VALUES (?, ?)`, ["alpha", 1]);

	// Insert using positional List
	database.insert(`INSERT INTO test_items (name, value) VALUES (?, ?)`, MList(["beta", 2]));

	// Insert batch using named parameters (List<Record>)
	database.insert(
		`INSERT INTO test_items (name, value) VALUES (:name, :value)`,
		MList([
			{ name: "gamma", value: 3 },
			{ name: "delta", value: 4 },
		])
	);

	// Insert batch using named parameters (Array<Record>)
	database.insert(
		`INSERT INTO test_items (name, value) VALUES (:name, :value)`,
		[{ name: "epsilon", value: 5 }]
	);

	// Select all
	const allRows = database.select(`SELECT * FROM test_items ORDER BY id ASC`);
	console.log("select ->", allRows.toArray().map((m) => m.toObject()));

	// Select single
	const firstRow = database.select_single(`SELECT * FROM test_items WHERE name = ?`, ["alpha"]);
	console.log("select_single ->", firstRow?.toObject());

	// Update using named Map
	database.update(
		`UPDATE test_items SET value = :value WHERE name = :name`,
		MMap({ name: "beta", value: 22 })
	);
	const updatedRow = database.select_single(`SELECT * FROM test_items WHERE name = ?`, ["beta"]);
	console.log("update ->", updatedRow?.toObject());

	// Delete using named Map
	database.delete(`DELETE FROM test_items WHERE name = :name`, MMap({ name: "epsilon" }));
	const afterDelete = database.select(`SELECT name FROM test_items ORDER BY id ASC`);
	console.log("delete ->", afterDelete.toArray().map((m) => m.get("name")));

	// Execute (explicit) using positional List (select)
	const countRows = database.execute(
		ConnectionType.READ_ONLY,
		`SELECT COUNT(*) as cnt FROM test_items WHERE value > ?`,
		MList([2])
	);
	console.log("execute (select) ->", countRows.get(0)?.toObject());

	// Execute (explicit) non-select using named parameters
	database.execute(
		ConnectionType.READ_WRITE,
		`UPDATE test_items SET value = :value WHERE name = :name`,
		MMap({ name: "gamma", value: 33 })
	);
	const afterExecuteUpdate = database.select_single(`SELECT * FROM test_items WHERE name = ?`, ["gamma"]);
	console.log("execute (update) ->", afterExecuteUpdate?.toObject());

	// Transaction: rollback
	database.mutate("BEGIN");
	database.insert(`INSERT INTO test_items (name, value) VALUES (?, ?)`, ["temp1", 999]);
	database.rollback();
	const afterRollback = database.select_single(`SELECT * FROM test_items WHERE name = ?`, ["temp1"]);
	console.log("rollback ->", afterRollback);

	// Transaction: commit
	database.mutate("BEGIN");
	database.insert(`INSERT INTO test_items (name, value) VALUES (?, ?)`, ["temp2", 1000]);
	database.commit();
	const afterCommit = database.select_single(`SELECT * FROM test_items WHERE name = ?`, ["temp2"]);
	console.log("commit ->", afterCommit?.toObject());

	// Cleanup committed temp row
	database.delete(`DELETE FROM test_items WHERE name = :name`, MMap({ name: "temp2" }));

	// Test orders table insert using named params Map and List variants
	database.insert(
		`INSERT INTO orders (owner_address, market_address, side, type, amount, price, deviation_in_percentage, filled_percentage, status, creation_timestamp, update_timestamp)
		 VALUES (:owner_address, :market_address, :side, :type, :amount, :price, :deviation_in_percentage, :filled_percentage, :status, :creation_timestamp, :update_timestamp)`,
		MMap({
			owner_address: "0x1234567890123456789012345678901234567890",
			market_address: "0x1234567890123456789012345678901234567890",
			side: "buy",
			type: "market",
			amount: "100",
			price: "10",
			deviation_in_percentage: "0.5",
			filled_percentage: "0",
			status: "open",
			creation_timestamp: String(Date.now()),
			update_timestamp: String(Date.now()),
		})
	);

	const oneOrder = database.select_single(`SELECT owner_address, status FROM orders ORDER BY id DESC LIMIT 1`);
	console.log("orders insert ->", oneOrder?.toObject());
})();
