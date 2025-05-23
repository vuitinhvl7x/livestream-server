import express from "express";
import { handleStreamEvent } from "../controllers/webhookController.js";
import { verifyWebhook } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Endpoint cho media server gửi sự kiện stream
// Ví dụ: POST /api/webhook/stream-event
router.post("/stream-event", handleStreamEvent);

export default router;
