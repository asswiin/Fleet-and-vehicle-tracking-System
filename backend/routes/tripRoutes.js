const express = require("express");
const router = express.Router();
const tripController = require("../controllers/tripController");

// Create a new trip
router.post("/", tripController.createTrip);

// Get all trips
router.get("/", tripController.getAllTrips);

// Get specific list of ongoing trips
router.get("/ongoing-list", tripController.getOngoingTrips);

// Get declined parcels for reassignment (MUST be before /:id)
router.get("/declined/parcels", tripController.getDeclinedParcels);

// Reassign trip to new driver (MUST be before /:id)
router.patch("/reassign/:tripId", tripController.reassignTrip);

// Get trip by tripId string (e.g., TR-123456-X)
router.get("/by-trip-id/:tripId", tripController.getTripByTripId);

// Get trips by driver ID
router.get("/driver/:driverId", tripController.getTripsByDriver);

// Get active trip for a driver
router.get("/driver/:driverId/active", tripController.getActiveTrip);

// Get trip by MongoDB ID (catch-all — keep AFTER specific routes)
router.get("/:id", tripController.getTripById);

// Start journey - begins the trip and updates all statuses
router.post("/:id/start-journey", tripController.startJourney);

// Update trip status
router.patch("/:id/status", tripController.updateTripStatus);

// Update delivery destination status
router.patch("/:tripId/delivery/:parcelId", tripController.updateDeliveryStatus);

// Delete trip
router.delete("/:id", tripController.deleteTrip);

// Update resources (Driver/Vehicle) for an existing trip
router.patch("/:id/resources", tripController.updateTripResources);

// Update live location (called by driver app)
router.patch("/:id/location", tripController.updateTripLocation);

// Get specific ongoing trip details for live tracking
router.get("/ongoing/:id", tripController.getOngoingTrip);

// Toggle SOS status
router.patch("/:id/sos", tripController.toggleSOS);

module.exports = router;
