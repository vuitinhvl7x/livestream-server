import express from "express";
import notificationController from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// GET /api/notifications - Lấy danh sách thông báo của người dùng hiện tại
router.get("/", authMiddleware, notificationController.getNotifications);

// POST /api/notifications/:notificationId/read - Đánh dấu một thông báo là đã đọc
router.post(
  "/:notificationId/read",
  authMiddleware,
  notificationController.markNotificationAsRead
);

// (Tùy chọn) POST /api/notifications/read-all - Đánh dấu tất cả thông báo là đã đọc
router.post(
  "/read-all",
  authMiddleware,
  notificationController.markAllNotificationsAsRead
);

export default router;
