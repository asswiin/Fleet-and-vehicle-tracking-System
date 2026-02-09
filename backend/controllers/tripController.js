// const Trip = require("../models/Trip");
// const Driver = require("../models/Driver");
// const Vehicle = require("../models/Vehicle");
// const Notification = require("../models/Notification");
// const Parcel = require("../models/Parcel");

// // Create a new trip
// exports.createTrip = async (req, res) => {
//   try {
//     const {
//       tripId,
//       driverId,
//       vehicleId,
//       parcelIds,
//       startLocation,
//       deliveryDestinations,
//       assignedBy,
//       totalWeight,
//       notes,
//     } = req.body;

//     // Check if trip with this ID already exists
//     const existingTrip = await Trip.findOne({ tripId });
//     if (existingTrip) {
//       return res.status(400).json({ message: "Trip with this ID already exists" });
//     }

//     const trip = new Trip({
//       tripId,
//       driverId,
//       vehicleId,
//       parcelIds,
//       startLocation,
//       deliveryDestinations,
//       assignedBy,
//       totalWeight,
//       notes,
//       status: "pending",
//     });

//     await trip.save();

//     // Update driver status to "pending" when trip is assigned
//     await Driver.findByIdAndUpdate(driverId, {
//       driverStatus: "pending",
//       isAvailable: false
//     });

//     // Update vehicle status to "assigned" when trip is assigned
//     await Vehicle.findByIdAndUpdate(vehicleId, {
//       status: "assigned"
//     });

//     // Populate references for response
//     const populatedTrip = await Trip.findById(trip._id)
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status")
//       .populate("assignedBy", "name email");

//     res.status(201).json(populatedTrip);
//   } catch (error) {
//     console.error("Error creating trip:", error);
//     res.status(500).json({ message: "Failed to create trip", error: error.message });
//   }
// };

// // Get all trips
// exports.getAllTrips = async (req, res) => {
//   try {
//     const trips = await Trip.find()
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status")
//       .sort({ createdAt: -1 });

//     res.status(200).json(trips);
//   } catch (error) {
//     console.error("Error fetching trips:", error);
//     res.status(500).json({ message: "Failed to fetch trips", error: error.message });
//   }
// };

// // Get trip by ID
// exports.getTripById = async (req, res) => {
//   try {
//     const trip = await Trip.findById(req.params.id)
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status")
//       .populate("assignedBy", "name email");

//     if (!trip) {
//       return res.status(404).json({ message: "Trip not found" });
//     }

//     res.status(200).json(trip);
//   } catch (error) {
//     console.error("Error fetching trip:", error);
//     res.status(500).json({ message: "Failed to fetch trip", error: error.message });
//   }
// };

// // Get trip by tripId (string ID like TR-123456-X)
// exports.getTripByTripId = async (req, res) => {
//   try {
//     const trip = await Trip.findOne({ tripId: req.params.tripId })
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status")
//       .populate("assignedBy", "name email");

//     if (!trip) {
//       return res.status(404).json({ message: "Trip not found" });
//     }

//     res.status(200).json(trip);
//   } catch (error) {
//     console.error("Error fetching trip:", error);
//     res.status(500).json({ message: "Failed to fetch trip", error: error.message });
//   }
// };

// // Get trips by driver ID
// exports.getTripsByDriver = async (req, res) => {
//   try {
//     const { driverId } = req.params;
//     const { status } = req.query;

//     let query = { driverId };
//     if (status) {
//       query.status = status;
//     }

//     const trips = await Trip.find(query)
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status")
//       .sort({ createdAt: -1 });

//     res.status(200).json(trips);
//   } catch (error) {
//     console.error("Error fetching driver trips:", error);
//     res.status(500).json({ message: "Failed to fetch driver trips", error: error.message });
//   }
// };

// // Get active trip for a driver
// exports.getActiveTrip = async (req, res) => {
//   try {
//     const { driverId } = req.params;

//     const activeTrip = await Trip.findOne({
//       driverId,
//       status: { $in: ["accepted", "in-progress"] },
//     })
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status");

//     if (!activeTrip) {
//       return res.status(404).json({ message: "No active trip found" });
//     }

//     res.status(200).json(activeTrip);
//   } catch (error) {
//     console.error("Error fetching active trip:", error);
//     res.status(500).json({ message: "Failed to fetch active trip", error: error.message });
//   }
// };

