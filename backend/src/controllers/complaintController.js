import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { Complaint, PRIORITY_VALUES, STATUS_VALUES, CATEGORY_VALUES } from "../models/Complaint.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { geocodeAddressToLatLng } from "../utils/geocode.js";

const createComplaintId = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CMP-${datePart}-${randomPart}`;
};

const requireRoleUser = async (userId, allowedRoles) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  const user = await User.findById(userId);

  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return user;
};

const requireAdminUser = (adminId) => requireRoleUser(adminId, ["Admin", "Super Admin"]);
const requireAdminOrLeader = (userId) => requireRoleUser(userId, ["Admin", "Super Admin", "Leader"]);
const requireStaffUser = (userId) => requireRoleUser(userId, ["Admin", "Super Admin", "Leader", "Worker"]);

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
      resolvedAt: complaint.resolvedAt,
      feedback: complaint.feedback,
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

    const existing = await Complaint.findOne({ complaintId });

    if (!existing) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    const update = {
      status,
      isArchived: ["Resolved", "Rejected"].includes(status)
    };

    if (status === "Resolved" && !existing.resolvedAt) {
      update.resolvedAt = new Date();
    }

    if (status !== "Resolved" && existing.resolvedAt) {
      update.resolvedAt = null;
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

    await Notification.create({
      userId: complaint.citizenId._id || complaint.citizenId,
      complaintId: complaint.complaintId,
      message: status === "Resolved"
        ? `Your complaint "${complaint.title}" has been resolved. Please share your feedback.`
        : `Your complaint "${complaint.title}" status changed to ${status}.`,
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
    } else if (role === "Worker" || role === "Leader") {
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

    const requester = await requireAdminOrLeader(adminId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins or leaders can assign complaints." });
    }

    if (!assigneeUserId || !mongoose.Types.ObjectId.isValid(assigneeUserId)) {
      return res.status(400).json({ message: "A valid assigneeUserId is required." });
    }

    const assignee = await User.findById(assigneeUserId);
    const isRequesterLeader = requester.role === "Leader";
    const allowedAssigneeRoles = isRequesterLeader ? ["Worker"] : ["Leader"];

    if (!assignee || !allowedAssigneeRoles.includes(assignee.role)) {
      return res.status(400).json({
        message: isRequesterLeader
          ? "Leaders can only assign complaints to users with the Worker role."
          : "Admins can only assign complaints to users with the Leader role."
      });
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

    const requester = await requireAdminOrLeader(adminId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins or leaders can change complaint deadlines." });
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

    if (!worker || !["Worker", "Leader"].includes(worker.role)) {
      return res.status(403).json({ message: "Only workers or leaders can submit progress updates." });
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
    const requester = await requireStaffUser(req.query.requesterId);

    if (!requester) {
      return res.status(403).json({ message: "Only staff (Admin, Leader, or Worker) can filter complaints." });
    }

    const { status, category, priority, area, dateFrom, dateTo, keyword, assignee } = req.query;
    const filter = {};

    if (requester.role === "Worker") {
      filter.assignedTo = requester._id;
    }

    if (status && STATUS_VALUES.includes(status)) {
      filter.status = status;
    }

    if (category && CATEGORY_VALUES.includes(category)) {
      filter.category = category;
    }

    if (priority && PRIORITY_VALUES.includes(priority)) {
      filter.priority = priority;
    }

    if (requester.role !== "Worker") {
      if (assignee === "unassigned") {
        filter.assignedTo = null;
      } else if (assignee && mongoose.Types.ObjectId.isValid(assignee)) {
        filter.assignedTo = assignee;
      }
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

export const getCategoryReports = async (req, res) => {
  try {
    const requester = await requireAdminOrLeader(req.query.requesterId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins or leaders can view category reports." });
    }

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

    if (!worker || !["Worker", "Leader"].includes(worker.role)) {
      return res.status(403).json({ message: "Only workers or leaders can access the worker dashboard." });
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

export const submitFeedback = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { userId, rating, comment } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "A valid userId is required." });
    }

    const numericRating = Number(rating);

    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const complaint = await Complaint.findOne({ complaintId });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found." });
    }

    if (complaint.citizenId.toString() !== userId) {
      return res.status(403).json({ message: "Only the complaint owner can submit feedback." });
    }

    if (complaint.status !== "Resolved") {
      return res.status(400).json({ message: "Feedback can be submitted only after the complaint is resolved." });
    }

    if (complaint.feedback && complaint.feedback.rating) {
      return res.status(400).json({ message: "Feedback has already been submitted for this complaint." });
    }

    complaint.feedback = {
      rating: Math.round(numericRating),
      comment: typeof comment === "string" ? comment.trim().slice(0, 1000) : "",
      submittedBy: user._id,
      submittedAt: new Date()
    };

    await complaint.save();

    if (complaint.assignedTo) {
      await Notification.create({
        userId: complaint.assignedTo,
        complaintId: complaint.complaintId,
        message: `${user.fullName} rated the resolution of "${complaint.title}" ${Math.round(numericRating)}/5.`,
        type: "progress_update"
      });
    }

    const populated = await Complaint.findById(complaint._id)
      .populate("citizenId", "fullName email phone role")
      .populate("assignedTo", "fullName email phone role");

    return res.status(200).json(populated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit feedback.", error: error.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const { requesterId } = req.query;
    const requester = await requireAdminOrLeader(requesterId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins or leaders can view analytics." });
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [totals, statusBreakdown, priorityBreakdown, categoryBreakdown, volumePipeline, resolutionPipeline, feedbackPipeline, workerPipeline] = await Promise.all([
      Complaint.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
            rejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
            active: {
              $sum: {
                $cond: [{ $in: ["$status", ["Pending", "Assigned", "In Progress"]] }, 1, 0]
              }
            },
            overdue: {
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
            }
          }
        }
      ]),
      Complaint.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $group: { _id: "$priority", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Complaint.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      Complaint.aggregate([
        {
          $match: {
            status: "Resolved",
            resolvedAt: { $ne: null },
            createdAt: { $ne: null }
          }
        },
        {
          $group: {
            _id: null,
            avgMs: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } },
            count: { $sum: 1 }
          }
        }
      ]),
      Complaint.aggregate([
        { $match: { "feedback.rating": { $gte: 1 } } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: "$feedback.rating" },
            count: { $sum: 1 }
          }
        }
      ]),
      Complaint.aggregate([
        { $match: { assignedTo: { $ne: null } } },
        {
          $group: {
            _id: "$assignedTo",
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$workerTaskCompleted", true] }, 1, 0] } },
            resolved: { $sum: { $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0] } },
            avgResolutionMs: {
              $avg: {
                $cond: [
                  { $and: [{ $ne: ["$resolvedAt", null] }, { $ne: ["$createdAt", null] }] },
                  { $subtract: ["$resolvedAt", "$createdAt"] },
                  null
                ]
              }
            }
          }
        },
        { $sort: { completed: -1, total: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "worker"
          }
        },
        { $unwind: { path: "$worker", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            total: 1,
            completed: 1,
            resolved: 1,
            avgResolutionMs: 1,
            fullName: "$worker.fullName",
            role: "$worker.role"
          }
        }
      ])
    ]);

    const volumeMap = new Map(volumePipeline.map((d) => [d._id, d.count]));
    const volumeByDay = [];

    for (let i = 13; i >= 0; i -= 1) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      volumeByDay.push({ date: key, count: volumeMap.get(key) || 0 });
    }

    const avgResolutionMs = resolutionPipeline[0]?.avgMs || 0;
    const avgRating = feedbackPipeline[0]?.avgRating || 0;
    const totalsRow = totals[0] || { total: 0, resolved: 0, rejected: 0, active: 0, overdue: 0 };

    return res.status(200).json({
      totals: {
        total: totalsRow.total,
        resolved: totalsRow.resolved,
        rejected: totalsRow.rejected,
        active: totalsRow.active,
        overdue: totalsRow.overdue,
        resolutionRate: totalsRow.total > 0 ? Math.round((totalsRow.resolved / totalsRow.total) * 100) : 0,
        avgResolutionHours: avgResolutionMs > 0 ? Math.round(avgResolutionMs / 3600000) : 0,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : 0,
        feedbackCount: feedbackPipeline[0]?.count || 0
      },
      statusBreakdown: statusBreakdown.map((row) => ({ label: row._id || "Unknown", count: row.count })),
      priorityBreakdown: priorityBreakdown.map((row) => ({ label: row._id || "Unknown", count: row.count })),
      categoryBreakdown: categoryBreakdown.map((row) => ({ label: row._id || "Other", count: row.count })),
      volumeByDay,
      workerPerformance: workerPipeline.map((row) => ({
        workerId: row._id,
        fullName: row.fullName || "Unknown",
        role: row.role || "Worker",
        total: row.total,
        completed: row.completed,
        resolved: row.resolved,
        avgResolutionHours:
          row.avgResolutionMs && row.avgResolutionMs > 0
            ? Math.round(row.avgResolutionMs / 3600000)
            : null
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load analytics.", error: error.message });
  }
};

const buildExportFilter = (query) => {
  const { status, category, priority, area, dateFrom, dateTo, keyword, assignee } = query;
  const filter = {};

  if (status && STATUS_VALUES.includes(status)) filter.status = status;
  if (category && CATEGORY_VALUES.includes(category)) filter.category = category;
  if (priority && PRIORITY_VALUES.includes(priority)) filter.priority = priority;

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
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
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

  return filter;
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const exportComplaintsCsv = async (req, res) => {
  try {
    const requester = await requireAdminOrLeader(req.query.requesterId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins or leaders can export reports." });
    }

    const filter = buildExportFilter(req.query);
    const complaints = await Complaint.find(filter)
      .populate("citizenId", "fullName email")
      .populate("assignedTo", "fullName role")
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      "Complaint ID", "Title", "Category", "Status", "Priority",
      "Submitted By", "Citizen Email", "Assigned To", "Assignee Role",
      "Deadline", "Created At", "Resolved At", "Feedback Rating", "Feedback Comment",
      "Location", "Description"
    ];

    const formatDate = (date) => (date ? new Date(date).toISOString() : "");

    const rows = complaints.map((c) =>
      [
        c.complaintId,
        c.title,
        c.category || "Other",
        c.status,
        c.priority,
        c.citizenId?.fullName || c.submittedBy || "",
        c.citizenId?.email || "",
        c.assignedTo?.fullName || "",
        c.assignedTo?.role || "",
        formatDate(c.deadline),
        formatDate(c.createdAt),
        formatDate(c.resolvedAt),
        c.feedback?.rating || "",
        c.feedback?.comment || "",
        c.location?.address || "",
        c.description || ""
      ].map(csvEscape).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\r\n");
    const filename = `complainthub-report-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ message: "Failed to export CSV.", error: error.message });
  }
};

