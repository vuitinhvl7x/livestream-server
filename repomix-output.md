This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
4. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: **/*.{js,ts}
- Files matching these patterns are excluded: worker-configuration.d.ts
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

## Additional Info

# Directory Structure
```
migrations/20250601000000-create-vods.js
migrations/20250601233824-add-categoryId-to-vods-table.js
models/index.js
scripts/assignAdmin.js
seeders/20250605094017-bulk-create-users-and-follows-esm.js
src/config/database.js
src/config/mongodb.js
src/controllers/categoryController.js
src/controllers/chatController.js
src/controllers/followController.js
src/controllers/notificationController.js
src/controllers/streamController.js
src/controllers/userController.js
src/controllers/vodController.js
src/controllers/webhookController.js
src/index.js
src/lib/b2.service.js
src/lib/redis.js
src/middlewares/adminCheckMiddleware.js
src/middlewares/authMiddleware.js
src/middlewares/uploadMiddleware.js
src/models/category.js
src/models/follow.js
src/models/index.js
src/models/mongo/ChatMessage.js
src/models/notification.js
src/models/stream.js
src/models/TokenBlacklist.js
src/models/user.js
src/models/vod.js
src/queues/notificationQueue.js
src/routes/admin/categoryAdminRoutes.js
src/routes/categoryRoutes.js
src/routes/chatRoutes.js
src/routes/followRoutes.js
src/routes/notificationRoutes.js
src/routes/streamRoutes.js
src/routes/userRoutes.js
src/routes/vodRoutes.js
src/routes/webhookRoutes.js
src/services/categoryService.js
src/services/chatService.js
src/services/followService.js
src/services/notificationService.js
src/services/streamService.js
src/services/userService.js
src/services/vodService.js
src/socketHandlers.js
src/utils/appEvents.js
src/utils/errorHandler.js
src/utils/logger.js
src/utils/videoUtils.js
src/validators/categoryValidators.js
src/validators/streamValidators.js
src/validators/userValidators.js
src/validators/vodValidator.js
src/workers/notificationWorker.js
```

# Files

## File: migrations/20250601000000-create-vods.js
```javascript
"use strict";
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("VODs", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      streamId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Streams", // Tên bảng Streams
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users", // Tên bảng Users
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
      },
      videoUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      thumbnail: {
        type: Sequelize.STRING,
      },
      duration: {
        type: Sequelize.INTEGER, // Đơn vị: giây
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
    await queryInterface.addIndex("VODs", ["streamId"]);
    await queryInterface.addIndex("VODs", ["userId"]);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("VODs");
  },
};
```

## File: seeders/20250605094017-bulk-create-users-and-follows-esm.js
```javascript
"use strict";

import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let db;
try {
  // Giả định thư mục gốc của project chứa thư mục seeders và src
  // Đường dẫn từ seeders/your-file.js đến src/models/index.js sẽ là ../src/models/index.js
  db = require("../src/models/index.js");
  console.log("Successfully loaded models from '../src/models/index.js'");
} catch (e) {
  console.error(
    "Failed to load models from '../src/models/index.js'. Ensure the path is correct and models/index.js exists and is valid.",
    e
  );
  throw new Error(
    "Could not load database models for seeder. Path: ../src/models/index.js"
  );
}

const User = db.User;
const Follow = db.Follow;

if (!User || !Follow) {
  throw new Error(
    "User or Follow model is undefined. Check model imports in seeder (loaded from models/index.js)."
  );
}

export default {
  async up(queryInterface, Sequelize) {
    const targetUsername = "domixi";
    const numberOfFollowersToCreate = 10000;
    const defaultPassword = "password123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    console.log(`Looking for user "${targetUsername}"...`);
    let domixiUser = await User.findOne({
      where: { username: targetUsername },
    });

    if (!domixiUser) {
      console.warn(`User "${targetUsername}" not found. Creating this user...`);
      try {
        domixiUser = await User.create({
          username: targetUsername,
          password: await bcrypt.hash("domixiSecurePassword123!", 10),
          displayName: "Domixi",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(
          `User "${targetUsername}" created with ID: ${domixiUser.id}`
        );
      } catch (error) {
        console.error(`Failed to create user "${targetUsername}":`, error);
        throw new Error(
          `User "${targetUsername}" not found and could not be created.`
        );
      }
    } else {
      console.log(`User "${targetUsername}" found with ID: ${domixiUser.id}`);
    }

    const domixiUserId = domixiUser.id;

    const usersToCreate = [];
    console.log(
      `Preparing to create ${numberOfFollowersToCreate} new users...`
    );
    for (let i = 0; i < numberOfFollowersToCreate; i++) {
      const uniqueSuffix = `_${Date.now()}_${i}`;
      // Giới hạn độ dài username và loại bỏ ký tự không hợp lệ
      const baseUsername = faker.internet
        .userName()
        .replace(/[^a-zA-Z0-9_.]/g, "")
        .substring(0, 20);
      usersToCreate.push({
        username: `${baseUsername}${uniqueSuffix}`,
        password: hashedPassword,
        displayName: faker.person.fullName(),
        avatarUrl: faker.image.avatar(),
        bio: faker.lorem.sentence(),
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(
      `Attempting to bulk create ${usersToCreate.length} new users...`
    );
    let createdUsers;
    try {
      createdUsers = await User.bulkCreate(usersToCreate, {
        validate: true,
        returning: true,
      });
      console.log(
        `Successfully created ${createdUsers.length} new users via User.bulkCreate.`
      );
    } catch (userCreationError) {
      console.error(
        "Error during User.bulkCreate. Details:",
        userCreationError.message
      );
      if (userCreationError.errors) {
        userCreationError.errors.forEach((err) =>
          console.error(
            "Validation error:",
            err.message,
            "for field:",
            err.path
          )
        );
      }

      console.log(
        "Attempting fallback: queryInterface.bulkInsert (IDs won't be returned directly)."
      );
      await queryInterface.bulkInsert("Users", usersToCreate, {});
      console.log(
        "Fallback queryInterface.bulkInsert executed. Manually verify user creation and IDs."
      );
      const usernames = usersToCreate.map((u) => u.username);
      createdUsers = await User.findAll({ where: { username: usernames } });
      if (createdUsers.length !== usersToCreate.length) {
        console.warn(
          `FALLBACK: Retrieved ${createdUsers.length} users, expected ${usersToCreate.length}. Follows might be incomplete.`
        );
      } else {
        console.log(
          `FALLBACK: Successfully retrieved ${createdUsers.length} users.`
        );
      }
    }

    if (!createdUsers || createdUsers.length === 0) {
      console.error(
        "No users were created or IDs could not be retrieved. Cannot proceed to create follows."
      );
      throw new Error("Failed to create new users or retrieve their IDs.");
    }

    console.log(
      `Preparing to create follow relationships for ${createdUsers.length} users...`
    );
    const validCreatedUsers = createdUsers.filter((user) => user && user.id);
    const followsToCreate = validCreatedUsers.map((follower) => ({
      followerId: follower.id,
      followingId: domixiUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    if (followsToCreate.length > 0) {
      await queryInterface.bulkInsert("Follows", followsToCreate, {});
      console.log(
        `Successfully made ${followsToCreate.length} users follow "${targetUsername}".`
      );
    } else {
      console.warn(
        "No valid created users with IDs found to create follow relationships. This might happen if User.bulkCreate failed and fallback also had issues retrieving users."
      );
    }
    console.log("Seeder 'up' function completed.");
  },

  async down(queryInterface, Sequelize) {
    console.log("Executing down for seeder: bulk-create-users-and-follows-esm");
    const targetUsername = "domixi";

    const domixiUser = await User.findOne({
      where: { username: targetUsername },
    });
    if (domixiUser) {
      console.log(
        'Attempting to delete follows for user "' +
          targetUsername +
          '" (ID: ' +
          domixiUser.id +
          ")"
      );
      const result = await queryInterface.bulkDelete(
        "Follows",
        { followingId: domixiUser.id },
        {}
      );
      console.log("Follow records deletion result for domixi:", result);
    } else {
      console.log(
        'User "' +
          targetUsername +
          '" not found, skipping deletion of follow records.'
      );
    }

    console.warn(
      "`down` seeder (ESM) executed. Follows for domixi might have been removed. Bulk user deletion is not automatically performed by this down method for safety."
    );
  },
};
```

## File: src/controllers/chatController.js
```javascript
import { getChatHistoryByStreamId } from "../services/chatService.js";

export const getChatHistory = async (req, res) => {
  try {
    const { streamId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    // const skip = (page - 1) * limit; // Logic skip sẽ do service xử lý

    if (!streamId) {
      return res.status(400).json({ message: "Stream ID is required." });
    }
    // Gọi service để lấy lịch sử chat
    const result = await getChatHistoryByStreamId(streamId, { page, limit });

    // const messages = await ChatMessage.find({ streamId })
    //   .sort({ timestamp: -1 })
    //   .skip(skip)
    //   .limit(limit)
    //   .lean();

    // const totalMessages = await ChatMessage.countDocuments({ streamId });
    // const totalPages = Math.ceil(totalMessages / limit);

    res.status(200).json({
      message: "Chat history fetched successfully",
      data: result.messages, // Service đã reverse() nếu cần
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      totalMessages: result.totalMessages,
    });
  } catch (error) {
    console.error("Error fetching chat history in controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching chat history", error: error.message });
  }
};
```

## File: src/controllers/followController.js
```javascript
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
```

## File: src/controllers/notificationController.js
```javascript
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
```

## File: src/middlewares/adminCheckMiddleware.js
```javascript
import { AppError } from "../utils/errorHandler.js"; // Optional: for consistent error handling

/**
 * Middleware to check if the authenticated user has admin privileges.
 * Assumes `req.user` is populated by a preceding authentication middleware (e.g., authMiddleware)
 * and that `req.user` object has a `role` property.
 */
export const adminCheckMiddleware = (req, res, next) => {
  // Check if user object exists and has a role property
  if (req.user && req.user.role) {
    if (req.user.role === "admin") {
      // User is an admin, proceed to the next middleware or route handler
      next();
    } else {
      // User is authenticated but not an admin
      // You can use AppError or send a direct response
      // return next(new AppError("Forbidden: Admin access required.", 403));
      return res
        .status(403)
        .json({ success: false, message: "Forbidden: Admin access required." });
    }
  } else {
    // req.user is not populated or doesn't have a role,
    // which implies an issue with the authMiddleware or JWT payload
    // This case should ideally be caught by authMiddleware, but as a safeguard:
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User role not found or authentication issue.",
    });
  }
};

// If you prefer to export it as default:
// export default adminCheckMiddleware;
```

## File: src/models/follow.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Follow = sequelize.define(
  "Follow",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    followerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Tên bảng Users
        key: "id",
      },
      onDelete: "CASCADE",
    },
    followingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Tên bảng Users
        key: "id",
      },
      onDelete: "CASCADE",
    },
  },
  {
    timestamps: true,
    // tableName: 'Follows' // Sequelize sẽ tự động đặt tên bảng là 'Follows'
  }
);

export default Follow;
```

## File: src/models/mongo/ChatMessage.js
```javascript
import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
  streamId: {
    type: String,
    required: true,
    index: true, // Index để query nhanh hơn theo streamId
  },
  userId: {
    type: String, // Hoặc mongoose.Schema.Types.ObjectId nếu User cũng trong Mongo và bạn muốn reference
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Tránh lỗi OverwriteModelError nếu model đã được compile (thường xảy ra khi dùng nodemon)
const ChatMessage =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", chatMessageSchema);

export default ChatMessage;
```

## File: src/models/notification.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Tên bảng Users
        key: "id",
      },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM("new_follower", "stream_started", "new_vod"),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING, // Hoặc DataTypes.JSON nếu bạn muốn lưu chi tiết phức tạp
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    relatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Có thể null nếu không có thực thể liên quan trực tiếp
    },
    relatedEntityType: {
      type: DataTypes.STRING, // 'user', 'stream', 'vod'
      allowNull: true,
    },
  },
  {
    timestamps: true,
    // tableName: 'Notifications' // Sequelize sẽ tự động đặt tên bảng là 'Notifications'
  }
);

export default Notification;
```

## File: src/models/TokenBlacklist.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const TokenBlacklist = sequelize.define(
  "TokenBlacklist",
  {
    token: {
      type: DataTypes.STRING(512),
      primaryKey: true,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TokenBlacklist",
    timestamps: false, // Không cần createdAt/updatedAt cho model này
  }
);

export default TokenBlacklist;
```

## File: src/routes/admin/categoryAdminRoutes.js
```javascript
import express from "express";
import * as categoryController from "../../controllers/categoryController.js";
import {
  validateCreateCategory,
  validateUpdateCategory,
  validateGetCategoryParams,
} from "../../validators/categoryValidators.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { adminCheckMiddleware } from "../../middlewares/adminCheckMiddleware.js";
import upload from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

// All routes in this file are protected by authMiddleware and adminCheckMiddleware
router.use(authMiddleware);
router.use(adminCheckMiddleware);

router.post(
  "/",
  upload.single("thumbnailFile"), // Middleware for single file upload
  validateCreateCategory,
  categoryController.createCategory
);

router.put(
  "/:categoryIdOrSlug",
  upload.single("thumbnailFile"),
  validateUpdateCategory,
  categoryController.updateCategory
);

router.delete(
  "/:categoryIdOrSlug",
  validateGetCategoryParams, // Just to validate param format
  categoryController.deleteCategory
);

// Admin can also use the public GET routes, but they are defined in categoryRoutes.js
// If admin needs a special version of GET, define it here.

export default router;
```

## File: src/routes/chatRoutes.js
```javascript
import express from "express";
import { getChatHistory } from "../controllers/chatController.js";
import authenticateToken from "../middlewares/authMiddleware.js"; // API này cũng cần xác thực

const router = express.Router();

// GET /api/chat/:streamId/messages - Lấy lịch sử chat cho một stream
// Client sẽ cần truyền streamId trong params và có thể page/limit trong query string
router.get("/:streamId/messages", authenticateToken, getChatHistory);

export default router;
```

## File: src/routes/followRoutes.js
```javascript
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
```

## File: src/routes/notificationRoutes.js
```javascript
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
```

## File: src/services/followService.js
```javascript
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
```

## File: src/utils/appEvents.js
```javascript
import EventEmitter from "events";

const appEmitter = new EventEmitter();

export default appEmitter;
```

## File: src/utils/errorHandler.js
```javascript
// src/utils/errorHandler.js

// Lớp lỗi tùy chỉnh để có thể thêm statusCode và các thông tin khác
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Lỗi có thể dự đoán được, không phải bug của lập trình viên

    Error.captureStackTrace(this, this.constructor);
  }
}

// Hàm helper để xử lý lỗi trong các service
const handleServiceError = (error, contextMessage) => {
  if (error instanceof AppError) {
    // Nếu lỗi đã là AppError, chỉ cần log thêm context và re-throw
    console.error(`AppError in ${contextMessage}:`, error.message);
    throw error;
  }

  // Nếu là lỗi khác (ví dụ: lỗi từ thư viện, lỗi hệ thống)
  console.error(`Unexpected error in ${contextMessage}:`, error);
  // Chuyển thành AppError với thông báo chung chung hơn để không lộ chi tiết lỗi nhạy cảm
  throw new AppError(
    `Lỗi xảy ra khi ${contextMessage}. Vui lòng thử lại sau. Chi tiết: ${error.message}`,
    500
  );
};

export { AppError, handleServiceError };
```

## File: src/utils/logger.js
```javascript
// Basic logger
const logger = {
  info: (...args) => console.log("[INFO]", ...args),
  warn: (...args) => console.warn("[WARN]", ...args),
  error: (...args) => console.error("[ERROR]", ...args),
  debug: (...args) => {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG === "true"
    ) {
      console.debug("[DEBUG]", ...args);
    }
  },
};

export default logger;
```

## File: src/workers/notificationWorker.js
```javascript
import { Worker } from "bullmq";
import redisClient from "../lib/redis.js";
import notificationService from "../services/notificationService.js";
import logger from "../utils/logger.js";

const queueName = "notification-tasks";

const worker = new Worker(
  queueName,
  async (job) => {
    const { actionType, actorUser, entity, followers, messageTemplate } =
      job.data;
    logger.info(
      `Processing job ${job.id} for action: ${actionType}, entity: ${entity?.id}, actor: ${actorUser?.id}, ${followers.length} followers.`
    );

    let relatedEntityType = null;
    if (actionType === "stream_started") {
      relatedEntityType = "stream";
    } else if (actionType === "new_vod") {
      relatedEntityType = "vod";
    } else if (actionType === "new_follower") {
      relatedEntityType = "user"; // Theo mô tả của createNotification
    } else {
      logger.warn(
        `Job ${job.id}: Unknown actionType: ${actionType}. Skipping.`
      );
      return { success: false, reason: "unknown_action_type" };
    }

    let successfulNotifications = 0;
    let failedNotifications = 0;

    for (const follower of followers) {
      if (!follower || !follower.id) {
        logger.warn(
          `Job ${job.id}: Invalid follower data:`,
          follower,
          `Skipping.`
        );
        failedNotifications++;
        continue;
      }

      try {
        // Theo Bước 5 của task.md, createNotification cần:
        // userId, type, message, relatedEntityId, relatedEntityType, creatorUsername, actorUserId, entityTitle
        const notificationResult = await notificationService.createNotification(
          follower.id, // userId (của người nhận thông báo - follower)
          actionType, // type (stream_started, new_vod, new_follower)
          messageTemplate, // message (hoặc message được tạo từ template này)
          entity?.id || (actionType === "new_follower" ? actorUser?.id : null), // relatedEntityId (ID của stream/VOD, hoặc actor nếu là new_follower)
          relatedEntityType, // relatedEntityType ("stream", "vod", "user")
          actorUser?.username, // creatorUsername (username của người tạo ra hành động)
          actorUser?.id, // actorUserId (ID của người tạo ra hành động)
          entity?.title // entityTitle (tiêu đề của stream/VOD)
        );

        if (notificationResult && notificationResult.success) {
          logger.info(
            `Job ${job.id}: Notification sent successfully to follower ${follower.id} for entity ${entity?.id}.`
          );
          successfulNotifications++;
        } else {
          logger.error(
            `Job ${job.id}: Failed to send notification to follower ${follower.id} for entity ${entity?.id}. Reason: ${notificationResult?.reason}`
          );
          failedNotifications++;
        }
      } catch (error) {
        logger.error(
          `Job ${job.id}: Error processing follower ${follower.id} for entity ${entity?.id}:`,
          error
        );
        failedNotifications++;
      }
    }
    logger.info(
      `Job ${job.id} finished. Successful: ${successfulNotifications}, Failed: ${failedNotifications} for action: ${actionType}, entity: ${entity?.id}`
    );
    return {
      success: true,
      processed: followers.length,
      successful: successfulNotifications,
      failed: failedNotifications,
    };
  },
  {
    connection: redisClient,
    concurrency: 4, // Xử lý 4 jobs đồng thời
    removeOnComplete: { count: 1000 }, // Giữ lại 1000 job hoàn thành gần nhất
    removeOnFail: { count: 5000 }, // Giữ lại 5000 job thất bại gần nhất
  }
);

worker.on("completed", (job, result) => {
  logger.info(`Worker: Job ${job.id} has completed. Result:`, result);
});

worker.on("failed", (job, err) => {
  logger.error(
    `Worker: Job ${job.id} has failed with error: ${err.message}`,
    err.stack
  );
});

worker.on("error", (err) => {
  logger.error("Worker: Encountered an error:", err);
});

logger.info("Notification worker started successfully.");

export default worker;
```

## File: migrations/20250601233824-add-categoryId-to-vods-table.js
```javascript
"use strict";

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("VODs", "categoryId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Categories",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("VODs", "categoryId");
  },
};
```

## File: scripts/assignAdmin.js
```javascript
// scripts/assignAdmin.js
import { User } from "../src/models/index.js";
import sequelize from "../src/config/database.js";

// !!! THAY ĐỔI USERNAME Ở ĐÂY !!!
const usernameToMakeAdmin = "xuanhaiAdmin"; // <-- Thay thế bằng username của người dùng bạn muốn gán quyền admin

if (usernameToMakeAdmin === "YOUR_TARGET_USERNAME") {
  console.error(
    "Vui lòng cập nhật biến 'usernameToMakeAdmin' trong file scripts/assignAdmin.js với username thực tế."
  );
  process.exit(1);
}

const assignAdminRole = async () => {
  console.log(
    `Đang cố gắng gán vai trò 'admin' cho người dùng: ${usernameToMakeAdmin}`
  );
  try {
    // Không cần sequelize.sync() ở đây nếu bạn đã chạy migrations
    // await sequelize.sync();

    const user = await User.findOne({
      where: { username: usernameToMakeAdmin },
    });

    if (user) {
      if (user.role === "admin") {
        console.log(`Người dùng ${usernameToMakeAdmin} đã là admin.`);
      } else {
        user.role = "admin";
        await user.save();
        console.log(
          `Người dùng ${usernameToMakeAdmin} đã được cập nhật vai trò thành công thành 'admin'.`
        );
      }
    } else {
      console.log(
        `Không tìm thấy người dùng với username: ${usernameToMakeAdmin}.`
      );
    }
  } catch (error) {
    console.error("Lỗi khi gán vai trò admin:", error);
  } finally {
    console.log("Đang đóng kết nối cơ sở dữ liệu...");
    await sequelize.close();
    console.log("Đã đóng kết nối cơ sở dữ liệu.");
  }
};

assignAdminRole();
```

## File: src/config/mongodb.js
```javascript
import mongoose from "mongoose";
import dotenv from "dotenv";
import logger from "../utils/logger.js"; // Import logger

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    logger.warn(
      "MONGODB_URI not found in .env. Chat features requiring MongoDB will be unavailable."
    );
    return false; // Trả về false nếu không có URI
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      // Các options như useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify
      // không còn cần thiết trong Mongoose 6+ và có thể gây lỗi nếu dùng.
    });
    logger.info("MongoDB connected successfully for chat logs.");
    return true; // Trả về true nếu kết nối thành công
  } catch (err) {
    logger.error("MongoDB connection error:", err);
    // Thoát ứng dụng nếu không kết nối được DB quan trọng này (tùy chọn)
    // process.exit(1);
    return false; // Trả về false nếu có lỗi
  }
};

// Lắng nghe các sự kiện kết nối (tùy chọn, để debug)
mongoose.connection.on("disconnected", () => {
  logger.info("MongoDB disconnected.");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected.");
});
```

## File: src/queues/notificationQueue.js
```javascript
import { Queue } from "bullmq";
import redisClient from "../lib/redis.js";
import logger from "../utils/logger.js";

const queueName = "notification-tasks";

// Khởi tạo Queue với kết nối Redis và các tùy chọn
const notificationQueue = new Queue(queueName, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3, // Số lần thử lại job nếu thất bại
    backoff: {
      type: "exponential", // Kiểu backoff: exponential, fixed
      delay: 1000, // Thời gian chờ ban đầu (ms)
    },
    removeOnComplete: {
      // Tự động xóa job khi hoàn thành
      count: 5000, // Giữ lại 5000 jobs hoàn thành gần nhất
      age: 24 * 3600, // Giữ lại jobs hoàn thành trong 24 giờ (tính bằng giây)
    },
    removeOnFail: {
      // Giữ lại 1000 job thất bại gần nhất
      count: 5000, // Giữ lại 5000 job thất bại gần nhất
      age: 7 * 24 * 3600, // Giữ job lỗi trong 7 ngày
    },
  },
});

notificationQueue.on("waiting", (jobId) => {
  logger.info(`A job with ID ${jobId} is waiting.`);
});

notificationQueue.on("active", (job) => {
  logger.info(`Job ${job.id} is now active.`);
});

notificationQueue.on("completed", (job, result) => {
  logger.info(`Job ${job.id} completed with result ${result}`);
});

notificationQueue.on("failed", (job, err) => {
  logger.error(`Job ${job.id} failed with error ${err.message}`);
});

export default notificationQueue;
```

## File: src/services/chatService.js
```javascript
import ChatMessage from "../models/mongo/ChatMessage.js";
import logger from "../utils/logger.js";

/**
 * Lưu một tin nhắn chat mới vào MongoDB.
 * @param {object} messageData - Dữ liệu tin nhắn bao gồm streamId, userId, username, message.
 * @returns {Promise<object>} Tin nhắn đã lưu.
 * @throws {Error} Nếu có lỗi khi lưu.
 */
export const saveChatMessage = async (messageData) => {
  try {
    // Chỉ lưu nếu MONGODB_URI được cấu hình (nghĩa là MongoDB đã kết nối)
    if (!process.env.MONGODB_URI) {
      logger.info(
        `Chat message from ${messageData.username} for stream ${messageData.streamId} (not saved - MongoDB not configured).`
      );
      // Trả về dữ liệu gốc với timestamp giả lập nếu không lưu DB
      return { ...messageData, timestamp: new Date() };
    }

    const chatEntry = new ChatMessage(messageData);
    await chatEntry.save();
    logger.info(
      `Message from ${messageData.username} in room ${messageData.streamId} saved to DB.`
    );
    return chatEntry.toObject(); // Trả về plain object
  } catch (error) {
    logger.error("Error saving chat message in service:", error);
    throw new Error("Failed to save chat message: " + error.message);
  }
};

/**
 * Lấy lịch sử chat cho một stream cụ thể với phân trang.
 * @param {string} streamId - ID của stream.
 * @param {object} paginationOptions - Tùy chọn phân trang { page, limit }.
 * @returns {Promise<object>} Bao gồm danh sách tin nhắn, tổng số trang, trang hiện tại.
 * @throws {Error} Nếu có lỗi khi truy vấn.
 */
export const getChatHistoryByStreamId = async (streamId, paginationOptions) => {
  const { page = 1, limit = 50 } = paginationOptions;
  const skip = (page - 1) * limit;

  try {
    if (!process.env.MONGODB_URI) {
      logger.warn("Attempted to get chat history, but MONGODB_URI is not set.");
      return {
        messages: [],
        totalPages: 0,
        currentPage: page,
        totalMessages: 0,
      };
    }

    const messages = await ChatMessage.find({ streamId })
      .sort({ timestamp: -1 }) // Sắp xếp mới nhất lên đầu (cho query)
      .skip(skip)
      .limit(limit)
      .lean(); // .lean() để trả về plain JS objects

    const totalMessages = await ChatMessage.countDocuments({ streamId });
    const totalPages = Math.ceil(totalMessages / limit);

    return {
      messages: messages.reverse(), // Đảo ngược lại để client hiển thị từ cũ -> mới
      totalPages,
      currentPage: page,
      totalMessages,
    };
  } catch (error) {
    logger.error("Error fetching chat history in service:", error);
    throw new Error("Failed to fetch chat history: " + error.message);
  }
};
```

## File: src/services/notificationService.js
```javascript
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
    userId, // Người nhận thông báo
    type, // Loại thông báo: new_follower, stream_started, new_vod
    message, // Nội dung thông báo
    relatedEntityId = null, // ID của user (new_follower), stream (stream_started), vod (new_vod)
    relatedEntityType = null, // "user", "stream", "vod"
    creatorUsername = null, // Username của người tạo sự kiện (người follow, người stream, người upload VOD)
    // Đối với new_follower, đây là username của người đã follow (actor).
    // Đối với stream_started/new_vod, đây là username của người stream/upload VOD (actor).
    actorUserId = null, // ID của người tạo ra hành động (actor)
    entityTitle = null // Tiêu đề của stream/VOD, nếu có
  ) => {
    try {
      const recipientUser = await User.findByPk(userId);
      if (!recipientUser) {
        logger.warn(
          `Attempted to create notification for non-existent user ID: ${userId}`
        );
        return { success: false, reason: "user_not_found" };
      }

      const notificationData = {
        userId,
        type,
        message,
        relatedEntityId,
        relatedEntityType,
        // actorUserId và entityTitle không trực tiếp lưu vào Notification model theo schema hiện tại
        // Chúng sẽ được dùng để xây dựng payload cho socket
      };

      const notification = await Notification.create(notificationData);
      logger.info(
        `Notification created for user ${userId}, type ${type}, ID: ${notification.id}`
      );

      if (ioInstance) {
        const notificationRoom = `notification:${userId}`;

        const payload = {
          ...notification.toJSON(),
        };

        // Thêm thông tin actor và entity vào payload dựa trên type
        if (type === "new_follower" && creatorUsername && relatedEntityId) {
          // relatedEntityId ở đây là ID của người đã follow (actor)
          payload.actor = { id: relatedEntityId, username: creatorUsername };
        } else if (type === "stream_started" || type === "new_vod") {
          if (actorUserId && creatorUsername) {
            // creatorUsername ở đây là username của actor
            payload.actor = { id: actorUserId, username: creatorUsername };
          }
          if (relatedEntityId && entityTitle) {
            payload.entity = { id: relatedEntityId, title: entityTitle };
          }
        }

        ioInstance.to(notificationRoom).emit("new_notification", payload);
        logger.info(
          `Emitted 'new_notification' to room ${notificationRoom} with payload:`,
          payload
        );
      } else {
        logger.warn(
          "ioInstance not set in notificationService, cannot emit real-time notification."
        );
      }
      return { success: true, notification };
    } catch (error) {
      logger.error(
        `Error in createNotification for user ${userId}, type ${type}:`,
        error
      );
      return {
        success: false,
        reason: "internal_server_error",
        error: error.message,
      };
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
          actorUser.username, // Username của người tạo sự kiện (người bắt đầu stream/tạo VOD)
          actorUser.id, // ID của người tạo ra hành động (actor)
          entity.title // Tiêu đề của stream/VOD, nếu có
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
```

