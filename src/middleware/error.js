const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error("❌ Error:", err);

  // Copy error object
  let error = { ...err };
  error.message = err.message;

  // 1. Mongoose Duplicate Key Error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `Duplicate value for ${field}. Please use a different value.`;
    error = { message, status: 400 };
  }

  // 2. Mongoose Validation Error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    error = { message: messages.join(", "), status: 400 };
  }

  // 3. Mongoose Cast Error (Invalid ID)
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = { message, status: 400 };
  }

  // 4. JWT Errors
  if (err.name === "JsonWebTokenError") {
    error = { message: "Invalid token. Please login again.", status: 401 };
  }

  if (err.name === "TokenExpiredError") {
    error = { message: "Token expired. Please login again.", status: 401 };
  }

  // 5. Custom Errors with status codes
  if (err.statusCode) {
    error.status = err.statusCode;
  }

  // 6. Response with formatted error
  const response = {
    success: false,
    message: error.message || "Server Error",
    status: error.status || 500,
    code: error.code || "SERVER_ERROR"
  };

  // Add stack trace only in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  // Send response
  res.status(response.status).json(response);
};

/**
 * 404 Not Found Handler
 * 
 * Handles requests to routes that don't exist
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async Error Wrapper
 * 
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handler middleware
 * 
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom Error Class
 * 
 * Use this to create custom errors with specific status codes
 * 
 * @example
 * throw new AppError('User not found', 404, 'USER_NOT_FOUND')
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  notFound,
  asyncWrapper,
  AppError
};