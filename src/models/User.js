const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // ADDED: Required for generateToken

const UserSchema = new mongoose.Schema(
  {
  
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
      sparse: true,
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

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      maxlength: [100, "Password cannot exceed 100 characters"],
      select: false,
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

    role: {
      type: String,
      enum: ["admin", "registered"],
      default: "registered",
      index: true
    },
    
    status: {
      type: String,
      enum: ["active", "disabled", "pending"],
      default: "active",
      index: true
    },
    
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      comment: "Reference to the admin who created this user"
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
UserSchema.index({ role: 1 });
UserSchema.index({ department: 1, role: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ status: 1 });
UserSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) {
      return next();
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Reset login attempts when password is changed
    this.loginAttempts = 0;
    this.lockedUntil = null;
    
    next();
  } catch (error) {
    next(error);
  }
});
UserSchema.pre("save", function (next) {
  if (this.fullName) {
    this.fullName = this.fullName.replace(/\s+/g, ' ').trim();
  }
  next();
});
UserSchema.methods.generateToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username,
      email: this.email,
      role: this.role 
    }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRE || "30d" }
  );
};
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
UserSchema.methods.incrementLoginAttempts = async function () {
  this.loginAttempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  await this.save({ validateBeforeSave: false });
  return this;
};
UserSchema.methods.resetLoginAttempts = async function () {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
  return this;
};

UserSchema.virtual("displayName").get(function () {
  return this.fullName || `${this.firstName} ${this.lastName}`;
});
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
UserSchema.statics.isEmailInUse = async function (email, excludeUserId) {
  if (!email) return false;
  
  const query = { email: email.toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  const existing = await this.findOne(query);
  return !!existing;
};
UserSchema.statics.isUsernameInUse = async function (username, excludeUserId) {
  if (!username) return false;
  
  const query = { username: username.toLowerCase() };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  const existing = await this.findOne(query);
  return !!existing;
};

// Handle duplicate key errors gracefully
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
