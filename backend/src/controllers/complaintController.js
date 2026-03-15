import { Complaint, PRIORITY_VALUES, STATUS_VALUES } from "../models/Complaint.js";
import { User } from "../models/User.js";

const createComplaintId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CMP-${datePart}-${randomPart}`;
};

export const createComplaint = async (req, res) => {
  try {
    const { title, description, citizenId } = req.body;

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

    const complaint = await Complaint.create({
      complaintId: createComplaintId(),
      title,
      description,
      citizenId: citizen._id,
      submittedBy: citizen.email || citizen.phone || citizen.fullName,
      status: "Pending",
      priority: "Low",
      isArchived: false
    });

    return res.status(201).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create complaint.", error: error.message });
  }
};

export const getComplaintStatusById = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findOne({ complaintId });

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
    const { status } = req.body;

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
    );

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

export const getComplaintHistory = async (req, res) => {
  try {
    const { userId, role, archived } = req.query;
    const filter = {};

    if (archived === "true") {
      filter.isArchived = true;
    }

    if (archived === "false") {
      // Older records may not have isArchived set; treat them as active.
      filter.$or = [{ isArchived: false }, { isArchived: { $exists: false } }];
    }

    if (role !== "Admin" && role !== "Super Admin") {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for citizen history lookup." });
      }

      filter.citizenId = userId;
    }

    const complaints = await Complaint.find(filter)
      .populate("citizenId", "fullName email phone role")
      .sort({ createdAt: -1 });

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch complaint history.", error: error.message });
  }
};

export const updateComplaintPriority = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { priority } = req.body;

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
    );

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update complaint priority.", error: error.message });
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
      .select('complaintId title description status priority createdAt');

    return res.status(200).json(similarComplaints);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search complaints.", error: error.message });
  }
};
