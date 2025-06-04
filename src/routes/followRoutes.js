import express from "express";
import followController from "../controllers/followController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// POST /api/users/:userId/follow - Theo dõi người dùng
router.post("/:userId/follow", authMiddleware, followController.followUser);

// DELETE /api/users/:userId/unfollow - Bỏ theo dõi người dùng
router.delete(
  "/:userId/unfollow",
  authMiddleware,
  followController.unfollowUser
);

// GET /api/users/:userId/followers - Lấy danh sách người theo dõi
router.get("/:userId/followers", followController.getFollowers);

// GET /api/users/:userId/following - Lấy danh sách người đang theo dõi
router.get("/:userId/following", followController.getFollowing);

export default router;