const STATUS_PDF_COLORS = {
  Pending: "#f59e0b",
  Assigned: "#8b5cf6",
  "In Progress": "#0ea5e9",
  Resolved: "#10b981",
  Rejected: "#ef4444"
};

const PRIORITY_PDF_COLORS = {
  Low: "#94a3b8",
  Medium: "#2563eb",
  High: "#f97316",
  Emergency: "#ef4444"
};

const drawPdfBadge = (doc, text, color, x, y) => {
  const paddingX = 5;
  const paddingY = 2.5;
  doc.font("Helvetica-Bold").fontSize(8);
  const textWidth = doc.widthOfString(text);
  const textHeight = doc.currentLineHeight();
  const width = textWidth + paddingX * 2;
  const height = textHeight + paddingY * 2;

  doc.save();
  doc.roundedRect(x, y, width, height, 4).fill(color);
  doc.fillColor("#ffffff").text(text, x + paddingX, y + paddingY, {
    lineBreak: false,
    width: textWidth
  });
  doc.restore();
  doc.font("Helvetica").fillColor("#0b1220");
  return width;
};

const drawSummaryTile = (doc, label, value, hint, x, y, width) => {
  const height = 58;
  doc.save();
  doc.roundedRect(x, y, width, height, 6)
    .fillAndStroke("#f8fafc", "#e2e8f0");
  doc.fillColor("#64748b").font("Helvetica").fontSize(8.5)
    .text(label.toUpperCase(), x + 10, y + 8, { width: width - 20 });
  doc.fillColor("#0b1220").font("Helvetica-Bold").fontSize(18)
    .text(String(value), x + 10, y + 20, { width: width - 20 });
  if (hint) {
    doc.fillColor("#64748b").font("Helvetica").fontSize(8)
      .text(hint, x + 10, y + 42, { width: width - 20 });
  }
  doc.restore();
  doc.font("Helvetica").fillColor("#0b1220");
};

