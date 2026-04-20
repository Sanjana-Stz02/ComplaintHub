import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    complaintId: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["status_change", "assignment", "comment", "progress_update"],
      default: "status_change"
    },
    isRead: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
