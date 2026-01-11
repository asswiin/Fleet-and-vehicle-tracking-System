const express = require("express");
const router = express.Router();
const Vehicle = require("../models/Vehicle");

// 1. REGISTER VEHICLE
router.post("/register", async (req, res) => {
  try {
    const { regNumber, model, type, weight, insuranceDate, pollutionDate, taxDate } = req.body;

    // Check if exists
    const existingVehicle = await Vehicle.findOne({ regNumber });
    if (existingVehicle) {
      return res.status(400).json({ message: "Vehicle already registered" });
    }

    const newVehicle = new Vehicle({
      regNumber,
      model,
      type,
      capacity: weight,
      insuranceExpiry: insuranceDate,
      pollutionExpiry: pollutionDate,
      taxExpiry: taxDate,
      status: "Active"
    });

    await newVehicle.save();
    res.status(201).json({ message: "Vehicle registered successfully", vehicle: newVehicle });

  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 2. GET ALL VEHICLES
router.get("/", async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// 3. UPDATE VEHICLE STATUS (Mark as Sold, Maintenance, etc.)
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true } // Return the updated document
    );

    if (!updatedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json(updatedVehicle);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
module.exports = router;