## File: src/utils/videoUtils.js
```javascript
// Ví dụ sử dụng fluent-ffmpeg (cần cài đặt: npm install fluent-ffmpeg)
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Lấy thời lượng của video từ đường dẫn file.
 * @param {string} filePath Đường dẫn đến file video.
 * @returns {Promise<number>} Thời lượng video tính bằng giây.
 */
export async function getVideoDurationInSeconds(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        return reject(
          new Error(
            `Lỗi khi lấy thông tin video (ffprobe) từ ${filePath}: ${err.message}. Đảm bảo ffmpeg đã được cài đặt và trong PATH.`
          )
        );
      }
      if (metadata && metadata.format && metadata.format.duration) {
        resolve(parseFloat(metadata.format.duration));
      } else {
        reject(
          new Error(
            `Không tìm thấy thông tin thời lượng trong metadata video cho file ${filePath}.`
          )
        );
      }
    });
  });
}

/**
 * Tạo thumbnail từ video file tại một thời điểm cụ thể.
 * @param {string} videoFilePath Đường dẫn đến file video.
 * @param {string} outputFileName Tên file cho thumbnail (ví dụ: thumb.png).
 * @param {string | number} timestamp Thời điểm để chụp thumbnail (ví dụ: '00:00:01' hoặc 1 (giây)).
 * @returns {Promise<Buffer>} Buffer của file thumbnail.
 */
export async function generateThumbnailFromVideo(
  videoFilePath,
  outputFileName, // Sẽ được lưu vào os.tmpdir()
  timestamp
) {
  return new Promise((resolve, reject) => {
    const tempThumbPath = path.join(os.tmpdir(), outputFileName); // Đường dẫn đầy đủ cho thumbnail tạm

    ffmpeg(videoFilePath)
      .on("error", (err) => {
        reject(
          new Error(
            `Lỗi ffmpeg khi tạo thumbnail từ ${videoFilePath}: ${err.message}`
          )
        );
      })
      .on("end", () => {
        fs.readFile(tempThumbPath, (readErr, thumbBuffer) => {
          // Xóa file thumbnail tạm sau khi đã đọc vào buffer
          fs.unlink(tempThumbPath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(
                `Lỗi khi xóa file thumbnail tạm ${tempThumbPath}:`,
                unlinkErr
              );
            }
          });
          if (readErr) {
            return reject(
              new Error(
                `Không thể đọc file thumbnail tạm ${tempThumbPath}: ${readErr.message}`
              )
            );
          }
          resolve(thumbBuffer);
        });
      })
      .screenshots({
        timestamps: [timestamp],
        filename: outputFileName, // ffmpeg sẽ lưu file này vào folder chỉ định bên dưới
        folder: os.tmpdir(), // Thư mục để ffmpeg lưu thumbnail tạm thời
        size: "320x240", // Kích thước thumbnail, có thể tùy chỉnh
      });
  });
}
```

## File: src/validators/userValidators.js
```javascript
import { body } from "express-validator";

export const validateUserRegistration = [
  body("username")
    .isString()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters long"),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("displayName")
    .isString()
    .notEmpty()
    .withMessage("Display name is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Display name must be between 1 and 50 characters"),
];

export const validateUserLogin = [
  body("username").isString().notEmpty().withMessage("Username is required"),
  // Không cần isLength cho username khi login, chỉ cần tồn tại
  body("password")
    .isString()
    .notEmpty() // Mật khẩu không được rỗng khi login
    .withMessage("Password is required"),
  // Không cần isLength cho password khi login, backend sẽ check hash
];

// Hoặc nếu bạn muốn dùng chung một validator cho cả register và login
// (như file userRoutes.js hiện tại đang làm):
export const validateUserPayload = [
  body("username")
    .isString()
    .bail() // Dừng nếu là non-string để các check sau không lỗi
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3 })
    .withMessage(
      "Username must be at least 3 characters long for registration. For login, only non-empty is checked by this rule if applied broadly."
    ),
  body("password")
    .isString()
    .bail()
    .isLength({ min: 6 })
    .withMessage(
      "Password must be at least 6 characters long for registration. For login, only non-empty is checked if you use a simpler rule."
    ),
];

export const validateUserProfileUpdate = [
  body("displayName")
    .optional()
    .isString()
    .withMessage("Display name must be a string")
    .isLength({ min: 1, max: 50 })
    .withMessage("Display name must be between 1 and 50 characters"),
  body("avatarUrl")
    .optional()
    .isURL()
    .withMessage("Avatar URL must be a valid URL"),
  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be a string")
    .isLength({ max: 500 })
    .withMessage("Bio can be at most 500 characters long"),
];
```

## File: models/index.js
```javascript
"use strict";

const fs = require("fs");
const path = require("path");
const Sequelize = require("sequelize");
const process = require("process");
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
const db = {};
const dotenv = require("dotenv");
dotenv.config();

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: config.dialect,
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: config.dialectOptions || {},
    }
  );
}

const modelsDir = path.join(__dirname, "../src/models");

fs.readdirSync(modelsDir)
  .filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  })
  .forEach(async (file) => {
    try {
      const modelModule = await import(
        path.join(modelsDir, file).replace(/\\/g, "/")
      );
      const model = modelModule.default(sequelize, Sequelize.DataTypes);
      db[model.name] = model;
    } catch (err) {
      console.error(`Error importing model ${file}:`, err);
    }
  });

async function initializeModels() {
  const files = fs.readdirSync(modelsDir).filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  });

  for (const file of files) {
    try {
      const modulePath = path.join(modelsDir, file);
      const moduleURL = "file:///" + modulePath.replace(/\\/g, "/");
      const modelModule = await import(moduleURL);

      if (typeof modelModule.default === "function") {
        const model = modelModule.default(sequelize, Sequelize.DataTypes);
        db[model.name] = model;
      } else {
        console.warn(
          `Model file ${file} does not have a default export function.`
        );
      }
    } catch (err) {
      console.error(`Error importing model ${file}:`, err);
    }
  }

  Object.keys(db).forEach((modelName) => {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });
}

(async () => {
  const files = fs.readdirSync(modelsDir).filter((file) => {
    return (
      file.indexOf(".") !== 0 &&
      file.slice(-3) === ".js" &&
      file.indexOf(".test.js") === -1
    );
  });

  for (const file of files) {
    try {
      const modulePath = path.join(modelsDir, file);
      const moduleURL = "file:///" + modulePath.replace(/\\/g, "/");
      const modelModule = await import(moduleURL);
      if (
        modelModule.default &&
        typeof modelModule.default.init === "function"
      ) {
        const model = modelModule.default;
        if (
          typeof model === "function" &&
          model.prototype instanceof Sequelize.Model
        ) {
          db[model.name] = model;
        } else if (modelModule.default.name && modelModule.default.sequelize) {
          db[modelModule.default.name] = modelModule.default;
        } else if (typeof modelModule.default === "function") {
          const definedModel = modelModule.default;
          if (definedModel.name && definedModel.sequelize) {
            db[definedModel.name] = definedModel;
          } else {
            console.warn(
              `Model ${file} default export is a function but not directly a Sequelize model. Manual call may be needed if it's a factory.`
            );
          }
        }
      }
    } catch (err) {
      console.error(`Error processing model file ${file} for db object:`, err);
    }
  }

  Object.keys(db).forEach((modelName) => {
    if (db[modelName] && db[modelName].associate) {
      db[modelName].associate(db);
    }
  });
})();

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
```

## File: src/controllers/webhookController.js
```javascript
import { markLive, markEnded } from "../services/streamService.js";
import { vodService } from "../services/vodService.js"; // Thêm VOD service
import logger from "../utils/logger.js"; // Giả sử bạn có một utility logger

export async function handleStreamEvent(req, res) {
  // Dữ liệu từ nginx-rtmp-module thường là x-www-form-urlencoded
  const { call, name, tcurl } = req.body; // 'name' thường là streamKey, 'call' là loại sự kiện
  let eventType = "";
  let streamKey = name;

  // Xác định loại sự kiện dựa trên giá trị của 'call'
  // Thêm event từ query param nếu có (cho nginx.conf mới)
  const eventFromQuery = req.query.event;

  if (call === "publish" || eventFromQuery === "publish") {
    eventType = "on_publish";
  } else if (
    call === "done" ||
    call === "publish_done" ||
    eventFromQuery === "publish_done"
  ) {
    // 'done' hoặc 'publish_done' tùy cấu hình/phiên bản
    eventType = "on_done";
  }
  // Thêm các trường hợp khác nếu media server của bạn gửi các giá trị 'call' khác
  // ví dụ: 'play', 'play_done', 'record_done'

  // Lấy viewerCount - nginx-rtmp-module có thể không gửi trực tiếp viewerCount cho on_done.
  // Thông tin này có thể cần lấy từ API thống kê của media server hoặc một cơ chế khác.
  // Trong ví dụ này, chúng ta sẽ bỏ qua viewerCount nếu không có.
  const viewerCount = req.body.viewerCount; // Hoặc một tên trường khác nếu media server gửi

  if (!eventType || !streamKey) {
    logger.error(
      "Webhook stream-event received with missing call/name (event/streamKey):",
      req.body,
      req.query
    );
    return res.status(400).json({ message: "Missing call/name parameters." });
  }

  logger.info(
    `Webhook stream-event received: RawCall - ${call}, MappedEvent - ${eventType}, StreamKey - ${streamKey}, ViewerCount - ${viewerCount}, QueryEvent - ${eventFromQuery}`
  );
  logger.info("Full webhook stream-event body:", req.body);

  try {
    switch (eventType) {
      case "on_publish":
        // URL ingest đầy đủ thường là tcurl (rtmp://host/app) + name (streamkey)
        // Bạn có thể log tcurl + name để xem xét nếu cần.
        logger.info(`Stream starting: ${tcurl}/${name}`);
        await markLive(streamKey);
        logger.info(
          `Stream ${streamKey} marked as live via webhook (event: ${eventType}).`
        );
        break;
      case "on_done":
        await markEnded(streamKey, viewerCount); // viewerCount có thể undefined
        logger.info(
          `Stream ${streamKey} marked as ended via webhook (event: ${eventType}).`
        );
        break;
      default:
        logger.info(
          `Webhook stream-event received unhandled call type: ${call} for ${streamKey}`
        );
        return res.status(200).json({
          message: "Event call type received but not specifically handled.",
        });
    }
    return res.status(200).json({
      message: `Webhook event '${eventType}' (from call '${call}') processed successfully.`,
    });
  } catch (err) {
    logger.error(
      `Error processing webhook event ${eventType} for ${streamKey}:`,
      err.message
    );
    return res.status(500).json({ message: "Error processing webhook event." });
  }
}

/**
 * Xử lý webhook 'on_record_done' từ Nginx sau khi stream đã được ghi lại.
 * Nginx sẽ gửi thông tin về file đã ghi, bao gồm đường dẫn.
 */
export async function handleStreamRecordDone(req, res) {
  // Nginx thường gửi dữ liệu dạng x-www-form-urlencoded cho webhook này
  const { name, path: recordedFilePathInNginx } = req.body;
  const streamKey = name;

  if (!streamKey || !recordedFilePathInNginx) {
    logger.error(
      "Webhook on_record_done received with missing name (streamKey) or path:",
      req.body
    );
    return res
      .status(400)
      .json({ message: "Missing streamKey or recorded file path." });
  }

  logger.info(
    `Webhook on_record_done received: StreamKey - ${streamKey}, RecordedPathInNginx - ${recordedFilePathInNginx}`
  );
  logger.info("Full on_record_done body:", req.body);

  try {
    // Gọi service để xử lý file VOD (convert, upload, save metadata)
    // Giả định đường dẫn từ Nginx container cần được điều chỉnh cho Node.js container
    // Ví dụ: Nginx path /var/rec/live/xyz.flv -> Node.js path /mnt/recordings/live/xyz.flv
    // Điều này phụ thuộc vào cấu hình Docker volume mounts của bạn.
    // Cần có một hàm để ánh xạ đường dẫn này.
    const NGINX_REC_BASE_PATH = "/var/rec"; // Đường dẫn gốc trong Nginx
    const NODE_REC_BASE_PATH =
      process.env.NODE_RECORDING_PATH || "/mnt/recordings"; // Đường dẫn gốc trong Node.js (cấu hình qua .env)

    if (!recordedFilePathInNginx.startsWith(NGINX_REC_BASE_PATH)) {
      logger.error(
        `Recorded file path ${recordedFilePathInNginx} does not start with expected Nginx base path ${NGINX_REC_BASE_PATH}`
      );
      throw new Error("Invalid recorded file path prefix from Nginx.");
    }

    const relativePath = recordedFilePathInNginx.substring(
      NGINX_REC_BASE_PATH.length
    );
    const localFilePath = `${NODE_REC_BASE_PATH}${relativePath}`;

    logger.info(
      `Processing VOD: StreamKey - ${streamKey}, MappedLocalPath - ${localFilePath}`
    );

    // Gọi vodService để xử lý
    const vodResult = await vodService.processRecordedFileToVOD({
      streamKey,
      originalFilePath: localFilePath, // Đường dẫn file gốc (FLV) trên server mà Node.js có thể truy cập
      originalFileName: recordedFilePathInNginx.split("/").pop(), // Tên file gốc, ví dụ: streamkey.flv
    });

    logger.info(
      `VOD processing completed for streamKey ${streamKey}. VOD ID: ${vodResult.id}`
    );

    return res.status(200).json({
      message: "Stream recording processed and VOD created successfully.",
      vod: vodResult,
    });
  } catch (err) {
    logger.error(
      `Error processing on_record_done for streamKey ${streamKey}:`,
      err.message,
      err.stack // Log stack trace để debug dễ hơn
    );
    // Trả về lỗi chi tiết hơn nếu có thể
    const statusCode = err.isAppError ? err.statusCode : 500;
    return res.status(statusCode).json({
      message: "Error processing stream recording.",
      error: err.message,
    });
  }
}
```

## File: src/lib/redis.js
```javascript
import Redis from "ioredis";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

redisClient.on("connect", async () => {
  logger.info("Connected to Redis successfully!");
  // Kiểm tra kết nối bằng ping
  try {
    const pong = await redisClient.ping();
    logger.info("Redis ping response:", pong); // pong sẽ là "PONG"
  } catch (pingError) {
    logger.error("Redis ping failed:", pingError);
  }
});

redisClient.on("error", (err) => {
  logger.error("Could not connect to Redis:", err);
  // Cân nhắc việc xử lý lỗi ở đây, ví dụ: thoát ứng dụng hoặc chạy ở chế độ không cache
});

export default redisClient;
```

## File: src/models/category.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import slugify from "slugify";

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        name: "categories_name_unique",
        msg: "Category name must be unique.",
      },
      validate: {
        notEmpty: {
          msg: "Category name cannot be empty.",
        },
      },
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        name: "categories_slug_unique",
        msg: "Category slug must be unique.",
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2ThumbnailFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2ThumbnailFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: [],
    },
    thumbnailUrlExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // createdAt and updatedAt are managed by timestamps: true in options
  },
  {
    // Options
    sequelize, // This is automatically passed if you define it on the sequelize instance globally, but good to be explicit
    modelName: "Category", // Conventionally, modelName is singular and PascalCase
    tableName: "Categories",
    timestamps: true, // Sequelize will manage createdAt and updatedAt
    hooks: {
      beforeValidate: (category) => {
        if (category.name && !category.slug) {
          category.slug = slugify(category.name, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        } else if (category.slug) {
          // Ensure slug is in correct format if provided directly
          category.slug = slugify(category.slug, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        }
      },
      beforeUpdate: async (category) => {
        if (category.changed("name")) {
          category.slug = slugify(category.name, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        } else if (category.changed("slug") && category.slug) {
          category.slug = slugify(category.slug, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g,
          });
        }
      },
    },
  }
);

export default Category;
```

## File: src/models/user.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    avatarUrl: {
      type: DataTypes.STRING, // URL to the avatar image (e.g., stored on B2)
      allowNull: true,
    },
    avatarUrlExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    b2AvatarFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2AvatarFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT, // For longer text
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      allowNull: false,
      defaultValue: "user",
    },
  },
  {
    timestamps: true,
  }
);

export default User;
```

## File: src/routes/categoryRoutes.js
```javascript
import express from "express";
import * as categoryController from "../controllers/categoryController.js";
import {
  validateGetCategoriesQuery,
  validateGetCategoryParams,
  validateSearchCategoriesByTagParams,
  validateSearchCategoriesByNameQuery,
} from "../validators/categoryValidators.js";
// import authMiddleware from "../middlewares/authMiddleware.js"; // Assuming you have this

const router = express.Router();

// Public routes
router.get("/", validateGetCategoriesQuery, categoryController.getCategories);

/**
 * @route   GET /api/categories/search
 * @desc    Tìm kiếm Categories theo tag.
 * @access  Public
 */
router.get(
  "/search",
  validateSearchCategoriesByTagParams,
  categoryController.searchCategoriesByTag
);

/**
 * @route   GET /api/categories/search/name
 * @desc    Tìm kiếm Categories theo tên.
 * @access  Public
 */
router.get(
  "/search/name",
  validateSearchCategoriesByNameQuery,
  categoryController.searchCategoriesByName
);

router.get(
  "/:categoryIdOrSlug",
  validateGetCategoryParams,
  categoryController.getCategoryDetails
);

// Routes requiring authentication (e.g., if users can suggest categories or some other interaction)
// router.post("/suggest", authMiddleware, ...categoryController.suggestCategory);

export default router;
```

## File: src/routes/webhookRoutes.js
```javascript
import express from "express";
import {
  handleStreamEvent,
  handleStreamRecordDone,
} from "../controllers/webhookController.js";

import { verifyWebhookTokenInParam } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Endpoint cho media server gửi sự kiện stream
// Ví dụ: POST /api/webhook/stream-event
router.post(
  "/stream-event/:webhookToken",
  verifyWebhookTokenInParam,
  handleStreamEvent
);

// Endpoint cho Nginx thông báo khi đã ghi hình xong file VOD
// Ví dụ: POST /api/webhook/record-done/:webhookToken
router.post(
  "/record-done/:webhookToken",
  verifyWebhookTokenInParam,
  handleStreamRecordDone
);

export default router;
```

## File: src/config/database.js
```javascript
import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "../utils/logger.js";
dotenv.config();

// Determine the environment
const env = process.env.NODE_ENV || "development";

// Construct the path to config.json
// Assuming the script is run from the project root or src, and config.json is in config/
let configPath;
if (fs.existsSync(path.join(process.cwd(), "config", "config.json"))) {
  configPath = path.join(process.cwd(), "config", "config.json");
} else if (
  fs.existsSync(path.join(process.cwd(), "..", "config", "config.json"))
) {
  // If run from src/
  configPath = path.join(process.cwd(), "..", "config", "config.json");
} else {
  throw new Error("Could not find config/config.json. CWD: " + process.cwd());
}

// Read and parse config.json
const configFile = fs.readFileSync(configPath, "utf8");
const config = JSON.parse(configFile)[env];

if (!config || !config.dialect) {
  throw new Error(
    `Database configuration for environment '${env}' not found or dialect is missing in config/config.json`
  );
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: config.dialect,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export default sequelize;
```

## File: src/models/index.js
```javascript
import sequelize from "../config/database.js";
import User from "./user.js";
import Stream from "./stream.js";
import VOD from "./vod.js";
import Category from "./category.js";
import Follow from "./follow.js";
import Notification from "./notification.js";
import TokenBlacklist from "./TokenBlacklist.js";

// --- Định nghĩa Associations ---

// User <-> Stream (One-to-Many)
User.hasMany(Stream, {
  foreignKey: "userId",
  as: "streams",
  onDelete: "CASCADE",
});
Stream.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User <-> VOD (One-to-Many)
User.hasMany(VOD, {
  foreignKey: "userId",
  as: "vods",
  onDelete: "CASCADE",
});
VOD.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Stream <-> VOD (One-to-Many)
Stream.hasMany(VOD, {
  foreignKey: "streamId",
  as: "vods",
  onDelete: "CASCADE",
});
VOD.belongsTo(Stream, {
  foreignKey: "streamId",
  as: "stream",
});

// Category <-> Stream (One-to-Many)
Category.hasMany(Stream, {
  foreignKey: "categoryId",
  as: "streams",
  onDelete: "SET NULL",
});
Stream.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// Category <-> VOD (One-to-Many)
Category.hasMany(VOD, {
  foreignKey: "categoryId",
  as: "categoryVods",
  onDelete: "SET NULL",
});
VOD.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// --- Associations cho Follow và Notification (theo task.md) ---

// User <-> Follow
User.hasMany(Follow, {
  foreignKey: "followerId",
  as: "followers",
  onDelete: "CASCADE",
});
User.hasMany(Follow, {
  foreignKey: "followingId",
  as: "following",
  onDelete: "CASCADE",
});
Follow.belongsTo(User, { foreignKey: "followerId", as: "follower" });
Follow.belongsTo(User, { foreignKey: "followingId", as: "following" });

// User <-> Notification
User.hasMany(Notification, {
  foreignKey: "userId",
  as: "notifications",
  onDelete: "CASCADE",
});
Notification.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// --- Export Models và Sequelize Instance ---

export {
  sequelize,
  User,
  Stream,
  VOD,
  Category,
  Follow,
  Notification,
  TokenBlacklist,
};
```

## File: src/models/stream.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Stream = sequelize.define(
  "Stream",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users", // Giữ nguyên tham chiếu bằng chuỗi tên bảng
        key: "id",
      },
    },
    streamKey: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("live", "ended"),
      defaultValue: "ended",
      allowNull: false,
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    viewerCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnailUrlExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    b2ThumbnailFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2ThumbnailFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "categories",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    // createdAt and updatedAt are handled by Sequelize timestamps: true
  },
  {
    timestamps: true, // Enable automatic createdAt and updatedAt fields
  }
);

export default Stream;
```

## File: src/validators/categoryValidators.js
```javascript
import { body, param, query } from "express-validator";

export const validateCreateCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters."
    ),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array.")
    .custom((tags) => {
      if (!tags.every((tag) => typeof tag === "string")) {
        throw new Error("Each tag must be a string.");
      }
      return true;
    }),
  // thumbnailFile will be handled by multer and service layer
];

export const validateUpdateCategory = [
  param("categoryIdOrSlug")
    .notEmpty()
    .withMessage("Category ID or Slug must be provided in URL path."),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category name cannot be empty.")
    .isLength({ min: 2, max: 100 })
    .withMessage("Category name must be between 2 and 100 characters."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters."
    ),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array.")
    .custom((tags) => {
      if (!tags.every((tag) => typeof tag === "string")) {
        throw new Error("Each tag must be a string.");
      }
      return true;
    }),
  // thumbnailFile will be handled by multer and service layer
];

export const validateGetCategoryParams = [
  // For getting a single category by ID or Slug
  param("categoryIdOrSlug")
    .notEmpty()
    .withMessage("Category ID or Slug must be provided in URL path."),
];

export const validateGetCategoriesQuery = [
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
];

export const validateSearchCategoriesByTagParams = [
  query("tag")
    .trim()
    .notEmpty()
    .withMessage("Search tag cannot be empty.")
    .isString()
    .withMessage("Search tag must be a string."),
  // Optional pagination for categories search results
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
];

export const validateSearchCategoriesByNameQuery = [
  query("q")
    .trim()
    .notEmpty()
    .withMessage("Search query 'q' cannot be empty.")
    .isString()
    .withMessage("Search query 'q' must be a string."),
  // Optional pagination for categories search results
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
];
```

## File: src/controllers/categoryController.js
```javascript
import {
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
  getCategoriesService,
  getCategoryDetailsService,
  searchCategoriesByTagService,
  searchCategoriesByNameService,
} from "../services/categoryService.js";
import { validationResult, matchedData } from "express-validator";
import { AppError } from "../utils/errorHandler.js";
import fs from "fs/promises";
import logger from "../utils/logger.js";

export const createCategory = async (req, res, next) => {
  let thumbnailFilePathTemp = null;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const validatedData = matchedData(req);
    const userIdForPath = req.user?.id; // Or some other logic for B2 path

    const servicePayload = {
      ...validatedData, // name, description, slug (optional), tags (optional)
      thumbnailFilePath: req.file?.path,
      originalThumbnailFileName: req.file?.originalname,
      thumbnailMimeType: req.file?.mimetype,
      userIdForPath: "_admin_created", // Example path segment for admin-created categories
    };
    if (req.file) thumbnailFilePathTemp = req.file.path;

    const category = await createCategoryService(servicePayload);

    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (unlinkError) {
        logger.error(
          "Controller: Error deleting temp thumbnail after category creation:",
          unlinkError
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (e) {
        logger.error("Cleanup error:", e);
      }
    }
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  let thumbnailFilePathTemp = null;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const { categoryIdOrSlug } = req.params;
    const validatedData = matchedData(req);

    const servicePayload = {
      ...validatedData, // name, description, slug (optional), tags (optional)
      thumbnailFilePath: req.file?.path,
      originalThumbnailFileName: req.file?.originalname,
      thumbnailMimeType: req.file?.mimetype,
      userIdForPath: "_admin_updated",
    };
    if (req.file) thumbnailFilePathTemp = req.file.path;

    const category = await updateCategoryService(
      categoryIdOrSlug,
      servicePayload
    );

    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (e) {
        logger.error("Cleanup error:", e);
      }
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
      } catch (e) {
        logger.error("Cleanup error:", e);
      }
    }
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }
    const { categoryIdOrSlug } = req.params;
    await deleteCategoryService(categoryIdOrSlug);
    res
      .status(200)
      .json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }
    const { page, limit } = matchedData(req, { locations: ["query"] });
    const result = await getCategoriesService({ page, limit });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getCategoryDetails = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }
    const { categoryIdOrSlug } = req.params;
    const category = await getCategoryDetailsService(categoryIdOrSlug);
    if (!category) {
      throw new AppError("Category not found", 404);
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const searchCategoriesByTag = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const {
      tag,
      page = 1,
      limit = 10,
    } = matchedData(req, { locations: ["query"] });

    const result = await searchCategoriesByTagService({
      tag,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully by tag",
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      tagSearched: tag,
      categories: result.categories,
    });
  } catch (error) {
    logger.error("Controller: Error searching categories by tag:", error);
    next(error);
  }
};

export const searchCategoriesByName = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const {
      q,
      page = 1,
      limit = 10,
    } = matchedData(req, { locations: ["query"] });

    if (!q) {
      // This case should ideally be caught by validator, but as a safeguard
      return res.status(200).json({
        success: true,
        message: "Search query is empty, returning empty result.",
        totalItems: 0,
        totalPages: 0,
        currentPage: parseInt(page, 10),
        query: "",
        categories: [],
      });
    }

    const result = await searchCategoriesByNameService({
      query: q,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    res.status(200).json({
      success: true,
      message: "Categories fetched successfully by name",
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      query: q,
      categories: result.categories,
    });
  } catch (error) {
    logger.error("Controller: Error searching categories by name:", error);
    next(error);
  }
};
```

## File: src/lib/b2.service.js
```javascript
import B2 from "backblaze-b2";
import uploadAnyExtension from "@gideo-llc/backblaze-b2-upload-any"; // Import extension
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config(); // Load environment variables from .env file

// Install the uploadAny extension (Intrusive way)
uploadAnyExtension.install(B2);

// Load configuration from environment variables
const APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_ID = process.env.B2_BUCKET_ID;
const BUCKET_NAME = process.env.B2_BUCKET_NAME;
// B2_DOWNLOAD_HOST is used if constructing URLs manually,
// but b2.authorize() provides the most accurate downloadUrl (account's base download URL)

if (!APPLICATION_KEY_ID || !APPLICATION_KEY || !BUCKET_ID || !BUCKET_NAME) {
  logger.error(
    "Missing Backblaze B2 environment variables. Please check your .env file."
  );
  // Optionally, throw an error or exit if configuration is critical
  // process.exit(1);
}

const b2 = new B2({
  applicationKeyId: APPLICATION_KEY_ID,
  applicationKey: APPLICATION_KEY,
});

/**
 * Authorizes with B2. This should be called before any B2 operations.
 * Returns the authorization data including the downloadUrl.
 * @returns {Promise<object>} Authorization data from B2, including downloadUrl.
 */
async function authorizeB2() {
  try {
    const authData = await b2.authorize();
    return authData.data;
  } catch (error) {
    logger.error("Error authorizing with Backblaze B2:", error);
    throw error;
  }
}

/**
 * Uploads a video file stream and/or a thumbnail file stream to Backblaze B2
 * using @gideo-llc/backblaze-b2-upload-any extension
 * and generates pre-signed URLs for private access.
 *
 * @param {import('stream').Readable} [videoStream] - Optional readable stream of the video file.
 * @param {number} [videoSize] - Optional size of the video file in bytes.
 * @param {string} [videoFileNameInB2] - Optional desired file name for the video in B2.
 * @param {string} [videoMimeType] - Optional MIME type of the video file.
 * @param {import('stream').Readable} [thumbnailStream] - Optional readable stream of the thumbnail file.
 * @param {number} [thumbnailSize] - Optional size of the thumbnail file in bytes.
 * @param {string} [thumbnailFileNameInB2] - Optional desired file name for the thumbnail in B2.
 * @param {string} [thumbnailMimeType] - Optional MIME type of the thumbnail file.
 * @param {number} [durationSeconds=0] - Duration of the video in seconds (if video is uploaded).
 * @param {number} [presignedUrlDurationSecs=parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 25200] - Duration for pre-signed URLs.
 * @returns {Promise<object>} - An object containing B2 file info and pre-signed URLs.
 *                             Format: { video: videoUploadResult|null, thumbnail: thumbnailUploadResult|null, message: string }
 */
async function uploadToB2AndGetPresignedUrl(
  videoStream,
  videoSize,
  videoFileNameInB2,
  videoMimeType,
  thumbnailStream,
  thumbnailSize,
  thumbnailFileNameInB2,
  thumbnailMimeType,
  durationSeconds = 0,
  presignedUrlDurationSecs = parseInt(
    process.env.B2_PRESIGNED_URL_DURATION_SECONDS
  ) || 25200 // Default to 7 hours for general files
) {
  try {
    const authData = await authorizeB2();
    const accountDownloadUrl = authData.downloadUrl;

    let videoUploadResult = null;
    let thumbnailUploadResult = null;

    // Check if at least one file type is provided for upload
    const hasVideoToUpload = videoStream && videoFileNameInB2 && videoMimeType;
    const hasThumbnailToUpload =
      thumbnailStream &&
      thumbnailFileNameInB2 &&
      thumbnailMimeType &&
      thumbnailSize > 0;

    if (!hasVideoToUpload && !hasThumbnailToUpload) {
      throw new Error("No video or thumbnail data provided for upload.");
    }

    // --- Upload Video (if provided) ---
    if (hasVideoToUpload) {
      logger.info(
        `Uploading video stream ${videoFileNameInB2} using uploadAny...`
      );
      const uploadedVideoResponse = await b2.uploadAny({
        bucketId: BUCKET_ID,
        fileName: videoFileNameInB2,
        data: videoStream,
        contentType: videoMimeType,
      });
      const videoB2FileId =
        uploadedVideoResponse.fileId || uploadedVideoResponse.data?.fileId;
      const videoB2FileName =
        uploadedVideoResponse.fileName || uploadedVideoResponse.data?.fileName;

      if (!videoB2FileId || !videoB2FileName) {
        logger.error(
          "uploadAny video response missing fileId or fileName:",
          uploadedVideoResponse
        );
        throw new Error(
          "Failed to get fileId or fileName from B2 uploadAny video response."
        );
      }
      logger.info(
        `Video ${videoB2FileName} (ID: ${videoB2FileId}) uploaded to B2 via uploadAny.`
      );

      const { data: videoDownloadAuth } = await b2.getDownloadAuthorization({
        bucketId: BUCKET_ID,
        fileNamePrefix: videoB2FileName,
        validDurationInSeconds: presignedUrlDurationSecs,
      });
      const videoViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${videoB2FileName}?Authorization=${videoDownloadAuth.authorizationToken}`;
      const videoUrlExpiresAt = new Date(
        Date.now() + presignedUrlDurationSecs * 1000
      );
      videoUploadResult = {
        b2FileId: videoB2FileId,
        b2FileName: videoB2FileName,
        url: videoViewableUrl,
        urlExpiresAt: videoUrlExpiresAt,
        mimeType: videoMimeType,
        durationSeconds: durationSeconds,
      };
    }

    // --- Upload Thumbnail (if provided) ---
    if (hasThumbnailToUpload) {
      // Use a different presigned URL duration for images if specified, otherwise fallback to general duration
      const imagePresignedUrlDurationSecs =
        parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
        presignedUrlDurationSecs;
      logger.info(
        `Uploading thumbnail stream ${thumbnailFileNameInB2} using uploadAny...`
      );
      const uploadedThumbResponse = await b2.uploadAny({
        bucketId: BUCKET_ID,
        fileName: thumbnailFileNameInB2,
        data: thumbnailStream,
        contentType: thumbnailMimeType,
      });
      const thumbnailB2FileId =
        uploadedThumbResponse.fileId || uploadedThumbResponse.data?.fileId;
      const thumbnailB2FileName =
        uploadedThumbResponse.fileName || uploadedThumbResponse.data?.fileName;

      if (!thumbnailB2FileId || !thumbnailB2FileName) {
        logger.error(
          "uploadAny thumbnail response missing fileId or fileName:",
          uploadedThumbResponse
        );
        throw new Error(
          "Failed to get fileId or fileName from B2 uploadAny thumbnail response."
        );
      }
      logger.info(
        `Thumbnail ${thumbnailB2FileName} (ID: ${thumbnailB2FileId}) uploaded to B2 via uploadAny.`
      );

      const { data: thumbDownloadAuth } = await b2.getDownloadAuthorization({
        bucketId: BUCKET_ID,
        fileNamePrefix: thumbnailB2FileName,
        validDurationInSeconds: imagePresignedUrlDurationSecs, // Use image specific duration
      });
      const thumbnailViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${thumbnailB2FileName}?Authorization=${thumbDownloadAuth.authorizationToken}`;
      const thumbnailUrlExpiresAt = new Date(
        Date.now() + imagePresignedUrlDurationSecs * 1000
      );
      thumbnailUploadResult = {
        b2FileId: thumbnailB2FileId,
        b2FileName: thumbnailB2FileName,
        url: thumbnailViewableUrl,
        urlExpiresAt: thumbnailUrlExpiresAt,
        mimeType: thumbnailMimeType,
      };
    }

    let message = "Upload process completed.";
    if (videoUploadResult && thumbnailUploadResult) {
      message =
        "Video and thumbnail uploaded successfully and pre-signed URLs generated.";
    } else if (videoUploadResult) {
      message = "Video uploaded successfully and pre-signed URL generated.";
    } else if (thumbnailUploadResult) {
      message = "Thumbnail uploaded successfully and pre-signed URL generated.";
    }

    return {
      video: videoUploadResult,
      thumbnail: thumbnailUploadResult,
      message: message,
    };
  } catch (error) {
    logger.error(
      `Error in B2 service (video: ${videoFileNameInB2 || "N/A"}, thumb: ${
        thumbnailFileNameInB2 || "N/A"
      }):`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      logger.error("B2 API Error Details:", error.response.data);
    }
    let errorToThrow = new Error(`B2 service error: ${error.message}`);
    // Preserve any file IDs that might have been uploaded before an error occurred for potential cleanup
    // This part might need more sophisticated handling if one upload succeeds and the other fails.
    // For now, this error throwing is generic.
    throw errorToThrow;
  }
}

/**
 * Generates a new pre-signed URL for an existing private file in B2.
 * @param {string} b2FileName - The name of the file in B2 (e.g., vods/streamkey-timestamp.flv).
 * @param {number} [presignedUrlDuration=3600] - Duration in seconds for which the new URL is valid.
 * @returns {Promise<string>} - The new pre-signed URL.
 */
async function generatePresignedUrlForExistingFile(
  b2FileName,
  presignedUrlDuration = 3600
) {
  try {
    const authData = await authorizeB2();
    const accountDownloadUrl = authData.downloadUrl;

    const {
      data: { authorizationToken: newDownloadAuthToken },
    } = await b2.getDownloadAuthorization({
      bucketId: BUCKET_ID,
      fileNamePrefix: b2FileName,
      validDurationInSeconds: presignedUrlDuration,
    });

    const newPresignedUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${b2FileName}?Authorization=${newDownloadAuthToken}`;
    logger.info(`Generated new pre-signed URL for ${b2FileName}`);
    return newPresignedUrl;
  } catch (error) {
    logger.error(
      `Error generating pre-signed URL for existing file ${b2FileName}:`,
      error
    );
    throw error;
  }
}

