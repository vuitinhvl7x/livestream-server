import { VOD, User, Stream } from "../models/index.js";
import { AppError, handleServiceError } from "../utils/errorHandler.js";

/**
 * Tạo một bản ghi VOD mới.
 * @param {object} vodData - Dữ liệu cho VOD mới.
 * @param {number} vodData.streamId - ID của stream liên quan.
 * @param {number} vodData.userId - ID của người dùng tạo VOD.
 * @param {string} vodData.title - Tiêu đề của VOD.
 * @param {string} [vodData.description] - Mô tả của VOD.
 * @param {string} vodData.videoUrl - URL của video.
 * @param {string} [vodData.thumbnail] - URL của ảnh thumbnail.
 * @param {number} [vodData.duration] - Thời lượng video (giây).
 * @returns {Promise<VOD>} Đối tượng VOD đã được tạo.
 * @throws {AppError} Nếu có lỗi xảy ra.
 */
const createVOD = async (vodData) => {
  try {
    const {
      streamId,
      userId,
      title,
      description,
      videoUrl,
      thumbnail,
      duration,
    } = vodData;

    // Kiểm tra sự tồn tại của Stream và User (tùy chọn, tùy thuộc vào logic của bạn)
    const stream = await Stream.findByPk(streamId);
    if (!stream) {
      throw new AppError("Stream không tồn tại.", 404);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError("Người dùng không tồn tại.", 404);
    }

    // TODO: Xử lý upload file lên Object Storage (nếu có) và lấy videoUrl, thumbnail thực tế
    // Ví dụ: if (file) { videoUrl = await uploadToS3(file); }

    const newVOD = await VOD.create({
      streamId,
      userId,
      title,
      description,
      videoUrl, // Sẽ là URL từ Object Storage hoặc URL do media server cung cấp
      thumbnail,
      duration,
    });

    return newVOD;
  } catch (error) {
    handleServiceError(error, "tạo VOD");
  }
};

/**
 * Lấy danh sách VOD với tùy chọn filter và phân trang.
 * @param {object} options - Tùy chọn truy vấn.
 * @param {number} [options.streamId] - Filter theo streamId.
 * @param {number} [options.userId] - Filter theo userId.
 * @param {number} [options.page=1] - Trang hiện tại.
 * @param {number} [options.limit=10] - Số lượng VOD mỗi trang.
 * @returns {Promise<{vods: VOD[], totalItems: number, totalPages: number, currentPage: number}>}
 * @throws {AppError} Nếu có lỗi xảy ra.
 */
const getVODs = async (options = {}) => {
  try {
    const { streamId, userId, page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    const whereClause = {};

    if (streamId) {
      whereClause.streamId = streamId;
    }
    if (userId) {
      whereClause.userId = userId;
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
        "thumbnail",
        "duration",
        "createdAt",
        "userId",
        "streamId",
      ],
      // include: [ // Tùy chọn: kèm theo thông tin user hoặc stream
      //   { model: User, as: 'user', attributes: ['id', 'username'] },
      //   { model: Stream, as: 'stream', attributes: ['id', 'title'] },
      // ],
    });

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
 * @param {number} vodId - ID của VOD.
 * @returns {Promise<VOD|null>} Đối tượng VOD hoặc null nếu không tìm thấy.
 * @throws {AppError} Nếu có lỗi xảy ra.
 */
const getVODById = async (vodId) => {
  try {
    const vod = await VOD.findByPk(vodId, {
      // include: [ // Tùy chọn: kèm theo thông tin user hoặc stream
      //   { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
      //   { model: Stream, as: 'stream' },
      // ],
    });
    if (!vod) {
      throw new AppError("VOD không tìm thấy.", 404);
    }
    return vod;
  } catch (error) {
    handleServiceError(error, "lấy chi tiết VOD");
  }
};

/**
 * Xóa một VOD (metadata trong DB và file trên storage nếu có).
 * @param {number} vodId - ID của VOD cần xóa.
 * @param {number} requestingUserId - ID của người dùng yêu cầu xóa.
 * @param {boolean} isAdmin - Người dùng có phải là admin không.
 * @returns {Promise<void>}
 * @throws {AppError} Nếu có lỗi xảy ra (ví dụ: không tìm thấy, không có quyền).
 */
const deleteVOD = async (vodId, requestingUserId, isAdmin = false) => {
  try {
    const vod = await VOD.findByPk(vodId);
    if (!vod) {
      throw new AppError("VOD không tìm thấy để xóa.", 404);
    }

    // Kiểm tra quyền: chỉ chủ sở hữu VOD hoặc admin mới được xóa
    if (!isAdmin && vod.userId !== requestingUserId) {
      throw new AppError("Bạn không có quyền xóa VOD này.", 403);
    }

    // TODO: Xử lý xóa file trên Object Storage
    // Ví dụ: await deleteFromS3(vod.videoUrl);
    // Ví dụ: if (vod.thumbnail) await deleteFromS3(vod.thumbnail);

    await vod.destroy();
    // Không cần trả về gì, hoặc có thể trả về một thông báo thành công
  } catch (error) {
    handleServiceError(error, "xóa VOD");
  }
};

export const vodService = {
  createVOD,
  getVODs,
  getVODById,
  deleteVOD,
};
