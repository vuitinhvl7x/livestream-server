import {
  createStreamService,
  updateStreamInfoService,
  getStreamsListService,
  getStreamDetailsService,
} from "../services/streamService.js";
import { validationResult } from "express-validator";
import { v4 as uuidv4 } from "uuid";
import Stream from "../models/stream.js";
import User from "../models/user.js"; // Needed for association context, though not directly used in every function

// Endpoint Tạo Mới Stream
export const createStream = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { title, description } = req.body;
    // userId sẽ được lấy từ req.user (do middleware authenticateToken gán vào)
    const userId = req.user.id;

    if (!userId) {
      // This case should ideally be caught by authenticateToken middleware if it enforces auth
      return res.status(401).json({
        message: "User not authenticated. User ID missing from request.",
      });
    }

    const newStream = await createStreamService(userId, title, description);

    res.status(201).json({
      message: "Stream created successfully",
      stream: {
        id: newStream.id,
        userId: newStream.userId,
        streamKey: newStream.streamKey,
        title: newStream.title,
        description: newStream.description,
        status: newStream.status,
        createdAt: newStream.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in createStream controller:", error);
    // Specific error from service can be checked if needed
    if (error.message.startsWith("Failed to create stream")) {
      return res
        .status(500)
        .json({ message: "Error creating stream", error: error.message });
    }
    res.status(500).json({
      message: "An unexpected error occurred while creating the stream.",
      error: error.message,
    });
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
        // streamKey is sensitive, decide if it should be here
        // streamKey: stream.streamKey,
        startTime: stream.startTime,
        endTime: stream.endTime,
        viewerCount: stream.viewerCount,
        thumbnail: stream.thumbnail,
        user: stream.user, // user object from include
        createdAt: stream.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error in getStreams controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching streams", error: error.message });
  }
};

// Endpoint Lấy Chi Tiết Một Stream
export const getStreamById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { streamId } = req.params;
    const stream = await getStreamDetailsService(parseInt(streamId));

    if (!stream) {
      return res.status(404).json({ message: "Stream not found" });
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
        thumbnail: stream.thumbnail,
        user: stream.user, // user object from include
        createdAt: stream.createdAt,
      },
    });
  } catch (error) {
    console.error("Error in getStreamById controller:", error);
    res
      .status(500)
      .json({ message: "Error fetching stream details", error: error.message });
  }
};
