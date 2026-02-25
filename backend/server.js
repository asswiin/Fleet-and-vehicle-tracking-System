const express = require("express");
// Start the auto-complete driver status cron job
require("./autoCompleteDriverStatus");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const dbConnect = require("./config/db");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("API running");
});

// Add a health check/db check route
app.get("/api/health", async (req, res) => {
  try {
    await dbConnect();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Middleware to ensure DB is connected for every API request
app.use(async (req, res, next) => {
  try {
    await dbConnect();
    next();
  } catch (err) {
    res.status(500).json({ message: "Database connection failed", error: err.message });
  }
});

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/vehicles", require("./routes/vehicleRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/parcels", require("./routes/parcelRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/trips", require("./routes/tripRoutes"));

const PORT = process.env.PORT || 5000;

// Local development server start
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dbConnect().then(() => {
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Server running locally on port ${PORT}`)
    );
  }).catch(err => {
    console.error("Failed to start server due to DB connection error", err);
  });
}

module.exports = app;
