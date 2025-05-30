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
migrations/20250601000000-create-vods.js
migrations/create-users.js
models/index.js
src/config/database.js
src/config/mongodb.js
src/controllers/chatController.js
src/controllers/streamController.js
src/controllers/userController.js
src/controllers/vodController.js
src/controllers/webhookController.js
src/index.js
src/lib/b2.service.js
src/middlewares/authMiddleware.js
src/middlewares/validators/vodValidator.js
src/models/index.js
src/models/mongo/ChatMessage.js
src/models/stream.js
src/models/user.js
src/models/vod.js
src/routes/chatRoutes.js
src/routes/streamRoutes.js
src/routes/userRoutes.js
src/routes/vodRoutes.js
src/routes/webhookRoutes.js
src/services/chatService.js
src/services/streamService.js
src/services/userService.js
src/services/vodService.js
src/socketHandlers.js
src/utils/errorHandler.js
src/validators/streamValidators.js
src/validators/userValidators.js
```

# Files

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

## File: src/config/mongodb.js
```javascript
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

export const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    console.warn(
      "MONGODB_URI not found in .env. Chat features requiring MongoDB will be unavailable."
    );
    return false; // Trả về false nếu không có URI
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      // Các options như useNewUrlParser, useUnifiedTopology, useCreateIndex, useFindAndModify
      // không còn cần thiết trong Mongoose 6+ và có thể gây lỗi nếu dùng.
    });
    console.log("MongoDB connected successfully for chat logs.");
    return true; // Trả về true nếu kết nối thành công
  } catch (err) {
    console.error("MongoDB connection error:", err);
    // Thoát ứng dụng nếu không kết nối được DB quan trọng này (tùy chọn)
    // process.exit(1);
    return false; // Trả về false nếu có lỗi
  }
};

// Lắng nghe các sự kiện kết nối (tùy chọn, để debug)
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected.");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected.");
});
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

## File: src/controllers/vodController.js
```javascript
import { vodService } from "../services/vodService.js";
import { AppError } from "../utils/errorHandler.js";
import { matchedData, validationResult } from "express-validator"; // Sử dụng express-validator để validate

const logger = {
  info: console.log,
  error: console.error,
};

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
    } = req.query;

    const options = {
      streamId: streamId ? parseInt(streamId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
      streamKey: streamKey ? String(streamKey) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      sortBy: String(sortBy),
      sortOrder: String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC",
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

    // vodService.getVODById sẽ tự động refresh URL nếu cần
    const vod = await vodService.getVODById(vodId);

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

export const vodController = {
  uploadVOD,
  getAllVODs,
  getVODDetails,
  removeVOD,
  refreshVODSignedUrl, 
};
```

## File: src/controllers/webhookController.js
```javascript
import { markLive, markEnded } from "../services/streamService.js";
import { vodService } from "../services/vodService.js"; // Thêm VOD service
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

## File: src/lib/b2.service.js
```javascript
import B2 from "backblaze-b2";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables from .env file

// Load configuration from environment variables
const APPLICATION_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const APPLICATION_KEY = process.env.B2_APPLICATION_KEY;
const BUCKET_ID = process.env.B2_BUCKET_ID;
const BUCKET_NAME = process.env.B2_BUCKET_NAME;
// B2_DOWNLOAD_HOST is used if constructing URLs manually,
// but b2.authorize() provides the most accurate downloadUrl (account's base download URL)

if (!APPLICATION_KEY_ID || !APPLICATION_KEY || !BUCKET_ID || !BUCKET_NAME) {
  console.error(
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
    console.log("Successfully authorized with Backblaze B2.");
    return authData.data; // Return the actual data object from the response
  } catch (error) {
    console.error("Error authorizing with Backblaze B2:", error);
    throw error;
  }
}

