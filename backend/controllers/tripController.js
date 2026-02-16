
const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Notification = require("../models/Notification");
const Parcel = require("../models/Parcel");
const OngoingTrip = require("../models/OngoingTrip");
const smsService = require("../utils/smsService");
const { sendTrackingEmail } = require("../utils/emailService");

// Create a new trip
exports.createTrip = async (req, res) => {
  try {
    const {
      tripId,
      driverId,
      vehicleId,
      parcelIds,
      startLocation,
      deliveryDestinations,
      assignedBy,
      totalWeight,
      notes,
    } = req.body;

    const existingTrip = await Trip.findOne({ tripId });
    if (existingTrip) {
      return res.status(400).json({ message: "Trip with this ID already exists" });
    }

    const trip = new Trip({
      tripId,
      driverId,
      vehicleId,
      parcelIds,
      startLocation,
      deliveryDestinations,
      assignedBy,
      totalWeight,
      notes,
      status: "pending",
    });

    await trip.save();

    // Update parcels with the new tripId
    if (parcelIds && parcelIds.length > 0) {
      await Parcel.updateMany(
        { _id: { $in: parcelIds } },
        { tripId: tripId }
      );
    }

    // Update driver status
    await Driver.findByIdAndUpdate(driverId, {
      driverStatus: "pending",
      isAvailable: false
    });

    // Update vehicle status
    await Vehicle.findByIdAndUpdate(vehicleId, {
      status: "assigned"
    });

    const populatedTrip = await Trip.findById(trip._id)
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity profilePhoto")
      .populate("parcelIds", "trackingId weight recipient status")
      .populate("assignedBy", "name email");

    res.status(201).json(populatedTrip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ message: "Failed to create trip", error: error.message });
  }
};

// Get all trips
exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity profilePhoto")
      .populate("parcelIds", "trackingId weight recipient status")
      .sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch trips", error: error.message });
  }
};

// Get trip by ID (Robust: handles both Mongo ID and String ID)
exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    let trip;

    if (mongoose.Types.ObjectId.isValid(id)) {
      trip = await Trip.findById(id)
        .populate("driverId", "name phone email profilePhoto mobile")
        .populate("vehicleId", "regNumber model type capacity profilePhoto")
        .populate("parcelIds", "trackingId weight recipient status sender")
        .populate("assignedBy", "name email");
    } else {
      trip = await Trip.findOne({ tripId: id })
        .populate("driverId", "name phone email profilePhoto mobile")
        .populate("vehicleId", "regNumber model type capacity profilePhoto")
        .populate("parcelIds", "trackingId weight recipient status sender")
        .populate("assignedBy", "name email");
    }

    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.status(200).json(trip);
  } catch (error) {
    console.error("Fetch Trip Error:", error);
    res.status(500).json({ message: "Failed to fetch trip", error: error.message });
  }
};

// Get trip by tripId string
exports.getTripByTripId = async (req, res) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.tripId })
      .populate("driverId", "name phone email profilePhoto mobile")
      .populate("vehicleId", "regNumber model type capacity profilePhoto")
      .populate("parcelIds", "trackingId weight recipient status sender")
      .populate("assignedBy", "name email");

    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch trip", error: error.message });
  }
};

// Get trips by driver ID
exports.getTripsByDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.query;
    let query = { driverId };
    if (status) query.status = status;

    const trips = await Trip.find(query)
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity profilePhoto")
      .populate("parcelIds", "trackingId weight recipient status")
      .sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch driver trips", error: error.message });
  }
};

// Get active trip for a driver
exports.getActiveTrip = async (req, res) => {
  try {
    const { driverId } = req.params;
    const activeTrip = await Trip.findOne({
      driverId,
      status: { $in: ["accepted", "in-progress"] },
    })
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity profilePhoto")
      .populate("parcelIds", "trackingId weight recipient status deliveryLocation");

    if (!activeTrip) return res.status(404).json({ message: "No active trip found" });
    res.status(200).json(activeTrip);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active trip", error: error.message });
  }
};

