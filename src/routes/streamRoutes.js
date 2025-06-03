import express from "express";
import {
  createStream,
  updateStream,
  getStreams,
  getStreamById,
  searchStreams,
} from "../controllers/streamController.js";
import authenticateToken from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  validateCreateStream,
  validateUpdateStream,
  validateGetStreams,
  validateGetStreamById,
  validateStreamSearchParams,
} from "../validators/streamValidators.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  upload.single("thumbnailFile"), // Handle thumbnail upload first
  validateCreateStream, // Ensure validators can handle req.body with multipart/form-data
  createStream
);

// PUT /api/streams/:streamId - Cập nhật stream
// If you also want to allow thumbnail updates, this route would need similar upload middleware
router.put(
  "/:streamId",
  authenticateToken,
  upload.single("thumbnailFile"), // Handle optional thumbnail upload
  validateUpdateStream, // Ensure validators can handle req.body with multipart/form-data
  updateStream
);

// GET /api/streams - Lấy danh sách stream (không yêu cầu xác thực cho route này)
router.get("/", validateGetStreams, getStreams);

/**
 * @route   GET /api/streams/search
 * @desc    Tìm kiếm Streams theo tag.
 * @access  Public
 */
router.get("/search", validateStreamSearchParams, searchStreams);

// GET /api/streams/:streamId - Lấy chi tiết một stream (không yêu cầu xác thực cho route này)
router.get("/:streamId", validateGetStreamById, getStreamById);

export default router;
