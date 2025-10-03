import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

let dbConfig;

if (process.env.NODE_ENV === "production") {
  // pakai DATABASE_URL langsung (Neon DB)
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      require: true,
      rejectUnauthorized: false, // penting untuk Neon
    },
  };
} else {
  // pakai config biasa (local dev)
  dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  };
}

const db = new Client(dbConfig);
db.connect()
  .then(() => console.log("✅ DB connected"))
  .catch((err) => console.error("❌ DB connection error", err));

export default db;