// // Get declined parcels for reassignment
// exports.getDeclinedParcels = async (req, res) => {
//   try {
//     // Find trips that were declined
//     const declinedTrips = await Trip.find({ status: "declined" })
//       .populate("parcelIds", "trackingId weight recipient status sender")
//       .populate("driverId", "name phone")
//       .populate("vehicleId", "regNumber model type")
//       .sort({ createdAt: -1 });

//     // Extract parcels from declined trips
//     const declinedParcels = [];
//     for (const trip of declinedTrips) {
//       if (!trip.parcelIds || !trip.driverId || !trip.vehicleId) continue;
//       for (const parcel of trip.parcelIds) {
//         if (!parcel || !parcel._doc) continue;
//         declinedParcels.push({
//           ...parcel._doc,
//           tripId: trip.tripId,
//           declinedDriverId: trip.driverId?._id || null,
//           declinedDriverName: trip.driverId?.name || "Unknown Driver",
//           assignedVehicleId: trip.vehicleId?._id || null,
//           assignedVehicle: trip.vehicleId || null,
//         });
//       }
//     }

//     res.status(200).json(declinedParcels);
//   } catch (error) {
//     console.error("Error fetching declined parcels:", error);
//     res.status(500).json({ message: "Failed to fetch declined parcels", error: error.message });
//   }
// };

// // Reassign trip to new driver (vehicle stays the same)
// exports.reassignTrip = async (req, res) => {
//   try {
//     const { tripId } = req.params;
//     const { newDriverId, managerId } = req.body;

//     // Find the trip
//     const trip = await Trip.findOne({ tripId });
//     if (!trip) {
//       return res.status(404).json({ message: "Trip not found" });
//     }

//     // Validate new driver
//     const newDriver = await Driver.findById(newDriverId);
//     if (!newDriver) {
//       return res.status(404).json({ message: "Driver not found" });
//     }

//     // Keep the same vehicle — only swap the driver
//     const existingVehicleId = trip.vehicleId;

//     // Update trip with new driver only
//     trip.driverId = newDriverId;
//     trip.status = "pending"; // Reset to pending for new driver
//     trip.assignedAt = new Date();
    
//     await trip.save();

//     // Update new driver status to "pending" when trip is reassigned
//     await Driver.findByIdAndUpdate(newDriverId, {
//       driverStatus: "pending",
//       isAvailable: false
//     });

//     // Update parcels with new driver (vehicle unchanged)
//     await Parcel.updateMany(
//       { _id: { $in: trip.parcelIds } },
//       { 
//         assignedDriver: newDriverId,
//         status: "Assigned"
//       }
//     );

//     // Create notification for new driver
//     const Notification = require("../models/Notification");
//     const notification = new Notification({
//       driverId: newDriverId,
//       recipientType: "driver",
//       vehicleId: existingVehicleId,
//       parcelIds: trip.parcelIds,
//       tripId: trip.tripId,
//       message: `New trip reassigned: ${trip.tripId}`,
//       type: "reassign_driver",
//       status: "pending",
//       assignedBy: managerId,
//       deliveryLocations: trip.deliveryDestinations,
//       startLocation: trip.startLocation,
//     });

//     await notification.save();

//     // Populate and return updated trip
//     const updatedTrip = await Trip.findById(trip._id)
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status")
//       .populate("assignedBy", "name email");

//     res.status(200).json({ trip: updatedTrip, notification });
//   } catch (error) {
//     console.error("Error reassigning trip:", error);
//     res.status(500).json({ message: "Failed to reassign trip", error: error.message });
//   }
// };

// // Update trip status
// exports.updateTripStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     const updateData = { status };

//     // Set timestamps based on status
//     if (status === "accepted") {
//       updateData.acceptedAt = new Date();
//     } else if (status === "in-progress") {
//       updateData.startedAt = new Date();
//     } else if (status === "completed") {
//       updateData.completedAt = new Date();
//     }

//     const trip = await Trip.findByIdAndUpdate(id, updateData, { new: true })
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status");

//     if (!trip) {
//       return res.status(404).json({ message: "Trip not found" });
//     }

//     // Update driver and vehicle status based on trip status
//     if (status === "accepted" || status === "in-progress") {
//       await Driver.findByIdAndUpdate(trip.driverId, { status: "On-trip" });
//       await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "On-trip" });
//     } else if (status === "completed" || status === "cancelled" || status === "declined") {
//       await Driver.findByIdAndUpdate(trip.driverId, { status: "Available" });
//       await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "Available" });
//     }