/**
 * Deletes a file from Backblaze B2 using its file name and file ID.
 * @param {string} fileName - The name of the file in B2.
 * @param {string} fileId - The ID of the file in B2.
 * @returns {Promise<object>} - The response data from B2 on successful deletion.
 */
async function deleteFileFromB2(fileName, fileId) {
  try {
    logger.info(
      `Attempting to delete file from B2: ${fileName} (ID: ${fileId})`
    );
    const response = await b2.deleteFileVersion({
      fileName: fileName,
      fileId: fileId,
    });
    logger.info(
      `Successfully deleted file from B2: ${fileName} (ID: ${fileId})`
    );
    return response.data;
  } catch (error) {
    // Log detailed error information
    logger.error(`Failed to delete file from B2: ${fileName} (ID: ${fileId})`, {
      errorMessage: error.message,
      errorCode: error.code,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
    });
    // Re-throw the error to be handled by the calling function
    throw new Error(`Could not delete file ${fileName} from B2.`);
  }
}

export {
  authorizeB2,
  uploadToB2AndGetPresignedUrl,
  generatePresignedUrlForExistingFile,
  deleteFileFromB2,
};
```

## File: src/middlewares/uploadMiddleware.js
```javascript
import multer from "multer";
import path from "path";
import fs from "fs"; // Thêm fs để kiểm tra và tạo thư mục
import dotenv from "dotenv"; // Thêm dotenv
import logger from "../utils/logger.js";

dotenv.config(); // Tải biến môi trường

// Đọc đường dẫn thư mục tạm từ biến môi trường
const tempUploadDir = process.env.TMP_UPLOAD_DIR;

logger.info(`Thư mục upload tạm thời được cấu hình là: ${tempUploadDir}`); // Ghi log để kiểm tra

// Đảm bảo thư mục uploads/tmp tồn tại
if (!fs.existsSync(tempUploadDir)) {
  try {
    fs.mkdirSync(tempUploadDir, { recursive: true });
    logger.info(`Thư mục tạm được tạo tại: ${tempUploadDir}`);
  } catch (err) {
    logger.error(`Lỗi khi tạo thư mục tạm tại ${tempUploadDir}:`, err);
    throw new Error(`Không thể tạo thư mục upload tạm: ${tempUploadDir}`);
  }
}

// Cấu hình lưu trữ cho multer (lưu vào ổ đĩa)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempUploadDir); // Thư mục lưu file tạm
  },
  filename: function (req, file, cb) {
    // Tạo tên file duy nhất để tránh ghi đè, giữ lại phần extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Hàm kiểm tra loại file (chỉ chấp nhận video và ảnh cho các field tương ứng)
const fileFilter = (req, file, cb) => {
  const allowedVideoMimeTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime", // .mov
    "video/x-msvideo", // .avi
    "video/x-flv", // .flv
    "video/webm",
    "video/x-matroska", // .mkv
  ];
  const allowedImageMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (
    file.fieldname === "videoFile" &&
    allowedVideoMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else if (
    file.fieldname === "thumbnailFile" &&
    allowedImageMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else if (
    file.fieldname === "avatarFile" &&
    allowedImageMimeTypes.includes(file.mimetype)
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Định dạng file không hợp lệ cho field ${file.fieldname}. Kiểm tra lại các định dạng được chấp nhận.`
      ),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 500, // Giới hạn kích thước file: 500MB
  },
});

export default upload;
```

## File: src/socketHandlers.js
```javascript
import jwt from "jsonwebtoken";
// import mongoose from "mongoose"; // Không cần trực tiếp nữa
import dotenv from "dotenv";
import {
  saveChatMessage,
  getChatHistoryByStreamId,
} from "./services/chatService.js";
import {
  getStreamKeyAndStatusById,
  incrementLiveViewerCount,
  decrementLiveViewerCount,
  // getLiveViewerCount, // Không cần trực tiếp ở đây nữa nếu viewer_count_updated gửi count
} from "./services/streamService.js"; // Import stream service functions
import appEmitter from "./utils/appEvents.js"; // Sửa đường dẫn import
import logger from "./utils/logger.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
// const MONGODB_URI = process.env.MONGODB_URI; // Không cần trực tiếp nữa

// Kết nối MongoDB đã chuyển sang src/config/mongodb.js và gọi ở src/index.js

// Định nghĩa Schema và Model cho ChatMessage đã chuyển sang src/models/mongo/ChatMessage.js
// const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', chatMessageSchema);

const initializeSocketHandlers = (io) => {
  // Middleware xác thực JWT cho Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token; // Client gửi token qua socket.handshake.auth
    if (!token) {
      return next(new Error("Authentication error: Token not provided"));
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.error("Socket JWT verification error:", err.message);
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded; // Gán thông tin user vào socket
      // Lưu trữ map của roomId (streamId) tới streamKey
      socket.joinedStreamData = new Map(); // Map<roomIdString, streamKeyString>
      next();
    });
  });

  // Lắng nghe sự kiện stream kết thúc từ appEmitter
  appEmitter.on("stream:ended", ({ streamId, streamKey }) => {
    const roomId = streamId; // streamId đã là string từ emitter
    logger.info(
      `'stream:ended' event received in socketHandlers for roomId: ${roomId}, streamKey: ${streamKey}.`
    );
    // Thông báo cho tất cả client trong phòng rằng stream đã kết thúc
    io.to(roomId).emit("stream_ended_notification", {
      roomId: roomId,
      message: `Stream ${streamKey} has ended. Chat is now disabled for this room.`,
    });

    // Buộc tất cả các socket trong phòng này rời khỏi phòng
    // io.socketsLeave(roomId) không được khuyến khích trực tiếp, thay vào đó dùng io.in(roomId).disconnectSockets(true) (Socket.IO v4+)
    // Hoặc lấy danh sách sockets và cho từng cái leave
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketsInRoom) {
      socketsInRoom.forEach((socketId) => {
        const socketInstance = io.sockets.sockets.get(socketId);
        if (socketInstance) {
          socketInstance.leave(roomId);
          // Xóa dữ liệu phòng đã join khỏi socket đó nếu cần, tuy nhiên sự kiện disconnect của socket đó sẽ tự xử lý joinedStreamData
          logger.info(
            `Socket ${socketId} forcefully left room ${roomId} because stream ended.`
          );
        }
      });
    } else {
      logger.info(
        `No sockets found in room ${roomId} to remove after stream ended.`
      );
    }
    // Hoặc một cách đơn giản hơn nếu chỉ muốn họ không nhận thêm event từ phòng này và để client tự xử lý:
    // io.in(roomId).emit('force_leave_room', { roomId }); // Client sẽ phải lắng nghe sự kiện này và tự gọi socket.leave
    // Tuy nhiên, io.socketsLeave(roomId); hoặc lặp và gọi leave là cách server-side chủ động hơn.
    // Với Socket.IO v4, cách tốt nhất là:
    // io.in(roomId).disconnectSockets(true); // true để đóng kết nối ngầm
    // Nếu bạn dùng io.socketsLeave, nó có thể không hoạt động như mong đợi trong mọi trường hợp.
    // Sử dụng lặp qua các socket và .leave() là một cách an toàn hơn nếu io.socketsLeave() không hoạt động.

    // Xem xét sử dụng io.in(roomId).disconnectSockets(true) cho Socket.IO v4+
    // Dòng dưới đây sẽ cố gắng ngắt kết nối các client trong phòng đó.
    // Điều này cũng sẽ kích hoạt sự kiện 'disconnect' trên từng client, nơi bạn đã có logic dọn dẹp.
    io.in(roomId).disconnectSockets(true);
    logger.info(`Attempted to disconnect sockets in room ${roomId}.`);
  });

  io.on("connection", (socket) => {
    logger.info(
      `User connected: ${socket.id}, UserInfo: ${socket.user?.username}`
    );

    // Sự kiện để tham gia phòng notification cá nhân
    socket.on("join_notification_room", () => {
      if (socket.user && socket.user.id) {
        const userId = socket.user.id.toString();
        const notificationRoom = `notification:${userId}`;
        socket.join(notificationRoom);
        logger.info(
          `User ${socket.user.username} (${socket.id}) joined notification room: ${notificationRoom}`
        );
        socket.emit("notification_room_joined", { room: notificationRoom });
      } else {
        logger.warn(
          `User ${socket.id} tried to join notification room without valid user context.`
        );
        socket.emit("notification_room_join_error", {
          message: "Authentication required to join notification room.",
        });
      }
    });

    socket.on("join_stream_room", async (data) => {
      const { streamId } = data;
      const roomId = streamId?.toString();

      if (!roomId) {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) tried to join with null/undefined streamId`
        );
        socket.emit("room_join_error", { message: "Stream ID is required." });
        return;
      }

      try {
        const streamDetails = await getStreamKeyAndStatusById(streamId);

        if (!streamDetails || !streamDetails.streamKey) {
          logger.warn(
            `Stream not found or streamKey missing for streamId ${roomId} when user ${socket.user.username} (${socket.id}) tried to join.`
          );
          socket.emit("room_join_error", { message: "Stream not found." });
          return;
        }

        const { streamKey, status } = streamDetails;

        if (status !== "live") {
          logger.warn(
            `User ${socket.user.username} (${socket.id}) tried to join stream ${streamKey} (ID: ${roomId}) which is not live (status: ${status}).`
          );
          socket.emit("room_join_error", { message: "Stream is not live." });
          return;
        }

        socket.join(roomId); // Join phòng bằng streamId (roomId)
        socket.joinedStreamData.set(roomId, streamKey); // Lưu lại mapping

        logger.info(
          `User ${socket.user.username} (${socket.id}) joined room (streamId): ${roomId} (maps to streamKey: ${streamKey})`
        );

        // Gửi lịch sử chat gần đây cho user vừa join
        try {
          const chatHistory = await getChatHistoryByStreamId(roomId, {
            page: 1,
            limit: 20,
          }); // Lấy 20 tin nhắn gần nhất
          if (
            chatHistory &&
            chatHistory.messages &&
            chatHistory.messages.length > 0
          ) {
            socket.emit("recent_chat_history", {
              streamId: roomId,
              messages: chatHistory.messages,
            });
            logger.info(
              `Sent recent chat history to ${socket.user.username} for room ${roomId} (${chatHistory.messages.length} messages).`
            );
          }
        } catch (historyError) {
          logger.error(
            `Error fetching recent chat history for room ${roomId}:`,
            historyError
          );
          // Không cần gửi lỗi cho client ở đây, vì join phòng vẫn thành công
        }

        const userId = socket.user.id;
        const currentViewers = await incrementLiveViewerCount(
          streamKey,
          userId
        );
        if (currentViewers !== null) {
          // Phát tới phòng có tên là roomId (streamId)
          io.to(roomId).emit("viewer_count_updated", {
            streamId: roomId, // hoặc streamKey tùy theo client muốn định danh thế nào
            count: currentViewers,
          });
        }
        socket.emit("room_joined_successfully", {
          streamId: roomId,
          streamKeyForDev: streamKey,
        }); // Gửi streamId về cho client

        // Optionally, fetch and send recent chat messages or notify others
        // socket.to(streamKey).emit('user_joined_chat', { username: socket.user.username, message: 'has joined the chat.' });
      } catch (error) {
        logger.error(
          `Error during join_stream_room for streamId ${roomId} by user ${socket.user.username} (${socket.id}):`,
          error
        );
        socket.emit("room_join_error", {
          message: "Error joining stream. Please try again.",
        });
      }
    });

    socket.on("chat_message", async (data) => {
      const { streamId, message } = data; // Client gửi streamId (có thể là số hoặc chuỗi)
      const roomId = streamId?.toString(); // roomId chắc chắn là chuỗi, dùng cho tên phòng socket

      if (!roomId || !message) {
        logger.warn(
          "Received chat_message with missing streamId or message:",
          data
        );
        socket.emit("message_error", {
          message: "Stream ID and message are required.",
        });
        return;
      }

      if (!socket.rooms.has(roomId)) {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) sent message to room ${roomId} they are not in.`
        );
        socket.emit("message_error", {
          message: `You are not in room ${roomId}.`,
        });
        return;
      }

      // Lấy streamKey từ map đã lưu nếu cần cho các mục đích khác (không cần cho saveChatMessage nếu nó dùng streamId)
      // const streamKey = socket.joinedStreamData.get(roomId);

      try {
        const savedMessage = await saveChatMessage({
          streamId: roomId, // LUÔN DÙNG roomId (là streamId.toString()) để đảm bảo là chuỗi cho MongoDB
          userId: socket.user.id,
          username: socket.user.username,
          message,
        });

        // Broadcast tin nhắn đến tất cả client trong phòng streamId (roomId)
        io.to(roomId).emit("new_message", {
          userId: savedMessage.userId,
          username: savedMessage.username,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp,
          streamId: roomId, // Trả về streamId (roomId) cho client
        });
      } catch (error) {
        logger.error(
          `Error saving or broadcasting chat message for room ${roomId}:`,
          error
        );
        socket.emit("message_error", {
          message: "Could not process your message.",
        });
      }
    });

    socket.on("leave_stream_room", async (data) => {
      const { streamId } = data;
      const roomId = streamId?.toString();
      if (!roomId) {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) tried to leave with null/undefined streamId`
        );
        return;
      }

      const streamKey = socket.joinedStreamData.get(roomId); // Lấy streamKey từ map

      if (socket.rooms.has(roomId)) {
        socket.leave(roomId);
        if (streamKey) {
          socket.joinedStreamData.delete(roomId); // Xóa mapping
          logger.info(
            `User ${socket.user.username} (${socket.id}) left room (streamId): ${roomId} (was mapped to streamKey: ${streamKey})`
          );

          const userId = socket.user.id;
          const currentViewers = await decrementLiveViewerCount(
            streamKey,
            userId
          );
          if (currentViewers !== null) {
            io.to(roomId).emit("viewer_count_updated", {
              streamId: roomId,
              count: currentViewers,
            });
          }
        } else {
          logger.warn(
            `User ${socket.user.username} (${socket.id}) left room (streamId): ${roomId}, but no streamKey was mapped. No Redis update.`
          );
        }
      } else {
        logger.warn(
          `User ${socket.user.username} (${socket.id}) tried to leave room ${roomId} they were not in.`
        );
      }
    });

    socket.on("disconnect", async () => {
      logger.info(
        `User disconnected: ${socket.id}, UserInfo: ${socket.user?.username}. Cleaning up joined rooms.`
      );
      if (
        socket.user &&
        socket.joinedStreamData &&
        socket.joinedStreamData.size > 0
      ) {
        const userId = socket.user.id;
        for (const [roomId, streamKey] of socket.joinedStreamData.entries()) {
          try {
            logger.info(
              `Processing disconnect for user ${socket.user?.username} from room (streamId): ${roomId} (mapped to streamKey: ${streamKey})`
            );
            const currentViewers = await decrementLiveViewerCount(
              streamKey,
              userId
            );
            if (currentViewers !== null) {
              // Vẫn phát tới phòng dựa trên roomId (streamId)
              io.to(roomId).emit("viewer_count_updated", {
                streamId: roomId,
                count: currentViewers,
              });
              logger.info(
                `Sent viewer_count_updated to room ${roomId} after user ${socket.user?.username} disconnected. New count: ${currentViewers}`
              );
            }
          } catch (error) {
            logger.error(
              `Error decrementing viewer count for streamKey ${streamKey} (room ${roomId}) on disconnect for user ${socket.user?.username}:`,
              error
            );
          }
        }
        socket.joinedStreamData.clear();
      }
    });
  });
};

export default initializeSocketHandlers;
```

## File: src/validators/vodValidator.js
```javascript
import { body, param, query } from "express-validator";

// Validator cho việc tạo/upload VOD thủ công bởi admin
const manualUploadVOD = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Tiêu đề VOD không được để trống.")
    .isLength({ min: 3, max: 255 })
    .withMessage("Tiêu đề VOD phải từ 3 đến 255 ký tự."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự."),

  // Các trường này là bắt buộc khi upload thủ công VOD đã có trên B2
  body("videoUrl")
    .trim()
    .notEmpty()
    .withMessage("videoUrl (pre-signed URL từ B2) không được để trống.")
    .isURL()
    .withMessage("videoUrl phải là một URL hợp lệ."),
  body("urlExpiresAt")
    .notEmpty()
    .withMessage(
      "urlExpiresAt (thời điểm hết hạn của videoUrl) không được để trống."
    )
    .isISO8601()
    .withMessage("urlExpiresAt phải là một ngày hợp lệ theo định dạng ISO8601.")
    .toDate(), // Chuyển đổi thành Date object
  body("b2FileId")
    .trim()
    .notEmpty()
    .withMessage("b2FileId (ID file trên B2) không được để trống."),
  body("b2FileName")
    .trim()
    .notEmpty()
    .withMessage("b2FileName (tên file trên B2) không được để trống."),
  body("durationSeconds")
    .notEmpty()
    .withMessage(
      "durationSeconds (thời lượng video tính bằng giây) không được để trống."
    )
    .isInt({ gt: 0 })
    .withMessage("durationSeconds phải là một số nguyên dương.")
    .toInt(),

  // Các trường tùy chọn
  body("streamId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("streamId (nếu có) phải là một số nguyên dương.")
    .toInt(),
  body("streamKey")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("streamKey (nếu có) không được để trống."),
  body("thumbnail")
    .optional()
    .trim()
    .isURL()
    .withMessage("Thumbnail (nếu có) phải là một URL hợp lệ."),
  body("categoryId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Category ID phải là một số nguyên dương (nếu có).")
    .toInt(),
  // userId sẽ được lấy từ token xác thực, không cần validate ở đây
];

// Validator cho việc upload VOD từ file local
const uploadLocalVOD = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Tiêu đề VOD không được để trống.")
    .isLength({ min: 3, max: 255 })
    .withMessage("Tiêu đề VOD phải từ 3 đến 255 ký tự."),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Mô tả không được vượt quá 5000 ký tự."),
  body("categoryId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Category ID phải là một số nguyên dương (nếu có).")
    .toInt(),
  // Các trường tùy chọn khác có thể thêm sau nếu cần
  // File video sẽ được xử lý bởi multer, không cần validate ở đây
  // streamId, streamKey, userId sẽ được xử lý trong controller
];

// Validator cho việc lấy danh sách VODs
const getVODsList = [
  query("streamId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Stream ID phải là số nguyên dương.")
    .toInt(),
  query("userId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("User ID phải là số nguyên dương.")
    .toInt(),
  query("streamKey").optional().isString().trim(),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page phải là số nguyên dương.")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit phải là số nguyên dương.")
    .toInt(),
  query("categoryId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Category ID phải là một số nguyên dương (nếu có).")
    .toInt(),
  // Bạn có thể thêm sortBy, sortOrder ở đây nếu muốn validate chúng chặt chẽ hơn
];

export const validateVodSearchParams = [
  query("tag")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Search tag must be a string if provided.")
    .trim(),
  query("searchQuery")
    .optional()
    .isString()
    .trim()
    .withMessage("Search query must be a string."),
  query("uploaderUsername")
    .optional()
    .isString()
    .trim()
    .withMessage("Uploader username must be a string."),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
  (req, res, next) => {
    const { tag, searchQuery, uploaderUsername } = req.query;
    if (!tag && !searchQuery && !uploaderUsername) {
      return res.status(400).json({
        errors: [
          {
            type: "query",
            msg: "At least one search criteria (tag, searchQuery, or uploaderUsername) must be provided.",
            path: "query",
            location: "query",
          },
        ],
      });
    }
    next();
  },
];

export const vodValidationRules = {
  manualUploadVOD, // Đổi tên từ createVOD để rõ ràng hơn
  uploadLocalVOD,
  getVODsList, // Thêm validator mới
  validateVodSearchParams, // Đổi tên và cập nhật
};
```

## File: src/middlewares/authMiddleware.js
```javascript
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { TokenBlacklist } from "../models/index.js";
import logger from "../utils/logger.js";

dotenv.config(); // Đảm bảo các biến môi trường từ .env được load

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1); // Thoát ứng dụng nếu JWT_SECRET không được cấu hình
}

/**
 * Middleware xác thực JWT.
 * Kiểm tra token từ header Authorization.
 * Nếu hợp lệ, giải mã và gán thông tin user vào req.user.
 * Nếu không hợp lệ hoặc không có, trả về lỗi 401 hoặc 403.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Lấy token từ "Bearer <token>"

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access token is missing or invalid." });
  }

  try {
    // Kiểm tra xem token có trong blacklist không
    const blacklistedToken = await TokenBlacklist.findByPk(token);
    if (blacklistedToken) {
      return res
        .status(401)
        .json({ message: "Token has been invalidated. Please log in again." });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.error("JWT verification error:", err.message);
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ message: "Access token expired." });
        }
        // Các lỗi khác như JsonWebTokenError (token không hợp lệ, chữ ký sai)
        return res.status(403).json({ message: "Access token is not valid." });
      }

      // Token hợp lệ, gán thông tin user đã giải mã vào req.user
      // Payload của bạn khi tạo token cần chứa các thông tin này (ví dụ: id, username)
      req.user = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        // Thêm các trường khác nếu có trong payload của token
      };

      // Gắn token và payload vào request để có thể sử dụng ở bước sau (ví dụ: logout)
      req.token = token;
      req.tokenPayload = decoded;

      logger.debug("User authenticated via JWT:", req.user);
      next();
    });
  } catch (error) {
    logger.error("Error during token authentication:", error);
    return res
      .status(500)
      .json({ message: "Internal server error during authentication." });
  }
};

export default authenticateToken;

// User for production stage
// export function verifyWebhook(req, res, next) {
//   const signature = req.headers["x-webhook-signature"];
//   // Giả sử bạn sẽ lưu WEBHOOK_SECRET trong file .env
//   if (!process.env.WEBHOOK_SECRET) {
//     logger.error("FATAL ERROR: WEBHOOK_SECRET is not defined in .env file.");
//     return res.status(500).json({ message: "Webhook secret not configured." });
//   }
//   if (signature !== process.env.WEBHOOK_SECRET) {
//     logger.warn("Invalid webhook signature received:", signature);
//     return res.status(401).json({ message: "Invalid webhook signature." });
//   }
//   next();
// }

export function verifyWebhookTokenInParam(req, res, next) {
  const receivedToken = req.params.webhookToken;
  const expectedToken = process.env.WEBHOOK_SECRET_TOKEN;

  if (!expectedToken) {
    logger.error(
      "FATAL ERROR: WEBHOOK_SECRET_TOKEN is not defined in .env file."
    );
    return res
      .status(500)
      .json({ message: "Webhook secret token not configured on server." });
  }

  if (receivedToken === expectedToken) {
    next();
  } else {
    logger.warn("Invalid webhook token received in URL param:", receivedToken);
    return res.status(403).json({ message: "Invalid webhook token." });
  }
}
```

## File: src/models/vod.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const VOD = sequelize.define(
  "VOD",
  {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    streamId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Streams",
        key: "id",
      },
    },
    streamKey: {
      // Thêm streamKey để dễ dàng liên kết với thông tin từ Nginx webhook
      type: DataTypes.STRING,
      allowNull: true, // Hoặc false nếu bạn luôn có và yêu cầu streamKey
      // unique: true, // Cân nhắc nếu streamKey phải là duy nhất
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    videoUrl: {
      // Sẽ lưu pre-signed URL
      type: DataTypes.TEXT, // Pre-signed URLs có thể dài
      allowNull: false,
    },
    urlExpiresAt: {
      // Thời điểm pre-signed URL hết hạn
      type: DataTypes.DATE,
      allowNull: false,
    },
    b2FileId: {
      // ID file trên B2
      type: DataTypes.STRING,
      allowNull: true, // Hoặc false nếu đây là thông tin bắt buộc sau khi upload
    },
    b2FileName: {
      // Tên file trên B2
      type: DataTypes.STRING,
      allowNull: true, // Hoặc false
    },
    thumbnailUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    thumbnailUrlExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    b2ThumbnailFileId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    b2ThumbnailFileName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "categories", // Tên bảng Categories
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    durationSeconds: {
      // Đổi tên từ duration để rõ ràng hơn là giây
      type: DataTypes.FLOAT, // Đơn vị: giây (thay đổi từ INTEGER sang FLOAT)
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // createdAt và updatedAt được Sequelize quản lý tự động nếu timestamps: true
  },
  {
    modelName: "VOD",
    timestamps: true,
    // tableName: 'VODs'
  }
);

export default VOD;
```

## File: src/routes/streamRoutes.js
```javascript
import express from "express";
import {
  createStream,
  updateStream,
  getStreams,
  getStreamById,
  searchStreams,
  getVodByStreamId,
} from "../controllers/streamController.js";
import authenticateToken from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  validateCreateStream,
  validateUpdateStream,
  validateGetStreams,
  validateGetStreamById,
  validateStreamSearchParams,
  validateGetVodByStreamId,
} from "../validators/streamValidators.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  upload.single("thumbnailFile"), // Handle thumbnail upload first
  validateCreateStream, // Ensure validators can handle req.body with multipart/form-data
  createStream
);

// PUT /api/streams/:streamId - Cập nhật stream
// If you also want to allow thumbnail updates, this route would need similar upload middleware
router.put(
  "/:streamId",
  authenticateToken,
  upload.single("thumbnailFile"), // Handle optional thumbnail upload
  validateUpdateStream, // Ensure validators can handle req.body with multipart/form-data
  updateStream
);

// GET /api/streams - Lấy danh sách stream (không yêu cầu xác thực cho route này)
router.get("/", validateGetStreams, getStreams);

/**
 * @route   GET /api/streams/search
 * @desc    Tìm kiếm Streams theo tag.
 * @access  Public
 */
