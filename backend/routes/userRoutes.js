const express = require("express");
const router = express.Router();
const crypto = require("crypto"); // Built-in Node module for generating passwords
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User"); 
const Driver = require("../models/Driver");// Your User Model
const { sendCredentialsEmail } = require("../utils/emailService"); // Email utility

// --- MULTER CONFIGURATION FOR USER PROFILE PHOTOS ---
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
    // Create unique filename: user-TIMESTAMP-random.jpg
    cb(null, "user-" + Date.now() + "-" + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// ==========================================
// 1. REGISTER (Initial Admin Setup)
// ==========================================
// Use this route via Postman/Insomnia once to create your first Admin account.
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    // Basic Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create the Admin User
    const user = new User({
      fullName,
      email,
      password, // The model's pre-save hook will hash this
      role: "admin", // Explicitly set as Admin
    });

    await user.save();

    res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ==========================================
// 2. LOGIN (For Admins & Managers)
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Find user
      const user = await User.findOne({ email: email });
    
    if (user) {
      // User found, check password
      const isMatch = await user.comparePassword(password);
      if (isMatch) {
        return res.json({
          message: "Login successful",
          user: {
            id: user._id,
            name: user.name,  
            email: user.email,
            role: user.role,
            district: user.district || "",
            branch: user.branch || "",
          },
        });
      }
    }

    // 2. If not found in User (or password mismatch), check DRIVER collection
    const driver = await Driver.findOne({ email: email });

    if (driver) {
      // Driver found, check password
      const isDriverMatch = await driver.comparePassword(password);
      if (isDriverMatch) {
        return res.json({
          message: "Login successful",
          user: {
            id: driver._id,
            name: driver.name,
            email: driver.email,
            role: "driver", // Explicitly identify as driver
            district: driver.district || "",
            branch: driver.branch || "",
          },
        });
      }
    }

    // 3. Neither found or passwords didn't match
    return res.status(401).json({ message: "Invalid credentials" });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ==========================================
// 3. CREATE MANAGER (Called from Admin App)
// ==========================================
router.post("/create-manager", async (req, res) => {
  try {
    // 1. Get dynamic data from React Native App
    // Note: The app sends 'name', but our model uses 'fullName'
    const { name, email, phone, place, dob, address } = req.body;

    // 2. Validation
    if (!name || !email) {
      return res.status(400).json({ message: "Name and Email are required" });
    }

    // 3. Check for duplicates
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // 4. Generate a unique Random Password (8 characters hex)
    // This creates a new password every time this route is hit.
    const randomPassword = crypto.randomBytes(4).toString("hex");


    // 5. Construct the Full Address String for the 'place' field
    // We combine house, street, city, district, and state into one string.
    const addressData = {
      house: address?.house || "",
      street: address?.street || "",
      city: address?.city || "",
      district: address?.district || "",
      state: address?.state || "",
    };



    // 6. PREPARE PLACE STRING (Full Address for display)
    // Combine the specific fields into one string for the 'place' column
    const placeString = [
      addressData.house,
      addressData.street,
      addressData.city,
      addressData.district,
      addressData.state
    ].filter(part => part && part.trim() !== "").join(", ");


    // 7. Create the Manager in Database
    const user = new User({
     name: name,        // FIXED: Use 'name' to match User Schema (was 'fullName')
      email: email,
      password: randomPassword, 
      phone: phone || "",
      dob: dob || "",   // ADDED: Store the Date of Birth
      place: placeString,       
      address: addressData, // ADDED: Store the full Address object
      role: "manager",  
    });

    await user.save();

    // 8. Send Email with the PLAIN TEXT password
    // (We send 'randomPassword' because 'user.password' is now hashed)
    await sendCredentialsEmail(email, name, randomPassword);

    res.status(201).json({
      message: "Manager created and credentials sent via email",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        place: user.place,
        address: user.address, // Verify this in response
        role: user.role,
      },
    });

  } catch (err) {
    console.error("Create Manager Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ==========================================
// 4. GET ALL USERS (For Admin Dashboard List)
// ==========================================
router.get("/", async (req, res) => {
  try {
    // Return all users, sorted by newest first, excluding passwords
    const users = await User.find().sort({ createdAt: -1 }).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ==========================================
// 5. GET SINGLE USER
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body; // Expecting { status: "Resigned" }

    // Validate status
    if (!["Active", "Resigned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { status: status }, 
      { new: true } // Return the updated document
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: `User status updated to ${status}`,
      user: user
    });

  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, email, phone, place, dob, address } = req.body;

    // Check if user exists
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (place) user.place = place;
    if (dob) user.dob = dob;
    if (address) user.address = address;

    await user.save();

    res.json({ message: "User updated successfully", data: user });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// --- CONDITIONAL UPLOAD MIDDLEWARE FOR USER PROFILE PHOTO ---
const handleUserUpload = (req, res, next) => {
  if (req.is("multipart/form-data")) {
    return upload.fields([
      { name: "profilePhoto", maxCount: 1 },
    ])(req, res, next);
  }
  return next();
};

// PUT: Update User Profile with Image Support
router.put("/:id/profile", handleUserUpload, async (req, res) => {
  try {
    const { name, email, phone, place, dob, address } = req.body || {};

    // Check if user exists
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (place) user.place = place;
    if (dob) user.dob = dob;
    if (address) {
      // Parse address when sent as string (FormData)
      if (typeof address === "string") {
        try {
          user.address = JSON.parse(address);
        } catch (e) {
          // Keep existing address if parsing fails
        }
      } else {
        user.address = address;
      }
    }

    // Attach uploaded profile photo if present
    if (req.files?.profilePhoto?.[0]) {
      user.profilePhoto = req.files.profilePhoto[0].path.replace(/\\/g, "/");
    }

    await user.save();

    res.json({ message: "Profile updated successfully", data: user });
  } catch (err) {
    console.error("Update User Profile Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PATCH: Update User Status (For Resigning)
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id, 
      { status: status }, 
      { new: true }
    );
    res.json({ message: "Status updated", data: user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;