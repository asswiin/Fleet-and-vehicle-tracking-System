const mongoose = require("mongoose");

const parcelSchema = new mongoose.Schema(
  {
    trackingId: { type: String, required: true, unique: true },

    sender: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
    },

    recipient: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
      address: { type: String, required: true },
    },

    weight: { type: Number, required: true },
    type: { type: String, required: true }, // Document, Parcel, etc.
    status: { type: String, default: "Booked" }, // Booked, In Transit, Delivered, etc.
    paymentAmount: { type: Number, required: true },
    date: { type: Date, default: Date.now },

    // Trip assignment fields
    tripId: { type: String, default: null },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", default: null },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", default: null },

    // Delivery location coordinates
    deliveryLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
      order: { type: Number }, // Delivery order in the trip
      locationName: { type: String }, // Destination name given during trip assignment
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Parcel", parcelSchema);
