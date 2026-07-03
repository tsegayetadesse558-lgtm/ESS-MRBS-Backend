const { body, param, query, validationResult } = require("express-validator");
const { DEPARTMENTS, BOOKING_LIMITS, TIME_FORMAT } = require("../config/constants");

/**
 * Validation middleware - Checks for validation errors
 * @param {Array} validations - Array of validation chains
 * @returns {Function} - Express middleware
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors
    const formattedErrors = errors.array().map((err) => ({
      field: err.param,
      message: err.msg,
      value: err.value,
    }));

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors,
    });
  };
};

/**
 * User Validation Rules
 */
const userValidation = {
  // Create user validation
  createUser: [
    body("fullName")
      .notEmpty().withMessage("Full name is required")
      .isLength({ min: 2, max: 50 }).withMessage("Full name must be between 2 and 50 characters")
      .trim(),
    body("username")
      .notEmpty().withMessage("Username is required")
      .isLength({ min: 3, max: 20 }).withMessage("Username must be between 3 and 20 characters")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("Username can only contain letters, numbers and underscore")
      .toLowerCase()
      .trim(),
    body("email")
      .optional()
      .isEmail().withMessage("Please provide a valid email address")
      .toLowerCase()
      .trim(),
    body("department")
      .notEmpty().withMessage("Department is required")
      .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`),
    body("role")
      .optional()
      .isIn(["admin", "registered"]).withMessage("Role must be either 'admin' or 'registered'"),
    body("password")
      .notEmpty().withMessage("Password is required")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],

  // Update user validation
  updateUser: [
    param("id")
      .isMongoId().withMessage("Invalid user ID format"),
    body("fullName")
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage("Full name must be between 2 and 50 characters")
      .trim(),
    body("email")
      .optional()
      .isEmail().withMessage("Please provide a valid email address")
      .toLowerCase()
      .trim(),
    body("department")
      .optional()
      .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`),
    body("role")
      .optional()
      .isIn(["admin", "registered"]).withMessage("Role must be either 'admin' or 'registered'"),
    body("status")
      .optional()
      .isIn(["active", "disabled"]).withMessage("Status must be either 'active' or 'disabled'"),
    body("password")
      .optional()
      .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],

  // Get user by ID validation
  getUserById: [
    param("id")
      .isMongoId().withMessage("Invalid user ID format"),
  ],
};

/**
 * Room Validation Rules
 */
