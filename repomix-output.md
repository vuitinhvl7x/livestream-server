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
migrations/20250518153005-create-users.js
migrations/create-users.js
models/index.js
src/config/database.js
src/controllers/streamController.js
src/controllers/userController.js
src/controllers/webhookController.js
src/index.js
src/middlewares/authMiddleware.js
src/models/stream.js
src/models/user.js
src/routes/streamRoutes.js
src/routes/userRoutes.js
src/routes/webhookRoutes.js
src/services/streamService.js
src/services/userService.js
src/validators/streamValidators.js
src/validators/userValidators.js
```

# Files

## File: migrations/20250518153005-create-users.js
```javascript
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
```

## File: migrations/create-users.js
```javascript
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Users", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Users");
  },
};
```

## File: src/controllers/streamController.js
```javascript
import {
  createStreamService,
  updateStreamInfoService,
  getStreamsListService,
  getStreamDetailsService,
} from "../services/streamService.js";
import { validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import Stream from "../models/stream.js";
import User from "../models/user.js"; // Needed for association context, though not directly used in every function

// Endpoint Tạo Mới Stream
export const createStream = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description } = req.body;
    // userId sẽ được lấy từ req.user (do middleware authenticateToken gán vào)
    const userId = req.user.id;

    if (!userId) {
      // This case should ideally be caught by authenticateToken middleware if it enforces auth
      return res.status(401).json({
        message: "User not authenticated. User ID missing from request.",
      });
    }

    const newStream = await createStreamService(userId, title, description);

    res.status(201).json({
      message: "Stream created successfully",
      stream: {
        id: newStream.id,
        userId: newStream.userId,
        streamKey: newStream.streamKey,
        title: newStream.title,
        description: newStream.description,
        status: newStream.status,
        createdAt: newStream.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in createStream controller:", error);
    // Specific error from service can be checked if needed
    if (error.message.startsWith("Failed to create stream")) {
      return res
        .status(500)
        .json({ message: "Error creating stream", error: error.message });
    }
    res.status(500).json({
      message: "An unexpected error occurred while creating the stream.",
      error: error.message,
    });
  }
};

// Endpoint Cập Nhật Thông Tin Stream
export const updateStream = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { streamId } = req.params;
    const { title, description, status } = req.body;
    const userId = req.user.id; // From JWT middleware

    if (!userId) {
      return res.status(401).json({
        message: "User not authenticated. User ID missing from request.",
      });
    }

    const updatedStream = await updateStreamInfoService(
      parseInt(streamId),
      userId,
      { title, description, status }
    );

    res.status(200).json({
      message: "Stream updated successfully",
      stream: {
        id: updatedStream.id,
        title: updatedStream.title,
        description: updatedStream.description,
        status: updatedStream.status,
        startTime: updatedStream.startTime,
        endTime: updatedStream.endTime,
      },
    });
  } catch (error) {
    console.error("Error in updateStream controller:", error);
    if (error.message === "Stream not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === "User not authorized to update this stream") {
      return res.status(403).json({ message: error.message });
    }
    if (error.message.startsWith("Invalid status value")) {
      return res.status(400).json({ message: error.message });
    }
    if (error.message.startsWith("Failed to update stream")) {
      return res
        .status(500)
        .json({ message: "Error updating stream", error: error.message });
    }
    res.status(500).json({
      message: "An unexpected error occurred while updating the stream.",
      error: error.message,
    });
  }
};

// Endpoint Lấy Danh Sách Stream
export const getStreams = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, page, limit } = req.query;
    const result = await getStreamsListService({ status, page, limit });

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
        // streamKey is sensitive, decide if it should be here
        // streamKey: stream.streamKey,
        startTime: stream.startTime,
        endTime: stream.endTime,
        viewerCount: stream.viewerCount,
        thumbnail: stream.thumbnail,
        user: stream.user, // user object from include
        createdAt: stream.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error in getStreams controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching streams", error: error.message });
  }
};

// Endpoint Lấy Chi Tiết Một Stream
export const getStreamById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { streamId } = req.params;
    const stream = await getStreamDetailsService(parseInt(streamId));

    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
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
        thumbnail: stream.thumbnail,
        user: stream.user, // user object from include
        createdAt: stream.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in getStreamById controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching stream details", error: error.message });
  }
};
```

## File: src/controllers/webhookController.js
```javascript
import { markLive, markEnded } from "../services/streamService.js";
// import logger from "../utils/logger.js"; // Giả sử bạn có một utility logger

