const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
        },
        fuel: { type: Number, default: 0 },
        toll: { type: Number, default: 0 },
        maintenance: { type: Number, default: 0 },
        food: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        date: {
            type: Date,
            default: Date.now,
        },
        reportedBy: {
            type: String, // Name of the person reporting
            required: true,
        },
        reporterRole: {
            type: String, // Role of the person reporting
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);