/**
 * Uploads a file to Backblaze B2 and generates a pre-signed URL for private access.
 * @param {string} localFilePath - The absolute path to the local file.
 * @param {string} originalFileName - The original name of the file (e.g., streamkey.flv).
 * @param {number} [presignedUrlDuration=3600] - Duration in seconds for which the pre-signed URL is valid (default 1 hour).
 * @returns {Promise<object>} - An object containing b2FileId, b2FileName, and a pre-signed viewableUrl.
 */
async function uploadToB2AndGetPresignedUrl(
  localFilePath,
  originalFileName,
  presignedUrlDuration = 3600
) {
  try {
    const authData = await authorizeB2(); // Ensure we are authorized and get auth data
    const accountDownloadUrl = authData.downloadUrl; // Base URL for downloads for this account

    const fileData = await fs.readFile(localFilePath);
    const fileExtension = path.extname(originalFileName) || ".flv";
    const baseFileName = path.basename(originalFileName, fileExtension);
    const fileNameInB2 = `vods/${baseFileName}-${Date.now()}${fileExtension}`;

    console.log(
      `Attempting to upload ${localFilePath} as ${fileNameInB2} to bucket ${BUCKET_ID}`
    );

    const {
      data: { uploadUrl, authorizationToken: uploadAuthToken },
    } = await b2.getUploadUrl({ bucketId: BUCKET_ID });

    const uploadedFileResponse = await b2.uploadFile({
      uploadUrl: uploadUrl,
      uploadAuthToken: uploadAuthToken,
      fileName: fileNameInB2,
      data: fileData,
      onUploadProgress: (event) => {
        if (event.bytesLoaded && event.totalBytes) {
          const percent = Math.round(
            (event.bytesLoaded / event.totalBytes) * 100
          );
          console.log(`Upload progress for ${fileNameInB2}: ${percent}%`);
        }
      },
    });

    const b2FileId = uploadedFileResponse.data.fileId;
    const b2FileName = uploadedFileResponse.data.fileName;

    console.log(
      `File ${b2FileName} (ID: ${b2FileId}) uploaded successfully to B2.`
    );

    // Generate a pre-signed URL for the private file
    const {
      data: { authorizationToken: downloadAuthToken },
    } = await b2.getDownloadAuthorization({
      bucketId: BUCKET_ID,
      fileNamePrefix: b2FileName, // Authorize this specific file
      validDurationInSeconds: presignedUrlDuration, // e.g., 1 hour
    });

    // Construct the pre-signed URL
    // Format: <accountDownloadUrl>/file/<bucketName>/<fileName>?Authorization=<downloadAuthToken>
    const viewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${b2FileName}?Authorization=${downloadAuthToken}`;

    console.log(
      `Generated pre-signed URL (valid for ${presignedUrlDuration}s): ${viewableUrl}`
    );

    return {
      b2FileId,
      b2FileName,
      viewableUrl, // This is the pre-signed URL
      message: "File uploaded successfully to B2 and pre-signed URL generated.",
    };
  } catch (error) {
    console.error(
      `Error in B2 service for file ${localFilePath}:`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details:", error.response.data);
    }
    throw new Error(`B2 service error: ${error.message}`);
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

    const newViewableUrl = `${accountDownloadUrl}/file/${BUCKET_NAME}/${b2FileName}?Authorization=${newDownloadAuthToken}`;

    console.log(
      `Generated new pre-signed URL for ${b2FileName} (valid for ${presignedUrlDuration}s): ${newViewableUrl}`
    );
    return newViewableUrl;
  } catch (error) {
    console.error(
      `Error generating new pre-signed URL for ${b2FileName}:`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details:", error.response.data);
    }
    throw new Error(
      `Failed to generate new pre-signed URL for ${b2FileName}: ${error.message}`
    );
  }
}

/**
 * Deletes a file from Backblaze B2.
 * @param {string} fileName - The name of the file in B2.
 * @param {string} fileId - The ID of the file in B2.
 * @returns {Promise<object>} - Confirmation from B2.
 */
async function deleteFileFromB2(fileName, fileId) {
  try {
    await authorizeB2(); // Ensure we are authorized

    console.log(
      `Attempting to delete file ${fileName} (ID: ${fileId}) from B2.`
    );

    const response = await b2.deleteFileVersion({
      fileName: fileName,
      fileId: fileId,
    });

    console.log(
      `File ${fileName} (ID: ${fileId}) deleted successfully from B2.`
    );
    return response.data;
  } catch (error) {
    console.error(
      `Error deleting file ${fileName} (ID: ${fileId}) from B2:`,
      error.message
    );
    if (error.isAxiosError && error.response && error.response.data) {
      console.error("B2 API Error Details for delete:", error.response.data);
    }
    // Decide if you want to throw an error that stops the VOD deletion process
    // or just log it and proceed with DB deletion.
    // For now, let's throw to indicate B2 deletion failure.
    throw new Error(
      `Failed to delete file ${fileName} from B2: ${error.message}`
    );
  }
}

// Export the main function to be used by other services
export {
  uploadToB2AndGetPresignedUrl,
  authorizeB2,
  generatePresignedUrlForExistingFile,
  deleteFileFromB2,
};
```

## File: src/middlewares/validators/vodValidator.js
```javascript
import { body, param } from "express-validator";

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
  // userId sẽ được lấy từ token xác thực, không cần validate ở đây
];

export const vodValidationRules = {
  manualUploadVOD, // Đổi tên từ createVOD để rõ ràng hơn
};
```

## File: src/models/index.js
```javascript
import sequelize from "../config/database.js";
import User from "./user.js";
import Stream from "./stream.js";
import VOD from "./vod.js";

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

// --- Export Models và Sequelize Instance ---

export { sequelize, User, Stream, VOD };
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

## File: src/routes/vodRoutes.js
```javascript
import express from "express";
import { vodController } from "../controllers/vodController.js";
import authenticateToken from "../middlewares/authMiddleware.js"; // Đổi tên import cho đúng với file export
import { vodValidationRules } from "../middlewares/validators/vodValidator.js";
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
 * @route   GET /api/vod
 * @desc    Lấy danh sách VOD.
 * @access  Public (hoặc authMiddleware nếu cần Private)
 */
router.get(
  "/",
  // authenticateToken, // Bỏ comment nếu muốn endpoint này là private
  vodController.getAllVODs
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

## File: src/services/chatService.js
```javascript
import ChatMessage from "../models/mongo/ChatMessage.js";

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
      console.log(
        `Chat message from ${messageData.username} for stream ${messageData.streamId} (not saved - MongoDB not configured).`
      );
      // Trả về dữ liệu gốc với timestamp giả lập nếu không lưu DB
      return { ...messageData, timestamp: new Date() };
    }

    const chatEntry = new ChatMessage(messageData);
    await chatEntry.save();
    console.log(
      `Message from ${messageData.username} in room ${messageData.streamId} saved to DB.`
    );
    return chatEntry.toObject(); // Trả về plain object
  } catch (error) {
    console.error("Error saving chat message in service:", error);
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
      console.warn(
        "Attempted to get chat history, but MONGODB_URI is not set."
      );
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
    console.error("Error fetching chat history in service:", error);
    throw new Error("Failed to fetch chat history: " + error.message);
  }
};
```

## File: src/services/vodService.js
```javascript
import { VOD, User, Stream } from "../models/index.js";
import { AppError, handleServiceError } from "../utils/errorHandler.js";
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
  generatePresignedUrlForExistingFile,
} from "../lib/b2.service.js";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import dotenv from "dotenv";

dotenv.config();

const logger = {
  info: console.log,
  error: console.error,
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
  let thumbnailFilePath = null;
  let uploadedVideoInfo = null;
  let uploadedThumbnailInfo = null;
  try {
    // 0. Kiểm tra file gốc tồn tại
    try {
      await fs.access(originalFilePath);
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

    // 2. Tạo đường dẫn cho file MP4 và Thumbnail
    const baseName = path.basename(
      originalFileName,
      path.extname(originalFileName)
    ); // streamkey
    const tempDir = path.dirname(originalFilePath); // /mnt/recordings/live

    mp4FilePath = path.join(tempDir, `${baseName}.mp4`);
    thumbnailFilePath = path.join(tempDir, `${baseName}-thumbnail.jpg`);

    // 3. Chuyển đổi FLV sang MP4
    await convertFlvToMp4(originalFilePath, mp4FilePath);

    // 4. Lấy thời lượng video (từ file MP4 đã convert)
    const durationSeconds = await getVideoDuration(mp4FilePath);

    // 5. Trích xuất Thumbnail (từ file MP4)
    await extractThumbnail(mp4FilePath, thumbnailFilePath);

    // 6. Upload MP4 lên B2
    const mp4FileNameInB2 = `vods/${baseName}-${Date.now()}.mp4`;
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày

    logger.info(`Uploading ${mp4FilePath} to B2 as ${mp4FileNameInB2}...`);
    uploadedVideoInfo = await uploadToB2AndGetPresignedUrl(
      mp4FilePath,
      mp4FileNameInB2, // Tên file trên B2
      presignedUrlDuration
    );

    // 7. Upload Thumbnail lên B2 (nếu có)
    let thumbnailUrlOnB2 = null;
    if (thumbnailFilePath) {
      try {
        await fs.access(thumbnailFilePath); // Kiểm tra file thumbnail tồn tại
        const thumbnailFileNameInB2 = `vods/thumbnails/${baseName}-${Date.now()}.jpg`;
        logger.info(
          `Uploading ${thumbnailFilePath} to B2 as ${thumbnailFileNameInB2}...`
        );
        // Thumbnails có thể public hoặc pre-signed tùy nhu cầu. Hiện tại đang dùng pre-signed.
        uploadedThumbnailInfo = await uploadToB2AndGetPresignedUrl(
          thumbnailFilePath,
          thumbnailFileNameInB2,
          presignedUrlDuration
        );
        thumbnailUrlOnB2 = uploadedThumbnailInfo.viewableUrl;
      } catch (thumbUploadError) {
        logger.error(
          "Failed to upload thumbnail to B2, proceeding without it:",
          thumbUploadError
        );
        // Không throw lỗi nếu thumbnail thất bại, VOD vẫn có thể được tạo
      }
    }

    // 8. Tạo bản ghi VOD trong DB
    const vodData = {
      streamId: stream.id,
      userId: stream.userId,
      streamKey: streamKey,
      title: stream.title || `VOD for ${streamKey}`, // Lấy title từ stream hoặc mặc định
      description: stream.description || "",
      videoUrl: uploadedVideoInfo.viewableUrl,
      urlExpiresAt: new Date(Date.now() + presignedUrlDuration * 1000),
      b2FileId: uploadedVideoInfo.b2FileId,
      b2FileName: uploadedVideoInfo.b2FileName,
      thumbnail: thumbnailUrlOnB2, // URL thumbnail trên B2
      durationSeconds,
    };

    logger.info("Creating VOD entry in database with data:", vodData);
    const newVOD = await VOD.create(vodData);
    logger.info(`VOD entry created with ID: ${newVOD.id}`);

    return newVOD;
  } catch (error) {
    logger.error(
      `Error in processRecordedFileToVOD for streamKey ${streamKey}:`,
      error
    );
    // Xử lý lỗi cụ thể hơn nếu cần
    handleServiceError(error, "xử lý file ghi hình thành VOD"); // Re-throws AppError
  } finally {
    // 9. Xóa file tạm trên server (FLV, MP4, Thumbnail)
    const filesToDelete = [
      originalFilePath,
      mp4FilePath,
      thumbnailFilePath,
    ].filter(Boolean);
    for (const filePath of filesToDelete) {
      try {
        if (filePath) {
          // Check if filePath is not null
          await fs.access(filePath); // Check if file exists before trying to delete
          await fs.unlink(filePath);
          logger.info(`Successfully deleted temporary file: ${filePath}`);
        }
      } catch (e) {
        // Nếu file không tồn tại (ví dụ, mp4FilePath chưa được tạo do lỗi convert) thì bỏ qua
        if (e.code !== "ENOENT") {
          logger.error(`Failed to delete temporary file ${filePath}:`, e);
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
    const {
      streamId,
      userId,
      title,
      description,
      videoUrl, // Đây là URL đã có sẵn (ví dụ từ upload thủ công lên B2)
      urlExpiresAt, // Cần cung cấp nếu videoUrl là pre-signed
      b2FileId,
      b2FileName,
      thumbnail,
      durationSeconds,
      streamKey,
    } = vodData;

    // Kiểm tra streamId và userId nếu được cung cấp
    if (streamId) {
      const stream = await Stream.findByPk(streamId);
      if (!stream) {
        throw new AppError("Stream không tồn tại.", 404);
      }
    }
    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new AppError("Người dùng không tồn tại.", 404);
      }
    }
    if (!userId && streamId) {
      // Cố gắng lấy userId từ streamId
      const stream = await Stream.findByPk(streamId);
      if (stream && stream.userId) vodData.userId = stream.userId;
      else throw new AppError("Không thể xác định User ID cho VOD này.", 400);
    } else if (!userId && !streamId) {
      throw new AppError("Cần cung cấp userId hoặc streamId để tạo VOD.", 400);
    }

    if (!videoUrl || !urlExpiresAt || !b2FileName) {
      throw new AppError(
        "Cần cung cấp videoUrl, urlExpiresAt, và b2FileName cho VOD upload thủ công.",
        400
      );
    }

    const newVOD = await VOD.create({
      streamId,
      userId: vodData.userId, // Đã được cập nhật ở trên nếu cần
      title,
      description,
      videoUrl,
      urlExpiresAt,
      b2FileId,
      b2FileName,
      thumbnail,
      durationSeconds,
      streamKey,
    });

    return newVOD;
  } catch (error) {
    handleServiceError(error, "tạo VOD thủ công");
  }
};

/**
 * Lấy danh sách VOD với tùy chọn filter và phân trang.
 * @param {object} options - Tùy chọn truy vấn.
 * @returns {Promise<{vods: VOD[], totalItems: number, totalPages: number, currentPage: number}>}
 */
const getVODs = async (options = {}) => {
  try {
    const { streamId, userId, streamKey, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (streamId) whereClause.streamId = streamId;
    if (userId) whereClause.userId = userId;
    if (streamKey) whereClause.streamKey = streamKey;

    const { count, rows } = await VOD.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: [
        "id",
        "title",
        "videoUrl", // Sẽ là pre-signed URL
        "thumbnail",
        "durationSeconds",
        "createdAt",
        "userId",
        "streamId",
        "streamKey",
        "urlExpiresAt", // Gửi kèm để client biết khi nào URL hết hạn
        "b2FileName", // Gửi kèm để client/admin có thể yêu cầu refresh URL
      ],
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        // { model: Stream, as: 'stream', attributes: ['id', 'title'] }, // Có thể bỏ nếu đã có streamKey
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
 * @returns {Promise<VOD|null>} Đối tượng VOD hoặc null nếu không tìm thấy.
 */
const getVODById = async (vodId) => {
  try {
    let vod = await VOD.findByPk(vodId, {
      include: [
        { model: User, as: "user", attributes: ["id", "username"] },
        {
          model: Stream,
          as: "stream",
          attributes: ["id", "title", "streamKey"],
        },
      ],
    });
    if (!vod) {
      throw new AppError("VOD không tìm thấy.", 404);
    }

    // Kiểm tra và làm mới pre-signed URL nếu cần
    // Ví dụ: làm mới nếu URL hết hạn trong vòng 1 giờ tới
    const presignedUrlDuration =
      parseInt(process.env.B2_PRESIGNED_URL_DURATION_SECONDS) || 3600 * 24 * 7; // 7 ngày
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 3600 * 1000);

    if (!vod.urlExpiresAt || new Date(vod.urlExpiresAt) < oneHourFromNow) {
      if (vod.b2FileName) {
        logger.info(
          `Pre-signed URL for VOD ${vodId} (file: ${vod.b2FileName}) is expired or expiring soon. Refreshing...`
        );
        const newViewableUrl = await generatePresignedUrlForExistingFile(
          vod.b2FileName,
          presignedUrlDuration
        );
        vod.videoUrl = newViewableUrl;
        vod.urlExpiresAt = new Date(Date.now() + presignedUrlDuration * 1000);

        // Làm mới cả thumbnail nếu có
        if (vod.thumbnail && vod.thumbnail.includes("?Authorization=")) {
          // Giả sử thumbnail cũng là pre-signed
          // Cần logic để lấy b2FileName của thumbnail, hiện tại chưa lưu riêng
          // Tạm thời bỏ qua refresh thumbnail hoặc giả sử thumbnail có URL public/thời hạn dài hơn
          // Nếu thumbnail cũng từ B2 và private, bạn cần lưu b2FileName của thumbnail riêng.
        }

        await vod.save();
        logger.info(
          `Refreshed pre-signed URL for VOD ${vodId}. New expiry: ${vod.urlExpiresAt}`
        );
      } else {
        logger.warn(
          `VOD ${vodId} needs URL refresh but b2FileName is missing.`
        );
      }
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

export const vodService = {
  createVOD,
  getVODs,
  getVODById,
  deleteVOD,
  processRecordedFileToVOD,
  refreshVODUrl, // Thêm hàm này để có thể gọi từ controller
};
```

## File: src/socketHandlers.js
```javascript
import jwt from "jsonwebtoken";
// import mongoose from "mongoose"; // Không cần trực tiếp nữa
import dotenv from "dotenv";
import { saveChatMessage } from "./services/chatService.js"; 

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
        console.error("Socket JWT verification error:", err.message);
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded; // Gán thông tin user vào socket
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}, UserInfo:`, socket.user);

    socket.on("join_stream_room", (streamId) => {
      if (!streamId) {
        console.warn(
          `User ${socket.user.username} (${socket.id}) tried to join null/undefined streamId`
        );
        // Có thể gửi lại lỗi cho client
        // socket.emit('error_joining_room', { message: 'Stream ID is required.' });
        return;
      }
      socket.join(streamId);
      console.log(
        `User ${socket.user.username} (${socket.id}) joined room: ${streamId}`
      );
      // Thông báo cho những người khác trong phòng (tùy chọn)
      // socket.to(streamId).emit('user_joined_chat', { username: socket.user.username, message: 'has joined the chat.' });
    });

    socket.on("chat_message", async (data) => {
      const { streamId, message } = data;
      if (!streamId || !message) {
        console.warn(
          "Received chat_message with missing streamId or message:",
          data
        );
        // socket.emit('error_sending_message', { message: 'Stream ID and message are required.' });
        return;
      }

      if (!socket.rooms.has(streamId)) {
        console.warn(
          `User ${socket.user.username} (${socket.id}) sent message to room ${streamId} they are not in.`
        );
        // Có thể join họ vào phòng nếu đó là ý đồ, hoặc báo lỗi
        // Hoặc đơn giản là không xử lý nếu user không ở trong phòng đó
        // socket.emit('error_sending_message', { message: \`You are not in room ${streamId}.\` });
        return;
      }

      try {
        // Gọi service để lưu tin nhắn
        const savedMessage = await saveChatMessage({
          streamId,
          userId: socket.user.id,
          username: socket.user.username,
          message,
        });

        // Broadcast tin nhắn đến tất cả client trong phòng (bao gồm cả người gửi)
        io.to(streamId).emit("new_message", {
          userId: savedMessage.userId, // Sử dụng dữ liệu từ tin nhắn đã lưu/xử lý
          username: savedMessage.username,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp, // Gửi timestamp từ server (sau khi lưu)
          streamId: savedMessage.streamId,
        });
      } catch (error) {
        console.error("Error saving or broadcasting chat message:", error);
        // Có thể gửi lỗi về cho client gửi
        // socket.emit('error_sending_message', { message: 'Could not process your message.' });
      }
    });

    socket.on("leave_stream_room", (streamId) => {
      if (streamId && socket.rooms.has(streamId)) {
        socket.leave(streamId);
        console.log(
          `User ${socket.user.username} (${socket.id}) left room: ${streamId}`
        );
        // Thông báo cho những người khác trong phòng (tùy chọn)
        // socket.to(streamId).emit('user_left_chat', { username: socket.user.username, message: 'has left the chat.' });
      }
    });

    socket.on("disconnect", () => {
      console.log(
        `User disconnected: ${socket.id}, UserInfo:`,
        socket.user?.username
      );
      // Tự động rời khỏi các phòng khi ngắt kết nối
      // Socket.IO tự xử lý việc này, nhưng bạn có thể thêm logic tùy chỉnh nếu cần
    });
  });
};

