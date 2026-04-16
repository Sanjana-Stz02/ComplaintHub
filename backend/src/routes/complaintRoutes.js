import { Router } from "express";
import {
  addComment,
  addProgressUpdate,
  assignComplaint,
  createComplaint,
  filterComplaints,
  getAllComplaints,
  getCategoryReports,
  getComments,
  getComplaintHistory,
  getComplaintMapLocations,
  getComplaintStatusById,
  getWorkerDashboard,
  updateComplaintDeadline,
  updateComplaintPriority,
  updateComplaintStatus,
  getSimilarComplaints
} from "../controllers/complaintController.js";

const router = Router();

router.get("/map/locations", getComplaintMapLocations);
router.get("/filter", filterComplaints);
router.get("/category-reports", getCategoryReports);
router.get("/worker-dashboard", getWorkerDashboard);
router.post("/", createComplaint);
router.get("/", getAllComplaints);
router.get("/history", getComplaintHistory);
router.get("/search", getSimilarComplaints);
router.patch("/:complaintId/assign", assignComplaint);
router.post("/:complaintId/progress", addProgressUpdate);
router.post("/:complaintId/comments", addComment);
router.get("/:complaintId/comments", getComments);
router.get("/:complaintId/status", getComplaintStatusById);
router.patch("/:complaintId/status", updateComplaintStatus);
router.patch("/:complaintId/priority", updateComplaintPriority);
router.patch("/:complaintId/deadline", updateComplaintDeadline);

export default router;
