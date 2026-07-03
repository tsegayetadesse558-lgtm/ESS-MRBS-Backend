const Booking = require("../models/Booking");
const Room = require("../models/Room");

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
exports.getBookings = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin") {
      query.scheduledBy = req.user.id;
    }

    const bookings = await Booking.find(query)
      .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
      .populate("scheduledBy", "fullName username email")
      .sort({ meetingDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bookings",
    });
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("room", "roomName buildingNumber floorNumber department maxCapacity")
      .populate("scheduledBy", "fullName username email");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check access
    if (req.user.role !== "admin" && booking.scheduledBy._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booking",
    });
  }
};

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    const {
      room,
      meetingDate,
      startTime,
      endTime,
      numberOfGuests,
      teaService,
      notes,
      meetingTitle,
    } = req.body;

    // Validate required fields
    if (!room || !meetingDate || !startTime || !endTime || !numberOfGuests || !meetingTitle) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: room, meetingDate, startTime, endTime, numberOfGuests, meetingTitle",
      });
    }

    // Validate room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check room capacity
    if (numberOfGuests > roomExists.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Number of guests (${numberOfGuests}) exceeds room capacity (${roomExists.maxCapacity})`,
      });
    }

    // Check for overlapping bookings
    const meetingDateObj = new Date(meetingDate);
    const overlappingBooking = await Booking.findOne({
      room,
      meetingDate: meetingDateObj,
      status: { $nin: ["cancelled", "rejected"] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime },
        },
      ],
    });

    if (overlappingBooking) {
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
      message: "Error creating booking",
    });
  }
};

// @desc    Update booking status (Admin only)
// @route   PUT /api/bookings/:id/status
// @access  Private/Admin
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
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

    res.status(200).json({
      success: true,
      message: `Booking ${status} successfully`,
      data: populatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating booking status",
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    // Check if user owns booking or is admin
    if (req.user.role !== "admin" && booking.scheduledBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
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

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({
      success: false,
      message: "Error cancelling booking",
    });
  }
};

// @desc    Get booking statistics (Admin only)
// @route   GET /api/bookings/stats
// @access  Private/Admin
exports.getBookingStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: "pending" });
    const approvedBookings = await Booking.countDocuments({ status: "approved" });
    const rejectedBookings = await Booking.countDocuments({ status: "rejected" });
    const cancelledBookings = await Booking.countDocuments({ status: "cancelled" });
    const teaServiceRequests = await Booking.countDocuments({ teaService: true });

    res.status(200).json({
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
    console.error("Get booking stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching booking statistics",
    });
  }
};