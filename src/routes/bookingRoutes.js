const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const Booking = require("../models/Booking");
const Schedule = require("../models/Schedule");
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

// ✅ Create booking with duplicate schedule check
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
      notes,
      scheduleId,
      isScheduleBooking,
      bookedBy
    } = req.body;

    console.log('📝 Booking request:', { isScheduleBooking, scheduleId, room });

    // ✅ SCHEDULE BOOKING
    if (isScheduleBooking === true && scheduleId) {
      console.log('📝 Processing SCHEDULE booking...');
      
      // ✅ IMPORTANT: Check if user already booked this schedule
      const existingBooking = await Booking.findOne({
        scheduleId: scheduleId,
        scheduledBy: bookedBy || req.user.id,
        status: { $in: ['approved', 'pending'] }
      });

      if (existingBooking) {
        console.log('❌ User already booked this schedule:', existingBooking._id);
        return res.status(409).json({
          success: false,
          message: "You have already booked this schedule."
        });
      }

      // Find the schedule
      const schedule = await Schedule.findById(scheduleId).populate('room');
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found"
        });
      }

      // Check capacity
      const currentBookings = schedule.currentBookings || 0;
      const maxCapacity = schedule.room?.maxCapacity || schedule.numberOfGuests || 0;
      
      console.log(`📊 Capacity: ${currentBookings}/${maxCapacity}`);
      
      if (currentBookings >= maxCapacity) {
        return res.status(400).json({
          success: false,
          message: "Room is full. No seats available."
        });
      }

      // ✅ Create booking - NO conflict check
      const booking = await Booking.create({
        room: room,
        scheduleId: scheduleId,
        meetingDate: schedule.meetingDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        numberOfGuests: 1,
        teaService: teaService || false,
        meetingTitle: schedule.meetingTitle || '',
        notes: notes || `Booking from schedule: ${schedule.meetingTitle}`,
        scheduledBy: bookedBy || req.user.id,
        status: "approved",
        isScheduleBooking: true
      });

      // ✅ Update schedule count
      schedule.currentBookings = (schedule.currentBookings || 0) + 1;
      await schedule.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
        .populate("scheduledBy", "fullName username email");

      return res.status(201).json({
        success: true,
        message: "Room booked successfully!",
        data: populatedBooking,
      });
    }

    // ✅ DIRECT BOOKING - Check conflicts
    console.log('📝 Processing DIRECT booking...');

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

    // ✅ Check for overlapping bookings
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
      isScheduleBooking: false
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

    if (req.user.role !== "admin" && booking.scheduledBy.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // If this is a schedule booking, decrement schedule count
    if (booking.isScheduleBooking && booking.scheduleId) {
      const schedule = await Schedule.findById(booking.scheduleId);
      if (schedule) {
        schedule.currentBookings = Math.max(0, (schedule.currentBookings || 0) - 1);
        await schedule.save();
      }
    }

    booking.status = "cancelled";
    await booking.save();

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

// Delete booking (Admin only)
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    // If this is a schedule booking, decrement schedule count
    if (booking.isScheduleBooking && booking.scheduleId) {
      const schedule = await Schedule.findById(booking.scheduleId);
      if (schedule) {
        schedule.currentBookings = Math.max(0, (schedule.currentBookings || 0) - 1);
        await schedule.save();
      }
    }

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