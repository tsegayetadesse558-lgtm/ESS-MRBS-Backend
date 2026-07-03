const mongoose = require("mongoose");

/**
 * Booking Schema - Professional Meeting Room Booking Management
 * 
 * This schema defines the structure for meeting room bookings in the ESS MRBS.
 * Strict validation prevents overlapping bookings.
 */
const BookingSchema = new mongoose.Schema(
  {
    /**
     * Room Reference - Which room is booked
     */
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room is required"],
      index: true
    },

    /**
     * Meeting Date & Time
     */
    meetingDate: {
      type: Date,
      required: [true, "Meeting date is required"],
      index: true,
      validate: {
        validator: function(value) {
          // Allow today's date and future dates only
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const meetingDate = new Date(value);
          meetingDate.setHours(0, 0, 0, 0);
          return meetingDate >= today;
        },
        message: "Meeting date cannot be in the past"
      }
    },

    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time in HH:MM format"
      ]
      // REMOVED: Business hours validation (8:00 AM - 8:00 PM restriction)
    },

    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time in HH:MM format"
      ]
      // REMOVED: Business hours validation (8:00 AM - 8:00 PM restriction)
    },

    /**
     * Booked By - User who created the booking
     */
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Scheduled by is required"],
      index: true
    },

    /**
     * Meeting Details
     */
    numberOfGuests: {
      type: Number,
      required: [true, "Number of guests is required"],
      min: [1, "Guests must be at least 1"],
      max: [100, "Guests cannot exceed 100"],
      index: true
    },

    teaService: {
      type: Boolean,
      default: false,
      index: true
    },

    /**
     * Additional Information
     */
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: ""
    },

    /**
     * Booking Status
     */
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/**
 * Indexes for optimal query performance
 */
BookingSchema.index({ meetingDate: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ room: 1, meetingDate: 1 });
BookingSchema.index({ scheduledBy: 1 });
BookingSchema.index({ createdAt: -1 });

/**
 * Pre-save middleware - Validate time range and business rules
 */
BookingSchema.pre("save", async function (next) {
  try {
    // Validate start time is before end time
    if (this.startTime >= this.endTime) {
      throw new Error("Start time must be before end time");
    }

    // Calculate duration in minutes
    const startParts = this.startTime.split(':').map(Number);
    const endParts = this.endTime.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const duration = endMinutes - startMinutes;

    // Minimum booking duration is 15 minutes
    if (duration < 15) {
      throw new Error("Meeting duration must be at least 15 minutes");
    }

    // REMOVED: Maximum booking duration is 8 hours (no limit anymore)

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-save middleware - Check for overlapping bookings
 */
BookingSchema.pre("save", async function (next) {
  try {
    // Skip overlap check if this is a status update only
    if (this.isModified('status') && !this.isModified('room') && 
        !this.isModified('meetingDate') && !this.isModified('startTime') && 
        !this.isModified('endTime')) {
      return next();
    }

    const Booking = mongoose.model("Booking");

    // Check for overlapping bookings with proper time comparison
    const overlapping = await Booking.findOne({
      room: this.room,
      meetingDate: this.meetingDate,
      _id: { $ne: this._id },
      status: { $nin: ['rejected', 'cancelled'] }, // Only check active bookings
      $or: [
        {
          startTime: { $lt: this.endTime },
          endTime: { $gt: this.startTime }
        }
      ]
    });

    if (overlapping) {
      throw new Error("Room is already booked for the selected time slot");
    }

    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Pre-find middleware - Exclude cancelled/rejected bookings by default
 */
BookingSchema.pre(/^find/, function(next) {
  // Uncomment if you want to exclude cancelled/rejected by default
  // this.where({ status: { $nin: ['cancelled', 'rejected'] } });
  next();
});

/**
 * Instance Methods
 */

/**
 * Get meeting duration in minutes
 */
BookingSchema.methods.getDurationMinutes = function () {
  if (!this.startTime || !this.endTime) return 0;
  const startParts = this.startTime.split(':').map(Number);
  const endParts = this.endTime.split(':').map(Number);
  return (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
};

/**
 * Check if booking is active (not cancelled or rejected)
 */
BookingSchema.methods.isActive = function () {
  return this.status === 'pending' || this.status === 'approved';
};

/**
 * Check if booking can be modified
 */
BookingSchema.methods.canModify = function () {
  return this.status === 'pending';
};

/**
 * Virtual Properties
 */

/**
 * Meeting duration in minutes
 */
BookingSchema.virtual("durationMinutes").get(function () {
  return this.getDurationMinutes();
});

/**
 * Meeting duration in hours (formatted)
 */
BookingSchema.virtual("durationHours").get(function () {
  const minutes = this.getDurationMinutes();
  if (minutes === 0) return "0h 0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
});

/**
 * Static Methods
 */

/**
 * Get bookings for a specific date
 */
BookingSchema.statics.getByDate = function (date) {
  return this.find({
    meetingDate: new Date(date)
  })
    .populate("room", "roomName buildingNumber floorNumber")
    .populate("scheduledBy", "fullName username")
    .sort({ startTime: 1 });
};

/**
 * Get bookings by status
 */
BookingSchema.statics.getByStatus = function (status) {
  return this.find({ status })
    .populate("room", "roomName buildingNumber floorNumber")
    .populate("scheduledBy", "fullName username")
    .sort({ meetingDate: 1, startTime: 1 });
};

/**
 * Get pending bookings
 */
BookingSchema.statics.getPending = function () {
  return this.getByStatus('pending');
};

/**
 * Update booking status
 */
BookingSchema.statics.updateStatus = async function (bookingId, status) {
  const validStatuses = ['pending', 'approved', 'rejected', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }
  
  const booking = await this.findById(bookingId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  booking.status = status;
  return booking.save();
};

/**
 * Check room availability
 */
BookingSchema.statics.checkAvailability = async function (roomId, date, startTime, endTime) {
  const overlapping = await this.findOne({
    room: roomId,
    meetingDate: new Date(date),
    status: { $nin: ['rejected', 'cancelled'] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });
  
  return !overlapping;
};

/**
 * Pre-validate hook to ensure endTime is after startTime
 */
BookingSchema.pre('validate', function(next) {
  if (this.startTime && this.endTime && this.startTime >= this.endTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

// Handle duplicate key errors gracefully
BookingSchema.post('save', function(error, doc, next) {
  if (error.code === 11000) {
    next(new Error('This time slot is already booked for this room'));
  } else {
    next(error);
  }
});

module.exports = mongoose.model("Booking", BookingSchema);