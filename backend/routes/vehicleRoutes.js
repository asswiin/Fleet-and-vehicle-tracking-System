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
router.put("/:id", async (req, res) => {
  try {
    const { 
      regNumber, 
      model, 
      type, 
      weight, 
      insuranceDate, 
      pollutionDate, 
      taxDate 
    } = req.body;

    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      {
        regNumber,
        model,
        type,
        capacity: weight, // Map 'weight' from frontend to 'capacity' in DB
        insuranceExpiry: insuranceDate,
        pollutionExpiry: pollutionDate,
        taxExpiry: taxDate,
      },
      { new: true } // Return updated doc
    );

    if (!updatedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({ message: "Vehicle updated successfully", data: updatedVehicle });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;