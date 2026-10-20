const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getBookings,
  getBooking,
  createBooking,
  cancelBooking,
  deleteBooking,
  getBookingStats,
} = require("../controllers/bookingController");

// All routes require authentication
router.use(protect);

// ---------- Stats must be BEFORE /:id ----------
router.get("/stats", authorize("admin"), getBookingStats);

// ---------- Root ----------
router.route("/").get(getBookings).post(createBooking);

// ---------- Single ----------
router
  .route("/:id")
  .get(getBooking)
  .delete(authorize("admin"), deleteBooking);

// ---------- Cancel ----------
router.put("/:id/cancel", cancelBooking);

module.exports = router;