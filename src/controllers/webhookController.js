import { markLive, markEnded } from "../services/streamService.js";
import { vodService } from "../services/vodService.js"; // Thêm VOD service
import logger from "../utils/logger.js"; // Giả sử bạn có một utility logger

export async function handleStreamEvent(req, res) {
  // Dữ liệu từ nginx-rtmp-module thường là x-www-form-urlencoded
  const { call, name, tcurl } = req.body; // 'name' thường là streamKey, 'call' là loại sự kiện
  let eventType = "";
  let streamKey = name;

  // Xác định loại sự kiện dựa trên giá trị của 'call'
  // Thêm event từ query param nếu có (cho nginx.conf mới)
  const eventFromQuery = req.query.event;

  if (call === "publish" || eventFromQuery === "publish") {
    eventType = "on_publish";
  } else if (
    call === "done" ||
    call === "publish_done" ||
    eventFromQuery === "publish_done"
  ) {
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
      "Webhook stream-event received with missing call/name (event/streamKey):",
      req.body,
      req.query
    );
    return res.status(400).json({ message: "Missing call/name parameters." });
  }

  logger.info(
    `Webhook stream-event received: RawCall - ${call}, MappedEvent - ${eventType}, StreamKey - ${streamKey}, ViewerCount - ${viewerCount}, QueryEvent - ${eventFromQuery}`
  );
  logger.info("Full webhook stream-event body:", req.body);

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
          `Webhook stream-event received unhandled call type: ${call} for ${streamKey}`
        );
        return res.status(200).json({
          message: "Event call type received but not specifically handled.",
        });
    }
    return res.status(200).json({
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

/**
 * Xử lý webhook 'on_record_done' từ Nginx sau khi stream đã được ghi lại.
 * Nginx sẽ gửi thông tin về file đã ghi, bao gồm đường dẫn.
 */
export async function handleStreamRecordDone(req, res) {
  // Nginx thường gửi dữ liệu dạng x-www-form-urlencoded cho webhook này
  const { name, path: recordedFilePathInNginx } = req.body;
  const streamKey = name;

  if (!streamKey || !recordedFilePathInNginx) {
    logger.error(
      "Webhook on_record_done received with missing name (streamKey) or path:",
      req.body
    );
    return res
      .status(400)
      .json({ message: "Missing streamKey or recorded file path." });
  }

  logger.info(
    `Webhook on_record_done received: StreamKey - ${streamKey}, RecordedPathInNginx - ${recordedFilePathInNginx}`
  );
  logger.info("Full on_record_done body:", req.body);

  try {
    // Gọi service để xử lý file VOD (convert, upload, save metadata)
    // Giả định đường dẫn từ Nginx container cần được điều chỉnh cho Node.js container
    // Ví dụ: Nginx path /var/rec/live/xyz.flv -> Node.js path /mnt/recordings/live/xyz.flv
    // Điều này phụ thuộc vào cấu hình Docker volume mounts của bạn.
    // Cần có một hàm để ánh xạ đường dẫn này.
    const NGINX_REC_BASE_PATH = "/var/rec"; // Đường dẫn gốc trong Nginx
    const NODE_REC_BASE_PATH =
      process.env.NODE_RECORDING_PATH || "/mnt/recordings"; // Đường dẫn gốc trong Node.js (cấu hình qua .env)

    if (!recordedFilePathInNginx.startsWith(NGINX_REC_BASE_PATH)) {
      logger.error(
        `Recorded file path ${recordedFilePathInNginx} does not start with expected Nginx base path ${NGINX_REC_BASE_PATH}`
      );
      throw new Error("Invalid recorded file path prefix from Nginx.");
    }

    const relativePath = recordedFilePathInNginx.substring(
      NGINX_REC_BASE_PATH.length
    );
    const localFilePath = `${NODE_REC_BASE_PATH}${relativePath}`;

    logger.info(
      `Processing VOD: StreamKey - ${streamKey}, MappedLocalPath - ${localFilePath}`
    );

    // Gọi vodService để xử lý
    const vodResult = await vodService.processRecordedFileToVOD({
      streamKey,
      originalFilePath: localFilePath, // Đường dẫn file gốc (FLV) trên server mà Node.js có thể truy cập
      originalFileName: recordedFilePathInNginx.split("/").pop(), // Tên file gốc, ví dụ: streamkey.flv
    });

    logger.info(
      `VOD processing completed for streamKey ${streamKey}. VOD ID: ${vodResult.id}`
    );

    return res.status(200).json({
      message: "Stream recording processed and VOD created successfully.",
      vod: vodResult,
    });
  } catch (err) {
    logger.error(
      `Error processing on_record_done for streamKey ${streamKey}:`,
      err.message,
      err.stack // Log stack trace để debug dễ hơn
    );
    // Trả về lỗi chi tiết hơn nếu có thể
    const statusCode = err.isAppError ? err.statusCode : 500;
    return res.status(statusCode).json({
      message: "Error processing stream recording.",
      error: err.message,
    });
  }
}
