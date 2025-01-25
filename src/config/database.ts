import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "pharmacy_db",
  password: process.env.DB_PASSWORD || "password",
  port: parseInt(process.env.DB_PORT || "5432"),
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client:", err.stack);
  }
  if (!client) {
    return console.error("No client available");
  }
  client.query("SELECT NOW()", (err, result) => {
    release();
    if (err) {
      return console.error("Error executing query:", err.stack);
    }
    console.log("Connected to Database");
  });
});

// Create tables if they don't exist
const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drugs (
        drug_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) NOT NULL,
        detail TEXT,
        usage TEXT,
        slang_food TEXT,
        side_effect TEXT,
        drug_type VARCHAR(50) NOT NULL,
        unit_type VARCHAR(50) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS stocks (
        stock_id SERIAL PRIMARY KEY,
        drug_id INTEGER REFERENCES drugs(drug_id),
        amount INTEGER NOT NULL,
        expired DATE NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bills (
        bill_id SERIAL PRIMARY KEY,
        customer_name VARCHAR(100),
        items JSONB NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Tables created successfully");
  } catch (error) {
    console.error("Error creating tables:", error);
  }
};

createTables();

export default pool;
