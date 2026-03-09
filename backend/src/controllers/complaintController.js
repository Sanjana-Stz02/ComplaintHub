import { Complaint, PRIORITY_VALUES, STATUS_VALUES } from "../models/Complaint.js";

const createComplaintId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CMP-${datePart}-${randomPart}`;
};

export const createComplaint = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    const complaint = await Complaint.create({
      complaintId: createComplaintId(),
      title,
      description,
      status: "Pending",
      priority: "Low"
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
      status: complaint.status,
      priority: complaint.priority,
      updatedAt: complaint.updatedAt
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
      { status },
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
