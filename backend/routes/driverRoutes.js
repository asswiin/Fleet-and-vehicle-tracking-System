// routes/driverRoutes.js
const express = require("express");
const router = express.Router();
const Driver = require("../models/Driver");

// POST: Register a new driver
router.post("/register", async (req, res) => {
  try {
    const { name, mobile, email, license, address } = req.body;

    // Validation
    if (!name || !mobile || !email || !license) {
      return res.status(400).json({ message: "Name, Mobile, Email, and License are required" });
    }

    // Check for duplicates
    const existingDriver = await Driver.findOne({ 
        $or: [{ mobile: mobile }, { email: email }, { license: license }] 
    });
    
    if (existingDriver) {
      return res.status(400).json({ message: "Driver with this Mobile, Email, or License already exists" });
    }

    const newDriver = new Driver({
      name,
      mobile,
      email,
      license,
      address
    });

    await newDriver.save();

    res.status(201).json({ 
        message: "Driver registered successfully", 
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
    const drivers = await Driver.find().sort({ createdAt: -1 });
    res.json({ data: drivers });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;