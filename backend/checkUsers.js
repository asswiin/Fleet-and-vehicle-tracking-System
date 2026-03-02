const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Driver = require("./models/Driver");

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        const users = await User.find({}, "name email role");
        console.log("\n--- Users ---");
        console.log(JSON.stringify(users.map(u => ({ name: u.name, email: u.email, role: u.role })), null, 2));

        const drivers = await Driver.find({}, "name email role");
        console.log("\n--- Drivers ---");
        console.log(JSON.stringify(drivers.map(d => ({ name: d.name, email: d.email, role: d.role })), null, 2));

        process.exit(0);
    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
}

checkUsers();
