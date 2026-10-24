const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room is required"],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    meetingTitle: {
      type: String,
      trim: true,
      maxlength: [100, "Meeting title cannot exceed 100 characters"],
      default: "Untitled Meeting",
    },
    meetingDate: {
      type: Date,
      required: [true, "Meeting date is required"],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time in HH:MM (24h) format",
      ],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
        "Please provide valid time in HH:MM (24h) format",
      ],
    },
    teaService: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["confirmed", "rejected", "cancelled"],
      default: "confirmed",
      index: true,
    },
    // ✅ SEPARATED SOFT DELETE FLAGS
    isHiddenFromUser: {
      type: Boolean,
      default: false,
      index: true,
    },
    isHiddenFromAdmin: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---------- Indexes ----------
BookingSchema.index({ room: 1, meetingDate: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ user: 1, isHiddenFromUser: 1 });
BookingSchema.index({ meetingDate: 1, startTime: 1 });
BookingSchema.index({ status: 1 });

// ---------- Pre-save validation ----------
BookingSchema.pre("save", function (next) {
  if (this.startTime >= this.endTime) {
    return next(new Error("End time must be after start time"));
  }
  next();
});

// ---------- Virtuals ----------
BookingSchema.virtual("durationMinutes").get(function () {
  if (!this.startTime || !this.endTime) return 0;
  const [sh, sm] = this.startTime.split(":").map(Number);
  const [eh, em] = this.endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
});

BookingSchema.virtual("durationHours").get(function () {
  const m = this.durationMinutes;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${h}h ${mins}m`;
});

module.exports = mongoose.model("Booking", BookingSchema);