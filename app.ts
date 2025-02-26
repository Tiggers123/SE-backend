import express from "express";
import cors from "cors";
import dotenv from "dotenv"; // Ensure dotenv is imported
import routes from "./src/routes";
import pool from "./src/config/database";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT ||5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api", routes);

// Function to start the server
async function startServer() {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log("✅ Database connection established successfully.");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Unable to start the server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Server shutting down...");
  await pool.end(); // Close database connections
  process.exit(0);
});

// Start the server
console.log("🟢 Starting server...");
startServer();

export default app;
