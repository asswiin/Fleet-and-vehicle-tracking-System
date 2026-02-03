const Notification = require("../models/Notification");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Parcel = require("../models/Parcel");

// Create a new notification (trip assignment)
exports.createNotification = async (req, res) => {
  try {
    const { driverId, vehicleId, parcelIds, tripId, message, deliveryLocations, startLocation } = req.body;

    // Validate driver exists
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Validate vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const notification = new Notification({
      driverId,
      vehicleId,
      parcelIds,
      tripId,
      message: message || `New trip assigned: ${tripId}`,
      type: "trip_assignment",
      status: "pending",
      deliveryLocations: deliveryLocations || [],
      startLocation: startLocation || null,
    });

    await notification.save();
    
    // Populate the notification before sending response
    const populatedNotification = await Notification.findById(notification._id)
      .populate("driverId", "name mobile")
      .populate("vehicleId", "regNumber model type")
      .populate("parcelIds", "trackingId recipient weight");

    res.status(201).json(populatedNotification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all notifications for a driver
exports.getDriverNotifications = async (req, res) => {
  try {
    const { driverId } = req.params;

    const notifications = await Notification.find({
      driverId,
      expiresAt: { $gt: new Date() }, // Only get non-expired notifications
    })
      .populate("vehicleId", "regNumber model type")
      .populate("parcelIds", "trackingId recipient weight")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get unread notification count for a driver
exports.getUnreadCount = async (req, res) => {
  try {
    const { driverId } = req.params;

    const count = await Notification.countDocuments({
      driverId,
      read: false,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get a single notification by ID
exports.getNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id)
      .populate("driverId", "name mobile email")
      .populate("vehicleId", "regNumber model type weight")
      .populate("parcelIds", "trackingId recipient weight type");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update notification status (accept/decline trip)
exports.updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // "accepted" or "declined"

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const notification = await Notification.findById(id)
      .populate("vehicleId")
      .populate("parcelIds")
      .populate("driverId");

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    // Update notification status
    notification.status = status;
    notification.read = true;
    await notification.save();

    if (status === "accepted") {
      // Update vehicle status to "On-trip"
      await Vehicle.findByIdAndUpdate(notification.vehicleId._id, {
        status: "On-trip",
        currentTripId: notification.tripId,
        driverId: notification.driverId._id,
      });

      // Update driver availability and status to "Accepted" (not On-trip yet)
      await Driver.findByIdAndUpdate(notification.driverId._id, {
        isAvailable: false, // Driver is now assigned to a trip
        driverStatus: "Accepted", // Set driver status to Accepted
        currentTripId: notification.tripId,
      });

      // Update all parcels to "Confirmed" (not In Transit yet)
      for (const parcel of notification.parcelIds) {
        await Parcel.findByIdAndUpdate(parcel._id, {
          status: "Confirmed",
          tripId: notification.tripId,
          assignedDriver: notification.driverId._id,
          assignedVehicle: notification.vehicleId._id,
        });
      }
    }

    // Return updated notification
    const updatedNotification = await Notification.findById(id)
      .populate("vehicleId", "regNumber model type status")
      .populate("parcelIds", "trackingId recipient weight status")
      .populate("driverId", "name isAvailable");

    res.json(updatedNotification);
  } catch (error) {
    console.error("Error updating notification status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
