const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    tripId: {
      type: String,
      required: true,
      unique: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    parcelIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Parcel",
    }],
    // Trip status
    status: {
      type: String,
      enum: ["pending", "accepted", "in-progress", "completed", "cancelled", "declined"],
      default: "pending",
    },
    // Starting point for the trip
    startLocation: {
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
      address: {
        type: String,
      },
    },
    // Delivery destinations with full details
    deliveryDestinations: [{
      parcelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parcel",
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      locationName: {
        type: String,
        required: true,
      },
      order: {
        type: Number,
        required: true,
      },
      // Delivery status for this specific destination
      deliveryStatus: {
        type: String,
        enum: ["pending", "in-transit", "delivered", "failed"],
        default: "pending",
      },
      deliveredAt: {
        type: Date,
      },
      notes: {
        type: String,
      },
    }],
    // Assigned by (manager)
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Timestamps for trip lifecycle
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    // Total weight of all parcels
    totalWeight: {
      type: Number,
      default: 0,
    },
    // Total distance (can be calculated later)
    totalDistance: {
      type: Number,
    },
    // Estimated duration in minutes
    estimatedDuration: {
      type: Number,
    },
    // Notes or special instructions
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
tripSchema.index({ driverId: 1, status: 1 });
tripSchema.index({ tripId: 1 });
tripSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Trip", tripSchema);
