import { databaseReady } from "./src/database";

async function main() {
  console.log("🧩 Starting database test...");

  const db = await databaseReady();

  // Insert a sample row into summary table
  await db.insert("INSERT INTO summary (data) VALUES (?)", ["Hello from test-db.ts"]);

  // Read it back
  const results = await db.select("SELECT * FROM summary");

  console.log("✅ Query results:");
  console.log(results.toJS());

  // Close the database
  await db.close();

  console.log("✅ Database connection closed successfully.");
}

main().catch((err) => {
  console.error("❌ Database test failed:", err);
});