const drawPdfFooter = (doc, pageNumber, totalText) => {
  const { height, width } = doc.page;
  doc.save();
  doc.font("Helvetica").fontSize(8).fillColor("#94a3b8")
    .text("ComplaintHub · Confidential", 40, height - 30, { width: width - 80, align: "left", lineBreak: false })
    .text(`Page ${pageNumber}${totalText ? ` · ${totalText}` : ""}`, 40, height - 30, { width: width - 80, align: "right", lineBreak: false });
  doc.restore();
};

export const exportComplaintsPdf = async (req, res) => {
  try {
    const requester = await requireAdminOrLeader(req.query.requesterId);

    if (!requester) {
      return res.status(403).json({ message: "Only admins or leaders can export reports." });
    }

    const filter = buildExportFilter(req.query);
    const complaints = await Complaint.find(filter)
      .populate("citizenId", "fullName email")
      .populate("assignedTo", "fullName role")
      .sort({ createdAt: -1 })
      .lean();

    const filename = `complainthub-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true });
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 80).fill("#0b1220");
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(22)
      .text("ComplaintHub", 40, 22, { lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor("#94a3b8")
      .text("Civic Complaint Report", 40, 50, { lineBreak: false });

    const stamp = new Date().toLocaleString();
    doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1")
      .text(stamp, 40, 22, { width: doc.page.width - 80, align: "right", lineBreak: false })
      .text(`${requester.fullName} · ${requester.role}`, 40, 38, { width: doc.page.width - 80, align: "right", lineBreak: false });

    doc.fillColor("#0b1220").font("Helvetica").y = 100;

    const statusCounts = {};
    const priorityCounts = {};
    let resolvedTotal = 0;
    let feedbackTotal = 0;
    let feedbackSum = 0;

    complaints.forEach((c) => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
      priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1;
      if (c.status === "Resolved") resolvedTotal += 1;
      if (c.feedback?.rating) {
        feedbackTotal += 1;
        feedbackSum += c.feedback.rating;
      }
    });

    const resolutionRate = complaints.length > 0
      ? Math.round((resolvedTotal / complaints.length) * 100)
      : 0;
    const avgRating = feedbackTotal > 0
      ? (feedbackSum / feedbackTotal).toFixed(1)
      : "—";

    const tileWidth = (doc.page.width - 80 - 30) / 4;
    const tileY = 100;
    drawSummaryTile(doc, "Total", complaints.length, "in this export", 40, tileY, tileWidth);
    drawSummaryTile(doc, "Resolved", resolvedTotal, `${resolutionRate}% rate`, 40 + tileWidth + 10, tileY, tileWidth);
    drawSummaryTile(doc, "Overdue", complaints.filter((c) => c.deadline && new Date(c.deadline) < new Date() && ["Assigned", "In Progress"].includes(c.status)).length, "past deadline", 40 + (tileWidth + 10) * 2, tileY, tileWidth);
    drawSummaryTile(doc, "Avg Rating", avgRating, `${feedbackTotal} feedback`, 40 + (tileWidth + 10) * 3, tileY, tileWidth);

    doc.y = tileY + 80;

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0b1220").text("Breakdown");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(9).fillColor("#334155");
    const statusSummary = Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join("   ") || "n/a";
    const prioritySummary = Object.entries(priorityCounts).map(([k, v]) => `${k}: ${v}`).join("   ") || "n/a";
    doc.text(`Status — ${statusSummary}`);
    doc.text(`Priority — ${prioritySummary}`);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#0b1220").text("Complaints");
    doc.moveDown(0.3);

    if (complaints.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#64748b").text("No complaints match the selected filters.");
    }

    complaints.forEach((complaint, index) => {
      if (doc.y > 720) doc.addPage();

      const titleY = doc.y;
      doc.font("Helvetica-Bold").fontSize(10.5).fillColor("#0b1220")
        .text(`${index + 1}. ${complaint.complaintId} — ${complaint.title}`, 40, titleY, { width: doc.page.width - 80 });

      const badgeY = doc.y + 2;
      const statusColor = STATUS_PDF_COLORS[complaint.status] || "#64748b";
      const priorityColor = PRIORITY_PDF_COLORS[complaint.priority] || "#64748b";
      const statusWidth = drawPdfBadge(doc, complaint.status, statusColor, 40, badgeY);
      const priorityWidth = drawPdfBadge(doc, complaint.priority, priorityColor, 40 + statusWidth + 4, badgeY);
      let badgeCursor = 40 + statusWidth + priorityWidth + 8;
      if (complaint.category) {
        const catWidth = drawPdfBadge(doc, complaint.category, "#475569", badgeCursor, badgeY);
        badgeCursor += catWidth + 4;
      }
      if (complaint.feedback?.rating) {
        drawPdfBadge(doc, `★ ${complaint.feedback.rating}/5`, "#f59e0b", badgeCursor, badgeY);
      }

      doc.y = badgeY + 18;
      doc.font("Helvetica").fontSize(8.5).fillColor("#475569")
        .text(`Citizen: ${complaint.citizenId?.fullName || complaint.submittedBy || "—"}   Assignee: ${complaint.assignedTo?.fullName || "Unassigned"}`, { width: doc.page.width - 80 })
        .text(`Created: ${complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : "—"}${complaint.resolvedAt ? `   Resolved: ${new Date(complaint.resolvedAt).toLocaleString()}` : ""}${complaint.deadline ? `   Deadline: ${new Date(complaint.deadline).toLocaleDateString()}` : ""}`, { width: doc.page.width - 80 });

      if (complaint.location?.address) {
        doc.text(`Location: ${complaint.location.address}`, { width: doc.page.width - 80 });
      }

      if (complaint.feedback?.comment) {
        doc.fillColor("#7c5200").text(`Feedback: "${complaint.feedback.comment}"`, { width: doc.page.width - 80 });
      }

      if (complaint.description) {
        doc.fillColor("#334155").font("Helvetica").fontSize(8.5)
          .text(complaint.description, { width: doc.page.width - 80 });
      }

      doc.moveDown(0.5);
      const dividerY = doc.y;
      doc.moveTo(40, dividerY).lineTo(doc.page.width - 40, dividerY).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      doc.strokeColor("#000000");
      doc.moveDown(0.3);
    });

    const range = doc.bufferedPageRange();
    const totalPages = range.count;
    for (let i = 0; i < totalPages; i += 1) {
      doc.switchToPage(range.start + i);
      drawPdfFooter(doc, i + 1, `of ${totalPages} · ${complaints.length} complaint${complaints.length === 1 ? "" : "s"}`);
    }

    doc.end();
    return undefined;
  } catch (error) {
    return res.status(500).json({ message: "Failed to export PDF.", error: error.message });
  }
};
