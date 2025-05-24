import express from "express";
import { handleStreamEvent } from "../controllers/webhookController.js";

import { verifyWebhookTokenInParam } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Endpoint cho media server gửi sự kiện stream
// Ví dụ: POST /api/webhook/stream-event
router.post(
  "/stream-event/:webhookToken",
  verifyWebhookTokenInParam,
  handleStreamEvent
);

export default router;
