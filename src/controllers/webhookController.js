import { markLive, markEnded } from "../services/streamService.js";
// import logger from "../utils/logger.js"; // Giả sử bạn có một utility logger

// Thay thế logger tạm thời bằng console.log nếu chưa có utility logger
const logger = {
  info: console.log,
  error: console.error,
};

export async function handleStreamEvent(req, res) {
  // Dữ liệu từ nginx-rtmp-module thường là x-www-form-urlencoded
  const { call, name, tcurl } = req.body; // 'name' thường là streamKey, 'call' là loại sự kiện
  let eventType = "";
  let streamKey = name; // Giả sử 'name' là streamKey

  // Xác định loại sự kiện dựa trên giá trị của 'call'
  if (call === "publish") {
    eventType = "on_publish";
  } else if (call === "done" || call === "publish_done") {
    // 'done' hoặc 'publish_done' tùy cấu hình/phiên bản
    eventType = "on_done";
  }
  // Thêm các trường hợp khác nếu media server của bạn gửi các giá trị 'call' khác
  // ví dụ: 'play', 'play_done', 'record_done'

  // Lấy viewerCount - nginx-rtmp-module có thể không gửi trực tiếp viewerCount cho on_done.
  // Thông tin này có thể cần lấy từ API thống kê của media server hoặc một cơ chế khác.
  // Trong ví dụ này, chúng ta sẽ bỏ qua viewerCount nếu không có.
  const viewerCount = req.body.viewerCount; // Hoặc một tên trường khác nếu media server gửi

  if (!eventType || !streamKey) {
    logger.error(
      "Webhook received with missing call/name (event/streamKey):",
      req.body
    );
    return res.status(400).json({ message: "Missing call/name parameters." });
  }

  logger.info(
    `Webhook received: RawCall - ${call}, MappedEvent - ${eventType}, StreamKey - ${streamKey}, ViewerCount - ${viewerCount}`
  );
  logger.info("Full webhook body:", req.body);

  try {
    switch (eventType) {
      case "on_publish":
        // URL ingest đầy đủ thường là tcurl (rtmp://host/app) + name (streamkey)
        // Bạn có thể log tcurl + name để xem xét nếu cần.
        logger.info(`Stream starting: ${tcurl}/${name}`);
        await markLive(streamKey);
        logger.info(
          `Stream ${streamKey} marked as live via webhook (event: ${eventType}).`
        );
        break;
      case "on_done":
        await markEnded(streamKey, viewerCount); // viewerCount có thể undefined
        logger.info(
          `Stream ${streamKey} marked as ended via webhook (event: ${eventType}).`
        );
        break;
      default:
        logger.info(
          `Webhook received unhandled call type: ${call} for ${streamKey}`
        );
        return res
          .status(200)
          .json({
            message: "Event call type received but not specifically handled.",
          });
    }
    return res
      .status(200)
      .json({
        message: `Webhook event '${eventType}' (from call '${call}') processed successfully.`,
      });
  } catch (err) {
    logger.error(
      `Error processing webhook event ${eventType} for ${streamKey}:`,
      err.message
    );
    return res.status(500).json({ message: "Error processing webhook event." });
  }
}
