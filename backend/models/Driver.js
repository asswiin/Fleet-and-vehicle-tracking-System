// // models/Driver.js
// const mongoose = require("mongoose");

// const driverSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//     },
//     mobile: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       trim: true,
//     },
//      password: {
//       type: String,
//       required: true,
//      },
//     license: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     address: {
//       house: String,
//       street: String,
//       city: String,
//       district: String,
//       state: String,
//       zip: String,
//     },
//     role: {
//       type: String,
//       default: "driver", // Explicit role for frontend logic
//     },
//     status: {
//       type: String,
//       default: "Active", // Active, Inactive, On-Trip
//     },
//   },
//   { timestamps: true }
// );

// driverSchema.pre("save", async function () {
//   if (!this.isModified("password")) return;
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });

// // Method to compare passwords
// driverSchema.methods.comparePassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

// module.exports = mongoose.model("Driver", driverSchema);





// models/Driver.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
    
    // Unique is true here, but it ONLY applies to the 'drivers' collection
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    
    password: { type: String, required: true }, // Required for login
    
    license: { type: String, required: true, unique: true },
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
  },
  { timestamps: true }
);

// Hash password before saving
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