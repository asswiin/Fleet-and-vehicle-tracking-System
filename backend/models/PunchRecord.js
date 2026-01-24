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
      enum: ["On-Duty", "Completed"],
      default: "On-Duty"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PunchRecord", punchRecordSchema);