router.get("/search", validateStreamSearchParams, searchStreams);

// GET /api/streams/:streamId - Lấy chi tiết một stream (không yêu cầu xác thực cho route này)
router.get("/:streamId", validateGetStreamById, getStreamById);

// GET /api/streams/:streamId/vod - Lấy VOD từ một stream
router.get("/:streamId/vod", validateGetVodByStreamId, getVodByStreamId);

export default router;
```

## File: src/routes/vodRoutes.js
```javascript
import express from "express";
import { vodController } from "../controllers/vodController.js";
import authenticateToken from "../middlewares/authMiddleware.js"; // Đổi tên import cho đúng với file export
import { vodValidationRules } from "../validators/vodValidator.js";
import upload from "../middlewares/uploadMiddleware.js"; // Import middleware upload
// import upload from '../middlewares/uploadMiddleware.js'; // Tùy chọn: Middleware cho upload file (ví dụ: multer)

const router = express.Router();

/**
 * @route   POST /api/vod/upload
 * @desc    (Admin/Manual Upload) Tạo một VOD mới.
 *          Yêu cầu metadata đầy đủ bao gồm thông tin file trên B2.
 * @access  Private (Admin - yêu cầu xác thực)
 */
router.post(
  "/upload",
  authenticateToken, // Sử dụng tên middleware đã import chính xác
  // upload.single('videoFile'), // Ví dụ: nếu client upload file video tên là 'videoFile'
  vodValidationRules.manualUploadVOD, // Sử dụng validator mới cho manual upload
  vodController.uploadVOD
);

/**
 * @route   POST /api/vod/upload-local
 * @desc    Tạo VOD mới bằng cách upload file video từ máy tính người dùng.
 * @access  Private (Yêu cầu xác thực)
 */
router.post(
  "/upload-local",
  authenticateToken,
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnailFile", maxCount: 1 }, // thumbnailFile là tùy chọn
  ]),
  vodValidationRules.uploadLocalVOD, // Validator cho các trường text (title, description)
  vodController.uploadLocalVODFile
);

/**
 * @route   GET /api/vod
 * @desc    Lấy danh sách VOD.
 * @access  Public (hoặc authMiddleware nếu cần Private)
 */
router.get(
  "/",
  vodValidationRules.getVODsList, // Áp dụng validator cho query params
  // authenticateToken, // Bỏ comment nếu muốn endpoint này là private
  vodController.getAllVODs
);

/**
 * @route   GET /api/vod/search
 * @desc    Tìm kiếm VODs theo tag.
 * @access  Public
 */
router.get(
  "/search",
  vodValidationRules.validateVodSearchParams, // Validator cho query params
  vodController.searchVODs
);

/**
 * @route   GET /api/vod/:id
 * @desc    Lấy chi tiết một VOD.
 * @access  Public (hoặc authMiddleware nếu cần Private)
 */
router.get(
  "/:id",
  // authenticateToken, // Bỏ comment nếu muốn endpoint này là private
  vodController.getVODDetails
);

/**
 * @route   DELETE /api/vod/:id
 * @desc    Xóa một VOD.
 * @access  Private (chỉ chủ sở hữu hoặc admin)
 */
router.delete(
  "/:id",
  authenticateToken, // Yêu cầu xác thực
  vodController.removeVOD
);

/**
 * @route   POST /api/vod/:id/refresh-url
 * @desc    (Admin/Owner) Chủ động làm mới pre-signed URL cho một VOD.
 * @access  Private (yêu cầu xác thực)
 */
router.post(
  "/:id/refresh-url",
  authenticateToken, // Yêu cầu xác thực
  vodController.refreshVODSignedUrl
);

export default router;
```

## File: src/services/categoryService.js
```javascript
import { Category, Stream, VOD } from "../models/index.js";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import slugify from "slugify";
import dotenv from "dotenv";
import { Op } from "sequelize";
import logger from "../utils/logger.js";

dotenv.config();

const B2_PRESIGNED_URL_DURATION_IMAGES =
  parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
  3600 * 24 * 7; // 7 days default

/**
 * Create a new category with an optional thumbnail.
 * @param {object} data - Category data.
 * @param {string} data.name - Category name.
 * @param {string} [data.description] - Category description.
 * @param {string} [data.slug] - Category slug (if provided, otherwise generated from name).
 * @param {string[]} [data.tags] - Array of tags for the category.
 * @param {string} [data.thumbnailFilePath] - Path to temporary thumbnail file.
 * @param {string} [data.originalThumbnailFileName] - Original name of the thumbnail file.
 * @param {string} [data.thumbnailMimeType] - Mime type of the thumbnail.
 * @param {number} [data.userIdForPath] - User ID for B2 path, if applicable (e.g. "global_categories" or specific user).
 * @returns {Promise<Category>} The created category object.
 */
export const createCategoryService = async ({
  name,
  description,
  slug,
  tags,
  thumbnailFilePath,
  originalThumbnailFileName,
  thumbnailMimeType,
  userIdForPath = "_global", // Default path for general categories
}) => {
  let b2ThumbFileIdToDeleteOnError = null;
  let b2ThumbFileNameToDeleteOnError = null;

  try {
    logger.info(`Service: Attempting to create category: ${name}`);

    let thumbnailB2Response = null;

    if (thumbnailFilePath && originalThumbnailFileName && thumbnailMimeType) {
      logger.info(`Service: Thumbnail provided: ${thumbnailFilePath}`);
      const thumbStats = await fs.stat(thumbnailFilePath);
      const thumbnailSize = thumbStats.size;

      if (thumbnailSize > 0) {
        const thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
        const safeOriginalThumbName = originalThumbnailFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const thumbnailFileNameInB2 = `categories/${userIdForPath}/thumbnails/${Date.now()}_${safeOriginalThumbName}`;

        const b2Response = await uploadToB2AndGetPresignedUrl(
          null, // videoStream
          0, // videoSize
          null, // videoFileNameInB2
          null, // videoMimeType
          thumbnailStream,
          thumbnailSize,
          thumbnailFileNameInB2,
          thumbnailMimeType,
          null, // durationSeconds (N/A for category thumbnail)
          B2_PRESIGNED_URL_DURATION_IMAGES
        );
        thumbnailB2Response = b2Response.thumbnail;

        if (!thumbnailB2Response || !thumbnailB2Response.url) {
          throw new AppError("Failed to upload category thumbnail to B2.", 500);
        }
        b2ThumbFileIdToDeleteOnError = thumbnailB2Response.b2FileId;
        b2ThumbFileNameToDeleteOnError = thumbnailB2Response.b2FileName;
        logger.info(
          `Service: Category thumbnail uploaded to B2: ${thumbnailB2Response.b2FileName}`
        );
      } else {
        logger.warn("Service: Provided category thumbnail file is empty.");
      }
    }

    const categoryData = {
      name,
      description: description || null,
      slug:
        slug ||
        slugify(name, {
          lower: true,
          strict: true,
          remove: /[*+~.()\'\"!:@]/g,
        }),
      tags: tags || [],
      thumbnailUrl: thumbnailB2Response?.url || null,
      thumbnailUrlExpiresAt: thumbnailB2Response?.urlExpiresAt || null,
      b2ThumbnailFileId: thumbnailB2Response?.b2FileId || null,
      b2ThumbnailFileName: thumbnailB2Response?.b2FileName || null,
    };

    const newCategory = await Category.create(categoryData);
    logger.info(`Service: Category created in DB with ID: ${newCategory.id}`);
    return newCategory;
  } catch (error) {
    logger.error("Service: Error in createCategoryService:", error);
    if (b2ThumbFileIdToDeleteOnError && b2ThumbFileNameToDeleteOnError) {
      try {
        logger.warn(
          `Service: Cleaning up B2 thumbnail ${b2ThumbFileNameToDeleteOnError} due to error.`
        );
        await deleteFileFromB2(
          b2ThumbFileNameToDeleteOnError,
          b2ThumbFileIdToDeleteOnError
        );
      } catch (deleteError) {
        logger.error(
          "Service: Critical error during B2 thumbnail cleanup:",
          deleteError
        );
      }
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new AppError(
        `Category with this name or slug already exists.`,
        409
      );
    }
    handleServiceError(error, "create category");
  }
};

/**
 * Update an existing category.
 * @param {string | number} categoryIdOrSlug - ID or slug of the category to update.
 * @param {object} updateData - Data to update.
 * @returns {Promise<Category>} The updated category object.
 */
export const updateCategoryService = async (categoryIdOrSlug, updateData) => {
  let newB2ThumbFileIdToDeleteOnError = null;
  let newB2ThumbFileNameToDeleteOnError = null;
  const {
    name,
    description,
    slug,
    tags,
    thumbnailFilePath,
    originalThumbnailFileName,
    thumbnailMimeType,
    userIdForPath = "_global",
  } = updateData;

  try {
    const category = await findCategoryByIdOrSlug(categoryIdOrSlug);
    if (!category) {
      throw new AppError("Category not found.", 404);
    }

    const oldB2ThumbnailFileId = category.b2ThumbnailFileId;
    const oldB2ThumbnailFileName = category.b2ThumbnailFileName;
    let newThumbnailB2Response = null;

    if (thumbnailFilePath && originalThumbnailFileName && thumbnailMimeType) {
      logger.info(
        `Service: New thumbnail provided for category ${category.id}: ${thumbnailFilePath}`
      );
      const thumbStats = await fs.stat(thumbnailFilePath);
      const thumbnailSize = thumbStats.size;

      if (thumbnailSize > 0) {
        const thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
        const safeOriginalThumbName = originalThumbnailFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const thumbnailFileNameInB2 = `categories/${userIdForPath}/thumbnails/${Date.now()}_${safeOriginalThumbName}`;

        const b2Response = await uploadToB2AndGetPresignedUrl(
          null,
          null,
          null,
          null, // Video params not needed
          thumbnailStream,
          thumbnailSize,
          thumbnailFileNameInB2,
          thumbnailMimeType,
          null,
          B2_PRESIGNED_URL_DURATION_IMAGES
        );
        newThumbnailB2Response = b2Response.thumbnail;

        if (!newThumbnailB2Response || !newThumbnailB2Response.url) {
          throw new AppError(
            "Failed to upload new category thumbnail to B2.",
            500
          );
        }
        newB2ThumbFileIdToDeleteOnError = newThumbnailB2Response.b2FileId;
        newB2ThumbFileNameToDeleteOnError = newThumbnailB2Response.b2FileName;

        category.thumbnailUrl = newThumbnailB2Response.url;
        category.thumbnailUrlExpiresAt = newThumbnailB2Response.urlExpiresAt;
        category.b2ThumbnailFileId = newThumbnailB2Response.b2FileId;
        category.b2ThumbnailFileName = newThumbnailB2Response.b2FileName;
        logger.info(
          `Service: New category thumbnail uploaded to B2: ${newThumbnailB2Response.b2FileName}`
        );
      } else {
        logger.warn("Service: Provided new category thumbnail file is empty.");
      }
    }

    if (name !== undefined) category.name = name;
    if (description !== undefined)
      category.description = description === "" ? null : description; // Allow clearing description
    if (slug !== undefined)
      category.slug = slugify(slug, {
        lower: true,
        strict: true,
        remove: /[*+~.()\'\"!:@]/g,
      });
    if (tags !== undefined) category.tags = tags;
    // Slug will also be updated by hook if name changes

    await category.save();
    logger.info(`Service: Category ${category.id} updated successfully.`);

    if (
      newThumbnailB2Response &&
      oldB2ThumbnailFileId &&
      oldB2ThumbnailFileName
    ) {
      try {
        logger.info(
          `Service: Deleting old category thumbnail ${oldB2ThumbnailFileName} from B2.`
        );
        await deleteFileFromB2(oldB2ThumbnailFileName, oldB2ThumbnailFileId);
      } catch (deleteError) {
        logger.error(
          "Service: Error deleting old category thumbnail from B2:",
          deleteError
        );
      }
    }
    return category;
  } catch (error) {
    logger.error(
      `Service: Error in updateCategoryService for ${categoryIdOrSlug}:`,
      error
    );
    if (newB2ThumbFileIdToDeleteOnError && newB2ThumbFileNameToDeleteOnError) {
      try {
        logger.warn(
          `Service: Cleaning up new B2 thumbnail ${newB2ThumbFileNameToDeleteOnError} due to error.`
        );
        await deleteFileFromB2(
          newB2ThumbFileNameToDeleteOnError,
          newB2ThumbFileIdToDeleteOnError
        );
      } catch (deleteError) {
        logger.error(
          "Service: Critical error during new B2 thumbnail cleanup:",
          deleteError
        );
      }
    }
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new AppError(
        `Category with this name or slug already exists.`,
        409
      );
    }
    handleServiceError(error, "update category");
  }
};

/**
 * Delete a category.
 * @param {string | number} categoryIdOrSlug - ID or slug of the category to delete.
 * @returns {Promise<void>}
 */
export const deleteCategoryService = async (categoryIdOrSlug) => {
  try {
    const category = await findCategoryByIdOrSlug(categoryIdOrSlug);
    if (!category) {
      throw new AppError("Category not found for deletion.", 404);
    }

    // Check if category is in use by Streams or VODs
    const streamCount = await Stream.count({
      where: { categoryId: category.id },
    });
    const vodCount = await VOD.count({ where: { categoryId: category.id } });

    if (streamCount > 0 || vodCount > 0) {
      // Option 1: Prevent deletion
      // throw new AppError(`Category is in use by ${streamCount} streams and ${vodCount} VODs. Cannot delete.`, 409);

      // Option 2: Set categoryId to null in Streams/VODs (if onDelete: SET NULL is configured in associations)
      // This is handled by DB constraints if associations are set up with onDelete: SET NULL
      logger.warn(
        `Category ${category.id} is in use. Associated streams/VODs will have their categoryId set to null if DB constraints allow.`
      );
    }

    const b2ThumbnailFileId = category.b2ThumbnailFileId;
    const b2ThumbnailFileName = category.b2ThumbnailFileName;

    await category.destroy();
    logger.info(
      `Service: Category ${categoryIdOrSlug} (ID: ${category.id}) deleted from DB.`
    );

    if (b2ThumbnailFileId && b2ThumbnailFileName) {
      try {
        logger.info(
          `Service: Deleting category thumbnail ${b2ThumbnailFileName} from B2.`
        );
        await deleteFileFromB2(b2ThumbnailFileName, b2ThumbnailFileId);
      } catch (deleteError) {
        logger.error(
          "Service: Error deleting category thumbnail from B2:",
          deleteError
        );
        // Log error but don't let it fail the whole deletion if DB record is gone.
      }
    }
  } catch (error) {
    logger.error(
      `Service: Error in deleteCategoryService for ${categoryIdOrSlug}:`,
      error
    );
    handleServiceError(error, "delete category");
  }
};

/**
 * Get a list of categories with pagination.
 * @param {object} queryParams - Query parameters (page, limit).
 * @returns {Promise<object>} List of categories and pagination info.
 */
export const getCategoriesService = async ({ page = 1, limit = 10 }) => {
  try {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { count, rows } = await Category.findAndCountAll({
      order: [["name", "ASC"]],
      limit: parseInt(limit, 10),
      offset: offset,
      attributes: {
        exclude: [
          "b2ThumbnailFileId",
          "b2ThumbnailFileName",
          "thumbnailUrlExpiresAt",
        ],
      },
    });
    return {
      totalCategories: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
      categories: rows,
    };
  } catch (error) {
    logger.error("Service: Error in getCategoriesService:", error);
    handleServiceError(error, "get categories list");
  }
};

/**
 * Get category details by ID or slug, refreshing presigned URL if needed.
 * @param {string | number} categoryIdOrSlug - Category ID or slug.
 * @returns {Promise<Category|null>} Category object or null if not found.
 */
export const getCategoryDetailsService = async (categoryIdOrSlug) => {
  try {
    const category = await findCategoryByIdOrSlug(categoryIdOrSlug, true); // true to include b2 details for refresh
    if (!category) {
      return null;
    }

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    if (
      category.thumbnailUrl &&
      category.b2ThumbnailFileName &&
      (!category.thumbnailUrlExpiresAt ||
        new Date(category.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      try {
        logger.info(
          `Service: Refreshing presigned URL for category thumbnail ${category.id}`
        );
        const newThumbnailUrl = await generatePresignedUrlForExistingFile(
          category.b2ThumbnailFileName,
          B2_PRESIGNED_URL_DURATION_IMAGES
        );
        category.thumbnailUrl = newThumbnailUrl;
        category.thumbnailUrlExpiresAt = new Date(
          Date.now() + B2_PRESIGNED_URL_DURATION_IMAGES * 1000
        );
        await category.save({
          fields: ["thumbnailUrl", "thumbnailUrlExpiresAt"],
        });
      } catch (refreshError) {
        logger.error(
          `Service: Failed to refresh category thumbnail URL for ${category.id}:`,
          refreshError
        );
      }
    }
    // Exclude B2 details from final response if not needed by client
    const categoryResponse = category.toJSON();
    delete categoryResponse.b2ThumbnailFileId;
    delete categoryResponse.b2ThumbnailFileName;
    delete categoryResponse.thumbnailUrlExpiresAt;
    // Ensure 'tags' is part of categoryResponse if needed, it should be by default
    // For public facing, only send name, slug, description, thumbnailUrl, tags

    return categoryResponse;
  } catch (error) {
    logger.error(
      `Service: Error in getCategoryDetailsService for ${categoryIdOrSlug}:`,
      error
    );
    handleServiceError(error, "get category details");
  }
};

/**
 * Search for Categories by a specific tag.
 * @param {object} options
 * @param {string} options.tag - The tag to search for.
 * @param {number} [options.page=1] - Current page for pagination.
 * @param {number} [options.limit=10] - Number of items per page.
 * @returns {Promise<{categories: Category[], totalItems: number, totalPages: number, currentPage: number}>}
 */
export const searchCategoriesByTagService = async ({
  tag,
  page = 1,
  limit = 10,
}) => {
  try {
    logger.info(
      `Service: Searching Categories with tag: "${tag}", page: ${page}, limit: ${limit}`
    );
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Category.findAndCountAll({
      where: {
        tags: {
          [Op.contains]: [tag], // PostgreSQL specific: checks if array contains the element
        },
      },
      limit: parseInt(limit, 10),
      offset: offset,
      order: [["name", "ASC"]], // Order by name, for example
      attributes: {
        // Exclude B2 details if not needed for this search result
        exclude: [
          "b2ThumbnailFileId",
          "b2ThumbnailFileName",
          "thumbnailUrlExpiresAt",
        ],
      },
    });

    logger.info(`Service: Found ${count} Categories for tag "${tag}"`);

    return {
      categories: rows,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    logger.error(`Service: Error searching Categories by tag "${tag}":`, error);
    handleServiceError(error, "search Categories by tag");
  }
};

/**
 * Search for categories by name.
 * @param {object} options
 * @param {string} options.query - The search query.
 * @param {number} [options.page=1] - Current page for pagination.
 * @param {number} [options.limit=10] - Number of items per page.
 * @returns {Promise<{categories: Category[], totalItems: number, totalPages: number, currentPage: number}>}
 */
export const searchCategoriesByNameService = async ({
  query,
  page = 1,
  limit = 10,
}) => {
  try {
    logger.info(
      `Service: Searching Categories with query: "${query}", page: ${page}, limit: ${limit}`
    );
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const { count, rows } = await Category.findAndCountAll({
      where: {
        name: {
          [Op.iLike]: `%${query}%`, // Case-insensitive search for name containing the query
        },
      },
      limit: parseInt(limit, 10),
      offset: offset,
      order: [["name", "ASC"]],
      attributes: {
        // Exclude fields not needed for a search result list
        exclude: [
          "description",
          "tags",
          "b2ThumbnailFileId",
          "b2ThumbnailFileName",
          "thumbnailUrlExpiresAt",
          "createdAt",
          "updatedAt",
        ],
      },
    });

    logger.info(`Service: Found ${count} Categories for query "${query}"`);

    return {
      categories: rows,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    logger.error(
      `Service: Error searching Categories by query "${query}":`,
      error
    );
    handleServiceError(error, "search Categories by name");
  }
};

// Helper to find category by ID or Slug
const findCategoryByIdOrSlug = async (identifier, includeB2Details = false) => {
  const attributes = includeB2Details
    ? undefined
    : {
        exclude: [
          "b2ThumbnailFileId",
          "b2ThumbnailFileName",
          "thumbnailUrlExpiresAt",
        ],
      };
  let category;
  // Use a stricter check to ensure the entire string is a number.
  if (/^\d+$/.test(identifier)) {
    category = await Category.findByPk(parseInt(identifier, 10), {
      attributes,
    });
  } else {
    category = await Category.findOne({
      where: { slug: identifier },
      attributes,
    });
  }
  return category;
};
```

## File: src/validators/streamValidators.js
```javascript
import { body, param, query } from "express-validator";

export const validateCreateStream = [
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be a string between 3 and 255 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters"
    ),
  body("categoryId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Category ID must be a positive integer")
    .toInt(),
];

export const validateUpdateStream = [
  param("streamId")
    .isInt({ gt: 0 })
    .withMessage("Stream ID must be a positive integer"),
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage("Title must be a string between 3 and 255 characters"),
  body("description")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage(
      "Description must be a string with a maximum of 1000 characters"
    ),
  body("status")
    .optional()
    .isIn(["live", "ended"])
    .withMessage("Status must be either 'live' or 'ended'"),
  body("categoryId")
    .optional({ nullable: true })
    .isInt({ gt: 0 })
    .withMessage("Category ID must be a positive integer or null")
    .toInt(),
];

export const validateGetStreams = [
  query("status")
    .optional()
    .isIn(["live", "ended"])
    .withMessage("Status must be either 'live' or 'ended'"),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
  query("categoryId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Category ID must be a positive integer")
    .toInt(),
  query("userId")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("User ID must be a positive integer")
    .toInt(),
];

export const validateGetStreamById = [
  param("streamId")
    .isInt({ gt: 0 })
    .withMessage("Stream ID must be a positive integer")
    .toInt(),
];

export const validateGetVodByStreamId = [
  param("streamId")
    .isInt({ gt: 0 })
    .withMessage("Stream ID must be a positive integer")
    .toInt(),
];

export const validateStreamSearchParams = [
  query("tag")
    .optional({ checkFalsy: true })
    .isString()
    .withMessage("Search tag must be a string if provided.")
    .trim(),
  query("searchQuery")
    .optional()
    .isString()
    .trim()
    .withMessage("Search query must be a string."),
  query("streamerUsername")
    .optional()
    .isString()
    .trim()
    .withMessage("Streamer username must be a string."),
  query("page")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Page must be a positive integer")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(),
  (req, res, next) => {
    const { tag, searchQuery, streamerUsername } = req.query;
    if (!tag && !searchQuery && !streamerUsername) {
      return res.status(400).json({
        errors: [
          {
            type: "query",
            msg: "At least one search criteria (tag, searchQuery, or streamerUsername) must be provided.",
            path: "query",
            location: "query",
          },
        ],
      });
    }
    next();
  },
];
```

## File: src/routes/userRoutes.js
```javascript
import express from "express";
import {
  validateUserRegistration,
  validateUserLogin,
  validateUserProfileUpdate,
} from "../validators/userValidators.js";
import {
  register,
  login,
  logout,
  updateProfile,
  getMyProfile,
  getAllUsersController,
  getUserPublicProfile,
} from "../controllers/userController.js";
import authenticateToken from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// Public routes
router.post("/register", validateUserRegistration, register);
router.post("/login", validateUserLogin, login);

// Route to get a user's public profile
router.get("/profile/:username", getUserPublicProfile);

// Protected routes (require authentication)
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, getMyProfile);
router.get(
  "/all",
  // authenticateToken,
  getAllUsersController
);

router.put(
  "/me/profile",
  authenticateToken,
  upload.single("avatarFile"),
  validateUserProfileUpdate,
  updateProfile
);

export default router;
```

## File: src/controllers/userController.js
```javascript
import { validationResult } from "express-validator";
import {
  registerUser,
  loginUser,
  updateUserProfile,
  getUserProfileById,
  getAllUsers,
  logoutUser,
  getUserPublicProfileByUsername,
} from "../services/userService.js";

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, displayName } = req.body;
    const { user, token } = await registerUser(username, password, displayName);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const { user, token } = await loginUser(username, password);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    // Token và payload được gắn vào req từ middleware authenticateToken
    const { token, tokenPayload } = req;
    if (!token || !tokenPayload) {
      return res
        .status(400)
        .json({ message: "Authentication context is missing." });
    }

    await logoutUser(token, tokenPayload);

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { displayName, bio } = req.body;
    let avatarFileData = null;

    if (req.file) {
      avatarFileData = {
        avatarFilePath: req.file.path,
        originalAvatarFileName: req.file.originalname,
        avatarMimeType: req.file.mimetype,
      };
    }

    const updatedUser = await updateUserProfile(
      userId,
      { displayName, bio },
      avatarFileData // Pass avatar file data to service
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        avatarUrl: updatedUser.avatarUrl,
        bio: updatedUser.bio,
        role: updatedUser.role,
        updatedAt: updatedUser.updatedAt,
        // Consider also returning b2 related fields if needed by client,
        // or keep them server-side only.
        b2AvatarFileId: updatedUser.b2AvatarFileId,
        b2AvatarFileName: updatedUser.b2AvatarFileName,
        avatarUrlExpiresAt: updatedUser.avatarUrlExpiresAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy userId từ token đã được xác thực
    const userProfile = await getUserProfileById(userId);

    // userProfile đã được service lọc các trường cần thiết
    res.status(200).json(userProfile);
  } catch (error) {
    // Nếu service ném AppError, nó sẽ có statusCode
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.status(200).json(users);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

export const getUserPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const userProfile = await getUserPublicProfileByUsername(username);
    res.status(200).json(userProfile);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};
```

## File: src/controllers/vodController.js
```javascript
import { vodService } from "../services/vodService.js";
import { AppError } from "../utils/errorHandler.js";
import { matchedData, validationResult } from "express-validator"; // Sử dụng express-validator để validate
import {
  uploadToB2AndGetPresignedUrl,
  generatePresignedUrlForExistingFile,
  deleteFileFromB2,
} from "../lib/b2.service.js"; // Thêm import B2 service
import {
  getVideoDurationInSeconds,
  generateThumbnailFromVideo,
} from "../utils/videoUtils.js"; // Thêm generateThumbnailFromVideo
import path from "path";
import fs from "fs/promises"; // Thêm fs để xóa file tạm
import logger from "../utils/logger.js";

/**
 * @route   POST /api/vod/upload
 * @desc    (Admin/Manual Upload) Tạo một VOD mới. Yêu cầu metadata đầy đủ bao gồm thông tin file trên B2.
 *          Endpoint này dành cho trường hợp upload thủ công, không qua luồng Nginx webhook.
 * @access  Private (Admin)
 */
const uploadVOD = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const validatedData = matchedData(req);
    const userId = req.user?.id; // req.user được gán bởi authMiddleware

    if (!userId) {
      // Hoặc kiểm tra role admin ở đây nếu endpoint này chỉ cho admin
      throw new AppError(
        "Xác thực thất bại hoặc userId không được cung cấp.",
        401
      );
    }

    // Dữ liệu cần thiết cho upload thủ công:
    const {
      streamId, // Tùy chọn, nhưng nên có nếu liên kết với stream cũ
      streamKey, // Tùy chọn
      title,
      description,
      videoUrl, // Pre-signed URL đã có
      urlExpiresAt, // Thời điểm URL hết hạn
      b2FileId, // ID file trên B2
      b2FileName, // Tên file trên B2
      thumbnail, // URL thumbnail (có thể cũng là pre-signed)
      durationSeconds, // Thời lượng video
      categoryId, // Thêm categoryId
    } = validatedData;

    // Service createVOD đã được cập nhật để xử lý các trường này
    const newVOD = await vodService.createVOD({
      userId,
      streamId,
      streamKey,
      title,
      description,
      videoUrl,
      urlExpiresAt: new Date(urlExpiresAt), // Chuyển đổi sang Date object nếu cần
      b2FileId,
      b2FileName,
      thumbnail,
      durationSeconds,
      categoryId, // Truyền categoryId
    });

    res.status(201).json({
      success: true,
      message: "VOD đã được tạo thành công (thủ công).",
      data: newVOD,
    });
  } catch (error) {
    next(error); // Chuyển lỗi cho error handling middleware
  }
};