// =======================================================
// UPDATE TRIP RESOURCES (EDIT TRIP FUNCTIONALITY)
// =======================================================
exports.updateTripResources = async (req, res) => {
  try {
    const { id } = req.params; // Trip Mongo ID
    const { driverId, vehicleId, managerId } = req.body;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const oldDriverId = trip.driverId ? trip.driverId.toString() : null;
    const oldVehicleId = trip.vehicleId ? trip.vehicleId.toString() : null;

    // Determine what changed
    const isDriverChanged = driverId && driverId !== oldDriverId;
    const isVehicleChanged = vehicleId && vehicleId !== oldVehicleId;

    // --- HANDLE DRIVER CHANGE ---
    if (isDriverChanged) {
      // 1. Free up the OLD driver
      if (oldDriverId) {
        await Driver.findByIdAndUpdate(oldDriverId, {
          isAvailable: true,
          driverStatus: "available",
          currentTripId: null
        });
      }

      // 2. Assign the NEW driver
      await Driver.findByIdAndUpdate(driverId, {
        isAvailable: false,
        driverStatus: "pending" // Waiting for acceptance
      });

      // 3. Update Trip reference
      trip.driverId = driverId;
    }

    // --- HANDLE VEHICLE CHANGE ---
    if (isVehicleChanged) {
      // 1. Free up the OLD vehicle
      if (oldVehicleId) {
        await Vehicle.findByIdAndUpdate(oldVehicleId, {
          status: "Active", // Revert to Active/Available
          currentTripId: null,
          driverId: null
        });
      }

      // 2. Assign the NEW vehicle
      await Vehicle.findByIdAndUpdate(vehicleId, {
        status: "assigned", // Mark as Assigned (Pending trip start)
        currentTripId: trip.tripId
      });

      // 3. Update Trip reference
      trip.vehicleId = vehicleId;
    }

    // --- RESET TRIP STATUS IF RESOURCES CHANGED ---
    // Either driver or vehicle change requires a new acceptance from the driver
    if (isDriverChanged || isVehicleChanged) {
      trip.status = "pending";
      trip.acceptedAt = null;
      trip.startedAt = null;

      // If only vehicle changed, we still need to set the driver's status to pending
      // so they can see it as a new request to accept.
      if (!isDriverChanged && trip.driverId) {
        await Driver.findByIdAndUpdate(trip.driverId, {
          driverStatus: "pending"
        });
      }
    }

    // Save changes to Trip
    await trip.save();

    // --- UPDATE PARCELS ---
    // Parcels need to reflect the new driver/vehicle
    const parcelUpdate = {};
    if (isDriverChanged) parcelUpdate.assignedDriver = driverId;
    if (isVehicleChanged) parcelUpdate.assignedVehicle = vehicleId;

    // If driver/vehicle changed, set parcel status back to Pending
    if (isDriverChanged || isVehicleChanged) {
      parcelUpdate.status = "Pending";
    }

    if (Object.keys(parcelUpdate).length > 0) {
      await Parcel.updateMany(
        { _id: { $in: trip.parcelIds } },
        { $set: parcelUpdate }
      );
    }


    // --- NOTIFY DRIVER OF CHANGES ---
    // Aggressively delete ALL existing notifications for this trip before sending a new one.
    // This ensures that whether the driver changed OR the vehicle changed, the driver(s) 
    // only see ONE current notification and don't have duplicate or stale entries.
    if (isDriverChanged || isVehicleChanged) {
      console.log(`Cleaning up old notifications for trip ${trip.tripId}`);
      await Notification.deleteMany({ tripId: trip.tripId });
    }

    if (isDriverChanged || isVehicleChanged) {
      const currentVehicle = await Vehicle.findById(trip.vehicleId);

      // If driver changed, send reassign_driver notification
      if (isDriverChanged) {
        const newNotification = new Notification({
          driverId: driverId,
          vehicleId: trip.vehicleId,
          parcelIds: trip.parcelIds,
          tripId: trip.tripId,
          type: "reassign_driver",
          status: "pending",
          message: `Trip #${trip.tripId} has been reassigned to you. Vehicle: ${currentVehicle ? currentVehicle.regNumber : 'N/A'}`,
          assignedBy: managerId || trip.assignedBy,
          startLocation: trip.startLocation,
          deliveryLocations: trip.deliveryDestinations,
          recipientType: "driver"
        });
        await newNotification.save();
      }
      // If SAME driver but vehicle changed, send a trip_update notification
      else if (isVehicleChanged) {
        const newNotification = new Notification({
          driverId: trip.driverId,
          vehicleId: trip.vehicleId,
          parcelIds: trip.parcelIds,
          tripId: trip.tripId,
          type: "trip_update",
          status: "pending",
          message: `Trip #${trip.tripId} vehicle has been updated. New Vehicle: ${currentVehicle ? currentVehicle.regNumber : 'N/A'}. Please accept the change.`,
          assignedBy: managerId || trip.assignedBy,
          startLocation: trip.startLocation,
          deliveryLocations: trip.deliveryDestinations,
          recipientType: "driver"
        });
        await newNotification.save();
      }
    }

    res.json({
      message: "Trip updated successfully",
      data: trip
    });

  } catch (error) {
    console.error("Update Trip Resources Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get declined parcels
exports.getDeclinedParcels = async (req, res) => {
  try {
    const declinedTrips = await Trip.find({ status: "declined" })
      .populate("parcelIds", "trackingId weight recipient status sender")
      .populate("driverId", "name phone")
      .populate("vehicleId", "regNumber model type")
      .sort({ createdAt: -1 });

    const declinedParcels = [];
    for (const trip of declinedTrips) {
      if (!trip.parcelIds) continue;
      for (const parcel of trip.parcelIds) {
        if (!parcel || !parcel._doc) continue;
        declinedParcels.push({
          ...parcel._doc,
          tripId: trip.tripId,
          declinedDriverId: trip.driverId?._id || null,
          declinedDriverName: trip.driverId?.name || "Unknown Driver",
          assignedVehicleId: trip.vehicleId?._id || null,
          assignedVehicle: trip.vehicleId || null,
        });
      }
    }
    res.status(200).json(declinedParcels);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch declined parcels", error: error.message });
  }
};

// Reassign trip (Specific to Declined workflow)
exports.reassignTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { newDriverId, managerId } = req.body;

    const trip = await Trip.findOne({ tripId });
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Clear ALL existing notifications for this trip before reassigning to a new driver
    await Notification.deleteMany({ tripId: trip.tripId });

    const existingVehicleId = trip.vehicleId;

    // Update trip
    trip.driverId = newDriverId;
    trip.status = "pending";
    trip.assignedAt = new Date();
    await trip.save();

    // Update new driver
    await Driver.findByIdAndUpdate(newDriverId, {
      driverStatus: "pending",
      isAvailable: false
    });

    // Update parcels
    await Parcel.updateMany(
      { _id: { $in: trip.parcelIds } },
      {
        assignedDriver: newDriverId,
        status: "Pending"
      }
    );

    // Notification
    const notification = new Notification({
      driverId: newDriverId,
      recipientType: "driver",
      vehicleId: existingVehicleId,
      parcelIds: trip.parcelIds,
      tripId: trip.tripId,
      message: `New trip reassigned: ${trip.tripId}`,
      type: "reassign_driver",
      status: "pending",
      assignedBy: managerId,
      deliveryLocations: trip.deliveryDestinations,
      startLocation: trip.startLocation,
    });

    await notification.save();

    const updatedTrip = await Trip.findById(trip._id)
      .populate("driverId", "name phone")
      .populate("vehicleId", "regNumber profilePhoto");

    res.status(200).json({ trip: updatedTrip, notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to reassign trip", error: error.message });
  }
};

// Update trip status
exports.updateTripStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData = { status };

    if (status === "accepted") {
      updateData.acceptedAt = new Date();
    } else if (status === "in-progress") {
      updateData.startedAt = new Date();
    } else if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const trip = await Trip.findByIdAndUpdate(id, updateData, { new: true })
      .populate("driverId")
      .populate("vehicleId");

    if (!trip) return res.status(404).json({ message: "Trip not found" });

    // Sync Driver & Vehicle Statuses
    if (status === "accepted") {
      await Driver.findByIdAndUpdate(trip.driverId._id, {
        driverStatus: "Accepted",
        currentTripId: trip.tripId
      });
      await Vehicle.findByIdAndUpdate(trip.vehicleId._id, {
        status: "Trip Confirmed",
        currentTripId: trip.tripId
      });
    } else if (status === "in-progress") {
      await Driver.findByIdAndUpdate(trip.driverId._id, {
        driverStatus: "On-trip",
        currentTripId: trip.tripId
      });
      await Vehicle.findByIdAndUpdate(trip.vehicleId._id, {
        status: "On-trip",
        currentTripId: trip.tripId
      });
    } else if (status === "completed") {
      const driver = await Driver.findById(trip.driverId._id);
      await Driver.findByIdAndUpdate(trip.driverId._id, {
        driverStatus: driver.isAvailable ? "available" : "offline",
        currentTripId: null
      });
      await Vehicle.findByIdAndUpdate(trip.vehicleId._id, {
        status: "Active",
        currentTripId: null
      });
    } else if (status === "declined") {
      const driver = await Driver.findById(trip.driverId._id);
      await Driver.findByIdAndUpdate(trip.driverId._id, {
        driverStatus: driver.isAvailable ? "available" : "offline",
        currentTripId: null
      });
      // Vehicle stays assigned or reverts? Usually reverts if trip is dead, 
      // but if reassigning later, logic might differ. 
      // Assuming declined means resource free-up for now:
      await Vehicle.findByIdAndUpdate(trip.vehicleId._id, {
        status: "Active",
        currentTripId: null
      });
      // Remove from OngoingTrips
      await OngoingTrip.findOneAndDelete({ trip: trip._id });
    }

    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: "Failed to update trip status", error: error.message });
  }
};