// Thay thế logger tạm thời bằng console.log nếu chưa có utility logger
const logger = {
  info: console.log,
  error: console.error,
};

export async function handleStreamEvent(req, res) {
  // Dữ liệu từ nginx-rtmp-module thường là x-www-form-urlencoded
  const { call, name, tcurl } = req.body; // 'name' thường là streamKey, 'call' là loại sự kiện
  let eventType = "";
  let streamKey = name; // Giả sử 'name' là streamKey

  // Xác định loại sự kiện dựa trên giá trị của 'call'
  if (call === "publish") {
    eventType = "on_publish";
  } else if (call === "done" || call === "publish_done") {
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
      "Webhook received with missing call/name (event/streamKey):",
      req.body
    );
    return res.status(400).json({ message: "Missing call/name parameters." });
  }

  logger.info(
    `Webhook received: RawCall - ${call}, MappedEvent - ${eventType}, StreamKey - ${streamKey}, ViewerCount - ${viewerCount}`
  );
  logger.info("Full webhook body:", req.body);

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
          `Webhook received unhandled call type: ${call} for ${streamKey}`
        );
        return res
          .status(200)
          .json({
            message: "Event call type received but not specifically handled.",
          });
    }
    return res
      .status(200)
      .json({
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
```

## File: src/models/stream.js
```javascript
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import User from "./user.js"; // Import User model for association

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
        model: User, // Reference the User model directly
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
      allowNull: true, // Or provide a defaultValue: 'Default Stream Title'
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
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // createdAt and updatedAt are handled by Sequelize timestamps: true
  },
  {
    timestamps: true, // Enable automatic createdAt and updatedAt fields
  }
);

// Define associations
// A User can have many Streams
User.hasMany(Stream, {
  foreignKey: "userId",
  as: "streams", // Optional: alias for the association
});
// A Stream belongs to a User
Stream.belongsTo(User, {
  foreignKey: "userId",
  as: "user", // Optional: alias for the association
});

export default Stream;
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
  },
  {
    timestamps: true,
  }
);

export default User;
```

## File: src/routes/streamRoutes.js
```javascript
import express from "express";
import {
  createStream,
  updateStream,
  getStreams,
  getStreamById,
} from "../controllers/streamController.js";
import authenticateToken from "../middlewares/authMiddleware.js";
import {
  validateCreateStream,
  validateUpdateStream,
  validateGetStreams,
  validateGetStreamById,
} from "../validators/streamValidators.js";

// Placeholder for JWT Authentication Middleware
// In a real app, this would be imported from an auth middleware file
// const authenticateToken = (req, res, next) => {
//   // Example: Check for a token and verify it
//   // For now, we'll simulate an authenticated user for development
//   // IMPORTANT: Replace this with actual JWT authentication
//   console.log("authenticateToken middleware called (placeholder)");
//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer ")
//   ) {
//     const token = req.headers.authorization.split(" ")[1];
//     // In a real app, you would verify the token here
//     // For placeholder: decode a dummy user ID if token is 'testtoken'
//     if (token === "testtoken") {
//       req.user = { id: 1, username: "testuser" }; // Dummy user
//       console.log("Dummy user authenticated:", req.user);
//     } else if (token === "testtoken2") {
//       req.user = { id: 2, username: "anotheruser" }; // Dummy user 2
//       console.log("Dummy user authenticated:", req.user);
//     } else {
//       // No actual validation, just a log for now if a token is present
//       console.log("Token present, but no actual validation in placeholder.");
//       // To simulate unauthenticated for other tokens, you could return 401 here.
//       // For broader testing, let's allow it to pass through if any token is present.
//       // req.user = { id: null }; // Or simply don't set req.user
//     }
//   } else {
//     console.log("No authorization token found.");
//     // To enforce authentication, you would return a 401 error here:
//     // return res.status(401).json({ message: 'Authentication token required' });
//   }
//   next();
// };

const router = express.Router();

// Validation middleware for creating a stream
// const validateCreateStream = [ ... ];

// Validation middleware for updating a stream
// const validateUpdateStream = [ ... ];

// Validation for getting streams (pagination, filtering)
// const validateGetStreams = [ ... ];

// Define routes
// POST /api/streams - Tạo mới stream
router.post("/", authenticateToken, validateCreateStream, createStream);

// PUT /api/streams/:streamId - Cập nhật stream
router.put("/:streamId", authenticateToken, validateUpdateStream, updateStream);

// GET /api/streams - Lấy danh sách stream (không yêu cầu xác thực cho route này)
router.get("/", validateGetStreams, getStreams);

