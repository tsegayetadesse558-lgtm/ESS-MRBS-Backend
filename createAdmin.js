const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
const User = require("./src/models/User");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Delete existing admin to ensure a clean slate
    await User.deleteMany({ username: "admin" });
    console.log("🧹 Cleared old admin user");

    // 2. Create new admin
    // ⚠️ NOTE: We pass the PLAIN password here. 
    // Your User model will automatically hash it before saving.
    const admin = new User({
      fullName: "System Administrator",
      username: "admin",
      email: "admin@ess.com",
      department: "Director Office",
      role: "admin",
      password: "admin123",
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