// Start journey
exports.startJourney = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    if (trip.status !== "accepted") {
      return res.status(400).json({ message: "Trip must be accepted to start" });
    }

    trip.status = "in-progress";
    trip.startedAt = new Date();

    // Update delivery destinations to "in-transit"
    trip.deliveryDestinations = trip.deliveryDestinations.map(dest => ({
      ...dest.toObject(),
      deliveryStatus: dest.deliveryStatus === 'pending' ? "in-transit" : dest.deliveryStatus
    }));

    await trip.save();

    await Driver.findByIdAndUpdate(trip.driverId, {
      driverStatus: "On-trip",
      currentTripId: trip.tripId
    });

    await Vehicle.findByIdAndUpdate(trip.vehicleId, {
      status: "On-trip",
      currentTripId: trip.tripId
    });

    // Create or Update OngoingTrip entry
    const mainParcel = await Parcel.findById(trip.parcelIds[0]);
    await OngoingTrip.findOneAndUpdate(
      { trip: trip._id },
      {
        trip: trip._id,
        tripId: trip.tripId,
        trackingId: mainParcel ? mainParcel.trackingId : "N/A",
        vehicle: trip.vehicleId,
        driver: trip.driverId,
        status: "in-transit",
        startedAt: new Date(),
        progress: 0
      },
      { upsert: true, new: true }
    );

    await Parcel.updateMany(
      { _id: { $in: trip.parcelIds } },
      { status: "In Transit" }
    );

    // Send notifications to recipients
    try {
      const parcels = await Parcel.find({ _id: { $in: trip.parcelIds } });
      for (const parcel of parcels) {
        // Send SMS
        if (parcel.recipient && parcel.recipient.phone) {
          await smsService.sendTrackingSMS(parcel.recipient.phone, parcel.trackingId);
        }
        // Send Email
        if (parcel.recipient && parcel.recipient.email) {
          await sendTrackingEmail(parcel.recipient.email, parcel.recipient.name, parcel.trackingId);
        }
      }
    } catch (notifyError) {
      console.error("Failed to send tracking notifications:", notifyError);
      // Don't fail the whole request if notifications fail
    }

    res.status(200).json({ message: "Journey started successfully", trip });
  } catch (error) {
    res.status(500).json({ message: "Failed to start journey", error: error.message });
  }
};