// GET /api/streams/:streamId - Lấy chi tiết một stream (không yêu cầu xác thực cho route này)
router.get("/:streamId", validateGetStreamById, getStreamById);

export default router;
```

## File: src/routes/webhookRoutes.js
```javascript
import express from "express";
import { handleStreamEvent } from "../controllers/webhookController.js";
import { verifyWebhook } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Endpoint cho media server gửi sự kiện stream
// Ví dụ: POST /api/webhook/stream-event
router.post("/stream-event", handleStreamEvent);

export default router;
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
    .toInt(), // Chuyển đổi thành số nguyên
  query("limit")
    .optional()
    .isInt({ gt: 0 })
    .withMessage("Limit must be a positive integer")
    .toInt(), // Chuyển đổi thành số nguyên
];

export const validateGetStreamById = [
  param("streamId")
    .isInt({ gt: 0 })
    .withMessage("Stream ID must be a positive integer")
    .toInt(), // Chuyển đổi thành số nguyên
];
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
```

## File: src/config/database.js
```javascript
import { Sequelize } from "sequelize";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
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
    logging: false, // Set to console.log to see SQL queries
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

## File: src/controllers/userController.js
```javascript
import { validationResult } from "express-validator";
import { registerUser, loginUser } from "../services/userService.js";

export const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const { user, token } = await registerUser(username, password);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        username: user.username,
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
      },
      token,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};
```

## File: src/middlewares/authMiddleware.js
```javascript
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config(); // Đảm bảo các biến môi trường từ .env được load

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1); // Thoát ứng dụng nếu JWT_SECRET không được cấu hình
}

/**
 * Middleware xác thực JWT.
 * Kiểm tra token từ header Authorization.
 * Nếu hợp lệ, giải mã và gán thông tin user vào req.user.
 * Nếu không hợp lệ hoặc không có, trả về lỗi 401 hoặc 403.
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Lấy token từ "Bearer <token>"

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access token is missing or invalid." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT verification error:", err.message);
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
      // Thêm các trường khác nếu có trong payload của token
    };
    console.log("User authenticated via JWT:", req.user);
    next();
  });
};

export default authenticateToken;

export function verifyWebhook(req, res, next) {
  const signature = req.headers["x-webhook-signature"];
  // Giả sử bạn sẽ lưu WEBHOOK_SECRET trong file .env
  if (!process.env.WEBHOOK_SECRET) {
    console.error("FATAL ERROR: WEBHOOK_SECRET is not defined in .env file.");
    return res.status(500).json({ message: "Webhook secret not configured." });
  }
  if (signature !== process.env.WEBHOOK_SECRET) {
    console.warn("Invalid webhook signature received:", signature);
    return res.status(401).json({ message: "Invalid webhook signature." });
  }
  next();
}
```

## File: src/routes/userRoutes.js
```javascript
import express from "express";
import { register, login } from "../controllers/userController.js";
import { validateUserPayload } from "../validators/userValidators.js";

const router = express.Router();

router.post("/register", validateUserPayload, register);
router.post("/login", validateUserPayload, login);

export default router;
```

