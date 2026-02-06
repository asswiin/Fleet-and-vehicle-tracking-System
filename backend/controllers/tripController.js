const Trip = require("../models/Trip");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Parcel = require("../models/Parcel");

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

    // Validate required fields
    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is required" });
    }
    if (!vehicleId) {
      return res.status(400).json({ message: "Vehicle ID is required" });
    }
    if (!parcelIds || parcelIds.length === 0) {
      return res.status(400).json({ message: "At least one parcel is required" });
    }

    // Check if driver exists and is available
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Check if vehicle exists and is available
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Check if trip with this ID already exists
    if (tripId) {
      const existingTrip = await Trip.findOne({ tripId });
      if (existingTrip) {
        return res.status(400).json({ message: "Trip with this ID already exists" });
      }
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

    // Populate references for response
    const populatedTrip = await Trip.findById(trip._id)
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity")
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
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status")
      .sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    console.error("Error fetching trips:", error);
    res.status(500).json({ message: "Failed to fetch trips", error: error.message });
  }
};

// Get trip by ID
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status")
      .populate("assignedBy", "name email");

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ message: "Failed to fetch trip", error: error.message });
  }
};

// Get trip by tripId (string ID like TR-123456-X)
exports.getTripByTripId = async (req, res) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.tripId })
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status")
      .populate("assignedBy", "name email");

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error("Error fetching trip:", error);
    res.status(500).json({ message: "Failed to fetch trip", error: error.message });
  }
};

// Get trips by driver ID
exports.getTripsByDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.query;

    let query = { driverId };
    if (status) {
      query.status = status;
    }

    const trips = await Trip.find(query)
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status")
      .sort({ createdAt: -1 });

    res.status(200).json(trips);
  } catch (error) {
    console.error("Error fetching driver trips:", error);
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
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status");

    if (!activeTrip) {
      return res.status(404).json({ message: "No active trip found" });
    }

    res.status(200).json(activeTrip);
  } catch (error) {
    console.error("Error fetching active trip:", error);
    res.status(500).json({ message: "Failed to fetch active trip", error: error.message });
  }
};

// Get declined parcels for reassignment
exports.getDeclinedParcels = async (req, res) => {
  try {
    // Find trips that were declined
    const declinedTrips = await Trip.find({ status: "declined" })
      .populate("parcelIds", "trackingId weight recipient status sender")
      .populate("driverId", "name phone")
      .populate("vehicleId", "regNumber model type")
      .sort({ createdAt: -1 });

    // Extract parcels from declined trips
    const declinedParcels = [];
    for (const trip of declinedTrips) {
      for (const parcel of trip.parcelIds) {
        declinedParcels.push({
          ...parcel._doc,
          tripId: trip.tripId,
          declinedDriverId: trip.driverId._id,
          declinedDriverName: trip.driverId.name,
          assignedVehicleId: trip.vehicleId._id,
          assignedVehicle: trip.vehicleId,
        });
      }
    }

    res.status(200).json(declinedParcels);
  } catch (error) {
    console.error("Error fetching declined parcels:", error);
    res.status(500).json({ message: "Failed to fetch declined parcels", error: error.message });
  }
};

// Reassign trip to new driver
exports.reassignTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { newDriverId, newVehicleId, managerId } = req.body;

    // Find the trip
    const trip = await Trip.findOne({ tripId });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Validate new driver and vehicle
    const newDriver = await Driver.findById(newDriverId);
    const newVehicle = await Vehicle.findById(newVehicleId);
    
    if (!newDriver || !newVehicle) {
      return res.status(404).json({ message: "Driver or vehicle not found" });
    }

    // Update trip with new driver and vehicle
    trip.driverId = newDriverId;
    trip.vehicleId = newVehicleId;
    trip.status = "pending"; // Reset to pending for new driver
    trip.assignedAt = new Date();
    
    await trip.save();

    // Update parcels with new assignment
    await Parcel.updateMany(
      { _id: { $in: trip.parcelIds } },
      { 
        assignedDriver: newDriverId,
        assignedVehicle: newVehicleId,
        status: "Assigned"
      }
    );

    // Create notification for new driver
    const Notification = require("../models/Notification");
    const notification = new Notification({
      driverId: newDriverId,
      recipientType: "driver",
      vehicleId: newVehicleId,
      parcelIds: trip.parcelIds,
      tripId: trip.tripId,
      message: `New trip reassigned: ${trip.tripId}`,
      type: "trip_reassignment",
      status: "pending",
      assignedBy: managerId,
      deliveryLocations: trip.deliveryDestinations,
      startLocation: trip.startLocation,
    });

    await notification.save();

    // Populate and return updated trip
    const updatedTrip = await Trip.findById(trip._id)
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status")
      .populate("assignedBy", "name email");

    res.status(200).json({ trip: updatedTrip, notification });
  } catch (error) {
    console.error("Error reassigning trip:", error);
    res.status(500).json({ message: "Failed to reassign trip", error: error.message });
  }
};

