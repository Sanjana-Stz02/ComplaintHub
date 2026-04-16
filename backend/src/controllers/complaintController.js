import mongoose from "mongoose";
import { Complaint, PRIORITY_VALUES, STATUS_VALUES, CATEGORY_VALUES } from "../models/Complaint.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
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
    const { title, description, citizenId, location, submissionPhoto, category } = req.body;

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
      submissionPhoto: photo,
      category: category && CATEGORY_VALUES.includes(category) ? category : "Other"
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
      category: complaint.category,
      submittedBy: complaint.submittedBy,
      isArchived: complaint.isArchived,
      location: complaint.location,
      submissionPhoto: complaint.submissionPhoto,
      assignedTo: complaint.assignedTo,
      workerTaskCompleted: complaint.workerTaskCompleted,
      deadline: complaint.deadline,
      progressLogs: complaint.progressLogs,
      comments: complaint.comments,
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

    // Notify the complaint owner about status change
    await Notification.create({
      userId: complaint.citizenId._id || complaint.citizenId,
      complaintId: complaint.complaintId,
      message: `Your complaint "${complaint.title}" status changed to ${status}.`,
      type: "status_change"
    });

    // Notify assigned worker about status change
    if (complaint.assignedTo) {
      const assignedId = complaint.assignedTo._id || complaint.assignedTo;
      await Notification.create({
        userId: assignedId,
        complaintId: complaint.complaintId,
        message: `Complaint "${complaint.title}" status changed to ${status}.`,
        type: "status_change"
      });
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
    const { adminId, assigneeUserId, deadline } = req.body;

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

    const update = {
      assignedTo: assignee._id,
      status: "Assigned"
    };

    if (deadline !== undefined && deadline !== null && `${deadline}`.trim().length > 0) {
      const parsed = new Date(deadline);

      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "Invalid deadline date." });
      }

      update.deadline = parsed;
    }

    const complaint = await Complaint.findOneAndUpdate(
      { complaintId },
      update,
      { new: true }
    )
      .populate("assignedTo", "fullName email phone role")
      .populate("citizenId", "fullName email phone role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    const deadlineSuffix = complaint.deadline
      ? ` Deadline: ${new Date(complaint.deadline).toLocaleDateString()}.`
      : "";

    await Notification.create({
      userId: assignee._id,
      complaintId: complaint.complaintId,
      message: `You have been assigned to complaint "${complaint.title}".${deadlineSuffix}`,
      type: "assignment"
    });

    await Notification.create({
      userId: complaint.citizenId._id || complaint.citizenId,
      complaintId: complaint.complaintId,
      message: `Your complaint "${complaint.title}" has been assigned to ${assignee.fullName}.`,
      type: "assignment"
    });

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to assign complaint.", error: error.message });
  }
};

