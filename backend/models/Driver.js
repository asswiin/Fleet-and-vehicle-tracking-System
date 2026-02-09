// models/Driver.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const driverSchema = new mongoose.Schema(
  {
    profilePhoto: { type: String, default: "" },
    licensePhoto: { type: String, default: "" },
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    password: { type: String, required: true },
    license: { type: String, required: true, unique: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    dob: { type: Date, required: true },
    address: {
      house: String,
      street: String,
      city: String,
      district: String,
      state: String,
      zip: String,
    },
    role: { type: String, default: "driver" },
    status: { type: String, default: "Active" },

    // This field controls the Green/Purple badge in the Admin/Manager dashboard
    isAvailable: {
      type: Boolean,
      default: false
    },
    
    // Driver status for trip tracking (offline, available, pending, Accepted, On-trip, Off-duty)
    driverStatus: {
      type: String,
      enum: ["offline", "available", "pending", "Accepted", "On-trip", "Off-duty"],
      default: "offline"
    },
    
    // Track current trip
    currentTripId: {
      type: String,
      default: null
    },
    
    // District for location-based access control
    district: {
      type: String,
      default: "",
    },
    // Branch for driver access control
    branch: {
      type: String,
      default: "",
    }
  },
  { timestamps: true }
);

// Hash password before savingsss
driverSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
driverSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Driver", driverSchema);