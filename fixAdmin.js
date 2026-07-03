const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });
const User = require("./src/models/User");

async function fixAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find admin
    const user = await User.findOne({ username: "admin" });
    if (!user) {
      console.log("❌ Admin not found");
      process.exit(1);
    }

    // Hash password directly with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    // Update password directly in database
    await User.updateOne(
      { username: "admin" },
      { $set: { password: hashedPassword } }
    );

    console.log("✅ Password updated successfully!");
    
    // Verify
    const updatedUser = await User.findOne({ username: "admin" }).select("+password");
    const match = await bcrypt.compare("admin123", updatedUser.password);
    console.log("✅ Verification:", match ? "PASSED ✅" : "FAILED ❌");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

fixAdmin();