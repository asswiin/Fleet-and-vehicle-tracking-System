const express = require("express");
const router = express.Router();
const Expense = require("../models/Expense");

// Get all expenses
router.get("/", async (req, res) => {
    try {
        const expenses = await Expense.find().populate("tripId").sort({ date: -1 });
        res.json({ ok: true, data: expenses });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// Get expenses for a specific trip
router.get("/trip/:tripId", async (req, res) => {
    try {
        const expenses = await Expense.find({ tripId: req.params.tripId }).sort({ date: -1 });
        res.json({ ok: true, data: expenses });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

// Create a new expense
router.post("/", async (req, res) => {
    try {
        const expense = new Expense(req.body);
        const savedExpense = await expense.save();
        res.status(201).json({ ok: true, data: savedExpense });
    } catch (error) {
        res.status(400).json({ ok: false, message: error.message });
    }
});

// Delete an expense
router.delete("/:id", async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);
        res.json({ ok: true, message: "Expense deleted" });
    } catch (error) {
        res.status(500).json({ ok: false, message: error.message });
    }
});

module.exports = router;
