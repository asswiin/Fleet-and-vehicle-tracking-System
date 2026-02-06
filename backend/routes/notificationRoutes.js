const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

// Create new notification
router.post("/", notificationController.createNotification);

// Get all notifications for a driver
router.get("/driver/:driverId", notificationController.getDriverNotifications);

// Get unread notification count for a driver
router.get("/driver/:driverId/unread-count", notificationController.getUnreadCount);

// Get all notifications for a manager
router.get("/manager/:managerId", notificationController.getManagerNotifications);

// Get unread notification count for a manager
router.get("/manager/:managerId/unread-count", notificationController.getManagerUnreadCount);

// Reassign driver for a declined trip (manager action)
router.post("/:notificationId/reassign-driver", notificationController.reassignDriver);

// Get a single notification by ID
router.get("/:id", notificationController.getNotification);

// Mark notification as read
router.patch("/:id/read", notificationController.markAsRead);

// Update notification status (accept/decline)
router.patch("/:id/status", notificationController.updateNotificationStatus);

// Delete a notification
router.delete("/:id", notificationController.deleteNotification);

module.exports = router;
