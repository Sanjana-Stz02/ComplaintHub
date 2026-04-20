import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { ensureDefaultAdmin } from "./controllers/authController.js";
import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({ message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/notifications", notificationRoutes);

connectDB()
  .then(async () => {
    await ensureDefaultAdmin();
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect DB:", error.message);
    process.exit(1);
  });