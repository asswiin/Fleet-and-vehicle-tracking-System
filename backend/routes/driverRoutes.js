

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
    const drivers = await Driver.find().sort({ createdAt: -1 }).select("-password");
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

// --- CONDITIONAL UPLOAD MIDDLEWARE ---
// Multer cannot parse application/json bodies. We only invoke it when the
// incoming request is multipart/form-data (image uploads). For JSON bodies we
// skip Multer so express.json can handle parsing.
const handleDriverUpload = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return upload.fields([
      { name: "profilePhoto", maxCount: 1 },
      { name: "licensePhoto", maxCount: 1 },
    ])(req, res, next);
  }
  return next();
};

// PUT: Update Driver Profile (supports JSON or multipart with images)
router.put("/:id", handleDriverUpload, async (req, res) => {
  try {
    const { name, mobile, email, license, gender, dob } = req.body || {};
    let { address } = req.body || {};

    // Basic validation
    if (!name || !mobile || !email) {
      return res.status(400).json({ message: "Name, Mobile, and Email are required" });
    }

    // Parse address when sent as string (FormData)
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

    // Attach uploaded file paths if present
    if (req.files?.profilePhoto?.[0]) {
      updateData.profilePhoto = req.files.profilePhoto[0].path.replace(/\\/g, "/");
    }
    if (req.files?.licensePhoto?.[0]) {
      updateData.licensePhoto = req.files.licensePhoto[0].path.replace(/\\/g, "/");
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
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Use client's local date components to create the correct date
    // This fixes timezone issues where server UTC differs from client's local time
    let today;
    if (req.body.localDate) {
      const { year, month, day } = req.body.localDate;
      today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    } else {
      today = new Date();
      today.setUTCHours(0, 0, 0, 0);
    }

    // Check if a record already exists for today
    const existingRecord = await PunchRecord.findOne({
      driver: driverId,
      date: today
    });

    if (existingRecord) {
      return res.status(400).json({ message: "You have already punched in today." });
    }

    // Create new Punch Record
    const newPunch = new PunchRecord({
      driver: driverId,
      name: driver.name,
      email: driver.email,
      phone: driver.mobile,
      date: today,
      punchIn: new Date(),
      status: "On-Duty"
    });
    await newPunch.save();

    // Update Driver Status for Dashboard
    driver.isAvailable = true;
    await driver.save();

    res.json({ 
      message: "Punch in recorded successfully.", 
      data: driver 
    });
  } catch (err) {
    console.error("Punch Driver Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST: Punch Out (Mark as Unavailable)
router.post("/:id/punch-out", async (req, res) => {
  try {
    const driverId = req.params.id;
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Use client's local date components to create the correct date
    // This fixes timezone issues where server UTC differs from client's local time
    let today;
    if (req.body.localDate) {
      const { year, month, day } = req.body.localDate;
      today = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    } else {
      today = new Date();
      today.setUTCHours(0, 0, 0, 0);
    }

    const activeRecord = await PunchRecord.findOne({
      driver: driverId,
      date: today,
      punchOut: null // Ensure it hasn't been punched out yet
    });

    if (!activeRecord) {
      // Check if they punched out already
      const completedRecord = await PunchRecord.findOne({
        driver: driverId,
        date: today,
        punchOut: { $ne: null }
      });

      if (completedRecord) {
        return res.status(400).json({ message: "You have already punched out today." });
      }
      return res.status(400).json({ message: "You haven't punched in today." });
    }

    // Update Punch Record
    activeRecord.punchOut = new Date();
    activeRecord.status = "Completed";
    await activeRecord.save();

    // Update Driver Status for Dashboard
    driver.isAvailable = false;
    await driver.save();

    res.json({ 
      message: "Punch out recorded successfully.", 
      data: driver 
    });
  } catch (err) {
    console.error("Punch Out Driver Error:", err);
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
      punchOutTime: record.punchOut
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