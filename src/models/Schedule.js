const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room is required"],
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

    numberOfGuests: {
      type: Number,
      default: 0
    },

    meetingTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Meeting title cannot exceed 100 characters"],
      required: [true, "Meeting title is required"]
    },

    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Scheduled by is required"],
      index: true
    },

    scheduledByAdmin: {
      type: Boolean,
      default: true
    },

    adminName: {
      type: String,
      trim: true,
      default: "Admin"
    },

    // ✅ Track bookings count for this schedule
    currentBookings: {
      type: Number,
      default: 0,
      min: 0
    },

    remainingCapacity: {
      type: Number,
      default: 0,
      min: 0
    },

    // ✅ Embed room data for frontend display
    roomData: {
      _id: mongoose.Schema.Types.ObjectId,
      roomName: String,
      maxCapacity: Number,
      department: String,
      buildingNumber: String,
      floorNumber: String,
      description: String,
      amenities: [String]
    },

    status: {
      type: String,
      enum: ['scheduled', 'cancelled', 'completed'],
      default: 'scheduled',
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes
ScheduleSchema.index({ room: 1, meetingDate: 1, startTime: 1 });
ScheduleSchema.index({ meetingDate: 1, startTime: 1, endTime: 1 });
ScheduleSchema.index({ status: 1 });
ScheduleSchema.index({ scheduledBy: 1 });

// Virtual for available seats
ScheduleSchema.virtual("availableSeats").get(function() {
  const capacity = this.roomData?.maxCapacity || this.numberOfGuests || 0;
  return Math.max(0, capacity - (this.currentBookings || 0));
});

// Virtual for isFull
ScheduleSchema.virtual("isFull").get(function() {
  const capacity = this.roomData?.maxCapacity || this.numberOfGuests || 0;
  return (this.currentBookings || 0) >= capacity;
});

// Pre-save middleware
ScheduleSchema.pre("save", function(next) {
  // Validate start time is before end time
  if (this.startTime >= this.endTime) {
    next(new Error("Start time must be before end time"));
  }
  
  // Calculate duration
  const startParts = this.startTime.split(':').map(Number);
  const endParts = this.endTime.split(':').map(Number);
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  const duration = endMinutes - startMinutes;

  if (duration < 15) {
    next(new Error("Meeting duration must be at least 15 minutes"));
  }

  // Set remaining capacity
  this.remainingCapacity = this.roomData?.maxCapacity || this.numberOfGuests || 0;
  
  next();
});

// Methods
ScheduleSchema.methods.incrementBookings = async function() {
  this.currentBookings = (this.currentBookings || 0) + 1;
  this.remainingCapacity = Math.max(0, this.remainingCapacity - 1);
  return this.save();
};

ScheduleSchema.methods.decrementBookings = async function() {
  this.currentBookings = Math.max(0, (this.currentBookings || 0) - 1);
  this.remainingCapacity = Math.max(0, this.remainingCapacity + 1);
  return this.save();
};

ScheduleSchema.methods.hasAvailableSeats = function() {
  const capacity = this.roomData?.maxCapacity || this.numberOfGuests || 0;
  return (this.currentBookings || 0) < capacity;
};

module.exports = mongoose.model("Schedule", ScheduleSchema);