import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import complaintRoutes from "./routes/complaintRoutes.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173"
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ message: "Server is running" });
});

app.use("/api/complaints", complaintRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect DB:", error.message);
    process.exit(1);
  });
