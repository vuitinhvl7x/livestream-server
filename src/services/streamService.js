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
      throw new AppError("Stream not found", 404);
    }

    if (stream.userId !== currentUserId) {
      throw new AppError("User not authorized to update this stream", 403);
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

    // Lưu lại thông tin thumbnail cũ để xóa nếu upload thumbnail mới thành công
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
      // Cho phép cả việc gán null
      if (categoryId === null) {
        stream.categoryId = null;
      } else {
        const category = await Category.findByPk(categoryId);
        if (!category) {
          throw new AppError(`Category with ID ${categoryId} not found.`, 400);
        }
        stream.categoryId = categoryId;
      }
    }

    if (status !== undefined && ["live", "ended"].includes(status)) {
      // Logic cập nhật status, startTime, endTime tương tự như trước
      // (đã có trong file của bạn, có thể copy/paste hoặc giữ nguyên nếu nó đúng)
      const oldStatus = stream.status;
      if (stream.status !== status) {
        stream.status = status;
        if (status === "live") {
          if (oldStatus === "ended" || !stream.startTime) {
            stream.startTime = new Date();
            stream.endTime = null;
          }
        } else if (status === "ended") {
          if (oldStatus === "live" && !stream.endTime) {
            stream.endTime = new Date();
          }
        }
      }
    } else if (status !== undefined) {
      throw new AppError(
        "Invalid status value. Must be 'live' or 'ended'.",
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

    if (
      stream.thumbnailUrl &&
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
        stream.thumbnailUrl = newThumbnailUrl;
        stream.thumbnailUrlExpiresAt = new Date(
          Date.now() + presignedUrlDurationImages * 1000
        );
        await stream.save();
        logger.info(
          `Service: Refreshed pre-signed URL for stream thumbnail ${streamId}. New expiry: ${stream.thumbnailUrlExpiresAt}`
        );
      } catch (refreshError) {
        logger.error(
          `Service: Failed to refresh stream thumbnail URL for stream ${streamId} (file: ${stream.b2ThumbnailFileName}): ${refreshError.message}`
        );
        // Continue with potentially stale URL, or handle error differently
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

    return {
      streams: rows,
      totalItems: count,
      totalPages: Math.ceil(count / parseInt(limit, 10)),
      currentPage: parseInt(page, 10),
    };
  } catch (error) {
    logger.error(`Service: Error searching Streams:`, error);
    handleServiceError(error, "search Streams"); // Ensure handleServiceError is robust
  }
};
