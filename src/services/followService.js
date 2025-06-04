import { User, Follow, sequelize, Notification } from "../models/index.js";
// import { redisClient } from '../lib/redis.js'; // TODO: Sẽ uncomment khi triển khai Redis
import { AppError } from "../utils/errorHandler.js";
import notificationService from "./notificationService.js";
import logger from "../utils/logger.js";

const followService = {
  followUser: async (followerId, followingId) => {
    if (followerId === followingId) {
      throw new AppError("User cannot follow themselves", 400);
    }
    try {
      const t = await sequelize.transaction();
      const follower = await User.findByPk(followerId, { transaction: t });
      const following = await User.findByPk(followingId, { transaction: t });

      if (!follower || !following) {
        await t.rollback();
        throw new AppError("Follower or following user not found", 404);
      }

      const existingFollow = await Follow.findOne({
        where: { followerId, followingId },
        transaction: t,
      });

      if (existingFollow) {
        await t.rollback();
        throw new AppError("Already following this user", 409); // 409 Conflict
      }

      await Follow.create({ followerId, followingId }, { transaction: t });

      // Tạo thông báo
      // Đảm bảo notificationService.createNotification không ném lỗi làm rollback transaction này nếu không cần thiết
      // Hoặc bỏ nó ra ngoài transaction nếu việc follow vẫn nên thành công dù notification lỗi.
      // Hiện tại, nếu createNotification lỗi, transaction sẽ rollback.
      const notificationMessage = `${follower.username} started following you.`;
      await notificationService.createNotification(
        followingId, // userId - người nhận thông báo
        "new_follower",
        notificationMessage,
        followerId, // relatedEntityId - ID của người theo dõi
        "user", // relatedEntityType
        follower.username // creatorUsername
      );

      await t.commit();
      logger.info(
        `User ${followerId} (${follower.username}) successfully followed user ${followingId} (${following.username})`
      );
      // TODO: Cập nhật Redis (user:followers:count:${followingId}, user:following:count:${followerId})
      return {
        success: true,
        message: `Successfully followed ${following.username}`,
      };
    } catch (error) {
      logger.error(
        `Error in followUser (follower: ${followerId}, following: ${followingId}):`,
        error
      );
      // Không cần await t.rollback() ở đây nếu lỗi từ DB operation trong transaction thì nó tự rollback.
      // Nếu lỗi từ AppError đã throw thì transaction có thể chưa commit.
      if (error instanceof AppError) throw error;
      throw new AppError("Could not follow user", 500, error);
    }
  },

  unfollowUser: async (followerId, followingId) => {
    if (followerId === followingId) {
      throw new AppError("User cannot unfollow themselves", 400);
    }
    try {
      const follower = await User.findByPk(followerId);
      const following = await User.findByPk(followingId);

      if (!follower || !following) {
        throw new AppError(
          "Follower or following user not found for unfollow operation",
          404
        );
      }

      const result = await Follow.destroy({
        where: { followerId, followingId },
      });

      if (result === 0) {
        throw new AppError("You are not following this user", 404);
      }
      logger.info(
        `User ${followerId} (${follower.username}) successfully unfollowed user ${followingId} (${following.username})`
      );
      // TODO: Cập nhật Redis
      return {
        success: true,
        message: `Successfully unfollowed ${following.username}`,
      };
    } catch (error) {
      logger.error(
        `Error in unfollowUser (follower: ${followerId}, following: ${followingId}):`,
        error
      );
      if (error instanceof AppError) throw error;
      throw new AppError("Could not unfollow user", 500, error);
    }
  },

  getFollowers: async (userId, page = 1, limit = 10) => {
    try {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const { count, rows } = await Follow.findAndCountAll({
        where: { followingId: userId }, // Người được user này theo dõi -> followers của userId
        include: [
          {
            model: User,
            as: "follower", // Defined in models/index.js
            attributes: ["id", "username", "avatarUrl"], // Lấy các thuộc tính cần thiết của người theo dõi
          },
        ],
        limit: parseInt(limit, 10),
        offset,
        order: [["createdAt", "DESC"]],
      });

      return {
        followers: rows.map((f) => f.follower), // Trả về danh sách user objects
        totalItems: count,
        totalPages: Math.ceil(count / parseInt(limit, 10)),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      logger.error(`Error in getFollowers for user ${userId}:`, error);
      throw new AppError("Could not retrieve followers", 500, error);
    }
  },

  // Hàm nội bộ để notificationService sử dụng, không phân trang, chỉ lấy id và username
  getFollowersInternal: async (userId) => {
    try {
      const follows = await Follow.findAll({
        where: { followingId: userId },
        include: [
          {
            model: User,
            as: "follower",
            attributes: ["id", "username"],
          },
        ],
        raw: false, // Để lấy nested objects từ include
      });
      // Trả về mảng các đối tượng Follow, mỗi đối tượng chứa thông tin user của follower
      // notificationService sẽ cần truy cập follow.follower.id và follow.follower.username
      return follows;
    } catch (error) {
      logger.error(`Error in getFollowersInternal for user ${userId}:`, error);
      // Không nên throw ở đây để không làm gián đoạn notifyFollowers, chỉ log và trả về mảng rỗng
      return [];
    }
  },

  getFollowing: async (userId, page = 1, limit = 10) => {
    try {
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
      const { count, rows } = await Follow.findAndCountAll({
        where: { followerId: userId }, // Người mà user này đang theo dõi
        include: [
          {
            model: User,
            as: "following", // Defined in models/index.js
            attributes: ["id", "username", "avatarUrl"], // Lấy các thuộc tính cần thiết của người được theo dõi
          },
        ],
        limit: parseInt(limit, 10),
        offset,
        order: [["createdAt", "DESC"]],
      });

      return {
        following: rows.map((f) => f.following), // Trả về danh sách user objects
        totalItems: count,
        totalPages: Math.ceil(count / parseInt(limit, 10)),
        currentPage: parseInt(page, 10),
      };
    } catch (error) {
      logger.error(`Error in getFollowing for user ${userId}:`, error);
      throw new AppError("Could not retrieve following list", 500, error);
    }
  },

  getFollowerCount: async (userId) => {
    // TODO: Lấy từ Redis trước, nếu không có thì query DB và cache lại
    try {
      const count = await Follow.count({ where: { followingId: userId } });
      return count;
    } catch (error) {
      logger.error(`Error in getFollowerCount for user ${userId}:`, error);
      throw new AppError("Could not retrieve follower count", 500, error);
    }
  },

  getFollowingCount: async (userId) => {
    // TODO: Lấy từ Redis trước, nếu không có thì query DB và cache lại
    try {
      const count = await Follow.count({ where: { followerId: userId } });
      return count;
    } catch (error) {
      logger.error(`Error in getFollowingCount for user ${userId}:`, error);
      throw new AppError("Could not retrieve following count", 500, error);
    }
  },
};

export default followService;
