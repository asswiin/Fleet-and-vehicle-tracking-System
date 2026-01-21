const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("API running");
});

app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/vehicles",require("./routes/vehicleRoutes"));
app.use("/api/drivers", require("./routes/driverRoutes"));
app.use("/api/parcels", require("./routes/parcelRoutes"));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully✅");
    app.listen(PORT,'0.0.0.0',  () =>
      console.log(`Server running on port ${PORT}`)
    );
  })
  .catch(err => console.error(err));
