import express from "express";
import { vodController } from "../controllers/vodController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // Middleware xác thực JWT
import { vodValidationRules } from "../middlewares/validators/vodValidator.js"; // Middleware validation
// import upload from '../middlewares/uploadMiddleware.js'; // Tùy chọn: Middleware cho upload file (ví dụ: multer)

const router = express.Router();

/**
 * @route   POST /api/vod/upload
 * @desc    Tạo (upload) một VOD mới.
 *          Nếu upload file trực tiếp, middleware `upload.single('videoFile')` hoặc `upload.fields([...])` có thể được dùng ở đây.
 *          Nếu media server gửi thông tin sau khi đã lưu file, thì không cần middleware upload file.
 * @access  Private
 */
router.post(
  "/upload",
  authMiddleware, // Xác thực người dùng (hoặc webhook có cơ chế riêng)
  // upload.single('videoFile'), // Ví dụ: nếu client upload file video tên là 'videoFile'
  vodValidationRules.createVOD, // Áp dụng luật validation
  vodController.uploadVOD
);

/**
 * @route   GET /api/vod
 * @desc    Lấy danh sách VOD.
 * @access  Public (hoặc authMiddleware nếu cần Private)
 */
router.get(
  "/",
  // authMiddleware, // Bỏ comment nếu muốn endpoint này là private
  vodController.getAllVODs
);

/**
 * @route   GET /api/vod/:id
 * @desc    Lấy chi tiết một VOD.
 * @access  Public (hoặc authMiddleware nếu cần Private)
 */
router.get(
  "/:id",
  // authMiddleware, // Bỏ comment nếu muốn endpoint này là private
  vodController.getVODDetails
);

/**
 * @route   DELETE /api/vod/:id
 * @desc    Xóa một VOD.
 * @access  Private (chỉ chủ sở hữu hoặc admin)
 */
router.delete(
  "/:id",
  authMiddleware, // Yêu cầu xác thực
  vodController.removeVOD
);

export default router;
