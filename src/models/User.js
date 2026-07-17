const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema(
  {
<<<<<<< HEAD
=======
  
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [50, "Full name cannot exceed 50 characters"],
      set: function(value) {
        return value ? value.replace(/\s+/g, ' ').trim() : value;
      }
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [20, "Username cannot exceed 20 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers and underscore"
      ],
      index: true
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,  // ✅ Important: allows multiple null values
      trim: true,
      lowercase: true,
      validate: {
        validator: function(value) {
          if (!value) return true;
          const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
          return regex.test(value);
        },
        message: "Please provide a valid email address"
      }
    },
<<<<<<< HEAD
=======

>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      maxlength: [100, "Password cannot exceed 100 characters"],
      select: false,
    },
<<<<<<< HEAD
=======

>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
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
<<<<<<< HEAD
=======

>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
    role: {
      type: String,
      enum: ["admin", "registered"],
      default: "registered",
      index: true
    },
<<<<<<< HEAD
=======
    
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
    status: {
      type: String,
      enum: ["active", "disabled", "pending"],
      default: "active",
      index: true
    },
<<<<<<< HEAD
=======
    
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastLogin: {
      type: Date,
      default: null
    },
    lastLoginIP: {
      type: String,
      default: null
    },
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockedUntil: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
<<<<<<< HEAD

// Indexes
=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1, role: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ status: 1 });
<<<<<<< HEAD

// Pre-save middleware - Hash password
=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    this.loginAttempts = 0;
    this.lockedUntil = null;
    
    next();
  } catch (error) {
    next(error);
  }
});
<<<<<<< HEAD

// Pre-save middleware - Format full name
=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.pre("save", function (next) {
  if (this.fullName) {
    this.fullName = this.fullName.replace(/\s+/g, ' ').trim();
  }
  next();
});
<<<<<<< HEAD

// Instance Methods
=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.methods.generateToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username,
      email: this.email,
      role: this.role 
    }, 
    process.env.JWT_SECRET || 'your-secret-key', 
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};
<<<<<<< HEAD

=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

UserSchema.methods.isLocked = function () {
  if (!this.lockedUntil) return false;
  return this.lockedUntil > new Date();
};
<<<<<<< HEAD

=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  
  if (this.loginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  await this.save({ validateBeforeSave: false });
  return this;
};
<<<<<<< HEAD

=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
  return this;
};

<<<<<<< HEAD
// Virtual Properties
=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.virtual("displayName").get(function () {
  return this.fullName || this.username;
});
<<<<<<< HEAD

=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.virtual("shortInfo").get(function () {
  return {
    id: this._id,
    fullName: this.fullName,
    username: this.username,
    role: this.role,
    department: this.department,
    status: this.status
  };
});

<<<<<<< HEAD
// Static Methods
=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.statics.findByUsernameOrEmail = function (identifier) {
  if (!identifier) return null;
  return this.findOne({
    $or: [
      { username: identifier.toLowerCase() },
      { email: identifier.toLowerCase() }
    ]
  });
};

UserSchema.statics.getRoleCounts = async function () {
  const counts = await this.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } }
  ]);
  
  return counts.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});
};
<<<<<<< HEAD

=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.statics.isEmailInUse = async function (email, excludeUserId) {
  if (!email) return false;
  
  const query = { email: email.toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  const existing = await this.findOne(query);
  return !!existing;
};
<<<<<<< HEAD

=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
UserSchema.statics.isUsernameInUse = async function (username, excludeUserId) {
  if (!username) return false;
  
  const query = { username: username.toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  const existing = await this.findOne(query);
  return !!existing;
};

// Handle duplicate key errors
UserSchema.post('save', function(error, doc, next) {
  if (error.code === 11000) {
    if (error.keyPattern && error.keyPattern.email) {
      next(new Error('This email is already registered'));
    } else if (error.keyPattern && error.keyPattern.username) {
      next(new Error('This username is already taken'));
    } else {
      next(new Error('Duplicate key error: A user with this information already exists'));
    }
  } else {
    next(error);
  }
});

module.exports = mongoose.model("User", UserSchema);
