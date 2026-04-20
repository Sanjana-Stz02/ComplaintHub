import { Router } from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from "../controllers/notificationController.js";

const router = Router();

router.get("/", getNotifications);
router.patch("/:notificationId/read", markNotificationRead);
router.patch("/read-all", markAllNotificationsRead);

export default router;