//     res.status(200).json(trip);
//   } catch (error) {
//     console.error("Error updating trip status:", error);
//     res.status(500).json({ message: "Failed to update trip status", error: error.message });
//   }
// };

// // Start journey - updates trip status to in-progress and changes driver, vehicle, and parcel statuses to "On-trip"
// exports.startJourney = async (req, res) => {
//   try {
//     const { id } = req.params;

//     // Find the trip
//     const trip = await Trip.findById(id);
//     if (!trip) {
//       return res.status(404).json({ message: "Trip not found" });
//     }

//     // Check if trip is in accepted status
//     if (trip.status !== "accepted") {
//       return res.status(400).json({ 
//         message: "Trip must be in 'accepted' status to start the journey",
//         currentStatus: trip.status 
//       });
//     }

//     // Update trip status to in-progress
//     trip.status = "in-progress";
//     trip.startedAt = new Date();
//     await trip.save();

//     // Update driver status to On-trip
//     await Driver.findByIdAndUpdate(trip.driverId, { 
//       driverStatus: "On-trip",
//       currentTripId: trip.tripId
//     });

//     // Update vehicle status to On-trip
//     await Vehicle.findByIdAndUpdate(trip.vehicleId, { 
//       status: "On-trip",
//       currentTripId: trip.tripId
//     });

//     // Update all parcels status to "In Transit"
//     if (trip.parcelIds && trip.parcelIds.length > 0) {
//       await Parcel.updateMany(
//         { _id: { $in: trip.parcelIds } },
//         { status: "In Transit" }
//       );
//     }

//     // Update delivery destinations status to in-transit
//     trip.deliveryDestinations = trip.deliveryDestinations.map(dest => ({
//       ...dest.toObject(),
//       deliveryStatus: "in-transit"
//     }));
//     await trip.save();

//     // Populate and return the updated trip
//     const populatedTrip = await Trip.findById(trip._id)
//       .populate("driverId", "name phone email profilePhoto mobile driverStatus")
//       .populate("vehicleId", "regNumber model type capacity status")
//       .populate("parcelIds", "trackingId weight recipient status type sender deliveryLocation")
//       .populate("assignedBy", "name email");

//     res.status(200).json({
//       message: "Journey started successfully",
//       trip: populatedTrip
//     });
//   } catch (error) {
//     console.error("Error starting journey:", error);
//     res.status(500).json({ message: "Failed to start journey", error: error.message });
//   }
// };

// // Update delivery destination status
// exports.updateDeliveryStatus = async (req, res) => {
//   try {
//     const { tripId, parcelId } = req.params;
//     const { deliveryStatus, notes } = req.body;

//     const trip = await Trip.findById(tripId);
//     if (!trip) {
//       return res.status(404).json({ message: "Trip not found" });
//     }

//     // Find and update the specific delivery destination
//     const destinationIndex = trip.deliveryDestinations.findIndex(
//       (d) => d.parcelId.toString() === parcelId
//     );

//     if (destinationIndex === -1) {
//       return res.status(404).json({ message: "Delivery destination not found" });
//     }

//     trip.deliveryDestinations[destinationIndex].deliveryStatus = deliveryStatus;
//     if (notes) {
//       trip.deliveryDestinations[destinationIndex].notes = notes;
//     }
//     if (deliveryStatus === "delivered") {
//       trip.deliveryDestinations[destinationIndex].deliveredAt = new Date();
      
//       // Update parcel status
//       await Parcel.findByIdAndUpdate(parcelId, { status: "Delivered" });
//     }

//     // Check if all deliveries are completed
//     const allDelivered = trip.deliveryDestinations.every(
//       (d) => d.deliveryStatus === "delivered" || d.deliveryStatus === "failed"
//     );

//     if (allDelivered) {
//       trip.status = "completed";
//       trip.completedAt = new Date();
      
//       // Update driver and vehicle status
//       await Driver.findByIdAndUpdate(trip.driverId, { status: "Available" });
//       await Vehicle.findByIdAndUpdate(trip.vehicleId, { status: "Available" });
//     }

//     await trip.save();

//     const populatedTrip = await Trip.findById(trip._id)
//       .populate("driverId", "name phone email profilePhoto")
//       .populate("vehicleId", "regNumber model type capacity")
//       .populate("parcelIds", "trackingId weight recipient status");

//     res.status(200).json(populatedTrip);
//   } catch (error) {
//     console.error("Error updating delivery status:", error);
//     res.status(500).json({ message: "Failed to update delivery status", error: error.message });
//   }
// };