// Update delivery destination status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { tripId, parcelId } = req.params;
    const { deliveryStatus, notes } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    const destinationIndex = trip.deliveryDestinations.findIndex(
      (d) => d.parcelId.toString() === parcelId
    );

    if (destinationIndex === -1) {
      return res.status(404).json({ message: "Destination not found" });
    }

    trip.deliveryDestinations[destinationIndex].deliveryStatus = deliveryStatus;
    if (notes) trip.deliveryDestinations[destinationIndex].notes = notes;

    if (deliveryStatus === "delivered") {
      trip.deliveryDestinations[destinationIndex].deliveredAt = new Date();
      await Parcel.findByIdAndUpdate(parcelId, { status: "Delivered" });
    }

    // Check completion
    const allDelivered = trip.deliveryDestinations.every(
      (d) => d.deliveryStatus === "delivered" || d.deliveryStatus === "failed"
    );

    if (allDelivered) {
      trip.status = "completed";
      trip.completedAt = new Date();

      const driver = await Driver.findById(trip.driverId);
      await Driver.findByIdAndUpdate(trip.driverId, {
        driverStatus: driver.isAvailable ? "available" : "offline",
        currentTripId: null
      });
      await Vehicle.findByIdAndUpdate(trip.vehicleId, {
        status: "Active",
        currentTripId: null
      });
      // Remove from OngoingTrips
      await OngoingTrip.findOneAndDelete({ trip: trip._id });
    }

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    res.status(500).json({ message: "Failed to update delivery", error: error.message });
  }
};