/**
 * @route   GET /api/vod
 * @desc    Lấy danh sách VOD, hỗ trợ filter và phân trang.
 * @access  Public (hoặc Private tùy theo yêu cầu)
 */
const getAllVODs = async (req, res, next) => {
  try {
    // Lấy các query params cho filter và pagination
    const {
      streamId,
      userId,
      streamKey,
      page,
      limit,
      sortBy = "createdAt", // Mặc định sắp xếp theo ngày tạo
      sortOrder = "DESC", // Mặc định giảm dần
      categoryId, // Thêm categoryId
    } = req.query;

    const options = {
      streamId: streamId ? parseInt(streamId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
      streamKey: streamKey ? String(streamKey) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sortBy: String(sortBy),
      sortOrder: String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC",
      categoryId: categoryId ? parseInt(categoryId) : undefined, // Thêm categoryId
    };

    const result = await vodService.getVODs(options);

    res.status(200).json({
      success: true,
      data: result.vods, // Service đã trả về các trường cần thiết, bao gồm urlExpiresAt
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: options.limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/vod/:id
 * @desc    Lấy chi tiết một VOD bằng ID. Pre-signed URL sẽ được tự động làm mới nếu cần.
 * @access  Public (hoặc Private tùy theo yêu cầu)
 */
const getVODDetails = async (req, res, next) => {
  try {
    const vodId = parseInt(req.params.id);
    if (isNaN(vodId)) {
      throw new AppError("ID VOD không hợp lệ.", 400);
    }

    // Lấy userId hoặc IP để theo dõi lượt xem
    const userIdOrIp = req.user?.id || req.ip;

    // vodService.getVODById sẽ tự động refresh URL và tăng lượt xem nếu cần
    const vod = await vodService.getVODById(vodId, userIdOrIp);

    res.status(200).json({
      success: true,
      data: vod, // Đã bao gồm videoUrl và urlExpiresAt được cập nhật nếu cần
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/vod/:id
 * @desc    Xóa một VOD (yêu cầu quyền chủ sở hữu hoặc admin).
 *          Sẽ xóa cả file trên B2.
 * @access  Private
 */
const removeVOD = async (req, res, next) => {
  try {
    const vodId = parseInt(req.params.id);
    if (isNaN(vodId)) {
      throw new AppError("ID VOD không hợp lệ.", 400);
    }

    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.role === "admin"; // Giả sử có trường role trong req.user

    if (!requestingUserId) {
      throw new AppError("Xác thực thất bại, không tìm thấy người dùng.", 401);
    }

    // vodService.deleteVOD sẽ xử lý cả việc xóa file trên B2
    await vodService.deleteVOD(vodId, requestingUserId, isAdmin);

    res.status(200).json({
      success: true,
      message: "VOD đã được xóa thành công.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/vod/:id/refresh-url
 * @desc    (Admin/Owner) Chủ động làm mới pre-signed URL cho một VOD.
 * @access  Private
 */
const refreshVODSignedUrl = async (req, res, next) => {
  try {
    const vodId = parseInt(req.params.id);
    if (isNaN(vodId)) {
      throw new AppError("ID VOD không hợp lệ.", 400);
    }

    const requestingUserId = req.user?.id;
    const isAdmin = req.user?.role === "admin";

    if (!requestingUserId) {
      throw new AppError("Xác thực thất bại.", 401);
    }

    // Kiểm tra quyền: Chỉ admin hoặc chủ sở hữu VOD mới được refresh (tùy chọn)
    // Hoặc chỉ cần user đã đăng nhập là đủ nếu không quá khắt khe
    // const vod = await vodService.getVODById(vodId); // Lấy VOD để check owner nếu cần (getVODById có thể refresh rồi)
    // if (!isAdmin && vod.userId !== requestingUserId) {
    //     throw new AppError("Bạn không có quyền làm mới URL cho VOD này.", 403);
    // }

    const refreshedInfo = await vodService.refreshVODUrl(vodId);

    res.status(200).json({
      success: true,
      message: "Pre-signed URL cho VOD đã được làm mới thành công.",
      data: refreshedInfo, // Gồm id, videoUrl, urlExpiresAt mới
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/vod/upload-local
 * @desc    Tạo VOD mới bằng cách upload file từ máy người dùng.
 * @access  Private (Yêu cầu xác thực)
 */
const uploadLocalVODFile = async (req, res, next) => {
  let videoFilePathTemp = null; // Để lưu đường dẫn file tạm cho việc xóa
  let thumbnailFilePathTemp = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const validatedData = matchedData(req);
    const userId = req.user?.id;

    if (!userId) {
      throw new AppError("Xác thực thất bại, userId không được cung cấp.", 401);
    }

    if (!req.files || !req.files.videoFile || !req.files.videoFile[0]) {
      throw new AppError(
        "Không có file video nào (videoFile) được tải lên.",
        400
      );
    }

    const { title, description, categoryId } = validatedData;
    const videoFile = req.files.videoFile[0];
    videoFilePathTemp = videoFile.path; // Lưu đường dẫn file video tạm

    let thumbnailFilePath = null; // Sẽ truyền vào service
    let originalThumbnailFileName = null;
    let thumbnailMimeType = null;

    if (req.files.thumbnailFile && req.files.thumbnailFile[0]) {
      const thumbnailFile = req.files.thumbnailFile[0];
      thumbnailFilePathTemp = thumbnailFile.path; // Lưu đường dẫn file thumbnail tạm
      thumbnailFilePath = thumbnailFile.path; // Gán cho biến sẽ truyền đi
      originalThumbnailFileName = thumbnailFile.originalname;
      thumbnailMimeType = thumbnailFile.mimetype;
      logger.info(
        "Controller: Thumbnail được cung cấp bởi người dùng từ file tạm."
      );
    }

    const servicePayload = {
      userId,
      title,
      description,
      videoFilePath: videoFile.path, // Truyền đường dẫn file video
      originalVideoFileName: videoFile.originalname,
      videoMimeType: videoFile.mimetype,
      thumbnailFilePath, // Truyền đường dẫn file thumbnail (có thể là null)
      originalThumbnailFileName, // có thể là null
      thumbnailMimeType, // có thể là null
      categoryId, // Thêm categoryId
    };

    logger.info("Controller: Gọi vodService.createVODFromUpload với payload:", {
      userId: servicePayload.userId,
      title: servicePayload.title,
      originalVideoFileName: servicePayload.originalVideoFileName,
      videoFilePath: servicePayload.videoFilePath,
      hasUserThumbnail: !!servicePayload.thumbnailFilePath,
    });

    const newVOD = await vodService.createVODFromUpload(servicePayload);

    res.status(201).json({
      success: true,
      message: "VOD đã được upload và tạo thành công.",
      data: newVOD,
    });
  } catch (error) {
    logger.error("Controller: Lỗi khi upload VOD từ local:", error);
    next(error);
  } finally {
    // Xóa file tạm sau khi xử lý
    if (videoFilePathTemp) {
      try {
        await fs.unlink(videoFilePathTemp);
        logger.info(`Controller: Đã xóa file video tạm: ${videoFilePathTemp}`);
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file video tạm ${videoFilePathTemp}:`,
          unlinkError
        );
      }
    }
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm: ${thumbnailFilePathTemp}`
        );
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm ${thumbnailFilePathTemp}:`,
          unlinkError
        );
      }
    }
  }
};

const searchVODs = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const {
      tag,
      searchQuery,
      uploaderUsername,
      page = 1,
      limit = 10,
    } = matchedData(req, { locations: ["query"] });

    const searchCriteria = {
      tag,
      searchQuery,
      uploaderUsername,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    const result = await vodService.searchVODs(searchCriteria);

    res.status(200).json({
      success: true,
      message: "VODs fetched successfully based on search criteria",
      searchCriteria: {
        tag: tag || undefined,
        query: searchQuery || undefined,
        uploader: uploaderUsername || undefined,
      },
      data: result.vods,
      pagination: {
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        limit: parseInt(limit, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const vodController = {
  uploadVOD,
  uploadLocalVODFile,
  getAllVODs,
  getVODDetails,
  removeVOD,
  refreshVODSignedUrl,
  searchVODs,
};
```

## File: src/index.js
```javascript
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import sequelize from "./config/database.js";
import { connectMongoDB } from "./config/mongodb.js";
import userRoutes from "./routes/userRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import vodRoutes from "./routes/vodRoutes.js";
import initializeSocketHandlers from "./socketHandlers.js";
import { setIoInstance as setNotificationServiceIo } from "./services/notificationService.js";
import morgan from "morgan";
// Import category routes
import categoryRoutes from "./routes/categoryRoutes.js";
import categoryAdminRoutes from "./routes/admin/categoryAdminRoutes.js";
import followRoutes from "./routes/followRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
// Import BullMQ Worker
import notificationWorker from "./workers/notificationWorker.js"; // Worker sẽ tự khởi động khi được import
// Import logger
import logger from "./utils/logger.js";
// Import Bull Board
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
// Import your queue
import notificationQueue from "./queues/notificationQueue.js";

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

setNotificationServiceIo(io);

// Bull Board setup
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [new BullMQAdapter(notificationQueue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

// Middleware
app.use(morgan("dev"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/social", followRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/vod", vodRoutes);
app.use("/api/notifications", notificationRoutes);
// Add category routes
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", categoryAdminRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Livestream API" });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

// Initialize Socket.IO handlers (example, actual implementation might differ)
initializeSocketHandlers(io);

// Kết nối cơ sở dữ liệu
const startServer = async () => {
  try {
    await sequelize.sync();
    logger.info("Database (PostgreSQL/Sequelize) connected successfully.");

    await connectMongoDB(); // Kết nối MongoDB
    // logger.info("MongoDB connected successfully."); // Thêm log cho MongoDB nếu connectMongoDB không có log riêng

    server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Socket.IO initialized and listening on port ${PORT}`);
      // Log xác nhận worker đã được load và (ngầm) khởi động
      if (notificationWorker) {
        logger.info("Notification Worker has been loaded and is running.");
      }
      // Log cho Bull Board
      logger.info(
        `Bull Board is available at http://localhost:${PORT}/admin/queues`
      );
    });
  } catch (error) {
    logger.error(
      "Unable to connect to the database(s) or start server:",
      error
    );
    process.exit(1); // Thoát nếu không kết nối được DB chính
  }
};

startServer();
```

## File: src/controllers/streamController.js
```javascript
import {
  createStreamWithThumbnailService,
  updateStreamInfoService,
  getStreamsListService,
  getStreamDetailsService,
  searchStreamsService,
  getVodByStreamIdService,
} from "../services/streamService.js";
import { validationResult, matchedData } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { Stream, User } from "../models/index.js";
import { AppError } from "../utils/errorHandler.js";
import fs from "fs/promises";
import path from "path";
import logger from "../utils/logger.js";

// Endpoint Tạo Mới Stream (with thumbnail upload)
export const createStream = async (req, res, next) => {
  let thumbnailFilePathTemp = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) {
        await fs.unlink(req.file.path);
      }
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const validatedData = matchedData(req);
    const userId = req.user?.id;

    if (!userId) {
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError("Xác thực thất bại, userId không được cung cấp.", 401);
    }

    const { title, description, categoryId } = validatedData;
    let thumbnailFile = null;

    if (req.file && req.file.fieldname === "thumbnailFile") {
      thumbnailFile = req.file;
      thumbnailFilePathTemp = thumbnailFile.path;
    }

    const servicePayload = {
      userId,
      title,
      description,
      thumbnailFilePath: thumbnailFile?.path,
      originalThumbnailFileName: thumbnailFile?.originalname,
      thumbnailMimeType: thumbnailFile?.mimetype,
      categoryId,
    };

    logger.info(
      `Controller: Gọi createStreamWithThumbnailService với payload cho user: ${userId}`,
      {
        title: servicePayload.title,
        hasThumbnail: !!servicePayload.thumbnailFilePath,
      }
    );

    const newStream = await createStreamWithThumbnailService(servicePayload);

    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm: ${thumbnailFilePathTemp}`
        );
        thumbnailFilePathTemp = null;
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm ${thumbnailFilePathTemp} sau khi service thành công: `,
          unlinkError
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Stream created successfully",
      data: newStream,
    });
  } catch (error) {
    logger.error("Controller: Lỗi khi tạo stream:", error);
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm (trong catch): ${thumbnailFilePathTemp}`
        );
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm (trong catch) ${thumbnailFilePathTemp}:`,
          unlinkError
        );
      }
    }
    next(error);
  }
};

// Endpoint Cập Nhật Thông Tin Stream
export const updateStream = async (req, res, next) => {
  let thumbnailFilePathTemp = null; // For cleaning up temp file

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) {
        // If validation fails after file upload
        await fs.unlink(req.file.path);
      }
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const { streamId } = req.params;
    const validatedData = matchedData(req); // title, description, status from body
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError("Xác thực thất bại, userId không được cung cấp.", 401);
    }

    const id = parseInt(streamId);
    if (isNaN(id)) {
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError("Stream ID phải là một số.", 400);
    }

    let thumbnailFile = null;
    if (req.file && req.file.fieldname === "thumbnailFile") {
      thumbnailFile = req.file;
      thumbnailFilePathTemp = thumbnailFile.path; // Lưu để xóa
    }

    const servicePayload = {
      ...validatedData, // title, description, status
      thumbnailFilePath: thumbnailFile?.path,
      originalThumbnailFileName: thumbnailFile?.originalname,
      thumbnailMimeType: thumbnailFile?.mimetype,
    };

    logger.info(
      `Controller: Gọi updateStreamInfoService cho stream ${id} bởi user ${currentUserId}`,
      {
        updates: servicePayload.title, // just an example field to log
        hasNewThumbnail: !!servicePayload.thumbnailFilePath,
      }
    );

    const updatedStream = await updateStreamInfoService(
      id,
      currentUserId,
      servicePayload
    );

    // Xóa file thumbnail tạm (nếu có) sau khi service thành công
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm (update): ${thumbnailFilePathTemp}`
        );
        thumbnailFilePathTemp = null; // Reset để không xóa lại trong finally/catch
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm (update) ${thumbnailFilePathTemp} sau khi service thành công: `,
          unlinkError
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Stream updated successfully",
      data: updatedStream, // Trả về stream đã được cập nhật, bao gồm cả thumbnail URL mới nếu có
    });
  } catch (error) {
    logger.error("Controller: Lỗi khi cập nhật stream:", error);
    // Đảm bảo file tạm được xóa nếu có lỗi
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm (update, trong catch): ${thumbnailFilePathTemp}`
        );
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm (update, trong catch) ${thumbnailFilePathTemp}:`,
          unlinkError
        );
      }
    }
    next(error); // Chuyển lỗi cho error handling middleware
  }
};

// Endpoint Lấy Danh Sách Stream
export const getStreams = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, page, limit, categoryId, userId } = req.query;
    const result = await getStreamsListService({
      status,
      page,
      limit,
      categoryId,
      userId,
    });

    res.status(200).json({
      message: "Streams fetched successfully",
      totalStreams: result.totalStreams,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      streams: result.streams.map((stream) => ({
        id: stream.id,
        title: stream.title,
        description: stream.description,
        status: stream.status,
        startTime: stream.startTime,
        endTime: stream.endTime,
        viewerCount: stream.viewerCount,
        currentViewerCount: stream.currentViewerCount,
        playbackUrls: stream.playbackUrls,
        thumbnailUrl: stream.thumbnailUrl,
        thumbnailUrlExpiresAt: stream.thumbnailUrlExpiresAt,
        user: stream.user,
        category: stream.category,
        createdAt: stream.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Error in getStreams controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching streams", error: error.message });
  }
};

// Endpoint Lấy Chi Tiết Một Stream
export const getStreamById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array({ onlyFirstError: true })[0];
    return next(new AppError(`Validation failed: ${firstError.msg}`, 400));
  }

  try {
    const { streamId } = req.params;
    const id = parseInt(streamId);
    if (isNaN(id)) {
      return next(new AppError("Stream ID must be a number.", 400));
    }

    const stream = await getStreamDetailsService(id);

    if (!stream) {
      return next(new AppError("Stream not found", 404));
    }

    res.status(200).json({
      message: "Stream details fetched successfully",
      stream: {
        id: stream.id,
        title: stream.title,
        description: stream.description,
        status: stream.status,
        startTime: stream.startTime,
        endTime: stream.endTime,
        viewerCount: stream.viewerCount,
        currentViewerCount: stream.currentViewerCount,
        playbackUrls: stream.playbackUrls,
        thumbnailUrl: stream.thumbnailUrl,
        thumbnailUrlExpiresAt: stream.thumbnailUrlExpiresAt,
        // streamKey: stream.streamKey, // TODO: Remove this field from response
        user: stream.user,
        category: stream.category,
        createdAt: stream.createdAt,
        updatedAt: stream.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Error in getStreamById controller:", error);
    next(error);
  }
};

export const searchStreams = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const {
      tag,
      searchQuery,
      streamerUsername,
      page = 1,
      limit = 10,
    } = matchedData(req, { locations: ["query"] });

    const searchCriteria = {
      tag,
      searchQuery,
      streamerUsername,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    const result = await searchStreamsService(searchCriteria);

    res.status(200).json({
      success: true,
      message: "Streams fetched successfully based on search criteria",
      searchCriteria: {
        tag: tag || undefined,
        query: searchQuery || undefined,
        streamer: streamerUsername || undefined,
      },
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      streams: result.streams,
    });
  } catch (error) {
    logger.error("Controller: Error searching streams:", error);
    next(error);
  }
};

export const getVodByStreamId = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array({ onlyFirstError: true })[0];
    return next(new AppError(`Validation failed: ${firstError.msg}`, 400));
  }

  try {
    const { streamId } = req.params;
    const id = parseInt(streamId);
    if (isNaN(id)) {
      return next(new AppError("Stream ID must be a number.", 400));
    }

    const vod = await getVodByStreamIdService(id);

    if (!vod) {
      return next(new AppError("No VOD found for this stream.", 404));
    }

    res.status(200).json({
      success: true,
      message: "VOD details fetched successfully for the stream.",
      vod: vod,
    });
  } catch (error) {
    logger.error(
      `Controller: Error fetching VOD for stream ${req.params.streamId}:`,
      error
    );
    next(error);
  }
};
```

## File: src/services/userService.js
```javascript
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import fs from "fs/promises";
import fsSync from "fs";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import path from "path";
import dotenv from "dotenv";
import { TokenBlacklist } from "../models/index.js";
import logger from "../utils/logger.js";
import { Follow, Stream, VOD } from "../models/index.js";
import { sequelize } from "../models/index.js";

dotenv.config();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
};

export const registerUser = async (username, password, displayName) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
      displayName,
    });
    const token = generateToken(user);
    return { user, token };
  } catch (error) {
    throw new Error("Error registering user: " + error.message);
  }
};

export const loginUser = async (username, password) => {
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    const token = generateToken(user);
    return { user, token };
  } catch (error) {
    throw new Error("Error logging in: " + error.message);
  }
};

export const updateUserProfile = async (
  userId,
  profileData,
  avatarFileData
) => {
  let newB2AvatarFileIdToDeleteOnError = null;
  let newB2AvatarFileNameToDeleteOnError = null;

  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { displayName, bio } = profileData;
    const { avatarFilePath, originalAvatarFileName, avatarMimeType } =
      avatarFileData || {};

    const oldB2AvatarFileId = user.b2AvatarFileId;
    const oldB2AvatarFileName = user.b2AvatarFileName;
    let newAvatarB2Response = null;

    if (avatarFilePath && originalAvatarFileName && avatarMimeType) {
      logger.info(
        `Service: New avatar provided for user ${userId}: ${avatarFilePath}`
      );
      const avatarStats = await fs.stat(avatarFilePath);
      const avatarSize = avatarStats.size;

      if (avatarSize > 0) {
        const avatarStream = fsSync.createReadStream(avatarFilePath);
        const safeOriginalAvatarFileName = originalAvatarFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const avatarFileNameInB2 = `users/${userId}/avatars/${Date.now()}_${safeOriginalAvatarFileName}`;

        const tempB2Response = await uploadToB2AndGetPresignedUrl(
          null,
          0,
          null,
          null,
          avatarStream,
          avatarSize,
          avatarFileNameInB2,
          avatarMimeType,
          null,
          parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
            3600 * 24 * 30
        );

        newAvatarB2Response = tempB2Response.thumbnail;

        if (!newAvatarB2Response || !newAvatarB2Response.url) {
          logger.error(
            "Service: Error uploading new avatar to B2, no response or URL."
          );
          throw new AppError("Could not upload new avatar to B2.", 500);
        }

        newB2AvatarFileIdToDeleteOnError = newAvatarB2Response.b2FileId;
        newB2AvatarFileNameToDeleteOnError = newAvatarB2Response.b2FileName;

        user.avatarUrl = newAvatarB2Response.url;
        user.avatarUrlExpiresAt = newAvatarB2Response.urlExpiresAt;
        user.b2AvatarFileId = newAvatarB2Response.b2FileId;
        user.b2AvatarFileName = newAvatarB2Response.b2FileName;

        logger.info(
          `Service: New avatar uploaded to B2 successfully: ${newAvatarB2Response.b2FileName}`
        );
      } else {
        logger.warn("Service: New avatar file provided but size is 0.");
      }
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;

    await user.save();
    logger.info(`Service: User profile ${userId} updated successfully.`);

    if (newAvatarB2Response && oldB2AvatarFileId && oldB2AvatarFileName) {
      try {
        logger.info(
          `Service: Deleting old avatar ${oldB2AvatarFileName} (ID: ${oldB2AvatarFileId}) from B2.`
        );
        await deleteFileFromB2(oldB2AvatarFileName, oldB2AvatarFileId);
        logger.info(
          `Service: Deleted old avatar ${oldB2AvatarFileName} from B2.`
        );
      } catch (deleteError) {
        logger.error(
          `Service: Error deleting old avatar ${oldB2AvatarFileName} from B2: ${deleteError.message}`
        );
      }
    }

    if (avatarFilePath) {
      try {
        await fs.unlink(avatarFilePath);
        logger.info(
          `Service: Temporary avatar file ${avatarFilePath} deleted.`
        );
      } catch (unlinkError) {
        logger.error(
          `Service: Error deleting temporary avatar file ${avatarFilePath}: ${unlinkError.message}`
        );
      }
    }

    return user;
  } catch (error) {
    logger.error(
      `Service: Error in updateUserProfile for user ${userId}:`,
      error
    );

    if (
      newB2AvatarFileIdToDeleteOnError &&
      newB2AvatarFileNameToDeleteOnError
    ) {
      try {
        logger.warn(
          `Service: Cleaning up NEW avatar ${newB2AvatarFileNameToDeleteOnError} from B2 due to error during profile update.`
        );
        await deleteFileFromB2(
          newB2AvatarFileNameToDeleteOnError,
          newB2AvatarFileIdToDeleteOnError
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Critical error cleaning up NEW avatar ${newB2AvatarFileNameToDeleteOnError} from B2: ${deleteB2Error}`
        );
      }
    }

    if (avatarFileData && avatarFileData.avatarFilePath) {
      try {
        if (fsSync.existsSync(avatarFileData.avatarFilePath)) {
          await fs.unlink(avatarFileData.avatarFilePath);
          logger.info(
            `Service: Temporary avatar file ${avatarFileData.avatarFilePath} deleted due to error.`
          );
        }
      } catch (unlinkError) {
        logger.error(
          `Service: Error deleting temporary avatar file ${avatarFileData.avatarFilePath} during error handling: ${unlinkError.message}`
        );
      }
    }

    if (error instanceof AppError) throw error;
    throw new AppError(
      `Could not update user profile: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export const getUserProfileById = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "username",
        "displayName",
        "avatarUrl",
        "avatarUrlExpiresAt",
        "b2AvatarFileId",
        "b2AvatarFileName",
        "bio",
        "role",
        "createdAt",
        "updatedAt",
      ],
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Logic to refresh avatarUrl if expired or nearing expiry
    const presignedUrlDurationImages =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
      3600 * 24 * 7; // 7 days default for images
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    if (
      user.avatarUrl &&
      user.b2AvatarFileName &&
      (!user.avatarUrlExpiresAt ||
        new Date(user.avatarUrlExpiresAt) < oneHourFromNow)
    ) {
      try {
        logger.info(
          `Service: Pre-signed URL for avatar of user ${userId} (file: ${user.b2AvatarFileName}) is expired or expiring soon. Refreshing...`
        );
        const newAvatarUrl = await generatePresignedUrlForExistingFile(
          user.b2AvatarFileName,
          presignedUrlDurationImages
        );
        user.avatarUrl = newAvatarUrl;
        user.avatarUrlExpiresAt = new Date(
          Date.now() + presignedUrlDurationImages * 1000
        );
        await user.save();
        logger.info(
          `Service: Refreshed pre-signed URL for avatar of user ${userId}. New expiry: ${user.avatarUrlExpiresAt}`
        );
      } catch (refreshError) {
        logger.error(
          `Service: Failed to refresh avatar URL for user ${userId} (file: ${user.b2AvatarFileName}): ${refreshError.message}`
        );
        // Continue with potentially stale URL, or handle error differently
      }
    } else if (
      user.avatarUrl &&
      !user.b2AvatarFileName &&
      (!user.avatarUrlExpiresAt ||
        new Date(user.avatarUrlExpiresAt) < oneHourFromNow)
    ) {
      logger.warn(
        `Service: Avatar URL for user ${userId} needs refresh, but b2AvatarFileName is missing.`
      );
    }

    return user;
  } catch (error) {
    logger.error(
      `Service: Error in getUserProfileById for user ${userId}:`,
      error
    );
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Could not retrieve user profile: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export const getAllUsers = async () => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "username",
        "displayName",
        "avatarUrl",
        "avatarUrlExpiresAt",
        "bio",
        "role",
        "createdAt",
        "updatedAt",
      ],
    });
    // Optionally, you can implement logic to refresh avatarUrls here if needed, similar to getUserProfileById
    return users;
  } catch (error) {
    logger.error("Service: Error in getAllUsers:", error);
    throw new AppError(
      `Could not retrieve users: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export const logoutUser = async (token, tokenPayload) => {
  try {
    const expiresAt = new Date(tokenPayload.exp * 1000);
    await TokenBlacklist.create({
      token,
      expiresAt,
    });
    logger.info(
      `Token for user ${tokenPayload.username} has been blacklisted.`
    );
  } catch (error) {
    // Nếu token đã tồn tại trong blacklist, không cần báo lỗi nghiêm trọng
    if (error.name === "SequelizeUniqueConstraintError") {
      logger.warn(`Attempted to blacklist an already blacklisted token.`);
      return;
    }
    logger.error(`Error blacklisting token: ${error.message}`);
    throw new AppError("Could not log out user.", 500);
  }
};

export const getUserPublicProfileByUsername = async (username) => {
  try {
    const user = await User.findOne({
      where: { username },
      attributes: [
        "id",
        "username",
        "displayName",
        "avatarUrl",
        "bio",
        "createdAt",
        [
          sequelize.literal(
            `(SELECT COUNT(*) FROM "Follows" WHERE "Follows"."followingId" = "User"."id")`
          ),
          "followerCount",
        ],
      ],
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // The logic to refresh the avatar URL can be added here if needed.
    return user;
  } catch (error) {
    logger.error(
      `Service: Error in getUserPublicProfile for user ${username}:`,
      error
    );
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Could not retrieve user profile: ${error.message}`,
      error.statusCode || 500
    );
  }
};
```

## File: src/services/vodService.js
```javascript
import { VOD, User, Stream, Category } from "../models/index.js";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import {
  getVideoDurationInSeconds,
  generateThumbnailFromVideo,
} from "../utils/videoUtils.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";
import { Readable } from "stream";
import { Op } from "sequelize";
import { Sequelize } from "sequelize";
import redisClient from "../lib/redis.js";
import notificationService from "./notificationService.js";
import logger from "../utils/logger.js";
import notificationQueue from "../queues/notificationQueue.js";
import followService from "./followService.js";

dotenv.config();

// Cache để lưu trữ lượt xem gần đây (vodId -> Map(userIdOrIp -> timestamp))
// const recentViewsCache = new Map(); // Loại bỏ cache Map trong bộ nhớ
const VIEW_COOLDOWN_MS = 5 * 60 * 1000; // 5 phút (tính bằng mili giây)

// Helper function to format duration for FFmpeg timestamp
const formatDurationForFFmpeg = (totalSecondsParam) => {
  let totalSeconds = totalSecondsParam;
  if (totalSeconds < 0) totalSeconds = 0; // Ensure non-negative

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  // Ensure milliseconds are calculated from the fractional part of totalSeconds
  const milliseconds = Math.floor(
    (totalSeconds - Math.floor(totalSeconds)) * 1000
  );

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(3, "0")}.${String(milliseconds).padStart(
    3,
    "0"
  )}`;
};

// Helper function to run FFmpeg/FFprobe commands
const runFFCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(
          new AppError(
            `FFmpeg/FFprobe command '${command} ${args.join(
              " "
            )}' failed with code ${code}: ${errorOutput}`,
            500
          )
        );
      }
    });

    process.on("error", (err) => {
      reject(
        new AppError(
          `Failed to start FFmpeg/FFprobe command '${command}': ${err.message}`,
          500
        )
      );
    });
  });
};

// Helper function to get video duration using ffprobe
const getVideoDuration = async (filePath) => {
  try {
    const args = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ];
    const durationStr = await runFFCommand("ffprobe", args);
    const duration = parseFloat(durationStr);
    if (isNaN(duration)) {
      throw new AppError("Could not parse video duration from ffprobe.", 500);
    }
    return Math.round(duration); // Trả về giây, làm tròn
  } catch (error) {
    logger.error(`Error getting video duration for ${filePath}:`, error);
    throw error; // Re-throw để hàm gọi xử lý
  }
};

