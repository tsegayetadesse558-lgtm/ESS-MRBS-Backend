const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: [true, "Room name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Room name must be at least 2 characters"],
      maxlength: [50, "Room name cannot exceed 50 characters"],
      index: true,
    },
    buildingNumber: {
      type: String,
      required: [true, "Building number is required"],
      trim: true,
      index: true,
    },
    floorNumber: {
      type: String,
      required: [true, "Floor number is required"],
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: [
        "Director Office",
        "Deputy Director Office",
        "Business Statistics",
        "Household Statistics",
        "Other Departments",
      ],
      index: true,
    },
    maxCapacity: {
      type: Number,
      required: [true, "Maximum capacity is required"],
      min: [1, "Capacity must be at least 1 person"],
      max: [100, "Capacity cannot exceed 100 people"],
      index: true,
    },
    status: {
      type: String,
      enum: ["available", "maintenance", "unavailable"],
      default: "available",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    amenities: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 20,
        message: "Cannot have more than 20 amenities",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---------- Indexes ----------
RoomSchema.index({ buildingNumber: 1, floorNumber: 1 });
RoomSchema.index({ department: 1, status: 1 });
RoomSchema.index({ status: 1, maxCapacity: 1 });
RoomSchema.index({ createdAt: -1 });
RoomSchema.index(
  { buildingNumber: 1, floorNumber: 1, roomName: 1 },
  { unique: true }
);

// ---------- Pre-save ----------
RoomSchema.pre("save", function (next) {
  if (this.roomName) this.roomName = this.roomName.trim();

  if (this.amenities && this.amenities.length > 0) {
    this.amenities = [
      ...new Set(this.amenities.filter((i) => i && i.trim())),
    ];
  }

  // If capacity is 0 or less → unavailable
  if (this.maxCapacity <= 0) {
    this.status = "unavailable";
  } else if (this.status === "unavailable" && this.maxCapacity > 0) {
    this.status = "available";
  }

  next();
});

// ---------- Methods ----------
RoomSchema.methods.isAvailable = async function (date, startTime, endTime) {
  const Booking = mongoose.model("Booking");

  if (this.status !== "available" || this.maxCapacity <= 0) return false;

  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);

  const overlapping = await Booking.findOne({
    room: this._id,
    meetingDate: day,
    status: "confirmed",
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });

  return !overlapping;
};

// ---------- Virtuals ----------
RoomSchema.virtual("fullLocation").get(function () {
  return `Building ${this.buildingNumber}, Floor ${this.floorNumber}`;
});

RoomSchema.virtual("displayName").get(function () {
  return `${this.roomName} (${this.department})`;
});

RoomSchema.virtual("isBookable").get(function () {
  // A room is bookable unless it's under maintenance or unavailable
  return (
    this.status === "available" && this.maxCapacity > 0
  );
});

// ---------- Statics ----------
RoomSchema.statics.getByBuilding = function (buildingNumber) {
  return this.find({ buildingNumber }).sort({ floorNumber: 1, roomName: 1 });
};

RoomSchema.statics.getAvailableRooms = async function (
  date,
  startTime,
  endTime
) {
  const rooms = await this.find({ status: "available", maxCapacity: { $gt: 0 } });
  const result = [];
  for (const room of rooms) {
    if (await room.isAvailable(date, startTime, endTime)) {
      result.push(room);
    }
  }
  return result;
};

RoomSchema.statics.getDepartmentStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: "$department",
        total: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] },
        },
        maintenance: {
          $sum: { $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0] },
        },
        unavailable: {
          $sum: { $cond: [{ $eq: ["$status", "unavailable"] }, 1, 0] },
        },
        totalCapacity: { $sum: "$maxCapacity" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

RoomSchema.statics.getAvailabilitySummary = async function () {
  const total = await this.countDocuments();
  const available = await this.countDocuments({ status: "available" });
  const maintenance = await this.countDocuments({ status: "maintenance" });
  const unavailable = await this.countDocuments({ status: "unavailable" });

  return {
    total,
    available,
    maintenance,
    unavailable,
    availabilityRate: total > 0 ? Math.round((available / total) * 100) : 0,
  };
};

module.exports = mongoose.model("Room", RoomSchema);