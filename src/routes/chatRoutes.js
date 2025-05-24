import express from "express";
import { getChatHistory } from "../controllers/chatController.js";
import authenticateToken from "../middlewares/authMiddleware.js"; // API này cũng cần xác thực

const router = express.Router();

// GET /api/chat/:streamId/messages - Lấy lịch sử chat cho một stream
// Client sẽ cần truyền streamId trong params và có thể page/limit trong query string
router.get("/:streamId/messages", authenticateToken, getChatHistory);

export default router;
