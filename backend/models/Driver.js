// models/Driver.js
const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    license: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      house: String,
      street: String,
      city: String,
      district: String,
      state: String,
      zip: String,
    },
    status: {
      type: String,
      default: "Active", // Active, Inactive, On-Trip
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Driver", driverSchema);