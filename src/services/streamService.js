import { v4 as uuidv4 } from "uuid";
import { Stream, User, Category } from "../models/index.js";
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

const LIVE_VIEWER_COUNT_KEY_PREFIX = "stream:live_viewers:";
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
 * @param {object} queryParams - Tham số query (status, page, limit, categoryId).
 * @returns {Promise<object>} Danh sách stream và thông tin phân trang.
 * @throws {Error} Nếu có lỗi xảy ra.
 */
export const getStreamsListService = async (queryParams) => {
  try {
    const { status, page = 1, limit = 10, categoryId } = queryParams;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const whereClause = {};
    if (status && ["live", "ended"].includes(status)) {
      whereClause.status = status;
    }
    if (categoryId) {
      // Lọc theo categoryId
      whereClause.categoryId = categoryId;
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
        } else {
          plainStream.currentViewerCount = plainStream.viewerCount; // For ended streams, show final DB count
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
    } else {
      plainStream.currentViewerCount = plainStream.viewerCount;
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
        } else {
          plainStream.currentViewerCount = plainStream.viewerCount;
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
 * Lấy số người xem hiện tại của một stream từ Redis.
 * @param {string} streamKey - Khóa của stream.
 * @returns {Promise<number>} Số người xem hiện tại.
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
    const countStr = await redisClient.get(
      `${LIVE_VIEWER_COUNT_KEY_PREFIX}${streamKey}`
    );
    return countStr ? parseInt(countStr, 10) : 0;
  } catch (error) {
    logger.error(
      `Error getting live viewer count for stream ${streamKey} from Redis:`,
      error
    );
    return 0;
  }
};

/**
 * Tăng số người xem hiện tại của một stream trong Redis.
 * @param {string} streamKey - Khóa của stream.
 * @returns {Promise<number|null>} Số người xem mới, hoặc null nếu lỗi nghiêm trọng.
 */
export const incrementLiveViewerCount = async (streamKey) => {
  if (!streamKey) return null;
  await ensureRedisConnected();
  if (redisClient.status !== "ready") {
    logger.warn(
      `Redis not ready (status: ${redisClient.status}), cannot increment live viewer count for ${streamKey}.`
    );
    return null;
  }
  const key = `${LIVE_VIEWER_COUNT_KEY_PREFIX}${streamKey}`;
  try {
    const newCount = await redisClient.incr(key);
    await redisClient.expire(key, LIVE_VIEWER_TTL_SECONDS);
    logger.info(
      `Incremented live viewer count for stream ${streamKey} to ${newCount}`
    );
    return newCount;
  } catch (error) {
    logger.error(
      `Error incrementing live viewer count for stream ${streamKey} in Redis:`,
      error
    );
    return null;
  }
};

/**
 * Giảm số người xem hiện tại của một stream trong Redis.
 * @param {string} streamKey - Khóa của stream.
 * @returns {Promise<number|null>} Số người xem mới, hoặc null nếu lỗi nghiêm trọng.
 */
export const decrementLiveViewerCount = async (streamKey) => {
  if (!streamKey) return null;
  await ensureRedisConnected();
  if (redisClient.status !== "ready") {
    logger.warn(
      `Redis not ready (status: ${redisClient.status}), cannot decrement live viewer count for ${streamKey}.`
    );
    return null;
  }
  const key = `${LIVE_VIEWER_COUNT_KEY_PREFIX}${streamKey}`;
  try {
    const currentCount = await redisClient.decr(key);
    if (currentCount < 0) {
      await redisClient.set(key, "0"); // Ensure count doesn't go negative
      logger.info(
        `Live viewer count for stream ${streamKey} was negative after DECR, reset to 0.`
      );
      await redisClient.expire(key, LIVE_VIEWER_TTL_SECONDS); // Set TTL again if key was reset
      return 0;
    }
    await redisClient.expire(key, LIVE_VIEWER_TTL_SECONDS); // Refresh TTL
    logger.info(
      `Decremented live viewer count for stream ${streamKey} to ${currentCount}`
    );
    return currentCount;
  } catch (error) {
    logger.error(
      `Error decrementing live viewer count for stream ${streamKey} in Redis:`,
      error
    );
    // Attempt to get current value if decrement fails, or handle error
    try {
      const val = await redisClient.get(key); // Get might return null if key disappeared
      return val ? Math.max(0, parseInt(val, 10)) : 0; // Ensure it's not negative
    } catch (getErr) {
      logger.error(
        `Error fetching count after decrement error for ${streamKey}:`,
        getErr
      );
      return 0; // Fallback to 0
    }
  }
};

/**
 * Reset số người xem hiện tại của một stream trong Redis về 0.
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
  const key = `${LIVE_VIEWER_COUNT_KEY_PREFIX}${streamKey}`;
  try {
    await redisClient.set(key, "0");
    await redisClient.expire(key, LIVE_VIEWER_TTL_SECONDS);
    logger.info(`Reset live viewer count for stream ${streamKey} to 0.`);
  } catch (error) {
    logger.error(
      `Error resetting live viewer count for stream ${streamKey} in Redis:`,
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
