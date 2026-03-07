const mongoose = require("mongoose");

const punchRecordSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    date: {
      type: Date,
      required: true
    }, // Stores the date (midnight) for easier querying
    punchIn: {
      type: Date,
      required: true
    },
    punchOut: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["on duty", "completed"],
      default: "on duty"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PunchRecord", punchRecordSchema);