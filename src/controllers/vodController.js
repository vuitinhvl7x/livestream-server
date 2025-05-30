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
