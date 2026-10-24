const Booking = require("../models/Booking");
const Room = require("../models/Room");

const startOfDayUTC = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// -------------------------------------------------------------------
// @desc    Get all bookings (Personal History + Public Availability)
// @route   GET /api/bookings
// @access  Private
// -------------------------------------------------------------------
exports.getBookings = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "admin") {
      // Admin sees everything except what they soft-deleted
      query = { isHiddenFromAdmin: false };
    } else {
      // ✅ NORMAL USER LOGIC:
      // They need their OWN bookings (to manage history) 
      // AND everyone else's CONFIRMED bookings (to check conflicts).
      query = {
        $or: [
          { user: req.user.id, isHiddenFromUser: false }, // My history
          { status: "confirmed" } // Everyone's active bookings
        ]
      };
    }

    const bookings = await Booking.find(query)
      .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
      .populate("user", "fullName username email")
      .sort({ meetingDate: -1, startTime: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ success: false, message: "Error fetching bookings" });
  }
};

// -------------------------------------------------------------------
// @desc    Get one booking
// @route   GET /api/bookings/:id
// @access  Private
// -------------------------------------------------------------------
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
      .populate("user", "fullName username email");

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (req.user.role !== "admin" && booking.user._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ success: false, message: "Error fetching booking" });
  }
};

// -------------------------------------------------------------------
// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
// -------------------------------------------------------------------
exports.createBooking = async (req, res) => {
  try {
    const { roomId, room, meetingTitle, meetingDate, startTime, endTime, teaService } = req.body;
    const resolvedRoomId = roomId || room;

    if (!resolvedRoomId || !meetingDate || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: "roomId, meetingDate, startTime and endTime are required." });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: "End time must be after start time." });
    }

    const roomExists = await Room.findById(resolvedRoomId);
    if (!roomExists) {
      return res.status(404).json({ success: false, message: "Room not found." });
    }

    if (roomExists.status === "maintenance") {
      return res.status(400).json({ success: false, message: "Room is currently under maintenance." });
    }

    const day = startOfDayUTC(meetingDate);
    const nowMidnight = startOfDayUTC(new Date());
    
    if (day < nowMidnight) {
      return res.status(400).json({ success: false, message: "Meeting date cannot be in the past." });
    }

    const conflict = await Booking.findOne({
      room: resolvedRoomId,
      meetingDate: day,
      status: "confirmed",
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (conflict) {
      return res.status(409).json({ success: false, message: "The room is unavailable for the selected time." });
    }

    const booking = await Booking.create({
      room: resolvedRoomId,
      user: req.user.id,
      meetingTitle: meetingTitle?.trim() || "Untitled Meeting",
      meetingDate: day,
      startTime,
      endTime,
      teaService: !!teaService,
      status: "confirmed",
    });

    const populated = await Booking.findById(booking._id)
      .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
      .populate("user", "fullName username email");

    return res.status(201).json({ success: true, message: "Room booked successfully!", data: populated });
  } catch (error) {
    console.error("Create booking error:", error);
    return res.status(500).json({ success: false, message: error.message || "Error creating booking" });
  }
};

// -------------------------------------------------------------------
// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
// -------------------------------------------------------------------
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (req.user.role !== "admin" && booking.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({ success: true, message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ success: false, message: "Error cancelling booking" });
  }
};

// -------------------------------------------------------------------
// @desc    Delete booking (Admin OR Owner)
// @route   DELETE /api/bookings/:id
// @access  Private
// -------------------------------------------------------------------
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = booking.user.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: "Access denied. You can only delete your own bookings." });
    }

    const now = new Date();
    const meetingDateTime = new Date(booking.meetingDate);
    const [endHour, endMinute] = booking.endTime.split(':').map(Number);
    meetingDateTime.setHours(endHour, endMinute, 0, 0);

    const isPast = meetingDateTime < now;
    const isCancelled = booking.status === 'cancelled';

    if (!isPast && !isCancelled) {
      return res.status(400).json({ success: false, message: "Cannot delete an active future booking. Cancel it first." });
    }

    if (isAdmin) {
      booking.isHiddenFromAdmin = true;
      await booking.save();
      return res.status(200).json({ success: true, message: "Booking removed from admin dashboard." });
    } else {
      booking.isHiddenFromUser = true;
      await booking.save();
      return res.status(200).json({ success: true, message: "Booking removed from your dashboard." });
    }

  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({ success: false, message: "Error deleting booking" });
  }
};

// -------------------------------------------------------------------
// @desc    Booking statistics
// @route   GET /api/bookings/stats
// @access  Private/Admin
// -------------------------------------------------------------------
exports.getBookingStats = async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    const confirmed = await Booking.countDocuments({ status: "confirmed" });
    const cancelled = await Booking.countDocuments({ status: "cancelled" });
    const rejected = await Booking.countDocuments({ status: "rejected" });

    const today = startOfDayUTC(new Date());
    const todayBookings = await Booking.countDocuments({
      meetingDate: today,
      status: "confirmed",
    });

    res.status(200).json({
      success: true,
      data: {
        totalBookings: total,
        confirmedBookings: confirmed,
        cancelledBookings: cancelled,
        rejectedBookings: rejected,
        todayBookings,
      },
    });
  } catch (error) {
    console.error("Get booking stats error:", error);
    res.status(500).json({ success: false, message: "Error fetching booking statistics" });
  }
};