// Delete trip
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.status(200).json({ message: "Trip deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete trip", error: error.message });
  }
};

// Get Ongoing Trips specifically (includes Accepted and In-Progress)
exports.getOngoingTrips = async (req, res) => {
  try {
    const activeTrips = await Trip.find({
      status: { $in: ["accepted", "in-progress"] }
    })
      .populate("driverId", "name phone profilePhoto")
      .populate("vehicleId", "regNumber model type profilePhoto")
      .populate("parcelIds")
      .sort({ assignedAt: -1 });

    const ongoingData = await OngoingTrip.find({
      trip: { $in: activeTrips.map(t => t._id) }
    });

    const results = activeTrips.map(trip => {
      const liveData = ongoingData.find(o => o.trip.toString() === trip._id.toString());
      return {
        trip: trip,
        tripId: liveData?.tripId || trip.tripId,
        trackingId: liveData?.trackingId || (trip.parcelIds?.[0]?.trackingId || "N/A"),
        status: liveData?.status || trip.status,
        lastKnownLocation: liveData?.lastKnownLocation,
        progress: liveData?.progress || 0
      };
    });

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch ongoing trips", error: error.message });
  }
};

// Update trip live location (called by driver app)
exports.updateTripLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address } = req.body;
    let tripObjectId = id;

    // Support custom tripId string (e.g. TR-XXXX)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const trip = await Trip.findOne({ tripId: id });
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      tripObjectId = trip._id;
    }

    const updateFields = {
      lastKnownLocation: { latitude, longitude, address },
      updatedAt: new Date()
    };
    if (req.body.progress !== undefined) {
      updateFields.progress = req.body.progress;
    }

    const updated = await OngoingTrip.findOneAndUpdate(
      { trip: tripObjectId },
      { $set: updateFields },
      { new: true }
    ).populate("trip", "sos");

    if (!updated) {
      return res.status(404).json({ message: "Ongoing trip record not yet created. Try starting the journey first." });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ message: "Failed to update location", error: error.message });
  }
};

// Get specific ongoing trip details for live tracking
exports.getOngoingTrip = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Live Tracking API Request: ${id}`);

    let tripObjectId = id;

    // Support both MongoDB ID and custom string tripId (e.g. TR-XXXXXX)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const trip = await Trip.findOne({ tripId: id });
      if (!trip) {
        console.warn(`⚠️ Trip not found for custom ID: ${id}`);
        return res.status(404).json({ message: "Trip not found" });
      }
      tripObjectId = trip._id;
    }

    const ongoing = await OngoingTrip.findOne({ trip: tripObjectId })
      .populate({
        path: "trip",
        populate: [
          { path: "driverId", select: "name mobile profilePhoto email mobile" },
          { path: "vehicleId", select: "regNumber model type profilePhoto" },
          { path: "parcelIds" }
        ]
      });

    if (!ongoing) {
      console.warn(`⚠️ Ongoing record not found for trip: ${tripObjectId}`);
      return res.status(404).json({ message: "Ongoing trip details not found" });
    }

    res.status(200).json(ongoing);
  } catch (error) {
    console.error("❌ Ongoing Trip Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch ongoing trip", error: error.message });
  }
};

// Toggle SOS status for a trip
exports.toggleSOS = async (req, res) => {
  try {
    const { id } = req.params;
    const { sos } = req.body;

    let trip;
    if (mongoose.Types.ObjectId.isValid(id)) {
      trip = await Trip.findById(id);
    } else {
      trip = await Trip.findOne({ tripId: id });
    }

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    trip.sos = sos;
    await trip.save();

    // Also update OngoingTrip if it exists
    const ongoingUpdate = { updatedAt: new Date() };
    if (sos && req.body.latitude && req.body.longitude) {
      ongoingUpdate.lastKnownLocation = {
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        address: req.body.address || "SOS Reported Location"
      };
    }

    await OngoingTrip.findOneAndUpdate(
      { trip: trip._id },
      { $set: ongoingUpdate }
    );

    res.status(200).json({ message: `SOS status updated to ${sos}`, trip });
  } catch (error) {
    console.error("Toggle SOS error:", error);
    res.status(500).json({ message: "Failed to toggle SOS", error: error.message });
  }
};