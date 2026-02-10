const Notification = require("../models/Notification");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Parcel = require("../models/Parcel");
const Trip = require("../models/Trip");

// Create a new notification (trip assignment or manager notification)
exports.createNotification = async (req, res) => {
  try {
    const {
      driverId,
      managerId,
      recipientType = "driver",
      vehicleId,
      parcelIds,
      tripId,
      message,
      deliveryLocations,
      startLocation,
      type = "trip_assignment",
      declinedDriverId,
      assignedBy
    } = req.body;

    if (recipientType === "driver") {
      // Validate driver exists
      const driver = await Driver.findById(driverId);
      if (!driver) {
        return res.status(404).json({ message: "Driver not found" });
      }
    } else if (recipientType === "manager") {
      // Validate manager exists
      const User = require("../models/User");
      const manager = await User.findById(managerId);
      if (!manager) {
        return res.status(404).json({ message: "Manager not found" });
      }
    }

    // Validate vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const notification = new Notification({
      driverId: recipientType === "driver" ? driverId : undefined,
      managerId: recipientType === "manager" ? managerId : undefined,
      recipientType,
      vehicleId,
      parcelIds,
      tripId,
      message: message || `New trip assigned: ${tripId}`,
      type,
      status: "pending",
      deliveryLocations: deliveryLocations || [],
      startLocation: startLocation || null,
      declinedDriverId,
      assignedBy,
    });

    await notification.save();

    // Update driver status to "pending" when trip is assigned (for driver-type notifications)
    if (recipientType === "driver" && type === "trip_assignment") {
      await Driver.findByIdAndUpdate(driverId, {
        driverStatus: "pending"
      });
    }

    // Populate the notification before sending response
    let populatedNotification;
    if (recipientType === "driver") {
      populatedNotification = await Notification.findById(notification._id)
        .populate("driverId", "name mobile")
        .populate("vehicleId", "regNumber model type")
        .populate("parcelIds", "trackingId recipient weight");
    } else {
      populatedNotification = await Notification.findById(notification._id)
        .populate("managerId", "name email")
        .populate("vehicleId", "regNumber model type")
        .populate("parcelIds", "trackingId recipient weight")
        .populate("declinedDriverId", "name mobile");
    }

    res.status(201).json(populatedNotification);
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all notifications for a manager
exports.getManagerNotifications = async (req, res) => {
  try {
    const { managerId } = req.params;

    const notifications = await Notification.find({
      managerId,
      recipientType: "manager",
      expiresAt: { $gt: new Date() }, // Only get non-expired notifications
    })
      .populate("vehicleId", "regNumber model type")
      .populate("parcelIds", "trackingId recipient weight")
      .populate("declinedDriverId", "name mobile")
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Error fetching manager notifications:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get unread notification count for a manager
exports.getManagerUnreadCount = async (req, res) => {
  try {
    const { managerId } = req.params;

    const count = await Notification.countDocuments({
      managerId,
      recipientType: "manager",
      read: false,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    res.json({ count });
  } catch (error) {
    console.error("Error fetching manager unread count:", error);
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
      // Update the Trip status to "accepted"
      await Trip.findOneAndUpdate(
        { tripId: notification.tripId },
        {
          status: "accepted",
          acceptedAt: new Date()
        }
      );

      // Update vehicle status to "Trip Confirmed" (not On-trip yet - that's when driver starts)
      await Vehicle.findByIdAndUpdate(notification.vehicleId._id, {
        status: "Trip Confirmed",
        currentTripId: notification.tripId,
        driverId: notification.driverId._id,
      });

      // Update driver status to "Accepted"
      await Driver.findByIdAndUpdate(notification.driverId._id, {
        driverStatus: "Accepted",
        currentTripId: notification.tripId,
      });

      // Update all parcels to "Confirmed"
      for (const parcel of notification.parcelIds) {
        await Parcel.findByIdAndUpdate(parcel._id, {
          status: "Confirmed",
          tripId: notification.tripId,
          assignedDriver: notification.driverId._id,
          assignedVehicle: notification.vehicleId._id,
        });
      }
    } else if (status === "declined") {
      // NEW WORKFLOW: Driver declined - keep parcels in pending state
      // and notify the manager for reassignment

      // Update the Trip status to "declined"
      await Trip.findOneAndUpdate(
        { tripId: notification.tripId },
        { status: "declined" }
      );

      // Keep vehicle status as "assigned" since it's still assigned to the trip
      await Vehicle.findByIdAndUpdate(notification.vehicleId._id, {
        status: "assigned",
        currentTripId: null,
        driverId: null,
      });

      // Update driver status to "available" when declining trip
      await Driver.findByIdAndUpdate(notification.driverId._id, {
        driverStatus: "available",
        currentTripId: null,
      });

      // KEEP PARCELS IN PENDING STATE (don't revert to "Booked")
      // Vehicle stays assigned — only the driver is removed
      for (const parcel of notification.parcelIds) {
        await Parcel.findByIdAndUpdate(parcel._id, {
          status: "Pending",
          tripId: notification.tripId,
          assignedDriver: null, // Remove current driver assignment
          // assignedVehicle stays unchanged — vehicle is still assigned to this trip
        });
      }

      // Create notification for manager about driver decline
      if (notification.assignedBy) {
        const managerNotification = new Notification({
          managerId: notification.assignedBy,
          recipientType: "manager",
          vehicleId: notification.vehicleId._id,
          parcelIds: notification.parcelIds.map(p => p._id),
          tripId: notification.tripId,
          message: `Driver ${notification.driverId.name} declined trip ${notification.tripId}. Please assign a new driver.`,
          type: "driver_declined",
          status: "pending",
          deliveryLocations: notification.deliveryLocations,
          startLocation: notification.startLocation,
          declinedDriverId: notification.driverId._id,
          assignedBy: notification.assignedBy,
        });
        await managerNotification.save();
      }
    }

    // Return updated notification
    const updatedNotification = await Notification.findById(id)
      .populate("vehicleId", "regNumber model type status")
      .populate("parcelIds", "trackingId recipient weight status")
      .populate("driverId", "name isAvailable driverStatus");

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

// Reassign driver for a declined trip (manager action)
exports.reassignDriver = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { newDriverId, vehicleId } = req.body;

    // Find the manager notification (driver_declined type)
    const managerNotification = await Notification.findById(notificationId)
      .populate("parcelIds")
      .populate("declinedDriverId");

    if (!managerNotification || managerNotification.type !== "driver_declined") {
      return res.status(404).json({ message: "Driver declined notification not found" });
    }

    // Validate new driver
    const newDriver = await Driver.findById(newDriverId);
    if (!newDriver) {
      return res.status(404).json({ message: "New driver not found" });
    }

    // Validate vehicle
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Update the trip to pending again with new driver
    await Trip.findOneAndUpdate(
      { tripId: managerNotification.tripId },
      {
        driverId: newDriverId,
        vehicleId: vehicleId,
        status: "pending"
      }
    );

    // Update new driver status to "pending" when trip is reassigned
    await Driver.findByIdAndUpdate(newDriverId, {
      driverStatus: "pending",
      isAvailable: false
    });

    // Update parcels with new driver assignment
    for (const parcel of managerNotification.parcelIds) {
      await Parcel.findByIdAndUpdate(parcel._id, {
        status: "Pending",
        assignedDriver: newDriverId,
        assignedVehicle: vehicleId,
      });
    }

    // Create new notification for the new driver
    const newDriverNotification = new Notification({
      driverId: newDriverId,
      recipientType: "driver",
      vehicleId: vehicleId,
      parcelIds: managerNotification.parcelIds.map(p => p._id),
      tripId: managerNotification.tripId,
      message: `New trip assignment (reassigned): ${managerNotification.tripId}. Previous driver declined.`,
      type: "reassign_driver",
      status: "pending",
      deliveryLocations: managerNotification.deliveryLocations,
      startLocation: managerNotification.startLocation,
      assignedBy: managerNotification.managerId,
    });

    await newDriverNotification.save();

    // Mark manager notification as resolved/reassigned
    managerNotification.status = "reassigned";
    managerNotification.read = true;
    await managerNotification.save();

    // Populate and return the new driver notification
    const populatedNotification = await Notification.findById(newDriverNotification._id)
      .populate("driverId", "name mobile")
      .populate("vehicleId", "regNumber model type")
      .populate("parcelIds", "trackingId recipient weight");

    res.json({
      message: "Driver reassigned successfully",
      newNotification: populatedNotification,
      tripId: managerNotification.tripId
    });

  } catch (error) {
    console.error("Error reassigning driver:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
