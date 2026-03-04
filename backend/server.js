const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dbConnect = require("./config/db");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("API running");
});

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

// Middleware to ensure DB is connected for every API request
// Only necessary for serverless environments; for others, it's a fallback.
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  try {
    await dbConnect();
    next();
  } catch (err) {
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
});

// Load routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/parcels", require("./routes/parcelRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/trips", require("./routes/tripRoutes"));
app.use("/api/vehicle-services", require("./routes/vehicleServiceRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));

const PORT = process.env.PORT || 5000;

// Initialize services and start server
async function startServer() {
  try {
    // 1. Ensure DB Connection
    await dbConnect();

    // 2. Start Cron Jobs
    require("./autoCompleteDriverStatus");

    // 3. Start Listening (only if not in serverless environment)
    if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
      app.listen(PORT, '0.0.0.0', () =>
        console.log(`🚀 Server running locally on port ${PORT}`)
      );
    }
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
  }
}

startServer();

module.exports = app;

