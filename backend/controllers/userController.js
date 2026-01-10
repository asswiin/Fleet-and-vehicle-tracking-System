// backend/controllers/userController.js
const User = require("../models/User"); // Your User Model
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendCredentialsEmail } = require("../utils/emailService");

const createManager = async (req, res) => {
  const { name, email, phone, place,dob,address } = req.body;

  try {
    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // 2. Generate a random secure password (8 characters)
    const randomPassword = crypto.randomBytes(4).toString("hex");

    // 3. Hash the password for the database
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    // 4. Create the User in Database
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword, // Store the HASH, not the plain text
      phone,
      place,
      role: "manager", // Important: Set role to manager
    });

    // 5. Send the PLAIN TEXT password to email (User only sees it once here)
    await sendCredentialsEmail(email, name, randomPassword);

    res.status(201).json({
      message: "Manager created and credentials sent via email",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = { createManager };