export const updateComplaintDeadline = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { adminId, deadline } = req.body;

    const admin = await requireAdminUser(adminId);

    if (!admin) {
      return res.status(403).json({ message: "Only admins can change complaint deadlines." });
    }

    let parsedDeadline = null;

    if (deadline !== undefined && deadline !== null && `${deadline}`.trim().length > 0) {
      const parsed = new Date(deadline);

      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "Invalid deadline date." });
      }

      parsedDeadline = parsed;
    }

    const complaint = await Complaint.findOneAndUpdate(
      { complaintId },
      { deadline: parsedDeadline },
      { new: true }
    )
      .populate("assignedTo", "fullName email phone role")
      .populate("citizenId", "fullName email phone role");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    if (complaint.assignedTo) {
      const assignedId = complaint.assignedTo._id || complaint.assignedTo;
      await Notification.create({
        userId: assignedId,
        complaintId: complaint.complaintId,
        message: parsedDeadline
          ? `Deadline for "${complaint.title}" set to ${parsedDeadline.toLocaleDateString()}.`
          : `Deadline removed for "${complaint.title}".`,
        type: "assignment"
      });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update deadline.", error: error.message });
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

    const ownerId = complaint.citizenId?._id || complaint.citizenId;

    if (ownerId && ownerId.toString() !== workerId) {
      await Notification.create({
        userId: ownerId,
        complaintId: complaint.complaintId,
        message: wantsComplete
          ? `${worker.fullName} marked your complaint "${complaint.title}" as completed.`
          : `${worker.fullName} posted an update on your complaint "${complaint.title}".`,
        type: "progress_update"
      });
    }

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

export const filterComplaints = async (req, res) => {
  try {
    const { status, category, priority, area, dateFrom, dateTo, keyword, assignee } = req.query;
    const filter = {};

    if (status && STATUS_VALUES.includes(status)) {
      filter.status = status;
    }

    if (category && CATEGORY_VALUES.includes(category)) {
      filter.category = category;
    }

    if (priority && PRIORITY_VALUES.includes(priority)) {
      filter.priority = priority;
    }

    if (assignee === "unassigned") {
      filter.assignedTo = null;
    } else if (assignee && mongoose.Types.ObjectId.isValid(assignee)) {
      filter.assignedTo = assignee;
    }

    if (area && area.trim().length >= 2) {
      filter["location.address"] = { $regex: area.trim(), $options: "i" };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};

      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }

      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    if (keyword && keyword.trim().length >= 2) {
      filter.$or = [
        { title: { $regex: keyword.trim(), $options: "i" } },
        { description: { $regex: keyword.trim(), $options: "i" } }
      ];
    }

    const complaints = await Complaint.find(filter)
      .populate("citizenId", "fullName email phone role")
      .populate("assignedTo", "fullName email phone role")
      .sort({ createdAt: -1 });

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({ message: "Failed to filter complaints.", error: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { userId, text } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "A valid userId is required." });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ message: "Comment text is required." });
    }

    if (text.trim().length > 1000) {
      return res.status(400).json({ message: "Comment must not exceed 1000 characters." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const complaint = await Complaint.findOne({ complaintId });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    complaint.comments.push({
      text: text.trim(),
      authorId: user._id,
      authorName: user.fullName,
      authorRole: user.role
    });

    await complaint.save();

    // Notify the complaint owner if the commenter is not the owner
    if (complaint.citizenId.toString() !== userId) {
      await Notification.create({
        userId: complaint.citizenId,
        complaintId: complaint.complaintId,
        message: `${user.fullName} commented on your complaint "${complaint.title}".`,
        type: "comment"
      });
    }

    // Notify assigned worker if exists and is not the commenter
    if (complaint.assignedTo && complaint.assignedTo.toString() !== userId) {
      await Notification.create({
        userId: complaint.assignedTo,
        complaintId: complaint.complaintId,
        message: `${user.fullName} commented on complaint "${complaint.title}".`,
        type: "comment"
      });
    }

    const populated = await Complaint.findById(complaint._id)
      .populate("citizenId", "fullName email phone role")
      .populate("assignedTo", "fullName email phone role");

    return res.status(200).json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to add comment.", error: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const complaint = await Complaint.findOne({ complaintId }).lean();

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    const sortedComments = (complaint.comments || []).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json(sortedComments);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch comments.", error: error.message });
  }
};

export const getCategoryReports = async (_req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: "$category",
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ["$status", "Assigned"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ];

    const results = await Complaint.aggregate(pipeline);

    const reports = results.map((entry) => ({
      category: entry._id || "Other",
      total: entry.total,
      pending: entry.pending,
      assigned: entry.assigned,
      inProgress: entry.inProgress,
      resolved: entry.resolved,
      rejected: entry.rejected,
      resolutionRate: entry.total > 0 ? Math.round((entry.resolved / entry.total) * 100) : 0
    }));

    return res.status(200).json(reports);
  } catch (error) {
    return res.status(500).json({ message: "Failed to generate category reports.", error: error.message });
  }
};

export const getWorkerDashboard = async (req, res) => {
  try {
    const { workerId } = req.query;

    if (!workerId || !mongoose.Types.ObjectId.isValid(workerId)) {
      return res.status(400).json({ message: "A valid workerId is required." });
    }

    const worker = await User.findById(workerId);

    if (!worker || !["Worker", "MP"].includes(worker.role)) {
      return res.status(403).json({ message: "Only workers or MPs can access the worker dashboard." });
    }

    const assigned = await Complaint.find({
      assignedTo: workerId,
      status: { $in: ["Assigned", "In Progress"] }
    })
      .populate("citizenId", "fullName email phone role")
      .sort({ createdAt: -1 });

    const completed = await Complaint.find({
      assignedTo: workerId,
      workerTaskCompleted: true
    })
      .populate("citizenId", "fullName email phone role")
      .sort({ updatedAt: -1 })
      .limit(20);

    const now = new Date();
    const dueSoonThreshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const stats = await Complaint.aggregate([
      { $match: { assignedTo: new mongoose.Types.ObjectId(workerId) } },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: 1 },
          totalCompleted: { $sum: { $cond: ["$workerTaskCompleted", 1, 0] } },
          totalPending: {
            $sum: { $cond: [{ $in: ["$status", ["Assigned", "In Progress"]] }, 1, 0] }
          },
          totalResolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
          overdueCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["Assigned", "In Progress"]] },
                    { $ne: ["$deadline", null] },
                    { $lt: ["$deadline", now] }
                  ]
                },
                1,
                0
              ]
            }
          },
          dueSoonCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", ["Assigned", "In Progress"]] },
                    { $ne: ["$deadline", null] },
                    { $gte: ["$deadline", now] },
                    { $lte: ["$deadline", dueSoonThreshold] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const baseStats = {
      totalAssigned: 0,
      totalCompleted: 0,
      totalPending: 0,
      totalResolved: 0,
      overdueCount: 0,
      dueSoonCount: 0
    };

    return res.status(200).json({
      worker: { id: worker._id, fullName: worker.fullName, role: worker.role },
      activeComplaints: assigned,
      completedComplaints: completed,
      stats: { ...baseStats, ...(stats[0] || {}) }
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load worker dashboard.", error: error.message });
  }
};
