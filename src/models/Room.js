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
      index: true
    },

    buildingNumber: {
      type: String,
      required: [true, "Building number is required"],
      trim: true,
      index: true
    },

    floorNumber: {
      type: String,
      required: [true, "Floor number is required"],
      trim: true,
      index: true
    },

    department: {
      type: String,
      required: [true, "Department is required"],
      enum: [
        "Director Office",
        "Deputy Director Office",
        "Business Statistics",
        "Household Statistics",
        "Other Departments"
      ],
      index: true
    },

    maxCapacity: {
      type: Number,
      required: [true, "Maximum capacity is required"],
      min: [1, "Capacity must be at least 1 person"],
      max: [100, "Capacity cannot exceed 100 people"],
      index: true
    },
    
    status: {
      type: String,
      enum: ["available", "booked", "maintenance", "unavailable"],
      default: "available",
      index: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: ""
    },

    amenities: {
      type: [String],
      default: [],
      validate: {
        validator: function(value) {
          return value.length <= 20;
        },
        message: "Cannot have more than 20 amenities"
      }
    },

    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(value) {
          return value.length <= 10;
        },
        message: "Cannot have more than 10 images"
      }
    },

    features: {
      hasProjector: { type: Boolean, default: false },
      hasWhiteboard: { type: Boolean, default: false },
      hasWiFi: { type: Boolean, default: true },
      hasVideoConference: { type: Boolean, default: false },
      hasAudioSystem: { type: Boolean, default: false },
      hasAirConditioning: { type: Boolean, default: true },
    },
    
    hourlyRate: {
      type: Number,
      default: 0,
      min: [0, "Hourly rate cannot be negative"]
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      comment: "Reference to the admin who created this room"
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      comment: "Reference to the admin who last modified this room"
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

RoomSchema.index({ buildingNumber: 1, floorNumber: 1 });
RoomSchema.index({ department: 1, status: 1 });
RoomSchema.index({ status: 1, maxCapacity: 1 });
RoomSchema.index({ createdAt: -1 });

RoomSchema.index({ buildingNumber: 1, floorNumber: 1, roomName: 1 }, { unique: true });
RoomSchema.pre("save", function (next) {
  // Trim room name
  if (this.roomName) {
    this.roomName = this.roomName.trim();
  }
  // Clean amenities (remove duplicates and empty strings)
  if (this.amenities && this.amenities.length > 0) {
    this.amenities = [...new Set(this.amenities.filter(item => item && item.trim()))]; }
  // AUTO-UPDATE STATUS BASED ON maxCapacity
  if (this.maxCapacity <= 0) {
    // If capacity is 0 or less, room is unavailable
    this.status = "unavailable";
  } else if (this.status === "unavailable" && this.maxCapacity > 0) {
    // If capacity is restored and status was unavailable, set to available
    this.status = "available";
  }
  
  next();
});
RoomSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  const docToUpdate = await this.model.findOne(this.getQuery());
  
  if (docToUpdate && update.maxCapacity !== undefined) {
    const newCapacity = update.maxCapacity;
    
    if (newCapacity <= 0) {
      // If capacity is 0 or less, room is unavailable
      this.setUpdate({ ...update, status: "unavailable" });
    } else if (docToUpdate.status === "unavailable" && newCapacity > 0) {
      // If capacity is restored and status was unavailable, set to available
      this.setUpdate({ ...update, status: "available" });
    }
  }
  
  next();
});
RoomSchema.methods.updateStatus = async function () {
  const Booking = mongoose.model("Booking");
  
  // First check capacity
  if (this.maxCapacity <= 0) {
    this.status = "unavailable";
    await this.save();
    return this;
  }
  
  // Check if there are active bookings
  const activeBookings = await Booking.findOne({
    room: this._id,
    status: { $in: ["pending", "approved"] }
  });
  
  if (activeBookings) {
    this.status = "booked";
  } else if (this.status !== "maintenance") {
    this.status = "available";
  }
  
  await this.save();
  return this;
};
RoomSchema.methods.isAvailable = async function (date, startTime, endTime) {
  const Booking = mongoose.model("Booking");
  
  // If room is not available or maxCapacity is 0, it's not available
  if (this.status !== "available" || this.maxCapacity <= 0) {
    return false;
  }
  
  const overlappingBooking = await Booking.findOne({
    room: this._id,
    meetingDate: new Date(date),
    status: { $nin: ["cancelled", "rejected"] },
    $or: [
      {
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  });
  
  return !overlappingBooking;
};
RoomSchema.methods.getUtilizationStats = async function (startDate, endDate) {
  const Booking = mongoose.model("Booking");
  
  const bookings = await Booking.find({
    room: this._id,
    meetingDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
    status: "approved"
  });
  
  const totalBookings = bookings.length;
  const totalGuests = bookings.reduce((sum, b) => sum + b.numberOfGuests, 0);
  const teaServiceCount = bookings.filter(b => b.teaService).length;
  
  return {
    totalBookings,
    totalGuests,
    teaServiceCount,
    averageGuests: totalBookings > 0 ? Math.round(totalGuests / totalBookings) : 0
  };
};

RoomSchema.virtual("fullLocation").get(function () {
  return `Building ${this.buildingNumber}, Floor ${this.floorNumber}`;
});

RoomSchema.virtual("displayName").get(function () {
  return `${this.roomName} (${this.department})`;
});
RoomSchema.virtual("isBookable").get(function () {
  return this.status === "available" && this.maxCapacity > 0;
});
RoomSchema.statics.getByBuilding = function (buildingNumber) {
  return this.find({ buildingNumber }).sort({ floorNumber: 1, roomName: 1 });
};

RoomSchema.statics.getAvailableRooms = async function (date, startTime, endTime, guests = 1) {
  const Booking = mongoose.model("Booking");
  
  // Get all rooms with capacity >= guests and status available
  const rooms = await this.find({
    status: "available",
    maxCapacity: { $gte: guests }
  });
  
  // Filter rooms with no overlapping bookings
  const availableRooms = [];
  for (const room of rooms) {
    const isAvailable = await room.isAvailable(date, startTime, endTime);
    if (isAvailable) {
      availableRooms.push(room);
    }
  }
  
  return availableRooms;
};
RoomSchema.statics.getDepartmentStats = async function () {
  return this.aggregate([
    {
      $group: {
        _id: "$department",
        total: { $sum: 1 },
        available: {
          $sum: { $cond: [{ $eq: ["$status", "available"] }, 1, 0] }
        },
        booked: {
          $sum: { $cond: [{ $eq: ["$status", "booked"] }, 1, 0] }
        },
        maintenance: {
          $sum: { $cond: [{ $eq: ["$status", "maintenance"] }, 1, 0] }
        },
        unavailable: {
          $sum: { $cond: [{ $eq: ["$status", "unavailable"] }, 1, 0] }
        },
        totalCapacity: { $sum: "$maxCapacity" }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};
RoomSchema.statics.getAvailabilitySummary = async function () {
  const total = await this.countDocuments();
  const available = await this.countDocuments({ status: "available" });
  const booked = await this.countDocuments({ status: "booked" });
  const maintenance = await this.countDocuments({ status: "maintenance" });
  const unavailable = await this.countDocuments({ status: "unavailable" });
  
  return {
    total,
    available,
    booked,
    maintenance,
    unavailable,
    availabilityRate: total > 0 ? Math.round((available / total) * 100) : 0
  };
};

module.exports = mongoose.model("Room", RoomSchema);
