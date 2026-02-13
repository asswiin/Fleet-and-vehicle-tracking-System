const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

// Simple inline User schema definition
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Clear existing users for testing
    await User.deleteMany({});
    console.log("🗑️  Cleared existing users");

    // Hash passwords
    const adminPassword = await bcrypt.hash("Admin@123", 10);
    const userPassword = await bcrypt.hash("User@123", 10);

    // Create admin user
    const adminUser = await User.create({
      fullName: "Admin User",
      email: "admin@fleettrack.com",
      password: adminPassword,
      role: "admin",
    });
    console.log("\n✅ Admin user created:");
    console.log("   Email: admin@fleettrack.com");
    console.log("   Password: Admin@123");
    console.log("   Role: admin");

    // Create regular user
    const regularUser = await User.create({
      fullName: "Test User",
      email: "user@fleettrack.com",
      password: userPassword,
      role: "user",
    });
    console.log("\n✅ Regular user created:");
    console.log("   Email: user@fleettrack.com");
    console.log("   Password: User@123");
    console.log("   Role: user");

    // Verify users exist
    const allUsers = await User.find().select("-password");
    console.log(`\n📊 Total users in database: ${allUsers.length}`);

    await mongoose.connection.close();
    console.log("\n✅ Database seeded successfully!");
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seedDatabase();