const roomValidation = {
  // Create room validation
  createRoom: [
    body("buildingNumber")
      .notEmpty().withMessage("Building number is required")
      .trim(),
    body("floorNumber")
      .notEmpty().withMessage("Floor number is required")
      .trim(),
    body("department")
      .notEmpty().withMessage("Department is required")
      .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`),
    body("roomName")
      .notEmpty().withMessage("Room name is required")
      .isLength({ min: 2, max: 50 }).withMessage("Room name must be between 2 and 50 characters")
      .trim(),
    body("maxCapacity")
      .notEmpty().withMessage("Maximum capacity is required")
      .isInt({ min: BOOKING_LIMITS.MIN_CAPACITY, max: BOOKING_LIMITS.MAX_CAPACITY })
      .withMessage(`Capacity must be between ${BOOKING_LIMITS.MIN_CAPACITY} and ${BOOKING_LIMITS.MAX_CAPACITY}`),
    body("description")
      .optional()
      .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
      .trim(),
    body("amenities")
      .optional()
      .isArray().withMessage("Amenities must be an array"),
  ],

  // Update room validation
  updateRoom: [
    param("id")
      .isMongoId().withMessage("Invalid room ID format"),
    body("buildingNumber")
      .optional()
      .trim(),
    body("floorNumber")
      .optional()
      .trim(),
    body("department")
      .optional()
      .isIn(DEPARTMENTS).withMessage(`Department must be one of: ${DEPARTMENTS.join(", ")}`),
    body("roomName")
      .optional()
      .isLength({ min: 2, max: 50 }).withMessage("Room name must be between 2 and 50 characters")
      .trim(),
    body("maxCapacity")
      .optional()
      .isInt({ min: BOOKING_LIMITS.MIN_CAPACITY, max: BOOKING_LIMITS.MAX_CAPACITY })
      .withMessage(`Capacity must be between ${BOOKING_LIMITS.MIN_CAPACITY} and ${BOOKING_LIMITS.MAX_CAPACITY}`),
    body("status")
      .optional()
      .isIn(["available", "booked", "maintenance"]).withMessage("Status must be 'available', 'booked', or 'maintenance'"),
    body("description")
      .optional()
      .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters")
      .trim(),
  ],

  // Get room by ID validation
  getRoomById: [
    param("id")
      .isMongoId().withMessage("Invalid room ID format"),
  ],
};

/**
 * Booking Validation Rules
 */
const bookingValidation = {
  // Create booking validation
  createBooking: [
    body("room")
      .notEmpty().withMessage("Room ID is required")
      .isMongoId().withMessage("Invalid room ID format"),
    body("meetingDate")
      .notEmpty().withMessage("Meeting date is required")
      .isISO8601().withMessage("Invalid date format. Use ISO 8601 (YYYY-MM-DD)")
      .custom((value) => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) {
          throw new Error("Meeting date cannot be in the past");
        }
        return true;
      }),
    body("startTime")
      .notEmpty().withMessage("Start time is required")
      .matches(TIME_FORMAT.PATTERN).withMessage("Start time must be in HH:MM format")
      .custom((value) => {
        const hours = parseInt(value.split(':')[0]);
        if (hours < BOOKING_LIMITS.BUSINESS_HOURS_START || hours >= BOOKING_LIMITS.BUSINESS_HOURS_END) {
          throw new Error(`Start time must be between ${BOOKING_LIMITS.BUSINESS_HOURS_START}:00 AM and ${BOOKING_LIMITS.BUSINESS_HOURS_END}:00 PM`);
        }
        return true;
      }),
    body("endTime")
      .notEmpty().withMessage("End time is required")
      .matches(TIME_FORMAT.PATTERN).withMessage("End time must be in HH:MM format")
      .custom((value) => {
        const hours = parseInt(value.split(':')[0]);
        if (hours < BOOKING_LIMITS.BUSINESS_HOURS_START || hours > BOOKING_LIMITS.BUSINESS_HOURS_END) {
          throw new Error(`End time must be between ${BOOKING_LIMITS.BUSINESS_HOURS_START}:00 AM and ${BOOKING_LIMITS.BUSINESS_HOURS_END}:00 PM`);
        }
        return true;
      })
      .custom((value, { req }) => {
        if (value <= req.body.startTime) {
          throw new Error("End time must be after start time");
        }
        return true;
      })
      .custom((value, { req }) => {
        const startParts = req.body.startTime.split(':').map(Number);
        const endParts = value.split(':').map(Number);
        const duration = (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]);
        if (duration < BOOKING_LIMITS.MIN_DURATION) {
          throw new Error(`Meeting duration must be at least ${BOOKING_LIMITS.MIN_DURATION} minutes`);
        }
        if (duration > BOOKING_LIMITS.MAX_DURATION) {
          throw new Error(`Meeting duration cannot exceed ${BOOKING_LIMITS.MAX_DURATION / 60} hours`);
        }
        return true;
      }),
    body("numberOfGuests")
      .notEmpty().withMessage("Number of guests is required")
      .isInt({ min: BOOKING_LIMITS.MIN_GUESTS, max: BOOKING_LIMITS.MAX_GUESTS })
      .withMessage(`Number of guests must be between ${BOOKING_LIMITS.MIN_GUESTS} and ${BOOKING_LIMITS.MAX_GUESTS}`),
    body("meetingTitle")
      .notEmpty().withMessage("Meeting title is required")
      .isLength({ min: 3, max: 100 }).withMessage("Meeting title must be between 3 and 100 characters")
      .trim(),
    body("teaService")
      .optional()
      .isBoolean().withMessage("Tea service must be true or false"),
    body("notes")
      .optional()
      .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters")
      .trim(),
  ],

  // Update booking status validation
  updateBookingStatus: [
    param("id")
      .isMongoId().withMessage("Invalid booking ID format"),
    body("status")
      .notEmpty().withMessage("Status is required")
      .isIn(["pending", "approved", "rejected", "cancelled", "completed"])
      .withMessage("Status must be 'pending', 'approved', 'rejected', 'cancelled', or 'completed'"),
  ],

  // Cancel booking validation
  cancelBooking: [
    param("id")
      .isMongoId().withMessage("Invalid booking ID format"),
  ],

  // Get booking by ID validation
  getBookingById: [
    param("id")
      .isMongoId().withMessage("Invalid booking ID format"),
  ],
};

/**
 * Common Validation Rules
 */
const commonValidation = {
  // Pagination validation
  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 }).withMessage("Page must be a positive integer")
      .toInt(),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage("Limit must be between 1 and 100")
      .toInt(),
  ],

  // Date range validation
  dateRange: [
    query("startDate")
      .optional()
      .isISO8601().withMessage("Start date must be a valid date"),
    query("endDate")
      .optional()
      .isISO8601().withMessage("End date must be a valid date")
      .custom((value, { req }) => {
        if (req.query.startDate && value < req.query.startDate) {
          throw new Error("End date must be after start date");
        }
        return true;
      }),
  ],
};

// Export all validation rules
module.exports = {
  validate,
  userValidation,
  roomValidation,
  bookingValidation,
  commonValidation,
};