// // Delete trip
// exports.deleteTrip = async (req, res) => {
//   try {
//     const trip = await Trip.findByIdAndDelete(req.params.id);

//     if (!trip) {
//       return res.status(404).json({ message: "Trip not found" });
//     }

//     res.status(200).json({ message: "Trip deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting trip:", error);
//     res.status(500).json({ message: "Failed to delete trip", error: error.message });
//   }
// };



































const Trip = require("../models/Trip");
const Driver = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const Notification = require("../models/Notification");
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

    // Check if trip with this ID already exists
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

    // Update driver status to "pending" when trip is assigned
    await Driver.findByIdAndUpdate(driverId, {
      driverStatus: "pending",
      isAvailable: false
    });

    // Update vehicle status to "assigned"
    await Vehicle.findByIdAndUpdate(vehicleId, {
      status: "assigned"
    });

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

// Get trip by Mongo ID
exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate("driverId", "name phone email profilePhoto mobile")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status sender")
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

// Get trip by tripId string (e.g. TR-123456-X)
exports.getTripByTripId = async (req, res) => {
  try {
    const trip = await Trip.findOne({ tripId: req.params.tripId })
      .populate("driverId", "name phone email profilePhoto mobile")
      .populate("vehicleId", "regNumber model type capacity")
      .populate("parcelIds", "trackingId weight recipient status sender")
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
      .populate("parcelIds", "trackingId weight recipient status deliveryLocation");

    if (!activeTrip) {
      return res.status(404).json({ message: "No active trip found" });
    }

    res.status(200).json(activeTrip);
  } catch (error) {
    console.error("Error fetching active trip:", error);
    res.status(500).json({ message: "Failed to fetch active trip", error: error.message });
  }
};

// Update Trip Resources (Edit Driver/Vehicle on existing trip)
exports.updateTripResources = async (req, res) => {
  try {
    const { id } = req.params; // Trip ID
    const { driverId, vehicleId, managerId } = req.body;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const oldDriverId = trip.driverId.toString();
    const isDriverChanged = driverId && driverId !== oldDriverId;
    const isVehicleChanged = vehicleId && vehicleId !== trip.vehicleId.toString();

    // 1. Update Trip Fields
    if (driverId) trip.driverId = driverId;
    if (vehicleId) trip.vehicleId = vehicleId;

    // 2. If Driver Changed: Reset status to pending (new driver must accept)
    if (isDriverChanged) {
      trip.status = "pending";
      // Clear accepted/started timestamps if resetting
      trip.acceptedAt = null;
      trip.startedAt = null;
      
      // Update Old Driver: Set back to available
      await Driver.findByIdAndUpdate(oldDriverId, { 
        driverStatus: "available",
        isAvailable: true,
        currentTripId: null
      });

      // Update New Driver: Set to pending
      await Driver.findByIdAndUpdate(driverId, {
        driverStatus: "pending",
        isAvailable: false
      });
    }

    if (isVehicleChanged && vehicleId) {
       // Free up old vehicle if needed (optional logic depending on requirements)
       // Set new vehicle status
       await Vehicle.findByIdAndUpdate(vehicleId, { status: "assigned" });
    }

    await trip.save();

    // 3. Update All Associated Parcels
    const parcelUpdate = {};
    if (driverId) parcelUpdate.assignedDriver = driverId;
    if (vehicleId) parcelUpdate.assignedVehicle = vehicleId;
    
    // Also set parcel status back to 'Pending' if driver changed so it matches the flow
    if (isDriverChanged) {
      parcelUpdate.status = "Pending"; 
    }

    await Parcel.updateMany(
      { _id: { $in: trip.parcelIds } },
      { $set: parcelUpdate }
    );

    // 4. Create Notification if Driver Changed
    if (isDriverChanged) {
      const vehicle = await Vehicle.findById(vehicleId || trip.vehicleId);
      
      const newNotification = new Notification({
        driverId: driverId,
        vehicleId: vehicleId || trip.vehicleId,
        parcelIds: trip.parcelIds,
        tripId: trip.tripId,
        type: "reassign_driver",
        status: "pending",
        message: `Trip #${trip.tripId} has been reassigned to you. Vehicle: ${vehicle.regNumber}`,
        assignedBy: managerId || trip.assignedBy,
        startLocation: trip.startLocation,
        deliveryLocations: trip.deliveryDestinations,
        recipientType: "driver"
      });

      await newNotification.save();
    }

    res.json({ 
      message: "Trip updated and driver notified", 
      data: trip 
    });

  } catch (error) {
    console.error("Update Trip Resources Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get declined parcels for reassignment logic
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
    console.error("Error fetching declined parcels:", error);
    res.status(500).json({ message: "Failed to fetch declined parcels", error: error.message });
  }
};

// Reassign trip to new driver (Specific for declined trips flow)
exports.reassignTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const { newDriverId, managerId } = req.body;

    const trip = await Trip.findOne({ tripId });
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const newDriver = await Driver.findById(newDriverId);
    if (!newDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const existingVehicleId = trip.vehicleId;

    // Update trip
    trip.driverId = newDriverId;
    trip.status = "pending"; 
    trip.assignedAt = new Date();
    await trip.save();

    // Update driver statuses
    await Driver.findByIdAndUpdate(newDriverId, {
      driverStatus: "pending",
      isAvailable: false
    });

    // Update parcels
    await Parcel.updateMany(
      { _id: { $in: trip.parcelIds } },
      { 
        assignedDriver: newDriverId,
        status: "Pending" // Reset to Pending
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
      .populate("vehicleId", "regNumber");

    res.status(200).json({ trip: updatedTrip, notification });
  } catch (error) {
    console.error("Error reassigning trip:", error);
    res.status(500).json({ message: "Failed to reassign trip", error: error.message });
  }
};

// Update trip status (General status updates like accepted, completed)
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

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Sync Driver & Vehicle Statuses based on Trip Status
    if (status === "accepted" || status === "in-progress") {
      await Driver.findByIdAndUpdate(trip.driverId._id, { 
        driverStatus: status === "accepted" ? "Accepted" : "On-trip",
        currentTripId: trip.tripId
      });
      await Vehicle.findByIdAndUpdate(trip.vehicleId._id, { 
        status: status === "accepted" ? "Trip Confirmed" : "On-trip",
        currentTripId: trip.tripId
      });
    } else if (status === "completed") {
      await Driver.findByIdAndUpdate(trip.driverId._id, { 
        driverStatus: "available",
        isAvailable: true,
        currentTripId: null
      });
      await Vehicle.findByIdAndUpdate(trip.vehicleId._id, { 
        status: "Active",
        currentTripId: null
      });
    }

    res.status(200).json(trip);
  } catch (error) {
    console.error("Error updating trip status:", error);
    res.status(500).json({ message: "Failed to update trip status", error: error.message });
  }
};

