import { User, Notification, sequelize } from "../models/index.js";
// import { redisClient } from '../lib/redis.js'; // TODO: Sẽ uncomment khi triển khai Redis
// import { io } from '../index.js'; // Cần io instance từ src/index.js, hoặc truyền vào, hoặc dùng event emitter
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js"; // Thêm logger

// Placeholder cho io instance, sẽ cần giải pháp tốt hơn để tránh circular dependency
// hoặc truyền io vào các hàm cần thiết.
let ioInstance = null;
export const setIoInstance = (io) => {
  ioInstance = io;
  logger.info("Socket.IO instance set in notificationService");
};

const notificationService = {
  createNotification: async (
    userId,
    type,
    message,
    relatedEntityId = null,
    relatedEntityType = null,
    creatorUsername = null // Thêm username của người tạo sự kiện (ví dụ: người follow)
  ) => {
    try {
      const userExists = await User.findByPk(userId);
      if (!userExists) {
        // Không throw lỗi ở đây vì có thể là thông báo cho user không tồn tại (ít gặp)
        // hoặc là service khác sẽ handle. Tuy nhiên, ghi log là quan trọng.
        logger.warn(
          `Attempted to create notification for non-existent user ID: ${userId}`
        );
        // return null; // Hoặc throw AppError tùy theo yêu cầu nghiệp vụ
      }

      const notificationData = {
        userId,
        type,
        message,
        relatedEntityId,
        relatedEntityType,
      };

      const notification = await Notification.create(notificationData);
      logger.info(
        `Notification created for user ${userId}, type ${type}, ID: ${notification.id}`
      );

      if (ioInstance) {
        const notificationRoom = `notification:${userId}`;
        // Gửi thêm thông tin chi tiết hơn cho client nếu cần
        const payload = {
          ...notification.toJSON(),
          // Ví dụ: thêm thông tin người tạo nếu là 'new_follower'
          ...(type === "new_follower" &&
            creatorUsername &&
            relatedEntityId && {
              actor: { id: relatedEntityId, username: creatorUsername },
            }),
        };
        ioInstance.to(notificationRoom).emit("new_notification", payload);
        logger.info(`Emitted 'new_notification' to room ${notificationRoom}`);
      } else {
        logger.warn(
          "ioInstance not set in notificationService, cannot emit real-time notification."
        );
      }

      // TODO: Cập nhật Redis (user:notifications:unread:${userId})
      // await redisClient.incr(`user:notifications:unread:${userId}`);

      return notification;
    } catch (error) {
      logger.error(`Error in createNotification for user ${userId}:`, error);
      // Không ném lỗi ở đây để không làm gián đoạn luồng gọi (ví dụ khi follow thành công nhưng notification lỗi)
      // Service gọi hàm này nên tự xử lý.
      return null; // Hoặc throw new AppError('Could not create notification', 500, error); tùy theo yêu cầu
    }
  },

  getNotifications: async (userId, page = 1, limit = 10, isRead) => {
    try {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const whereClause = { userId };
      if (isRead !== undefined && (isRead === true || isRead === "true")) {
        whereClause.isRead = true;
      } else if (
        isRead !== undefined &&
        (isRead === false || isRead === "false")
      ) {
        whereClause.isRead = false;
      }

      const { count, rows } = await Notification.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit, 10),
        offset,
        order: [["createdAt", "DESC"]],
        // TODO: Cân nhắc include User (relatedEntity) nếu type là 'new_follower' để hiển thị username người follow
        // include: [
        //   {
        //     model: User,
        //     as: 'relatedUser', // Cần định nghĩa association này nếu muốn dùng
        //     required: false,
        //     where: { '$Notification.relatedEntityType$': 'user' }
        //   }
        // ]
      });

      return {
        notifications: rows,
        totalItems: count,
        totalPages: Math.ceil(count / parseInt(limit, 10)),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      logger.error(`Error in getNotifications for user ${userId}:`, error);
      throw new AppError("Could not retrieve notifications", 500, error);
    }
  },

  markNotificationAsRead: async (notificationId, userId) => {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        throw new AppError("Notification not found or not owned by user", 404);
      }

      if (notification.isRead) {
        return {
          success: true,
          message: "Notification already marked as read",
          notification,
        };
      }

      notification.isRead = true;
      await notification.save();

      // TODO: Cập nhật Redis
      // const unreadCount = await Notification.count({ where: { userId, isRead: false } });
      // await redisClient.set(`user:notifications:unread:${userId}`, unreadCount);

      logger.info(
        `Notification ${notificationId} marked as read for user ${userId}`
      );
      return {
        success: true,
        message: "Notification marked as read",
        notification,
      };
    } catch (error) {
      logger.error(
        `Error in markNotificationAsRead for notification ${notificationId}:`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Could not mark notification as read", 500, error);
    }
  },

  markAllNotificationsAsRead: async (userId) => {
    try {
      const [affectedCount] = await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false }, returning: false } // returning: false vì không cần lấy lại bản ghi
      );

      // TODO: Cập nhật Redis
      // await redisClient.set(`user:notifications:unread:${userId}`, 0);

      logger.info(
        `All unread notifications marked as read for user ${userId}. Count: ${affectedCount}`
      );
      return {
        success: true,
        message: "All notifications marked as read",
        affectedCount,
      };
    } catch (error) {
      logger.error(
        `Error in markAllNotificationsAsRead for user ${userId}:`,
        error
      );
      throw new AppError(
        "Could not mark all notifications as read",
        500,
        error
      );
    }
  },

  getUnreadNotificationCount: async (userId) => {
    // TODO: Lấy từ Redis trước, nếu không có thì query DB và cache lại
    try {
      // const cachedCount = await redisClient.get(`user:notifications:unread:${userId}`);
      // if (cachedCount !== null) return parseInt(cachedCount, 10);

      const count = await Notification.count({
        where: { userId, isRead: false },
      });
      // await redisClient.set(`user:notifications:unread:${userId}`, count);
      return count;
    } catch (error) {
      logger.error(
        `Error in getUnreadNotificationCount for user ${userId}:`,
        error
      );
      // Trả về 0 nếu có lỗi để không làm crash flow, nhưng cần log
      return 0;
    }
  },

  // Hàm này sẽ được gọi từ streamService hoặc vodService
  notifyFollowers: async (actorUser, actionType, entity, messageGenerator) => {
    // actorUser: User object của người thực hiện hành động (e.g., người bắt đầu stream)
    // actionType: 'stream_started', 'new_vod'
    // entity: Stream object hoặc VOD object
    // messageGenerator: function(followerUsername, actorUsername, entityTitle) => "message string"

    try {
      logger.info(
        `Attempting to notify followers for actor ${actorUser.username} (ID: ${actorUser.id}), action: ${actionType}`
      );
      // Đây là một phần phụ thuộc vào followService.getFollowers
      // Tạm thời chúng ta sẽ cần một cách để lấy ID của tất cả follower
      // Giả sử followService có hàm getFollowerIds(userId)
      const { default: followService } = await import("./followService.js"); // Dynamic import để tránh circular dependency

      const followers = await followService.getFollowersInternal(
        actorUser.id,
        null,
        null,
        true
      ); // Lấy tất cả follower, chỉ cần id, username

      if (!followers || followers.length === 0) {
        logger.info(
          `No followers found for user ${actorUser.username} (ID: ${actorUser.id}) to notify for ${actionType}.`
        );
        return;
      }

      logger.info(
        `Found ${followers.length} followers for ${actorUser.username} (ID: ${actorUser.id}). Preparing to send ${actionType} notifications.`
      );

      for (const followRelation of followers) {
        // followRelation là bản ghi từ bảng Follows, follower là User object đã include
        const followerUser = followRelation.follower;
        if (!followerUser || !followerUser.id) {
          logger.warn(
            `Follower user data missing for follow relation ID: ${followRelation.id}`
          );
          continue;
        }

        const message = messageGenerator(
          followerUser.username, // follower's username
          actorUser.username, // actor's username
          entity.title ||
            (entityType === "stream"
              ? `Stream by ${actorUser.username}`
              : "New Content") // entity's title or default
        );

        let relatedEntityType = null;
        if (actionType === "stream_started") relatedEntityType = "stream";
        else if (actionType === "new_vod") relatedEntityType = "vod";

        await notificationService.createNotification(
          followerUser.id, // Người nhận thông báo
          actionType,
          message,
          entity.id, // ID của Stream hoặc VOD
          relatedEntityType, // 'stream' hoặc 'vod'
          actorUser.username // Username của người tạo sự kiện (người bắt đầu stream/tạo VOD)
        );
      }
      logger.info(
        `Successfully queued notifications for ${actionType} from actor ${actorUser.id} to their followers.`
      );
    } catch (error) {
      logger.error(
        `Error in notifyFollowers for actor ${actorUser.id}, action ${actionType}:`,
        error
      );
      // Không re-throw để không làm crash tiến trình chính (stream/VOD creation)
    }
  },
};

export default notificationService;
