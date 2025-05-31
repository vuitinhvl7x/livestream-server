import express from "express";
import { vodController } from "../controllers/vodController.js";
import authenticateToken from "../middlewares/authMiddleware.js"; // Đổi tên import cho đúng với file export
import { vodValidationRules } from "../validators/vodValidator.js";
// import upload from '../middlewares/uploadMiddleware.js'; // Tùy chọn: Middleware cho upload file (ví dụ: multer)

const router = express.Router();

/**
 * @route   POST /api/vod/upload
 * @desc    (Admin/Manual Upload) Tạo một VOD mới.
 *          Yêu cầu metadata đầy đủ bao gồm thông tin file trên B2.
 * @access  Private (Admin - yêu cầu xác thực)
 */
router.post(
  "/upload",
  authenticateToken, // Sử dụng tên middleware đã import chính xác
  // upload.single('videoFile'), // Ví dụ: nếu client upload file video tên là 'videoFile'
  vodValidationRules.manualUploadVOD, // Sử dụng validator mới cho manual upload
  vodController.uploadVOD
);

/**
 * @route   GET /api/vod
 * @desc    Lấy danh sách VOD.
 * @access  Public (hoặc authMiddleware nếu cần Private)
 */
router.get(
  "/",
  // authenticateToken, // Bỏ comment nếu muốn endpoint này là private
  vodController.getAllVODs
);

/**
 * @route   GET /api/vod/:id
 * @desc    Lấy chi tiết một VOD.
 * @access  Public (hoặc authMiddleware nếu cần Private)
 */
router.get(
  "/:id",
  // authenticateToken, // Bỏ comment nếu muốn endpoint này là private
  vodController.getVODDetails
);

/**
 * @route   DELETE /api/vod/:id
 * @desc    Xóa một VOD.
 * @access  Private (chỉ chủ sở hữu hoặc admin)
 */
router.delete(
  "/:id",
  authenticateToken, // Yêu cầu xác thực
  vodController.removeVOD
);

/**
 * @route   POST /api/vod/:id/refresh-url
 * @desc    (Admin/Owner) Chủ động làm mới pre-signed URL cho một VOD.
 * @access  Private (yêu cầu xác thực)
 */
router.post(
  "/:id/refresh-url",
  authenticateToken, // Yêu cầu xác thực
  vodController.refreshVODSignedUrl
);

export default router;
