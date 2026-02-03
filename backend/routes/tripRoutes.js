const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");

// Create a new trip
router.post("/", tripController.createTrip);

// Get all trips
router.get("/", tripController.getAllTrips);

// Get trip by MongoDB ID
router.get("/:id", tripController.getTripById);

// Get trip by tripId string (e.g., TR-123456-X)
router.get("/by-trip-id/:tripId", tripController.getTripByTripId);

// Get trips by driver ID
router.get("/driver/:driverId", tripController.getTripsByDriver);

// Get active trip for a driver
router.get("/driver/:driverId/active", tripController.getActiveTrip);

// Update trip status
router.patch("/:id/status", tripController.updateTripStatus);

// Update delivery destination status
router.patch("/:tripId/delivery/:parcelId", tripController.updateDeliveryStatus);

// Delete trip
router.delete("/:id", tripController.deleteTrip);

module.exports = router;
