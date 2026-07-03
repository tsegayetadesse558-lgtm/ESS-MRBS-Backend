const express = require("express");
const router = express.Router();
const {
  getRooms,
  getRoom,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomStats,
} = require("../controllers/roomController");
const { protect, authorize } = require("../middleware/auth");

// Public (authenticated) routes
router.get("/", protect, getRooms);
router.get("/:id", protect, getRoom);

// Admin only routes
router.post("/", protect, authorize("admin"), createRoom);
router.put("/:id", protect, authorize("admin"), updateRoom);
router.delete("/:id", protect, authorize("admin"), deleteRoom);
router.get("/stats", protect, authorize("admin"), getRoomStats);

module.exports = router;