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
