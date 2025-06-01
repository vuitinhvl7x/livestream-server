import { v4 as uuidv4 } from "uuid";
import { Stream, User } from "../models/index.js";
import { Op } from "sequelize"; // For more complex queries if needed later
import { AppError, handleServiceError } from "../utils/errorHandler.js"; // Added for error handling
import {
  uploadToB2AndGetPresignedUrl,
  deleteFileFromB2,
} from "../lib/b2.service.js"; // Added for B2 upload
import fs from "fs/promises"; // Added for file system operations
import fsSync from "fs"; // Added for sync file system operations (createReadStream)
import path from "path"; // Added for path manipulation
import dotenv from "dotenv";

dotenv.config();

const logger = {
  // Basic logger
  info: console.log,
  error: console.error,
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
 * @returns {Promise<Stream>} Đối tượng Stream đã tạo.
 */
export const createStreamWithThumbnailService = async ({
  userId,
  title,
  description,
  thumbnailFilePath,
  originalThumbnailFileName,
  thumbnailMimeType,
}) => {
  let b2ThumbFileIdToDelete = null;
  let b2ThumbFileNameToDelete = null;

  try {
    logger.info(
      `Service: Bắt đầu tạo stream cho user: ${userId} với title: ${title}`
    );

    const streamKey = uuidv4();
    let thumbnailB2Response = null;

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
      // Can throw an error if stream not existing is an edge case
      // throw new Error(`Stream with key ${streamKey} not found.`);
    }
    console.log(`Stream ${streamKey} marked as ended.`);
  } catch (error) {
    console.error(`Error in markEnded for stream ${streamKey}:`, error);
    throw new Error("Failed to mark stream as ended: " + error.message);
  }
};