// Helper function to convert FLV to MP4
const convertFlvToMp4 = async (flvPath, mp4Path) => {
  try {
    // -y: overwrite output files without asking
    // -c:v copy -c:a copy: try to copy codecs first, faster if compatible
    // if not compatible, ffmpeg will transcode. Add specific codec options if needed.
    const args = ["-i", flvPath, "-c:v", "copy", "-c:a", "aac", "-y", mp4Path];
    // Using more robust conversion:
    // const args = ['-i', flvPath, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', '-y', mp4Path];
    logger.info(`Converting ${flvPath} to ${mp4Path}...`);
    await runFFCommand("ffmpeg", args);
    logger.info(`Converted ${flvPath} to ${mp4Path} successfully.`);
    return mp4Path;
  } catch (error) {
    logger.error(`Error converting FLV to MP4 for ${flvPath}:`, error);
    // Fallback or specific error handling can be added here
    if (error.message.includes("failed with code 1")) {
      // Common error if codecs are incompatible for direct copy. Try transcoding.
      logger.warn("Initial conversion failed, trying with re-encoding...");
      const transcodeArgs = [
        "-i",
        flvPath,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
        "-y",
        mp4Path,
      ];
      try {
        await runFFCommand("ffmpeg", transcodeArgs);
        logger.info(`Re-encoded ${flvPath} to ${mp4Path} successfully.`);
        return mp4Path;
      } catch (transcodeError) {
        logger.error(`Re-encoding also failed for ${flvPath}:`, transcodeError);
        throw transcodeError;
      }
    }
    throw error;
  }
};

// Helper function to extract thumbnail
const extractThumbnail = async (
  videoPath,
  thumbnailPath,
  timestamp = "00:00:05.000"
) => {
  try {
    const args = [
      "-i",
      videoPath,
      "-ss",
      timestamp, // Seek to 5 seconds
      "-vframes",
      "1", // Extract one frame
      "-vf",
      "scale=640:-1", // Scale width to 640px, height auto
      "-y", // Overwrite if exists
      thumbnailPath,
    ];
    logger.info(
      `Extracting thumbnail from ${videoPath} to ${thumbnailPath}...`
    );
    await runFFCommand("ffmpeg", args);
    logger.info(`Extracted thumbnail to ${thumbnailPath} successfully.`);
    return thumbnailPath;
  } catch (error) {
    logger.error(`Error extracting thumbnail from ${videoPath}:`, error);
    throw error;
  }
};

/**
 * Tăng lượt xem cho VOD nếu người dùng chưa xem trong khoảng thời gian cooldown.
 * @param {number} vodId - ID của VOD.
 * @param {string} userIdOrIp - ID người dùng hoặc địa chỉ IP.
 */
const incrementVodViewCount = async (vodId, userIdOrIp) => {
  try {
    const redisKey = `vod_view_cooldown:${vodId}:${userIdOrIp}`;
    logger.info(`Service: [VOD-${vodId}] Checking Redis for key: ${redisKey}`);
    const keyExists = await redisClient.exists(redisKey);
    logger.info(
      `Service: [VOD-${vodId}] Redis key ${redisKey} exists? ${
        keyExists === 1 ? "Yes" : "No"
      }`
    );

    if (keyExists === 1) {
      // redisClient.exists trả về 1 nếu key tồn tại, 0 nếu không
      logger.info(
        `Service: [VOD-${vodId}] View count for by ${userIdOrIp} not incremented due to Redis cooldown.`
      );
      return;
    }

    logger.info(
      `Service: [VOD-${vodId}] Attempting to increment viewCount in DB.`
    );
    const incrementResult = await VOD.increment("viewCount", {
      by: 1,
      where: { id: vodId },
    });

    let affectedRowsCount = 0;
    if (
      Array.isArray(incrementResult) &&
      incrementResult.length > 1 &&
      typeof incrementResult[1] === "number"
    ) {
      affectedRowsCount = incrementResult[1];
    } else if (typeof incrementResult === "number") {
      // Một số trường hợp cũ hơn hoặc dialect khác
      affectedRowsCount = incrementResult;
    } else if (
      Array.isArray(incrementResult) &&
      incrementResult.length > 0 &&
      Array.isArray(incrementResult[0]) &&
      typeof incrementResult[0][1] === "number"
    ) {
      // trường hợp trả về dạng [[instance, changed_boolean_or_count], metadata_count]
      // hoặc [[result_array], count ] - đây là một phỏng đoán dựa trên sự đa dạng của Sequelize
      // Thử lấy từ metadata nếu có dạng phức tạp hơn [[...], count]
      if (
        incrementResult.length > 1 &&
        typeof incrementResult[1] === "number"
      ) {
        affectedRowsCount = incrementResult[1];
      } else if (
        incrementResult[0].length > 1 &&
        typeof incrementResult[0][1] === "number"
      ) {
        // Nếu phần tử đầu tiên là một mảng và phần tử thứ hai của mảng đó là số
        affectedRowsCount = incrementResult[0][1];
      }
    }
    // Fallback: Nếu không chắc, và không có lỗi, có thể coi là thành công nếu VOD tồn tại
    // Tuy nhiên, để an toàn, chúng ta dựa vào affectedRowsCount.

    logger.info(
      `Service: [VOD-${vodId}] affectedRowsCount from DB increment: ${affectedRowsCount}`
    );

    if (affectedRowsCount > 0) {
      logger.info(
        `Service: [VOD-${vodId}] Setting Redis cooldown key: ${redisKey} for ${VIEW_COOLDOWN_MS}ms`
      );
      await redisClient.set(redisKey, "1", "PX", VIEW_COOLDOWN_MS);
      logger.info(
        `Service: [VOD-${vodId}] Incremented view count by ${userIdOrIp}. Cooldown key set in Redis.`
      );
    } else {
      logger.error(
        `Service: [VOD-${vodId}] VOD not found or view count not incremented in DB. affectedRowsCount: ${affectedRowsCount}`
      );
    }
  } catch (error) {
    logger.error(
      `Service: [VOD-${vodId}] Error in incrementVodViewCount for ${userIdOrIp}:`,
      error
    );
    if (error.message.toLowerCase().includes("redis")) {
      logger.error(
        `Service: [VOD-${vodId}] Redis error during view count increment. Proceeding without setting cooldown key.`
      );
    }
  }
};

/**
 * Xử lý file video đã ghi (FLV), chuyển đổi sang MP4, upload lên B2,
 * trích xuất thumbnail, lấy duration, và lưu thông tin VOD vào DB.
 * @param {object} params
 * @param {string} params.streamKey - Khóa của stream.
 * @param {string} params.originalFilePath - Đường dẫn tuyệt đối của file FLV gốc trên server.
 * @param {string} params.originalFileName - Tên file gốc (ví dụ: streamkey.flv).
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 */
const processRecordedFileToVOD = async ({
  streamKey,
  originalFilePath, // e.g., /mnt/recordings/live/streamkey.flv
  originalFileName, // e.g., streamkey.flv
}) => {
  let mp4FilePath = null;
  // let thumbnailFilePath = null; // Biến này sẽ được thay thế bằng extractedThumbnailTempPath nếu cần
  let b2UploadResponse = null;
  const tempFilesToDeleteOnError = []; // Lưu các file tạm đã tạo để xóa nếu có lỗi sớm

  try {
    // 0. Kiểm tra file gốc tồn tại
    try {
      await fs.access(originalFilePath);
      tempFilesToDeleteOnError.push(originalFilePath); // Thêm vào đây để xóa nếu các bước sau lỗi
    } catch (e) {
      throw new AppError(
        `Original recorded file not found at ${originalFilePath}`,
        404
      );
    }

    // 1. Lấy thông tin Stream từ DB
    const stream = await Stream.findOne({ where: { streamKey } });
    if (!stream) {
      throw new AppError(`Stream with key ${streamKey} not found.`, 404);
    }
    if (!stream.userId) {
      throw new AppError(
        `User ID not found for stream ${streamKey}. Cannot create VOD without owner.`,
        400
      );
    }
    const streamCategoryId = stream.categoryId;

    // 2. Tạo đường dẫn cho file MP4
    const baseName = path.basename(
      originalFileName,
      path.extname(originalFileName)
    );
    const tempDir = path.dirname(originalFilePath);
    mp4FilePath = path.join(tempDir, `${baseName}.mp4`);
    await convertFlvToMp4(originalFilePath, mp4FilePath);
    tempFilesToDeleteOnError.push(mp4FilePath); // Thêm mp4 vào danh sách xóa nếu lỗi

    // 3. Lấy thời lượng video (từ file MP4 đã convert)
    const durationSeconds = await getVideoDurationInSeconds(mp4FilePath);

    // 4. Xử lý Thumbnail
    let finalVodThumbnailInfo = {
      url: null,
      urlExpiresAt: null,
      b2FileId: null,
      b2FileName: null,
    };
    let localThumbnailToUploadPath = null; // Path của file thumbnail tạm sẽ được upload nếu được extract mới
    const timestampForUpload = Date.now();
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7;

    // Ưu tiên thumbnail từ Stream gốc
    if (stream.b2ThumbnailFileName && stream.b2ThumbnailFileId) {
      logger.info(
        `Service: Ưu tiên sử dụng thumbnail có sẵn từ Stream gốc: ${stream.b2ThumbnailFileName}`
      );
      finalVodThumbnailInfo.b2FileId = stream.b2ThumbnailFileId;
      finalVodThumbnailInfo.b2FileName = stream.b2ThumbnailFileName;

      const imagePresignedUrlDuration =
        parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
        presignedUrlDuration;
      try {
        finalVodThumbnailInfo.url = await generatePresignedUrlForExistingFile(
          stream.b2ThumbnailFileName,
          imagePresignedUrlDuration
        );
        finalVodThumbnailInfo.urlExpiresAt = new Date(
          Date.now() + imagePresignedUrlDuration * 1000
        );
        logger.info(
          `Service: Đã tạo pre-signed URL cho thumbnail từ Stream: ${finalVodThumbnailInfo.url}`
        );
      } catch (presignError) {
        logger.error(
          `Service: Lỗi khi tạo pre-signed URL cho thumbnail từ Stream (${stream.b2ThumbnailFileName}): ${presignError.message}. Sẽ thử extract thumbnail mới.`
        );
        // Reset để fallback về extract mới
        finalVodThumbnailInfo = {
          url: null,
          urlExpiresAt: null,
          b2FileId: null,
          b2FileName: null,
        };
      }
    }

    // Nếu không có thumbnail từ stream (hoặc có lỗi), thì extract mới
    if (!finalVodThumbnailInfo.b2FileName) {
      logger.info(
        "Service: Stream gốc không có thumbnail hợp lệ hoặc không thể tạo URL. Tiến hành trích xuất thumbnail mới."
      );
      const extractedThumbnailTempPath = path.join(
        tempDir,
        `${baseName}-extracted-thumbnail-${timestampForUpload}.jpg`
      );

      let thumbnailTimestampString;
      if (durationSeconds >= 5) {
        thumbnailTimestampString = "00:00:05.000";
      } else if (durationSeconds >= 1) {
        thumbnailTimestampString = formatDurationForFFmpeg(1);
      } else if (durationSeconds > 0) {
        const seekTime = Math.max(0.001, durationSeconds * 0.1);
        thumbnailTimestampString = formatDurationForFFmpeg(seekTime);
      } else {
        thumbnailTimestampString = "00:00:00.001";
        logger.warn(
          `Video duration is ${durationSeconds}s. Attempting to extract the earliest possible frame for thumbnail for ${mp4FilePath}.`
        );
      }
      logger.info(
        `Service: Trích xuất thumbnail cho ${mp4FilePath} tại ${thumbnailTimestampString}`
      );
      try {
        await extractThumbnail(
          mp4FilePath,
          extractedThumbnailTempPath,
          thumbnailTimestampString
        );
        localThumbnailToUploadPath = extractedThumbnailTempPath;
        tempFilesToDeleteOnError.push(extractedThumbnailTempPath); // Thêm vào danh sách xóa nếu lỗi
        logger.info(
          `Service: Thumbnail mới đã được trích xuất tại: ${localThumbnailToUploadPath}`
        );
      } catch (extractErr) {
        logger.error(
          `Service: Lỗi khi trích xuất thumbnail mới từ video ${mp4FilePath}: ${extractErr.message}. VOD sẽ không có thumbnail.`
        );
        localThumbnailToUploadPath = null;
      }
    }

    // 5. Chuẩn bị stream và thông tin file để upload
    logger.info(`Preparing streams for MP4 file: ${mp4FilePath}`);
    const mp4FileSize = fsSync.statSync(mp4FilePath).size;
    const mp4FileStream = fsSync.createReadStream(mp4FilePath);
    const videoFileNameInB2 = `vods/${baseName}-${timestampForUpload}.mp4`;

    let thumbnailFileStreamForUpload = null;
    let thumbnailFileSizeForUpload = 0;
    let thumbnailFileNameInB2ForUpload = null;
    let thumbnailMimeTypeForUpload = null;

    if (localThumbnailToUploadPath) {
      try {
        await fs.access(localThumbnailToUploadPath);
        thumbnailFileSizeForUpload = fsSync.statSync(
          localThumbnailToUploadPath
        ).size;
        if (thumbnailFileSizeForUpload > 0) {
          thumbnailFileStreamForUpload = fsSync.createReadStream(
            localThumbnailToUploadPath
          );
          thumbnailFileNameInB2ForUpload = `vods/thumbnails/${baseName}-thumb-${timestampForUpload}.jpg`;
          thumbnailMimeTypeForUpload = "image/jpeg";
        } else {
          logger.warn(
            `Service: File thumbnail trích xuất ${localThumbnailToUploadPath} có kích thước 0. Sẽ không upload thumbnail.`
          );
        }
      } catch (thumbAccessErrorOnUpload) {
        logger.error(
          `Service: Không thể truy cập file thumbnail trích xuất ${localThumbnailToUploadPath} để upload: ${thumbAccessErrorOnUpload.message}. Sẽ không upload thumbnail.`
        );
        // Đảm bảo stream và tên file là null nếu không thể truy cập
        thumbnailFileStreamForUpload = null;
        thumbnailFileNameInB2ForUpload = null;
      }
    }

    logger.info(
      `Uploading video stream and thumbnail stream (if extracted) to B2...`
    );
    b2UploadResponse = await uploadToB2AndGetPresignedUrl(
      mp4FileStream,
      mp4FileSize,
      videoFileNameInB2,
      "video/mp4",
      thumbnailFileStreamForUpload,
      thumbnailFileSizeForUpload,
      thumbnailFileNameInB2ForUpload,
      thumbnailMimeTypeForUpload,
      durationSeconds,
      presignedUrlDuration
    );

    // 6. Tạo bản ghi VOD trong DB
    const vodData = {
      streamId: stream.id,
      userId: stream.userId,
      streamKey: streamKey,
      title: stream.title || `VOD for ${streamKey}`,
      description: stream.description || "",
      videoUrl: b2UploadResponse.video.url,
      urlExpiresAt: b2UploadResponse.video.urlExpiresAt,
      b2FileId: b2UploadResponse.video.b2FileId,
      b2FileName: b2UploadResponse.video.b2FileName,
      durationSeconds,
      categoryId: streamCategoryId,
      thumbnailUrl: null, // Default to null
      thumbnailUrlExpiresAt: null,
      b2ThumbnailFileId: null,
      b2ThumbnailFileName: null,
    };

    if (finalVodThumbnailInfo.b2FileName) {
      // Ưu tiên thumbnail từ stream nếu đã lấy được
      vodData.thumbnailUrl = finalVodThumbnailInfo.url;
      vodData.thumbnailUrlExpiresAt = finalVodThumbnailInfo.urlExpiresAt;
      vodData.b2ThumbnailFileId = finalVodThumbnailInfo.b2FileId;
      vodData.b2ThumbnailFileName = finalVodThumbnailInfo.b2FileName;
    } else if (
      b2UploadResponse.thumbnail &&
      b2UploadResponse.thumbnail.b2FileName
    ) {
      // Nếu đã upload thumbnail mới thành công
      vodData.thumbnailUrl = b2UploadResponse.thumbnail.url;
      vodData.thumbnailUrlExpiresAt = b2UploadResponse.thumbnail.urlExpiresAt;
      vodData.b2ThumbnailFileId = b2UploadResponse.thumbnail.b2FileId;
      vodData.b2ThumbnailFileName = b2UploadResponse.thumbnail.b2FileName;
    }

    logger.info("Creating VOD entry in database with data:", {
      ...vodData,
      videoUrl: "HIDDEN",
      thumbnailUrl: vodData.thumbnailUrl ? "HIDDEN" : null,
    });
    const newVod = await createVOD(vodData);
    logger.info(`Service: VOD đã được tạo trong DB với ID: ${newVod.id}`);

    // 7. Dọn dẹp file tạm (FLV, MP4, thumbnail nếu được extract mới)
    // File FLV gốc (originalFilePath) thường sẽ được xóa bởi script gọi processRecordedFileToVOD
    // (ví dụ: script hook của nginx-rtmp sau khi stream kết thúc và file đã được xử lý)
    // Tuy nhiên, nếu nó được thêm vào tempFilesToDeleteOnError ở đầu, nó sẽ được xóa ở đây nếu không có lỗi nào khác.
    // Không xóa originalFilePath ở đây nữa, để cho script ngoài quản lý.
    // Chỉ xóa mp4FilePath và localThumbnailToUploadPath (nếu có)
    if (mp4FilePath) {
      fs.unlink(mp4FilePath).catch((err) =>
        logger.warn(
          `Failed to delete temporary MP4 file ${mp4FilePath}: ${err}`
        )
      );
    }
    if (localThumbnailToUploadPath) {
      // Đã được thêm vào tempFilesToDeleteOnError nếu được tạo
      // fs.unlink(localThumbnailToUploadPath).catch((err) => logger.warn(`Failed to delete temporary thumbnail file ${localThumbnailToUploadPath}: ${err}`));
      // Không cần xóa lại ở đây vì nó đã có trong tempFilesToDeleteOnError và sẽ được xử lý ở khối catch nếu có lỗi trước đó,
      // hoặc sẽ được xóa sau nếu thành công (logic này nên được xem lại)
      // Hiện tại, ta sẽ xóa nó một cách tường minh nếu nó được tạo và không có lỗi gì nghiêm trọng trước đó.
      // Quyết định: Sẽ xóa localThumbnailToUploadPath ở cuối nếu nó được tạo.
      // Điều này đã được xử lý bởi logic `tempFilesToDeleteOnError` và khối catch.
      // Nếu không có lỗi, chúng ta vẫn nên dọn dẹp.
      // File thumbnail đã được upload, file tạm trên disk không cần nữa.
      fs.unlink(localThumbnailToUploadPath).catch((err) =>
        logger.warn(
          `Failed to delete temporary extracted thumbnail file ${localThumbnailToUploadPath}: ${err}`
        )
      );
    }

    logger.info(
      `Service: Xử lý VOD từ file ghi ${originalFileName} thành công. VOD ID: ${newVod.id}`
    );
    return newVod;
  } catch (error) {
    logger.error(
      `Error in processRecordedFileToVOD for streamKey ${streamKey}:`,
      error
    );
    // Logic dọn dẹp file trên B2 nếu đã upload nhưng gặp lỗi
    if (
      b2UploadResponse?.video?.b2FileId &&
      b2UploadResponse?.video?.b2FileName
    ) {
      try {
        logger.warn(
          // Changed to warn as it's a cleanup action
          `Service: Dọn dẹp video ${b2UploadResponse.video.b2FileName} trên B2 do lỗi trong processRecordedFileToVOD.`
        );
        await deleteFileFromB2(
          b2UploadResponse.video.b2FileName,
          b2UploadResponse.video.b2FileId
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp video ${b2UploadResponse.video.b2FileName} trên B2:`,
          deleteB2Error
        );
      }
    }
    // Chỉ xóa thumbnail nếu nó được upload MỚI cho VOD này (tức là không phải thumbnail kế thừa)
    if (
      b2UploadResponse?.thumbnail?.b2FileId &&
      b2UploadResponse?.thumbnail?.b2FileName
      // Không cần check finalVodThumbnailInfo.b2FileName !== b2UploadResponse.thumbnail.b2FileName
      // vì nếu finalVodThumbnailInfo có giá trị thì thumbnailFileStreamForUpload sẽ null,
      // và b2UploadResponse.thumbnail sẽ không có giá trị.
    ) {
      try {
        logger.warn(
          // Changed to warn
          `Service: Dọn dẹp thumbnail (mới upload) ${b2UploadResponse.thumbnail.b2FileName} trên B2 do lỗi trong processRecordedFileToVOD.`
        );
        await deleteFileFromB2(
          b2UploadResponse.thumbnail.b2FileName,
          b2UploadResponse.thumbnail.b2FileId
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp thumbnail (mới upload) ${b2UploadResponse.thumbnail.b2FileName} trên B2:`,
          deleteB2Error
        );
      }
    }
    handleServiceError(error, "xử lý file ghi hình thành VOD");
  } finally {
    // 9. Xóa file tạm trên server (FLV, MP4, Thumbnail nếu được extract)
    // tempFilesToDeleteOnError đã chứa các file cần xóa
    logger.info("Service: Bắt đầu dọn dẹp file tạm trên server...");
    for (const filePath of tempFilesToDeleteOnError) {
      try {
        if (filePath) {
          await fs.access(filePath);
          await fs.unlink(filePath);
          logger.info(`Successfully deleted temporary file: ${filePath}`);
        }
      } catch (e) {
        if (e.code !== "ENOENT") {
          logger.error(`Failed to delete temporary file ${filePath}:`, e);
        } else {
          logger.info(
            `Temporary file ${filePath} not found for deletion (already deleted or never created).`
          );
        }
      }
    }
  }
};

/**
 * Tạo một bản ghi VOD mới. (Hàm này có thể dùng cho admin upload thủ công)
 * @param {object} vodData - Dữ liệu cho VOD mới.
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 */
const createVOD = async (vodData) => {
  try {
    logger.info("Attempting to create VOD with data:", {
      userId: vodData.userId,
      title: vodData.title,
      streamId: vodData.streamId,
      videoUrlExists: !!vodData.videoUrl,
      thumbnailUrlExists: !!vodData.thumbnailUrl,
      b2FileId: vodData.b2FileId,
      b2ThumbnailFileId: vodData.b2ThumbnailFileId,
      categoryId: vodData.categoryId,
    });

    if (
      !vodData.userId ||
      !vodData.title ||
      !vodData.videoUrl ||
      !vodData.urlExpiresAt ||
      !vodData.b2FileId ||
      !vodData.b2FileName
    ) {
      throw new AppError(
        "Missing required fields for VOD creation (userId, title, videoUrl, urlExpiresAt, b2FileId, b2FileName).",
        400
      );
    }

    if (vodData.categoryId) {
      const category = await Category.findByPk(vodData.categoryId);
      if (!category) {
        throw new AppError(
          `Category with ID ${vodData.categoryId} not found.`,
          400
        );
      }
    }

    const newVOD = await VOD.create({
      userId: vodData.userId,
      title: vodData.title,
      description: vodData.description,
      videoUrl: vodData.videoUrl,
      urlExpiresAt: new Date(vodData.urlExpiresAt),
      b2FileId: vodData.b2FileId,
      b2FileName: vodData.b2FileName,
      durationSeconds: vodData.durationSeconds || 0,
      thumbnailUrl: vodData.thumbnailUrl || null,
      thumbnailUrlExpiresAt: vodData.thumbnailUrlExpiresAt
        ? new Date(vodData.thumbnailUrlExpiresAt)
        : null,
      b2ThumbnailFileId: vodData.b2ThumbnailFileId || null,
      b2ThumbnailFileName: vodData.b2ThumbnailFileName || null,
      streamId: vodData.streamId || null,
      streamKey: vodData.streamKey || null,
      categoryId: vodData.categoryId || null,
    });

    logger.info(`VOD created successfully with ID: ${newVOD.id}`);

    // Gửi thông báo cho followers
    if (newVOD.userId) {
      const actorUser = await User.findByPk(newVOD.userId, {
        attributes: ["id", "username"],
      });
      if (actorUser) {
        logger.info(
          `New VOD created (ID: ${newVOD.id}), preparing to notify followers of user ${actorUser.username} (ID: ${actorUser.id}) via BullMQ`
        );
        try {
          const allFollows = await followService.getFollowersInternal(
            actorUser.id
          );
          const followers = allFollows
            .map((follow) => follow.follower) // Lấy object follower từ mỗi mục follow
            .filter((follower) => follower && follower.id && follower.username); // Lọc những follower hợp lệ

          if (followers.length > 0) {
            const batchSize = 10; // Or your preferred batch size
            for (let i = 0; i < followers.length; i += batchSize) {
              const batch = followers.slice(i, i + batchSize);
              const jobData = {
                actionType: "new_vod",
                actorUser: {
                  // Consistent with streamService
                  id: actorUser.id,
                  username: actorUser.username,
                },
                entity: { id: newVOD.id, title: newVOD.title },
                followers: batch.map((f) => ({
                  // Send only necessary follower info
                  id: f.id,
                  username: f.username,
                })),
                messageTemplate: `${
                  actorUser.username
                } has published a new VOD: ${newVOD.title || "New Video"}!`,
              };
              await notificationQueue.add(
                "process-notification-batch",
                jobData
              );
              logger.info(
                `Added new_vod notification job to queue for VOD ${
                  newVOD.id
                }, user ${actorUser.id}, batch ${
                  Math.floor(i / batchSize) + 1
                }/${Math.ceil(followers.length / batchSize)}`
              );
            }
            logger.info(
              `Successfully queued all new_vod notification jobs for VOD ${newVOD.id}, user ${actorUser.id}. Total followers: ${followers.length}`
            );
          } else {
            logger.info(
              `User ${actorUser.username} (ID: ${actorUser.id}) has no followers to notify for new VOD ${newVOD.id}.`
            );
          }
        } catch (notifyError) {
          logger.error(
            `Failed to get followers or add notification job for new VOD ${newVOD.id} (user: ${actorUser.id}):`,
            notifyError
          );
        }
      } else {
        logger.warn(
          `Cannot send new_vod notification for VOD ${newVOD.id} because creator user (ID: ${newVOD.userId}) not found.`
        );
      }
    }

    return newVOD;
  } catch (error) {
    logger.error("Error in vodService.createVOD:", error);
    // Giữ nguyên throw error để các hàm gọi (processRecordedFileToVOD, createVODFromUpload) có thể xử lý cleanup nếu cần
    throw error;
  }
};

/**
 * Lấy danh sách VOD với tùy chọn filter và phân trang.
 * @param {object} options - Tùy chọn truy vấn.
 * @returns {Promise<{vods: VOD[], totalItems: number, totalPages: number, currentPage: number}>}
 */
const getVODs = async (options = {}) => {
  try {
    const {
      streamId,
      userId,
      streamKey,
      categoryId,
      page = 1,
      limit = 10,
    } = options;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (streamId) whereClause.streamId = streamId;
    if (userId) whereClause.userId = userId;
    if (streamKey) whereClause.streamKey = streamKey;
    if (categoryId) whereClause.categoryId = categoryId;

    const { count, rows } = await VOD.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "description",
        "viewCount",
        "videoUrl",
        "thumbnailUrl",
        "thumbnailUrlExpiresAt",
        "b2ThumbnailFileId",
        "b2ThumbnailFileName",
        "durationSeconds",
        "createdAt",
        "userId",
        "streamId",
        "streamKey",
        "urlExpiresAt",
        "b2FileName",
        "categoryId",
      ],
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        { model: Stream, as: "stream", attributes: ["id", "title"] },
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });

    // Logic làm mới pre-signed URL nếu cần (ví dụ, chỉ làm mới khi GET chi tiết)
    // Ở đây chỉ trả về, client sẽ tự quyết định có cần refresh không.

    return {
      vods: rows,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    handleServiceError(error, "lấy danh sách VOD");
  }
};

/**
 * Lấy chi tiết một VOD bằng ID.
 * Sẽ tự động làm mới pre-signed URL nếu nó sắp hết hạn hoặc đã hết hạn.
 * @param {number} vodId - ID của VOD.
 * @param {string} [userIdOrIp] - ID người dùng hoặc địa chỉ IP để theo dõi lượt xem.
 * @returns {Promise<VOD|null>} Đối tượng VOD hoặc null nếu không tìm thấy.
 */
