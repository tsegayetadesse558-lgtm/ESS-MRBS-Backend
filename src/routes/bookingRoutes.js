const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const Booking = require("../models/Booking");
const Room = require("../models/Room");

// Get all bookings
router.get("/", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin") {
      query.scheduledBy = req.user.id;
    }
    const bookings = await Booking.find(query)
      .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
      .populate("scheduledBy", "fullName username email");
    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create booking
router.post("/", protect, async (req, res) => {
  try {
    const { 
      room, 
      meetingDate, 
      startTime, 
      endTime, 
      numberOfGuests, 
      teaService, 
      meetingTitle,
      notes 
    } = req.body;

    // Validate required fields
    if (!room || !meetingDate || !startTime || !endTime || !numberOfGuests || !meetingTitle) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: room, meetingDate, startTime, endTime, numberOfGuests, meetingTitle"
      });
    }

    // Check if room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({ success: false, message: "Room not found" });
    }

    // Check capacity
    if (numberOfGuests > roomExists.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Number of guests (${numberOfGuests}) exceeds room capacity (${roomExists.maxCapacity})`,
      });
    }

    // Check for overlapping bookings
    const meetingDateObj = new Date(meetingDate);
    const overlapping = await Booking.findOne({
      room,
      meetingDate: meetingDateObj,
      status: { $nin: ["cancelled", "rejected"] },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
      ]
    });

    if (overlapping) {
      return res.status(409).json({
        success: false,
        message: "Room is already booked for the selected time slot",
      });
    }

    // Create booking
    const booking = await Booking.create({
      room,
      meetingDate: meetingDateObj,
      startTime,
      endTime,
      scheduledBy: req.user.id,
      numberOfGuests,
      teaService: teaService || false,
      meetingTitle,
      notes: notes || "",
      status: "pending",
    });

    // Update room status
    roomExists.status = "booked";
    await roomExists.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
      .populate("scheduledBy", "fullName username email");

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: populatedBooking,
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Error creating booking" 
    });
  }
});

// Update booking status (Admin only)
router.put("/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    booking.status = status;
    await booking.save();

    // Update room status if booking is rejected or cancelled
    if (status === "rejected" || status === "cancelled") {
      const room = await Room.findById(booking.room);
      if (room) {
        const activeBookings = await Booking.findOne({
          room: booking.room,
          status: { $in: ["pending", "approved"] },
          _id: { $ne: booking._id },
        });
        if (!activeBookings) {
          room.status = "available";
          await room.save();
        }
      }
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("room", "roomName buildingNumber floorNumber")
      .populate("scheduledBy", "fullName username");

    res.json({
      success: true,
      message: `Booking ${status} successfully`,
      data: populatedBooking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel booking
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Check if user owns booking or is admin
    if (req.user.role !== "admin" && booking.scheduledBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    booking.status = "cancelled";
    await booking.save();

    // Update room status
    const room = await Room.findById(booking.room);
    if (room) {
      const activeBookings = await Booking.findOne({
        room: booking.room,
        status: { $in: ["pending", "approved"] },
        _id: { $ne: booking._id },
      });
      if (!activeBookings) {
        room.status = "available";
        await room.save();
      }
    }

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // Update room status if the booking was active
    if (booking.status === "pending" || booking.status === "approved") {
      const room = await Room.findById(booking.room);
      if (room) {
        const activeBookings = await Booking.findOne({
          room: booking.room,
          status: { $in: ["pending", "approved"] },
          _id: { $ne: booking._id },
        });
        if (!activeBookings) {
          room.status = "available";
          await room.save();
        }
      }
    }

    await booking.deleteOne();

    res.json({
      success: true,
      message: "Booking deleted successfully"
    });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error deleting booking"
    });
  }
});

// Get booking stats (Admin only)
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const approvedBookings = await Booking.countDocuments({ status: "approved" });
    const rejectedBookings = await Booking.countDocuments({ status: "rejected" });
    const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });
    const teaServiceRequests = await Booking.countDocuments({ teaService: true });

    res.json({
      success: true,
      data: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        rejectedBookings,
        cancelledBookings,
        teaServiceRequests,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
