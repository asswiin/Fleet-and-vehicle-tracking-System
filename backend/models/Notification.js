const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
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
    tripId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["trip_assignment", "trip_update", "trip_cancellation"],
      default: "trip_assignment",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"],
      default: "pending",
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    // Delivery locations for the trip
    deliveryLocations: [{
      parcelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Parcel",
      },
      latitude: {
        type: Number,
      },
      longitude: {
        type: Number,
      },
      order: {
        type: Number,
      },
      locationName: {
        type: String,
      },
    }],
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
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
