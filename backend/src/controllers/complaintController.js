import mongoose from "mongoose";
import { Complaint, PRIORITY_VALUES, STATUS_VALUES } from "../models/Complaint.js";
import { User } from "../models/User.js";
import { geocodeAddressToLatLng } from "../utils/geocode.js";

const createComplaintId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CMP-${datePart}-${randomPart}`;
};

const requireAdminUser = async (adminId) => {
  if (!adminId || !mongoose.Types.ObjectId.isValid(adminId)) {
    return null;
  }

  const user = await User.findById(adminId);

  if (!user || !["Admin", "Super Admin"].includes(user.role)) {
    return null;
  }

  return user;
};

export const createComplaint = async (req, res) => {
  try {
    const { title, description, citizenId, location, submissionPhoto } = req.body;

    if (!title || !description || !citizenId) {
      return res.status(400).json({ message: "Title, description, and citizenId are required." });
    }

    const citizen = await User.findById(citizenId);

    if (!citizen) {
      return res.status(400).json({ message: "A valid logged-in user is required to submit complaints." });
    }

    if (["Admin", "Super Admin"].includes(citizen.role)) {
      return res.status(403).json({ message: "Admins cannot submit complaints." });
    }

    let locationPayload = { lat: null, lng: null, address: "" };

    if (location && typeof location === "object") {
      const addressStr = typeof location.address === "string" ? location.address.trim() : "";
      const sentLat = location.lat;
      const sentLng = location.lng;
      const userSentAnyCoord = sentLat !== undefined && sentLat !== null && sentLng !== undefined && sentLng !== null;
      const userSentPartialCoord =
        (sentLat !== undefined && sentLat !== null && (sentLng === undefined || sentLng === null)) ||
        (sentLng !== undefined && sentLng !== null && (sentLat === undefined || sentLat === null));

      if (userSentPartialCoord) {
        return res.status(400).json({ message: "Location must include both latitude and longitude." });
      }

      let lat = userSentAnyCoord ? Number(sentLat) : null;
      let lng = userSentAnyCoord ? Number(sentLng) : null;

      let hasCoords =
        userSentAnyCoord && lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);

      if (userSentAnyCoord && !hasCoords) {
        return res.status(400).json({ message: "Invalid location coordinates." });
      }

      if (!hasCoords && addressStr.length >= 3) {
        const geocoded = await geocodeAddressToLatLng(addressStr);

        if (geocoded) {
          lat = geocoded.lat;
          lng = geocoded.lng;
          hasCoords = true;
        }
      }

      if (hasCoords) {
        locationPayload = {
          lat,
          lng,
          address: addressStr
        };
      } else if (addressStr.length > 0) {
        locationPayload = {
          lat: null,
          lng: null,
          address: addressStr
        };
      }
    }

    const photo =
      typeof submissionPhoto === "string" && submissionPhoto.trim().length > 0
        ? submissionPhoto.trim()
        : "";

    const complaint = await Complaint.create({
      complaintId: createComplaintId(),
      title,
      description,
      citizenId: citizen._id,
      submittedBy: citizen.email || citizen.phone || citizen.fullName,
      status: "Pending",
      priority: "Low",
      isArchived: false,
      location: locationPayload,
      submissionPhoto: photo
    });

    return res.status(201).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create complaint.", error: error.message });
  }
};

export const getComplaintStatusById = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findOne({ complaintId })
      .populate("assignedTo", "fullName email phone role")
      .populate("citizenId", "fullName email phone role")
      .lean();

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    return res.status(200).json({
      complaintId: complaint.complaintId,
      title: complaint.title,
      description: complaint.description,
      status: complaint.status,
      priority: complaint.priority,
      submittedBy: complaint.submittedBy,
      isArchived: complaint.isArchived,
      location: complaint.location,
      submissionPhoto: complaint.submissionPhoto,
      assignedTo: complaint.assignedTo,
      workerTaskCompleted: complaint.workerTaskCompleted,
      progressLogs: complaint.progressLogs,
      updatedAt: complaint.updatedAt,
      createdAt: complaint.createdAt
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch complaint status.", error: error.message });
  }
};

export const updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, adminId } = req.body;

    const admin = await requireAdminUser(adminId);

    if (!admin) {
      return res.status(403).json({ message: "Only admins can change complaint status." });
    }

    if (!STATUS_VALUES.includes(status)) {
      return res.status(400).json({
        message: "Invalid status.",
        allowedStatuses: STATUS_VALUES
      });
    }

    const complaint = await Complaint.findOneAndUpdate(
      { complaintId },
      {
        status,
        isArchived: ["Resolved", "Rejected"].includes(status)
      },
      { new: true }
    )
      .populate("assignedTo", "fullName email phone role")
      .populate("citizenId", "fullName email phone role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update complaint status.", error: error.message });
  }
};

export const getAllComplaints = async (_req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch complaints.", error: error.message });
  }
};

export const getComplaintMapLocations = async (_req, res) => {
  try {
    const complaints = await Complaint.find({
      "location.lat": { $ne: null },
      "location.lng": { $ne: null }
    })
      .select("complaintId title status priority location")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch map locations.", error: error.message });
  }
};

export const getComplaintHistory = async (req, res) => {
  try {
    const { userId, role, archived } = req.query;
    const filter = {};

    if (archived === "true") {
      filter.isArchived = true;
    }

    if (archived === "false") {
      filter.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
    }

    if (role === "Admin" || role === "Super Admin") {
      // Admins see all complaints; only archived filter applies.
    } else if (role === "Worker" || role === "MP") {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "userId is required for worker assignment lookup." });
      }

      filter.assignedTo = userId;
    } else {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for citizen history lookup." });
      }

      filter.citizenId = userId;
    }

    const complaints = await Complaint.find(filter)
      .populate("citizenId", "fullName email phone role")
      .populate("assignedTo", "fullName email phone role")
      .sort({ createdAt: -1 });

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch complaint history.", error: error.message });
  }
};

export const updateComplaintPriority = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { priority, adminId } = req.body;

    const admin = await requireAdminUser(adminId);

    if (!admin) {
      return res.status(403).json({ message: "Only admins can change complaint priority." });
    }

    if (!PRIORITY_VALUES.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority.",
        allowedPriorities: PRIORITY_VALUES
      });
    }

    const complaint = await Complaint.findOneAndUpdate(
      { complaintId },
      { priority },
      { new: true }
    )
      .populate("assignedTo", "fullName email phone role")
      .populate("citizenId", "fullName email phone role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update complaint priority.", error: error.message });
  }
};

export const assignComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { adminId, assigneeUserId } = req.body;

    const admin = await requireAdminUser(adminId);

    if (!admin) {
      return res.status(403).json({ message: "Only admins can assign complaints." });
    }

    if (!assigneeUserId || !mongoose.Types.ObjectId.isValid(assigneeUserId)) {
      return res.status(400).json({ message: "A valid assigneeUserId is required." });
    }

    const assignee = await User.findById(assigneeUserId);

    if (!assignee || !["Worker", "MP"].includes(assignee.role)) {
      return res.status(400).json({ message: "Complaints can only be assigned to users with Worker or MP role." });
    }

    const complaint = await Complaint.findOneAndUpdate(
      { complaintId },
      {
        assignedTo: assignee._id,
        status: "Assigned"
      },
      { new: true }
    )
      .populate("assignedTo", "fullName email phone role")
      .populate("citizenId", "fullName email phone role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to assign complaint.", error: error.message });
  }
};

export const addProgressUpdate = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { workerId, text, photoUrl, markCompleted } = req.body;

    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ message: "A valid workerId is required." });
    }

    const worker = await User.findById(workerId);

    if (!worker || !["Worker", "MP"].includes(worker.role)) {
      return res.status(403).json({ message: "Only workers or MPs can submit progress updates." });
    }

    const complaint = await Complaint.findOne({ complaintId });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    if (!complaint.assignedTo || complaint.assignedTo.toString() !== workerId) {
      return res.status(403).json({ message: "This complaint is not assigned to you." });
    }

    const wantsComplete = Boolean(markCompleted);
    const trimmedText = typeof text === "string" ? text.trim() : "";

    if (!trimmedText && !wantsComplete) {
      return res.status(400).json({ message: "Enter an update message or mark the task as completed." });
    }

    const logText = trimmedText || "Task marked as completed by assignee.";
    const photo =
      typeof photoUrl === "string" && photoUrl.trim().length > 0 ? photoUrl.trim() : "";

    complaint.progressLogs.push({
      text: logText,
      photoUrl: photo,
      authorId: worker._id,
      authorName: worker.fullName,
      entryType: wantsComplete ? "completed" : "update"
    });

    if (wantsComplete) {
      complaint.workerTaskCompleted = true;
    }

    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate("assignedTo", "fullName email phone role")
      .populate("citizenId", "fullName email phone role");

    return res.status(200).json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add progress update.", error: error.message });
  }
};

export const getSimilarComplaints = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 3) {
      return res.status(200).json([]);
    }

    const similarComplaints = await Complaint.find(
      { $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(5)
      .select("complaintId title description status priority createdAt");

    return res.status(200).json(similarComplaints);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search complaints.", error: error.message });
  }
};