export default initializeSocketHandlers;
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
import { Stream, User } from "../models/index.js"; 

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

export default Stream;
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
      allowNull: false,
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
    thumbnail: {
      type: DataTypes.STRING,
    },
    durationSeconds: {
      // Đổi tên từ duration để rõ ràng hơn là giây
      type: DataTypes.INTEGER, // Đơn vị: giây
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

// User for production stage
// export function verifyWebhook(req, res, next) {
//   const signature = req.headers["x-webhook-signature"];
//   // Giả sử bạn sẽ lưu WEBHOOK_SECRET trong file .env
//   if (!process.env.WEBHOOK_SECRET) {
//     console.error("FATAL ERROR: WEBHOOK_SECRET is not defined in .env file.");
//     return res.status(500).json({ message: "Webhook secret not configured." });
//   }
//   if (signature !== process.env.WEBHOOK_SECRET) {
//     console.warn("Invalid webhook signature received:", signature);
//     return res.status(401).json({ message: "Invalid webhook signature." });
//   }
//   next();
// }

export function verifyWebhookTokenInParam(req, res, next) {
  const receivedToken = req.params.webhookToken;
  const expectedToken = process.env.WEBHOOK_SECRET_TOKEN; 

  if (!expectedToken) {
    console.error(
      "FATAL ERROR: WEBHOOK_SECRET_TOKEN is not defined in .env file."
    );
    return res
      .status(500)
      .json({ message: "Webhook secret token not configured on server." });
  }

  if (receivedToken === expectedToken) {
    next();
  } else {
    console.warn("Invalid webhook token received in URL param:", receivedToken);
    return res.status(403).json({ message: "Invalid webhook token." });
  }
}
```

## File: src/services/streamService.js
```javascript
import { v4 as uuidv4 } from "uuid";
import { Stream, User } from "../models/index.js";
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
import { User } from "../models/index.js";

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

## File: src/index.js
```javascript
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
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

dotenv.config();

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

// Middleware
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
app.use("/api/streams", streamRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/vod", vodRoutes);

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
    console.log("Database (PostgreSQL/Sequelize) connected successfully.");

    await connectMongoDB(); // Kết nối MongoDB

    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Socket.IO initialized and listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database(s):", error);
    process.exit(1); // Thoát nếu không kết nối được DB chính
  }
};

startServer();
```
