import {
  createStreamWithThumbnailService,
  updateStreamInfoService,
  getStreamsListService,
  getStreamDetailsService,
} from "../services/streamService.js";
import { validationResult, matchedData } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import { Stream, User } from "../models/index.js";
import { AppError } from "../utils/errorHandler.js";
import fs from "fs/promises";
import path from "path";

const logger = {
  info: console.log,
  error: console.error,
};

// Endpoint Tạo Mới Stream (with thumbnail upload)
export const createStream = async (req, res, next) => {
  let thumbnailFilePathTemp = null;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) {
        await fs.unlink(req.file.path);
      }
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const validatedData = matchedData(req);
    const userId = req.user?.id;

    if (!userId) {
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError("Xác thực thất bại, userId không được cung cấp.", 401);
    }

    const { title, description, categoryId } = validatedData;
    let thumbnailFile = null;

    if (req.file && req.file.fieldname === "thumbnailFile") {
      thumbnailFile = req.file;
      thumbnailFilePathTemp = thumbnailFile.path;
    }

    const servicePayload = {
      userId,
      title,
      description,
      thumbnailFilePath: thumbnailFile?.path,
      originalThumbnailFileName: thumbnailFile?.originalname,
      thumbnailMimeType: thumbnailFile?.mimetype,
      categoryId,
    };

    logger.info(
      `Controller: Gọi createStreamWithThumbnailService với payload cho user: ${userId}`,
      {
        title: servicePayload.title,
        hasThumbnail: !!servicePayload.thumbnailFilePath,
      }
    );

    const newStream = await createStreamWithThumbnailService(servicePayload);

    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm: ${thumbnailFilePathTemp}`
        );
        thumbnailFilePathTemp = null;
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm ${thumbnailFilePathTemp} sau khi service thành công: `,
          unlinkError
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Stream created successfully",
      data: newStream,
    });
  } catch (error) {
    logger.error("Controller: Lỗi khi tạo stream:", error);
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm (trong catch): ${thumbnailFilePathTemp}`
        );
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm (trong catch) ${thumbnailFilePathTemp}:`,
          unlinkError
        );
      }
    }
    next(error);
  }
};

// Endpoint Cập Nhật Thông Tin Stream
export const updateStream = async (req, res, next) => {
  let thumbnailFilePathTemp = null; // For cleaning up temp file

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({ onlyFirstError: true })[0];
      if (req.file) {
        // If validation fails after file upload
        await fs.unlink(req.file.path);
      }
      throw new AppError(`Validation failed: ${firstError.msg}`, 400);
    }

    const { streamId } = req.params;
    const validatedData = matchedData(req); // title, description, status from body
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError("Xác thực thất bại, userId không được cung cấp.", 401);
    }

    const id = parseInt(streamId);
    if (isNaN(id)) {
      if (req.file) await fs.unlink(req.file.path);
      throw new AppError("Stream ID phải là một số.", 400);
    }

    let thumbnailFile = null;
    if (req.file && req.file.fieldname === "thumbnailFile") {
      thumbnailFile = req.file;
      thumbnailFilePathTemp = thumbnailFile.path; // Lưu để xóa
    }

    const servicePayload = {
      ...validatedData, // title, description, status
      thumbnailFilePath: thumbnailFile?.path,
      originalThumbnailFileName: thumbnailFile?.originalname,
      thumbnailMimeType: thumbnailFile?.mimetype,
    };

    logger.info(
      `Controller: Gọi updateStreamInfoService cho stream ${id} bởi user ${currentUserId}`,
      {
        updates: servicePayload.title, // just an example field to log
        hasNewThumbnail: !!servicePayload.thumbnailFilePath,
      }
    );

    const updatedStream = await updateStreamInfoService(
      id,
      currentUserId,
      servicePayload
    );

    // Xóa file thumbnail tạm (nếu có) sau khi service thành công
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm (update): ${thumbnailFilePathTemp}`
        );
        thumbnailFilePathTemp = null; // Reset để không xóa lại trong finally/catch
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm (update) ${thumbnailFilePathTemp} sau khi service thành công: `,
          unlinkError
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Stream updated successfully",
      data: updatedStream, // Trả về stream đã được cập nhật, bao gồm cả thumbnail URL mới nếu có
    });
  } catch (error) {
    logger.error("Controller: Lỗi khi cập nhật stream:", error);
    // Đảm bảo file tạm được xóa nếu có lỗi
    if (thumbnailFilePathTemp) {
      try {
        await fs.unlink(thumbnailFilePathTemp);
        logger.info(
          `Controller: Đã xóa file thumbnail tạm (update, trong catch): ${thumbnailFilePathTemp}`
        );
      } catch (unlinkError) {
        logger.error(
          `Controller: Lỗi khi xóa file thumbnail tạm (update, trong catch) ${thumbnailFilePathTemp}:`,
          unlinkError
        );
      }
    }
    next(error); // Chuyển lỗi cho error handling middleware
  }
};

// Endpoint Lấy Danh Sách Stream
export const getStreams = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, page, limit, categoryId } = req.query;
    const result = await getStreamsListService({
      status,
      page,
      limit,
      categoryId,
    });

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
        startTime: stream.startTime,
        endTime: stream.endTime,
        viewerCount: stream.viewerCount,
        thumbnailUrl: stream.thumbnailUrl,
        thumbnailUrlExpiresAt: stream.thumbnailUrlExpiresAt,
        user: stream.user,
        category: stream.category,
        createdAt: stream.createdAt,
      })),
    });
  } catch (error) {
    logger.error("Error in getStreams controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching streams", error: error.message });
  }
};

// Endpoint Lấy Chi Tiết Một Stream
export const getStreamById = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array({ onlyFirstError: true })[0];
    return next(new AppError(`Validation failed: ${firstError.msg}`, 400));
  }

  try {
    const { streamId } = req.params;
    const id = parseInt(streamId);
    if (isNaN(id)) {
      return next(new AppError("Stream ID must be a number.", 400));
    }

    const stream = await getStreamDetailsService(id);

    if (!stream) {
      return next(new AppError("Stream not found", 404));
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
        thumbnailUrl: stream.thumbnailUrl,
        thumbnailUrlExpiresAt: stream.thumbnailUrlExpiresAt,
        streamKey: stream.streamKey,
        user: stream.user,
        category: stream.category,
        createdAt: stream.createdAt,
        updatedAt: stream.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Error in getStreamById controller:", error);
    next(error);
  }
};
