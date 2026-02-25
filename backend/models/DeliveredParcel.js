const mongoose = require("mongoose");

const deliveredParcelSchema = new mongoose.Schema(
    {
        tripId: {
            type: String,
            required: true,
        },
        tripObjectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
        },
        trackId: {
            type: String,
            required: true,
        },
        parcelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Parcel",
            required: true,
        },
        parcelDetails: {
            type: { type: String },
            weight: { type: Number },
            amount: { type: Number },
        },
        sender: {
            name: String,
            phone: String,
            email: String,
            address: String,
        },
        recipient: {
            name: String,
            phone: String,
            email: String,
            address: String,
        },
        vehicle: {
            vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
            regNumber: String,
            model: String,
            type: String,
        },
        driver: {
            driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
            name: String,
        },
        takenTime: {
            type: Date,
        },
        reachedTime: {
            type: Date,
            default: Date.now,
        },
        deliveryLocation: {
            latitude: Number,
            longitude: Number,
            order: Number,
            locationName: String,
        },
        notes: {
            type: String,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.models.DeliveredParcel || mongoose.model("DeliveredParcel", deliveredParcelSchema);
