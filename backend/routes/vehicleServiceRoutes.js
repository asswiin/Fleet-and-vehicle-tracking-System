const express = require("express");
const router = express.Router();
const VehicleService = require("../models/VehicleService");
const Vehicle = require("../models/Vehicle");

// 1. CREATE SERVICE RECORD + mark vehicle In-Service
router.post("/", async (req, res) => {
  try {
    const {
      vehicleId,
      registrationNumber,
      dateOfIssue,
      issueType,
      issueDescription,
      odometerReading,
      serviceStartDate,
      workshopName,
    } = req.body;

    const record = new VehicleService({
      vehicleId,
      registrationNumber,
      dateOfIssue,
      issueType,
      issueDescription,
      odometerReading,
      serviceStartDate,
      workshopName,
      status: "In-Service",
    });

    await record.save();

    // Also update the vehicle status to In-Service
    await Vehicle.findByIdAndUpdate(vehicleId, { status: "In-Service" });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 2. UPDATE (EDIT) SERVICE RECORD
router.put("/:id", async (req, res) => {
  try {
    const {
      registrationNumber,
      dateOfIssue,
      issueType,
      issueDescription,
      odometerReading,
      serviceStartDate,
      workshopName,
      totalServiceCost,
      serviceCompletionDate,
      status,
    } = req.body;

    const updateData = {
      registrationNumber,
      dateOfIssue,
      issueType,
      issueDescription,
      odometerReading,
      serviceStartDate,
      workshopName,
    };
    if (totalServiceCost !== undefined) updateData.totalServiceCost = totalServiceCost;
    if (serviceCompletionDate !== undefined) updateData.serviceCompletionDate = serviceCompletionDate;
    if (status) updateData.status = status;

    const record = await VehicleService.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!record) return res.status(404).json({ message: "Record not found" });

    // If completed, set vehicle back to Active
    if (status === "Completed") {
      await Vehicle.findByIdAndUpdate(record.vehicleId, { status: "Active" });
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 3. GET SERVICE HISTORY for a vehicle
router.get("/vehicle/:vehicleId", async (req, res) => {
  try {
    const records = await VehicleService.find({ vehicleId: req.params.vehicleId })
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 3. UPDATE SERVICE STATUS (mark as Completed)
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const record = await VehicleService.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!record) return res.status(404).json({ message: "Record not found" });

    // If completed, set vehicle back to Active
    if (status === "Completed") {
      await Vehicle.findByIdAndUpdate(record.vehicleId, { status: "Active" });
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
