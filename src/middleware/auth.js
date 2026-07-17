const jwt = require("jsonwebtoken");
const User = require("../models/User");

<<<<<<< HEAD
/**
 * Authentication Middleware - Professional JWT Verification
 * 
 * This middleware protects routes by verifying JWT tokens.
 * It extracts the token from cookies, verifies its validity,
 * and attaches the user to the request object.
 */
=======
>>>>>>> 8d55e317b20b200268f987d3aa347f843a13c2f8
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Extract token from cookies
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // 2. Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided. Please login to continue.",
        code: "NO_TOKEN"
      });
    }

    // 3. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token. Please login again.",
          code: "INVALID_TOKEN"
        });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
          code: "TOKEN_EXPIRED"
        });
      }
      throw error;
    }

    // 4. Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
        code: "USER_NOT_FOUND"
      });
    }

    // 5. Check if user is active
    if (user.status === "disabled") {
      return res.status(403).json({
        success: false,
        message: "Your account has been disabled. Please contact administrator.",
        code: "ACCOUNT_DISABLED"
      });
    }

    // 6. Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error("Authentication Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
      code: "SERVER_ERROR"
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user exists (should be attached by protect middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated. Please login.",
        code: "NOT_AUTHENTICATED"
      });
    }

    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized to access this resource.`,
        code: "UNAUTHORIZED_ROLE",
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

const isAdmin = authorize("admin");

const isRegistered = authorize("registered");

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && user.status === "active") {
          req.user = user;
        }
      } catch (error) {
        // Invalid token - silently ignore and proceed
        // User will not be attached to req
      }
    }

    next();
  } catch (error) {
    next();
  }
};

module.exports = {
  protect,
  authorize,
  isAdmin,
  isRegistered,
  optionalAuth
};