const getVODById = async (vodId, userIdOrIp) => {
  try {
    let vod = await VOD.findByPk(vodId, {
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        {
          model: Stream,
          as: "stream",
          attributes: ["id", "title", "streamKey"],
        },
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });
    if (!vod) {
      throw new AppError("VOD không tìm thấy.", 404);
    }

    // Tăng lượt xem (bất đồng bộ, không cần await)
    if (userIdOrIp) {
      incrementVodViewCount(vodId, userIdOrIp).catch((err) => {
        logger.error(
          `Service: фоновая ошибка при увеличении счетчика просмотров для VOD ${vodId}:`, // Lỗi nền khi tăng lượt xem
          err
        );
      });
    }

    // Kiểm tra và làm mới pre-signed URL nếu cần
    // Ví dụ: làm mới nếu URL hết hạn trong vòng 1 giờ tới
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    let urlsRefreshed = false;

    if (!vod.urlExpiresAt || new Date(vod.urlExpiresAt) < oneHourFromNow) {
      if (vod.b2FileName) {
        logger.info(
          `Pre-signed URL for VOD Video ${vodId} (file: ${vod.b2FileName}) is expired or expiring soon. Refreshing...`
        );
        const newViewableUrl = await generatePresignedUrlForExistingFile(
          vod.b2FileName,
          presignedUrlDuration
        );
        vod.videoUrl = newViewableUrl;
        vod.urlExpiresAt = new Date(Date.now() + presignedUrlDuration * 1000);
        urlsRefreshed = true;
        logger.info(
          `Refreshed pre-signed Video URL for VOD ${vodId}. New expiry: ${vod.urlExpiresAt}`
        );
      } else {
        logger.warn(
          `VOD Video ${vodId} needs URL refresh but b2FileName is missing.`
        );
      }
    }

    // Refresh Thumbnail URL if it exists, is a B2 presigned URL, and is expiring
    if (
      vod.thumbnailUrl &&
      vod.b2ThumbnailFileName &&
      (!vod.thumbnailUrlExpiresAt ||
        new Date(vod.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      try {
        // Use B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES for thumbnail refresh duration if available
        const imagePresignedUrlDuration =
          parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
          presignedUrlDuration;
        logger.info(
          `Pre-signed URL for VOD Thumbnail ${vodId} (file: ${vod.b2ThumbnailFileName}) is expired or expiring soon. Refreshing...`
        );
        const newThumbnailUrl = await generatePresignedUrlForExistingFile(
          vod.b2ThumbnailFileName,
          imagePresignedUrlDuration
        );
        vod.thumbnailUrl = newThumbnailUrl;
        vod.thumbnailUrlExpiresAt = new Date(
          Date.now() + imagePresignedUrlDuration * 1000
        );
        urlsRefreshed = true;
        logger.info(
          `Refreshed pre-signed Thumbnail URL for VOD ${vodId}. New expiry: ${vod.thumbnailUrlExpiresAt}`
        );
      } catch (thumbRefreshError) {
        logger.error(
          `Failed to refresh VOD Thumbnail URL for ${vodId} (file: ${vod.b2ThumbnailFileName}): ${thumbRefreshError.message}`
        );
        // Decide if to proceed with stale URL or throw error
      }
    } else if (
      vod.thumbnailUrl &&
      !vod.b2ThumbnailFileName &&
      (!vod.thumbnailUrlExpiresAt ||
        new Date(vod.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      logger.warn(
        `VOD Thumbnail ${vodId} needs URL refresh but b2ThumbnailFileName is missing.`
      );
    }

    if (urlsRefreshed) {
      await vod.save();
      logger.info(`VOD ${vodId} saved with refreshed URLs.`);
    }

    return vod;
  } catch (error) {
    handleServiceError(error, "lấy chi tiết VOD");
  }
};

/**
 * Xóa một VOD (metadata trong DB và file trên storage).
 * @param {number} vodId - ID của VOD cần xóa.
 * @param {number} requestingUserId - ID của người dùng yêu cầu xóa.
 * @param {boolean} isAdmin - Người dùng có phải là admin không.
 */
const deleteVOD = async (vodId, requestingUserId, isAdmin = false) => {
  try {
    const vod = await VOD.findByPk(vodId);
    if (!vod) {
      throw new AppError("VOD không tìm thấy để xóa.", 404);
    }

    if (!isAdmin && vod.userId !== requestingUserId) {
      throw new AppError("Bạn không có quyền xóa VOD này.", 403);
    }

    // 1. Xóa file trên Backblaze B2 (nếu có b2FileId và b2FileName)
    if (vod.b2FileId && vod.b2FileName) {
      try {
        logger.info(
          `Deleting VOD file from B2: ${vod.b2FileName} (ID: ${vod.b2FileId})`
        );
        await deleteFileFromB2(vod.b2FileName, vod.b2FileId);
        logger.info(`Successfully deleted ${vod.b2FileName} from B2.`);
      } catch (b2Error) {
        // Log lỗi nhưng vẫn tiếp tục xóa bản ghi DB, hoặc throw lỗi tùy theo yêu cầu
        logger.error(
          `Failed to delete VOD file ${vod.b2FileName} from B2. Error: ${b2Error.message}. Proceeding with DB deletion.`
        );
        // throw new AppError(`Lỗi khi xóa file trên B2: ${b2Error.message}`, 500); // Bỏ comment nếu muốn dừng lại khi xóa B2 lỗi
      }
    } else {
      logger.warn(
        `VOD ${vodId} does not have b2FileId or b2FileName. Skipping B2 deletion.`
      );
    }

    // (Tùy chọn) Xóa cả thumbnail trên B2 nếu nó được lưu riêng và có thông tin.

    // 2. Xóa bản ghi VOD khỏi DB
    await vod.destroy();
    logger.info(`VOD record ${vodId} deleted from database successfully.`);
    // Không cần trả về gì, hoặc có thể trả về một thông báo thành công
  } catch (error) {
    handleServiceError(error, "xóa VOD");
  }
};

// Hàm này để refresh URL cho một VOD cụ thể, có thể gọi từ một endpoint riêng
const refreshVODUrl = async (vodId) => {
  try {
    const vod = await VOD.findByPk(vodId);
    if (!vod) {
      throw new AppError("VOD không tìm thấy.", 404);
    }
    if (!vod.b2FileName) {
      throw new AppError(
        "Không có thông tin file trên B2 (b2FileName) để làm mới URL.",
        400
      );
    }

    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày
    const newViewableUrl = await generatePresignedUrlForExistingFile(
      vod.b2FileName,
      presignedUrlDuration
    );

    vod.videoUrl = newViewableUrl;
    vod.urlExpiresAt = new Date(Date.now() + presignedUrlDuration * 1000);
    await vod.save();

    logger.info(
      `Successfully refreshed pre-signed URL for VOD ${vodId}. New expiry: ${vod.urlExpiresAt}`
    );
    return {
      id: vod.id,
      videoUrl: vod.videoUrl,
      urlExpiresAt: vod.urlExpiresAt,
    };
  } catch (error) {
    handleServiceError(error, "làm mới URL VOD");
  }
};

/**
 * Xử lý việc tạo VOD từ file upload (local).
 * Bao gồm việc tạo thumbnail (nếu cần), lấy duration, upload lên B2 và lưu DB.
 * @param {object} data
 * @param {number} data.userId
 * @param {string} data.title
 * @param {string} [data.description]
 * @param {string} data.videoFilePath
 * @param {string} data.originalVideoFileName
 * @param {string} data.videoMimeType
 * @param {string} [data.thumbnailFilePath] - Path to thumbnail file (optional)
 * @param {string} [data.originalThumbnailFileName] - Original thumbnail file name (optional)
 * @param {string} [data.thumbnailMimeType] - MIME type of the thumbnail (optional)
 * @param {number} data.categoryId - Category ID for the VOD
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 */
const createVODFromUpload = async ({
  userId,
  title,
  description,
  videoFilePath,
  originalVideoFileName,
  videoMimeType,
  thumbnailFilePath,
  originalThumbnailFileName,
  thumbnailMimeType,
  categoryId,
}) => {
  let b2VideoFileIdToDelete = null;
  let b2VideoFileNameToDelete = null;
  let b2ThumbFileIdToDelete = null;
  let b2ThumbFileNameToDelete = null;

  try {
    logger.info(
      `Service: Bắt đầu xử lý upload VOD từ file: ${videoFilePath} cho user: ${userId}`
    );

    // 1. Lấy thông tin file video (kích thước, thời lượng)
    const videoStats = await fs.stat(videoFilePath);
    const videoSize = videoStats.size;
    if (videoSize === 0) {
      throw new AppError("Video file is empty.", 400);
    }
    const durationSeconds = await getVideoDurationInSeconds(videoFilePath);
    logger.info(`Service: Thời lượng video: ${durationSeconds} giây.`);

    // 2. Xử lý Thumbnail
    let thumbnailStream = null;
    let thumbnailSize = 0;
    let finalThumbnailMimeType = thumbnailMimeType;
    let finalOriginalThumbnailFileName = originalThumbnailFileName;

    if (thumbnailFilePath) {
      // Người dùng cung cấp thumbnail
      logger.info(
        `Service: Sử dụng thumbnail từ file cung cấp: ${thumbnailFilePath}`
      );
      const thumbStats = await fs.stat(thumbnailFilePath);
      thumbnailSize = thumbStats.size;
      if (thumbnailSize > 0) {
        thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
      }
    } else {
      // Không có thumbnail từ người dùng, thử tạo tự động
      logger.info(
        `Service: Không có thumbnail từ người dùng, thử tạo tự động từ video: ${videoFilePath}`
      );
      const autoThumbnailPath = await generateThumbnailFromVideo(
        videoFilePath,
        durationSeconds
      );
      if (autoThumbnailPath) {
        thumbnailFilePath = autoThumbnailPath; // Cập nhật đường dẫn để xóa sau
        finalOriginalThumbnailFileName = path.basename(autoThumbnailPath);
        finalThumbnailMimeType = "image/jpeg"; // Hoặc image/png tùy theo generateThumbnailFromVideo
        const thumbStats = await fs.stat(autoThumbnailPath);
        thumbnailSize = thumbStats.size;
        if (thumbnailSize > 0) {
          thumbnailStream = fsSync.createReadStream(autoThumbnailPath);
        }
        logger.info(
          `Service: Đã tạo thumbnail tự động tại: ${autoThumbnailPath}`
        );
      } else {
        logger.warn(
          `Service: Không thể tạo thumbnail tự động cho video: ${videoFilePath}`
        );
      }
    }

    // 3. Chuẩn bị tên file trên B2 (Sanitize filenames)
    const safeOriginalVideoFileName = originalVideoFileName.replace(
      /[^a-zA-Z0-9.\-_]/g,
      "_"
    );
    let safeOriginalThumbnailFileName = "";
    if (finalOriginalThumbnailFileName) {
      safeOriginalThumbnailFileName = finalOriginalThumbnailFileName.replace(
        /[^a-zA-Z0-9.\-_]/g,
        "_"
      );
    }

    const videoFileNameInB2 = `users/${userId}/vods/${Date.now()}_${safeOriginalVideoFileName}`;
    let thumbnailFileNameInB2 = null;
    if (thumbnailStream && safeOriginalThumbnailFileName) {
      thumbnailFileNameInB2 = `users/${userId}/vods/thumbnails/${Date.now()}_${safeOriginalThumbnailFileName}`;
    }

    // 4. Tạo video stream
    const videoStream = fsSync.createReadStream(videoFilePath);

    // 5. Upload lên B2
    logger.info("Service: Bắt đầu upload stream file lên B2...");
    const b2Response = await uploadToB2AndGetPresignedUrl(
      videoStream,
      videoSize,
      videoFileNameInB2,
      videoMimeType,
      thumbnailStream,
      thumbnailSize,
      thumbnailFileNameInB2,
      finalThumbnailMimeType,
      durationSeconds
    );
    logger.info(
      `Service: Upload lên B2 thành công: Video - ${
        b2Response.video.b2FileName
      }, Thumbnail - ${b2Response.thumbnail?.b2FileName || "N/A"}`
    );

    b2VideoFileIdToDelete = b2Response.video?.b2FileId;
    b2VideoFileNameToDelete = b2Response.video?.b2FileName;
    b2ThumbFileIdToDelete = b2Response.thumbnail?.b2FileId;
    b2ThumbFileNameToDelete = b2Response.thumbnail?.b2FileName;

    // 6. Tạo bản ghi VOD trong DB
    const vodToCreate = {
      userId,
      title,
      description,
      videoUrl: b2Response.video.url,
      urlExpiresAt: b2Response.video.urlExpiresAt,
      b2FileId: b2Response.video.b2FileId,
      b2FileName: b2Response.video.b2FileName,
      durationSeconds: b2Response.video.durationSeconds,
      thumbnailUrl: null, // Default to null
      thumbnailUrlExpiresAt: null,
      b2ThumbnailFileId: null,
      b2ThumbnailFileName: null,
      categoryId: categoryId,
    };

    if (b2Response.thumbnail && b2Response.thumbnail.url) {
      vodToCreate.thumbnailUrl = b2Response.thumbnail.url;
      vodToCreate.thumbnailUrlExpiresAt = b2Response.thumbnail.urlExpiresAt;
      vodToCreate.b2ThumbnailFileId = b2Response.thumbnail.b2FileId;
      vodToCreate.b2ThumbnailFileName = b2Response.thumbnail.b2FileName;
    } else if (thumbnailStream) {
      // Nếu thumbnail được xử lý (auto-generated hoặc provided) và upload thành công
      // nhưng không có trong b2Response.thumbnail (ví dụ: lỗi logic ở uploadToB2AndGetPresignedUrl)
      // thì cần đảm bảo thông tin này được lưu nếu file thực sự đã lên B2.
      // Tuy nhiên, uploadToB2AndGetPresignedUrl nên trả về thông tin thumbnail nếu nó xử lý thumbnail.
      // Đoạn này giả định rằng nếu thumbnailStream tồn tại, nó ĐÃ được upload và thông tin có trong b2Response.thumbnail
      // Nếu không, cần xem lại logic của uploadToB2AndGetPresignedUrl.
      // Hiện tại, để an toàn, nếu b2Response.thumbnail không có, ta không set các trường thumbnailUrl...
      logger.warn(
        `Service: Thumbnail stream existed but no thumbnail info in B2 response for VOD title: ${title}. Thumbnail might not have been uploaded or processed correctly.`
      );
    }

    logger.info("Creating VOD entry in database with data:", {
      ...vodToCreate,
      videoUrl: "HIDDEN",
      thumbnailUrl: vodToCreate.thumbnailUrl ? "HIDDEN" : null,
    });
    const newVOD = await createVOD(vodToCreate);
    logger.info(`Service: VOD đã được tạo trong DB với ID: ${newVOD.id}`);

    return newVOD;
  } catch (error) {
    logger.error("Service: Lỗi trong createVODFromUpload:", error);
    if (b2VideoFileIdToDelete && b2VideoFileNameToDelete) {
      try {
        logger.info(
          `Service: Dọn dẹp video ${b2VideoFileNameToDelete} trên B2 do lỗi.`
        );
        await deleteFileFromB2(b2VideoFileNameToDelete, b2VideoFileIdToDelete);
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp video ${b2VideoFileNameToDelete} trên B2:`,
          deleteB2Error
        );
      }
    }
    if (b2ThumbFileIdToDelete && b2ThumbFileNameToDelete) {
      try {
        logger.info(
          `Service: Dọn dẹp thumbnail ${b2ThumbFileNameToDelete} trên B2 do lỗi.`
        );
        await deleteFileFromB2(b2ThumbFileNameToDelete, b2ThumbFileIdToDelete);
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp thumbnail ${b2ThumbFileNameToDelete} trên B2:`,
          deleteB2Error
        );
      }
    }
    if (error instanceof AppError) throw error;
    throw new AppError(`Lỗi khi xử lý upload VOD: ${error.message}`, 500);
  }
};

/**
 * Search for VODs by tag, searchQuery (title, description), and/or uploaderUsername.
 * @param {object} options
 * @param {string} [options.tag] - The tag to search for.
 * @param {string} [options.searchQuery] - Text to search in title and description.
 * @param {string} [options.uploaderUsername] - Username of the VOD uploader.
 * @param {number} [options.page=1] - Current page for pagination.
 * @param {number} [options.limit=10] - Number of items per page.
 * @returns {Promise<{vods: VOD[], totalItems: number, totalPages: number, currentPage: number}>}
 */
const searchVODs = async ({
  tag,
  searchQuery,
  uploaderUsername,
  page = 1,
  limit = 10,
}) => {
  try {
    logger.info(
      `Service: Searching VODs with tag: "${tag}", query: "${searchQuery}", user: "${uploaderUsername}", page: ${page}, limit: ${limit}`
    );
    const offset = (page - 1) * limit;
    const whereClause = {}; // For VOD model
    const includeClauses = [
      { model: User, as: "user", attributes: ["id", "username"] },
      {
        model: Category,
        as: "category",
        attributes: ["id", "name", "slug", "tags"],
      },
      // Không cần include Stream ở đây trừ khi có yêu cầu filter/search cụ thể liên quan đến Stream
      // { model: Stream, as: "stream", attributes: ["id", "title"] },
    ];

    if (tag) {
      const lowercasedTag = tag.toLowerCase().replace(/'/g, "''");
      // Tìm categories chứa tag (không phân biệt chữ hoa chữ thường)
      const categoriesWithTag = await Category.findAll({
        where: Sequelize.literal(
          `EXISTS (SELECT 1 FROM unnest(tags) AS t(tag_element) WHERE LOWER(t.tag_element) = '${lowercasedTag}')`
        ),
        attributes: ["id"],
      });

      if (!categoriesWithTag || categoriesWithTag.length === 0) {
        logger.info(`Service: No categories found with tag: "${tag}" for VODs`);
        return {
          vods: [],
          totalItems: 0,
          totalPages: 0,
          currentPage: parseInt(page, 10),
        };
      }
      const categoryIds = categoriesWithTag.map((cat) => cat.id);
      whereClause.categoryId = { [Op.in]: categoryIds };
    }

    if (searchQuery) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    if (uploaderUsername) {
      const userWhere = { username: { [Op.iLike]: `%${uploaderUsername}%` } };
      const userInclude = includeClauses.find((inc) => inc.as === "user");
      if (userInclude) {
        userInclude.where = userWhere;
        userInclude.required = true; // Quan trọng: chỉ trả về VODs có user khớp
      } else {
        // Điều này không nên xảy ra nếu include User luôn được thêm vào
        logger.warn(
          "User include clause not found for uploaderUsername VOD search"
        );
      }
    }

    const { count, rows } = await VOD.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "videoUrl",
        "thumbnailUrl",
        "thumbnailUrlExpiresAt",
        "durationSeconds",
        "createdAt",
        "userId",
        "categoryId",
        "urlExpiresAt",
        "viewCount", // Thêm viewCount
      ],
      include: includeClauses,
      distinct: true, // Quan trọng cho count khi dùng include phức tạp
    });

    logger.info(`Service: Found ${count} VODs matching criteria.`);

    // Đảm bảo viewCount có trong kết quả trả về
    const enrichedVods = rows.map((vod) => {
      const plainVod = vod.get({ plain: true });
      return {
        ...plainVod,
        viewCount: plainVod.viewCount !== undefined ? plainVod.viewCount : 0, // Đảm bảo có giá trị mặc định
        // Đảm bảo category được trả về đúng cấu trúc
        category: plainVod.category
          ? {
              id: plainVod.category.id,
              name: plainVod.category.name,
              slug: plainVod.category.slug,
              // tags: plainVod.category.tags // Bỏ tags nếu không cần thiết ở đây hoặc đã có trong category
            }
          : null,
        user: plainVod.user
          ? {
              id: plainVod.user.id,
              username: plainVod.user.username,
            }
          : null,
      };
    });

    return {
      vods: enrichedVods,
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    logger.error(
      `Service: Error searching VODs with tag "${tag}", query "${searchQuery}", user "${uploaderUsername}":`,
      error
    );
    handleServiceError(error, "search VODs");
  }
};

export const vodService = {
  createVOD,
  createVODFromUpload,
  getVODs,
  getVODById,
  deleteVOD,
  processRecordedFileToVOD,
  refreshVODUrl,
  searchVODs,
};
```

## File: src/services/streamService.js
```javascript
import { v4 as uuidv4 } from "uuid";
import { Stream, User, Category, VOD } from "../models/index.js";
import { Op, Sequelize } from "sequelize"; // For more complex queries if needed later
import { AppError, handleServiceError } from "../utils/errorHandler.js"; // Added for error handling
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js"; // Added for B2 upload
import fs from "fs/promises"; // Added for file system operations
import fsSync from "fs"; // Added for sync file system operations (createReadStream)
import path from "path"; // Added for path manipulation
import dotenv from "dotenv";
import redisClient from "../lib/redis.js"; // Import Redis client
import appEmitter from "../utils/appEvents.js"; // Import App Emitter
import notificationService from "./notificationService.js"; // THÊM IMPORT
import logger from "../utils/logger.js"; // Đảm bảo logger được import
import notificationQueue from "../queues/notificationQueue.js"; // Thêm import cho BullMQ Queue
import followService from "./followService.js"; // Thêm import cho followService

dotenv.config();

const LIVE_VIEWER_HASH_KEY_PREFIX = "stream:viewer_connections:";
const LIVE_VIEWER_TTL_SECONDS =
  parseInt(process.env.REDIS_STREAM_VIEWER_TTL_SECONDS) || 60 * 60 * 2; // 2 hours default

// Helper function to ensure Redis client is connected
const ensureRedisConnected = async () => {
  // Các trạng thái cho thấy client chưa sẵn sàng hoặc không có kết nối chủ động
  const notConnectedStates = ["close", "end"];
  // Các trạng thái cho thấy client đang trong quá trình thiết lập kết nối
  const pendingStates = ["connecting", "reconnecting"];

  if (
    notConnectedStates.includes(redisClient.status) &&
    !pendingStates.includes(redisClient.status) // Chỉ thử connect nếu không đang pending
  ) {
    try {
      logger.info(
        `Redis client status is '${redisClient.status}'. Attempting to connect...`
      );
      await redisClient.connect(); // connect() trả về một promise giải quyết khi kết nối thành công hoặc lỗi
      logger.info(
        "Redis client connection attempt initiated or completed via connect()."
      );
    } catch (err) {
      logger.error(
        "Error explicitly calling redisClient.connect():",
        err.message
      );
    }
  } else if (redisClient.status === "ready") {
    // logger.info("Redis client is already connected and ready."); // Optional: uncomment for debugging
  } else if (pendingStates.includes(redisClient.status)) {
    logger.info(
      `Redis client is already in status '${redisClient.status}'. No action needed here.`
    );
  }
};

/**
 * Tạo mới một stream, có thể kèm thumbnail upload.
 * @param {object} data - Dữ liệu stream.
 * @param {number} data.userId - ID của người dùng.
 * @param {string} data.title - Tiêu đề stream.
 * @param {string} [data.description] - Mô tả stream.
 * @param {string} [data.thumbnailFilePath] - Đường dẫn file thumbnail tạm (nếu có).
 * @param {string} [data.originalThumbnailFileName] - Tên file thumbnail gốc (nếu có).
 * @param {string} [data.thumbnailMimeType] - Mime type của thumbnail (nếu có).
 * @param {number} [data.categoryId] - ID của category (nếu có).
 * @returns {Promise<Stream>} Đối tượng Stream đã tạo.
 */
export const createStreamWithThumbnailService = async ({
  userId,
  title,
  description,
  thumbnailFilePath,
  originalThumbnailFileName,
  thumbnailMimeType,
  categoryId,
}) => {
  let b2ThumbFileIdToDelete = null;
  let b2ThumbFileNameToDelete = null;

  try {
    logger.info(
      `Service: Bắt đầu tạo stream cho user: ${userId} với title: ${title}`
    );

    const streamKey = uuidv4();
    let thumbnailB2Response = null;

    // Kiểm tra Category nếu categoryId được cung cấp
    if (categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        throw new AppError(`Category with ID ${categoryId} not found.`, 400);
      }
    }

    if (thumbnailFilePath && originalThumbnailFileName && thumbnailMimeType) {
      logger.info(`Service: Có thumbnail được cung cấp: ${thumbnailFilePath}`);
      const thumbStats = await fs.stat(thumbnailFilePath);
      const thumbnailSize = thumbStats.size;

      if (thumbnailSize > 0) {
        const thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
        const safeOriginalThumbnailFileName = originalThumbnailFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const thumbnailFileNameInB2 = `users/${userId}/stream_thumbnails/${Date.now()}_${safeOriginalThumbnailFileName}`;

        // Sử dụng một phiên bản đơn giản hơn của uploadToB2AndGetPresignedUrl
        // Hoặc cập nhật b2.service.js để có một hàm chỉ upload thumbnail
        // Hiện tại, giả sử uploadToB2AndGetPresignedUrl có thể xử lý khi chỉ có thumbnail
        // bằng cách truyền null/undefined cho các tham số video.
        // Cần kiểm tra lại hàm uploadToB2AndGetPresignedUrl trong b2.service.js
        // For simplicity, let's assume a dedicated function or a flexible one exists:
        // This is a simplified conceptual call.
        // You'll need to ensure `uploadToB2AndGetPresignedUrl` or a similar function
        // in `b2.service.js` can handle uploading just a thumbnail.
        // It might be better to have a specific `uploadThumbnailToB2` function.

        const tempB2Response = await uploadToB2AndGetPresignedUrl(
          null, // videoStream
          0, // videoSize
          null, // videoFileNameInB2
          null, // videoMimeType
          thumbnailStream,
          thumbnailSize,
          thumbnailFileNameInB2,
          thumbnailMimeType,
          null, // durationSeconds (not applicable for stream thumbnail itself)
          parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
            3600 * 24 * 30 // e.g., 30 days for image URLs
        );
        thumbnailB2Response = tempB2Response.thumbnail; // Assuming the response structure has a thumbnail key

        if (!thumbnailB2Response || !thumbnailB2Response.url) {
          logger.error(
            "Service: Lỗi upload thumbnail lên B2, không có response hoặc URL."
          );
          throw new AppError("Không thể upload thumbnail lên B2.", 500);
        }

        b2ThumbFileIdToDelete = thumbnailB2Response.b2FileId;
        b2ThumbFileNameToDelete = thumbnailB2Response.b2FileName;
        logger.info(
          `Service: Upload thumbnail lên B2 thành công: ${thumbnailB2Response.b2FileName}`
        );
      } else {
        logger.warn(
          "Service: File thumbnail được cung cấp nhưng kích thước là 0."
        );
      }
    }

    const streamData = {
      userId,
      streamKey,
      title,
      description: description || "",
      status: "ended", // Default status
      thumbnailUrl: thumbnailB2Response?.url || null,
      thumbnailUrlExpiresAt: thumbnailB2Response?.urlExpiresAt || null,
      b2ThumbnailFileId: thumbnailB2Response?.b2FileId || null,
      b2ThumbnailFileName: thumbnailB2Response?.b2FileName || null,
      categoryId: categoryId || null, // Gán categoryId
    };

    const newStream = await Stream.create(streamData);
    logger.info(`Service: Stream đã được tạo trong DB với ID: ${newStream.id}`);
    return newStream;
  } catch (error) {
    logger.error("Service: Lỗi trong createStreamWithThumbnailService:", error);
    if (b2ThumbFileIdToDelete && b2ThumbFileNameToDelete) {
      try {
        logger.warn(
          `Service: Dọn dẹp thumbnail ${b2ThumbFileNameToDelete} trên B2 do lỗi khi tạo stream.`
        );
        await deleteFileFromB2(b2ThumbFileNameToDelete, b2ThumbFileIdToDelete);
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp thumbnail ${b2ThumbFileNameToDelete} trên B2:`,
          deleteB2Error
        );
      }
    }
    // Ném lại lỗi để controller xử lý
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Không thể tạo stream: ${error.message}`,
      error.statusCode || 500
    );
  }
};

/**
 * Cập nhật thông tin stream, bao gồm cả thumbnail.
 * @param {number} streamId - ID của stream cần cập nhật.
 * @param {number} currentUserId - ID của người dùng hiện tại thực hiện yêu cầu.
 * @param {object} updateData - Dữ liệu cần cập nhật.
 * @param {string} [updateData.title] - Tiêu đề mới.
 * @param {string} [updateData.description] - Mô tả mới.
 * @param {string} [updateData.status] - Trạng thái mới ('live', 'ended').
 * @param {string} [updateData.thumbnailFilePath] - Đường dẫn file thumbnail tạm mới (nếu có).
 * @param {string} [updateData.originalThumbnailFileName] - Tên file thumbnail gốc mới (nếu có).
 * @param {string} [updateData.thumbnailMimeType] - Mime type của thumbnail mới (nếu có).
 * @param {number} [updateData.categoryId] - ID của category mới (nếu có).
 * @returns {Promise<Stream>} Thông tin stream đã cập nhật.
 * @throws {AppError} Nếu có lỗi xảy ra.
 */
export const updateStreamInfoService = async (
  streamId,
  currentUserId,
  updateData
) => {
  let newB2ThumbFileIdToDeleteOnError = null;
  let newB2ThumbFileNameToDeleteOnError = null;

  try {
    const stream = await Stream.findByPk(streamId);

    if (!stream) {
      throw new AppError("Stream không tìm thấy", 404);
    }

    if (stream.userId !== currentUserId) {
      throw new AppError("Người dùng không có quyền cập nhật stream này", 403);
    }

    const {
      title,
      description,
      status,
      thumbnailFilePath,
      originalThumbnailFileName,
      thumbnailMimeType,
      categoryId,
    } = updateData;

    const oldStatus = stream.status;
    const oldB2ThumbnailFileId = stream.b2ThumbnailFileId;
    const oldB2ThumbnailFileName = stream.b2ThumbnailFileName;
    let newThumbnailB2Response = null;

    if (thumbnailFilePath && originalThumbnailFileName && thumbnailMimeType) {
      logger.info(
        `Service: Có thumbnail mới được cung cấp cho stream ${streamId}: ${thumbnailFilePath}`
      );
      const thumbStats = await fs.stat(thumbnailFilePath);
      const thumbnailSize = thumbStats.size;

      if (thumbnailSize > 0) {
        const thumbnailStream = fsSync.createReadStream(thumbnailFilePath);
        const safeOriginalThumbnailFileName = originalThumbnailFileName.replace(
          /[^a-zA-Z0-9.\-_]/g,
          "_"
        );
        const thumbnailFileNameInB2 = `users/${
          stream.userId
        }/stream_thumbnails/${Date.now()}_${safeOriginalThumbnailFileName}`;

        const tempB2Response = await uploadToB2AndGetPresignedUrl(
          null, // videoStream
          0, // videoSize
          null, // videoFileNameInB2
          null, // videoMimeType
          thumbnailStream,
          thumbnailSize,
          thumbnailFileNameInB2,
          thumbnailMimeType,
          null, // durationSeconds
          parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
            3600 * 24 * 7 // 7 days for image URLs
        );
        newThumbnailB2Response = tempB2Response.thumbnail;

        if (!newThumbnailB2Response || !newThumbnailB2Response.url) {
          logger.error(
            "Service: Lỗi upload thumbnail mới lên B2, không có response hoặc URL."
          );
          throw new AppError("Không thể upload thumbnail mới lên B2.", 500);
        }

        newB2ThumbFileIdToDeleteOnError = newThumbnailB2Response.b2FileId;
        newB2ThumbFileNameToDeleteOnError = newThumbnailB2Response.b2FileName;

        // Cập nhật thông tin thumbnail mới vào stream object
        stream.thumbnailUrl = newThumbnailB2Response.url;
        stream.thumbnailUrlExpiresAt = newThumbnailB2Response.urlExpiresAt;
        stream.b2ThumbnailFileId = newThumbnailB2Response.b2FileId;
        stream.b2ThumbnailFileName = newThumbnailB2Response.b2FileName;

        logger.info(
          `Service: Upload thumbnail mới lên B2 thành công: ${newThumbnailB2Response.b2FileName}`
        );
      } else {
        logger.warn(
          "Service: File thumbnail mới được cung cấp nhưng kích thước là 0."
        );
      }
    }

    // Cập nhật các trường thông tin khác
    if (title !== undefined) stream.title = title;
    if (description !== undefined) stream.description = description;

    // Cập nhật categoryId
    if (categoryId !== undefined) {
      if (categoryId === null) {
        stream.categoryId = null;
      } else {
        const category = await Category.findByPk(categoryId);
        if (!category) {
          throw new AppError(
            `Category với ID ${categoryId} không tìm thấy.`,
            400
          );
        }
        stream.categoryId = categoryId;
      }
    }

    // Xử lý cập nhật status
    if (status !== undefined && status !== oldStatus) {
      if (status === "live") {
        if (stream.endTime) {
          // Nếu stream đã có endTime (đã kết thúc vĩnh viễn)
          throw new AppError(
            "Buổi phát trực tiếp này đã kết thúc vĩnh viễn. Để phát lại, vui lòng tạo một buổi phát mới.",
            400
          );
        }
        stream.status = "live";
        // Giữ startTime cũ nếu stream đã từng live và startTime còn đó (ví dụ, đang 'ended' tạm thời mà chưa có endTime),
        // hoặc set mới nếu stream chưa từng live hoặc startTime là null.
        stream.startTime = stream.startTime || new Date();
        stream.endTime = null;
        // Việc reset viewerCount/Redis sẽ do markLive từ RTMP đảm nhiệm khi stream thực sự bắt đầu.
      } else if (status === "ended") {
        // Nếu user chủ động set là 'ended' qua API
        if (oldStatus === "live") {
          // Chỉ thực hiện nếu đang từ 'live' chuyển sang và chưa có endTime
          stream.status = "ended";
          stream.endTime = new Date(); // Set endTime mới
          // Lưu ý: Hành động này từ API chỉ cập nhật DB.
          // Các tác vụ dọn dẹp (Redis, emit event) nên được xử lý bởi `markEnded` khi RTMP ngắt kết nối.
        } else {
          // Nếu stream đang không phải 'live' (ví dụ, 'ended' sẵn rồi, hoặc trạng thái không xác định)
          // và user muốn set là 'ended' -> đảm bảo nó là 'ended' và có endTime nếu chưa có.
          stream.status = "ended";
          if (!stream.endTime) {
            stream.endTime = new Date();
          }
        }
      } else {
        throw new AppError(
          `Giá trị trạng thái '${status}' không hợp lệ. Chỉ chấp nhận 'live' hoặc 'ended'.`,
          400
        );
      }
    } else if (status === "live" && oldStatus === "live" && stream.endTime) {
      // Trường hợp người dùng gửi status="live", stream trên DB cũng là "live"
      // NHƯNG stream.endTime lại có giá trị. Đây là mâu thuẫn logic.
      // Stream không thể vừa "live" vừa có "endTime".
      // Nên ném lỗi để chỉ ra rằng stream này thực sự đã kết thúc.
      throw new AppError(
        "Buổi phát trực tiếp này đã kết thúc (do có endTime). Không thể đặt lại thành 'live'. Vui lòng tạo buổi phát mới.",
        400
      );
    }

    await stream.save();
    logger.info(`Service: Stream ${streamId} đã được cập nhật thành công.`);

    // Nếu upload thumbnail mới thành công và có thumbnail cũ, thì xóa thumbnail cũ trên B2
    if (
      newThumbnailB2Response &&
      oldB2ThumbnailFileId &&
      oldB2ThumbnailFileName
    ) {
      try {
        logger.info(
          `Service: Xóa thumbnail cũ ${oldB2ThumbnailFileName} (ID: ${oldB2ThumbnailFileId}) trên B2.`
        );
        await deleteFileFromB2(oldB2ThumbnailFileName, oldB2ThumbnailFileId);
        logger.info(
          `Service: Đã xóa thumbnail cũ ${oldB2ThumbnailFileName} khỏi B2.`
        );
      } catch (deleteError) {
        logger.error(
          `Service: Lỗi khi xóa thumbnail cũ ${oldB2ThumbnailFileName} trên B2: ${deleteError.message}`
        );
        // Không ném lỗi ở đây để không ảnh hưởng đến việc stream đã được cập nhật thành công
        // Nhưng cần log lại để theo dõi
      }
    }

    return stream;
  } catch (error) {
    logger.error(
      `Service: Lỗi trong updateStreamInfoService cho stream ${streamId}:`,
      error
    );
    // Nếu upload thumbnail mới gặp lỗi, và đã upload lên B2, thì cần xóa nó đi
    if (newB2ThumbFileIdToDeleteOnError && newB2ThumbFileNameToDeleteOnError) {
      try {
        logger.warn(
          `Service: Dọn dẹp thumbnail MỚI ${newB2ThumbFileNameToDeleteOnError} trên B2 do lỗi khi cập nhật stream.`
        );
        await deleteFileFromB2(
          newB2ThumbFileNameToDeleteOnError,
          newB2ThumbFileIdToDeleteOnError
        );
      } catch (deleteB2Error) {
        logger.error(
          `Service: Lỗi nghiêm trọng khi dọn dẹp thumbnail MỚI ${newB2ThumbFileNameToDeleteOnError} trên B2: ${deleteB2Error}`
        );
      }
    }
    if (error instanceof AppError) throw error;
    throw new AppError(
      `Không thể cập nhật stream: ${error.message}`,
      error.statusCode || 500
    );
  }
};

/**
 * Lấy danh sách các stream.
 * @param {object} queryParams - Tham số query (status, page, limit, categoryId, userId).
 * @returns {Promise<object>} Danh sách stream và thông tin phân trang.
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const getStreamsListService = async (queryParams) => {
  try {
    const { status, page = 1, limit = 10, categoryId, userId } = queryParams;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const whereClause = {};
    if (status && ["live", "ended"].includes(status)) {
      whereClause.status = status;
    }
    if (categoryId) {
      // Lọc theo categoryId
      whereClause.categoryId = categoryId;
    }
    if (userId) {
      // Lọc theo userId
      whereClause.userId = userId;
    }

    const { count, rows } = await Stream.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        { model: Category, as: "category", attributes: ["id", "name", "slug"] }, // Include Category
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      offset: offset,
      distinct: true, // Important for count when using include with hasMany
    });

    const streamsWithLiveViewers = await Promise.all(
      rows.map(async (stream) => {
        const plainStream = stream.get({ plain: true });
        if (plainStream.status === "live" && plainStream.streamKey) {
          const liveViewers = await getLiveViewerCount(plainStream.streamKey);
          plainStream.currentViewerCount = liveViewers;
          // Thêm playback URLs
          const mediaServerUrl = process.env.MEDIA_SERVER_URL;
          if (mediaServerUrl) {
            plainStream.playbackUrls = {
              hls: `${mediaServerUrl}/hls/${plainStream.streamKey}.m3u8`,
              dash: `${mediaServerUrl}/dash/${plainStream.streamKey}.mpd`,
            };
          } else {
            logger.warn(
              "MEDIA_SERVER_URL environment variable is not set. Cannot generate playback URLs."
            );
            plainStream.playbackUrls = null;
          }
        } else {
          plainStream.currentViewerCount = plainStream.viewerCount; // For ended streams, show final DB count
          plainStream.playbackUrls = null;
        }
        return plainStream;
      })
    );

    return {
      totalStreams: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
      streams: streamsWithLiveViewers, // Use the enriched list
    };
  } catch (error) {
    console.error("Error in getStreamsListService:", error);
    throw new Error("Failed to fetch streams: " + error.message);
  }
};

/**
 * Lấy chi tiết một stream.
 * @param {number} streamId - ID của stream.
 * @returns {Promise<object|null>} Thông tin stream hoặc null nếu không tìm thấy.
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const getStreamDetailsService = async (streamId) => {
  try {
    const stream = await Stream.findByPk(streamId, {
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        { model: Category, as: "category", attributes: ["id", "name", "slug"] }, // Include Category
      ],
    });

    if (!stream) {
      return null; // Controller will handle 404
    }

    // Logic to refresh thumbnailUrl if expired or nearing expiry
    const presignedUrlDurationImages =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS_IMAGES) ||
      3600 * 24 * 7; // 7 days default for images
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);
    let thumbnailRefreshed = false;

    if (
      stream.thumbnailUrl && // Use Sequelize instance directly here
      stream.b2ThumbnailFileName &&
      (!stream.thumbnailUrlExpiresAt ||
        new Date(stream.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      try {
        logger.info(
          `Service: Pre-signed URL for stream thumbnail ${streamId} (file: ${stream.b2ThumbnailFileName}) is expired or expiring soon. Refreshing...`
        );
        const newThumbnailUrl = await generatePresignedUrlForExistingFile(
          stream.b2ThumbnailFileName,
          presignedUrlDurationImages
        );
        // Update the Sequelize instance directly
        stream.thumbnailUrl = newThumbnailUrl;
        stream.thumbnailUrlExpiresAt = new Date(
          Date.now() + presignedUrlDurationImages * 1000
        );
        thumbnailRefreshed = true; // Mark that we've changed it
        logger.info(
          `Service: Refreshed pre-signed URL for stream thumbnail ${streamId}. New expiry: ${stream.thumbnailUrlExpiresAt}`
        );
      } catch (refreshError) {
        logger.error(
          `Service: Failed to refresh stream thumbnail URL for stream ${streamId} (file: ${stream.b2ThumbnailFileName}): ${refreshError.message}`
        );
      }
    } else if (
      stream.thumbnailUrl &&
      !stream.b2ThumbnailFileName &&
      (!stream.thumbnailUrlExpiresAt ||
        new Date(stream.thumbnailUrlExpiresAt) < oneHourFromNow)
    ) {
      logger.warn(
        `Service: Stream thumbnail URL for stream ${streamId} needs refresh, but b2ThumbnailFileName is missing.`
      );
    }

    // Save the stream instance if thumbnail was refreshed
    if (thumbnailRefreshed) {
      await stream.save();
      logger.info(
        `Service: Stream ${streamId} saved with refreshed thumbnail URL.`
      );
    }

    // Now, get the plain object from the (potentially updated) Sequelize instance
    const plainStream = stream.get({ plain: true });

    // Get live viewer count if stream is live
    if (plainStream.status === "live" && plainStream.streamKey) {
      const liveViewers = await getLiveViewerCount(plainStream.streamKey);
      plainStream.currentViewerCount = liveViewers;

      // Construct playback URLs
      const mediaServerUrl = process.env.MEDIA_SERVER_URL;
      if (mediaServerUrl) {
        plainStream.playbackUrls = {
          hls: `${mediaServerUrl}/hls/${plainStream.streamKey}.m3u8`,
          dash: `${mediaServerUrl}/dash/${plainStream.streamKey}.mpd`,
        };
      } else {
        logger.warn(
          "MEDIA_SERVER_URL environment variable is not set. Cannot generate playback URLs."
        );
        plainStream.playbackUrls = null;
      }
    } else {
      plainStream.currentViewerCount = plainStream.viewerCount;
      plainStream.playbackUrls = null; // Not live, no playback URLs
    }

    return plainStream; // Returns plain object with potentially refreshed thumbnail and live viewer count
  } catch (error) {
    console.error("Error in getStreamDetailsService:", error);
    throw new Error("Failed to fetch stream details: " + error.message);
  }
};

/**
 * Đánh dấu stream là live.
 * @param {string} streamKey - Khóa của stream.
 * @returns {Promise<void>}
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const markLive = async (streamKey) => {
  try {
    const stream = await Stream.findOne({
      where: { streamKey },
      include: [{ model: User, as: "user", attributes: ["id", "username"] }], // Include User để lấy thông tin actor
    });

    if (!stream) {
      logger.error(`markLive: Stream với key ${streamKey} không tồn tại.`);
      throw new AppError(
        `Stream với key ${streamKey} không tồn tại. Không thể bắt đầu buổi phát.`,
        404
      );
    }

    if (stream.endTime) {
      logger.warn(
        `markLive: Từ chối cố gắng tái sử dụng stream key ${streamKey} đã kết thúc.`
      );
      throw new AppError(
        `Stream key ${streamKey} đã được sử dụng và đã kết thúc. Vui lòng tạo một stream mới để tiếp tục.`,
        403
      );
    }

    const oldStatus = stream.status;
    const newStartTime = stream.startTime || new Date();

    const [updatedRows] = await Stream.update(
      {
        status: "live",
        startTime: newStartTime,
        endTime: null,
        viewerCount: 0, // Reset viewer count in DB when going live
      },
      { where: { streamKey } }
    );

    if (updatedRows > 0) {
      await resetLiveViewerCount(streamKey);
      logger.info(
        `Stream ${streamKey} marked as live. Viewer count reset in DB and Redis.`
      );

      // Chỉ gửi thông báo nếu stream chuyển từ trạng thái không phải 'live' sang 'live'
      if (oldStatus !== "live") {
        if (stream.user && stream.user.id) {
          logger.info(
            `Stream ${streamKey} is now live, preparing to notify followers of user ${stream.user.username} (ID: ${stream.user.id})`
          );

          try {
            const allFollows = await followService.getFollowersInternal(
              stream.user.id
            );
            const followers = allFollows
              .map((follow) => follow.follower) // Lấy object follower từ mỗi mục follow
              .filter(
                (follower) => follower && follower.id && follower.username
              ); // Lọc những follower hợp lệ

            if (followers.length > 0) {
              const batchSize = 10;
              for (let i = 0; i < followers.length; i += batchSize) {
                const batch = followers.slice(i, i + batchSize);
                const jobData = {
                  actionType: "stream_started",
                  actorUser: {
                    id: stream.user.id,
                    username: stream.user.username,
                  },
                  entity: { id: stream.id, title: stream.title },
                  followers: batch.map((f) => ({
                    id: f.id,
                    username: f.username,
                  })), // Chỉ gửi id và username
                  messageTemplate: `${
                    stream.user.username
                  } has started streaming: ${stream.title || "Live Stream"}!`,
                };
                await notificationQueue.add(
                  "process-notification-batch",
                  jobData
                );
                logger.info(
                  `Added notification job to queue for stream ${
                    stream.id
                  }, batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
                    followers.length / batchSize
                  )}`
                );
              }
            } else {
              logger.info(
                `User ${stream.user.id} has no followers to notify for stream ${stream.id}.`
              );
            }
          } catch (notifyError) {
            logger.error(
              `Failed to get followers or add notification job for stream ${streamKey} (user: ${stream.user.id}):`,
              notifyError
            );
          }
        } else {
          logger.warn(
            `Cannot send stream_started notification for stream ${streamKey} because user info is missing or invalid.`
          );
        }
      }
    } else {
      logger.warn(
        `markLive: Stream với key ${streamKey} không tìm thấy để cập nhật hoặc không có thay đổi cần thiết.`
      );
    }
  } catch (error) {
    logger.error(`Error in markLive for stream ${streamKey}:`, error);
    if (error instanceof AppError) throw error;
    throw new AppError("Failed to mark stream as live: " + error.message, 500);
  }
};

/**
 * Đánh dấu stream là đã kết thúc.
 * @param {string} streamKey - Khóa của stream.
 * @param {number} [viewerCount] - Số lượng người xem (nếu có).
 * @returns {Promise<void>}
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const markEnded = async (streamKey, finalViewerCountParam) => {
  // Renamed param for clarity
  try {
    let actualFinalViewerCount = 0;

    // Prioritize getting the latest count from Redis
    const liveViewersFromRedis = await getLiveViewerCount(streamKey);
    if (liveViewersFromRedis !== null) {
      actualFinalViewerCount = liveViewersFromRedis;
    }

    if (
      finalViewerCountParam !== undefined &&
      !isNaN(parseInt(finalViewerCountParam))
    ) {
      const parsedParamCount = parseInt(finalViewerCountParam);
      if (parsedParamCount > actualFinalViewerCount) {
        actualFinalViewerCount = parsedParamCount;
        logger.info(
          `Using passed finalViewerCountParam ${parsedParamCount} for stream ${streamKey} as it's higher than Redis count.`
        );
      }
    }

    const updatePayload = {
      status: "ended",
      endTime: new Date(),
      viewerCount: Math.max(0, actualFinalViewerCount),
    };

    const [updatedRows, affectedStreams] = await Stream.update(updatePayload, {
      where: { streamKey },
      returning: true, // Yêu cầu Sequelize trả về các bản ghi đã được cập nhật
    });

    if (updatedRows > 0 && affectedStreams && affectedStreams.length > 0) {
      const streamId = affectedStreams[0].id; // Lấy streamId từ bản ghi đã cập nhật
      logger.info(
        `Stream ${streamKey} (ID: ${streamId}) marked as ended. Final viewer count in DB: ${updatePayload.viewerCount}.`
      );
      await resetLiveViewerCount(streamKey);
      logger.info(
        `Live viewer count for stream ${streamKey} reset in Redis as stream ended.`
      );

      // Phát sự kiện stream đã kết thúc
      appEmitter.emit("stream:ended", {
        streamId: streamId.toString(),
        streamKey,
      });
      logger.info(
        `Event 'stream:ended' emitted for streamId: ${streamId}, streamKey: ${streamKey}`
      );
    } else {
      logger.warn(
        `markEnded: Stream with key ${streamKey} not found or no change needed.`
      );
    }
  } catch (error) {
    console.error(`Error in markEnded for stream ${streamKey}:`, error);
    throw new Error("Failed to mark stream as ended: " + error.message);
  }
};

/**
 * Search for Streams by a specific tag.
 * @param {object} options
 * @param {string} options.tag - The tag to search for.
 * @param {string} options.searchQuery - The search query to apply to title and description.
 * @param {string} options.streamerUsername - The username of the streamer to filter by.
 * @param {number} [options.page=1] - Current page for pagination.
 * @param {number} [options.limit=10] - Number of items per page.
 * @returns {Promise<{streams: Stream[], totalItems: number, totalPages: number, currentPage: number}>}
 */
export const searchStreamsService = async ({
  tag,
  searchQuery,
  streamerUsername,
  page = 1,
  limit = 10,
}) => {
  try {
    logger.info(
      `Service: Searching Streams with tag: "${tag}", query: "${searchQuery}", user: "${streamerUsername}", page: ${page}, limit: ${limit}`
    );
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereClause = {};
    const includeClauses = [
      { model: User, as: "user", attributes: ["id", "username"] },
      {
        model: Category,
        as: "category",
        attributes: ["id", "name", "slug", "tags"],
      },
    ];

    if (tag) {
      // Sanitize the tag for SQL literal by converting to lowercase and escaping single quotes
      const lowercasedTag = tag.toLowerCase().replace(/'/g, "''");
      const categoriesWithTag = await Category.findAll({
        where: Sequelize.literal(
          `EXISTS (SELECT 1 FROM unnest(tags) AS t(tag_element) WHERE LOWER(t.tag_element) = '${lowercasedTag}')`
        ),
        attributes: ["id"],
      });

      if (!categoriesWithTag || categoriesWithTag.length === 0) {
        logger.info(
          `Service: No categories found with tag: "${tag}" for Streams`
        );
        return {
          streams: [],
          totalItems: 0,
          totalPages: 0,
          currentPage: parseInt(page, 10),
        };
      }
      const categoryIds = categoriesWithTag.map((cat) => cat.id);
      whereClause.categoryId = { [Op.in]: categoryIds };
      logger.info(
        `Service: Categories found for Streams with tag "${tag}": IDs ${categoryIds.join(
          ", "
        )}`
      );
    }

    if (searchQuery) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${searchQuery}%` } },
        { description: { [Op.iLike]: `%${searchQuery}%` } },
      ];
    }

    if (streamerUsername) {
      // Cần đảm bảo 'user' alias đã được định nghĩa trong includeClauses
      // và Sequelize có thể lọc dựa trên thuộc tính của model đã include.
      // Cách tiếp cận này hoạt động nếu Sequelize hỗ trợ where trên include trực tiếp
      // Hoặc có thể cần một sub-query hoặc cách tiếp cận khác nếu phức tạp hơn.
      const userWhere = { username: { [Op.iLike]: `%${streamerUsername}%` } };
      const userInclude = includeClauses.find((inc) => inc.as === "user");
      if (userInclude) {
        userInclude.where = userWhere;
        userInclude.required = true; // Để đảm bảo chỉ trả về stream có user khớp
      } else {
        // Trường hợp này không nên xảy ra nếu cấu trúc include luôn có user
        logger.warn(
          "User include clause not found for streamerUsername search"
        );
      }
    }

    const { count, rows } = await Stream.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: offset,
      order: [["createdAt", "DESC"]],
      include: includeClauses,
      distinct: true, // Quan trọng cho count khi dùng include
    });

    logger.info(`Service: Found ${count} Streams matching criteria.`);

    const streamsWithLiveViewers = await Promise.all(
      rows.map(async (streamInstance) => {
        // Renamed to streamInstance for clarity
        const plainStream = streamInstance.get({ plain: true });
        if (plainStream.status === "live" && plainStream.streamKey) {
          const liveViewers = await getLiveViewerCount(plainStream.streamKey);
          plainStream.currentViewerCount = liveViewers;
          // Thêm playback URLs
          const mediaServerUrl = process.env.MEDIA_SERVER_URL;
          if (mediaServerUrl) {
            plainStream.playbackUrls = {
              hls: `${mediaServerUrl}/hls/${plainStream.streamKey}.m3u8`,
              dash: `${mediaServerUrl}/dash/${plainStream.streamKey}.mpd`,
            };
          } else {
            logger.warn(
              "MEDIA_SERVER_URL environment variable is not set. Cannot generate playback URLs."
            );
            plainStream.playbackUrls = null;
          }
        } else {
          plainStream.currentViewerCount = plainStream.viewerCount;
          plainStream.playbackUrls = null;
        }
        return plainStream;
      })
    );

    return {
      streams: streamsWithLiveViewers,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    logger.error(`Service: Error searching Streams:`, error);
    handleServiceError(error, "search Streams"); // Ensure handleServiceError is robust
  }
};

/**
 * Lấy số người xem duy nhất hiện tại của một stream từ Redis Hash.
 * @param {string} streamKey - Khóa của stream.
 * @returns {Promise<number>} Số người xem duy nhất hiện tại.
 */
export const getLiveViewerCount = async (streamKey) => {
  if (!streamKey) return 0;
  await ensureRedisConnected();
  if (redisClient.status !== "ready") {
    logger.warn(
      `Redis not ready (status: ${redisClient.status}), cannot get live viewer count for ${streamKey}. Returning 0.`
    );
    return 0;
  }
  try {
    const key = `${LIVE_VIEWER_HASH_KEY_PREFIX}${streamKey}`;
    // HLEN đếm số lượng field (user duy nhất) trong hash.
    const count = await redisClient.hlen(key);
    return count;
  } catch (error) {
    logger.error(
      `Error getting live viewer count for stream ${streamKey} from Redis:`,
      error
    );
    return 0;
  }
};

/**
 * Ghi nhận một kết nối mới từ user, và trả về tổng số user duy nhất.
 * @param {string} streamKey - Khóa của stream.
 * @param {string|number} userId - ID của người dùng kết nối.
 * @returns {Promise<number|null>} Số người xem duy nhất mới, hoặc null nếu lỗi.
 */
export const incrementLiveViewerCount = async (streamKey, userId) => {
  if (!streamKey || !userId) return null;
  await ensureRedisConnected();
  if (redisClient.status !== "ready") {
    logger.warn(
      `Redis not ready (status: ${redisClient.status}), cannot increment live viewer count for ${streamKey}.`
    );
    return null;
  }
  const key = `${LIVE_VIEWER_HASH_KEY_PREFIX}${streamKey}`;
  try {
    // Tăng số kết nối cho userId này lên 1
    await redisClient.hincrby(key, userId.toString(), 1);
    // Lấy tổng số user duy nhất
    const uniqueViewerCount = await redisClient.hlen(key);
    // Làm mới TTL cho cả hash
    await redisClient.expire(key, LIVE_VIEWER_TTL_SECONDS);
    logger.info(
      `User ${userId} connection added for stream ${streamKey}. Total unique viewers: ${uniqueViewerCount}`
    );
    return uniqueViewerCount;
  } catch (error) {
    logger.error(
      `Error incrementing live viewer count for stream ${streamKey} in Redis:`,
      error
    );
    return null;
  }
};

/**
 * Ghi nhận một kết nối bị ngắt từ user, và trả về tổng số user duy nhất còn lại.
 * @param {string} streamKey - Khóa của stream.
 * @param {string|number} userId - ID của người dùng ngắt kết nối.
 * @returns {Promise<number|null>} Số người xem duy nhất mới, hoặc null nếu lỗi.
 */
export const decrementLiveViewerCount = async (streamKey, userId) => {
  if (!streamKey || !userId) return null;
  await ensureRedisConnected();
  if (redisClient.status !== "ready") {
    logger.warn(
      `Redis not ready (status: ${redisClient.status}), cannot decrement live viewer count for ${streamKey}.`
    );
    return null;
  }
  const key = `${LIVE_VIEWER_HASH_KEY_PREFIX}${streamKey}`;
  const userIdStr = userId.toString();

  try {
    // Giảm số kết nối cho userId này đi 1
    const userConnectionCount = await redisClient.hincrby(key, userIdStr, -1);

    // Nếu đây là kết nối cuối cùng của user, xóa họ khỏi hash
    if (userConnectionCount <= 0) {
      await redisClient.hdel(key, userIdStr);
      logger.info(
        `User ${userIdStr}'s last connection removed for stream ${streamKey}.`
      );
    }

    // Lấy số user duy nhất còn lại
    const uniqueViewerCount = await redisClient.hlen(key);

    // Nếu vẫn còn người xem, làm mới TTL. Nếu không, xóa key để dọn dẹp.
    if (uniqueViewerCount > 0) {
      await redisClient.expire(key, LIVE_VIEWER_TTL_SECONDS);
    } else {
      // Không còn ai xem, xóa hash này đi cho sạch sẽ.
      await redisClient.del(key);
      logger.info(
        `Viewer count hash for stream ${streamKey} deleted as it is empty.`
      );
    }

    logger.info(
      `User ${userId} connection removed for stream ${streamKey}. Total unique viewers: ${uniqueViewerCount}`
    );
    return uniqueViewerCount;
  } catch (error) {
    logger.error(
      `Error decrementing live viewer count for stream ${streamKey} in Redis:`,
      error
    );
    // Trong trường hợp lỗi, thử lấy lại số đếm hiện tại để tránh trả về null
    try {
      const count = await redisClient.hlen(key);
      return count >= 0 ? count : 0;
    } catch (getErr) {
      logger.error(
        `Error fetching count after decrement error for ${streamKey}:`,
        getErr
      );
      return 0; // Fallback
    }
  }
};

/**
 * Xóa hash đếm người xem của một stream trong Redis.
 * @param {string} streamKey - Khóa của stream.
 * @returns {Promise<void>}
 */
export const resetLiveViewerCount = async (streamKey) => {
  if (!streamKey) return;
  await ensureRedisConnected();
  if (redisClient.status !== "ready") {
    logger.warn(
      `Redis not ready (status: ${redisClient.status}), cannot reset live viewer count for ${streamKey}.`
    );
    return;
  }
  const key = `${LIVE_VIEWER_HASH_KEY_PREFIX}${streamKey}`;
  try {
    await redisClient.del(key);
    logger.info(`Reset live viewer count hash for stream ${streamKey}.`);
  } catch (error) {
    logger.error(
      `Error resetting live viewer count hash for stream ${streamKey} in Redis:`,
      error
    );
  }
};

/**
 * Lấy streamKey và status từ streamId.
 * @param {number} streamId - ID của stream.
 * @returns {Promise<{streamKey: string, status: string}|null>} Đối tượng chứa streamKey và status, hoặc null nếu không tìm thấy.
 */
export const getStreamKeyAndStatusById = async (streamId) => {
  if (!streamId || isNaN(parseInt(streamId))) {
    logger.warn(
      `Invalid streamId provided to getStreamKeyAndStatusById: ${streamId}`
    );
    return null;
  }
  try {
    const stream = await Stream.findByPk(streamId, {
      attributes: ["streamKey", "status"], // Chỉ lấy các trường cần thiết
    });
    if (stream && stream.streamKey) {
      return { streamKey: stream.streamKey, status: stream.status };
    }
    logger.warn(
      `No stream found with streamId ${streamId} for getStreamKeyAndStatusById.`
    );
    return null;
  } catch (error) {
    logger.error(
      `Error fetching streamKey and status for streamId ${streamId}:`,
      error
    );
    return null;
  }
};

/**
 * Lấy VOD bằng streamId.
 * @param {number} streamId - ID của stream.
 * @returns {Promise<VOD|null>} Đối tượng VOD hoặc null nếu không tìm thấy.
 */
export const getVodByStreamIdService = async (streamId) => {
  try {
    const vod = await VOD.findOne({
      where: { streamId: streamId },
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        { model: Category, as: "category", attributes: ["id", "name", "slug"] },
      ],
    });

    if (!vod) {
      return null;
    }

    // TODO: Cân nhắc việc làm mới URL của VOD ở đây nếu cần
    // Ví dụ: kiểm tra `vod.urlExpiresAt` và gọi `generatePresignedUrlForExistingFile`

    return vod;
  } catch (error) {
    logger.error(`Lỗi khi lấy VOD cho stream ID ${streamId}:`, error);
    throw new AppError(
      "Không thể lấy thông tin VOD từ stream.",
      500,
      "VOD_FETCH_ERROR"
    );
  }
};
```
