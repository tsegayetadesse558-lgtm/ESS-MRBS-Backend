const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
const User = require("./src/models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const existing = await User.findOne({ username: "admin" });
    if (existing) {
      console.log("✅ Admin already exists");
      console.log("📝 Username:", existing.username);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = new User({
      fullName: "System Administrator",
      username: "admin",
      email: "admin@ess.com",
      department: "Director Office",  // ✅ FIXED: Changed from "IT"
      role: "admin",
      password: hashedPassword,
      status: "active"
    });

    await admin.save();
    console.log("✅ Admin user created successfully!");
    console.log("📝 Username: admin");
    console.log("📝 Password: admin123");
    console.log("📝 Role: admin");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createAdmin();