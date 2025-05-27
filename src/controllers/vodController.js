import { vodService } from "../services/vodService.js";
import { AppError } from "../utils/errorHandler.js";
import { matchedData, validationResult } from "express-validator"; // Sử dụng express-validator để validate

/**
 * @route   POST /api/vod/upload
 * @desc    Tạo (upload) một VOD mới. Metadata VOD được gửi trong body.
 *          Việc upload file video thực tế có thể được xử lý bởi middleware (ví dụ multer)
 *          hoặc media server sẽ gọi endpoint này sau khi đã lưu file và cung cấp URL.
 * @access  Private (yêu cầu xác thực, ví dụ: người dùng đã đăng nhập hoặc webhook từ media server)
 */
const uploadVOD = async (req, res, next) => {
  try {
    // Kiểm tra lỗi validation từ express-validator (nếu có middleware validation)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Lấy lỗi đầu tiên để hiển thị, hoặc bạn có thể xử lý tất cả lỗi
      const firstError = errors.array({ onlyFirstError: true })[0];
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    // Lấy dữ liệu đã được validate và sanitize bởi express-validator
    const validatedData = matchedData(req);

    // Thông tin người dùng lấy từ token sau khi qua middleware xác thực
    const userId = req.user?.id; // req.user được gán bởi authMiddleware
    if (!userId && !req.isMediaServerWebhook) {
      // req.isMediaServerWebhook là cờ tùy chọn nếu webhook có cơ chế xác thực riêng
      throw new AppError(
        "Xác thực thất bại hoặc userId không được cung cấp.",
        401
      );
    }

    // streamId có thể được gửi từ client/media server
    const { streamId, title, description, videoUrl, thumbnail, duration } =
      validatedData;

    // Nếu userId không có (ví dụ: webhook từ media server), bạn có thể cần logic khác để lấy userId
    // Ví dụ: dựa vào streamKey trong webhook payload để tìm stream, rồi tìm userId
    let finalUserId = userId;
    if (!finalUserId && streamId) {
      // Giả sử bạn có cách lấy userId từ streamId nếu không có req.user
      // const stream = await Stream.findByPk(streamId); // Cần import Stream
      // if (stream) finalUserId = stream.userId;
      // Hoặc nếu media server gửi streamKey, thì tìm stream bằng streamKey rồi lấy userId
    }

    if (!finalUserId) {
      throw new AppError("Không thể xác định người dùng cho VOD này.", 400);
    }

    const vodData = {
      streamId,
      userId: finalUserId,
      title,
      description,
      videoUrl, // Đây là URL đã có, hoặc sẽ được cập nhật sau khi upload lên storage
      thumbnail,
      duration,
    };

    // Nếu bạn dùng multer để upload file trực tiếp từ client đến server này:
    // if (req.file) {
    //   // Xử lý file đã upload (req.file), ví dụ, lấy đường dẫn sau khi lưu
    //   // Hoặc gọi hàm upload lên Object Storage ở đây và lấy URL
    //   // vodData.videoUrl = await vodService.uploadFileToObjectStorage(req.file);
    //   // Nếu thumbnail cũng được upload:
    //   // if(req.files && req.files.thumbnail) vodData.thumbnail = await vodService.uploadFileToObjectStorage(req.files.thumbnail[0]);
    // } else if (!videoUrl) {
    //   // Nếu không có file upload và cũng không có videoUrl từ client/media server
    //   throw new AppError('Cần cung cấp file video hoặc videoUrl.', 400);
    // }

    const newVOD = await vodService.createVOD(vodData);

    res.status(201).json({
      success: true,
      message: "VOD đã được tạo thành công.",
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
    const { streamId, userId, page, limit } = req.query; // Lấy từ query params
    const options = {
      streamId: streamId ? parseInt(streamId) : undefined,
      userId: userId ? parseInt(userId) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };

    const result = await vodService.getVODs(options);

    res.status(200).json({
      success: true,
      data: result.vods,
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
 * @desc    Lấy chi tiết một VOD bằng ID.
 * @access  Public (hoặc Private tùy theo yêu cầu)
 */
const getVODDetails = async (req, res, next) => {
  try {
    const vodId = parseInt(req.params.id);
    if (isNaN(vodId)) {
      throw new AppError("ID VOD không hợp lệ.", 400);
    }

    const vod = await vodService.getVODById(vodId);
    // Service đã xử lý trường hợp không tìm thấy bằng cách throw AppError(404)

    res.status(200).json({
      success: true,
      data: vod,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/vod/:id
 * @desc    Xóa một VOD (yêu cầu quyền chủ sở hữu hoặc admin).
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

    await vodService.deleteVOD(vodId, requestingUserId, isAdmin);

    res.status(200).json({
      success: true,
      message: "VOD đã được xóa thành công.",
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
};
