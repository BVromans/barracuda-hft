import { databaseReady } from "./src/database";

(async () => {
  console.log("🧩 Cleaning and reinitializing SQLite database...");

  const db = await databaseReady();
  const conn = await db.getConnection();

  // Drop existing tables
  await conn.exec("DROP TABLE IF EXISTS orders");
  await conn.exec("DROP TABLE IF EXISTS summary");

  // Recreate schema
  await conn.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      owner_address TEXT,
      market_address TEXT,
      side TEXT,
      type TEXT,
      amount TEXT,
      price TEXT,
      deviation_in_percentage TEXT,
      filled_percentage TEXT,
      status TEXT,
      creation_timestamp TEXT,
      update_timestamp TEXT
    );
  `);

  await conn.exec(`
    CREATE TABLE IF NOT EXISTS summary (
      data TEXT
    );
  `);

  // Insert test record
  await conn.run(`INSERT INTO summary (data) VALUES ('Clean DB OK - ${new Date().toISOString()}')`);

  const rows = await conn.all("SELECT * FROM summary");
  console.log("✅ Clean test query results:", rows);

  await db.closeConnection();
  console.log("✅ Database closed successfully after clean test.");
})();
