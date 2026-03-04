const mongoose = require("mongoose");

const vehicleServiceSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    registrationNumber: { type: String, required: true },
    dateOfIssue: { type: Date, required: true },
    issueType: {
      type: String,
      enum: ["Accident", "Mechanical", "Engine", "Brake", "Electrical", "Maintenance"],
      required: true,
    },
    issueDescription: { type: String, required: true },
    odometerReading: { type: Number, required: true },
    serviceStartDate: { type: Date, required: true },
    workshopName: { type: String, required: true },
    totalServiceCost: { type: Number, default: null },
    serviceCompletionDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ["In-Service", "Completed"],
      default: "In-Service",
    },
    reportedBy: { type: String, required: true }, // Name of the person who reported
    reporterRole: {
      type: String,
      enum: ["Driver", "Manager"],
      required: true,
    },
  },
  { timestamps: true }
);

vehicleServiceSchema.index({ vehicleId: 1, createdAt: -1 });

module.exports = mongoose.model("VehicleService", vehicleServiceSchema);
