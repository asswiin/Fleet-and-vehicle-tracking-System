const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
        },
        category: {
            type: String,
            required: true,
            enum: ["Fuel", "Toll", "Maintenance", "Food", "Other"],
        },
        amount: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
        },
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
