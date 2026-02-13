const express = require("express");
const router = express.Router();
const Parcel = require("../models/Parcel");
const Notification = require("../models/Notification");

// GET all parcels
router.get("/", async (req, res) => {
  try {
    const parcels = await Parcel.find()
      .populate("assignedDriver", "name mobile email profilePhoto")
      .populate("assignedVehicle", "regNumber model type")
      .sort({ createdAt: -1 });
    res.json({ data: parcels });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET parcel by tracking ID
router.get("/track/:trackingId", async (req, res) => {
  try {
    const parcel = await Parcel.findOne({ trackingId: req.params.trackingId })
      .populate("assignedDriver", "name mobile email profilePhoto driverStatus")
      .populate("assignedVehicle", "regNumber model type status");
    if (!parcel) {
      return res.status(404).json({ message: "Parcel with this tracking ID not found" });
    }
    res.json({ data: parcel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single parcel by ID
router.get("/:id", async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id)
      .populate("assignedDriver", "name mobile email profilePhoto driverStatus")
      .populate("assignedVehicle", "regNumber model type status");
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

// PUT update parcel details
router.put("/:id", async (req, res) => {
  try {
    const { trackingId, _id, ...updatePayload } = req.body; // prevent trackingId/_id overwrite

    // Get the old parcel to check for changes
    const oldParcel = await Parcel.findById(req.params.id);
    if (!oldParcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }

    const parcel = await Parcel.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }

    // Check if assignedDriver or assignedVehicle changed
    const driverChanged = updatePayload.assignedDriver && oldParcel.assignedDriver?.toString() !== updatePayload.assignedDriver;
    const vehicleChanged = updatePayload.assignedVehicle && oldParcel.assignedVehicle?.toString() !== updatePayload.assignedVehicle;

    if ((driverChanged || vehicleChanged) && parcel.assignedDriver && parcel.assignedVehicle) {
      // Create notification for the driver
      const driverId = parcel.assignedDriver;
      const notificationType = driverChanged ? "reassign_driver" : "trip_update";
      const message = driverChanged
        ? `You have been assigned to deliver parcel ${parcel.trackingId}`
        : `Vehicle for parcel ${parcel.trackingId} has been updated`;

      const notification = new Notification({
        driverId,
        recipientType: "driver",
        vehicleId: parcel.assignedVehicle,
        parcelIds: [parcel._id],
        tripId: parcel.tripId || "N/A",
        type: notificationType,
        status: "pending",
        message,
      });
      await notification.save();
    }

    res.json({ data: parcel });
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

// DELETE parcel
router.delete("/:id", async (req, res) => {
  try {
    const parcel = await Parcel.findByIdAndDelete(req.params.id);
    if (!parcel) {
      return res.status(404).json({ message: "Parcel not found" });
    }
    res.json({ data: parcel });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;