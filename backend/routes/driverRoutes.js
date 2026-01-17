// // routes/driverRoutes.js
// const express = require("express");
// const router = express.Router();
// const crypto = require("crypto");
// const Driver = require("../models/Driver");
// const { sendCredentialsEmail } = require("../utils/emailService"); 

// // POST: Register a new driver
// router.post("/register", async (req, res) => {
//   try {
//     const { name, mobile, email, license, gender, dob, address } = req.body;

//     // 1. Validation
//     if (!name || !mobile || !email || !license || !gender || !dob) {
//       return res.status(400).json({ message: "Name, Mobile, Email, License, Gender, and DOB are required" });
//     }

//     // 2. Gender Validation
//     const validGenders = ["male", "female", "other"];
//     if (!validGenders.includes(gender.toLowerCase())) {
//       return res.status(400).json({ message: "Gender must be 'male', 'female', or 'other'" });
//     }

//     // 3. DOB Validation (18+ years old)
//     const dobDate = new Date(dob);
//     if (Number.isNaN(dobDate.getTime())) {
//       return res.status(400).json({ message: "Invalid date of birth" });
//     }
//     const minDob = new Date();
//     minDob.setFullYear(minDob.getFullYear() - 18);
//     if (dobDate > minDob) {
//       return res.status(400).json({ message: "Driver must be at least 18 years old" });
//     }

//     // 4. DETAILED DUPLICATE CHECK (Strictly checking Driver collection)
    
//     // Check Email
//     const emailExists = await Driver.findOne({ email: email });
//     if (emailExists) {
//       return res.status(400).json({ message: "A Driver with this EMAIL already exists." });
//     }

//     // Check Mobile
//     const mobileExists = await Driver.findOne({ mobile: mobile });
//     if (mobileExists) {
//       return res.status(400).json({ message: "A Driver with this MOBILE NUMBER already exists." });
//     }

//     // Check License
//     const licenseExists = await Driver.findOne({ license: license });
//     if (licenseExists) {
//       return res.status(400).json({ message: "A Driver with this LICENSE already exists." });
//     }

//     // 5. Generate Random Password
//     const randomPassword = crypto.randomBytes(4).toString("hex");

//     // 6. Create Driver
//     const newDriver = new Driver({
//       name,
//       mobile,
//       email,
//       license,
//       gender: gender.toLowerCase(),
//       dob: dobDate,
//       address,
//       password: randomPassword, // Will be hashed by model
//       role: "driver"
//     });

//     await newDriver.save();

//     // 7. Send Email
//     try {
//         await sendCredentialsEmail(email, name, randomPassword);
//     } catch (emailErr) {
//         console.error("Failed to send email:", emailErr);
//     }

//     res.status(201).json({ 
//         message: "Driver registered successfully.", 
//         data: newDriver 
//     });

//   } catch (err) {
//     console.error("Register Driver Error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

// // GET: Fetch all drivers
// router.get("/", async (req, res) => {
//   try {
//     const drivers = await Driver.find().sort({ createdAt: -1 }).select("-password");
//     res.json({ data: drivers });
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

// module.exports = router;









// routes/driverRoutes.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Driver = require("../models/Driver");
const { sendCredentialsEmail } = require("../utils/emailService"); 

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

// PUT: Update Driver Profile
router.put("/:id", async (req, res) => {
  try {
    const { name, mobile, email, address } = req.body;
    
    // Validate that critical fields aren't empty if provided
    if (name === "" || mobile === "" || email === "") {
        return res.status(400).json({ message: "Fields cannot be empty" });
    }

    // Prepare update object (Prevent updating License/DOB/Gender/Role via this route for security)
    const updateData = {
        name,
        mobile,
        email,
        address
    };

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

module.exports = router;