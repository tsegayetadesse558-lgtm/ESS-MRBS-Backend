const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Schedule = require('../models/Schedule');
const Room = require('../models/Room');

// ✅ Get all schedules
router.get('/', protect, async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate('room', 'roomName buildingNumber floorNumber department maxCapacity')
      .populate('scheduledBy', 'fullName username email')
      .sort({ meetingDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules',
      error: error.message,
    });
  }
});

// ✅ Create a new schedule (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      room,
      meetingDate,
      startTime,
      endTime,
      numberOfGuests,
      meetingTitle,
      roomData,
    } = req.body;

    console.log('📝 Creating schedule:', { room, meetingDate, startTime, endTime });

    // Validate required fields
    if (!room || !meetingDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Room, meeting date, start time, and end time are required',
      });
    }

    // Check if room exists
    const roomExists = await Room.findById(room);
    if (!roomExists) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    // Check if schedule already exists
    const existingSchedule = await Schedule.findOne({
      room: room,
      meetingDate: meetingDate,
      startTime: startTime,
      endTime: endTime,
      status: 'scheduled',
    });

    if (existingSchedule) {
      return res.status(400).json({
        success: false,
        message: 'A schedule already exists for this room at the selected time',
      });
    }

    // Create the schedule
    const scheduleData = {
      room,
      meetingDate,
      startTime,
      endTime,
      numberOfGuests: numberOfGuests || roomExists.maxCapacity,
      meetingTitle: meetingTitle || `${roomExists.roomName} Meeting`,
      scheduledBy: req.user._id,
      scheduledByAdmin: true,
      adminName: req.user.fullName || req.user.username || 'Admin',
      currentBookings: 0,
      remainingCapacity: roomExists.maxCapacity,
      roomData: roomData || {
        _id: roomExists._id,
        roomName: roomExists.roomName,
        maxCapacity: roomExists.maxCapacity,
        department: roomExists.department || 'N/A',
        buildingNumber: roomExists.buildingNumber || 'N/A',
        floorNumber: roomExists.floorNumber || 'N/A',
        description: roomExists.description || '',
        amenities: roomExists.amenities || [],
      },
      status: 'scheduled'
    };

    const schedule = new Schedule(scheduleData);
    await schedule.save();

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('room', 'roomName buildingNumber floorNumber department maxCapacity')
      .populate('scheduledBy', 'fullName username email');

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: populatedSchedule,
    });

  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule',
      error: error.message,
    });
  }
});

// ✅ Get schedules for a specific room
router.get('/room/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const schedules = await Schedule.find({
      room: roomId,
      status: 'scheduled',
    })
      .populate('room', 'roomName buildingNumber floorNumber department maxCapacity')
      .populate('scheduledBy', 'fullName username email')
      .sort({ meetingDate: 1, startTime: 1 });

    res.status(200).json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error('Get room schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room schedules',
      error: error.message,
    });
  }
});

// ✅ Update a schedule (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    if (schedule.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'This is not a schedule',
      });
    }

    // Prevent updating if there are existing bookings
    if (schedule.currentBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update schedule with existing bookings',
      });
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(
      id,
      { ...updates },
      { new: true, runValidators: true }
    )
      .populate('room', 'roomName buildingNumber floorNumber department maxCapacity')
      .populate('scheduledBy', 'fullName username email');

    res.status(200).json({
      success: true,
      message: 'Schedule updated successfully',
      data: updatedSchedule,
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule',
      error: error.message,
    });
  }
});

// ✅ Delete a schedule (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findById(id);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found',
      });
    }

    if (schedule.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'This is not a schedule',
      });
    }

    // Prevent deleting if there are existing bookings
    if (schedule.currentBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete schedule with existing bookings',
      });
    }

    await schedule.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule',
      error: error.message,
    });
  }
});

module.exports = router;