// Start journey
exports.startJourney = async (req, res) => {
  try {
    const { id } = req.params;

    const trip = await Trip.findById(id);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (trip.status !== "accepted") {
      return res.status(400).json({ 
        message: "Trip must be in 'accepted' status to start",
        currentStatus: trip.status 
      });
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

    await Parcel.updateMany(
      { _id: { $in: trip.parcelIds } },
      { status: "In Transit" }
    );

    res.status(200).json({
      message: "Journey started successfully",
      trip
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
    if (!trip) return res.status(404).json({ message: "Trip not found" });

    const destinationIndex = trip.deliveryDestinations.findIndex(
      (d) => d.parcelId.toString() === parcelId
    );

    if (destinationIndex === -1) {
      return res.status(404).json({ message: "Delivery destination not found" });
    }

    trip.deliveryDestinations[destinationIndex].deliveryStatus = deliveryStatus;
    if (notes) trip.deliveryDestinations[destinationIndex].notes = notes;
    
    if (deliveryStatus === "delivered") {
      trip.deliveryDestinations[destinationIndex].deliveredAt = new Date();
      await Parcel.findByIdAndUpdate(parcelId, { status: "Delivered" });
    }

    // Check if trip is fully complete
    const allDelivered = trip.deliveryDestinations.every(
      (d) => d.deliveryStatus === "delivered" || d.deliveryStatus === "failed"
    );

    if (allDelivered) {
      trip.status = "completed";
      trip.completedAt = new Date();
      
      await Driver.findByIdAndUpdate(trip.driverId, { 
        driverStatus: "available",
        isAvailable: true,
        currentTripId: null
      });
      await Vehicle.findByIdAndUpdate(trip.vehicleId, { 
        status: "Active",
        currentTripId: null
      });
    }

    await trip.save();
    res.status(200).json(trip);
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ message: "Failed to update delivery status", error: error.message });
  }
};

// Delete trip
exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findByIdAndDelete(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete trip", error: error.message });
  }
};