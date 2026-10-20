const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const cookieParser = require("cookie-parser");

dotenv.config({ path: path.join(__dirname, "../.env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
connectDB();

// ✅ PRODUCTION CORS — allows localhost + Vercel + CLIENT_URL
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CLIENT_URL, // e.g. https://your-app.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);

      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
      const isVercel = /\.vercel\.app$/.test(origin);
      const isAllowed = isLocalhost || isVercel || allowedOrigins.includes(origin);

      if (isAllowed) {
        return callback(null, true);
      }
      console.warn(`❌ CORS blocked: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Handle preflight requests explicitly (prevents 404 on OPTIONS)
app.options("*", cors());

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Health & test ----------
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working!",
    timestamp: new Date().toISOString(),
  });
});

// ---------- Routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);

// ---------- Root ----------
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ESS Meeting Room Booking System API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      rooms: "/api/rooms",
      bookings: "/api/bookings",
      health: "/api/health",
      test: "/api/test",
    },
  });
});

// ---------- 404 ----------
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// ---------- Error handler ----------
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ---------- Start ----------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`✅ Test: http://localhost:${PORT}/api/test`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || "development"}`);
});