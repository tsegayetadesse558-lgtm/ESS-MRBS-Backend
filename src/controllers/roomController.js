 const Room = require("../models/Room");
const Booking = require("../models/Booking");

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
exports.getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    console.error("Get rooms error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching rooms",
    });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
exports.getRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      data: room,
    });
  } catch (error) {
    console.error("Get room error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching room",
    });
  }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Private/Admin
exports.createRoom = async (req, res) => {
  try {
    const { buildingNumber, floorNumber, department, roomName, maxCapacity, description, amenities } = req.body;

    // Validate required fields
    if (!buildingNumber || !floorNumber || !department || !roomName || !maxCapacity) {
      return res.status(400).json({
        success: false,
        message: "Please provide buildingNumber, floorNumber, department, roomName, and maxCapacity",
      });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ roomName });
    if (existingRoom) {
      return res.status(400).json({
        success: false,
        message: "Room with this name already exists",
      });
    }

    const room = await Room.create({
      buildingNumber,
      floorNumber,
      department,
      roomName,
      maxCapacity,
      description: description || "",
      amenities: amenities || [],
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      data: room,
    });
  } catch (error) {
    console.error("Create room error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating room",
    });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Private/Admin
exports.updateRoom = async (req, res) => {
  try {
    const { buildingNumber, floorNumber, department, roomName, maxCapacity, status, description, amenities } = req.body;
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check duplicate room name
    if (roomName && roomName !== room.roomName) {
      const existingRoom = await Room.findOne({ roomName });
      if (existingRoom) {
        return res.status(400).json({
          success: false,
          message: "Room with this name already exists",
        });
      }
    }

    // Update fields
    if (buildingNumber) room.buildingNumber = buildingNumber;
    if (floorNumber) room.floorNumber = floorNumber;
    if (department) room.department = department;
    if (roomName) room.roomName = roomName;
    if (maxCapacity) room.maxCapacity = maxCapacity;
    if (status) room.status = status;
    if (description) room.description = description;
    if (amenities) room.amenities = amenities;

    room.lastModifiedBy = req.user.id;
    await room.save();

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      data: room,
    });
  } catch (error) {
    console.error("Update room error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating room",
    });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
exports.deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // Check if room has active bookings
    const activeBookings = await Booking.findOne({
      room: room._id,
      status: { $in: ["pending", "approved"] },
    });

    if (activeBookings) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete room with active bookings",
      });
    }

    await room.deleteOne();

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting room",
    });
  }
};

// @desc    Get room statistics
// @route   GET /api/rooms/stats
// @access  Private/Admin
exports.getRoomStats = async (req, res) => {
  try {
    const totalRooms = await Room.countDocuments();
    const availableRooms = await Room.countDocuments({ status: "available" });
    const bookedRooms = await Room.countDocuments({ status: "booked" });
    const maintenanceRooms = await Room.countDocuments({ status: "maintenance" });

    // Room utilization by department
    const departmentStats = await Room.aggregate([
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
          },
          booked: {
            $sum: { $cond: [{ $eq: ["$status", "booked"] }, 1, 0] },
          },
          maintenance: {
            $sum: { $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0] },
          },
          totalCapacity: { $sum: "$maxCapacity" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalRooms,
        availableRooms,
        bookedRooms,
        maintenanceRooms,
        departmentStats,
      },
    });
  } catch (error) {
    console.error("Get room stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching room statistics",
    });
  }
};