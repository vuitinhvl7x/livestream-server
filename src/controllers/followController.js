import followService from "../services/followService.js";
import { AppError } from "../utils/errorHandler.js";
import logger from "../utils/logger.js";

const followController = {
  followUser: async (req, res, next) => {
    try {
      const followerId = req.user.id; // Từ authMiddleware
      const followingIdString = req.params.userId;

      if (!followingIdString || isNaN(parseInt(followingIdString, 10))) {
        return next(
          new AppError("Invalid User ID for following provided", 400)
        );
      }
      const followingId = parseInt(followingIdString, 10);

      if (followerId === followingId) {
        return next(new AppError("User cannot follow themselves", 400));
      }

      const result = await followService.followUser(followerId, followingId);
      res.status(200).json(result);
    } catch (error) {
      // lỗi đã được log ở service, controller chỉ cần chuyển tiếp
      next(error);
    }
  },

  unfollowUser: async (req, res, next) => {
    try {
      const followerId = req.user.id; // Từ authMiddleware
      const followingIdString = req.params.userId;

      if (!followingIdString || isNaN(parseInt(followingIdString, 10))) {
        return next(
          new AppError("Invalid User ID for unfollowing provided", 400)
        );
      }
      const followingId = parseInt(followingIdString, 10);

      if (followerId === followingId) {
        return next(new AppError("User cannot unfollow themselves", 400));
      }

      const result = await followService.unfollowUser(followerId, followingId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getFollowers: async (req, res, next) => {
    try {
      const userIdString = req.params.userId;
      const { page = 1, limit = 10 } = req.query;

      if (!userIdString || isNaN(parseInt(userIdString, 10))) {
        return next(new AppError("Invalid User ID provided", 400));
      }
      const userId = parseInt(userIdString, 10);

      const result = await followService.getFollowers(
        userId,
        parseInt(page, 10),
        parseInt(limit, 10)
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  getFollowing: async (req, res, next) => {
    try {
      const userIdString = req.params.userId;
      const { page = 1, limit = 10 } = req.query;

      if (!userIdString || isNaN(parseInt(userIdString, 10))) {
        return next(new AppError("Invalid User ID provided", 400));
      }
      const userId = parseInt(userIdString, 10);

      const result = await followService.getFollowing(
        userId,
        parseInt(page, 10),
        parseInt(limit, 10)
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },
};

export default followController;