// Update trip status
exports.updateTripStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData = { status };

    // Set timestamps based on status
    if (status === "accepted") {
      updateData.acceptedAt = new Date();
    } else if (status === "in-progress") {
      updateData.startedAt = new Date();
    } else if (status === "completed") {
      updateData.completedAt = new Date();
    }

    const trip = await Trip.findByIdAndUpdate(id, updateData, { new: true })
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status");

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Update driver and vehicle status based on trip status
    if (status === "accepted" || status === "in-progress") {
      await Driver.findByIdAndUpdate(trip.driverId, { status: "On-trip" });
      await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "On-trip" });
    } else if (status === "completed" || status === "cancelled" || status === "declined") {
      await Driver.findByIdAndUpdate(trip.driverId, { status: "Available" });
      await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "Available" });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error("Error updating trip status:", error);
    res.status(500).json({ message: "Failed to update trip status", error: error.message });
  }
};

// Start journey - updates trip status to in-progress and changes driver, vehicle, and parcel statuses to "On-trip"
exports.startJourney = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the trip
    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Check if trip is in accepted status
    if (trip.status !== "accepted") {
      return res.status(400).json({ 
        message: "Trip must be in 'accepted' status to start the journey",
        currentStatus: trip.status 
      });
    }

    // Update trip status to in-progress
    trip.status = "in-progress";
    trip.startedAt = new Date();
    await trip.save();

    // Update driver status to On-trip
    await Driver.findByIdAndUpdate(trip.driverId, { 
      driverStatus: "On-trip",
      currentTripId: trip.tripId
    });

    // Update vehicle status to On-trip
    await Vehicle.findByIdAndUpdate(trip.vehicleId, { 
      status: "On-trip",
      currentTripId: trip.tripId
    });

    // Update all parcels status to "In Transit"
    if (trip.parcelIds && trip.parcelIds.length > 0) {
      await Parcel.updateMany(
        { _id: { $in: trip.parcelIds } },
        { status: "In Transit" }
      );
    }

    // Update delivery destinations status to in-transit
    trip.deliveryDestinations = trip.deliveryDestinations.map(dest => ({
      ...dest.toObject(),
      deliveryStatus: "in-transit"
    }));
    await trip.save();

    // Populate and return the updated trip
    const populatedTrip = await Trip.findById(trip._id)
      .populate("driverId", "name phone email profilePhoto mobile driverStatus")
      .populate("vehicleId", "regNumber model type capacity status")
      .populate("parcelIds", "trackingId weight recipient status type sender deliveryLocation")
      .populate("assignedBy", "name email");

    res.status(200).json({
      message: "Journey started successfully",
      trip: populatedTrip
    });
  } catch (error) {
    console.error("Error starting journey:", error);
    res.status(500).json({ message: "Failed to start journey", error: error.message });
  }
};

// Update delivery destination status
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { tripId, parcelId } = req.params;
    const { deliveryStatus, notes } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Find and update the specific delivery destination
    const destinationIndex = trip.deliveryDestinations.findIndex(
      (d) => d.parcelId.toString() === parcelId
    );

    if (destinationIndex === -1) {
      return res.status(404).json({ message: "Delivery destination not found" });
    }

    trip.deliveryDestinations[destinationIndex].deliveryStatus = deliveryStatus;
    if (notes) {
      trip.deliveryDestinations[destinationIndex].notes = notes;
    }
    if (deliveryStatus === "delivered") {
      trip.deliveryDestinations[destinationIndex].deliveredAt = new Date();
      
      // Update parcel status
      await Parcel.findByIdAndUpdate(parcelId, { status: "Delivered" });
    }

    // Check if all deliveries are completed
    const allDelivered = trip.deliveryDestinations.every(
      (d) => d.deliveryStatus === "delivered" || d.deliveryStatus === "failed"
    );

    if (allDelivered) {
      trip.status = "completed";
      trip.completedAt = new Date();
      
      // Update driver and vehicle status
      await Driver.findByIdAndUpdate(trip.driverId, { status: "Available" });
      await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "Available" });
    }

    await trip.save();

    const populatedTrip = await Trip.findById(trip._id)
      .populate("driverId", "name phone email profilePhoto")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status");

    res.status(200).json(populatedTrip);
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ message: "Failed to update delivery status", error: error.message });
  }
};

// Delete trip
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error("Error deleting trip:", error);
    res.status(500).json({ message: "Failed to delete trip", error: error.message });
  }
};
