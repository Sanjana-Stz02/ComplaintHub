import mongoose from "mongoose";

const STATUS_VALUES = [
  "Pending",
  "Assigned",
  "In Progress",
  "Resolved",
  "Rejected"
];

const PRIORITY_VALUES = ["Low", "Medium", "High", "Emergency"];

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: STATUS_VALUES,
      default: "Pending"
    },
    priority: {
      type: String,
      enum: PRIORITY_VALUES,
      default: "Low"
    }
  },
  { timestamps: true }
);

export const Complaint = mongoose.model("Complaint", complaintSchema);
export { STATUS_VALUES, PRIORITY_VALUES };
