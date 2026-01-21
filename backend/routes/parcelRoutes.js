const express = require("express");
const router = express.Router();
const Parcel = require("../models/Parcel");

// GET all parcels
router.get("/", async (req, res) => {
  try {
    const parcels = await Parcel.find().sort({ createdAt: -1 });
    res.json({ data: parcels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single parcel by ID
router.get("/:id", async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }
    res.json({ data: parcel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create new parcel
router.post("/", async (req, res) => {
  try {
    const trackingId = "TRK" + Date.now().toString().slice(-8);
    const newParcel = new Parcel({ ...req.body, trackingId });
    await newParcel.save();
    res.json({ data: newParcel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update parcel status
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const parcel = await Parcel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }
    res.json({ data: parcel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;