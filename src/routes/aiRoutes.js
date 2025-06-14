import express from "express";
import { body, param } from "express-validator";
import * as aiController from "../controllers/aiController.js";
import authenticateToken from "../middlewares/authMiddleware.js"; // Middleware xác thực
import validateRequest from "../middlewares/validateRequest.js"; // Middleware xử lý lỗi validation

const router = express.Router();

// Route để lấy danh sách các model AI có sẵn
// Không yêu cầu xác thực
router.get("/models", aiController.getAIModels);

// Route để tóm tắt chat của một stream cụ thể
// Yêu cầu xác thực người dùng
router.post(
  "/streams/:streamId/summarize",
  authenticateToken,
  [
    // Validate streamId từ URL params
    param("streamId")
      .isInt({ gt: 0 })
      .withMessage("Stream ID must be a positive integer."),

    // Validate (tùy chọn) các trường từ body
    body("model").optional().isString().withMessage("Model must be a string."),
    body("numMessages")
      .optional()
      .isInt({ min: 10, max: 500 })
      .withMessage("Number of messages must be between 10 and 500."),
  ],
  validateRequest, // Middleware chung để kiểm tra validation results
  aiController.summarizeStreamChat
);

export default router;
