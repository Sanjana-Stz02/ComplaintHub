import { Router } from "express";
import {
  createComplaint,
  getAllComplaints,
  getComplaintHistory,
  getComplaintStatusById,
  updateComplaintPriority,
  updateComplaintStatus,
  getSimilarComplaints
} from "../controllers/complaintController.js";

const router = Router();

router.post("/", createComplaint);
router.get("/", getAllComplaints);
router.get("/history", getComplaintHistory);
router.get("/search", getSimilarComplaints);
router.get("/:complaintId/status", getComplaintStatusById);
router.patch("/:complaintId/status", updateComplaintStatus);
router.patch("/:complaintId/priority", updateComplaintPriority);

export default router;
