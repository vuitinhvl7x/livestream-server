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

    const { title, description } = validatedData;
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
        startTime: stream.startTime,
        endTime: stream.endTime,
        viewerCount: stream.viewerCount,
        thumbnailUrl: stream.thumbnailUrl,
        thumbnailUrlExpiresAt: stream.thumbnailUrlExpiresAt,
        user: stream.user,
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
        createdAt: stream.createdAt,
        updatedAt: stream.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Error in getStreamById controller:", error);
    next(error);
  }
};
