const Booking = require('../models/Booking');

// Create a new schedule (admin only)
exports.createSchedule = async (req, res) => {
  try {
    const {
      room,
      meetingDate,
      startTime,
      endTime,
      numberOfGuests,
      meetingTitle,
      scheduledBy,
      adminName,
    } = req.body;

    // Validate required fields
    if (!room || !meetingDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Room, meeting date, start time, and end time are required',
      });
    }

    // Check if schedule already exists for this room at this time
    const existingSchedule = await Booking.findOne({
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

    // Create the schedule with status 'scheduled'
    const scheduleData = {
      room,
      meetingDate,
      startTime,
      endTime,
      numberOfGuests: numberOfGuests || 0,
      meetingTitle: meetingTitle || `Scheduled Meeting - ${adminName || 'Admin'}`,
      adminName: adminName || 'Admin',
      scheduledBy: scheduledBy || req.user._id,
      scheduledByAdmin: true,
      status: 'scheduled',
      isSchedule: true,
      currentBookings: 0,
      remainingCapacity: numberOfGuests || 0,
    };

    console.log('📝 Schedule data:', scheduleData);

    const schedule = new Booking(scheduleData);
    await schedule.save();

    // Populate room details for response
    const populatedSchedule = await Booking.findById(schedule._id).populate('room');

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
};

// Get all schedules
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Booking.find({
      status: 'scheduled',
    })
      .populate('room')
      .populate('scheduledBy', 'fullName username')
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
};

// Get schedules for a specific room
exports.getRoomSchedules = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const schedules = await Booking.find({
      room: roomId,
      status: 'scheduled',
    })
      .populate('room')
      .populate('scheduledBy', 'fullName username')
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
};

// Update a schedule
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const schedule = await Booking.findById(id);
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

    const updatedSchedule = await Booking.findByIdAndUpdate(
      id,
      { ...updates },
      { new: true, runValidators: true }
    ).populate('room');

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
};

// Delete a schedule
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Booking.findById(id);
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
};