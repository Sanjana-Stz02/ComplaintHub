import mongoose from "mongoose";

const ROLE_VALUES = ["Citizen", "Worker", "MP", "Admin", "Super Admin"];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true
    },
    phone: {
      type: String,
      trim: true,
      unique: true,
      sparse: true
    },
    role: {
      type: String,
      enum: ROLE_VALUES,
      default: "Citizen"
    },
    password: {
      type: String,
      required: true,
      minlength: 6
    },
    loginOtpCode: {
      type: String,
      default: null
    },
    loginOtpExpiresAt: {
      type: Date,
      default: null
    },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export { ROLE_VALUES };