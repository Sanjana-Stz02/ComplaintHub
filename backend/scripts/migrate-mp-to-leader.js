/**
 * One-off migration: rename users with role "MP" to "Leader".
 *
 * Run once after deploying the Leader rename:
 *   npm run migrate:mp-to-leader   (from the backend directory)
 *
 * Requires MONGODB_URI to be set (same env the server uses).
 * Uses the raw MongoDB collection so the Mongoose enum validator
 * (which no longer includes "MP") is bypassed.
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";

dotenv.config();

const run = async () => {
  await connectDB();

  const users = mongoose.connection.collection("users");
  const before = await users.countDocuments({ role: "MP" });

  if (before === 0) {
    console.log("[migrate] No users with role 'MP' found. Nothing to do.");
    return;
  }

  console.log(`[migrate] Found ${before} user(s) with role 'MP'. Updating...`);

  const result = await users.updateMany(
    { role: "MP" },
    { $set: { role: "Leader" } }
  );

  const remaining = await users.countDocuments({ role: "MP" });

  console.log(
    `[migrate] Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}, Remaining MP: ${remaining}`
  );
};

run()
  .catch((err) => {
    console.error("[migrate] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
    process.exit(process.exitCode || 0);
  });