## File: src/services/streamService.js
```javascript
import { v4 as uuidv4 } from "uuid";
import Stream from "../models/stream.js";
import User from "../models/user.js";
import { Op } from "sequelize"; // For more complex queries if needed later

/**
 * Tạo mới một stream.
 * @param {number} userId - ID của người dùng tạo stream.
 * @param {string} title - Tiêu đề của stream.
 * @param {string} description - Mô tả của stream.
 * @returns {Promise<object>} Thông tin stream đã tạo.
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const createStreamService = async (userId, title, description) => {
  try {
    const streamKey = uuidv4();
    const newStream = await Stream.create({
      userId,
      streamKey,
      title,
      description,
      status: "ended", // Mặc định là 'ended'
    });
    return newStream;
  } catch (error) {
    console.error("Error in createStreamService:", error);
    throw new Error("Failed to create stream: " + error.message);
  }
};

/**
 * Cập nhật thông tin stream.
 * @param {number} streamId - ID của stream cần cập nhật.
 * @param {number} currentUserId - ID của người dùng hiện tại thực hiện yêu cầu.
 * @param {object} updateData - Dữ liệu cần cập nhật (title, description, status).
 * @returns {Promise<object>} Thông tin stream đã cập nhật.
 * @throws {Error} Nếu stream không tìm thấy, người dùng không có quyền, hoặc lỗi cập nhật.
 */
export const updateStreamInfoService = async (
  streamId,
  currentUserId,
  updateData
) => {
  try {
    const stream = await Stream.findByPk(streamId);

    if (!stream) {
      throw new Error("Stream not found");
    }

    if (stream.userId !== currentUserId) {
      throw new Error("User not authorized to update this stream");
    }

    const { title, description, status } = updateData;

    if (title !== undefined) stream.title = title;
    if (description !== undefined) stream.description = description;

    if (status !== undefined && ["live", "ended"].includes(status)) {
      stream.status = status;
      if (status === "live" && !stream.startTime) {
        stream.startTime = new Date();
        stream.endTime = null;
      }
      if (status === "ended" && !stream.endTime) {
        // Only set endTime if it's not already set (e.g., if it was manually ended while live)
        // or if it's transitioning from 'live'
        if (stream.startTime && !stream.endTime) {
          // Ensure it was actually live
          stream.endTime = new Date();
        }
      }
    } else if (status !== undefined) {
      throw new Error("Invalid status value. Must be 'live' or 'ended'.");
    }

    await stream.save();
    return stream;
  } catch (error) {
    console.error("Error in updateStreamInfoService:", error);
    // Preserve specific error messages from checks
    if (
      error.message === "Stream not found" ||
      error.message === "User not authorized to update this stream" ||
      error.message.startsWith("Invalid status value")
    ) {
      throw error;
    }
    throw new Error("Failed to update stream: " + error.message);
  }
};

/**
 * Lấy danh sách các stream.
 * @param {object} queryParams - Tham số query (status, page, limit).
 * @returns {Promise<object>} Danh sách stream và thông tin phân trang.
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const getStreamsListService = async (queryParams) => {
  try {
    const { status, page = 1, limit = 10 } = queryParams;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const whereClause = {};
    if (status && ["live", "ended"].includes(status)) {
      whereClause.status = status;
    }

    const { count, rows } = await Stream.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: "user", attributes: ["id", "username"] }],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      offset: offset,
      distinct: true, // Important for count when using include with hasMany
    });

    return {
      totalStreams: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
      streams: rows,
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
      include: [{ model: User, as: "user", attributes: ["id", "username"] }],
    });
    return stream; // Returns null if not found, controller will handle 404
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
    const [updatedRows] = await Stream.update(
      { status: "live", startTime: new Date(), endTime: null }, // endTime: null để reset nếu stream đã kết thúc trước đó
      { where: { streamKey } }
    );
    if (updatedRows === 0) {
      console.warn(
        `markLive: Stream with key ${streamKey} not found or no change needed.`
      );
      // Có thể throw lỗi nếu stream không tồn tại là một trường hợp bất thường
      // throw new Error(`Stream with key ${streamKey} not found.`);
    }
    console.log(`Stream ${streamKey} marked as live.`);
  } catch (error) {
    console.error(`Error in markLive for stream ${streamKey}:`, error);
    throw new Error("Failed to mark stream as live: " + error.message);
  }
};

/**
 * Đánh dấu stream là đã kết thúc.
 * @param {string} streamKey - Khóa của stream.
 * @param {number} [viewerCount] - Số lượng người xem (nếu có).
 * @returns {Promise<void>}
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const markEnded = async (streamKey, viewerCount) => {
  try {
    const updatePayload = {
      status: "ended",
      endTime: new Date(),
    };
    if (viewerCount !== undefined && !isNaN(parseInt(viewerCount))) {
      updatePayload.viewerCount = parseInt(viewerCount);
    }

    const [updatedRows] = await Stream.update(updatePayload, {
      where: { streamKey },
    });

    if (updatedRows === 0) {
      console.warn(
        `markEnded: Stream with key ${streamKey} not found or no change needed.`
      );
      // Có thể throw lỗi nếu stream không tồn tại là một trường hợp bất thường
      // throw new Error(`Stream with key ${streamKey} not found.`);
    }
    console.log(`Stream ${streamKey} marked as ended.`);
  } catch (error) {
    console.error(`Error in markEnded for stream ${streamKey}:`, error);
    throw new Error("Failed to mark stream as ended: " + error.message);
  }
};
```

## File: src/services/userService.js
```javascript
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
};

export const registerUser = async (username, password) => {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      password: hashedPassword,
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

## File: src/index.js
```javascript
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import userRoutes from "./routes/userRoutes.js";
import streamRoutes from "./routes/streamRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/streams", streamRoutes);
app.use("/api/webhook", webhookRoutes);

// Base route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to Livestream API" });
});

// Database connection and server start
const PORT = process.env.PORT || 5000;

sequelize
  .sync()
  .then(() => {
    console.log("Database connected successfully.");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });
```
