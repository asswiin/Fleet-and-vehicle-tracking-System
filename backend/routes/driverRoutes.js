

// routes/driverRoutes.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Driver = require("../models/Driver");
const PunchRecord = require("../models/PunchRecord");
const { sendCredentialsEmail } = require("../utils/emailService");


// --- MULTER CONFIGURATION ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure upload folder exists to avoid ENOENT
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, "uploads/"); // Ensure this folder exists in your root
  },
  filename: function (req, file, cb) {
    // Create unique filename: driver-TIMESTAMP-random.jpg
    cb(null, "driver-" + Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });


// POST: Register a new driver
router.post("/register", async (req, res) => {
  try {
    const { name, mobile, email, license, gender, dob, address } = req.body;

    // 1. Validation
    if (!name || !mobile || !email || !license || !gender || !dob) {
      return res.status(400).json({ message: "Name, Mobile, Email, License, Gender, and DOB are required" });
    }

    // 2. Gender Validation
    const validGenders = ["male", "female", "other"];
    if (!validGenders.includes(gender.toLowerCase())) {
      return res.status(400).json({ message: "Gender must be 'male', 'female', or 'other'" });
    }

    // 3. DOB Validation (18+ years old)
    const dobDate = new Date(dob);
    if (Number.isNaN(dobDate.getTime())) {
      return res.status(400).json({ message: "Invalid date of birth" });
    }
    const minDob = new Date();
    minDob.setFullYear(minDob.getFullYear() - 18);
    if (dobDate > minDob) {
      return res.status(400).json({ message: "Driver must be at least 18 years old" });
    }

    // 4. Check Duplicates
    const emailExists = await Driver.findOne({ email: email });
    if (emailExists) return res.status(400).json({ message: "Email already exists." });

    const mobileExists = await Driver.findOne({ mobile: mobile });
    if (mobileExists) return res.status(400).json({ message: "Mobile number already exists." });

    const licenseExists = await Driver.findOne({ license: license });
    if (licenseExists) return res.status(400).json({ message: "License already exists." });

    // 5. Generate Random Password
    const randomPassword = crypto.randomBytes(4).toString("hex");

    // 6. Create Driver
    const newDriver = new Driver({
      name,
      mobile,
      email,
      license,
      gender: gender.toLowerCase(),
      dob: dobDate,
      address,
      password: randomPassword,
      role: "driver"
    });

    await newDriver.save();

    // 7. Send Email
    try {
      await sendCredentialsEmail(email, name, randomPassword, 'driver');
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

// GET: Check if license exists (for another driver)
router.get("/check-license/:license", async (req, res) => {
  try {
    const { license } = req.params;
    const { excludeId } = req.query; // Exclude current driver when editing

    const query = { license: license };
    if (excludeId) {
      query._id = { $ne: excludeId }; // Exclude the current driver
    }

    const existingDriver = await Driver.findOne(query);

    res.json({
      exists: !!existingDriver,
      driverName: existingDriver?.name || null
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET: Fetch all drivers
router.get("/", async (req, res) => {
  try {
    // Optimized: Exclude heavy base64 images from list view for better performance
    const drivers = await Driver.find()
      .sort({ createdAt: -1 })
      .select("-password -licensePhoto");
    res.json({ data: drivers });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET: Fetch Single Driver
router.get("/:id", async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).select("-password");
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT: Update Driver Profile with Base64 Image Support (Vercel Compatible)
router.put("/:id", async (req, res) => {
  try {
    const { name, mobile, email, license, gender, dob, profilePhotoBase64, licensePhotoBase64 } = req.body || {};
    let { address } = req.body || {};

    // Basic validation
    if (!name || !mobile || !email) {
      return res.status(400).json({ message: "Name, Mobile, and Email are required" });
    }

    // Parse address when sent as string
    if (typeof address === "string") {
      try {
        address = JSON.parse(address);
      } catch (e) {
        // keep as raw string if parsing fails
      }
    }

    const updateData = {
      name,
      mobile,
      email,
    };

    // Add license if provided
    if (license) {
      updateData.license = license;
    }

    // Add gender if provided (validate it)
    if (gender) {
      const validGenders = ["male", "female", "other"];
      if (validGenders.includes(gender.toLowerCase())) {
        updateData.gender = gender.toLowerCase();
      }
    }

    // Add DOB if provided
    if (dob) {
      const dobDate = new Date(dob);
      if (!Number.isNaN(dobDate.getTime())) {
        updateData.dob = dobDate;
      }
    }

    if (address) {
      updateData.address = address;
    }

    // Store base64 images if provided (Vercel compatible)
    if (profilePhotoBase64) {
      updateData.profilePhoto = profilePhotoBase64;
    }
    if (licensePhotoBase64) {
      updateData.licensePhoto = licensePhotoBase64;
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedDriver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({ message: "Profile updated successfully", data: updatedDriver });
  } catch (err) {
    console.error("Update Driver Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST: Punch Driver (Mark as Available)
router.post("/:id/punch", async (req, res) => {
  try {
    const driverId = req.params.id;
    console.log(`[PUNCH-IN] Request for driver: ${driverId}`);
    console.log(`[PUNCH-IN] DB readyState: ${require('mongoose').connection.readyState}`);

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    console.log(`[PUNCH-IN] Driver found: ${driver.name}, mobile: ${driver.mobile}, email: ${driver.email}`);

    // Calculate today's date boundaries
    // Use client's local date if provided (handles timezone differences)
    let startOfDay, endOfDay;
    if (req.body && req.body.localDate) {
      const { year, month, day } = req.body.localDate;
      startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    } else {
      const now = new Date();
      startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    }

    console.log(`[PUNCH-IN] Date range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Check if a record already exists for today (use date range for robustness)
    const existingRecord = await PunchRecord.findOne({
      driver: driverId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingRecord) {
      console.log(`[PUNCH-IN] Already punched in: ${existingRecord._id}`);
      return res.status(400).json({ message: "You have already punched in today." });
    }

    // Step 1: Create PunchRecord FIRST and verify it persisted
    let savedPunch;
    try {
      const punchData = {
        driver: driverId,
        name: driver.name || "Unknown",
        email: driver.email || "unknown@unknown.com",
        phone: driver.mobile || "0000000000",
        date: startOfDay,
        punchIn: new Date(),
        status: "on duty"
      };
      console.log(`[PUNCH-IN] Creating PunchRecord with data:`, JSON.stringify(punchData));

      savedPunch = await PunchRecord.create(punchData);
      console.log(`[PUNCH-IN] PunchRecord.create() returned _id: ${savedPunch?._id}, status: ${savedPunch?.status}`);
    } catch (createErr) {
      console.error(`[PUNCH-IN] PunchRecord.create() FAILED:`, createErr.message);
      return res.status(500).json({ message: "Failed to create punch record", error: createErr.message });
    }

    // Step 2: Verify the record actually exists in DB
    const verified = await PunchRecord.findById(savedPunch._id);
    if (!verified) {
      console.error(`[PUNCH-IN] VERIFICATION FAILED - PunchRecord ${savedPunch._id} not found after create!`);
      return res.status(500).json({ message: "Punch record was not saved to database" });
    }
    console.log(`[PUNCH-IN] VERIFIED PunchRecord ${verified._id} exists with status: ${verified.status}`);

    // Step 3: Only NOW update Driver status (after punch record is confirmed)
    driver.isAvailable = true;
    const hasActiveTrip = ["Accepted", "On-trip", "pending"].includes(driver.driverStatus);
    if (!hasActiveTrip) {
      driver.driverStatus = "available";
    }
    await driver.save();

    console.log(`[PUNCH-IN] Driver ${driverId} updated: isAvailable=true, driverStatus=${driver.driverStatus}`);

    res.json({
      message: "Punch in recorded successfully.",
      data: driver,
      punchRecordId: savedPunch._id
    });
  } catch (err) {
    console.error("[PUNCH-IN] UNEXPECTED ERROR:", err.message, err.stack);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST: Punch Out (Mark as Unavailable)
router.post("/:id/punch-out", async (req, res) => {
  try {
    const driverId = req.params.id;
    console.log(`[PUNCH-OUT] Request for driver: ${driverId}`);

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Calculate today's date boundaries
    let startOfDay, endOfDay;
    if (req.body && req.body.localDate) {
      const { year, month, day } = req.body.localDate;
      startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    } else {
      const now = new Date();
      startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    }

    const activeRecord = await PunchRecord.findOne({
      driver: driverId,
      date: { $gte: startOfDay, $lte: endOfDay },
      punchOut: null // Ensure it hasn't been punched out yet
    });

    if (!activeRecord) {
      // Check if they punched out already
      const completedRecord = await PunchRecord.findOne({
        driver: driverId,
        date: { $gte: startOfDay, $lte: endOfDay },
        punchOut: { $ne: null }
      });

      if (completedRecord) {
        return res.status(400).json({ message: "You have already punched out today." });
      }
      return res.status(400).json({ message: "You haven't punched in today." });
    }

    // Update Punch Record
    activeRecord.punchOut = new Date();
    activeRecord.status = "completed";
    await activeRecord.save();

    console.log(`[PUNCH-OUT] Record updated: ${activeRecord._id}`);

    // Update Driver Status for Dashboard
    driver.isAvailable = false;
    driver.driverStatus = "offline";
    await driver.save();

    res.json({
      message: "Punch out recorded successfully.",
      data: driver
    });
  } catch (err) {
    console.error("Punch Out Driver Error:", err.message, err.stack);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET: Fetch Punch History
router.get("/:id/punch-history", async (req, res) => {
  try {
    // Fetch records from the separate collection
    const history = await PunchRecord.find({ driver: req.params.id })
      .sort({ date: -1 })
      .limit(30); // Optional: Limit to last 30 entries

    // Map the fields to match what the frontend expects 
    // (Frontend app/punching.tsx expects: punchInTime, punchOutTime)
    const formattedHistory = history.map(record => ({
      date: record.date,
      punchInTime: record.punchIn,
      punchOutTime: record.punchOut,
      status: record.status
    }));

    res.json({
      data: formattedHistory
    });
  } catch (err) {
    console.error("Get Punch History Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



module.exports = router;












