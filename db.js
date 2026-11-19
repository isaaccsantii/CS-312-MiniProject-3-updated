// PostgreSQL connection pool. Settings come from .env (see .env.example).
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "BlogDB",
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "",
});

pool.on("error", (err) => console.error("Unexpected PostgreSQL error:", err.message));

export default pool;
