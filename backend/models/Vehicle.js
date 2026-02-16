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

    // Status (Active, assigned, pending, Trip Confirmed, On-trip, Maintenance, In-Service, Sold)
    status: {
      type: String,
      enum: ["Active", "assigned", "pending", "Trip Confirmed", "On-trip", "Maintenance", "In-Service", "Sold"],
      default: "Active"
    },

    // Track current trip ID
    currentTripId: { type: String, default: null },

    // Optional: Link to a driver
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },

    // Vehicle Photos (Base64)
    vehiclePhotos: { type: [String], default: [] },

    // Vehicle Profile Photo (Base64)
    profilePhoto: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", vehicleSchema);