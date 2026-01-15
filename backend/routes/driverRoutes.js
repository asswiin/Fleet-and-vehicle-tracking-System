// routes/driverRoutes.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Driver = require("../models/Driver");
const { sendCredentialsEmail } = require("../utils/emailService"); 

// POST: Register a new driver
router.post("/register", async (req, res) => {
  try {
    const { name, mobile, email, license, address } = req.body;

    // 1. Validation
    if (!name || !mobile || !email || !license) {
      return res.status(400).json({ message: "Name, Mobile, Email, and License are required" });
    }

    // 2. DETAILED DUPLICATE CHECK (Strictly checking Driver collection)
    
    // Check Email
    const emailExists = await Driver.findOne({ email: email });
    if (emailExists) {
      return res.status(400).json({ message: "A Driver with this EMAIL already exists." });
    }

    // Check Mobile
    const mobileExists = await Driver.findOne({ mobile: mobile });
    if (mobileExists) {
      return res.status(400).json({ message: "A Driver with this MOBILE NUMBER already exists." });
    }

    // Check License
    const licenseExists = await Driver.findOne({ license: license });
    if (licenseExists) {
      return res.status(400).json({ message: "A Driver with this LICENSE already exists." });
    }

    // 3. Generate Random Password
    const randomPassword = crypto.randomBytes(4).toString("hex");

    // 4. Create Driver
    const newDriver = new Driver({
      name,
      mobile,
      email,
      license,
      address,
      password: randomPassword, // Will be hashed by model
      role: "driver"
    });

    await newDriver.save();

    // 5. Send Email
    try {
        await sendCredentialsEmail(email, name, randomPassword);
    } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
    }

    res.status(201).json({ 
        message: "Driver registered successfully.", 
        data: newDriver 
    });

  } catch (err) {
    console.error("Register Driver Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET: Fetch all drivers
router.get("/", async (req, res) => {
  try {
    const drivers = await Driver.find().sort({ createdAt: -1 }).select("-password");
    res.json({ data: drivers });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;