import express from "express";
import {
  handleStreamEvent,
  handleStreamRecordDone,
} from "../controllers/webhookController.js";

import { verifyWebhookTokenInParam } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Endpoint cho media server gửi sự kiện stream
// Ví dụ: POST /api/webhook/stream-event
router.post(
  "/stream-event/:webhookToken",
  verifyWebhookTokenInParam,
  handleStreamEvent
);

// Endpoint cho Nginx thông báo khi đã ghi hình xong file VOD
// Ví dụ: POST /api/webhook/record-done/:webhookToken
router.post(
  "/record-done/:webhookToken",
  verifyWebhookTokenInParam,
  handleStreamRecordDone
);

export default router;
