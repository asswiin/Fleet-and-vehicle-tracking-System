const mongoose = require("mongoose");

// Explicit sub-schemas needed because nested objects containing a 'type' key
// confuse Mongoose (it treats 'type' as the schema-type declaration).
const parcelDetailsSchema = new mongoose.Schema({
    type: String,
    weight: Number,
    amount: Number,
}, { _id: false });

const vehicleSubSchema = new mongoose.Schema({
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
    regNumber: String,
    model: String,
    type: String,
}, { _id: false });

const driverSubSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    name: String,
}, { _id: false });

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
        parcelDetails: parcelDetailsSchema,
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
        vehicle: vehicleSubSchema,
        driver: driverSubSchema,
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

// Clear cached model if it exists (needed when schema changes)
delete mongoose.models.DeliveredParcel;
delete mongoose.connection.collections?.deliveredparcels;

module.exports = mongoose.model("DeliveredParcel", deliveredParcelSchema);
