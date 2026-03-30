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
      totalServiceCost,
      serviceCompletionDate,
      status,
      reportedBy,
      reportedById,
      reporterRole,
      tripId,
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
      totalServiceCost,
      serviceCompletionDate,
      status: status || "In-Service",
      reportedBy,
      reportedById,
      reporterRole,
      tripId,
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

    if (status === "Completed" && !serviceCompletionDate) {
      updateData.serviceCompletionDate = new Date();
    }

    const record = await VehicleService.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!record) return res.status(404).json({ message: "Record not found" });

    // If completed, set vehicle back to Active (or On-trip if it was during a trip)
    if (status === "Completed") {
      const vehicleStatus = record.tripId ? "On-trip" : "Active";
      await Vehicle.findByIdAndUpdate(record.vehicleId, { status: vehicleStatus });
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
    const { status, userId, userRole, totalServiceCost, odometerReading } = req.body;

    const record = await VehicleService.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    // Permission Logic...
    if (status === "Completed") {
      const isManager = userRole === "Manager" || userRole === "admin" || userRole === "manager";
      const isReportingDriverDuringTrip = (userRole === "Driver" || userRole === "driver") && 
                                          record.reporterRole === "Driver" && 
                                          record.reportedById?.toString() === userId && 
                                          record.tripId;
      
      if (!isManager && !isReportingDriverDuringTrip) {
        return res.status(403).json({ message: "Only managers (or the driver who reported this during a trip) can mark it as completed." });
      }
    }

    const updatePayload = { status };
    if (status === "Completed") {
      updatePayload.serviceCompletionDate = new Date();
      if (totalServiceCost !== undefined) updatePayload.totalServiceCost = totalServiceCost;
      if (odometerReading !== undefined) updatePayload.odometerReading = odometerReading;
    }

    const updatedRecord = await VehicleService.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    );
    if (!updatedRecord) return res.status(404).json({ message: "Record not found" });

    // If completed, set vehicle back to Active (or On-trip if it was during a trip)
    if (status === "Completed") {
      const vehicleStatus = updatedRecord.tripId ? "On-trip" : "Active";
      await Vehicle.findByIdAndUpdate(updatedRecord.vehicleId, { status: vehicleStatus });
    }

    res.json(updatedRecord);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 4. GET ALL SERVICE RECORDS
router.get("/", async (req, res) => {
  try {
    const records = await VehicleService.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 5. GET SERVICE ALERTS COUNT (Unread/Active reports for Manager)
router.get("/alerts/count", async (req, res) => {
  try {
    const count = await VehicleService.countDocuments({
      status: "In-Service",
      isRead: false
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// 6. MARK ALL AS READ
router.post("/mark-all-read", async (req, res) => {
  try {
    await VehicleService.updateMany(
      { status: "In-Service", isRead: false },
      { isRead: true }
    );
    res.json({ message: "Repairs marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
