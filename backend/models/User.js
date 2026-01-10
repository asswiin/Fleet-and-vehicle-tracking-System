const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    // CHANGE 1: Rename 'fullName' to 'name' to match frontend payload
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "driver", "user"],
      default: "user",
    },
    phone: {
      type: String,
      default: "",
    },
    // This stores "City, State" (Backend compatibility)
    place: {
      type: String,
      default: "",
    },
    // This stores "DD/MM/YYYY"
    dob: {
      type: String,
      default: "",
    },
    // CHANGE 2: Ensure this structure matches the frontend object exactly
    address: {
      house: { type: String, default: "" },
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      state: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Pre-save hook for password hashing
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);