import notificationService from "../services/notificationService.js";
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

const notificationController = {
  getNotifications: async (req, res, next) => {
    try {
      const userId = req.user.id; // Từ authMiddleware
      let { page = 1, limit = 10, isRead } = req.query;

      page = parseInt(page, 10);
      limit = parseInt(limit, 10);

      // Chuyển đổi isRead từ string sang boolean nếu tồn tại
      if (isRead !== undefined) {
        if (isRead === "true") {
          isRead = true;
        } else if (isRead === "false") {
          isRead = false;
        } else {
          // Nếu isRead không phải là 'true' hoặc 'false' thì không lọc theo isRead
          isRead = undefined;
        }
      }

      const result = await notificationService.getNotifications(
        userId,
        page,
        limit,
        isRead
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  markNotificationAsRead: async (req, res, next) => {
    try {
      const userId = req.user.id; // Từ authMiddleware
      const notificationIdString = req.params.notificationId;

      if (!notificationIdString || isNaN(parseInt(notificationIdString, 10))) {
        return next(new AppError("Invalid Notification ID provided", 400));
      }
      const notificationId = parseInt(notificationIdString, 10);

      const result = await notificationService.markNotificationAsRead(
        notificationId,
        userId
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  markAllNotificationsAsRead: async (req, res, next) => {
    try {
      const userId = req.user.id; // Từ authMiddleware
      const result = await notificationService.markAllNotificationsAsRead(
        userId
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};

export default notificationController;
