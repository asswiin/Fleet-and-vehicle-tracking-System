const mongoose = require("mongoose");

const ongoingTripSchema = new mongoose.Schema(
    {
        trip: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
            unique: true,
        },
        tripId: {
            type: String,
        },
        trackingId: {
            type: String,
        },
        vehicle: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vehicle",
        },
        driver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Driver",
        },
        status: {
            type: String,
            default: "in-transit",
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        lastKnownLocation: {
            latitude: Number,
            longitude: Number,
            address: String,
        },
        progress: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("OngoingTrip", ongoingTripSchema);
