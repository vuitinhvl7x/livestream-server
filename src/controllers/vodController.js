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
    const plainVod = vod.get({ plain: true });
    if (plainVod.user) {
      plainVod.user = {
        id: plainVod.user.id,
        username: plainVod.user.username,
        displayName: plainVod.user.displayName,
        avatarUrl: plainVod.user.avatarUrl,
      };
    }
    res.status(200).json({
      success: true,
      data: plainVod, // Đã bao gồm videoUrl và urlExpiresAt được cập nhật nếu cần
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
