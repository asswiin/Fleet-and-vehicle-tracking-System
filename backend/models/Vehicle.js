const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    regNumber: { type: String, required: true, unique: true },
    model: { type: String, required: true },
    type: { type: String, required: true }, // Truck, Van, etc.
    capacity: { type: String, default: "" },
    
    // Document Expiry Dates
    insuranceExpiry: { type: String, default: "" },
    pollutionExpiry: { type: String, default: "" },
    taxExpiry: { type: String, default: "" },

    // Status (Active, Maintenance, etc.)
    status: { type: String, default: "Active" },
    
    // Optional: Link to a driver later
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);