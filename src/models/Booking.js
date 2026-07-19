const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room is required"],
      index: true
    },

    // ✅ Link to schedule (reference only)
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: false,
      index: true
    },

    meetingDate: {
      type: Date,
      required: [true, "Meeting date is required"],
      index: true,
      validate: {
        validator: function(value) {
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
    },

    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time in HH:MM format"
      ]
    },

    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Scheduled by is required"],
      index: true
    },

    numberOfGuests: {
      type: Number,
      required: [true, "Number of guests is required"],
      min: [1, "Guests must be at least 1"],
      max: [100, "Guests cannot exceed 100"],
      index: true
    },

    meetingTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Meeting title cannot exceed 100 characters"],
      default: "Meeting"
    },

    teaService: {
      type: Boolean,
      default: false,
      index: true
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: ""
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true
    },

    // ✅ Flag to identify if this booking is from a schedule
    isScheduleBooking: {
      type: Boolean,
      default: false,
      index: true
    },

    bookingReference: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
BookingSchema.index({ meetingDate: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ room: 1, meetingDate: 1 });
BookingSchema.index({ scheduledBy: 1 });
BookingSchema.index({ createdAt: -1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ scheduleId: 1 });

// Pre-save middleware - Validate time range
BookingSchema.pre("save", async function (next) {
  try {
    if (this.startTime >= this.endTime) {
      throw new Error("Start time must be before end time");
    }

    const startParts = this.startTime.split(':').map(Number);
    const endParts = this.endTime.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    const duration = endMinutes - startMinutes;

    if (duration < 15) {
      throw new Error("Meeting duration must be at least 15 minutes");
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware - Check for overlapping bookings
BookingSchema.pre("save", async function (next) {
  try {
    // Skip overlap check if this is a status update only
    if (this.isModified('status') && !this.isModified('room') && 
        !this.isModified('meetingDate') && !this.isModified('startTime') && 
        !this.isModified('endTime')) {
      return next();
    }

    // ✅ Skip overlap check for schedule bookings
    if (this.isScheduleBooking) {
      return next();
    }

    const Booking = mongoose.model("Booking");

    const overlapping = await Booking.findOne({
      room: this.room,
      meetingDate: this.meetingDate,
      _id: { $ne: this._id },
      status: { $nin: ['rejected', 'cancelled'] },
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

// Virtuals
BookingSchema.virtual("durationMinutes").get(function () {
  if (!this.startTime || !this.endTime) return 0;
  const startParts = this.startTime.split(':').map(Number);
  const endParts = this.endTime.split(':').map(Number);
  return (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
});

BookingSchema.virtual("durationHours").get(function () {
  const minutes = this.durationMinutes;
  if (minutes === 0) return "0h 0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
});

// Methods
BookingSchema.methods.isActive = function () {
  return this.status === 'pending' || this.status === 'approved';
};

BookingSchema.methods.canModify = function () {
  return this.status === 'pending';
};

// Statics
BookingSchema.statics.getByDate = function (date) {
  return this.find({
    meetingDate: new Date(date)
  })
    .populate("room", "roomName buildingNumber floorNumber")
    .populate("scheduledBy", "fullName username")
    .sort({ startTime: 1 });
};

BookingSchema.statics.getByStatus = function (status) {
  return this.find({ status })
    .populate("room", "roomName buildingNumber floorNumber")
    .populate("scheduledBy", "fullName username")
    .sort({ meetingDate: 1, startTime: 1 });
};

BookingSchema.statics.getPending = function () {
  return this.getByStatus('pending');
};

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

module.exports = mongoose.model("Booking", BookingSchema);