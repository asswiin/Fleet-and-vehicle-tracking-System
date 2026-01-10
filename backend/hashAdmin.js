const mongoose = require("mongoose");
const User = require("./models/User");
require("dotenv").config();

// Create test admin user
async function createAdminUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@gmail.com" });
    if (existingAdmin) {
      console.log("Admin user already exists!");
      await mongoose.connection.close();
      return;
    }

    // Create new admin user
    const adminUser = new User({
      fullName: "Admin User",
      email: "admin@gmail.com",
      password: "admin123",
      role: "admin",
    });

    await adminUser.save();
    console.log("✅ Admin user created successfully!");
    console.log("Email: admin@gmail.com");
    console.log("Password: admin123");
    console.log("Role: admin");

    // Create test regular user
    const regularUser = new User({
      fullName: "Test User",
      email: "user@gmail.com",
      password: "user@123",
      role: "user",
    });

    await regularUser.save();
    console.log("\n✅ Regular user created successfully!");
    console.log("Email: user@gmail.com");
    console.log("Password: user@123");
    console.log("Role: user");

    await mongoose.connection.close();
  } catch (err) {
    console.error("Error:", err.message);
  }
}

createAdminUser();
