import mongoose from "mongoose";
import { Notification } from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "A valid userId is required." });
    }

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    return res.status(200).json({ notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notifications.", error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId || !mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: "A valid notificationId is required." });
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.status(200).json(notification);
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark notification as read.", error: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "A valid userId is required." });
    }

    await Notification.updateMany({ userId, isRead: false }, { isRead: true });

    return res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to mark notifications as read.", error: error.message });
  }
};
